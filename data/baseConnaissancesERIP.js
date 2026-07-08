/* ============================================================
   data/baseConnaissancesERIP.js
   ------------------------------------------------------------
   TACHE 33A : objet federateur "Base de connaissances ERIP".

   Ne copie AUCUNE donnee : chaque propriete reference directement
   un tableau/objet deja existant (baseMetiers, les 4 catalogues).
   "competences" est complete par app.js une fois categorieCompetence
   declaree (elle vit dans app.js, charge apres ce fichier).

   Evolutivite : pour ajouter une nouvelle source de connaissances
   (formations, certifications, logiciels...), ajouter une propriete
   ici et une entree correspondante dans rechercherBaseConnaissances().
   ============================================================ */

var BASE_CONNAISSANCES_ERIP = {
  metiers: baseMetiers,
  actionsProfessionnelles: CATALOGUE_ACTIONS_PRO,
  environnementsProfessionnels: CATALOGUE_PERSONNES_MATERIELS_LIEUX,
  environnementsTravail: CATALOGUE_ENVIRONNEMENTS_TRAVAIL,
  valeursProfessionnelles: CATALOGUE_VALEURS_PROFESSIONNELLES,
  // TACHE 33A : 'competences' (categorieCompetence) et 'certifications'
  // (CATALOGUE_CERTIFICATIONS) sont assignees par app.js, car ces donnees
  // vivent dans app.js, charge APRES ce fichier.
  competences: null,
  certifications: null
};

// Aplati tous les items d'un catalogue groupe ({categorie, icone, items:[...]})
// en un tableau plat d'items.
function aplatirCatalogue(catalogue) {
  var tous = [];
  (catalogue || []).forEach(function (groupe) {
    (groupe.items || []).forEach(function (item) { tous.push(item); });
  });
  return tous;
}

