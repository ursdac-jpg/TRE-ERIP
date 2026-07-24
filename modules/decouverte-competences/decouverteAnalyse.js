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
function _decouverteValiderFragment(fragmentBrut, indexOriginal) {
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
    // TACHE (chantier "exp perso", Phase 1/3 : relier une question ciblée
    // à SON fragment) : conserve la position d'origine dans le tableau
    // "fragments" tel que renvoyé par l'IA -- c'est cet indice que
    // "fragmentIndex" (sur chaque question ciblée, decouverte-competences.md)
    // référence. "id" (ci-dessus) reste un identifiant technique
    // indépendant, généré une fois pour toutes ; "indexOriginal" est ce
    // qui permet de retrouver CE fragment précis à partir du JSON de
    // l'IA, transporté ensuite par initialiserEtatFragment()
    // (decouverteRaffinement.js) jusqu'au mapping final.
    indexOriginal: indexOriginal,
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
//   "questionsCiblees": [ { "texte": "...", "fragmentIndex": 0, "type": "date" }, ... ]   // 5 à 10
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
  var fragments = fragmentsBruts.map(function (f, i) { return _decouverteValiderFragment(f, i); }).filter(Boolean);

  if (!fragments.length) {
    return {
      succes: false,
      erreur: 'Le JSON a été lu, mais ne contient aucun fragment exploitable. Vérifiez le contenu collé.'
    };
  }

  // TACHE (chantier "exp perso", Phase 1) : questionsCiblees est
  // désormais un tableau d'OBJETS {texte, fragmentIndex, type}
  // (decouverte-competences.md) -- plus de simples chaînes. Validé champ
  // par champ, même discipline que le reste de ce fichier (jamais de
  // confiance aveugle) : "texte" doit être une chaîne non vide,
  // "fragmentIndex" doit désigner un fragment RÉELLEMENT validé
  // ci-dessus (sinon ramené à null -- une référence vers un fragment
  // inexistant ne doit jamais silencieusement pointer ailleurs),
  // "type" vaut "date" ou "texte" (repli sur "texte" si absent/invalide).
  // Accepte encore une simple chaîne (ancien format, ou IA qui n'aurait
  // pas suivi la nouvelle consigne) -- jamais un plantage, jamais un
  // format perdu silencieusement.
  var indexOriginauxValides = fragments.map(function (f) { return f.indexOriginal; });
  var questionsBrutes = Array.isArray(objetBrut.questionsCiblees) ? objetBrut.questionsCiblees : [];
  var questionsCiblees = questionsBrutes
    .map(function (q) {
      if (typeof q === 'string') {
        var texteBrutQ = q.trim();
        return texteBrutQ ? { texte: texteBrutQ, fragmentIndex: null, type: 'texte' } : null;
      }
      if (!q || typeof q !== 'object') { return null; }
      var texte = (typeof q.texte === 'string') ? q.texte.trim() : '';
      if (!texte) { return null; }
      var fragmentIndex = (typeof q.fragmentIndex === 'number' && indexOriginauxValides.indexOf(q.fragmentIndex) !== -1)
        ? q.fragmentIndex : null;
      // TACHE (retour utilisateur : "j'ai répondu oui à la question
      // formation/engagements, mais rien n'apparaît sur le CV") : 2
      // nouveaux types reconnus, en plus de "date" -- "formation" et
      // "engagement" (conditions 5 et 6, decouverte-competences.md) --
      // permettent de router la réponse directement vers
      // dossier.formations/engagements (finaliserEtNaviguerVersResultats,
      // decouverteParcours.js), plutôt que de la laisser seulement partir
      // en contexte non structuré vers l'IA. Repli sur "texte" pour toute
      // valeur inconnue ou absente, jamais un plantage.
      var TYPES_QUESTION_VALIDES = ['date', 'formation', 'engagement', 'texte'];
      var type = (TYPES_QUESTION_VALIDES.indexOf(q.type) !== -1) ? q.type : 'texte';
      return { texte: texte, fragmentIndex: fragmentIndex, type: type };
    })
    .filter(Boolean)
    // TACHE (retour utilisateur : "j'adore cette idée, je veux en avoir 5
    // en tout au lieu de 3"), puis (retour utilisateur : "je ne veux pas
    // seulement 5 mais entre 5 et 10, jamais moins") : plafond relevé de
    // 5 à 10 -- décision consciente, cohérente avec decouverte-competences.md
    // (qui demandait "5 à 10" sans que ce plafond en dur ne le permette
    // jusqu'ici, bug réel trouvé lors de ce chantier).
    .slice(0, 10);

  // TACHE (retour utilisateur : "je veux qu'une question sur les dates/la
  // période soit impérative, cette information mérite de figurer dans le
  // CV") : ne jamais dépendre du seul jugement de l'IA pour ça -- vérifié
  // ici, en code, systématiquement. Si aucune des questions proposées ne
  // porte déjà sur une période/des dates, ET qu'au moins un fragment
  // professionnel existe, une question de repli est ajoutée EN PRIORITÉ
  // (avant les autres), quitte à retirer la dernière question de l'IA
  // pour respecter le plafond.
  // TACHE (chantier "exp perso") : la détection repose désormais sur
  // q.type === 'date' (fiable, l'IA l'indique explicitement) -- l'ancien
  // repérage par mots-clés dans le texte de la question n'est plus
  // nécessaire (il restait fragile, voir historique des bugs déjà
  // rencontrés sur cette détection).
  var premierFragmentPro = fragments.filter(function (f) {
    return f.origine === 'proDeclaree' || f.origine === 'proNonDeclaree';
  })[0];
  var aDejaUneQuestionDate = questionsCiblees.some(function (q) { return q.type === 'date'; });
  if (premierFragmentPro && !aDejaUneQuestionDate) {
    questionsCiblees.unshift({
      texte: 'Pendant quelle(s) période(s) (années, même approximatives) avez-vous exercé cette activité ?',
      fragmentIndex: premierFragmentPro.indexOriginal,
      type: 'date'
    });
    questionsCiblees = questionsCiblees.slice(0, 10);
  }

  // TACHE (retour utilisateur : "ce message ne passe pas sur tous les
  // IA" -- le récit brut original, avec son contexte personnel sensible
  // intact, partait tel quel vers cv.md/lettre.md/entretien.md via
  // dossier.informationsNonClassees, decouverteParcours.js) : reciteNettoye
  // est une simple chaîne de texte, validée comme n'importe quel champ
  // texte de ce fichier -- chaîne vide si absente/invalide, jamais un
  // plantage. Le retrait effectif du contexte personnel est la
  // responsabilité de l'IA (decouverte-competences.md), jamais reconstruit
  // ici par mots-clés (même principe que le reste de ce fichier : valider
  // la forme, jamais réinterpréter le fond).
  var reciteNettoye = (typeof objetBrut.reciteNettoye === 'string') ? objetBrut.reciteNettoye.trim() : '';

  return { succes: true, valeurs: { fragments: fragments, questionsCiblees: questionsCiblees, reciteNettoye: reciteNettoye } };
}
