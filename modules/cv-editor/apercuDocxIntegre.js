// ============================================================
// apercuDocxIntegre.js
// ------------------------------------------------------------
// TACHE (simplification : DOCX seul + apercu integre) : remplace la
// fenetre popup (window.open, visuellement deconnectee du reste de
// l'application) par un panneau integre DANS la page, avec les memes
// couleurs/police/boutons Bootstrap que le reste de l'app.
//
// Principe cle : affiche le VRAI fichier .docx via la librairie
// docx-preview -- ce n'est pas une deuxieme version qui "ressemble" au
// Word, c'est le meme fichier montre a l'ecran avant telechargement.
// Aucune divergence possible entre l'apercu et le fichier final.
//
// TACHE (traitement DOCX natif etendu a la lettre et l'entretien) :
// generalise pour les 3 types de document (CV, lettre, entretien), voir
// _configApercuDocx() ci-dessous -- un seul panneau, parametre par type,
// au lieu de trois copies presque identiques.
//
// LIMITE ASSUMEE : uniquement les modeles couverts par un generateur
// Word natif pour chaque type (voir MODELES_AVEC_DOCX_NATIF_CV/LETTRE/
// ENTRETIEN dans les fichiers exportDocxNatif*.js correspondants).
//
// PREMIERE VERSION NON TESTEE EN CONDITIONS REELLES POUR LETTRE/ENTRETIEN :
// le CV a ete confirme fonctionnel par un test reel (voir historique) --
// la partie generique de ce fichier est donc deja eprouvee, mais les
// deux nouveaux types n'ont pas encore ete testes chez vous.
// ============================================================

var _promesseLibrairieDocxPreview = null;
function chargerLibrairieDocxPreview() {
  if (_promesseLibrairieDocxPreview) { return _promesseLibrairieDocxPreview; }
  _promesseLibrairieDocxPreview = new Promise(function (resolve, reject) {
    var dejaLa = _obtenirDocxPreview();
    if (dejaLa) { resolve(dejaLa); return; }
    var scriptJsZip = document.createElement('script');
    scriptJsZip.src = 'modules/cv-editor/jszip.min.js';
    scriptJsZip.onload = function () {
      if (!window.JSZip) { reject(new Error('JSZip indisponible apres chargement.')); return; }
      var script = document.createElement('script');
      script.src = 'modules/cv-editor/docx-preview.js';
      script.onload = function () {
        var lib = _obtenirDocxPreview();
        lib ? resolve(lib) : reject(new Error('Librairie docx-preview indisponible ou nom global inattendu.'));
      };
      script.onerror = function () { reject(new Error('Impossible de charger la librairie docx-preview.')); };
      document.head.appendChild(script);
    };
    scriptJsZip.onerror = function () { reject(new Error('Impossible de charger la librairie JSZip.')); };
    document.head.appendChild(scriptJsZip);
  });
  return _promesseLibrairieDocxPreview;
}

function _obtenirDocxPreview() {
  if (window.docxPreview && typeof window.docxPreview.renderAsync === 'function') { return window.docxPreview; }
  if (window.docx && typeof window.docx.renderAsync === 'function') { return window.docx; }
  return null;
}

