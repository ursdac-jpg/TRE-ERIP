/* ============================================================
   data/dictionnaireLexicalERIP.js
   ------------------------------------------------------------
   ETAPE A (evolution du moteur de recherche, architecture validee) :
   dictionnaire lexical de la Base de connaissances ERIP.

   Objectif : permettre progressivement de reconnaitre une formulation
   courante ou familiere de l'utilisateur et de la ramener vers le terme
   effectivement utilise dans les referentiels ERIP, AVANT toute recherche.

   Ce fichier ne fait pour l'instant QUE ca : il ne recherche rien, ne
   score rien, ne remplace aucune fonctionnalite existante. Il n'est
   branche sur aucun ecran a ce stade (etape suivante : B).

   Format : { "terme tel que l'utilisateur pourrait l'ecrire" : "terme
   correspondant dans les referentiels ERIP" }.
   - Cles et valeurs en minuscules, sans accent (normaliserAvecSynonymes
     s'occupe de normaliser la saisie avant comparaison, donc les entrees
     doivent etre ecrites deja normalisees ici).
   - Volontairement PEU REMPLI au depart : conformement au principe
     "je prefere une donnee absente qu'une donnee erronee", ce dictionnaire
     doit s'enrichir progressivement a partir des recherches reelles des
     utilisateurs qui n'aboutissent a rien, plutot que d'etre rempli a
     priori de facon exhaustive et potentiellement approximative.
   ============================================================ */

var DICTIONNAIRE_LEXICAL_ERIP = {
  'dehors': 'exterieur',
  'bosser': 'travailler',
  'equipement': 'materiel',
  'outillage': 'outils'
};

// Applique le dictionnaire lexical a un texte : chaque mot reconnu comme
// variante est remplace par le terme correspondant dans les referentiels
// ERIP. Le texte est d'abord normalise (minuscules, sans accents) via
// normaliserTexte (metiers.js, deja existante, non dupliquee ici).
// Les mots non reconnus sont conserves tels quels.
function normaliserAvecSynonymes(texte) {
  var normalise = normaliserTexte(String(texte || ''));
  if (!normalise) { return ''; }
  return normalise
    .split(/\s+/)
    .map(function (mot) { return DICTIONNAIRE_LEXICAL_ERIP[mot] || mot; })
    .join(' ');
}
