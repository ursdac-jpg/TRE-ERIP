// ============================================================
// coloriationDocxNatifCV.js
// ------------------------------------------------------------
// TACHE (refonte "Aperçu et finalisation" : palette de couleurs) :
// ajoute une COUCHE de recoloration par-dessus les generateurs Word
// existants, sans modifier leur comportement par defaut (tout appel
// existant a genererDocxNatifCV(modeleId, objetCV), sans 3e argument,
// continue de produire EXACTEMENT le meme resultat qu'avant ce fichier).
//
// Principe : ce fichier NE remplace ni ne duplique les generateurs --
// il connait, pour chaque modele "recolorable", quel constructeur
// generique appeler (_dnConstruireDeuxColonnes / _dnConstruireUneColonne
// / _dnConstruireImpact / _dnConstruireDispo / _dnConstruireCreatif,
// toutes deja globales) et avec quelles options de base, puis fusionne
// une palette de couleur par-dessus au moment de la generation.
//
// LIMITE ASSUMEE : "Trajectoire" (structure entierement a part, sans
// parametres de couleur) n'est pas recolorable pour l'instant --
// necessiterait de modifier sa fonction dans exportDocxNatifCV.js, non
// fait ici par prudence (fichier evolue independamment). Voir
// MODELES_AVEC_COULEURS_CV plus bas : "trajectoire" en est absent.
// ============================================================

// ---- Les 6 couleurs "de base" (10/10, intensite pleine) -- point de
// depart pour generer les nuances, voir plus bas. ----
// TACHE (retour utilisateur : "rajouter plus de couleurs -- rose,
// marron, gris et turquoise") : 4 nouvelles bases ajoutees ici -- les 10
// nuances de chacune sont generees AUTOMATIQUEMENT par le mecanisme deja
// en place plus bas (_genererNuancesCouleur, ORDRE_COULEURS_CV.forEach),
// jamais recalculees a la main. Purement additif : les 6 couleurs
// existantes (bleu/vert/orange/rouge/violet/noir) et tout code qui les
// reference par id restent strictement inchanges.
var PALETTES_COULEURS_CV_BASE = {
  bleu:      { nom: 'Bleu',      hex: '2563EB' },
  vert:      { nom: 'Vert',      hex: '15803D' },
  orange:    { nom: 'Orange',    hex: 'C2410C' },
  rouge:     { nom: 'Rouge',     hex: 'B91C1C' },
  violet:    { nom: 'Violet',    hex: '6D28D9' },
  noir:      { nom: 'Noir',      hex: '18181B' },
  rose:      { nom: 'Rose',      hex: 'BE185D' },
  marron:    { nom: 'Marron',    hex: '78350F' },
  gris:      { nom: 'Gris',      hex: '4B5563' },
  turquoise: { nom: 'Turquoise', hex: '0E7490' }
};
var ORDRE_COULEURS_CV = ['bleu', 'vert', 'orange', 'rouge', 'violet', 'noir', 'rose', 'marron', 'gris', 'turquoise'];
var NB_NUANCES_CV = 10;

// TACHE (retour utilisateur : 10 nuances par couleur) : melange un hex
// avec du blanc -- ratioBlanc 0 = couleur pure, 1 = blanc pur. Utilise a
// la fois pour generer les nuances (10/10 -> 1/10) et pour deriver les
// roles teinte/secondaire depuis la nuance choisie (voir plus bas).
function _melangerHexBlanc(hex, ratioBlanc) {
  var r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
  var mr = Math.round(r + (255 - r) * ratioBlanc);
  var mg = Math.round(g + (255 - g) * ratioBlanc);
  var mb = Math.round(b + (255 - b) * ratioBlanc);
  function h2(n) { var s = n.toString(16).toUpperCase(); return s.length < 2 ? '0' + s : s; }
  return h2(mr) + h2(mg) + h2(mb);
}

// TACHE (retour utilisateur : 10 nuances, 10/10 = couleur actuelle telle
// quelle, 1/10 = la plus claire mais toujours visible) : genere les 10
// nuances d'une couleur de base, avec pour chacune ses 3 roles
// (primaire/teinte/secondaire) RECALCULES AUTOMATIQUEMENT a partir de
// CETTE nuance precise -- jamais depuis la couleur 10/10 d'origine. Ainsi,
// choisir "Vert 4/10" donne un jeu de 3 roles coherent entre eux, aussi
// bien qu'en choisissant "Vert 10/10".
function _genererNuancesCouleur(baseId) {
  var base = PALETTES_COULEURS_CV_BASE[baseId];
  if (!base) { return []; }
  var nuances = [];
  for (var niveau = 1; niveau <= NB_NUANCES_CV; niveau++) {
    // niveau 10 -> ratioBlanc 0 (couleur intacte) ; niveau 1 -> ratioBlanc
    // eleve mais plafonne a 0.82 (reste nettement visible, jamais blanc).
    var ratioBlancPrimaire = (NB_NUANCES_CV - niveau) / (NB_NUANCES_CV - 1) * 0.82;
    var primaire = _melangerHexBlanc(base.hex, ratioBlancPrimaire);
    var teinte = _melangerHexBlanc(primaire, 0.9);
    var secondaire = _melangerHexBlanc(primaire, 0.55);
    nuances.push({
      id: baseId + '-' + niveau, baseId: baseId, niveau: niveau,
      nom: base.nom + ' ' + niveau + '/10',
      primaire: primaire, teinte: teinte, secondaire: secondaire
    });
  }
  return nuances;
}

