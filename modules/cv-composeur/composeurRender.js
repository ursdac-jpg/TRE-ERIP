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

// TACHE (Projet XXL) : en-tête à 2 zones (identité+coordonnées à gauche,
// poste visé+accroche à droite), entièrement isolée dans cette fonction
// dédiée -- jamais mélangée à l'en-tête "classique" ci-dessous, utilisée
// par Sobre/Institutionnel/Moderne. Reprend les mêmes columnWidths que
// la table 2 colonnes du corps du CV ([3400, 6600]) pour rester visuellement
// cohérente -- le document de conception ne précise pas de largeurs
// dédiées pour l'en-tête elle-même.
function _projetxxlConstruireEnTete(docx, objetCV, theme, PRIMAIRE, TEXTE, taillePolice) {
  var Paragraph = docx.Paragraph, TextRun = docx.TextRun, AlignmentType = docx.AlignmentType,
      Table = docx.Table, TableRow = docx.TableRow, TableCell = docx.TableCell,
      WidthType = docx.WidthType, VerticalAlign = docx.VerticalAlign, BorderStyle = docx.BorderStyle,
      ImageRun = docx.ImageRun;

  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};
  var icones = !!theme.icones;
  // TACHE (Projet XXL, mode "Lecture guidée") : seul ce mode colore le
  // Nom et le Poste visé de l'en-tête avec l'accent -- "Texte coloré"
  // seul ne colore QUE les titres de section (voir titreSection()),
  // jamais l'en-tête (distinction explicite du document de conception).
  // TACHE (retour utilisateur : "Fond des colonnes", effet "titres") :
  // colore lui aussi le Nom et le Poste visé -- l'en-tête est une table
  // SEPAREE du corps (jamais sur un fond de colonne), aucune collision
  // possible ici, contrairement aux titres de bloc du corps
  // (voir couleurTitrePourColonne(), composeurConstruireDocument).
  var couleurAccentEnTete = (theme.coloration === 'lectureGuidee' || theme.fondColonnesEffet === 'titres') ? PRIMAIRE : TEXTE;

  function ligneContact(texte, icone) {
    var prefixe = (icones && icone) ? (icone + ' ') : '';
    return new Paragraph({ spacing: { after: 40 }, children: [ new TextRun({ text: prefixe + texte, size: taillePolice - 2, color: TEXTE, font: theme.police.corps }) ] });
  }

  // ---- Zone gauche : identité + coordonnées. Règle testée et vérifiée
  // (doc de conception) : un champ absent ne pousse JAMAIS de paragraphe
  // vide -- il est simplement omis, le contenu suivant remonte
  // naturellement dans le flux Word. ----
  var zoneGauche = [];
  // TACHE (retour utilisateur : "je veux avoir la possibilité de mettre
  // une photo" -- Projet XXL) : le Composeur (ses 4 thèmes) ne lisait
  // objetCV.photo NULLE PART jusqu'ici -- gap similaire à celui déjà
  // corrigé pour les certifications. Réutilise le mécanisme générique
  // déjà existant et partagé par les 16 modèles classiques
  // (_dnDataUrlVersOctets/_dnTypeImagePhoto, miniCvA5.js -- déjà globales,
  // jamais redéfinies ici) : la case "Inclure ma photo" déjà présente
  // dans le panneau (générique, pas propre au Composeur) pilote déjà
  // objetCV.photo.url -- aucun nouveau réglage nécessaire dans le
  // panneau Projet XXL, seul le rendu manquait. Photo carrée, en haut de
  // la zone gauche (au-dessus du nom), même esprit que les modèles
  // 2 colonnes classiques (Aquarelle, Moderne, etc.) qui la placent en
  // haut de leur colonne latérale. Silencieusement absente si non incluse
  // (comportement identique aux 16 modèles classiques).
  var octetsPhotoXXL = (typeof _dnDataUrlVersOctets === 'function') ? _dnDataUrlVersOctets(objetCV.photo && objetCV.photo.url) : null;
  if (octetsPhotoXXL) {
    zoneGauche.push(new Paragraph({
      spacing: { after: 120 },
      children: [ new ImageRun({ data: octetsPhotoXXL, transformation: { width: 70, height: 70 }, type: _dnTypeImagePhoto(objetCV.photo.url) }) ]
    }));
  }
  var nomComplet = ((identite.prenom || '') + ' ' + (identite.nom || '')).trim();
  if (nomComplet) {
    // TACHE (retour utilisateur : "je veux aussi que le nom et le poste
    // visé soient soulignés quand j'active le séparateur, sur 1 ou 2
    // colonnes") : même couleur que les autres soulignements du
    // séparateur (PRIMAIRE) -- ne concerne QUE le trait, jamais la
    // couleur du texte (couleurAccentEnTete reste seule maîtresse du
    // texte, comme pour les titres de bloc, voir titreSection).
    zoneGauche.push(new Paragraph({
      spacing: { after: 60 },
      border: theme.separateurColonnes ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: (theme.separateurCouleurHex || PRIMAIRE), space: 2 } } : undefined,
      children: [ new TextRun({ text: nomComplet, bold: true, size: 30, color: couleurAccentEnTete, font: theme.police.titres }) ]
    }));
  }
  var villeCP = [identite.ville, identite.codePostal ? '(' + identite.codePostal + ')' : ''].filter(Boolean).join(' ');
  if (villeCP) { zoneGauche.push(ligneContact(villeCP, '📍')); }
  if (identite.email) { zoneGauche.push(ligneContact(identite.email, '✉')); }
  // TACHE (retour utilisateur : "bandeau de disponibilité -- permis,
  // langues, téléphone... on les retire de leur emplacement habituel
  // pour éviter le doublon") : téléphone et permis rejoignent le bandeau
  // (voir composeurConstruireDocument plus bas) quand il est actif --
  // jamais affichés aux deux endroits. Email et ville restent toujours
  // dans l'en-tête, non concernés par le bandeau.
  if (identite.telephone && !theme.bandeauDisponibilite) { zoneGauche.push(ligneContact(identite.telephone, '☎')); }
  if (permis.possede && !theme.bandeauDisponibilite) {
    var suffixeVehicule = permis.vehicule ? ' + véhicule' : '';
    zoneGauche.push(ligneContact('Permis ' + (permis.categories || []).join('/') + suffixeVehicule, '🚗'));
  }
  if (!zoneGauche.length) { zoneGauche.push(new Paragraph({ children: [] })); } // filet de securite, jamais une cellule Word sans aucun enfant

  // ---- Zone droite : poste visé (grand, centré) + accroche
  // (optionnelle, centrée). Le retrait de l'accroche quand une lettre de
  // motivation accompagne le CV est déjà géré en amont par
  // genererDocxComposeur() (composeurMoteur.js, paramètre sansAccroche/
  // theme.lettreJointe) -- objetCV.profil est alors déjà vide à ce
  // stade, le paragraphe est simplement omis ici, jamais une logique de
  // retrait dupliquée. ----
  var zoneDroite = [];
  if (objetCV.objectifProfessionnel) {
    zoneDroite.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
      border: theme.separateurColonnes ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: (theme.separateurCouleurHex || PRIMAIRE), space: 2 } } : undefined,
      children: [ new TextRun({ text: objetCV.objectifProfessionnel, bold: true, size: 30, color: couleurAccentEnTete, font: theme.police.titres }) ]
    }));
  }
  var texteAccroche = (objetCV.profil && (objetCV.profil.profilIA || objetCV.profil.profilUtilisateur)) || '';
  if (texteAccroche) {
    // TACHE (retour utilisateur : "je veux avoir la possibilité de
    // choisir si la phrase d'accroche est en italique ou pas") : true
    // par defaut (comportement identique a avant ce reglage).
    zoneDroite.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [ new TextRun({ text: texteAccroche, italics: (theme.accrocheItalique !== false), size: taillePolice, color: TEXTE, font: theme.police.corps }) ] }));
  }
  if (!zoneDroite.length) { zoneDroite.push(new Paragraph({ children: [] })); }

  var AUCUNE_BORDURE_ENTETE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [3400, 6600],
      borders: {
        top: AUCUNE_BORDURE_ENTETE, bottom: AUCUNE_BORDURE_ENTETE, left: AUCUNE_BORDURE_ENTETE,
        right: AUCUNE_BORDURE_ENTETE, insideHorizontal: AUCUNE_BORDURE_ENTETE, insideVertical: AUCUNE_BORDURE_ENTETE
      },
      rows: [ new TableRow({ children: [
        // TACHE (retour utilisateur : "trop d'espace entre les
        // coordonnées et Compétences professionnelles/Expérience
        // professionnelle" -- bug réel diagnostiqué empiriquement, PDF
        // réel converti et inspecté via pdftotext -layout) : la zone
        // gauche (nom + jusqu'à 4 lignes de coordonnées) est presque
        // toujours plus haute que la zone droite (poste visé seul,
        // surtout sans accroche) -- Word calcule la hauteur de la ligne
        // du tableau sur la cellule la PLUS HAUTE, et VerticalAlign.TOP
        // faisait s'accumuler tout l'espace inutilisé de la cellule la
        // plus courte EN BAS, juste avant le corps du CV (mesuré : ~4
        // lignes vides en pdftotext sur un cas sans accroche). CENTER
        // répartit cet espace au-dessus ET en dessous -- ne l'élimine
        // pas totalement (Word ne peut pas faire déborder le contenu
        // d'une cellule courte dans une autre ligne de tableau), mais
        // évite qu'il s'accumule entièrement à la jonction avec le corps.
        new TableCell({ width: { size: 3400, type: WidthType.DXA }, margins: { top: 0, bottom: 60, left: 0, right: 200 }, verticalAlign: VerticalAlign.CENTER, children: zoneGauche }),
        new TableCell({ width: { size: 6600, type: WidthType.DXA }, margins: { top: 0, bottom: 60, left: 200, right: 0 }, verticalAlign: VerticalAlign.CENTER, children: zoneDroite })
      ] }) ]
    }),
    // TACHE (retour utilisateur : "trop d'espace entre l'en-tête et le
    // corps") : ce paragraphe reste nécessaire tel quel (Word gère mal
    // 2 tableaux directement adjacents sans paragraphe entre les deux) --
    // mais un paragraphe vide hérite par défaut de la hauteur de ligne du
    // style "Normal", un plein interligne pour rien. Un TextRun de taille
    // minuscule (2) réduit cette hauteur au strict minimum tout en
    // gardant son rôle structurel de séparateur -- mesuré et vérifié
    // (PDF réel, pdftotext -bbox) : réduit le vide mesuré de ~44pt à une
    // valeur nettement plus proche des espacements normaux entre blocs.
    // TACHE (retour utilisateur : "modèle Ruban -- ligne horizontale
    // juste sous le titre du cv") : ce même paragraphe de transition
    // porte désormais la ligne horizontale quand le séparateur est actif
    // -- jamais un second paragraphe qui rajouterait de la hauteur.
    new Paragraph({
      spacing: { after: 0, before: 0 },
      border: theme.separateurColonnes
        ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: (theme.separateurCouleurHex || PRIMAIRE), space: 4 } }
        : undefined,
      children: [ new TextRun({ text: '', size: 2 }) ]
    })
  ];
}

