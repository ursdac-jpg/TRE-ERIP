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
      codePostal: id.codePostal || '',
      ville: id.ville || '',
      telephone: id.telephone || '',
      email: id.email || ''
    },
    date: dateAujourdhui,
    objet: lettreIA.objet || '',
    // TACHE (retour utilisateur : grand vide dans l'apercu) : le style.css
    // du modele utilise "white-space: pre-wrap" (deliberement, pour
    // respecter les retours a la ligne voulus par l'IA) -- il affiche donc
    // AUSSI, telles quelles, d'eventuelles lignes vides en exces renvoyees
    // par l'IA (3 sauts de ligne ou plus d'affilee), ce qui produisait un
    // grand espace blanc au milieu de la lettre. Normalise ici (jamais plus
    // de 2 sauts de ligne consecutifs = 1 ligne vide entre paragraphes),
    // sans toucher au template ni au style -- les deux etaient corrects.
    texte: (lettreIA.texte || '').replace(/\n{3,}/g, '\n\n').trim()
  };
}