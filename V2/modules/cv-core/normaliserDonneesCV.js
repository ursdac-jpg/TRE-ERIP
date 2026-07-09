/* ============================================================
   modules/cv-core/normaliserDonneesCV.js
   ------------------------------------------------------------
   normaliserDonneesCV(dossier) : transforme "dossier" (etat global de
   l'application, js/app.js) en un objet CV standardise, independant
   de tout rendu.

   "dossier" reste l'unique source de verite : cette fonction ne le
   modifie jamais, elle en derive une structure normalisee.

   Reutilise extraireDonneesCV(dossier) (modules/cv-core/extraireDonneesCV.js)
   comme source commune, partagee avec genererCSVCanva() (js/app.js) --
   une seule lecture de "dossier", jamais deux logiques d'extraction
   paralleles a maintenir.

   Cet objet CV est le "contrat" partage par tous les futurs modules lies
   au CV (editeur, templates, export PDF/DOCX...). Voir docs/SCHEMA_CV.md
   pour la description complete de chaque propriete, son type, son role
   et un exemple.

   IMPORTANT (regle du projet) : AUCUNE logique de presentation ici
   (pas de majuscules, pas de troncature, pas de concatenation de texte
   pour l'affichage...) -- uniquement des donnees propres et completes.
   La mise en forme est entierement du ressort des futurs templates.
   ============================================================ */

function normaliserDonneesCV(dossierSource) {
  var brut = extraireDonneesCV(dossierSource);

  return {
    meta: {
      version: 1,
      dateGeneration: new Date().toISOString(),
      modele: null
    },
    identite: brut.identite,
    // TACHE (emplacement photo, infrastructure de rendu) : reserve
    // uniquement la place dans le schema. Aucune logique d'upload ni
    // d'affichage conditionnel ici -- ce sera une tache independante,
    // ulterieure. "dossier" ne contient aujourd'hui aucune donnee photo.
    photo: {
      url: null
    },
    objectifProfessionnel: brut.titreCV,
    // TACHE (demande) : deux champs distincts plutot qu'un seul "profil" --
    // profilUtilisateur permet a la personne de personnaliser son accroche
    // sans jamais perdre la proposition de l'IA.
    // TACHE (V2 IA, etape 1 : lien assistant IA -> moteur de rendu) :
    // profilIA est desormais alimente par dossier.ia.cv.profil (voir
    // docs/ARCHITECTURE_V2_IA.md), jamais par dossier.texteAmelioreCanva
    // (qui contient un CV entier, pas une accroche : detourner ce champ
    // creerait une confusion semantique durable). Lecture defensive :
    // dossier.ia reste TOUJOURS optionnel, son absence ne doit jamais faire
    // echouer la normalisation.
    profil: {
      profilIA: (dossierSource.ia && dossierSource.ia.cv && dossierSource.ia.cv.profil) || '',
      profilUtilisateur: ''
    },
    // TACHE (V2 IA, etape 1) : exposes des maintenant dans l'objet CV
    // standardise (rien ne les affiche encore dans les templates existants
    // -- une future tache pourra les y ajouter -- mais le lien de bout en
    // bout dossier.ia -> objet CV est ainsi deja complet et verifiable).
    pointsForts: (dossierSource.ia && dossierSource.ia.cv && dossierSource.ia.cv.pointsForts) || [],
    motsCles: (dossierSource.ia && dossierSource.ia.cv && dossierSource.ia.cv.motsCles) || [],
    competences: brut.competences,
    experiences: brut.experiences,
    experiencesPersonnelles: brut.experiencesPersonnelles,
    // TACHE (Tache 1 : formations en tableau) : "dossier" stocke desormais
    // un veritable tableau de formations (dossier.formations), plus besoin
    // d'envelopper artificiellement une valeur unique.
    formations: brut.formations,
    certifications: brut.certifications,
    langues: brut.langues,
    permis: brut.permis,
    loisirs: brut.loisirs,
    engagements: brut.engagements
  };
}
