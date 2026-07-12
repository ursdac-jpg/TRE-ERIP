// ============================================================
// formatA5CV.js
// ------------------------------------------------------------
// TACHE (3 formats de CV) : ce fichier couvre desormais les DEUX formats
// "allegés" a cote du format complet :
// - "A4 Essentiel" : contenu recadre (moins d'elements), mais sur une
//   VRAIE page A4 -- pas de changement de taille de page, juste moins
//   de contenu. Reutilise le meme moteur de decision IA, capacites
//   moins serrees que le Mini CV.
// - "Mini CV (A5)" (ex "format A5") : contenu tres recadre + page REELLE
//   A5 (148x210mm, une vraie demi-page, pas une A4 zoomee).
//
// Principe cle, commun aux deux (voir discussion : "et si la 4e
// experience est la plus pertinente ?") : reutilise EXACTEMENT le meme
// moteur de decision IA que le format complet (appliquerMoteurDecisionCV,
// classerCompetencesParPertinence, deja rebranches dans app.js) -- seules
// les CAPACITES changent. La selection reste donc intelligente : une
// experience signalee pertinente par l'IA remonte, peu importe sa
// position dans le dossier -- jamais un simple "on garde les N
// premieres par ordre".
//
// Contrairement au format complet ("A4 Détaillé"), le plafonnage est ICI
// TOUJOURS applique (meme sans recommandation IA) : les deux formats
// allegés ont besoin de limites strictes quoi qu'il arrive.
// ============================================================

// ---- Marges de page agrandies pour "A4 Essentiel" -- retour utilisateur
// : "je veux que l'essentiel soit plus degage et aere" (pas juste moins
// de contenu, un vrai espace blanc plus genereux). +45% sur toutes les
// marges, inchange pour les 2 autres formats (A4 Detaille garde ses
// marges d'origine, le Mini CV a deja les siennes propres). ----
function _dnMargePage(margeBase, formatPage) {
  if (formatPage !== 'A4-essentiel') { return margeBase; }
  var facteur = 1.45;
  var resultat = {};
  Object.keys(margeBase).forEach(function (cle) { resultat[cle] = Math.round(margeBase[cle] * facteur); });
  return resultat;
}


// ---- Taille de page A5 reelle (148 x 210 mm, portrait, en twips) --
// UNIQUEMENT pour le Mini CV -- "A4 Essentiel" reste sur une page A4
// normale (taille par defaut de docx-js, deja verifiee = A4). ----
function _dnTaillePageA5() {
  return { width: 8390, height: 11905 };
}

// ---- Capacites fixes pour le Mini CV (A5) -- tres serrees ----
var CAPACITES_A5_CV = {
  experiences: 2, formations: 1, langues: 2, certifications: 0,
  loisirs: 0, engagements: 0, competences: 4
};

// ---- Capacites fixes pour "A4 Essentiel" -- allegees mais moins
// serrees que le Mini CV (page A4 normale, plus de place disponible) ----
var CAPACITES_A4_ESSENTIEL_CV = {
  experiences: 3, formations: 2, langues: 4, certifications: 2,
  loisirs: 2, engagements: 1, competences: 6
};

// ---- Rubriques totalement retirees en A5 (jamais montrees, meme vides) ----
var RUBRIQUES_MASQUEES_A5 = ['certifications', 'loisirs', 'engagements'];

