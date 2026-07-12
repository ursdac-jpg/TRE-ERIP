// ============================================================
// miniCvA5.js
// ------------------------------------------------------------
// TACHE (Mini CV (A5), mise en page dediee) : contrairement a l'ancienne
// approche (recadrer/reduire l'un des 14 modeles existants), le Mini CV a
// SA PROPRE structure, toujours la meme quel que soit le modele choisi en
// A4 -- fidele a l'esprit de la reference envoyee (photo centrale,
// sections compactes autour).
//
// LIMITE ASSUMEE, IMPORTANTE : la reference montre une photo RONDE avec
// une disposition radiale (sections en arc de cercle). Deux choses ne
// sont pas raisonnablement faisables dans un vrai document Word via
// cette librairie :
// 1. Recadrage circulaire de l'image -- verifie techniquement avant de
//    construire, non expose de façon fiable par docx-js (le composant
//    interne existe mais n'est pas parametrable depuis l'API publique).
//    Photo carree ici, nette et propre, mais pas ronde.
// 2. Disposition radiale (texte en arc de cercle autour d'un point) --
//    ce n'est pas un concept qui existe dans le format Word (OOXML) pour
//    du texte courant ; possible seulement dans PowerPoint via des zones
//    de texte positionnees a la main. Interpretation ici : photo et nom
//    centres en tete, puis les memes rubriques organisees en 2 colonnes
//    compactes -- toute l'information de votre reference, disposee
//    autrement pour rester un vrai document Word fiable.
//
// Rubriques (d'apres la reference) : Identite/Coordonnees, Metier vise,
// Experiences, Competences, Formations, Centres d'interet -- AUCUNE
// evaluation en etoiles/pourcentages (consigne explicite : "je veux des
// choses concretes, ex. Anglais = B2", jamais de symbole d'evaluation).
// ============================================================

// ---- Conversion d'une image en base64 (dossier.photo.url) vers les
// octets bruts attendus par docx.ImageRun -- atob() est une fonction
// navigateur standard, disponible partout ou ce fichier s'execute
// reellement (aucune dependance supplementaire). ----
function _dnDataUrlVersOctets(dataUrl) {
  if (!dataUrl || dataUrl.indexOf('base64,') === -1) { return null; }
  try {
    var base64 = dataUrl.slice(dataUrl.indexOf('base64,') + 7);
    var binaire = atob(base64);
    var octets = new Uint8Array(binaire.length);
    for (var i = 0; i < binaire.length; i++) { octets[i] = binaire.charCodeAt(i); }
    return octets;
  } catch (e) { return null; }
}
function _dnTypeImagePhoto(dataUrl) {
  return (dataUrl && dataUrl.indexOf('image/png') !== -1) ? 'png' : 'jpg';
}