// TACHE (chantier "exp perso", Phase 4 : engagements structurés) : un
// engagement peut être une chaîne (ancienne donnée, ou saisie manuelle
// via un parcours jamais touché par ce chantier) ou un objet {texte,
// dateDebut, dateFin} (Découverte, depuis cette Phase 4) -- fonction
// utilitaire partagée, jamais dupliquée à chaque endroit qui affiche un
// engagement.
function _texteEngagement(t) {
  if (typeof t === 'string') { return t; }
  return (t && t.texte) || '';
}

// TACHE (retour utilisateur : "sport extrêmes, moto -- majuscule en
// début") : ne touche QUE la 1ère lettre de chaque mot, jamais le reste
// (un sigle correctement écrit, ex. "VTT", reste intact).
// TACHE (retour utilisateur, bug trouvé : "moto reste en minuscule après
// la virgule") : "sports extrêmes, moto" est en réalité UNE SEULE chaîne
// (plusieurs loisirs d'un même fragment joints par ", ", voir
// decouverteMapping.js -- elementsFactuels.join(', ')), jamais deux
// éléments distincts dans le tableau -- capitaliser seulement le tout
// premier caractère de la chaîne entière ratait donc tout ce qui suit
// une virgule. Découpe désormais sur ", ", capitalise CHAQUE segment,
// puis rejoint à l'identique.
function _premiereMajuscule(texte) {
  if (!texte) { return texte; }
  return texte.split(', ').map(function (segment) {
    return segment ? (segment.charAt(0).toUpperCase() + segment.slice(1)) : segment;
  }).join(', ');
}

// TACHE (retour utilisateur, bug trouvé : "Épuré -- aucun changement,
// Condensé -- il manque les points entre les missions") : les missions
// venant du parcours Découverte sont UNE SEULE CHAÎNE jointe par « ; »
// (_decouverteConcatenerPreuve, decouverteMapping.js) -- jamais des
// sauts de ligne, à la différence de la saisie manuelle (textarea,
// app.js). Découper uniquement sur \n ratait donc ce format : un seul
// "morceau" reconnu au total, donc aucune puce séparée en Épuré, aucun
// séparateur « · » en Condensé (join sur un tableau à 1 élément ne fait
// rien). Gère désormais les deux formats -- \n en priorité (saisie
// manuelle), repli sur « ; » si un seul morceau en résulte ET que le
// texte contient réellement des « ; » (format Découverte) -- jamais les
// deux à la fois, un texte ne mélange jamais les deux conventions.
function _decouperMissions(missionsTexte) {
  var brut = (missionsTexte || '').trim();
  if (!brut) { return []; }
  var morceaux = brut.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  if (morceaux.length <= 1 && brut.indexOf(';') !== -1) {
    morceaux = brut.split(';').map(function (l) { return l.trim(); }).filter(Boolean);
  }
  // TACHE (retour utilisateur : "est-ce que ce bug affecte aussi les
  // autres parcours ?" -- vérifié, oui) : 3e format trouvé, utilisé par
  // l'écran de validation d'import ET par les missions proposées par
  // l'IA (savoirFaireParExperience, app.js -- .join('. ') dans les deux
  // cas, même mécanisme partagé) -- des phrases jointes par ". " (point-
  // espace), ni saut de ligne ni point-virgule. Découpe sur un point
  // suivi d'un espace ET d'une majuscule (évite de couper à tort une
  // abréviation ou un nombre décimal) -- seulement si aucun des 2 formats
  // précédents n'a donné plus d'un morceau.
  if (morceaux.length <= 1 && /\.\s+[A-ZÀ-Ý]/.test(brut)) {
    morceaux = brut.split(/\.\s+(?=[A-ZÀ-Ý])/).map(function (l) { return l.trim(); }).filter(Boolean);
  }
  return morceaux;
}

// Retire toute ponctuation de fin (point, point-virgule, espaces) d'un
// segment de mission, pour reconstruire proprement soit une puce Épuré
// (avec un point unique ajouté), soit une jointure Condensé (sans aucun
// point, séparée uniquement par « · »).
function _sansPonctuationFinale(segment) {
  return (segment || '').replace(/[;.\s]+$/, '').replace(/^[;.\s]+/, '');
}

// TACHE (retour utilisateur : "si je mets 2016 et que c'est toujours le
// cas... on a du mal à comprendre si c'est une expérience uniquement en
// 2016 ou depuis 2016") : une date de début seule, sans date de fin,
// est ambiguë -- "2016 - en cours" lève l'ambiguïté ("en cours" déjà le
// libellé utilisé pour ce même cas dans les sélecteurs d'année,
// decouverteParcours.js/app.js -- même mot partout, jamais un second
// vocabulaire pour la même idée). Une période complète (les deux dates
// présentes) ou une chaîne vide (aucune des deux) restent inchangées.
function _formaterPeriode(dateDebut, dateFin) {
  if (dateDebut && !dateFin) { return dateDebut + ' - en cours'; }
  return [dateDebut, dateFin].filter(Boolean).join(' - ');
}

