// ============================================================
// exportDocxNatifCV.js
// ------------------------------------------------------------
// TACHE (Option C : export Word natif) : genere un vrai fichier .docx
// directement depuis l'objet CV normalise (memes donnees que les
// templates HTML, voir docs/SCHEMA_CV.md), au lieu de convertir le HTML
// deja rendu (ancienne methode exporterDocumentEnDocx(), qui perd les
// colonnes, les couleurs de fond et n'affiche aucun decor -- conservee
// en repli pour les modeles non couverts ici).
//
// Un seul modele par generateur, aucune donnee en dur : chaque rubrique
// facultative est ignoree si vide (meme principe que les blocs {{#if}}
// des templates HTML), pour ne jamais produire de titre ou de ligne
// orpheline.
//
// Chargement de la librairie "docx" (deja utilisee cote serveur/skill
// pour produire des .docx), en UMD, HEBERGEE LOCALEMENT dans le projet
// (modules/cv-editor/docx.umd.js) -- pas de CDN externe, contrairement a
// chargerLibrairieHtmlDocx() (html-docx-js) qui en depend encore.
// Choix delibere pour ce fichier precis : le public de l'application
// peut se trouver sur des reseaux instables, restreints ou hors ligne
// (postes en acces libre, structures associatives...) -- l'export Word
// natif ne doit jamais dependre d'une ressource externe joignable ou
// non au moment du clic.
// ============================================================

var _promesseLibrairieDocxNatif = null;
// TACHE (Option apercu integre : docx-preview) : docx-preview (utilisee
// pour AFFICHER un .docx a l'ecran) et docx (utilisee ici pour le
// GENERER) exposent toutes les deux, dans leurs versions distribuees en
// UMD, une variable globale nommee "window.docx" -- charger la seconde
// APRES la premiere ecraserait silencieusement la reference dont ce
// fichier a besoin. Protection : des que docx-js est chargee, sa
// reference est capturee UNE FOIS dans _referenceDocxJS, independamment
// de ce que "window.docx" devient ensuite. Toutes les fonctions de ce
// fichier utilisent cette reference protegee, jamais window.docx
// directement.
var _referenceDocxJS = null;
function chargerLibrairieDocxNatif() {
  if (_referenceDocxJS) { return Promise.resolve(_referenceDocxJS); }
  if (_promesseLibrairieDocxNatif) { return _promesseLibrairieDocxNatif; }
  _promesseLibrairieDocxNatif = new Promise(function (resolve, reject) {
    if (window.docx && window.docx.Document && window.docx.Packer) { _referenceDocxJS = window.docx; resolve(_referenceDocxJS); return; }
    var script = document.createElement('script');
    script.src = 'modules/cv-editor/docx.umd.js';
    script.onload = function () {
      if (window.docx && window.docx.Document && window.docx.Packer) { _referenceDocxJS = window.docx; resolve(_referenceDocxJS); }
      else { reject(new Error('Librairie docx indisponible.')); }
    };
    script.onerror = function () { reject(new Error('Impossible de charger la librairie docx.')); };
    document.head.appendChild(script);
  });
  return _promesseLibrairieDocxNatif;
}

// Liste des modeles CV couverts par un generateur Word natif -- tout
// modele absent de cette liste retombe sur exporterDocumentEnDocx()
// (conversion HTML generique), voir l'appelant dans app.js.
var MODELES_AVEC_DOCX_NATIF_CV = ['aquarelle', 'moderne-green', 'geometrique', 'ruban', 'trajectoire', 'moderne', 'classique', 'elegant', 'minimaliste', 'institutionnel', 'jeune-diplome'];

// ---- Utilitaires de donnees (meme logique que les {{#if}} des templates) ----
function _dnTexteProfil(objetCV) {
  // Priorite au texte personnalise par la personne, sinon celui propose
  // par l'IA -- reprend la regle documentee dans SCHEMA_CV.md (le moteur
  // de templates HTML, plus limite, affiche les deux a la suite ; ici on
  // peut appliquer la vraie regle).
  var p = objetCV.profil || {};
  return (p.profilUtilisateur && p.profilUtilisateur.trim()) || (p.profilIA && p.profilIA.trim()) || '';
}
function _dnListe(valeur) { return Array.isArray(valeur) ? valeur.filter(Boolean) : []; }
function _dnTexteJoint(valeur) { return Array.isArray(valeur) ? valeur.filter(Boolean).join(', ') : (valeur || ''); }

