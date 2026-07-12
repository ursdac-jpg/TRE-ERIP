// ============================================================
// formatsLettreEntretien.js
// ------------------------------------------------------------
// TACHE (couleurs + 3 formats pour la lettre et l'entretien, comme pour
// le CV) : reutilise les 6 memes couleurs (PALETTES_COULEURS_CV, deja
// definies dans coloriationDocxNatifCV.js, charge avant ce fichier) et
// les memes principes que formatA5CV.js -- un seul modele existant pour
// chacun ("sobre"/"clair"), mais deja pret pour couleur + format.
//
// Contrairement au CV, il n'existe pas de moteur de decision IA pour
// choisir QUOI garder (la lettre/l'entretien sont deja des textes
// entierement rediges par l'IA, pas des listes d'elements a trier) --
// "Essentiel"/"Mini" tronquent donc le texte/les listes deja fournies,
// sans logique de pertinence supplementaire. Troncature "propre" (coupe
// au dernier espace), voir _dnTronquerTexte() (formatA5CV.js, deja charge).
// ============================================================

var MODELES_AVEC_COULEURS_LETTRE = ['sobre'];
var MODELES_AVEC_COULEURS_ENTRETIEN = ['clair'];

function modeleLettreSupporteCouleurs(modeleId) { return MODELES_AVEC_COULEURS_LETTRE.indexOf(modeleId) !== -1; }
function modeleEntretienSupporteCouleurs(modeleId) { return MODELES_AVEC_COULEURS_ENTRETIEN.indexOf(modeleId) !== -1; }

// ============================================================
// LETTRE
// ============================================================
var LONGUEURS_TEXTE_LETTRE = {
  'A4-essentiel': 900,
  'A5': 350
};

function construireObjetLettrePourExportFormat(formatPage) {
  var objetLettre = normaliserDonneesLettre(dossier);
  var limite = LONGUEURS_TEXTE_LETTRE[formatPage];
  if (!limite) { return objetLettre; } // 'A4' (Détaillé) ou absent : texte complet, inchange
  var objetTronque = {};
  Object.keys(objetLettre).forEach(function (cle) { objetTronque[cle] = objetLettre[cle]; });
  objetTronque.texte = _dnTronquerTexte(objetLettre.texte, limite);
  return objetTronque;
}

function _dnOptsCouleurLettre(couleurId) {
  var palette = (couleurId && typeof PALETTES_COULEURS_CV !== 'undefined') ? PALETTES_COULEURS_CV[couleurId] : null;
  return palette ? { primaire: palette.primaire } : {};
}

// Point d'entree public -- couleurId/formatPage optionnels, comportement
// inchange si absents (comme genererDocxNatifCVColore()/Format()).
function genererDocxNatifLettreFormat(modeleId, couleurId, formatPage) {
  var objetLettre = construireObjetLettrePourExportFormat(formatPage);
  return chargerLibrairieDocxNatif().then(function (docx) {
    var opts = _fusionnerOptsLettreEntretien(_dnOptsCouleurLettre(couleurId), { formatPage: formatPage });
    var generateur = GENERATEURS_DOCX_NATIFS_LETTRE[modeleId];
    if (!generateur) { throw new Error('Pas de generateur Word natif pour ce modele de lettre.'); }
    return docx.Packer.toBlob(generateur(docx, objetLettre, opts));
  });
}

// ============================================================
// ENTRETIEN
// ============================================================
var CAPACITES_ENTRETIEN = {
  'A4-essentiel': { listes: 4, presentation: 400 },
  'A5': { listes: 2, presentation: 150 }
};

function construireObjetEntretienPourExportFormat(formatPage) {
  var objetEntretien = normaliserDonneesEntretien(dossier);
  var capacite = CAPACITES_ENTRETIEN[formatPage];
  if (!capacite) { return objetEntretien; } // 'A4' (Détaillé) ou absent : inchange
  var objetRecadre = {};
  Object.keys(objetEntretien).forEach(function (cle) { objetRecadre[cle] = objetEntretien[cle]; });
  objetRecadre.presentation = _dnTronquerTexte(objetEntretien.presentation, capacite.presentation);
  objetRecadre.pointsAPreparer = (objetEntretien.pointsAPreparer || []).slice(0, capacite.listes);
  objetRecadre.questionsAnticipees = (objetEntretien.questionsAnticipees || []).slice(0, capacite.listes);
  objetRecadre.questionsDuCandidat = (objetEntretien.questionsDuCandidat || []).slice(0, capacite.listes);
  return objetRecadre;
}

function _dnOptsCouleurEntretien(couleurId) {
  var palette = (couleurId && typeof PALETTES_COULEURS_CV !== 'undefined') ? PALETTES_COULEURS_CV[couleurId] : null;
  return palette ? { primaire: palette.primaire, teinte: palette.teinte, secondaire: palette.secondaire } : {};
}

function genererDocxNatifEntretienFormat(modeleId, couleurId, formatPage) {
  var objetEntretien = construireObjetEntretienPourExportFormat(formatPage);
  return chargerLibrairieDocxNatif().then(function (docx) {
    var opts = _fusionnerOptsLettreEntretien(_dnOptsCouleurEntretien(couleurId), { formatPage: formatPage });
    var generateur = GENERATEURS_DOCX_NATIFS_ENTRETIEN[modeleId];
    if (!generateur) { throw new Error('Pas de generateur Word natif pour ce modele de fiche entretien.'); }
    return docx.Packer.toBlob(generateur(docx, objetEntretien, opts));
  });
}

function _fusionnerOptsLettreEntretien() {
  var resultat = {};
  for (var i = 0; i < arguments.length; i++) {
    var o = arguments[i] || {};
    Object.keys(o).forEach(function (cle) { resultat[cle] = o[cle]; });
  }
  return resultat;
}
