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

function genererDocxComposeur(dossierSource, variantesChoisies, idTheme, formatPage, sansAccroche) {
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

  // TACHE (composeur-theme-engine-conception.md, décision tranchée) : le
  // thème doit être résolu AVANT la composition -- inchangé.
  // TACHE (Projet XXL) : idTheme peut désormais être soit une chaîne
  // (comportement historique, inchangé pour Sobre/Institutionnel/
  // Moderne -- toujours des chaînes), soit un thème DÉJÀ CONSTRUIT par
  // composeurAppliquerReglagesProjetXXL() (composeurTheme.js), auquel
  // cas il est utilisé tel quel, jamais redécodé par
  // composeurObtenirTheme() (qui ne comprend que des identifiants texte
  // et planterait sur un objet -- voir sa propre documentation).
  var theme = (idTheme && typeof idTheme === 'object') ? idTheme : composeurObtenirTheme(idTheme);

  // TACHE (bouton "Mettre en avant + regrouper", point 14 cv.md) :
  // theme.regroupementActif vient de composeurResoudreThemeGeneration()
  // (app.js), meme circuit que lettreJointe/optionDebordement -- jamais
  // un parametre de fonction supplementaire ici. Applique APRES
  // appliquerMoteurDecisionCV() (qui a deja selectionne/ordonne/complete
  // objetCV.experiences), pour remplacer ensuite cette liste par
  // [experience prioritaire + groupes] uniquement si l'IA a propose
  // quelque chose d'exploitable -- comportement inchange sinon (repli
  // silencieux sur objetCV.experiences tel quel).
  if (theme && theme.regroupementActif) {
    objetCV = composeurAppliquerRegroupementExperiences(objetCV, recommandationsIACV.regroupementExperiences);
  }

  // TACHE (retour utilisateur : "sans accroche") : efface uniquement
  // cette copie locale objetCV (déjà une reconstruction propre à cette
  // génération, jamais dossierSource.profil lui-même).
  // TACHE (Projet XXL, règle "lettre jointe -> accroche retirée
  // automatiquement", doc de conception) : theme.lettreJointe (Projet
  // XXL uniquement -- absent et donc toujours "undefined"/falsy sur les
  // 3 autres thèmes, donc sans le moindre effet sur eux) vaut comme un
  // sansAccroche implicite si l'appelant ne l'a pas déjà précisé
  // lui-même -- une seule règle appliquée ici, jamais deux logiques
  // parallèles de retrait de l'accroche.
  var sansAccropcheEffectif = sansAccroche || !!(theme && theme.lettreJointe);
  if (sansAccropcheEffectif && objetCV.profil) { objetCV.profil = { profilIA: '', profilUtilisateur: '' }; }

  var profil = composeurAnalyserProfil(objetCV, dossierSource.objectif);
  var decisions = composeurAppliquerRegles(profil);
  var composition = composeurComposer(objetCV, profil, decisions, variantesChoisies || {}, formatPage, theme);

  return chargerLibrairieDocxNatif().then(function (docx) {
    var document = composeurConstruireDocument(docx, objetCV, composition, theme);
    return docx.Packer.toBlob(document);
  });
}