// ============================================================
// TACHE (retour utilisateur : "le diplome le plus eleve montre le niveau
// d'education, meme si sans lien direct avec le metier vise -- important
// pour les competences transferables/la reconversion") : quand aucune
// recommandation IA ne concerne les formations (cas frequent, le prompt
// CV V2 n'en produit qu'pour experiences/competences), le moteur de
// decision generique (decider()) retombe sur l'ORDRE DU DOSSIER -- pas
// forcement le niveau le plus eleve. On trie ICI les formations par rang
// RNCP decroissant (systeme deja utilise dans le formulaire de
// formation, voir NIVEAUX_DIPLOME_SIMPLES) AVANT de les transmettre au
// moteur de decision : la priorite par defaut devient "diplome le plus
// eleve d'abord", tri stable (egalite de niveau -> ordre d'origine
// conserve). Sans effet si l'IA recommande explicitement une formation
// precise (son rang de recommandation reste toujours prioritaire).
// ============================================================
function _dnRangDiplome(labelNiveau) {
  if (!labelNiveau) { return 0; }
  var trouve = (typeof NIVEAUX_DIPLOME_SIMPLES !== 'undefined' ? NIVEAUX_DIPLOME_SIMPLES : []).filter(function (n) { return n.label === labelNiveau; })[0];
  return trouve ? trouve.rncp : 0;
}
function _dnTrierFormationsParNiveauDecroissant(formations) {
  return (formations || [])
    .map(function (f, i) { return { f: f, i: i, rang: _dnRangDiplome(f.niveau) }; })
    .sort(function (a, b) { return (b.rang - a.rang) || (a.i - b.i); })
    .map(function (x) { return x.f; });
}

// ---- Troncature "propre" (coupe au dernier espace, pas au milieu d'un mot) ----
function _dnTronquerTexte(texte, maxCaracteres) {
  if (!texte) { return ''; }
  var t = String(texte).trim();
  if (t.length <= maxCaracteres) { return t; }
  var coupe = t.slice(0, maxCaracteres);
  var dernierEspace = coupe.lastIndexOf(' ');
  return (dernierEspace > 40 ? coupe.slice(0, dernierEspace) : coupe) + '…';
}

// ============================================================
// Construit un objet CV recadre, generique -- partage par le Mini CV
// (A5) et "A4 Essentiel", pour ne jamais dupliquer cette logique. TOUJOURS
// applique (pas conditionne a la presence de recommandations IA) : les
// deux formats allegés ont besoin de limites fermes quoi qu'il arrive.
//
// options = {
//   capacites          : plafonds par rubrique (obligatoire)
//   rubriquesMasquees  : rubriques entierement retirees (tableau, vide par defaut)
//   tronquerProfil     : longueur max du profil (0/absent = pas de troncature)
//   tronquerMissions   : longueur max des missions (0/absent = pas de troncature)
// }
// ============================================================
function _dnConstruireObjetCVRecadre(options, modeleId) {
  var objetCV = normaliserDonneesCV(dossier);
  var recommandationsIACV = (dossier.ia && dossier.ia.cv && dossier.ia.cv.recommandations) || {};

  // TACHE (diplome le plus eleve par defaut) : voir commentaire au-dessus
  // de _dnTrierFormationsParNiveauDecroissant().
  var objetCVPourDecision = {};
  Object.keys(objetCV).forEach(function (cle) { objetCVPourDecision[cle] = objetCV[cle]; });
  objetCVPourDecision.formations = _dnTrierFormationsParNiveauDecroissant(objetCV.formations);

  var objetDecide = appliquerMoteurDecisionCV(objetCVPourDecision, recommandationsIACV, options.capacites);

  var recoCompetences = (recommandationsIACV.competencesAValoriser || []).map(function (c) {
    return { texte: c.competence, justification: c.justification };
  });
  var objetFinal = {};
  Object.keys(objetDecide).forEach(function (cle) { objetFinal[cle] = objetDecide[cle]; });
  // TACHE (retour utilisateur : "Compétences professionnelles" unifiee,
  // plafond uniforme a 5, tous les modeles sauf Chic) : ce chemin
  // (Mini CV A5 + A4 Essentiel) avait sa PROPRE copie de l'appel a
  // classerCompetencesParPertinence(), independante du correctif deja
  // applique au format complet (construireObjetCVPourExport, app.js) --
  // meme bug, meme correction ici. Pour "A4 Essentiel", modeleId peut
  // valoir 'chic' (le modele choisi determine reellement la mise en page,
  // voir _dnConstruireDocumentAvecOptions) -- exclusion respectee. Pour
  // le Mini CV (A5), modeleId n'a aucune incidence sur la mise en page
  // (toujours _dnConstruireMiniCV, quel que soit le modele choisi en A4) :
  // le plafond unifie s'applique donc sans exception possible.
  // Le plafond du format (4 pour A5, 6 pour Essentiel) reste respecte
  // s'il est PLUS strict que 5 -- jamais reintroduire plus de contenu que
  // ce que le format prevoit.
  if (modeleId === 'chic') {
    objetFinal.competences = classerCompetencesParPertinence(objetDecide.competences, recoCompetences, dossier.metierCible, options.capacites.competences);
  } else {
    objetFinal.competences = unifierEtPlafonnerCompetences(objetDecide.competences, recoCompetences, dossier.metierCible, Math.min(5, options.capacites.competences));
  }

  (options.rubriquesMasquees || []).forEach(function (cle) { objetFinal[cle] = []; });

  if (objetFinal.profil && options.tronquerProfil) {
    objetFinal.profil = {
      profilUtilisateur: _dnTronquerTexte(objetFinal.profil.profilUtilisateur, options.tronquerProfil),
      profilIA: _dnTronquerTexte(objetFinal.profil.profilIA, options.tronquerProfil)
    };
  }
  if (options.tronquerMissions) {
    objetFinal.experiences = (objetFinal.experiences || []).map(function (e) {
      var copie = {}; Object.keys(e).forEach(function (k) { copie[k] = e[k]; });
      copie.missions = _dnTronquerTexte(e.missions, options.tronquerMissions);
      return copie;
    });
  }

  return objetFinal;
}

