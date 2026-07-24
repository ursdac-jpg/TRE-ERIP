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

// TACHE (retour utilisateur : "il y a une limite des compétences par
// bloc ?") : investigation a revele que CAPACITES_A4_DETAILLE_CV --
// deja reference par ce fichier (voir plus bas) ET par app.js
// (construireObjetCVPourExport, pipeline des 16 modeles classiques,
// commentaire : "commune a tous les modeles") -- N'EXISTE NULLE PART
// dans toute la base ERIP. Consequence reelle avant ce correctif :
// capacites devenait {} en "A4 Detaille" (repli defensif), donc AUCUNE
// limite de contenu pour les 4 themes du Composeur sur ce format.
// DECISION IMPORTANTE : ne JAMAIS creer une constante nommee
// "CAPACITES_A4_DETAILLE_CV" -- ce nom exact est deja lu par app.js
// pour le pipeline des 16 modeles classiques (construireObjetCVPourExport) ;
// la creer changerait silencieusement leur comportement (actuellement
// replie sur meta.capacites, par modele) sans jamais avoir ete demande
// ni valide pour eux -- violation directe de "zero regression sur les
// 16 modeles". Nom distinct choisi ici, prefixe COMPOSEUR_, lu
// UNIQUEMENT par ce fichier -- corrige le Composeur (ses 4 themes,
// dont Sobre/Institutionnel/Moderne qui etaient eux aussi silencieusement
// sans limite, jamais signale avant, corrige au passage) sans le moindre
// risque d'effet de bord sur le pipeline classique.
// Chiffres discutes et valides explicitement (retour utilisateur) :
// experiences/langues/loisirs = 5, formations/engagements = 3,
// competences = 5 (competences professionnelles ET, par defaut hors
// Projet XXL, le seul bloc "competences" fusionne des 16 modeles/
// Sobre/Institutionnel/Moderne). competencesPersonnelles = 5, LU
// UNIQUEMENT par la branche Projet XXL (separation pro/comportementales,
// plus bas) -- jamais par les 3 autres themes, qui continuent de lire
// capacites.competences pour leur propre bloc "Compétences personnelles"
// (comportement inchange pour eux).
var COMPOSEUR_CAPACITES_A4_DETAILLE_CV = {
  experiences: 5, formations: 3, langues: 5, loisirs: 5, engagements: 3,
  competences: 5, competencesPersonnelles: 5,
  // TACHE (retour utilisateur : "CACES/titre pro = certification, doit
  // impérativement apparaître" -- bug réel et sérieux trouvé : le
  // Composeur, ses 4 thèmes confondus, ne lisait JAMAIS objetCV.
  // certifications, contrairement au pipeline des 16 modèles classiques
  // -- perte de contenu silencieuse). Ajouté ici pour corriger ce manque.
  certifications: 3
};

// TACHE (retour utilisateur : "en Essentiel on peut fusionner pro et
// comportementales en 1 bloc de 8, pas en Détaillé") : cap DEDIE à ce cas
// de fusion precis (Projet XXL + A4 Essentiel uniquement) -- jamais tire
// de CAPACITES_A4_ESSENTIEL_CV.competences (6, deja partagee avec les 16
// modeles classiques et les 3 autres themes du Composeur, jamais touchee
// ici) : un chiffre special pour un cas special, sans le moindre risque
// de changer le "6" existant pour qui que ce soit d'autre.
var COMPOSEUR_XXL_CAP_COMPETENCES_ESSENTIEL_FUSIONNE = 8;

// TACHE (retour utilisateur : "format Mini CV A5 -- portrait, 2 colonnes
// fixes, pas de choix possible") : mise en page ENTIÈREMENT différente
// de la logique 1/2 colonnes habituelle (pas de stratégie, pas de
// plafonds de troncature classiques) -- un contenu fixe et
// volontairement réduit. Fonction séparée plutôt que d'ajouter des
// branches partout dans composeurComposer() -- jamais de risque de
// régression sur A4 Détaillé/Essentiel/Intégral, ce format n'est JAMAIS
// traversé par eux.
// TACHE (retour utilisateur : "débordement -- les 2 options doivent
// s'appliquer normalement à l'A5") : option B adaptée -- l'A5 n'a pas de
// missions à retirer (l'expérience y est déjà réduite à une ligne),
// donc "retirer du contenu" réduit ici le NOMBRE d'éléments affichés
// (compétences, expériences, formations) plutôt que des lignes de
// mission. Option A (réduire la police) reste gérée côté rendu
// (composeurRender.js), comme pour A4.
function composeurComposerA5Portrait(objetCV, theme) {
  var optionDebordementA5 = (theme && theme.optionDebordement) || null;
  var competencesObj = objetCV.competences || {};
  var competencesPro = (competencesObj.savoirFaire || []).concat(competencesObj.savoirEtre || []);
  // TACHE (retour utilisateur : "si la personne n'a pas assez de
  // compétences professionnelles, alors on va prendre de ses
  // compétences personnelles") : seuil retenu = moins de 4 compétences
  // pro combinées (savoirFaire + savoirEtre) -- complète alors avec les
  // compétences personnelles, jusqu'à 6 au total (jamais plus, format
  // très réduit) -- réduit à 4 si "Retirer du contenu" (option B) est
  // choisi. Si les compétences pro suffisent déjà (4+), les
  // personnelles ne sont jamais ajoutées -- pas de mélange systématique.
  var SEUIL_COMPETENCES_PRO_MINIMUM = 4;
  var MAX_COMPETENCES_A5 = (optionDebordementA5 === 'B' || optionDebordementA5 === 'AB') ? 4 : 6;
  var competencesFinales = competencesPro.slice(0, MAX_COMPETENCES_A5);
  if (competencesFinales.length < SEUIL_COMPETENCES_PRO_MINIMUM) {
    var complement = (objetCV.competencesPersonnelles || []).slice(0, MAX_COMPETENCES_A5 - competencesFinales.length);
    competencesFinales = competencesFinales.concat(complement);
  }
  // TACHE : expériences plafonnées à 3 si "Retirer du contenu" -- les
  // plus RÉCENTES conservées en priorité (l'ordre d'origine du dossier
  // est déjà chronologique, jamais retrié ici).
  var experiencesA5 = objetCV.experiences || [];
  if ((optionDebordementA5 === 'B' || optionDebordementA5 === 'AB') && experiencesA5.length > 3) { experiencesA5 = experiencesA5.slice(0, 3); }
  // TACHE : formations plafonnées à 2, certifications à 3, loisirs+langues
  // à 3 chacun -- même logique, jamais appliqué si "Ne rien faire" ou
  // "Réduire la police" (option A) sont choisis à la place.
  var formationsA5 = objetCV.formations || [];
  var certificationsA5 = objetCV.certifications || [];
  var loisirsA5 = objetCV.loisirs || [];
  var languesA5 = objetCV.langues || [];
  if (optionDebordementA5 === 'B' || optionDebordementA5 === 'AB') {
    formationsA5 = formationsA5.slice(0, 2);
    certificationsA5 = certificationsA5.slice(0, 3);
    loisirsA5 = loisirsA5.slice(0, 3);
    languesA5 = languesA5.slice(0, 3);
  }
  return {
    competences: competencesFinales,
    formations: formationsA5,
    certifications: certificationsA5,
    loisirs: loisirsA5,
    langues: languesA5,
    experiences: experiencesA5
  };
}

