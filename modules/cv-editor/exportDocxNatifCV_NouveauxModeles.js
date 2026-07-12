// ============================================================
// exportDocxNatifCV_NouveauxModeles.js
// ------------------------------------------------------------
// TACHE (nouveaux modeles CV, absents de la base actuelle) : 3 vraies
// structures inedites (pas des variantes de couleur d'un modele
// existant) -- premier lot d'une serie destinee a couvrir les 15
// categories evoquees, en consolidant les besoins similaires sur un
// petit nombre de structures reellement differentes.
//
// Charge APRES exportDocxNatifCV.js (voir index.html) : etend
// GENERATEURS_DOCX_NATIFS_CV et MODELES_AVEC_DOCX_NATIF_CV (declares en
// "var", donc globaux) plutot que de dupliquer ou remplacer le fichier
// existant -- risque de regression minimal, fichier existant intact.
//
// Nouveaute technique : pastilles de competences (vrai fond colore sur
// le texte, pas une simple puce) -- utilise le shading de caractere de
// docx-js, verifie manuellement avant construction (voir historique).
//
// 1. "impact"  -- deux colonnes, sobre-mais-distinctif, competences en
//    pastilles, pense pour un public large (services/commerce/
//    administration) qui veut sortir un peu du CV noir et blanc sans
//    prendre de risque.
// 2. "dispo"   -- une colonne compacte, bandeau de disponibilite (permis/
//    vehicule/langues) mis en avant en tete, pense pour saisonnier/
//    hotellerie-restauration/grande distribution : le recruteur presse
//    voit l'essentiel en 3 secondes.
// 3. "creatif" -- bandeau plein-largeur colore + colonne laterale
//    teintee, pense pour communication/design/marketing : plus
//    d'affirmation visuelle, tout en restant un document Word standard
//    (aucune image, aucune zone de texte -- compatible partout).
// ============================================================

// ---- Utilitaire partage : liste de competences en pastilles colorees ----
function _dnPastilles(docx, items, couleurFond, couleurTexte) {
  var TextRun = docx.TextRun, Paragraph = docx.Paragraph, ShadingType = docx.ShadingType;
  var runs = [];
  items.forEach(function (item, i) {
    runs.push(new TextRun({
      text: ' ' + item + ' ', bold: true, size: 18, color: couleurTexte, font: 'Calibri',
      shading: { type: ShadingType.CLEAR, fill: couleurFond, color: 'auto' }
    }));
    if (i < items.length - 1) { runs.push(new TextRun({ text: '  ', size: 18 })); }
  });
  return new Paragraph({ spacing: { after: 160 }, children: runs });
}

// TACHE (retour utilisateur : Impact/Creatif, retirer le style pastille) :
// meme liste de competences, mais texte gras dans la couleur (celle qui
// servait de fond a la pastille), sans aucun remplissage -- rendu plus
// sobre demande specifiquement pour ces 2 modeles (Dispo garde ses
// pastilles, non concerne par cette demande).
function _dnTexteGrasColore(docx, items, couleur) {
  var TextRun = docx.TextRun, Paragraph = docx.Paragraph;
  var runs = [];
  items.forEach(function (item, i) {
    runs.push(new TextRun({ text: item, bold: true, size: 18, color: couleur, font: 'Calibri' }));
    if (i < items.length - 1) { runs.push(new TextRun({ text: '   ·   ', size: 18, color: couleur })); }
  });
  return new Paragraph({ spacing: { after: 160 }, children: runs });
}