// ============================================================
// Configuration par type de document -- SEUL endroit a modifier pour
// brancher un futur 4e type de document sur ce meme panneau.
// ============================================================
function _configApercuDocx(type) {
  var configs = {
    cv: {
      titre: 'Aperçu du CV (Word)', nomFichier: 'cv.docx',
      modeles: function () { return typeof MODELES_CV_DISPONIBLES !== 'undefined' ? MODELES_CV_DISPONIBLES : []; },
      modelesNatifs: function () { return typeof MODELES_AVEC_DOCX_NATIF_CV !== 'undefined' ? MODELES_AVEC_DOCX_NATIF_CV : []; },
      // TACHE (format A5) : genererDocxNatifCVFormat() (formatA5CV.js) en
      // priorite si disponible -- gere lui-meme A4 (comportement inchange,
      // via construireObjetCVPourExport) et A5 (contenu recadre + page
      // reduite). Repli sur l'ancien chemin si le fichier n'est pas charge.
      // TACHE (retour utilisateur : "sans accroche") : lu directement ici
      // (etatApercuInline.cv, déjà accessible dans ce fichier) -- jamais
      // ajouté à la signature générique de generer(), partagée avec
      // lettre/entretien qui n'ont pas ce réglage.
      generer: function (modele, couleurId, formatPage) {
        if (typeof genererDocxNatifCVFormat === 'function') { return genererDocxNatifCVFormat(modele, couleurId, formatPage, etatApercuInline.cv.sansAccroche); }
        var promesseObjet = (typeof construireObjetCVPourExport === 'function')
          ? construireObjetCVPourExport(modele)
          : Promise.resolve(normaliserDonneesCV(dossier));
        return promesseObjet.then(function (objetCV) {
          if (typeof genererDocxNatifCVColore === 'function') { return genererDocxNatifCVColore(modele, objetCV, couleurId); }
          return genererDocxNatifCV(modele, objetCV);
        });
      }
    },
    lettre: {
      titre: 'Aperçu de la lettre (Word)', nomFichier: 'lettre.docx',
      modeles: function () { return typeof MODELES_LETTRE_DISPONIBLES !== 'undefined' ? MODELES_LETTRE_DISPONIBLES : []; },
      modelesNatifs: function () { return typeof MODELES_AVEC_DOCX_NATIF_LETTRE !== 'undefined' ? MODELES_AVEC_DOCX_NATIF_LETTRE : []; },
      // TACHE (couleurs + formats pour la lettre) : genererDocxNatifLettreFormat()
      // (formatsLettreEntretien.js) si disponible -- gere couleur/format,
      // repli sur l'ancienne fonction sinon (comportement inchange).
      generer: function (modele, couleurId, formatPage) {
        if (typeof genererDocxNatifLettreFormat === 'function') { return genererDocxNatifLettreFormat(modele, couleurId, formatPage); }
        return genererDocxNatifLettre(modele, normaliserDonneesLettre(dossier));
      }
    },
    entretien: {
      titre: "Aperçu de la fiche d'entretien (Word)", nomFichier: 'preparation-entretien.docx',
      modeles: function () { return typeof MODELES_ENTRETIEN_DISPONIBLES !== 'undefined' ? MODELES_ENTRETIEN_DISPONIBLES : []; },
      modelesNatifs: function () { return typeof MODELES_AVEC_DOCX_NATIF_ENTRETIEN !== 'undefined' ? MODELES_AVEC_DOCX_NATIF_ENTRETIEN : []; },
      generer: function (modele, couleurId, formatPage) {
        if (typeof genererDocxNatifEntretienFormat === 'function') { return genererDocxNatifEntretienFormat(modele, couleurId, formatPage); }
        return genererDocxNatifEntretien(modele, normaliserDonneesEntretien(dossier));
      }
    }
  };
  return configs[type] || configs.cv;
}

var _panneauApercuOuvert = false;
var _typeApercuDocxActif = 'cv';

// ============================================================
// Point d'entree public, appele depuis app.js.
// type : 'cv' | 'lettre' | 'entretien' (par defaut 'cv', pour rester
// compatible avec les appels existants ouvrirApercuDocxIntegre(modele)).
// ============================================================
function ouvrirApercuDocxIntegre(typeOuModele, modeleInitialSiType) {
  // Compatibilite : ouvrirApercuDocxIntegre('aquarelle') (1 argument,
  // ancien appel CV) reste valide, en plus du nouveau
  // ouvrirApercuDocxIntegre('cv', 'aquarelle') (2 arguments).
  var type = modeleInitialSiType !== undefined ? typeOuModele : 'cv';
  var modeleInitial = modeleInitialSiType !== undefined ? modeleInitialSiType : typeOuModele;

  var config = _configApercuDocx(type);
  if (config.modelesNatifs().indexOf(modeleInitial) === -1) {
    alert('Ce modèle ne dispose pas encore d\'un aperçu Word. Choisissez un autre modèle, ou téléchargez directement le fichier.');
    return;
  }
  // TACHE (refonte "Aperçu et finalisation" : palette de couleurs) :
  // reprend la couleur deja choisie dans l'accordeon (etatApercuInline),
  // pour que le grand apercu s'ouvre coherent avec ce qui etait affiche.
  var couleurInitiale = (typeof etatApercuInline !== 'undefined' && etatApercuInline[type]) ? etatApercuInline[type].couleur : null;
  // TACHE (format A5) : idem pour le format de page.
  var formatPageInitial = (typeof etatApercuInline !== 'undefined' && etatApercuInline[type] && etatApercuInline[type].formatPage) || 'A4';
  _typeApercuDocxActif = type;
  _construirePanneauApercuDocx(type, modeleInitial, couleurInitiale, formatPageInitial);
  _rafraichirApercuDocx(type, modeleInitial, null, null, false, couleurInitiale, formatPageInitial);
}

