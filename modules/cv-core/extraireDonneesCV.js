/* ============================================================
   modules/cv-core/extraireDonneesCV.js
   ------------------------------------------------------------
   Fonction UNIQUE et PARTAGEE d'extraction des donnees brutes du
   CV depuis "dossier" (etat global de l'application, declare dans
   js/app.js). "dossier" reste l'unique source de verite : cette
   fonction ne fait que le LIRE, jamais le modifier.

   Reutilisee par :
   - genererCSVCanva() (js/app.js) : export CSV pour Canva ;
   - normaliserDonneesCV() (modules/cv-core/normaliserDonneesCV.js) :
     objet CV standardise pour les futurs modules (editeur, templates,
     export PDF/DOCX...).

   Avant cette fonction, chaque consommateur relisait "dossier" a sa
   maniere : un seul endroit desormais, pour eviter deux logiques
   d'extraction paralleles a maintenir en cas d'evolution de "dossier".

   IMPORTANT (regle du projet) : AUCUNE mise en forme, AUCUNE
   concatenation de texte, AUCUNE decision de presentation ici --
   uniquement une lecture organisee et complete de "dossier". La mise
   en forme (ex. jointure de tableaux en texte pour un CSV, majuscules,
   troncature...) reste de la responsabilite de chaque consommateur.

   Depend, au moment de l'appel (pas au chargement du fichier), de
   quelques fonctions/variables globales declarees dans js/app.js
   (deduireCompetences, obtenirSavoirs, categorieCompetence) : comme
   cette fonction n'est jamais appelee avant une interaction de la
   personne (bouton export, ouverture de l'editeur...), l'ordre de
   chargement des <script> n'a pas d'impact.
   ============================================================ */

function extraireDonneesCV(dossierSource) {
  var d = dossierSource || {};
  var id = d.identite || {};
  var permis = d.permis || {};
  var niveauFormation = d.niveauFormation || null;

  var competences = (typeof deduireCompetences === 'function') ? deduireCompetences() : [];
  var savoirFaire = competences.filter(function (c) { return categorieCompetence[c] === 'Savoir-faire'; });
  var savoirEtre = competences.filter(function (c) { return categorieCompetence[c] === 'Savoir-etre'; });
  var savoirs = (typeof obtenirSavoirs === 'function') ? obtenirSavoirs() : [];

  return {
    identite: {
      civilite: id.civilite || null,
      nom: id.nom || '',
      prenom: id.prenom || '',
      telephone: id.telephone || '',
      email: id.email || '',
      adresse: id.adresse || '',
      ville: id.ville || '',
      age: id.age || ''
    },
    // Metier ou secteur cible, tel que choisi sur la page Potentiel.
    titreCV: d.metierCible || d.secteurCible || '',
    competences: {
      savoirFaire: savoirFaire.slice(),
      savoirEtre: savoirEtre.slice(),
      savoirs: savoirs.slice()
    },
    experiences: (d.experiences || []).map(function (e) {
      return {
        poste: e.poste || '',
        entreprise: e.entreprise || '',
        lieu: e.lieu || '',
        dateDebut: e.dateDebut || '',
        dateFin: e.dateFin || '',
        missions: e.missions || ''
      };
    }),
    experiencesPersonnelles: (d.experiencesPerso || []).map(function (e) {
      return { intitule: e.intitule || '', detail: e.detail || '' };
    }),
    // Un seul niveau de diplome existe aujourd'hui dans "dossier"
    // (dossier.niveauFormation) : null si aucun renseigne.
    formation: niveauFormation ? {
      niveau: niveauFormation.niveauVisible || '',
      intitule: niveauFormation.intitule || '',
      annee: niveauFormation.annee || ''
    } : null,
    certifications: (d.certifications || []).slice(),
    langues: (d.langues || []).map(function (l) { return { langue: l.langue, niveau: l.niveau }; }),
    permis: {
      possede: (permis.possede === true || permis.possede === false) ? permis.possede : null,
      categories: (permis.categories || []).slice(),
      vehicule: (permis.vehicule === true || permis.vehicule === false) ? permis.vehicule : null
    },
    contrat: (d.contrat || []).slice(),
    tempsTravail: (d.tempsTravail || []).slice(),
    loisirs: (d.loisirs || []).slice(),
    engagements: (d.engagements || []).slice(),
    // CV entier deja retape par l'IA et colle par la personne (page Action,
    // export Canva) -- PAS une simple accroche/profil, voir docs/SCHEMA_CV.md.
    texteAmelioreCanva: d.texteAmelioreCanva || ''
  };
}
