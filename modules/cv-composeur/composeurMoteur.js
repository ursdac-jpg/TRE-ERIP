/* ============================================================
   composeurMoteur.js
   ------------------------------------------------------------
   Moteur "Composeur (Bêta)" — Point d'entrée unique.
   Orchestre ①→②→③→④→⑤ dans l'ordre, voir architecture-moteur-cv.md.

   genererDocxComposeur(dossier) : Promise<Blob> (docx) -- même contrat
   que genererDocxNatifCV()/genererDocxNatifCVFormat() déjà utilisés
   ailleurs dans l'appli (exportDocxNatifCV.js, formatA5CV.js — fichiers
   EXISTANTS, jamais modifiés). Le seul point de contact avec le reste de
   l'application est l'interception ajoutée en tout début de
   genererDocxNatifCVFormat() (formatA5CV.js) — voir ce fichier pour
   l'unique ligne d'intégration (architecture §0.1).

   Réutilise normaliserDonneesCV(dossier) et chargerLibrairieDocxNatif()
   -- fonctions EXISTANTES, jamais dupliquées ni modifiées : une seule
   lecture du dossier, un seul chargement de la librairie docx, partagés
   avec les 16 modèles historiques.
   ============================================================ */

function genererDocxComposeur(dossierSource, variantesChoisies, idTheme, formatPage) {
  var objetCVBrut = normaliserDonneesCV(dossierSource);
  // TACHE (retour utilisateur : "j'ai bien donné les dates mais je ne les
  // vois pas dans le CV") : bug majeur trouvé -- le Composeur ne passait
  // jamais par appliquerMoteurDecisionCV() (app.js), la fonction qui
  // applique réellement les recommandations de l'IA (missions
  // retravaillées via savoirFaireParExperience, dates confirmées via
  // experiencesAMettreEnAvant, sélection des expériences à mettre en
  // avant) -- il travaillait directement sur le dossier brut, sans
  // aucune des améliorations validées à l'écran "Choisissez ce que l'IA
  // propose". Même mécanisme que le pipeline classique
  // (_dnConstruireObjetCVRecadre, formatA5CV.js), MAIS avec des capacites
  // VIDES ({}) volontairement : le Composeur gère déjà ses propres
  // plafonds/troncature plus loin (composeurComposition.js, contrat
  // composeur-strategies-cv-v2.md) -- capacites vide fait que decider()
  // n'applique que le tri/la sélection/les missions, jamais une seconde
  // troncature qui entrerait en conflit avec celle déjà construite.
  var recommandationsIACV = (dossierSource.ia && dossierSource.ia.cv && dossierSource.ia.cv.recommandations) || {};
  var objetCV = (typeof appliquerMoteurDecisionCV === 'function')
    ? appliquerMoteurDecisionCV(objetCVBrut, recommandationsIACV, {})
    : objetCVBrut;
  var profil = composeurAnalyserProfil(objetCV, dossierSource.objectif);
  var decisions = composeurAppliquerRegles(profil);
  // TACHE (composeur-theme-engine-conception.md, décision tranchée) : le
  // thème doit être résolu AVANT la composition -- nombreColonnes est
  // désormais lu depuis theme.colonnes (composeurComposition.js), plus
  // depuis la variante d'en-tête.
  var theme = composeurObtenirTheme(idTheme);
  var composition = composeurComposer(objetCV, profil, decisions, variantesChoisies || {}, formatPage, theme);

  return chargerLibrairieDocxNatif().then(function (docx) {
    var document = composeurConstruireDocument(docx, objetCV, composition, theme);
    return docx.Packer.toBlob(document);
  });
}

// TACHE (retour utilisateur : "Ce modèle ne dispose pas encore d'un aperçu
// Word" -- l'aperçu integre refuse tout modele absent de cette liste,
// voir apercuDocxIntegre.js) : meme convention deja utilisee par les
// autres fichiers qui ETENDENT la couverture Word native sans modifier
// exportDocxNatifCV.js (ou ce tableau est declare) -- voir
// exportDocxNatifCV_NouveauxModeles.js (impact/dispo/creatif) et
// exportDocxNatifCV_Chic.js (chic), meme ligne, meme principe.
if (typeof MODELES_AVEC_DOCX_NATIF_CV !== 'undefined') { MODELES_AVEC_DOCX_NATIF_CV.push('composeur'); }
