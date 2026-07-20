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

var COMPOSEUR_THEMES_DISPONIBLES = {
  sobre: COMPOSEUR_THEME_DEFAUT,
  institutionnel: COMPOSEUR_THEME_INSTITUTIONNEL,
  moderne: COMPOSEUR_THEME_MODERNE
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