// Table complete (6 couleurs x 10 nuances = 60 entrees, + 6 alias
// "bleu"/"vert"/etc. pointant vers la nuance 10/10 -- compatibilite avec
// tout code/donnee existants qui stockerait encore un simple id de
// couleur sans nuance precisee). Construite une seule fois au chargement.
var PALETTES_COULEURS_CV = {};
ORDRE_COULEURS_CV.forEach(function (baseId) {
  _genererNuancesCouleur(baseId).forEach(function (n) { PALETTES_COULEURS_CV[n.id] = n; });
  PALETTES_COULEURS_CV[baseId] = PALETTES_COULEURS_CV[baseId + '-' + NB_NUANCES_CV];
});

// ---- Catalogue : pour chaque modele recolorable, quel constructeur
// appeler et comment mapper la palette sur ses options. "police"/
// "soulignerTitres"/"centrerEntete"/"objectifItalique"/"ordre" ne sont
// JAMAIS touches par la couleur -- uniquement les champs de couleur. ----
function _construireAvecCouleur(docx, objetCV, modeleId, couleurId) {
  var palette = PALETTES_COULEURS_CV[couleurId];
  if (!palette) { return null; }

  switch (modeleId) {
    // ---- Modeles "deux colonnes", bandeau teinte clair ----
    case 'aquarelle':
      return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: palette.primaire, fondSidebar: palette.teinte, texteSidebar: '1B2340', styleBandeau: 'teinte', police: 'Georgia', couleurNom: palette.primaire });
    case 'moderne-green':
      return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: palette.primaire, fondSidebar: palette.teinte, texteSidebar: '1f2a1f', styleBandeau: 'teinte' });
    case 'moderne':
      return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: palette.primaire, fondSidebar: palette.teinte, texteSidebar: '222222', styleBandeau: 'teinte', police: 'Calibri' });
    // ---- Modele "deux colonnes", bandeau plein (aplat sature) ----
    case 'geometrique':
      return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: palette.primaire, fondSidebar: palette.primaire, styleBandeau: 'plein' });
    // ---- Modele "deux colonnes", bordure coloree (pas de fond) ----
    case 'ruban':
      return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: palette.primaire, secondaire: palette.secondaire, styleBandeau: 'bordure', texteSidebar: '1F2937' });
    // ---- Modeles "une colonne" : texte du corps toujours neutre (pas
    // teinte par la couleur choisie, pour rester lisible), seuls les
    // titres/accents changent ----
    case 'classique':
      return _dnConstruireUneColonne(docx, objetCV, { primaire: palette.primaire, texte: '1A1A1A', secondaire: palette.secondaire, police: 'Georgia' });
    case 'minimaliste':
      return _dnConstruireUneColonne(docx, objetCV, { primaire: palette.primaire, texte: '1A1A1A', secondaire: palette.secondaire, police: 'Calibri' });
    case 'institutionnel':
      return _dnConstruireUneColonne(docx, objetCV, { primaire: palette.primaire, texte: '1A1A2E', secondaire: palette.secondaire, police: 'Times New Roman', soulignerTitres: true });
    case 'elegant':
      return _dnConstruireUneColonne(docx, objetCV, { primaire: palette.primaire, texte: '1F2937', secondaire: palette.secondaire, police: 'Georgia', centrerEntete: true, objectifItalique: true, soulignerTitres: true });
    case 'jeune-diplome':
      return _dnConstruireUneColonne(docx, objetCV, { primaire: palette.primaire, texte: '1E293B', secondaire: palette.secondaire, police: 'Calibri',
        ordre: ['profil', 'formations', 'experiences', 'experiencesPersonnelles', 'engagements', 'competences', 'langues', 'certifications', 'permis', 'loisirs'] });
    // ---- Modeles recents (opts geres par exportDocxNatifCV_NouveauxModeles.js) ----
    case 'impact':
      return _dnConstruireImpact(docx, objetCV, { primaire: '0F172A', accent: palette.primaire, fondSidebar: palette.teinte });
    case 'dispo':
      return _dnConstruireDispo(docx, objetCV, { primaire: palette.primaire, teinte: palette.teinte });
    case 'creatif':
      return _dnConstruireCreatif(docx, objetCV, { primaire: palette.primaire, fondSidebar: palette.teinte, texteBandeauSecondaire: palette.secondaire });
    // ---- Trajectoire (frise chronologique) : bandeaux + pastilles de
    // date reprennent la couleur choisie -- opts ajoute a
    // _dnConstruireTrajectoire() dans exportDocxNatifCV.js, retro-compatible. ----
    case 'trajectoire':
      return _dnConstruireTrajectoire(docx, objetCV, { primaire: palette.primaire, secondaire: palette.secondaire });
    // ---- Chic (sidebar beige + bloc sombre) : la couleur remplace le
    // sombre par defaut (bandes/bloc nom), le beige de la sidebar reste
    // fixe (fait partie de l'identite du modele, comme demande pour les
    // autres modeles "une-colonne" ou seul l'accent change). ----
    case 'chic':
      return _dnConstruireChic(docx, objetCV, { primaire: palette.primaire });
    // ---- Portrait (Mini CV, A5) : meme mapping que celui deja utilise
    // par _dnConstruireDocumentAvecOptions() (formatA5CV.js) pour ce
    // modele -- ajoute ici par coherence/robustesse, au cas ou ce chemin
    // de repli serait sollicite directement pour ce modele.
    case 'portrait':
      return (typeof _dnConstruireMiniCV === 'function')
        ? _dnConstruireMiniCV(docx, objetCV, { primaire: palette.primaire, secondaire: palette.secondaire })
        : null;
    case 'paysage':
      return (typeof _dnConstruireMiniCVPaysage === 'function')
        ? _dnConstruireMiniCVPaysage(docx, objetCV, { primaire: palette.primaire, secondaire: palette.secondaire })
        : null;
    default:
      return null; // modele non couvert -- l'appelant retombe sur le rendu par defaut (voir plus bas)
  }
}

