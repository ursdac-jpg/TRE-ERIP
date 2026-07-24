/* ============================================================
   composeurTheme.js
   ------------------------------------------------------------
   Moteur "Composeur (Bêta)" — Couche ④ : Theme Engine.
   Voir architecture-moteur-cv.md §2 (couche ④) et
   composeur-theme-engine-conception.md (cadre de conception).

   Un thème est un objet de configuration SANS AUCUNE LOGIQUE -- couleurs,
   police, style de titres, bordures, icônes, séparateurs, nombre de
   colonnes. Il ne contient jamais une taille de police en dur decidee
   pour le rendu, un choix de composant, une regle conditionnelle, ou une
   repartition de rubriques : tout cela vit dans composeurComposition.js
   (③) / composeurRegles.js (②).

   Étape B (composeur-theme-engine-conception.md) : 3 thèmes réels,
   chacun une véritable identité visuelle, pas une simple variation de
   couleur. Tous en 1 colonne pour l'instant -- décision explicite,
   distincte du chantier "2 colonnes" (mise en page, pas identité
   visuelle, traité séparément côté Composition Engine). "Moderne" n'est
   pas défini comme "le thème 2 colonnes" : son identité s'exprime
   aujourd'hui en 1 colonne par capacité disponible, elle pourra
   naturellement en exploiter 2 plus tard sans changer de personnalité.
   ============================================================ */

var COMPOSEUR_THEME_DEFAUT = {
  id: 'sobre',
  nom: 'Sobre',
  description: 'Le choix sûr, adapté à tout contexte -- gris neutre, structure classique.',
  couleurs: { primaire: '1F2937', secondaire: '4B5563', texte: '1F2937', fond: 'FFFFFF' },
  police: { titres: 'Calibri', corps: 'Calibri' },
  styleTitres: 'souligne',
  styleBordures: 'fine',
  icones: false,
  separateurs: 'ligne',
  colonnes: 1
};

// TACHE (étape B) : pensé pour les candidatures administratives, publiques,
// ou tout contexte où la sobriété inspire confiance -- jamais de couleur
// vive, aucune icône, la structure la plus classique possible.
var COMPOSEUR_THEME_INSTITUTIONNEL = {
  id: 'institutionnel',
  nom: 'Institutionnel',
  description: 'Sobriété et rigueur -- pour les candidatures administratives, publiques, ou tout contexte où la retenue inspire confiance.',
  couleurs: { primaire: '1E3A5F', secondaire: '5B6B7C', texte: '1F2937', fond: 'FFFFFF' },
  police: { titres: 'Calibri', corps: 'Calibri' },
  styleTitres: 'souligne',
  styleBordures: 'fine',
  icones: false,
  separateurs: 'ligne',
  colonnes: 1
};

// TACHE (étape B) : pensé pour des secteurs plus dynamiques (commerce,
// communication, jeunes diplômés) sans jamais devenir négligé -- titres
// en bandeau plutôt que soulignés, icônes activées, une couleur plus
// affirmée. Identité visuelle, pas "le thème 2 colonnes" (voir en-tête
// de fichier) -- reste en 1 colonne tant que le chantier correspondant
// n'est pas ouvert côté Composition Engine.
var COMPOSEUR_THEME_MODERNE = {
  id: 'moderne',
  nom: 'Moderne',
  description: 'Une identité plus affirmée et contemporaine -- pour les secteurs dynamiques, sans jamais devenir négligé.',
  couleurs: { primaire: '0F766E', secondaire: '78716C', texte: '1F2937', fond: 'FFFFFF' },
  police: { titres: 'Calibri', corps: 'Calibri' },
  styleTitres: 'bandeau',
  styleBordures: 'epaisse',
  icones: true,
  separateurs: 'ligne',
  colonnes: 1
};