function _construirePanneauApercuDocx(type, modeleInitial, couleurInitiale, formatPageInitial) {
  var panneauExistant = document.getElementById('apercu-docx-panneau');
  if (panneauExistant) {
    // Reutilise le meme panneau pour un autre type -- reconstruit juste
    // le contenu specifique (titre, liste de modeles).
    panneauExistant.style.display = 'flex';
    _reconstruireContenuPanneau(type, modeleInitial, couleurInitiale, formatPageInitial);
    _panneauApercuOuvert = true;
    return;
  }

  var panneau = document.createElement('div');
  panneau.id = 'apercu-docx-panneau';
  panneau.style.cssText = 'position:fixed;inset:0;background:#FFFFFF;z-index:99999;display:flex;flex-direction:column;font-family:"Segoe UI",Roboto,system-ui,sans-serif;';
  document.body.appendChild(panneau);
  _panneauApercuOuvert = true;
  _reconstruireContenuPanneau(type, modeleInitial, couleurInitiale, formatPageInitial);
}

// TACHE (retour utilisateur : coherence, cartes de modeles ici aussi) :
// suit le modele actuellement affiche dans CE panneau (plus de <select> a
// interroger pour le savoir) -- mis a jour au clic sur une carte, lu par
// le bouton Telecharger.
var _modeleActifPanneau = null;
// TACHE (refonte "Aperçu et finalisation" : palette de couleurs) : meme
// principe que _modeleActifPanneau, pour la couleur choisie DANS ce panneau.
var _couleurActifPanneau = null;
// TACHE (format A5) : idem, pour le format de page choisi DANS ce panneau
// ('A4' par defaut, ou 'A5').
var _formatPageActifPanneau = 'A4';

