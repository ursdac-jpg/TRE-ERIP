/* ============================================================
   decouverteClassification.js
   ------------------------------------------------------------
   Module « Découverte et valorisation des compétences ».
   Répond à : document 1 §7.2 (5 catégories) et §7.3 (la preuve).

   Structures de données PURES, réutilisées par tous les autres fichiers
   du module (decouverteAnalyse.js, decouverteRaffinement.js,
   decouverteStrategie.js, decouverteMapping.js). Aucune dépendance,
   aucun appel IA, aucune logique de dossier ici — uniquement le
   vocabulaire commun et les garde-fous qui doivent s'appliquer partout
   de la même façon.
   ============================================================ */

// Les 5 catégories de compétences (doc1 §7.2), dans l'ordre du tableau.
var DECOUVERTE_CATEGORIES = {
  TECHNIQUE: 'technique',
  TRANSFERABLE: 'transferable',
  SAVOIR_ETRE: 'savoirEtre',
  APTITUDE: 'aptitude',
  CENTRE_INTERET: 'centreInteret'
};

// Métadonnées lisibles par catégorie -- pour l'affichage uniquement
// (doc1 §5), jamais utilisées pour une décision automatique.
var DECOUVERTE_CATEGORIES_INFO = {
  technique: {
    libelle: 'Compétence technique',
    description: 'Un savoir-faire concret, lié à un geste ou un outil précis.'
  },
  transferable: {
    libelle: 'Compétence transférable',
    description: 'Une capacité démontrée dans un contexte, réutilisable dans un autre.'
  },
  savoirEtre: {
    libelle: 'Savoir-être',
    description: 'Une manière d\'être en situation de travail ou de relation.'
  },
  aptitude: {
    libelle: 'Aptitude naturelle',
    description: 'Une disposition plutôt qu\'un savoir appris — à traiter avec prudence (doc1 §7.2).'
  },
  centreInteret: {
    libelle: 'Centre d\'intérêt valorisable',
    description: 'Utile pour expliquer une motivation, pas seulement pour lister une compétence.'
  }
};

// Origines possibles d'un fragment (doc2 §3, axe 1) -- INDEPENDANT de la
// catégorie (axe 2) : un fragment personnel peut tout à fait révéler une
// compétence transférable de haut niveau (doc1 §10.2, égalité de
// traitement). Les deux axes ne se déduisent jamais l'un de l'autre.
var DECOUVERTE_ORIGINES = {
  PRO_DECLAREE: 'proDeclaree',
  PRO_NON_DECLAREE: 'proNonDeclaree',
  PERSONNELLE_FAMILIALE: 'personnelleFamiliale',
  BENEVOLE_ASSOCIATIVE: 'benevoleAssociative',
  AUTRE: 'autre'
};

// Les 3 types de CV (doc2 §12) -- l'ENUM vit ici (structure de donnees
// partagee), la DECISION de laquelle choisir vit dans decouverteStrategie.js.
var DECOUVERTE_TYPES_CV = {
  CHRONOLOGIQUE: 'chronologique',
  MIXTE: 'mixte',
  PAR_COMPETENCES: 'parCompetences'
};

var _decouverteCompteurId = 0;
function _decouverteGenererIdCompetence() {
  _decouverteCompteurId += 1;
  return 'competence-' + Date.now() + '-' + _decouverteCompteurId;
}

// Construit une compétence dans sa forme canonique -- reutilisee par tout
// le reste du module. AUCUN champ n'est jamais optionnel silencieusement :
// une compétence sans preuve ni texte est volontairement invalide par
// défaut (voir competenceEstValide ci-dessous, garde-fou doc1 §12 règle 5).
function construireCompetence(params) {
  params = params || {};
  return {
    id: params.id || _decouverteGenererIdCompetence(),
    // Le texte retenu -- soit une formulation proposée par l'IA et
    // choisie par la personne, soit (en cas de repli, doc1 §3.2) les mots
    // exacts de la personne. Ce champ est TOUJOURS la référence -- jamais
    // modifié une fois validé (principe confirmé explicitement).
    texte: params.texte || '',
    categorie: params.categorie || DECOUVERTE_CATEGORIES.TRANSFERABLE,
    origine: params.origine || DECOUVERTE_ORIGINES.AUTRE,
    // La preuve (doc1 §7.3) : fragments concrets du récit qui justifient
    // cette compétence -- toujours un tableau, jamais une chaîne unique
    // (une compétence peut être justifiée par plusieurs faits distincts,
    // voir l'exemple "Organisation" du document 1).
    preuve: Array.isArray(params.preuve) ? params.preuve.slice() : [],
    // TACHE (doc1 §3.2, précision de la relecture finale) : true si
    // "texte" est le récit brut conservé tel quel après un repli, false
    // s'il vient d'une formulation proposée par l'IA et choisie.
    // Purement informatif (utile pour un futur affichage, ex. une
    // petite mention discrète) -- ne change JAMAIS le traitement de la
    // compétence par le reste du module (même précision explicitement
    // ajoutée au document 1).
    texteOriginalConserve: !!params.texteOriginalConserve,
    // true uniquement une fois que la personne a explicitement validé ce
    // choix (jamais avant) -- voir competenceEstValide().
    validee: !!params.validee
  };
}

// Garde-fou direct de doc1 §12 règle 5 : "Aucune compétence conservée
// sans validation explicite de la personne, ET sans une preuve
// rattachable." Cette fonction est le point de vérité UNIQUE de cette
// règle -- tout le reste du module doit passer par elle plutôt que de
// réimplémenter la condition ailleurs.
function competenceEstValide(competence) {
  return !!(competence
    && competence.validee
    && competence.texte && competence.texte.trim().length > 0
    && Array.isArray(competence.preuve) && competence.preuve.length > 0);
}

// Point de passage unique du garde-fou (doc1 §12 règle 5) : voir
// competenceEstValide() ci-dessus, utilisée directement par
// decouverteRaffinement.js/decouverteMapping.js -- aucun utilitaire de
// filtrage supplémentaire n'est conservé ici tant qu'aucun appelant réel
// n'en a besoin (retiré lors de l'audit de branchement final : deux
// fonctions, regrouperCompetencesParCategorie et filtrerCompetencesValides,
// n'étaient en réalité jamais appelées nulle part dans le module).
