/* ============================================================
   decouverteAnalyse.js
   ------------------------------------------------------------
   Module « Découverte et valorisation des compétences ».
   Répond à : document 2 §1 à §5 (détection, classification,
   formulation) et au retrait du contexte personnel (doc2 §1, précision
   de la relecture finale).

   Point d'entrée SÉCURISÉ entre la réponse de l'assistant IA et le reste
   du module : aucun autre fichier ne doit relire ou réinterpréter le
   JSON brut de l'IA — tous reçoivent uniquement la structure déjà
   validée par ce fichier. Même discipline que analyserReponseIACV()
   (app.js) pour les autres prompts ERIP : ne jamais faire confiance à la
   réponse telle quelle, valider champ par champ, jamais d'exception non
   gérée qui remonterait jusqu'à l'interface.

   Réutilise extraireBlocJSONDepuisTexte() (app.js, déjà utilisée par les
   3 autres prompts ERIP) plutôt que de réimplémenter l'extraction JSON —
   même comportement de lecture pour la personne, quel que soit le prompt
   collé.
   ============================================================ */

var _decouverteCompteurIdFragment = 0;
function _decouverteGenererIdFragment() {
  _decouverteCompteurIdFragment += 1;
  return 'fragment-' + Date.now() + '-' + _decouverteCompteurIdFragment;
}

// Valeurs valides pour "origine" -- toute autre valeur (absente, mal
// orthographiée, inventée par l'IA) retombe sur DECOUVERTE_ORIGINES.AUTRE,
// jamais une exception, jamais un champ vide livré tel quel plus loin.
function _decouverteValiderOrigine(valeur) {
  var valeursValides = [
    DECOUVERTE_ORIGINES.PRO_DECLAREE, DECOUVERTE_ORIGINES.PRO_NON_DECLAREE,
    DECOUVERTE_ORIGINES.PERSONNELLE_FAMILIALE, DECOUVERTE_ORIGINES.BENEVOLE_ASSOCIATIVE,
    DECOUVERTE_ORIGINES.AUTRE
  ];
  return (typeof valeur === 'string' && valeursValides.indexOf(valeur) !== -1) ? valeur : DECOUVERTE_ORIGINES.AUTRE;
}

// Valeurs valides pour "categorie" -- repli sur APTITUDE (la catégorie la
// plus prudente, doc1 §7.2/doc2 §6) en cas de valeur inconnue ou absente :
// dans le doute, on sous-affirme plutôt que de sur-affirmer une
// compétence dont on ne sait même pas classer correctement la nature.
// TACHE (préparation decouverteRaffinement.js) : exposée sans underscore
// -- une réponse de raffinement (decouverteRaffinement.js) est une
// réponse IA comme une autre, elle doit passer par EXACTEMENT la même
// validation, jamais une copie de cette règle ailleurs.
function decouverteValiderCategorie(valeur) {
  var valeursValides = [
    DECOUVERTE_CATEGORIES.TECHNIQUE, DECOUVERTE_CATEGORIES.TRANSFERABLE,
    DECOUVERTE_CATEGORIES.SAVOIR_ETRE, DECOUVERTE_CATEGORIES.APTITUDE,
    DECOUVERTE_CATEGORIES.CENTRE_INTERET
  ];
  return (typeof valeur === 'string' && valeursValides.indexOf(valeur) !== -1) ? valeur : DECOUVERTE_CATEGORIES.APTITUDE;
}

// Valide une compétence proposée par l'IA pour un fragment. Retourne
// null (jamais une exception) si la compétence est inexploitable --
// notamment SANS PREUVE, garde-fou direct de doc1 §7.3/§12 règle 5,
// appliqué ici au plus tôt : une compétence sans preuve n'est jamais
// même présentée à la validation de la personne.
// TACHE (préparation decouverteRaffinement.js) : exposée sans underscore,
// même raison que decouverteValiderCategorie() ci-dessus.
function decouverteValiderCompetenceProposee(competenceBrute) {
  if (!competenceBrute || typeof competenceBrute !== 'object') { return null; }

  var texte = (typeof competenceBrute.texte === 'string') ? competenceBrute.texte.trim() : '';
  if (!texte) { return null; }

  var preuveBrute = Array.isArray(competenceBrute.preuve) ? competenceBrute.preuve : [];
  var preuve = preuveBrute
    .filter(function (p) { return typeof p === 'string' && p.trim().length > 0; })
    .map(function (p) { return p.trim(); });
  if (!preuve.length) { return null; }

  return {
    texte: texte,
    categorie: decouverteValiderCategorie(competenceBrute.categorie),
    preuve: preuve
  };
}