// ============================================================
// Constructeur generique : mise en page "deux colonnes" (bandeau
// lateral + contenu principal), utilise par Aquarelle, Moderne Vert,
// Geometrique et Ruban -- seule la palette et le style du bandeau
// lateral changent (voir GENERATEURS_DOCX_NATIFS_CV plus bas).
//
// opts.styleBandeau :
//   'teinte'  -> fond clair, texte fonce (Aquarelle, Moderne Vert)
//   'plein'   -> fond sature, texte blanc (Geometrique)
//   'bordure' -> pas de fond, simple bordure verticale coloree (Ruban)
// ============================================================
function _dnConstruireDeuxColonnes(docx, objetCV, opts) {
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, ImageRun = docx.ImageRun, Table = docx.Table, TableRow = docx.TableRow,
    TableCell = docx.TableCell, WidthType = docx.WidthType, ShadingType = docx.ShadingType,
    BorderStyle = docx.BorderStyle, AlignmentType = docx.AlignmentType, LevelFormat = docx.LevelFormat,
    VerticalAlign = docx.VerticalAlign;

  var PRIMAIRE = opts.primaire;
  var TEXTE_SIDEBAR = opts.styleBandeau === 'plein' ? 'FFFFFF' : (opts.texteSidebar || '1B2340');
  var TEXTE_PRINCIPAL = opts.textePrincipal || '1F2937';
  var AUCUNE_BORDURE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

  function titreSidebar(texte) {
    var props = { spacing: { before: 260, after: 100 }, children: [ new TextRun({ text: texte.toUpperCase(), bold: true, color: TEXTE_SIDEBAR, size: 17, font: opts.police || 'Calibri' }) ] };
    props.border = { bottom: { color: opts.styleBandeau === 'plein' ? 'FFFFFF' : PRIMAIRE, space: 2, style: BorderStyle.SINGLE, size: 8 } };
    return new Paragraph(props);
  }
  function titrePrincipal(texte) {
    return new Paragraph({ spacing: { before: 260, after: 120 }, children: [ new TextRun({ text: texte.toUpperCase(), bold: true, color: PRIMAIRE, size: 20, font: opts.police || 'Calibri' }) ] });
  }
  function texteSimple(texte, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 100 },
      children: [ new TextRun({ text: texte, size: o.size || 18, italics: !!o.italics, bold: !!o.bold, color: o.color || TEXTE_PRINCIPAL, font: 'Calibri' }) ] });
  }
  function texteSidebarLigne(texte, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 100 },
      children: [ new TextRun({ text: texte, size: o.size || 17, italics: !!o.italics, bold: !!o.bold, color: TEXTE_SIDEBAR, font: 'Calibri' }) ] });
  }
  function puce(texte, refNumerotation, couleurPuce, taille) {
    return new Paragraph({ numbering: { reference: refNumerotation, level: 0 }, spacing: { after: 60 },
      children: [ new TextRun({ text: texte, size: taille || 18, color: couleurPuce, font: 'Calibri' }) ] });
  }

  var refPucesSidebar = 'puces-sidebar-cv';
  var refPucesPrincipal = 'puces-principal-cv';

  // ---- Colonne laterale ----
  var contenuSidebar = [];
  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};
  // TACHE (retour utilisateur : "je veux l'option photo pour tous les CV,
  // pas que pour le dernier modele") : meme mecanisme que Chic/Mini CV
  // (_dnDataUrlVersOctets/_dnTypeImagePhoto, deja globales, miniCvA5.js)
  // -- photo carree, silencieusement absente si non incluse.
  var octetsPhoto = (typeof _dnDataUrlVersOctets === 'function') ? _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url) : null;
  if (octetsPhoto) {
    contenuSidebar.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [ new ImageRun({ data: octetsPhoto, transformation: { width: 80, height: 80 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ] }));
  }
  if (identite.telephone || identite.email || identite.adresse || permis.possede) {
    contenuSidebar.push(titreSidebar('Coordonnées'));
    if (identite.telephone) { contenuSidebar.push(texteSidebarLigne(identite.telephone)); }
    if (identite.email) { contenuSidebar.push(texteSidebarLigne(identite.email)); }
    if (identite.adresse) { contenuSidebar.push(texteSidebarLigne(identite.adresse + (identite.ville ? ' ' + identite.ville : ''), { after: 100 })); }
    if (permis.possede) {
      var texteVehicule = permis.vehicule ? ' — véhicule personnel' : '';
      contenuSidebar.push(texteSidebarLigne('Permis ' + _dnTexteJoint(permis.categories) + texteVehicule, { after: 100 }));
    }
  }
  var formations = _dnListe(objetCV.formations);
  if (formations.length) {
    contenuSidebar.push(titreSidebar('Formations'));
    formations.forEach(function (f) {
      contenuSidebar.push(texteSidebarLigne(f.niveau + (f.intitule ? ' — ' + f.intitule : ''), { bold: true, after: 20 }));
      if (f.etablissement || f.annee) {
        contenuSidebar.push(texteSidebarLigne([f.etablissement, f.annee].filter(Boolean).join(' · '), { italics: true, size: 16, after: 100 }));
      }
    });
  }
  var langues = _dnListe(objetCV.langues);
  if (langues.length) {
    contenuSidebar.push(titreSidebar('Langues'));
    langues.forEach(function (l) { contenuSidebar.push(texteSidebarLigne(l.langue + ' — ' + l.niveau)); });
  }
  // TACHE (retour utilisateur : une seule categorie "Competences
  // professionnelles" au lieu de savoir/savoir-faire/savoir-etre separes)
  // : aligne ce modele sur les 2 autres (_dnConstruireTrajectoire,
  // _dnConstruireUneColonne), qui fusionnaient deja tout. Plus de
  // categorisation fine a l'affichage -- un recruteur lit une seule
  // liste de competences pertinentes, pas une taxonomie interne.
  var loisirsTexte = _dnTexteJoint(objetCV.loisirs);
  if (loisirsTexte) {
    contenuSidebar.push(titreSidebar("Centres d'intérêt"));
    contenuSidebar.push(texteSidebarLigne(loisirsTexte));
  }
  var engagementsTexte = _dnTexteJoint(objetCV.engagements);
  if (engagementsTexte) {
    contenuSidebar.push(titreSidebar('Engagements'));
    contenuSidebar.push(texteSidebarLigne(engagementsTexte));
  }

  // ---- Colonne principale ----
  var contenuPrincipal = [];
  var texteProfil = _dnTexteProfil(objetCV);
  if (texteProfil) {
    contenuPrincipal.push(titrePrincipal('Profil'));
    contenuPrincipal.push(texteSimple(texteProfil, { size: 18, after: 160 }));
  }
  var competencesToutes = _dnListe(objetCV.competences && objetCV.competences.savoirFaire)
    .concat(_dnListe(objetCV.competences && objetCV.competences.savoirEtre))
    .concat(_dnListe(objetCV.competences && objetCV.competences.savoirs));
  if (competencesToutes.length) {
    contenuPrincipal.push(titrePrincipal('Compétences professionnelles'));
    competencesToutes.forEach(function (c) { contenuPrincipal.push(puce(c, refPucesPrincipal, PRIMAIRE, 18)); });
  }
  var experiences = _dnListe(objetCV.experiences);
  if (experiences.length) {
    contenuPrincipal.push(titrePrincipal('Expérience professionnelle'));
    experiences.forEach(function (e) {
      contenuPrincipal.push(texteSimple(e.poste, { bold: true, size: 19, after: 20 }));
      var meta = [e.entreprise, [e.dateDebut, e.dateFin].filter(Boolean).join(' - '), e.contrat].filter(Boolean).join(' · ');
      contenuPrincipal.push(texteSimple(meta, { italics: true, size: 17, color: PRIMAIRE, after: 60 }));
      if (e.missions) { contenuPrincipal.push(puce(e.missions, refPucesPrincipal, PRIMAIRE, 17)); }
    });
  }
  var experiencesPerso = _dnListe(objetCV.experiencesPersonnelles);
  if (experiencesPerso.length) {
    contenuPrincipal.push(titrePrincipal('Expériences personnelles'));
    experiencesPerso.forEach(function (e) {
      contenuPrincipal.push(texteSimple(e.intitule, { bold: true, size: 18, after: 20 }));
      if (e.detail) { contenuPrincipal.push(texteSimple(e.detail, { italics: true, size: 16, color: '6B7280', after: 60 })); }
    });
  }
  var certifications = _dnListe(objetCV.certifications);
  if (certifications.length) {
    contenuPrincipal.push(titrePrincipal('Certifications'));
    certifications.forEach(function (c) { contenuPrincipal.push(puce(c, refPucesPrincipal, PRIMAIRE, 18)); });
  }

  // TACHE (correction bug : fonds de couleur perdus) : docx construit le
  // XML de la cellule DANS LE CONSTRUCTEUR -- modifier .options apres
  // coup (comme le faisait ce fichier jusqu'ici) n'a aucun effet sur le
  // rendu final. Toutes les options (shading, bordures, marges) doivent
  // donc etre calculees AVANT le new TableCell(), puis passees en un
  // seul appel.
  var optionsCelluleSidebar = {
    width: { size: 3400, type: WidthType.DXA },
    margins: { top: 200, bottom: 200, left: 200, right: 200 },
    verticalAlign: VerticalAlign.TOP,
    children: contenuSidebar
  };
  if (opts.styleBandeau === 'teinte' || opts.styleBandeau === 'plein') {
    optionsCelluleSidebar.shading = { type: ShadingType.CLEAR, color: 'auto', fill: opts.fondSidebar };
  } else if (opts.styleBandeau === 'bordure') {
    optionsCelluleSidebar.borders = { right: { style: BorderStyle.SINGLE, size: 24, color: opts.primaire } };
    optionsCelluleSidebar.margins.right = 260;
  }
  var celluleSidebar = new TableCell(optionsCelluleSidebar);

  var doc = new docx.Document({
    numbering: { config: [
      { reference: refPucesSidebar, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 288, hanging: 216 } } } } ] },
      { reference: refPucesPrincipal, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 288, hanging: 216 } } } } ] }
    ] },
    sections: [ {
      properties: { page: { margin: _dnMargePage({ top: 560, bottom: 560, left: 560, right: 560 }, opts.formatPage), size: opts.formatPage === 'A5' ? _dnTaillePageA5() : undefined } },
      children: [
        new Paragraph({ spacing: { after: 40 }, children: [ new TextRun({ text: (identite.prenom || '') + ' ' + (identite.nom || ''), bold: true, size: 40, color: opts.couleurNom || PRIMAIRE, font: opts.police || 'Calibri' }) ] }),
      ].concat(objetCV.objectifProfessionnel ? [ new Paragraph({
        border: { bottom: { color: opts.styleBandeau === 'bordure' ? (opts.secondaire || PRIMAIRE) : PRIMAIRE, space: 4, style: BorderStyle.SINGLE, size: 12 } },
        spacing: { after: 200 },
        children: [ new TextRun({ text: objetCV.objectifProfessionnel.toUpperCase(), bold: true, color: opts.styleBandeau === 'plein' ? '1B2340' : TEXTE_PRINCIPAL, size: 19, font: 'Calibri', characterSpacing: 20 }) ]
      }) ] : []).concat([
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [3400, 6600],
          borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
          rows: [ new TableRow({ children: [
            celluleSidebar,
            new TableCell({ width: { size: 6600, type: WidthType.DXA }, margins: { top: 200, bottom: 200, left: 260, right: 100 }, verticalAlign: VerticalAlign.TOP, children: contenuPrincipal })
          ] }) ]
        })
      ])
    } ]
  });
  return doc;
}

