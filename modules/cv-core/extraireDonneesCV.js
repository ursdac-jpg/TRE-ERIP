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

  var competences = (typeof deduireCompetences === 'function') ? deduireCompetences() : [];
  // TACHE (retour utilisateur : "Compétences professionnelles" vide sur le
  // CV genere) : utilisait categorieCompetence[c] en direct -- la table
  // figee interne (~50 libelles) ne connait presque aucune competence
  // importee depuis un vrai CV, donc ce filtre les ecartait presque toutes
  // (categorieCompetence[c] === undefined, ni Savoir-faire ni Savoir-etre).
  // categorieReelleCompetence() (app.js) corrige deja ce point ailleurs
  // (Analyse de votre profil, score des metiers, texte transmis a l'IA) --
  // ce fichier n'avait pas ete mis a jour en meme temps, d'ou le decalage
  // observe entre "Analyse de votre profil" (correct) et le CV genere (vide).
  var savoirFaire = competences.filter(function (c) { return categorieReelleCompetence(c) === 'Savoir-faire' || categorieReelleCompetence(c) === undefined; });
  var savoirEtre = competences.filter(function (c) { return categorieReelleCompetence(c) === 'Savoir-etre'; });
  var savoirs = (typeof obtenirSavoirs === 'function') ? obtenirSavoirs() : [];

  return {
    identite: {
      civilite: id.civilite || null,
      nom: id.nom || '',
      prenom: id.prenom || '',
      telephone: id.telephone || '',
      email: id.email || '',
      adresse: id.adresse || '',
      codePostal: id.codePostal || '',
      ville: id.ville || ''
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
        missions: e.missions || '',
        // TACHE (extension schema, groupe A) : intitule de contrat propre a
        // CETTE experience passee (ex. "CDI", "Stage", "Alternance") --
        // distinct de dossier.contrat (types de contrat RECHERCHES,
        // deja existant, tableau global). Facultatif : chaine vide si non
        // renseigne, la rubrique disparait alors normalement cote template
        // (meme convention generique {{#if}} que tous les autres champs).
        contrat: e.contrat || ''
      };
    }),
    experiencesPersonnelles: (d.experiencesPerso || []).map(function (e) {
      return { intitule: e.intitule || '', detail: e.detail || '' };
    }),
    // TACHE (Tache 1 : formations en tableau) : dossier.formations est
    // desormais un veritable tableau (plusieurs formations possibles),
    // remplace l'ancien dossier.niveauFormation (valeur unique).
    formations: (d.formations || []).map(function (f) {
      // TACHE (extension schema, groupe A) : etablissement facultatif
      // (ecole/centre de formation) -- chaine vide si non renseigne.
      return { niveau: f.niveau || '', intitule: f.intitule || '', annee: f.annee || '', etablissement: f.etablissement || '' };
    }),
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
