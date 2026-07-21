/* ============================================================
   modules/lettre-core/normaliserDonneesLettre.js
   ------------------------------------------------------------
   normaliserDonneesLettre(dossier) : transforme "dossier" en un objet
   pret pour le rendu de la lettre. Beaucoup plus simple que
   normaliserDonneesCV() : la lettre n'a pas besoin d'extraire des
   dizaines de champs de dossier -- l'essentiel du contenu (objet, texte)
   provient deja tout fait de dossier.ia.lettre.lettre (produit par le
   prompt Lettre V2, voir prompts/lettre.md). Ici, on ne fait qu'assembler
   ce contenu avec l'identite (pour l'en-tete expediteur) et la date du
   jour.

   "dossier" reste l'unique source de verite : cette fonction ne le
   modifie jamais.

   IMPORTANT (meme principe que pour le CV) : aucune logique de
   presentation ici (pas de mise en forme, pas de decoupage en
   paragraphes) -- uniquement des donnees propres, completes, pretes a
   etre inserees dans un template par rendreTemplate() (deja generique,
   reutilise tel quel, aucune modification necessaire).
   ============================================================ */

function normaliserDonneesLettre(dossierSource) {
  var d = dossierSource || {};
  var id = d.identite || {};
  var lettreIA = (d.ia && d.ia.lettre && d.ia.lettre.lettre) || { objet: '', texte: '' };

  var dateAujourdhui = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return {
    identite: {
      civilite: id.civilite || null,
      nom: id.nom || '',
      prenom: id.prenom || '',
      adresse: id.adresse || '',
      ville: id.ville || '',
      telephone: id.telephone || '',
      email: id.email || ''
    },
    date: dateAujourdhui,
    objet: lettreIA.objet || '',
    texte: lettreIA.texte || '',
    // TACHE (retour utilisateur : "A4 Essentiel" avec un vrai texte court
    // rédigé par l'IA, pas une coupure) : transporté tel quel, vide si
    // absent (réponses IA antérieures à ce champ, ou édition manuelle
    // n'ayant jamais touché la version courte) -- voir
    // construireObjetLettrePourExportFormat() (formatsLettreEntretien.js),
    // qui l'utilise à la place de la troncature quand il est disponible.
    texteCourt: lettreIA.texteCourt || ''
  };
}