// ============================================================
// TACHE (Projet XXL, document de reprise) : nouveau thème unique qui
// fusionne et dépasse Institutionnel + Moderne (leur seule vraie
// différence, titres soulignés vs bandeau coloré, devient une simple
// option À L'INTÉRIEUR de ce thème). RÈGLE ABSOLUE du document : zéro
// régression -- ce thème vit dans SON PROPRE objet, aucune ligne des 3
// thèmes ci-dessus n'est modifiée pour le faire exister.
//
// Ces valeurs sont les valeurs PAR DÉFAUT (thème "nu", avant réglages
// personnels) -- composeurAppliquerReglagesProjetXXL() ci-dessous les
// personnalise ensuite selon les choix de la personne, sans jamais
// modifier cet objet d'origine (copie défensive, même principe que
// composeurObtenirTheme()).
//
// Champs additionnels par rapport aux 3 thèmes historiques (coloration,
// nuanceCouleur, blocMisEnAvant, lettreJointe, optionDebordement) :
// n'existent QUE sur ce thème -- toute condition qui les lit ailleurs
// (composeurComposition.js, composeurRender.js) est donc sans effet sur
// Sobre/Institutionnel/Moderne, qui ne les ont jamais.
//
// NOTE DE CONCEPTION (à signaler explicitement, pas une omission
// silencieuse) : le document de reprise liste aussi "formatPage:
// 'A4-detaille'" parmi les valeurs par défaut du thème. Ce champ n'est
// PAS repris ici : formatPage reste exclusivement le paramètre dédié de
// genererDocxComposeur()/composeurComposer(), déjà existant et déjà la
// source de vérité unique pour ce réglage sur les 3 autres thèmes --
// lui donner une deuxième existence sur l'objet thème créerait deux
// sources de vérité pour la même information. Le panneau d'interface
// devra donc transmettre le format de page via ce paramètre dédié,
// jamais via reglages.formatPage.
// ============================================================
var COMPOSEUR_THEME_PROJETXXL = {
  id: 'projetxxl',
  nom: 'Projet XXL',
  description: 'Le CV modulable : structure, style et mise en avant entièrement personnalisables -- fusionne et dépasse Institutionnel et Moderne.',
  couleurs: { primaire: '2563EB', secondaire: '4B5563', texte: '1F2937', fond: 'FFFFFF' },
  police: { titres: 'Arial', corps: 'Arial' },
  styleTitres: 'simple', // 'simple' (texte souligné) | 'bandeau'
  styleBordures: 'fine',
  icones: false,
  separateurs: 'ligne',
  colonnes: 2,
  // TACHE (retour utilisateur : "on va supprimer complètement fond
  // coloré, je vais l'intégrer dans lecture guidée") : "Fond coloré"
  // n'existe plus comme choix indépendant -- absorbé dans "Lecture
  // guidée" (2 variantes internes, voir lectureGuideeVariante plus bas).
  // "Texte coloré" redéfini : ne colore plus les titres (uniquement le
  // rôle de "Lecture guidée -- par titre" désormais) -- colore
  // maintenant tout le CONTENU des blocs (compétences, missions, centres
  // d'intérêt...), jamais les titres, jamais l'accroche, jamais les
  // coordonnées de l'en-tête. Fonctionne SEUL, sans avoir besoin d'un
  // fond de colonne actif (contrairement à l'ancien "Fond des colonnes
  // -> Texte du contenu", retiré -- voir fondColonnesEffet plus bas).
  coloration: 'aucune',       // 'aucune' | 'texteColore' | 'lectureGuidee'
  // TACHE : portée du "Texte coloré" -- en 2 colonnes, laquelle(s)
  // colorer ; en 1 colonne, ignoré (tout le contenu est colore, pas de
  // notion de gauche/droite -- voir composeurRender.js).
  texteColorePortee: 'lesDeux',  // 'gauche' | 'droite' | 'lesDeux'
  // TACHE : "Lecture guidée -- par titre" reprend l'ancien "texte
  // coloré" (titre souligné coloré) ; "-- par rectangle" reprend
  // l'ancien "fond coloré" (rectangle plein derrière le titre). Les deux
  // variantes colorent le nom et le poste visé de l'en-tête (propriété
  // historique de "lecture guidée", inchangée).
  lectureGuideeVariante: 'titre', // 'titre' | 'rectangle'
  nuanceCouleur: 6,           // 1-10, voir PALETTES_COULEURS_CV
  // TACHE (retour utilisateur : "en fond coloré [désormais Lecture
  // guidée -- par rectangle], je veux choisir le texte en blanc ou en
  // noir") : n'a de sens qu'en mode 'lectureGuidee' + variante
  // 'rectangle' -- ignore silencieusement dans les autres modes, jamais
  // une erreur.
  texteBandeau: 'blanc',      // 'blanc' | 'noir' -- uniquement pertinent si coloration === 'lectureGuidee' && lectureGuideeVariante === 'rectangle'
  // TACHE (retour utilisateur : "possibilité de mettre un fond comme
  // Aquarelle sur la colonne de gauche, avec choix couleur/nuance, et 3
  // possibilités") : "Fond des colonnes" -- DISTINCT de "coloration"
  // ci-dessus (qui pilote le style des titres de section). Réutilise la
  // MEME couleur/nuance déjà choisie pour le thème (couleurs.primaire) --
  // jamais un second sélecteur de couleur, un seul accent par thème.
  fondColonnes: 'aucun',        // 'aucun' | 'gauche' | 'droite' | 'lesDeux'
  // 'fondSeul' : rien d'autre coloré.
  // 'titres' : poste visé, nom, et titres de blocs (des 2 colonnes)
  //   prennent la couleur du fond.
  // TACHE (retour utilisateur : "le seul problème, pour accéder au
  // texte coloré de fond de colonne, il faut choisir une colonne...
  // alors que texte coloré est simple, pas besoin de colonnes") :
  // l'ancien effet 'texteContenu' est retiré -- il faisait exactement
  // ce que fait déjà "Coloration -> Texte coloré" (ci-dessus), en plus
  // détourné (obligeait à activer un fond pour l'obtenir). Mutuellement
  // exclusif avec "coloration" (voir composeurRender.js) -- les deux ne
  // pilotent jamais les titres en même temps.
  fondColonnesEffet: 'fondSeul', // 'fondSeul' | 'titres'
  // TACHE : utilisé pour la collision "titre posé sur le fond de sa
  // propre couleur" (effet 'titres' ci-dessus) -- remplace la couleur
  // exacte par du blanc/noir pour rester lisible.
  texteFondColonnes: 'blanc',    // 'blanc' | 'noir'
  // TACHE (retour utilisateur : "modèle Ruban -- ligne pour séparer les
  // colonnes, ligne horizontale sous le titre du cv, souligner chaque
  // bloc de la même couleur") : réutilise la MEME technique que le
  // modèle Ruban (bordure de cellule, exportDocxNatifCV.js -- jamais
  // réinventée) et la MEME couleur/nuance déjà choisie pour le thème
  // (couleurs.primaire, comme "Fond des colonnes" et "Coloration" --
  // jamais un 3e sélecteur de couleur). DÉCOUPLÉ de la couleur du texte
  // des titres de bloc (theme.coloration / theme.fondColonnesEffet) --
  // le soulignement prend cette couleur, le TEXTE du titre garde la
  // sienne, indépendamment. "Je ne veux pas que le séparateur ait la
  // même couleur que les titres, sauf si la personne le fait exprès" :
  // décision explicite de ne PAS forcer d'exclusion mutuelle ici (à la
  // différence de "Coloration"/"Fond des colonnes -> titres", qui
  // s'excluent) -- une coïncidence de couleur reste possible si la
  // personne combine volontairement les deux réglages, jamais empêchée.
  separateurColonnes: false,    // true | false
  // TACHE (retour utilisateur : "est-ce que le séparateur peut avoir une
  // autre couleur ?... je suis plutôt favorable, on limite ça
  // intelligemment") : indépendant de couleurs.primaire -- null par
  // défaut (= garde l'accent principal, comportement inchangé), une
  // couleur/nuance dédiée uniquement si la personne le choisit
  // explicitement. Jamais de plancher de lisibilité nécessaire ici
  // (une ligne fine reste visible à n'importe quelle nuance,
  // contrairement à du texte) -- toute la plage 1-10 reste disponible.
  separateurCouleurBase: null,   // id de couleur (ex. 'vert') ou null
  separateurNuance: 6,           // 1-10, ignoré si separateurCouleurBase est null
  // TACHE (retour utilisateur : "Condensé/Épuré -- pas pour réduire le
  // nombre de missions [déjà géré par le mécanisme de débordement A/B],
  // c'est le modèle qu'on a déjà avec les points, la continuité d'une
  // mission sur la ligne de la précédente") : "epure" = mise en page
  // normale actuelle (une mission par ligne, INCHANGÉE -- confirmé par
  // comparaison de deux CV réels fournis par l'utilisateur, paragraphe
  // par paragraphe) ; "condense" = toutes les missions d'une même
  // expérience fusionnées en un seul paragraphe continu, séparées par
  // "·", jamais de nouvelle ligne. Un seul réglage par portée (pas 2
  // cases indépendantes) : les 2 valeurs s'excluent naturellement,
  // jamais besoin d'une logique d'exclusion mutuelle séparée.
  styleProfessionnel: 'epure',   // 'epure' | 'condense'
  stylePersonnel: 'epure',       // 'epure' | 'condense'
  // TACHE (retour utilisateur : "récupérer de Trajectoire l'idée d'avoir
  // les dates avant le poste... l'entreprise n'est jamais la chose
  // centrale, toujours une annexe, dans les deux cas") : 'posteAvant'
  // (défaut, comportement historique) = Poste — Entreprise [tabulation]
  // dates ; 'dateAvant' = dates [tabulation] Poste — Entreprise. Dans
  // les deux cas, l'entreprise est désormais toujours affichée en
  // couleur secondaire, jamais fusionnée en gras avec le poste (avant ce
  // réglage, "Poste — Entreprise" formait un seul bloc en gras).
  ordreDatesPoste: 'posteAvant', // 'posteAvant' | 'dateAvant'
  // TACHE (retour utilisateur : "je veux pouvoir choisir si la phrase
  // d'accroche est en italique ou pas") : true par défaut (comportement
  // identique à avant ce réglage).
  accrocheItalique: true,        // true | false
  // TACHE (retour utilisateur : "bandeau de disponibilité -- permis,
  // langues, téléphone bien en évidence en haut du CV") : false par
  // défaut. Retire permis (en-tête) et langues (colonne/bloc habituel)
  // de leur emplacement normal quand actif -- jamais un doublon (voir
  // composeurComposition.js/composeurRender.js). Désactivable/grisé côté
  // panneau si la personne n'a pas le permis (app.js) -- pas de
  // vérification ici, ce fichier ne connaît pas encore le contenu réel.
  bandeauDisponibilite: false,   // true | false
  blocMisEnAvant: null,       // id de rubrique (ex. 'experiences', 'formations') ou null -- UNIQUEMENT utilisé en 1 colonne (voir composeurComposition.js)
  // TACHE (retour utilisateur : "je ne pense pas que remonter le bloc
  // compétences comportementales soit une bonne idée... la chose la plus
  // simple c'est d'avoir la possibilité de mettre en avant les blocs
  // souhaités sur les DEUX colonnes") : remplace la traversée
  // systématique vers la colonne principale -- UNIQUEMENT utilisés en 2
  // colonnes (voir composeurComposition.js), chacun ne réordonne qu'à
  // l'intérieur de SA PROPRE colonne, plus jamais de traversée.
  blocMisEnAvantGauche: null,  // 'competences' | 'competencesPersonnelles' | 'loisirsEngagements' | null
  blocMisEnAvantDroite: null,  // 'experiences' | 'formations' | 'experiencesPersonnelles' | null
  lettreJointe: false,        // pilote le retrait automatique de l'accroche
  optionDebordement: null,    // 'A' (police) | 'B' (missions) | null -- reponse au mecanisme A/B/C
  // TACHE (Projet XXL, doc de conception : "Garder l'existant du Composeur
  // tel quel -- Auto/Chronologique/Mixte/Par competences, rien de neuf a
  // construire, juste a integrer dans le panneau de reglages") : override
  // MANUEL de la strategie normalement choisie automatiquement par R005
  // (composeurStrategies.js/composeurComposition.js). null = 'Auto' (R005
  // decide seule, comportement inchange pour les 3 autres themes qui
  // n'ont jamais ce champ) ; sinon un id de STRATEGIES_CV
  // ('chronologique'|'mixte'|'parCompetences') impose par la personne --
  // le moteur continue de CONSEILLER (R005 reste calculee et tracee, voir
  // composeurComposition.js), la personne garde toujours la main.
  strategieForcee: null
};