// ============================================================
// 1. "Impact" -- deux colonnes, competences en pastilles
// TACHE (couleurs, voir coloriationDocxNatifCV.js) : opts optionnel,
// fusionne avec les valeurs par defaut ci-dessous -- appel sans opts
// (ou avec {}) = comportement strictement identique a avant.
// ============================================================
function _dnConstruireImpact(docx, objetCV, opts) {
  opts = opts || {};
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, ImageRun = docx.ImageRun, Table = docx.Table, TableRow = docx.TableRow,
    TableCell = docx.TableCell, WidthType = docx.WidthType, ShadingType = docx.ShadingType,
    BorderStyle = docx.BorderStyle, AlignmentType = docx.AlignmentType, LevelFormat = docx.LevelFormat,
    VerticalAlign = docx.VerticalAlign;

  var PRIMAIRE = opts.primaire || '0F172A';   // graphite profond -- titres, nom
  var ACCENT = opts.accent || '0D9488';       // teal -- pastilles, soulignes, accents
  var FOND_SIDEBAR = opts.fondSidebar || 'F1F5F9';
  var TEXTE_SIDEBAR = '0F172A';
  var TEXTE = '1F2937';
  var AUCUNE_BORDURE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  var refPuces = 'puces-impact';

  function titreSidebar(t) {
    return new Paragraph({ spacing: { before: 240, after: 90 }, border: { bottom: { color: ACCENT, space: 2, style: BorderStyle.SINGLE, size: 10 } },
      children: [ new TextRun({ text: t.toUpperCase(), bold: true, color: TEXTE_SIDEBAR, size: 16, font: 'Calibri' }) ] });
  }
  function titrePrincipal(t) {
    return new Paragraph({ spacing: { before: 240, after: 130 },
      children: [ new TextRun({ text: t.toUpperCase(), bold: true, color: PRIMAIRE, size: 21, font: 'Calibri' }) ] });
  }
  function texteSidebar(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 90 },
      children: [ new TextRun({ text: t, size: o.size || 16, bold: !!o.gras, italics: !!o.italique, color: TEXTE_SIDEBAR, font: 'Calibri' }) ] });
  }
  function texte(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 100 },
      children: [ new TextRun({ text: t, size: o.size || 18, bold: !!o.gras, italics: !!o.italique, color: o.couleur || TEXTE, font: 'Calibri' }) ] });
  }
  function puce(t) {
    return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 60 },
      children: [ new TextRun({ text: t, size: 18, color: TEXTE, font: 'Calibri' }) ] });
  }

  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};

  var sidebar = [];
  var octetsPhotoImpact = (typeof _dnDataUrlVersOctets === 'function') ? _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url) : null;
  if (octetsPhotoImpact) {
    sidebar.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [ new ImageRun({ data: octetsPhotoImpact, transformation: { width: 80, height: 80 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ] }));
  }
  if (identite.telephone || identite.email || identite.adresse || permis.possede) {
    sidebar.push(titreSidebar('Coordonnées'));
    if (identite.telephone) { sidebar.push(texteSidebar(identite.telephone)); }
    if (identite.email) { sidebar.push(texteSidebar(identite.email)); }
    if (identite.adresse) { sidebar.push(texteSidebar(identite.adresse + (identite.ville ? ' ' + identite.ville : ''), { after: 100 })); }
    if (permis.possede) { sidebar.push(texteSidebar('Permis ' + _dnTexteJoint(permis.categories) + (permis.vehicule ? ' — véhicule personnel' : ''), { after: 100 })); }
  }
  var formations = _dnListe(objetCV.formations);
  if (formations.length) {
    sidebar.push(titreSidebar('Formations'));
    formations.forEach(function (f) {
      sidebar.push(texteSidebar(f.niveau + (f.intitule ? ' — ' + f.intitule : ''), { gras: true, after: 20 }));
      if (f.etablissement || f.annee) { sidebar.push(texteSidebar([f.etablissement, f.annee].filter(Boolean).join(' · '), { italique: true, size: 15, after: 100 })); }
    });
  }
  var langues = _dnListe(objetCV.langues);
  if (langues.length) { sidebar.push(titreSidebar('Langues')); langues.forEach(function (l) { sidebar.push(texteSidebar(l.langue + ' — ' + l.niveau)); }); }
  var savoirEtre = _dnListe(objetCV.competences && objetCV.competences.savoirEtre);
  if (savoirEtre.length) { sidebar.push(titreSidebar('Qualités')); sidebar.push(_dnPastilles(docx, savoirEtre, 'E2E8F0', PRIMAIRE)); }
  var loisirsTexte = _dnTexteJoint(objetCV.loisirs);
  if (loisirsTexte) { sidebar.push(titreSidebar("Centres d'intérêt")); sidebar.push(texteSidebar(loisirsTexte)); }
  var engagementsTexte = _dnTexteJoint(objetCV.engagements);
  if (engagementsTexte) { sidebar.push(titreSidebar('Engagements')); sidebar.push(texteSidebar(engagementsTexte)); }

  var principal = [];
  var texteProfil = _dnTexteProfil(objetCV);
  if (texteProfil) { principal.push(titrePrincipal('Profil')); principal.push(texte(texteProfil, { after: 160 })); }
  var savoirFaire = _dnListe(objetCV.competences && objetCV.competences.savoirFaire);
  if (savoirFaire.length) { principal.push(titrePrincipal('Compétences clés')); principal.push(_dnTexteGrasColore(docx, savoirFaire, ACCENT)); }
  var savoirs = _dnListe(objetCV.competences && objetCV.competences.savoirs);
  if (savoirs.length) { principal.push(titrePrincipal('Savoirs')); savoirs.forEach(function (s) { principal.push(puce(s)); }); }
  var experiences = _dnListe(objetCV.experiences);
  if (experiences.length) {
    principal.push(titrePrincipal('Expérience professionnelle'));
    experiences.forEach(function (e) {
      principal.push(texte(e.poste, { gras: true, size: 20, after: 20 }));
      var meta = [e.entreprise, [e.dateDebut, e.dateFin].filter(Boolean).join(' - '), e.contrat].filter(Boolean).join(' · ');
      principal.push(texte(meta, { italique: true, size: 17, couleur: ACCENT, after: 60 }));
      if (e.missions) { principal.push(puce(e.missions)); }
    });
  }
  var experiencesPerso = _dnListe(objetCV.experiencesPersonnelles);
  if (experiencesPerso.length) {
    principal.push(titrePrincipal('Expériences personnelles'));
    experiencesPerso.forEach(function (e) {
      principal.push(texte(e.intitule, { gras: true, after: 20 }));
      if (e.detail) { principal.push(texte(e.detail, { italique: true, size: 16, couleur: '6B7280', after: 60 })); }
    });
  }
  var certifications = _dnListe(objetCV.certifications);
  if (certifications.length) { principal.push(titrePrincipal('Certifications')); certifications.forEach(function (c) { principal.push(puce(c)); }); }

  var identiteEnfants = [
    new Paragraph({ spacing: { after: 40 }, children: [ new TextRun({ text: (identite.prenom || '') + ' ' + (identite.nom || ''), bold: true, size: 40, color: PRIMAIRE, font: 'Calibri' }) ] })
  ];
  if (objetCV.objectifProfessionnel) {
    identiteEnfants.push(new Paragraph({ border: { bottom: { color: ACCENT, space: 4, style: BorderStyle.SINGLE, size: 14 } }, spacing: { after: 220 },
      children: [ new TextRun({ text: objetCV.objectifProfessionnel.toUpperCase(), bold: true, color: ACCENT, size: 20, font: 'Calibri', characterSpacing: 15 }) ] }));
  }

  return new docx.Document({
    numbering: { config: [ { reference: refPuces, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 288, hanging: 216 } } } } ] } ] },
    sections: [ { properties: { page: { margin: _dnMargePage({ top: 560, bottom: 560, left: 560, right: 560 }, opts.formatPage), size: opts.formatPage === 'A5' ? _dnTaillePageA5() : undefined } }, children: identiteEnfants.concat([
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [3400, 6600],
        borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
        rows: [ new TableRow({ children: [
          new TableCell({ width: { size: 3400, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: FOND_SIDEBAR },
            margins: { top: 200, bottom: 200, left: 200, right: 200 }, verticalAlign: VerticalAlign.TOP, children: sidebar }),
          new TableCell({ width: { size: 6600, type: WidthType.DXA }, margins: { top: 200, bottom: 200, left: 260, right: 100 }, verticalAlign: VerticalAlign.TOP, children: principal })
        ] }) ]
      })
    ]) } ]
  });
}