// ---- Mini CV (A5) : contenu tres recadre + textes tronques ----
function construireObjetCVPourExportA5(modeleId) {
  return _dnConstruireObjetCVRecadre({
    capacites: CAPACITES_A5_CV,
    rubriquesMasquees: RUBRIQUES_MASQUEES_A5,
    tronquerProfil: 220,
    tronquerMissions: 140
  }, modeleId);
}

// ---- "A4 Essentiel" : contenu allege, page A4 normale -- pas de
// rubrique totalement masquee, pas de troncature de texte (plus de place
// disponible qu'en A5, une page A4 entiere) ----
function construireObjetCVPourExportEssentiel(modeleId) {
  return _dnConstruireObjetCVRecadre({
    capacites: CAPACITES_A4_ESSENTIEL_CV,
    rubriquesMasquees: [],
    tronquerProfil: 0,
    tronquerMissions: 0
  }, modeleId);
}

// ---- Catalogue minimal des options de base des 10 modeles generiques
// (deux-colonnes / une-colonne) -- memes valeurs que
// GENERATEURS_DOCX_NATIFS_CV (exportDocxNatifCV.js) et le catalogue de
// couleurs (coloriationDocxNatifCV.js), pour pouvoir y injecter formatPage
// en plus SANS reconstruire un Document deja fige (l'API docx-js ne
// permet pas de modifier un Document apres coup). ----
function _dnOptionsBaseParModele(modeleId) {
  var base = {
    'aquarelle': { construire: 'deuxColonnes', opts: { primaire: 'C08457', fondSidebar: 'FBF5EC', texteSidebar: '1B2340', styleBandeau: 'teinte', police: 'Georgia', couleurNom: '6B4A3A' }, couleur: function (p) { return { primaire: p.primaire, fondSidebar: p.teinte, couleurNom: p.primaire }; } },
    'moderne-green': { construire: 'deuxColonnes', opts: { primaire: '3FA34D', fondSidebar: 'EAF3E0', texteSidebar: '1f2a1f', styleBandeau: 'teinte' }, couleur: function (p) { return { primaire: p.primaire, fondSidebar: p.teinte }; } },
    'moderne': { construire: 'deuxColonnes', opts: { primaire: '2563EB', fondSidebar: 'F3F4F6', texteSidebar: '222222', styleBandeau: 'teinte', police: 'Calibri' }, couleur: function (p) { return { primaire: p.primaire, fondSidebar: p.teinte }; } },
    'geometrique': { construire: 'deuxColonnes', opts: { primaire: '4B57C9', fondSidebar: '6D89EA', styleBandeau: 'plein' }, couleur: function (p) { return { primaire: p.primaire, fondSidebar: p.primaire }; } },
    'ruban': { construire: 'deuxColonnes', opts: { primaire: 'E2006E', secondaire: 'F7A8C4', styleBandeau: 'bordure', texteSidebar: '1F2937' }, couleur: function (p) { return { primaire: p.primaire, secondaire: p.secondaire }; } },
    'classique': { construire: 'uneColonne', opts: { primaire: '000000', texte: '1A1A1A', secondaire: '666666', police: 'Georgia' }, couleur: function (p) { return { primaire: p.primaire, secondaire: p.secondaire }; } },
    'minimaliste': { construire: 'uneColonne', opts: { primaire: '1A1A1A', texte: '1A1A1A', secondaire: '777777', police: 'Calibri' }, couleur: function (p) { return { primaire: p.primaire, secondaire: p.secondaire }; } },
    'institutionnel': { construire: 'uneColonne', opts: { primaire: '1A1A2E', texte: '1A1A2E', secondaire: '555566', police: 'Times New Roman', soulignerTitres: true }, couleur: function (p) { return { primaire: p.primaire, secondaire: p.secondaire }; } },
    'elegant': { construire: 'uneColonne', opts: { primaire: '1F2937', texte: '1F2937', secondaire: 'D4AF37', police: 'Georgia', centrerEntete: true, objectifItalique: true, soulignerTitres: true }, couleur: function (p) { return { primaire: p.primaire, secondaire: p.secondaire }; } },
    'jeune-diplome': { construire: 'uneColonne', opts: { primaire: '1D4ED8', texte: '1E293B', secondaire: '3B82F6', police: 'Calibri', ordre: ['profil', 'formations', 'experiences', 'experiencesPersonnelles', 'engagements', 'competences', 'langues', 'certifications', 'permis', 'loisirs'] }, couleur: function (p) { return { primaire: p.primaire, secondaire: p.secondaire }; } }
  };
  return base[modeleId] || null;
}

