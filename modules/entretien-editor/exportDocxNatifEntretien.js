// ============================================================
// exportDocxNatifEntretien.js
// ------------------------------------------------------------
// TACHE (traitement DOCX natif : fiche d'entretien) : meme principe que
// exportDocxNatifCV.js/exportDocxNatifLettre.js -- genere un vrai .docx
// directement depuis l'objet entretien normalise
// (normaliserDonneesEntretien(dossier), voir
// modules/entretien-editor/normaliserDonneesEntretien.js).
//
// Reutilise chargerLibrairieDocxNatif() (deja definie dans
// exportDocxNatifCV.js, chargee AVANT ce fichier -- voir index.html).
//
// Un seul modele aujourd'hui ("clair", le seul qui existe cote HTML),
// palette bleue alignee sur son style.css d'origine (#0d6efd, fond
// #EFF6FF pour le bloc "Questions a poser au recruteur", mis en valeur
// car c'est l'element le plus souvent oublie -- meme choix editorial que
// le modele HTML).
// ============================================================

var MODELES_AVEC_DOCX_NATIF_ENTRETIEN = ['clair'];

// TACHE (couleurs + formats, comme pour le CV) : opts optionnel, retro-
// compatible -- appel sans opts (ou {}) = comportement identique a avant
// (bleu par defaut, page A4 normale).
function _dneConstruireClair(docx, objetEntretien, opts) {
  opts = opts || {};
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, Table = docx.Table, TableRow = docx.TableRow,
    TableCell = docx.TableCell, WidthType = docx.WidthType, ShadingType = docx.ShadingType, BorderStyle = docx.BorderStyle,
    AlignmentType = docx.AlignmentType, LevelFormat = docx.LevelFormat;

  var BLEU = opts.primaire || '0D6EFD';
  var TEINTE = opts.teinte || 'EFF6FF';       // fond du bloc "Questions a poser"
  var BORDURE_TEINTE = opts.secondaire || 'BFDBFE'; // bordure du meme bloc + soulignement des titres
  var TEXTE = '1F2937';
  var TEXTE_MUTED = '4B5563';
  var refPuces = 'puces-entretien';

  function titreSection(texte) {
    return new Paragraph({
      spacing: { before: 260, after: 140 },
      border: { bottom: { color: BORDURE_TEINTE, space: 3, style: BorderStyle.SINGLE, size: 6 } },
      children: [ new TextRun({ text: texte, bold: true, color: BLEU, size: 25, font: 'Calibri' }) ]
    });
  }
  function texte(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 100 },
      children: [ new TextRun({ text: t, size: o.size || 21, color: o.color || TEXTE, italics: !!o.italique, font: 'Calibri' }) ] });
  }
  function puce(t) {
    return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 80 },
      children: [ new TextRun({ text: t, size: 21, color: TEXTE, font: 'Calibri' }) ] });
  }

  var identite = objetEntretien.identite || {};
  var enfants = [];

  // ---- En-tete ----
  enfants.push(new Paragraph({
    border: { bottom: { color: BLEU, space: 6, style: BorderStyle.SINGLE, size: 18 } },
    spacing: { after: 60 },
    children: [ new TextRun({ text: "Préparation à l'entretien", bold: true, color: BLEU, size: 34, font: 'Calibri' }) ]
  }));
  enfants.push(texte(((identite.civilite || '') + ' ' + (identite.prenom || '') + ' ' + (identite.nom || '')).trim(), { size: 23, after: 60 }));
  if (objetEntretien.metierVise) {
    var contexte = 'Poste visé : ' + objetEntretien.metierVise + (objetEntretien.entreprise ? ' — ' + objetEntretien.entreprise : '');
    enfants.push(texte(contexte, { size: 20, color: TEXTE_MUTED, after: 200 }));
  }

  // ---- Ma présentation ----
  if (objetEntretien.presentation) {
    enfants.push(titreSection('Ma présentation'));
    enfants.push(texte(objetEntretien.presentation, { after: 160 }));
  }

  // ---- Points à préparer ----
  var points = (objetEntretien.pointsAPreparer || []).filter(Boolean);
  if (points.length) {
    enfants.push(titreSection('Points à préparer'));
    points.forEach(function (p) { enfants.push(puce(p)); });
  }

  // ---- Questions anticipées ----
  var questions = (objetEntretien.questionsAnticipees || []).filter(Boolean);
  if (questions.length) {
    enfants.push(titreSection('Questions anticipées'));
    questions.forEach(function (q) { enfants.push(puce(q)); });
  }

  // ---- Questions à poser au recruteur (bloc mis en valeur, meme choix
  // editorial que le modele HTML : fond bleu clair, dans un tableau 1
  // cellule pour simuler l'encadre) ----
  var questionsCandidat = (objetEntretien.questionsDuCandidat || []).filter(Boolean);
  if (questionsCandidat.length) {
    var contenuEncadre = [
      new Paragraph({ spacing: { after: 100 },
        children: [ new TextRun({ text: 'Questions à poser au recruteur', bold: true, color: BLEU, size: 25, font: 'Calibri' }) ] })
    ].concat(questionsCandidat.map(function (q) {
      return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 80 },
        children: [ new TextRun({ text: q, size: 21, color: TEXTE, font: 'Calibri' }) ] });
    }));
    enfants.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
    enfants.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: BORDURE_TEINTE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDURE_TEINTE },
        left: { style: BorderStyle.SINGLE, size: 4, color: BORDURE_TEINTE }, right: { style: BorderStyle.SINGLE, size: 4, color: BORDURE_TEINTE },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
      },
      rows: [ new TableRow({ children: [ new TableCell({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: TEINTE },
        margins: { top: 200, bottom: 200, left: 200, right: 200 },
        children: contenuEncadre
      }) ] }) ]
    }));
  }

  return new docx.Document({
    numbering: { config: [ { reference: refPuces, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 288, hanging: 216 } } } } ] } ] },
    sections: [ { properties: { page: { margin: { top: 700, bottom: 700, left: 900, right: 900 }, size: opts.formatPage === 'A5' ? _dnTaillePageA5() : undefined } }, children: enfants } ]
  });
}

var GENERATEURS_DOCX_NATIFS_ENTRETIEN = {
  'clair': function (docx, objetEntretien, opts) { return _dneConstruireClair(docx, objetEntretien, opts); }
};

function genererDocxNatifEntretien(modeleId, objetEntretien, opts) {
  var generateur = GENERATEURS_DOCX_NATIFS_ENTRETIEN[modeleId];
  if (!generateur) { return Promise.reject(new Error('Pas de generateur Word natif pour ce modele de fiche entretien.')); }
  return chargerLibrairieDocxNatif().then(function (docx) {
    var document = generateur(docx, objetEntretien, opts);
    return docx.Packer.toBlob(document);
  });
}
