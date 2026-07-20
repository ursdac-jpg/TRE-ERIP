/* ============================================================
   decouverteParcours.js
   ------------------------------------------------------------
   Module « Découverte et valorisation des compétences ».
   Répond à : document 1 §4 (parcours) et §5 (interface).

   HOMOGÉNÉITÉ (exigée explicitement) : ce fichier ne crée quasiment
   aucun nouveau composant visuel. Il réutilise :
   - le squelette de fenêtre modale à étapes déjà établi par
     ouvrirAssistantDepotCV() (metiers.js) : état partagé unique, fenêtre
     remplacée intégralement à chaque étape (jamais empilée), pied de
     page Retour/Continuer uniforme ;
   - htmlCollageInstantane()/activerCollageInstantane() (app.js) pour
     TOUT échange avec un assistant IA externe, y compris le raffinement
     (le même composant, avec un simple suffixe différent) ;
   - ASSISTANTS_IA, stylePastilleInline(), le schéma numéroté déjà
     construit pour "Choisissez votre assistant IA" ;
   - .carte/.carte.active-card pour les choix simples (Oui/Non) ;
   - .reco-item/.reco-rang/.reco-case pour les propositions à choisir
     par fragment (même composant que les 5 accroches du CV) ;
   - ouvrirFenetreERIP()/confirmerAction() pour toute fenêtre secondaire.

   ÉTAPES (consolidées par rapport au document 1, §4) : la "présentation
   de la saisie libre" et la "saisie libre" elle-même sont fusionnées en
   un seul écran (un court texte d'intro au-dessus de la zone de texte,
   plutôt que deux écrans successifs dont le premier n'aurait aucune
   action propre) -- même contenu que le document 1, moins de clics,
   cohérent avec le principe d'accessibilité cognitive (§4 du présent
   fichier, doc1 §3.1 principe 6). De même, "identification des manques"
   (étape 6 du document) n'a jamais d'écran propre : c'est une évaluation
   invisible qui alimente directement l'étape "Questions ciblées",
   absente du parcours si rien ne la déclenche.
   ============================================================ */

// TACHE (retour utilisateur : preuve directe via export JSON du dossier --
// "objectifProfessionnel" valait exactement "Restauration", tapé tel quel
// dans "métier précis" alors que c'est un secteur du référentiel, pas un
// poste précis) : jamais un bug à proprement parler -- "métier précis"
// reprend le texte tel quel comme titre, correct pour un vrai poste
// ("Plaquiste"), mais trompeur pour un secteur générique. Détecte si le
// texte saisi correspond exactement (après normalisation) à un secteur
// connu de secteursDisponibles() (app.js, déjà utilisée pour le mode
// "domaine", jamais dupliquée ici) -- si oui, applique le même préfixe
// "Profil polyvalent —" que ce mode, sans que la personne ait besoin de
// deviner la bonne case à cocher entre "métier précis" et "domaine".
function construireTitreDepuisMetierOuSecteur(texte) {
  if (!texte) { return texte; }
  var secteurs = (typeof secteursDisponibles === 'function') ? secteursDisponibles() : [];
  var correspond = secteurs.some(function (s) {
    return (typeof normaliserTexte === 'function' ? normaliserTexte(s.nom) : s.nom.toLowerCase()) ===
      (typeof normaliserTexte === 'function' ? normaliserTexte(texte) : texte.toLowerCase());
  });
  return correspond ? ('Profil polyvalent — ' + texte) : texte;
}

function fermerDecouverteCompetences() {
  var f = document.getElementById('decouverteCompetencesFenetre');
  if (f) { f.remove(); }
}

// TACHE (retour utilisateur : "précisez-moi", raffinement) : question de
// clarification FIXE, la même pour tous les fragments -- notre modèle de
// copier-coller ne permet pas à l'IA de formuler dynamiquement sa propre
// question sans un aller-retour supplémentaire, ce qui romprait la
// simplicité du parcours. Cette question reste volontairement générale
// et ouverte, jamais orientée vers un vocabulaire professionnel que la
// personne n'a pas (principe n°10, doc1 §3.1).
var DECOUVERTE_QUESTION_RAFFINEMENT_TYPE =
  'Précisez un peu ce que vous faisiez : pour qui, où, avec quel matériel, ou toute autre précision utile.';