// TACHE 33A : recherche simple (debut de mot / correspondance partielle),
// sans encore de score de pertinence (prevu TACHE 33B). Regroupe les
// resultats par categorie. Retourne un tableau de { categorie, icone, resultats }.
// N'inclut que les categories pour lesquelles une donnee reelle existe
// (pas de "Niveau d'etudes" / "Codes ROME" en categories independantes :
// aucune donnee de ce type n'existe aujourd'hui dans la Base de connaissances).
function rechercherBaseConnaissances(texte) {
  var q = normaliserTexte(String(texte || '')).trim();
  if (!q || q.length < 2) { return []; }
  function correspond(libelle) { return normaliserTexte(libelle || '').indexOf(q) !== -1; }

  var resultats = [];

  // Metiers
  var metiersTrouves = (BASE_CONNAISSANCES_ERIP.metiers || []).filter(function (m) { return correspond(m.nom); });
  if (metiersTrouves.length) { resultats.push({ categorie: 'Metiers', icone: '💼', resultats: metiersTrouves, type: 'metier' }); }

  // Competences (savoir-faire) et Savoir-etre : issues de categorieCompetence
  if (BASE_CONNAISSANCES_ERIP.competences) {
    var savoirFaireTrouves = [];
    var savoirEtreTrouves = [];
    Object.keys(BASE_CONNAISSANCES_ERIP.competences).forEach(function (terme) {
      if (!correspond(terme)) { return; }
      if (BASE_CONNAISSANCES_ERIP.competences[terme] === 'Savoir-faire') { savoirFaireTrouves.push(terme); }
      else if (BASE_CONNAISSANCES_ERIP.competences[terme] === 'Savoir-etre') { savoirEtreTrouves.push(terme); }
    });
    if (savoirFaireTrouves.length) { resultats.push({ categorie: 'Competences', icone: '⚙️', resultats: savoirFaireTrouves, type: 'texte' }); }
    if (savoirEtreTrouves.length) { resultats.push({ categorie: 'Savoir-etre', icone: '🤝', resultats: savoirEtreTrouves, type: 'texte' }); }
  }

  // Savoirs : agreges depuis metiers + actions + environnements (pas de liste dediee)
  var savoirsSet = {};
  var savoirsTrouves = [];
  function collecterSavoirs(liste) {
    (liste || []).forEach(function (s) {
      if (correspond(s) && !savoirsSet[s]) { savoirsSet[s] = true; savoirsTrouves.push(s); }
    });
  }
  (BASE_CONNAISSANCES_ERIP.metiers || []).forEach(function (m) { collecterSavoirs(m.savoirs); });
  aplatirCatalogue(BASE_CONNAISSANCES_ERIP.actionsProfessionnelles).forEach(function (a) { collecterSavoirs(a.savoirs); });
  aplatirCatalogue(BASE_CONNAISSANCES_ERIP.environnementsProfessionnels).forEach(function (a) { collecterSavoirs(a.savoirs); });
  aplatirCatalogue(BASE_CONNAISSANCES_ERIP.environnementsTravail).forEach(function (a) { collecterSavoirs(a.savoirs); });
  if (savoirsTrouves.length) { resultats.push({ categorie: 'Savoirs', icone: '📚', resultats: savoirsTrouves, type: 'texte' }); }

  // Actions professionnelles
  var actionsTrouvees = aplatirCatalogue(BASE_CONNAISSANCES_ERIP.actionsProfessionnelles).filter(function (a) { return correspond(a.label); });
  if (actionsTrouvees.length) { resultats.push({ categorie: 'Actions professionnelles', icone: '🛠', resultats: actionsTrouvees, type: 'item' }); }

  // Environnements professionnels (personnes / materiels / lieux)
  var envProTrouves = aplatirCatalogue(BASE_CONNAISSANCES_ERIP.environnementsProfessionnels).filter(function (a) { return correspond(a.label); });
  if (envProTrouves.length) { resultats.push({ categorie: 'Environnements professionnels', icone: '🌍', resultats: envProTrouves, type: 'item' }); }

  // Environnements de travail
  var envTravailTrouves = aplatirCatalogue(BASE_CONNAISSANCES_ERIP.environnementsTravail).filter(function (a) { return correspond(a.label); });
  if (envTravailTrouves.length) { resultats.push({ categorie: 'Environnements de travail', icone: '🏢', resultats: envTravailTrouves, type: 'item' }); }

  // Valeurs professionnelles
  var valeursTrouvees = aplatirCatalogue(BASE_CONNAISSANCES_ERIP.valeursProfessionnelles).filter(function (a) { return correspond(a.label); });
  if (valeursTrouvees.length) { resultats.push({ categorie: 'Valeurs professionnelles', icone: '❤️', resultats: valeursTrouvees, type: 'item' }); }

  // TACHE (recherche assistant) : certifications, egalement mentionnees dans
  // la demande d'evolution de la recherche.
  if (BASE_CONNAISSANCES_ERIP.certifications) {
    var certifTrouvees = aplatirCatalogue(BASE_CONNAISSANCES_ERIP.certifications).filter(function (a) { return correspond(a); });
    // Les items du catalogue certifications sont de simples chaines (pas des objets {id,label}).
    if (certifTrouvees.length) {
      resultats.push({ categorie: 'Certifications', icone: '🏅', resultats: certifTrouvees, type: 'texte' });
    }
  }

  return resultats;
}

// TACHE (recherche assistant) : retrouve, pour une competence/savoir-etre/
// savoir donne, les metiers de la Base de connaissances qui la mentionnent
// (jusqu'a "max" resultats). Reutilise par le panneau "metiers associes"
// declenche depuis la recherche.
function trouverMetiersAssocies(competence, max) {
  max = max || 5;
  return (BASE_CONNAISSANCES_ERIP.metiers || []).filter(function (m) {
    return (m.savoirFaire || []).indexOf(competence) !== -1 ||
      (m.savoirEtre || []).indexOf(competence) !== -1 ||
      (m.savoirs || []).indexOf(competence) !== -1;
  }).slice(0, max);
}

// TACHE (amelioration recherche) : meme principe que trouverMetiersAssocies(),
// mais pour les champs identifies par id (environnement, valeurs) plutot que
// par correspondance de texte (chaque metier possede deja environnement[] et
// valeurs[] : ids des catalogues environnementsTravail/valeursProfessionnelles).
function trouverMetiersParChampId(champ, id, max) {
  max = max || 5;
  return (BASE_CONNAISSANCES_ERIP.metiers || []).filter(function (m) {
    return Array.isArray(m[champ]) && m[champ].indexOf(id) !== -1;
  }).slice(0, max);
}
