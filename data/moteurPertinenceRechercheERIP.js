/* ============================================================
   data/moteurPertinenceRechercheERIP.js
   ------------------------------------------------------------
   ETAPE C (evolution du moteur de recherche, architecture validee) :
   generalisation du score de pertinence a la recherche en texte libre.

   Principe : plutot que de creer un nouveau moteur de score parallele,
   ce fichier transforme les concepts extraits d'une phrase (Etape B) en
   un "profil" de la meme forme que celui du Dossier Candidat, puis
   reutilise integralement rechercherMetiers()/calculerScoreMetier()
   (metiers.js) -- INCHANGEES, deja utilisees par les recommandations de
   l'ecran Potentiel. Un metier bien classe en recherche l'est donc
   desormais pour les memes raisons (memes ponderations, meme calcul)
   qu'un metier recommande sur le profil du candidat.

   Toujours purement additif a ce stade : aucun ecran n'appelle encore
   rechercherMetiersDepuisTexte(). Prochaine etape (D) : la brancher dans
   la barre de recherche, en complement de la recherche par mot-clef exact
   deja existante (rechercherBaseConnaissances).
   ============================================================ */

// Regroupe les concepts extraits (Etape B, { id, label, origine }) par
// origine, dans la forme exacte attendue par rechercherMetiers() :
// { activites, actions, environnement, valeurs, savoirFaire, savoirEtre,
// savoirs }. Depuis le raffinement de l'Etape B (extraction etendue aux
// competences et savoirs), ces 3 derniers champs peuvent desormais etre
// alimentes directement, au meme titre que les 4 catalogues initiaux.
function construireProfilDepuisConcepts(concepts) {
  var profil = {
    activites: [], actions: [], environnement: [], valeurs: [],
    savoirFaire: [], savoirEtre: [], savoirs: []
  };
  (concepts || []).forEach(function (c) {
    if (profil[c.origine] && profil[c.origine].indexOf(c.id) === -1) {
      profil[c.origine].push(c.id);
    }
  });
  return profil;
}

// Point d'entree unique : phrase libre -> metiers classes par pertinence,
// avec leurs raisons (deja produites par calculerScoreMetier, reutilisees
// sans modification -- c'est la base de la future "explication des
// resultats", TACHE prevue mais non demandee immediatement).
function rechercherMetiersDepuisTexte(texte, nombreMax) {
  var concepts = extraireConceptsDeRecherche(texte);
  if (!concepts.length) { return []; }
  var profil = construireProfilDepuisConcepts(concepts);
  return rechercherMetiers(profil, nombreMax);
}