var COMPOSEUR_THEMES_DISPONIBLES = {
  sobre: COMPOSEUR_THEME_DEFAUT,
  institutionnel: COMPOSEUR_THEME_INSTITUTIONNEL,
  moderne: COMPOSEUR_THEME_MODERNE,
  projetxxl: COMPOSEUR_THEME_PROJETXXL
};

// TACHE (retour utilisateur : "je veux intégrer les palettes de
// couleurs... dans ce modèle") : réutilise PALETTES_COULEURS_CV_BASE
// (coloriationDocxNatifCV.js, déjà utilisée par les 16 modèles
// classiques) -- jamais une nouvelle palette inventée pour le Composeur.
// Une couleur personnalise uniquement l'accent principal (couleurs.
// primaire) d'un thème déjà choisi : elle ne change jamais son identité
// structurelle (styleTitres, icônes, bordures) -- seul le Theme Engine
// décide de la forme, la couleur reste une simple teinte par-dessus,
// cohérent avec le test d'architecture posé à la conception (§0).
function composeurCouleursDisponibles() {
  return (typeof PALETTES_COULEURS_CV_BASE !== 'undefined') ? PALETTES_COULEURS_CV_BASE : {};
}

// TACHE (retour utilisateur : "je n'ai pas les nuances que j'ai dans les
// autres modèles, je veux 6 couleurs et 10 nuances par couleur, uniformisé
// pour tous les modèles") : PALETTES_COULEURS_CV (coloriationDocxNatifCV.js)
// est la table COMPLETE déjà construite pour les 16 modèles classiques (6
// couleurs de base + 10 nuances chacune, 60 entrées, plus 6 alias vers la
// nuance 10/10) -- réutilisée telle quelle, jamais reconstruite ici.
function composeurResoudreCouleur(idCouleur) {
  var table = (typeof PALETTES_COULEURS_CV !== 'undefined') ? PALETTES_COULEURS_CV : {};
  var entree = table[idCouleur];
  // TACHE : deux formes de hex selon la source (PALETTES_COULEURS_CV_BASE
  // utilise .hex, les nuances de PALETTES_COULEURS_CV utilisent .primaire)
  // -- normalisé ici, point d'accès unique, jamais dupliqué ailleurs.
  return entree ? { nom: entree.nom, hex: entree.hex || entree.primaire } : null;
}