// ============================================================
// 2. "Dispo" -- une colonne compacte, bandeau disponibilite en tete
//    (saisonnier, hotellerie-restauration, grande distribution)
// TACHE (couleurs) : meme principe que _dnConstruireImpact ci-dessus.
// ============================================================
function _dnConstruireDispo(docx, objetCV, opts) {
  opts = opts || {};
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, ImageRun = docx.ImageRun, AlignmentType = docx.AlignmentType,
    BorderStyle = docx.BorderStyle, LevelFormat = docx.LevelFormat, ShadingType = docx.ShadingType;

  var PRIMAIRE = opts.primaire || 'C2410C';   // orange chaleureux -- energique, hotellerie/commerce
  var TEINTE = opts.teinte || 'FFF7ED';       // fond tres clair pour les pastilles de competences
  var TEXTE = '1F2937';
  var TEXTE_MUTED = '6B7280';
  var refPuces = 'puces-dispo';

  function titre(t) {
    return new Paragraph({ spacing: { before: 240, after: 130 }, children: [ new TextRun({ text: t.toUpperCase(), bold: true, color: PRIMAIRE, size: 20, font: 'Calibri' }) ] });
  }
  function texte(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 100 },
      children: [ new TextRun({ text: t, size: o.size || 18, bold: !!o.gras, italics: !!o.italique, color: o.couleur || TEXTE, font: 'Calibri' }) ] });
  }
  function puce(t) {
    return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 60 },
      children: [ new TextRun({ text: t, size: 18, color: TEXTE, font: 'Calibri' }) ] });
  }

  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};
  var enfants = [];
  var octetsPhotoDispo = (typeof _dnDataUrlVersOctets === 'function') ? _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url) : null;
  if (octetsPhotoDispo) {
    enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 },
      children: [ new ImageRun({ data: octetsPhotoDispo, transformation: { width: 78, height: 78 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ] }));
  }

  enfants.push(new Paragraph({ spacing: { after: 40 }, children: [ new TextRun({ text: (identite.prenom || '') + ' ' + (identite.nom || ''), bold: true, size: 40, color: PRIMAIRE, font: 'Calibri' }) ] }));
  if (objetCV.objectifProfessionnel) {
    enfants.push(new Paragraph({ spacing: { after: 160 }, children: [ new TextRun({ text: objetCV.objectifProfessionnel, bold: true, color: TEXTE, size: 21, font: 'Calibri' }) ] }));
  }

  // ---- Bandeau "en un coup d'oeil" : ce qu'un recruteur presse cherche
  // en premier pour du saisonnier/hotellerie -- disponibilite, permis/
  // vehicule, langues -- uniquement ce qui est reellement renseigne. ----
  var badgesDispo = [];
  if (permis.possede) { badgesDispo.push('Permis ' + _dnTexteJoint(permis.categories) + (permis.vehicule ? ' + véhicule' : '')); }
  var langues = _dnListe(objetCV.langues);
  if (langues.length) { badgesDispo.push(langues.map(function (l) { return l.langue; }).join(', ')); }
  if (identite.telephone) { badgesDispo.push(identite.telephone); }
  if (identite.email) { badgesDispo.push(identite.email); }
  if (badgesDispo.length) {
    enfants.push(_dnPastilles(docx, badgesDispo, PRIMAIRE, 'FFFFFF'));
  }
  enfants.push(new Paragraph({ border: { bottom: { color: PRIMAIRE, space: 4, style: BorderStyle.SINGLE, size: 10 } }, spacing: { after: 60 }, children: [] }));

  var texteProfil = _dnTexteProfil(objetCV);
  if (texteProfil) { enfants.push(titre('Profil')); enfants.push(texte(texteProfil, { after: 160 })); }

  var experiences = _dnListe(objetCV.experiences);
  if (experiences.length) {
    enfants.push(titre('Expérience'));
    experiences.forEach(function (e) {
      enfants.push(texte(e.poste + (e.entreprise ? ' — ' + e.entreprise : ''), { gras: true, size: 19, after: 20 }));
      var meta = [e.lieu, [e.dateDebut, e.dateFin].filter(Boolean).join(' - '), e.contrat].filter(Boolean).join(' · ');
      if (meta) { enfants.push(texte(meta, { italique: true, size: 16, couleur: TEXTE_MUTED, after: 60 })); }
      if (e.missions) { enfants.push(puce(e.missions)); }
    });
  }

  var savoirFaire = _dnListe(objetCV.competences && objetCV.competences.savoirFaire);
  var savoirEtre = _dnListe(objetCV.competences && objetCV.competences.savoirEtre);
  if (savoirFaire.length || savoirEtre.length) {
    enfants.push(titre('Compétences'));
    enfants.push(_dnPastilles(docx, savoirFaire.concat(savoirEtre), TEINTE, PRIMAIRE));
  }

  var formations = _dnListe(objetCV.formations);
  if (formations.length) {
    enfants.push(titre('Formations'));
    formations.forEach(function (f) {
      enfants.push(texte(f.niveau + (f.intitule ? ' — ' + f.intitule : '') + (f.annee ? ' (' + f.annee + ')' : ''), { gras: true, after: 60 }));
    });
  }

  var loisirsTexte = _dnTexteJoint(objetCV.loisirs);
  if (loisirsTexte) { enfants.push(titre("Centres d'intérêt")); enfants.push(texte(loisirsTexte)); }

  return new docx.Document({
    numbering: { config: [ { reference: refPuces, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 288, hanging: 216 } } } } ] } ] },
    sections: [ { properties: { page: { margin: _dnMargePage({ top: 620, bottom: 620, left: 850, right: 850 }, opts.formatPage), size: opts.formatPage === 'A5' ? _dnTaillePageA5() : undefined } }, children: enfants } ]
  });
}