function _reconstruireContenuPanneau(type, modeleActif, couleurActive, formatPageActif) {
  var config = _configApercuDocx(type);
  var panneau = document.getElementById('apercu-docx-panneau');
  if (!panneau) { return; }

  // TACHE (retour utilisateur : sélecteur de modèles A5, comme pour A4) :
  // en A5, le CV a sa PROPRE liste de modeles (MODELES_A5_CV_DISPONIBLES),
  // independante de MODELES_CV_DISPONIBLES (A4) -- meme principe que deja
  // applique au selecteur inline de l'accordeon "Aperçu et finalisation".
  var estA5CV = (type === 'cv' && formatPageActif === 'A5');
  var listeModeles = (estA5CV && typeof MODELES_A5_CV_DISPONIBLES !== 'undefined') ? MODELES_A5_CV_DISPONIBLES : config.modeles();
  var listeModelesNatifsIds = (estA5CV && typeof MODELES_AVEC_DOCX_NATIF_A5_CV !== 'undefined') ? MODELES_AVEC_DOCX_NATIF_A5_CV : config.modelesNatifs();
  var modelesNatifs = listeModeles.filter(function (m) { return listeModelesNatifsIds.indexOf(m.id) !== -1; });
  _modeleActifPanneau = modeleActif || (modelesNatifs[0] && modelesNatifs[0].id);
  _couleurActifPanneau = couleurActive || null;
  // TACHE ("Nuances rapides") : repart d'aucune rangee depliee a chaque
  // (re)ouverture du panneau -- _construirePastillesPanneau() la rouvrira
  // elle-meme sur la bonne couleur si _couleurActifPanneau est deja pose.
  _baseCouleurOuvertePanneau = null;
  _formatPageActifPanneau = formatPageActif || 'A4';
  // TACHE (couleurs + formats pour la lettre et l'entretien) : disponible
  // desormais pour les 3 types -- une fonction de verification par type.
  var FONCTIONS_SUPPORT_COULEURS_PANNEAU = {
    cv: typeof modeleSupporteCouleurs === 'function' ? modeleSupporteCouleurs : null,
    lettre: typeof modeleLettreSupporteCouleurs === 'function' ? modeleLettreSupporteCouleurs : null,
    entretien: typeof modeleEntretienSupporteCouleurs === 'function' ? modeleEntretienSupporteCouleurs : null
  };
  var fonctionSupportPanneau = FONCTIONS_SUPPORT_COULEURS_PANNEAU[type];
  var supportecouleurs = !!(fonctionSupportPanneau && fonctionSupportPanneau(_modeleActifPanneau));
  var supporteFormatA5 = true;
  var LIBELLES_MINI_PANNEAU = { cv: 'Mini CV (A5)', lettre: 'Mini lettre (A5)', entretien: 'Fiche compacte (A5)' };

  panneau.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.8rem 1.2rem;border-bottom:1px solid #E5E7EB;background:#F8F9FA;flex:none;flex-wrap:wrap;gap:0.6rem;">' +
      '<div style="display:flex;align-items:center;gap:0.6rem;flex:1;min-width:0;">' +
        '<strong style="white-space:nowrap;">' + config.titre + '</strong>' +
        '<style>#apercu-docx-carrousel-modeles .carte-modele-cv{cursor:pointer;border:2px solid #E5E7EB;border-radius:6px;' +
        'padding:0.2rem;flex:0 0 auto;width:44px;text-align:center;background:#FFFFFF;}' +
        '#apercu-docx-carrousel-modeles .carte-modele-cv:hover{border-color:#93C5FD;}' +
        '#apercu-docx-carrousel-modeles .carte-modele-cv-active{border-color:#2563EB;border-width:3px;}' +
        '#apercu-docx-carrousel-modeles .carte-modele-cv-miniature svg{width:100%;height:auto;display:block;border-radius:2px;}' +
        '#apercu-docx-carrousel-modeles .carte-modele-cv-nom{display:none;}' +
        '.pastille-couleur-apercu{width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid #FFFFFF;' +
        'box-shadow:0 0 0 1px #D1D5DB;display:inline-block;}' +
        '.pastille-couleur-apercu-active{box-shadow:0 0 0 2px #111827;}' +
        '.pastille-nuance-apercu{width:13px;height:13px;border-radius:50%;cursor:pointer;border:1px solid #FFFFFF;' +
        'box-shadow:0 0 0 1px #D1D5DB;display:inline-block;}' +
        '.pastille-nuance-apercu-active{box-shadow:0 0 0 2px #111827;}' +
        '.bouton-format-page{border:1px solid #E5E7EB;background:#FFFFFF;border-radius:999px;padding:0.15rem 0.6rem;font-size:0.78rem;cursor:pointer;}' +
        '.bouton-format-page-active{background:#111827;color:#FFFFFF;border-color:#111827;}</style>' +
        // TACHE (retour utilisateur : "dans le grand apercu, avec Mini CV
        // active, je veux voir ici que les modeles A5") : le Mini CV a sa
        // propre mise en page fixe (voir accordeonApercuDoc, js/app.js,
        // meme principe applique ici) -- le carrousel de modeles A4 n'a
        // aucun effet dans ce cas, donc masque, remplace par un message.
        (type === 'cv' && _formatPageActifPanneau === 'A5'
          ? '<span class="small text-muted" style="white-space:nowrap;">Le Mini CV a sa propre mise en page fixe</span>'
          : '<button type="button" id="apercu-docx-carrousel-gauche" aria-label="Modèles précédents" ' +
            'style="flex:none;width:24px;height:24px;border-radius:50%;border:1px solid #E5E7EB;background:#FFFFFF;">&#8592;</button>' +
            '<div id="apercu-docx-carrousel-modeles" style="display:flex;gap:0.35rem;overflow-x:auto;scroll-behavior:smooth;' +
            'max-width:320px;padding:0.15rem;"><p class="small text-muted mb-0">…</p></div>' +
            '<button type="button" id="apercu-docx-carrousel-droite" aria-label="Modèles suivants" ' +
            'style="flex:none;width:24px;height:24px;border-radius:50%;border:1px solid #E5E7EB;background:#FFFFFF;">&#8594;</button>') +
        '<div id="apercu-docx-pastilles" style="display:' + (supportecouleurs ? 'flex' : 'none') + ';gap:0.3rem;align-items:center;margin-left:0.4rem;"></div>' +
        (supporteFormatA5
          ? '<div id="apercu-docx-format-page" style="display:flex;gap:0.3rem;align-items:center;margin-left:0.4rem;">' +
            '<button type="button" class="bouton-format-page' + ((_formatPageActifPanneau === 'A4' || !_formatPageActifPanneau) ? ' bouton-format-page-active' : '') + '" data-format-page="A4">A4 Détaillé</button>' +
            '<button type="button" class="bouton-format-page' + (_formatPageActifPanneau === 'A4-essentiel' ? ' bouton-format-page-active' : '') + '" data-format-page="A4-essentiel">A4 Essentiel</button>' +
            '<button type="button" class="bouton-format-page' + (_formatPageActifPanneau === 'A5' ? ' bouton-format-page-active' : '') + '" data-format-page="A5">' + LIBELLES_MINI_PANNEAU[type] + '</button>' +
            '</div>'
          : '') +
      '</div>' +
      '<div>' +
        '<button type="button" id="apercu-docx-btn-telecharger" class="btn btn-primary btn-sm" style="margin-right:0.5rem;">Télécharger le Word</button>' +
        '<button type="button" id="apercu-docx-btn-fermer" class="btn btn-outline-secondary btn-sm">Fermer</button>' +
      '</div>' +
    '</div>' +
    '<div id="apercu-docx-message" style="padding:1rem;text-align:center;color:#6B7280;flex:none;"></div>' +
    '<div style="flex:1;overflow:auto;background:#F3F4F6;padding:1.5rem;display:flex;justify-content:center;">' +
      '<div id="apercu-docx-zone" style="background:#FFFFFF;box-shadow:0 0 8px rgba(0,0,0,0.12);min-height:200px;width:100%;max-width:850px;"></div>' +
    '</div>';

  _construirePastillesPanneau();
  var zoneFormatPage = document.getElementById('apercu-docx-format-page');
  if (zoneFormatPage) {
    zoneFormatPage.querySelectorAll('[data-format-page]').forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        var valeur = this.dataset.formatPage;
        if (valeur === _formatPageActifPanneau) { return; }
        _formatPageActifPanneau = valeur;
        zoneFormatPage.querySelectorAll('[data-format-page]').forEach(function (b) { b.classList.remove('bouton-format-page-active'); });
        this.classList.add('bouton-format-page-active');
        if (typeof etatApercuInline !== 'undefined' && etatApercuInline[_typeApercuDocxActif]) {
          etatApercuInline[_typeApercuDocxActif].formatPage = valeur;
        }
        if (typeof rechargerApercuInline === 'function') { rechargerApercuInline(_typeApercuDocxActif, _modeleActifPanneau); }
        _rafraichirApercuDocx(_typeApercuDocxActif, _modeleActifPanneau, null, null, false, _couleurActifPanneau, valeur);
      });
    });
  }

  document.getElementById('apercu-docx-btn-fermer').addEventListener('click', function () {
    panneau.style.display = 'none';
    _panneauApercuOuvert = false;
  });
  document.getElementById('apercu-docx-btn-telecharger').addEventListener('click', function () {
    var cfg = _configApercuDocx(_typeApercuDocxActif);
    var modele = _modeleActifPanneau;
    var boutonRef = this;
    var texteOriginal = boutonRef.textContent;
    boutonRef.textContent = 'Génération…';
    boutonRef.disabled = true;
    cfg.generer(modele, _couleurActifPanneau, _formatPageActifPanneau).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var lien = document.createElement('a');
      lien.href = url; lien.download = cfg.nomFichier;
      document.body.appendChild(lien); lien.click(); lien.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      boutonRef.textContent = texteOriginal;
      boutonRef.disabled = false;
      // TACHE (bouton "Merci bien, j'ai fini") : ce panneau (ouvert depuis
      // "Aperçu" dans la section Exporter) declenche lui aussi un vrai
      // telechargement -- meme regle que le bouton "Telecharger le Word"
      // de la section Exporter elle-meme (marquerDocumentEnregistre defini
      // dans app.js, scripts classiques partageant le meme scope global).
      if (typeof marquerDocumentEnregistre === 'function') { marquerDocumentEnregistre(_typeApercuDocxActif); }
    }).catch(function () {
      boutonRef.textContent = texteOriginal;
      boutonRef.disabled = false;
      alert('Impossible de générer le fichier Word pour le moment.');
    });
  });

  // TACHE (retour utilisateur : cartes de modeles, coherence CV/Lettre/
  // Entretien) : reutilise integralement genererCartesSelecteurModeles()/
  // genererMiniatureSVG()/obtenirMetaModeleType() (app.js, deja construites
  // pour l'accordeon "Apercu et finalisation"), aucune logique de miniature
  // dupliquee ici.
  var carrousel = document.getElementById('apercu-docx-carrousel-modeles');
  if (carrousel && typeof obtenirMetaModeleType === 'function' && typeof genererCartesSelecteurModeles === 'function') {
    Promise.all(modelesNatifs.map(function (m) { return obtenirMetaModeleType(type, m.id); })).then(function (metas) {
      var metasParModele = {};
      modelesNatifs.forEach(function (m, i) { metasParModele[m.id] = metas[i]; });
      carrousel.innerHTML = genererCartesSelecteurModeles(modelesNatifs, _modeleActifPanneau, metasParModele);
      carrousel.querySelectorAll('[data-modele]').forEach(function (carte) {
        carte.addEventListener('click', function () {
          var id = this.dataset.modele;
          if (id === _modeleActifPanneau) { return; }
          _modeleActifPanneau = id;
          // TACHE (correction bug : divergence carrousel principal / grand
          // apercu) : le choix fait ICI (dans le panneau) doit aussi mettre
          // a jour etatApercuInline[type].modele -- sinon le carrousel de la
          // page (accordeon "Apercu et finalisation") reste bloque sur
          // l'ancien choix, et un futur "Telecharger le Word" depuis LA-BAS
          // utiliserait le mauvais modele. Une seule memoire, dans les deux
          // sens (voir aussi construireCarrouselModeles() dans app.js, qui
          // fait deja le chemin inverse).
          if (typeof etatApercuInline !== 'undefined' && etatApercuInline[type]) {
            // TACHE (retour utilisateur : sélecteur A5, comme pour A4) :
            // en A5, le choix vit dans etatApercuInline.cv.modeleA5 (jamais
            // .modele, reserve au choix A4) -- meme principe que le
            // carrousel inline (construireCarrouselModeles(), app.js).
            if (type === 'cv' && _formatPageActifPanneau === 'A5') {
              etatApercuInline[type].modeleA5 = id;
            } else {
              etatApercuInline[type].modele = id;
            }
            etatApercuInline[type].choisiManuellement = true;
          }
          // Repercute aussi visuellement sur le carrousel de la page, s'il
          // est visible en meme temps que le panneau (evite un carrousel
          // "en retard" tant que la page n'est pas rechargee).
          if (typeof rechargerApercuInline === 'function') { rechargerApercuInline(type, id); }
          carrousel.querySelectorAll('[data-modele]').forEach(function (c) { c.classList.remove('carte-modele-cv-active'); });
          this.classList.add('carte-modele-cv-active');
          // TACHE (refonte "Aperçu et finalisation" : palette de couleurs) :
          // un changement de modele garde la couleur choisie si le nouveau
          // modele la supporte aussi (coherence visuelle), sinon revient a
          // la couleur d'origine du modele.
          var fonctionSupportClic = { cv: typeof modeleSupporteCouleurs === 'function' ? modeleSupporteCouleurs : null, lettre: typeof modeleLettreSupporteCouleurs === 'function' ? modeleLettreSupporteCouleurs : null, entretien: typeof modeleEntretienSupporteCouleurs === 'function' ? modeleEntretienSupporteCouleurs : null }[type];
          var supporteEncore = !!(fonctionSupportClic && fonctionSupportClic(id));
          if (!supporteEncore) { _couleurActifPanneau = null; }
          var zonePastilles = document.getElementById('apercu-docx-pastilles');
          if (zonePastilles) { zonePastilles.style.display = supporteEncore ? 'flex' : 'none'; }
          _construirePastillesPanneau();
          _rafraichirApercuDocx(_typeApercuDocxActif, id, null, null, false, _couleurActifPanneau, _formatPageActifPanneau);
        });
      });
    });
  }
  var btnCarrouselGauche = document.getElementById('apercu-docx-carrousel-gauche');
  var btnCarrouselDroite = document.getElementById('apercu-docx-carrousel-droite');
  if (btnCarrouselGauche) { btnCarrouselGauche.onclick = function () { carrousel.scrollBy({ left: -160, behavior: 'smooth' }); }; }
  if (btnCarrouselDroite) { btnCarrouselDroite.onclick = function () { carrousel.scrollBy({ left: 160, behavior: 'smooth' }); }; }
}