// TACHE (retour utilisateur : "je vais pouvoir choisir si c'est une
// colonne ou double colonne ? faisons le test avec Moderne") : le nombre
// de colonnes reste une propriété du thème (composeur-theme-engine-
// conception.md §0 : "s'applique à l'identique quel que soit le
// contenu"), mais devient ICI un choix indépendant de la couleur -- un
// marqueur "_2col"/"_1col" en fin d'id composé, séparateur distinct du
// tiret (déjà utilisé par les nuances, "bleu-7") pour ne jamais les
// confondre. Un thème dont colonnes vaut déjà 2 par défaut peut recevoir
// "_1col" pour revenir à 1, et inversement.
var COMPOSEUR_SUFFIXE_COLONNES = { '_1col': 1, '_2col': 2 };

// Point d'accès unique (jamais une lecture directe de COMPOSEUR_THEME_DEFAUT
// ou COMPOSEUR_THEMES_DISPONIBLES ailleurs) -- repli sur le thème par
// défaut si l'id demandé n'existe pas (encore), jamais une exception.
// idTheme accepte : un id de thème seul ("moderne"), composé avec une
// couleur/nuance ("moderne-bleu", "moderne-bleu-7"), un choix de colonnes
// ("moderne_2col"), ou les deux combinés ("moderne-bleu-7_2col").
//
// TACHE (Projet XXL) : cette fonction n'est PAS modifiée pour Projet XXL
// -- appelée avec l'id texte "projetxxl", elle retourne simplement
// COMPOSEUR_THEME_PROJETXXL tel quel (thème "nu", sans réglages
// personnalisés), utile comme filet de sécurité ou pour un aperçu par
// défaut. La vraie personnalisation passe exclusivement par
// composeurAppliquerReglagesProjetXXL() ci-dessous, une fonction
// ENTIÈREMENT SÉPARÉE, comme actée dans le document de reprise.
function composeurObtenirTheme(idTheme) {
  if (!idTheme) { return COMPOSEUR_THEME_DEFAUT; }

  // Etape 1 : detecter et retirer un eventuel suffixe de colonnes, avant
  // toute autre analyse -- jamais melange avec le decoupage des couleurs.
  var colonnesForcees = null;
  var idSansColonnes = idTheme;
  Object.keys(COMPOSEUR_SUFFIXE_COLONNES).forEach(function (suffixe) {
    if (idTheme.slice(-suffixe.length) === suffixe) {
      colonnesForcees = COMPOSEUR_SUFFIXE_COLONNES[suffixe];
      idSansColonnes = idTheme.slice(0, -suffixe.length);
    }
  });

  function appliquerColonnesForcees(themeResultat) {
    if (colonnesForcees === null || themeResultat.colonnes === colonnesForcees) { return themeResultat; }
    var copie = {};
    Object.keys(themeResultat).forEach(function (cle) { copie[cle] = themeResultat[cle]; });
    copie.colonnes = colonnesForcees;
    copie.id = idTheme;
    return copie;
  }

  if (COMPOSEUR_THEMES_DISPONIBLES[idSansColonnes]) {
    return appliquerColonnesForcees(COMPOSEUR_THEMES_DISPONIBLES[idSansColonnes]);
  }

  var tiret = idSansColonnes.indexOf('-');
  if (tiret === -1) { return appliquerColonnesForcees(COMPOSEUR_THEME_DEFAUT); }
  var idThemeBase = idSansColonnes.slice(0, tiret);
  var idCouleur = idSansColonnes.slice(tiret + 1);
  var themeBase = COMPOSEUR_THEMES_DISPONIBLES[idThemeBase];
  var couleur = composeurResoudreCouleur(idCouleur);
  if (!themeBase || !couleur) { return appliquerColonnesForcees(COMPOSEUR_THEME_DEFAUT); }

  // Copie defensive : ne modifie jamais l'objet thème d'origine (partagé,
  // relu à chaque génération) -- seule la couleur primaire change.
  var themePersonnalise = {};
  Object.keys(themeBase).forEach(function (cle) { themePersonnalise[cle] = themeBase[cle]; });
  themePersonnalise.couleurs = {};
  Object.keys(themeBase.couleurs).forEach(function (cle) { themePersonnalise.couleurs[cle] = themeBase.couleurs[cle]; });
  themePersonnalise.couleurs.primaire = couleur.hex;
  themePersonnalise.id = idTheme;
  themePersonnalise.nom = themeBase.nom + ' — ' + couleur.nom;
  return appliquerColonnesForcees(themePersonnalise);
}