// Valide un fragment complet. Retourne null si le fragment n'a pas de
// texte source exploitable (rien à faire d'un fragment fantôme) --
// mais un fragment SANS propositions ou SANS compétence n'est jamais
// rejeté pour autant : il reste affichable (la personne pourra toujours
// déclencher un raffinement, doc1 §3.2), avec des tableaux vides plutôt
// qu'une exception.
function _decouverteValiderFragment(fragmentBrut) {
  if (!fragmentBrut || typeof fragmentBrut !== 'object') { return null; }

  var texteBrut = (typeof fragmentBrut.texteBrut === 'string') ? fragmentBrut.texteBrut.trim() : '';
  if (!texteBrut) { return null; }

  var propositionsBrutes = Array.isArray(fragmentBrut.propositions) ? fragmentBrut.propositions : [];
  var propositions = propositionsBrutes
    .filter(function (p) { return typeof p === 'string' && p.trim().length > 0; })
    .map(function (p) { return p.trim(); });

  // TACHE (retour utilisateur : "je veux que les loisirs soient cités tel
  // que dans un cv classique... en revanche avec ces informations nourrir
  // un bloc compétences personnelles") : elementsFactuels distingue le
  // loisir factuel ("football", "randonnée") de sa reformulation
  // professionnelle (propositions, ci-dessus, inchangée) -- même
  // validation qu'une liste de textes, tableau vide si absent (fragments
  // non-loisirs, ou anciennes réponses IA antérieures à ce champ).
  var elementsFactuelsBruts = Array.isArray(fragmentBrut.elementsFactuels) ? fragmentBrut.elementsFactuels : [];
  var elementsFactuels = elementsFactuelsBruts
    .filter(function (e) { return typeof e === 'string' && e.trim().length > 0; })
    .map(function (e) { return e.trim(); });

  var competencesBrutes = Array.isArray(fragmentBrut.competencesProposees) ? fragmentBrut.competencesProposees : [];
  var competencesProposees = competencesBrutes
    .map(decouverteValiderCompetenceProposee)
    .filter(Boolean);

  return {
    id: (typeof fragmentBrut.id === 'string' && fragmentBrut.id.trim()) || _decouverteGenererIdFragment(),
    texteBrut: texteBrut,
    origine: _decouverteValiderOrigine(fragmentBrut.origine),
    propositions: propositions,
    elementsFactuels: elementsFactuels,
    competencesProposees: competencesProposees
  };
}