function ouvrirDecouverteCompetences() {
  fermerDecouverteCompetences();

  var etat = {
    etapeCourante: 1,
    modeRecherche: null, // 'metier' | 'domaine' | 'stage' | null
    stageAvecStructure: null,
    identite: {
      civilite: (dossier.identite && dossier.identite.civilite) || null,
      nom: (dossier.identite && dossier.identite.nom) || '',
      prenom: (dossier.identite && dossier.identite.prenom) || '',
      telephone: (dossier.identite && dossier.identite.telephone) || '',
      email: (dossier.identite && dossier.identite.email) || ''
    },
    recit: '',
    etatsFragments: [],       // tableau d'etatFragment (decouverteRaffinement.js), une fois l'analyse initiale reçue
    ongletFragmentActif: null,
    fragmentEnRaffinement: null,
    modeRecap: null,
    reponsesQuestionsCiblees: [],
    questionsCiblees: [],
    strategie: null,
    typeCVChoisi: null
  };

  var fenetre = document.createElement('div');
  fenetre.id = 'decouverteCompetencesFenetre';
  fenetre.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2000;padding:1rem;';
  document.body.appendChild(fenetre);
  fenetre.addEventListener('click', function (e) { if (e.target === fenetre) { fermerDecouverteCompetences(); } });

  function afficherEtape(numero) {
    etat.etapeCourante = numero;
    var etape = obtenirDefinitionEtape(numero);

    fenetre.innerHTML =
      // TACHE (retour utilisateur : "il y a beaucoup de choses utiles, je
      // pense qu'il faut avoir une meilleure lecture") : élargie de 720px
      // à 900px -- même valeur que "tresLarge" ailleurs dans l'app
      // (ouvrirFenetreERIP), pas un chiffre inventé.
      '<div style="background:white;border-radius:1.5rem;max-width:900px;width:100%;' +
      'max-height:90vh;overflow-y:auto;padding:1.5rem;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div class="d-flex justify-content-between align-items-center mb-3">' +
      '<h5 class="mb-0">' + etape.titre + '</h5>' +
      '<button type="button" id="fermerDecouverteBtn" class="btn btn-sm btn-outline-secondary" ' +
      'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      '<div id="contenuEtapeDecouverte">' + etape.contenuHTML + '</div>' +
      '<div class="d-flex justify-content-between align-items-center mt-3 pt-3" style="border-top:1px solid #E5E7EB;">' +
      // TACHE (retour utilisateur : "je veux aussi un bouton retour" dès
      // le tout premier écran) : affiché systématiquement désormais, y
      // compris à l'étape 1 -- son comportement s'adapte alors (fermer le
      // module plutôt qu'aller à une étape 0 qui n'existe pas).
      '<button type="button" id="btnRetourDecouverte" class="btn btn-outline-secondary">&#8592; Retour</button>' +
      (etape.boutonMilieuHTML || '<span></span>') +
      (etape.masquerContinuer ? '' :
        '<button type="button" id="btnContinuerDecouverte" class="btn btn-primary"' +
        (etape.peutContinuer ? '' : ' disabled') + '>' + (etape.libelleContinuer || 'Continuer &#8594;') + '</button>') +
      '</div></div>';

    document.getElementById('fermerDecouverteBtn').addEventListener('click', fermerDecouverteCompetences);
    var btnRetour = document.getElementById('btnRetourDecouverte');
    if (btnRetour) {
      btnRetour.addEventListener('click', function () {
        // TACHE (retour utilisateur : "je me retrouve à 'collez la
        // réponse' au lieu de revenir aux propositions") : le raffinement
        // n'est pas une étape à part (etapeCourante reste 6 pendant tout
        // ce temps, seul fragmentEnRaffinement change) -- le bouton Retour
        // global sautait donc directement à l'étape 5, sans jamais
        // repasser par l'écran "valider / aucune ne correspond". Corrigé :
        // s'il y a un raffinement en cours, Retour l'annule d'abord.
        if (numero === 6 && etat.fragmentEnRaffinement) {
          etat.fragmentEnRaffinement = null;
          afficherEtape(6);
          return;
        }
        // TACHE (retour utilisateur : "le bouton retour de cette page me
        // fait retourner à la page 'collez la réponse de l'assistant' à
        // nouveau") : signalé plusieurs fois -- avec la navigation libre
        // entre onglets, Retour n'a plus besoin de sauter à l'étape 5 dès
        // qu'on est sur l'étape 6 : il recule d'un onglet à la fois,
        // exactement comme "Retour" le ferait dans n'importe quel
        // parcours -- jusqu'au premier onglet, où là seulement il
        // continue vers l'étape précédente. S'il y avait un récapitulatif
        // affiché (toutes validées), Retour y ramène d'abord.
        if (numero === 6) {
          if (!etat.modeRecap && etat.etatsFragments.every(fragmentEstValide) && etat.etatsFragments.length > 1) {
            etat.modeRecap = true;
            afficherEtape(6);
            return;
          }
          var indexActif = etat.etatsFragments.findIndex(function (ef) { return ef.fragmentId === etat.ongletFragmentActif; });
          if (indexActif > 0) {
            etat.ongletFragmentActif = etat.etatsFragments[indexActif - 1].fragmentId;
            etat.modeRecap = false;
            afficherEtape(6);
            return;
          }
        }
        // TACHE (retour utilisateur : "le bouton Retour me fait revenir à
        // la page d'accueil et pas à la page précédente") : même défaut
        // que pour le raffinement (étape 6) -- l'étape 1 a elle aussi des
        // sous-états internes (choix métier/domaine, recherche, offre en
        // tête, champs de candidature) qu'un simple "numero - 1" ignore
        // complètement, puisque numero reste 1 pendant tout ce temps.
        // Recule ici d'un sous-état à la fois, dans l'ordre inverse de
        // leur apparition, avant de fermer le module.
        if (numero === 1) {
          if (dossier.objectif === 'offre' || dossier.objectif === 'spontanee') { dossier.objectif = null; afficherEtape(1); return; }
          if (etat.modeRecherche === 'stage' && etat.stageAvecStructure !== null) { etat.stageAvecStructure = null; afficherEtape(1); return; }
          if (dossier.metierCible) { dossier.metierCible = null; dossier.titreCV = null; dossier.titreCVVerrouille = false; afficherEtape(1); return; }
          if (dossier.secteurCible) { dossier.secteurCible = null; afficherEtape(1); return; }
          if (etat.modeRecherche) { etat.modeRecherche = null; afficherEtape(1); return; }
          fermerDecouverteCompetences();
          return;
        }
        if (numero <= 1) { fermerDecouverteCompetences(); } else { afficherEtape(numero - 1); }
      });
    }
    if (!etape.masquerContinuer) {
      document.getElementById('btnContinuerDecouverte').addEventListener('click', function () {
        if (typeof etape.onContinuer === 'function') { etape.onContinuer(); }
      });
    }
    if (typeof etape.onCablerBoutonMilieu === 'function') { etape.onCablerBoutonMilieu(); }
    if (typeof etape.onAfficher === 'function') { etape.onAfficher(); }
  }

  // ------------------------------------------------------------
  // Étape 1 — Accueil
  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // Étape 1 — Ce que la personne recherche
  // ------------------------------------------------------------
  // TACHE (retour utilisateur : "le parcours j'ai un CV / j'ai pas de CV
  // est le même, c'est un doublon ?") : confirmé -- cette branche n'avait
  // jamais été construite (l'import d'un CV existant restait à faire,
  // jamais un vrai doublon voulu). Remplacée par une question qui, elle,
  // a un effet réel : réutilise dossier.objectif/dossier.secteurCible,
  // déjà utilisés par le parcours classique (pageObjectif(), app.js) --
  // même vocabulaire, jamais un nouveau concept.
  function capitaliserPremiereLettre(texte) {
    return texte ? texte.charAt(0).toUpperCase() + texte.slice(1) : texte;
  }

  function etapeAccueil() {
    var texteRechercheDomaine = etat.texteRechercheDomaine || '';
    var texteRechercheMetier = etat.texteRechercheMetier || '';

    var colonneGauche = '<p class="text-muted">Racontez ce que vous avez fait, dans votre travail ou ailleurs. ' +
      'On va vous aider à trouver comment le dire.</p>';
    var colonneDroite = '';

    // TACHE (retour utilisateur : "le bleu clair moins prononcé, et
    // seulement pour la carte choisie qu'il soit comme il est
    // actuellement") : fond bleu très doux par défaut, la carte
    // réellement choisie garde le style .active-card habituel (bleu
    // plein), sans style inline qui viendrait le concurrencer.
    var styleCarteVisible = 'background:#F6FAFF;border-color:#CFE2FF;';

    function carteChoix(attr, valeur, actif, icone, label) {
      return '<div class="carte' + (actif ? ' active-card' : '') + '" data-' + attr + '="' + valeur + '" style="' +
        (actif ? '' : styleCarteVisible) + '"><h5 class="mb-0">' + (icone ? icone + ' ' : '') + label + '</h5></div>';
    }

    // TACHE (retour utilisateur : "la croix je ne la veux pas sur métier
    // visé, le nom choisi sera une pastille cliquable, en cliquant on
    // l'enlève") : réutilise .pastille (même composant que les résultats
    // de recherche), pleine en bleu pour se distinguer d'une simple
    // suggestion.
    function pastilleChoisie(valeur, attrEffacer) {
      // TACHE (retour utilisateur : "le fond bleu de la pastille est trop
      // prononcé") : bleu clair au lieu du bleu plein d'origine, texte
      // bleu foncé pour rester lisible et clairement "choisi" sans
      // ressortir de façon trop agressive.
      return '<span ' + attrEffacer + ' class="pastille" style="cursor:pointer;background:#DBEAFE;color:#1D4ED8;' +
        'font-weight:700;font-size:1.05rem;border:1px solid #93C5FD;" title="Cliquer pour retirer ce choix">' + echapperAttribut(valeur) + ' &#10005;</span>';
    }

    // TACHE (retour utilisateur : "je pense qu'on peut rajouter une 3e
    // carte, Stage, qui suit la logique de la carte métier") : mode de
    // recherche à 3 valeurs ('metier'/'domaine'/'stage') plutôt qu'un
    // simple booléen -- un stage vise toujours un métier (même champ
    // dossier.metierCible), seule la suite change (structure d'accueil
    // connue ou non), jamais dossier.objectif qui reste 'stage' dans les
    // deux cas.
    colonneGauche += '<p class="fw-semibold mb-2 mt-3">Cherchez-vous plutôt :</p>' +
      '<div class="cartes" style="margin:0.5rem 0;justify-content:flex-start;">' +
      carteChoix('recherche', 'metier', etat.modeRecherche === 'metier', '🎯', 'Un métier précis') +
      carteChoix('recherche', 'domaine', etat.modeRecherche === 'domaine', '🧭', 'Un domaine, sans métier précis en tête') +
      carteChoix('recherche', 'stage', etat.modeRecherche === 'stage', '🎓', 'Un stage') +
      '</div>';

    if (etat.modeRecherche === 'metier' || etat.modeRecherche === 'stage') {
      if (!dossier.metierCible) {
        var texteNormMetier = normaliserTexte(texteRechercheMetier);
        var suggestionsMetier = (typeof baseMetiers !== 'undefined' ? baseMetiers : [])
          .filter(function (m) { return texteNormMetier.length === 0 || normaliserTexte(m.nom).indexOf(texteNormMetier) !== -1; })
          .slice(0, 8);
        colonneGauche += '<div class="banniere-metier-cible-recherche mt-3">' +
          '<p class="mb-1 small fw-semibold">🔍 Recherchez un métier (ou tapez le vôtre puis Entrée) :</p>' +
          '<input type="text" class="form-control" id="rechercheMetierDecouverteInput" placeholder="Un métier..." value="' +
          echapperAttribut(texteRechercheMetier) + '"></div>' +
          (suggestionsMetier.length
            ? '<div class="pastilles mt-2">' + suggestionsMetier.map(function (m) {
                return '<span class="pastille" data-metier-choix="' + echapperAttribut(m.nom) + '">' + echapperAttribut(m.nom) + '</span>';
              }).join('') + '</div>'
            // TACHE (retour utilisateur : "si le métier n'est pas reconnu
            // par ma base de données je ne peux pas le choisir") : Entrée
            // valide désormais le texte tapé tel quel, reconnu ou non.
            : '<p class="text-muted small mt-2 mb-0">Aucun métier ne correspond à cette recherche dans notre liste ' +
              '-- appuyez sur Entrée pour utiliser le vôtre tel quel.</p>');
      } else {
        colonneDroite += '<p class="fw-semibold mb-2">' + (etat.modeRecherche === 'stage' ? 'Stage visé' : 'Métier visé') + ' :</p>' +
          pastilleChoisie(dossier.metierCible, 'data-changer-metier="1"') + '<div class="mb-3"></div>';

        if (etat.modeRecherche === 'stage') {
          colonneGauche += '<p class="fw-semibold mb-2 mt-3">Avez-vous une structure d’accueil en tête ?</p>' +
            '<div class="cartes" style="margin:0.5rem 0;justify-content:flex-start;">' +
            carteChoix('stage-structure', 'oui', etat.stageAvecStructure === true, '', 'Oui, une structure précise') +
            carteChoix('stage-structure', 'non', etat.stageAvecStructure === false, '', 'Non, je cherche de façon générale') +
            '</div>';
          if (etat.stageAvecStructure === true) {
            var rcs = dossier.rechercheCandidature || { entreprise: '', site: '', lienOffre: '' };
            colonneDroite += '<div class="mt-2">' +
              '<input type="text" class="form-control form-control-sm mb-2" id="decouverteEntrepriseOffre" placeholder="Nom de la structure" value="' + echapperAttribut(rcs.entreprise) + '">' +
              '<input type="text" class="form-control form-control-sm mb-2" id="decouverteSiteOffre" placeholder="Site (facultatif)" value="' + echapperAttribut(rcs.site) + '">' +
              '<textarea class="form-control form-control-sm" id="decouverteLienOffre" rows="2" placeholder="Lien ou texte de l’offre de stage (facultatif)">' + echapperAttribut(rcs.lienOffre) + '</textarea>' +
              '</div>';
          }
        } else {
          colonneGauche += '<p class="fw-semibold mb-2 mt-3">Avez-vous une offre en tête ?</p>' +
            '<div class="cartes" style="margin:0.5rem 0;justify-content:flex-start;">' +
            carteChoix('objectif', 'offre', dossier.objectif === 'offre', '', 'Oui, une offre précise') +
            carteChoix('objectif', 'spontanee', dossier.objectif === 'spontanee', '', 'Non, je cherche de façon générale') +
            '</div>';
          if (dossier.objectif === 'offre') {
            var rc = dossier.rechercheCandidature || { entreprise: '', site: '', lienOffre: '' };
            colonneDroite += '<div class="mt-2">' +
              '<input type="text" class="form-control form-control-sm mb-2" id="decouverteEntrepriseOffre" placeholder="Nom de l’entreprise" value="' + echapperAttribut(rc.entreprise) + '">' +
              '<input type="text" class="form-control form-control-sm mb-2" id="decouverteSiteOffre" placeholder="Site de l’entreprise (facultatif)" value="' + echapperAttribut(rc.site) + '">' +
              '<textarea class="form-control form-control-sm" id="decouverteLienOffre" rows="2" placeholder="Lien ou texte de l’offre (facultatif, mais très utile)">' + echapperAttribut(rc.lienOffre) + '</textarea>' +
              '</div>';
          }
        }
      }
    } else if (etat.modeRecherche === 'domaine') {
      if (!dossier.secteurCible) {
        var texteNormDomaine = normaliserTexte(texteRechercheDomaine);
        var tousLesSecteurs = (typeof secteursDisponibles === 'function') ? secteursDisponibles() : [];
        var raccourcisDomaine = tousLesSecteurs.slice()
          .sort(function (a, b) { return b.count - a.count || a.nom.localeCompare(b.nom, 'fr'); }).slice(0, 8);
        var listeAfficheeDomaine = texteNormDomaine.length
          ? tousLesSecteurs.filter(function (s) { return normaliserTexte(s.nom).indexOf(texteNormDomaine) !== -1; })
          : raccourcisDomaine;
        colonneGauche += '<div class="banniere-metier-cible-recherche mt-3">' +
          '<p class="mb-1 small fw-semibold">🔍 Recherchez un domaine, ou choisissez parmi les plus courants :</p>' +
          '<input type="text" class="form-control" id="rechercheDomaineDecouverteInput" placeholder="Un domaine..." value="' +
          echapperAttribut(texteRechercheDomaine) + '"></div>' +
          (listeAfficheeDomaine.length
            ? '<div class="pastilles mt-2">' + listeAfficheeDomaine.map(function (s) {
                return '<span class="pastille" data-domaine-choix="' + echapperAttribut(s.nom) + '">' + echapperAttribut(s.nom) + '</span>';
              }).join('') + '</div>'
            : '<p class="text-muted small mt-2 mb-0">Aucun domaine ne correspond à cette recherche.</p>');
      } else {
        // TACHE (retour utilisateur : "l'intitulé n'est pas celui indiqué
        // sur la fenêtre où j'ai validé") : bug de compréhension réel,
        // pas un bug de code -- dossier.titreCV était bien construit
        // correctement ("Profil polyvalent — X"), mais cette confirmation
        // ne montrait que le nom du domaine seul, jamais le titre
        // réellement construit. La personne validait donc quelque chose
        // qu'elle ne voyait jamais tel qu'il apparaîtrait sur le CV.
        colonneDroite += '<p class="fw-semibold mb-2">Domaine cible :</p>' +
          pastilleChoisie(dossier.secteurCible, 'data-changer-domaine="1"') +
          '<p class="small text-muted mt-2 mb-0">Intitulé de CV : <strong>' + echapperAttribut(dossier.titreCV || '') + '</strong></p>';
      }
    }

    var html = '<div style="display:flex;gap:1.5rem;flex-wrap:wrap;">' +
      '<div style="flex:1 1 280px;">' + colonneGauche + '</div>' +
      '<div style="flex:1 1 220px;">' + colonneDroite + '</div>' +
      '</div>';

    var peutContinuer = !!(
      (etat.modeRecherche === 'metier' && dossier.metierCible && (dossier.objectif === 'offre' || dossier.objectif === 'spontanee')) ||
      (etat.modeRecherche === 'stage' && dossier.metierCible && etat.stageAvecStructure !== null) ||
      (etat.modeRecherche === 'domaine' && dossier.secteurCible)
    );

    return {
      titre: '🔍 Découverte de vos compétences',
      contenuHTML: html,
      peutContinuer: peutContinuer,
      onContinuer: function () {
        if (etat.modeRecherche === 'stage') { dossier.objectif = 'stage'; }
        if (dossier.objectif === 'offre' || (etat.modeRecherche === 'stage' && etat.stageAvecStructure === true)) {
          dossier.rechercheCandidature = dossier.rechercheCandidature || { entreprise: '', site: '', lienOffre: '' };
          var champEntreprise = document.getElementById('decouverteEntrepriseOffre');
          var champSite = document.getElementById('decouverteSiteOffre');
          var champLien = document.getElementById('decouverteLienOffre');
          if (champEntreprise) { dossier.rechercheCandidature.entreprise = champEntreprise.value.trim(); }
          if (champSite) { dossier.rechercheCandidature.site = champSite.value.trim(); }
          if (champLien) { dossier.rechercheCandidature.lienOffre = champLien.value.trim(); }
        }
        afficherEtape(2);
      },
      onAfficher: function () {
        document.querySelectorAll('[data-recherche]').forEach(function (carte) {
          carte.addEventListener('click', function () {
            var choix = this.dataset.recherche;
            // TACHE (retour utilisateur : cartes toujours visibles pour
            // pouvoir changer facilement) : si on bascule réellement vers
            // un autre mode, on efface ce qui appartenait au précédent --
            // sinon une donnée orpheline resterait dans le dossier sans
            // plus jamais être affichée ni utilisée.
            if (choix !== etat.modeRecherche) {
              if (choix === 'domaine') { dossier.metierCible = null; dossier.objectif = null; etat.stageAvecStructure = null; }
              else { dossier.secteurCible = null; if (choix === 'metier') { etat.stageAvecStructure = null; } if (choix === 'stage') { dossier.objectif = null; } }
            }
            etat.modeRecherche = choix;
            afficherEtape(1);
          });
        });

        var inputMetier = document.getElementById('rechercheMetierDecouverteInput');
        if (inputMetier) {
          inputMetier.addEventListener('input', function () {
            // TACHE (retour utilisateur : "la 1ere lettre soit toujours en
            // majuscule") :
            var pos = this.selectionStart;
            this.value = capitaliserPremiereLettre(this.value);
            this.setSelectionRange(pos, pos);
            etat.texteRechercheMetier = this.value;
            afficherEtape(1);
          });
          // TACHE (retour utilisateur : "si le métier n'est pas reconnu je
          // ne peux pas le choisir" + "Entrée valide le métier saisi") :
          // accepte le texte tel quel, reconnu ou non dans la base.
          inputMetier.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && this.value.trim()) {
              e.preventDefault();
              dossier.metierCible = capitaliserPremiereLettre(this.value.trim());
              // TACHE (retour utilisateur : preuve directe via export JSON
              // -- objectifProfessionnel valait exactement "Restauration",
              // tapé tel quel dans "métier précis" alors que c'est un
              // secteur, pas un poste précis) : jamais un bug de code, le
              // "métier précis" a toujours repris le texte tel quel comme
              // titre, sans l'embellir -- correct pour un vrai poste
              // ("Plaquiste"), trompeur pour un secteur générique
              // ("Restauration"). Détecté maintenant : si le texte tapé
              // correspond exactement à un secteur connu du référentiel,
              // même traitement que le parcours "domaine" (préfixe
              // "Profil polyvalent —"), sans que la personne ait besoin de
              // deviner la bonne case à cocher.
              dossier.titreCV = construireTitreDepuisMetierOuSecteur(dossier.metierCible);
              dossier.titreCVVerrouille = false;
              etat.texteRechercheMetier = '';
              afficherEtape(1);
            }
          });
          inputMetier.focus();
          var posM = inputMetier.value.length; inputMetier.setSelectionRange(posM, posM);
        }
        document.querySelectorAll('[data-metier-choix]').forEach(function (el) {
          el.addEventListener('click', function () {
            // TACHE (retour utilisateur : "je veux que ce métier visé soit
            // en intitulé de CV") : dossier.titreCV alimente directement
            // objectifProfessionnel (normaliserDonneesCV.js), déjà le
            // champ affiché en gros sous le nom sur le CV.
            dossier.metierCible = this.dataset.metierChoix;
            dossier.titreCV = construireTitreDepuisMetierOuSecteur(dossier.metierCible);
            dossier.titreCVVerrouille = false;
            etat.texteRechercheMetier = '';
            afficherEtape(1);
          });
        });
        // TACHE (retour utilisateur : "la pastille cliquable, en cliquant
        // on l'enlève" -- remplace la croix séparée d'avant) :
        var pastilleMetier = document.querySelector('[data-changer-metier]');
        if (pastilleMetier) {
          pastilleMetier.addEventListener('click', function () {
            // TACHE (prudence) : ne touche pas dossier.titreCV ici -- il
            // pourrait provenir d'un CV déjà importé, pas seulement de ce
            // choix de métier ; on ne l'écrit que dans le sens du choix
            // (voir ci-dessus), jamais à l'effacement, pour ne jamais
            // perdre une donnée qui ne vient pas de ce module.
            dossier.metierCible = null; dossier.objectif = null; etat.stageAvecStructure = null;
            afficherEtape(1);
          });
        }

        var inputDomaine = document.getElementById('rechercheDomaineDecouverteInput');
        if (inputDomaine) {
          inputDomaine.addEventListener('input', function () {
            var pos = this.selectionStart;
            this.value = capitaliserPremiereLettre(this.value);
            this.setSelectionRange(pos, pos);
            etat.texteRechercheDomaine = this.value;
            afficherEtape(1);
          });
          inputDomaine.focus();
          var posD = inputDomaine.value.length; inputDomaine.setSelectionRange(posD, posD);
        }
        document.querySelectorAll('[data-domaine-choix]').forEach(function (el) {
          el.addEventListener('click', function () {
            dossier.secteurCible = this.dataset.domaineChoix;
            // TACHE (retour utilisateur : "le titre de CV = métier choisi
            // -- si c'est pour toutes les opportunités alors polyvalent,
            // ex. Ouvrier polyvalent BTP") : la stratégie "domaine, sans
            // métier précis" est justement le signe d'une recherche
            // polyvalente -- le titre reflète ça automatiquement, plutôt
            // que de rester vide.
            dossier.titreCV = 'Profil polyvalent — ' + dossier.secteurCible;
            dossier.titreCVVerrouille = false;
            etat.texteRechercheDomaine = '';
            afficherEtape(1);
          });
        });
        var pastilleDomaine = document.querySelector('[data-changer-domaine]');
        if (pastilleDomaine) {
          pastilleDomaine.addEventListener('click', function () { dossier.secteurCible = null; afficherEtape(1); });
        }

        document.querySelectorAll('[data-objectif]').forEach(function (carte) {
          carte.addEventListener('click', function () { dossier.objectif = this.dataset.objectif; afficherEtape(1); });
        });
        document.querySelectorAll('[data-stage-structure]').forEach(function (carte) {
          carte.addEventListener('click', function () { etat.stageAvecStructure = (this.dataset.stageStructure === 'oui'); afficherEtape(1); });
        });
      }
    };
  }


  // ------------------------------------------------------------
  // Étape 2 — Identité (minimum administratif, jamais transmis à l'IA)
  // ------------------------------------------------------------
  function etapeIdentite() {
    return {
      titre: '🪪 Vos coordonnées',
      contenuHTML:
        '<p class="text-muted small">Ces informations ne sont jamais envoyées à l’assistant IA.</p>' +
        '<div class="row g-2 mb-2">' +
        '<div class="col-6"><input type="text" class="form-control" id="decouverteNom" placeholder="Nom" value="' + echapperAttribut(etat.identite.nom) + '"></div>' +
        '<div class="col-6"><input type="text" class="form-control" id="decouvertePrenom" placeholder="Prénom" value="' + echapperAttribut(etat.identite.prenom) + '"></div>' +
        '</div>' +
        '<div class="row g-2">' +
        '<div class="col-6"><input type="tel" class="form-control" id="decouverteTelephone" placeholder="Téléphone" value="' + echapperAttribut(etat.identite.telephone) + '"></div>' +
        '<div class="col-6"><input type="email" class="form-control" id="decouverteEmail" placeholder="Email" value="' + echapperAttribut(etat.identite.email) + '"></div>' +
        '</div>',
      peutContinuer: !!(etat.identite.nom && etat.identite.prenom),
      onAfficher: function () {
        ['Nom', 'Prenom', 'Telephone', 'Email'].forEach(function (champ) {
          var input = document.getElementById('decouverte' + champ);
          input.addEventListener('input', function () {
            etat.identite[champ.charAt(0).toLowerCase() + champ.slice(1)] = this.value;
            document.getElementById('btnContinuerDecouverte').disabled = !(etat.identite.nom && etat.identite.prenom);
          });
        });
      },
      onContinuer: function () { afficherEtape(3); }
    };
  }

  // ------------------------------------------------------------
  // Étape 3 — Récit (présentation + saisie libre, fusionnées)
  // ------------------------------------------------------------
  function etapeRecit() {
    return {
      titre: '📝 Racontez votre parcours',
      contenuHTML:
        '<p class="text-muted small">Vous pouvez parler de votre travail, mais aussi de ce que vous savez faire ' +
        'en dehors : bricolage, aide à des proches, sport, bénévolat, tout ce qui vous semble important. ' +
        'Écrivez comme vous le raconteriez à quelqu’un.</p>' +
        '<div id="detectionCoordonneesDecouverte" class="mb-2"></div>' +
        '<textarea class="form-control" id="decouverteRecitTexte" rows="10" ' +
        'placeholder="Par exemple : J’ai travaillé plusieurs années sur des chantiers, je tirais des câbles électriques...">' +
        echapperAttribut(etat.recit) + '</textarea>',
      peutContinuer: etat.recit.trim().length > 0,
      onAfficher: function () {
        var champ = document.getElementById('decouverteRecitTexte');
        afficherDetectionCoordonneesDecouverte(champ.value);
        champ.addEventListener('input', function () {
          etat.recit = this.value;
          afficherDetectionCoordonneesDecouverte(this.value);
          document.getElementById('btnContinuerDecouverte').disabled = !this.value.trim().length;
        });
      },
      onContinuer: function () { afficherEtape(4); }
    };
  }

  // ------------------------------------------------------------
  // Étape 4 — Choisir l'assistant IA (même schéma que le reste d'ERIP)
  // ------------------------------------------------------------
  // TACHE (retour utilisateur : "le bouton Continuer ne fait rien") : bug
  // réel trouvé -- styleMiniAnimation (app.js) n'est PAS une variable
  // globale, elle est déclarée localement dans pageResultats() et donc
  // invisible depuis ce fichier. La référencer provoquait une exception
  // silencieuse qui interrompait afficherEtape(4) avant tout rendu --
  // l'écran restait figé sur l'étape précédente, donnant l'impression que
  // le bouton ne réagissait pas. Copie locale du même contenu exact
  // (mêmes classes .mini-anim-etape), pour un rendu visuel identique sans
  // dépendre d'une variable d'un autre fichier.
  var styleMiniAnimationDecouverte = '<style>@keyframes pulseEtapeIADecouverte{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(13,110,253,.35);}' +
    '50%{transform:scale(1.12);box-shadow:0 0 0 7px rgba(13,110,253,0);}}' +
    '.mini-anim-etape{width:2.5rem;height:2.5rem;border-radius:50%;background:#0d6efd;color:#fff;' +
    'display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;' +
    'animation:pulseEtapeIADecouverte 2.2s ease-in-out infinite;margin:0 auto;}</style>';

  function etapeChoixAssistant() {
    return {
      titre: '🤖 Choisissez votre assistant IA',
      contenuHTML:
        styleMiniAnimationDecouverte +
        '<div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:flex-start;">' +
        '<div style="flex:0 0 200px;">' +
        ['Vous cliquez sur un assistant', 'Tout est copié pour vous', 'Il s’ouvre automatiquement', 'Vous revenez ici après'].map(function (texte, i) {
          return '<div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.7rem;">' +
            '<span class="mini-anim-etape" style="width:1.9rem;height:1.9rem;font-size:0.9rem;flex-shrink:0;animation-delay:' + (i * 0.5) + 's;">' + (i + 1) + '</span>' +
            '<span class="small text-muted">' + texte + '</span></div>';
        }).join('') +
        '</div>' +
        '<div style="flex:1 1 260px;text-align:center;background:#F0F6FF;border:2px solid #BFDBFE;border-radius:12px;padding:1rem;">' +
        '<p class="fw-bold mb-1" style="font-size:1.1rem;color:#0d3c8a;">&#128071; Cliquez ici pour continuer</p>' +
        '<p class="small text-muted mb-3">Vous allez suivre exactement le même principe que pour un CV ou une lettre.</p>' +
        '<div class="ia-grid text-center">' + ASSISTANTS_IA.map(function (a) {
          return '<button type="button" class="pastille-selection" data-assistant-decouverte="' + a.id + '" style="' +
            stylePastilleInline(false) + 'font-size:1.15rem;padding:0.75rem 1.5rem;font-weight:600;">' + a.nom + '</button>';
        }).join('') + '</div>' +
        '</div>' +
        '</div>',
      masquerContinuer: true,
      onAfficher: function () {
        document.querySelectorAll('[data-assistant-decouverte]').forEach(function (bouton) {
          bouton.addEventListener('click', function () {
            var assistant = ASSISTANTS_IA.filter(function (a) { return a.id === bouton.dataset.assistantDecouverte; })[0];
            if (!assistant) { return; }
            var instructions = (typeof promptsExternesCharges !== 'undefined' && promptsExternesCharges.decouverte) ||
              (typeof promptParDefaut === 'function' ? promptParDefaut('decouverte') : '');
            // TACHE (retour utilisateur : "évidemment, si c'est possible,
            // je trouve ça super important") : le métier/domaine visé,
            // choisi à l'étape précédente, est maintenant réellement
            // transmis -- jusqu'ici seul le récit partait, l'IA travaillait
            // à l'aveugle sur ce point.
            var contexteCible = '';
            if (dossier.metierCible) { contexteCible = 'Métier visé par la personne : ' + dossier.metierCible + '\n\n'; }
            else if (dossier.secteurCible) { contexteCible = 'Domaine visé par la personne (pas un métier précis) : ' + dossier.secteurCible + '\n\n'; }
            var texteACopier = instructions + '\n\n' + contexteCible + etat.recit;
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(texteACopier).catch(function () {}); }
            window.open(assistant.url, '_blank');
            afficherEtape(5);
          });
        });
      }
    };
  }

  // ------------------------------------------------------------
  // Étape 5 — Coller la réponse (htmlCollageInstantane, réutilisé tel quel)
  // ------------------------------------------------------------
  function etapeCollerReponse() {
    return {
      titre: '📥 Collez la réponse de l’assistant',
      contenuHTML:
        '<p class="text-muted small">Une fois la réponse affichée sur le site de l’assistant, cliquez sur son bouton ' +
        '« Copier », puis revenez ici.</p>' +
        htmlCollageInstantane('Decouverte',
          '<div class="d-flex gap-2 mb-2 mt-2">' +
          '<button type="button" id="btnImporterDecouverte" style="font-size:1.05rem;font-weight:700;padding:0.65rem 1.5rem;' +
          'background:#0d6efd;color:#FFFFFF;border:none;border-radius:999px;box-shadow:0 4px 14px rgba(13,110,253,.4);">&#128229; Importer</button>' +
          '<button type="button" class="btn btn-outline-secondary btn-sm" id="btnEffacerRecoller">Effacer et recoller</button>' +
          '</div>') +
        '<div id="messageImportDecouverte" class="mt-2 small"></div>',
      masquerContinuer: true,
      onAfficher: function () {
        activerCollageInstantane({
          idZoneAuto: 'zoneCollageAutoDecouverte', idZoneApercu: 'zoneApercuCollageDecouverte',
          idTextarea: 'texteCollageDecouverte', idBoutonColler: 'btnCollerAutoDecouverte',
          idBoutonCollerManuel: 'btnCollerManuelDecouverte', idBoutonEffacerRecoller: 'btnEffacerRecoller',
          onSucces: function (texte, estAjout) {
            var msg = document.getElementById('messageImportDecouverte');
            msg.style.color = '#157347';
            msg.textContent = estAjout
              ? '✅ Morceau suivant ajouté à la suite. Copiez le prochain morceau puis recliquez, ou cliquez Importer si c’était le dernier.'
              : '✅ Réponse importée automatiquement depuis le presse-papiers. Si la réponse fait plusieurs morceaux, recliquez ce même bouton après avoir copié le morceau suivant : il s’ajoutera à la suite.';
          },
          onErreur: function (texteErreur) {
            var msg = document.getElementById('messageImportDecouverte');
            msg.style.color = '#b91c1c'; msg.textContent = '⚠️ ' + texteErreur;
          }
        });
        document.getElementById('btnImporterDecouverte').addEventListener('click', function () {
          var texte = document.getElementById('texteCollageDecouverte').value;
          var resultat = executerAnalyseInitiale(texte);
          var msg = document.getElementById('messageImportDecouverte');
          if (!resultat.succes) { msg.style.color = '#b91c1c'; msg.textContent = '⚠️ ' + resultat.erreur; return; }
          etat.etatsFragments = resultat.valeurs.fragments.map(initialiserEtatFragment);
          etat.questionsCiblees = resultat.valeurs.questionsCiblees;
          afficherEtape(6);
        });
      }
    };
  }

  // ------------------------------------------------------------
  // Étape 6 — Découverte des compétences (le cœur du module)
  // ------------------------------------------------------------
  function contenuFragment(etatFragment, index, maxCompetences) {
    var enRaffinement = etat.fragmentEnRaffinement === etatFragment.fragmentId;
    // TACHE (retour utilisateur : "je ne peux pas retourner à l'expérience
    // 1, elle est cliquable mais elle ne s'ouvre pas" + "je veux naviguer
    // librement entre validées et non validées") : le résumé figé
    // "✓ Validé" empêchait toute navigation utile une fois l'onglet
    // rouvert -- il n'y avait rien à cliquer dedans. Retiré : un fragment
    // déjà validé affiche désormais EXACTEMENT le même formulaire éditable
    // que les autres, avec ses choix déjà faits pré-sélectionnés (le
    // fragment garde son état "valide" tant que rien n'est reconfirmé --
    // voir plus bas, la re-validation ne se déclenche qu'au clic sur
    // "Je valide").
    var estValide = etatFragment.etat === DECOUVERTE_ETATS_FRAGMENT.VALIDE;

    var html = '<div class="cv-section cv-section-compact mb-3" data-fragment-id="' + etatFragment.fragmentId + '">' +
      '<p class="small text-muted mb-2">« ' + echapperAttribut(etatFragment.texteOriginal) + ' »</p>' +
      (estValide ? '<p class="small mb-2" style="color:#157347;font-weight:700;">✅ Déjà validée — vous pouvez encore la modifier ci-dessous.</p>' : '');

    if (!enRaffinement) {
      // TACHE : les choix déjà confirmés (s'il y en a) servent directement
      // de référence pour la pré-sélection ET pour savoir si la personne a
      // changé quelque chose depuis -- plus besoin d'un mécanisme séparé
      // ("ancien choix" dupliqué), etatFragment.texteRetenu/competencesValidees
      // portent déjà cette information tant qu'ils n'ont pas été remplacés.
      var texteDejaRetenu = estValide ? etatFragment.texteRetenu : null;
      var competencesDejaRetenues = estValide ? etatFragment.competencesValidees.map(function (c) { return c.texte; }) : [];

      html += '<p class="small fw-semibold mb-2">Étape 1 — Choisissez la formulation qui vous correspond :</p>' +
        etatFragment.propositionsActuelles.map(function (prop, i) {
        var idBase = 'decouverte_prop_' + etatFragment.fragmentId + '_' + i;
        var etaitCoche = texteDejaRetenu ? (prop === texteDejaRetenu) : (i === 0);
        return '<div class="reco-item mb-2">' +
          '<span class="reco-rang">' + (i + 1) + '</span>' +
          '<input type="radio" name="propositions_' + etatFragment.fragmentId + '" class="reco-case" id="' + idBase + '"' + (etaitCoche ? ' checked' : '') + '>' +
          '<div class="reco-corps"><label for="' + idBase + '" class="mb-0">' + echapperAttribut(prop) + '</label></div>' +
          '</div>';
      }).join('');

      if (etatFragment.competencesActuelles.length) {
        html += '<p class="small fw-semibold mt-3 mb-1">Étape 2 — Cette expérience peut aussi révéler des compétences ' +
          'auxquelles vous n’aviez peut-être pas pensé — cochez celles qui vous parlent (' + maxCompetences + ' maximum) :</p>' +
          '<div class="d-flex flex-wrap gap-2 mb-2" data-zone-competences="' + etatFragment.fragmentId + '" data-max-competences="' + maxCompetences + '">' +
          etatFragment.competencesActuelles.map(function (comp, i) {
            var idComp = 'decouverte_comp_' + etatFragment.fragmentId + '_' + i;
            var etaitCochee = competencesDejaRetenues.indexOf(comp.texte) !== -1;
            return '<span><input type="checkbox" class="btn-check" id="' + idComp + '" data-competence-index="' + i + '"' + (etaitCochee ? ' checked' : '') + '>' +
              '<label class="btn btn-outline-primary btn-sm" for="' + idComp + '">' + echapperAttribut(comp.texte) + '</label></span>';
          }).join('') + '</div>' +
          '<p class="small mb-2" id="messageCompetencesRequises_' + etatFragment.fragmentId + '" style="color:#b91c1c;display:none;">' +
          'Cochez au moins une compétence ci-dessus avant de valider.</p>';
      }

      // TACHE (retour utilisateur : "si je retourne sur une expérience
      // validée, le bouton ne doit pas pulser -- sauf si je modifie mes
      // choix, alors il se remet à pulser") : calme au premier rendu si
      // déjà validée (rien n'a encore été changé) ; sinon, même logique
      // qu'avant (pulse seulement si le plafond de compétences requis est
      // atteint). Recalculé en JS dès qu'une case ou une formulation
      // change (voir cablerEtapeDecouverte).
      var possedeCompetencesRequises = etatFragment.competencesActuelles.length > 0;
      var satisfaitAuDepart = possedeCompetencesRequises ? (competencesDejaRetenues.length > 0) : true;
      var doitPulserAuDepart = satisfaitAuDepart && !estValide;
      html += '<style>@keyframes pulseValiderDecouverte{0%,100%{box-shadow:0 4px 14px rgba(13,110,253,.45);transform:scale(1);}' +
        '50%{box-shadow:0 6px 32px rgba(13,110,253,.95);transform:scale(1.045);}}' +
        '.btn-valider-fragment-actif{animation:pulseValiderDecouverte 1s ease-in-out infinite;}</style>' +
        '<div style="border-top:1px solid #E5E7EB;padding-top:0.8rem;" class="d-flex gap-2 flex-wrap">' +
        '<button type="button" data-valider-fragment="' + etatFragment.fragmentId + '" ' +
        (possedeCompetencesRequises ? 'data-requiert-competence="1"' : '') +
        ' class="btn-valider-fragment' + (doitPulserAuDepart ? ' btn-valider-fragment-actif' : '') + '" style="font-size:1.05rem;font-weight:700;' +
        'padding:0.65rem 1.5rem;border:none;border-radius:999px;' +
        (doitPulserAuDepart
          ? 'background:#0d6efd;color:#FFFFFF;box-shadow:0 4px 14px rgba(13,110,253,.4);'
          : 'background:#CBD5E1;color:#475569;') +
        '">' + (estValide ? '✅ Choix déjà validés' : '✅ Je valide cette expérience') + '</button>' +
        (!estValide && raffinementEncorePossible(etatFragment)
          ? '<button type="button" class="btn btn-outline-secondary btn-sm" data-raffiner-fragment="' + etatFragment.fragmentId + '">Aucune ne correspond, précisez-moi</button>'
          : (!estValide ? '<button type="button" class="btn btn-outline-secondary btn-sm" data-repli-fragment="' + etatFragment.fragmentId + '">Garder mes mots tels quels</button>' : '')) +
        '</div>';
    } else {
      html += '<p class="small fw-semibold mb-2">' + DECOUVERTE_QUESTION_RAFFINEMENT_TYPE + '</p>' +
        '<textarea class="form-control form-control-sm mb-2" id="precisionRaffinement_' + etatFragment.fragmentId + '" rows="2" placeholder="Votre précision..."></textarea>' +
        '<button type="button" class="btn btn-outline-primary btn-sm mb-2" data-copier-precision="' + etatFragment.fragmentId + '">Copier pour l’assistant IA</button>' +
        '<div id="collageRaffinement_' + etatFragment.fragmentId + '"></div>';
    }

    html += '</div>';
    return html;
  }

  // TACHE (retour utilisateur : "avoir ce contenu sous forme d'onglets en
  // haut, bien identifiés, avec leur propre carré et une icône") : réutilise
  // exactement le même composant que "Choisissez ce que l'IA propose pour
  // votre CV" (onglet-validation-import-btn/-panel, app.js) -- un onglet
  // par fragment/expérience, plutôt qu'une longue liste qui s'empile à la
  // suite. Une icône par origine, pour se repérer d'un coup d'œil.
  function iconeOrigineFragment(origine) {
    if (origine === 'proDeclaree' || origine === 'proNonDeclaree') { return '💼'; }
    if (origine === 'personnelleFamiliale') { return '🏠'; }
    if (origine === 'benevoleAssociative') { return '🤝'; }
    return '⭐';
  }

  function etapeDecouverte() {
    var toutesValidees = etat.etatsFragments.every(fragmentEstValide);
    // TACHE (retour utilisateur : navigation libre entre expériences
    // validées et non validées) : le récapitulatif ("modeRecap") n'est
    // plus déduit automatiquement de "tout est validé" -- il devient un
    // état d'affichage à part, activé une fois automatiquement (voir plus
    // bas), mais que la personne peut quitter en cliquant un onglet ou
    // "Modifier", sans jamais faire perdre leur état "validé" aux
    // fragments concernés (ils le restent tant qu'ils ne sont pas
    // réellement reconfirmés avec un nouveau choix).
    if (toutesValidees && etat.modeRecap === null) { etat.modeRecap = true; }
    if (!etat.ongletFragmentActif && etat.etatsFragments.length) {
      var premierNonValide = etat.etatsFragments.filter(function (ef) { return !fragmentEstValide(ef); })[0];
      etat.ongletFragmentActif = (premierNonValide || etat.etatsFragments[0]).fragmentId;
    }

    var maxCompetencesParExperience = 5;

    var boutons = '', panneaux = '';
    etat.etatsFragments.forEach(function (ef, i) {
      var actif = etat.ongletFragmentActif === ef.fragmentId;
      var coche = fragmentEstValide(ef) ? ' &#10003;' : '';
      boutons += '<button type="button" class="onglet-validation-import-btn' + (actif ? ' actif' : '') +
        '" data-onglet-fragment="' + ef.fragmentId + '">' + iconeOrigineFragment(ef.origine) + ' Expérience ' + (i + 1) + coche + '</button>';
      panneaux += '<div class="onglet-validation-import-panel' + (actif ? ' actif' : '') + '" data-panel-fragment="' + ef.fragmentId + '">' +
        contenuFragment(ef, i, maxCompetencesParExperience) + '</div>';
    });

    var contenuPrincipal;
    if (toutesValidees && etat.modeRecap) {
      contenuPrincipal = '<p class="text-muted small mb-3">Voici ce que vous avez validé. Vous pouvez encore modifier une expérience si besoin.</p>' +
        etat.etatsFragments.map(function (ef) {
          return '<div class="cv-section cv-section-compact mb-2">' +
            '<div class="d-flex justify-content-between align-items-start gap-2">' +
            '<div><strong>' + echapperAttribut(ef.texteRetenu) + '</strong>' +
            '<p class="small text-muted mb-1">' + ef.competencesValidees.map(function (c) { return echapperAttribut(c.texte); }).join(', ') + '</p></div>' +
            '<button type="button" style="background:#FEF9C3;border:1px solid #FDE68A;color:#854D0E;font-weight:600;' +
            'border-radius:6px;padding:0.3rem 0.8rem;font-size:0.85rem;" class="flex-shrink-0" data-modifier-fragment="' + ef.fragmentId + '">Modifier</button>' +
            '</div></div>';
        }).join('');
    } else {
      contenuPrincipal = '<div class="onglets-validation-import">' + boutons + '</div>' +
        '<div class="onglets-validation-import-corps">' + panneaux + '</div>';
    }

    return {
      titre: '💡 Découverte de vos compétences',
      contenuHTML:
        '<p class="text-muted small mb-3">Pour chacune de vos expériences, choisissez la formulation qui vous ' +
        'ressemble le plus. Si aucune ne convient, dites-nous-en un peu plus et nous en chercherons d’autres.</p>' +
        contenuPrincipal,
      peutContinuer: toutesValidees,
      libelleContinuer: 'Continuer →',
      onAfficher: function () {
        // TACHE (retour utilisateur : "je veux naviguer librement entre
        // les expériences, validées ou non") : simple changement d'onglet
        // désormais, plus aucun traitement spécial selon l'état validé --
        // contenuFragment() sait déjà afficher le bon formulaire dans les
        // deux cas.
        document.querySelectorAll('[data-onglet-fragment]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            etat.ongletFragmentActif = btn.dataset.ongletFragment;
            etat.modeRecap = false;
            afficherEtape(6);
          });
        });
        document.querySelectorAll('[data-modifier-fragment]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            etat.ongletFragmentActif = btn.dataset.modifierFragment;
            etat.modeRecap = false;
            afficherEtape(6);
          });
        });
        cablerEtapeDecouverte();
      },
      onContinuer: function () {
        afficherEtape(etat.questionsCiblees.length ? 7 : 8);
      }
    };
  }


  function cablerEtapeDecouverte() {
    // TACHE (retour utilisateur : "si je retourne sur une expérience
    // validée, le bouton ne doit pas pulser -- sauf si je modifie mes
    // choix, alors il se remet à pulser") : fonction unique de recalcul,
    // appelée à chaque changement (case à cocher OU formulation) --
    // compare la sélection ACTUELLE à etatFragment.texteRetenu/
    // competencesValidees (le "déjà validé" sert directement de
    // référence, pas besoin d'un mécanisme séparé).
    function recalculerBoutonValider(fragmentId) {
      var ef = etat.etatsFragments.filter(function (x) { return x.fragmentId === fragmentId; })[0];
      if (!ef) { return; }
      var btn = document.querySelector('[data-valider-fragment="' + fragmentId + '"]');
      if (!btn) { return; }
      var zoneComp = document.querySelector('[data-zone-competences="' + fragmentId + '"]');
      var nbCoches = zoneComp ? zoneComp.querySelectorAll('input[type="checkbox"]:checked').length : 0;
      var possedeCompetencesRequises = !!btn.dataset.requiertCompetence;
      var satisfait = possedeCompetencesRequises ? (nbCoches > 0) : true;

      var estValide = ef.etat === DECOUVERTE_ETATS_FRAGMENT.VALIDE;
      var rienNaChange = false;
      if (estValide) {
        var choisi = document.querySelector('input[name="propositions_' + fragmentId + '"]:checked');
        var texteChoisiActuel = choisi ? ef.propositionsActuelles[parseInt(choisi.id.split('_').pop(), 10)] : null;
        var competencesCocheesActuelles = zoneComp
          ? Array.prototype.slice.call(zoneComp.querySelectorAll('input[type="checkbox"]:checked'))
            .map(function (c) { return ef.competencesActuelles[parseInt(c.dataset.competenceIndex, 10)].texte; }).sort()
          : [];
        var competencesValideesTexte = ef.competencesValidees.map(function (c) { return c.texte; }).sort();
        rienNaChange = (texteChoisiActuel === ef.texteRetenu) &&
          (competencesCocheesActuelles.join('|') === competencesValideesTexte.join('|'));
      }

      var doitPulser = satisfait && !rienNaChange;
      btn.textContent = (estValide && rienNaChange) ? '✅ Choix déjà validés' : '✅ Je valide cette expérience';
      if (doitPulser) {
        btn.style.background = '#0d6efd'; btn.style.color = '#FFFFFF'; btn.style.boxShadow = '0 4px 14px rgba(13,110,253,.4)';
        btn.classList.add('btn-valider-fragment-actif');
      } else {
        btn.style.background = '#CBD5E1'; btn.style.color = '#475569'; btn.style.boxShadow = 'none';
        btn.classList.remove('btn-valider-fragment-actif');
      }
      var msg = document.getElementById('messageCompetencesRequises_' + fragmentId);
      if (msg && (nbCoches > 0 || !possedeCompetencesRequises)) { msg.style.display = 'none'; }
    }

    // TACHE (retour utilisateur : "maximum 4 (ou 5) par expérience") :
    // plafond appliqué ici, au clic -- désactive les cases non cochées dès
    // que le plafond (dynamique, voir data-max-competences) est atteint,
    // jamais un message d'erreur après coup qui obligerait à décocher
    // soi-même.
    document.querySelectorAll('[data-zone-competences]').forEach(function (zone) {
      var cases = zone.querySelectorAll('input[type="checkbox"]');
      var plafond = parseInt(zone.dataset.maxCompetences, 10) || 4;
      var fragmentId = zone.dataset.zoneCompetences;
      function appliquerPlafond() {
        var nbCoches = zone.querySelectorAll('input[type="checkbox"]:checked').length;
        cases.forEach(function (c) { c.disabled = !c.checked && nbCoches >= plafond; });
        recalculerBoutonValider(fragmentId);
      }
      cases.forEach(function (c) { c.addEventListener('change', appliquerPlafond); });
    });
    // TACHE : la formulation choisie (Étape 1) fait elle aussi partie de
    // ce qui peut avoir changé depuis la dernière validation -- écouteur
    // ajouté ici, absent jusqu'ici (seules les compétences déclenchaient
    // un recalcul).
    document.querySelectorAll('input[name^="propositions_"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        var fragmentId = this.name.replace('propositions_', '');
        recalculerBoutonValider(fragmentId);
      });
    });

    document.querySelectorAll('[data-valider-fragment]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.validerFragment;
        if (btn.dataset.requiertCompetence) {
          var zoneComp0 = document.querySelector('[data-zone-competences="' + id + '"]');
          var nbCoches0 = zoneComp0 ? zoneComp0.querySelectorAll('input[type="checkbox"]:checked').length : 0;
          if (nbCoches0 === 0) {
            var msg0 = document.getElementById('messageCompetencesRequises_' + id);
            if (msg0) { msg0.style.display = 'block'; }
            return;
          }
        }
        var ef = etat.etatsFragments.filter(function (x) { return x.fragmentId === id; })[0];
        // TACHE (retour utilisateur : navigation libre + reconfirmation
        // transparente) : un fragment déjà validé qu'on revalide (avec ou
        // sans changement) doit repasser légitimement par la machine à
        // états -- reouvrirFragment() est appelé ici, de façon invisible
        // pour la personne, juste avant de revalider.
        if (ef.etat === DECOUVERTE_ETATS_FRAGMENT.VALIDE) { reouvrirFragment(ef); }
        var choisi = document.querySelector('input[name="propositions_' + id + '"]:checked');
        var index = choisi ? parseInt(choisi.id.split('_').pop(), 10) : 0;
        var zoneComp = document.querySelector('[data-zone-competences="' + id + '"]');
        var competencesCochees = zoneComp
          ? Array.prototype.slice.call(zoneComp.querySelectorAll('input[type="checkbox"]:checked'))
            .map(function (c) { return ef.competencesActuelles[parseInt(c.dataset.competenceIndex, 10)]; })
          : [];
        executerValidationFragment(ef, {
          texteChoisi: ef.propositionsActuelles[index],
          competencesRetenues: competencesCochees.length ? competencesCochees : ef.competencesActuelles
        });
        // TACHE (retour utilisateur : "je me retrouve sur la même fenêtre
        // avec 'choix déjà validés', comme si j'avais déjà eu le
        // récapitulatif" -- bug réel) : modeRecap utilisait "null" comme
        // "jamais encore déclenché", mais toute navigation entre onglets
        // ou tout Retour avant la fin le faisait passer à false --
        // définitivement, puisque rien ne le remettait à null ensuite. Le
        // passage automatique au récapitulatif ne se déclenchait donc
        // plus jamais. Corrigé : on détecte ici précisément le moment où
        // CETTE validation vient de compléter l'ensemble, et on force le
        // récapitulatif à ce moment-là, peu importe l'état précédent.
        if (etat.etatsFragments.every(fragmentEstValide)) {
          etat.modeRecap = true;
        } else if (!etat.modeRecap) {
          var suivant = etat.etatsFragments.filter(function (x) { return !fragmentEstValide(x); })[0];
          etat.ongletFragmentActif = suivant ? suivant.fragmentId : id;
        }
        afficherEtape(6);
      });
    });
    document.querySelectorAll('[data-raffiner-fragment]').forEach(function (btn) {
      btn.addEventListener('click', function () { etat.fragmentEnRaffinement = btn.dataset.raffinerFragment; afficherEtape(6); });
    });
    document.querySelectorAll('[data-repli-fragment]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.repliFragment;
        var ef = etat.etatsFragments.filter(function (x) { return x.fragmentId === id; })[0];
        declencherRepli(ef);
        executerValidationFragment(ef, {});
        if (etat.etatsFragments.every(fragmentEstValide)) {
          etat.modeRecap = true;
        } else {
          var suivant = etat.etatsFragments.filter(function (x) { return !fragmentEstValide(x); })[0];
          etat.ongletFragmentActif = suivant ? suivant.fragmentId : id;
        }
        afficherEtape(6);
      });
    });
    document.querySelectorAll('[data-copier-precision]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.copierPrecision;
        var ef = etat.etatsFragments.filter(function (x) { return x.fragmentId === id; })[0];
        var precision = document.getElementById('precisionRaffinement_' + id).value.trim();
        if (!precision) { return; }
        var messageSuite = 'Pour le fragment "' + ef.texteOriginal + '", voici une précision : ' + precision +
          '\n\nPropose une nouvelle série de formulations et de compétences (même format JSON que précédemment, ' +
          'uniquement pour ce fragment) :\n```json\n{"propositions": ["...", "..."], "competencesProposees": [{"texte":"...","categorie":"...","preuve":["..."]}]}\n```';
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(messageSuite).catch(function () {}); }
        var zone = document.getElementById('collageRaffinement_' + id);
        zone.innerHTML = '<p class="small text-muted mt-2">Collez ce message dans la même conversation IA, puis collez sa réponse ci-dessous :</p>' +
          htmlCollageInstantane('Raffinement' + id,
            '<button type="button" class="btn btn-primary btn-sm mt-2" data-importer-raffinement="' + id + '">Importer cette réponse</button>');
        activerCollageInstantane({
          idZoneAuto: 'zoneCollageAutoRaffinement' + id, idZoneApercu: 'zoneApercuCollageRaffinement' + id,
          idTextarea: 'texteCollageRaffinement' + id, idBoutonColler: 'btnCollerAutoRaffinement' + id,
          idBoutonCollerManuel: 'btnCollerManuelRaffinement' + id
        });
        zone.querySelector('[data-importer-raffinement]').addEventListener('click', function () {
          var texteColle = document.getElementById('texteCollageRaffinement' + id).value;
          var resultat = executerRaffinement(ef, texteColle);
          if (!resultat.succes) { alert(resultat.erreur); return; }
          etat.fragmentEnRaffinement = null;
          afficherEtape(6);
        });
      });
    });
  }

  // ------------------------------------------------------------
  // Étape 7 — Questions ciblées (0 à 3, absente si vide — gérée à l'appel)
  // ------------------------------------------------------------
  function etapeQuestionsCiblees() {
    return {
      titre: '❓ Encore deux ou trois précisions',
      contenuHTML:
        '<p class="text-muted small mb-3">Ces quelques précisions nous aident à mieux orienter votre profil.</p>' +
        etat.questionsCiblees.map(function (q, i) {
          return '<div class="mb-3"><label class="form-label small fw-semibold">' + echapperAttribut(q) + '</label>' +
            '<input type="text" class="form-control form-control-sm" id="reponseCiblee_' + i + '" value="' + echapperAttribut(etat.reponsesQuestionsCiblees[i] || '') + '"></div>';
        }).join(''),
      peutContinuer: true,
      onAfficher: function () {
        etat.questionsCiblees.forEach(function (q, i) {
          var champ = document.getElementById('reponseCiblee_' + i);
          champ.addEventListener('input', function () { etat.reponsesQuestionsCiblees[i] = this.value; });
          // TACHE (retour utilisateur : "quand je tape sur Entrée je passe
          // d'une zone de texte à une autre, et pour la dernière =
          // continuer") :
          champ.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') { return; }
            e.preventDefault();
            var suivant = document.getElementById('reponseCiblee_' + (i + 1));
            if (suivant) { suivant.focus(); } else { document.getElementById('btnContinuerDecouverte').click(); }
          });
        });
      },
      onContinuer: function () { afficherEtape(8); }
    };
  }

  // ------------------------------------------------------------
  // Étape 8 — Stratégie et orientation
  // ------------------------------------------------------------
  function etapeStrategie() {
    if (!etat.strategie) {
      var competencesValidees = [];
      etat.etatsFragments.forEach(function (ef) { competencesValidees = competencesValidees.concat(ef.competencesValidees || []); });
      var nbPro = etat.etatsFragments.filter(function (ef) { return ef.origine === 'proDeclaree' || ef.origine === 'proNonDeclaree'; }).length;
      var nbPerso = etat.etatsFragments.length - nbPro;
      var resultatStrategie = executerStrategie(competencesValidees, {
        nombreExperiencesProfessionnelles: nbPro,
        nombreExperiencesPersonnelles: nbPerso,
        objectifReconversion: dossier.objectif === 'reconversion'
      });
      // TACHE (gestion centralisée des erreurs) : un échec ici ne bloque
      // jamais le parcours -- la stratégie est un complément utile, pas
      // une condition pour produire un CV (doc1 §10.5 : son absence ne
      // devrait pas empêcher un document par ailleurs valorisable).
      etat.strategie = resultatStrategie.succes
        ? resultatStrategie.valeurs
        : { metiersProposes: [], aucunMetierPertinent: true, typeCVRecommande: { type: DECOUVERTE_TYPES_CV.PAR_COMPETENCES, regle: 'repli-erreur-strategie' } };
      etat.typeCVChoisi = etat.strategie.typeCVRecommande.type;
    }

    var libellesType = { chronologique: 'Chronologique', mixte: 'Mixte', parCompetences: 'Par compétences' };

    return {
      titre: '🎯 Votre stratégie',
      contenuHTML:
        // TACHE (retour utilisateur : "pistes de métier possibles" trop
        // engageant vu la base de données limitée -- ex. le permis B
        // n'est jamais pris en compte) : repliée par défaut, formulation
        // plus prudente ("à explorer" plutôt que "possibles"), et une
        // réserve explicite sur les limites de ce que l'outil peut savoir.
        (etat.strategie.aucunMetierPertinent
          ? '<p class="text-muted small mb-3">Aucune piste de métier ne se dégage clairement pour l’instant — ce n’est pas un problème, votre CV reste tout à fait valorisable.</p>'
          : '<button type="button" id="toggleMetiersDecouverte" class="btn btn-outline-secondary btn-sm mb-2">' +
            '🔍 Voir quelques pistes de métier à explorer</button>' +
            '<div id="zoneMetiersDecouverte" style="display:none;">' +
            '<p class="small text-muted mb-2">À prendre comme un point de départ, pas une liste définitive — ' +
            'certains critères comme le permis ou la mobilité n’ont pas pu être pris en compte ici. À affiner avec votre conseiller.</p>' +
            '<ul class="small">' +
            etat.strategie.metiersProposes.slice(0, 3).map(function (mp) { return '<li>' + echapperAttribut(mp.metier.nom) + '</li>'; }).join('') + '</ul>' +
            '</div>') +
        '<p class="fw-semibold mb-2 mt-3">Type de CV recommandé :</p>' +
        '<div class="d-flex gap-2">' +
        Object.keys(libellesType).map(function (cle) {
          return '<button type="button" class="btn btn-sm ' + (etat.typeCVChoisi === cle ? 'btn-primary' : 'btn-outline-secondary') + '" data-type-cv="' + cle + '">' + libellesType[cle] + '</button>';
        }).join('') + '</div>' +
        '<div id="messageErreurGenerationDecouverte" class="small mt-3"></div>',
      peutContinuer: true,
      // TACHE (retour utilisateur : "quelle est l'utilité de cette
      // fenêtre ?") : l'ancien écran "Votre CV est prêt à être créé"
      // (étape 9) ne faisait qu'annoncer ce que ce bouton fait déjà --
      // fusionné ici, un clic de moins, cohérent avec le principe
      // d'accessibilité cognitive (éviter tout écran sans action propre).
      libelleContinuer: 'Créer mon CV →',
      onAfficher: function () {
        document.querySelectorAll('[data-type-cv]').forEach(function (btn) {
          btn.addEventListener('click', function () { etat.typeCVChoisi = this.dataset.typeCv; afficherEtape(8); });
        });
        var toggleMetiers = document.getElementById('toggleMetiersDecouverte');
        if (toggleMetiers) {
          toggleMetiers.addEventListener('click', function () {
            var zone = document.getElementById('zoneMetiersDecouverte');
            var ouvert = zone.style.display !== 'none';
            zone.style.display = ouvert ? 'none' : 'block';
            toggleMetiers.textContent = (ouvert ? '🔍 Voir' : '🔽 Masquer') + ' quelques pistes de métier à explorer';
          });
        }
      },
      onContinuer: function () {
        var fragmentsValides = etat.etatsFragments.filter(fragmentEstValide);
        var resultatMapping = executerMapping(fragmentsValides, {});
        if (!resultatMapping.succes) {
          document.getElementById('messageErreurGenerationDecouverte').innerHTML =
            '<span style="color:#b91c1c;">⚠️ ' + resultatMapping.erreur + '</span>';
          return;
        }
        var resultatApplication = executerApplicationDossier(dossier, resultatMapping.valeurs.misesAJour);
        if (!resultatApplication.succes) {
          document.getElementById('messageErreurGenerationDecouverte').innerHTML =
            '<span style="color:#b91c1c;">⚠️ ' + resultatApplication.erreur + '</span>';
          return;
        }
        dossier.identite = dossier.identite || {};
        ['civilite', 'nom', 'prenom', 'telephone', 'email'].forEach(function (champ) {
          if (etat.identite[champ]) { dossier.identite[champ] = etat.identite[champ]; }
        });
        // TACHE (retour utilisateur : "les réponses à ces questions vont
        // dans l'IA par la suite ?") : jusqu'ici perdues silencieusement
        // une fois l'étape passée -- transmises désormais via
        // dossier.informationsNonClassees, déjà lu par texteProfil() et
        // donc déjà transmis à l'IA pour le CV/la lettre/l'entretien,
        // sans avoir besoin d'un nouveau mécanisme.
        dossier.informationsNonClassees = dossier.informationsNonClassees || [];
        etat.questionsCiblees.forEach(function (question, i) {
          var reponse = (etat.reponsesQuestionsCiblees[i] || '').trim();
          if (reponse) { dossier.informationsNonClassees.push(question + ' — Réponse : ' + reponse); }
        });
        // TACHE (retour utilisateur : "je suis sûr qu'il y a plus de
        // contenu et des informations utiles que notre JSON... si on
        // prend directement le texte, comment l'intégrer de façon
        // cohérente ?") : le récit complet est conservé ici, EN PLUS de
        // l'extraction structurée -- jamais à sa place. La structure
        // (expériences/compétences/loisirs) reste la seule à savoir OÙ
        // ranger chaque information dans le CV, de façon fiable et
        // traçable ; le récit brut, lui, apporte la nuance qu'aucune
        // structure ne peut capturer, disponible pour l'IA au moment de
        // rédiger le CV/la lettre/l'entretien (déjà le même canal
        // vérifié pour les réponses aux questions ciblées ci-dessus).
        if (etat.recit && etat.recit.trim()) {
          dossier.informationsNonClassees.push('Récit complet raconté par la personne, pour context et nuances au-delà des éléments déjà extraits ci-dessus : ' + etat.recit.trim());
        }
        dossier.typeCVRecommandeDecouverte = etat.typeCVChoisi;
        fermerDecouverteCompetences();
        // TACHE (retour utilisateur : "je clique sur Retour et je me
        // retrouve sur 'Faire le point'") : le bouton Retour de la page
        // Résultats pointe TOUJOURS vers 'revelation' (Faire le point),
        // sans savoir comment la personne est arrivée là -- le module
        // Découverte contourne entièrement cette page, ce lien n'a donc
        // aucun sens dans ce cas précis. Signalé ici, consommé une seule
        // fois dans pageResultats() (app.js).
        window._decouverteVersResultats = true;
        naviguerVers('resultats');
      }
    };
  }

  function obtenirDefinitionEtape(numero) {
    if (numero === 1) { return etapeAccueil(); }
    if (numero === 2) { return etapeIdentite(); }
    if (numero === 3) { return etapeRecit(); }
    if (numero === 4) { return etapeChoixAssistant(); }
    if (numero === 5) { return etapeCollerReponse(); }
    if (numero === 6) { return etapeDecouverte(); }
    if (numero === 7) { return etapeQuestionsCiblees(); }
    if (numero === 8) { return etapeStrategie(); }
    return etapeStrategie();
  }

  afficherEtape(1);
}

