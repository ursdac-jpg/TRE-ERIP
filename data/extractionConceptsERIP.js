/* ============================================================
   data/extractionConceptsERIP.js
   ------------------------------------------------------------
   ETAPE B (evolution du moteur de recherche, architecture validee) :
   extraction de concepts ERIP a partir d'une phrase libre.

   Objectif : transformer un texte quelconque ("je veux travailler seul
   en exterieur avec des outils") en une liste de concepts reconnus par
   les referentiels ERIP (ex. seul, exterieur, outils), SANS chercher
   la phrase telle quelle dans une liste figee.

   Reutilise integralement l'existant, aucune duplication :
   - normaliserAvecSynonymes() (Etape A, data/dictionnaireLexicalERIP.js)
   - motsCles() (metiers.js) : decoupage + singulier/pluriel, deja utilise
     par le moteur de recommandation de metiers (calculerScoreMetier)
   - aplatirCatalogue() (data/baseConnaissancesERIP.js)

   Cette fonction ne modifie, n'affiche et ne remplace rien : comme
   l'Etape A, elle n'est branchee sur aucun ecran a ce stade (prochaine
   etape : generaliser calculerScoreMetier pour accepter ces concepts).

   Limite connue et acceptee a ce stade (comme pour l'Etape A) : la
   ponctuation collee a un mot ("seul(e)", "l'outillage") n'est pas
   encore neutralisee par normaliserTexte -- c'est une tolerance listee
   comme une etape ulterieure, pas un defaut de cette etape.
   ============================================================ */

// Les 4 catalogues de selection deja existants, dont les libelles
// alimentent l'extraction de concepts. Ajouter un futur referentiel
// (formations, logiciels...) revient a ajouter une ligne ici, sans
// toucher au reste de la fonction.
var SOURCES_CONCEPTS_ERIP = [
  { catalogue: function () { return CATALOGUE_ACTIONS_PRO; }, origine: 'actions' },
  { catalogue: function () { return CATALOGUE_PERSONNES_MATERIELS_LIEUX; }, origine: 'activites' },
  { catalogue: function () { return CATALOGUE_ENVIRONNEMENTS_TRAVAIL; }, origine: 'environnement' },
  { catalogue: function () { return CATALOGUE_VALEURS_PROFESSIONNELLES; }, origine: 'valeurs' }
];

// Mots vides (articles, prepositions, pronoms, verbes tres frequents) a
// ignorer lors de la comparaison : sans ce filtre, un mot comme "des" (3
// lettres, donc conserve par motsCles) correspondrait a tort a tous les
// libelles commencant par "Des ..." ("Des clients", "Des outils"...), quel
// que soit le sujet reel de la recherche.
var MOTS_VIDES_RECHERCHE_ERIP = [
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'ce', 'ces', 'cette',
  'en', 'et', 'ou', 'avec', 'pour', 'dans', 'sur', 'sous', 'par', 'sans',
  'veux', 'voudrais', 'aime', 'aimerais', 'souhaite', 'souhaiterais',
  'prefere', 'preferer', 'etre', 'avoir', 'faire', 'fait',
  'plus', 'tres', 'bien', 'aussi', 'que', 'qui', 'mon', 'ma', 'mes',
  'votre', 'vos', 'leur', 'leurs', 'pas', 'non', 'oui',
  'travailler', 'travail', 'metier', 'job', 'emploi'
];

function motsSignificatifs(texte) {
  return motsCles(texte).filter(function (mot) { return MOTS_VIDES_RECHERCHE_ERIP.indexOf(mot) === -1; });
}

