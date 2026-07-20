/* ============================================================
   decouverteRaffinement.js
   ------------------------------------------------------------
   Module « Découverte et valorisation des compétences ».
   Répond à : document 1 §3.2 (mécanisme de repli) et document 2 §4.1
   (raffinement itératif borné à deux tours).

   Conçu comme une véritable MACHINE À ÉTATS, pas une succession de
   fonctions : chaque fragment porte un état explicite, et AUCUN autre
   fichier du module n'a besoin de deviner où en est un fragment, ni de
   recompter lui-même le nombre de tours déjà effectués. Toutes les
   transitions passent par ce fichier — c'est le seul endroit qui décide
   si une transition est légale, ce qui rend structurellement impossible
   de dépasser le plafond de deux tours ou de revenir à un état
   antérieur, quel que soit ce que ferait un appelant maladroit.

   Réutilise decouverteValiderCategorie()/decouverteValiderCompetenceProposee()
   (decouverteAnalyse.js) pour parser une réponse de raffinement : une
   réponse de raffinement est une réponse IA comme une autre, elle
   applique exactement les mêmes règles de validation, jamais une copie.
   Réutilise construireCompetence()/competenceEstValide()
   (decouverteClassification.js) pour produire la forme finale.
   ============================================================ */

// Les 5 états possibles d'un fragment (demandés explicitement). Un
// fragment progresse toujours dans cet ordre, jamais en arrière, jamais
// en sautant un état intermédiaire vers un raffinement plus avancé.
var DECOUVERTE_ETATS_FRAGMENT = {
  PROPOSITION_INITIALE: 'propositionInitiale',
  PREMIER_RAFFINEMENT: 'premierRaffinement',
  DEUXIEME_RAFFINEMENT: 'deuxiemeRaffinement',
  REPLI_MOTS_PERSONNE: 'repliMotsPersonne',
  VALIDE: 'valide'
};

// TACHE (exigence explicite : "centraliser toutes les transitions, rendre
// impossible de dépasser 2 tours ou de revenir en arrière") : ce graphe
// est la SEULE source de vérité sur les transitions légales. Aucune
// fonction de ce fichier ne modifie etatFragment.etat sans passer par
// _transitionner(), qui consulte exclusivement ce graphe.
// TACHE (retour utilisateur : "je préfère un récapitulatif, cliquable
// pour modifier -- en cliquant je me retrouve dans l'expérience à
// modifier") : "valide" n'était jusqu'ici jamais quittable, par choix
// délibéré ("aucune transition possible depuis valide"). Cette nouvelle
// transition est la SEULE exception, ajoutée explicitement au graphe (pas
// un contournement) -- elle reste tracée, contrôlée, et n'autorise qu'un
// retour vers "propositionInitiale", jamais un raccourci vers un autre
// état.
var _DECOUVERTE_TRANSITIONS_AUTORISEES = {
  propositionInitiale: [DECOUVERTE_ETATS_FRAGMENT.PREMIER_RAFFINEMENT, DECOUVERTE_ETATS_FRAGMENT.VALIDE],
  premierRaffinement: [DECOUVERTE_ETATS_FRAGMENT.DEUXIEME_RAFFINEMENT, DECOUVERTE_ETATS_FRAGMENT.VALIDE],
  deuxiemeRaffinement: [DECOUVERTE_ETATS_FRAGMENT.REPLI_MOTS_PERSONNE, DECOUVERTE_ETATS_FRAGMENT.VALIDE],
  repliMotsPersonne: [DECOUVERTE_ETATS_FRAGMENT.VALIDE],
  valide: [DECOUVERTE_ETATS_FRAGMENT.PROPOSITION_INITIALE]
};

function _decouverteTransitionner(etatFragment, nouvelEtat) {
  var autorises = _DECOUVERTE_TRANSITIONS_AUTORISEES[etatFragment.etat] || [];
  if (autorises.indexOf(nouvelEtat) === -1) {
    return { succes: false, erreur: 'Transition non autorisée : "' + etatFragment.etat + '" → "' + nouvelEtat + '".' };
  }
  etatFragment.etat = nouvelEtat;
  return { succes: true };
}

