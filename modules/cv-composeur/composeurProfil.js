/* ============================================================
   composeurProfil.js
   ------------------------------------------------------------
   Moteur "Composeur (Bêta)" — Couche ① : Profil de contenu.
   Voir architecture-moteur-cv.md §2 (couche ①) pour le contrat complet.

   Mesure objetCV (produit par normaliserDonneesCV(dossier), fonction
   EXISTANTE réutilisée telle quelle — voir composeurMoteur.js) et produit
   un objet neutre, factuel, décrivant le volume et la nature du contenu.

   AUCUNE décision de mise en page ici — uniquement des constats. Les
   décisions vivent dans composeurRegles.js (②) et composeurComposition.js
   (③), jamais ici (principe directeur n°1/n°2 du contrat d'architecture :
   responsabilités séparées, jamais mélangées).
   ============================================================ */

function composeurAnalyserProfil(objetCV, objectifCandidature) {
  var identite = objetCV.identite || {};
  var nomComplet = ((identite.prenom || '') + ' ' + (identite.nom || '')).trim();
  var experiences = objetCV.experiences || [];
  var competences = objetCV.competences || {};
  var volumeCompetences = (competences.savoirFaire || []).length + (competences.savoirEtre || []).length + (competences.savoirs || []).length;

  // Longueur moyenne des missions (caracteres) -- indicateur de densite,
  // pas une donnee affichee telle quelle.
  var longueursMissions = experiences.map(function (e) { return (e.missions || '').length; });
  var totalCaracteresMissions = longueursMissions.reduce(function (a, b) { return a + b; }, 0);
  var longueurMoyenneMissions = longueursMissions.length ? Math.round(totalCaracteresMissions / longueursMissions.length) : 0;

  // Anciennete totale ESTIMEE (annees) -- a partir des annees extraites des
  // dates (formats "AAAA" ou "AAAA-MM", voir formulaire d'experience,
  // js/app.js). Estimation grossiere assumee comme telle, jamais un calcul
  // de jours exact (les dates saisies n'ont elles-memes pas cette
  // precision : le jour du mois n'est jamais demande).
  function anneeDe(texte) {
    var m = (texte || '').match(/\d{4}/);
    return m ? parseInt(m[0], 10) : null;
  }
  var anneeCourante = new Date().getFullYear();
  var ancienneteAnnees = experiences.reduce(function (total, e) {
    var debut = anneeDe(e.dateDebut);
    var fin = e.dateFin ? anneeDe(e.dateFin) : anneeCourante;
    if (debut === null || fin === null || fin < debut) { return total; }
    return total + (fin - debut);
  }, 0);

  // Volume de texte total -- sert a la DENSITE GLOBALE, jamais le nombre
  // de rubriques seul (2 experiences tres detaillees peuvent etre aussi
  // denses que 5 experiences courtes -- voir architecture §2, couche ①).
  var volumeTexteTotal =
    ((objetCV.profil && (objetCV.profil.profilIA || objetCV.profil.profilUtilisateur)) || '').length +
    totalCaracteresMissions +
    volumeCompetences * 15 + // estimation : ~15 caracteres par competence citee
    (objetCV.formations || []).length * 30;

  var densite = volumeTexteTotal < 600 ? 'faible' : (volumeTexteTotal < 1600 ? 'moyenne' : 'forte');

  // Profil de parcours -- deduit de l'anciennete et du type de candidature
  // (dossier.objectif, deja saisi ailleurs dans l'app -- transmis en 2e
  // parametre, jamais lu directement depuis un "dossier" global ici : ①
  // ne connait qu'objetCV + ce qu'on lui donne explicitement).
  var profilParcours;
  if (objectifCandidature === 'reconversion') {
    profilParcours = 'reconversion';
  } else if (experiences.length === 0 || ancienneteAnnees < 1) {
    profilParcours = 'debutant';
  } else if (ancienneteAnnees >= 8) {
    profilParcours = 'cadre';
  } else {
    profilParcours = 'confirme';
  }

  // Rubrique "prioritaire" -- poids APPROXIMATIF (R002 revisee, voir
  // composeurRegles.js) : sert de signal au Rule Engine, jamais une
  // decision de mise en page en soi.
  var poidsParRubrique = {
    experiences: totalCaracteresMissions,
    formations: (objetCV.formations || []).length * 80,
    competences: volumeCompetences * 15
  };
  var rubriquePrioritaireParContenu = Object.keys(poidsParRubrique).reduce(function (meilleure, cle) {
    return poidsParRubrique[cle] > poidsParRubrique[meilleure] ? cle : meilleure;
  }, 'experiences');

  return {
    nomLongueur: nomComplet.length,
    photo: !!(objetCV.photo && objetCV.photo.url),
    densite: densite,
    profilParcours: profilParcours,
    // TACHE (Composeur, contrat composeur-strategies-cv-v2.md §2, étape 2)
    // : champs additifs pour R005 (sélection de stratégie via
    // calculerScoresStrategies(), decouverteStrategie.js) -- réutilisent
    // des valeurs déjà calculées ci-dessus (experiences.length,
    // objectifCandidature), jamais un nouveau calcul dupliqué.
    // nombreExperiencesPersonnelles reste une approximation (présence de
    // loisirs/engagements plutôt qu'un compte exact, cette distinction
    // n'existe plus une fois les données arrivées jusqu'ici) -- assumé
    // explicitement, pas caché.
    nombreExperiencesProfessionnelles: experiences.length,
    nombreExperiencesPersonnelles: ((objetCV.loisirs || []).length > 0 || (objetCV.engagements || []).length > 0) ? 1 : 0,
    objectifReconversion: objectifCandidature === 'reconversion',
    volumes: {
      experiences: experiences.length,
      competences: volumeCompetences,
      formations: (objetCV.formations || []).length,
      langues: (objetCV.langues || []).length,
      certifications: (objetCV.certifications || []).length,
      loisirs: (objetCV.loisirs || []).length > 0,
      engagements: (objetCV.engagements || []).length > 0
    },
    ancienneteAnnees: ancienneteAnnees,
    longueurMoyenneMissions: longueurMoyenneMissions,
    rubriquePrioritaireParContenu: rubriquePrioritaireParContenu
  };
}