// ============================================================
// Construction du Mini CV -- opts.primaire/secondaire pour la couleur
// (memes 6 couleurs que les autres modeles, voir coloriationDocxNatifCV.js).
// ============================================================
function _dnConstruireMiniCV(docx, objetCV, opts) {
  opts = opts || {};
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, ImageRun = docx.ImageRun,
    Table = docx.Table, TableRow = docx.TableRow, TableCell = docx.TableCell,
    WidthType = docx.WidthType, AlignmentType = docx.AlignmentType, BorderStyle = docx.BorderStyle,
    LevelFormat = docx.LevelFormat, VerticalAlign = docx.VerticalAlign;

  var PRIMAIRE = opts.primaire || '0F766E'; // teal sobre, couleur par defaut de ce modele
  var TEXTE = '1F2937';
  var TEXTE_MUTED = '6B7280';
  var AUCUNE_BORDURE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  var refPuces = 'puces-minicv';

  function titre(t) {
    return new Paragraph({ spacing: { before: 80, after: 50 }, children: [ new TextRun({ text: t.toUpperCase(), bold: true, color: PRIMAIRE, size: 15, font: 'Calibri', characterSpacing: 8 }) ] });
  }
  function texte(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 40 },
      children: [ new TextRun({ text: t, size: o.size || 15, bold: !!o.gras, italics: !!o.italique, color: o.couleur || TEXTE, font: 'Calibri' }) ] });
  }
  function puce(t) {
    return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 30 },
      children: [ new TextRun({ text: t, size: 15, color: TEXTE, font: 'Calibri' }) ] });
  }

  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};
  var enfants = [];

  // ---- Photo (carree, centree) + nom + metier vise -- silencieusement
  // absente si aucune photo n'est incluse (objetCV.photo.url deja filtre
  // par normaliserDonneesCV() selon la case "inclure", voir js/app.js). ----
  var octetsPhoto = _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url);
  if (octetsPhoto) {
    enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [ new ImageRun({ data: octetsPhoto, transformation: { width: 72, height: 72 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ] }));
  }
  var nomComplet = ((identite.prenom || '') + ' ' + (identite.nom || '')).trim();
  if (nomComplet) {
    enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 15 },
      children: [ new TextRun({ text: nomComplet, bold: true, size: 26, color: PRIMAIRE, font: 'Calibri' }) ] }));
  }
  if (objetCV.objectifProfessionnel) {
    enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [ new TextRun({ text: objetCV.objectifProfessionnel.toUpperCase(), bold: true, color: TEXTE_MUTED, size: 13, font: 'Calibri', characterSpacing: 8 }) ] }));
  }
  var coordonnees = [identite.telephone, identite.email, [identite.adresse, identite.ville].filter(Boolean).join(' ')].filter(Boolean);
  if (permis.possede) { coordonnees.push('Permis ' + (permis.categories || []).join('/')); }
  if (coordonnees.length) {
    enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      border: { bottom: { color: PRIMAIRE, space: 4, style: BorderStyle.SINGLE, size: 8 } },
      children: [ new TextRun({ text: coordonnees.join('  ·  '), size: 13, color: TEXTE_MUTED, font: 'Calibri' }) ] }));
  }

  // ---- 2 colonnes compactes : Experience+Formations a gauche,
  // Competences+Langues+Interets a droite ----
  var colonneGauche = [];
  var experiences = objetCV.experiences || [];
  if (experiences.length) {
    colonneGauche.push(titre('Expérience'));
    experiences.forEach(function (e) {
      colonneGauche.push(texte(e.poste + (e.entreprise ? ' — ' + e.entreprise : ''), { gras: true, after: 5 }));
      var meta = [[e.dateDebut, e.dateFin].filter(Boolean).join('-'), e.contrat].filter(Boolean).join(' · ');
      if (meta) { colonneGauche.push(texte(meta, { italique: true, size: 13, couleur: TEXTE_MUTED, after: 60 })); }
    });
  }
  var formations = objetCV.formations || [];
  if (formations.length) {
    colonneGauche.push(titre('Formation'));
    formations.forEach(function (f) {
      colonneGauche.push(texte(f.niveau + (f.intitule ? ' — ' + f.intitule : ''), { gras: true, after: 5 }));
      if (f.annee) { colonneGauche.push(texte(f.annee, { italique: true, size: 13, couleur: TEXTE_MUTED, after: 60 })); }
    });
  }

  var colonneDroite = [];
  var savoirFaire = (objetCV.competences && objetCV.competences.savoirFaire) || [];
  var savoirEtre = (objetCV.competences && objetCV.competences.savoirEtre) || [];
  var savoirsMiniCV = (objetCV.competences && objetCV.competences.savoirs) || [];
  var toutesCompetences = savoirFaire.concat(savoirEtre).concat(savoirsMiniCV);
  if (toutesCompetences.length) {
    colonneDroite.push(titre('Compétences'));
    toutesCompetences.forEach(function (c) { colonneDroite.push(puce(c)); });
  }
  var langues = objetCV.langues || [];
  if (langues.length) {
    colonneDroite.push(titre('Langues'));
    // TACHE (consigne explicite : "pas d'evaluation en boules, des
    // choses concretes, ex. Anglais = B2") : texte simple, jamais de
    // symbole d'evaluation visuelle.
    langues.forEach(function (l) { colonneDroite.push(texte(l.langue + ' — ' + l.niveau, { after: 30 })); });
  }
  var loisirsTexte = (objetCV.loisirs || []).join(', ');
  if (loisirsTexte) {
    colonneDroite.push(titre("Centres d'intérêt"));
    colonneDroite.push(texte(loisirsTexte, { size: 14 }));
  }

  enfants.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
    rows: [ new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 150 }, verticalAlign: VerticalAlign.TOP, children: colonneGauche }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 150 }, verticalAlign: VerticalAlign.TOP, children: colonneDroite })
    ] }) ]
  }));

  return new docx.Document({
    numbering: { config: [ { reference: refPuces, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 200, hanging: 150 } } } } ] } ] },
    sections: [ { properties: { page: { margin: { top: 400, bottom: 400, left: 450, right: 450 }, size: _dnTaillePageA5() } }, children: enfants } ]
  });
}