// ============================================================
// Constructeur specifique : "Trajectoire" (frise chronologique) --
// structure trop differente des 4 autres modeles pour partager le
// constructeur ci-dessus (bandeaux de section pleine largeur, une ligne
// date/detail par experience et formation).
// ============================================================
// TACHE (refonte "Aperçu et finalisation" : palette de couleurs) : opts
// optionnel ajoute ici, retro-compatible -- tout appel existant a 2
// arguments (docx, objetCV) continue de produire EXACTEMENT le meme
// resultat qu'avant (memes couleurs par defaut MARINE/MARINE_CLAIR).
function _dnConstruireTrajectoire(docx, objetCV, opts) {
  opts = opts || {};
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, ImageRun = docx.ImageRun, Table = docx.Table, TableRow = docx.TableRow,
    TableCell = docx.TableCell, WidthType = docx.WidthType, ShadingType = docx.ShadingType,
    BorderStyle = docx.BorderStyle, AlignmentType = docx.AlignmentType, LevelFormat = docx.LevelFormat,
    VerticalAlign = docx.VerticalAlign;

  var MARINE = opts.primaire || '14213D', MARINE_CLAIR = opts.secondaire || '3A5DAE', TEXTE = '1F2937', TEXTE_MUTED = '6B7280', BLANC = 'FFFFFF';
  var AUCUNE_BORDURE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  var refPuces = 'puces-trajectoire';

  function titreSidebar(texte) {
    return new Paragraph({ spacing: { before: 220, after: 90 }, border: { bottom: { color: MARINE, space: 2, style: BorderStyle.SINGLE, size: 8 } },
      children: [ new TextRun({ text: texte.toUpperCase(), bold: true, color: MARINE, size: 16, font: 'Calibri' }) ] });
  }
  function texteSimple(texte, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 100 },
      children: [ new TextRun({ text: texte, size: o.size || 16, italics: !!o.italics, bold: !!o.bold, color: o.color || TEXTE, font: 'Calibri' }) ] });
  }
  function puceSidebar(texte) {
    return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 50 }, children: [ new TextRun({ text: texte, size: 15, color: TEXTE, font: 'Calibri' }) ] });
  }
  function bandeauSection(texte) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
      rows: [ new TableRow({ children: [ new TableCell({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: MARINE },
        margins: { top: 100, bottom: 100, left: 150, right: 150 },
        children: [ new Paragraph({ children: [ new TextRun({ text: texte.toUpperCase(), bold: true, color: BLANC, size: 18, font: 'Calibri' }) ] }) ]
      }) ] }) ]
    });
  }
  function ligneFrise(dateTexte, titrePastille, sousTexte, detailTexte) {
    var contenuDroite = [ new Paragraph({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: MARINE }, spacing: { after: 60 },
      children: [ new TextRun({ text: titrePastille, bold: true, color: BLANC, size: 18, font: 'Calibri' }) ] }) ];
    if (sousTexte) { contenuDroite.push(new Paragraph({ spacing: { after: 60 }, children: [ new TextRun({ text: sousTexte, italics: true, color: TEXTE_MUTED, size: 16, font: 'Calibri' }) ] })); }
    if (detailTexte) { contenuDroite.push(new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 60 }, children: [ new TextRun({ text: detailTexte, size: 16, color: TEXTE, font: 'Calibri' }) ] })); }
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [1400, 8600],
      borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
      rows: [ new TableRow({ children: [
        new TableCell({ width: { size: 1400, type: WidthType.DXA }, margins: { top: 60, right: 100 }, verticalAlign: VerticalAlign.TOP,
          children: [ new Paragraph({ children: [ new TextRun({ text: dateTexte, bold: true, color: MARINE_CLAIR, size: 15, font: 'Calibri' }) ] }) ] }),
        new TableCell({ width: { size: 8600, type: WidthType.DXA }, margins: { bottom: 120 }, verticalAlign: VerticalAlign.TOP, children: contenuDroite })
      ] }) ]
    });
  }

  var identite = objetCV.identite || {};
  var contenuSidebar = [];
  var octetsPhotoTrajectoire = (typeof _dnDataUrlVersOctets === 'function') ? _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url) : null;
  if (octetsPhotoTrajectoire) {
    contenuSidebar.push(new Paragraph({ spacing: { after: 140 },
      children: [ new ImageRun({ data: octetsPhotoTrajectoire, transformation: { width: 70, height: 70 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ] }));
  }
  contenuSidebar.push(new Paragraph({ spacing: { after: 20 }, children: [ new TextRun({ text: (identite.prenom || '') + ' ' + (identite.nom || ''), bold: true, size: 30, color: TEXTE, font: 'Calibri' }) ] }));
  if (objetCV.objectifProfessionnel) {
    contenuSidebar.push(new Paragraph({ spacing: { after: 200 }, children: [ new TextRun({ text: objetCV.objectifProfessionnel.toUpperCase(), bold: true, color: MARINE_CLAIR, size: 15, font: 'Calibri', characterSpacing: 10 }) ] }));
  }
  var permis = objetCV.permis || {};
  if (identite.telephone || identite.email || identite.adresse || permis.possede) {
    contenuSidebar.push(titreSidebar('Contact'));
    if (identite.telephone) { contenuSidebar.push(texteSimple(identite.telephone, { size: 15 })); }
    if (identite.email) { contenuSidebar.push(texteSimple(identite.email, { size: 15 })); }
    if (identite.adresse) { contenuSidebar.push(texteSimple(identite.adresse + (identite.ville ? ' ' + identite.ville : ''), { size: 15, after: 100 })); }
  }
  var texteProfil = _dnTexteProfil(objetCV);
  if (texteProfil) { contenuSidebar.push(titreSidebar('Profil')); contenuSidebar.push(texteSimple(texteProfil, { size: 15, after: 120 })); }
  var langues = _dnListe(objetCV.langues);
  if (langues.length) { contenuSidebar.push(titreSidebar('Langue')); langues.forEach(function (l) { contenuSidebar.push(texteSimple(l.langue + ' — ' + l.niveau, { size: 15 })); }); }
  // TACHE (retour utilisateur : une seule categorie "Competences") :
  // les savoirs manquaient ici (seuls savoirFaire+savoirEtre etaient
  // fusionnes) -- ajoutes pour une liste vraiment complete, coherente
  // avec les 2 autres modeles.
  var competencesToutes = _dnListe(objetCV.competences && objetCV.competences.savoirFaire)
    .concat(_dnListe(objetCV.competences && objetCV.competences.savoirEtre))
    .concat(_dnListe(objetCV.competences && objetCV.competences.savoirs));
  if (competencesToutes.length) { contenuSidebar.push(titreSidebar('Compétences')); competencesToutes.forEach(function (c) { contenuSidebar.push(puceSidebar(c)); }); }
  var loisirsTexte = _dnTexteJoint(objetCV.loisirs);
  if (loisirsTexte) { contenuSidebar.push(titreSidebar("Centres d'intérêt")); contenuSidebar.push(texteSimple(loisirsTexte, { size: 15 })); }

  var contenuPrincipal = [];
  var experiences = _dnListe(objetCV.experiences);
  if (experiences.length) {
    contenuPrincipal.push(bandeauSection('Expérience professionnelle'));
    contenuPrincipal.push(new Paragraph({ children: [] }));
    experiences.forEach(function (e) {
      var dateTexte = 'De ' + (e.dateDebut || '') + '\nà ' + (e.dateFin || 'aujourd\'hui');
      contenuPrincipal.push(ligneFrise(dateTexte, e.poste + (e.entreprise ? ' — ' + e.entreprise : ''), e.contrat, e.missions));
      contenuPrincipal.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    });
  }
  var formations = _dnListe(objetCV.formations);
  if (formations.length) {
    contenuPrincipal.push(bandeauSection('Formation'));
    contenuPrincipal.push(new Paragraph({ children: [] }));
    formations.forEach(function (f) {
      contenuPrincipal.push(ligneFrise(f.annee || '', f.niveau + (f.intitule ? ' — ' + f.intitule : ''), f.etablissement, null));
      contenuPrincipal.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    });
  }

  return new docx.Document({
    numbering: { config: [ { reference: refPuces, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 260, hanging: 200 } } } } ] } ] },
    sections: [ {
      properties: { page: { margin: _dnMargePage({ top: 560, bottom: 560, left: 560, right: 560 }, opts.formatPage), size: opts.formatPage === 'A5' ? _dnTaillePageA5() : undefined } },
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [3000, 7000],
          borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
          rows: [ new TableRow({ children: [
            new TableCell({ width: { size: 3000, type: WidthType.DXA }, margins: { top: 0, bottom: 200, left: 0, right: 200 }, verticalAlign: VerticalAlign.TOP, children: contenuSidebar }),
            new TableCell({ width: { size: 7000, type: WidthType.DXA }, margins: { top: 0, bottom: 200, left: 0, right: 0 }, verticalAlign: VerticalAlign.TOP, children: contenuPrincipal })
          ] }) ]
        })
      ]
    } ]
  });
}