// TACHE (retour utilisateur : "je veux le tel/mail en jaune pour les
// trouver plus facilement", réutilisé tel quel depuis l'Étape 2 du wizard
// CV -- même comportement, même composant, homogénéité exigée).
function afficherDetectionCoordonneesDecouverte(texte) {
  var zone = document.getElementById('detectionCoordonneesDecouverte');
  if (!zone) { return; }
  var regexTelephone = /\b0[1-9](?:[\s.\-]?\d{2}){4}\b|\+33[\s.\-]?[1-9](?:[\s.\-]?\d{2}){4}/g;
  var regexEmail = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  var telephones = (texte.match(regexTelephone) || []).filter(function (t, i, arr) { return arr.indexOf(t) === i; });
  var emails = (texte.match(regexEmail) || []).filter(function (t, i, arr) { return arr.indexOf(t) === i; });
  var trouves = telephones.concat(emails);
  if (!trouves.length) { zone.innerHTML = ''; return; }
  zone.innerHTML = '<p class="small text-muted mb-1">Coordonnées détectées — pensez à les retirer si vous ne voulez pas les envoyer :</p>' +
    '<div class="d-flex flex-wrap gap-2">' +
    trouves.map(function (t) {
      return '<span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:6px;padding:0.2rem 0.6rem;font-size:0.85rem;font-weight:600;">' +
        echapperAttribut(t) + '</span>';
    }).join('') + '</div>';
}
