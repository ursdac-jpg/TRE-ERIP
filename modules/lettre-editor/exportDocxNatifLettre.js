// ============================================================
// exportDocxNatifLettre.js
// ------------------------------------------------------------
// TACHE (traitement DOCX natif : lettre de motivation) : meme principe
// que exportDocxNatifCV.js -- genere un vrai .docx directement depuis
// l'objet lettre normalise (normaliserDonneesLettre(dossier), voir
// modules/lettre-core/normaliserDonneesLettre.js), au lieu de convertir
// le HTML deja rendu.
//
// Reutilise chargerLibrairieDocxNatif() (deja definie dans
// exportDocxNatifCV.js, charge AVANT ce fichier -- voir index.html) :
// meme protection contre le conflit de nom avec docx-preview, pas de
// duplication du chargement de la librairie docx.
//
// Un seul modele aujourd'hui ("sobre", le seul qui existe cote HTML),
// mais structure identique aux fichiers CV pour en ajouter facilement
// d'autres plus tard (voir GENERATEURS_DOCX_NATIFS_LETTRE).
// ============================================================

var MODELES_AVEC_DOCX_NATIF_LETTRE = ['sobre'];

// ---- Modele "Sobre" : en-tete expediteur classique, date, objet, corps ----
// TACHE (couleurs + formats, comme pour le CV) : opts optionnel, retro-
// compatible -- appel sans opts (ou {}) = comportement identique a avant.
// opts.primaire : accent sobre sur le nom et "Objet :" (le corps du
// texte reste toujours noir, la lettre garde son esprit formel).
// opts.formatPage : 'A5' => vraie page A5 (voir _dnTaillePageA5(),
// formatA5CV.js, deja charge). 'A4-essentiel'/'A4'/absent => page A4
// normale (taille par defaut de docx-js).
function _dnlConstruireSobre(docx, objetLettre, opts) {
  opts = opts || {};
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, AlignmentType = docx.AlignmentType;
  var TEXTE = '1A1A1A';
  var ACCENT = opts.primaire || '1A1A1A';
  var identite = objetLettre.identite || {};
  // TACHE (retour utilisateur : lettre modifiable, champs grises pour
  // l'identite) : quand une information (prenom/nom/telephone/e-mail)
  // manque -- cas frequent pour le parcours "Co-construire votre lettre
  // de motivation", qui court-circuite volontairement la saisie
  // structuree habituelle -- affiche un texte-repere en gris a la place,
  // exactement a l'endroit ou l'information doit figurer. La personne n'a
  // plus qu'a cliquer dessus dans Word et taper par-dessus. Jamais de
  // champ vide ni de ligne manquante silencieusement.
  var GRIS_PLACEHOLDER = 'A0A0A0';
  function champOuPlaceholder(valeur, libellePlaceholder) {
    return valeur ? { texte: valeur, placeholder: false } : { texte: libellePlaceholder, placeholder: true };
  }

  function ligneExpediteur(texte) {
    return new Paragraph({ spacing: { after: 20 }, children: [ new TextRun({ text: texte, size: 20, color: TEXTE, font: 'Georgia' }) ] });
  }
  // Meme principe que ligneExpediteur(), mais pour un champ pouvant etre
  // un placeholder gris (telephone, e-mail).
  function ligneExpediteurOuPlaceholder(valeur, libellePlaceholder) {
    var champ = champOuPlaceholder(valeur, libellePlaceholder);
    return new Paragraph({ spacing: { after: 20 }, children: [
      new TextRun({ text: champ.texte, italics: champ.placeholder, size: 20, color: champ.placeholder ? GRIS_PLACEHOLDER : TEXTE, font: 'Georgia' })
    ] });
  }

  var enfants = [];

  // En-tete expediteur (aligne a gauche, comme le modele HTML "sobre") --
  // le nom seul recoit la couleur d'accent, reste de l'adresse neutre.
  // TACHE (champs grises) : prenom et nom traites separement (2 TextRun),
  // chacun grise independamment si manquant -- un seul des deux peut
  // manquer sans griser l'autre inutilement.
  var champPrenom = champOuPlaceholder(identite.prenom, '[Votre prénom]');
  var champNom = champOuPlaceholder(identite.nom, '[Votre nom]');
  enfants.push(new Paragraph({ spacing: { after: 20 }, children: [
    new TextRun({ text: champPrenom.texte, bold: true, italics: champPrenom.placeholder, color: champPrenom.placeholder ? GRIS_PLACEHOLDER : ACCENT, size: 20, font: 'Georgia' }),
    new TextRun({ text: ' ', bold: true, size: 20, font: 'Georgia' }),
    new TextRun({ text: champNom.texte, bold: true, italics: champNom.placeholder, color: champNom.placeholder ? GRIS_PLACEHOLDER : ACCENT, size: 20, font: 'Georgia' })
  ] }));
  if (identite.adresse) { enfants.push(ligneExpediteur(identite.adresse)); }
  if (identite.ville) { enfants.push(ligneExpediteur(identite.ville)); }
  // TACHE (champs grises) : telephone et e-mail toujours affiches
  // (placeholder gris si manquants) -- contrairement a adresse/ville
  // (facultatives, discretes si absentes), un recruteur a besoin d'un
  // moyen direct de recontacter la personne.
  enfants.push(ligneExpediteurOuPlaceholder(identite.telephone, '[Votre téléphone]'));
  enfants.push(ligneExpediteurOuPlaceholder(identite.email, '[Votre e-mail]'));

  // Date (alignee a droite, convention courrier)
  enfants.push(new Paragraph({
    alignment: AlignmentType.RIGHT, spacing: { before: 300, after: 300 },
    children: [ new TextRun({ text: objetLettre.date || '', size: 20, color: TEXTE, font: 'Georgia' }) ]
  }));

  // Objet
  if (objetLettre.objet) {
    enfants.push(new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({ text: 'Objet : ', bold: true, size: 21, color: ACCENT, font: 'Georgia' }),
        new TextRun({ text: objetLettre.objet, size: 21, color: TEXTE, font: 'Georgia' })
      ]
    }));
  }

  // Corps -- un paragraphe Word par paragraphe separe par une ligne vide
  // dans le texte (normaliserDonneesLettre garantit deja au plus 2 sauts
  // de ligne consecutifs, voir son propre commentaire).
  var paragraphesTexte = (objetLettre.texte || '').split(/\n{2,}/).filter(function (p) { return p.trim(); });
  paragraphesTexte.forEach(function (p) {
    enfants.push(new Paragraph({
      spacing: { after: 200 }, alignment: AlignmentType.JUSTIFIED,
      children: [ new TextRun({ text: p.trim(), size: 21, color: TEXTE, font: 'Georgia' }) ]
    }));
  });

  return new docx.Document({
    sections: [ { properties: { page: { margin: { top: 900, bottom: 900, left: 1100, right: 1100 }, size: opts.formatPage === 'A5' ? _dnTaillePageA5() : undefined } }, children: enfants } ]
  });
}

var GENERATEURS_DOCX_NATIFS_LETTRE = {
  'sobre': function (docx, objetLettre, opts) { return _dnlConstruireSobre(docx, objetLettre, opts); }
};

function genererDocxNatifLettre(modeleId, objetLettre, opts) {
  var generateur = GENERATEURS_DOCX_NATIFS_LETTRE[modeleId];
  if (!generateur) { return Promise.reject(new Error('Pas de generateur Word natif pour ce modele de lettre.')); }
  return chargerLibrairieDocxNatif().then(function (docx) {
    var document = generateur(docx, objetLettre, opts);
    return docx.Packer.toBlob(document);
  });
}