// ============================================================
// TACHE (Projet XXL, fondation technique actée dans le document de
// reprise) : fonction ENTIÈREMENT SÉPARÉE de composeurObtenirTheme()
// ci-dessus -- ne l'appelle jamais, n'est jamais appelée par elle. Vu le
// nombre de nouvelles dimensions (colonnes, style, coloration, nuance,
// police, icônes, bloc mis en avant, lettre jointe, option de
// débordement), un objet de réglages structuré plutôt qu'un texte
// composé supplémentaire à décoder.
//
// reglages = {
//   colonnes: 1|2,
//   styleTitres: 'bandeau'|'simple' (voir garde-fou de pairage ci-dessous),
//   icones: bool,
//   police: une valeur de POLICES_PROJETXXL_DISPONIBLES,
//   coloration: 'aucune'|'fondColore'|'texteColore'|'lectureGuidee',
//   couleurBase: un id de PALETTES_COULEURS_CV_BASE (ex. 'bleu'),
//   nuanceCouleur: 1-10,
//   blocMisEnAvant: id de rubrique ou null,
//   lettreJointe: bool,
//   optionDebordement: 'A'|'B'|null
// }
//
// Retourne TOUJOURS un thème valide, copie defensive -- jamais l'objet
// COMPOSEUR_THEME_PROJETXXL d'origine modifié en place.
// ============================================================
var POLICES_PROJETXXL_DISPONIBLES = ['Arial', 'Calibri', 'Georgia', 'Garamond', 'Century Gothic'];