// Construit l'état initial d'un fragment, à partir d'un fragment déjà
// validé par decouverteAnalyse.js (jamais un fragment brut non contrôlé).
function initialiserEtatFragment(fragment) {
  return {
    fragmentId: fragment.id,
    etat: DECOUVERTE_ETATS_FRAGMENT.PROPOSITION_INITIALE,
    toursEffectues: 0,
    origine: fragment.origine,
    texteOriginal: fragment.texteBrut,
    propositionsActuelles: fragment.propositions.slice(),
    competencesActuelles: fragment.competencesProposees.slice(),
    // TACHE (retour utilisateur : loisirs factuels vs compétences
    // personnelles) : transporté tel quel jusqu'au mapping final -- ne
    // change jamais pendant le raffinement (contrairement à
    // propositionsActuelles/competencesActuelles), un loisir factuel ne
    // se "raffine" pas de la même façon qu'une formulation professionnelle.
    elementsFactuels: fragment.elementsFactuels || [],
    // Rempli uniquement une fois l'état "valide" atteint (voir validerFragment).
    texteRetenu: null,
    competencesValidees: null
  };
}

// Un fragment peut-il encore être raffiné ? Évite à decouverteParcours.js
// de recompter toursEffectues lui-même pour savoir s'il doit proposer le
// bouton "Aucune ne correspond" ou directement le repli.
function raffinementEncorePossible(etatFragment) {
  return etatFragment.etat === DECOUVERTE_ETATS_FRAGMENT.PROPOSITION_INITIALE
    || etatFragment.etat === DECOUVERTE_ETATS_FRAGMENT.PREMIER_RAFFINEMENT;
}

function fragmentEstValide(etatFragment) {
  return etatFragment.etat === DECOUVERTE_ETATS_FRAGMENT.VALIDE;
}

// Parse la réponse IA d'un tour de raffinement -- même discipline que
// decouverteAnalyse.js (jamais de confiance aveugle), réutilise les mêmes
// validateurs plutôt que de les dupliquer.
function analyserReponseRaffinement(texteColle) {
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

  var propositionsBrutes = Array.isArray(objetBrut.propositions) ? objetBrut.propositions : [];
  var propositions = propositionsBrutes
    .filter(function (p) { return typeof p === 'string' && p.trim().length > 0; })
    .map(function (p) { return p.trim(); });

  var competencesBrutes = Array.isArray(objetBrut.competencesProposees) ? objetBrut.competencesProposees : [];
  var competencesProposees = competencesBrutes.map(decouverteValiderCompetenceProposee).filter(Boolean);

  if (!propositions.length && !competencesProposees.length) {
    return {
      succes: false,
      erreur: 'Le JSON a été lu, mais ne contient aucune nouvelle proposition exploitable. Vérifiez le contenu collé.'
    };
  }

  return { succes: true, valeurs: { propositions: propositions, competencesProposees: competencesProposees } };
}

// Déclenche un tour de raffinement -- SEULE porte d'entrée vers
// "premierRaffinement"/"deuxiemeRaffinement". Le plafond de 2 tours est
// STRUCTUREL : depuis "deuxiemeRaffinement", cette fonction refuse
// systématiquement (voir le graphe de transitions), quel que soit
// l'appelant -- seul declencherRepli() reste possible depuis cet état.
function declencherRaffinement(etatFragment, reponseValidee) {
  var etatActuel = etatFragment.etat;
  var etatSuivant;
  if (etatActuel === DECOUVERTE_ETATS_FRAGMENT.PROPOSITION_INITIALE) {
    etatSuivant = DECOUVERTE_ETATS_FRAGMENT.PREMIER_RAFFINEMENT;
  } else if (etatActuel === DECOUVERTE_ETATS_FRAGMENT.PREMIER_RAFFINEMENT) {
    etatSuivant = DECOUVERTE_ETATS_FRAGMENT.DEUXIEME_RAFFINEMENT;
  } else {
    return {
      succes: false,
      erreur: etatActuel === DECOUVERTE_ETATS_FRAGMENT.DEUXIEME_RAFFINEMENT
        ? 'Plafond de raffinement déjà atteint (2 tours maximum) — utilisez declencherRepli().'
        : 'Impossible de déclencher un raffinement depuis l\'état "' + etatActuel + '".'
    };
  }

  var resultat = _decouverteTransitionner(etatFragment, etatSuivant);
  if (!resultat.succes) { return resultat; }

  etatFragment.toursEffectues += 1;
  etatFragment.propositionsActuelles = (reponseValidee && reponseValidee.propositions) ? reponseValidee.propositions.slice() : [];
  etatFragment.competencesActuelles = (reponseValidee && reponseValidee.competencesProposees) ? reponseValidee.competencesProposees.slice() : [];
  return { succes: true, etat: etatFragment.etat };
}