// TACHE (bouton "Mettre en avant + regrouper", point 14 cv.md) : remplace
// objetCV.experiences par [experience prioritaire (5 missions, pro ou
// personnelle -- toujours affichee comme la 1ere experience du bloc
// "Experience professionnelle", quel que soit son type reel, pour rester
// simple et coherente avec ce qui a ete teste) + une pseudo-experience par
// groupe (poste = metiers joints par une virgule, missions = texteRegroupe
// en une seule ligne, jamais decoupee)]. Copie defensive de objetCV (jamais
// modifie sur place), meme principe que le reste de ce moteur. Repli
// silencieux sur objetCV inchange si rien d'exploitable n'a ete propose
// par l'IA (aucune experience prioritaire ET aucun groupe) -- n'est
// appelee que si theme.regroupementActif est vrai, mais reste prudente
// meme dans ce cas (l'IA peut ne rien avoir propose pour ce profil).
function composeurAppliquerRegroupementExperiences(objetCV, regroupementExperiences) {
  var reg = regroupementExperiences || {};
  var prio = reg.experiencePrioritaire || {};
  var groupes = reg.groupes || [];

  // TACHE (retour utilisateur : "Travaux polyvalents du bâtiment" --
  // intitule fusionne invente par l'IA sur un profil a 4 metiers
  // equivalents) : verifie que l'experience prioritaire correspond
  // REELLEMENT a une experience du dossier -- jamais une confiance
  // aveugle dans le texte de l'IA, meme principe que la validation deja
  // faite pour illustrePar (app.js). Si le poste/intitule ne correspond
  // a rien de reel, tout le regroupement est traite comme inexploitable
  // pour cette generation -- repli sur objetCV inchange, jamais un CV
  // affichant une experience prioritaire inventee.
  var experiencesReelles = objetCV.experiences || [];
  var experiencesPersoReelles = objetCV.experiencesPersonnelles || [];
  var prioValideContreDossier = !!(
    (prio.type === 'professionnelle' && prio.poste && experiencesReelles.some(function (e) {
      return (e.poste && correspond(e.poste, prio.poste)) || (e.entreprise && prio.entreprise && correspond(e.entreprise, prio.entreprise));
    })) ||
    (prio.type === 'personnelle' && prio.intitule && experiencesPersoReelles.some(function (e) {
      return e.intitule && correspond(e.intitule, prio.intitule);
    }))
  );

  var aUneExperiencePrioritaire = prioValideContreDossier;
  if (!aUneExperiencePrioritaire) { return objetCV; }

  var experiencePrioritaireItem = aUneExperiencePrioritaire ? {
    poste: prio.type === 'professionnelle' ? prio.poste : prio.intitule,
    entreprise: prio.type === 'professionnelle' ? (prio.entreprise || '') : '',
    lieu: '', dateDebut: '', dateFin: '',
    missions: (prio.missions || []).join('\n'),
    contrat: ''
  } : null;

  var groupesItems = groupes.map(function (g) {
    return {
      poste: (g.metiers || []).join(', '),
      entreprise: '', lieu: '', dateDebut: '', dateFin: '',
      missions: g.texteRegroupe || '',
      contrat: ''
    };
  });

  var copie = {};
  Object.keys(objetCV).forEach(function (cle) { copie[cle] = objetCV[cle]; });
  copie.experiences = (experiencePrioritaireItem ? [experiencePrioritaireItem] : []).concat(groupesItems);
  // TACHE (bouton "Mettre en avant + regrouper") : indicateur lu par
  // composeurComposition.js pour neutraliser SA propre troncature par
  // nombre de lignes (lignesMaxParExperience, base sur le nombre
  // d'"experiences" -- qui ne correspond plus au nombre reel d'experiences
  // une fois regroupees). Le contenu est deja correctement dimensionne ici
  // (5 missions pour la prioritaire, 1 ligne pour chaque groupe) : aucune
  // troncature supplementaire n'est necessaire ni souhaitable.
  copie._regroupementExperiencesApplique = true;
  return copie;
}

// TACHE (retour utilisateur : "Ce modèle ne dispose pas encore d'un aperçu
// Word" -- l'aperçu integre refuse tout modele absent de cette liste,
// voir apercuDocxIntegre.js) : meme convention deja utilisee par les
// autres fichiers qui ETENDENT la couverture Word native sans modifier
// exportDocxNatifCV.js (ou ce tableau est declare) -- voir
// exportDocxNatifCV_NouveauxModeles.js (impact/dispo/creatif) et
// exportDocxNatifCV_Chic.js (chic), meme ligne, meme principe.
if (typeof MODELES_AVEC_DOCX_NATIF_CV !== 'undefined') { MODELES_AVEC_DOCX_NATIF_CV.push('composeur'); }