function composeurComposer(objetCV, profil, decisions, variantesChoisies, formatPage, theme) {
  variantesChoisies = variantesChoisies || {};
  // TACHE (format Mini CV A5) : branchement précoce, avant toute la
  // logique de stratégie/capacités/débordement -- ce format n'a besoin
  // d'aucune de ces mécaniques (contenu fixe, jamais tronqué par une
  // règle A4). Retourne directement une composition minimale dédiée,
  // jamais transformée par le reste de cette fonction.
  // TACHE (format Mini CV A5 -- Paysage) : mêmes règles de contenu fixe
  // que Portrait (composeurComposerA5Portrait), seul l'agencement visuel
  // change (3 colonnes au lieu de 2) -- jamais une seconde fonction de
  // composition dupliquée pour la même logique de contenu.
  if (formatPage === 'A5-portrait' || formatPage === 'A5-paysage') {
    var compositionA5 = composeurComposerA5Portrait(objetCV, theme);
    compositionA5.formatPage = formatPage;
    return compositionA5;
  }
  // TACHE (retour utilisateur : "A4 Détaillé et A4 Essentiel sont
  // identiques pour ce modèle") : formatPage n'etait jamais pris en
  // compte ici -- desormais, les capacites ET la longueur des missions
  // different reellement selon le format, meme principe que les 16
  // modeles existants (CAPACITES_A4_ESSENTIEL_CV, deja global, deja LA
  // reference partagee).
  var formatEssentiel = (formatPage === 'A4-essentiel');
  // TACHE (Projet XXL, "CV Intégral") : format nouveau, seul autorisant
  // 2 pages -- "aucune réduction A/B ne s'y applique" (doc Projet XXL).
  var estFormatIntegral = (formatPage === 'A4-integral');
  // TACHE (Projet XXL) : conditionne toute la logique spécifique à ce
  // thème plus bas (bloc mis en avant, séparation compétences
  // pro/comportementales, mécanisme A/B) -- theme.id n'est jamais
  // 'projetxxl' pour Sobre/Institutionnel/Moderne, donc ces branches
  // sont structurellement inatteignables pour eux.
  var estProjetXXL = !!(theme && theme.id === 'projetxxl');
  // TACHE (Projet XXL, mécanisme A/B/C) : réponse de la personne au
  // constat de dépassement -- n'existe que sur le thème Projet XXL
  // (theme.optionDebordement), donc toujours null pour les 3 autres
  // thèmes.
  var optionDebordement = (theme && theme.optionDebordement) || null;
  // TACHE (bouton ultime "1 page, lisible" -- levier "plus d'informations
  // s'il reste de la place") : INDEPENDANT de R005 (qui se base sur une
  // classification a priori du volume de texte, jamais une mesure du vide
  // reellement laisse sur la page rendue). Ce levier n'est jamais decide
  // par une regle du Rule Engine -- uniquement par le bouton ultime
  // (app.js), qui l'active, mesure REELLEMENT si le CV tient toujours sur
  // 1 page une fois la police agrandie, et revient en arriere sinon.
  // Jamais applique en CV Integral (deja son propre mecanisme dedie, R005
  // + bonus ligne plus bas).
  var tailleBonusActif = !!(theme && theme.tailleBonus);

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

  // TACHE (Projet XXL, doc de conception : "garder l'existant du
  // Composeur tel quel... juste a integrer dans le panneau de reglages") :
  // theme.strategieForcee (Projet XXL uniquement -- undefined/falsy pour
  // les 3 autres themes, donc sans le moindre effet sur eux) permet a la
  // personne d'imposer une strategie precise, PAR-DESSUS la recommandation
  // automatique de R005 -- jamais a la place de son calcul (decisionStrategie
  // reste calculee normalement juste au-dessus, tracee telle quelle dans
  // `explications` plus bas : "le moteur conseille, la personne decide").
  // Garde-fou : strategieParId() retourne null pour un id inconnu -- dans
  // ce cas (ne devrait jamais arriver, deja valide en amont par
  // composeurAppliquerReglagesProjetXXL(), mais verifie ici aussi par
  // prudence), on retombe silencieusement sur la recommandation de R005,
  // jamais un plantage.
  if (estProjetXXL && theme.strategieForcee && typeof strategieParId === 'function') {
    var strategieImposee = strategieParId(theme.strategieForcee);
    if (strategieImposee) { strategieCV = strategieImposee; }
  }

  // 'enTete' est toujours dessine separement, en premier, par le Render
  // Engine (jamais dans la liste "principale") -- filtre ici. Les
  // rubriques dont aucun composant n'existe encore (ex. 'competencesCles'
  // du Mixte, etape 4, pas encore construite) sont egalement filtrees --
  // jamais un plantage, jamais un encart vide pour une rubrique non geree.
  var RUBRIQUES_SUPPORTEES = ['profil', 'experiences', 'formations', 'competences', 'competencesCles', 'langues', 'loisirsEngagements', 'competencesPersonnelles'];
  var ordreRubriquesPrincipales = strategieCV
    ? strategieCV.ordreRubriques.filter(function (r) { return RUBRIQUES_SUPPORTEES.indexOf(r) !== -1; })
    : ['profil', 'experiences', 'formations', 'competences', 'langues', 'loisirsEngagements'];

  // TACHE (retour utilisateur : "profil et phrase d'accroche pourquoi sont
  // les memes ? j'ai le meme texte en double") : bug reel trouve -- la
  // phrase d'accroche de l'en-tete Projet XXL (_projetxxlConstruireEnTete,
  // composeurRender.js) et le bloc "Profil" du corps lisent tous les deux
  // EXACTEMENT le meme champ (objetCV.profil.profilIA/profilUtilisateur) --
  // aucune donnee ERIP ne distingue une "accroche courte" d'un "profil
  // complet". Plutot que d'afficher deux fois le meme texte, la rubrique
  // "profil" est retiree du corps UNIQUEMENT pour Projet XXL -- le texte
  // ne s'affiche alors qu'une seule fois, dans l'en-tete. Si une lettre de
  // motivation accompagne le CV (theme.lettreJointe), objetCV.profil est
  // deja vide a ce stade (voir composeurMoteur.js) : la rubrique aurait de
  // toute facon ete vide ici, ce retrait ne change donc rien dans ce cas
  // precis. Sobre/Institutionnel/Moderne, qui n'ont pas d'en-tete a
  // accroche, gardent leur bloc "Profil" intact -- comportement inchange.
  if (estProjetXXL) {
    ordreRubriquesPrincipales = ordreRubriquesPrincipales.filter(function (r) { return r !== 'profil'; });
  }

  // TACHE (retour utilisateur : "mélange loisirs/centre d'intérêt",
  // verification a posteriori avec composeurStrategies.js recu) : capture
  // AVANT le split colonnes plus bas si 'loisirsEngagements' fait
  // reellement partie de cette strategie -- necessaire car la strategie
  // "Par competences" (STRATEGIES_CV, composeurStrategies.js) ne l'inclut
  // PAS dans son ordreRubriques (contrairement a Chronologique/Mixte).
  // Sans cette verification, le nouveau bloc "Experience personnelle"
  // (injecte plus bas) apparaitrait pour cette strategie alors que
  // Centre d'interet/Engagements n'y apparaissaient jamais avant -- une
  // nouvelle visibilite non demandee, pas une simple separation de
  // l'existant. Avec elle, "Par competences" continue de n'afficher ni
  // Centre d'interet ni Experience personnelle, exactement comme avant
  // cette serie de corrections.
  var loisirsEngagementsPresent = ordreRubriquesPrincipales.indexOf('loisirsEngagements') !== -1;

  // TACHE (retour utilisateur : "le document fait 4 pages" -- bug reel,
  // pas une question de style) : les fonctions hauteurLignesEstimee()
  // existaient deja dans le registre (composeurComposants.js) mais
  // n'etaient JAMAIS appelees nulle part -- aucun plafond ne s'appliquait
  // donc reellement au contenu, contrairement au systeme des 16 modeles
  // (deja plafonne, ex. 5 experiences). Reutilise CAPACITES_A4_DETAILLE_CV
  // (formatA5CV.js, deja global, deja LA reference partagee pour ce
  // meme plafonnage ailleurs dans l'appli) plutot que d'inventer un
  // nouveau jeu de plafonds propre au Composeur.
  //
  // TACHE (Projet XXL, "CV Intégral") : aucun plafonnement -- 2 pages
  // sont explicitement autorisées, "aucune réduction A/B ne s'y
  // applique" (doc Projet XXL). capacites = {} fait que tout .slice(0,
  // capacites.xxx) reçoit "undefined" comme borne, ce qui renvoie le
  // tableau COMPLET (comportement JS volontaire, pas un oubli).
  // TACHE (retour utilisateur : "il y a une limite des compétences par
  // bloc ?") : CAPACITES_A4_DETAILLE_CV n'existe nulle part dans la base
  // ERIP (verifie) -- capacites devenait {} ici, donc SANS AUCUNE limite
  // en "A4 Détaillé" pour les 4 themes du Composeur. Corrige avec
  // COMPOSEUR_CAPACITES_A4_DETAILLE_CV (voir en tete de fichier -- nom
  // volontairement DISTINCT pour ne jamais interferer avec le pipeline
  // des 16 modeles classiques, qui reference le nom original ailleurs).
  var capacites = estFormatIntegral
    ? {}
    : formatEssentiel
      ? ((typeof CAPACITES_A4_ESSENTIEL_CV !== 'undefined') ? CAPACITES_A4_ESSENTIEL_CV : {})
      : COMPOSEUR_CAPACITES_A4_DETAILLE_CV;
  // TACHE (bouton ultime, levier "expériences supplémentaires écartées
  // par la capacité") : clone AVANT toute modification -- capacites
  // reference un objet PARTAGE (COMPOSEUR_CAPACITES_A4_DETAILLE_CV /
  // CAPACITES_A4_ESSENTIEL_CV), jamais mute directement (corromprait
  // tous les CV generes ensuite, meme pour d'autres personnes). N'ajoute
  // le cout du clonage que si un bonus est reellement demande.
  if (estProjetXXL && theme.capaciteExperiencesBonus) {
    var capacitesEtendues = {};
    Object.keys(capacites).forEach(function (k) { capacitesEtendues[k] = capacites[k]; });
    capacitesEtendues.experiences = (capacitesEtendues.experiences || 0) + theme.capaciteExperiencesBonus;
    capacites = capacitesEtendues;
  }
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
  // TACHE (Projet XXL, "CV Intégral") : tout ce mécanisme de troncature
  // par caractères est désactivé -- aucune réduction n'a de sens sur un
  // format qui autorise justement le débordement sur 2 pages.
  // TACHE (retour utilisateur : "5-6 lignes par expérience, s'adapter au
  // nombre d'expériences, développer si la personne n'en a qu'une seule")
  // : pour Projet XXL UNIQUEMENT, remplace la troncature par CARACTERES
  // (bloc ci-dessous, désormais réservé aux 3 autres thèmes) par un
  // plafond en NOMBRE DE LIGNES de missions -- une phrase entière par
  // ligne (peut déborder sur 2 lignes physiques dans Word si elle est
  // longue, jamais coupée en plein mot comme le faisait _dnTronquerTexte).
  // "Peu d'expériences" compte le TOTAL pro + perso (Expérience
  // personnelle rivalise pour la même colonne principale) : seuils
  // retenus après discussion -- 1 au total = illimité, 2 = 6 lignes/exp,
  // 3+ = 5 lignes/exp (Détaillé) ; 1 = 3 lignes, 2+ = 1 ligne (Essentiel) ;
  // CV Intégral = 10 lignes fixes, jamais d'adaptation (page 2 déjà
  // autorisée explicitement pour ce format).
  if (estProjetXXL && !objetCV._regroupementExperiencesApplique) {
    var nombreExperiencesProBrutes = (objetCV.experiences || []).length;
    var nombreExperiencesPersoBrutes = (objetCV.experiencesPersonnelles || []).length + (objetCV.engagements || []).length;
    var totalExperiencesToutesConfondues = nombreExperiencesProBrutes + nombreExperiencesPersoBrutes;

    var lignesMaxParExperience;
    if (estFormatIntegral) {
      lignesMaxParExperience = 10;
    } else if (formatEssentiel) {
      lignesMaxParExperience = (totalExperiencesToutesConfondues <= 1) ? 3 : 1;
    } else {
      // TACHE (retour utilisateur : "je manque de place depuis que j'ai
      // le bloc formation et expérience personnelle... on va réduire au
      // niveau des expériences professionnelles : 1 expérience = 5
      // missions, 2 expériences = 3 missions chacune, 3 expériences = 2
      // chacune, 4 expériences = 1 la plus importante") : basé
      // UNIQUEMENT sur le nombre d'expériences PROFESSIONNELLES (jamais
      // mélangé au personnel, qui suit sa propre logique ailleurs) --
      // remplace l'ancien calcul (mélangeant pro+perso, avec un cas
      // "illimité" pour 1 seule expérience au total) par cette
      // proportionnalité stricte, y compris pour une seule expérience
      // (5 missions maximum désormais, plus jamais illimité).
      if (nombreExperiencesProBrutes <= 1) { lignesMaxParExperience = 5; }
      else if (nombreExperiencesProBrutes === 2) { lignesMaxParExperience = 3; }
      else if (nombreExperiencesProBrutes === 3) { lignesMaxParExperience = 2; }
      else { lignesMaxParExperience = 1; }
      // TACHE (bouton ultime, levier "développer les missions tronquées") :
      // bonus independant, ajoute APRES le calcul normal par nombre
      // d'experiences -- jamais une nouvelle regle de proportionnalite,
      // juste un supplement teste reellement (app.js, test-et-repli) une
      // fois qu'il reste de la place. N'a de sens qu'en A4 Detaille
      // (Essentiel/Integral suivent leur propre logique fixe ci-dessus,
      // jamais concernee par ce bonus).
      lignesMaxParExperience += theme.missionsBonus || 0;
    }

    if (lignesMaxParExperience !== Infinity) {
      experiencesRetenues = experiencesRetenues.map(function (e) {
        if (!e.missions) { return e; }
        var lignesMission = e.missions.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        if (lignesMission.length <= lignesMaxParExperience) { return e; }
        var copie = {};
        Object.keys(e).forEach(function (k) { copie[k] = e[k]; });
        copie.missions = lignesMission.slice(0, lignesMaxParExperience).join('\n');
        return copie;
      });
    }
  } else if (!estFormatIntegral) {
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
  }

  // TACHE (Projet XXL, mécanisme A/B/C, option B) : retire 1 ligne de
  // mission sur 3, jamais en coupant en plein milieu d'une ligne -- les
  // missions sont donc réduites par LIGNE (séparateur \n), pas par
  // caractère (contrairement à la troncature ci-dessus, qui reste le
  // filet de secours par défaut hors Projet XXL).
  //
  // TACHE (correction demandée : épargner la vraie expérience "mise en
  // avant", pas une réduction uniforme) : aucun champ explicite
  // "prioritaire" n'existe sur une expérience de l'objet CV normalisé
  // (vérifié dans app.js -- experiencesAMettreEnAvant ne sert qu'à
  // reporter une date confirmée par l'IA, jamais à marquer une priorité
  // d'affichage). En revanche, objetDecide.experiences (construit par
  // appliquerMoteurDecisionCV(), app.js) est rebâti dans l'ORDRE de
  // recommandationsGenerique.experiences -- lui-même dans l'ordre validé
  // par la personne à l'écran "Choisissez ce que l'IA propose" (voir
  // deciderListeObjets(), app.js : les éléments recommandés/choisis
  // sont toujours placés AVANT le reste du dossier, dans l'ordre de la
  // recommandation). La PREMIÈRE expérience du tableau est donc, par
  // construction du pipeline existant, la plus mise en avant -- c'est le
  // seul signal de priorité réellement disponible à cette couche, exploité
  // ici plutôt qu'une réduction uniforme : experiencesRetenues[0] (avant
  // toute troncature) est épargnée, la réduction porte uniquement sur
  // les suivantes.
  if (estProjetXXL && (optionDebordement === 'B' || optionDebordement === 'AB') && !estFormatIntegral) {
    experiencesRetenues = experiencesRetenues.map(function (e, index) {
      if (index === 0) { return e; } // experience la plus mise en avant, jamais reduite
      if (!e.missions) { return e; }
      var lignes = e.missions.split('\n').filter(function (l) { return l.trim(); });
      if (lignes.length < 2) { return e; } // rien a retirer sans casser le contenu
      var conservees = lignes.filter(function (_, i) { return (i + 1) % 3 !== 0; });
      var copie = {};
      Object.keys(e).forEach(function (k) { copie[k] = e[k]; });
      copie.missions = conservees.join('\n');
      return copie;
    });
  }

  // TACHE (retour utilisateur : "en Essentiel on peut fusionner pro et
  // comportementales en 1 bloc de 8, pas en Détaillé") : la fusion ne
  // s'applique QU'en A4 Essentiel, uniquement pour Projet XXL -- jamais
  // pour A4 Détaillé/CV Intégral (2 blocs séparés, comme construit
  // précédemment), jamais pour les 3 autres thèmes (qui n'ont de toute
  // façon jamais eu de séparation pro/comportementales à fusionner).
  var fusionnerCompetencesXXL = estProjetXXL && formatEssentiel;

  var contenuRetenu = {
    experiences: experiencesRetenues,
    formations: (objetCV.formations || []).slice(0, capacites.formations),
    // TACHE (retour utilisateur : "bandeau de disponibilité -- retirer
    // permis/langues de leur emplacement habituel pour éviter le
    // doublon") : vide ici si le bandeau est actif -- suffit à faire
    // disparaître la rubrique "Langues" de son emplacement normal
    // (colonne latérale ou bloc combiné Formation+Langues en 1 colonne),
    // sans toucher composeurRender.js (même principe "vide = jamais
    // affiché" déjà en place partout ailleurs). Le permis, lui, est géré
    // séparément dans l'en-tête (composeurRender.js, _projetxxlConstruireEnTete).
    langues: theme.bandeauDisponibilite ? [] : (objetCV.langues || []).slice(0, capacites.langues),
    loisirs: (objetCV.loisirs || []).slice(0, capacites.loisirs),
    engagements: (objetCV.engagements || []).slice(0, capacites.engagements),
    // TACHE (retour utilisateur : "CACES/titre pro = certification, doit
    // impérativement apparaître" -- bug réel, corrigé) : objetCV.
    // certifications n'était lu NULLE PART dans le Composeur (aucun des 4
    // thèmes) -- perte de contenu silencieuse, jamais signalée avant
    // aujourd'hui. Corrigé pour TOUS les thèmes (voir répartition plus
    // bas : intégré à "Formation" pour Projet XXL, section séparée pour
    // les 3 autres, comme le fait déjà le pipeline classique).
    certifications: (objetCV.certifications || []).slice(0, capacites.certifications),
    // TACHE (retour utilisateur : "compétences personnelles" -- bloc
    // additif, voir cv.md point 10) : déjà décidé et construit par
    // appliquerMoteurDecisionCV() (app.js), transmis tel quel ici --
    // jamais une seconde logique de déclenchement dans le Composeur.
    // TACHE (retour utilisateur : fusion en Essentiel pour Projet XXL) :
    // si fusionnerCompetencesXXL, ce contenu rejoint le bloc "competences"
    // fusionné plus bas (voir texte explicatif) -- reste vide ici pour
    // eviter tout doublon (jamais affiché deux fois).
    competencesPersonnelles: fusionnerCompetencesXXL
      ? []
      : (objetCV.competencesPersonnelles || []).slice(0, capacites.competences),
    // TACHE (Projet XXL, renommage + séparation actés dans le document
    // de conception) : "Compétences professionnelles" = savoir-faire +
    // savoirs UNIQUEMENT pour ce thème (savoir-être en est retiré, il
    // rejoint "Compétences comportementales" plus bas) -- les 16 modèles
    // classiques et Sobre/Institutionnel/Moderne continuent de fusionner
    // les 3 listes exactement comme avant, comportement inchangé.
    // TACHE (retour utilisateur : "8 en tout, pas 8 par bloc, pour
    // Essentiel") : cas fusionnerCompetencesXXL -- les 4 sources
    // (savoirFaire, savoirEtre, savoirs, competencesPersonnelles/
    // Découverte) rejoignent une SEULE liste, plafonnée par
    // COMPOSEUR_XXL_CAP_COMPETENCES_ESSENTIEL_FUSIONNE (8, dédié à ce cas
    // précis -- jamais CAPACITES_A4_ESSENTIEL_CV.competences, qui reste à
    // 6 pour tout le reste de l'application, jamais touché).
    competences: fusionnerCompetencesXXL
      ? (competencesBrutes.savoirFaire || []).concat(
          competencesBrutes.savoirEtre || [], competencesBrutes.savoirs || [], objetCV.competencesPersonnelles || []
        ).slice(0, COMPOSEUR_XXL_CAP_COMPETENCES_ESSENTIEL_FUSIONNE)
      : estProjetXXL
        ? (competencesBrutes.savoirFaire || []).concat(competencesBrutes.savoirs || []).slice(0, capacites.competences)
        : (competencesBrutes.savoirFaire || []).concat(competencesBrutes.savoirEtre || [], competencesBrutes.savoirs || []).slice(0, capacites.competences),
    // TACHE (retour utilisateur : "combiner experiencesPersonnelles ET
    // engagements dans le bloc Expérience personnelle") : objetCV.
    // experiencesPersonnelles (dossier.experiencesPerso, SCHEMA_CV.md --
    // "bénévolat, entraide familiale, gestion du foyer", structuré
    // {intitule, detail}) est le VRAI champ dédié -- distinct
    // d'"engagements" (simple liste de phrases, "engagements associatifs/
    // citoyens"). Les deux alimentent desormais ensemble le bloc
    // "Expérience personnelle" (voir plus bas et composeurRender.js),
    // UNIQUEMENT pour Projet XXL -- les 16 modèles classiques et
    // Sobre/Institutionnel/Moderne ne lisent jamais ce champ ici.
    // Réutilise capacites.engagements comme budget commun aux 2 sources
    // fusionnées dans le même bloc visuel, à défaut d'une constante
    // dédiée à ce couple précis.
    experiencesPersonnelles: estProjetXXL
      ? (objetCV.experiencesPersonnelles || []).slice(0, capacites.engagements)
      : []
  };

  // TACHE (Projet XXL) : "Compétences comportementales" (renommage acté
  // de "Compétences personnelles") = savoir-être + le bloc "Compétences
  // personnelles" existant (objetCV.competencesPersonnelles, module
  // Découverte) -- fusionnés UNIQUEMENT pour ce thème. Les entrées
  // savoir-être sont ramenées à la même forme {competence} que celles du
  // module Découverte pour que composeurRender.js les dessine de façon
  // strictement identique, sans code de rendu dupliqué.
  // TACHE (retour utilisateur : "5 pro / 5 comportementales pour
  // Détaillé") : capacites.competencesPersonnelles (nouvelle clé, voir
  // COMPOSEUR_CAPACITES_A4_DETAILLE_CV en tête de fichier) remplace
  // capacites.competences ici -- les 2 blocs ont désormais chacun leur
  // propre plafond, jamais un total combiné. Cette branche ne s'exécute
  // plus du tout si fusionnerCompetencesXXL (Essentiel) : dans ce cas,
  // tout est déjà fusionné dans "competences" ci-dessus, ce bloc reste
  // vide (voir contenuRetenu.competencesPersonnelles plus haut).
  if (estProjetXXL && !fusionnerCompetencesXXL) {
    contenuRetenu.competencesPersonnelles = (competencesBrutes.savoirEtre || [])
      .map(function (texte) { return { competence: texte }; })
      .concat(objetCV.competencesPersonnelles || [])
      .slice(0, capacites.competencesPersonnelles);
  }

  // TACHE (chantier "stratégie 3 branches", cv.md point 15) : le vrai
  // regroupement thematique ("Accompagnement socio-professionnel",
  // "Animation de groupe"...) est desormais propose par l'IA elle-meme
  // (cv.md) et deja VALIDE en amont (appliquerMoteurDecisionCV, app.js --
  // chaque illustrePar y est deja verifie contre une experience reelle du
  // dossier). Ce fichier ne fait QUE dessiner ce qui lui est donne,
  // jamais de rapprochement par mots-clés ici (§3.1 du contrat, toujours
  // respecte). Re-filtre neanmoins illustrePar contre experiencesRetenues
  // (celles reellement affichees sur CE CV, deja plafonnees par
  // capacites plus haut) : une experience validee au niveau du dossier
  // entier pourrait avoir ete exclue de CE CV precis par la capacite.
  if (strategieCV && strategieCV.id === 'parCompetences' && (objetCV.competencesGroupeesParTheme || []).length) {
    function nomCorrespondAUneExperienceRetenue(nom) {
      return experiencesRetenues.some(function (e) {
        return (e.poste && correspond(e.poste, nom)) || (e.entreprise && correspond(e.entreprise, nom));
      });
    }
    var groupesRestants = capacites.competences;
    contenuRetenu.competencesGroupees = objetCV.competencesGroupeesParTheme.map(function (groupe) {
      if (groupesRestants <= 0) { return null; }
      var itemsRetenus = (groupe.items || []).slice(0, groupesRestants);
      groupesRestants -= itemsRetenus.length;
      return {
        theme: groupe.theme,
        items: itemsRetenus.map(function (item) {
          return {
            texte: item.texte,
            illustrePar: (item.illustrePar || []).filter(nomCorrespondAUneExperienceRetenue)
          };
        })
      };
    }).filter(function (g) { return g && g.items.length > 0; });
  }

  // TACHE (étape 3, contrat §3.1 -- décision tranchée : mode dégradé pour
  // tous les dossiers en V1, "Illustré par" réservé à l'étape 5 pour les
  // dossiers Découverte uniquement) : regroupement par nature
  // (technique/savoir-être) plutôt qu'une liste plate -- pas encore le
  // regroupement thématique fin ("Accompagnement socio-professionnel",
  // "Animation de groupe") qui demanderait le lien compétence↔expérience,
  // volontairement pas construit ici. Un vrai regroupement fonctionnel,
  // pas une promesse plus large que ce que les données permettent.
  //
  // TACHE (chantier "stratégie 3 branches", cv.md point 15) : REPLI
  // uniquement -- ce bloc ne s'exécute plus que si le bloc ci-dessus n'a
  // rien produit (objetCV.competencesGroupeesParTheme vide ou absent :
  // dossier généré avant ce chantier, ou IA n'ayant rien proposé
  // d'exploitable pour ce profil précis). Ancienne interaction non
  // tranchée (2 groupes fixes ne respectant pas les colonnes Pro/
  // Comportementales de Projet XXL) : concerne désormais uniquement ce
  // mode dégradé, plus le cas normal.
  if (strategieCV && strategieCV.id === 'parCompetences' && !(contenuRetenu.competencesGroupees && contenuRetenu.competencesGroupees.length)) {
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
  //
  // TACHE (Projet XXL) : cette même liste de préférence sert aussi pour
  // Projet XXL -- correspond exactement à sa colonne latérale documentée
  // (Compétences professionnelles, Compétences comportementales, Centre
  // d'intérêt = 'competences', 'competencesPersonnelles',
  // 'loisirsEngagements'). 'langues' y reste également inclus par
  // cohérence avec le reste de l'app -- le document Projet XXL ne le
  // mentionne pas explicitement, ni pour l'inclure ni pour l'exclure ;
  // à confirmer si une exclusion était en réalité voulue.
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

  // TACHE (retour utilisateur : "compétences comportementales passent
  // avant centre d'intérêt... ordre : compétences pro > compétences
  // comportementales > centre d'intérêt") : l'ordre ci-dessus suit celui
  // de la stratégie de contenu (strategieCV.ordreRubriques,
  // composeurStrategies.js) -- jamais pensé pour respecter un ordre fixe
  // de colonne latérale. Pour Projet XXL uniquement, réordonne selon la
  // séquence fixe demandée -- un simple filtre sur une séquence de
  // référence (jamais une liste écrite en dur qui pourrait faire
  // apparaître une rubrique absente : seules celles réellement présentes
  // dans ordreRubriquesLaterales sont conservées, dans cet ordre).
  // L'effet "si aucune compétence pro, les comportementales remontent
  // naturellement en haut" découle directement de cet ordre fixe, sans
  // logique supplémentaire : dessinerRubrique() (composeurRender.js) ne
  // pousse aucun paragraphe pour une rubrique vide, le contenu suivant
  // dans la liste occupe donc naturellement la première place visible.
  // 'langues' n'apparaît dans aucune des 3 stratégies actuelles
  // (composeurStrategies.js) -- jamais présent dans la pratique
  // aujourd'hui, mais positionné ici par prudence si ça change un jour.
  if (estProjetXXL) {
    var ORDRE_LATERALE_XXL = ['competences', 'langues', 'competencesPersonnelles', 'loisirsEngagements'];
    ordreRubriquesLaterales = ORDRE_LATERALE_XXL.filter(function (r) { return ordreRubriquesLaterales.indexOf(r) !== -1; });
  }

  // Ajustement 1 : repartition EXPLICITE par colonne. "laterale" reste
  // vide en V1 (nombreColonnes === 1) -- cette forme ne changera plus
  // quand une variante d'en-tete a sidebar sera ajoutee, seule la
  // logique qui REMPLIT "laterale" evoluera alors.
  var repartitionColonnes = {
    principale: ordreRubriquesPrincipales,
    laterale: ordreRubriquesLaterales
  };

  // TACHE (retour utilisateur : "mélange entre loisirs et centre
  // d'intérêt, j'ai des savoir-être/engagements qui apparaissent dans
  // centre d'intérêt") : bug/confusion reel -- 'loisirsEngagements'
  // (positionne ci-dessus, comportement INCHANGE pour Sobre/
  // Institutionnel/Moderne) melangeait Loisirs ET Engagements sous un
  // meme slot, parfois en colonne laterale. Pour Projet XXL uniquement,
  // ce slot ne porte desormais QUE les loisirs (voir composeurRender.js,
  // titre "Centre d'intérêt", TOUJOURS en colonne laterale en 2 colonnes
  // -- jamais deplacable via "mis en avant", conformement a la demande
  // "le bloc centre d'intérêt restera à gauche"). Les engagements
  // rejoignent un NOUVEAU slot 'experiencesPersonnelles' ("Expérience
  // personnelle"), ajoute ici manuellement (jamais connu de la strategie
  // de contenu/composeurStrategies.js, qui ignore cet id) -- TOUJOURS en
  // colonne PRINCIPALE, jamais laterale, et eligible au bloc mis en avant
  // comme n'importe quelle autre rubrique de cette colonne (voir plus
  // bas) : "si quelque chose d'exceptionnel", la personne peut le faire
  // remonter en tete.
  if (estProjetXXL && loisirsEngagementsPresent &&
    (contenuRetenu.engagements.length || contenuRetenu.experiencesPersonnelles.length)) {
    repartitionColonnes.principale.push('experiencesPersonnelles');
  }

  // TACHE (retour utilisateur : "CACES/titre pro = certification, doit
  // impérativement apparaître") : POUR PROJET XXL, les certifications
  // sont intégrées DIRECTEMENT dans le rendu de la rubrique 'formations'
  // (voir composeurRender.js) -- jamais une rubrique séparée ici, comme
  // demandé explicitement ("intégrer la partie Formation"). Pour les 3
  // AUTRES thèmes (Sobre/Institutionnel/Moderne), en revanche, une
  // rubrique 'certifications' à part est injectée ici -- jamais connue de
  // la stratégie de contenu (composeurStrategies.js, qui ignore cet id,
  // comme 'experiencesPersonnelles' ci-dessus), positionnée juste après
  // 'formations' pour rester logiquement groupée, cohérent avec la
  // convention déjà utilisée par le pipeline des 16 modèles classiques
  // (section "Certifications" séparée).
  if (!estProjetXXL && contenuRetenu.certifications.length) {
    var indexFormationsPourCertifs = repartitionColonnes.principale.indexOf('formations');
    if (indexFormationsPourCertifs !== -1) {
      repartitionColonnes.principale.splice(indexFormationsPourCertifs + 1, 0, 'certifications');
    } else {
      repartitionColonnes.principale.push('certifications');
    }
  }

  // TACHE (retour utilisateur : "on va travailler l'option 1 colonne...
  // ordre absolu : compétences, expériences pro, expérience
  // personnelle, formation+langues, centre d'intérêt") : pour Projet XXL
  // en 1 colonne UNIQUEMENT, remplace ENTIÈREMENT l'ordre issu de la
  // stratégie de contenu (composeurStrategies.js, pensé pour la
  // répartition 2 colonnes) par cet ordre fixe explicitement validé --
  // jamais pour les 3 autres thèmes (qui gardent leur propre logique 1
  // colonne existante, inchangée), jamais pour Projet XXL en 2 colonnes
  // (tout ce qui précède reste la seule logique utilisée dans ce cas).
  // 'competencesCombinees' et 'formationLangues' sont 2 NOUVELLES
  // rubriques synthétiques (jamais connues de la stratégie de contenu,
  // même principe que 'experiencesPersonnelles'/'certifications' plus
  // haut) -- dessinées côte à côte par composeurRender.js (tableau à 2
  // cellules), avec repli automatique en bloc plein-largeur si un seul
  // des deux côtés a du contenu (voir composeurRender.js -- "si un bloc
  // est vide, on ne le met pas, optimiser l'espace").
  if (estProjetXXL && nombreColonnes === 1) {
    var ordre1Colonne = [];
    if (contenuRetenu.competences.length || (contenuRetenu.competencesPersonnelles && contenuRetenu.competencesPersonnelles.length)) {
      ordre1Colonne.push('competencesCombinees');
    }
    if (contenuRetenu.experiences.length) { ordre1Colonne.push('experiences'); }
    if (contenuRetenu.experiencesPersonnelles.length || contenuRetenu.engagements.length) { ordre1Colonne.push('experiencesPersonnelles'); }
    if (contenuRetenu.formations.length || contenuRetenu.certifications.length || contenuRetenu.langues.length) { ordre1Colonne.push('formationLangues'); }
    if (contenuRetenu.loisirs.length) { ordre1Colonne.push('loisirsEngagements'); }
    repartitionColonnes.principale = ordre1Colonne;
    repartitionColonnes.laterale = [];
  }

  // TACHE (Projet XXL, "Mise en avant") : mécanisme HISTORIQUE (un seul
  // bloc, toujours vers la colonne principale) -- conservé TEL QUEL mais
  // désormais réservé au mode 1 COLONNE uniquement (là où "colonne
  // principale" et "la page entière" sont la même chose, voir plus haut
  // -- ordre1Colonne). Pas d'agrandissement de taille (décision finale
  // actée dans le document -- le simple fait d'être premier suffit).
  // GARDE-FOU testé et exigé : un bloc VIDE ne peut jamais être
  // sélectionné -- vérifié ici contre le contenu réel déjà plafonné
  // (contenuRetenu), jamais contre objetCV brut. Si le bloc est vide,
  // ignoré silencieusement (le CV garde son ordre normal), jamais une
  // exception.
  if (estProjetXXL && nombreColonnes === 1 && theme.blocMisEnAvant) {
    var blocMisEnAvant = theme.blocMisEnAvant;
    var blocEstVide = true;
    if (blocMisEnAvant === 'experiences') { blocEstVide = !contenuRetenu.experiences.length; }
    else if (blocMisEnAvant === 'formations') { blocEstVide = !contenuRetenu.formations.length; }
    else if (blocMisEnAvant === 'langues') { blocEstVide = !contenuRetenu.langues.length; }
    else if (blocMisEnAvant === 'competencesCles') { blocEstVide = !(contenuRetenu.competencesCles && contenuRetenu.competencesCles.length); }
    else if (blocMisEnAvant === 'competencesPersonnelles') { blocEstVide = !(contenuRetenu.competencesPersonnelles && contenuRetenu.competencesPersonnelles.length); }
    else if (blocMisEnAvant === 'experiencesPersonnelles') {
      blocEstVide = !(contenuRetenu.engagements.length || contenuRetenu.experiencesPersonnelles.length);
    }
    else if (blocMisEnAvant === 'competences') {
      blocEstVide = !(contenuRetenu.competences.length || (contenuRetenu.competencesGroupees && contenuRetenu.competencesGroupees.length));
    } else if (blocMisEnAvant === 'profil') {
      blocEstVide = !((objetCV.profil && (objetCV.profil.profilIA || objetCV.profil.profilUtilisateur)));
    }
    // TACHE (retour utilisateur : "1 colonne -- je vais les appeler
    // simplement des compétences") : bloc combiné pro+comportementales,
    // UNIQUEMENT proposable/pertinent en 1 colonne -- vide seulement si
    // les DEUX côtés sont vides.
    else if (blocMisEnAvant === 'competencesCombinees') {
      blocEstVide = !(contenuRetenu.competences.length || (contenuRetenu.competencesPersonnelles && contenuRetenu.competencesPersonnelles.length));
    }
    // TACHE (retour utilisateur : "1 colonne -- Formation+Langues côte à
    // côte") : bloc combiné, UNIQUEMENT proposable en 1 colonne -- vide
    // seulement si Formation ET Langues sont vides.
    else if (blocMisEnAvant === 'formationLangues') {
      blocEstVide = !((contenuRetenu.formations && contenuRetenu.formations.length) ||
        (contenuRetenu.certifications && contenuRetenu.certifications.length) ||
        (contenuRetenu.langues && contenuRetenu.langues.length));
    }

    if (!blocEstVide) {
      repartitionColonnes.principale = repartitionColonnes.principale.filter(function (r) { return r !== blocMisEnAvant; });
      repartitionColonnes.laterale = repartitionColonnes.laterale.filter(function (r) { return r !== blocMisEnAvant; });
      repartitionColonnes.principale.unshift(blocMisEnAvant);
    }
  }

  // TACHE (retour utilisateur : "je ne pense pas que remonter le bloc
  // compétences comportementales [vers la colonne principale] soit une
  // bonne idée... la chose la plus simple c'est d'avoir la possibilité
  // de mettre en avant les blocs souhaités sur les DEUX colonnes") :
  // revient sur le mécanisme précédent (traversée systématique vers la
  // colonne principale) -- pour le mode 2 COLONNES uniquement, DEUX
  // sélecteurs INDÉPENDANTS, un par colonne, qui ne font QUE réordonner
  // à l'intérieur de leur PROPRE colonne -- plus jamais de traversée
  // gauche/droite. "Si vide = pas d'option" découle directement du test
  // d'appartenance à la liste réelle de la colonne (déjà filtrée sur du
  // contenu non-vide plus haut) -- jamais besoin d'un garde-fou séparé
  // par identifiant comme l'ancien mécanisme.
  if (estProjetXXL && nombreColonnes === 2) {
    // TACHE : présence dans repartitionColonnes.laterale/.principale ne
    // suffit PAS à garantir un contenu réel (la stratégie de contenu,
    // composeurStrategies.js, peut lister une rubrique même vide) --
    // vérification explicite du contenu réel en plus, même esprit que
    // l'ancien garde-fou par identifiant.
    var blocGaucheAContenuReel = function (id) {
      if (id === 'competences') { return !!contenuRetenu.competences.length; }
      if (id === 'competencesPersonnelles') { return !!(contenuRetenu.competencesPersonnelles && contenuRetenu.competencesPersonnelles.length); }
      if (id === 'loisirsEngagements') { return !!contenuRetenu.loisirs.length; }
      return false;
    }
    var blocDroiteAContenuReel = function (id) {
      if (id === 'experiences') { return !!contenuRetenu.experiences.length; }
      if (id === 'formations') { return !!(contenuRetenu.formations.length || contenuRetenu.certifications.length); }
      if (id === 'experiencesPersonnelles') { return !!(contenuRetenu.experiencesPersonnelles.length || contenuRetenu.engagements.length); }
      return false;
    }
    if (theme.blocMisEnAvantGauche && repartitionColonnes.laterale.indexOf(theme.blocMisEnAvantGauche) !== -1 && blocGaucheAContenuReel(theme.blocMisEnAvantGauche)) {
      repartitionColonnes.laterale = repartitionColonnes.laterale.filter(function (r) { return r !== theme.blocMisEnAvantGauche; });
      repartitionColonnes.laterale.unshift(theme.blocMisEnAvantGauche);
    }
    if (theme.blocMisEnAvantDroite && repartitionColonnes.principale.indexOf(theme.blocMisEnAvantDroite) !== -1 && blocDroiteAContenuReel(theme.blocMisEnAvantDroite)) {
      repartitionColonnes.principale = repartitionColonnes.principale.filter(function (r) { return r !== theme.blocMisEnAvantDroite; });
      repartitionColonnes.principale.unshift(theme.blocMisEnAvantDroite);
    }
  }

  // R005 (echelle) + R003 (plancher dur, jamais contourne).
  var echelle = decisions.echelleTaillePolice.valeur;
  // TACHE (Projet XXL, mécanisme A/B/C, option A) : réduction modeste
  // (~17%) validée empiriquement par le document de conception comme
  // suffisante sur le cas-limite testé (réduction ~5% jugée
  // insuffisante). Jamais appliquée en CV Intégral (aucune réduction
  // n'y a de sens).
  if (estProjetXXL && (optionDebordement === 'A' || optionDebordement === 'AB') && !estFormatIntegral) { echelle = echelle * 0.83; }
  // TACHE (bouton ultime, levier "plus d'informations") : +8%, modeste et
  // volontairement independant du -17% de l'option A ci-dessus (les deux
  // pourraient en theorie coexister si un futur usage le justifie, mais
  // en pratique le bouton ultime ne les active jamais ensemble -- voir
  // app.js, activerMiseEnFormeUltimeXXL). Jamais en dessous du plancher
  // R003 (verifie plus loin, inchange).
  if (estProjetXXL && tailleBonusActif && !estFormatIntegral) { echelle = echelle * 1.08; }
  // TACHE (Projet XXL, "CV Intégral", règle NON CALIBRÉE EMPIRIQUEMENT --
  // le document de conception le précise explicitement) : première
  // version prudente -- si le contenu est notablement léger (densité
  // "faible", déjà calculée en couche ①, voir composeurProfil.js),
  // agrandit légèrement la police plutôt que laisser un grand vide en
  // page 2. Coefficient volontairement modeste (sous le +15% déjà
  // utilisé par R005 pour un contenu "faible" en 1 page) tant qu'aucun
  // test réel n'a calibré cette règle -- À AJUSTER dès que des cas
  // réels auront été vérifiés, comme le reste du mécanisme A/B/C.
  if (estProjetXXL && estFormatIntegral && profil.densite === 'faible') { echelle = echelle * 1.1; }
  // TACHE (retour utilisateur : "trop d'espace... si peu de contenu,
  // agrandir la police et mieux agencer le contenu dans la page") :
  // R005 (composeurRegles.js) applique déjà un bonus GÉNÉRIQUE de +15%
  // pour une densité "faible", partagé par les 4 thèmes -- mais mesuré
  // empiriquement (PDF réel, LibreOffice, pdftotext -bbox) sur un cas
  // clairsemé réaliste : même avec ce bonus (13pt au lieu de 11), le
  // contenu ne remplissait que la moitié de la page (y≈420 sur ~786pt
  // utiles). Bonus ADDITIONNEL, exclusif à Projet XXL en A4 Détaillé
  // (jamais pour les 3 autres thèmes, qui gardent le seul bonus
  // générique de R005, ni pour Essentiel/Intégral qui ont leurs propres
  // règles) -- calibré empiriquement (voir tests) à +15% supplémentaire
  // (compose avec R005 : 1.15 × 1.15 ≈ 1.32 au total), au-delà duquel le
  // texte devenait visuellement trop gros pour un CV professionnel.
  var estDetaille = estProjetXXL && !estFormatIntegral && !formatEssentiel;
  // TACHE : calibrage empirique (PDF réel, LibreOffice, pdftotext -bbox) --
  // 1.15 supplémentaire (échelle totale ≈1.32, police ≈15pt) fait passer
  // le remplissage d'un cas clairsemé réaliste de 50% à 59% de la zone
  // utile. Testé aussi à 1.3 (échelle ≈1.5, police ≈16pt) : seulement
  // 63%, un gain marginal de 4 points pour une police déjà disproportionnée
  // pour un CV professionnel (le corps de texte standard reste 10-12pt) --
  // limite réelle de ce levier a elle seule, retenue ici. Le reste du
  // remplissage passe par espacementExtra ci-dessous, pas par une police
  // encore plus grande.
  if (estDetaille && profil.densite === 'faible') { echelle = echelle * 1.15; }
  var taillePoliceCorps = Math.max(decisions.tailleMinPolice.valeur, Math.round(11 * echelle));

  // TACHE (retour utilisateur, suite) : la seule taille de police ne
  // suffit pas a bien "remplir" une page clairsemee sans devenir
  // excessive (voir plafond de la police ci-dessus) -- complete avec un
  // espacement vertical PROPORTIONNEL entre les elements (missions,
  // puces, entre les blocs), DECOUPLE de l'echelle de police : un
  // espacement genereux reste discret/professionnel bien au-dela de ce
  // qu'accepterait une police, teste jusqu'a 1.8 sans paraitre excessif
  // (contrairement a la police, jamais de "taille de puce disproportionnee"
  // possible -- seul l'espace ENTRE les lignes grandit, jamais leur
  // contenu). Exclusif a Projet XXL en A4 Détaillé, densité "faible".
  var espacementExtra = (estDetaille && profil.densite === 'faible') ? 1.8 : 1;

  return {
    colonnes: nombreColonnes,
    repartitionColonnes: repartitionColonnes,
    taillePoliceCorps: taillePoliceCorps,
    // TACHE (format Mini CV A5) : transmis pour que composeurRender.js
    // puisse détecter ce format et basculer vers sa mise en page dédiée
    // (composeurConstruireDocumentA5Portrait), entièrement différente de
    // la logique 1/2 colonnes habituelle -- jamais lu ailleurs, jamais
    // utilisé pour influencer la composition A4/Intégral existante.
    formatPage: formatPage,
    // TACHE (retour utilisateur : "mieux exploiter l'espace si peu de
    // contenu") : multiplicateur applique aux espacements verticaux du
    // corps (composeurRender.js) -- 1 (aucun effet) hors du cas ciblé.
    espacementExtra: espacementExtra,
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
