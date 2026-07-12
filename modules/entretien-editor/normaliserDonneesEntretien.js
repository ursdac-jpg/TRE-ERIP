/* ============================================================
   modules/entretien-editor/normaliserDonneesEntretien.js
   ------------------------------------------------------------
   normaliserDonneesEntretien(dossier) : transforme "dossier" en un objet
   pret pour le rendu de la fiche de preparation a l'entretien. Meme
   principe que normaliserDonneesLettre() : l'essentiel du contenu
   (presentation, points a preparer, questions anticipees, questions du
   candidat) provient deja tout fait de dossier.ia.entretien (produit par
   le prompt Entretien, voir prompts/entretien.md). Ici, on ne fait
   qu'assembler ce contenu avec l'identite et le contexte de la
   candidature (metier/poste vise, entreprise), pour l'en-tete de la fiche.

   "dossier" reste l'unique source de verite : cette fonction ne le
   modifie jamais.

   IMPORTANT (meme principe que pour le CV et la lettre) : aucune logique
   de presentation ici -- uniquement des donnees propres, completes,
   pretes a etre inserees dans un template par rendreTemplate() (deja
   generique, reutilise tel quel, aucune modification necessaire).
   ============================================================ */

function normaliserDonneesEntretien(dossierSource) {
  var d = dossierSource || {};
  var id = d.identite || {};
  var ent = (d.ia && d.ia.entretien) || {};
  var of = (d.objectif && d[d.objectif]) || {};

  // TACHE (retour utilisateur : réponses courtes + conseils par question) :
  // une question anticipee est desormais un objet {question, pistes,
  // amorce} plutot qu'une simple chaine (voir prompts/entretien.md).
  // Tolerance : si une session deja enregistree AVANT ce changement contient
  // encore l'ancien format (chaine simple), elle est convertie a la volee
  // (pistes/amorce vides) plutot que de casser l'affichage.
  var questionsAnticipees = (ent.questionsAnticipees || []).map(function (q) {
    if (typeof q === 'string') { return { question: q, pistes: [], amorce: '' }; }
    return { question: q.question || '', pistes: q.pistes || [], amorce: q.amorce || '' };
  }).filter(function (q) { return q.question; });

  return {
    identite: {
      civilite: id.civilite || null,
      nom: id.nom || '',
      prenom: id.prenom || ''
    },
    metierVise: d.metierCible || d.secteurCible || of.poste || '',
    entreprise: of.structure || '',
    presentation: ent.presentation || '',
    pointsAPreparer: ent.pointsAPreparer || [],
    questionsAnticipees: questionsAnticipees,
    questionsDuCandidat: ent.questionsDuCandidat || []
  };
}