function _fusionnerObjets() {
  var resultat = {};
  for (var i = 0; i < arguments.length; i++) {
    var o = arguments[i] || {};
    Object.keys(o).forEach(function (cle) { resultat[cle] = o[cle]; });
  }
  return resultat;
}

// ============================================================
// Construit le Document docx-js pour N'IMPORTE QUEL modele, avec couleur
// et format de page optionnels -- UN SEUL appel au bon constructeur,
// opts calculees une fois (pas de generation "a blanc" jetee ensuite).
// ============================================================
function _dnConstruireDocumentAvecOptions(docx, objetCV, modeleId, couleurId, formatPage) {
  var palette = (couleurId && typeof PALETTES_COULEURS_CV !== 'undefined') ? PALETTES_COULEURS_CV[couleurId] : null;
  var opts = { formatPage: formatPage };

  // TACHE (retour utilisateur : 5 designs A5, comme pour A4 -- on commence
  // par 2) : le format A5 a desormais SES PROPRES modeles (MODELES_A5_CV_DISPONIBLES,
  // app.js), independants du choix A4 -- modeleId ici est un id A5
  // ('portrait', bientot 'paysage'), jamais un id de modele A4.
  if (formatPage === 'A5') {
    if (palette) { opts.primaire = palette.primaire; opts.secondaire = palette.secondaire; }
    switch (modeleId) {
      case 'paysage':
        return _dnConstruireMiniCVPaysage(docx, objetCV, opts);
      case 'portrait':
      default:
        return _dnConstruireMiniCV(docx, objetCV, opts);
    }
  }

  switch (modeleId) {
    case 'impact':
      if (palette) { opts.accent = palette.primaire; opts.fondSidebar = palette.teinte; }
      return _dnConstruireImpact(docx, objetCV, opts);
    case 'dispo':
      if (palette) { opts.primaire = palette.primaire; opts.teinte = palette.teinte; }
      return _dnConstruireDispo(docx, objetCV, opts);
    case 'creatif':
      if (palette) { opts.primaire = palette.primaire; opts.fondSidebar = palette.teinte; opts.texteBandeauSecondaire = palette.secondaire; }
      return _dnConstruireCreatif(docx, objetCV, opts);
    case 'trajectoire':
      if (palette) { opts.primaire = palette.primaire; opts.secondaire = palette.secondaire; }
      return _dnConstruireTrajectoire(docx, objetCV, opts);
    // TACHE (correction bug : "Chic ne fonctionne pas") : Chic etait
    // enregistre dans coloriationDocxNatifCV.js (_construireAvecCouleur),
    // mais PAS ici -- or c'est CETTE fonction (_dnConstruireDocumentAvecOptions)
    // qui est reellement appelee par l'apercu et le telechargement
    // (genererDocxNatifCVFormat, la SEULE utilisee desormais). Ajoute ici,
    // la ou ca compte vraiment.
    case 'chic':
      if (palette) { opts.primaire = palette.primaire; }
      return _dnConstruireChic(docx, objetCV, opts);
    default:
      var config = _dnOptionsBaseParModele(modeleId);
      if (!config) { return null; }
      var optsFinal = _fusionnerObjets(config.opts, palette ? config.couleur(palette) : {}, opts);
      return config.construire === 'deuxColonnes' ? _dnConstruireDeuxColonnes(docx, objetCV, optsFinal) : _dnConstruireUneColonne(docx, objetCV, optsFinal);
  }
}