// ETAPE 1 (raffinement demande) : en complement des 4 catalogues ci-dessus,
// les savoir-faire/savoir-etre (categorieCompetence, app.js) et les savoirs
// (agreges depuis metiers + actions + environnements, comme deja fait dans
// rechercherBaseConnaissances, data/baseConnaissancesERIP.js) deviennent
// eux aussi des sources de concepts. Permet par exemple de reconnaitre
// "autonomie" ou "relation client" directement comme concept, et pas
// seulement via le libelle d'une carte des 4 catalogues.
function ajouterConceptsCompetencesEtSavoirs(motsRecherche, concepts, idsVus) {
  // Savoir-faire / savoir-etre : categorieCompetence est un dictionnaire
  // plat { terme: 'Savoir-faire'|'Savoir-etre' }, deja utilise par
  // l'Explorateur (TACHE 33A). Meme vocabulaire que les savoirFaire/
  // savoirEtre des metiers : aucune transformation necessaire.
  if (typeof categorieCompetence !== 'undefined' && categorieCompetence) {
    Object.keys(categorieCompetence).forEach(function (terme) {
      var motsTerme = motsCles(terme);
      var trouve = motsTerme.some(function (mot) { return motDansListeApprocheERIP(mot, motsRecherche); });
      var origine = categorieCompetence[terme] === 'Savoir-faire' ? 'savoirFaire' : 'savoirEtre';
      var cle = origine + ':' + terme;
      if (trouve && !idsVus[cle]) {
        idsVus[cle] = true;
        concepts.push({ id: terme, label: terme, origine: origine });
      }
    });
  }

  // Savoirs : pas de referentiel dedie, agreges depuis metiers + actions +
  // environnements (meme logique que rechercherBaseConnaissances).
  var savoirsVus = {};
  var savoirsListe = [];
  function collecterSavoirs(liste) {
    (liste || []).forEach(function (s) { if (!savoirsVus[s]) { savoirsVus[s] = true; savoirsListe.push(s); } });
  }
  if (typeof baseMetiers !== 'undefined') { baseMetiers.forEach(function (m) { collecterSavoirs(m.savoirs); }); }
  if (typeof CATALOGUE_ACTIONS_PRO !== 'undefined') { aplatirCatalogue(CATALOGUE_ACTIONS_PRO).forEach(function (a) { collecterSavoirs(a.savoirs); }); }
  if (typeof CATALOGUE_PERSONNES_MATERIELS_LIEUX !== 'undefined') { aplatirCatalogue(CATALOGUE_PERSONNES_MATERIELS_LIEUX).forEach(function (a) { collecterSavoirs(a.savoirs); }); }
  if (typeof CATALOGUE_ENVIRONNEMENTS_TRAVAIL !== 'undefined') { aplatirCatalogue(CATALOGUE_ENVIRONNEMENTS_TRAVAIL).forEach(function (a) { collecterSavoirs(a.savoirs); }); }
  savoirsListe.forEach(function (savoir) {
    var motsSavoir = motsCles(savoir);
    var trouve = motsSavoir.some(function (mot) { return motDansListeApprocheERIP(mot, motsRecherche); });
    var cle = 'savoirs:' + savoir;
    if (trouve && !idsVus[cle]) {
      idsVus[cle] = true;
      concepts.push({ id: savoir, label: savoir, origine: 'savoirs' });
    }
  });
}

// Retourne la liste des concepts ERIP reconnus dans un texte libre :
// [{ id, label, origine }, ...]. "origine" correspond au champ du dossier
// candidat concerne (activites, actions, environnement, valeurs, savoirFaire,
// savoirEtre, savoirs), pour une reutilisation directe et immediate par
// calculerScoreMetier() a l'etape suivante, sans transformation supplementaire.
function extraireConceptsDeRecherche(texte) {
  var texteNormalise = normaliserAvecSynonymes(texte);
  if (!texteNormalise) { return []; }
  var motsRecherche = motsSignificatifs(texteNormalise);
  if (!motsRecherche.length) { return []; }

  var concepts = [];
  var idsVus = {};
  SOURCES_CONCEPTS_ERIP.forEach(function (source) {
    aplatirCatalogue(source.catalogue()).forEach(function (item) {
      var motsItem = motsCles(item.label);
      var trouve = motsItem.some(function (motItem) { return motDansListeApprocheERIP(motItem, motsRecherche); });
      var cle = source.origine + ':' + item.id;
      if (trouve && !idsVus[cle]) {
        idsVus[cle] = true;
        concepts.push({ id: item.id, label: item.label, origine: source.origine });
      }
    });
  });
  ajouterConceptsCompetencesEtSavoirs(motsRecherche, concepts, idsVus);
  return concepts;
}