// ============================================================
// 3. "Creatif" -- bandeau plein-largeur colore + colonne laterale
//    teintee (communication, design, marketing)
// TACHE (couleurs) : meme principe que _dnConstruireImpact ci-dessus.
// opts.texteBandeauSecondaire : version claire de la couleur, utilisee
// pour le sous-titre sur fond colore (doit rester lisible sur PRIMAIRE).
// ============================================================
function _dnConstruireCreatif(docx, objetCV, opts) {
  opts = opts || {};
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, ImageRun = docx.ImageRun, Table = docx.Table, TableRow = docx.TableRow,
    TableCell = docx.TableCell, WidthType = docx.WidthType, ShadingType = docx.ShadingType,
    BorderStyle = docx.BorderStyle, AlignmentType = docx.AlignmentType, LevelFormat = docx.LevelFormat,
    VerticalAlign = docx.VerticalAlign;

  var PRIMAIRE = opts.primaire || '6D28D9';   // violet affirme
  var FOND_SIDEBAR = opts.fondSidebar || 'F5F3FF';
  var TEXTE_BANDEAU_SECONDAIRE = opts.texteBandeauSecondaire || 'E9D5FF';
  var TEXTE_SIDEBAR = '3B0764';
  var TEXTE = '1F2937';
  var AUCUNE_BORDURE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  var refPuces = 'puces-creatif';

  function titreSidebar(t) {
    return new Paragraph({ spacing: { before: 240, after: 90 },
      children: [ new TextRun({ text: t.toUpperCase(), bold: true, color: PRIMAIRE, size: 16, font: 'Calibri', characterSpacing: 10 }) ] });
  }
  function titrePrincipal(t) {
    return new Paragraph({ spacing: { before: 240, after: 130 },
      children: [ new TextRun({ text: t, bold: true, color: PRIMAIRE, size: 23, font: 'Calibri' }) ] });
  }
  function texteSidebar(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 90 },
      children: [ new TextRun({ text: t, size: o.size || 16, bold: !!o.gras, italics: !!o.italique, color: TEXTE_SIDEBAR, font: 'Calibri' }) ] });
  }
  function texte(t, o) {
    o = o || {};
    return new Paragraph({ spacing: { after: o.after !== undefined ? o.after : 100 },
      children: [ new TextRun({ text: t, size: o.size || 18, bold: !!o.gras, italics: !!o.italique, color: o.couleur || TEXTE, font: 'Calibri' }) ] });
  }
  function puce(t) {
    return new Paragraph({ numbering: { reference: refPuces, level: 0 }, spacing: { after: 60 },
      children: [ new TextRun({ text: t, size: 18, color: TEXTE, font: 'Calibri' }) ] });
  }

  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};

  // ---- Bandeau plein-largeur (table 1 cellule pleine largeur, fond
  // violet, nom en grand blanc) ----
  var banniere = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
    rows: [ new TableRow({ children: [ new TableCell({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: PRIMAIRE },
      margins: { top: 260, bottom: 260, left: 300, right: 300 },
      children: [
        new Paragraph({ spacing: { after: 30 }, children: [ new TextRun({ text: (identite.prenom || '') + ' ' + (identite.nom || ''), bold: true, size: 44, color: 'FFFFFF', font: 'Calibri' }) ] })
      ].concat(objetCV.objectifProfessionnel ? [ new Paragraph({ children: [ new TextRun({ text: objetCV.objectifProfessionnel.toUpperCase(), bold: true, color: TEXTE_BANDEAU_SECONDAIRE, size: 19, font: 'Calibri', characterSpacing: 15 }) ] }) ] : [])
    }) ] }) ]
  });

  var sidebar = [];
  var octetsPhotoCreatif = (typeof _dnDataUrlVersOctets === 'function') ? _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url) : null;
  if (octetsPhotoCreatif) {
    sidebar.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [ new ImageRun({ data: octetsPhotoCreatif, transformation: { width: 80, height: 80 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ] }));
  }
  if (identite.telephone || identite.email || identite.adresse || permis.possede) {
    sidebar.push(titreSidebar('Contact'));
    if (identite.telephone) { sidebar.push(texteSidebar(identite.telephone)); }
    if (identite.email) { sidebar.push(texteSidebar(identite.email)); }
    if (identite.adresse) { sidebar.push(texteSidebar(identite.adresse + (identite.ville ? ' ' + identite.ville : ''), { after: 100 })); }
    if (permis.possede) { sidebar.push(texteSidebar('Permis ' + _dnTexteJoint(permis.categories), { after: 100 })); }
  }
  var savoirFaire = _dnListe(objetCV.competences && objetCV.competences.savoirFaire);
  if (savoirFaire.length) { sidebar.push(titreSidebar('Compétences')); sidebar.push(_dnTexteGrasColore(docx, savoirFaire, PRIMAIRE)); }
  var savoirEtre = _dnListe(objetCV.competences && objetCV.competences.savoirEtre);
  if (savoirEtre.length) { sidebar.push(titreSidebar('Qualités')); savoirEtre.forEach(function (q) { sidebar.push(texteSidebar('— ' + q)); }); }
  var langues = _dnListe(objetCV.langues);
  if (langues.length) { sidebar.push(titreSidebar('Langues')); langues.forEach(function (l) { sidebar.push(texteSidebar(l.langue + ' — ' + l.niveau)); }); }
  var formations = _dnListe(objetCV.formations);
  if (formations.length) {
    sidebar.push(titreSidebar('Formations'));
    formations.forEach(function (f) {
      sidebar.push(texteSidebar(f.niveau + (f.intitule ? ' — ' + f.intitule : ''), { gras: true, after: 20 }));
      if (f.annee) { sidebar.push(texteSidebar(f.annee, { italique: true, size: 15, after: 100 })); }
    });
  }
  var loisirsTexte = _dnTexteJoint(objetCV.loisirs);
  if (loisirsTexte) { sidebar.push(titreSidebar("Centres d'intérêt")); sidebar.push(texteSidebar(loisirsTexte)); }

  var principal = [];
  var texteProfil = _dnTexteProfil(objetCV);
  if (texteProfil) { principal.push(titrePrincipal('Profil')); principal.push(texte(texteProfil, { after: 160 })); }
  var experiences = _dnListe(objetCV.experiences);
  if (experiences.length) {
    principal.push(titrePrincipal('Expérience'));
    experiences.forEach(function (e) {
      principal.push(texte(e.poste, { gras: true, size: 20, after: 20 }));
      var meta = [e.entreprise, [e.dateDebut, e.dateFin].filter(Boolean).join(' - '), e.contrat].filter(Boolean).join(' · ');
      principal.push(texte(meta, { italique: true, size: 17, couleur: PRIMAIRE, after: 60 }));
      if (e.missions) { principal.push(puce(e.missions)); }
    });
  }
  var experiencesPerso = _dnListe(objetCV.experiencesPersonnelles);
  if (experiencesPerso.length) {
    principal.push(titrePrincipal('Expériences personnelles'));
    experiencesPerso.forEach(function (e) {
      principal.push(texte(e.intitule, { gras: true, after: 20 }));
      if (e.detail) { principal.push(texte(e.detail, { italique: true, size: 16, couleur: '6B7280', after: 60 })); }
    });
  }
  var certifications = _dnListe(objetCV.certifications);
  if (certifications.length) { principal.push(titrePrincipal('Certifications')); certifications.forEach(function (c) { principal.push(puce(c)); }); }

  return new docx.Document({
    numbering: { config: [ { reference: refPuces, levels: [ { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 288, hanging: 216 } } } } ] } ] },
    sections: [ { properties: { page: { margin: _dnMargePage({ top: 0, bottom: 560, left: 0, right: 0 }, opts.formatPage), size: opts.formatPage === 'A5' ? _dnTaillePageA5() : undefined } }, children: [ banniere,
      new Paragraph({ spacing: { after: 0 }, children: [] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [3400, 6600],
        borders: { top: AUCUNE_BORDURE, bottom: AUCUNE_BORDURE, left: AUCUNE_BORDURE, right: AUCUNE_BORDURE, insideHorizontal: AUCUNE_BORDURE, insideVertical: AUCUNE_BORDURE },
        rows: [ new TableRow({ children: [
          new TableCell({ width: { size: 3400, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: FOND_SIDEBAR },
            margins: { top: 300, bottom: 300, left: 400, right: 300 }, verticalAlign: VerticalAlign.TOP, children: sidebar }),
          new TableCell({ width: { size: 6600, type: WidthType.DXA }, margins: { top: 300, bottom: 300, left: 460, right: 400 }, verticalAlign: VerticalAlign.TOP, children: principal })
        ] }) ]
      })
    ] } ]
  });
}

// ---- Enregistrement dans le systeme existant (etend, ne remplace rien) ----
GENERATEURS_DOCX_NATIFS_CV['impact'] = function (docx, objetCV) { return _dnConstruireImpact(docx, objetCV); };
GENERATEURS_DOCX_NATIFS_CV['dispo'] = function (docx, objetCV) { return _dnConstruireDispo(docx, objetCV); };
GENERATEURS_DOCX_NATIFS_CV['creatif'] = function (docx, objetCV) { return _dnConstruireCreatif(docx, objetCV); };

MODELES_AVEC_DOCX_NATIF_CV.push('impact', 'dispo', 'creatif');