// ============================================================
// Point d'entree public, appele depuis app.js/apercuDocxIntegre.js.
// - formatPage absent ou 'A4' : "A4 Détaillé", contenu complet
//   (construireObjetCVPourExport, deja existant, moteur de decision
//   conditionnel a la presence de recommandations IA -- comportement
//   inchange).
// - formatPage === 'A4-essentiel' : "A4 Essentiel", contenu allege
//   (construireObjetCVPourExportEssentiel, TOUJOURS applique) sur une
//   page A4 normale (aucun changement de taille).
// - formatPage === 'A5' : "Mini CV (A5)", contenu tres recadre
//   (construireObjetCVPourExportA5, TOUJOURS applique) + page A5 reelle.
// ============================================================
function genererDocxNatifCVFormat(modeleId, couleurId, formatPage) {
  var promesseObjet;
  if (formatPage === 'A5') {
    promesseObjet = Promise.resolve(construireObjetCVPourExportA5(modeleId));
  } else if (formatPage === 'A4-essentiel') {
    promesseObjet = Promise.resolve(construireObjetCVPourExportEssentiel(modeleId));
  } else {
    promesseObjet = (typeof construireObjetCVPourExport === 'function') ? construireObjetCVPourExport(modeleId) : Promise.resolve(normaliserDonneesCV(dossier));
  }

  return promesseObjet.then(function (objetCV) {
    return chargerLibrairieDocxNatif().then(function (docx) {
      var document = _dnConstruireDocumentAvecOptions(docx, objetCV, modeleId, couleurId, formatPage);
      if (!document) { throw new Error('Modele non couvert pour ce format.'); }
      return docx.Packer.toBlob(document);
    });
  });
}

// Tous les modeles CV natifs supportent l'A5 (meme mecanisme generique).
var MODELES_AVEC_FORMAT_A5_CV = typeof MODELES_AVEC_DOCX_NATIF_CV !== 'undefined' ? MODELES_AVEC_DOCX_NATIF_CV.slice() : [];

// TACHE (retour utilisateur : 5 designs A5, comme pour A4 -- on commence
// par 2) : liste DISTINCTE de MODELES_AVEC_DOCX_NATIF_CV (A4) -- les id de
// modeles A5 ('portrait', bientot 'paysage') n'ont rien a voir avec ceux
// des modeles A4, jamais a confondre ni fusionner.
var MODELES_AVEC_DOCX_NATIF_A5_CV = ['portrait', 'paysage'];