function composeurConstruireDocument(docx, objetCV, composition, theme) {
  var Document = docx.Document, Paragraph = docx.Paragraph, TextRun = docx.TextRun,
      AlignmentType = docx.AlignmentType, BorderStyle = docx.BorderStyle, LevelFormat = docx.LevelFormat,
      Table = docx.Table, TableRow = docx.TableRow, TableCell = docx.TableCell,
      WidthType = docx.WidthType, VerticalAlign = docx.VerticalAlign, TabStopType = docx.TabStopType;

  var PRIMAIRE = theme.couleurs.primaire, TEXTE = theme.couleurs.texte, SECONDAIRE = theme.couleurs.secondaire;
  var FOND = theme.couleurs.fond || 'FFFFFF';
  var taillePolice = composition.taillePoliceCorps * 2; // docx.js : les tailles s'expriment en demi-points
  var refPuces = 'composeur-puces';
  // TACHE (Projet XXL) : conditionne les branches specifiques a ce theme
  // plus bas (en-tete 2 zones, icones d'en-tete, renommage "Competences
  // comportementales") -- theme.id n'est jamais 'projetxxl' pour
  // Sobre/Institutionnel/Moderne.
  var estProjetXXL = (theme.id === 'projetxxl');

  // TACHE (retour utilisateur : "possibilité de mettre un fond comme
  // Aquarelle sur la colonne de gauche... 3 possibilités") : "Fond des
  // colonnes" -- EXCLUSIF à Projet XXL (theme.fondColonnes n'existe sur
  // aucun des 3 autres thèmes, undefined partout ailleurs -- ces 3
  // variables valent alors toujours null/'fondSeul', structurellement
  // sans effet pour Sobre/Institutionnel/Moderne).
  var FOND_GAUCHE = (theme.fondColonnes === 'gauche' || theme.fondColonnes === 'lesDeux') ? PRIMAIRE : null;
  var FOND_DROITE = (theme.fondColonnes === 'droite' || theme.fondColonnes === 'lesDeux') ? PRIMAIRE : null;
  var effetFondColonnes = theme.fondColonnesEffet || 'fondSeul';
  var couleurLisibleFondColonnes = (theme.texteFondColonnes === 'noir') ? '000000' : 'FFFFFF';

  // TACHE (retour utilisateur : "texte coloré, nouvelle fonction --
  // colorer tout le contenu des blocs, sans avoir besoin d'un fond de
  // colonne") : DÉCOUPLÉ de "Fond des colonnes" (ci-dessus) -- fonctionne
  // seul, sans FOND_GAUCHE/FOND_DROITE, jamais de collision à résoudre
  // (le texte n'est jamais posé sur un fond de sa propre couleur ici,
  // contrairement à l'ancien mécanisme retiré). Portée choisie par la
  // personne (gauche/droite/les deux) -- en 1 colonne, la portée n'a pas
  // de sens (pas de gauche/droite), tout le contenu est coloré dès que
  // "Texte coloré" est actif.
  function couleurContenuPourColonne(colonne) {
    if (theme.coloration !== 'texteColore') { return null; }
    if (composition.colonnes === 1) { return PRIMAIRE; }
    var portee = theme.texteColorePortee || 'lesDeux';
    if (portee === 'lesDeux') { return PRIMAIRE; }
    if (portee === 'gauche' && colonne === 'laterale') { return PRIMAIRE; }
    if (portee === 'droite' && colonne === 'principale') { return PRIMAIRE; }
    return null;
  }

  // Couleur du TITRE de bloc pour une colonne donnée, selon l'effet
  // 'titres' : prend la couleur de l'accent -- sauf collision (le titre
  // repose sur le fond de SA PROPRE colonne, de cette même couleur),
  // auquel cas bascule blanc/noir choisi.
  function couleurTitrePourColonne(colonne) {
    if (effetFondColonnes !== 'titres') { return null; }
    var fondPropre = (colonne === 'laterale') ? FOND_GAUCHE : FOND_DROITE;
    return fondPropre ? couleurLisibleFondColonnes : PRIMAIRE;
  }

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
    'Centres d’intérêt': '🎯 ', 'Engagements': '🤝 ',
    // TACHE (retour utilisateur : bug de contenu manquant, corrigé) :
    // n'a d'effet que pour Sobre/Institutionnel/Moderne (icones===true) --
    // rubrique 'certifications' séparée, jamais utilisée par Projet XXL
    // (intégrée à "Formation" pour ce thème, jamais son propre titre).
    'Certifications': '📜 ',
    // TACHE (format Mini CV A5) : titres propres à ce format, jamais
    // utilisés par les autres formats -- ajout additif, aucune clé
    // existante modifiée.
    'Formations et diplômes': '🎓 ', 'Compétences': '⭐ '
  };

  function titreSection(texteTitre, colonne) {
    // TACHE (Projet XXL) : les icônes de titre de section existantes
    // ailleurs dans le Composeur (💼 ⭐ 🎯...) sont un point resté SANS
    // RÉPONSE dans le document de conception ("jamais tranché si Projet
    // XXL les garde ou non"). Choix conservateur en attendant
    // l'arbitrage : désactivées pour ce thème -- theme.icones n'y
    // contrôle QUE les icônes de coordonnées de l'en-tête (voir
    // _projetxxlConstruireEnTete), jamais celles-ci. Comportement
    // inchangé pour Sobre/Institutionnel/Moderne.
    var afficherIconeTitre = theme.icones && !estProjetXXL;
    var texteAffiche = (afficherIconeTitre && ICONES_PAR_TITRE[texteTitre] ? ICONES_PAR_TITRE[texteTitre] : '') + texteTitre.toUpperCase();
    if (theme.styleTitres === 'bandeau') {
      // TACHE (retour utilisateur : "en fond coloré, choix blanc/noir pour
      // le texte") : auparavant toujours FOND (blanc, en dur) -- theme.
      // texteBandeau n'existe QUE sur Projet XXL (undefined ailleurs,
      // Object.keys(themeBase) ne le copie donc jamais pour Sobre/
      // Institutionnel/Moderne) -- repli sur FOND si absent, comportement
      // 100% inchange pour les 3 autres themes (seul cas ou 'bandeau'
      // s'applique par defaut est Moderne, qui n'a jamais ce champ).
      var couleurTexteBandeau = FOND;
      if (theme.texteBandeau === 'noir') { couleurTexteBandeau = '000000'; }
      else if (theme.texteBandeau === 'blanc') { couleurTexteBandeau = 'FFFFFF'; }
      // TACHE : mode "bandeau" -- fond coloré pleine largeur derrière le
      // titre, jamais de bordure inférieure (les deux styles ne se
      // combinent pas). styleBordures/separateurs n'ont pas de sens ici,
      // ignorés volontairement pour ce mode.
      return new Paragraph({
        spacing: { before: Math.round(180 * espacementExtra), after: Math.round(80 * espacementExtra) },
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
        children: [ new TextRun({ text: texteAffiche, bold: true, color: couleurTexteBandeau, size: 20, font: theme.police.titres }) ]
      });
    }
    var epaisseurBordure = STYLE_BORDURE_TAILLE[theme.styleBordures];
    if (epaisseurBordure === undefined) { epaisseurBordure = 8; }
    var styleBordureDocx = STYLE_SEPARATEUR_DOCX[theme.separateurs] || BorderStyle.SINGLE;
    // TACHE (Projet XXL) : 'simple' est le nom public du même style que
    // 'souligne' (fusion Institutionnel+Moderne, doc de conception) --
    // ajout STRICTEMENT additif : aucun thème existant ne vaut jamais
    // 'simple', ce qui garantit un comportement inchangé pour
    // Sobre/Institutionnel/Moderne.
    var estStyleSouligne = (theme.styleTitres === 'souligne' || theme.styleTitres === 'simple');
    var afficherBordure = estStyleSouligne && theme.styleBordures !== 'aucune' && theme.separateurs !== 'espace';
    // TACHE (Projet XXL, mode de coloration "aucune") : titres neutres
    // (couleur de texte standard), jamais l'accent -- theme.coloration
    // n'existe sur AUCUN des 3 autres thèmes (toujours "undefined"),
    // cette condition est donc structurellement sans effet pour eux :
    // couleurTitre vaut alors toujours PRIMAIRE, comportement identique
    // à avant ce changement.
    // TACHE (retour utilisateur : "texte coloré, nouvelle fonction --
    // colore tout le contenu, plus les titres") : "texteColore" ne
    // colore plus les titres du tout (comme "aucune") -- seule "Lecture
    // guidée -- par titre" colore encore les titres (reprend l'ancien
    // rôle de "texte coloré"). "Lecture guidée -- par rectangle" ne
    // passe jamais par cette branche (styleTitres vaut alors 'bandeau',
    // voir plus bas).
    // TACHE (retour utilisateur : "Fond des colonnes", effet "titres") :
    // prioritaire sur la logique "coloration" ci-dessus quand actif --
    // mutuellement exclusifs par construction (composeurTheme.js), jamais
    // les deux en même temps. couleurTitrePourColonne() gère elle-même la
    // collision (titre posé sur le fond de sa propre couleur -> blanc/noir).
    var couleurTitreFondColonnes = couleurTitrePourColonne(colonne);
    var estColorationSansTitre = (theme.coloration === 'aucune' || theme.coloration === 'texteColore');
    var couleurTitre = couleurTitreFondColonnes || (estColorationSansTitre ? TEXTE : PRIMAIRE);
    // TACHE (retour utilisateur : "modèle Ruban -- souligner chaque bloc
    // de la même couleur [que le séparateur], sans toucher au texte") :
    // DÉCOUPLÉ de couleurTitre (qui reste exclusivement la couleur du
    // TEXTE) -- le soulignement prend PRIMAIRE quand le séparateur est
    // actif, jamais lié à "Coloration"/"Fond des colonnes" (qui restent
    // seuls maîtres de couleurTitre). Repli sur couleurTitre si le
    // séparateur n'est pas actif -- comportement 100% inchangé dans ce
    // cas (y compris pour Sobre/Institutionnel/Moderne, où
    // theme.separateurColonnes vaut toujours undefined/false).
    var couleurSoulignage = theme.separateurColonnes ? (theme.separateurCouleurHex || PRIMAIRE) : couleurTitre;
    return new Paragraph({
      spacing: { before: Math.round(180 * espacementExtra), after: Math.round(80 * espacementExtra) },
      border: afficherBordure
        ? { bottom: { color: couleurSoulignage, space: 4, style: styleBordureDocx, size: epaisseurBordure } }
        : undefined,
      children: [ new TextRun({ text: texteAffiche, bold: true, color: couleurTitre, size: 20, font: theme.police.titres }) ]
    });
  }
  // TACHE (retour utilisateur : "si peu de contenu, mieux exploiter
  // l'espace de la page") : multiplicateur calculé par composeurComposition.js
  // (Projet XXL, A4 Détaillé, densité "faible" uniquement -- vaut 1
  // partout ailleurs, donc sans le moindre effet sur les 3 autres thèmes
  // ni les autres formats). Appliqué aux espacements de texteSimple/puce
  // ET de titreSection (déjà modifiée plus haut) -- var hoisted par JS,
  // disponible dans titreSection via fermeture malgré sa position
  // textuelle avant cette déclaration (les fonctions ne s'exécutent
  // qu'au moment de l'appel, jamais à la définition).
  var espacementExtra = composition.espacementExtra || 1;
  function texteSimple(t, o) {
    o = o || {};
    var apresBase = o.after !== undefined ? o.after : 70;
    return new Paragraph({
      spacing: { after: Math.round(apresBase * espacementExtra) },
      keepLines: !!composition.controleVeuvesOrphelines, // R001 (categorie "Word") : requete, jamais garantie -- voir architecture §4.3
      children: [ new TextRun({ text: t, bold: !!o.bold, italics: !!o.italics, size: o.size || taillePolice, color: o.color || TEXTE, font: theme.police.corps }) ]
    });
  }
  function puce(t, o) {
    o = o || {};
    return new Paragraph({
      numbering: { reference: refPuces, level: 0 },
      spacing: { after: Math.round(50 * espacementExtra) },
      keepLines: !!composition.controleVeuvesOrphelines,
      children: [ new TextRun({ text: t, size: taillePolice, color: o.color || TEXTE, font: theme.police.corps }) ]
    });
  }

  var identite = objetCV.identite || {};

  // TACHE (retour utilisateur : "format Mini CV A5 -- portrait, 2
  // colonnes fixes") : mise en page ENTIÈREMENT séparée de la logique
  // 1/2 colonnes habituelle (jamais traversée par A4 Détaillé/Essentiel/
  // Intégral) -- construite ici, avec ses propres tailles de police
  // (plus petites, format compact) et sa propre structure fixe, jamais
  // dérivée de la logique de rubriques/stratégie du reste du fichier.
  if (composition.formatPage === 'A5-portrait' || composition.formatPage === 'A5-paysage') {
    // TACHE (retour utilisateur : "débordement -- les 2 options doivent
    // s'appliquer normalement à l'A5") : option A -- réduction uniforme
    // de la police, même principe que pour A4 (composeurComposition.js,
    // echelle * 0.83) -- appliquée ici puisque les tailles de police A5
    // sont spécifiques à ce format, jamais dérivées de composition.taillePoliceCorps.
    var echelleDebordementA5 = (theme.optionDebordement === 'A' || theme.optionDebordement === 'AB') ? 0.85 : 1;
    var TAILLE_NOM_A5 = Math.round(26 * echelleDebordementA5), TAILLE_TITRE_A5 = Math.round(19 * echelleDebordementA5), TAILLE_CORPS_A5 = Math.round(17 * echelleDebordementA5);
    // TACHE (retour utilisateur : "les réglages existants doivent
    // s'appliquer normalement à l'A5") : réutilise TELS QUELS les
    // mécanismes déjà construits pour A4 (couleurContenuPourColonne,
    // couleurTitrePourColonne, ICONES_PAR_TITRE, FOND_GAUCHE/FOND_DROITE,
    // effetFondColonnes) -- jamais une seconde logique de coloration/
    // fond dupliquée pour ce format.
    function texteA5(t, o, colonne) {
      o = o || {};
      var couleurContenu = colonne ? couleurContenuPourColonne(colonne) : null;
      return new Paragraph({ spacing: { after: o.after != null ? o.after : 40 },
        children: [ new TextRun({ text: t, size: TAILLE_CORPS_A5, bold: !!o.bold, italics: !!o.italics, color: o.color || couleurContenu || TEXTE, font: theme.police.corps }) ] });
    }
    function titreA5(t, colonne) {
      var couleurTitre = couleurTitrePourColonne(colonne) || PRIMAIRE;
      // TACHE (retour utilisateur : "icônes -- doit s'appliquer
      // normalement") : même table ICONES_PAR_TITRE que le reste du
      // Composeur -- theme.icones seul décide, jamais lié à
      // estProjetXXL ici (à la différence de titreSection() plus haut,
      // dont l'arbitrage icônes/Projet XXL reste délibérément non
      // tranché pour les AUTRES formats -- l'utilisateur a explicitement
      // demandé les icônes pour l'A5 spécifiquement).
      var texteAvecIcone = (theme.icones && ICONES_PAR_TITRE[t]) ? ICONES_PAR_TITRE[t] + t : t;
      return new Paragraph({ spacing: { before: 120, after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: (theme.separateurCouleurHex || PRIMAIRE), space: 2 } },
        children: [ new TextRun({ text: texteAvecIcone, bold: true, size: TAILLE_TITRE_A5, color: couleurTitre, font: theme.police.titres }) ] });
    }
    function puceA5(t, colonne) {
      var couleurContenu = colonne ? couleurContenuPourColonne(colonne) : null;
      return new Paragraph({ spacing: { after: 40 }, numbering: { reference: refPuces, level: 0 },
        children: [ new TextRun({ text: t, size: TAILLE_CORPS_A5, color: couleurContenu || TEXTE, font: theme.police.corps }) ] });
    }

    // ---- Colonne gauche : identité/coordonnées, Formations et
    // diplômes (+ certifications), Centres d'intérêt (+ langues).
    var gaucheA5 = [];
    gaucheA5.push(new Paragraph({ spacing: { after: 20 },
      children: [ new TextRun({ text: ((identite.prenom || '') + ' ' + (identite.nom || '')).trim(), bold: true, size: TAILLE_NOM_A5, color: (couleurTitrePourColonne('laterale') || PRIMAIRE), font: theme.police.titres }) ] }));
    var villeCPA5 = [identite.ville, identite.codePostal ? '(' + identite.codePostal + ')' : ''].filter(Boolean).join(' ');
    [identite.email, identite.telephone, villeCPA5].filter(Boolean).forEach(function (ligne) { gaucheA5.push(texteA5(ligne, { after: 20, color: (couleurContenuPourColonne('laterale') || SECONDAIRE) })); });
    var permisA5 = objetCV.permis || {};
    if (permisA5.possede) {
      gaucheA5.push(texteA5('Permis ' + (permisA5.categories || []).join('/') + (permisA5.vehicule ? ' + véhicule' : ''), { after: 20, color: (couleurContenuPourColonne('laterale') || SECONDAIRE) }));
    }

    gaucheA5.push(titreA5('Formations et diplômes', 'laterale'));
    (composition.formations || []).forEach(function (f) {
      var ligneFormation = [f.niveau, f.intitule].filter(Boolean).join(' — ');
      if (ligneFormation) { gaucheA5.push(texteA5(ligneFormation, { after: 30 }, 'laterale')); }
    });
    if ((composition.certifications || []).length) {
      gaucheA5.push(texteA5('Certifications : ' + composition.certifications.join(', '), { after: 30 }, 'laterale'));
    }

    gaucheA5.push(titreA5('Centres d’intérêt', 'laterale'));
    (composition.loisirs || []).forEach(function (l) { gaucheA5.push(texteA5(_premiereMajuscule(l), { after: 30 }, 'laterale')); });
    (composition.langues || []).forEach(function (l) { gaucheA5.push(texteA5(l.langue + ' — ' + l.niveau, { after: 30 }, 'laterale')); });

    // ---- Colonne droite : Compétences (fusionnées pro + repli
    // personnelles si besoin, déjà décidé par composeurComposerA5Portrait),
    // Expérience professionnelle (une ligne par expérience, sans missions).
    var droiteA5 = [];
    droiteA5.push(titreA5('Compétences', 'principale'));
    (composition.competences || []).forEach(function (c) { droiteA5.push(puceA5(c, 'principale')); });

    droiteA5.push(titreA5('Expérience professionnelle', 'principale'));
    var couleurContenuDroite = couleurContenuPourColonne('principale');
    (composition.experiences || []).forEach(function (e) {
      var dates = _formaterPeriode(e.dateDebut, e.dateFin);
      droiteA5.push(new Paragraph({ spacing: { after: 40 },
        children: [
          new TextRun({ text: e.poste, bold: true, size: TAILLE_CORPS_A5, color: couleurContenuDroite || TEXTE, font: theme.police.corps }),
          new TextRun({ text: e.entreprise ? ' — ' + e.entreprise : '', size: TAILLE_CORPS_A5, color: couleurContenuDroite || SECONDAIRE, font: theme.police.corps }),
          new TextRun({ text: dates ? '  (' + dates + ')' : '', italics: true, size: TAILLE_CORPS_A5 - 2, color: couleurContenuDroite || SECONDAIRE, font: theme.police.corps })
        ] }));
    });

    // TACHE (retour utilisateur : "Fond des colonnes... Séparateur avec
    // la couleur supplémentaire -- doivent s'appliquer normalement à
    // l'A5") : réutilise FOND_GAUCHE/FOND_DROITE et
    // theme.separateurColonnes/separateurCouleurHex déjà calculés plus
    // haut dans cette fonction, jamais une seconde logique.
    var shadingGaucheA5 = FOND_GAUCHE ? { type: docx.ShadingType.CLEAR, color: 'auto', fill: FOND_GAUCHE } : undefined;
    var shadingDroiteA5 = FOND_DROITE ? { type: docx.ShadingType.CLEAR, color: 'auto', fill: FOND_DROITE } : undefined;
    var bordureSeparateurA5 = theme.separateurColonnes
      ? { right: { style: BorderStyle.SINGLE, size: 24, color: (theme.separateurCouleurHex || PRIMAIRE) } }
      : undefined;
    var titreMetierA5 = new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      border: theme.separateurColonnes ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: (theme.separateurCouleurHex || PRIMAIRE), space: 6 } } : undefined,
      children: [ new TextRun({ text: (objetCV.objectifProfessionnel || '').toUpperCase(), bold: true, size: TAILLE_NOM_A5, color: PRIMAIRE, font: theme.police.titres, characterSpacing: 10 }) ] });
    var bordureAucune = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } };

    if (composition.formatPage === 'A5-paysage') {
      // ---- Paysage, 3 colonnes fixes : gauche = Expérience pro (haut) +
      // Formations et diplômes (bas) ; centrale = métier (haut) +
      // coordonnées (bas) ; droite = Compétences (haut) + Centres
      // d'intérêt (bas).
      var gaucheP = [];
      gaucheP.push(titreA5('Expérience professionnelle', 'laterale'));
      var couleurContenuGaucheP = couleurContenuPourColonne('laterale');
      (composition.experiences || []).forEach(function (e) {
        var dates = _formaterPeriode(e.dateDebut, e.dateFin);
        gaucheP.push(new Paragraph({ spacing: { after: 40 },
          children: [
            new TextRun({ text: e.poste, bold: true, size: TAILLE_CORPS_A5, color: couleurContenuGaucheP || TEXTE, font: theme.police.corps }),
            new TextRun({ text: e.entreprise ? ' — ' + e.entreprise : '', size: TAILLE_CORPS_A5, color: couleurContenuGaucheP || SECONDAIRE, font: theme.police.corps }),
            new TextRun({ text: dates ? '  (' + dates + ')' : '', italics: true, size: TAILLE_CORPS_A5 - 2, color: couleurContenuGaucheP || SECONDAIRE, font: theme.police.corps })
          ] }));
      });
      gaucheP.push(titreA5('Formations et diplômes', 'laterale'));
      (composition.formations || []).forEach(function (f) {
        var ligneFormation = [f.niveau, f.intitule].filter(Boolean).join(' — ');
        if (ligneFormation) { gaucheP.push(texteA5(ligneFormation, { after: 30 }, 'laterale')); }
      });
      if ((composition.certifications || []).length) {
        gaucheP.push(texteA5('Certifications : ' + composition.certifications.join(', '), { after: 30 }, 'laterale'));
      }

      var centraleP = [];
      centraleP.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [ new TextRun({ text: (objetCV.objectifProfessionnel || '').toUpperCase(), bold: true, size: TAILLE_NOM_A5, color: PRIMAIRE, font: theme.police.titres, characterSpacing: 8 }) ] }));
      centraleP.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [ new TextRun({ text: ((identite.prenom || '') + ' ' + (identite.nom || '')).trim(), bold: true, size: TAILLE_NOM_A5 - 2, color: (couleurTitrePourColonne('principale') || PRIMAIRE), font: theme.police.titres }) ] }));
      var villeCPP = [identite.ville, identite.codePostal ? '(' + identite.codePostal + ')' : ''].filter(Boolean).join(' ');
      [identite.email, identite.telephone, villeCPP].filter(Boolean).forEach(function (ligne) {
        centraleP.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 },
          children: [ new TextRun({ text: ligne, size: TAILLE_CORPS_A5, color: (couleurContenuPourColonne('principale') || SECONDAIRE), font: theme.police.corps }) ] }));
      });
      var permisP = objetCV.permis || {};
      if (permisP.possede) {
        centraleP.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 },
          children: [ new TextRun({ text: 'Permis ' + (permisP.categories || []).join('/') + (permisP.vehicule ? ' + véhicule' : ''), size: TAILLE_CORPS_A5, color: (couleurContenuPourColonne('principale') || SECONDAIRE), font: theme.police.corps }) ] }));
      }

      var droiteP = [];
      droiteP.push(titreA5('Compétences', 'principale'));
      (composition.competences || []).forEach(function (c) { droiteP.push(puceA5(c, 'principale')); });
      droiteP.push(titreA5('Centres d’intérêt', 'principale'));
      (composition.loisirs || []).forEach(function (l) { droiteP.push(texteA5(_premiereMajuscule(l), { after: 30 }, 'principale')); });
      (composition.langues || []).forEach(function (l) { droiteP.push(texteA5(l.langue + ' — ' + l.niveau, { after: 30 }, 'principale')); });

      // TACHE (retour utilisateur : "fond des colonnes... +1 pour
      // format paysage le bouton milieu") : 5e option, exclusive au
      // paysage -- theme.fondColonnes === 'milieu' colore la colonne
      // CENTRALE (jamais gauche/droite en même temps), sans toucher au
      // mécanisme existant (FOND_GAUCHE/FOND_DROITE inchangés).
      var FOND_MILIEU_A5 = (theme.fondColonnes === 'milieu') ? PRIMAIRE : null;
      var shadingCentraleP = FOND_MILIEU_A5 ? { type: docx.ShadingType.CLEAR, color: 'auto', fill: FOND_MILIEU_A5 } : undefined;
      var bordureGaucheP = theme.separateurColonnes ? { right: { style: BorderStyle.SINGLE, size: 24, color: (theme.separateurCouleurHex || PRIMAIRE) } } : undefined;
      var bordureCentraleP = theme.separateurColonnes ? { right: { style: BorderStyle.SINGLE, size: 24, color: (theme.separateurCouleurHex || PRIMAIRE) } } : undefined;

      var enfantsA5 = [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: bordureAucune,
          rows: [ new TableRow({ children: [
            new TableCell({ width: { size: 3400, type: WidthType.DXA }, shading: shadingGaucheA5, borders: bordureGaucheP, margins: { top: 100, bottom: 100, left: 100, right: 150 }, verticalAlign: VerticalAlign.TOP, children: gaucheP }),
            new TableCell({ width: { size: 3400, type: WidthType.DXA }, shading: shadingCentraleP, borders: bordureCentraleP, margins: { top: 100, bottom: 100, left: 150, right: 150 }, verticalAlign: VerticalAlign.TOP, children: centraleP }),
            new TableCell({ width: { size: 3400, type: WidthType.DXA }, shading: shadingDroiteA5, margins: { top: 100, bottom: 100, left: 150, right: 100 }, verticalAlign: VerticalAlign.TOP, children: droiteP })
          ] }) ]
        })
      ];

      return new Document({
        numbering: { config: [ { reference: refPuces, levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 200, hanging: 150 } } } }
        ] } ] },
        sections: [ {
          properties: { page: { size: { width: 11906, height: 8391 }, margin: { top: 500, bottom: 500, left: 500, right: 500 } } },
          children: enfantsA5
        } ]
      });
    }

    var enfantsA5 = [
      titreMetierA5,
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: bordureAucune,
        rows: [ new TableRow({ children: [
          new TableCell({ width: { size: 5000, type: WidthType.DXA }, shading: shadingGaucheA5, borders: bordureSeparateurA5, margins: { top: 100, bottom: 0, left: 100, right: 150 }, verticalAlign: VerticalAlign.TOP, children: gaucheA5 }),
          new TableCell({ width: { size: 5000, type: WidthType.DXA }, shading: shadingDroiteA5, margins: { top: 100, bottom: 0, left: 150, right: 100 }, verticalAlign: VerticalAlign.TOP, children: droiteA5 })
        ] }) ]
      })
    ];

    return new Document({
      numbering: { config: [ { reference: refPuces, levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 200, hanging: 150 } } } }
      ] } ] },
      sections: [ {
        properties: { page: { size: { width: 8391, height: 11906 }, margin: { top: 500, bottom: 500, left: 500, right: 500 } } },
        children: enfantsA5
      } ]
    });
  }

  var enfantsEnTete;

  // TACHE (Projet XXL) : en-tête entièrement différente (2 zones) --
  // branche isolée, AUCUNE modification de l'en-tête "classique"
  // ci-dessous (utilisée par Sobre/Institutionnel/Moderne).
  if (estProjetXXL) {
    enfantsEnTete = _projetxxlConstruireEnTete(docx, objetCV, theme, PRIMAIRE, TEXTE, taillePolice);
  } else {
    enfantsEnTete = [];
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
  }

  // ---- Rubriques : une fonction par rubrique, jamais deux fois la même
  // logique de rendu -- TACHE (étape B2, "2 colonnes") : auparavant une
  // simple boucle qui poussait directement dans "enfants" (V1, colonne
  // latérale toujours vide) ; devient une fonction qui RETOURNE un
  // tableau, appelable indépendamment pour composition.repartitionColonnes
  // .principale ET .laterale -- le contenu de chaque rubrique ne change
  // jamais selon la colonne où elle atterrit, seule sa position change. ----
  function dessinerRubrique(rubrique, colonne) {
    // TACHE (retour utilisateur : "Fond des colonnes", effet
    // "texteContenu") : couleur imposée au CONTENU (missions, dates,
    // puces) de cette colonne si l'effet est actif -- null sinon (garde
    // alors la couleur par défaut du texteSimple/puce appelant, jamais
    // touchée). opt() fusionne cette couleur dans les options passées à
    // texteSimple()/puce() SANS écraser une couleur déjà explicitement
    // demandée par l'appelant (ex. SECONDAIRE pour la ligne meta) --
    // cette dernière reste alors prioritaire (voir cas d'usage plus bas,
    // où le choix explicite existant est conservé volontairement).
    var couleurContenu = couleurContenuPourColonne(colonne);
    function opt(o, forcerCouleur) {
      o = o || {};
      var copie = {};
      Object.keys(o).forEach(function (cle) { copie[cle] = o[cle]; });
      if (couleurContenu && (forcerCouleur || !copie.color)) { copie.color = couleurContenu; }
      return copie;
    }
    var enfants = [];
    if (rubrique === 'profil') {
      var texteProfil = (objetCV.profil && (objetCV.profil.profilIA || objetCV.profil.profilUtilisateur)) || '';
      if (texteProfil) {
        enfants.push(titreSection('Profil', colonne));
        enfants.push(texteSimple(texteProfil, opt()));
      }
    } else if (rubrique === 'experiences') {
      // TACHE ("le document fait 4 pages") : composition.contenuRetenu.experiences
      // (deja plafonne par capacites.experiences, voir composeurComposition.js)
      // -- jamais objetCV.experiences directement, qui contient TOUT sans
      // limite.
      var experiences = composition.contenuRetenu.experiences;
      if (experiences.length) {
        enfants.push(titreSection('Expérience professionnelle', colonne));
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
            var infosLigne = [e.entreprise, e.lieu, _formaterPeriode(e.dateDebut, e.dateFin)].filter(Boolean).join(' · ');
            // TACHE (retour utilisateur : "double points entre les mots,
            // comme si 2 phrases qui devraient avoir leur propre ligne se
            // retrouvaient sur la même") : bug réel trouvé -- e.missions
            // est stocké ligne par ligne (séparateur \n, voir
            // composeurComposition.js qui le découpe déjà ainsi pour la
            // troncature) mais un \n brut dans un TextRun docx.js ne
            // produit JAMAIS de saut de ligne réel -- les lignes se
            // retrouvaient collées les unes aux autres. En mode compact
            // (une seule ligne par expérience), les lignes de missions
            // sont rejointes proprement avec « · » au lieu du \n brut.
            var missionsCompactes = _decouperMissions(e.missions).map(_sansPonctuationFinale).filter(Boolean).join(' · ');
            var ligne = e.poste + (infosLigne ? ' — ' + infosLigne : '') + (missionsCompactes ? ' : ' + missionsCompactes : '');
            enfants.push(puce(ligne, opt()));
          });
        } else {
          // TACHE (retour utilisateur : "je veux que les années soient
          // dans la continuité du métier... pour gagner de l'espace,
          // mais seulement si au moins 2 expériences pro -- pour un CV
          // déjà faible/peu fourni, garder les dates sur leur propre
          // ligne") : Projet XXL uniquement (Sobre/Institutionnel/
          // Moderne gardent leur format à 2 lignes, quel que soit le
          // nombre d'expériences -- jamais demandé pour eux). Seuil basé
          // sur le nombre d'expériences PRO retenues elles-mêmes (pas le
          // total pro+perso de la correction précédente -- énoncé
          // différemment par la personne : "au moins 2 expériences pro").
          var datesEnLigne = estProjetXXL && experiences.length >= 2;
          var LARGEUR_TAB_TWIPS = 6100;
          // TACHE (retour utilisateur : "poste — entreprise trop long
          // pour tenir sur une ligne avec les dates -- réduire légèrement
          // la police de cette ligne précise") : docx.js/Word ne permet
          // aucune mesure réelle du texte au moment de la génération
          // (architecture §4.3) -- estimation calibrée empiriquement
          // (mesure réelle sur PDF converti, LibreOffice : "Travaux" en
          // gras à 15pt mesurait 57.5pt sur 7 caractères, soit ≈8.2pt/
          // caractère, ratio ≈0.55 par point de taille) plutôt qu'une
          // vraie mesure, donc volontairement prudente (marge de
          // sécurité incluse) -- peut réduire une ligne qui tiendrait
          // en réalité de justesse, jamais l'inverse (un débordement réel
          // non anticipé serait pire qu'une réduction légèrement trop
          // prudente).
          function tailleLigneDatesAjustee(posteEntrepriseTxt, datesTxt) {
            var tailleDemiDefaut = taillePolice; // demi-points (docx.js)
            var tailleMinDemi = 24; // 12pt -- plancher dur R003 (composeurRegles.js), jamais franchi
            var tailleDemi = tailleDemiDefaut;
            while (tailleDemi > tailleMinDemi) {
              var taillePt = tailleDemi / 2;
              var largeurPosteEntreprisePt = posteEntrepriseTxt.length * 0.55 * taillePt;
              var largeurDatesPt = datesTxt.length * 0.48 * (taillePt - 2);
              var margeSecuritePt = 12;
              if ((largeurPosteEntreprisePt + largeurDatesPt + margeSecuritePt) <= (LARGEUR_TAB_TWIPS / 20)) { break; }
              tailleDemi -= 2; // reduit d'1pt a chaque iteration
            }
            return tailleDemi;
          }
          // TACHE (retour utilisateur : "récupérer de Trajectoire l'idée
          // d'avoir les dates avant le poste... l'entreprise n'est jamais
          // la chose centrale, toujours une annexe, dans les deux cas") :
          // poste et entreprise sont désormais TOUJOURS deux TextRun
          // distincts (avant, "Poste — Entreprise" formait un seul bloc
          // en gras) -- l'entreprise reste toujours en couleur secondaire,
          // jamais en gras, quel que soit l'ordre choisi. LARGEUR_TAB_DATE_AVANT
          // : largeur réservée à la colonne des dates en mode "dateAvant"
          // (tabulation alignée à GAUCHE, jamais à droite dans ce mode) --
          // calibrée pour une plage de dates typique ("2015 - 2020").
          var LARGEUR_TAB_DATE_AVANT = 1500;
          experiences.forEach(function (e) {
            var dates = _formaterPeriode(e.dateDebut, e.dateFin);
            var posteEntreprise = e.poste + (e.entreprise ? ' — ' + e.entreprise : '');
            if (datesEnLigne && dates) {
              // Poste — entreprise [tabulation] dates (ou l'inverse selon
              // theme.ordreDatesPoste), sur UNE seule ligne -- tabulation
              // alignée à droite de la colonne principale (6600 twips,
              // moins ses marges ≈ 6250 utiles) en mode "posteAvant" ;
              // alignée à gauche, largeur fixe réservée aux dates, en mode
              // "dateAvant". Projet XXL est toujours en 2 colonnes
              // désormais (mode 1 colonne désactivé, voir composeurTheme.js),
              // largeur donc stable.
              var tailleLigne = tailleLigneDatesAjustee(posteEntreprise, dates);
              var runPoste = new TextRun({ text: e.poste, bold: true, size: tailleLigne, color: TEXTE, font: theme.police.corps });
              var runEntreprise = new TextRun({ text: e.entreprise ? ' — ' + e.entreprise : '', size: tailleLigne, color: SECONDAIRE, font: theme.police.corps });
              if (theme.ordreDatesPoste === 'dateAvant') {
                enfants.push(new Paragraph({
                  spacing: { after: Math.round(20 * espacementExtra) },
                  tabStops: [ { type: TabStopType.LEFT, position: LARGEUR_TAB_DATE_AVANT } ],
                  keepLines: !!composition.controleVeuvesOrphelines,
                  children: [
                    new TextRun({ text: dates, italics: true, size: tailleLigne - 4, color: (couleurContenu || SECONDAIRE), font: theme.police.corps }),
                    new TextRun({ text: '\t', size: tailleLigne }),
                    runPoste, runEntreprise
                  ]
                }));
              } else {
                enfants.push(new Paragraph({
                  spacing: { after: Math.round(20 * espacementExtra) },
                  tabStops: [ { type: TabStopType.RIGHT, position: LARGEUR_TAB_TWIPS } ],
                  keepLines: !!composition.controleVeuvesOrphelines,
                  children: [ runPoste, runEntreprise, new TextRun({ text: '\t', size: tailleLigne }),
                    new TextRun({ text: dates, italics: true, size: tailleLigne - 4, color: (couleurContenu || SECONDAIRE), font: theme.police.corps }) ]
                }));
              }
              if (e.lieu) { enfants.push(texteSimple(e.lieu, opt({ italics: true, size: tailleLigne - 4, color: SECONDAIRE, after: 60 }, true))); }
            } else {
              enfants.push(new Paragraph({
                spacing: { after: 20 },
                children: [
                  new TextRun({ text: e.poste, bold: true, size: taillePolice, color: TEXTE, font: theme.police.corps }),
                  new TextRun({ text: e.entreprise ? ' — ' + e.entreprise : '', size: taillePolice, color: SECONDAIRE, font: theme.police.corps })
                ]
              }));
              var meta = [e.lieu, dates].filter(Boolean).join(' · ');
              if (meta) { enfants.push(texteSimple(meta, opt({ italics: true, size: taillePolice - 4, color: SECONDAIRE, after: 60 }, true))); }
            }
            // TACHE (retour utilisateur : "Condensé/Épuré -- Épuré, c'est
            // le modèle qu'on a déjà [confirmé par comparaison de 2 CV
            // réels, paragraphe par paragraphe : rendu identique à
            // aujourd'hui, une puce par ligne de mission]. Condensé,
            // c'est la continuité d'une mission sur la ligne de la
            // précédente, jamais un nouveau départ de ligne.") : Projet
            // XXL uniquement (theme.styleProfessionnel n'existe pas pour
            // les 3 autres thèmes, jamais concernés). "epure" (défaut)
            // garde le comportement historique (une puce par ligne,
            // inchangé) -- "condense" fusionne toutes les missions de
            // CETTE expérience en une seule puce, séparées par « · »,
            // jamais un nouveau paragraphe par mission. Volontairement
            // indépendant du mécanisme de débordement A/B (qui, lui,
            // réduit le NOMBRE de missions) -- ici, aucune mission n'est
            // jamais perdue, uniquement la mise en forme change.
            if (estProjetXXL && theme.styleProfessionnel === 'condense') {
              // TACHE (retour utilisateur, précision sur capture d'écran :
              // "à la fin de chaque mission il n'y a pas de point de fin
              // de phrase, la seule chose qui sépare une mission c'est ·
              // avec un espace de chaque côté") : le point final de
              // chaque mission est retiré avant la fusion (jamais
              // laissé, même sur la toute dernière mission) -- seul « · »
              // (espace-point médian-espace) sépare les missions,
              // jamais un point classique nulle part dans le résultat.
              var missionsCondensees = _decouperMissions(e.missions).map(_sansPonctuationFinale).filter(Boolean).join(' · ');
              if (missionsCondensees) { enfants.push(puce(missionsCondensees, opt())); }
            } else {
              // TACHE (retour utilisateur : "je veux le gros point, tel
              // que tu as fait initialement -- le petit point venait
              // d'une altération au copier-coller dans cette fenêtre de
              // dialogue, pas de mon intention réelle") : retour à
              // puce() ("•", comportement historique) -- puceEpure()
              // ("·") retiré, jamais utilisé nulle part au final.
              // TACHE (retour utilisateur, bug trouvé : "Épuré -- aucun
              // changement... chaque mission doit commencer avec la puce
              // et se terminer par un point") : _decouperMissions() gère
              // désormais le format Découverte (« ; ») en plus des sauts
              // de ligne -- un point unique est reconstruit à la fin de
              // chaque mission (jamais laissé tel quel : le texte source
              // peut déjà en avoir un, ou pas du tout selon son origine).
              _decouperMissions(e.missions).forEach(function (segment) {
                var texteMission = _sansPonctuationFinale(segment);
                if (texteMission) { enfants.push(puce(texteMission + '.', opt())); }
              });
            }
          });
        }
      }
    } else if (rubrique === 'formations') {
      var formations = composition.contenuRetenu.formations;
      // TACHE (retour utilisateur : "CACES/titre pro = certification, doit
      // impérativement apparaître... intégrer la partie Formation pour
      // Projet XXL") : certifications dessinées ICI, dans le même bloc
      // "Formation" (jamais un titre séparé) -- UNIQUEMENT pour Projet
      // XXL. Pour les 3 autres thèmes, ce tableau reste vide (voir
      // composeurComposition.js : la rubrique 'certifications' séparée
      // n'est injectée QUE pour eux, jamais pour Projet XXL), donc cette
      // ligne n'a structurellement aucun effet en dehors de Projet XXL.
      var certificationsIntegrees = estProjetXXL ? composition.contenuRetenu.certifications : [];
      if (formations.length || certificationsIntegrees.length) {
        enfants.push(titreSection('Formations et diplômes', colonne));
        formations.forEach(function (f) {
          // TACHE (retour utilisateur : "pour la formation je ne veux
          // pas avoir les années -- pas affiché sur le CV en tout cas")
          // : l'année reste dans dossier.formations (utile pour l'IA/un
          // futur usage), simplement plus affichée ici.
          var ligne = [f.niveau, f.intitule].filter(Boolean).join(' — ');
          if (ligne) { enfants.push(texteSimple(ligne, opt({ after: 60 }))); }
        });
        // TACHE (retour utilisateur : "je les veux sur la même ligne,
        // pas une certification par ligne -- Certifications : R482
        // R485...") : une seule ligne, jamais une puce par certification.
        if (certificationsIntegrees.length) {
          enfants.push(texteSimple('Certifications : ' + certificationsIntegrees.join(', '), opt({ after: 60 })));
        }
      }
    } else if (rubrique === 'certifications') {
      // TACHE (retour utilisateur : bug de contenu manquant, corrigé) :
      // rubrique EXCLUSIVE aux 3 thèmes non-Projet XXL (jamais injectée
      // pour Projet XXL, voir composeurComposition.js -- intégrée à
      // "Formation" pour ce thème à la place). Section séparée "Certifications",
      // cohérente avec la convention déjà utilisée par le pipeline des 16
      // modèles classiques (exportDocxNatifCV.js et les autres).
      var certificationsSeparees = composition.contenuRetenu.certifications;
      if (certificationsSeparees && certificationsSeparees.length) {
        enfants.push(titreSection('Certifications', colonne));
        certificationsSeparees.forEach(function (c) { enfants.push(puce(c, opt())); });
      }
    } else if (rubrique === 'competencesCles') {
      // TACHE (étape 4) : lit composition.contenuRetenu.competencesCles,
      // déjà sélectionné par R006 (composeurComposition.js) -- ce fichier
      // ne décide jamais quelles compétences afficher, seulement comment
      // les dessiner.
      var competencesCles = composition.contenuRetenu.competencesCles;
      if (competencesCles && competencesCles.length) {
        enfants.push(titreSection('Compétences clés', colonne));
        enfants.push(texteSimple(competencesCles.join('  ·  '), opt({ bold: true, after: 140 })));
      }
    } else if (rubrique === 'competences') {
      // TACHE (étape 3) : lit composition.strategieCV et
      // composition.contenuRetenu.competencesGroupees, tous deux déjà
      // construits par le Composition Engine (composeurComposition.js) --
      // ce fichier ne décide jamais lui-même s'il faut grouper, il
      // dessine ce qu'on lui donne (source unique de vérité).
      var competencesGroupees = composition.contenuRetenu.competencesGroupees;
      if (competencesGroupees && competencesGroupees.length) {
        enfants.push(titreSection('Compétences professionnelles', colonne));
        competencesGroupees.forEach(function (groupe) {
          enfants.push(texteSimple(groupe.theme, opt({ bold: true, after: 40, color: SECONDAIRE }, true)));
          groupe.items.forEach(function (item) {
            // TACHE (étape 5) : item est désormais {texte, illustrePar}
            // (composeurComposition.js) -- ce fichier dessine tel quel,
            // ne décide jamais si "Illustré par" doit apparaître (ça
            // découle uniquement de ce que experiencesQuiDemontrent() a
            // trouvé, déjà tranché en amont).
            enfants.push(puce(item.texte, opt()));
            if (item.illustrePar && item.illustrePar.length) {
              enfants.push(texteSimple('Illustré par : ' + item.illustrePar.join(', '), opt({ italics: true, size: taillePolice - 4, color: SECONDAIRE, after: 100 }, true)));
            }
          });
        });
      } else {
        var toutes = composition.contenuRetenu.competences;
        if (toutes.length) {
          // TACHE (retour utilisateur : "en Essentiel, fusionner pro et
          // comportementales en 1 bloc -- Compétences et qualités") :
          // composition.contenuRetenu.competences porte déjà les 2
          // catégories fusionnées dans ce cas précis (composeurComposition.js,
          // fusionnerCompetencesXXL) -- ce fichier ne fait qu'adapter le
          // TITRE affiché, jamais une seconde logique de fusion. Hors de
          // ce cas exact (Projet XXL + A4 Essentiel), titre inchangé.
          var titreCompetences = (estProjetXXL && composition.formatEssentiel)
            ? 'Compétences et qualités' : 'Compétences professionnelles';
          enfants.push(titreSection(titreCompetences, colonne));
          toutes.forEach(function (t) { enfants.push(puce(t, opt())); });
        }
      }
    } else if (rubrique === 'langues') {
      var langues = composition.contenuRetenu.langues;
      if (langues.length) {
        enfants.push(titreSection('Langues', colonne));
        langues.forEach(function (l) { enfants.push(texteSimple(l.langue + ' — ' + l.niveau, opt({ after: 60 }))); });
      }
    } else if (rubrique === 'loisirsEngagements') {
      var loisirs = composition.contenuRetenu.loisirs, engagements = composition.contenuRetenu.engagements;
      if (loisirs.length) {
        enfants.push(titreSection('Centres d’intérêt', colonne));
        // TACHE (retour utilisateur : "sport extrêmes, moto -- je veux
        // bien voir chaque centre d'intérêt commencer par une majuscule")
        // : la donnée elle-même (elementsFactuels) reste inchangée
        // (jamais reformulée, voir decouverte-competences.md) -- seule
        // la MISE EN FORME à l'affichage ajoute une majuscule en tête,
        // jamais sur le reste du mot (une casse déjà correcte, ex. un
        // sigle "VTT", n'est jamais altérée après la 1ère lettre).
        loisirs.forEach(function (t) { enfants.push(texteSimple(_premiereMajuscule(t), opt({ after: 60 }))); });
      }
      // TACHE (retour utilisateur : "mélange entre loisirs et centre
      // d'intérêt") : pour Projet XXL, "Centre d'intérêt" ne contient plus
      // QUE les activités pratiquées (loisirs) -- les engagements sont
      // desormais dessines ailleurs, dans leur propre rubrique
      // 'experiencesPersonnelles' (voir plus bas), jamais ici. Comportement
      // inchangé pour Sobre/Institutionnel/Moderne (les deux blocs restent
      // affiches l'un a la suite de l'autre, comme avant).
      // TACHE (chantier "exp perso", Phase 4 : engagements structurés) :
      // un engagement peut désormais être soit une chaîne (ancienne
      // donnée, ou saisie manuelle via un autre parcours jamais modifié
      // ici), soit un objet {texte, dateDebut, dateFin} (Découverte,
      // depuis cette Phase 4) -- _texteEngagement() gère les deux formes,
      // jamais un "[object Object]" affiché par erreur.
      if (!estProjetXXL && engagements.length) {
        enfants.push(titreSection('Engagements', colonne));
        engagements.forEach(function (t) { enfants.push(texteSimple(_texteEngagement(t), opt({ after: 60 }))); });
      }
    } else if (rubrique === 'experiencesPersonnelles') {
      // TACHE (retour utilisateur : "combiner experiencesPersonnelles ET
      // engagements") : 2 sources distinctes fusionnées dans le meme
      // bloc, chacune avec son propre style -- objetCV.experiencesPersonnelles
      // (structuré {intitule, detail}, le "vrai" champ dédié, SCHEMA_CV.md)
      // dessiné en premier avec un rendu plus riche (intitulé en gras,
      // détail en second, meme esprit que le rendu 'experiences' plus
      // haut) puisque c'est la source la plus "détaillée" ; engagements
      // (simple liste de phrases, ou désormais d'objets structurés)
      // ensuite, en texte simple comme avant.
      // Rubrique EXCLUSIVE a Projet XXL (jamais injectee pour les 3
      // autres themes, voir composeurComposition.js).
      var experiencesPerso = composition.contenuRetenu.experiencesPersonnelles;
      var engagementsBloc = composition.contenuRetenu.engagements;
      if ((experiencesPerso && experiencesPerso.length) || (engagementsBloc && engagementsBloc.length)) {
        enfants.push(titreSection('Expérience personnelle', colonne));
        // TACHE (retour utilisateur : "Condensé/Épuré... Personnel") :
        // par analogie avec "Professionnel" (missions fusionnées en une
        // seule puce) -- ce bloc n'a pas de "missions" multiples par
        // entrée mais plusieurs ENTRÉES distinctes (experiencesPersonnelles
        // + engagements) -- "condense" fusionne donc les ENTRÉES entre
        // elles en une seule puce, séparées par « · », plutôt que les
        // missions au sein d'une même expérience. Le détail
        // (experiencesPersonnelles[].detail) et les dates inline des
        // engagements sont volontairement simplifiés dans ce mode (juste
        // l'intitulé/texte de chaque entrée) -- un mode condensé sert à
        // gagner de la place, pas à montrer le détail complet.
        if (estProjetXXL && theme.stylePersonnel === 'condense') {
          var entreesCondensees = (experiencesPerso || []).map(function (e) { return e.intitule; })
            .concat((engagementsBloc || []).map(_texteEngagement))
            .filter(Boolean)
            .join(' · ');
          if (entreesCondensees) { enfants.push(puce(entreesCondensees, opt())); }
        } else {
          // TACHE (retour utilisateur : "autres parcours -- pouvoir
          // mettre des dates [aux expériences personnelles], une mère au
          // foyer... je veux valoriser ça") : les variables ci-dessous
          // (seuil, largeur de tabulation, fonction d'ajustement de
          // police) sont désormais déclarées AVANT le rendu des
          // experiencesPersonnelles, pour être réutilisées par les DEUX
          // boucles (experiencesPerso ET engagements) -- même mécanisme
          // EXACT que celui construit pour les engagements (chantier
          // "exp perso", Phase 5), jamais réinventé. Le commentaire
          // précédent ("experiencesPersonnelles n'a lui-même aucune
          // date") est désormais dépassé : ce chantier leur ajoute
          // justement ce champ, via le parcours manuel catalogue
          // (Certifications/Loisirs restent, eux, strictement inchangés).
          var totalItemsExpPerso = (experiencesPerso ? experiencesPerso.length : 0) + (engagementsBloc ? engagementsBloc.length : 0);
          var datesEnLigneEngagement = estProjetXXL && totalItemsExpPerso >= 2;
          var LARGEUR_TAB_ENGAGEMENT = 6100;
          var tailleEngagementAjustee = function (texteEngagementTxt, datesTxt) {
            var tailleDemi = taillePolice;
            var tailleMinDemi = 24; // 12pt -- plancher dur R003, jamais franchi
            while (tailleDemi > tailleMinDemi) {
              var taillePt = tailleDemi / 2;
              var largeurTextePt = texteEngagementTxt.length * 0.5 * taillePt;
              var largeurDatesPt = datesTxt.length * 0.48 * (taillePt - 2);
              if ((largeurTextePt + largeurDatesPt + 12) <= (LARGEUR_TAB_ENGAGEMENT / 20)) { break; }
              tailleDemi -= 2;
            }
            return tailleDemi;
          };
          (experiencesPerso || []).forEach(function (e) {
            var datesExpPerso = _formaterPeriode(e.dateDebut, e.dateFin);
            if (datesEnLigneEngagement && datesExpPerso) {
              var tailleLigneExpPerso = tailleEngagementAjustee(e.intitule, datesExpPerso);
              enfants.push(new Paragraph({
                spacing: { after: Math.round(20 * espacementExtra) },
                tabStops: [ { type: TabStopType.RIGHT, position: LARGEUR_TAB_ENGAGEMENT } ],
                keepLines: !!composition.controleVeuvesOrphelines,
                children: [
                  new TextRun({ text: e.intitule, bold: true, size: tailleLigneExpPerso, color: TEXTE, font: theme.police.corps }),
                  new TextRun({ text: '\t' + datesExpPerso, italics: true, size: tailleLigneExpPerso - 4, color: (couleurContenu || SECONDAIRE), font: theme.police.corps })
                ]
              }));
            } else {
              enfants.push(texteSimple(e.intitule, { bold: true, after: 20 }));
            }
            if (e.detail) { enfants.push(texteSimple(e.detail, opt({ size: taillePolice - 4, color: SECONDAIRE, after: 60 }, true))); }
            // TACHE (retour utilisateur : "je veux bien que les
            // expériences personnelles aient des missions au même titre
            // que l'expérience professionnelle") : même principe EXACT
            // que pour les engagements plus bas -- une puce par ligne,
            // absente en mode Condensé (déjà simplifié à l'intitulé
            // seul). Alimenté par le parcours manuel (catalogue,
            // ajouterAuCatalogue) -- Découverte, lui, n'alimente jamais
            // experiencesPersonnelles (voir mémoire "exp perso"), donc
            // ce champ reste vide dans ce cas, jamais un plantage.
            if (e.missions) {
              _decouperMissions(e.missions).forEach(function (segment) {
                var texteMission = _sansPonctuationFinale(segment);
                if (texteMission) { enfants.push(puce(texteMission + '.', opt())); }
              });
            }
          });
          // TACHE (chantier "exp perso", Phase 5 : brancher le rendu déjà
          // construit pour les expériences pro sur les engagements,
          // maintenant que leurs dates existent réellement, Phase 4) :
          // même principe EXACT que le rendu 'experiences' plus haut
          // (tabulation alignée à droite, réduction de police ciblée si la
          // ligne est trop longue) -- jamais réinventé, adapté ici au
          // texte seul de l'engagement (pas de poste/entreprise séparés).
          // Seuil "2+ éléments" appliqué au total du bloc (experiencesPerso
          // + engagements), même esprit que "2+ expériences pro" plus haut.
          (engagementsBloc || []).forEach(function (t) {
            var texteEng = _texteEngagement(t);
            var datesEng = (t && typeof t === 'object') ? _formaterPeriode(t.dateDebut, t.dateFin) : '';
            if (datesEnLigneEngagement && datesEng) {
              var tailleLigneEng = tailleEngagementAjustee(texteEng, datesEng);
              enfants.push(new Paragraph({
                spacing: { after: Math.round(60 * espacementExtra) },
                tabStops: [ { type: TabStopType.RIGHT, position: LARGEUR_TAB_ENGAGEMENT } ],
                keepLines: !!composition.controleVeuvesOrphelines,
                children: [
                  new TextRun({ text: texteEng, size: tailleLigneEng, color: TEXTE, font: theme.police.corps }),
                  new TextRun({ text: '\t' + datesEng, italics: true, size: tailleLigneEng - 4, color: (couleurContenu || SECONDAIRE), font: theme.police.corps })
                ]
              }));
            } else {
              // TACHE (retour utilisateur, bug trouvé en testant : "avec 1
              // seul engagement, la date disparaissait complètement") :
              // même repli que pour les expériences pro (ligne séparée,
              // jamais un simple abandon de l'information) -- seul
              // l'alignement en tabulation change selon le seuil, jamais
              // la présence de la date elle-même.
              enfants.push(texteSimple(texteEng, opt({ after: datesEng ? 20 : 60 })));
              if (datesEng) { enfants.push(texteSimple(datesEng, opt({ italics: true, size: taillePolice - 4, color: SECONDAIRE, after: 60 }, true))); }
            }
            // TACHE (retour utilisateur : "je veux bien que les
            // expériences personnelles aient des missions au même titre
            // que l'expérience professionnelle... sous le même format et
            // avec les mêmes règles") : une puce par mission, exactement
            // le même principe que le rendu 'experiences' en mode Épuré
            // plus haut -- jamais un second mécanisme dupliqué. Absent en
            // mode Condensé (voir plus haut : ce mode simplifie déjà
            // volontairement à l'intitulé/texte seul).
            // TACHE (retour utilisateur, bug trouvé : "Épuré -- aucun
            // changement") : _decouperMissions() gère désormais le
            // format Découverte (missions jointes par « ; »,
            // _decouverteConcatenerPreuve) en plus des sauts de ligne
            // (saisie manuelle) -- sans ce correctif, un texte Découverte
            // ne formait qu'un seul "morceau", jamais découpé en
            // plusieurs puces.
            if (t && typeof t === 'object' && t.missions) {
              _decouperMissions(t.missions).forEach(function (segment) {
                var texteMission = _sansPonctuationFinale(segment);
                if (texteMission) { enfants.push(puce(texteMission + '.', opt())); }
              });
            }
          });
        }
      }
    } else if (rubrique === 'competencesPersonnelles') {
      // TACHE (retour utilisateur : "compétences personnelles" -- bloc
      // additif, jamais un remplacement des loisirs, voir cv.md point
      // 10) : lit composition.contenuRetenu.competencesPersonnelles,
      // déjà décidé et construit en amont -- ce fichier ne fait que
      // dessiner, jamais décider si le bloc doit apparaître.
      var competencesPersonnelles = composition.contenuRetenu.competencesPersonnelles;
      if (competencesPersonnelles && competencesPersonnelles.length) {
        // TACHE (Projet XXL, renommage acté dans le document de
        // conception) : "Compétences personnelles" -> "Compétences
        // comportementales" pour ce thème uniquement -- le contenu
        // (déjà fusionné avec le savoir-être par composeurComposition.js)
        // ne change pas de forme, seul le libellé affiché change.
        enfants.push(titreSection(estProjetXXL ? 'Compétences comportementales' : 'Compétences personnelles', colonne));
        // TACHE (retour utilisateur : "ne pas marquer dans les () les
        // sources... déjà visible dans Centres d'intérêt") : plus de
        // ligne "Issu de", seulement le texte de la compétence.
        competencesPersonnelles.forEach(function (c) { enfants.push(puce(c.competence, opt())); });
      }
    } else if (rubrique === 'competencesCombinees') {
      // TACHE (retour utilisateur : "1 colonne -- compétences pro et
      // comportementales sur les mêmes lignes pour optimiser l'espace,
      // pas un bloc sous l'autre") : même technique EXACTE que la table
      // 2 colonnes du corps (Table/TableRow/TableCell), appliquée à CE
      // seul bloc -- jamais réinventée. Repli automatique en bloc
      // plein-largeur si un seul côté a du contenu -- jamais un côté
      // vide affiché à côté de l'autre (principe "si un bloc est vide,
      // on ne le met pas, optimiser l'espace").
      var competencesProCombo = composition.contenuRetenu.competences;
      var competencesComportementalesCombo = composition.contenuRetenu.competencesPersonnelles;
      var proPresent = competencesProCombo && competencesProCombo.length;
      var comportementalesPresent = competencesComportementalesCombo && competencesComportementalesCombo.length;
      if (proPresent && comportementalesPresent) {
        var celluleProEnfants = [ titreSection('Compétences professionnelles', colonne) ]
          .concat(competencesProCombo.map(function (t) { return puce(t, opt()); }));
        var celluleComportementalesEnfants = [ titreSection('Compétences comportementales', colonne) ]
          .concat(competencesComportementalesCombo.map(function (c) { return puce(c.competence, opt()); }));
        var AUCUNE_BORDURE_COMBO1 = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        enfants.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [5000, 5000],
          borders: {
            top: AUCUNE_BORDURE_COMBO1, bottom: AUCUNE_BORDURE_COMBO1, left: AUCUNE_BORDURE_COMBO1,
            right: AUCUNE_BORDURE_COMBO1, insideHorizontal: AUCUNE_BORDURE_COMBO1, insideVertical: AUCUNE_BORDURE_COMBO1
          },
          rows: [ new TableRow({ children: [
            new TableCell({ width: { size: 5000, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 0, right: 150 }, verticalAlign: VerticalAlign.TOP, children: celluleProEnfants }),
            new TableCell({ width: { size: 5000, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 150, right: 0 }, verticalAlign: VerticalAlign.TOP, children: celluleComportementalesEnfants })
          ] }) ]
        }));
      } else if (proPresent) {
        enfants.push(titreSection('Compétences professionnelles', colonne));
        competencesProCombo.forEach(function (t) { enfants.push(puce(t, opt())); });
      } else if (comportementalesPresent) {
        enfants.push(titreSection('Compétences comportementales', colonne));
        competencesComportementalesCombo.forEach(function (c) { enfants.push(puce(c.competence, opt())); });
      }
    } else if (rubrique === 'formationLangues') {
      // TACHE (retour utilisateur : "même principe côte-à-côte pour
      // Formation + Langues") : même technique que ci-dessus, même repli
      // plein-largeur si un seul côté a du contenu. Certifications
      // toujours intégrées dans le bloc Formation (comme en 2 colonnes,
      // jamais un titre séparé pour Projet XXL).
      var formationsCombo = composition.contenuRetenu.formations;
      var certificationsCombo = estProjetXXL ? composition.contenuRetenu.certifications : [];
      var languesCombo = composition.contenuRetenu.langues;
      var formationPresente = (formationsCombo && formationsCombo.length) || (certificationsCombo && certificationsCombo.length);
      var languesPresentes = languesCombo && languesCombo.length;

      var construireBlocFormationCombo = function () {
        var e = [ titreSection('Formations et diplômes', colonne) ];
        (formationsCombo || []).forEach(function (f) {
          var ligne = [f.niveau, f.intitule].filter(Boolean).join(' — ');
          if (ligne) { e.push(texteSimple(ligne, opt({ after: 60 }))); }
        });
        if ((certificationsCombo || []).length) {
          e.push(texteSimple('Certifications : ' + certificationsCombo.join(', '), opt({ after: 60 })));
        }
        return e;
      };
      var construireBlocLanguesCombo = function () {
        var e = [ titreSection('Langues', colonne) ];
        (languesCombo || []).forEach(function (l) { e.push(texteSimple(l.langue + ' — ' + l.niveau, opt({ after: 60 }))); });
        return e;
      };

      if (formationPresente && languesPresentes) {
        var AUCUNE_BORDURE_COMBO2 = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        enfants.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [5000, 5000],
          borders: {
            top: AUCUNE_BORDURE_COMBO2, bottom: AUCUNE_BORDURE_COMBO2, left: AUCUNE_BORDURE_COMBO2,
            right: AUCUNE_BORDURE_COMBO2, insideHorizontal: AUCUNE_BORDURE_COMBO2, insideVertical: AUCUNE_BORDURE_COMBO2
          },
          rows: [ new TableRow({ children: [
            new TableCell({ width: { size: 5000, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 0, right: 150 }, verticalAlign: VerticalAlign.TOP, children: construireBlocFormationCombo() }),
            new TableCell({ width: { size: 5000, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 150, right: 0 }, verticalAlign: VerticalAlign.TOP, children: construireBlocLanguesCombo() })
          ] }) ]
        }));
      } else if (formationPresente) {
        enfants = enfants.concat(construireBlocFormationCombo());
      } else if (languesPresentes) {
        enfants = enfants.concat(construireBlocLanguesCombo());
      }
    }
    return enfants;
  }

  var enfantsPrincipale = [];
  composition.repartitionColonnes.principale.forEach(function (rubrique) {
    enfantsPrincipale = enfantsPrincipale.concat(dessinerRubrique(rubrique, 'principale'));
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

  // TACHE (retour utilisateur : "bandeau de disponibilité -- permis,
  // langues, téléphone bien en évidence") : pleine largeur, entre
  // l'en-tête et le corps -- indépendant du nombre de colonnes du corps
  // (1 ou 2), toujours au même endroit. Style "pastille" (fond plein
  // coloré derrière chaque information), même technique que les modèles
  // classiques (_dnPastilles, exportDocxNatifCV_NouveauxModeles.js) --
  // réutilisée, pas réinventée, recolorée avec l'accent du thème plutôt
  // qu'une couleur fixe. Rien de tout ça si la personne n'a ni permis,
  // ni langue, ni téléphone -- jamais un bandeau vide.
  if (estProjetXXL && theme.bandeauDisponibilite) {
    var identiteBandeau = objetCV.identite || {};
    var permisBandeau = objetCV.permis || {};
    var badgesDisponibilite = [];
    if (permisBandeau.possede) {
      badgesDisponibilite.push('Permis ' + (permisBandeau.categories || []).join('/') + (permisBandeau.vehicule ? ' + véhicule' : ''));
    }
    var languesBandeau = objetCV.langues || [];
    if (languesBandeau.length) { badgesDisponibilite.push(languesBandeau.map(function (l) { return l.langue; }).join(', ')); }
    if (identiteBandeau.telephone) { badgesDisponibilite.push(identiteBandeau.telephone); }
    if (badgesDisponibilite.length) {
      var runsDisponibilite = [];
      badgesDisponibilite.forEach(function (badge, i) {
        runsDisponibilite.push(new TextRun({
          text: ' ' + badge + ' ', bold: true, size: 18, color: 'FFFFFF', font: theme.police.corps,
          shading: { type: docx.ShadingType.CLEAR, fill: PRIMAIRE, color: 'auto' }
        }));
        if (i < badgesDisponibilite.length - 1) { runsDisponibilite.push(new TextRun({ text: '  ', size: 18 })); }
      });
      enfants = enfants.concat([ new Paragraph({ spacing: { after: 200 }, children: runsDisponibilite }) ]);
    }
  }
  if (composition.colonnes === 2 && composition.repartitionColonnes.laterale.length) {
    var enfantsLaterale = [];
    composition.repartitionColonnes.laterale.forEach(function (rubrique) {
      enfantsLaterale = enfantsLaterale.concat(dessinerRubrique(rubrique, 'laterale'));
    });
    var AUCUNE_BORDURE_COMPOSEUR = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    // TACHE (retour utilisateur : "possibilité de mettre un fond comme
    // Aquarelle sur la colonne de gauche") : même technique que
    // _dnConstruireDeuxColonnes (exportDocxNatifCV.js) : shading = 
    // ShadingType.CLEAR + fill sur la TableCell entière -- réutilisée,
    // pas réinventée. undefined si pas de fond de ce côté (docx.js
    // n'applique alors aucune couleur, comportement par défaut inchangé).
    var shadingLaterale = FOND_GAUCHE ? { type: docx.ShadingType.CLEAR, color: 'auto', fill: FOND_GAUCHE } : undefined;
    var shadingPrincipale = FOND_DROITE ? { type: docx.ShadingType.CLEAR, color: 'auto', fill: FOND_DROITE } : undefined;
    // TACHE (retour utilisateur : "modèle Ruban -- ligne pour séparer les
    // colonnes") : même technique EXACTE que le modèle Ruban
    // (exportDocxNatifCV.js, optionsCelluleSidebar.borders = { right:
    // {...} }) -- une bordure posée sur la cellule latérale elle-même
    // prime sur le "insideVertical" (aucune bordure) défini au niveau de
    // la table plus bas, sans avoir à le changer pour tout le monde.
    var bordureSeparateur = theme.separateurColonnes
      ? { right: { style: BorderStyle.SINGLE, size: 24, color: (theme.separateurCouleurHex || PRIMAIRE) } }
      : undefined;
    enfants = enfants.concat([
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [3400, 6600],
        borders: {
          top: AUCUNE_BORDURE_COMPOSEUR, bottom: AUCUNE_BORDURE_COMPOSEUR, left: AUCUNE_BORDURE_COMPOSEUR,
          right: AUCUNE_BORDURE_COMPOSEUR, insideHorizontal: AUCUNE_BORDURE_COMPOSEUR, insideVertical: AUCUNE_BORDURE_COMPOSEUR
        },
        rows: [ new TableRow({ children: [
          new TableCell({ width: { size: 3400, type: WidthType.DXA }, shading: shadingLaterale, borders: bordureSeparateur, margins: { top: 100, bottom: 100, left: 150, right: 200 }, verticalAlign: VerticalAlign.TOP, children: enfantsLaterale }),
          new TableCell({ width: { size: 6600, type: WidthType.DXA }, shading: shadingPrincipale, margins: { top: 100, bottom: 100, left: 200, right: 150 }, verticalAlign: VerticalAlign.TOP, children: enfantsPrincipale })
        ] }) ]
      })
    ]);
  } else {
    enfants = enfants.concat(enfantsPrincipale);
  }

  // TACHE (retour utilisateur : "Fond des colonnes"/"Séparateur" en 1
  // colonne -- "je préfère réinterpréter plutôt que désactiver, pour ne
  // pas appauvrir le côté modulable") : sans 2 colonnes, "Fond des
  // colonnes" n'a plus de cellule à teinter -- réinterprété en fond de
  // PAGE ENTIÈRE (vraie fonctionnalité Word "Couleur de page",
  // Document({background}), jamais une bidouille). Un seul côté suffit
  // à activer le fond en 1 colonne (il n'y a plus de gauche/droite) --
  // n'importe quelle valeur de theme.fondColonnes autre que 'aucun'
  // suffit. À savoir : certaines versions de Word n'impriment un fond de
  // page que si "Imprimer les couleurs et arrière-plans" est activé côté
  // utilisateur -- limite de Word, pas de ce code.
  var fondPageEntiere = (estProjetXXL && composition.colonnes === 1 && theme.fondColonnes && theme.fondColonnes !== 'aucun')
    ? { color: PRIMAIRE }
    : undefined;

  return new Document({
    background: fondPageEntiere,
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
