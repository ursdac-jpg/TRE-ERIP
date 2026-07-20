// ============================================================
// exportDocxNatifCV_Chic.js
// ------------------------------------------------------------
// TACHE (5 nouveaux modeles CV, d'apres vos references PowerPoint) :
// premier des 5 -- "Chic" (image 5 : sidebar beige clair + photo, bloc
// sombre avec monogramme + nom, en-tetes de rubrique en bandes sombres).
//
// LIMITE ASSUMEE : la reference montre le monogramme dans un cadre
// LOSANGE (carre pivote a 45°). Un vrai pivot de forme n'est pas
// raisonnablement exposable via cette librairie pour un simple encadre
// de texte -- utilise un cadre CARRE (bordure simple) avec les 2
// initiales a l'interieur : meme fonction (identification visuelle
// chic), sans parier sur une rotation non garantie.
//
// Photo optionnelle (comme le reste de l'app, voir contenuIdentite()/
// wireIdentite(), js/app.js) -- silencieusement absente si
// objetCV.photo.url est vide (case "Inclure ma photo" non cochee).
// ============================================================

function _dnConstruireChic(docx, objetCV, opts) {
  opts = opts || {};
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, ImageRun = docx.ImageRun,
    Table = docx.Table, TableRow = docx.TableRow, TableCell = docx.TableCell,
    WidthType = docx.WidthType, ShadingType = docx.ShadingType, BorderStyle = docx.BorderStyle,
    AlignmentType = docx.AlignmentType, LevelFormat = docx.LevelFormat, VerticalAlign = docx.VerticalAlign;

  var SOMBRE = opts.primaire || '3F3F3F';   // blocs/bandes sombres
  var BEIGE = opts.secondaire || 'EDE4D6';  // fond de la colonne laterale
  var TEXTE = '2A2A2A';
  var TEXTE_CLAIR_SUR_SOMBRE = 'F5F1E8';    // sous-titre sur le bloc sombre (beige tres clair, pas blanc pur -- plus chic)
  var AUCUNE_BORDURE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  var refPuces = 'puces-chic';

  // ---- "Bandeau" sombre pleine largeur -- reutilise pour tous les
  // en-tetes de rubrique (CONTACT, COMPETENCES, LANGUES, PROFIL,
  // EXPERIENCES PROFESSIONNELLES, FORMATION), comme dans la reference. ----
  function bandeauSombre(t, tailleTexte) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
      rows: [ new TableRow({ children: [ new TableCell({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: SOMBRE },
        margins: { top: 90, bottom: 90, left: 150, right: 150 },
        children: [ new Paragraph({ children: [ new TextRun({ text: t.toUpperCase(), bold: true, color: 'FFFFFF', size: tailleTexte || 17, font: 'Calibri', characterSpacing: 15 }) ] }) ]
      }) ] }) ],
      margin: { top: 60, bottom: 100 }
    });
  }
  function texte(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 60 }, alignment: o.centre ? AlignmentType.CENTER : undefined,
      children: [ new TextRun({ text: t, size: o.size || 17, bold: !!o.gras, italics: !!o.italique, color: o.couleur || TEXTE, font: 'Calibri' }) ] });
  }
  function puce(t) {
    return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 50 },
      children: [ new TextRun({ text: t, size: 17, color: TEXTE, font: 'Calibri' }) ] });
  }

  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};

  // ---- Photo (carree, comme le Mini CV -- meme limite assumee sur le
  // recadrage circulaire, voir miniCvA5.js) -- silencieusement absente
  // si non incluse (objetCV.photo.url deja filtre par normaliserDonneesCV()
  // selon la case "Inclure ma photo", js/app.js). ----
  var octetsPhoto = (typeof _dnDataUrlVersOctets === 'function') ? _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url) : null;

  // ============================================================
  // Colonne laterale (beige) -- photo, Contact, Competences, Langues
  // ============================================================
  var sidebar = [];
  if (octetsPhoto) {
    sidebar.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 },
      children: [ new ImageRun({ data: octetsPhoto, transformation: { width: 90, height: 90 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ] }));
  }
  if (identite.telephone || identite.email || identite.adresse || permis.possede) {
    sidebar.push(bandeauSombre('Contact'));
    if (identite.telephone) { sidebar.push(texte(identite.telephone)); }
    if (identite.email) { sidebar.push(texte(identite.email)); }
    if (identite.adresse) { sidebar.push(texte(identite.adresse + (identite.ville ? ' ' + identite.ville : ''), { after: 100 })); }
    if (permis.possede) { sidebar.push(texte('Permis ' + (permis.categories || []).join('/'), { after: 100 })); }
  }
  var savoirFaire = (objetCV.competences && objetCV.competences.savoirFaire) || [];
  var savoirEtre = (objetCV.competences && objetCV.competences.savoirEtre) || [];
  var toutesCompetences = savoirFaire.concat(savoirEtre);
  if (toutesCompetences.length) {
    sidebar.push(bandeauSombre('Compétences professionnelles'));
    toutesCompetences.forEach(function (c) { sidebar.push(puce(c)); });
  }
  var langues = objetCV.langues || [];
  if (langues.length) {
    sidebar.push(bandeauSombre('Langues'));
    // TACHE (consigne explicite : "pas d'evaluation en boules, des choses
    // concretes, ex. Anglais = B2") : texte simple, jamais de symbole.
    langues.forEach(function (l) { sidebar.push(texte(l.langue + ' — ' + l.niveau, { after: 60 })); });
  }
  var loisirsTexte = (objetCV.loisirs || []).join(', ');
  if (loisirsTexte) {
    sidebar.push(bandeauSombre("Centres d'intérêt"));
    sidebar.push(texte(loisirsTexte));
  }
  var competencesPersonnellesChic = objetCV.competencesPersonnelles || [];
  if (competencesPersonnellesChic.length) {
    sidebar.push(bandeauSombre('Compétences personnelles'));
    competencesPersonnellesChic.forEach(function (c) { sidebar.push(texte(c.competence)); });
  }

  // ============================================================
  // Colonne principale -- bloc sombre nom/monogramme, puis Profil,
  // Experiences, Formation
  // ============================================================
  // TACHE (correction bug : cadre monogramme vide quand aucun prenom/nom
  // n'est renseigne, rendu casse) : le cadre et la ligne de nom ne
  // s'affichent desormais QUE si au moins une donnee existe pour eux --
  // meme principe {{#if}} que partout ailleurs dans l'app.
  var nomComplet = ((identite.prenom || '') + ' ' + (identite.nom || '')).trim();
  var initiales = ((identite.prenom || '').charAt(0) + (identite.nom || '').charAt(0)).toUpperCase();
  var contenuBlocNom = [];
  if (initiales) {
    // TACHE (limite assumee, voir en-tete du fichier) : cadre carre
    // (pas de losange pivote) avec les initiales -- meme fonction que
    // le monogramme de la reference.
    contenuBlocNom.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, border: { top: { color: TEXTE_CLAIR_SUR_SOMBRE, size: 6, style: BorderStyle.SINGLE, space: 8 }, bottom: { color: TEXTE_CLAIR_SUR_SOMBRE, size: 6, style: BorderStyle.SINGLE, space: 8 }, left: { color: TEXTE_CLAIR_SUR_SOMBRE, size: 6, style: BorderStyle.SINGLE, space: 8 }, right: { color: TEXTE_CLAIR_SUR_SOMBRE, size: 6, style: BorderStyle.SINGLE, space: 8 } },
      children: [ new TextRun({ text: '  ' + initiales + '  ', color: TEXTE_CLAIR_SUR_SOMBRE, size: 24, font: 'Georgia', characterSpacing: 20 }) ] }));
  }
  if (nomComplet) {
    contenuBlocNom.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [ new TextRun({ text: nomComplet, bold: true, color: 'FFFFFF', size: 34, font: 'Georgia', characterSpacing: 10 }) ] }));
  }
  if (objetCV.objectifProfessionnel) {
    contenuBlocNom.push(new Paragraph({ alignment: AlignmentType.CENTER,
      children: [ new TextRun({ text: objetCV.objectifProfessionnel.toUpperCase(), color: TEXTE_CLAIR_SUR_SOMBRE, size: 17, font: 'Calibri', characterSpacing: 20 }) ] }));
  }
  // Si rien du tout a montrer (aucune identite, aucun objectif), pas la
  // peine d'un bloc sombre entierement vide -- une ligne neutre suffit.
  if (!contenuBlocNom.length) { contenuBlocNom.push(new Paragraph({ children: [] })); }

  var blocNom = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
    rows: [ new TableRow({ children: [ new TableCell({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: SOMBRE },
      margins: { top: 260, bottom: 260, left: 200, right: 200 },
      children: contenuBlocNom
    }) ] }) ],
    margin: { bottom: 200 }
  });

  var principal = [blocNom];
  var texteProfil = _dnTexteProfil(objetCV);
  if (texteProfil) { principal.push(bandeauSombre('Profil')); principal.push(texte(texteProfil, { after: 160 })); }

  var experiences = objetCV.experiences || [];
  if (experiences.length) {
    principal.push(bandeauSombre('Expériences professionnelles'));
    experiences.forEach(function (e) {
      principal.push(texte(e.poste, { gras: true, size: 18, after: 15 }));
      var meta = [e.entreprise, e.lieu, [e.dateDebut, e.dateFin].filter(Boolean).join(' - '), e.contrat].filter(Boolean).join(' | ');
      if (meta) { principal.push(texte(meta, { italique: true, size: 15, couleur: '6B6560', after: 60 })); }
      if (e.missions) { principal.push(puce(e.missions)); }
    });
  }
  var experiencesPerso = objetCV.experiencesPersonnelles || [];
  if (experiencesPerso.length) {
    principal.push(bandeauSombre('Expériences personnelles'));
    experiencesPerso.forEach(function (e) {
      principal.push(texte(e.intitule, { gras: true, after: 15 }));
      if (e.detail) { principal.push(texte(e.detail, { italique: true, size: 15, couleur: '6B6560', after: 60 })); }
    });
  }
  var formations = objetCV.formations || [];
  if (formations.length) {
    principal.push(bandeauSombre('Formation'));
    formations.forEach(function (f) {
      principal.push(texte(f.niveau + (f.intitule ? ', ' + f.intitule : ''), { gras: true, after: 15 }));
      var meta = [f.etablissement, f.annee].filter(Boolean).join(' | ');
      if (meta) { principal.push(texte(meta, { italique: true, size: 15, couleur: '6B6560', after: 100 })); }
    });
  }
  var certifications = objetCV.certifications || [];
  if (certifications.length) {
    principal.push(bandeauSombre('Certifications'));
    certifications.forEach(function (c) { principal.push(puce(c)); });
  }

  return new docx.Document({
    numbering: { config: [ { reference: refPuces, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 260, hanging: 200 } } } } ] } ] },
    sections: [ { properties: { page: { margin: _dnMargePage({ top: 0, bottom: 500, left: 0, right: 0 }, opts.formatPage), size: opts.formatPage === 'A5' ? _dnTaillePageA5() : undefined } }, children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [3300, 6700],
        borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
        rows: [ new TableRow({ children: [
          new TableCell({ width: { size: 3300, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: BEIGE },
            margins: { top: 500, bottom: 400, left: 300, right: 250 }, verticalAlign: VerticalAlign.TOP, children: sidebar }),
          new TableCell({ width: { size: 6700, type: WidthType.DXA }, margins: { top: 0, bottom: 400, left: 0, right: 400 }, verticalAlign: VerticalAlign.TOP, children: principal })
        ] }) ]
      })
    ] } ]
  });
}

// ---- Enregistrement dans le systeme existant (etend, ne remplace rien) ----
// TACHE (retour utilisateur : moteur de mise en page centralisé,
// conversion 4/5 -- Chic) : ce chemin n'est plus qu'un repli de secours
// (voir commentaire equivalent, exportDocxNatifCV_NouveauxModeles.js).
GENERATEURS_DOCX_NATIFS_CV['chic'] = function (docx, objetCV) {
  return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: '3F3F3F', fondSidebar: 'EDE4D6', texteSidebar: '2A2A2A', styleBandeau: 'teinte', styleTitreSection: 'bandeau-sombre', styleEnTete: 'bloc-colonne', police: 'Georgia', texteClairSurSombre: 'F5F1E8' });
};
MODELES_AVEC_DOCX_NATIF_CV.push('chic');
if (typeof MODELES_AVEC_COULEURS_CV !== 'undefined') { MODELES_AVEC_COULEURS_CV.push('chic'); }
if (typeof MODELES_AVEC_FORMAT_A5_CV !== 'undefined') { MODELES_AVEC_FORMAT_A5_CV.push('chic'); }
