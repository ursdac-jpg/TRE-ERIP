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
  // TACHE (retour utilisateur : plus de fermeture au clic sur le fond) :
  // la croix (fermerDecouverteBtn, plus bas) reste le seul moyen
  // explicite de fermer, en plus de la fin naturelle du parcours.

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
          // TACHE (retour utilisateur : "pour un CIP le mot structure ça
          // lui parle, pour un bénéficiaire il ne sait pas de quoi il
          // s'agit -- il faut en donner des exemples précis") : exemples
          // concrets ajoutés entre parenthèses, la première fois que le
          // mot apparaît dans cette question -- jamais un jargon
          // professionnel non expliqué face à un public qui ne le
          // maîtrise pas forcément.
          colonneGauche += '<p class="fw-semibold mb-2 mt-3">Avez-vous une structure d’accueil en tête (une entreprise, une association, une exploitation agricole, chez un particulier...) ?</p>' +
            '<div class="cartes" style="margin:0.5rem 0;justify-content:flex-start;">' +
            carteChoix('stage-structure', 'oui', etat.stageAvecStructure === true, '', 'Oui, une structure précise') +
            carteChoix('stage-structure', 'non', etat.stageAvecStructure === false, '', 'Non, je cherche de façon générale') +
            '</div>';
          if (etat.stageAvecStructure === true) {
            var rcs = dossier.rechercheCandidature || { entreprise: '', site: '', lienOffre: '' };
            colonneDroite += '<div class="mt-2">' +
              '<input type="text" class="form-control form-control-sm mb-2" id="decouverteEntrepriseOffre" placeholder="Nom de la structure (entreprise, association...)" value="' + echapperAttribut(rcs.entreprise) + '">' +
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
          // TACHE (retour utilisateur : "ce message ne passe pas sur tous
          // les IA") : conserve la version nettoyée du récit (sans
          // contexte personnel sensible, decouverte-competences.md),
          // utilisée plus tard À LA PLACE du récit brut original -- voir
          // finaliserEtNaviguerVersResultats() plus bas.
          etat.reciteNettoye = resultat.valeurs.reciteNettoye || '';
          // TACHE (chantier "exp perso", Phase 1 : relier chaque question
          // ciblée à un fragment précis) : questionsCiblees passe d'une
          // simple liste de chaînes à des objets {texte, fragmentIndex,
          // type} (decouverte-competences.md, section "Questions
          // ciblées"). Normalisé ici, point d'entrée unique -- accepte
          // encore l'ancien format (chaîne brute) le temps que l'IA suive
          // pleinement la nouvelle consigne, jamais un plantage si elle
          // ne renvoie pas exactement la forme attendue.
          etat.questionsCiblees = (resultat.valeurs.questionsCiblees || []).map(function (q) {
            if (typeof q === 'string') { return { texte: q, fragmentIndex: null, type: 'texte' }; }
            return {
              texte: q.texte || '',
              fragmentIndex: (typeof q.fragmentIndex === 'number') ? q.fragmentIndex : null,
              type: (q.type === 'date') ? 'date' : 'texte'
            };
          });
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
  // Étape 7 — Questions ciblées (5 à 10, absente si vide -- gérée à l'appel)
  // TACHE (retour utilisateur : "je veux au moins 5 questions, jamais
  // plus de 10" -- decouverte-competences.md, section "Questions
  // ciblées") : plancher relevé de 0 à 5, plafond de 5 à 10. Le titre et
  // le texte d'introduction ci-dessous sont mis à jour en conséquence --
  // "deux ou trois précisions" ne correspondait déjà plus à la réalité
  // (jusqu'à 5 questions étaient déjà possibles avant ce changement).
  // ------------------------------------------------------------
  // TACHE (chantier "exp perso", Phase 2 : champ structuré pour les
  // questions de type "date") : jamais un champ de texte libre pour une
  // date (risque de faute de frappe/interprétation, retour utilisateur) --
  // deux sélecteurs d'année (fin vide = "toujours en cours"), bornés de
  // 1960 à l'année en cours calculée réellement (jamais une année en dur
  // qui deviendrait fausse avec le temps).
  function optionsAnnees(valeurSelectionnee, libellePremiereOption) {
    var anneeCourante = new Date().getFullYear();
    var options = '<option value="">' + libellePremiereOption + '</option>';
    for (var annee = anneeCourante; annee >= 1960; annee--) {
      options += '<option value="' + annee + '"' + (String(annee) === String(valeurSelectionnee) ? ' selected' : '') + '>' + annee + '</option>';
    }
    return options;
  }

  function etapeQuestionsCiblees() {
    return {
      titre: '❓ Quelques précisions',
      contenuHTML:
        '<p class="text-muted small mb-3">Ces quelques précisions nous aident à mieux orienter votre profil.</p>' +
        etat.questionsCiblees.map(function (q, i) {
          // TACHE (chantier "exp perso", Phase 2) : question de type
          // "date" -- deux sélecteurs d'année, jamais un champ de texte
          // libre pour ce cas précis (voir optionsAnnees ci-dessus).
          // Réponse stockée sous forme d'objet {dateDebut, dateFin} dans
          // etat.reponsesQuestionsCiblees[i] -- PAS une chaîne, à la
          // différence des questions de type "texte" ci-dessous (voir
          // finaliserEtNaviguerVersResultats(), qui gère les deux formes).
          if (q.type === 'date') {
            var reponseDate = (etat.reponsesQuestionsCiblees[i] && typeof etat.reponsesQuestionsCiblees[i] === 'object')
              ? etat.reponsesQuestionsCiblees[i] : { dateDebut: '', dateFin: '' };
            return '<div class="mb-3"><label class="form-label small fw-semibold">' + echapperAttribut(q.texte) + '</label>' +
              '<div class="d-flex gap-2 align-items-center flex-wrap">' +
              '<select class="form-select form-select-sm" style="width:auto;" id="reponseCibleeDebut_' + i + '">' +
              optionsAnnees(reponseDate.dateDebut, 'Année de début') + '</select>' +
              '<span class="small text-muted">à</span>' +
              '<select class="form-select form-select-sm" style="width:auto;" id="reponseCibleeFin_' + i + '">' +
              optionsAnnees(reponseDate.dateFin, 'Toujours en cours') + '</select>' +
              '</div></div>';
          }
          // TACHE (retour utilisateur : "pour la formation... indiquer
          // l'année, même format que les questions sur la durée du
          // métier -- pareil pour tout ce qui est associatif, bénévole,
          // expérience personnelle") : formation/engagement combinent
          // désormais un champ texte (l'intitulé/la description, dans
          // les mots de la personne) ET les mêmes 2 sélecteurs d'année
          // que le type "date" -- jamais un champ de texte libre pour la
          // date elle-même. Réponse stockée en {texte, dateDebut,
          // dateFin} (voir finaliserEtNaviguerVersResultats()).
          if (q.type === 'formation' || q.type === 'engagement') {
            var reponseCombinee = (etat.reponsesQuestionsCiblees[i] && typeof etat.reponsesQuestionsCiblees[i] === 'object')
              ? etat.reponsesQuestionsCiblees[i] : { texte: '', dateDebut: '', dateFin: '', niveau: '' };
            // TACHE (retour utilisateur : "on peut aussi rajouter le
            // niveau d'études... si jamais ils ont un niveau bac, cela
            // devrait faire apparition dans le bloc Formation") :
            // UNIQUEMENT pour "formation" (jamais "engagement", qui n'a
            // pas cette notion) -- réutilise NIVEAUX_DIPLOME_SIMPLES
            // (app.js), déjà utilisé par le formulaire Formation
            // classique, jamais une liste dupliquée. Optionnel (aucun
            // niveau présélectionné) -- une pastille de plus à cliquer,
            // pas un champ obligatoire.
            var pastillesNiveauQuestion = (q.type === 'formation')
              ? '<div class="mb-2"><span class="small text-muted d-block mb-1">Niveau (optionnel)</span>' +
                '<div class="pastilles">' + NIVEAUX_DIPLOME_SIMPLES.map(function (n) {
                  var actif = (reponseCombinee.niveau === n.label) ? ' actif' : '';
                  return '<span class="pastille' + actif + '" data-niveau-formation-question="' + echapperAttribut(n.label) + '" data-index-question="' + i + '">' + n.label + '</span>';
                }).join('') + '</div></div>'
              : '';
            return '<div class="mb-3"><label class="form-label small fw-semibold">' + echapperAttribut(q.texte) + '</label>' +
              '<input type="text" class="form-control form-control-sm mb-2" id="reponseCiblee_' + i + '" value="' + echapperAttribut(reponseCombinee.texte || '') + '">' +
              pastillesNiveauQuestion +
              '<div class="d-flex gap-2 align-items-center flex-wrap">' +
              '<select class="form-select form-select-sm" style="width:auto;" id="reponseCibleeDebut_' + i + '">' +
              optionsAnnees(reponseCombinee.dateDebut, 'Année de début') + '</select>' +
              '<span class="small text-muted">à</span>' +
              '<select class="form-select form-select-sm" style="width:auto;" id="reponseCibleeFin_' + i + '">' +
              optionsAnnees(reponseCombinee.dateFin, 'Toujours en cours') + '</select>' +
              '</div></div>';
          }
          return '<div class="mb-3"><label class="form-label small fw-semibold">' + echapperAttribut(q.texte) + '</label>' +
            '<input type="text" class="form-control form-control-sm" id="reponseCiblee_' + i + '" value="' + echapperAttribut(typeof etat.reponsesQuestionsCiblees[i] === 'string' ? etat.reponsesQuestionsCiblees[i] : '') + '"></div>';
        }).join('') +
        // TACHE (retour utilisateur : "la fenêtre Votre stratégie... je
        // n'ai pas besoin de cette fenêtre qui apparaît juste avant de
        // pouvoir personnaliser le CV, j'ai déjà stratégie de contenu
        // sur la page CV") : écran supprimé (voir plus bas, onContinuer
        // enchaîne directement vers les résultats) -- ce simple
        // conteneur d'erreur reprend le rôle de l'ancien
        // "messageErreurGenerationDecouverte" (même id, jamais un
        // deuxième mécanisme d'affichage d'erreur), au cas où la
        // finalisation échouerait : la personne reste alors sur CET
        // écran (étape 7), avec le message ici, plutôt que sur un écran
        // qui n'existe plus.
        '<div id="messageErreurGenerationDecouverte" class="small mt-3"></div>',
      peutContinuer: true,
      onAfficher: function () {
        etat.questionsCiblees.forEach(function (q, i) {
          if (q.type === 'date') {
            var selectDebut = document.getElementById('reponseCibleeDebut_' + i);
            var selectFin = document.getElementById('reponseCibleeFin_' + i);
            function majReponseDate() {
              etat.reponsesQuestionsCiblees[i] = { dateDebut: selectDebut.value, dateFin: selectFin.value };
            }
            selectDebut.addEventListener('change', majReponseDate);
            selectFin.addEventListener('change', majReponseDate);
            return;
          }
          // TACHE (retour utilisateur : "formation/engagement -- même
          // format que les questions de durée") : même principe que
          // "date" ci-dessus, plus le champ texte (intitulé/description).
          if (q.type === 'formation' || q.type === 'engagement') {
            var champTexteCombine = document.getElementById('reponseCiblee_' + i);
            var selectDebutCombine = document.getElementById('reponseCibleeDebut_' + i);
            var selectFinCombine = document.getElementById('reponseCibleeFin_' + i);
            function majReponseCombinee() {
              var precedent = (etat.reponsesQuestionsCiblees[i] && typeof etat.reponsesQuestionsCiblees[i] === 'object')
                ? etat.reponsesQuestionsCiblees[i] : {};
              etat.reponsesQuestionsCiblees[i] = {
                texte: champTexteCombine.value,
                dateDebut: selectDebutCombine.value,
                dateFin: selectFinCombine.value,
                niveau: precedent.niveau || ''
              };
            }
            champTexteCombine.addEventListener('input', majReponseCombinee);
            selectDebutCombine.addEventListener('change', majReponseCombinee);
            selectFinCombine.addEventListener('change', majReponseCombinee);
            // TACHE (retour utilisateur : "aucune trace dans le CV" --
            // piste trouvée en relisant le code : ce champ était le SEUL
            // de cet écran sans gestionnaire de touche Entrée, contrairement
            // à tous les autres (voir plus bas, "quand je tape sur Entrée
            // je passe d'une zone de texte à une autre"). Une touche
            // Entrée non interceptée dans un champ texte peut déclencher
            // une soumission de formulaire native selon le contexte,
            // perdant potentiellement la saisie avant même que
            // majReponseCombinee() n'ait pu la capturer -- même
            // comportement désormais ajouté ici, jamais laissé de côté.
            champTexteCombine.addEventListener('keydown', function (e) {
              if (e.key !== 'Enter') { return; }
              e.preventDefault();
              var suivant = document.getElementById('reponseCiblee_' + (i + 1));
              if (suivant) { suivant.focus(); } else { document.getElementById('btnContinuerDecouverte').click(); }
            });
            // TACHE (retour utilisateur : "niveau d'études") : clic sur
            // une pastille = bascule (reclique la même = désélectionne,
            // jamais un niveau imposé). Uniquement présent pour
            // "formation" (voir le rendu HTML ci-dessus), donc ce
            // sélecteur ne trouve simplement rien pour "engagement".
            document.querySelectorAll('[data-index-question="' + i + '"]').forEach(function (pastille) {
              pastille.addEventListener('click', function () {
                var niveauClique = this.dataset.niveauFormationQuestion;
                var actuel = (etat.reponsesQuestionsCiblees[i] && typeof etat.reponsesQuestionsCiblees[i] === 'object')
                  ? etat.reponsesQuestionsCiblees[i] : { texte: champTexteCombine.value, dateDebut: selectDebutCombine.value, dateFin: selectFinCombine.value, niveau: '' };
                actuel.niveau = (actuel.niveau === niveauClique) ? '' : niveauClique;
                etat.reponsesQuestionsCiblees[i] = actuel;
                afficherEtape(7);
              });
            });
            return;
          }
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
      // TACHE (retour utilisateur : "l'écran stratégie disparaît, mais
      // pas le calcul lui-même") : calculerStrategieSiBesoin() -- même
      // calcul qu'avant (executerStrategie(), inchangé), toujours
      // silencieux désormais -- alimente encore dossier.
      // typeCVRecommandeDecouverte (chantier délibérément laissé de
      // côté, voir mémoire) sans jamais l'imposer ni le montrer à la
      // personne. finaliserEtNaviguerVersResultats() reprend ensuite,
      // à l'identique, tout ce que faisait l'ancien onContinuer de
      // l'étape 8 (mapping, application au dossier, navigation) --
      // jamais une seconde logique parallèle.
      onContinuer: function () {
        // TACHE (retour utilisateur : "je n'ai toujours rien du côté
        // formation et engagement associatif malgré les questions...
        // c'est trop aléatoire") : cette étape s'affiche désormais
        // TOUJOURS -- son rôle dépasse largement la seule mobilité
        // (Formations/diplômes/certifications, Engagement associatif,
        // Savoir-faire personnel s'y ajoutent, jamais laissés au hasard
        // d'une IA qui devrait détecter elle-même le manque). Chaque
        // bloc reste individuellement Oui/Non -- répondre "Non" partout
        // revient à ne rien ajouter, un clic "Continuer" suffit alors à
        // passer à la suite exactement comme avant.
        afficherEtape(8);
      }
    };
  }

  // ------------------------------------------------------------
  // TACHE (retour utilisateur : "je n'ai toujours rien du côté formation
  // et engagement associatif malgré les questions... c'est trop
  // aléatoire, on va faire un panneau structuré à la place, comme celui
  // de mobilité, et on l'étend à toutes ces informations") : remplace le
  // mécanisme fragile (l'IA devait elle-même détecter le manque et
  // étiqueter sa question "type": "formation"/"engagement", jamais
  // garanti) par un panneau TOUJOURS affiché, jamais conditionné à ce
  // que l'IA ait ou non posé une question -- 4 blocs indépendants
  // (Mobilité, Formations/diplômes/certifications, Engagement associatif,
  // Savoir-faire personnel), chacun Oui/Non puis un clic, jamais une
  // interprétation de texte libre pour les dates (mêmes sélecteurs
  // d'année que partout ailleurs dans l'application). Écrit directement
  // dans dossier.formations/engagements/experiencesPerso -- la même
  // donnée, structurée de la même façon, quel que soit le parcours
  // d'origine (Découverte ou manuel).
  // ------------------------------------------------------------
  function etapeMobilite() {
    // TACHE : un seul état local -- "valide" par bloc pilote le
    // repli/badge (retour utilisateur : "je veux que l'onglet se ferme
    // avec un message validé/à compléter"), jamais utilisé pour bloquer
    // la navigation (peutContinuer reste toujours vrai, comme avant).
    // TACHE (retour utilisateur : "Non apparaît déjà sélectionné avant
    // même d'avoir cliqué") : bug réel trouvé -- actif:false servait à la
    // fois de valeur de depart ("pas encore repondu") ET de reponse
    // "Non" reelle, les deux etant indiscernables une fois affiches
    // (`d.actif ? ... : ...` traite les deux cas identiquement). actif:
    // null distingue desormais explicitement "pas encore repondu" de
    // "a repondu Non" -- les boutons Oui/Non (plus bas) ne mettent en
    // avant AUCUN des deux tant que la personne n'a pas reellement
    // cliqué.
    etat.infosComplementaires = etat.infosComplementaires || {
      mobilite: { valide: false },
      formation: { valide: false, actif: null, texte: '', niveau: '', dateDebut: '', dateFin: '' },
      engagement: { valide: false, actif: null, texte: '', dateDebut: '', dateFin: '' },
      savoirFairePerso: { valide: false, actif: null, texte: '', dateDebut: '', dateFin: '' }
    };
    var infos = etat.infosComplementaires;

    // TACHE (retour utilisateur : "dans toutes les zones de texte je
    // veux que la 1ère lettre soit en majuscule") : ne touche jamais le
    // reste du mot -- appliqué au premier caractère à chaque frappe.
    function cablerMajusculeAuto(champ) {
      if (!champ) { return; }
      champ.addEventListener('input', function () {
        if (this.value) { this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1); }
      });
    }

    // TACHE (retour utilisateur : "une fois complété, l'onglet se ferme
    // avec un badge validé/à compléter") : un seul gabarit, réutilisé
    // par les 4 blocs -- replié (juste le titre + badge + "Modifier")
    // une fois validé, sinon déplié avec son contenu complet.
    // TACHE (retour utilisateur : "la pastille à compléter je la veux
    // d'une couleur visible") : bg-warning (orange), bien plus visible
    // que le gris précédent.
    // TACHE (retour utilisateur : "un bouton valider pour chaque partie,
    // sans condition -- rien saisi = non") : ajouté systématiquement en
    // bas de chaque bloc non encore validé -- marque valide=true quel
    // que soit l'état des champs (aucune vérification de contenu),
    // exactement le même geste que la touche Entrée dans un champ texte.
    // TACHE (retour utilisateur : "quand un exemple a été choisi, je
    // veux le voir sous forme de pastille avec la possibilité de
    // l'enlever grâce à une petite croix") : remplace les listes de
    // texte "Déjà ajoutés : X, Y, Z" par de vraies pastilles cliquables,
    // une fonction partagée pour les 4 cas (certifications, formations,
    // engagements, savoir-faire personnel) -- jamais 4 rendus différents.
    function pillsAvecCroix(cleDossier, extraireTexte) {
      var liste = dossier[cleDossier] || [];
      if (!liste.length) { return ''; }
      return '<div class="mb-2">' + liste.map(function (item, i) {
        var texte = extraireTexte(item);
        return '<span class="pastille actif" style="display:inline-flex;align-items:center;gap:0.3rem;margin:0 0.3rem 0.3rem 0;">' +
          echapperAttribut(texte) +
          '<span style="cursor:pointer;font-weight:bold;" data-retirer-infocompl="' + cleDossier + '" data-index-infocompl="' + i + '" title="Retirer">✕</span></span>';
      }).join('') + '</div>';
    }

    function enveloppeBloc(cle, titre, contenuInterieur) {
      var estValide = infos[cle].valide;
      var badge = estValide
        ? ' <span class="badge bg-success">✅ Validé</span>'
        : ' <span class="badge bg-warning text-dark">À compléter</span>';
      if (estValide) {
        return '<div class="mb-3 p-2 border rounded d-flex justify-content-between align-items-center">' +
          '<span class="fw-semibold">' + titre + badge + '</span>' +
          '<button type="button" class="btn btn-sm btn-outline-secondary" data-rouvrir-bloc="' + cle + '">Modifier</button>' +
          '</div>';
      }
      return '<div class="mb-4 p-2 border rounded"><span class="d-block mb-2 fw-semibold">' + titre + badge + '</span>' + contenuInterieur +
        '<button type="button" class="btn btn-sm btn-success mt-2" data-valider-bloc="' + cle + '">✅ Valider</button></div>';
    }

    // ---- Formations, diplômes et certifications : 3 sous-sections ----
    // TACHE (retour utilisateur : "3 options : niveau d'études, avec la
    // logique niveau d'abord puis intitulé -- certifications, texte +
    // année + bouton parcourir la liste -- formations, même logique que
    // certifications") : les 3 cohabitent, jamais un onglet exclusif --
    // rien n'empêche de renseigner un niveau ET d'ajouter une
    // certification ET une formation du catalogue.
    function contenuBlocFormation() {
      var d = infos.formation;
      var sousNiveau =
        '<div class="mb-3"><span class="d-block mb-2 fw-semibold small">Niveau d’études</span>' +
        // TACHE (retour utilisateur : "clair, intelligible... pour
        // l'instant c'est pas le cas") : bug réel trouvé -- aucune
        // question n'était écrite ici, contrairement à "Avez-vous le
        // permis ?" pour la Mobilité juste au-dessus. Les boutons
        // Oui/Non répondaient à une question invisible.
        '<p class="mb-2 small">Avez-vous un diplôme à mentionner ?</p>' +
        '<div class="d-flex gap-2 mb-2">' +
        '<button type="button" class="btn btn-sm ' + (d.actif === true ? 'btn-primary' : 'btn-outline-secondary') + '" data-infocompl-oui="formation">Oui</button>' +
        '<button type="button" class="btn btn-sm ' + (d.actif === false ? 'btn-primary' : 'btn-outline-secondary') + '" data-infocompl-non="formation">Non</button>' +
        '</div>' +
        (d.actif
          // TACHE (retour utilisateur : "d'abord que la personne
          // choisisse son niveau et après avoir la zone de texte avec
          // l'intitulé") : ordre inversé par rapport à avant -- pastilles
          // de niveau EN PREMIER, champ intitulé ensuite.
          ? '<div class="mt-2">' +
            '<div class="pastilles mb-2">' + NIVEAUX_DIPLOME_SIMPLES.map(function (n) {
              var actifNiveau = (d.niveau === n.label) ? ' actif' : '';
              return '<span class="pastille' + actifNiveau + '" data-niveau-infocompl="' + echapperAttribut(n.label) + '" data-cle-infocompl="formation">' + n.label + '</span>';
            }).join('') + '</div>' +
            '<input type="text" class="form-control form-control-sm mb-2" id="infoComplTexte_formation" placeholder="Intitulé du diplôme ou de la formation" value="' + echapperAttribut(d.texte || '') + '">' +
            // TACHE (retour utilisateur : "si j'ai Bac, je ne peux pas
            // être toujours en cours -- on garde que l'année de début") :
            // une formation/un diplôme a une année d'obtention, jamais
            // une plage "en cours" -- une seule sélection, jamais deux.
            '<select class="form-select form-select-sm" style="width:auto;" id="infoComplDebut_formation">' + optionsAnnees(d.dateDebut, 'Année d’obtention') + '</select>' +
            '</div>'
          : '') +
        '</div>';

      var sousCertifications =
        '<div class="mb-3"><span class="d-block mb-2 fw-semibold small">Certifications</span>' +
        pillsAvecCroix('certifications', function (c) { return c; }) +
        '<div class="d-flex gap-2 align-items-center flex-wrap mb-1">' +
        '<input type="text" class="form-control form-control-sm" style="max-width:240px;" id="infoComplTexteCertif" placeholder="Nom de la certification">' +
        '<select class="form-select form-select-sm" style="width:auto;" id="infoComplAnneeCertif">' + optionsAnnees('', 'Année') + '</select>' +
        '<button type="button" class="btn btn-sm btn-outline-primary" id="btnAjouterCertifTexteLibre">Ajouter</button>' +
        '</div>' +
        '<button type="button" class="btn btn-sm btn-outline-secondary" id="btnParcourirCertifications">📖 Parcourir la liste</button>' +
        '</div>';

      var sousFormationsCatalogue =
        '<div class="mb-1"><span class="d-block mb-2 fw-semibold small">Formations</span>' +
        pillsAvecCroix('formations', function (f) { return f.intitule; }) +
        '<div class="d-flex gap-2 align-items-center flex-wrap mb-1">' +
        '<input type="text" class="form-control form-control-sm" style="max-width:240px;" id="infoComplTexteFormationLibre" placeholder="Nom de la formation">' +
        '<select class="form-select form-select-sm" style="width:auto;" id="infoComplAnneeFormationLibre">' + optionsAnnees('', 'Année') + '</select>' +
        '<button type="button" class="btn btn-sm btn-outline-primary" id="btnAjouterFormationTexteLibre">Ajouter</button>' +
        '</div>' +
        '<button type="button" class="btn btn-sm btn-outline-secondary" id="btnParcourirFormations">📖 Parcourir la liste</button>' +
        '</div>';

      return sousNiveau + sousCertifications + sousFormationsCatalogue;
    }

    // TACHE (retour utilisateur : "Engagement associatif on va le
    // modifier en simplement Engagement... je veux que les gens
    // puissent voir c'est quoi précisément un engagement, c'est trop
    // flou") : bouton "Voir des exemples" ouvrant le même catalogue que
    // Mon Projet (CONFIG_ENGAGEMENTS), pour lever ce flou concrètement.
    function contenuBlocEngagement() {
      var d = infos.engagement;
      var dejaLa = pillsAvecCroix('engagements', function (e) { return (typeof e === 'string' ? e : e.texte); });
      return dejaLa +
        '<div class="d-flex gap-2 flex-wrap mb-2">' +
        '<button type="button" class="btn btn-sm ' + (d.actif === true ? 'btn-primary' : 'btn-outline-secondary') + '" data-infocompl-oui="engagement">Oui</button>' +
        '<button type="button" class="btn btn-sm ' + (d.actif === false ? 'btn-primary' : 'btn-outline-secondary') + '" data-infocompl-non="engagement">Non</button>' +
        '<button type="button" class="btn btn-sm btn-outline-secondary" id="btnParcourirEngagements">📖 Voir des exemples</button>' +
        '</div>' +
        (d.actif
          ? '<div class="mt-2">' +
            '<input type="text" class="form-control form-control-sm mb-2" id="infoComplTexte_engagement" placeholder="Décrivez cet engagement" value="' + echapperAttribut(d.texte || '') + '">' +
            '<div class="d-flex gap-2 align-items-center flex-wrap">' +
            '<select class="form-select form-select-sm" style="width:auto;" id="infoComplDebut_engagement">' + optionsAnnees(d.dateDebut, 'Année de début') + '</select>' +
            '<span class="small text-muted">à</span>' +
            '<select class="form-select form-select-sm" style="width:auto;" id="infoComplFin_engagement">' + optionsAnnees(d.dateFin, 'Toujours en cours') + '</select>' +
            '</div></div>'
          : '');
    }

    // TACHE (retour utilisateur : "juste après les dates, un bouton pour
    // explorer les options dedans et en choisir une ou plusieurs, qui
    // seront envoyées à l'IA") : CONFIG_EXPERIENCES_PERSO (Mon Projet),
    // multi-sélection déjà native à ce mécanisme -- alimente à la fois
    // dossier.experiencesPerso ET l'IA (contexte), comme validé.
    function contenuBlocSavoirFairePerso() {
      var d = infos.savoirFairePerso;
      var dejaLa = pillsAvecCroix('experiencesPerso', function (e) { return e.intitule; });
      return dejaLa +
        '<div class="d-flex gap-2 mb-2">' +
        '<button type="button" class="btn btn-sm ' + (d.actif === true ? 'btn-primary' : 'btn-outline-secondary') + '" data-infocompl-oui="savoirFairePerso">Oui</button>' +
        '<button type="button" class="btn btn-sm ' + (d.actif === false ? 'btn-primary' : 'btn-outline-secondary') + '" data-infocompl-non="savoirFairePerso">Non</button>' +
        '</div>' +
        (d.actif
          ? '<div class="mt-2">' +
            '<input type="text" class="form-control form-control-sm mb-2" id="infoComplTexte_savoirFairePerso" placeholder="Décrivez ce savoir-faire" value="' + echapperAttribut(d.texte || '') + '">' +
            '<div class="d-flex gap-2 align-items-center flex-wrap mb-2">' +
            '<select class="form-select form-select-sm" style="width:auto;" id="infoComplDebut_savoirFairePerso">' + optionsAnnees(d.dateDebut, 'Année de début') + '</select>' +
            '<span class="small text-muted">à</span>' +
            '<select class="form-select form-select-sm" style="width:auto;" id="infoComplFin_savoirFairePerso">' + optionsAnnees(d.dateFin, 'Toujours en cours') + '</select>' +
            '</div>' +
            '<button type="button" class="btn btn-sm btn-outline-secondary" id="btnExplorerSavoirFairePerso">📖 Explorer des exemples</button>' +
            '</div>'
          : '');
    }

    return {
      titre: '📋 Informations complémentaires',
      contenuHTML:
        '<p class="text-muted small mb-3">Ces informations n’ont pas forcément été évoquées dans votre récit — elles peuvent être précieuses pour votre CV, transmises telles quelles, jamais interprétées.</p>' +
        enveloppeBloc('mobilite', '🚗 Mobilité', contenuMobilite()) +
        enveloppeBloc('formation', '🎓 Formations, diplômes et certifications', contenuBlocFormation()) +
        enveloppeBloc('engagement', '🤝 Engagement', contenuBlocEngagement()) +
        enveloppeBloc('savoirFairePerso', '🌱 Savoir-faire personnel', contenuBlocSavoirFairePerso()),
      peutContinuer: true,
      onAfficher: function () {
        // Réouverture d'un bloc déjà validé.
        document.querySelectorAll('[data-rouvrir-bloc]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            infos[this.dataset.rouvrirBloc].valide = false;
            afficherEtape(8);
          });
        });

        // TACHE (retour utilisateur : "une petite croix pour l'enlever
        // si la personne le souhaite") : retire l'élément DIRECTEMENT du
        // dossier (certifications/formations/engagements/experiencesPerso),
        // par son index -- jamais besoin de rouvrir la fenêtre catalogue
        // pour corriger un choix.
        document.querySelectorAll('[data-retirer-infocompl]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var cle = this.dataset.retirerInfocompl;
            var idx = parseInt(this.dataset.indexInfocompl, 10);
            if (dossier[cle] && dossier[cle][idx] !== undefined) { dossier[cle].splice(idx, 1); }
            afficherEtape(8);
          });
        });

        // TACHE (retour utilisateur : "un bouton valider pour chaque
        // partie, sans condition -- rien saisi = non") : seul déclencheur
        // de validation désormais pour les blocs à champs (formation,
        // engagement, savoirFairePerso) -- un clic sur "Oui" ne valide
        // plus jamais tout seul (c'était le bug signalé pour Mobilité :
        // "dès que je clique sur oui, le bloc se valide avant même de
        // choisir la catégorie").
        document.querySelectorAll('[data-valider-bloc]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            infos[this.dataset.validerBloc].valide = true;
            afficherEtape(8);
          });
        });

        // TACHE (retour utilisateur, bug réel corrigé : "pour mobilité,
        // dès que je clique sur oui, le bloc se valide avant même de
        // choisir la catégorie ou le moyen de transport -- ce bloc doit
        // être validé seulement si j'ai le permis ET le moyen de
        // transport") : "Oui" ne valide plus tout seul -- seul le
        // bouton "Valider" (ci-dessus) ou "Non" (réponse complète en
        // elle-même, rien de plus à préciser) referment ce bloc.
        var boutonPermisOui = document.getElementById('permisOui');
        var boutonPermisNon = document.getElementById('permisNon');
        if (boutonPermisOui) { boutonPermisOui.addEventListener('click', function () { dossier.permis.possede = true; afficherEtape(8); }); }
        if (boutonPermisNon) {
          boutonPermisNon.addEventListener('click', function () {
            dossier.permis.possede = false; dossier.permis.categories = []; dossier.permis.vehicule = null;
            infos.mobilite.valide = true;
            afficherEtape(8);
          });
        }
        document.querySelectorAll('[data-permis]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var cat = this.dataset.permis;
            var idx = dossier.permis.categories.indexOf(cat);
            if (idx === -1) { dossier.permis.categories.push(cat); } else { dossier.permis.categories.splice(idx, 1); }
            afficherEtape(8);
          });
        });
        var boutonVehiculeOui = document.getElementById('vehiculeOui');
        var boutonVehiculeNon = document.getElementById('vehiculeNon');
        if (boutonVehiculeOui) { boutonVehiculeOui.addEventListener('click', function () { dossier.permis.vehicule = true; afficherEtape(8); }); }
        if (boutonVehiculeNon) { boutonVehiculeNon.addEventListener('click', function () { dossier.permis.vehicule = false; afficherEtape(8); }); }

        // Oui/Non génériques (formation-niveau, engagement, savoirFairePerso)
        // -- "Non" reste une réponse complète, validée immédiatement ;
        // "Oui" déplie les champs SANS valider (voir bouton "Valider"
        // ci-dessus, ou Entrée dans le champ texte, seuls déclencheurs
        // désormais).
        ['formation', 'engagement', 'savoirFairePerso'].forEach(function (cle) {
          var btnOui = document.querySelector('[data-infocompl-oui="' + cle + '"]');
          var btnNon = document.querySelector('[data-infocompl-non="' + cle + '"]');
          if (btnOui) { btnOui.addEventListener('click', function () { infos[cle].actif = true; afficherEtape(8); }); }
          if (btnNon) { btnNon.addEventListener('click', function () { infos[cle].actif = false; infos[cle].valide = true; afficherEtape(8); }); }
          var champTexte = document.getElementById('infoComplTexte_' + cle);
          var champDebut = document.getElementById('infoComplDebut_' + cle);
          var champFin = document.getElementById('infoComplFin_' + cle);
          cablerMajusculeAuto(champTexte);
          if (champTexte) {
            champTexte.addEventListener('input', function () { infos[cle].texte = this.value; });
            champTexte.addEventListener('keydown', function (e) {
              if (e.key !== 'Enter') { return; }
              e.preventDefault();
              infos[cle].valide = true;
              afficherEtape(8);
            });
          }
          if (champDebut) { champDebut.addEventListener('change', function () { infos[cle].dateDebut = this.value; }); }
          if (champFin) { champFin.addEventListener('change', function () { infos[cle].dateFin = this.value; }); }
        });
        document.querySelectorAll('[data-niveau-infocompl]').forEach(function (pastille) {
          pastille.addEventListener('click', function () {
            var cle = this.dataset.cleInfocompl;
            var niveauClique = this.dataset.niveauInfocompl;
            infos[cle].niveau = (infos[cle].niveau === niveauClique) ? '' : niveauClique;
            afficherEtape(8);
          });
        });

        // Certifications -- texte libre + parcourir le catalogue Mon Projet.
        var champTexteCertif = document.getElementById('infoComplTexteCertif');
        cablerMajusculeAuto(champTexteCertif);
        var btnAjouterCertif = document.getElementById('btnAjouterCertifTexteLibre');
        if (btnAjouterCertif) {
          btnAjouterCertif.addEventListener('click', function () {
            var texte = (champTexteCertif.value || '').trim();
            if (!texte) { return; }
            var annee = document.getElementById('infoComplAnneeCertif').value;
            dossier.certifications = dossier.certifications || [];
            if (dossier.certifications.indexOf(texte) === -1) { dossier.certifications.push(texte); }
            if (annee) {
              dossier.detailsCatalogue = dossier.detailsCatalogue || {};
              dossier.detailsCatalogue.certifications = dossier.detailsCatalogue.certifications || {};
              dossier.detailsCatalogue.certifications[texte] = { dateDebut: annee, dateFin: '' };
            }
            afficherEtape(8);
          });
        }
        var btnParcourirCertifications = document.getElementById('btnParcourirCertifications');
        if (btnParcourirCertifications) {
          btnParcourirCertifications.addEventListener('click', function () {
            ouvrirFenetreCatalogue(CONFIG_CERTIFICATIONS, function (choisis) {
              ajouterAuCatalogue(CONFIG_CERTIFICATIONS, choisis);
              afficherEtape(8);
            });
          });
        }

        // Formations -- texte libre + parcourir CATALOGUE_FORMATIONS_COURANTES.
        // TACHE : jamais ajouterAuCatalogue() générique ici -- son schéma
        // ({intitule, dateDebut, dateFin}) ne correspond pas à celui
        // attendu par dossier.formations ({niveau, intitule, annee}) --
        // transformation manuelle, ciblée, jamais un plantage silencieux
        // ni un champ "annee" qui resterait vide par erreur.
        var champTexteFormationLibre = document.getElementById('infoComplTexteFormationLibre');
        cablerMajusculeAuto(champTexteFormationLibre);
        var btnAjouterFormationLibre = document.getElementById('btnAjouterFormationTexteLibre');
        if (btnAjouterFormationLibre) {
          btnAjouterFormationLibre.addEventListener('click', function () {
            var texte = (champTexteFormationLibre.value || '').trim();
            if (!texte) { return; }
            var annee = document.getElementById('infoComplAnneeFormationLibre').value;
            dossier.formations = dossier.formations || [];
            if (!dossier.formations.some(function (f) { return f.intitule === texte; })) {
              dossier.formations.push({ niveau: '', intitule: texte, annee: annee || '' });
            }
            afficherEtape(8);
          });
        }
        var btnParcourirFormations = document.getElementById('btnParcourirFormations');
        if (btnParcourirFormations) {
          btnParcourirFormations.addEventListener('click', function () {
            ouvrirFenetreCatalogue({
              cle: 'formations', titre: '🎓 Formations', catalogue: CATALOGUE_FORMATIONS_COURANTES,
              avecDates: true, champValeur: 'intitule'
            }, function (choisis) {
              dossier.formations = dossier.formations || [];
              choisis.forEach(function (entree) {
                var valeur = entree.valeur;
                var anneeChoisie = entree.dateDebut ? (entree.dateDebut + (entree.dateFin ? ' - ' + entree.dateFin : '')) : (entree.dateFin || '');
                if (!dossier.formations.some(function (f) { return f.intitule === valeur; })) {
                  dossier.formations.push({ niveau: '', intitule: valeur, annee: anneeChoisie });
                }
              });
              afficherEtape(8);
            });
          });
        }

        // Engagement -- parcourir des exemples (catalogue Mon Projet).
        var btnParcourirEngagements = document.getElementById('btnParcourirEngagements');
        if (btnParcourirEngagements) {
          btnParcourirEngagements.addEventListener('click', function () {
            ouvrirFenetreCatalogue(CONFIG_ENGAGEMENTS, function (choisis) {
              ajouterAuCatalogue(CONFIG_ENGAGEMENTS, choisis);
              infos.engagement.valide = true;
              afficherEtape(8);
            });
          });
        }

        // Savoir-faire personnel -- explorer des exemples (multi-sélection).
        var btnExplorerSavoirFairePerso = document.getElementById('btnExplorerSavoirFairePerso');
        if (btnExplorerSavoirFairePerso) {
          btnExplorerSavoirFairePerso.addEventListener('click', function () {
            ouvrirFenetreCatalogue(CONFIG_EXPERIENCES_PERSO, function (choisis) {
              ajouterAuCatalogue(CONFIG_EXPERIENCES_PERSO, choisis);
              infos.savoirFairePerso.valide = true;
              afficherEtape(8);
            });
          });
        }
      },
      onContinuer: function () {
        // TACHE : transmission finale -- structurée vers le bon champ du
        // dossier (jamais perdue), ET un résumé lisible vers l'IA (même
        // canal que le reste, informationsNonClassees). Fonctionne que
        // le bloc ait été explicitement "validé" (Entrée) ou non -- la
        // donnée tapée est toujours prise en compte au clic sur
        // "Continuer" pour l'ensemble de la page.
        dossier.informationsNonClassees = dossier.informationsNonClassees || [];
        if (infos.formation.actif && infos.formation.texte.trim()) {
          var texteFormationCompl = infos.formation.texte.trim();
          var anneeFormationCompl = infos.formation.dateDebut
            ? (infos.formation.dateDebut + (infos.formation.dateFin ? ' - ' + infos.formation.dateFin : ''))
            : (infos.formation.dateFin || '');
          // TACHE (retour utilisateur : bug déjà trouvé et corrigé une
          // fois -- "Sans diplôme" ferait disparaître toute la ligne,
          // même avec un intitulé réel) : jamais transmis comme niveau
          // ici non plus, même principe.
          var niveauFormationCompl = (infos.formation.niveau && infos.formation.niveau !== 'Sans diplôme') ? infos.formation.niveau : '';
          dossier.formations = dossier.formations || [];
          dossier.formations.push({ niveau: niveauFormationCompl, intitule: texteFormationCompl, annee: anneeFormationCompl });
          dossier.informationsNonClassees.push('Formation suivie — ' + texteFormationCompl);
        }
        if (infos.engagement.actif && infos.engagement.texte.trim()) {
          var texteEngagementCompl = infos.engagement.texte.trim();
          dossier.engagements = dossier.engagements || [];
          dossier.engagements.push({ texte: texteEngagementCompl, dateDebut: infos.engagement.dateDebut || '', dateFin: infos.engagement.dateFin || '' });
          dossier.informationsNonClassees.push('Engagement — ' + texteEngagementCompl);
        }
        if (infos.savoirFairePerso.actif && infos.savoirFairePerso.texte.trim()) {
          var texteSavoirFaireCompl = infos.savoirFairePerso.texte.trim();
          dossier.experiencesPerso = dossier.experiencesPerso || [];
          dossier.experiencesPerso.push({ intitule: texteSavoirFaireCompl, detail: '', dateDebut: infos.savoirFairePerso.dateDebut || '', dateFin: infos.savoirFairePerso.dateFin || '' });
          dossier.informationsNonClassees.push('Savoir-faire personnel — ' + texteSavoirFaireCompl);
        }
        calculerStrategieSiBesoin();
        finaliserEtNaviguerVersResultats();
      }
    };
  }

  // ------------------------------------------------------------
  // TACHE (retour utilisateur : "je vais l'enlever [l'écran 'Votre
  // stratégie'] parce qu'elle est déjà présente lorsque je fais mon CV...
  // je n'ai pas besoin de cette fenêtre") : l'ancienne étape 8
  // ("Votre stratégie", titre, pistes de métier, choix chronologique/
  // mixte/par compétences) ne s'affiche plus jamais -- seul son calcul
  // de fond est conservé (calculerStrategieSiBesoin ci-dessous, appelé
  // depuis l'étape 7 désormais), sa navigation/finalisation aussi
  // (finaliserEtNaviguerVersResultats). Les pistes de métier qu'elle
  // affichait (repliées, cachées par défaut) ne sont plus montrées nulle
  // part -- décision explicite, la personne est là pour se valoriser,
  // pas pour chercher un métier à ce stade du parcours.
  // ------------------------------------------------------------
  function calculerStrategieSiBesoin() {
    if (etat.strategie) { return; }
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

  function finaliserEtNaviguerVersResultats() {
    var fragmentsValides = etat.etatsFragments.filter(fragmentEstValide);

    // TACHE (chantier "exp perso", Phase 3 : construire réellement
    // infosComplementairesParFragment, plus jamais {} en dur) : pour
    // chaque question de type "date" avec une réponse renseignée
    // (Phase 2), retrouve le fragment concerné via fragmentIndex ->
    // indexOriginal (transporté depuis decouverteAnalyse.js par
    // initialiserEtatFragment(), voir decouverteRaffinement.js), puis
    // utilise SON fragmentId réel comme clé -- exactement la forme
    // attendue par mapperFragmentsVersDossier() (decouverteMapping.js).
    // Si le fragment référencé n'a en fait jamais été validé par la
    // personne (jamais retenu dans fragmentsValides), l'information est
    // silencieusement ignorée -- rien à raccrocher à un fragment qui
    // n'existe plus dans le résultat final, jamais une exception.
    var infosComplementairesParFragment = {};
    etat.questionsCiblees.forEach(function (question, i) {
      if (question.type !== 'date' || question.fragmentIndex === null) { return; }
      var reponseDate = etat.reponsesQuestionsCiblees[i];
      if (!reponseDate || typeof reponseDate !== 'object' || (!reponseDate.dateDebut && !reponseDate.dateFin)) { return; }
      var fragmentCorrespondant = fragmentsValides.filter(function (ef) { return ef.indexOriginal === question.fragmentIndex; })[0];
      if (!fragmentCorrespondant) { return; }
      infosComplementairesParFragment[fragmentCorrespondant.fragmentId] = {
        dateDebut: reponseDate.dateDebut || '',
        dateFin: reponseDate.dateFin || ''
      };
    });

    var resultatMapping = executerMapping(fragmentsValides, infosComplementairesParFragment);
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
    // TACHE (chantier "exp perso", Phase 1) : question est désormais un
    // objet {texte, fragmentIndex, type} -- question.texte remplace la
    // concaténation directe (qui aurait produit "[object Object]").
    // TACHE (chantier "exp perso", Phase 3) : une réponse de type "date"
    // a désormais sa vraie place structurée (infosComplementairesParFragment,
    // ci-dessus) -- ne rejoint plus informationsNonClassees.
    // TACHE (retour utilisateur : "j'ai répondu oui à la question
    // formation/engagements... mais ces informations ne remontent pas,
    // rien n'apparaît sur le CV") : bug réel trouvé -- une réponse
    // "oui, formation de 4-5 jours" ne rejoignait QUE le contexte pour
    // l'IA (informationsNonClassees), jamais dossier.formations lui-même
    // -- la rubrique Formation restait donc vide même après une réponse
    // positive. Même chose pour "je suis investi dans une association" :
    // jamais ajouté à dossier.engagements. Corrigé ici : les réponses de
    // type "formation"/"engagement" sont désormais ajoutées TELLES
    // QUELLES (les mots de la personne, jamais reformulés ni interprétés
    // -- même principe que pour les dates, aucune invention) dans le
    // bon champ structuré, et ne rejoignent donc plus
    // informationsNonClassees (déjà leur vraie place, inutile de
    // dupliquer -- même raisonnement que pour les dates ci-dessus).
    // Seules les réponses de type "texte" (questions plus générales)
    // continuent d'alimenter ce canal, comme avant.
    // TACHE (retour utilisateur : "pour la formation... indiquer
    // l'année, même format que les questions sur la durée du métier --
    // pareil pour l'associatif/bénévole") : la réponse à ces 2 types
    // est désormais un objet {texte, dateDebut, dateFin} (voir
    // etapeQuestionsCiblees ci-dessus), plus une simple chaîne. Pour
    // Formation, dont le schéma (dossier.formations) ne porte qu'un seul
    // champ "annee" (jamais une plage dateDebut/dateFin -- changer ce
    // schéma toucherait bien trop d'endroits, même risque que
    // Certifications/Loisirs) : la période est formatée en une chaîne
    // ("2019 - 2021" ou juste "2021") stockée directement dans ce champ
    // existant, sans avoir besoin d'étendre son schéma. Pour Engagement,
    // dont le schéma supporte déjà dateDebut/dateFin (chantier "exp
    // perso", Phase 4), les deux valeurs sont utilisées telles quelles.
    etat.questionsCiblees.forEach(function (question, i) {
      if (question.type === 'date') { return; }
      var reponseBrute = etat.reponsesQuestionsCiblees[i];
      if (question.type === 'formation') {
        var texteFormation = ((reponseBrute && reponseBrute.texte) || '').trim();
        if (!texteFormation) { return; }
        var anneeFormation = reponseBrute.dateDebut
          ? (reponseBrute.dateDebut + (reponseBrute.dateFin ? ' - ' + reponseBrute.dateFin : ''))
          : (reponseBrute.dateFin || '');
        dossier.formations = dossier.formations || [];
        // TACHE (retour utilisateur : "aucune trace dans le CV" -- bug
        // réel trouvé : normaliserDonneesCV.js filtre TOUTE la ligne
        // Formation dès que niveau === "Sans diplôme", même quand
        // l'intitulé contient une vraie information. Cette règle
        // préexistante avait du sens pour une réponse "Sans diplôme"
        // vide de contenu (un simple constat), mais pas ici : la
        // personne peut très bien avoir suivi une formation courte tout
        // en n'ayant "pas de diplôme" à proprement parler -- l'intitulé
        // reste précieux, jamais à perdre pour cette seule raison.
        // "Sans diplôme" n'est donc jamais transmis comme niveau pour
        // cette question précise (repli sur chaîne vide) -- l'intitulé
        // survit toujours, quel que soit le niveau choisi ou non choisi.
        var niveauFormationQ = (reponseBrute.niveau && reponseBrute.niveau !== 'Sans diplôme') ? reponseBrute.niveau : '';
        dossier.formations.push({ niveau: niveauFormationQ, intitule: texteFormation, annee: anneeFormation });
        return;
      }
      if (question.type === 'engagement') {
        var texteEngagementQ = ((reponseBrute && reponseBrute.texte) || '').trim();
        if (!texteEngagementQ) { return; }
        dossier.engagements = dossier.engagements || [];
        dossier.engagements.push({
          texte: texteEngagementQ,
          dateDebut: (reponseBrute && reponseBrute.dateDebut) || '',
          dateFin: (reponseBrute && reponseBrute.dateFin) || ''
        });
        return;
      }
      var reponse = (typeof reponseBrute === 'string' ? reponseBrute : '').trim();
      if (!reponse) { return; }
      dossier.informationsNonClassees.push(question.texte + ' — Réponse : ' + reponse);
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
    // TACHE (retour utilisateur : "ce message ne passe pas sur tous les
    // IA" -- bug réel et sérieux trouvé : etat.recit (le texte ORIGINAL
    // de la personne, jamais filtré) partait ici mot pour mot, avec tout
    // contexte personnel sensible potentiellement présent (détention,
    // maladie...) -- alors que ce même contexte est déjà correctement
    // retiré côté fragments individuels (decouverte-competences.md).
    // Utilise désormais etat.reciteNettoye (même contenu utile, contexte
    // sensible retiré par l'IA sur l'ENSEMBLE du récit, pas seulement
    // fragment par fragment) -- jamais etat.recit original. Si
    // reciteNettoye est vide (réponse IA antérieure à ce chantier, ou
    // champ manquant), on ne transmet RIEN plutôt que de retomber sur le
    // texte brut non filtré : mieux vaut perdre la nuance que risquer de
    // relaisser passer un contexte personnel sensible.
    if (etat.reciteNettoye && etat.reciteNettoye.trim()) {
      dossier.informationsNonClassees.push('Récit complet raconté par la personne, pour context et nuances au-delà des éléments déjà extraits ci-dessus : ' + etat.reciteNettoye.trim());
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

  function obtenirDefinitionEtape(numero) {
    if (numero === 1) { return etapeAccueil(); }
    if (numero === 2) { return etapeIdentite(); }
    if (numero === 3) { return etapeRecit(); }
    if (numero === 4) { return etapeChoixAssistant(); }
    if (numero === 5) { return etapeCollerReponse(); }
    if (numero === 6) { return etapeDecouverte(); }
    if (numero === 7) { return etapeQuestionsCiblees(); }
    return etapeMobilite();
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