function composeurAppliquerReglagesProjetXXL(themeBase, reglages) {
  themeBase = themeBase || COMPOSEUR_THEME_PROJETXXL;
  reglages = reglages || {};

  var theme = {};
  Object.keys(themeBase).forEach(function (cle) { theme[cle] = themeBase[cle]; });
  theme.couleurs = {};
  Object.keys(themeBase.couleurs).forEach(function (cle) { theme.couleurs[cle] = themeBase.couleurs[cle]; });

  theme.colonnes = (reglages.colonnes === 1 || reglages.colonnes === 2) ? reglages.colonnes : themeBase.colonnes;
  theme.icones = (reglages.icones !== undefined) ? !!reglages.icones : themeBase.icones;

  var policeChoisie = (POLICES_PROJETXXL_DISPONIBLES.indexOf(reglages.police) !== -1) ? reglages.police : themeBase.police.titres;
  theme.police = { titres: policeChoisie, corps: policeChoisie };

  // ---- Coloration + style des titres : "Lecture guidée -- par
  // rectangle" s'associe à "Bandeau" (rectangle plein, ex-"Fond coloré",
  // absorbé ici) ; tout le reste ("Lecture guidée -- par titre" et
  // "Texte coloré", qui ne touche plus les titres du tout) s'associe à
  // "Simple". Garde-fou côté moteur, jamais contournable même en cas
  // d'appel direct hors interface.
  var coloration = ['aucune', 'texteColore', 'lectureGuidee'].indexOf(reglages.coloration) !== -1
    ? reglages.coloration : (themeBase.coloration || 'aucune');
  var lectureGuideeVariante = ['titre', 'rectangle'].indexOf(reglages.lectureGuideeVariante) !== -1
    ? reglages.lectureGuideeVariante : (themeBase.lectureGuideeVariante || 'titre');
  theme.coloration = coloration;
  theme.lectureGuideeVariante = lectureGuideeVariante;
  theme.styleTitres = (coloration === 'lectureGuidee' && lectureGuideeVariante === 'rectangle') ? 'bandeau' : 'simple';

  // ---- Portée de "Texte coloré" : en 2 colonnes, laquelle(s) colorer ;
  // sans effet en 1 colonne (tout le contenu est colore, voir
  // composeurRender.js).
  theme.texteColorePortee = ['gauche', 'droite', 'lesDeux'].indexOf(reglages.texteColorePortee) !== -1
    ? reglages.texteColorePortee : (themeBase.texteColorePortee || 'lesDeux');

  // ---- Texte du bandeau (blanc/noir) : uniquement significatif en mode
  // 'lectureGuidee' + variante 'rectangle' -- transporte quand meme la
  // valeur dans les autres modes (jamais lue par composeurRender.js hors
  // ce cas précis, donc sans effet), plutot que de la forcer a une
  // valeur arbitraire qui masquerait un choix deja fait par la personne
  // si elle revient ensuite sur cette variante.
  theme.texteBandeau = (reglages.texteBandeau === 'noir' || reglages.texteBandeau === 'blanc')
    ? reglages.texteBandeau : (themeBase.texteBandeau || 'blanc');

  // ---- Fond des colonnes : DISTINCT de "coloration" ci-dessus -- réutilise
  // la même couleur/nuance (theme.couleurs.primaire, résolue plus bas),
  // jamais un second accent. Mutuellement exclusif avec "coloration" côté
  // titres : les deux ne pilotent jamais le même texte en même temps
  // (garde-fou ici, rend l'état incohérent impossible même en cas
  // d'appel direct hors interface, pas seulement via les boutons du
  // panneau qui l'empêchent déjà normalement).
  // TACHE (retour utilisateur : "fond des colonnes... +1 pour format
  // paysage le bouton milieu") : 5e valeur, exclusive au Mini CV A5
  // Paysage (colonne centrale) -- structurellement sans effet pour
  // Portrait/A4 (aucune colonne "milieu" n'existe dans ces mises en
  // page, voir composeurRender.js -- FOND_MILIEU_A5 n'y est calculé que
  // dans la branche A5-paysage).
  var fondColonnes = ['aucun', 'gauche', 'droite', 'lesDeux', 'milieu'].indexOf(reglages.fondColonnes) !== -1
    ? reglages.fondColonnes : (themeBase.fondColonnes || 'aucun');
  // TACHE (retour utilisateur : "le seul problème, pour accéder au texte
  // coloré de fond de colonne, il faut choisir une colonne... texte
  // coloré est plus simple, pas besoin de colonnes") : effet
  // 'texteContenu' retiré -- doublon exact de "Coloration -> Texte
  // coloré" (ci-dessus), qui fonctionne seul, sans fond. Ne reste que
  // 'fondSeul' et 'titres'.
  var fondColonnesEffet = ['fondSeul', 'titres'].indexOf(reglages.fondColonnesEffet) !== -1
    ? reglages.fondColonnesEffet : (themeBase.fondColonnesEffet || 'fondSeul');
  // TACHE : si "coloration" (titres via lecture guidée) ET "fond des
  // colonnes" (effet 'titres') demandent chacun de piloter les titres en
  // même temps -- ne devrait jamais arriver via le panneau (boutons
  // mutuellement exclusifs, voir app.js), mais un appel direct pourrait
  // le provoquer -- "coloration" l'emporte, "fond des colonnes" retombe
  // sur 'fondSeul' (choix arbitraire mais déterministe).
  // TACHE (retour utilisateur : "texte coloré ne colore plus les titres
  // du tout") : l'exclusion ne concerne plus que "lectureGuidee" -- seul
  // ce mode touche encore les titres/l'identité de l'en-tête. "Texte
  // coloré" ne rentre plus en collision avec "Fond des colonnes ->
  // Titres" (les deux peuvent désormais coexister sans conflit, puisque
  // "texte coloré" ne touche jamais les titres).
  if (coloration === 'lectureGuidee' && fondColonnesEffet === 'titres') { fondColonnesEffet = 'fondSeul'; }
  if (fondColonnes === 'aucun') { fondColonnesEffet = 'fondSeul'; } // sans fond, aucun effet n'a de sens
  theme.fondColonnes = fondColonnes;
  theme.fondColonnesEffet = fondColonnesEffet;
  theme.texteFondColonnes = (reglages.texteFondColonnes === 'noir' || reglages.texteFondColonnes === 'blanc')
    ? reglages.texteFondColonnes : (themeBase.texteFondColonnes || 'blanc');

  // ---- Séparateur (inspiré du modèle Ruban) : simple booléen, pas de
  // choix de côté (contrairement à "Fond des colonnes") -- une seule
  // ligne verticale entre les 2 colonnes, jamais partielle.
  theme.separateurColonnes = (reglages.separateurColonnes !== undefined)
    ? !!reglages.separateurColonnes : !!themeBase.separateurColonnes;

  // ---- Couleur indépendante du séparateur : null = garde l'accent
  // principal (comportement inchangé, resolu par composeurRender.js via
  // theme.separateurCouleurHex || PRIMAIRE). Réutilise la MEME table de
  // nuances (PALETTES_COULEURS_CV, composeurResoudreCouleur()) -- jamais
  // une nouvelle palette, jamais de plancher de lisibilité imposé (une
  // ligne fine reste visible à n'importe quelle nuance).
  var separateurCouleurBase = reglages.separateurCouleurBase !== undefined
    ? reglages.separateurCouleurBase : themeBase.separateurCouleurBase;
  var separateurNuance = (reglages.separateurNuance >= 1 && reglages.separateurNuance <= 10)
    ? reglages.separateurNuance : (themeBase.separateurNuance || 6);
  theme.separateurCouleurBase = separateurCouleurBase || null;
  theme.separateurNuance = separateurNuance;
  var separateurCouleurResolue = separateurCouleurBase ? composeurResoudreCouleur(separateurCouleurBase + '-' + separateurNuance) : null;
  theme.separateurCouleurHex = separateurCouleurResolue ? separateurCouleurResolue.hex : null;

  // ---- Condensé/Épuré, par portée (professionnel/personnel) : un seul
  // réglage par portée, jamais 2 cases indépendantes à exclure entre
  // elles -- "epure" (défaut) reste le rendu normal actuel, inchangé.
  theme.styleProfessionnel = (reglages.styleProfessionnel === 'condense') ? 'condense'
    : (reglages.styleProfessionnel === 'epure' ? 'epure' : (themeBase.styleProfessionnel || 'epure'));
  theme.stylePersonnel = (reglages.stylePersonnel === 'condense') ? 'condense'
    : (reglages.stylePersonnel === 'epure' ? 'epure' : (themeBase.stylePersonnel || 'epure'));

  // ---- Ordre dates/poste dans la ligne d'expérience : 'posteAvant' par défaut.
  theme.ordreDatesPoste = (reglages.ordreDatesPoste === 'dateAvant') ? 'dateAvant'
    : (reglages.ordreDatesPoste === 'posteAvant' ? 'posteAvant' : (themeBase.ordreDatesPoste || 'posteAvant'));

  // ---- Phrase d'accroche en italique ou non : true par défaut.
  theme.accrocheItalique = (reglages.accrocheItalique !== undefined)
    ? !!reglages.accrocheItalique : (themeBase.accrocheItalique !== false);

  // ---- Bandeau de disponibilité : false par défaut.
  theme.bandeauDisponibilite = (reglages.bandeauDisponibilite !== undefined)
    ? !!reglages.bandeauDisponibilite : !!themeBase.bandeauDisponibilite;

  // ---- Nuance : réutilise intégralement PALETTES_COULEURS_CV (jamais
  // une nouvelle palette, voir composeurResoudreCouleur() ci-dessus).
  // Restriction testée et confirmée : en "Texte coloré" (colore tout le
  // contenu des blocs désormais, pas seulement les titres -- le risque
  // de lisibilité concerne donc encore plus de texte qu'avant, plancher
  // maintenu et même renforcé dans son utilité) et "Lecture guidée"
  // (les 2 variantes, le nom/poste visé de l'en-tête restent du texte
  // plat sur fond blanc quelle que soit la variante), la nuance ne
  // descend jamais sous 4/10. "Fond des colonnes -> Titres" partage le
  // même risque (titres en texte plat sur fond blanc du côté sans
  // fond) -- même plancher. "Fond seul" n'a pas ce risque (le fond
  // lui-même reste lisible même pâle, comme le modèle Aquarelle).
  var nuance = (reglages.nuanceCouleur >= 1 && reglages.nuanceCouleur <= 10) ? reglages.nuanceCouleur : (themeBase.nuanceCouleur || 6);
  var nuancePlancher = (coloration === 'texteColore' || coloration === 'lectureGuidee' || fondColonnesEffet === 'titres') ? 4 : 1;
  if (nuance < nuancePlancher) { nuance = nuancePlancher; }
  theme.nuanceCouleur = nuance;

  var couleurBase = reglages.couleurBase || 'bleu';
  var couleurResolue = composeurResoudreCouleur(couleurBase + '-' + nuance);
  if (couleurResolue) { theme.couleurs.primaire = couleurResolue.hex; }

  // ---- Bloc mis en avant : transporté tel quel -- le garde-fou "un
  // bloc vide ne peut pas être choisi" se vérifie plus loin, dans
  // composeurComposition.js (à ce stade, le contenu réel du CV n'est pas
  // encore connu ici, seul le thème est construit).
  theme.blocMisEnAvant = reglages.blocMisEnAvant || null;
  // TACHE (retour utilisateur : "mise en avant sur les 2 colonnes,
  // chacune la sienne") : mêmes principes -- transportés tel quel, le
  // garde-fou (contenu réel + appartenance à la bonne colonne) vit dans
  // composeurComposition.js.
  theme.blocMisEnAvantGauche = reglages.blocMisEnAvantGauche || null;
  theme.blocMisEnAvantDroite = reglages.blocMisEnAvantDroite || null;

  // ---- Lettre jointe : pilote le retrait de l'accroche -- consommé par
  // genererDocxComposeur() (composeurMoteur.js) comme repli du paramètre
  // sansAccroche déjà existant, jamais une seconde logique de retrait.
  theme.lettreJointe = !!reglages.lettreJointe;

  // ---- Mécanisme A/B/C : réponse de la personne au constat de
  // dépassement (C), consommée par composeurComposition.js -- sans effet
  // pour le format 'A4-integral' (aucune réduction n'y a de sens, doc
  // Projet XXL).
  theme.optionDebordement = (reglages.optionDebordement === 'A' || reglages.optionDebordement === 'B' || reglages.optionDebordement === 'AB') ? reglages.optionDebordement : null;

  // ---- Strategie forcee (voir garde-fou dans composeurComposition.js,
  // qui verifie que l'id demande existe reellement via strategieParId()
  // avant de jamais imposer une strategie inexistante).
  var STRATEGIES_VALIDES_XXL = ['chronologique', 'mixte', 'parCompetences'];
  theme.strategieForcee = (STRATEGIES_VALIDES_XXL.indexOf(reglages.strategieForcee) !== -1) ? reglages.strategieForcee : null;

  // ---- Bouton "Mettre en avant l'experience la plus pertinente et
  // regrouper les autres" (cv.md, point 14) : consomme par
  // genererDocxComposeur() (composeurMoteur.js), meme circuit que
  // lettreJointe/optionDebordement ci-dessus -- transporte tel quel,
  // jamais reinterprete ici (le garde-fou "y a-t-il quelque chose
  // d'exploitable" vit deja dans composeurMoteur.js/app.js).
  theme.regroupementActif = !!reglages.regroupementActif;

  // ---- Bouton ultime "1 page, lisible", levier "plus d'informations" :
  // meme circuit que regroupementActif juste au-dessus -- transporte tel
  // quel, jamais reinterprete ici (le test-et-repli "est-ce que ca tient
  // toujours sur 1 page avec ce bonus" vit dans app.js, pas ici).
  theme.tailleBonus = !!reglages.tailleBonus;

  // ---- Bouton ultime, leviers "expériences supplémentaires" et
  // "développer les missions tronquées" (chantier dédié) : memes
  // principes que tailleBonus juste au-dessus -- des nombres entiers
  // positifs, valides et bornes ici pour ne jamais laisser passer une
  // valeur aberrante, mais jamais reinterpretes (le test-et-repli "est-ce
  // que ca tient toujours sur 1 page avec ce bonus" vit dans app.js).
  var capaciteBonus = parseInt(reglages.capaciteExperiencesBonus, 10);
  theme.capaciteExperiencesBonus = (isFinite(capaciteBonus) && capaciteBonus > 0) ? Math.min(capaciteBonus, 10) : 0;
  var missionsBonusBrut = parseInt(reglages.missionsBonus, 10);
  theme.missionsBonus = (isFinite(missionsBonusBrut) && missionsBonusBrut > 0) ? Math.min(missionsBonusBrut, 5) : 0;

  theme.id = 'projetxxl';
  theme.nom = 'Projet XXL';
  return theme;
}