// ============================================================
// Constructeur generique : mise en page "une colonne" (pas de bandeau
// lateral), utilise par Classique, Minimaliste, Institutionnel, Elegant
// et Jeune diplome. Contrairement aux modeles deux colonnes,
// Competences/Qualites professionnelles/Savoirs sont fusionnes en une
// seule rubrique "Competences" (choix de simplicite, coherent avec des
// modeles sobres a une colonne, ou une telle subdivision n'a pas de
// sens visuel).
//
// opts.ordre permet de reordonner les rubriques (utilise par Jeune
// diplome, qui met les Formations avant les Experiences).
//
// TACHE (retour utilisateur : photo pour tous les modeles) : photo
// desormais supportee -- carree, centree, en tete de page (avant le nom).
// Meme mecanisme que Chic/Mini CV (_dnDataUrlVersOctets/_dnTypeImagePhoto).
// ============================================================
function _dnConstruireUneColonne(docx, objetCV, opts) {
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, ImageRun = docx.ImageRun, AlignmentType = docx.AlignmentType,
    BorderStyle = docx.BorderStyle, LevelFormat = docx.LevelFormat;

  var PRIMAIRE = opts.primaire, TEXTE = opts.texte || '1A1A1A', SECONDAIRE = opts.secondaire || '666666';
  var refPuces = 'puces-une-colonne';

  function titreSection(texte) {
    var props = { spacing: { before: 260, after: 120 },
      children: [ new TextRun({ text: texte.toUpperCase(), bold: true, color: PRIMAIRE, size: 20, font: opts.police || 'Calibri', characterSpacing: opts.espacementTitre || 0 }) ] };
    if (opts.soulignerTitres) { props.border = { bottom: { color: PRIMAIRE, space: 3, style: BorderStyle.SINGLE, size: 6 } }; }
    return new Paragraph(props);
  }
  function texte(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 100 }, alignment: o.centre ? AlignmentType.CENTER : undefined,
      children: [ new TextRun({ text: t, size: o.size || 19, italics: !!o.italics, bold: !!o.bold, color: o.color || TEXTE, font: 'Calibri' }) ] });
  }
  function puce(t) {
    return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 60 }, children: [ new TextRun({ text: t, size: 19, color: TEXTE, font: 'Calibri' }) ] });
  }

  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};
  var enfants = [];

  // ---- En-tete ----
  // TACHE (photo pour tous les modeles) : toujours centree ici (meme si
  // opts.centrerEntete est false pour le reste de l'en-tete) -- une photo
  // alignee a gauche seule, sans colonne pour l'accompagner, ne serait
  // pas naturelle visuellement.
  var octetsPhotoUneColonne = (typeof _dnDataUrlVersOctets === 'function') ? _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url) : null;
  if (octetsPhotoUneColonne) {
    enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [ new ImageRun({ data: octetsPhotoUneColonne, transformation: { width: 84, height: 84 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ] }));
  }
  enfants.push(new Paragraph({ alignment: opts.centrerEntete ? AlignmentType.CENTER : undefined, spacing: { after: 40 },
    children: [ new TextRun({ text: (identite.prenom || '') + ' ' + (identite.nom || ''), bold: true, size: 44, color: PRIMAIRE, font: opts.police || 'Calibri' }) ] }));
  if (objetCV.objectifProfessionnel) {
    enfants.push(new Paragraph({ alignment: opts.centrerEntete ? AlignmentType.CENTER : undefined, spacing: { after: 120 },
      children: [ new TextRun({ text: objetCV.objectifProfessionnel, bold: true, italics: !!opts.objectifItalique, color: SECONDAIRE, size: 21, font: 'Calibri' }) ] }));
  }
  var ligneCoordonnees = [identite.telephone, identite.email, [identite.adresse, identite.ville].filter(Boolean).join(' ')].filter(Boolean);
  if (permis.possede) { ligneCoordonnees.push('Permis ' + _dnTexteJoint(permis.categories) + (permis.vehicule ? ' — véhicule personnel' : '')); }
  if (ligneCoordonnees.length) {
    enfants.push(new Paragraph({ alignment: opts.centrerEntete ? AlignmentType.CENTER : undefined,
      border: opts.soulignerTitres ? undefined : { bottom: { color: SECONDAIRE, space: 6, style: BorderStyle.SINGLE, size: 6 } },
      spacing: { after: 240 }, children: [ new TextRun({ text: ligneCoordonnees.join(' · '), size: 18, color: SECONDAIRE, font: 'Calibri' }) ] }));
  }

  // ---- Rubriques disponibles ----
  var blocs = {
    profil: function () {
      var t = _dnTexteProfil(objetCV);
      return t ? [ titreSection('Profil'), texte(t, { after: 160 }) ] : [];
    },
    competences: function () {
      var tout = _dnListe(objetCV.competences && objetCV.competences.savoirFaire)
        .concat(_dnListe(objetCV.competences && objetCV.competences.savoirEtre))
        .concat(_dnListe(objetCV.competences && objetCV.competences.savoirs));
      if (!tout.length) { return []; }
      return [ titreSection('Compétences') ].concat(tout.map(puce));
    },
    experiences: function () {
      var exp = _dnListe(objetCV.experiences);
      if (!exp.length) { return []; }
      var r = [ titreSection('Expérience professionnelle') ];
      exp.forEach(function (e) {
        r.push(texte(e.poste + (e.entreprise ? ' — ' + e.entreprise : ''), { bold: true, size: 20, after: 20 }));
        var meta = [e.lieu, [e.dateDebut, e.dateFin].filter(Boolean).join(' - '), e.contrat].filter(Boolean).join(' · ');
        if (meta) { r.push(texte(meta, { italics: true, size: 18, color: SECONDAIRE, after: 60 })); }
        if (e.missions) { r.push(puce(e.missions)); }
      });
      return r;
    },
    experiencesPersonnelles: function () {
      var exp = _dnListe(objetCV.experiencesPersonnelles);
      if (!exp.length) { return []; }
      var r = [ titreSection('Expériences personnelles') ];
      exp.forEach(function (e) {
        r.push(texte(e.intitule, { bold: true, size: 19, after: 20 }));
        if (e.detail) { r.push(texte(e.detail, { italics: true, size: 18, color: SECONDAIRE, after: 60 })); }
      });
      return r;
    },
    formations: function () {
      var f = _dnListe(objetCV.formations);
      if (!f.length) { return []; }
      var r = [ titreSection('Formations') ];
      f.forEach(function (fo) {
        r.push(texte(fo.niveau + (fo.intitule ? ' — ' + fo.intitule : ''), { bold: true, size: 19, after: 20 }));
        var meta = [fo.etablissement, fo.annee].filter(Boolean).join(' · ');
        if (meta) { r.push(texte(meta, { italics: true, size: 18, color: SECONDAIRE, after: 100 })); }
      });
      return r;
    },
    langues: function () {
      var l = _dnListe(objetCV.langues);
      if (!l.length) { return []; }
      return [ titreSection('Langues') ].concat(l.map(function (x) { return texte(x.langue + ' — ' + x.niveau, { after: 60 }); }));
    },
    certifications: function () {
      var c = _dnListe(objetCV.certifications);
      return c.length ? [ titreSection('Certifications') ].concat(c.map(puce)) : [];
    },
    loisirs: function () {
      var t = _dnTexteJoint(objetCV.loisirs);
      return t ? [ titreSection("Centres d'intérêt"), texte(t) ] : [];
    },
    engagements: function () {
      var t = _dnTexteJoint(objetCV.engagements);
      return t ? [ titreSection('Engagements'), texte(t) ] : [];
    }
  };

  var ordre = opts.ordre || ['profil', 'competences', 'experiences', 'experiencesPersonnelles', 'formations', 'langues', 'certifications', 'loisirs', 'engagements'];
  ordre.forEach(function (cle) { enfants = enfants.concat(blocs[cle] ? blocs[cle]() : []); });

  return new docx.Document({
    numbering: { config: [ { reference: refPuces, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 288, hanging: 216 } } } } ] } ] },
    sections: [ { properties: { page: { margin: _dnMargePage({ top: 720, bottom: 720, left: 900, right: 900 }, opts.formatPage), size: opts.formatPage === 'A5' ? _dnTaillePageA5() : undefined } }, children: enfants } ]
  });
}

