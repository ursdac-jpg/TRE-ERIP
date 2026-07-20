/* ============================================================
   composeurRender.js
   ------------------------------------------------------------
   Moteur "Composeur (Bêta)" — Couche ⑤ : Render Engine.
   Voir architecture-moteur-cv.md §2 (couche ⑤).

   Construit le document Word réel (docx.js), à partir de : l'objetCV
   normalisé, la composition (③) et le thème (④). Principe déjà connu
   (c'est ce que exportDocxNatifCV.js fait pour les 16 modèles existants)
   -- ce fichier est un nouveau code, jamais une modification des
   générateurs existants (isolation, architecture §0.1).
   ============================================================ */

function composeurConstruireDocument(docx, objetCV, composition, theme) {
  var Document = docx.Document, Paragraph = docx.Paragraph, TextRun = docx.TextRun,
      AlignmentType = docx.AlignmentType, BorderStyle = docx.BorderStyle, LevelFormat = docx.LevelFormat,
      Table = docx.Table, TableRow = docx.TableRow, TableCell = docx.TableCell,
      WidthType = docx.WidthType, VerticalAlign = docx.VerticalAlign;

  var PRIMAIRE = theme.couleurs.primaire, TEXTE = theme.couleurs.texte, SECONDAIRE = theme.couleurs.secondaire;
  var FOND = theme.couleurs.fond || 'FFFFFF';
  var taillePolice = composition.taillePoliceCorps * 2; // docx.js : les tailles s'expriment en demi-points
  var refPuces = 'composeur-puces';

  // TACHE (composeur-theme-engine-conception.md, étape A) : câblage réel
  // des propriétés de thème déclarées depuis le début (composeurTheme.js)
  // mais jamais lues jusqu'ici -- styleBordures et separateurs n'avaient
  // aucun effet, icones non plus. Avec le thème par défaut actuel
  // (styleTitres:'souligne', styleBordures:'fine', separateurs:'ligne'),
  // le résultat produit est strictement identique à avant ce câblage --
  // vérifié par construction : 'fine'->8, 'ligne'->BorderStyle.SINGLE,
  // exactement les valeurs qui étaient codées en dur auparavant.
  var STYLE_BORDURE_TAILLE = { fine: 8, epaisse: 20, aucune: 0 };
  var STYLE_SEPARATEUR_DOCX = { ligne: BorderStyle.SINGLE, pointille: BorderStyle.DOTTED };
  var ICONES_PAR_TITRE = {
    'Profil': '👤 ', 'Expérience professionnelle': '💼 ', 'Formation': '🎓 ',
    'Compétences professionnelles': '⭐ ', 'Compétences clés': '⭐ ', 'Compétences personnelles': '🌱 ', 'Langues': '🗣️ ',
    'Centres d’intérêt': '🎯 ', 'Engagements': '🤝 '
  };

  function titreSection(texteTitre) {
    var texteAffiche = (theme.icones && ICONES_PAR_TITRE[texteTitre] ? ICONES_PAR_TITRE[texteTitre] : '') + texteTitre.toUpperCase();
    if (theme.styleTitres === 'bandeau') {
      // TACHE : mode "bandeau" -- fond coloré pleine largeur derrière le
      // titre, jamais de bordure inférieure (les deux styles ne se
      // combinent pas). styleBordures/separateurs n'ont pas de sens ici,
      // ignorés volontairement pour ce mode.
      return new Paragraph({
        spacing: { before: 180, after: 80 },
        // TACHE (retour utilisateur : "impossible d'imprimer le thème
        // Moderne") : bug réel trouvé -- ShadingType.SOLID n'existe pas
        // dans docx.js (seul CLEAR, DIAGONAL_CROSS, etc. existent),
        // c'est d'ailleurs un piège explicitement documenté dans le
        // guide de la librairie ("use ShadingType.CLEAR, never SOLID").
        // docx.ShadingType.SOLID valait donc undefined, produisant un
        // document invalide qui faisait échouer toute la génération
        // native -- avec repli silencieux vers un ancien chemin HTML
        // inexistant pour le Composeur, d'où le message trompeur
        // "aperçu encore en cours de chargement".
        shading: { type: docx.ShadingType ? docx.ShadingType.CLEAR : undefined, fill: PRIMAIRE },
        children: [ new TextRun({ text: texteAffiche, bold: true, color: FOND, size: 20, font: theme.police.titres }) ]
      });
    }
    var epaisseurBordure = STYLE_BORDURE_TAILLE[theme.styleBordures];
    if (epaisseurBordure === undefined) { epaisseurBordure = 8; }
    var styleBordureDocx = STYLE_SEPARATEUR_DOCX[theme.separateurs] || BorderStyle.SINGLE;
    var afficherBordure = theme.styleTitres === 'souligne' && theme.styleBordures !== 'aucune' && theme.separateurs !== 'espace';
    return new Paragraph({
      spacing: { before: 180, after: 80 },
      border: afficherBordure
        ? { bottom: { color: PRIMAIRE, space: 4, style: styleBordureDocx, size: epaisseurBordure } }
        : undefined,
      children: [ new TextRun({ text: texteAffiche, bold: true, color: PRIMAIRE, size: 20, font: theme.police.titres }) ]
    });
  }
  function texteSimple(t, o) {
    o = o || {};
    return new Paragraph({
      spacing: { after: o.after !== undefined ? o.after : 70 },
      keepLines: !!composition.controleVeuvesOrphelines, // R001 (categorie "Word") : requete, jamais garantie -- voir architecture §4.3
      children: [ new TextRun({ text: t, bold: !!o.bold, italics: !!o.italics, size: o.size || taillePolice, color: o.color || TEXTE, font: theme.police.corps }) ]
    });
  }
  function puce(t) {
    return new Paragraph({
      numbering: { reference: refPuces, level: 0 },
      spacing: { after: 50 },
      keepLines: !!composition.controleVeuvesOrphelines,
      children: [ new TextRun({ text: t, size: taillePolice, color: TEXTE, font: theme.police.corps }) ]
    });
  }

  var identite = objetCV.identite || {};
  var enfantsEnTete = [];

  // ---- En-tete (variante "classique", seule disponible en V1) ----
  enfantsEnTete.push(new Paragraph({
    spacing: { after: 40 },
    children: [ new TextRun({ text: ((identite.prenom || '') + ' ' + (identite.nom || '')).trim(), bold: true, size: 40, color: PRIMAIRE, font: theme.police.titres }) ]
  }));
  if (objetCV.objectifProfessionnel) {
    enfantsEnTete.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [ new TextRun({ text: objetCV.objectifProfessionnel.toUpperCase(), bold: true, size: 28, color: PRIMAIRE, font: theme.police.titres, characterSpacing: 15 }) ]
    }));
  }
  var ligneContact = [identite.telephone, identite.email, identite.ville].filter(Boolean).join(' · ');
  if (ligneContact) { enfantsEnTete.push(texteSimple(ligneContact, { size: 18, color: SECONDAIRE, after: 240 })); }

  // ---- Rubriques : une fonction par rubrique, jamais deux fois la même
  // logique de rendu -- TACHE (étape B2, "2 colonnes") : auparavant une
  // simple boucle qui poussait directement dans "enfants" (V1, colonne
  // latérale toujours vide) ; devient une fonction qui RETOURNE un
  // tableau, appelable indépendamment pour composition.repartitionColonnes
  // .principale ET .laterale -- le contenu de chaque rubrique ne change
  // jamais selon la colonne où elle atterrit, seule sa position change. ----
  function dessinerRubrique(rubrique) {
    var enfants = [];
    if (rubrique === 'profil') {
      var texteProfil = (objetCV.profil && (objetCV.profil.profilIA || objetCV.profil.profilUtilisateur)) || '';
      if (texteProfil) {
        enfants.push(titreSection('Profil'));
        enfants.push(texteSimple(texteProfil));
      }
    } else if (rubrique === 'experiences') {
      // TACHE ("le document fait 4 pages") : composition.contenuRetenu.experiences
      // (deja plafonne par capacites.experiences, voir composeurComposition.js)
      // -- jamais objetCV.experiences directement, qui contient TOUT sans
      // limite.
      var experiences = composition.contenuRetenu.experiences;
      if (experiences.length) {
        enfants.push(titreSection('Expérience professionnelle'));
        // TACHE (retour utilisateur : "A4 Essentiel identique à A4
        // Détaillé") : rendu compact -- une seule ligne par experience
        // (poste — entreprise · lieu · dates : mission courte deja
        // tronquee), meme esprit que les 16 modeles existants en
        // Essentiel.
        // TACHE (étape 3) : la stratégie "Par compétences" réutilise ce
        // même rendu compact (contrat §3 : "jamais de puces de missions
        // détaillées") -- jamais une deuxième version dupliquée de cette
        // logique, juste une condition élargie.
        var experiencesEnModeCompact = composition.formatEssentiel ||
          (composition.strategieCV && composition.strategieCV.id === 'parCompetences');
        if (experiencesEnModeCompact) {
          experiences.forEach(function (e) {
            var infosLigne = [e.entreprise, e.lieu, [e.dateDebut, e.dateFin].filter(Boolean).join(' - ')].filter(Boolean).join(' · ');
            var ligne = e.poste + (infosLigne ? ' — ' + infosLigne : '') + (e.missions ? ' : ' + e.missions : '');
            enfants.push(puce(ligne));
          });
        } else {
          experiences.forEach(function (e) {
            enfants.push(texteSimple(e.poste + (e.entreprise ? ' — ' + e.entreprise : ''), { bold: true, after: 20 }));
            var meta = [e.lieu, [e.dateDebut, e.dateFin].filter(Boolean).join(' - ')].filter(Boolean).join(' · ');
            if (meta) { enfants.push(texteSimple(meta, { italics: true, size: taillePolice - 4, color: SECONDAIRE, after: 60 })); }
            if (e.missions) { enfants.push(puce(e.missions)); }
          });
        }
      }
    } else if (rubrique === 'formations') {
      var formations = composition.contenuRetenu.formations;
      if (formations.length) {
        enfants.push(titreSection('Formation'));
        formations.forEach(function (f) {
          var ligne = [f.niveau, f.intitule].filter(Boolean).join(' — ') + (f.annee ? ' (' + f.annee + ')' : '');
          enfants.push(texteSimple(ligne, { after: 60 }));
        });
      }
    } else if (rubrique === 'competencesCles') {
      // TACHE (étape 4) : lit composition.contenuRetenu.competencesCles,
      // déjà sélectionné par R006 (composeurComposition.js) -- ce fichier
      // ne décide jamais quelles compétences afficher, seulement comment
      // les dessiner.
      var competencesCles = composition.contenuRetenu.competencesCles;
      if (competencesCles && competencesCles.length) {
        enfants.push(titreSection('Compétences clés'));
        enfants.push(texteSimple(competencesCles.join('  ·  '), { bold: true, after: 140 }));
      }
    } else if (rubrique === 'competences') {
      // TACHE (étape 3) : lit composition.strategieCV et
      // composition.contenuRetenu.competencesGroupees, tous deux déjà
      // construits par le Composition Engine (composeurComposition.js) --
      // ce fichier ne décide jamais lui-même s'il faut grouper, il
      // dessine ce qu'on lui donne (source unique de vérité).
      var competencesGroupees = composition.contenuRetenu.competencesGroupees;
      if (competencesGroupees && competencesGroupees.length) {
        enfants.push(titreSection('Compétences professionnelles'));
        competencesGroupees.forEach(function (groupe) {
          enfants.push(texteSimple(groupe.theme, { bold: true, after: 40, color: SECONDAIRE }));
          groupe.items.forEach(function (item) {
            // TACHE (étape 5) : item est désormais {texte, illustrePar}
            // (composeurComposition.js) -- ce fichier dessine tel quel,
            // ne décide jamais si "Illustré par" doit apparaître (ça
            // découle uniquement de ce que experiencesQuiDemontrent() a
            // trouvé, déjà tranché en amont).
            enfants.push(puce(item.texte));
            if (item.illustrePar && item.illustrePar.length) {
              enfants.push(texteSimple('Illustré par : ' + item.illustrePar.join(', '), { italics: true, size: taillePolice - 4, color: SECONDAIRE, after: 100 }));
            }
          });
        });
      } else {
        var toutes = composition.contenuRetenu.competences;
        if (toutes.length) {
          enfants.push(titreSection('Compétences professionnelles'));
          toutes.forEach(function (t) { enfants.push(puce(t)); });
        }
      }
    } else if (rubrique === 'langues') {
      var langues = composition.contenuRetenu.langues;
      if (langues.length) {
        enfants.push(titreSection('Langues'));
        langues.forEach(function (l) { enfants.push(texteSimple(l.langue + ' — ' + l.niveau, { after: 60 })); });
      }
    } else if (rubrique === 'loisirsEngagements') {
      var loisirs = composition.contenuRetenu.loisirs, engagements = composition.contenuRetenu.engagements;
      if (loisirs.length) {
        enfants.push(titreSection('Centres d’intérêt'));
        loisirs.forEach(function (t) { enfants.push(texteSimple(t, { after: 60 })); });
      }
      if (engagements.length) {
        enfants.push(titreSection('Engagements'));
        engagements.forEach(function (t) { enfants.push(texteSimple(t, { after: 60 })); });
      }
    } else if (rubrique === 'competencesPersonnelles') {
      // TACHE (retour utilisateur : "compétences personnelles" -- bloc
      // additif, jamais un remplacement des loisirs, voir cv.md point
      // 10) : lit composition.contenuRetenu.competencesPersonnelles,
      // déjà décidé et construit en amont -- ce fichier ne fait que
      // dessiner, jamais décider si le bloc doit apparaître.
      var competencesPersonnelles = composition.contenuRetenu.competencesPersonnelles;
      if (competencesPersonnelles && competencesPersonnelles.length) {
        enfants.push(titreSection('Compétences personnelles'));
        // TACHE (retour utilisateur : "ne pas marquer dans les () les
        // sources... déjà visible dans Centres d'intérêt") : plus de
        // ligne "Issu de", seulement le texte de la compétence.
        competencesPersonnelles.forEach(function (c) { enfants.push(puce(c.competence)); });
      }
    }
    return enfants;
  }

  var enfantsPrincipale = [];
  composition.repartitionColonnes.principale.forEach(function (rubrique) {
    enfantsPrincipale = enfantsPrincipale.concat(dessinerRubrique(rubrique));
  });

  // TACHE (étape B2, "2 colonnes") : construit une vraie table à 2
  // cellules SEULEMENT si le thème le prévoit ET qu'il y a réellement
  // quelque chose à mettre en colonne latérale (repartitionColonnes.
  // laterale, déjà décidée par composeurComposition.js -- ce fichier ne
  // décide jamais de la répartition, seulement du dessin). Même
  // technique que les 16 modèles classiques (_dnConstruireDeuxColonnes,
  // exportDocxNatifCV.js) : une table sans bordures visibles, jamais des
  // "colonnes" Word natives (peu fiables entre versions de Word) --
  // réutilisée, pas réinventée.
  var enfants = enfantsEnTete;
  if (composition.colonnes === 2 && composition.repartitionColonnes.laterale.length) {
    var enfantsLaterale = [];
    composition.repartitionColonnes.laterale.forEach(function (rubrique) {
      enfantsLaterale = enfantsLaterale.concat(dessinerRubrique(rubrique));
    });
    var AUCUNE_BORDURE_COMPOSEUR = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    enfants = enfants.concat([
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [3400, 6600],
        borders: {
          top: AUCUNE_BORDURE_COMPOSEUR, bottom: AUCUNE_BORDURE_COMPOSEUR, left: AUCUNE_BORDURE_COMPOSEUR,
          right: AUCUNE_BORDURE_COMPOSEUR, insideHorizontal: AUCUNE_BORDURE_COMPOSEUR, insideVertical: AUCUNE_BORDURE_COMPOSEUR
        },
        rows: [ new TableRow({ children: [
          new TableCell({ width: { size: 3400, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 0, right: 200 }, verticalAlign: VerticalAlign.TOP, children: enfantsLaterale }),
          new TableCell({ width: { size: 6600, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 200, right: 0 }, verticalAlign: VerticalAlign.TOP, children: enfantsPrincipale })
        ] }) ]
      })
    ]);
  } else {
    enfants = enfants.concat(enfantsPrincipale);
  }

  return new Document({
    numbering: {
      config: [ { reference: refPuces, levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 260, hanging: 200 } } } }
      ] } ]
    },
    // TACHE ("le document fait 4 pages") : marges explicites -- absentes
    // avant (properties: {} vide), ce qui laissait docx.js appliquer ses
    // marges par defaut (nettement plus genereuses que celles des 16
    // modeles existants, deja a 560-720 twips). Memes valeurs que les
    // modeles generiques (exportDocxNatifCV.js), pour rester coherent.
    sections: [ { properties: { page: { margin: { top: 560, bottom: 560, left: 560, right: 560 } } }, children: enfants } ]
  });
}