// ============================================================
// TACHE (retour utilisateur : 5 designs A5, comme pour A4 -- 2e des 5) :
// "Paysage" -- meme contenu strictement que "Portrait" (memes rubriques),
// seule la disposition de la feuille change : format A5 tourne (plus
// large que haut), bandeau d'en-tete horizontal (photo + nom + metier vise
// + coordonnees sur une seule ligne) au lieu d'un bloc centre vertical,
// puis 2 colonnes en dessous (meme repartition Experience/Formation a
// gauche, Competences/Langues/Interets a droite que Portrait).
// Premier jet, a ajuster -- opts.primaire/secondaire pour la couleur,
// memes 6 couleurs que le reste de l'application.
// ============================================================
function _dnTaillePageA5Paysage() {
  return { width: 11905, height: 8390 };
}

function _dnConstruireMiniCVPaysage(docx, objetCV, opts) {
  opts = opts || {};
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, ImageRun = docx.ImageRun,
    Table = docx.Table, TableRow = docx.TableRow, TableCell = docx.TableCell,
    WidthType = docx.WidthType, AlignmentType = docx.AlignmentType, BorderStyle = docx.BorderStyle,
    LevelFormat = docx.LevelFormat, VerticalAlign = docx.VerticalAlign;

  var PRIMAIRE = opts.primaire || '0F766E';
  var TEXTE = '1F2937';
  var TEXTE_MUTED = '6B7280';
  var AUCUNE_BORDURE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  var refPuces = 'puces-minicv-paysage';

  function titre(t) {
    return new Paragraph({ spacing: { before: 60, after: 40 }, children: [ new TextRun({ text: t.toUpperCase(), bold: true, color: PRIMAIRE, size: 15, font: 'Calibri', characterSpacing: 8 }) ] });
  }
  function texte(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 40 },
      children: [ new TextRun({ text: t, size: o.size || 15, bold: !!o.gras, italics: !!o.italique, color: o.couleur || TEXTE, font: 'Calibri' }) ] });
  }
  function puce(t) {
    return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 30 },
      children: [ new TextRun({ text: t, size: 15, color: TEXTE, font: 'Calibri' }) ] });
  }

  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};
  var enfants = [];

  // ---- Bandeau d'en-tete horizontal : photo (petite, a gauche) | nom +
  // metier vise (centre) | coordonnees (droite) -- une seule ligne, tire
  // parti de la largeur du format paysage plutot que d'empiler comme en
  // portrait. ----
  var octetsPhoto = _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url);
  var celluleGauche = [];
  if (octetsPhoto) {
    celluleGauche.push(new Paragraph({ alignment: AlignmentType.CENTER,
      children: [ new ImageRun({ data: octetsPhoto, transformation: { width: 56, height: 56 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ] }));
  }
  var celluleCentre = [];
  var nomComplet = ((identite.prenom || '') + ' ' + (identite.nom || '')).trim();
  if (nomComplet) {
    celluleCentre.push(new Paragraph({ spacing: { after: 15 },
      children: [ new TextRun({ text: nomComplet, bold: true, size: 26, color: PRIMAIRE, font: 'Calibri' }) ] }));
  }
  if (objetCV.objectifProfessionnel) {
    celluleCentre.push(new Paragraph({
      children: [ new TextRun({ text: objetCV.objectifProfessionnel.toUpperCase(), bold: true, size: 13, color: TEXTE_MUTED, font: 'Calibri', characterSpacing: 8 }) ] }));
  }
  var celluleDroite = [];
  var coordonnees = [identite.telephone, identite.email, [identite.adresse, identite.ville].filter(Boolean).join(' ')].filter(Boolean);
  if (permis.possede) { coordonnees.push('Permis ' + (permis.categories || []).join('/')); }
  coordonnees.forEach(function (c) { celluleDroite.push(texte(c, { size: 13, couleur: TEXTE_MUTED, after: 15 })); });

  enfants.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: AUCUNE_BORDURE, bottom: { color: PRIMAIRE, space: 4, style: BorderStyle.SINGLE, size: 8 }, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
    rows: [ new TableRow({ children: [
      new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, margins: { bottom: 100 }, verticalAlign: VerticalAlign.CENTER, children: celluleGauche.length ? celluleGauche : [new Paragraph({ children: [] })] }),
      new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, margins: { bottom: 100, left: 150 }, verticalAlign: VerticalAlign.CENTER, children: celluleCentre.length ? celluleCentre : [new Paragraph({ children: [] })] }),
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, margins: { bottom: 100 }, verticalAlign: VerticalAlign.CENTER, children: celluleDroite.length ? celluleDroite : [new Paragraph({ children: [] })] })
    ] }) ]
  }));
  enfants.push(new Paragraph({ spacing: { after: 120 }, children: [] }));

  // ---- 2 colonnes compactes, memes rubriques et repartition que Portrait
  // (Experience+Formation a gauche, Competences+Langues+Interets a droite)
  // -- seule la disposition de la feuille change, pas le contenu. ----
  var colonneGauche = [];
  var experiences = objetCV.experiences || [];
  if (experiences.length) {
    colonneGauche.push(titre('Expérience'));
    experiences.forEach(function (e) {
      colonneGauche.push(texte(e.poste + (e.entreprise ? ' — ' + e.entreprise : ''), { gras: true, after: 5 }));
      var meta = [[e.dateDebut, e.dateFin].filter(Boolean).join('-'), e.contrat].filter(Boolean).join(' · ');
      if (meta) { colonneGauche.push(texte(meta, { italique: true, size: 13, couleur: TEXTE_MUTED, after: 60 })); }
    });
  }
  var formations = objetCV.formations || [];
  if (formations.length) {
    colonneGauche.push(titre('Formation'));
    formations.forEach(function (f) {
      colonneGauche.push(texte(f.niveau + (f.intitule ? ' — ' + f.intitule : ''), { gras: true, after: 5 }));
      if (f.annee) { colonneGauche.push(texte(f.annee, { italique: true, size: 13, couleur: TEXTE_MUTED, after: 60 })); }
    });
  }

  var colonneDroite = [];
  var savoirFaire = (objetCV.competences && objetCV.competences.savoirFaire) || [];
  var savoirEtre = (objetCV.competences && objetCV.competences.savoirEtre) || [];
  var savoirsPaysage = (objetCV.competences && objetCV.competences.savoirs) || [];
  var toutesCompetences = savoirFaire.concat(savoirEtre).concat(savoirsPaysage);
  if (toutesCompetences.length) {
    colonneDroite.push(titre('Compétences'));
    toutesCompetences.forEach(function (c) { colonneDroite.push(puce(c)); });
  }
  var langues = objetCV.langues || [];
  if (langues.length) {
    colonneDroite.push(titre('Langues'));
    langues.forEach(function (l) { colonneDroite.push(texte(l.langue + ' — ' + l.niveau, { after: 30 })); });
  }
  var loisirsTexte = (objetCV.loisirs || []).join(', ');
  if (loisirsTexte) {
    colonneDroite.push(titre("Centres d'intérêt"));
    colonneDroite.push(texte(loisirsTexte, { size: 14 }));
  }

  enfants.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
    rows: [ new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 150 }, verticalAlign: VerticalAlign.TOP, children: colonneGauche }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 150 }, verticalAlign: VerticalAlign.TOP, children: colonneDroite })
    ] }) ]
  }));

  return new docx.Document({
    numbering: { config: [ { reference: refPuces, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 200, hanging: 150 } } } } ] } ] },
    sections: [ { properties: { page: { margin: { top: 350, bottom: 350, left: 500, right: 500 }, size: _dnTaillePageA5Paysage() } }, children: enfants } ]
  });
}