// ---- Un generateur par modele (palette alignee sur le template HTML) ----
var GENERATEURS_DOCX_NATIFS_CV = {
  'aquarelle': function (docx, objetCV) {
    return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: 'C08457', fondSidebar: 'FBF5EC', texteSidebar: '1B2340', styleBandeau: 'teinte', police: 'Georgia', couleurNom: '6B4A3A' });
  },
  'moderne-green': function (docx, objetCV) {
    return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: '3FA34D', fondSidebar: 'EAF3E0', texteSidebar: '1f2a1f', styleBandeau: 'teinte' });
  },
  'geometrique': function (docx, objetCV) {
    return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: '4B57C9', fondSidebar: '6D89EA', styleBandeau: 'plein' });
  },
  'ruban': function (docx, objetCV) {
    return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: 'E2006E', secondaire: 'F7A8C4', styleBandeau: 'bordure', texteSidebar: '1F2937' });
  },
  'trajectoire': function (docx, objetCV) {
    return _dnConstruireTrajectoire(docx, objetCV);
  },
  // ---- Modeles deux colonnes supplementaires (constructeur partage) ----
  'moderne': function (docx, objetCV) {
    return _dnConstruireDeuxColonnes(docx, objetCV, { primaire: '2563EB', fondSidebar: 'F3F4F6', texteSidebar: '222222', styleBandeau: 'teinte', police: 'Calibri' });
  },
  // ---- Modeles une colonne (constructeur partage) ----
  'classique': function (docx, objetCV) {
    return _dnConstruireUneColonne(docx, objetCV, { primaire: '000000', texte: '1A1A1A', secondaire: '666666', police: 'Georgia' });
  },
  'minimaliste': function (docx, objetCV) {
    return _dnConstruireUneColonne(docx, objetCV, { primaire: '1A1A1A', texte: '1A1A1A', secondaire: '777777', police: 'Calibri' });
  },
  'institutionnel': function (docx, objetCV) {
    return _dnConstruireUneColonne(docx, objetCV, { primaire: '1A1A2E', texte: '1A1A2E', secondaire: '555566', police: 'Times New Roman', soulignerTitres: true });
  },
  'elegant': function (docx, objetCV) {
    return _dnConstruireUneColonne(docx, objetCV, { primaire: '1F2937', texte: '1F2937', secondaire: 'D4AF37', police: 'Georgia', centrerEntete: true, objectifItalique: true, soulignerTitres: true });
  },
  'jeune-diplome': function (docx, objetCV) {
    return _dnConstruireUneColonne(docx, objetCV, { primaire: '1D4ED8', texte: '1E293B', secondaire: '3B82F6', police: 'Calibri',
      ordre: ['profil', 'formations', 'experiences', 'experiencesPersonnelles', 'engagements', 'competences', 'langues', 'certifications', 'permis', 'loisirs'] });
  }
};

// ============================================================
// Point d'entree public, appele depuis app.js.
// Retourne une promesse resolue avec un Blob .docx pret a telecharger,
// ou rejetee si le modele n'est pas couvert ou si la librairie ne charge
// pas (dans les deux cas, l'appelant retombe sur exporterDocumentEnDocx()).
// ============================================================
function genererDocxNatifCV(modeleId, objetCV) {
  var generateur = GENERATEURS_DOCX_NATIFS_CV[modeleId];
  if (!generateur) { return Promise.reject(new Error('Pas de generateur Word natif pour ce modele.')); }
  return chargerLibrairieDocxNatif().then(function (docx) {
    var document = generateur(docx, objetCV);
    return docx.Packer.toBlob(document);
  });
}
