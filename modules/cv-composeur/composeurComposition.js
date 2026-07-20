/* ============================================================
   composeurComposition.js
   ------------------------------------------------------------
   Moteur "Composeur (Bêta)" — Couche ③ : Composition Engine.
   Voir architecture-moteur-cv.md §2 (couche ③).

   Applique l'architecture générale (ordre des rubriques, répartition par
   colonne, taille de police) en mettant en œuvre les décisions déjà
   prises par le Rule Engine (②) et par le thème (④) -- cette couche ne
   redéfinit jamais une règle ni une propriété de thème, elle les met en
   œuvre. Le nombre de colonnes lui-même est une propriété du thème
   (composeur-theme-engine-conception.md §1, reçue en paramètre) --
   cette couche décide uniquement, une fois ce nombre connu, quelle
   rubrique va dans quelle colonne (via colonnesCompatibles, voir
   composeurComposants.js).

   TACHE (2 ajustements demandés avant le début du développement) :
   1. Structure PRÊTE pour 1 OU 2 colonnes dès la V1, même si "laterale"
      reste toujours vide pour l'instant (aucun thème à 2 colonnes
      disponible -- voir composeurTheme.js).
   2. Chaque décision (règle ET choix de composant) transporte son
      origine -- {regle: '...'} pour les règles du Rule Engine (déjà le
      cas, voir composeurRegles.js), {regle: 'defaut-v1' | 'choix-
      utilisateur'} pour les choix de composant (aucune vraie règle de
      sélection de variante n'existe encore en V1, une seule option par
      rubrique -- mais la structure ne changera plus le jour où plusieurs
      variantes coexisteront). Rien de tout ça n'est affiché à la
      personne pour l'instant (§7.3) -- seulement transporté, prêt à
      être exploité.
   ============================================================ */