// Point d'entrée unique de ce fichier. Structure attendue :
// {
//   "fragments": [
//     { "texteBrut": "...", "origine": "...", "propositions": ["...", ...],
//       "competencesProposees": [ { "texte": "...", "categorie": "...", "preuve": ["...", ...] } ] }
//   ],
//   "questionsCiblees": ["...", ...]   // 0 à 3
// }
//
// Retourne TOUJOURS { succes, valeurs } ou { succes: false, erreur } --
// jamais d'exception, jamais de champ manquant livré tel quel au reste
// du module. Les structures produites (fragments, competencesProposees)
// sont déjà dans la forme attendue par decouverteClassification.js :
// aucune conversion intermédiaire n'est nécessaire ailleurs.
function analyserReponseDecouverte(texteColle) {
  if (!(texteColle || '').trim()) {
    return { succes: false, erreur: 'Aucun texte à analyser. Collez la réponse de l\'assistant IA avant de continuer.' };
  }

  var objetBrut = extraireBlocJSONDepuisTexte(texteColle);
  if (!objetBrut || typeof objetBrut !== 'object') {
    return {
      succes: false,
      erreur: 'Le texte collé ne semble pas être un JSON valide. Vérifiez que vous avez bien copié ' +
        'l\'intégralité de la réponse de l\'IA, sans texte ajouté avant ou après.'
    };
  }

  var fragmentsBruts = Array.isArray(objetBrut.fragments) ? objetBrut.fragments : [];
  var fragments = fragmentsBruts.map(_decouverteValiderFragment).filter(Boolean);

  if (!fragments.length) {
    return {
      succes: false,
      erreur: 'Le JSON a été lu, mais ne contient aucun fragment exploitable. Vérifiez le contenu collé.'
    };
  }

  var questionsBrutes = Array.isArray(objetBrut.questionsCiblees) ? objetBrut.questionsCiblees : [];
  // TACHE (doc1 §4 étape 7, doc2 §8) : jamais plus de 3 questions, même si
  // l'IA en propose davantage par erreur -- le plafond est imposé ICI,
  // point de passage unique, on ne fait pas confiance à l'IA pour le
  // respecter d'elle-même.
  // TACHE (retour utilisateur : "j'adore cette idée, je veux en avoir 5 en
  // tout au lieu de 3") : plafond augmenté explicitement à la demande de
  // l'utilisateur -- décision consciente de changer un chiffre déjà
  // documenté dans les documents de conception gelés (doc1 §4 étape 7,
  // doc2 §8), pas un oubli. Les documents devront être mis à jour en
  // conséquence pour rester fidèles au code.
  var questionsCiblees = questionsBrutes
    .filter(function (q) { return typeof q === 'string' && q.trim().length > 0; })
    .map(function (q) { return q.trim(); })
    .slice(0, 5);

  // TACHE (retour utilisateur : "je veux qu'une question sur les dates/la
  // période soit impérative, cette information mérite de figurer dans le
  // CV") : ne jamais dépendre du seul jugement de l'IA pour ça -- vérifié
  // ici, en code, systématiquement. Si aucune des questions proposées ne
  // porte déjà sur une période/des dates, ET qu'au moins un fragment
  // professionnel existe, une question de repli est ajoutée EN PRIORITÉ
  // (avant les autres), quitte à retirer la dernière question de l'IA
  // pour respecter le plafond de 5.
  var aUneExperiencePro = fragments.some(function (f) {
    return f.origine === 'proDeclaree' || f.origine === 'proNonDeclaree';
  });
  // TACHE (retour utilisateur : "je n'ai pas eu la question sur les
  // années pratiquées, pourtant une question mentionnait 'toute
  // l'année'") : bug réel trouvé -- la détection cherchait juste les
  // mots "période"/"année"/"date"/"quand" n'importe où dans la question,
  // ce qui matchait à tort une question sur la présence à temps plein
  // ("étiez-vous présent toute l'année"), qui ne demande PAS une plage de
  // dates. Motifs resserrés : seules des formulations qui demandent
  // explicitement UNE PLAGE ou UN MOMENT precis comptent désormais comme
  // "déjà couvert" -- dans le doute, la question de repli est ajoutée
  // plutôt qu'omise (cohérent avec le caractère impératif demandé).
  var motifsDateExplicite = [
    'quelle période', 'quelles périodes', 'quelle(s) période', 'quelle année', 'quelles années',
    'quelle(s) année', 'quelle date', 'quelles dates', 'quelle(s) date', 'de quelle année',
    'à quelle année', 'de quand', 'à quand', 'quand avez-vous', 'combien de temps', 'combien d’années',
    'combien d\'années'
  ];
  var aDejaUneQuestionDate = questionsCiblees.some(function (q) {
    var qn = q.toLowerCase();
    return motifsDateExplicite.some(function (motif) { return qn.indexOf(motif) !== -1; });
  });
  if (aUneExperiencePro && !aDejaUneQuestionDate) {
    questionsCiblees.unshift('Pendant quelle(s) période(s) (années, même approximatives) avez-vous exercé cette activité ?');
    questionsCiblees = questionsCiblees.slice(0, 5);
  }

  return { succes: true, valeurs: { fragments: fragments, questionsCiblees: questionsCiblees } };
}