// Déclenche le repli sur les mots de la personne (doc1 §3.2) -- possible
// UNIQUEMENT depuis "deuxiemeRaffinement" (le graphe de transitions
// l'impose), jamais avant, jamais en substitut à un raffinement encore
// disponible.
function declencherRepli(etatFragment) {
  if (etatFragment.etat !== DECOUVERTE_ETATS_FRAGMENT.DEUXIEME_RAFFINEMENT) {
    return {
      succes: false,
      erreur: 'Le repli n\'est possible qu\'après le 2e tour de raffinement (état actuel : "' + etatFragment.etat + '").'
    };
  }
  var resultat = _decouverteTransitionner(etatFragment, DECOUVERTE_ETATS_FRAGMENT.REPLI_MOTS_PERSONNE);
  if (!resultat.succes) { return resultat; }

  // TACHE (doc1 §3.2) : en repli, la seule "proposition" possible est le
  // texte brut d'origine -- jamais une reformulation professionnelle
  // exigée de la personne.
  etatFragment.propositionsActuelles = [etatFragment.texteOriginal];
  return { succes: true, etat: etatFragment.etat };
}

// TACHE (retour utilisateur : "Modifier" depuis un récapitulatif) : seule
// façon de quitter l'état "valide" -- remet le fragment à son point de
// départ (propositions et compétences déjà connues, pas besoin de les
// redemander à l'IA), avec un compteur de raffinement remis à zéro (un
// vrai nouveau départ pour ce fragment, pas la poursuite d'un compte déjà
// entamé avant).
function reouvrirFragment(etatFragment) {
  if (etatFragment.etat !== DECOUVERTE_ETATS_FRAGMENT.VALIDE) {
    return { succes: false, erreur: 'Seul un fragment déjà validé peut être rouvert (état actuel : "' + etatFragment.etat + '").' };
  }
  var resultat = _decouverteTransitionner(etatFragment, DECOUVERTE_ETATS_FRAGMENT.PROPOSITION_INITIALE);
  if (!resultat.succes) { return resultat; }
  etatFragment.toursEffectues = 0;
  etatFragment.texteRetenu = null;
  etatFragment.competencesValidees = null;
  return { succes: true, etat: etatFragment.etat };
}

// Valide DÉFINITIVEMENT un fragment -- seule façon d'atteindre l'état
// "valide", depuis n'importe quel état non-terminal (le graphe de
// transitions l'autorise partout sauf depuis "valide" lui-même, qui ne
// peut jamais être validé deux fois).
//
// choix = { texteChoisi: '...', competencesRetenues: [ {texte, categorie,
// preuve}, ... ] } -- en repli, texteChoisi peut être omis, le texte
// original est alors utilisé automatiquement (doc1 §3.2).
function validerFragment(etatFragment, choix) {
  var autorises = _DECOUVERTE_TRANSITIONS_AUTORISEES[etatFragment.etat] || [];
  if (autorises.indexOf(DECOUVERTE_ETATS_FRAGMENT.VALIDE) === -1) {
    return {
      succes: false,
      erreur: etatFragment.etat === DECOUVERTE_ETATS_FRAGMENT.VALIDE
        ? 'Ce fragment est déjà validé.'
        : 'Impossible de valider depuis l\'état "' + etatFragment.etat + '".'
    };
  }

  var estRepli = etatFragment.etat === DECOUVERTE_ETATS_FRAGMENT.REPLI_MOTS_PERSONNE;
  var texteChoisi = (choix && typeof choix.texteChoisi === 'string') ? choix.texteChoisi.trim() : '';
  if (!texteChoisi && estRepli) { texteChoisi = etatFragment.texteOriginal; }
  if (!texteChoisi) {
    return { succes: false, erreur: 'Aucun texte retenu pour valider ce fragment.' };
  }

  var competencesBrutes = (choix && Array.isArray(choix.competencesRetenues))
    ? choix.competencesRetenues
    : etatFragment.competencesActuelles;
  var competencesValidees = competencesBrutes
    .map(function (c) {
      return construireCompetence({
        texte: c.texte, categorie: c.categorie, preuve: c.preuve,
        origine: etatFragment.origine,
        texteOriginalConserve: estRepli,
        validee: true
      });
    })
    .filter(competenceEstValide);

  var resultat = _decouverteTransitionner(etatFragment, DECOUVERTE_ETATS_FRAGMENT.VALIDE);
  if (!resultat.succes) { return resultat; }

  etatFragment.texteRetenu = texteChoisi;
  etatFragment.competencesValidees = competencesValidees;
  return { succes: true, etat: etatFragment.etat, texteRetenu: texteChoisi, competencesValidees: competencesValidees };
}