function composeurComposer(objetCV, profil, decisions, variantesChoisies, formatPage, theme) {
  variantesChoisies = variantesChoisies || {};
  // TACHE (retour utilisateur : "A4 Détaillé et A4 Essentiel sont
  // identiques pour ce modèle") : formatPage n'etait jamais pris en
  // compte ici -- desormais, les capacites ET la longueur des missions
  // different reellement selon le format, meme principe que les 16
  // modeles existants (CAPACITES_A4_ESSENTIEL_CV, deja global, deja LA
  // reference partagee).
  var formatEssentiel = (formatPage === 'A4-essentiel');

  // Choisit une variante pour une rubrique, et trace TOUJOURS son origine
  // (contrat §5) : 'choix-utilisateur' si la personne l'a explicitement
  // demandée (mode avancé, pas encore construit), 'defaut-v1' sinon.
  function choisirVariante(rubrique, defaut) {
    var idChoisi = variantesChoisies[rubrique];
    var composant = composeurObtenirComposant(rubrique, idChoisi) || composeurObtenirComposant(rubrique, defaut);
    return { composant: composant, regle: idChoisi ? 'choix-utilisateur' : 'defaut-v1' };
  }

  var composantEnTete = choisirVariante('enTete', 'classique');
  // TACHE (composeur-theme-engine-conception.md §1, décision tranchée) :
  // "1 ou 2 colonnes" passe le test d'architecture (§0) -- s'applique à
  // l'identique quel que soit le contenu du CV, donc une propriété de
  // thème. L'en-tête ne porte plus cette responsabilité, il ne gère
  // désormais que sa propre présentation (photo, nom, coordonnées).
  // Repli sur 1 colonne si aucun thème n'est fourni (tests isolés,
  // filet de sécurité -- jamais un plantage).
  var nombreColonnes = (theme && theme.colonnes) || 1;

  // TACHE (contrat composeur-strategies-cv-v2.md, étape 3 + garde-fou
  // posé avant l'étape 3 : "les objets Strategie deviennent la source
  // unique de vérité") : R005 (composeurStrategies.js) decide desormais
  // l'ordre des rubriques -- R004 reste calculee dans `decisions`
  // (tracabilite complete, §7.3), mais n'est PLUS consultee ici pour
  // construire l'ordre. Ne jamais reconstruire ordreRubriques localement
  // -- toujours lire strategie.ordreRubriques tel quel.
  var decisionStrategie = (typeof COMPOSEUR_REGLE_R005 !== 'undefined') ? COMPOSEUR_REGLE_R005.appliquer(profil) : null;
  var strategieCV = (decisionStrategie && decisionStrategie.valeur) ||
    ((typeof strategieParId === 'function') ? strategieParId('chronologique') : null);

  // 'enTete' est toujours dessine separement, en premier, par le Render
  // Engine (jamais dans la liste "principale") -- filtre ici. Les
  // rubriques dont aucun composant n'existe encore (ex. 'competencesCles'
  // du Mixte, etape 4, pas encore construite) sont egalement filtrees --
  // jamais un plantage, jamais un encart vide pour une rubrique non geree.
  var RUBRIQUES_SUPPORTEES = ['profil', 'experiences', 'formations', 'competences', 'competencesCles', 'langues', 'loisirsEngagements', 'competencesPersonnelles'];
  var ordreRubriquesPrincipales = strategieCV
    ? strategieCV.ordreRubriques.filter(function (r) { return RUBRIQUES_SUPPORTEES.indexOf(r) !== -1; })
    : ['profil', 'experiences', 'formations', 'competences', 'langues', 'loisirsEngagements'];

  // TACHE (retour utilisateur : "le document fait 4 pages" -- bug reel,
  // pas une question de style) : les fonctions hauteurLignesEstimee()
  // existaient deja dans le registre (composeurComposants.js) mais
  // n'etaient JAMAIS appelees nulle part -- aucun plafond ne s'appliquait
  // donc reellement au contenu, contrairement au systeme des 16 modeles
  // (deja plafonne, ex. 5 experiences). Reutilise CAPACITES_A4_DETAILLE_CV
  // (formatA5CV.js, deja global, deja LA reference partagee pour ce
  // meme plafonnage ailleurs dans l'appli) plutot que d'inventer un
  // nouveau jeu de plafonds propre au Composeur.
  var capacites = formatEssentiel
    ? ((typeof CAPACITES_A4_ESSENTIEL_CV !== 'undefined') ? CAPACITES_A4_ESSENTIEL_CV : {})
    : ((typeof CAPACITES_A4_DETAILLE_CV !== 'undefined') ? CAPACITES_A4_DETAILLE_CV : {});
  var competencesBrutes = objetCV.competences || {};
  var experiencesRetenues = (objetCV.experiences || []).slice(0, capacites.experiences);

  // TACHE (retour utilisateur : "le CV dépasse une page, adapter les
  // missions") : meme budget que celui applique aux 16 modeles existants
  // (voir construireObjetCVPourExport(), app.js) -- coherence entre les
  // deux systemes, meme raisonnement : plafonner le NOMBRE d'experiences
  // ne suffit pas si chaque mission est tres longue.
  // TACHE (retour utilisateur : "à nouveau trop grand", test réel converti
  // en PDF -- 1632 caractères de missions donnaient encore 2 pages) :
  // budget resserré. Le premier chiffre (1800) ne tenait pas assez
  // compte de l'espace pris par les AUTRES rubriques (en-tête, profil,
  // formations, compétences, langues, loisirs, engagements) sur la même
  // page -- les missions n'ont jamais toute la page pour elles seules.
  // TACHE (retour utilisateur : "A4 Essentiel identique à A4 Détaillé") :
  // budget nettement plus serre en Essentiel (une seule ligne resumee
  // par experience, meme esprit que les 16 modeles existants), pour une
  // vraie difference visible entre les deux formats.
  var BUDGET_MISSIONS_DETAILLE = formatEssentiel ? 90 : 1300;
  var totalMissions = experiencesRetenues.reduce(function (total, e) { return total + (e.missions ? e.missions.length : 0); }, 0);
  if (totalMissions > 0 && (formatEssentiel || totalMissions > BUDGET_MISSIONS_DETAILLE)) {
    var facteurReduction = formatEssentiel ? null : (BUDGET_MISSIONS_DETAILLE / totalMissions);
    experiencesRetenues = experiencesRetenues.map(function (e) {
      if (!e.missions) { return e; }
      // TACHE (retour utilisateur, format Essentiel) : chaque mission
      // tronquee a une longueur FIXE et courte (independante des autres
      // experiences) plutot qu'une repartition proportionnelle -- coherent
      // avec l'esprit "une ligne par experience" du format Essentiel.
      var longueurCible = formatEssentiel ? BUDGET_MISSIONS_DETAILLE : Math.max(100, Math.round(e.missions.length * facteurReduction));
      if (longueurCible >= e.missions.length) { return e; }
      var copie = {};
      Object.keys(e).forEach(function (k) { copie[k] = e[k]; });
      copie.missions = (typeof _dnTronquerTexte === 'function') ? _dnTronquerTexte(e.missions, longueurCible) : e.missions.slice(0, longueurCible) + '…';
      return copie;
    });
  }

  var contenuRetenu = {
    experiences: experiencesRetenues,
    formations: (objetCV.formations || []).slice(0, capacites.formations),
    langues: (objetCV.langues || []).slice(0, capacites.langues),
    loisirs: (objetCV.loisirs || []).slice(0, capacites.loisirs),
    engagements: (objetCV.engagements || []).slice(0, capacites.engagements),
    // TACHE (retour utilisateur : "compétences personnelles" -- bloc
    // additif, voir cv.md point 10) : déjà décidé et construit par
    // appliquerMoteurDecisionCV() (app.js), transmis tel quel ici --
    // jamais une seconde logique de déclenchement dans le Composeur.
    competencesPersonnelles: (objetCV.competencesPersonnelles || []).slice(0, capacites.competences),
    competences: (competencesBrutes.savoirFaire || [])
      .concat(competencesBrutes.savoirEtre || [], competencesBrutes.savoirs || [])
      .slice(0, capacites.competences)
  };

  // TACHE (étape 3, contrat §3.1 -- décision tranchée : mode dégradé pour
  // tous les dossiers en V1, "Illustré par" réservé à l'étape 5 pour les
  // dossiers Découverte uniquement) : regroupement par nature
  // (technique/savoir-être) plutôt qu'une liste plate -- pas encore le
  // regroupement thématique fin ("Accompagnement socio-professionnel",
  // "Animation de groupe") qui demanderait le lien compétence↔expérience,
  // volontairement pas construit ici. Un vrai regroupement fonctionnel,
  // pas une promesse plus large que ce que les données permettent.
  if (strategieCV && strategieCV.id === 'parCompetences') {
    var groupeTechnique = (competencesBrutes.savoirFaire || []).concat(competencesBrutes.savoirs || []);
    var groupeSavoirEtre = competencesBrutes.savoirEtre || [];
    // TACHE (étape 5, contrat modele-relation-competence-experience.md +
    // règle stricte posée avant cette étape : "jamais experience.
    // competencesDemontrees.includes(...) ni aucune lecture directe") --
    // exclusivement via experiencesQuiDemontrent() (app.js), jamais une
    // lecture directe du champ ici. Cherche dans experiencesRetenues (déjà
    // plafonnée par capacites plus haut), jamais dossier.experiences en
    // entier -- ne cite que des expériences réellement affichées sur CE
    // CV. Un groupe sans aucune correspondance reste en mode dégradé
    // (pas d'"illustrePar" du tout) -- ce sera systématiquement le cas
    // pour un dossier classique/importé (contrat §3.1), sans qu'aucune
    // condition spéciale n'ait à le distinguer ici : la fonction retourne
    // simplement une liste vide, le mode dégradé en découle naturellement.
    function construireGroupe(theme, items) {
      var itemsRetenus = items.slice(0, capacites.competences);
      return {
        theme: theme,
        items: itemsRetenus.map(function (texte) {
          var experiencesLiees = (typeof experiencesQuiDemontrent === 'function')
            ? experiencesQuiDemontrent(texte, experiencesRetenues) : [];
          return {
            texte: texte,
            illustrePar: experiencesLiees.map(function (e) { return e.entreprise || e.poste; }).filter(Boolean)
          };
        })
      };
    }
    contenuRetenu.competencesGroupees = [
      construireGroupe('Compétences techniques', groupeTechnique),
      construireGroupe('Qualités professionnelles', groupeSavoirEtre)
    ].filter(function (g) { return g.items.length > 0; });
  }

  // TACHE (étape 4, contrat §4) : bandeau "Compétences clés" de la
  // stratégie Mixte -- construit ICI (Composition Engine), via R006
  // (composeurStrategies.js), jamais recalculé dans le Render Engine.
  // objetCV.objectifProfessionnel sert de proxy pour le métier visé
  // (déjà la même valeur que dossier.metierCible dans la plupart des cas
  // -- le module Découverte l'y fait explicitement correspondre) --
  // reste une approximation assumée, pas un nouveau champ à faire
  // transiter jusqu'ici.
  if (strategieCV && strategieCV.id === 'mixte' && typeof COMPOSEUR_REGLE_R006 !== 'undefined') {
    var decisionCompetencesCles = COMPOSEUR_REGLE_R006.appliquer(competencesBrutes, objetCV.objectifProfessionnel);
    contenuRetenu.competencesCles = decisionCompetencesCles.valeur;
  }

  // TACHE (étape B2, "2 colonnes" -- chantier séparé du Theme Engine,
  // comme convenu) : "laterale" reste vide si nombreColonnes === 1
  // (comportement V1 inchangé, aucune régression). Sinon, répartit les
  // rubriques compatibles ('laterale' dans colonnesCompatibles, voir
  // composeurComposants.js -- jamais une rubrique qui ne le supporte pas,
  // comme 'profil'/'experiences') selon une préférence simple, cohérente
  // avec la convention déjà établie côté 16 modèles classiques : les
  // listes compactes (compétences, langues, loisirs) vont en colonne
  // latérale, le contenu qui a besoin de largeur (profil, expériences,
  // formations, bandeau de compétences clés) reste en colonne principale.
  var RUBRIQUES_PREFEREES_LATERALE = ['competences', 'langues', 'loisirsEngagements', 'competencesPersonnelles'];
  var ordreRubriquesLaterales = [];
  if (nombreColonnes === 2) {
    ordreRubriquesPrincipales = ordreRubriquesPrincipales.filter(function (r) {
      var estPrefereeLaterale = RUBRIQUES_PREFEREES_LATERALE.indexOf(r) !== -1;
      var estCompatible = typeof composeurRubriqueCompatibleColonne === 'function'
        ? composeurRubriqueCompatibleColonne(r, 'laterale')
        : estPrefereeLaterale; // filet de securite si le registre n'est pas charge, jamais un plantage
      if (estPrefereeLaterale && estCompatible) { ordreRubriquesLaterales.push(r); return false; }
      return true;
    });
  }

  // Ajustement 1 : repartition EXPLICITE par colonne. "laterale" reste
  // vide en V1 (nombreColonnes === 1) -- cette forme ne changera plus
  // quand une variante d'en-tete a sidebar sera ajoutee, seule la
  // logique qui REMPLIT "laterale" evoluera alors.
  var repartitionColonnes = {
    principale: ordreRubriquesPrincipales,
    laterale: ordreRubriquesLaterales
  };

  // R005 (echelle) + R003 (plancher dur, jamais contourne).
  var echelle = decisions.echelleTaillePolice.valeur;
  var taillePoliceCorps = Math.max(decisions.tailleMinPolice.valeur, Math.round(11 * echelle));

  return {
    colonnes: nombreColonnes,
    repartitionColonnes: repartitionColonnes,
    taillePoliceCorps: taillePoliceCorps,
    controleVeuvesOrphelines: decisions.controleVeuvesOrphelines.valeur,
    // TACHE (retour utilisateur : "A4 Essentiel identique à A4 Détaillé") :
    // transmis au Render Engine pour un rendu compact des experiences
    // (une ligne chacune) en Essentiel -- meme esprit que les 16 modeles
    // existants, voir composeurRender.js.
    formatEssentiel: formatEssentiel,
    // TACHE (étape 3) : la stratégie choisie, transportée telle quelle --
    // le Render Engine lit strategieCV.id pour adapter son affichage
    // (compétences groupées, expériences compactes), il ne la
    // redétermine jamais lui-même (source unique de vérité).
    strategieCV: strategieCV,
    composants: {
      enTete: composantEnTete,
      profil: choisirVariante('profil', 'paragraphe'),
      experiences: choisirVariante('experiences', 'standard'),
      formations: choisirVariante('formations', 'standard'),
      competences: choisirVariante('competences', 'liste'),
      langues: choisirVariante('langues', 'liste'),
      loisirsEngagements: choisirVariante('loisirsEngagements', 'liste')
    },
    // TACHE ("le document fait 4 pages") : contenu REELLEMENT plafonne --
    // c'est desormais CECI (et non plus objetCV directement) que
    // composeurRender.js doit dessiner.
    contenuRetenu: contenuRetenu,
    // Ajustement 2 : tracabilite COMPLETE des decisions du Rule Engine,
    // conservee telle quelle (y compris celles non explicables pour
    // l'instant, §7.3) -- la future couche d'explication filtrera,
    // celle-ci ne perd aucune information en amont.
    decisionsTracees: decisions,
    explications: [decisions.rubriquePrioritaire.texteExplication, decisionStrategie && decisionStrategie.texteExplication].filter(Boolean)
  };
}
