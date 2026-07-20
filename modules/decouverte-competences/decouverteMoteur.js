/* ============================================================
   decouverteMoteur.js
   ------------------------------------------------------------
   Module « Découverte et valorisation des compétences ».
   Point d'entrée unique et orchestrateur pur.

   RÈGLE STRICTE (exigée explicitement) : ce fichier ne prend AUCUNE
   décision métier et ne duplique AUCUNE règle déjà présente dans les
   modules validés (decouverteAnalyse.js, decouverteRaffinement.js,
   decouverteStrategie.js, decouverteMapping.js). Il se contente de :
   - fournir le point d'entrée unique du parcours (demarrerDecouverteCompetences) ;
   - envelopper chaque appel aux modules déjà validés dans un try/catch
     centralisé, pour qu'une erreur inattendue n'importe où dans la
     chaîne ne casse jamais le parcours sans message clair ;
   - tracer chaque étape exécutée (analyse, raffinement, stratégie,
     mapping) dans un journal consultable, à des fins de débogage --
     jamais mélangé au journal de provenance des données lui-même
     (decouverteMapping.js), qui reste sous la responsabilité de ce
     fichier-là.

   decouverteParcours.js (l'interface) appelle exclusivement les
   fonctions ci-dessous plutôt que les modules cœur directement -- c'est
   ce qui centralise réellement la gestion des erreurs, pas une simple
   convention non vérifiable.
   ============================================================ */

var _decouverteJournalExecution = [];

function _decouverteTracerEtape(nomEtape, succes, details) {
  _decouverteJournalExecution.push({
    etape: nomEtape,
    succes: !!succes,
    details: details || null,
    horodatage: new Date().toISOString()
  });
}

// Consultable à des fins de débogage (ex. par un CIP qui rencontre un
// souci et souhaite comprendre à quelle étape ça a coincé) -- une copie,
// jamais la référence interne.
function obtenirJournalExecutionDecouverte() {
  return _decouverteJournalExecution.slice();
}

function _decouverteReinitialiserJournal() {
  _decouverteJournalExecution = [];
}

// TACHE (retour utilisateur : "gestion centralisée des erreurs") : un
// message d'erreur générique, unique, réutilisé par toutes les fonctions
// ci-dessous en cas d'exception inattendue -- jamais un message technique
// (nom de fonction, pile d'appel) montré à la personne, cohérent avec le
// ton du reste d'ERIP.
var DECOUVERTE_MESSAGE_ERREUR_INATTENDUE =
  'Une erreur inattendue est survenue. Réessayez, ou signalez ce problème si cela persiste.';

// ---- Étape : analyse initiale (encapsule decouverteAnalyse.js) ----
function executerAnalyseInitiale(texteColle) {
  try {
    var resultat = analyserReponseDecouverte(texteColle);
    _decouverteTracerEtape('analyse', resultat.succes, resultat.succes
      ? { nbFragments: resultat.valeurs.fragments.length, nbQuestionsCiblees: resultat.valeurs.questionsCiblees.length }
      : { erreur: resultat.erreur });
    return resultat;
  } catch (erreur) {
    _decouverteTracerEtape('analyse', false, { exception: String(erreur && erreur.message) });
    return { succes: false, erreur: DECOUVERTE_MESSAGE_ERREUR_INATTENDUE };
  }
}

// ---- Étape : un tour de raffinement (encapsule decouverteRaffinement.js) ----
// Combine le parsing de la réponse ET la transition d'état en un seul
// appel côté appelant -- decouverteParcours.js n'a jamais à orchestrer
// lui-même ces deux sous-étapes.
function executerRaffinement(etatFragment, texteColle) {
  try {
    var analyse = analyserReponseRaffinement(texteColle);
    if (!analyse.succes) {
      _decouverteTracerEtape('raffinement', false, { fragmentId: etatFragment.fragmentId, erreur: analyse.erreur });
      return analyse;
    }
    var transition = declencherRaffinement(etatFragment, analyse.valeurs);
    _decouverteTracerEtape('raffinement', transition.succes, {
      fragmentId: etatFragment.fragmentId,
      etat: transition.succes ? transition.etat : etatFragment.etat,
      erreur: transition.succes ? null : transition.erreur
    });
    return transition;
  } catch (erreur) {
    _decouverteTracerEtape('raffinement', false, { fragmentId: etatFragment && etatFragment.fragmentId, exception: String(erreur && erreur.message) });
    return { succes: false, erreur: DECOUVERTE_MESSAGE_ERREUR_INATTENDUE };
  }
}