// ============================================================
// TACHE (refonte "Aperçu et finalisation" : palette de couleurs) :
// construit les 6 pastilles cliquables du panneau plein ecran. Simple
// rond de couleur (pas de vignette a regenerer), changement de couleur
// = juste un re-rendu du meme modele avec une couleur differente.
// ============================================================
var _baseCouleurOuvertePanneau = null;
function _construirePastillesPanneau() {
  var zone = document.getElementById('apercu-docx-pastilles');
  if (!zone || typeof obtenirPalettesCouleursCV !== 'function') { return; }
  var palettes = obtenirPalettesCouleursCV();
  // TACHE (retour utilisateur : "Nuances rapides", 10 nuances) : meme
  // mecanisme que le selecteur inline (construirePaletteCouleurs, app.js)
  // -- CV uniquement pour l'instant (obtenirNuancesCouleurCV).
  var avecNuances = (_typeApercuDocxActif === 'cv' && typeof obtenirNuancesCouleurCV === 'function');
  if (_baseCouleurOuvertePanneau === null && _couleurActifPanneau) {
    _baseCouleurOuvertePanneau = String(_couleurActifPanneau).split('-')[0];
  }

  function appliquerCouleurPanneau(couleurId) {
    if (couleurId === _couleurActifPanneau) { return; }
    _couleurActifPanneau = couleurId;
    if (typeof etatApercuInline !== 'undefined' && etatApercuInline[_typeApercuDocxActif]) {
      etatApercuInline[_typeApercuDocxActif].couleur = couleurId;
    }
    if (typeof rechargerApercuInline === 'function') { rechargerApercuInline(_typeApercuDocxActif, _modeleActifPanneau); }
    _rafraichirApercuDocx(_typeApercuDocxActif, _modeleActifPanneau, null, null, false, couleurId, _formatPageActifPanneau);
    _construirePastillesPanneau();
  }

  zone.innerHTML = palettes.map(function (p) {
    var estBaseActive = (_baseCouleurOuvertePanneau === p.id);
    var nuances = avecNuances ? obtenirNuancesCouleurCV(p.id) : [];
    var rangeeNuances = (avecNuances && estBaseActive)
      ? '<span class="rangee-nuances-apercu" style="display:inline-flex;gap:0.25rem;margin-left:0.4rem;vertical-align:middle;">' +
        nuances.map(function (n) {
          var actifNuance = (n.id === _couleurActifPanneau) || (_couleurActifPanneau === p.id && n.niveau === 10);
          return '<span class="pastille-nuance-apercu' + (actifNuance ? ' pastille-nuance-apercu-active' : '') + '" ' +
            'data-couleur="' + n.id + '" title="' + n.nom + '" style="background:#' + n.hex + ';"></span>';
        }).join('') + '</span>'
      : '';
    return '<span class="pastille-couleur-apercu' + (estBaseActive ? ' pastille-couleur-apercu-active' : '') + '" ' +
      'data-couleur-base="' + p.id + '" title="' + p.nom + '" style="background:#' + p.hex + ';"></span>' + rangeeNuances;
  }).join('');

  zone.querySelectorAll('[data-couleur-base]').forEach(function (rond) {
    rond.addEventListener('click', function () {
      var baseId = this.dataset.couleurBase;
      if (!avecNuances) { appliquerCouleurPanneau(baseId); return; }
      if (_baseCouleurOuvertePanneau === baseId) { _baseCouleurOuvertePanneau = null; _construirePastillesPanneau(); return; }
      _baseCouleurOuvertePanneau = baseId;
      if (!_couleurActifPanneau || String(_couleurActifPanneau).split('-')[0] !== baseId) {
        appliquerCouleurPanneau(baseId + '-10');
      } else {
        _construirePastillesPanneau();
      }
    });
  });
  zone.querySelectorAll('.pastille-nuance-apercu').forEach(function (pastille) {
    pastille.addEventListener('click', function (e) {
      e.stopPropagation();
      appliquerCouleurPanneau(this.dataset.couleur);
    });
  });
}