// Liste des modeles pour lesquels une palette de couleurs a du sens ici.
// TACHE (retour utilisateur : je ne veux pas modifier Trajectoire) :
// absent volontairement (voir limite assumee en tete de fichier).
// TACHE (retour utilisateur : sélecteur A5, couleurs pour "Portrait") :
// "portrait" ajoute -- la generation coloree elle-meme est deja geree par
// _dnConstruireDocumentAvecOptions() (formatA5CV.js, qui transmet
// opts.primaire/secondaire a _dnConstruireMiniCV()) ; cette liste ne sert
// ici qu'a decider si la PALETTE doit s'AFFICHER a l'ecran pour ce modele.
var MODELES_AVEC_COULEURS_CV = [
  'aquarelle', 'moderne-green', 'geometrique', 'ruban', 'moderne',
  'classique', 'minimaliste', 'institutionnel', 'elegant', 'jeune-diplome',
  'impact', 'dispo', 'creatif', 'trajectoire', 'portrait', 'paysage'
];

function modeleSupporteCouleurs(modeleId) { return MODELES_AVEC_COULEURS_CV.indexOf(modeleId) !== -1; }
function obtenirPalettesCouleursCV() {
  return ORDRE_COULEURS_CV.map(function (id) { return { id: id, nom: PALETTES_COULEURS_CV[id].nom, hex: PALETTES_COULEURS_CV[id].primaire }; });
}
// TACHE (retour utilisateur : mode "Nuances rapides") : les 10 nuances
// d'une couleur de base, pour la rangee depliee au clic sur le rond.
function obtenirNuancesCouleurCV(baseId) {
  return _genererNuancesCouleur(baseId).map(function (n) { return { id: n.id, niveau: n.niveau, nom: n.nom, hex: n.primaire }; });
}

// ============================================================
// TACHE (correction bug : la couleur ne s'appliquait pas -- ordre de
// chargement des scripts) : la version precedente redefinissait
// genererDocxNatifCV par-dessus l'originale. Si exportDocxNatifCV.js se
// chargeait APRES ce fichier (ou etait rechage d'une façon quelconque),
// sa propre "function genererDocxNatifCV(...)" ecrasait silencieusement
// cette version coloree -- sans aucune erreur, juste un retour permanent
// a la couleur par defaut. Nouvelle approche : une fonction au nom
// DISTINCT (genererDocxNatifCVColore), qui ne redefinit jamais rien.
// Comme son corps ne resout genererDocxNatifCV/modeleSupporteCouleurs
// qu'AU MOMENT DE L'APPEL (pas au chargement du fichier), l'ordre des
// <script> n'a plus aucune importance : tout est charge de toute façon
// avant qu'une personne ne clique sur quoi que ce soit.
// ============================================================
function genererDocxNatifCVColore(modeleId, objetCV, couleurId) {
  if (!couleurId || !modeleSupporteCouleurs(modeleId) || !PALETTES_COULEURS_CV[couleurId]) {
    return genererDocxNatifCV(modeleId, objetCV);
  }
  return chargerLibrairieDocxNatif().then(function (docx) {
    var document = _construireAvecCouleur(docx, objetCV, modeleId, couleurId);
    if (!document) { return genererDocxNatifCV(modeleId, objetCV); }
    return docx.Packer.toBlob(document);
  });
}