// ---- Étape : validation d'un fragment (encapsule decouverteRaffinement.js) ----
function executerValidationFragment(etatFragment, choix) {
  try {
    var resultat = validerFragment(etatFragment, choix);
    _decouverteTracerEtape('validation-fragment', resultat.succes, {
      fragmentId: etatFragment.fragmentId,
      nbCompetencesValidees: resultat.succes ? resultat.competencesValidees.length : 0,
      erreur: resultat.succes ? null : resultat.erreur
    });
    return resultat;
  } catch (erreur) {
    _decouverteTracerEtape('validation-fragment', false, { fragmentId: etatFragment && etatFragment.fragmentId, exception: String(erreur && erreur.message) });
    return { succes: false, erreur: DECOUVERTE_MESSAGE_ERREUR_INATTENDUE };
  }
}

// ---- Étape : stratégie et orientation (encapsule decouverteStrategie.js) ----
function executerStrategie(competencesValidees, contexte) {
  try {
    var resultat = proposerStrategie(competencesValidees, contexte);
    _decouverteTracerEtape('strategie', true, {
      nbMetiersProposes: resultat.metiersProposes.length,
      aucunMetierPertinent: resultat.aucunMetierPertinent,
      typeCVRecommande: resultat.typeCVRecommande.type
    });
    return { succes: true, valeurs: resultat };
  } catch (erreur) {
    _decouverteTracerEtape('strategie', false, { exception: String(erreur && erreur.message) });
    return { succes: false, erreur: DECOUVERTE_MESSAGE_ERREUR_INATTENDUE };
  }
}

// ---- Étape : mapping vers le dossier (encapsule decouverteMapping.js) ----
// Ne fait pas non plus l'application au dossier lui-même dans cette
// fonction -- deux responsabilités bien distinctes (mapper, puis
// appliquer), même découpage que decouverteMapping.js.
function executerMapping(fragmentsValides, infosComplementairesParFragment) {
  try {
    var resultat = mapperFragmentsVersDossier(fragmentsValides, infosComplementairesParFragment);
    _decouverteTracerEtape('mapping', true, {
      nbExperiences: resultat.misesAJour.experiences.length,
      nbCompetences: resultat.misesAJour.competences.savoirFaire.length + resultat.misesAJour.competences.savoirEtre.length,
      nbEntreesJournalProvenance: resultat.journalProvenance.length
    });
    return { succes: true, valeurs: resultat };
  } catch (erreur) {
    _decouverteTracerEtape('mapping', false, { exception: String(erreur && erreur.message) });
    return { succes: false, erreur: DECOUVERTE_MESSAGE_ERREUR_INATTENDUE };
  }
}

// ---- Étape : application des données au dossier réel ----
function executerApplicationDossier(dossierCible, misesAJour) {
  try {
    appliquerMisesAJourDossier(dossierCible, misesAJour);
    _decouverteTracerEtape('application-dossier', true, { nbExperiencesTotal: dossierCible.experiences.length });
    return { succes: true };
  } catch (erreur) {
    _decouverteTracerEtape('application-dossier', false, { exception: String(erreur && erreur.message) });
    return { succes: false, erreur: DECOUVERTE_MESSAGE_ERREUR_INATTENDUE };
  }
}

// ---- Point d'entrée UNIQUE du module (appelé depuis la boîte à outils) ----
function demarrerDecouverteCompetences() {
  _decouverteReinitialiserJournal();
  _decouverteTracerEtape('demarrage', true);
  if (typeof ouvrirDecouverteCompetences !== 'function') {
    _decouverteTracerEtape('demarrage', false, { erreur: 'decouverteParcours.js absent ou non chargé.' });
    alert('Le module Découverte de compétences n’est pas disponible pour le moment.');
    return;
  }
  ouvrirDecouverteCompetences();
}