// TACHE (page Action, apercu inline reel) : zoneApercuOverride/
// zoneMessageOverride permettent de reutiliser EXACTEMENT ce moteur de
// rendu pour l'accordeon "Apercu et finalisation" de la page Action (voir
// chargerApercuCVInline/Lettre/Entretien dans app.js), sans dupliquer la
// logique de generation + docx-preview. Sans ces arguments, comportement
// inchange (panneau plein ecran de ce fichier).
// TACHE (retour utilisateur : apercu inline plus petit) : reduireEchelle
// (optionnel) redimensionne visuellement le rendu (transform scale) pour
// tenir entierement dans zoneApercuOverride, SANS jamais toucher au
// panneau plein ecran (parametre absent = comportement inchange).
// TACHE (refonte "Aperçu et finalisation" : palette de couleurs) :
// couleurId (optionnel, 6e argument) transmis tel quel a config.generer()
// -- absent/non reconnu = couleur d'origine du modele (comportement
// inchange pour tout appelant qui ne le fournit pas).
// TACHE (format A5) : formatPage (optionnel, 7e argument) transmis tel
// quel a config.generer() -- absent = 'A4' (comportement inchange).
function _rafraichirApercuDocx(type, modele, zoneApercuOverride, zoneMessageOverride, reduireEchelle, couleurId, formatPage) {
  var config = _configApercuDocx(type);
  var zoneMessage = zoneMessageOverride || document.getElementById('apercu-docx-message');
  var zoneApercu = zoneApercuOverride || document.getElementById('apercu-docx-zone');
  if (!zoneMessage || !zoneApercu) { return; }
  zoneMessage.textContent = 'Génération de l\'aperçu…';
  zoneApercu.innerHTML = '';

  Promise.all([config.generer(modele, couleurId, formatPage), chargerLibrairieDocxPreview()])
    .then(function (resultats) {
      var blob = resultats[0];
      var docxPreview = resultats[1];
      zoneMessage.textContent = '';
      return docxPreview.renderAsync(blob, zoneApercu, undefined, {
        className: 'apercu-docx-rendu',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true
      });
    })
    .then(function () {
      if (!reduireEchelle) { return; }
      // TACHE (correction bug : mauvais element mis a l'echelle) : docx-preview
      // nomme son enveloppe "{className}-wrapper" (ici "apercu-docx-rendu-wrapper",
      // cf. l'option className ci-dessus) -- PAS ".docx-wrapper" comme suppose
      // initialement. Ce mauvais selecteur retombait sur le premier enfant
      // (une balise <style> invisible), scalait un element sans taille
      // visuelle, pendant que le vrai contenu s'affichait en taille reelle et
      // debordait du petit conteneur (overflow:hidden) -- d'ou l'aperçu
      // montrant un morceau agrandi au lieu de la page entiere reduite.
      var enveloppe = zoneApercu.querySelector('.apercu-docx-rendu-wrapper');
      if (!enveloppe) { return; }
      // TACHE : attend une image (mesure exacte impossible avant peinture),
      // reduit uniquement (jamais d'agrandissement) pour que la page entiere
      // tienne dans la hauteur disponible -- la personne voit tout son
      // document d'un coup d'oeil, "Ouvrir le grand aperçu" pour le detail.
      requestAnimationFrame(function () {
        enveloppe.style.transformOrigin = 'top center';
        var hauteurReelle = enveloppe.scrollHeight;
        var hauteurDispo = zoneApercu.clientHeight;
        var echelle = hauteurReelle > 0 ? Math.min(1, hauteurDispo / hauteurReelle) : 1;
        enveloppe.style.transform = 'scale(' + echelle + ')';
      });
    })
    .catch(function (erreur) {
      zoneMessage.textContent = 'Impossible d\'afficher l\'aperçu pour le moment. Vous pouvez tout de même télécharger le fichier Word ci-dessus.';
      console.error('Erreur apercu docx-preview :', erreur);
    });
}
