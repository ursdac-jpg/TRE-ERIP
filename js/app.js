/* ============================================================
   app.js — Interface de l'Assistant Parcours Professionnel
   ------------------------------------------------------------
   Depend de data/metiers.js (charge AVANT ce fichier).
   Contient : etat, referentiels d'affichage, navigation
   cliquable, les pages, les blocs langues et mobilite, la
   page profil avec bouton Copier (prompt IA cache).
   ============================================================ */

var app = document.getElementById('app');

/* ------------------------------------------------------------
   1. ETAT
   ------------------------------------------------------------ */
// TACHE (V2 IA, etape 1 : lien assistant IA -> moteur de rendu) : structure
// par defaut de dossier.ia, conforme a docs/ARCHITECTURE_V2_IA.md. Une seule
// fonction usine, utilisee partout ou dossier est (re)initialise, pour ne
// jamais dupliquer cette structure a plusieurs endroits.
//
// IMPORTANT (respect strict de l'architecture validee) :
// - dossier.ia est TOUJOURS optionnel : sa presence ou son absence ne doit
//   jamais empecher le reste de l'application de fonctionner.
// - Cette premiere etape ne remplit QUE la partie redactionnelle (profil,
//   pointsForts, motsCles). La partie "recommandations" est deja presente
//   dans la structure (conformement au schema documente), mais reste a ses
//   valeurs neutres : la logique de selection/priorisation (§6 du document
//   d'architecture) est volontairement HORS PERIMETRE de cette tache.
function creerDossierIAVide() {
  return {
    cv: {
      profil: '',
      pointsForts: [],
      motsCles: [],
      recommandations: {
        typeCV: { valeur: null, justification: '' },
        experiencesAMettreEnAvant: { valeur: null, justification: '' },
        competencesAValoriser: { valeur: null, justification: '' },
        rubriquesMasquables: { valeur: null, justification: '' }
      }
    },
    lettre: {},
    entretien: {}
  };
}

var dossier = {
  modeCreation: null,
  objectif: null,
  activites: [],
  actions: [],
  environnement: [],
  valeurs: [],
  metiersAjoutes: [],
  metiersExclus: [], // TACHE (refonte Potentiel, Etape B) : metiers recommandes retires par la personne (session en cours)
  metierCible: null,     // metier vise choisi sur la page Revelation (pastille bleue)
  // TACHE (refonte Metier(s) cible(s)) : liste des metiers candidats
  // (plafond 5), alimentee par tous les clics "metier" de la page Potentiel.
  // Un seul candidat = automatiquement "Ce metier". Plusieurs candidats =
  // choix explicite requis entre metierCible (un seul) et secteurCible.
  metiersCandidats: [],
  modeMetierCible: null, // 'metier' | 'secteur' | null (pas encore choisi)
  secteurCible: null,    // secteur ou "Interim" ou texte libre, si modeMetierCible === 'secteur'
  typeCV: 'general',     // Complement tache 8 : 'general' ou 'specifique'
  // TACHE 43 : identite du candidat. email/telephone peuvent etre pre-remplis
  // automatiquement (extraction fiable) ; nom/prenom/adresse jamais devines.
  identite: { civilite: null, nom: '', prenom: '', adresse: '', telephone: '', email: '', ville: '', age: '' },
  anonymiser: true,      // option de confidentialite pour CV/Lettre (l'entretien est toujours anonymise, sans option)
  entretienDirect: { structure: '', poste: '' },  // TACHE 36 : parcours autonome "Preparer un entretien"
  rechercheEntreprise: { structure: '' },  // TACHE (recherche assistant) : entreprise saisie depuis le parcours guide
  catalogueActif: {},    // Etape 3 : suivi Oui/Non par catalogue (cle = nom du champ, ex. 'loisirs')
  experiences: [],
  experiencesPerso: [],  // benevolat, entraide familiale, foyer... (valorisation)
  niveauFormation: null, // TACHE (refonte Formations et diplomes) : { niveauRNCP, niveauVisible, intitule }, une seule valeur
  formations: [],
  loisirs: [],
  engagements: [],       // Etape 5 : catalogue engagements (tableau de chaines)
  certifications: [],    // Etape 8 : referentiel certifications (tableau de chaines)
  langues: [],           // { langue, niveau }
  permis: { possede: null, categories: [], vehicule: null },
  contrat: [],           // CDD, CDI, Remplacements, Interim
  tempsTravail: [],       // Temps plein, Temps partiel
  accepte: [],            // alimentaire, saisonnier (J'accepte egalement)
  accepteAucune: false,   // TACHE (complement) : "Aucune de ces propositions", exclusif des 2 ci-dessus, absent du resume
  offre: { lien: '', poste: '', structure: '', type: '', dispo: [] },   // objectif "offre" (dispo = choix multiple)
  spontanee: { lien: '', poste: '', structure: '', type: '', dispo: [] },    // objectif "spontanee"
  reconversion: { lien: '', poste: '', structure: '', type: '', dispo: [] }, // objectif "reconversion"
  stage: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [] },       // objectif "stage"
  alternance: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [] },  // objectif "alternance"
  immersion: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [] }, // objectif "pmsmp" (immersion)
  miseEnAvant: { mobilite: false, proximite: false }, // mises en avant lettre/entretien
  lettreMotivation: { texte: '' }, // TÂCHE 8 : lettre redigee/importee par l'utilisateur
  // TACHE (demande : export Canva base sur la reponse amelioree de l'IA) :
  // texte colle par la personne apres avoir recupere la reponse de
  // l'assistant IA (CV ameliore/redige). Si rempli, utilise en priorite pour
  // le CSV Canva ; sinon, le CSV se base sur les informations du dossier.
  texteAmelioreCanva: '',
  // TACHE (V2 IA, etape 1) : espace dedie aux contenus produits par
  // l'assistant IA, conforme a docs/ARCHITECTURE_V2_IA.md. Voir
  // creerDossierIAVide() ci-dessus pour le detail de la structure.
  ia: creerDossierIAVide(),
  // TACHE (demande : metiers hors repertoire) : jusqu'a 3 intitules saisis
  // librement par la personne, quand son metier n'existe pas dans notre
  // referentiel. Distincts de metiersCandidats (ne comptent PAS dans la
  // limite de 5) -- pas de fiche ROME ni de competences associees, puisque
  // ce ne sont pas des metiers de notre base de connaissances.
  metiersHorsRepertoire: []
  // champs remplis par l'analyse CV (voir metiers.js) :
  // competencesCV, savoirsCV, cvAnalyse
};

// Complement tache 8 (bouton "Personnaliser ma candidature") : blocs de l'ecran
// Revelation a mettre en evidence (contour rouge) tant qu'ils ne sont pas
// suffisamment renseignes. Uniquement en memoire (pas sauvegarde, pas persistant).
// Mecanisme unique, reutilise pour les 4 blocs (candidature, mobilite, formation, metier).
var blocsAMettreEnEvidence = { candidature: false, mobilite: false, formation: false, metier: false };
function doitMettreEnEvidence(cle) { return !!blocsAMettreEnEvidence[cle]; }
// Retire la mise en evidence d'un bloc des que l'utilisateur clique dedans ou y saisit
// quelque chose ; chaque bloc redevient normal independamment des autres.
function wireEvidence(cle, elementId) {
  if (!blocsAMettreEnEvidence[cle]) { return; }
  var el = document.getElementById(elementId);
  if (!el) { return; }
  var retirer = function () {
    blocsAMettreEnEvidence[cle] = false;
    el.classList.remove('a-completer');
  };
  el.addEventListener('click', retirer, { once: true });
  el.addEventListener('input', retirer, { once: true });
}

// Historique des pages visitees, pour la progression cliquable
var historiquePages = ['cv'];
var pageActuelle = 'cv';   // etape en cours, pour pouvoir restaurer la bonne page

/* ------------------------------------------------------------
   2. REFERENTIELS D'AFFICHAGE
   ------------------------------------------------------------ */
// TACHE 22C : l'ancienne constante "dataActivites" a ete supprimee (plus aucun
// appelant depuis le passage de pageActivites() au nouveau referentiel
// CATALOGUE_PERSONNES_MATERIELS_LIEUX, TACHE 22A). Verifie : aucune autre
// reference dans le fichier avant suppression.
var dataActions = [
  { id: 'organiser', label: 'Organiser', icon: '📋' },
  { id: 'reparer', label: 'Reparer', icon: '🔧' },
  { id: 'conseiller', label: 'Conseiller', icon: '💬' },
  { id: 'vendre', label: 'Vendre', icon: '💰' },
  { id: 'transporter', label: 'Transporter', icon: '🚚' },
  { id: 'nettoyer', label: 'Nettoyer', icon: '🧹' },
  { id: 'former', label: 'Former', icon: '🎓' },
  { id: 'soigner', label: 'Soigner', icon: '🩺' },
  { id: 'cuisiner', label: 'Cuisiner', icon: '🍳' },
  { id: 'construire', label: 'Construire', icon: '🏗️' },
  { id: 'analyser', label: 'Analyser', icon: '📊' },
  { id: 'creer', label: 'Creer', icon: '🎨' }
];

// TACHE 23C : l'ancienne constante "dataEnvironnement" a ete supprimee (plus
// aucun appelant depuis le passage de pageEnvironnement() au nouveau
// referentiel CATALOGUE_ENVIRONNEMENTS_TRAVAIL, TACHE 23A).
// TACHE 24C : l'ancienne constante "dataValeurs" a ete supprimee (plus aucun
// appelant depuis le passage de pageValeurs() au nouveau referentiel
// CATALOGUE_VALEURS_PROFESSIONNELLES, TACHE 24A ; texteProfil() migree
// egalement, TACHE 24C).

// Langues proposees + niveaux (cadre europeen CECRL)
var LANGUES_COURANTES = ['Anglais', 'Espagnol', 'Allemand', 'Russe', 'Arabe'];
var NIVEAUX_LANGUE = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
var CATEGORIES_PERMIS = ['A', 'B', 'C', 'D', 'E'];
// Etape 7 : classification RNCP actuelle (remplace les anciennes classifications V/IV/III...)
// TACHE (refonte Formations et diplomes) : remplace NIVEAUX_RNCP (libelles
// techniques "Niveau 3"..."Niveau 8") par une table fermee correspondance
// niveau simple <-> RNCP <-> placeholder. L'utilisateur ne choisit jamais le
// chiffre RNCP directement : il est toujours derive automatiquement, ce qui
// rend impossible une incoherence (ex. "CAP" associe au niveau 8).
var NIVEAUX_DIPLOME_SIMPLES = [
  { id: 'cap', label: 'CAP / BEP', rncp: 3, placeholder: 'CAP Cuisine, BEP Vente...' },
  { id: 'bac', label: 'Bac', rncp: 4, placeholder: 'Bac général, Bac pro Commerce, Bac techno STMG...' },
  { id: 'bac2', label: 'Bac +2', rncp: 5, placeholder: 'BTS Commerce, DUT GEA, BTS Management...' },
  { id: 'bac34', label: 'Bac +3 / Bac +4', rncp: 6, placeholder: 'Licence Droit, Bachelor RH...' },
  { id: 'bac5', label: 'Bac +5', rncp: 7, placeholder: 'Master Marketing, Diplôme d\'ingénieur...' },
  { id: 'doctorat', label: 'Doctorat', rncp: 8, placeholder: 'Doctorat en Biologie, Thèse en Économie...' }
];

// famille/amis herite des memes competences que le travail en equipe
var mappingCompetences = {
  // TACHE 22C : les cles exclusivement utilisees par l'ancienne dataActivites
  // (clients, collegues, enfants, personnes_agees, machines, ordinateur,
  // documents, marchandises, vehicules, outils, deplacement, seul) ont ete
  // retirees : dataActivites est supprimee et ces informations proviennent
  // desormais de CATALOGUE_PERSONNES_MATERIELS_LIEUX (TACHE 22B).
  // TACHE 23C : 'bureau', 'magasin' et 'famille' ont egalement ete retirees
  // (elles n'etaient plus utilisees que par l'ancienne dataEnvironnement,
  // desormais supprimee). 'exterieur' est CONSERVEE : encore utilisee par
  // CATALOGUE_PERSONNES_MATERIELS_LIEUX, CATALOGUE_ENVIRONNEMENTS_TRAVAIL
  // et CATALOGUE_VALEURS_PROFESSIONNELLES, avec les MEMES valeurs (aucun
  // doublon fonctionnel, juste une contribution partagee).
  'exterieur': ['Adaptabilite', 'Endurance', 'Securite'],
  'organiser': ['Planification', 'Gestion de projet', 'Coordination'],
  'reparer': ['Diagnostic', 'Reparation', 'Maintenance'],
  'conseiller': ['Conseil', 'Communication', 'Pedagogie'],
  'vendre': ['Negociation', 'Persuasion', 'Relation client'],
  'transporter': ['Logistique', 'Conduite', 'Respect des delais'],
  'nettoyer': ['Hygiene', 'Entretien', 'Rigueur'],
  'former': ['Formation', 'Pedagogie', 'Transmission'],
  'soigner': ['Soins', 'Precision', 'Empathie'],
  'cuisiner': ['Cuisine', 'Creativite', 'Respect des normes'],
  'construire': ['Batiment', 'Lecture de plans', 'Travail manuel'],
  'analyser': ['Analyse de donnees', 'Raisonnement logique', 'Redaction'],
  'creer': ['Creativite', 'Innovation', 'Expression artistique'],
  // TACHE 24C : 'stabilite', 'contact_humain', 'evolution', 'autonomie',
  // 'responsabilites' et 'proximite' ont ete retirees ci-dessous : le nouveau
  // referentiel CATALOGUE_VALEURS_PROFESSIONNELLES fournit exactement les
  // memes savoir-etre pour ces valeurs (verifie terme a terme, aucune perte).
  // 'salaire', 'horaires_fixes' et 'teletravail' sont en revanche CONSERVEES :
  // elles contenaient chacune un savoir-faire ('Gestion financiere',
  // 'Planification', 'Bureautique') que le nouveau referentiel ne reprend pas
  // (il ne decrit que des savoir-etre pour les valeurs professionnelles,
  // par choix de structure de la TACHE 24B) — les retirer aurait fait perdre
  // cette information.
  'salaire': ['Rigueur', 'Gestion financiere'],
  'horaires_fixes': ['Organisation', 'Planification'],
  'teletravail': ['Autonomie', 'Organisation', 'Bureautique']
};

var categorieCompetence = {
  'Relation client': 'Savoir-etre', 'Communication': 'Savoir-etre', 'Ecoute': 'Savoir-etre',
  'Technique': 'Savoir-faire', 'Maintenance': 'Savoir-faire', 'Precision': 'Savoir-faire',
  'Pedagogie': 'Savoir-etre', 'Patience': 'Savoir-etre', 'Bienveillance': 'Savoir-etre',
  'Empathie': 'Savoir-etre', 'Aide a la personne': 'Savoir-etre', 'Travail en equipe': 'Savoir-etre',
  'Coordination': 'Savoir-etre', 'Entraide': 'Savoir-etre', 'Autonomie': 'Savoir-etre',
  'Organisation': 'Savoir-etre', 'Responsabilite': 'Savoir-etre', 'Adaptabilite': 'Savoir-etre',
  'Endurance': 'Savoir-etre', 'Securite': 'Savoir-etre', 'Merchandising': 'Savoir-faire',
  'Accueil': 'Savoir-etre', 'Gestion des stocks': 'Savoir-faire', 'Bureautique': 'Savoir-faire',
  'Gestion administrative': 'Savoir-faire', 'Gestion du temps': 'Savoir-etre', 'Planification': 'Savoir-faire',
  'Diagnostic': 'Savoir-faire', 'Reparation': 'Savoir-faire', 'Conseil': 'Savoir-faire',
  'Negociation': 'Savoir-faire', 'Persuasion': 'Savoir-faire', 'Logistique': 'Savoir-faire',
  'Conduite': 'Savoir-faire', 'Respect des delais': 'Savoir-etre', 'Hygiene': 'Savoir-faire',
  'Entretien': 'Savoir-faire', 'Rigueur': 'Savoir-etre', 'Formation': 'Savoir-faire',
  'Transmission': 'Savoir-faire', 'Soins': 'Savoir-faire', 'Cuisine': 'Savoir-faire',
  'Creativite': 'Savoir-etre', 'Respect des normes': 'Savoir-etre', 'Batiment': 'Savoir-faire',
  'Lecture de plans': 'Savoir-faire', 'Travail manuel': 'Savoir-faire', 'Analyse de donnees': 'Savoir-faire',
  'Raisonnement logique': 'Savoir-faire', 'Redaction': 'Savoir-faire', 'Innovation': 'Savoir-faire',
  'Expression artistique': 'Savoir-faire', 'Motivation': 'Savoir-etre', 'Apprentissage': 'Savoir-etre',
  'Esprit d\'equipe': 'Savoir-etre', 'Sens du service': 'Savoir-etre', 'Gestion de projet': 'Savoir-faire',
  'Gestion financiere': 'Savoir-faire', 'Management': 'Savoir-faire', 'Leadership': 'Savoir-etre',
  'Stabilite': 'Savoir-etre', 'Fiabilite': 'Savoir-etre',
  // Etape 3 : nouveaux termes introduits par les exemples d'enrichissement loisirs
  'Perseverance': 'Savoir-etre', 'Respect des regles': 'Savoir-etre', 'Sens du detail': 'Savoir-faire'
};

// TACHE 33A : complete la reference manquante dans BASE_CONNAISSANCES_ERIP
// (categorieCompetence n'existait pas encore lorsque data/baseConnaissancesERIP.js
// s'est charge). Toujours une reference, pas une copie.
BASE_CONNAISSANCES_ERIP.competences = categorieCompetence;

// TACHE 33A : petite carte synthetique pour un metier trouve par l'Explorateur.
// Reutilise lienFicheROME() (metiers.js), deja utilisee ailleurs dans l'appli.
function carteMetierHTML(metier) {
  var sf = (metier.savoirFaire || []).slice(0, 3).join(', ');
  var se = (metier.savoirEtre || []).slice(0, 3).join(', ');
  var sa = (metier.savoirs || []).slice(0, 2).join(', ');
  var lienRome = metier.rome
    ? '<a href="' + lienFicheROME(metier) + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary mt-2">' +
      '&#128279; Fiche ROME ' + metier.rome + '</a>'
    : '';
  // TACHE (recherche assistant) : la carte devient cliquable (hors lien ROME)
  // pour lancer le choix du parcours (CV / lettre / entretien).
  return '<div class="carte-resultat-erip carte-resultat-cliquable" data-metier-nom="' + echapperAttribut(metier.nom) + '">' +
    '<h5>' + metier.nom + '</h5>' +
    (metier.secteur ? '<p class="text-muted small mb-1">' + metier.secteur + '</p>' : '') +
    (sf ? '<p class="small mb-1"><strong>Savoir-faire :</strong> ' + sf + '</p>' : '') +
    (se ? '<p class="small mb-1"><strong>Savoir-etre :</strong> ' + se + '</p>' : '') +
    (sa ? '<p class="small mb-1"><strong>Savoirs :</strong> ' + sa + '</p>' : '') +
    lienRome +
    '</div>';
}

// TACHE 33A : petite carte pour un item de catalogue (action, environnement,
// valeur...), plus legere que la carte metier.
function carteItemHTML(item, cliquable, champAssocie) {
  return '<div class="carte-resultat-erip' + (cliquable ? ' carte-resultat-cliquable' : '') + '"' +
    (cliquable ? ' data-champ-associe="' + champAssocie + '" data-id-associe="' + echapperAttribut(item.id) + '"' +
      ' data-label-associe="' + echapperAttribut(item.label) + '" data-icon-associe="' + echapperAttribut(item.icon || '') + '"' : '') + '>' +
    '<h5>' + (item.icon ? item.icon + ' ' : '') + item.label + '</h5>' +
    (item.categorie ? '<p class="text-muted small mb-0">' + item.categorie + '</p>' : '') +
    '</div>';
}

// TACHE 33A : rendu de l'ensemble des resultats, groupes par categorie.
// TACHE (moteur de pertinence, etape D) : variante de carteMetierHTML avec
// les raisons de la suggestion (deja produites par calculerScoreMetier,
// metiers.js, reutilisees sans modification). Utilisee pour les metiers
// trouves par le sens de la recherche (rechercherMetiersDepuisTexte), et non
// par correspondance exacte de leur nom.
function carteMetierSuggereHTML(metier) {
  var lienRome = metier.rome
    ? '<a href="' + lienFicheROME(metier) + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary mt-2">' +
      '&#128279; Fiche ROME ' + metier.rome + '</a>'
    : '';
  var raisons = (metier.raisons || []).slice(0, 3);
  return '<div class="carte-resultat-erip carte-resultat-cliquable" data-metier-nom="' + echapperAttribut(metier.nom) + '">' +
    '<h5>' + metier.nom + '</h5>' +
    (metier.secteur ? '<p class="text-muted small mb-1">' + metier.secteur + '</p>' : '') +
    (raisons.length ? '<p class="small mb-1">' + raisons.map(function (r) { return '&#10003; ' + r; }).join('<br>') + '</p>' : '') +
    lienRome +
    '</div>';
}

function rendreResultatsRechercheERIP(texte) {
  var zone = document.getElementById('resultatsRechercheERIP');
  var overlay = document.getElementById('overlayRechercheERIP');
  if (!zone) { return; }
  // TACHE (mise en page accueil) : l'overlay intercepte les clics sur le reste
  // de la page tant que des resultats sont affiches (liste superposee).
  function activerOverlay(actif) { if (overlay) { overlay.classList.toggle('actif', actif); } }
  var groupes = rechercherBaseConnaissances(texte);

  // TACHE (moteur de pertinence, etape D) : en complement de la recherche
  // exacte ci-dessus, le moteur de pertinence (concepts + score, etapes
  // A a C) propose des metiers selon le SENS de la recherche, meme si le
  // nom du metier n'apparait pas litteralement dans le texte saisi.
  // Les metiers deja trouves par correspondance exacte de leur nom ne sont
  // pas repetes ici (evite les doublons a l'affichage).
  var idsMetiersExacts = {};
  groupes.forEach(function (g) { if (g.type === 'metier') { g.resultats.forEach(function (m) { idsMetiersExacts[m.id] = true; }); } });
  var metiersSuggeres = rechercherMetiersDepuisTexte(texte, 5).filter(function (m) { return !idsMetiersExacts[m.id]; });
  if (metiersSuggeres.length) {
    groupes.push({ categorie: 'Metiers qui pourraient vous correspondre', icone: '🎯', resultats: metiersSuggeres, type: 'metier_suggere' });
  }

  if (!texte || normaliserTexte(texte).trim().length < 2) { zone.innerHTML = ''; activerOverlay(false); return; }
  if (!groupes.length) {
    zone.innerHTML = '<p class="text-muted text-center mt-3">Aucun resultat pour "' + texte + '".</p>';
    activerOverlay(true);
    return;
  }
  zone.innerHTML = groupes.map(function (groupe) {
    var cartes = groupe.resultats.map(function (r) {
      if (groupe.type === 'metier') { return carteMetierHTML(r); }
      if (groupe.type === 'metier_suggere') { return carteMetierSuggereHTML(r); }
      if (groupe.type === 'item') {
        // TACHE (amelioration recherche) : environnements de travail et
        // valeurs professionnelles deviennent cliquables (metiers associes),
        // au meme titre que les competences/savoir-etre/savoirs.
        var champAssocie = groupe.categorie === 'Environnements de travail' ? 'environnement' :
          (groupe.categorie === 'Valeurs professionnelles' ? 'valeurs' : null);
        return carteItemHTML(r, !!champAssocie, champAssocie);
      }
      // TACHE (recherche assistant) : competences, savoir-etre et savoirs
      // deviennent cliquables pour afficher les metiers associes. Les
      // certifications restent de simples pastilles informatives (non
      // decrites dans la demande comme point de depart d'un parcours).
      var cliquable = (groupe.categorie === 'Competences' || groupe.categorie === 'Savoir-etre' || groupe.categorie === 'Savoirs');
      return '<div class="carte-resultat-erip carte-resultat-texte' + (cliquable ? ' carte-resultat-cliquable' : '') + '"' +
        (cliquable ? ' data-competence-nom="' + echapperAttribut(r) + '"' : '') + '>' + r + '</div>';
    }).join('');
    return '<div class="groupe-resultats-erip"><h4>' + groupe.icone + ' ' + groupe.categorie + '</h4>' +
      '<div class="grille-resultats-erip">' + cartes + '</div></div>';
  }).join('');
  activerOverlay(true);
}

/* ------------------------------------------------------------
   TACHE (recherche assistant) : parcours guide declenche depuis la
   recherche. Un metier ou une competence cliques ouvrent une sequence de
   petits panneaux (choix du parcours, entreprise, CV) qui aboutissent
   directement sur l'assistant demande, avec le metier deja actif.
   ------------------------------------------------------------ */
var rechercheGuidee = { metier: null, parcours: null };

// Composant generique de panneau (memes codes visuels que les fenetres
// existantes : overlay, carte blanche, fermeture par croix ou clic exterieur).
// Reutilise pour tous les panneaux de ce parcours, afin d'eviter toute
// duplication de code.
function fermerPanneauGuide() {
  // TACHE (renforcement) : supprime TOUTES les occurrences de cet id, pas
  // seulement la premiere -- getElementById() n'en retire qu'une seule ; en
  // cas d'incident (par ex. un cache navigateur partiel melangeant une
  // ancienne et une nouvelle version du script), deux panneaux pourraient
  // sinon rester affiches en meme temps.
  document.querySelectorAll('#panneauGuideERIP').forEach(function (f) { f.remove(); });
}

function ouvrirPanneauGuide(titre, contenuHTML) {
  fermerPanneauGuide();
  var fenetre = document.createElement('div');
  fenetre.id = 'panneauGuideERIP';
  fenetre.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2100;padding:1rem;';
  fenetre.innerHTML =
    '<div style="background:white;border-radius:1.5rem;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;padding:1.5rem;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div class="d-flex justify-content-between align-items-center mb-2">' +
        '<h5 class="mb-0">' + titre + '</h5>' +
        '<button type="button" id="fermerPanneauGuideBtn" class="btn btn-sm btn-outline-secondary" ' +
          'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      contenuHTML +
    '</div>';
  document.body.appendChild(fenetre);
  document.getElementById('fermerPanneauGuideBtn').addEventListener('click', fermerPanneauGuide);
  fenetre.addEventListener('click', function (e) { if (e.target === fenetre) { fermerPanneauGuide(); } });
  return fenetre;
}

// Etape 2 : competence cliquee -> jusqu'a 5 metiers qui la mentionnent.
// Rendu partage : une liste de metiers cliquables (nom + trombone ROME),
// dans un panneau-guide. Reutilise par les competences (deja existant) et,
// desormais, par les environnements de travail et les valeurs professionnelles.
function ouvrirPanneauMetiersAssociesGenerique(titre, texteIntro, metiers) {
  var lignes = metiers.length
    ? metiers.map(function (m) {
        var lienRome = m.rome
          ? '<a href="' + lienFicheROME(m) + '" target="_blank" rel="noopener" class="ms-2" title="Ouvrir la fiche ROME">&#128206;</a>'
          : '';
        return '<div class="ligne-metier-associe" data-metier-nom="' + echapperAttribut(m.nom) + '">' +
          '<span>' + m.nom + '</span>' + lienRome + '</div>';
      }).join('')
    : '<p class="text-muted small">Aucun metier associe trouve pour le moment.</p>';
  var panneau = ouvrirPanneauGuide(titre, '<p class="text-muted small">' + texteIntro + '</p>' + lignes);
  panneau.querySelectorAll('[data-metier-nom]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; } // clic sur le trombone ROME : ne pas enchainer
      ouvrirPanneauChoixParcours(this.dataset.metierNom);
    });
  });
}

// Etape 2 : competence cliquee -> jusqu'a 5 metiers qui la mentionnent.
function ouvrirPanneauMetiersAssocies(competence) {
  ouvrirPanneauMetiersAssociesGenerique('&#128218; ' + competence,
    'Cette competence est particulierement recherchee dans :',
    trouverMetiersAssocies(competence, 5));
}

// TACHE (amelioration recherche) : meme principe pour un environnement de
// travail ou une valeur professionnelle cliques dans les resultats.
function ouvrirPanneauMetiersAssociesChamp(champ, id, label, icone) {
  var texteIntro = (champ === 'valeurs')
    ? 'Cette valeur correspond notamment aux metiers suivants :'
    : 'Cet environnement de travail correspond notamment aux metiers suivants :';
  ouvrirPanneauMetiersAssociesGenerique((icone || '') + ' ' + label, texteIntro,
    trouverMetiersParChampId(champ, id, 5));
}

// Etape 3 : metier choisi -> quel parcours ?
function ouvrirPanneauChoixParcours(metierNom) {
  // TACHE (ameliorations parcours recherche, point 1) : un nouveau metier
  // clique efface systematiquement tout historique du parcours precedent
  // (parcours choisi, entreprise saisie), pour eviter toute confusion.
  rechercheGuidee = { metier: metierNom, parcours: null };
  dossier.rechercheEntreprise = { structure: '' };
  var contenu =
    '<p class="fw-bold mb-1">' + metierNom + '</p>' +
    '<p class="text-muted small">Choisissez le parcours qui correspond a votre situation.</p>' +
    '<div class="pastilles-parcours-guide">' +
    '<label class="pastille-parcours"><input type="radio" name="parcoursGuide" value="cv"> &#128196; Preparer mon CV</label>' +
    '<label class="pastille-parcours"><input type="radio" name="parcoursGuide" value="lettre"> &#9993; Preparer ma lettre de motivation</label>' +
    '<label class="pastille-parcours"><input type="radio" name="parcoursGuide" value="entretien"> &#127908; Preparer mon entretien</label>' +
    '</div>' +
    '<div class="d-flex justify-content-end mt-3"><button type="button" class="btn btn-primary" id="validerParcoursGuideBtn" disabled>Valider</button></div>';
  var panneau = ouvrirPanneauGuide('&#128188; ' + metierNom, contenu);
  var btnValider = document.getElementById('validerParcoursGuideBtn');
  panneau.querySelectorAll('input[name="parcoursGuide"]').forEach(function (el) {
    el.addEventListener('change', function () { rechercheGuidee.parcours = this.value; btnValider.disabled = false; });
  });
  btnValider.addEventListener('click', function () {
    if (!rechercheGuidee.parcours) { return; }
    ouvrirPanneauEntreprise();
  });
}

// Etape 5 : entreprise connue ou non.
function ouvrirPanneauEntreprise() {
  var contenu =
    '<p class="mb-2">Connaissez-vous deja l\'entreprise auprès de laquelle vous souhaitez postuler ?</p>' +
    '<div class="civilite mb-2">' +
    '<label><input type="radio" name="entrepriseConnueGuide" value="oui"> Oui</label>' +
    '<label><input type="radio" name="entrepriseConnueGuide" value="non"> Non</label>' +
    '</div>' +
    '<div id="champEntrepriseGuide" class="d-none">' +
    '<input type="text" class="form-control form-control-sm" id="entrepriseGuideInput" ' +
    'placeholder="Nom de l\'entreprise ou lien internet"></div>' +
    '<div class="d-flex justify-content-end mt-3"><button type="button" class="btn btn-primary" id="validerEntrepriseGuideBtn" disabled ' +
    'title="Choisissez une reponse pour continuer.">Continuer &#8594;</button></div>';
  var panneau = ouvrirPanneauGuide('&#127970; Entreprise', contenu);
  var champ = document.getElementById('champEntrepriseGuide');
  var champInput = document.getElementById('entrepriseGuideInput');
  var btnValider = document.getElementById('validerEntrepriseGuideBtn');

  // TACHE (ameliorations parcours recherche, point 2) : le bouton reste
  // desactive (curseur interdit, message explicite) tant que "Oui" est
  // choisi sans que le champ ne soit rempli.
  function majBoutonEntreprise() {
    var reponse = document.querySelector('input[name="entrepriseConnueGuide"]:checked');
    if (!reponse) {
      btnValider.disabled = true;
      btnValider.title = 'Choisissez une reponse pour continuer.';
      return;
    }
    if (reponse.value === 'oui' && !champInput.value.trim()) {
      btnValider.disabled = true;
      btnValider.title = 'Indiquez le nom de l\'entreprise ou un lien internet pour continuer.';
    } else {
      btnValider.disabled = false;
      btnValider.title = '';
    }
  }
  panneau.querySelectorAll('input[name="entrepriseConnueGuide"]').forEach(function (el) {
    el.addEventListener('change', function () {
      champ.classList.toggle('d-none', this.value !== 'oui');
      majBoutonEntreprise();
    });
  });
  champInput.addEventListener('input', majBoutonEntreprise);

  btnValider.addEventListener('click', function () {
    if (btnValider.disabled) { return; }
    var reponse = document.querySelector('input[name="entrepriseConnueGuide"]:checked');
    var estOui = reponse && reponse.value === 'oui';
    var valeur = estOui ? champInput.value.trim() : '';

    // TACHE (ameliorations parcours recherche, point 4) : specifiquement pour
    // la lettre de motivation, "Non" declenche un avertissement avant de
    // poursuivre (la lettre sera moins personnalisee sans entreprise connue).
    if (!estOui && rechercheGuidee.parcours === 'lettre') {
      ouvrirPanneauAvertissementEntreprise();
      return;
    }
    validerEntrepriseGuidee(valeur, estOui);
  });
}

// Enregistre l'entreprise (ou son absence) et poursuit le parcours.
function validerEntrepriseGuidee(valeur, estOui) {
  dossier.rechercheEntreprise = dossier.rechercheEntreprise || { structure: '' };
  dossier.rechercheEntreprise.structure = valeur;
  ajouterMetierCandidat(rechercheGuidee.metier);
  // TACHE (ameliorations parcours recherche, point 2) : sans entreprise
  // connue, on privilegie un CV general plutot que specifique.
  dossier.typeCV = estOui ? 'specifique' : 'general';
  fermerPanneauGuide();
  if (cvDisponible()) { lancerParcoursGuide(); } else { ouvrirPanneauCvExistant(); }
}

// TACHE (ameliorations parcours recherche, point 4) : petite fenetre
// d'avertissement, uniquement pour la lettre de motivation sans entreprise.
function ouvrirPanneauAvertissementEntreprise() {
  var contenu =
    '<p class="text-muted small">Sans nom d\'entreprise connu, votre lettre de motivation sera moins ' +
    'personnalisee et donc un peu moins percutante.</p>' +
    '<div class="d-flex justify-content-between mt-3">' +
    '<button type="button" class="btn btn-outline-secondary" id="retourEntrepriseGuideBtn">Renseigner l\'entreprise</button>' +
    '<button type="button" class="btn btn-primary" id="poursuivreSansEntrepriseGuideBtn">Poursuivre sans entreprise</button>' +
    '</div>';
  ouvrirPanneauGuide('&#9888;&#65039; Entreprise non renseignee', contenu);
  document.getElementById('retourEntrepriseGuideBtn').addEventListener('click', ouvrirPanneauEntreprise);
  document.getElementById('poursuivreSansEntrepriseGuideBtn').addEventListener('click', function () {
    validerEntrepriseGuidee('', false);
  });
}

// Etape 6 : CV deja disponible (dans l'esprit de l'app) ou non.
function ouvrirPanneauCvExistant() {
  var contenu =
    '<p class="mb-2">Avez-vous deja un CV ?</p>' +
    '<div class="civilite mb-2">' +
    '<label><input type="radio" name="cvExisteGuide" value="oui"> Oui</label>' +
    '<label><input type="radio" name="cvExisteGuide" value="non"> Non</label>' +
    '</div>' +
    '<div class="d-flex justify-content-end mt-3"><button type="button" class="btn btn-primary" id="validerCvExisteGuideBtn" disabled ' +
    'title="Choisissez une reponse pour continuer.">Continuer &#8594;</button></div>';
  var panneau = ouvrirPanneauGuide('&#128196; Votre CV', contenu);
  var btn = document.getElementById('validerCvExisteGuideBtn');
  var reponse = null;
  // TACHE (ameliorations parcours recherche, point 3) : le libelle du bouton
  // s'adapte a la reponse ("Non" -> "Creer un nouveau CV").
  panneau.querySelectorAll('input[name="cvExisteGuide"]').forEach(function (el) {
    el.addEventListener('change', function () {
      reponse = this.value;
      btn.disabled = false;
      btn.title = '';
      btn.textContent = (reponse === 'non') ? 'Créer un nouveau CV' : 'Continuer \u2192';
    });
  });
  btn.addEventListener('click', function () {
    if (btn.disabled) { return; }
    fermerPanneauGuide();
    if (reponse === 'non') {
      // TACHE (recherche assistant) : le metier vise est deja memorise
      // (dossier.metierCible) avant de rejoindre le parcours "Creer un nouveau CV".
      dossier.modeCreation = 'nouveau';
      naviguerVers('objectif');
    } else {
      ouvrirPanneauMajCv();
    }
  });
}

// Etape 6 (suite) : CV existant -> import obligatoire dans les deux cas
// (Oui/Non), seule la destination change. "Oui" (je veux le mettre a jour) ->
// Mon projet, pour completer davantage. "Non" (il est deja exploitable tel
// quel) -> Action directement, avec le metier deja actif. Pour l'entretien,
// la fenetre inclut aussi la lettre facultative et la destination est
// toujours Action (TACHE point 6).
function ouvrirPanneauMajCv() {
  var contenu =
    '<p class="mb-2">Souhaitez-vous mettre votre CV a jour ?</p>' +
    '<div class="civilite mb-2">' +
    '<label><input type="radio" name="majCvGuide" value="oui"> Oui</label>' +
    '<label><input type="radio" name="majCvGuide" value="non"> Non</label>' +
    '</div>' +
    '<div class="d-flex justify-content-end mt-3"><button type="button" class="btn btn-primary" id="validerMajCvGuideBtn" disabled ' +
    'title="Choisissez une reponse pour continuer.">Continuer &#8594;</button></div>';
  var panneau = ouvrirPanneauGuide('&#128196; Mise a jour du CV', contenu);
  var btn = document.getElementById('validerMajCvGuideBtn');
  var reponse = null;
  panneau.querySelectorAll('input[name="majCvGuide"]').forEach(function (el) {
    el.addEventListener('change', function () {
      reponse = this.value;
      btn.disabled = false;
      btn.title = '';
      // TACHE (amelioration recherche, point 1) : le libelle du bouton reflete
      // directement l'action a venir, comme deja fait pour "Avez-vous un CV ?".
      btn.textContent = (reponse === 'oui') ? 'Mettre à jour mon CV' : 'Continuer \u2192';
    });
  });
  btn.addEventListener('click', function () {
    if (btn.disabled) { return; }
    fermerPanneauGuide();
    dossier.modeCreation = (reponse === 'oui') ? 'maj' : 'pret';
    var destination = (rechercheGuidee.parcours === 'entretien')
      ? function () { naviguerVers('resultats'); }
      : (reponse === 'oui' ? function () { naviguerVers('projet'); } : function () { naviguerVers('resultats'); });
    if (rechercheGuidee.parcours === 'entretien') {
      // Reutilise entierement la fenetre existante : CV obligatoire + lettre
      // facultative (avec possibilite de continuer sans lettre), meme fenetre
      // que sur l'ecran Action.
      ouvrirFenetreEntretien(destination);
    } else {
      ouvrirFenetreCV(dossier.modeCreation, { onTerminer: destination });
    }
  });
}

// Destination finale une fois le CV disponible sans reimport necessaire :
// ecran ACTION pour le CV, assistant IA direct pour la lettre et l'entretien
// (reutilise entierement ouvrirAideIA()).
function lancerParcoursGuide() {
  if (rechercheGuidee.parcours === 'cv') {
    naviguerVers('resultats');
  } else if (rechercheGuidee.parcours) {
    ouvrirAideIA(rechercheGuidee.parcours);
  }
}

/* ------------------------------------------------------------
   ETAPE 3 : CATALOGUES "Oui/Non + pastilles" (Loisirs, Engagements,
   Experiences et savoir-faire personnels). Fonctions purement
   additives : non encore branchees sur aucune page (etapes 4/5/6).
   ------------------------------------------------------------ */
var CATALOGUE_LOISIRS = [
  { categorie: '⚽ Sports', items: ['Football', 'Rugby', 'Tennis', 'Natation', 'Course à pied', 'Cyclisme', 'Musculation / Fitness', 'Arts martiaux', 'Danse', 'Randonnée', 'Escalade', 'Sports mécaniques', 'Sports nautiques'] },
  { categorie: '🎨 Activités créatives', items: ['Dessin', 'Peinture', 'Photographie', 'Couture', 'Tricot', 'Bricolage', 'Menuiserie', 'Sculpture', 'Décoration', 'DIY (Do It Yourself)'] },
  { categorie: '🎵 Culture', items: ['Lecture', 'Écriture', 'Musique', 'Chant', 'Théâtre', 'Cinéma', 'Jeux de société', 'Langues étrangères'] },
  { categorie: '💻 Numérique', items: ['Informatique', 'Programmation', 'Jeux vidéo', 'Création de site Internet', 'Montage vidéo', 'Création graphique', 'Impression 3D', 'Robotique'] },
  { categorie: '🌿 Nature', items: ['Jardinage', 'Potager', 'Observation de la nature', 'Pêche', 'Chasse', 'Camping'] },
  { categorie: '🍳 Vie quotidienne', items: ['Cuisine', 'Pâtisserie', 'Voyage', 'Collection', 'Animaux'] }
];

var CATALOGUE_ENGAGEMENTS = [
  { categorie: '🤝 Vie associative', items: ['Bénévolat associatif', 'Association sportive', 'Association culturelle', 'Association environnementale', 'Association humanitaire', 'Protection animale'] },
  { categorie: '🧑‍🤝‍🧑 Solidarité', items: ['Aidant familial', 'Soutien scolaire', 'Tutorat / mentorat', 'Accompagnement de personnes âgées', 'Distribution alimentaire', 'Accompagnement administratif'] },
  { categorie: '🚒 Engagement citoyen', items: ['Service civique', 'Sapeur-pompier volontaire', 'Réserve citoyenne', 'Réserve militaire', 'Protection civile', 'Croix-Rouge', 'Secourisme'] },
  { categorie: '🏫 Vie locale', items: ['Parent élu', 'Association de parents d\'élèves', 'Conseil de quartier', 'Comité des fêtes', 'Organisation d\'événements'] },
  { categorie: '👥 Responsabilités', items: ['Président d\'association', 'Vice-président', 'Trésorier', 'Secrétaire', 'Encadrement d\'équipe bénévole'] }
];

var CATALOGUE_EXPERIENCES_PERSO = [
  { categorie: '🏠 Vie quotidienne', items: ['Gestion d\'un foyer', 'Organisation familiale', 'Gestion d\'un budget', 'Aide administrative', 'Courses et logistique'] },
  { categorie: '👨‍👩‍👧 Aide aux personnes', items: ['Aidant familial', 'Garde d\'enfants', 'Accompagnement de personnes âgées', 'Soutien à une personne en situation de handicap'] },
  { categorie: '🛠 Bricolage et travaux', items: ['Bricolage', 'Peinture', 'Plomberie', 'Électricité', 'Jardinage', 'Entretien d\'espaces verts', 'Mécanique'] },
  { categorie: '💻 Numérique', items: ['Informatique', 'Dépannage informatique', 'Création de site Internet', 'Montage vidéo', 'Graphisme', 'Utilisation avancée des outils bureautiques'] },
  { categorie: '📚 Développement personnel', items: ['Autoformation', 'Apprentissage en ligne', 'Veille professionnelle', 'Lecture spécialisée'] },
  { categorie: '🎯 Projets personnels', items: ['Création d\'entreprise', 'Organisation d\'événements', 'Projet artistique', 'Projet informatique', 'Projet associatif', 'Création de contenu'] },
  { categorie: '🌍 Vie sociale', items: ['Animation', 'Médiation', 'Organisation d\'activités', 'Encadrement de groupe'] }
];

// Etape 8 : referentiel ERIP des certifications (mini-referentiel, evolutif)
var CATALOGUE_CERTIFICATIONS = [
  { categorie: 'Santé / Sécurité', items: ['SST', 'PSC1', 'AFGSU', 'SSIAP', 'H0B0', 'BS', 'BE Manoeuvre'] },
  { categorie: 'CACES', items: ['R482', 'R485', 'R486', 'R489', 'R490'] },
  { categorie: 'BTP', items: ['AIPR', 'Travail en hauteur', 'Échafaudage', 'Amiante'] },
  { categorie: 'Transport', items: ['FIMO', 'FCO', 'ADR'] },
  { categorie: 'Industrie', items: ['Habilitations électriques', 'Pont roulant', 'Élingage', 'Soudure'] },
  { categorie: 'Numérique', items: ['PIX', 'ICDL', 'TOSA'] },
  { categorie: 'Langues', items: ['TOEIC', 'TOEFL', 'Linguaskill', 'DELF', 'DALF'] }
];

// Enrichissement invisible : chaque loisir du catalogue est relie a 1-3
// competences existantes (categorieCompetence). Jamais affiche a l'ecran ;
// utilise uniquement par deduireCompetences() pour enrichir le Dossier Candidat.
var mappingLoisirsCompetences = {
  'Football': ['Esprit d\'equipe', 'Perseverance', 'Respect des regles'],
  'Rugby': ['Esprit d\'equipe', 'Perseverance', 'Respect des regles'],
  'Tennis': ['Perseverance', 'Rigueur', 'Autonomie'],
  'Natation': ['Perseverance', 'Autonomie', 'Endurance'],
  'Course à pied': ['Perseverance', 'Endurance', 'Autonomie'],
  'Cyclisme': ['Endurance', 'Autonomie', 'Perseverance'],
  'Musculation / Fitness': ['Perseverance', 'Rigueur', 'Autonomie'],
  'Arts martiaux': ['Respect des regles', 'Perseverance', 'Securite'],
  'Danse': ['Creativite', 'Expression artistique', 'Rigueur'],
  'Randonnée': ['Endurance', 'Autonomie', 'Adaptabilite'],
  'Escalade': ['Perseverance', 'Securite', 'Autonomie'],
  'Sports mécaniques': ['Technique', 'Precision', 'Securite'],
  'Sports nautiques': ['Adaptabilite', 'Securite', 'Autonomie'],
  'Dessin': ['Creativite', 'Expression artistique', 'Sens du detail'],
  'Peinture': ['Creativite', 'Expression artistique', 'Sens du detail'],
  'Photographie': ['Creativite', 'Sens du detail'],
  'Couture': ['Precision', 'Travail manuel', 'Sens du detail'],
  'Tricot': ['Precision', 'Patience', 'Travail manuel'],
  'Bricolage': ['Travail manuel', 'Technique', 'Reparation'],
  'Menuiserie': ['Travail manuel', 'Technique', 'Precision'],
  'Sculpture': ['Creativite', 'Travail manuel', 'Expression artistique'],
  'Décoration': ['Creativite', 'Sens du detail', 'Expression artistique'],
  'DIY (Do It Yourself)': ['Creativite', 'Travail manuel', 'Innovation'],
  'Lecture': ['Apprentissage', 'Autonomie'],
  'Écriture': ['Redaction', 'Creativite', 'Expression artistique'],
  'Musique': ['Creativite', 'Expression artistique'],
  'Chant': ['Expression artistique', 'Creativite'],
  'Théâtre': ['Communication', 'Expression artistique', 'Creativite'],
  'Cinéma': ['Creativite', 'Apprentissage'],
  'Jeux de société': ['Esprit d\'equipe', 'Raisonnement logique'],
  'Langues étrangères': ['Communication', 'Adaptabilite', 'Apprentissage'],
  'Informatique': ['Bureautique', 'Technique', 'Analyse de donnees'],
  'Programmation': ['Raisonnement logique', 'Technique', 'Rigueur'],
  'Jeux vidéo': ['Raisonnement logique', 'Adaptabilite'],
  'Création de site Internet': ['Technique', 'Creativite', 'Innovation'],
  'Montage vidéo': ['Creativite', 'Technique', 'Sens du detail'],
  'Création graphique': ['Creativite', 'Expression artistique', 'Sens du detail'],
  'Impression 3D': ['Technique', 'Innovation', 'Precision'],
  'Robotique': ['Technique', 'Innovation', 'Raisonnement logique'],
  'Jardinage': ['Patience', 'Organisation', 'Travail manuel'],
  'Potager': ['Patience', 'Organisation', 'Travail manuel'],
  'Observation de la nature': ['Patience', 'Autonomie'],
  'Pêche': ['Patience', 'Autonomie'],
  'Chasse': ['Patience', 'Securite', 'Autonomie'],
  'Camping': ['Autonomie', 'Adaptabilite', 'Organisation'],
  'Cuisine': ['Organisation', 'Gestion du temps', 'Rigueur'],
  'Pâtisserie': ['Precision', 'Rigueur', 'Creativite'],
  'Voyage': ['Adaptabilite', 'Autonomie'],
  'Collection': ['Organisation', 'Rigueur'],
  'Animaux': ['Empathie', 'Responsabilite', 'Patience']
};

// Petit echappement pour inserer une valeur dans un attribut HTML (value="...")
// sans risquer de casser le markup si l'utilisateur saisit des guillemets.
function echapperAttribut(t) {
  return String(t || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Pastilles simples (Loisirs, Engagements) : dossier[config.cle] est un tableau de chaines.
function blocPastillesSimples(config, liste) {
  return '<div class="pastilles mt-2">' + liste.map(function (valeur, i) {
    return '<span class="pastille actif" data-catalogue-retrait="' + config.cle + '" data-index="' + i + '">' + valeur + ' &#10005;</span>';
  }).join('') + '</div>';
}

// Pastilles avec detail optionnel (Experiences et savoir-faire personnels) :
// dossier[config.cle] est un tableau d'objets { [config.champValeur]: ..., detail: ... }.
function blocPastillesAvecDetail(config, liste) {
  return '<div class="pastilles-detail mt-2">' + liste.map(function (item, i) {
    return '<div class="pastille-detail-bloc">' +
      '<span class="pastille actif" data-catalogue-retrait="' + config.cle + '" data-index="' + i + '">' + item[config.champValeur] + ' &#10005;</span>' +
      '<input type="text" class="form-control form-control-sm mt-1" data-catalogue-detail="' + config.cle + '" data-index="' + i + '" ' +
        'placeholder="Détail (optionnel)" value="' + echapperAttribut(item.detail || '') + '">' +
      '</div>';
  }).join('') + '</div>';
}

// Composant generique "Oui/Non + pastilles", reutilisable pour Loisirs,
// Engagements et Experiences et savoir-faire personnels (etapes 4/5/6).
// config = { cle, titre, question, catalogue, avecDetail, champValeur }
// TACHE (refonte Mon projet, Etape C) : versions "contenu pur" (sans
// enveloppe carte/titre/liste-a-puces, la liste passe dans le resume du
// bloc) des composants catalogue generiques (TACHE 3), reutilisables pour
// tous les blocs (Parcours ici, Complements a l'etape F).
function contenuCatalogueDirect(config) {
  return '<div class="mt-2"><button class="btn btn-outline-primary btn-sm" data-catalogue-ajouter="' +
    config.cle + '">&#10133; ' + (config.labelAjouter || 'Ajouter') + '</button></div>';
}

function contenuCatalogueOuiNon(config) {
  // TACHE (correction bug) : "Non" ne doit etre mis en avant QUE si la
  // personne a explicitement repondu Non -- pas par defaut (jamais repondu).
  // reponse peut valoir undefined (jamais repondu), true (Oui) ou false (Non).
  var reponse = dossier.catalogueActif ? dossier.catalogueActif[config.cle] : undefined;
  var choixOui = reponse === true ? 'btn-primary' : 'btn-outline-primary';
  var choixNon = reponse === false ? 'btn-primary' : 'btn-outline-primary';
  var html = '<p class="mb-2">' + config.question + '</p>' +
    '<button class="btn btn-sm ' + choixOui + ' me-2" data-catalogue-oui="' + config.cle + '">Oui</button>' +
    '<button class="btn btn-sm ' + choixNon + '" data-catalogue-non="' + config.cle + '">Non</button>';
  if (reponse === true) {
    html += '<div class="mt-2"><button class="btn btn-outline-primary btn-sm" data-catalogue-ajouter="' + config.cle + '">&#10133; Ajouter</button></div>';
  }
  return html;
}

function blocCatalogueOuiNon(config) {
  var actif = !!(dossier.catalogueActif && dossier.catalogueActif[config.cle]);
  var liste = dossier[config.cle] || [];
  var choixOui = actif ? 'btn-primary' : 'btn-outline-primary';
  var choixNon = !actif ? 'btn-primary' : 'btn-outline-primary';
  var html = '<div class="cv-section mt-4"><h5>' + config.titre + '</h5>' +
    '<p class="mb-2">' + config.question + '</p>' +
    '<button class="btn btn-sm ' + choixOui + ' me-2" data-catalogue-oui="' + config.cle + '">Oui</button>' +
    '<button class="btn btn-sm ' + choixNon + '" data-catalogue-non="' + config.cle + '">Non</button>';
  if (actif) {
    if (liste.length) {
      html += config.avecDetail ? blocPastillesAvecDetail(config, liste) : blocPastillesSimples(config, liste);
    }
    html += '<div class="mt-2"><button class="btn btn-outline-primary btn-sm" data-catalogue-ajouter="' + config.cle + '">&#10133; Ajouter</button></div>';
  }
  html += '</div>';
  return html;
}

function fermerFenetreCatalogue() {
  var f = document.getElementById('fenetreCatalogue');
  if (f) { f.remove(); }
}

// Fenetre de selection : catalogue groupe par categories (cases a cocher pour
// les items pas encore choisis) + champ "Autre" libre. onValider(choisis[]) est
// appele avec les valeurs cochees + la saisie libre eventuelle.
function ouvrirFenetreCatalogue(config, onValider) {
  fermerFenetreCatalogue();
  var dejaChoisis = (dossier[config.cle] || []).map(function (item) {
    return config.avecDetail ? item[config.champValeur] : item;
  });
  var corpsCategories = config.catalogue.map(function (groupe) {
    var cases = groupe.items.filter(function (item) { return dejaChoisis.indexOf(item) === -1; }).map(function (item) {
      return '<label class="catalogue-case"><input type="checkbox" value="' + echapperAttribut(item) + '"> ' + item + '</label>';
    }).join('');
    if (!cases) { return ''; }
    return '<div class="catalogue-categorie"><h6>' + groupe.categorie + '</h6>' + cases + '</div>';
  }).join('');
  var fenetre = document.createElement('div');
  fenetre.id = 'fenetreCatalogue';
  fenetre.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2000;padding:1rem;';
  fenetre.innerHTML =
    '<div style="background:white;border-radius:1.5rem;max-width:560px;width:100%;max-height:85vh;overflow-y:auto;padding:1.5rem;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div class="d-flex justify-content-between align-items-center mb-3">' +
        '<h5 class="mb-0">' + config.titre + '</h5>' +
        '<button type="button" id="fermerCatalogueBtn" class="btn btn-sm btn-outline-secondary" ' +
          'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      corpsCategories +
      '<div class="catalogue-categorie"><h6>Autre</h6>' +
      '<input type="text" class="form-control form-control-sm" id="catalogueAutreTexte" placeholder="Préciser..."></div>' +
      '<div class="d-flex justify-content-end mt-3">' +
        '<button type="button" id="validerCatalogueBtn" class="btn btn-primary">Valider</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fenetre);

  document.getElementById('fermerCatalogueBtn').addEventListener('click', fermerFenetreCatalogue);
  fenetre.addEventListener('click', function (e) { if (e.target === fenetre) { fermerFenetreCatalogue(); } });

  document.getElementById('validerCatalogueBtn').addEventListener('click', function () {
    var choisis = [];
    fenetre.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) { choisis.push(cb.value); });
    var autre = document.getElementById('catalogueAutreTexte').value.trim();
    if (autre) { choisis.push(autre); }
    fermerFenetreCatalogue();
    if (choisis.length) { onValider(choisis); }
  });
}

// Ajoute les valeurs choisies dans dossier[config.cle], sans doublon, en
// respectant la forme attendue (chaine simple, ou objet si avecDetail).
function ajouterAuCatalogue(config, choisis) {
  dossier[config.cle] = dossier[config.cle] || [];
  choisis.forEach(function (valeur) {
    // TACHE (refonte Mon projet) : plafond commun a 5 elements, pour garder
    // les resumes de tableau de bord lisibles.
    if (dossier[config.cle].length >= LIMITE_CATALOGUE_RESUME) { return; }
    var existe = config.avecDetail
      ? dossier[config.cle].some(function (item) { return item[config.champValeur] === valeur; })
      : dossier[config.cle].indexOf(valeur) !== -1;
    if (!existe) {
      if (config.avecDetail) {
        var item = {};
        item[config.champValeur] = valeur;
        item.detail = '';
        dossier[config.cle].push(item);
      } else {
        dossier[config.cle].push(valeur);
      }
    }
  });
}

// Cablage du composant generique. rerender = fonction de page a rappeler
// apres chaque modification (ex. pageProjet).
// Partie commune aux deux variantes du composant catalogue (Oui/Non et directe) :
// ouverture de la fenetre d'ajout, retrait d'une pastille, saisie du detail.
function wireCatalogueAjouterEtRetrait(config, rerender) {
  var btnAjouter = document.querySelector('[data-catalogue-ajouter="' + config.cle + '"]');
  if (btnAjouter) {
    btnAjouter.addEventListener('click', function () {
      ouvrirFenetreCatalogue(config, function (choisis) {
        ajouterAuCatalogue(config, choisis);
        rerender();
      });
    });
  }
  document.querySelectorAll('[data-catalogue-retrait="' + config.cle + '"]').forEach(function (el) {
    el.addEventListener('click', function () {
      var idx = parseInt(this.dataset.index, 10);
      dossier[config.cle].splice(idx, 1);
      rerender();
    });
  });
  if (config.avecDetail) {
    document.querySelectorAll('[data-catalogue-detail="' + config.cle + '"]').forEach(function (el) {
      el.addEventListener('input', function () {
        var idx = parseInt(this.dataset.index, 10);
        if (dossier[config.cle][idx]) { dossier[config.cle][idx].detail = this.value; }
      });
    });
  }
}

function wireCatalogueOuiNon(config, rerender) {
  var btnOui = document.querySelector('[data-catalogue-oui="' + config.cle + '"]');
  var btnNon = document.querySelector('[data-catalogue-non="' + config.cle + '"]');
  if (btnOui) {
    btnOui.addEventListener('click', function () {
      dossier.catalogueActif = dossier.catalogueActif || {};
      dossier.catalogueActif[config.cle] = true;
      rerender();
    });
  }
  if (btnNon) {
    btnNon.addEventListener('click', function () {
      dossier.catalogueActif = dossier.catalogueActif || {};
      dossier.catalogueActif[config.cle] = false;
      dossier[config.cle] = [];
      rerender();
    });
  }
  wireCatalogueAjouterEtRetrait(config, rerender);
}

// Etape 8 : variante directe du composant catalogue, sans bascule Oui/Non
// (bouton "Ajouter" toujours visible). Utilisee pour les Certifications.
function blocCatalogueDirect(config) {
  var liste = dossier[config.cle] || [];
  var html = '<div class="cv-section mt-4"><h5>' + config.titre + '</h5>';
  if (liste.length) { html += blocPastillesSimples(config, liste); }
  html += '<div class="mt-2"><button class="btn btn-outline-primary btn-sm" data-catalogue-ajouter="' +
    config.cle + '">&#10133; ' + (config.labelAjouter || 'Ajouter') + '</button></div></div>';
  return html;
}

function wireCatalogueDirect(config, rerender) {
  wireCatalogueAjouterEtRetrait(config, rerender);
}

/* ------------------------------------------------------------
   3. FONCTIONS UTILITAIRES DE PROFIL
   ------------------------------------------------------------ */
function deduireCompetences() {
  var set = {};
  var ordre = [];
  function ajouter(c) { if (!set[c]) { set[c] = true; ordre.push(c); } }
  var tous = dossier.activites.concat(dossier.actions, dossier.environnement, dossier.valeurs);
  tous.forEach(function (item) {
    if (mappingCompetences[item]) { mappingCompetences[item].forEach(ajouter); }
  });
  // Etape 4 : enrichissement invisible des loisirs (jamais affiche a l'ecran)
  (dossier.loisirs || []).forEach(function (loisir) {
    if (mappingLoisirsCompetences[loisir]) { mappingLoisirsCompetences[loisir].forEach(ajouter); }
  });
  // TACHE 21C : moteur d'identification base sur le nouveau referentiel des
  // actions professionnelles (CATALOGUE_ACTIONS_PRO). Cohabite avec l'ancien
  // mappingCompetences ci-dessus : les actions communes aux deux systemes
  // remontent les memes competences, sans doublon grace a ajouter().
  (dossier.actions || []).forEach(function (idAction) {
    var refAction = trouverItemParId(CATALOGUE_ACTIONS_PRO, idAction);
    if (refAction) {
      (refAction.savoirFaire || []).forEach(ajouter);
      (refAction.savoirEtre || []).forEach(ajouter);
    }
  });
  // TACHE 22B : meme principe pour "Avec qui ou avec quoi travailliez-vous
  // principalement ?" (referentiel personnes/materiels/lieux).
  (dossier.activites || []).forEach(function (idElement) {
    var refElement = trouverItemParId(CATALOGUE_PERSONNES_MATERIELS_LIEUX, idElement);
    if (refElement) {
      (refElement.savoirFaire || []).forEach(ajouter);
      (refElement.savoirEtre || []).forEach(ajouter);
    }
  });
  // TACHE 23B : meme principe pour "Dans quel environnement travailliez-vous
  // le plus souvent ?" (referentiel environnements de travail).
  (dossier.environnement || []).forEach(function (idEnv) {
    var refEnv = trouverItemParId(CATALOGUE_ENVIRONNEMENTS_TRAVAIL, idEnv);
    if (refEnv) {
      (refEnv.savoirFaire || []).forEach(ajouter);
      (refEnv.savoirEtre || []).forEach(ajouter);
    }
  });
  // TACHE 24B : meme principe pour "Qu'est-ce qui est important pour vous
  // dans un travail ?" (referentiel valeurs professionnelles - savoir-etre uniquement).
  (dossier.valeurs || []).forEach(function (idValeur) {
    var refValeur = trouverItemParId(CATALOGUE_VALEURS_PROFESSIONNELLES, idValeur);
    if (refValeur) { (refValeur.savoirEtre || []).forEach(ajouter); }
  });
  if (dossier.competencesCV) { dossier.competencesCV.forEach(ajouter); }
  if (ordre.length === 0) { ['Motivation', 'Apprentissage'].forEach(ajouter); }
  return ordre;
}

function construireProfil() {
  var comps = deduireCompetences();
  return {
    activites: dossier.activites,
    actions: dossier.actions,
    environnement: dossier.environnement,
    valeurs: dossier.valeurs,
    savoirFaire: comps.filter(function (c) { return categorieCompetence[c] === 'Savoir-faire'; }),
    savoirEtre: comps.filter(function (c) { return categorieCompetence[c] === 'Savoir-etre'; }),
    savoirs: dossier.savoirsCV || [],
    accepte: dossier.accepte || []
  };
}

function suggererMetiers() {
  var noms = metiersPourAffichage().map(function (m) { return m.nom; });
  dossier.metiersAjoutes.forEach(function (m) { if (noms.indexOf(m) === -1) { noms.push(m); } });
  return noms;
}

function obtenirSavoirs() {
  var set = {};
  var ordre = [];
  function ajouter(s) { if (!set[s]) { set[s] = true; ordre.push(s); } }
  if (dossier.savoirsCV) { dossier.savoirsCV.forEach(ajouter); }
  // TACHE 21C : savoirs identifies automatiquement via le referentiel des actions
  (dossier.actions || []).forEach(function (idAction) {
    var refAction = trouverItemParId(CATALOGUE_ACTIONS_PRO, idAction);
    if (refAction) { (refAction.savoirs || []).forEach(ajouter); }
  });
  // TACHE 22B : idem pour le referentiel personnes/materiels/lieux
  (dossier.activites || []).forEach(function (idElement) {
    var refElement = trouverItemParId(CATALOGUE_PERSONNES_MATERIELS_LIEUX, idElement);
    if (refElement) { (refElement.savoirs || []).forEach(ajouter); }
  });
  // TACHE 23B : idem pour le referentiel environnements de travail
  (dossier.environnement || []).forEach(function (idEnv) {
    var refEnv = trouverItemParId(CATALOGUE_ENVIRONNEMENTS_TRAVAIL, idEnv);
    if (refEnv) { (refEnv.savoirs || []).forEach(ajouter); }
  });
  if (!rienEteChoisi()) {
    rechercherMetiers(construireProfil(), 2).forEach(function (m) { m.savoirs.forEach(ajouter); });
  }
  return ordre;
}

// Jusqu'a 10 elements "vous aimez", lies aux choix de la personne.
function construireMessageAime() {
  var aime = [];
  function ajoute(x) { if (aime.indexOf(x) === -1 && aime.length < 10) { aime.push(x); } }
  if (dossier.actions.indexOf('conseiller') !== -1 || dossier.actions.indexOf('soigner') !== -1) ajoute('aider');
  if (dossier.actions.indexOf('organiser') !== -1 || dossier.actions.indexOf('analyser') !== -1) ajoute('organiser');
  if (dossier.activites.indexOf('collegues') !== -1 || dossier.activites.indexOf('clients') !== -1) ajoute('travailler en equipe');
  if (dossier.activites.indexOf('famille') !== -1) ajoute('rendre service a vos proches');
  if (dossier.valeurs.indexOf('autonomie') !== -1 || dossier.activites.indexOf('seul') !== -1) ajoute('etre autonome');
  if (dossier.valeurs.indexOf('responsabilites') !== -1) ajoute('prendre des responsabilites');
  if (dossier.valeurs.indexOf('teletravail') !== -1) ajoute('travailler a distance');
  if (dossier.actions.indexOf('creer') !== -1) ajoute('creer');
  if (dossier.actions.indexOf('construire') !== -1 || dossier.actions.indexOf('reparer') !== -1) ajoute('travailler de vos mains');
  if (dossier.actions.indexOf('vendre') !== -1) ajoute('convaincre');
  if (dossier.actions.indexOf('former') !== -1) ajoute('transmettre');
  if (dossier.actions.indexOf('cuisiner') !== -1) ajoute('cuisiner');
  if (dossier.actions.indexOf('transporter') !== -1) ajoute('vous deplacer');
  if (dossier.actions.indexOf('nettoyer') !== -1) ajoute('prendre soin des lieux');
  if (dossier.activites.indexOf('enfants') !== -1) ajoute('vous occuper des enfants');
  if (dossier.activites.indexOf('personnes_agees') !== -1) ajoute('accompagner les personnes');
  if (dossier.activites.indexOf('exterieur') !== -1 || dossier.valeurs.indexOf('exterieur') !== -1) ajoute('travailler dehors');
  // Complement : on pioche dans les savoir-etre detectes pour atteindre jusqu'a 10
  if (aime.length < 10) {
    var savoirEtre = deduireCompetences().filter(function (c) { return categorieCompetence[c] === 'Savoir-etre'; });
    savoirEtre.forEach(function (c) { ajoute('faire preuve de ' + c.toLowerCase()); });
  }
  if (aime.length === 0) { ajoute('apprendre'); ajoute('vous depasser'); }
  return aime.map(function (a) { return '&#10004; ' + a; }).join(' &middot; ');
}

// Message competences detectees en cours de parcours (toutes, en gras)
function afficherCompetencesDetectees(etape) {
  var comps = deduireCompetences();
  if (comps.length === 0) return '';
  var liste = '<strong>' + comps.map(function (c) { return '&#10004; ' + c; }).join(' &middot; ') + '</strong>';
  var intro;
  if (etape === 'activites') { intro = '&#129504; L\'assistant commence a mieux vous connaitre. Competences deja identifiees :'; }
  else if (etape === 'actions') { intro = '&#129504; Grace a vos reponses, votre profil s\'enrichit :'; }
  else { intro = '&#129504; Votre profil se precise :'; }
  return '<div class="message-competences">' + intro + '<br>' + liste + '</div>';
}

/* ------------------------------------------------------------
   4. NAVIGATION CLIQUABLE
   ------------------------------------------------------------ */
var ETAPES = [
  { id: 'cv', label: '👤' },
  { id: 'objectif', label: '🎯' },
  { id: 'activites', label: '🤝 Experience' },
  { id: 'actions', label: '⭐ Ce que vous faisiez' },
  { id: 'environnement', label: '🌍 Environnement' },
  { id: 'valeurs', label: '❤️ Attentes' },
  { id: 'projet', label: '📋 Mon projet' },
  { id: 'revelation', label: '🔮 Potentiel' },
  { id: 'resultats', label: '✨ Action' }
];

// active = en cours, visited = deja vu (cliquable), future = pas encore accessible
function afficherProgression(activeId) {
  var html = '<div class="progression">';
  ETAPES.forEach(function (e) {
    if (e.id === activeId) {
      html += '<span class="etape active">' + e.label + '</span>';
    } else if (historiquePages.indexOf(e.id) !== -1) {
      html += '<a href="#" class="etape visited" onclick="naviguerVers(\'' + e.id + '\'); return false;">' + e.label + '</a>';
    } else {
      html += '<span class="etape future">' + e.label + '</span>';
    }
  });
  html += '</div>';
  // Actions globales, a l'extremite droite, separees de la barre de progression.
  var boutonRestaurer = sauvegardeExiste()
    ? '<button class="btn btn-sm btn-outline-primary btn-session" onclick="restaurerSession(); return false;">&#8617;&#65039; Restaurer</button>'
    : '';
  var actions = '<div class="actions-session">' +
    '<button class="btn btn-sm btn-outline-danger btn-session" onclick="reinitialiserSession(); return false;">&#128465;&#65039; Réinitialiser</button>' +
    boutonRestaurer + '</div>';
  return '<div class="barre-superieure">' + html + actions + '</div>';
}

var routes = {
  'cv': pageChoixCV, 'objectif': pageObjectif, 'activites': pageActivites,
  'actions': pageActions, 'environnement': pageEnvironnement, 'valeurs': pageValeurs,
  'projet': pageProjet, 'revelation': pageRevelation, 'resultats': pageResultats
};

function naviguerVers(route, sansHistorique) {
  if (!routes[route]) { route = 'cv'; }
  pageActuelle = route;
  if (historiquePages.indexOf(route) === -1) { historiquePages.push(route); }
  // Point 4 : on empile dans l'historique du navigateur pour que la fleche
  // "Precedent" revienne a l'etape precedente au lieu de quitter le site.
  if (!sansHistorique && typeof history !== 'undefined' && history.pushState) {
    history.pushState({ route: route }, '', '#' + route);
  }
  window.scrollTo(0, 0);
  routes[route]();
}

// Quand l'utilisateur clique sur la fleche "Precedent" du navigateur
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', function (e) {
    var route = (e.state && e.state.route) ? e.state.route : 'cv';
    naviguerVers(route, true); // true = ne pas re-empiler
  });
}

// TACHE (demande : synchronisation identite <-> "Votre identite") : appelee
// depuis la fenetre IA (Creer CV/Lettre/Entretien) quand la civilite change
// la-bas, pour rafraichir "Vous" ICI si c'est justement la page affichee
// (Mon projet ou page Action) -- sinon, la donnee est deja a jour dans
// "dossier", elle s'affichera correctement au prochain passage sur la page.
window.rafraichirSiIdentiteAffichee = function () {
  if (pageActuelle === 'projet' || pageActuelle === 'resultats') {
    routes[pageActuelle]();
  }
};

// Bloc de navigation bas de page.
// Accueil = revenir a la 1re page SANS effacer les choix.
// options.recommencer = true : bouton rouge Recommencer a droite (efface tout).
function barreNavigation(precedent, suivant, labelSuivant, options) {
  options = options || {};
  var html = '<div class="d-flex justify-content-between align-items-center mt-4 barre-navigation">';
  html += precedent
    ? '<button class="btn btn-outline-secondary btn-lg" onclick="naviguerVers(\'' + precedent + '\')">&#8592; Retour</button>'
    : '<span></span>';
  html += '<button class="btn btn-light btn-accueil border" onclick="naviguerVers(\'cv\')">&#127968; Accueil</button>';
  if (options.recommencer) {
    html += '<button class="btn btn-danger btn-lg" onclick="recommencer()">&#128260; Recommencer</button>';
  } else if (suivant) {
    // TACHE 43bis : bouton "suivant" desactivable (ex. selection minimale requise),
    // sans impact sur les appelants qui ne passent pas cette option.
    if (options.suivantDesactive) {
      html += '<button class="btn btn-primary btn-lg" disabled title="' +
        (options.suivantDesactiveMessage || 'Selectionnez au moins un element pour continuer.') + '">' +
        (labelSuivant || 'Continuer &#8594;') + '</button>';
    } else {
      // TACHE (avertissement metier cible) : options.onclickSuivant permet a un
      // appelant d'intercepter le clic (ex. verifier qu'un metier cible est
      // renseigne) plutot que de naviguer directement -- sans rien changer
      // pour les appelants qui ne passent pas cette option.
      var jsOnclickSuivant = options.onclickSuivant || ("naviguerVers('" + suivant + "')");
      html += '<button class="btn btn-primary btn-lg" onclick="' + jsOnclickSuivant + '">' + (labelSuivant || 'Continuer &#8594;') + '</button>';
    }
  } else {
    html += '<span></span>';
  }
  html += '</div>';
  return html;
}

/* ------------------------------------------------------------
   5. PAGES DU PARCOURS
   ------------------------------------------------------------ */
// TACHE 42 : petite fenetre d'information, accueil uniquement. Reutilise le
// meme principe que les fenetres existantes (overlay + carte + fermeture par
// clic exterieur ou bouton), avec une legere animation d'ouverture/fermeture.
function fermerModaleConfidentialite() {
  var overlay = document.getElementById('modaleConfidentialite');
  if (!overlay) { return; }
  overlay.classList.remove('visible');
  setTimeout(function () { if (overlay.parentNode) { overlay.remove(); } }, 200);
}

// TACHE (refonte Mon projet, bloc 1) : petite fenetre d'explication sur
// l'usage des informations d'identite (double role : anonymisation fiable +
// personnalisation facultative), reutilise le meme habillage visuel que la
// modale de confidentialite de l'accueil.
function fermerModaleInfoIdentite() {
  var overlay = document.getElementById('modaleInfoIdentite');
  if (!overlay) { return; }
  overlay.classList.remove('visible');
  setTimeout(function () { if (overlay.parentNode) { overlay.remove(); } }, 200);
}

function ouvrirModaleInfoIdentite() {
  if (document.getElementById('modaleInfoIdentite')) { return; }
  var overlay = document.createElement('div');
  overlay.id = 'modaleInfoIdentite';
  overlay.className = 'confid-overlay';
  overlay.innerHTML =
    '<div class="confid-carte">' +
      '<div class="d-flex justify-content-between align-items-center mb-2">' +
        '<h5 class="mb-0">&#8505;&#65039; A quoi servent ces informations ?</h5>' +
        '<button type="button" id="fermerInfoIdentiteBtn1" class="btn btn-sm btn-outline-secondary" ' +
          'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      '<p>Ces informations ont deux usages, et vous restez maitre de chacun d\'eux.</p>' +
      '<p><strong>D\'abord</strong>, elles permettent a ERIP de savoir avec certitude ce qu\'il faut retirer de vos ' +
      'documents : rien de ce que vous saisissez ici n\'est transmis a un assistant IA sans votre accord explicite.</p>' +
      '<p><strong>Ensuite</strong>, si vous le souhaitez, elles servent a personnaliser automatiquement votre CV et ' +
      'votre lettre de motivation, pour faciliter leur mise en forme dans un gabarit Canva ou Word.</p>' +
      '<p>Ce site est un outil statique, herberge sur GitHub : il ne collecte, ne stocke ni ne conserve aucune de vos ' +
      'donnees. Elles restent uniquement dans votre navigateur, le temps de votre session.</p>' +
      '<div class="text-end"><button type="button" class="btn btn-primary btn-sm" id="fermerInfoIdentiteBtn2">Entendu</button></div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) { fermerModaleInfoIdentite(); } });
  document.getElementById('fermerInfoIdentiteBtn1').addEventListener('click', fermerModaleInfoIdentite);
  document.getElementById('fermerInfoIdentiteBtn2').addEventListener('click', fermerModaleInfoIdentite);
  requestAnimationFrame(function () { overlay.classList.add('visible'); });
}


function ouvrirModaleConfidentialite() {
  if (document.getElementById('modaleConfidentialite')) { return; }
  var overlay = document.createElement('div');
  overlay.id = 'modaleConfidentialite';
  overlay.className = 'confid-overlay';
  overlay.innerHTML =
    '<div class="confid-carte">' +
      '<div class="d-flex justify-content-between align-items-center mb-2">' +
        '<h5 class="mb-0">&#128737;&#65039; Confidentialite de vos donnees</h5>' +
        '<button type="button" id="fermerConfidBtn1" class="btn btn-sm btn-outline-secondary" ' +
          'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      '<p>Les informations que vous renseignez sont utilisees uniquement pour personnaliser votre accompagnement.</p>' +
      '<p>Elles permettent notamment de generer un CV, une lettre de motivation ou de preparer un entretien avec l\'assistant IA.</p>' +
      '<p>Vos informations restent disponibles tant que cette page reste ouverte.</p>' +
      '<p>Elles ne sont pas enregistrees de maniere permanente par l\'application et disparaissent lorsque vous fermez ou rechargez la page.</p>' +
      '<p>Certaines informations peuvent etre automatiquement anonymisees avant d\'etre transmises a l\'assistant IA.</p>' +
      '<p>&#128373;&#65039; Pour une navigation sans trace, ouvrez d\'abord une fenetre privee ' +
      '(Ctrl+Maj+N sur Chrome/Edge, Ctrl+Maj+P sur Firefox), puis revenez sur cette page.</p>' +
      '<div class="text-end"><button type="button" class="btn btn-primary btn-sm" id="fermerConfidBtn2">Fermer</button></div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) { fermerModaleConfidentialite(); } });
  document.getElementById('fermerConfidBtn1').addEventListener('click', fermerModaleConfidentialite);
  document.getElementById('fermerConfidBtn2').addEventListener('click', fermerModaleConfidentialite);
  requestAnimationFrame(function () { overlay.classList.add('visible'); });
}

function pageChoixCV() {
  // Page d'accueil : PAS de bouton Accueil (on y est deja)
  app.innerHTML =
    afficherProgression('cv') +
    '<div class="text-center"><h1>&#128075; Commencons par votre CV</h1>' +
    '<p class="sousTitre">Choisissez votre point de depart.</p></div>' +
    '<div class="objectifs objectifs-accueil">' +
      '<div class="carte' + classeMemoriseSi(dossier.modeCreation, 'nouveau') + '" data-action="mode" data-value="nouveau"><i class="bi bi-stars"></i>' +
        '<h3>Creer un nouveau CV</h3><p>L\'assistant m\'accompagne pas a pas.</p></div>' +
      '<div class="carte' + classeMemoriseSi(dossier.modeCreation, 'pret') + '" data-action="mode" data-value="pret"><i class="bi bi-file-earmark-check"></i>' +
        '<h3>J\'ai deja un CV</h3><p>Je depose mon CV, il est deja complet.</p></div>' +
      '<div class="carte' + classeMemoriseSi(dossier.modeCreation, 'maj') + '" data-action="mode" data-value="maj"><i class="bi bi-pencil-square"></i>' +
        '<h3>Mettre mon CV a jour</h3><p>Je depose mon CV et je le complete.</p></div>' +
    '</div>' +
    // TACHE (mise en page accueil) : Ateliers ERIP (gauche) et Preparer un
    // entretien (droite), remontees legerement, sans toucher les 3 cartes
    // principales ni se chevaucher entre elles.
    '<div class="zone-ateliers-entretien">' +
      '<a href="https://www.linscription.com/pro/catalogue-missionlocale-r.php?P1=11241&P2=411" ' +
        'target="_blank" rel="noopener" class="carte carte-erip"><i>&#127891;</i>' +
        '<h3>Ateliers &amp; visites d\'entreprise</h3>' +
        '<p>Decouvrez gratuitement les ateliers thematiques et les visites d\'entreprise proposes par l\'ERIP du Bergeracois.</p>' +
        '<p class="carte-erip-action">&#128073; Voir les prochaines dates &#8599;</p>' +
      '</a>' +
      '<div class="carte carte-entretien-direct" id="carteEntretienDirect"><i class="bi bi-mic"></i>' +
        '<h3>Préparer un entretien</h3>' +
        '<p>Vous avez déjà un CV ? Lancez directement votre préparation, sans passer par tout le parcours.</p>' +
      '</div>' +
    '</div>' +
    // TACHE 33A : Explorateur de la Base de connaissances ERIP — grand rectangle
    // horizontal centre entre les deux cartes ci-dessus (n'est plus une carte).
    '<div class="zone-recherche-erip-large">' +
      '<input type="text" class="form-control" id="rechercheERIPInput" ' +
      'placeholder="&#128269; Rechercher un metier, une competence, une valeur, une formation...">' +
      '<div id="resultatsRechercheERIP" class="resultats-erip-dropdown"></div>' +
    '</div>' +
    '<div id="overlayRechercheERIP" class="overlay-recherche-erip"></div>' +
    // TACHE 42 : information de confidentialite, uniquement sur l'ecran d'accueil.
    '<button type="button" id="btnConfidentialite" class="lien-confidentialite">&#128737;&#65039; Confidentialite de vos donnees</button>';
  // les clics sur "Mettre a jour" et "J'ai deja un CV" sont interceptes par metiers.js
  // (fenetre de depot). Seul "Creer un nouveau CV" est gere ici.
  document.querySelectorAll('[data-action="mode"]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (this.dataset.value === 'nouveau') {
        dossier.modeCreation = 'nouveau';
        naviguerVers('objectif');
      }
    });
  });
  document.getElementById('btnConfidentialite').addEventListener('click', ouvrirModaleConfidentialite);

  // TACHE 36 : parcours autonome "Preparer un entretien"
  var carteEntretienDirect = document.getElementById('carteEntretienDirect');
  if (carteEntretienDirect) {
    carteEntretienDirect.addEventListener('click', ouvrirFenetreEntretienDirect);
  }

  // TACHE 33A : Explorateur de la Base de connaissances ERIP
  var inputRechercheERIP = document.getElementById('rechercheERIPInput');
  if (inputRechercheERIP) {
    inputRechercheERIP.addEventListener('input', function () {
      rendreResultatsRechercheERIP(this.value);
    });
  }
  // TACHE (mise en page accueil) : un clic en dehors des resultats (sur
  // l'overlay) referme la liste et vide le champ, pour retrouver immediatement
  // le comportement normal de la page.
  var overlayRechercheERIP = document.getElementById('overlayRechercheERIP');
  if (overlayRechercheERIP) {
    overlayRechercheERIP.addEventListener('click', function () {
      if (inputRechercheERIP) { inputRechercheERIP.value = ''; }
      rendreResultatsRechercheERIP('');
    });
  }
  // TACHE (recherche assistant) : clic sur un metier ou une competence dans
  // les resultats -> demarre le parcours guide (choix du parcours, puis
  // entreprise, puis CV). On ferme d'abord les resultats de recherche.
  var zoneResultatsERIP = document.getElementById('resultatsRechercheERIP');
  if (zoneResultatsERIP) {
    zoneResultatsERIP.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; } // lien Fiche ROME : laisser faire, ne pas enchainer
      var carteMetier = e.target.closest('[data-metier-nom]');
      var carteCompetence = e.target.closest('[data-competence-nom]');
      var carteChamp = e.target.closest('[data-champ-associe]');
      if (carteMetier) {
        if (inputRechercheERIP) { inputRechercheERIP.value = ''; }
        rendreResultatsRechercheERIP('');
        ouvrirPanneauChoixParcours(carteMetier.dataset.metierNom);
      } else if (carteCompetence) {
        if (inputRechercheERIP) { inputRechercheERIP.value = ''; }
        rendreResultatsRechercheERIP('');
        ouvrirPanneauMetiersAssocies(carteCompetence.dataset.competenceNom);
      } else if (carteChamp) {
        if (inputRechercheERIP) { inputRechercheERIP.value = ''; }
        rendreResultatsRechercheERIP('');
        ouvrirPanneauMetiersAssociesChamp(carteChamp.dataset.champAssocie, carteChamp.dataset.idAssocie,
          carteChamp.dataset.labelAssocie, carteChamp.dataset.iconAssocie);
      }
    });
  }
}

// TACHE 34 : memorisation visuelle du dernier choix effectue sur un ecran a
// carte unique (un seul choix a la fois, remplace automatiquement par le
// suivant). Reutilise la classe "active-card" existante (meme bleu que les
// ecrans a selection multiple). Generique : utilisable sur n'importe quel
// ecran comparant une valeur memorisee (ex. dossier.objectif) a la valeur
// d'une carte.
function classeMemoriseSi(valeurMemorisee, valeurCarte) {
  return valeurMemorisee === valeurCarte ? ' active-card' : '';
}

function pageObjectif() {
  var items = [
    { id: 'offre', icon: 'bi-file-earmark-text', title: 'Repondre a une offre', desc: 'Adapter votre CV a une offre.' },
    { id: 'spontanee', icon: 'bi-building', title: 'Candidature spontanee', desc: 'Creer un CV pour une entreprise.' },
    { id: 'reconversion', icon: 'bi-arrow-repeat', title: 'Changer de metier', desc: 'Valoriser vos competences.' },
    { id: 'stage', icon: 'bi-mortarboard', title: 'Stage', desc: 'CV adapte a une recherche de stage.' },
    { id: 'alternance', icon: 'bi-people', title: 'Alternance', desc: 'CV adapte a une alternance.' },
    { id: 'pmsmp', icon: 'bi-search', title: 'PMSMP (immersion)', desc: 'Preparer une periode d\'immersion en entreprise.' }
  ];
  var html = afficherProgression('objectif') +
    '<div class="text-center"><h1>&#127919; Quel est votre objectif ?</h1>' +
    '<p class="sousTitre">Nous adapterons votre CV a votre projet.</p></div><div class="objectifs">';
  items.forEach(function (o) {
    html += '<div class="carte' + classeMemoriseSi(dossier.objectif, o.id) + '" data-action="objectif" data-value="' + o.id + '">' +
      '<i class="bi ' + o.icon + '"></i><h3>' + o.title + '</h3><p>' + o.desc + '</p></div>';
  });
  html += '</div>' + barreNavigation('cv', null);
  app.innerHTML = html;
  document.querySelectorAll('[data-action="objectif"]').forEach(function (el) {
    el.addEventListener('click', function () {
      dossier.objectif = this.dataset.value;
      // apres un CV analyse : on saute directement au potentiel
      naviguerVers(dossier.cvAnalyse ? 'revelation' : 'activites');
    });
  });
}

// Fabrique une page a cartes multi-selection (activites, actions, environnement, valeurs)
function pageCartes(config) {
  var selected = dossier[config.champ] || [];
  var limiteAtteinte = config.max && selected.length >= config.max;
  var boutonEffacer = selected.length
    ? '<div class="text-center mb-3"><button class="btn btn-outline-danger btn-effacer" data-effacer="' + config.champ + '">&#10227; Tout deselectionner</button></div>'
    : '';
  var messageLimite = limiteAtteinte
    ? '<div class="message-limite">&#9888;&#65039; Vous avez atteint le maximum de ' + config.max + ' choix. Deselectionnez-en un pour en choisir un autre.</div>'
    : '';
  var html = afficherProgression(config.etape) +
    '<div class="text-center"><h1>' + config.titre + '</h1><p class="sousTitre">' + config.sousTitre + '</p></div>' +
    afficherCompetencesDetectees(config.etape) + messageLimite + boutonEffacer;
  function carteHTML(item) {
    var estSelectionne = selected.indexOf(item.id) !== -1;
    var classes = 'carte' + (estSelectionne ? ' active-card' : '') +
      (limiteAtteinte && !estSelectionne ? ' carte-desactivee' : '');
    return '<div class="' + classes + '" data-type="' + config.champ + '" data-value="' + item.id + '">' +
      '<span class="icone-grille-cat">' + item.icon + '</span><h5>' + item.label + '</h5></div>';
  }
  // Si les items portent une categorie, on affiche des colonnes (une par groupe),
  // 2 cartes par ligne. Sinon (toutes les autres questions), affichage plat identique a avant.
  var aCategories = config.data.some(function (it) { return it.categorie; });
  if (aCategories) {
    var ordre = [];
    var groupes = {};
    config.data.forEach(function (it) {
      var c = it.categorie || 'Autres';
      if (!groupes[c]) { groupes[c] = []; ordre.push(c); }
      groupes[c].push(it);
    });
    html += '<div class="colonnes-cat">';
    ordre.forEach(function (c) {
      html += '<div class="colonne-cat"><h4 class="categorie-titre">' + c + '</h4><div class="grille-cat">';
      groupes[c].forEach(function (item) { html += carteHTML(item); });
      html += '</div></div>';
    });
    html += '</div>';
  } else {
    html += '<div class="objectifs">';
    config.data.forEach(function (item) { html += carteHTML(item); });
    html += '</div>';
  }
  if (config.apresHTML) { html += config.apresHTML(); }
  html += barreNavigation(config.precedent, config.suivant, config.labelSuivant);
  app.innerHTML = html;
  document.querySelectorAll('[data-type="' + config.champ + '"]').forEach(function (el) {
    el.addEventListener('click', function () {
      var val = this.dataset.value;
      var idx = dossier[config.champ].indexOf(val);
      if (idx === -1) {
        // Ajout bloque si la limite est atteinte (desactivation uniquement pour cette question)
        if (config.max && dossier[config.champ].length >= config.max) { return; }
        dossier[config.champ].push(val);
      } else {
        dossier[config.champ].splice(idx, 1);
      }
      pageCartes(config);
    });
  });
  if (config.apresInit) { config.apresInit(); }
  var btnEffacer = document.querySelector('[data-effacer="' + config.champ + '"]');
  if (btnEffacer) {
    btnEffacer.addEventListener('click', function () {
      dossier[config.champ] = [];
      pageCartes(config);
    });
  }
}

function pageActivites() {
  pageSelectionCatalogue({
    champ: 'activites', etape: 'activites',
    titre: '&#128101; Avec qui ou avec quoi travailliez-vous principalement ?',
    sousTitre: 'Choisissez ce qui correspond le mieux a vos experiences.',
    catalogue: CATALOGUE_PERSONNES_MATERIELS_LIEUX, limite: 9,
    titreSelection: 'Vos principaux environnements', iconeSelection: '&#11088;',
    placeholderRecherche: '&#128269; Rechercher une personne, un materiel ou un lieu...',
    precedent: 'objectif', suivant: 'actions', labelSuivant: null
  });
}
// TACHE 21A/21B/22A : etat d'interface des ecrans "catalogue + selection"
// (onglet actif, recherche en cours), une entree par champ du dossier.
// Purement transitoire (pas de sauvegarde), reinitialise a chaque rechargement.
var etatSelectionCatalogue = {};
function etatCatalogue(champ) {
  if (!etatSelectionCatalogue[champ]) { etatSelectionCatalogue[champ] = { onglet: 0, recherche: '' }; }
  return etatSelectionCatalogue[champ];
}
var LIMITE_ACTIONS = 12;

// Retrouve un item complet {id,label,icon,...} a partir de son id, dans un
// catalogue donne (tableau de groupes {categorie, icone, items}).
function trouverItemParId(catalogue, id) {
  for (var i = 0; i < catalogue.length; i++) {
    var groupe = catalogue[i];
    for (var j = 0; j < groupe.items.length; j++) {
      if (groupe.items[j].id === id) { return groupe.items[j]; }
    }
  }
  return null;
}
// TACHE 22C : l'ancienne enveloppe "trouverActionParId()" a ete supprimee —
// deduireCompetences()/obtenirSavoirs() appellent desormais directement
// trouverItemParId(CATALOGUE_ACTIONS_PRO, id), plus simple et sans doublon.

// TACHE 22A : composant generique "catalogue + selection" (onglets, recherche,
// zone de selection avec compteur/limite, catalogue filtre). Reutilise par
// pageActions() et pageActivites() pour un comportement identique dans toute
// l'application. config = { champ, etape, titre, sousTitre, catalogue,
// limite, titreSelection, iconeSelection, placeholderRecherche, precedent,
// suivant, labelSuivant }
function pageSelectionCatalogue(config) {
  dossier[config.champ] = dossier[config.champ] || [];
  var selectedIds = dossier[config.champ];
  var etat = etatCatalogue(config.champ);
  var limiteAtteinte = selectedIds.length >= config.limite;
  var rechercheNormalisee = normaliserTexte(etat.recherche).trim();

  function carteSelectionneeHTML(item) {
    return '<div class="carte active-card action-carte-anim carte-selection-compacte" data-role="deselection" data-value="' + item.id + '">' +
      '<span>' + item.icon + '</span><h5>' + item.label + '</h5></div>';
  }
  function carteCatalogueHTML(item) {
    var classes = 'carte action-carte-anim' + (limiteAtteinte ? ' carte-desactivee' : '');
    return '<div class="' + classes + '" data-role="selection" data-value="' + item.id + '">' +
      '<span class="icone-grille-cat">' + item.icon + '</span><h5>' + item.label + '</h5></div>';
  }

  var itemsSelectionnes = selectedIds.map(function (id) { return trouverItemParId(config.catalogue, id); }).filter(Boolean);
  var zoneSelection = '<div class="cv-section mt-3"><h4>' + config.iconeSelection + ' ' + config.titreSelection + '</h4>' +
    '<p class="compteur-actions">' + selectedIds.length + ' / ' + config.limite + '</p>' +
    '<div class="grille-selection-compacte">' +
    (itemsSelectionnes.length
      ? itemsSelectionnes.map(carteSelectionneeHTML).join('')
      : '<p class="text-muted text-center w-100 mb-0">Aucune selection pour le moment.</p>') +
    '</div>' +
    (selectedIds.length
      ? '<div class="text-center mt-2"><button type="button" class="btn btn-outline-danger btn-effacer-selection">&#10227; Tout deselectionner</button></div>'
      : '') +
    '</div>';

  var onglets = config.catalogue.map(function (groupe, i) {
    return '<button type="button" class="onglet-action' + (i === etat.onglet ? ' actif' : '') +
      '" data-onglet="' + i + '">' + groupe.icone + ' ' + groupe.categorie + '</button>';
  }).join('');

  var itemsCatalogue;
  if (rechercheNormalisee) {
    itemsCatalogue = [];
    config.catalogue.forEach(function (groupe) {
      groupe.items.forEach(function (item) {
        if (selectedIds.indexOf(item.id) === -1 && normaliserTexte(item.label).indexOf(rechercheNormalisee) !== -1) {
          itemsCatalogue.push(item);
        }
      });
    });
  } else {
    itemsCatalogue = config.catalogue[etat.onglet].items.filter(function (item) {
      return selectedIds.indexOf(item.id) === -1;
    });
  }

  var grilleCatalogue = '<div class="objectifs objectifs-catalogue">' +
    (itemsCatalogue.length
      ? itemsCatalogue.map(carteCatalogueHTML).join('')
      : '<p class="text-muted text-center w-100">Aucun element disponible' + (rechercheNormalisee ? ' pour cette recherche' : ' dans cette categorie') + '.</p>') +
    '</div>';

  var messageLimite = limiteAtteinte
    ? '<div class="message-limite">&#9888;&#65039; Vous avez atteint le maximum de ' + config.limite +
      ' selections. Deselectionnez-en une pour en choisir une autre.</div>'
    : '';

  var html = afficherProgression(config.etape) +
    '<div class="text-center"><h1>' + config.titre + '</h1><p class="sousTitre">' + config.sousTitre + '</p></div>' +
    afficherCompetencesDetectees(config.etape) +
    zoneSelection +
    '<div class="cv-section mt-3"><h4>&#128218; Catalogue</h4>' +
    '<div class="recherche-actions"><input type="text" class="form-control" id="rechercheCatalogueInput" ' +
    'placeholder="' + config.placeholderRecherche + '" value="' + echapperAttribut(etat.recherche) + '"></div>' +
    (rechercheNormalisee ? '' : '<div class="onglets-actions">' + onglets + '</div>') +
    messageLimite +
    grilleCatalogue +
    '</div>' +
    (selectedIds.length === 0
      ? '<p class="text-end text-danger small fw-semibold mt-3 mb-0">Un choix suffit pour continuer.</p>'
      : '') +
    barreNavigation(config.precedent, config.suivant, config.labelSuivant, {
      suivantDesactive: selectedIds.length === 0,
      suivantDesactiveMessage: 'Un choix suffit pour continuer.'
    });
  app.innerHTML = html;

  var inputRecherche = document.getElementById('rechercheCatalogueInput');
  inputRecherche.addEventListener('input', function () {
    etat.recherche = this.value;
    pageSelectionCatalogue(config);
  });
  // Redonne le focus (et la position du curseur) apres le re-rendu, pour que
  // la frappe reste fluide malgre la reconstruction complete de la page.
  inputRecherche.focus();
  var pos = inputRecherche.value.length;
  inputRecherche.setSelectionRange(pos, pos);

  document.querySelectorAll('.onglet-action').forEach(function (el) {
    el.addEventListener('click', function () {
      etat.onglet = parseInt(this.dataset.onglet, 10);
      pageSelectionCatalogue(config);
    });
  });

  // Selection : catalogue -> zone selectionnee
  document.querySelectorAll('[data-role="selection"]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (dossier[config.champ].length >= config.limite) { return; } // carte grisee, non selectionnable
      var val = this.dataset.value;
      if (dossier[config.champ].indexOf(val) === -1) { dossier[config.champ].push(val); }
      pageSelectionCatalogue(config);
    });
  });

  // Deselection : zone selectionnee -> retour automatique dans son onglet d'origine
  document.querySelectorAll('[data-role="deselection"]').forEach(function (el) {
    el.addEventListener('click', function () {
      var val = this.dataset.value;
      var idx = dossier[config.champ].indexOf(val);
      if (idx !== -1) { dossier[config.champ].splice(idx, 1); }
      pageSelectionCatalogue(config);
    });
  });

  var btnEffacer = document.querySelector('.btn-effacer-selection');
  if (btnEffacer) {
    btnEffacer.addEventListener('click', function () {
      dossier[config.champ] = [];
      pageSelectionCatalogue(config);
    });
  }
}

function pageActions() {
  pageSelectionCatalogue({
    champ: 'actions', etape: 'actions',
    titre: '&#11088; Que faisiez-vous souvent ?',
    sousTitre: 'Choisissez les actions que vous realisiez regulierement.',
    catalogue: CATALOGUE_ACTIONS_PRO, limite: LIMITE_ACTIONS,
    titreSelection: 'Vos actions selectionnees', iconeSelection: '&#9989;',
    placeholderRecherche: '&#128269; Rechercher une action...',
    precedent: 'activites', suivant: 'environnement', labelSuivant: null
  });
}

function pageEnvironnement() {
  pageSelectionCatalogue({
    champ: 'environnement', etape: 'environnement',
    titre: '&#127757; Dans quel environnement travailliez-vous le plus souvent ?',
    sousTitre: 'Choisissez les environnements qui correspondent le mieux a vos experiences.',
    catalogue: CATALOGUE_ENVIRONNEMENTS_TRAVAIL, limite: 9,
    titreSelection: 'Vos principaux environnements', iconeSelection: '&#11088;',
    placeholderRecherche: '&#128269; Rechercher un environnement...',
    precedent: 'actions', suivant: 'valeurs', labelSuivant: null
  });
}
var CONTRATS = ['CDD', 'CDI', 'Remplacements', 'Intérim'];
var TEMPS_TRAVAIL = ['Temps plein', 'Temps partiel'];
var ACCEPTE = [
  { id: 'alimentaire', label: '&#128181; Emploi alimentaire' },
  { id: 'saisonnier', label: '&#127774; Emploi saisonnier' }
];
var DISPONIBILITES = ['Immédiatement', 'Sous 15 jours', 'Dans un mois', 'Sans préférence'];

// Deux rangées de pastilles : type de contrat et temps de travail.
// "Tout" sélectionne toutes les options de la rangée.
// TACHE (refonte Mon projet, reorganisation en grille) : scinde en deux
// cartes independantes, pour qu'elles puissent se placer cote a cote avec
// les autres blocs (Mobilite, J'accepte...) plutot que dans un seul bloc
// pleine largeur.
// TACHE (refonte Mon projet, Etape D) : rangee de pastilles pure (sans
// titre), reutilisee par Type de contrat et Temps de travail. wireContratTemps
// fonctionne sans changement (memes data-champ/data-val, interroges
// globalement sur la page a chaque rendu).
function contenuPastillesChamp(champ, options) {
  var toutActif = options.every(function (o) { return dossier[champ].indexOf(o) !== -1; }) ? 'actif' : '';
  var pastilles = options.map(function (o) {
    var actif = dossier[champ].indexOf(o) !== -1 ? 'actif' : '';
    return '<span class="pastille ' + actif + '" data-champ="' + champ + '" data-val="' + o + '">' + o + '</span>';
  }).join('');
  return '<div class="pastilles">' + pastilles +
    '<span class="pastille pastille-tout ' + toutActif + '" data-champ="' + champ + '" data-val="__tout">Tout</span>' +
    '</div>';
}

function contenuAccepte() {
  var pastillesAccepte = ACCEPTE.map(function (o) {
    var actif = dossier.accepte.indexOf(o.id) !== -1 ? 'actif' : '';
    return '<span class="pastille ' + actif + '" data-champ="accepte" data-val="' + o.id + '">' + o.label + '</span>';
  }).join('');
  // TACHE (complement) : 3e option, exclusive des 2 precedentes, permet de
  // repondre explicitement "aucune des deux" sans jamais apparaitre dans le
  // resume (elle n'est pas ajoutee a dossier.accepte, juste un indicateur a part).
  pastillesAccepte += '<span class="pastille' + (dossier.accepteAucune ? ' actif' : '') +
    '" data-accepte-aucune="1">Aucune de ces propositions</span>';
  return '<div class="pastilles flex-column align-items-start">' + pastillesAccepte + '</div>';
}

// Conservees pour compatibilite (plus appelees par pageProjet depuis l'Etape D).
function blocTypeContratTemps() {
  return '<div class="bloc-preferences">' +
    '<div class="mt-3"><h5>&#128188; Type de contrat recherché</h5>' + contenuPastillesChamp('contrat', CONTRATS) + '</div>' +
    '<div class="mt-3"><h5>&#8987; Temps de travail</h5>' + contenuPastillesChamp('tempsTravail', TEMPS_TRAVAIL) + '</div>' +
    '</div>';
}

function blocAccepte() {
  return '<div class="bloc-preferences"><h5>&#127919; J\'accepte également</h5>' + contenuAccepte() + '</div>';
}

function wireContratTemps() {
  var optionsPar = { contrat: CONTRATS, tempsTravail: TEMPS_TRAVAIL, accepte: ['alimentaire', 'saisonnier'] };
  // Uniquement les pastilles contrat/temps/accepte (data-champ) : ne pas capter
  // les pastilles de disponibilite (data-dispo), gerees par wireObjectifDetails.
  document.querySelectorAll('.pastille[data-champ]').forEach(function (el) {
    el.addEventListener('click', function () {
      var champ = this.dataset.champ;
      var val = this.dataset.val;
      var options = optionsPar[champ];
      if (val === '__tout') {
        // si tout n'est pas deja complet, on coche tout ; sinon on decoche tout
        var complet = options.every(function (o) { return dossier[champ].indexOf(o) !== -1; });
        dossier[champ] = complet ? [] : options.slice();
      } else {
        var idx = dossier[champ].indexOf(val);
        if (idx === -1) { dossier[champ].push(val); } else { dossier[champ].splice(idx, 1); }
      }
      // TACHE (complement) : choisir une vraie option "J'accepte" annule
      // automatiquement "Aucune de ces propositions" (mutuellement exclusifs).
      if (champ === 'accepte' && dossier.accepte.length > 0) { dossier.accepteAucune = false; }
      routes[pageActuelle]();   // rafraichit la page courante (Attentes OU Potentiel)
    });
  });
  // TACHE (complement) : pastille "Aucune de ces propositions", exclusive
  // des 2 precedentes -- la selectionner vide dossier.accepte.
  document.querySelectorAll('[data-accepte-aucune]').forEach(function (el) {
    el.addEventListener('click', function () {
      dossier.accepteAucune = !dossier.accepteAucune;
      if (dossier.accepteAucune) { dossier.accepte = []; }
      routes[pageActuelle]();
    });
  });
}

function pageValeurs() {
  pageSelectionCatalogue({
    champ: 'valeurs', etape: 'valeurs',
    titre: '&#10084;&#65039; Qu\'est-ce qui est important pour vous dans un travail ?',
    sousTitre: 'Choisissez ce qui compte le plus pour vous.',
    catalogue: CATALOGUE_VALEURS_PROFESSIONNELLES, limite: 5,
    titreSelection: 'Vos priorites', iconeSelection: '&#11088;',
    placeholderRecherche: '&#128269; Rechercher une valeur...',
    precedent: 'environnement', suivant: 'projet', labelSuivant: 'Continuer &#8594;'
  });
}

/* ------------------------------------------------------------
   6. PAGE POTENTIEL (revelation)
   ------------------------------------------------------------ */
// Message VAE : affiche si la personne a de l'experience (formelle ou
// aupres de proches) mais aucun diplome enregistre.
// TACHE (complement) : passe en accordeon (replie par defaut, reutilise
// blocAccordeon()/wireAccordeon() deja existants), phrase corrigee, et SEUL
// "VAE" reste en gras (plus le reste de la phrase).
function messageVAE() {
  var aExperience = dossier.experiences.length > 0 || dossier.activites.indexOf('famille') !== -1 || dossier.cvAnalyse;
  var aDiplome = !!dossier.niveauFormation;
  if (aExperience && !aDiplome) {
    return '<div class="message-vae-accordeon">' +
      blocAccordeon('vae', '&#128161; Vous avez de l\'expérience sans diplôme correspondant ?', '',
        '<p class="mb-0">Cette expérience, même auprès de proches ou de la famille, peut être reconnue par une ' +
        '<strong>VAE</strong> (Validation des Acquis de l\'Expérience). ' +
        'Parlez-en à votre conseiller pour vous renseigner.</p>') +
      '</div>';
  }
  return '';
}

// TACHE (nettoyage) : ancienne fonction "Pistes a explorer" (code mort,
// jamais appelee nulle part dans l'application) supprimee -- son texte
// ("Cliquez sur un metier pour ouvrir sa fiche France Travail dans un
// nouvel onglet") correspondait au panneau que l'utilisateur ne souhaite
// pas voir.

// Métiers proches d'un métier cible (partagent des compétences),
// pour faire découvrir des opportunités quand la personne n'a rien choisi.
function metiersProchesDe(nom) {
  var fiche = metierParNom(nom);
  if (!fiche) { return []; }
  var profil = {
    activites: fiche.activites, actions: fiche.actions, environnement: fiche.environnement,
    valeurs: fiche.valeurs, savoirFaire: fiche.savoirFaire, savoirEtre: fiche.savoirEtre, savoirs: fiche.savoirs
  };
  return rechercherMetiers(profil, 6).filter(function (m) { return m.nom !== fiche.nom; }).slice(0, 5);
}

// Choix des métiers affichés sur la page Potentiel.
// Si la personne n'a rien choisi mais vise un métier (offre ou saisi),
// on propose des métiers proches pour ouvrir des pistes.
function metiersRevelation() {
  if (!rienEteChoisi()) { return metiersPourAffichage(); }
  var actif = (dossier.objectif && dossier[dossier.objectif]) || {};
  var cible = actif.poste || dossier.metierCible || (dossier.metiersAjoutes[0] || '');
  if (cible) {
    var proches = metiersProchesDe(cible);
    if (proches.length) { return proches; }
  }
  return metiersPourAffichage();
}

// Bloc de détails selon l'objectif (offre, stage, alternance, immersion).
// Ces informations alimentent le prompt IA (CV, lettre, entretien).
// Composant reutilisable : bloc de pastilles "Disponibilite".
// Meme markup partout (candidature ET stage/alternance/immersion).
function blocDisponibilite(dispoArr) {
  if (!Array.isArray(dispoArr)) { dispoArr = []; }
  var pastilles = DISPONIBILITES.map(function (dp) {
    var actif = dispoArr.indexOf(dp) !== -1 ? 'actif' : '';
    return '<span class="pastille ' + actif + '" data-dispo="' + dp + '">' + dp + '</span>';
  }).join('');
  return '<p class="mb-2">Disponibilité (plusieurs choix possibles)</p>' +
    '<div class="pastilles">' + pastilles + '</div>';
}

// TACHE (refonte Mon projet, Etape E) : contenu pur (sans enveloppe carte/
// titre, et sans le bouton croix individuel — desormais remplace par la
// croix rouge + confirmation du bloc "Candidature", qui n'a qu'une seule
// sous-section). Le bouton "Importer" est conserve (fonction distincte :
// copier depuis un autre parcours deja renseigne).
function contenuCandidature() {
  var o = dossier.objectif;
  if (o === 'offre' || o === 'spontanee' || o === 'reconversion') {
    var of = dossier[o];
    if (!Array.isArray(of.dispo)) { of.dispo = []; }
    of.type = GROUPE_CANDIDATURE.noms[o];
    var intro, labelLien, labelStructure, labelPoste;
    if (o === 'offre') {
      intro = 'Deux possibilités : collez le lien de l\'offre, ou bien indiquez l\'entreprise et le poste. ' +
        'Ces informations permettront à l\'IA de se renseigner sur l\'entreprise et d\'adapter votre CV, votre lettre et votre entretien.';
      labelLien = 'Lien de l\'offre (internet)';
      labelStructure = 'Nom de l\'entreprise';
      labelPoste = 'Poste visé';
    } else if (o === 'spontanee') {
      intro = 'Candidature spontanée : indiquez l\'entreprise et le poste souhaité. Le lien d\'offre est facultatif. ' +
        'Ces informations personnaliseront votre CV, votre lettre et votre entretien.';
      labelLien = 'Lien d\'une offre (facultatif)';
      labelStructure = 'Nom de l\'entreprise';
      labelPoste = 'Poste souhaité';
    } else {
      intro = 'Changement de métier : indiquez le métier visé, et éventuellement une entreprise cible. ' +
        'Ces informations aideront l\'IA à adapter les compétences mises en avant, votre CV, votre lettre et votre entretien.';
      labelLien = 'Adresse internet (facultatif)';
      labelStructure = 'Entreprise cible (facultatif)';
      labelPoste = 'Métier visé';
    }
    var champLien = '<div class="mb-3"><label class="form-label small">' + labelLien + '</label>' +
      '<input type="url" class="form-control form-control-sm" id="offreLien" placeholder="https://..." value="' + (of.lien || '') + '"></div>';
    var boutonImportCand = autresSectionsG(GROUPE_CANDIDATURE, o)
      ? '<div class="text-end mb-2"><button class="btn btn-sm btn-outline-primary" id="importDetails">&#128229; Importer des informations</button></div>'
      : '';
    return boutonImportCand +
      '<p class="mb-2">' + intro + '</p>' +
      champLien +
      '<div class="row g-2">' +
      '<div class="col-md-6"><input type="text" class="form-control form-control-sm" id="offreStructure" placeholder="' + labelStructure + '" value="' + (of.structure || '') + '"></div>' +
      '<div class="col-md-6"><input type="text" class="form-control form-control-sm" id="offrePoste" placeholder="' + labelPoste + '" value="' + (of.poste || '') + '"></div>' +
      '</div>';
  }
  if (o === 'stage' || o === 'alternance' || o === 'pmsmp') {
    var im = dossier[CLE_DETAILS[o]];
    im.type = NOM_SECTION[o];
    var boutonImport = autresSectionsRenseignees(o)
      ? '<div class="text-end mb-2"><button class="btn btn-sm btn-outline-primary" id="importDetails">&#128229; Importer des informations</button></div>'
      : '';
    return boutonImport +
      '<p class="mb-2">Si vous connaissez déjà ces informations, renseignez-les : elles seront transmises à l\'IA.</p>' +
      '<div class="mb-3"><label class="form-label small">Adresse internet (facultatif)</label>' +
      '<input type="url" class="form-control form-control-sm" id="immLien" placeholder="https://..." value="' + (im.lien || '') + '"></div>' +
      '<div class="row g-2">' +
      '<div class="col-md-6"><input type="text" class="form-control form-control-sm" id="immStructure" placeholder="Nom de la structure" value="' + (im.structure || '') + '"></div>' +
      '<div class="col-md-6"><input type="text" class="form-control form-control-sm" id="immPoste" placeholder="Poste visé" value="' + (im.poste || '') + '"></div>' +
      '</div>' +
      '<div class="row g-2 mt-1">' +
      '<div class="col-md-4"><input type="text" class="form-control form-control-sm" id="immDuree" placeholder="Durée" value="' + (im.duree || '') + '"></div>' +
      '<div class="col-md-4"><input type="text" class="form-control form-control-sm" id="immDates" placeholder="Dates" value="' + (im.dates || '') + '"></div>' +
      '<div class="col-md-4"><input type="text" class="form-control form-control-sm" id="immHeures" placeholder="Heures / semaine" value="' + (im.heures || '') + '"></div>' +
      '</div>';
  }
  return '<p class="text-muted small">Aucun parcours de candidature sélectionné.</p>';
}

// Conservee pour compatibilite (plus appelee par pageProjet depuis l'Etape E).
function blocObjectifDetails() {
  return '<div class="bloc-preferences mt-4' + (doitMettreEnEvidence('candidature') ? ' a-completer' : '') + '" id="blocCandidatureCible">' +
    '<h4>&#128221; Informations sur votre candidature</h4>' + contenuCandidature() + '</div>';
}

// TÂCHE 25 : chaque parcours a son propre stockage independant.
var CLE_DETAILS = { stage: 'stage', alternance: 'alternance', pmsmp: 'immersion' };
var NOM_SECTION = { stage: 'Stage', alternance: 'Alternance', pmsmp: 'Immersion (PMSMP)' };

// Deux familles de rubriques partageant le meme systeme (import + croix).
var GROUPE_IMMERSION = {
  modes: ['stage', 'alternance', 'pmsmp'],
  cle: CLE_DETAILS,
  noms: NOM_SECTION,
  champs: ['structure', 'duree', 'dates', 'heures'],
  viderDispo: true
};
var GROUPE_CANDIDATURE = {
  modes: ['offre', 'spontanee', 'reconversion'],
  cle: { offre: 'offre', spontanee: 'spontanee', reconversion: 'reconversion' },
  noms: { offre: 'Répondre à une offre', spontanee: 'Candidature spontanée', reconversion: 'Changer de métier' },
  champs: ['lien', 'entreprise', 'poste'],
  viderDispo: false
};

// TÂCHE 8 : les informations sont-elles suffisantes pour personnaliser
// la lettre de motivation et la preparation d'entretien ?
// - offre / spontanee : entreprise ET poste requis
// - reconversion : poste requis (entreprise facultative)
// - stage / alternance / pmsmp : nom de la structure requis
// Complement tache 8 : un CV est "disponible" des qu'il existe un CV de reference
// dans le Dossier Candidat, cree via le parcours ERIP ou importe et analyse.
// Utilise pour activer la carte "Creer votre CV" et pour eviter de redemander
// un CV deja fourni lors de la lettre de motivation ou de l'entretien.
function cvDisponible() {
  return dossier.modeCreation === 'nouveau' || dossier.cvAnalyse === true;
}

function informationsCandidatureSuffisantes() {
  var o = dossier.objectif;
  if (o === 'offre' || o === 'spontanee') {
    var c = dossier[o];
    return !!(c && c.structure && c.poste);
  }
  if (o === 'reconversion') {
    return !!(dossier.reconversion && dossier.reconversion.poste);
  }
  if (o === 'stage' || o === 'alternance' || o === 'pmsmp') {
    var im = dossier[CLE_DETAILS[o]];
    return !!(im && im.structure);
  }
  return true;   // aucun objectif de candidature en cours : rien a signaler
}

function sectionGRenseignee(groupe, cle) {
  var s = dossier[cle];
  return !!(s && groupe.champs.some(function (f) { return s[f]; }));
}
// Vrai si au moins une AUTRE section du groupe contient des donnees.
function autresSectionsG(groupe, oCourant) {
  return groupe.modes.some(function (o) {
    return o !== oCourant && sectionGRenseignee(groupe, groupe.cle[o]);
  });
}
// Vide uniquement la section courante (apres confirmation).
function supprimerSectionG(groupe, oCourant) {
  confirmerAction(
    'Supprimer cette section ?',
    'Supprimer toutes les informations de cette section ?',
    'Supprimer', 'btn-danger',
    function () {
      var s = dossier[groupe.cle[oCourant]];
      groupe.champs.forEach(function (f) { s[f] = ''; });
      if (groupe.viderDispo && Array.isArray(s.dispo)) { s.dispo = []; }
      pageRevelation();
    }
  );
}
// Fenetre d'import : copie les champs (pas la disponibilite) d'une autre section
// vers la section courante, sans reference partagee.
function ouvrirImportG(groupe, oCourant) {
  var cleCourante = groupe.cle[oCourant];
  var sources = groupe.modes.filter(function (o) {
    return o !== oCourant && sectionGRenseignee(groupe, groupe.cle[o]);
  });
  if (!sources.length) { return; }
  var radios = sources.map(function (o, i) {
    return '<label class="import-option"><input type="radio" name="importSrc" value="' + groupe.cle[o] + '"' + (i === 0 ? ' checked' : '') + '> ' + groupe.noms[o] + '</label>';
  }).join('');
  var overlay = document.createElement('div');
  overlay.className = 'modal-confirmation';
  overlay.innerHTML = '<div class="modal-boite"><h3>Importer les informations depuis :</h3>' + radios +
    '<div class="modal-actions"><button class="btn btn-outline-secondary" data-role="annuler">Annuler</button>' +
    '<button class="btn btn-primary" data-role="importer">Importer</button></div></div>';
  document.body.appendChild(overlay);
  function fermer() { if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); } }
  overlay.querySelector('[data-role="annuler"]').addEventListener('click', fermer);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) { fermer(); } });
  overlay.querySelector('[data-role="importer"]').addEventListener('click', function () {
    var sel = overlay.querySelector('input[name="importSrc"]:checked');
    if (sel) {
      var src = dossier[sel.value];
      var dst = dossier[cleCourante];
      groupe.champs.forEach(function (f) { dst[f] = src[f]; });
    }
    fermer();
    pageRevelation();
  });
}

// Adaptateurs immersion : memes noms qu'avant, delegant au systeme generique.
function autresSectionsRenseignees(o) { return autresSectionsG(GROUPE_IMMERSION, o); }
function supprimerSectionDetails(o) { supprimerSectionG(GROUPE_IMMERSION, o); }
function ouvrirImportDetails(o) { ouvrirImportG(GROUPE_IMMERSION, o); }

function wireObjectifDetails() {
  function lier(id, obj, cle) {
    var el = document.getElementById(id);
    if (el) { el.addEventListener('input', function () { obj[cle] = this.value; }); }
  }
  var oSection = dossier.objectif;
  if (oSection === 'offre' || oSection === 'spontanee' || oSection === 'reconversion') {
    // Candidature : chaque mode a son propre stockage dossier[oSection]
    var cand = dossier[oSection];
    lier('offreLien', cand, 'lien');
    lier('offrePoste', cand, 'poste');
    lier('offreStructure', cand, 'structure');
    var impC = document.getElementById('importDetails');
    if (impC) { impC.addEventListener('click', function () { ouvrirImportG(GROUPE_CANDIDATURE, oSection); }); }
  } else if (oSection === 'stage' || oSection === 'alternance' || oSection === 'pmsmp') {
    var sect = dossier[CLE_DETAILS[oSection]];
    lier('immStructure', sect, 'structure');
    lier('immPoste', sect, 'poste');
    lier('immLien', sect, 'lien');
    lier('immDuree', sect, 'duree');
    lier('immDates', sect, 'dates');
    lier('immHeures', sect, 'heures');
    var imp = document.getElementById('importDetails');
    if (imp) { imp.addEventListener('click', function () { ouvrirImportDetails(oSection); }); }
  }
}

// TACHE (refonte Mon projet, Etape D) : Disponibilite devient une sous-section
// autonome du bloc "Projet professionnel", independante des details de
// candidature (qui restent dans blocObjectifDetails/wireObjectifDetails ci-
// dessus, en attendant l'Etape E). reutilise blocDisponibilite() telle quelle.
function contenuDisponibilite() {
  var of = (dossier.objectif && dossier[dossier.objectif]) || {};
  return blocDisponibilite(of.dispo);
}
function wireDisponibilite(rerender) {
  var of = (dossier.objectif && dossier[dossier.objectif]) || null;
  if (of && !Array.isArray(of.dispo)) { of.dispo = []; }
  document.querySelectorAll('[data-dispo]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (!of) { return; }
      var dp = this.dataset.dispo;
      var sansPref = 'Sans préférence';
      var liste = of.dispo;
      if (dp === sansPref) {
        of.dispo = (liste.length === 1 && liste[0] === sansPref) ? [] : [sansPref];
      } else {
        var sp = liste.indexOf(sansPref);
        if (sp !== -1) { liste.splice(sp, 1); }
        var idx = liste.indexOf(dp);
        if (idx === -1) { liste.push(dp); } else { liste.splice(idx, 1); }
      }
      rerender();
    });
  });
}

// Complement tache 8 : fonctions de cablage generiques, reutilisees par pageResultats
// et pageRevelation puisque Mobilite et Formations peuvent maintenant s'afficher
// sur l'ecran Revelation (mise en evidence) tout en restant les memes blocs.
// TACHE 43 : cablage de la rubrique "Mon identite". Les champs texte ne
// provoquent pas de rerender (pour ne pas perdre le focus a chaque frappe) ;
// civilite et anonymiser/personnaliser (pastilles) redessinent la page.
function wireIdentite(rerender) {
  dossier.identite = dossier.identite || { civilite: null, nom: '', prenom: '', adresse: '', telephone: '', email: '', ville: '', age: '' };
  // TACHE (refonte Mon projet, bloc 1) : civilite en pastilles cliquables
  // (remplace les anciens boutons radio), meme principe que .permis-cat.
  document.querySelectorAll('[data-civilite]').forEach(function (el) {
    el.addEventListener('click', function () {
      dossier.identite.civilite = this.dataset.civilite || null;
      // TACHE (demande : synchronisation) : repercute en direct dans la
      // fenetre IA (Creer CV/Lettre/Entretien) si elle est encore ouverte,
      // sans avoir a la refermer/rouvrir pour voir le changement.
      try {
        if (fenetreIAOuverte && !fenetreIAOuverte.closed && typeof fenetreIAOuverte.synchroniserCivilite === 'function') {
          fenetreIAOuverte.synchroniserCivilite(dossier.identite.civilite);
        }
      } catch (err) { /* fenetre inaccessible (fermee, autre origine...) : ignore */ }
      rerender();
    });
  });
  var champs = { identiteNom: 'nom', identitePrenom: 'prenom', identiteAdresse: 'adresse', identiteTelephone: 'telephone', identiteEmail: 'email', identiteVille: 'ville', identiteAge: 'age' };
  Object.keys(champs).forEach(function (idChamp) {
    var el = document.getElementById(idChamp);
    if (el) { el.addEventListener('input', function () { dossier.identite[champs[idChamp]] = this.value; }); }
  });
  // TACHE (refonte Mon projet, bloc 1) : Anonymiser/Personnaliser en pastilles
  // cliquables (fusion de l'ancienne rubrique "Confidentialite" separee).
  document.querySelectorAll('[data-anon]').forEach(function (el) {
    el.addEventListener('click', function () { dossier.anonymiser = (this.dataset.anon === 'oui'); rerender(); });
  });
  var btnInfo = document.getElementById('btnInfoConfidentialite');
  if (btnInfo) { btnInfo.addEventListener('click', ouvrirModaleInfoIdentite); }
}

function wireMobilite(rerender) {
  var permisOui = document.getElementById('permisOui');
  var permisNon = document.getElementById('permisNon');
  if (permisOui) { permisOui.addEventListener('click', function () { dossier.permis.possede = true; rerender(); }); }
  if (permisNon) { permisNon.addEventListener('click', function () { dossier.permis.possede = false; dossier.permis.categories = []; dossier.permis.vehicule = null; rerender(); }); }
  document.querySelectorAll('.permis-cat').forEach(function (el) {
    el.addEventListener('click', function () {
      var cat = this.dataset.permis;
      var idx = dossier.permis.categories.indexOf(cat);
      if (idx === -1) { dossier.permis.categories.push(cat); } else { dossier.permis.categories.splice(idx, 1); }
      rerender();
    });
  });
  var vehiculeOui = document.getElementById('vehiculeOui');
  var vehiculeNon = document.getElementById('vehiculeNon');
  if (vehiculeOui) { vehiculeOui.addEventListener('click', function () { dossier.permis.vehicule = true; rerender(); }); }
  if (vehiculeNon) { vehiculeNon.addEventListener('click', function () { dossier.permis.vehicule = false; rerender(); }); }
}

function wireFormation(rerender) {
  // Pastilles de niveau (une seule valeur a la fois). Cliquer sur le niveau
  // deja actif l'efface (remplace l'ancien bouton "Effacer le niveau").
  document.querySelectorAll('[data-niveau-diplome]').forEach(function (el) {
    el.addEventListener('click', function () {
      var rncp = parseInt(this.dataset.niveauDiplome, 10);
      if (dossier.niveauFormation && dossier.niveauFormation.niveauRNCP === rncp) {
        dossier.niveauFormation = null;
        rerender();
        return;
      }
      var n = NIVEAUX_DIPLOME_SIMPLES.filter(function (x) { return x.rncp === rncp; })[0];
      if (!n) { return; }
      dossier.niveauFormation = { niveauRNCP: n.rncp, niveauVisible: n.label, intitule: '', annee: '' };
      rerender();
    });
  });
  var champIntituleNiveau = document.getElementById('niveauFormationIntitule');
  if (champIntituleNiveau) {
    champIntituleNiveau.addEventListener('input', function () {
      if (dossier.niveauFormation) { dossier.niveauFormation.intitule = this.value; }
    });
  }
  var champAnneeNiveau = document.getElementById('niveauFormationAnnee');
  if (champAnneeNiveau) {
    champAnneeNiveau.addEventListener('input', function () {
      if (dossier.niveauFormation) { dossier.niveauFormation.annee = this.value; }
    });
  }
}

// Deplacement Langues (Action -> Mon projet) : cablage regroupe pour etre
// appelable depuis n'importe quel ecran (parametre rerender).
function wireLangues(rerender) {
  var langueSelect = document.getElementById('langueSelect');
  if (langueSelect) {
    langueSelect.addEventListener('change', function () {
      var autre = document.getElementById('langueAutre');
      if (this.value === '__autre') { autre.classList.remove('d-none'); }
      else { autre.classList.add('d-none'); }
    });
  }
  var langueBtn = document.getElementById('ajouterLangueBtn');
  if (langueBtn) {
    langueBtn.addEventListener('click', function () {
      // TACHE (refonte Mon projet) : plafond a 5 langues, comme les autres catalogues.
      if (dossier.langues.length >= LIMITE_CATALOGUE_RESUME) {
        alert('Vous avez atteint le maximum de ' + LIMITE_CATALOGUE_RESUME + ' langues. Retirez-en une avant d\'en ajouter une autre.');
        return;
      }
      var sel = document.getElementById('langueSelect').value;
      var autre = document.getElementById('langueAutre').value.trim();
      var langue = sel === '__autre' ? autre : sel;
      if (!langue) { alert('Choisissez ou saisissez une langue.'); return; }
      dossier.langues.push({
        langue: langue,
        niveau: document.getElementById('langueNiveau').value
      });
      rerender();
    });
  }
}

// Suppressions (experience, formation, loisir, langue, experience perso) :
// reutilisee par les deux ecrans selon le type d'element affiche.
function wireRemoveItems(rerender) {
  document.querySelectorAll('.remove-item').forEach(function (el) {
    el.addEventListener('click', function () {
      var idx = parseInt(this.dataset.index, 10);
      var type = this.dataset.type;
      if (type === 'exp') { dossier.experiences.splice(idx, 1); }
      else if (type === 'form') { dossier.formations.splice(idx, 1); }
      else if (type === 'langue') { dossier.langues.splice(idx, 1); }
      rerender();
    });
  });
}

/* ------------------------------------------------------------
   NOUVELLE ETAPE : PAGE MON PROJET (projet)
   Squelette pour l'instant : le contenu (contrat, temps de travail,
   candidature, disponibilite, mobilite, formations, certifications,
   loisirs/engagements/perso) sera ajoute etape par etape.
   ------------------------------------------------------------ */
// Etape 4 : configuration du catalogue Loisirs (composant generique etape 3)
var CONFIG_LOISIRS = {
  cle: 'loisirs',
  titre: '&#127917; Loisirs',
  question: 'Souhaitez-vous indiquer vos loisirs ?',
  catalogue: CATALOGUE_LOISIRS,
  avecDetail: false
};

// Etape 5 : configuration du catalogue Engagements (composant generique etape 3)
var CONFIG_ENGAGEMENTS = {
  cle: 'engagements',
  titre: '&#129309; Engagements',
  question: 'Souhaitez-vous indiquer des engagements ?',
  catalogue: CATALOGUE_ENGAGEMENTS,
  avecDetail: false
};

// Etape 6 : configuration du catalogue Experiences et savoir-faire personnels
// (composant generique etape 3, avec detail optionnel par pastille)
var CONFIG_EXPERIENCES_PERSO = {
  cle: 'experiencesPerso',
  titre: '&#129513; Expériences et savoir-faire personnels',
  question: 'Souhaitez-vous indiquer des expériences personnelles ?',
  catalogue: CATALOGUE_EXPERIENCES_PERSO,
  avecDetail: true,
  champValeur: 'intitule'
};

// Etape 8 : configuration du catalogue Certifications (variante directe,
// sans bascule Oui/Non)
var CONFIG_CERTIFICATIONS = {
  cle: 'certifications',
  titre: '&#127942; Certifications',
  question: 'Souhaitez-vous indiquer des certifications ?',
  labelAjouter: 'Ajouter une certification',
  catalogue: CATALOGUE_CERTIFICATIONS,
  avecDetail: false
};

function pageProjet() {
  var html = afficherProgression('projet') +
    '<div class="text-center"><h1>&#128203; Mon projet</h1>' +
    '<p class="sousTitre">Les informations qui personnaliseront votre candidature.</p></div>' +
    '<div class="grille-mon-projet">' +
    '<div class="rangee-mon-projet">' + blocERIP(CONFIG_BLOC_VOUS) + blocERIP(CONFIG_BLOC_CANDIDATURE) + '</div>' +
    '<div class="rangee-mon-projet">' + blocERIP(CONFIG_BLOC_PROJET) + blocERIP(CONFIG_BLOC_PARCOURS) + blocERIP(CONFIG_BLOC_COMPLEMENTS) + '</div>' +
    '</div>' +
    // TACHE (complement) : barre de navigation fixee en bas de l'ecran,
    // toujours visible sans avoir a defiler, quel que soit le nombre de
    // blocs ouverts/replies. Uniquement sur cette page (classe dediee) :
    // les autres ecrans gardent leur barre de navigation normale, en flux.
    '<div class="barre-navigation-fixe">' + barreNavigation('valeurs', 'revelation', '&#128302; Révéler mon potentiel') + '</div>';
  app.innerHTML = html;

  wireBlocERIP(CONFIG_BLOC_VOUS, pageProjet);
  wireBlocERIP(CONFIG_BLOC_PARCOURS, pageProjet);
  wireBlocERIP(CONFIG_BLOC_PROJET, pageProjet);
  wireBlocERIP(CONFIG_BLOC_CANDIDATURE, pageProjet);
  wireBlocERIP(CONFIG_BLOC_COMPLEMENTS, pageProjet);
  wireContratTemps();
}

// TACHE (refonte Potentiel, Etape A) : bandeau "Metier cible", toujours
// visible en haut de la page Potentiel, meme si aucun metier n'est encore
// choisi. Rappelle en permanence pour quel metier la candidature est en
// train d'etre personnalisee -- reutilise metierParNom()/lienFicheROME()
// deja existantes (metiers.js), aucune duplication.
// TACHE (complement) : bandeau enrichi -- texte explicatif, choix
// specifique/secteur (reutilise dossier.typeCV, deja existant et deja
// utilise sur l'ecran Action -- une seule source de verite, pas de champ
// duplique), trombone ROME, et le nom du metier redevient cliquable (le
// meme clic que partout ailleurs : recliquer retire le metier cible,
// data-metier-cible deja cable globalement par wireMetierCibleGlobal).
// TACHE (refonte Metier(s) cible(s)) : fonctions centrales, utilisees par
// TOUS les points d'entree qui permettent de "cibler" un metier sur la page
// Potentiel (resume Metiers recommandes, Voir tous les metiers, Autres
// pistes, panneaux de competences/criteres associes, mini-classement de
// "Ce qui vous correspond", recherche du bandeau, et parcours guide de
// l'accueil). Un seul candidat = automatiquement "Ce metier" ; plusieurs
// candidats = choix explicite requis (metier precis OU secteur d'activite).
var LIMITE_METIERS_CANDIDATS = 5;
// TACHE (complement, limite 5 metiers) : un metier est "bloque" s'il n'est
// pas deja candidat ET que la limite est atteinte -- utilise partout ou un
// metier est propose a l'ajout (cartes, resultats de recherche), pour le
// griser et empecher le clic AVANT d'en arriver a l'alerte.
function metierEstBloque(nom) {
  return dossier.metiersCandidats.indexOf(nom) === -1 &&
    dossier.metiersCandidats.length >= LIMITE_METIERS_CANDIDATS;
}
function ajouterMetierCandidat(nom) {
  if (dossier.metiersCandidats.indexOf(nom) === -1) {
    // Garde-fou silencieux : l'affichage empeche deja normalement d'arriver
    // ici (metiers grises, non cliquables), le message sous les pastilles
    // du bandeau explique la limite -- plus besoin d'une alerte intrusive.
    if (dossier.metiersCandidats.length >= LIMITE_METIERS_CANDIDATS) { return; }
    dossier.metiersCandidats.push(nom);
  }
  majMetierCibleAuto();
}
function retirerMetierCandidat(nom) {
  var idx = dossier.metiersCandidats.indexOf(nom);
  if (idx !== -1) { dossier.metiersCandidats.splice(idx, 1); }
  majMetierCibleAuto();
}
// TACHE (demande, correction) : plus AUCUNE selection automatique, meme a 1
// seul candidat -- la personne doit toujours passer explicitement par "Ce
// métier" (des fonctions necessaires vivent derriere ce bouton, ex. choix
// CV general/specifique). L'auto-selection a 1 candidat court-circuitait ca.
function majMetierCibleAuto() {
  dossier.metierCible = null;
  dossier.modeMetierCible = null;
  dossier.secteurCible = null;
}
// TACHE (demande) : "Tout effacer" vide desormais AUSSI les metiers hors
// repertoire (avant, seuls les candidats "classiques" etaient vides).
function viderMetiersCandidats() {
  dossier.metiersCandidats = [];
  dossier.metiersHorsRepertoire = [];
  dossier.metierCible = null;
  dossier.modeMetierCible = null;
  dossier.secteurCible = null;
}

// TACHE (demande : metiers hors repertoire) : jusqu'a 3 intitules libres,
// distincts des 5 candidats "classiques" (ne comptent pas dans cette limite).
// Pas de fiche ROME ni de competences associees pour ces metiers-la.
var LIMITE_METIERS_HORS_REPERTOIRE = 3;
function metierEstHorsRepertoire(nom) {
  return dossier.metiersHorsRepertoire.indexOf(nom) !== -1;
}
function ajouterMetierHorsRepertoire(nom) {
  nom = (nom || '').trim();
  if (!nom) { return false; }
  if (dossier.metiersHorsRepertoire.length >= LIMITE_METIERS_HORS_REPERTOIRE) { return false; }
  if (dossier.metiersHorsRepertoire.indexOf(nom) !== -1) { return false; }
  dossier.metiersHorsRepertoire.push(nom);
  return true;
}
function retirerMetierHorsRepertoire(nom) {
  var idx = dossier.metiersHorsRepertoire.indexOf(nom);
  if (idx !== -1) { dossier.metiersHorsRepertoire.splice(idx, 1); }
  if (dossier.metierCible === nom) {
    dossier.metierCible = null;
    dossier.modeMetierCible = null;
  }
}
// TACHE (demande : meme fenetre que le circuit classique) : ouvre le meme
// panneau que "Choisissez le metier" (ouvrirPanneauChoixMetierParmiCandidats)
// -- le metier hors repertoire affiche en grand + choix CV general/specifique
// juste en dessous, au lieu d'une simple selection directe silencieuse.
function ouvrirPanneauChoixMetierHorsRepertoire(nom, rerender) {
  var ligne = '<div class="ligne-metier-associe" data-metier-hr-confirmer="' + echapperAttribut(nom) + '"><span>' + echapperAttribut(nom) + '</span></div>';
  var panneau = ouvrirPanneauGuide('&#127919; Choisissez le metier',
    '<p class="text-muted small">Métier retenu pour lequel personnaliser votre CV, votre lettre de motivation et votre préparation à l\'entretien :</p>' + ligne +
    '<hr>' + blocTypeCV());
  panneau.querySelectorAll('[data-metier-hr-confirmer]').forEach(function (el) {
    el.addEventListener('click', function () {
      dossier.metierCible = this.dataset.metierHrConfirmer;
      dossier.modeMetierCible = 'metier';
      dossier.secteurCible = null;
      fermerPanneauGuide();
      rerender();
    });
  });
  panneau.querySelectorAll('input[name="typeCV"]').forEach(function (el) {
    el.addEventListener('change', function () {
      dossier.typeCV = this.value;
      rerender();
      ouvrirPanneauChoixMetierHorsRepertoire(nom, rerender);
    });
  });
  var btnPersonnaliser = panneau.querySelector('#btnPersonnaliserCandidature');
  if (btnPersonnaliser) {
    btnPersonnaliser.addEventListener('click', function () {
      blocsAMettreEnEvidence.candidature = !informationsCandidatureSuffisantes();
      blocsAMettreEnEvidence.mobilite = (dossier.permis.possede === null);
      blocsAMettreEnEvidence.formation = !dossier.niveauFormation;
      blocsAMettreEnEvidence.metier = !dossier.metierCible;
      fermerPanneauGuide();
      naviguerVers('projet');
    });
  }
}

// Panneau "Ce metier" : choisir LE metier precis parmi les candidats.
// TACHE (complement) : integre desormais en bas le choix CV general/CV
// specifique (deplace depuis "Outils pour agir"), cote a cote (blocTypeCV()
// produit deja des labels flex/wrap gr\u00e2ce a .type-cv-choix) -- meme fonction
// qu'auparavant (dossier.typeCV), juste cablee ici plutot que sur la page Action.
function ouvrirPanneauChoixMetierParmiCandidats(rerender) {
  var lignes = dossier.metiersCandidats.map(function (nom) {
    return '<div class="ligne-metier-associe" data-metier-nom-cible="' + echapperAttribut(nom) + '"><span>' + nom + '</span></div>';
  }).join('');
  var panneau = ouvrirPanneauGuide('&#127919; Choisissez le metier',
    '<p class="text-muted small">Choisissez le metier pour lequel personnaliser votre CV, votre lettre de motivation et votre preparation a l\'entretien :</p>' + lignes +
    '<hr>' + blocTypeCV());
  panneau.querySelectorAll('[data-metier-nom-cible]').forEach(function (el) {
    el.addEventListener('click', function () {
      dossier.metierCible = this.dataset.metierNomCible;
      dossier.modeMetierCible = 'metier';
      dossier.secteurCible = null;
      fermerPanneauGuide();
      rerender();
    });
  });
  panneau.querySelectorAll('input[name="typeCV"]').forEach(function (el) {
    el.addEventListener('change', function () {
      dossier.typeCV = this.value;
      rerender();
      ouvrirPanneauChoixMetierParmiCandidats(rerender);
    });
  });
  var btnPersonnaliser = panneau.querySelector('#btnPersonnaliserCandidature');
  if (btnPersonnaliser) {
    btnPersonnaliser.addEventListener('click', function () {
      blocsAMettreEnEvidence.candidature = !informationsCandidatureSuffisantes();
      blocsAMettreEnEvidence.mobilite = (dossier.permis.possede === null);
      blocsAMettreEnEvidence.formation = !dossier.niveauFormation;
      blocsAMettreEnEvidence.metier = !dossier.metierCible;
      fermerPanneauGuide();
      naviguerVers('projet');
    });
  }
}

// Panneau "Secteur(s) d'activite" : secteurs detectes automatiquement parmi
// les candidats + champ libre si aucune proposition ne convient + option
// Interim en bas, mise en avant separement (cf. demande).
function ouvrirPanneauChoixSecteur(rerender) {
  var secteurs = [];
  dossier.metiersCandidats.forEach(function (nom) {
    var fiche = metierParNom(nom);
    if (fiche && fiche.secteur && secteurs.indexOf(fiche.secteur) === -1) { secteurs.push(fiche.secteur); }
  });
  var pastillesSecteurs = secteurs.map(function (s) {
    return '<span class="pastille" data-secteur-choix="' + echapperAttribut(s) + '">' + s + '</span>';
  }).join('');
  var contenu = '<p class="text-muted small">Secteurs identifies parmi vos metiers candidats :</p>' +
    (pastillesSecteurs ? '<div class="pastilles mb-3">' + pastillesSecteurs + '</div>' : '<p class="text-muted small fst-italic">Aucun secteur detecte automatiquement.</p>') +
    '<p class="text-muted small">Aucune proposition ne convient ? Precisez vous-meme :</p>' +
    '<div class="d-flex gap-2 mb-3"><input type="text" class="form-control form-control-sm" id="secteurLibreInput" placeholder="Votre propre secteur...">' +
    '<button type="button" class="btn btn-primary btn-sm" id="validerSecteurLibreBtn">Valider</button></div>' +
    '<hr>' +
    '<p class="text-muted small mb-2">Vous voulez postuler pour un intérim ?</p>' +
    '<span class="pastille pastille-interim" data-secteur-choix="Interim">Intérim</span>';
  var panneau = ouvrirPanneauGuide('&#127970; Choisissez un secteur d\'activite', contenu);
  panneau.querySelectorAll('[data-secteur-choix]').forEach(function (el) {
    el.addEventListener('click', function () {
      dossier.secteurCible = this.dataset.secteurChoix;
      dossier.modeMetierCible = 'secteur';
      dossier.metierCible = null;
      fermerPanneauGuide();
      rerender();
    });
  });
  var btnValider = panneau.querySelector('#validerSecteurLibreBtn');
  if (btnValider) {
    btnValider.addEventListener('click', function () {
      var val = document.getElementById('secteurLibreInput').value.trim();
      if (val) {
        dossier.secteurCible = val;
        dossier.modeMetierCible = 'secteur';
        dossier.metierCible = null;
        fermerPanneauGuide();
        rerender();
      }
    });
  }
}

// TACHE (complement demande) : detail au clic sur le nom d'un candidat --
// savoir-etre/savoir-faire/savoirs + fiche ROME, integre au flux (pas une
// fenetre positionnee pixel par pixel), un seul ouvert a la fois.
// TACHE (demande : bloc "Vous" + Je valide sur la page Action) : etat
// transitoire (pas dans "dossier", ca n'a pas de sens de le sauvegarder) --
// quelle carte (cv/lettre/entretien) attend que l'identite soit completee,
// et si le bloc "Vous" doit etre mis en evidence (rouge) apres un clic sur
// une carte alors que l'identite n'est pas complete.
var demandeOutilEnAttente = null;
var identiteActionEnEvidence = false;
// TACHE (demande) : "toutes les zones de texte" = nom/prenom/telephone/
// e-mail/adresse/ville/age. La civilite a toujours une valeur par defaut
// ("Ne pas preciser"), donc pas comptee comme un champ "a completer".
// TACHE (correction bug : collision de nom) : renommee -- une fonction
// "identiteEstComplete" existait DEJA (utilisee par Mon Projet pour son
// propre indicateur ✅, criteres differents : sans ville/age, avec civilite
// obligatoire). Les deux fonctions portant le meme nom, la seconde
// (existante, plus bas dans le fichier) ecrasait silencieusement la
// mienne : le bouton "Je valide" n'appliquait donc PAS le bon critere.
function identiteActionEstComplete() {
  var id = dossier.identite || {};
  return !!(String(id.nom || '').trim() && String(id.prenom || '').trim() &&
    String(id.telephone || '').trim() && String(id.email || '').trim() &&
    String(id.adresse || '').trim() && String(id.ville || '').trim() &&
    String(id.age || '').trim());
}
// TACHE (demande : synchronisation identite <-> "Votre identite") : garde
// une reference vers la derniere fenetre IA ouverte (Creer CV/Lettre/
// Entretien), pour pouvoir y repercuter en direct un changement fait dans
// "Vous" (Mon projet ou page Action), sans avoir a la refermer/rouvrir.
var fenetreIAOuverte = null;
var etatDetailMetierCandidatOuvert = null;
function contenuDetailMetierCandidat(nom) {
  var fiche = metierParNom(nom);
  if (!fiche) { return ''; }
  function badgesListe(liste, classeBadge) {
    return (liste || []).map(function (s) { return '<span class="badge ' + classeBadge + ' me-1 mb-1">' + s + '</span>'; }).join('');
  }
  var lienRome = fiche.rome
    ? '<a href="' + lienFicheROME(fiche) + '" target="_blank" rel="noopener" class="d-inline-block mt-2">&#128206; Voir la fiche ROME</a>'
    : '';
  // TACHE (demande) : en-tete avec le nom (gauche), le bouton "Ce métier"
  // (droite, meme fonction que dans le panneau "Choisissez le metier" --
  // ici applique directement a CE metier precis) et une croix de fermeture.
  var estCible = dossier.metierCible === nom;
  var entete = '<div class="detail-metier-candidat-entete">' +
    '<span class="detail-metier-candidat-nom">' + nom + '</span>' +
    '<span class="pastille pastille-choix-mode' + (estCible ? ' actif' : '') + '" data-metier-detail-ce-metier="' + echapperAttribut(nom) + '">Ce métier</span>' +
    '<span class="detail-metier-candidat-fermer" data-metier-detail-fermer="1" title="Fermer">&#10005;</span>' +
    '</div>';
  // TACHE (demande : fenetre plus grande) : au clic sur "Ce métier" ici,
  // ouverture de la MEME grande fenetre que le circuit classique/hors
  // repertoire (options CV general/specifique bien visibles), plutot qu'un
  // choix minuscule affiche dans ce petit panneau flottant.
  var confirmationEtChoix = estCible
    ? '<p class="mb-0 mt-2 small detail-metier-candidat-confirmation">&#9989; <strong>' + nom + '</strong> est votre métier cible.</p>'
    : '';
  return '<div class="detail-metier-candidat mt-2">' +
    entete +
    (fiche.savoirEtre && fiche.savoirEtre.length ? '<div class="mb-1 mt-2">' + badgesListe(fiche.savoirEtre, 'bg-success') + '</div>' : '') +
    (fiche.savoirFaire && fiche.savoirFaire.length ? '<div class="mb-1">' + badgesListe(fiche.savoirFaire, 'bg-primary') + '</div>' : '') +
    (fiche.savoirs && fiche.savoirs.length ? '<div class="mb-1">' + badgesListe(fiche.savoirs, 'bg-info') + '</div>' : '') +
    lienRome +
    confirmationEtChoix +
    '</div>';
}
// Pastille d'un candidat : croix a gauche (retrait), nom cliquable (detail),
// PLUS de trombone a cote (deplace dans le detail, sous le savoir/savoir-faire).
// TACHE (complement) : le detail s'affiche desormais directement rattache a
// SA pastille (position absolue, cf. CSS .metier-resume-chip-candidat /
// .detail-metier-candidat), pas comme un bloc partage sous toute la liste --
// il ne fait donc plus bouger le reste du bandeau, et reste au premier plan.
function pastilleMetierCandidatHTML(nom) {
  var detailOuvert = etatDetailMetierCandidatOuvert === nom;
  return '<span class="metier-resume-chip metier-resume-chip-candidat">' +
    '<span class="metier-resume-suppr" data-metier-candidat-suppr="' + echapperAttribut(nom) + '" title="Retirer">&#10005;</span>' +
    '<span class="metier-resume-nom" data-metier-candidat-detail="' + echapperAttribut(nom) + '">' + nom + '</span>' +
    (detailOuvert ? contenuDetailMetierCandidat(nom) : '') +
    '</span>';
}

// TACHE (demande) : bandeau "Je postule", visible plus bas sur la page une
// fois qu'un metier ou un secteur a ete choisi -- reprend la meme phrase de
// confirmation que dans le bandeau "Metier(s) cible(s)", mais dans un
// encart separe et bien visible, pour la garder sous les yeux plus loin
// dans la page.
function banniereJePostule() {
  if (dossier.modeMetierCible === 'metier' && dossier.metierCible) {
    var estHR = metierEstHorsRepertoire(dossier.metierCible);
    return '<div class="banniere-je-postule banniere-je-postule-accent' + (estHR ? ' banniere-je-postule-jaune' : '') + '">' +
      '<div class="banniere-je-postule-titre">&#128640; Votre candidature est prête</div>' +
      '<p class="mb-1">Votre candidature sera automatiquement personnalisée pour le métier sélectionné : ' +
      '<strong>' + dossier.metierCible + '</strong>.</p>' +
      '<p class="mb-0">Votre CV, votre lettre de motivation et votre préparation à l\'entretien seront adaptés ' +
      'afin de mettre en valeur les compétences, les qualités et les attentes spécifiques de ce métier.</p>' +
      '</div>';
  }
  if (dossier.modeMetierCible === 'secteur' && dossier.secteurCible) {
    return '<div class="banniere-je-postule banniere-je-postule-accent">' +
      '<div class="banniere-je-postule-titre">&#128640; Votre candidature est prête</div>' +
      '<p class="mb-1">Votre candidature sera automatiquement personnalisée pour le secteur sélectionné : ' +
      '<strong>' + echapperAttribut(dossier.secteurCible) + '</strong> (pas un métier précis -- utile par exemple ' +
      'pour postuler auprès d\'agences d\'intérim, sur plusieurs métiers).</p>' +
      '<p class="mb-0">Votre CV, votre lettre de motivation et votre préparation à l\'entretien seront adaptés ' +
      'afin de mettre en valeur les compétences, les qualités et les attentes spécifiques de ce secteur.</p>' +
      '</div>';
  }
  return '';
}
// TACHE (avertissement metier cible) : si la personne clique sur "Passer a
// l'action" (page Potentiel) sans avoir renseigne de metier ni de secteur
// cible, un avertissement propose de choisir un metier maintenant (retour en
// haut de page, bandeau encadre en rouge) ou de continuer quand meme.
var metierCibleEnEvidence = false;

function verifierAvantPasserAction() {
  var metierOuSecteurChoisi = !!(dossier.metierCible || dossier.secteurCible);
  if (metierOuSecteurChoisi) {
    naviguerVers('resultats');
    return;
  }
  ouvrirPanneauAvertissementMetierCible();
}

function ouvrirPanneauAvertissementMetierCible() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-confirmation';
  overlay.innerHTML =
    '<div class="modal-boite">' +
      '<h3>&#9888;&#65039; Aucun métier ciblé</h3>' +
      '<p>Vous n\'avez pas encore renseigné de métier ni de secteur d\'activité cible. ' +
      'Cette information permet de personnaliser votre CV, votre lettre de motivation et ' +
      'votre préparation à l\'entretien.</p>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-outline-primary" data-role="choisir-metier">&#127919; Choisir un métier</button>' +
        '<button class="btn btn-primary" data-role="continuer-quand-meme">Continuer quand même</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  function fermer() { if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); } }
  overlay.addEventListener('click', function (e) { if (e.target === overlay) { fermer(); } });
  overlay.querySelector('[data-role="continuer-quand-meme"]').addEventListener('click', function () {
    fermer();
    naviguerVers('resultats');
  });
  overlay.querySelector('[data-role="choisir-metier"]').addEventListener('click', function () {
    fermer();
    metierCibleEnEvidence = true;
    pageRevelation(true);
    window.scrollTo(0, 0);
  });
}

// Retire la mise en evidence rouge du bandeau des que la personne interagit
// avec cette zone (meme principe que wireEvidence(), deja utilisee ailleurs).
function wireEvidenceMetierCible() {
  if (!metierCibleEnEvidence) { return; }
  var el = document.getElementById('banniereMetierCibleZone');
  if (!el) { return; }
  var retirer = function () {
    metierCibleEnEvidence = false;
    el.classList.remove('a-completer');
  };
  el.addEventListener('click', retirer, { once: true });
  el.addEventListener('input', retirer, { once: true });
}

function banniereMetierCible() {
  var actif = !!(dossier.metierCible || dossier.secteurCible);

  // TACHE (refonte Metier(s) cible(s)) : recherche toujours en haut, mais
  // ajoute desormais AUX candidats plutot que de remplacer une valeur unique.
  // TACHE (hierarchie visuelle) : une fois un choix valide, ce bloc a
  // termine son role principal -- la zone de recherche et le bouton
  // d'ajout "hors repertoire" (pas les metiers deja choisis, voir plus bas)
  // disparaissent pour alleger le bloc. Reapparaissent immediatement si
  // "Tout effacer" est utilise (actif redevient faux).
  var zoneRecherche = actif ? '' : '<div class="banniere-metier-cible-recherche">' +
    '<p class="mb-1 small fw-semibold">&#128269; Recherchez et cliquez sur un métier pour l\'ajouter comme candidat :</p>' +
    '<input type="text" class="form-control" id="rechercheMetierCibleInput" ' +
    'placeholder="Un métier, une compétence, une valeur...">' +
    '<div id="resultatsMetierCible"></div>' +
    '</div>';

  // TACHE (demande : metiers hors repertoire) : bouton discret sous la zone
  // de recherche, puis une saisie libre (max 3, hors de la limite de 5).
  var horsRepertoire = dossier.metiersHorsRepertoire;
  var horsRepertoireComplet = horsRepertoire.length >= LIMITE_METIERS_HORS_REPERTOIRE;
  // TACHE (hierarchie visuelle) : le bouton "Votre metier n'est pas dans
  // notre repertoire ?" (ajout) est masque en mode compact -- mais les
  // metiers hors repertoire DEJA selectionnes restent toujours visibles
  // (ce sont des "metiers selectionnes", a conserver dans tous les cas).
  var zoneAjoutHorsRepertoire = actif ? '' : '<button type="button" class="btn-hors-repertoire" id="btnToggleHorsRepertoire" type="button">' +
    '&#128161; Votre métier n\'est pas dans notre répertoire ?</button>' +
    '<div class="hors-repertoire-saisie" id="zoneSaisieHorsRepertoire" hidden>' +
    (horsRepertoireComplet
      ? '<p class="small text-muted mb-0 mt-2">Vous avez atteint le maximum de 3 métiers saisis librement.</p>'
      : '<input type="text" class="form-control form-control-sm mt-2" id="inputHorsRepertoire" ' +
        'placeholder="Tapez l\'intitulé du métier puis appuyez sur Entrée...">') +
    '</div>';
  var zoneHorsRepertoire = '<div class="banniere-metier-cible-hors-repertoire">' +
    zoneAjoutHorsRepertoire +
    (horsRepertoire.length
      ? '<div class="metiers-chips mt-2">' + horsRepertoire.map(pastilleMetierHorsRepertoireHTML).join('') + '</div>'
      : '') +
    '</div>';

  var candidats = dossier.metiersCandidats;
  var htmlPastillesCandidats = candidats.length
    ? '<div class="metiers-chips mt-2">' + candidats.map(pastilleMetierCandidatHTML).join('') + '</div>'
    : '';

  // TACHE (complement, demande) : "Ce métier" visible des 1 candidat (avant,
  // il fallait au moins 2 candidats pour voir apparaitre les boutons, meme
  // "Ce métier" qui a pourtant un sens des le 1er). "Secteur(s) d'activité"
  // reste reserve a partir de 2 candidats (un "secteur" n'a de sens que s'il
  // y a plusieurs metiers a regrouper). Un texte invite desormais a cliquer
  // pour finaliser le choix.
  var htmlChoixMode = '';
  if (candidats.length >= 1) {
    var estMetier = dossier.modeMetierCible === 'metier';
    var estSecteur = dossier.modeMetierCible === 'secteur';
    var choixDejaFait = !!(dossier.metierCible || dossier.secteurCible);
    // TACHE (hierarchie visuelle) : une fois le choix valide, ce texte et
    // ces boutons restent (element utile a conserver), mais en version
    // moins imposante -- taille reduite, moins de marge -- pour ne plus
    // capter le regard comme avant la validation.
    htmlChoixMode = '<div class="banniere-metier-cible-action-centre' + (actif ? ' banniere-metier-cible-action-compacte' : '') + '">' +
      '<p class="banniere-metier-cible-invite-grand' + (actif ? ' banniere-metier-cible-invite-compacte' : '') + '">' +
      (choixDejaFait ? '&#128073; Vous pouvez changer votre choix a tout moment :' : '&#128073; Cliquez sur une option ci-dessous pour finaliser votre choix :') +
      '</p>' +
      '<div class="d-flex flex-wrap justify-content-center gap-2">' +
      '<span class="pastille pastille-choix-mode pastille-choix-mode-grand' + (estMetier ? ' actif' : '') + '" data-choix-mode="metier">Ce métier</span>' +
      (candidats.length >= 2
        ? '<span class="pastille pastille-choix-mode pastille-choix-mode-grand' + (estSecteur ? ' actif' : '') + '" data-choix-mode="secteur">Secteur(s) d\'activité</span>'
        : '') +
      '</div>' +
      '</div>';
  }

  // TACHE (complement, doublon retire) : le texte de confirmation ne
  // s'affiche plus ici -- il vit desormais uniquement dans le bandeau
  // "Je postule" (banniereJePostule()), plus bas sur la page.

  // TACHE (complement) : bouton rouge plein texte "Tout effacer" (meme
  // fonction que l'ancienne croix), desormais fixe juste sous le titre.
  // TACHE (demande) : visible aussi s'il n'y a QUE des metiers hors
  // repertoire (avant, uniquement base sur les candidats "classiques").
  var btnEffacerTout = (candidats.length || horsRepertoire.length)
    ? '<div class="mt-2"><button type="button" class="btn btn-sm btn-outline-danger btn-effacer banniere-metier-cible-effacer" ' +
      'data-metiers-candidats-reset="1">&#10227; Tout effacer</button></div>'
    : '';
  // TACHE (demande : distinction visuelle) : bleu pour un metier/secteur
  // "classique", jaune si le metier cible est un metier hors repertoire.
  var cibleHorsRepertoire = dossier.metierCible && metierEstHorsRepertoire(dossier.metierCible);

  // TACHE (complement, limite 5 metiers) : compteur X/5 desormais en badge
  // fixe au coin superieur droit DU RECTANGLE (position absolue), pas juste
  // aligne a droite du titre -- reste a la meme place quelle que soit la
  // longueur du titre ou le contenu du bandeau.
  var complet = candidats.length >= LIMITE_METIERS_CANDIDATS;
  var htmlCompteur = candidats.length
    ? '<span class="banniere-metier-cible-compteur' + (complet ? ' banniere-metier-cible-compteur-complet' : '') + '">' +
      candidats.length + '/' + LIMITE_METIERS_CANDIDATS + '</span>'
    : '';
  // TACHE (demande) : compteur jaune distinct pour les metiers hors
  // repertoire (1/3, 2/3, 3/3), pour bien faire le lien visuel avec eux.
  var htmlCompteurHorsRepertoire = horsRepertoire.length
    ? '<span class="banniere-metier-cible-compteur-hr">' + horsRepertoire.length + '/' + LIMITE_METIERS_HORS_REPERTOIRE + '</span>'
    : '';

  // TACHE (complement) : message affiche a la place de l'alerte, une fois la
  // selection complete -- explique la limite sans interrompre le parcours.
  // TACHE (hierarchie visuelle) : masque en mode compact (non liste parmi
  // les elements a conserver une fois le choix valide).
  var htmlMax = (complet && !actif)
    ? '<p class="mb-0 mt-2 small banniere-metier-cible-max">&#10003; Votre sélection est complète : ces 5 métiers sont ' +
      'une belle base pour construire vos candidatures. Retirez-en un si vous souhaitez explorer une autre piste.</p>'
    : '';

  return '<div class="banniere-metier-cible' +
    (actif ? (cibleHorsRepertoire ? ' banniere-metier-cible-actif-jaune' : ' banniere-metier-cible-actif') : '') +
    (actif ? ' banniere-metier-cible-compacte' : '') +
    (metierCibleEnEvidence ? ' a-completer' : '') + '" id="banniereMetierCibleZone">' +
    htmlCompteur +
    htmlCompteurHorsRepertoire +
    '<div class="banniere-metier-cible-titre">&#127919; Métier(s) cible(s)</div>' +
    btnEffacerTout +
    zoneRecherche +
    zoneHorsRepertoire +
    htmlPastillesCandidats +
    htmlChoixMode +
    htmlMax +
    (candidats.length === 0 && horsRepertoire.length === 0
      ? '<p class="mb-0 mt-2 small text-muted">Aucun métier sélectionné. Recherchez un métier ci-dessus pour personnaliser ' +
        'votre CV, votre lettre de motivation et votre préparation à l\'entretien.</p>'
      : '') +
    '</div>';
}
// Pastille d'un metier hors repertoire : mention explicite + croix de
// retrait + clic direct pour le designer comme cible (pas de detail
// possible, contrairement aux candidats classiques -- pas de fiche/
// competences pour un metier hors de notre base de connaissances).
function pastilleMetierHorsRepertoireHTML(nom) {
  var estCible = dossier.metierCible === nom;
  return '<span class="metier-resume-chip metier-resume-chip-hr' + (estCible ? ' metier-resume-cible-hr' : '') + '">' +
    '<span class="metier-resume-suppr" data-metier-hr-suppr="' + echapperAttribut(nom) + '" title="Retirer">&#10005;</span>' +
    '<span class="metier-resume-nom" data-metier-hr-cible="' + echapperAttribut(nom) + '" title="Definir comme metier cible">' +
    (estCible ? '&#127919; ' : '') + 'Vous avez saisi ' + nom + '</span>' +
    '</span>';
}
function wireBanniereMetierCible(rerender) {
  document.querySelectorAll('[data-metier-candidat-suppr]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      retirerMetierCandidat(this.dataset.metierCandidatSuppr);
      rerender();
    });
  });
  document.querySelectorAll('[data-metier-candidat-detail]').forEach(function (el) {
    el.addEventListener('click', function () {
      var nom = this.dataset.metierCandidatDetail;
      etatDetailMetierCandidatOuvert = (etatDetailMetierCandidatOuvert === nom) ? null : nom;
      rerender();
    });
  });
  // TACHE (demande) : 3 façons de fermer le panneau de detail -- cliquer sur
  // le metier (toggle, deja gere ci-dessus), la croix dediee, ou ailleurs
  // sur la page (clic exterieur).
  document.querySelectorAll('[data-metier-detail-fermer]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      etatDetailMetierCandidatOuvert = null;
      rerender();
    });
  });
  // TACHE (demande) : bouton "Ce métier" DANS le detail -- applique
  // directement CE metier precis comme cible (meme resultat que le passage
  // par le panneau "Choisissez le metier"), sans fermer le detail (pour
  // laisser voir la confirmation + le choix CV general/specifique juste en
  // dessous).
  document.querySelectorAll('[data-metier-detail-ce-metier]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      // TACHE (demande : meme fenetre que le circuit hors repertoire) :
      // reutilise la meme grande fenetre (nom du metier + CV general/
      // specifique bien visibles), fonctionne pour n'importe quel nom.
      ouvrirPanneauChoixMetierHorsRepertoire(this.dataset.metierDetailCeMetier, rerender);
    });
  });
  // TACHE (demande) : clic en dehors de la pastille (nom + detail ouvert) ->
  // fermeture. Installe UNE SEULE FOIS sur tout le cycle de vie de la page
  // (pas a chaque rendu, sinon les ecouteurs s'empilent sur "document" qui
  // n'est jamais recree, contrairement a #app).
  if (!window._detailMetierClicExterieurInstalle) {
    window._detailMetierClicExterieurInstalle = true;
    document.addEventListener('click', function (e) {
      if (!etatDetailMetierCandidatOuvert) { return; }
      if (e.target.closest && e.target.closest('.metier-resume-chip-candidat')) { return; }
      etatDetailMetierCandidatOuvert = null;
      pageRevelation(true);
    });
  }
  document.querySelectorAll('[data-choix-mode]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (this.dataset.choixMode === 'metier') { ouvrirPanneauChoixMetierParmiCandidats(rerender); }
      else { ouvrirPanneauChoixSecteur(rerender); }
    });
  });
  var btnReset = document.querySelector('[data-metiers-candidats-reset]');
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      viderMetiersCandidats();
      etatDetailMetierCandidatOuvert = null;
      rerender();
    });
  }

  // TACHE (demande : metiers hors repertoire) : afficher/masquer la saisie
  // (pas besoin de re-rendu complet pour ca), validation par la touche
  // Entree, selection directe et retrait d'un metier hors repertoire.
  var btnToggleHR = document.getElementById('btnToggleHorsRepertoire');
  var zoneSaisieHR = document.getElementById('zoneSaisieHorsRepertoire');
  if (btnToggleHR && zoneSaisieHR) {
    btnToggleHR.addEventListener('click', function () {
      zoneSaisieHR.hidden = !zoneSaisieHR.hidden;
      var champ = document.getElementById('inputHorsRepertoire');
      if (!zoneSaisieHR.hidden && champ) { champ.focus(); }
    });
  }
  var inputHR = document.getElementById('inputHorsRepertoire');
  if (inputHR) {
    inputHR.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') { return; }
      e.preventDefault();
      if (ajouterMetierHorsRepertoire(this.value)) { rerender(); }
    });
  }
  document.querySelectorAll('[data-metier-hr-cible]').forEach(function (el) {
    el.addEventListener('click', function () {
      ouvrirPanneauChoixMetierHorsRepertoire(this.dataset.metierHrCible, rerender);
    });
  });
  document.querySelectorAll('[data-metier-hr-suppr]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      retirerMetierHorsRepertoire(this.dataset.metierHrSuppr);
      rerender();
    });
  });
}
function wireRechercheMetierCible(rerender) {
  var input = document.getElementById('rechercheMetierCibleInput');
  var zoneResultats = document.getElementById('resultatsMetierCible');
  if (!input || !zoneResultats) { return; }
  function rafraichirResultats() {
    var texte = input.value;
    var resultats = rechercherMetiersPourAjout(texte);
    zoneResultats.innerHTML = resultats.length
      ? resultats.map(function (m) {
          var bloque = metierEstBloque(m.nom);
          var lienRome = m.rome
            ? '<a href="' + lienFicheROME(m) + '" target="_blank" rel="noopener" class="option-metier-ajout-rome" title="Voir la fiche ROME">&#128206;</a>'
            : '';
          return '<div class="option-metier-ajout' + (bloque ? ' option-metier-ajout-bloque' : '') + '" ' +
            (bloque ? '' : 'data-metier-cible-direct="' + echapperAttribut(m.nom) + '" ') +
            (bloque ? 'title="Retirez d\'abord un métier cible pour en ajouter un autre"' : '') + '>' +
            '<span class="option-metier-ajout-nom">&#128204; ' + m.nom + lienRome + '</span></div>';
        }).join('')
      : (normaliserTexte(texte).trim().length >= 2 ? '<p class="text-muted small">Aucun metier trouve.</p>' : '');
    zoneResultats.querySelectorAll('[data-metier-cible-direct]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('a')) { return; }
        ajouterMetierCandidat(this.dataset.metierCibleDirect);
        rerender();
      });
    });
  }
  input.addEventListener('input', rafraichirResultats);
}
// TACHE (refonte Potentiel, Etape B — correction) : "Pourquoi ces metiers ?"
// doit toujours porter sur EXACTEMENT les memes metiers que le resume/
// "Voir tous les metiers" (metiersRecommandes(), mis en cache) -- pas sur un
// calcul independant (metiersRevelation(), lui aussi soumis a un tirage
// aleatoire separe), qui pourrait afficher un ensemble different.
function metiersAvecScorePourNoms(noms) {
  var sansScoreMode = rienEteChoisi();
  var profil = sansScoreMode ? null : construireProfil();
  return noms.map(function (nom) {
    var fiche = metierParNom(nom);
    if (!fiche) { return null; }
    if (sansScoreMode) {
      var copie = {};
      for (var k in fiche) { copie[k] = fiche[k]; }
      copie.sansScore = true;
      copie.raisons = [];
      return copie;
    }
    return calculerScoreMetier(profil, fiche);
  }).filter(Boolean);
}

// Sous-section 1 : "Pourquoi ces metiers ?" -- reutilise genererHTMLMetiers()
// (metiers.js) telle quelle : barre de score + raisons, deja exactement le
// format demande.
// TACHE (correction/homogeneisation) : composant unique pour un metier
// affiche n'importe ou sur la page (resume Metiers recommandes, resume
// Autres pistes, "Voir tous les metiers") : croix de suppression a gauche,
// nom cliquable au milieu (bascule en metier cible), trombone ROME a droite.
// En bleu (les competences restent en vert, pour bien les distinguer).
function carteMetierResumeHTML(nom, blocId, index) {
  var fiche = metierParNom(nom);
  var estCible = dossier.metierCible === nom;
  var bloque = metierEstBloque(nom);
  var lienRome = fiche
    ? '<a href="' + lienFicheROME(fiche) + '" target="_blank" rel="noopener" class="metier-resume-rome" title="Voir la fiche ROME ' + fiche.rome + '">&#128206;</a>'
    : '';
  return '<span class="metier-resume-chip' + (estCible ? ' metier-resume-cible' : '') + (bloque ? ' metier-resume-bloque' : '') + '">' +
    '<span class="metier-resume-suppr" data-metier-resume-suppr="' + blocId + '" data-resume-index="' + index + '" title="Retirer de la liste">&#10005;</span>' +
    '<span class="metier-resume-nom"' + (bloque ? '' : ' data-metier-cible="' + echapperAttribut(nom) + '"') +
    ' title="' + (bloque ? 'Retirez d\'abord un métier cible pour en ajouter un autre' : 'Definir comme metier cible') + '">' +
    (estCible ? '&#127919; ' : '') + nom + '</span>' +
    lienRome +
    '</span>';
}
// Cablage global (une seule fois par rendu) : bascule metier cible, valable
// pour n'importe quel [data-metier-cible] present sur la page.
function wireMetierCibleGlobal(rerender) {
  document.querySelectorAll('[data-metier-cible]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; } // clic sur le trombone ROME : ne pas ajouter
      ajouterMetierCandidat(this.dataset.metierCible);
      rerender();
    });
  });
}

function contenuPourquoiMetiers() {
  return genererHTMLMetiers(metiersAvecScorePourNoms(metiersRecommandes()));
}

// Sous-section 2 : "Voir tous les metiers" -- reutilise le mecanisme deja
// existant de selection du metier cible (.metier-chip / data-metier-cible).
function contenuTousMetiers() {
  var liste = metiersRecommandes();
  if (!liste.length) { return '<p class="text-muted small">Aucun metier recommande pour le moment.</p>'; }
  return '<p class="mb-2">Cliquez sur un metier pour le definir comme metier cible (CV, lettre, entretien).</p>' +
    '<div class="metiers-chips">' + liste.map(function (nom, i) { return carteMetierResumeHTML(nom, 'metiers', i); }).join('') + '</div>';
}
// Sous-section 3 : "Ajouter un metier" -- moteur de recherche intelligent
// (rechercherMetiersPourAjout, meme moteur que la barre de recherche ERIP).
// Seule la zone de resultats se rafraichit a la frappe (pas toute la page),
// pour ne jamais perdre le focus du champ.
function contenuAjouterMetier() {
  return '<p class="mb-2">Recherchez un metier, une competence, une valeur, ou decrivez ce que vous cherchez :</p>' +
    '<input type="text" class="form-control form-control-sm mb-2" id="rechercheAjoutMetierInput" placeholder="Ex : boulanger, travailler dehors, autonomie...">' +
    '<div id="resultatsAjoutMetier"></div>';
}
function wireAjouterMetier(rerender) {
  var input = document.getElementById('rechercheAjoutMetierInput');
  var zoneResultats = document.getElementById('resultatsAjoutMetier');
  if (!input || !zoneResultats) { return; }

  // TACHE (correction, intuitivite) : ajout au clic direct sur un resultat
  // (comme la barre de recherche de l'accueil), pas de bouton "Ajouter"
  // separe -- avec le lien fiche ROME sur chaque resultat.
  function rafraichirResultats() {
    var texte = input.value;
    var resultats = rechercherMetiersPourAjout(texte);
    zoneResultats.innerHTML = resultats.length
      ? resultats.map(function (m) {
          var lienRome = m.rome
            ? '<a href="' + lienFicheROME(m) + '" target="_blank" rel="noopener" class="ms-2" title="Voir la fiche ROME">&#128206;</a>'
            : '';
          return '<div class="option-metier-ajout" data-metier-ajout-direct="' + echapperAttribut(m.nom) + '">' +
            '<span>&#10133; ' + m.nom + '</span>' + lienRome + '</div>';
        }).join('')
      : (normaliserTexte(texte).trim().length >= 2 ? '<p class="text-muted small">Aucun metier trouve.</p>' : '');
    zoneResultats.querySelectorAll('[data-metier-ajout-direct]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('a')) { return; } // clic sur le trombone ROME : ne pas ajouter
        var nom = this.dataset.metierAjoutDirect;
        if (dossier.metiersAjoutes.indexOf(nom) === -1) { dossier.metiersAjoutes.push(nom); }
        var idxExclu = dossier.metiersExclus.indexOf(nom);
        if (idxExclu !== -1) { dossier.metiersExclus.splice(idxExclu, 1); }
        invaliderCacheMetiersRecommandes();
        // TACHE (correction bug, doublon Metiers recommandes / Autres pistes) :
        // resynchronise le cache des pistes avec le NOUVEAU tirage de
        // metiersRecommandes() (pas seulement le metier ajoute).
        resynchroniserPistesCache();
        rerender();
      });
    });
  }
  input.addEventListener('input', rafraichirResultats);
}

// TACHE (refonte Potentiel, Etape B) : configuration reelle du bloc "Metiers
// recommandes". Resume = liste des metiers recommandes (compteur personnalise,
// pas de notion de "complet"). Suppression via le resume = exclusion
// temporaire (session en cours), pas de suppression definitive (demande
// explicite) -- reapparait si le profil change et que le moteur le recalcule.
function resumeOnSuppressionMetiers(idx) {
  var noms = metiersRecommandes();
  var nom = noms[idx];
  if (!nom) { return; }
  var idxAjoute = dossier.metiersAjoutes.indexOf(nom);
  if (idxAjoute !== -1) { dossier.metiersAjoutes.splice(idxAjoute, 1); }
  else if (dossier.metiersExclus.indexOf(nom) === -1) { dossier.metiersExclus.push(nom); }
  // TACHE (correction bug) : retrait chirurgical du cache -- le metier
  // disparait immediatement, sans reshuffle complet de la liste (qui serait
  // desagreable a chaque suppression individuelle).
  if (_metiersRecommandesCache) {
    var i = _metiersRecommandesCache.indexOf(nom);
    if (i !== -1) { _metiersRecommandesCache.splice(i, 1); }
  }
}
var CONFIG_BLOC_METIERS = {
  id: 'metiers', icone: '&#11088;', titre: 'Métiers recommandés',
  masquerReset: true, // TACHE (complement) : ancienne configuration, plus necessaire
  masquerResumeSiFerme: true, // TACHE (complement, allegement visuel) : voir blocERIP()
  compteurTexte: function () { return metiersRecommandes().length + ' métiers'; },
  resumeHTML: function () { return metiersRecommandes().map(function (nom, i) { return carteMetierResumeHTML(nom, 'metiers', i); }).join(''); },
  resumeOnSuppression: resumeOnSuppressionMetiers,
  // TACHE (correction bug) : vider dossier.metiersExclus ne suffisait pas --
  // quand le profil contient des donnees, rechercherMetiers() est
  // deterministe (pas de tirage aleatoire), donc les memes suggestions du
  // moteur revenaient immediatement apres reset, donnant l'impression que la
  // croix rouge "ne fonctionne pas". On exclut desormais explicitement tous
  // les metiers actuellement affiches : le bloc redevient vide, et seuls les
  // metiers recherches puis ajoutes manuellement y reapparaissent ensuite.
  onResetTout: function () {
    metiersRecommandes().forEach(function (nom) {
      if (dossier.metiersExclus.indexOf(nom) === -1) { dossier.metiersExclus.push(nom); }
    });
    dossier.metiersAjoutes = [];
    invaliderCacheMetiersRecommandes();
    invaliderCachePistes();
  },
  sousSections: [
    {
      id: 'pourquoi', titre: 'Pourquoi ces métiers ?',
      complet: function () { return metiersRecommandes().length > 0; },
      contenuHTML: contenuPourquoiMetiers
    },
    {
      id: 'tous', titre: 'Voir tous les métiers',
      complet: function () { return metiersRecommandes().length > 0; },
      contenuHTML: contenuTousMetiers,
      enEvidence: function () { return doitMettreEnEvidence('metier'); },
      clefEvidence: 'metier'
    }
  ]
};

// TACHE (refonte Potentiel, Etape C) : configuration reelle du bloc "Analyse
// de votre profil" (savoir-etre, savoir-faire, savoirs). Contenu entierement
// derive automatiquement (deduireCompetences/obtenirSavoirs, deja existantes) :
// pas de croix de reinitialisation (rien a "effacer" ici), pastilles de
// resume informatives (pas de suppression individuelle possible).
function savoirEtreActuels() {
  return deduireCompetences().filter(function (c) { return categorieCompetence[c] === 'Savoir-etre'; });
}
function savoirFaireActuels() {
  return deduireCompetences().filter(function (c) { return categorieCompetence[c] === 'Savoir-faire'; });
}
// TACHE (correction, fonction retrouvee) : clic sur une competence (Analyse
// de votre profil) -> metiers associes (trouverMetiersAssocies, deja
// existante), mais ici le clic sur un metier definit directement le metier
// cible (pas le parcours guide CV/lettre/entretien, deja fait ailleurs) --
// on est deja au coeur du parcours de decouverte sur cette page.
// TACHE (correction, garder uniquement le plus pertinent) : plutot qu'une
// liste (jusqu'a 5 metiers), un seul resultat -- le plus pertinent au regard
// des criteres/choix deja faits par la personne (score, calculerScoreMetier,
// deja existant), pas juste le premier trouve dans le referentiel.
function meilleurMetierAssocie(metiers) {
  if (!metiers.length) { return null; }
  if (rienEteChoisi()) { return metiers[0]; }
  var profil = construireProfil();
  var avecScore = metiers.map(function (m) { return calculerScoreMetier(profil, m); });
  avecScore.sort(function (a, b) { return b.score - a.score; });
  return avecScore[0];
}

// TACHE (demande : le systeme "avec options" partout, sauf la barre de
// recherche) : 3 panneaux reutilisables pour toute pastille de competence
// cliquable (data-competence-nom) -- un ecran de choix, puis soit "le metier
// le plus pertinent", soit "la liste des metiers lies (jusqu'a 5)". Utilise
// desormais a la fois sur la page Potentiel (resume du haut + accordeon) ET
// sur la page Action ("Votre profil"). La barre de recherche ERIP (accueil)
// n'est pas concernee : elle utilise son propre systeme distinct
// (ouvrirPanneauMetiersAssocies, data-competence-nom sur des <div>, jamais
// des <span class="badge">), non touche ici.
function ouvrirPanneauMetierUniquePourCible(competence, rerender) {
  var meilleur = meilleurMetierAssocie(trouverMetiersAssocies(competence, 20));
  var lignes = meilleur
    ? (function () {
        var lienRome = meilleur.rome
          ? '<a href="' + lienFicheROME(meilleur) + '" target="_blank" rel="noopener" class="ms-2" title="Ouvrir la fiche ROME">&#128206;</a>'
          : '';
        return '<div class="ligne-metier-associe" data-metier-nom-cible="' + echapperAttribut(meilleur.nom) + '">' +
          '<span>' + meilleur.nom + '</span>' + lienRome + '</div>';
      })()
    : '<p class="text-muted small">Aucun metier associe trouve pour le moment.</p>';
  var panneau = ouvrirPanneauGuide('&#128218; ' + competence,
    '<p class="text-muted small">Le metier le plus pertinent pour vous, au regard de cette competence :</p>' + lignes);
  panneau.querySelectorAll('[data-metier-nom-cible]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; }
      ajouterMetierCandidat(this.dataset.metierNomCible);
      fermerPanneauGuide();
      rerender();
    });
  });
}
function ouvrirPanneauMetiersListePourCible(competence, rerender) {
  var metiers = trouverMetiersAssocies(competence, 5);
  var lignes = metiers.length
    ? metiers.map(function (m) {
        var lienRome = m.rome
          ? '<a href="' + lienFicheROME(m) + '" target="_blank" rel="noopener" class="ms-2" title="Ouvrir la fiche ROME">&#128206;</a>'
          : '';
        return '<div class="ligne-metier-associe" data-metier-nom-cible="' + echapperAttribut(m.nom) + '">' +
          '<span>' + m.nom + '</span>' + lienRome + '</div>';
      }).join('')
    : '<p class="text-muted small">Aucun metier associe trouve pour le moment.</p>';
  var panneau = ouvrirPanneauGuide('&#128218; ' + competence,
    '<p class="text-muted small">Cette compétence est particulièrement recherchée dans :</p>' + lignes);
  panneau.querySelectorAll('[data-metier-nom-cible]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; }
      ajouterMetierCandidat(this.dataset.metierNomCible);
      fermerPanneauGuide();
      rerender();
    });
  });
}
function ouvrirPanneauChoixMetiersAssocies(competence, rerender) {
  var panneau = ouvrirPanneauGuide('&#128218; ' + competence,
    '<p class="text-muted small mb-3">Que souhaitez-vous voir ?</p>' +
    '<div class="d-flex flex-column gap-2">' +
    '<button type="button" class="choix-panneau-competence" data-choix-panneau-competence="unique">' +
    '&#127919; Le métier le plus pertinent pour vous</button>' +
    '<button type="button" class="choix-panneau-competence" data-choix-panneau-competence="liste">' +
    '&#128203; Tous les métiers liés à cette compétence (jusqu\'à 5)</button>' +
    '</div>');
  panneau.querySelectorAll('[data-choix-panneau-competence]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (this.dataset.choixPanneauCompetence === 'unique') {
        ouvrirPanneauMetierUniquePourCible(competence, rerender);
      } else {
        ouvrirPanneauMetiersListePourCible(competence, rerender);
      }
    });
  });
}
// Cablage generique : reutilisable sur n'importe quelle page (Potentiel,
// Action...). stopPropagation() evite que le clic remonte jusqu'au
// gestionnaire global historique (data/metiers.js, ouvrirFenetreCompetence),
// qui ouvrirait EN PLUS son propre panneau.
function wireCompetencesCliquablesGlobal(rerender) {
  document.querySelectorAll('[data-competence-nom]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      ouvrirPanneauChoixMetiersAssocies(this.dataset.competenceNom, rerender);
    });
  });
}

function contenuListeCompetences(liste, classeBadge) {
  if (!liste.length) { return '<p class="text-muted small">Aucune information pour le moment.</p>'; }
  return '<p class="mb-2 small text-muted">Cliquez sur une competence pour voir les metiers qui la recherchent.</p>' +
    '<div class="d-flex flex-wrap gap-2">' + liste.map(function (c) {
      return '<span class="badge ' + classeBadge + ' badge-cliquable" data-competence-nom="' + echapperAttribut(c) + '">' + c + '</span>';
    }).join('') + '</div>';
}
function resumeProfil() {
  var se = savoirEtreActuels().map(function (c) { return { label: c, classe: 'bg-success' }; });
  var sf = savoirFaireActuels().map(function (c) { return { label: c, classe: 'bg-primary' }; });
  var sv = obtenirSavoirs().map(function (c) { return { label: c, classe: 'bg-info' }; });
  return se.concat(sf).concat(sv);
}
var CONFIG_BLOC_PROFIL = {
  id: 'profil', icone: '&#128202;', titre: 'Analyse de votre profil',
  masquerReset: true,
  masquerResumeSiFerme: true, // TACHE (complement, allegement visuel) : voir blocERIP()
  compteurTexte: function () { return resumeProfil().length + ' compétences'; },
  resumeHTML: function () {
    return resumeProfil().map(function (item) {
      return '<span class="badge ' + item.classe + ' badge-cliquable" data-competence-nom="' + echapperAttribut(item.label) + '">' + echapperAttribut(item.label) + '</span>';
    }).join(' ');
  },
  sousSections: [
    {
      id: 'savoirEtre', titre: 'Vos savoir-être',
      complet: function () { return savoirEtreActuels().length > 0; },
      contenuHTML: function () { return contenuListeCompetences(savoirEtreActuels(), 'bg-success'); }
    },
    {
      id: 'savoirFaire', titre: 'Vos savoir-faire',
      complet: function () { return savoirFaireActuels().length > 0; },
      contenuHTML: function () { return contenuListeCompetences(savoirFaireActuels(), 'bg-primary'); }
    },
    {
      id: 'savoirs', titre: 'Vos savoirs',
      complet: function () { return obtenirSavoirs().length > 0; },
      contenuHTML: function () { return contenuListeCompetences(obtenirSavoirs(), 'bg-info'); }
    }
  ]
};

// TACHE (refonte Potentiel, Etape D) : configuration reelle du bloc "Autres
// pistes". Meme principe de cache que "Metiers recommandes" (Etape B) pour
// eviter l'incoherence due au tirage aleatoire de rechercherMetiersDebutants.
// Partage la meme liste d'exclusion (dossier.metiersExclus) que "Metiers
// recommandes" : un metier ecarte ne doit reapparaitre dans aucun des deux.
var _pistesCache = null;
function invaliderCachePistes() { _pistesCache = null; }

// TACHE (correction bug, doublon Metiers recommandes / Autres pistes) :
// chaque fois que metiersRecommandes() est recalculee entierement (nouveau
// tirage aleatoire ou nouvelle exclusion en masse), purge du cache des
// pistes tout metier qui viendrait desormais chevaucher les recommandes --
// pas seulement le metier explicitement ajoute/retire, car un nouveau tirage
// peut faire apparaitre n'importe quel autre metier deja present cote pistes.
function resynchroniserPistesCache() {
  if (_pistesCache) {
    var recommandes = metiersRecommandes();
    _pistesCache = _pistesCache.filter(function (nom) { return recommandes.indexOf(nom) === -1; });
  }
  // TACHE (correction bug) : le pool complementaire doit lui aussi rester
  // exclusif de metiersRecommandes() ET de pistesRecommandees() (desormais
  // potentiellement modifiee juste au-dessus).
  if (_pistesSupplCache) {
    var recommandes2 = metiersRecommandes();
    var pistes2 = pistesRecommandees();
    _pistesSupplCache = _pistesSupplCache.filter(function (nom) {
      return recommandes2.indexOf(nom) === -1 && pistes2.indexOf(nom) === -1;
    });
  }
}

// TACHE (priorisation alimentaire/saisonnier, approche progressive validee) :
// secteurs ROME/familles de metiers deja presents dans le referentiel,
// correles (de facon approximative, a affiner plus tard) aux emplois
// alimentaires et saisonniers.
var SECTEURS_ALIMENTAIRE_SAISONNIER = [
  'Agriculture', 'Agroalimentaire', 'Artisanat alimentaire', 'Commerce alimentaire',
  'Hotellerie', 'Hotellerie-restauration', 'Hotellerie-tourisme', 'Restauration', 'Tourisme'
];

function pistesRecommandees() {
  if (_pistesCache) { return _pistesCache; }
  var tous = rienEteChoisi() ? rechercherMetiersDebutants(15) : rechercherMetiers(construireProfil(), 15);
  var dejaRecommandes = metiersRecommandes();
  var noms = [];
  tous.forEach(function (m) {
    if (noms.indexOf(m.nom) === -1 && dejaRecommandes.indexOf(m.nom) === -1 && dossier.metiersExclus.indexOf(m.nom) === -1) {
      noms.push(m.nom);
    }
  });
  // Si la personne accepte un emploi alimentaire ou saisonnier ("J'accepte
  // également", Mon projet), les metiers de ces secteurs remontent en tete
  // de liste -- sans rien retirer, juste un ordre d'affichage different.
  if (dossier.accepte && (dossier.accepte.indexOf('alimentaire') !== -1 || dossier.accepte.indexOf('saisonnier') !== -1)) {
    noms.sort(function (a, b) {
      var fa = metierParNom(a), fb = metierParNom(b);
      var pa = (fa && SECTEURS_ALIMENTAIRE_SAISONNIER.indexOf(fa.secteur) !== -1) ? 0 : 1;
      var pb = (fb && SECTEURS_ALIMENTAIRE_SAISONNIER.indexOf(fb.secteur) !== -1) ? 0 : 1;
      return pa - pb;
    });
  }
  _pistesCache = noms.slice(0, 5);
  return _pistesCache;
}

// TACHE (correction bug) : "Explorer d'autres metiers" affichait exactement
// les memes metiers que le resume du bloc, juste au-dessus -- aucune valeur
// ajoutee a ouvrir l'accordeon. pistesSupplementaires() puise dans un pool
// plus large et exclut EGALEMENT pistesRecommandees() (en plus de
// metiersRecommandes() et metiersExclus), pour garantir un ensemble
// complementaire, jamais un doublon.
var _pistesSupplCache = null;
function invaliderCachePistesSuppl() { _pistesSupplCache = null; }
function pistesSupplementaires() {
  if (_pistesSupplCache) { return _pistesSupplCache; }
  var tous = rienEteChoisi() ? rechercherMetiersDebutants(25) : rechercherMetiers(construireProfil(), 25);
  var dejaRecommandes = metiersRecommandes();
  var dejaPistes = pistesRecommandees();
  var noms = [];
  tous.forEach(function (m) {
    if (noms.indexOf(m.nom) === -1 && dejaRecommandes.indexOf(m.nom) === -1 &&
      dejaPistes.indexOf(m.nom) === -1 && dossier.metiersExclus.indexOf(m.nom) === -1) {
      noms.push(m.nom);
    }
  });
  if (dossier.accepte && (dossier.accepte.indexOf('alimentaire') !== -1 || dossier.accepte.indexOf('saisonnier') !== -1)) {
    noms.sort(function (a, b) {
      var fa = metierParNom(a), fb = metierParNom(b);
      var pa = (fa && SECTEURS_ALIMENTAIRE_SAISONNIER.indexOf(fa.secteur) !== -1) ? 0 : 1;
      var pb = (fb && SECTEURS_ALIMENTAIRE_SAISONNIER.indexOf(fb.secteur) !== -1) ? 0 : 1;
      return pa - pb;
    });
  }
  _pistesSupplCache = noms.slice(0, 5);
  return _pistesSupplCache;
}

function contenuAutresPistes() {
  var noms = pistesSupplementaires();
  if (!noms.length) { return '<p class="text-muted small">Aucun autre metier disponible avec ces criteres pour le moment.</p>'; }
  return '<p class="mb-2">Cliquez sur un metier pour le definir comme metier cible (CV, lettre, entretien).</p>' +
    '<div class="metiers-chips">' + noms.map(function (nom) {
      var fiche = metierParNom(nom);
      var estCible = dossier.metierCible === nom;
      var bloque = metierEstBloque(nom);
      var lienRome = fiche
        ? '<a href="' + lienFicheROME(fiche) + '" target="_blank" rel="noopener" class="metier-resume-rome" title="Voir la fiche ROME ' + fiche.rome + '">&#128206;</a>'
        : '';
      // TACHE (correction bug) : suppression par NOM (pas par index) -- ces
      // metiers vivent dans un cache distinct (pistesSupplementaires), pas
      // dans le resume du bloc, donc l'index generique data-resume-index
      // n'aurait pas de sens ici.
      return '<span class="metier-resume-chip' + (estCible ? ' metier-resume-cible' : '') + (bloque ? ' metier-resume-bloque' : '') + '">' +
        '<span class="metier-resume-suppr" data-metier-suppl-suppr="' + echapperAttribut(nom) + '" title="Retirer de la liste">&#10005;</span>' +
        '<span class="metier-resume-nom"' + (bloque ? '' : ' data-metier-cible="' + echapperAttribut(nom) + '"') +
        ' title="' + (bloque ? 'Retirez d\'abord un métier cible pour en ajouter un autre' : 'Definir comme metier cible') + '">' +
        (estCible ? '&#127919; ' : '') + nom + '</span>' + lienRome +
        '</span>';
    }).join('') + '</div>';
}
function wireAutresPistesSuppl(rerender) {
  document.querySelectorAll('[data-metier-suppl-suppr]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      var nom = this.dataset.metierSupplSuppr;
      if (dossier.metiersExclus.indexOf(nom) === -1) { dossier.metiersExclus.push(nom); }
      invaliderCachePistesSuppl();
      rerender();
    });
  });
}
function resumePistes() {
  return pistesRecommandees().map(function (nom) { return { label: nom }; });
}
function resumeOnSuppressionPistes(idx) {
  var noms = pistesRecommandees();
  var nom = noms[idx];
  if (!nom) { return; }
  if (dossier.metiersExclus.indexOf(nom) === -1) { dossier.metiersExclus.push(nom); }
  if (_pistesCache) {
    var i = _pistesCache.indexOf(nom);
    if (i !== -1) { _pistesCache.splice(i, 1); }
  }
}
var CONFIG_BLOC_PISTES = {
  id: 'pistes', icone: '&#129517;', titre: 'Autres pistes',
  masquerReset: true, // l'exclusion est partagee avec "Metiers recommandes" : pas de reset isole pertinent ici
  masquerResumeSiFerme: true, // TACHE (complement, allegement visuel) : voir blocERIP()
  compteurTexte: function () { return pistesRecommandees().length + ' métiers'; },
  resumeHTML: function () { return pistesRecommandees().map(function (nom, i) { return carteMetierResumeHTML(nom, 'pistes', i); }).join(''); },
  resumeOnSuppression: resumeOnSuppressionPistes,
  // TACHE (correction bug) : sous-section dynamique -- "Explorer d'autres
  // metiers" ne s'affiche que s'il existe reellement d'autres metiers
  // (complementaires, jamais un doublon du resume ci-dessus) a montrer.
  sousSections: function () {
    if (!pistesSupplementaires().length) { return []; }
    return [{
      id: 'explorer', titre: 'Explorer d\'autres métiers',
      complet: function () { return true; },
      contenuHTML: contenuAutresPistes,
      wire: wireAutresPistesSuppl
    }];
  }
};

// TACHE (refonte Potentiel, Etape E) : configuration reelle du bloc "Ce qui
// vous correspond" -- synthese de la personnalite professionnelle. A la
// difference du bloc "Analyse de votre profil" (savoir-faire/etre/savoirs,
// competences), celui-ci s'appuie sur les activites preferees, les actions,
// l'environnement de travail et les valeurs professionnelles deja choisies
// plus tot dans le parcours (ecrans Activites/Actions/Environnement/Valeurs) :
// "dans quel type de travail cette personne semble naturellement s'epanouir ?"
function pointsFortsSynthese() {
  var points = [];
  var vus = {};
  function ajouterCatalogue(ids, catalogue, champ) {
    (ids || []).forEach(function (id) {
      var item = trouverItemParId(catalogue, id);
      var cle = champ + ':' + id;
      if (item && !vus[cle]) {
        vus[cle] = true;
        points.push({ label: item.label, id: id, champ: champ });
      }
    });
  }
  ajouterCatalogue(dossier.activites, CATALOGUE_PERSONNES_MATERIELS_LIEUX, 'activites');
  ajouterCatalogue(dossier.actions, CATALOGUE_ACTIONS_PRO, 'actions');
  ajouterCatalogue(dossier.environnement, CATALOGUE_ENVIRONNEMENTS_TRAVAIL, 'environnement');
  ajouterCatalogue(dossier.valeurs, CATALOGUE_VALEURS_PROFESSIONNELLES, 'valeurs');
  return points;
}
// TACHE (complement) : meme principe que ouvrirPanneauMetiersAssocieesPourCible
// (competences textuelles), mais pour les champs identifies par id
// (activites/actions/environnement/valeurs), via trouverMetiersParChampId
// (data/baseConnaissancesERIP.js, deja existante, deja utilisee par la barre
// de recherche ERIP).
function ouvrirPanneauMetiersParChampPourCible(champ, id, label, rerender) {
  var meilleur = meilleurMetierAssocie(trouverMetiersParChampId(champ, id, 20));
  var lignes = meilleur
    ? (function () {
        var lienRome = meilleur.rome
          ? '<a href="' + lienFicheROME(meilleur) + '" target="_blank" rel="noopener" class="ms-2" title="Ouvrir la fiche ROME">&#128206;</a>'
          : '';
        return '<div class="ligne-metier-associe" data-metier-nom-cible="' + echapperAttribut(meilleur.nom) + '">' +
          '<span>' + meilleur.nom + '</span>' + lienRome + '</div>';
      })()
    : '<p class="text-muted small">Aucun metier associe trouve pour le moment.</p>';
  var panneau = ouvrirPanneauGuide('&#128218; ' + label,
    '<p class="text-muted small">Le metier le plus pertinent pour vous, au regard de ce critere :</p>' + lignes);
  panneau.querySelectorAll('[data-metier-nom-cible]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; }
      ajouterMetierCandidat(this.dataset.metierNomCible);
      fermerPanneauGuide();
      rerender();
    });
  });
}
function wireCompetencesChampCliquablesGlobal(rerender) {
  document.querySelectorAll('[data-champ-competence]').forEach(function (el) {
    el.addEventListener('click', function () {
      ouvrirPanneauMetiersParChampPourCible(this.dataset.champCompetence, this.dataset.idCompetence, this.dataset.labelCompetence, rerender);
    });
  });
}
// TACHE (complement, evite le doublon avec le resume) : au lieu de repeter
// les memes badges deja visibles dans le resume du bloc, l'accordeon propose
// desormais (1) une synthese ecrite de la "personnalite professionnelle"
// (phrase generee a partir des memes criteres, mais formulee, pas listee) et
// (2) un mini-classement des metiers qui correspondent le mieux a l'ENSEMBLE
// des criteres combines -- exclu de "Metiers recommandes" et "Autres pistes"
// pour rester un contenu reellement complementaire, jamais un doublon.
function metiersPourSynthese() {
  if (typeof baseMetiers === 'undefined') { return []; }
  var profil = construireProfil();
  var dejaVus = metiersRecommandes().concat(pistesRecommandees());
  var candidats = baseMetiers.filter(function (m) { return dejaVus.indexOf(m.nom) === -1; });
  var avecScore = candidats.map(function (m) { return calculerScoreMetier(profil, m); });
  avecScore.sort(function (a, b) { return b.score - a.score; });
  return avecScore.slice(0, 5);
}
function contenuPointsForts() {
  var metiersTop = metiersPourSynthese();
  if (!metiersTop.length) { return '<p class="text-muted small">Rien renseigne pour le moment.</p>'; }
  return '<p class="mb-2 fw-semibold small">Les métiers qui correspondent le mieux à l\'ensemble de vos critères :</p>' +
    '<div class="metiers-chips">' + metiersTop.map(function (m) {
      var bloque = metierEstBloque(m.nom);
      var lienRome = m.rome
        ? '<a href="' + lienFicheROME(m) + '" target="_blank" rel="noopener" class="rome-link" title="Fiche ROME ' + m.rome + '">&#128279;</a>'
        : '';
      return '<span class="metier-chip' + (bloque ? ' metier-chip-bloque' : '') + '"' +
        (bloque ? '' : ' data-metier-cible="' + echapperAttribut(m.nom) + '"') +
        ' title="' + (bloque ? 'Retirez d\'abord un métier cible pour en ajouter un autre' : '') + '">' + m.nom + ' ' + lienRome + '</span>';
    }).join('') + '</div>';
}
// TACHE (correction, resume cliquable) : oubli corrige -- meme mecanisme que
// "Analyse de votre profil" (deja fait), applique ici aussi. pointsFortsSynthese()
// retourne deja {label, id, champ} : reutilise directement wireCompetencesChampCliquablesGlobal
// (deja cablee globalement, jusqu'ici sans element a cibler).
function resumePointsFortsHTML() {
  return pointsFortsSynthese().map(function (p) {
    return '<span class="pastille actif badge-cliquable" data-champ-competence="' + p.champ + '" ' +
      'data-id-competence="' + echapperAttribut(p.id) + '" data-label-competence="' + echapperAttribut(p.label) + '" ' +
      'title="Voir le metier le plus lie">' + echapperAttribut(p.label) + '</span>';
  }).join('');
}
var CONFIG_BLOC_CORRESPONDANCE = {
  id: 'correspondance', icone: '&#128161;', titre: 'Ce qui vous correspond',
  masquerReset: true, // synthese derivee automatiquement, rien a "effacer" ici
  masquerResumeSiFerme: true, // TACHE (complement, allegement visuel) : voir blocERIP()
  compteurTexte: function () { return pointsFortsSynthese().length + ' points forts'; },
  resumeHTML: resumePointsFortsHTML,
  sousSections: [
    {
      id: 'ensavoirplus', titre: 'En savoir plus',
      complet: function () { return pointsFortsSynthese().length > 0; },
      contenuHTML: contenuPointsForts
    }
  ]
};

function pageRevelation(conserverTirage) {
  if (!conserverTirage) { invaliderCacheMetiersRecommandes(); invaliderCachePistes(); invaliderCachePistesSuppl(); }

  var html = afficherProgression('revelation') +
    '<div class="text-center"><h1>&#128302; Revelons votre potentiel</h1>' +
    '<p class="sousTitre">Au-dela de votre experience, voici ce qui fait votre valeur.</p></div>' +
    '<div class="message-competences"><strong>Nous avons identifie chez vous :</strong><br>' +
    'Vous aimez : <strong>' + construireMessageAime() + '</strong></div>' +
    banniereMetierCible() +
    banniereJePostule() +
    messageVAE() +
    blocERIP(CONFIG_BLOC_METIERS) +
    blocERIP(CONFIG_BLOC_PROFIL) +
    blocERIP(CONFIG_BLOC_CORRESPONDANCE) +
    blocERIP(CONFIG_BLOC_PISTES) +
    barreNavigation('projet', 'resultats', '&#128640; Passer a l\'action', { onclickSuivant: 'verifierAvantPasserAction()' });
  app.innerHTML = html;

  wireBlocERIP(CONFIG_BLOC_PISTES, function () { pageRevelation(true); });

  wireBlocERIP(CONFIG_BLOC_CORRESPONDANCE, function () { pageRevelation(true); });

  wireBlocERIP(CONFIG_BLOC_PROFIL, function () { pageRevelation(true); });

  wireBlocERIP(CONFIG_BLOC_METIERS, function () { pageRevelation(true); });

  // TACHE (correction/homogeneisation) : un seul cablage global pour tous
  // les [data-metier-cible] de la page (resume Metiers recommandes, resume
  // Autres pistes, "Voir tous les metiers"), plutot qu'un cablage par bloc.
  wireMetierCibleGlobal(function () { pageRevelation(true); });
  wireCompetencesCliquablesGlobal(function () { pageRevelation(true); });
  wireCompetencesChampCliquablesGlobal(function () { pageRevelation(true); });
  wireBanniereMetierCible(function () { pageRevelation(true); });
  wireRechercheMetierCible(function () { pageRevelation(true); });
  wireAccordeon(function () { pageRevelation(true); });
  // TACHE (avertissement metier cible) : retire la mise en evidence rouge du
  // bandeau des qu'elle a ete montree une fois et que la personne interagit
  // avec la zone (memes codes que wireEvidence(), deja utilisee ailleurs).
  wireEvidenceMetierCible();
}

/* ------------------------------------------------------------
   7. PAGE ACTION (resultats) : experience professionnelle + outils
   ------------------------------------------------------------ */
// TACHE (refonte Mon projet, Etape B) : contenu pur (sans enveloppe carte/
// titre, et sans la liste avec croix individuelle : celle-ci est desormais
// affichee dans le resume du bloc "Vous"). wireLangues fonctionne sans
// changement (memes id de champs).
function contenuLangues() {
  var options = LANGUES_COURANTES.map(function (l) { return '<option value="' + l + '">' + l + '</option>'; }).join('');
  var niveaux = NIVEAUX_LANGUE.map(function (n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');
  return '<p class="mb-2">Indiquer une langue est un vrai atout, surtout dans le commerce, ' +
    'le tourisme et les services. Niveaux du cadre europeen : A1 debutant a C2 langue maternelle.</p>' +
    '<div class="row g-2 mt-2 align-items-center">' +
    '<div class="col-md-5"><select class="form-select form-select-sm" id="langueSelect"><option value="">Choisir une langue</option>' + options + '<option value="__autre">Autre...</option></select></div>' +
    '<div class="col-md-3"><input type="text" class="form-control form-control-sm d-none" id="langueAutre" placeholder="Preciser la langue"></div>' +
    '<div class="col-md-2"><select class="form-select form-select-sm" id="langueNiveau">' + niveaux + '</select></div>' +
    '<div class="col-md-2"><button class="btn btn-primary btn-sm" id="ajouterLangueBtn">+ Ajouter</button></div>' +
    '</div>';
}

// Conservee pour compatibilite (plus appelee par pageProjet depuis l'Etape B).
function blocLangues() {
  var liste = dossier.langues.map(function (l, i) {
    return '<div class="cv-item"><div><strong>' + l.langue + '</strong> &middot; niveau ' + l.niveau +
      '</div><span class="remove-item" data-index="' + i + '" data-type="langue">&#10005;</span></div>';
  }).join('');
  return '<div class="cv-section"><h5>&#127760; Langues</h5>' +
    (liste || '<p class="text-muted">Aucune langue ajoutee.</p>') +
    contenuLangues() + '</div>';
}

// Complement tache 8 : deplace sur l'ecran Revelation, avec mise en evidence
// possible via le bouton "Personnaliser ma candidature".
// TACHE (refonte Mon projet, bloc 1) : rubrique "Mon identite" compactee,
// fusionnee avec "Confidentialite" (civilite + anonymiser/personnaliser en
// pastilles cliquables, meme esprit visuel que .permis-cat). Civilite
// toujours proposee ; Nom/Prenom/Adresse jamais devines.
// TACHE (refonte Mon projet, Etape B) : contenu pur de la rubrique identite
// (sans enveloppe carte/titre), reutilise dans l'accordeon "Identite" du
// bloc "Vous". Le meme cablage (wireIdentite) fonctionne sans changement,
// puisque les id des champs sont identiques.
function contenuIdentite() {
  var id = dossier.identite || {};
  var civiliteVal = id.civilite || '';
  return '<div class="d-flex flex-wrap gap-2 mb-2">' +
    '<span class="pastille' + (civiliteVal === 'Madame' ? ' actif' : '') + '" data-civilite="Madame">Madame</span>' +
    '<span class="pastille' + (civiliteVal === 'Monsieur' ? ' actif' : '') + '" data-civilite="Monsieur">Monsieur</span>' +
    '<span class="pastille' + (!civiliteVal ? ' actif' : '') + '" data-civilite="">Ne pas preciser</span>' +
    '</div>' +
    '<div class="row g-2">' +
    '<div class="col-6 col-md-3"><input type="text" class="form-control form-control-sm" id="identiteNom" placeholder="Nom" value="' + echapperAttribut(id.nom) + '"></div>' +
    '<div class="col-6 col-md-3"><input type="text" class="form-control form-control-sm" id="identitePrenom" placeholder="Prenom" value="' + echapperAttribut(id.prenom) + '"></div>' +
    '<div class="col-6 col-md-3"><input type="tel" class="form-control form-control-sm" id="identiteTelephone" placeholder="Telephone" value="' + echapperAttribut(id.telephone) + '"></div>' +
    '<div class="col-6 col-md-3"><input type="email" class="form-control form-control-sm" id="identiteEmail" placeholder="E-mail" value="' + echapperAttribut(id.email) + '"></div>' +
    '</div>' +
    '<div class="row g-2 mt-1">' +
    '<div class="col-8"><input type="text" class="form-control form-control-sm" id="identiteAdresse" placeholder="Adresse postale" value="' + echapperAttribut(id.adresse) + '"></div>' +
    '<div class="col-4"><input type="text" class="form-control form-control-sm" id="identiteVille" placeholder="Ville" value="' + echapperAttribut(id.ville) + '"></div>' +
    '</div>' +
    '<div class="row g-2 mt-1">' +
    '<div class="col-4"><input type="number" min="0" max="120" class="form-control form-control-sm" id="identiteAge" placeholder="Age" value="' + echapperAttribut(id.age) + '"></div>' +
    '</div>';
}

// TACHE (refonte Mon projet, Etape B) : boutons Anonymiser/Personnaliser/info,
// devenus les "boutons speciaux" toujours visibles du bloc "Vous" (plus a
// l'interieur de l'accordeon Identite).
function boutonsSpeciauxVous() {
  var anon = dossier.anonymiser !== false;
  return '<div class="d-flex align-items-center flex-wrap gap-2 mb-2">' +
    '<div class="d-flex flex-wrap gap-2">' +
    '<span class="pastille' + (anon ? ' actif' : '') + '" data-anon="oui">&#128274; Anonymiser</span>' +
    '<span class="pastille' + (!anon ? ' actif' : '') + '" data-anon="non">&#10024; Personnaliser</span>' +
    '</div>' +
    '<button type="button" id="btnInfoConfidentialite" class="btn-info-confidentialite">&#8505;&#65039; A quoi servent ces informations ?</button>' +
    '</div>';
}

// Conservee pour compatibilite (plus appelee par pageProjet depuis l'Etape B,
// le bloc "Vous" appelle desormais directement contenuIdentite() +
// boutonsSpeciauxVous()).
function blocIdentite() {
  return '<div class="cv-section mt-4 bloc-identite-compact bloc-large"><h5>&#128100; Mon identite</h5>' +
    contenuIdentite() + '<hr class="my-2">' + boutonsSpeciauxVous() + '</div>';
}

// TACHE (refonte Mon projet, Etape B) : contenu pur (sans enveloppe carte/
// titre), reutilise dans l'accordeon "Mobilite" du bloc "Vous". wireMobilite
// fonctionne sans changement (memes id de boutons).
function contenuMobilite() {
  var p = dossier.permis;
  var boutonsPermis = CATEGORIES_PERMIS.map(function (cat) {
    var actif = p.categories.indexOf(cat) !== -1 ? 'active' : '';
    return '<span class="permis-cat ' + actif + '" data-permis="' + cat + '">' + cat + '</span>';
  }).join('');
  var choixOui = p.possede === true ? 'btn-primary' : 'btn-outline-primary';
  var choixNon = p.possede === false ? 'btn-primary' : 'btn-outline-primary';
  var html = '<p class="mb-2">Avez-vous le permis ?</p>' +
    '<button class="btn btn-sm ' + choixOui + ' me-2" id="permisOui">Oui</button>' +
    '<button class="btn btn-sm ' + choixNon + '" id="permisNon">Non</button>';
  if (p.possede === true) {
    html += '<div class="mt-3"><p class="mb-2">Categories obtenues (cliquez pour selectionner) :</p>' + boutonsPermis + '</div>';
    var vOui = p.vehicule === true ? 'btn-primary' : 'btn-outline-primary';
    var vNon = p.vehicule === false ? 'btn-primary' : 'btn-outline-primary';
    html += '<div class="mt-3"><p class="mb-2">Disposez-vous d\'un moyen de transport personnel ?</p>' +
      '<button class="btn btn-sm ' + vOui + ' me-2" id="vehiculeOui">Oui</button>' +
      '<button class="btn btn-sm ' + vNon + '" id="vehiculeNon">Non</button></div>';
  }
  return html;
}

// Conservee pour compatibilite (plus appelee par pageProjet depuis l'Etape B).
function blocMobilite() {
  return '<div class="cv-section mt-4' + (doitMettreEnEvidence('mobilite') ? ' a-completer' : '') + '" id="blocMobiliteCible"><h5>&#128663; Mobilite</h5>' +
    contenuMobilite() + '</div>';
}

// Complement tache 8 : extrait de la section CV et deplace sur l'ecran Revelation,
// avec mise en evidence possible via le bouton "Personnaliser ma candidature".
// TACHE (refonte Mon projet, Etape C) : contenu pur (formulaire d'ajout
// uniquement, la liste passe dans le resume du bloc "Parcours"). wireFormation
// fonctionne sans changement (memes id de champs).
// TACHE (refonte Formations et diplomes) : deux parties distinctes dans la
// meme sous-section -- (1) le niveau de diplome, UNE seule valeur a la fois
// (dossier.niveauFormation), choisie par pastilles parmi NIVEAUX_DIPLOME_SIMPLES
// (jamais de RNCP saisi directement, donc jamais d'incoherence type "CAP"+8) ;
// (2) les autres formations (CACES, FIMO, habilitations...), qui n'ont pas de
// niveau RNCP comparable et restent une petite liste (plafond 5, inchange).
// TACHE (refonte Formations et diplomes, v2) : plus qu'une seule chose ici,
// le niveau de diplome (dossier.niveauFormation, une seule valeur). Les
// "autres formations" (CACES, FIMO, habilitations...) sont retirees : elles
// faisaient doublon avec la rubrique "Certifications", deja prevue pour ca.
// L'intitule est affiche en premier (visible sans avoir a chercher plus bas).
// Cliquer sur le niveau deja actif l'efface (remplace l'ancien bouton "Effacer").
function contenuFormations() {
  var nf = dossier.niveauFormation || null;
  var niveauActuel = NIVEAUX_DIPLOME_SIMPLES.filter(function (n) { return nf && n.rncp === nf.niveauRNCP; })[0];
  var placeholderIntitule = niveauActuel ? niveauActuel.placeholder : 'Choisissez d\'abord un niveau ci-dessous';
  var pastillesNiveau = NIVEAUX_DIPLOME_SIMPLES.map(function (n) {
    var actif = (nf && nf.niveauRNCP === n.rncp) ? ' actif' : '';
    return '<span class="pastille' + actif + '" data-niveau-diplome="' + n.rncp + '">' + n.label + '</span>';
  }).join('');

  return '<div class="row g-2 mb-3">' +
    '<div class="col-8">' +
    '<input type="text" class="form-control form-control-sm" id="niveauFormationIntitule" placeholder="' + echapperAttribut(placeholderIntitule) + '"' +
    (nf ? '' : ' disabled') + ' value="' + echapperAttribut(nf ? nf.intitule : '') + '"></div>' +
    '<div class="col-4">' +
    '<input type="text" class="form-control form-control-sm" id="niveauFormationAnnee" placeholder="Année (ex. 2022)"' +
    (nf ? '' : ' disabled') + ' value="' + echapperAttribut(nf ? (nf.annee || '') : '') + '"></div>' +
    '</div>' +
    '<p class="mb-2">Quel est le niveau de votre diplôme ?</p>' +
    '<div class="pastilles">' + pastillesNiveau + '</div>';
}

// Conservee pour compatibilite (plus appelee par pageProjet depuis l'Etape C).
function blocFormations() {
  var formHtml = dossier.formations.map(function (f, i) {
    return '<div class="cv-item"><div><strong>' + f.intitule + '</strong>' +
      '</div><span class="remove-item" data-index="' + i + '" data-type="form">&#10005;</span></div>';
  }).join('');
  return '<div class="cv-section mt-4' + (doitMettreEnEvidence('formation') ? ' a-completer' : '') + '" id="blocFormationCible"><h5>&#127891; Formations et diplomes</h5>' +
    (formHtml || '<p class="text-muted">Aucune formation.</p>') +
    contenuFormations() + '</div>';
}

// Liste des metiers recommandes (saisis d'abord, puis moteur), max 10
// TACHE (refonte Potentiel, Etape B) : un seul moteur de recherche intelligent
// utilise partout dans l'application (demande explicite). Combine la
// recherche exacte par nom (rechercherBaseConnaissances, deja utilisee par
// la barre de recherche ERIP) et la recherche par le sens (rechercherMetiersDepuisTexte,
// concepts + score) -- exactement les memes fonctions, aucune duplication.
function rechercherMetiersPourAjout(texte) {
  if (!texte || normaliserTexte(texte).trim().length < 2) { return []; }
  var noms = [];
  var resultats = [];
  rechercherBaseConnaissances(texte).forEach(function (g) {
    if (g.type === 'metier') {
      g.resultats.forEach(function (m) { if (noms.indexOf(m.nom) === -1) { noms.push(m.nom); resultats.push(m); } });
    }
  });
  rechercherMetiersDepuisTexte(texte, 8).forEach(function (m) {
    if (noms.indexOf(m.nom) === -1) { noms.push(m.nom); resultats.push(m); }
  });
  return resultats.slice(0, 8);
}

// TACHE (refonte Potentiel, Etape B — correction) : rechercherMetiersDebutants()
// tire aleatoirement (voulu, pour varier les suggestions a chaque visite),
// mais cela rendait metiersRecommandes() incoherente entre son utilisation
// pour l'affichage (resume, compteur) et pour la suppression (qui la
// rappelait separement) : deux tirages differents, deux listes differentes.
// Mise en cache pour la duree d'un rendu ; invalidee explicitement quand la
// page se recharge ou que la liste change reellement.
var _metiersRecommandesCache = null;
function metiersRecommandes() {
  if (_metiersRecommandesCache) { return _metiersRecommandesCache; }
  var noms = [];
  dossier.metiersAjoutes.forEach(function (m) {
    if (noms.indexOf(m) === -1 && dossier.metiersExclus.indexOf(m) === -1) { noms.push(m); }
  });
  var moteur = rienEteChoisi() ? rechercherMetiersDebutants(10) : rechercherMetiers(construireProfil(), 10);
  moteur.forEach(function (m) {
    if (noms.indexOf(m.nom) === -1 && dossier.metiersExclus.indexOf(m.nom) === -1 && noms.length < 10) { noms.push(m.nom); }
  });
  _metiersRecommandesCache = noms.slice(0, 10);
  return _metiersRecommandesCache;
}
function invaliderCacheMetiersRecommandes() { _metiersRecommandesCache = null; }

// Bloc metiers recommandes : selectionnables un a la fois pour cibler le CV
function blocMetiersRecommandes() {
  var liste = metiersRecommandes();
  if (liste.length === 0) { return ''; }
  var chips = liste.map(function (nom) {
    var fiche = metierParNom(nom);
    var actif = dossier.metierCible === nom ? 'metier-actif' : '';
    var lien = fiche
      ? '<a href="' + lienFicheROME(fiche) + '" target="_blank" rel="noopener" class="rome-link" title="Fiche France Travail (ROME ' + fiche.rome + ')">&#128279;</a>'
      : '';
    return '<span class="metier-chip ' + actif + '" data-metier-cible="' + nom + '">' + nom + ' ' + lien + '</span>';
  }).join('');
  return '<div class="mt-4' + (doitMettreEnEvidence('metier') ? ' a-completer' : '') + '" id="blocMetiersRecommandes"><h4>&#128188; Metiers recommandes pour vous</h4>' +
    '<p class="text-muted small">Choisissez un metier ci-dessous pour personnaliser votre CV a ce poste. ' +
    'Une fois votre CV realise, revenez sur cette page pour selectionner un autre metier et generer un nouveau CV cible. ' +
    'Cliquez sur le lien pour voir la fiche France Travail.</p>' +
    '<div class="metiers-chips">' + chips + '</div>' +
    (dossier.metierCible
      ? '<p class="mt-2 small text-success">Metier vise pour le CV : <strong>' + dossier.metierCible + '</strong></p>'
      : '<p class="mt-2 small"><strong>Si vous ne choisissez pas de metier precis, votre CV sera general, ' +
        'oriente vers les metiers recommandes ci-dessus.</strong></p>') +
    '</div>';
}

// Complement tache 8 : bouton assistant de personnalisation du CV specifique.
// Affiche des que le mode CV specifique est actif (jamais en mode CV general),
// que le metier soit deja choisi ou non : il aide a completer toutes les
// informations utiles au CV, a la lettre de motivation et a l'entretien.
// Etape 9 : verification automatique de 4 informations. Le bouton n'apparait
// que si le mode CV specifique est actif ET qu'au moins une info manque.
function informationsSuffisantesPourCVSpecifique() {
  return informationsCandidatureSuffisantes() &&
    dossier.permis.possede !== null &&
    !!dossier.niveauFormation &&
    !!dossier.metierCible;
}

function blocPersonnaliserCandidature() {
  if (dossier.typeCV !== 'specifique' || informationsSuffisantesPourCVSpecifique()) { return ''; }
  return '<div class="mt-3 mb-2">' +
    '<button class="btn btn-outline-primary btn-lg" id="btnPersonnaliserCandidature">&#10024; Compléter mon dossier</button>' +
    '<p class="text-muted small mt-2">Complétez quelques informations pour obtenir des documents plus personnalisés.</p>' +
    '</div>';
}

// Complement tache 8 : choix exclusif CV general / CV specifique, affiche au-dessus
// des cartes "Creer votre CV / Lettre de motivation / Preparer un entretien".
function blocTypeCV() {
  var estGeneral = dossier.typeCV !== 'specifique';
  return '<div class="type-cv-choix">' +
    '<label class="type-cv-option"><input type="radio" name="typeCV" value="general"' + (estGeneral ? ' checked' : '') + '> CV général</label>' +
    '<label class="type-cv-option"><input type="radio" name="typeCV" value="specifique"' + (!estGeneral ? ' checked' : '') + '> CV spécifique</label>' +
    '</div>' +
    blocPersonnaliserCandidature();
}

// TACHE 47 : composant generique "accordeon" (replie par defaut), pense pour
// etre reutilise par d'autres blocs de l'application. Etat en memoire
// uniquement (pas de sauvegarde persistante, redevient replie au rechargement).
var etatAccordeon = {};

// id : identifiant unique du bloc ; titre : affiche en gras, toujours visible ;
// texteIntro : court texte d'invitation, toujours visible sous le titre ;
// contenuHTML : contenu affiche uniquement lorsque le bloc est ouvert.
function blocAccordeon(id, titre, texteIntro, contenuHTML) {
  var ouvert = !!etatAccordeon[id];
  return '<div class="accordeon' + (ouvert ? ' ouvert' : '') + '">' +
    '<button type="button" class="accordeon-entete" data-accordeon="' + id + '">' +
    '<strong>' + titre + '</strong>' +
    '<span class="accordeon-fleche">' + (ouvert ? '&#9650;' : '&#9660;') + '</span>' +
    '</button>' +
    (texteIntro ? '<p class="text-muted small accordeon-intro">' + texteIntro + '</p>' : '') +
    (ouvert ? '<div class="accordeon-corps">' + contenuHTML + '</div>' : '') +
    '</div>';
}

// Cablage generique : a appeler apres le rendu de la page contenant un ou
// plusieurs blocAccordeon(). rerender = fonction de page a rappeler au clic.
function wireAccordeon(rerender) {
  document.querySelectorAll('[data-accordeon]').forEach(function (el) {
    el.addEventListener('click', function () {
      var id = this.dataset.accordeon;
      etatAccordeon[id] = !etatAccordeon[id];
      rerender();
    });
  });
}

/* ------------------------------------------------------------
   TACHE (refonte Mon projet, Etape A) : composant generique "Bloc ERIP".
   Ne remplace PAS blocAccordeon()/wireAccordeon() ci-dessus (toujours
   utilises par "Ressources et liens utiles" sur l'ecran Action) : il
   s'agit d'un systeme d'accordeons GROUPES (un seul ouvert a la fois PAR
   BLOC), necessaire pour le tableau de bord "Mon projet", construit a
   part pour ne prendre aucun risque sur l'existant.
   ------------------------------------------------------------ */
var etatAccordeonGroupe = {};   // { [blocId]: sousSectionIdOuverte | null }
// TACHE (point 5, refonte Mon projet) : un seul des 5 blocs est developpe a
// la fois (comme un accordeon, mais au niveau des cartes elles-memes). "Vous"
// ouvert par defaut au premier chargement, pour ne pas arriver sur une page
// entierement repliee.
var etatBlocERIPOuvert = 'vous';
var etatConfirmationReset = {}; // { [blocId]: true } tant que la confirmation est affichee

// Plafond commun aux catalogues "resume" (Langues, Formations, Certifications,
// Loisirs, Engagements, Experiences perso) : au-dela, on invite a retirer un
// element avant d'en ajouter un autre, plutot que d'empiler indefiniment.
var LIMITE_CATALOGUE_RESUME = 5;

// compteur X / Y d'un bloc, a partir de la fonction complet() de chaque sous-section.
function compteurBlocERIP(config) {
  var sousSections = resoudreSousSections(config);
  var total = sousSections.length;
  var complet = sousSections.filter(function (s) { return !!s.complet(); }).length;
  return { complet: complet, total: total };
}

// TACHE (refonte Mon projet) : les sous-sections peuvent etre une liste fixe
// (cas simple, ex. bloc "Vous") ou une fonction recalculee a chaque rendu
// (cas ou une sous-section apparait/disparait selon le contexte, ex.
// "Formations" masquee quand dossier.modeCreation === 'pret').
function resoudreSousSections(config) {
  return typeof config.sousSections === 'function' ? config.sousSections() : config.sousSections;
}

// config = {
//   id, icone, titre,
//   boutonsSpeciaux: function() -> HTML (facultatif, uniquement "Vous"),
//   resume: function() -> [{ label, icone }],
//   resumeOnSuppression: function(index),
//   onResetTout: function(),
//   sousSections: [{
//     id, titre,
//     complet: function() -> bool,
//     icone: function() -> HTML (facultatif, ex. etat mobilite/identite),
//     infoBulle: function() -> texte (facultatif, attribut title au survol),
//     contenuHTML: function() -> HTML,
//     wire: function(rerender) (facultatif, cablage du contenu si ouvert)
//   }]
// }
function blocERIP(config) {
  var compteur = compteurBlocERIP(config);
  var sousSections = resoudreSousSections(config);
  // TACHE (point 5, refonte Mon projet) : les blocs eux-memes deviennent
  // repliables, un seul ouvert a la fois (meme principe que les accordeons
  // internes, mais applique cette fois aux 5 cartes du tableau de bord).
  var blocNecessiteEvidence = sousSections.some(function (s) { return s.enEvidence && s.enEvidence(); });
  var blocOuvert = (etatBlocERIPOuvert === config.id) || blocNecessiteEvidence;

  // TACHE (complement) : le resume (choix deja faits) reste visible meme
  // bloc replie -- seuls les accordeons de saisie se cachent. Calcule donc
  // avant la branche "ferme" pour etre reutilise dans les deux cas.
  // TACHE (refonte Potentiel, complement) : config.resumeHTML permet un
  // rendu entierement personnalise (utilise pour les metiers : croix de
  // suppression + nom cliquable + trombone ROME, disposition differente
  // d'une simple pastille "label + croix").
  var htmlResumeCalc;
  if (config.resumeHTML) {
    var contenuResumeHTML = config.resumeHTML();
    htmlResumeCalc = contenuResumeHTML
      ? '<div class="resume-bloc-erip">' + contenuResumeHTML + '</div>'
      : '<p class="text-muted small mb-0">Rien renseigné pour le moment.</p>';
  } else {
    var resumeItemsCalc = config.resume ? config.resume() : [];
    htmlResumeCalc = resumeItemsCalc.length
      ? '<div class="resume-bloc-erip">' + resumeItemsCalc.map(function (item, i) {
          // TACHE (complement) : l'icone (ex. "&#128181;") ne doit jamais passer par
          // echapperAttribut() dans le contenu affiche -- sinon elle s'affiche en
          // texte brut au lieu de l'emoji. Seul le texte (label/tooltip) est echappe.
          // TACHE (refonte Potentiel, Etape C) : si le bloc ne definit pas
          // resumeOnSuppression (donnee derivee automatiquement, ex. "Analyse
          // de votre profil"), la pastille reste informative -- pas de croix
          // "✕" trompeuse qui laisserait croire a une suppression possible.
          var supprimable = !!config.resumeOnSuppression;
          return '<span class="pastille actif' + (supprimable ? '' : ' pastille-lecture') + '"' +
            (supprimable ? ' data-bloc-resume="' + config.id + '" data-resume-index="' + i + '"' : '') +
            (item.tooltip ? ' title="' + echapperAttribut(item.tooltip) + '"' : '') + '>' +
            (item.icone ? item.icone + ' ' : '') + echapperAttribut(item.label) + (supprimable ? ' &#10005;' : '') + '</span>';
        }).join('') + '</div>'
      : '<p class="text-muted small mb-0">Rien renseigné pour le moment.</p>';
  }

  // TACHE (complement) : indicateur "bloc entierement complete" (ex. 3/3),
  // visible que le bloc soit ouvert ou replie.
  // TACHE (refonte Potentiel, Etape A) : un bloc peut fournir un compteur
  // personnalise (ex. "8 metiers") plutot que le X/Y habituel -- utile
  // quand la notion de "complet" n'a pas de sens (une liste de metiers
  // recommandes n'est jamais "terminee"). N'affecte aucun bloc existant
  // de Mon projet (aucun d'eux ne definit compteurTexte).
  var texteCompteur = config.compteurTexte ? config.compteurTexte() : (compteur.complet + ' / ' + compteur.total);
  // TACHE (complement) : indicateur "bloc entierement complete" (ex. 3/3),
  // visible que le bloc soit ouvert ou replie. N'a pas de sens pour un
  // compteur personnalise (pas de notion de "total a atteindre").
  var blocComplet = !config.compteurTexte && compteur.total > 0 && compteur.complet === compteur.total;
  var indicateurComplet = blocComplet ? ' <span class="bloc-erip-complet" title="Ce bloc est complet">&#9989;</span>' : '';

  if (!blocOuvert) {
    return '<div class="cv-section bloc-erip bloc-erip-ferme' + (config.classe ? ' ' + config.classe : '') + '" id="blocERIP-' + config.id + '">' +
      '<div class="bloc-erip-entete" data-bloc-toggle="' + config.id + '">' +
      (config.masquerReset ? '' : '<button type="button" class="bloc-erip-reset" data-bloc-reset="' + config.id + '" title="Tout effacer dans ce bloc">&#10060;</button>') +
      '<h5>' + config.icone + ' ' + config.titre + '</h5>' +
      '<span class="bloc-erip-compteur">' + texteCompteur + '</span>' +
      indicateurComplet +
      '<span class="bloc-erip-fleche">&#9660;</span>' +
      '</div>' +
      // TACHE (complement) : les boutons speciaux (Anonymiser/Personnaliser/info,
      // uniquement sur "Vous") restent visibles meme replie, pour pouvoir
      // changer d'avis a tout moment sans avoir a ouvrir le bloc.
      (config.boutonsSpeciaux ? config.boutonsSpeciaux() : '') +
      // TACHE (complement, allegement visuel page Potentiel) : certains blocs
      // (Metiers recommandes, Analyse de votre profil, Ce qui vous correspond,
      // Autres pistes) masquent desormais leur resume quand ils sont fermes --
      // seul l'indicateur (compteur/complet ci-dessus) reste visible replie ;
      // le detail (competences, metiers) n'apparait qu'a l'ouverture du bloc.
      (config.masquerResumeSiFerme ? '' : htmlResumeCalc) +
      '</div>';
  }
  var sousSectionOuverte = etatAccordeonGroupe[config.id] || null;
  // TACHE (refonte Mon projet) : si une sous-section doit etre mise en
  // evidence (signal venu de l'ecran Potentiel) et qu'aucune autre n'est
  // deja ouverte manuellement, on l'ouvre automatiquement — sinon
  // l'utilisateur ne verrait jamais le signal derriere un accordeon ferme.
  if (!sousSectionOuverte) {
    var aSurligner = sousSections.filter(function (s) { return s.enEvidence && s.enEvidence(); })[0];
    if (aSurligner) { sousSectionOuverte = aSurligner.id; }
  }
  var confirmationEnCours = !!etatConfirmationReset[config.id];
  var htmlResume = htmlResumeCalc;

  var htmlSousSections = sousSections.map(function (s) {
    var ouvert = (sousSectionOuverte === s.id);
    var enEvidence = !!(s.enEvidence && s.enEvidence());
    var icone = s.icone ? s.icone() : '';
    var infoBulle = s.infoBulle ? s.infoBulle() : '';
    var idCorps = 'accordeonERIP-' + config.id + '-' + s.id;
    return '<div class="accordeon-erip' + (ouvert ? ' ouvert' : '') + (enEvidence ? ' a-completer' : '') + '" id="' + idCorps + '">' +
      '<button type="button" class="accordeon-erip-entete" data-bloc-accordeon="' + config.id + '" data-sous-section="' + s.id + '">' +
      '<span>&#9656; ' + s.titre + '</span>' +
      (icone ? '<span class="accordeon-erip-icone" title="' + echapperAttribut(infoBulle) + '">' + icone + '</span>' : '') +
      '</button>' +
      (ouvert ? '<div class="accordeon-erip-corps">' + s.contenuHTML() + '</div>' : '') +
      '</div>';
  }).join('');

  var htmlConfirmation = confirmationEnCours
    ? '<div class="confirmation-reset-bloc"><p class="mb-2 small">Effacer toutes les informations de ce bloc ?</p>' +
      '<button type="button" class="btn btn-sm btn-danger me-2" data-bloc-reset-confirmer="' + config.id + '">Oui, tout effacer</button>' +
      '<button type="button" class="btn btn-sm btn-outline-secondary" data-bloc-reset-annuler="' + config.id + '">Annuler</button></div>'
    : '';

  return '<div class="cv-section bloc-erip' + (config.classe ? ' ' + config.classe : '') + '" id="blocERIP-' + config.id + '">' +
    '<div class="bloc-erip-entete" data-bloc-toggle="' + config.id + '">' +
    (config.masquerReset ? '' : '<button type="button" class="bloc-erip-reset" data-bloc-reset="' + config.id + '" title="Tout effacer dans ce bloc">&#10060;</button>') +
    '<h5>' + config.icone + ' ' + config.titre + '</h5>' +
    '<span class="bloc-erip-compteur">' + texteCompteur + '</span>' +
    indicateurComplet +
    '<span class="bloc-erip-fleche">&#9650;</span>' +
    '</div>' +
    (config.boutonsSpeciaux ? config.boutonsSpeciaux() : '') +
    htmlConfirmation +
    htmlResume +
    htmlSousSections +
    '</div>';
}

function wireBlocERIP(config, rerender) {
  // TACHE (point 5, refonte Mon projet) : clic sur l'en-tete du bloc = plie/
  // deplie. La croix de reinitialisation est a l'interieur de cet en-tete :
  // on ignore son clic ici (stopPropagation cote bouton) pour ne pas plier/
  // deplier le bloc en meme temps qu'on demande sa reinitialisation.
  var enteteToggle = document.querySelector('[data-bloc-toggle="' + config.id + '"]');
  if (enteteToggle) {
    enteteToggle.addEventListener('click', function (e) {
      if (e.target.closest('[data-bloc-reset]')) { return; }
      etatBlocERIPOuvert = (etatBlocERIPOuvert === config.id) ? null : config.id;
      rerender();
    });
  }
  document.querySelectorAll('[data-bloc-accordeon="' + config.id + '"]').forEach(function (el) {
    el.addEventListener('click', function () {
      var sid = this.dataset.sousSection;
      etatAccordeonGroupe[config.id] = (etatAccordeonGroupe[config.id] === sid) ? null : sid;
      rerender();
    });
  });
  document.querySelectorAll('[data-bloc-resume="' + config.id + '"]').forEach(function (el) {
    el.addEventListener('click', function () {
      var idx = parseInt(this.dataset.resumeIndex, 10);
      if (config.resumeOnSuppression) { config.resumeOnSuppression(idx); }
      rerender();
    });
  });
  // TACHE (correction/homogeneisation) : croix de suppression du composant
  // unifie "carte metier" (resumeHTML), scope au bloc par le meme id.
  document.querySelectorAll('[data-metier-resume-suppr="' + config.id + '"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      var idx = parseInt(this.dataset.resumeIndex, 10);
      if (config.resumeOnSuppression) { config.resumeOnSuppression(idx); }
      rerender();
    });
  });
  var btnReset = document.querySelector('[data-bloc-reset="' + config.id + '"]');
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      etatConfirmationReset[config.id] = true;
      etatBlocERIPOuvert = config.id; // le bloc peut etre plie : on le deplie pour voir la confirmation
      rerender();
    });
  }
  var btnConfirmer = document.querySelector('[data-bloc-reset-confirmer="' + config.id + '"]');
  if (btnConfirmer) {
    btnConfirmer.addEventListener('click', function () {
      if (config.onResetTout) { config.onResetTout(); }
      etatConfirmationReset[config.id] = false;
      etatAccordeonGroupe[config.id] = null;
      rerender();
    });
  }
  var btnAnnuler = document.querySelector('[data-bloc-reset-annuler="' + config.id + '"]');
  if (btnAnnuler) {
    btnAnnuler.addEventListener('click', function () { etatConfirmationReset[config.id] = false; rerender(); });
  }
  // Cablage du contenu de la sous-section actuellement ouverte, delegue a la config.
  var sousSectionsResolues = resoudreSousSections(config);
  var sousSectionOuverte = etatAccordeonGroupe[config.id] || null;
  if (sousSectionOuverte) {
    var sous = sousSectionsResolues.filter(function (s) { return s.id === sousSectionOuverte; })[0];
    if (sous && sous.wire) { sous.wire(rerender); }
  }
  // TACHE (refonte Mon projet) : reutilise wireEvidence() telle quelle (non
  // modifiee) pour chaque sous-section concernee par une mise en evidence.
  sousSectionsResolues.forEach(function (s) {
    if (s.clefEvidence) { wireEvidence(s.clefEvidence, 'accordeonERIP-' + config.id + '-' + s.id); }
  });
  // Cablage des boutons speciaux (uniquement le bloc "Vous" en a) : Anonymiser/
  // Personnaliser/info, toujours presents, meme quand aucun accordeon n'est ouvert.
  if (config.wireBoutonsSpeciaux) { config.wireBoutonsSpeciaux(rerender); }
}

// TACHE (refonte Mon projet, Etape B) : configuration reelle du bloc "Vous"
// (Identite, Mobilite, Langues). Resume unifie car les trois sous-sections
// alimentent une seule liste de pastilles (nom, prenom, permis, langues),
// avec suppression individuelle qui retourne chaque info a son etat vide
// d'origine (identique a la logique deja existante pour les catalogues).
function resumeVous() {
  var items = [];
  var id = dossier.identite || {};
  // TACHE (complement) : nom/prenom/adresse/tel/email/civilite consolides en
  // UN SEUL element "Coordonnees" (plutot que des pastilles separees) ;
  // le detail complet apparait au survol (infobulle), sans besoin d'une
  // icone ✅ distincte -- la presence meme de ce chip suffit a signaler
  // que quelque chose est renseigne.
  var champsRenseignes = [id.civilite, id.prenom, id.nom, id.adresse, id.telephone, id.email, id.ville, id.age].filter(Boolean);
  if (champsRenseignes.length) {
    var tooltip = [id.civilite, id.prenom, id.nom].filter(Boolean).join(' ') +
      (id.age ? ', ' + id.age + ' ans' : '') +
      (id.adresse ? ' — ' + id.adresse : '') +
      (id.ville ? ' (' + id.ville + ')' : '') +
      (id.telephone ? ' — ' + id.telephone : '') +
      (id.email ? ' — ' + id.email : '');
    items.push({ label: 'Coordonnées', source: 'coordonnees', tooltip: tooltip });
  }
  if (dossier.permis && dossier.permis.possede === true) {
    var lbl = 'Permis' + (dossier.permis.categories.length ? ' ' + dossier.permis.categories.join(', ') : '');
    items.push({ label: lbl, source: 'permis', icone: iconeMobilite(), tooltip: infoBulleMobilite() });
  }
  (dossier.langues || []).forEach(function (l, i) {
    items.push({ label: l.langue + ' ' + l.niveau, source: 'langue', index: i });
  });
  return items;
}
function resumeOnSuppressionVous(idx) {
  var item = resumeVous()[idx];
  if (!item) { return; }
  if (item.source === 'coordonnees') {
    dossier.identite.nom = ''; dossier.identite.prenom = ''; dossier.identite.adresse = '';
    dossier.identite.telephone = ''; dossier.identite.email = ''; dossier.identite.ville = ''; dossier.identite.age = '';
  }
  else if (item.source === 'permis') { dossier.permis.possede = null; dossier.permis.categories = []; dossier.permis.vehicule = null; }
  else if (item.source === 'langue') { dossier.langues.splice(item.index, 1); }
}
function identiteEstComplete() {
  var id = dossier.identite || {};
  return !!(id.nom && id.prenom && id.adresse && id.telephone && id.email && id.civilite);
}
function iconeMobilite() {
  if (!dossier.permis || dossier.permis.possede !== true) { return ''; }
  return dossier.permis.vehicule === true ? '&#128663;' : '&#129706;';
}
function infoBulleMobilite() {
  var p = dossier.permis;
  if (!p || p.possede !== true) { return 'Permis non renseigne.'; }
  var texte = 'Permis' + (p.categories.length ? ' ' + p.categories.join(', ') : '');
  texte += p.vehicule === true ? ' + vehicule personnel' : ' — sans vehicule personnel';
  return texte;
}
var CONFIG_BLOC_VOUS = {
  id: 'vous', icone: '&#128100;', titre: 'Vous', classe: 'bloc-large',
  boutonsSpeciaux: boutonsSpeciauxVous,
  wireBoutonsSpeciaux: function (rerender) {
    document.querySelectorAll('[data-anon]').forEach(function (el) {
      el.addEventListener('click', function () { dossier.anonymiser = (this.dataset.anon === 'oui'); rerender(); });
    });
    var btnInfo = document.getElementById('btnInfoConfidentialite');
    if (btnInfo) { btnInfo.addEventListener('click', ouvrirModaleInfoIdentite); }
  },
  resume: resumeVous,
  resumeOnSuppression: resumeOnSuppressionVous,
  onResetTout: function () {
    dossier.identite = { civilite: null, nom: '', prenom: '', adresse: '', telephone: '', email: '', ville: '', age: '' };
    dossier.permis = { possede: null, categories: [], vehicule: null };
    dossier.langues = [];
  },
  sousSections: [
    {
      id: 'identite', titre: 'Identité',
      complet: identiteEstComplete,
      contenuHTML: contenuIdentite,
      wire: function (rerender) { wireIdentite(rerender); }
    },
    {
      id: 'mobilite', titre: 'Mobilité',
      complet: function () { return dossier.permis && dossier.permis.possede !== null; },
      icone: iconeMobilite,
      infoBulle: infoBulleMobilite,
      contenuHTML: contenuMobilite,
      wire: function (rerender) { wireMobilite(rerender); },
      enEvidence: function () { return doitMettreEnEvidence('mobilite'); },
      clefEvidence: 'mobilite'
    },
    {
      id: 'langues', titre: 'Langues',
      complet: function () { return dossier.langues.length > 0; },
      contenuHTML: contenuLangues,
      wire: function (rerender) { wireLangues(rerender); }
    }
  ]
};
// TACHE (demande) : variante du bloc "Vous" pour la page Action -- memes
// champs/fonctions que Mon projet (Identite, Mobilite, Anonymiser/
// Personnaliser, info), SAUF la sous-section "Langues", jugee pas
// necessaire ici. Reutilise tout le reste de CONFIG_BLOC_VOUS a l'identique
// (memes fonctions), juste avec une sous-section en moins.
var CONFIG_BLOC_VOUS_ACTION = {
  id: 'vous', icone: CONFIG_BLOC_VOUS.icone, titre: CONFIG_BLOC_VOUS.titre, classe: CONFIG_BLOC_VOUS.classe,
  boutonsSpeciaux: CONFIG_BLOC_VOUS.boutonsSpeciaux,
  wireBoutonsSpeciaux: CONFIG_BLOC_VOUS.wireBoutonsSpeciaux,
  resume: CONFIG_BLOC_VOUS.resume,
  resumeOnSuppression: CONFIG_BLOC_VOUS.resumeOnSuppression,
  onResetTout: CONFIG_BLOC_VOUS.onResetTout,
  sousSections: CONFIG_BLOC_VOUS.sousSections.filter(function (s) { return s.id !== 'langues'; })
};

// TACHE (refonte Mon projet, Etape C) : configuration reelle du bloc
// "Parcours" (Formations, Certifications, Expériences et savoir-faire
// personnels). Meme logique de resume unifie + suppression ciblee que le
// bloc "Vous".
function resumeParcours() {
  var items = [];
  if (dossier.niveauFormation) {
    var nf = dossier.niveauFormation;
    var label = nf.niveauVisible + (nf.intitule ? ' — ' + nf.intitule : '') + (nf.annee ? ' (' + nf.annee + ')' : '');
    items.push({ label: label, source: 'niveauFormation' });
  }
  (dossier.certifications || []).forEach(function (c, i) { items.push({ label: c, source: 'certification', index: i }); });
  (dossier.experiencesPerso || []).forEach(function (e, i) { items.push({ label: e.intitule, source: 'experiencePerso', index: i }); });
  return items;
}
function resumeOnSuppressionParcours(idx) {
  var item = resumeParcours()[idx];
  if (!item) { return; }
  if (item.source === 'niveauFormation') { dossier.niveauFormation = null; }
  else if (item.source === 'certification') { dossier.certifications.splice(item.index, 1); }
  else if (item.source === 'experiencePerso') { dossier.experiencesPerso.splice(item.index, 1); }
}
var CONFIG_BLOC_PARCOURS = {
  id: 'parcours', icone: '&#127891;', titre: 'Parcours',
  resume: resumeParcours,
  resumeOnSuppression: resumeOnSuppressionParcours,
  onResetTout: function () {
    dossier.niveauFormation = null;
    dossier.formations = [];
    dossier.certifications = [];
    dossier.experiencesPerso = [];
    dossier.catalogueActif = dossier.catalogueActif || {};
    delete dossier.catalogueActif.certifications;
    delete dossier.catalogueActif.experiencesPerso;
  },
  sousSections: function () {
    var sections = [];
    // TACHE 8 (regle preexistante, preservee) : Formations masquee si un CV
    // complet a deja ete depose ("J'ai deja un CV"), les formations y figurent deja.
    if (dossier.modeCreation !== 'pret') {
      sections.push({
        id: 'formations', titre: 'Formations et diplômes',
        complet: function () { return !!dossier.niveauFormation; },
        contenuHTML: contenuFormations,
        wire: function (rerender) { wireFormation(rerender); },
        enEvidence: function () { return doitMettreEnEvidence('formation'); },
        clefEvidence: 'formation'
      });
    }
    sections.push({
      id: 'certifications', titre: 'Certifications',
      // TACHE (complement) : "complet" ne depend plus de la presence d'au
      // moins un element, mais du fait d'avoir REPONDU (Oui ou Non) --
      // repondre "Non" est une reponse valide, pas une case a completer.
      complet: function () { return !!dossier.catalogueActif && dossier.catalogueActif.certifications !== undefined; },
      contenuHTML: function () { return contenuCatalogueOuiNon(CONFIG_CERTIFICATIONS); },
      wire: function (rerender) { wireCatalogueOuiNon(CONFIG_CERTIFICATIONS, rerender); }
    });
    sections.push({
      id: 'experiencesPerso', titre: 'Expériences et savoir-faire personnels',
      complet: function () { return !!dossier.catalogueActif && dossier.catalogueActif.experiencesPerso !== undefined; },
      contenuHTML: function () { return contenuCatalogueOuiNon(CONFIG_EXPERIENCES_PERSO); },
      wire: function (rerender) { wireCatalogueOuiNon(CONFIG_EXPERIENCES_PERSO, rerender); }
    });
    return sections;
  }
};

// TACHE (refonte Mon projet, Etape D) : configuration reelle du bloc "Projet
// professionnel" (Type de contrat, Temps de travail, J'accepte également,
// Disponibilité). Meme logique de resume unifie + suppression ciblee.
function resumeProjet() {
  var items = [];
  // TACHE (complement) : si TOUS les types de contrat sont selectionnes
  // (bouton "Tout"), un seul chip consolide plutot qu'une pastille par type
  // -- le detail complet reste visible au survol (infobulle).
  if (dossier.contrat.length && CONTRATS.every(function (c) { return dossier.contrat.indexOf(c) !== -1; })) {
    items.push({ label: 'Tous types de contrat', source: 'contrat-tout', tooltip: CONTRATS.join(', ') });
  } else {
    dossier.contrat.forEach(function (c, i) { items.push({ label: c, source: 'contrat', index: i }); });
  }
  if (dossier.tempsTravail.length && TEMPS_TRAVAIL.every(function (t) { return dossier.tempsTravail.indexOf(t) !== -1; })) {
    items.push({ label: 'Peu importe', source: 'tempsTravail-tout', tooltip: TEMPS_TRAVAIL.join(', ') });
  } else {
    dossier.tempsTravail.forEach(function (t, i) { items.push({ label: t, source: 'tempsTravail', index: i }); });
  }
  dossier.accepte.forEach(function (a, i) {
    var o = ACCEPTE.filter(function (x) { return x.id === a; })[0];
    // TACHE (correction bug) : le label ACCEPTE contient une icone HTML
    // ("&#128181; Emploi alimentaire") en debut de chaine -- il faut la
    // separer du texte, sinon echapperAttribut() la transforme en texte
    // brut illisible au lieu de l'emoji.
    if (o) {
      var m = o.label.match(/^(&#\d+;)\s*(.*)$/);
      items.push({ label: m ? m[2] : o.label, icone: m ? m[1] : '', source: 'accepte', index: i });
    } else {
      items.push({ label: a, source: 'accepte', index: i });
    }
  });
  var of = (dossier.objectif && dossier[dossier.objectif]) || {};
  (of.dispo || []).forEach(function (d, i) { items.push({ label: d, source: 'dispo', index: i }); });
  return items;
}
function resumeOnSuppressionProjet(idx) {
  var item = resumeProjet()[idx];
  if (!item) { return; }
  if (item.source === 'contrat-tout') { dossier.contrat = []; }
  else if (item.source === 'tempsTravail-tout') { dossier.tempsTravail = []; }
  else if (item.source === 'contrat') { dossier.contrat.splice(item.index, 1); }
  else if (item.source === 'tempsTravail') { dossier.tempsTravail.splice(item.index, 1); }
  else if (item.source === 'accepte') { dossier.accepte.splice(item.index, 1); }
  else if (item.source === 'dispo') {
    var of = dossier.objectif && dossier[dossier.objectif];
    if (of && of.dispo) { of.dispo.splice(item.index, 1); }
  }
}
var CONFIG_BLOC_PROJET = {
  id: 'projet', icone: '&#128188;', titre: 'Projet professionnel',
  resume: resumeProjet,
  resumeOnSuppression: resumeOnSuppressionProjet,
  onResetTout: function () {
    dossier.contrat = [];
    dossier.tempsTravail = [];
    dossier.accepte = [];
    dossier.accepteAucune = false;
    var of = dossier.objectif && dossier[dossier.objectif];
    if (of) { of.dispo = []; }
  },
  sousSections: [
    {
      id: 'contrat', titre: 'Type de contrat recherché',
      complet: function () { return dossier.contrat.length > 0; },
      contenuHTML: function () { return contenuPastillesChamp('contrat', CONTRATS); }
    },
    {
      id: 'tempsTravail', titre: 'Temps de travail',
      complet: function () { return dossier.tempsTravail.length > 0; },
      contenuHTML: function () { return contenuPastillesChamp('tempsTravail', TEMPS_TRAVAIL); }
    },
    {
      id: 'accepte', titre: 'J\'accepte également',
      complet: function () { return dossier.accepte.length > 0 || dossier.accepteAucune === true; },
      contenuHTML: contenuAccepte
    },
    {
      id: 'disponibilite', titre: 'Disponibilité',
      complet: function () { var of = (dossier.objectif && dossier[dossier.objectif]) || {}; return (of.dispo || []).length > 0; },
      contenuHTML: contenuDisponibilite,
      wire: function (rerender) { wireDisponibilite(rerender); }
    }
  ]
};

// TACHE (refonte Mon projet, Etape E) : configuration reelle du bloc
// "Candidature" (une seule sous-section : Informations sur votre candidature,
// dont le contenu varie deja selon dossier.objectif via contenuCandidature()).
function resumeCandidature() {
  var o = dossier.objectif;
  var obj = (o && dossier[o]) || {};
  var items = [];
  if (obj.structure) { items.push({ label: obj.structure, source: 'structure' }); }
  if (obj.poste) { items.push({ label: obj.poste, source: 'poste' }); }
  if (obj.lien) { items.push({ label: obj.lien, source: 'lien' }); }
  if (o === 'stage' || o === 'alternance' || o === 'pmsmp') {
    if (obj.duree) { items.push({ label: obj.duree, source: 'duree' }); }
    if (obj.dates) { items.push({ label: obj.dates, source: 'dates' }); }
    if (obj.heures) { items.push({ label: obj.heures, source: 'heures' }); }
  }
  return items;
}
function resumeOnSuppressionCandidature(idx) {
  var o = dossier.objectif;
  var obj = o && dossier[o];
  var item = resumeCandidature()[idx];
  if (!obj || !item) { return; }
  obj[item.source] = '';
}
var CONFIG_BLOC_CANDIDATURE = {
  id: 'candidature', icone: '&#128221;', titre: 'Candidature',
  resume: resumeCandidature,
  resumeOnSuppression: resumeOnSuppressionCandidature,
  onResetTout: function () {
    var o = dossier.objectif;
    var obj = o && dossier[o];
    if (!obj) { return; }
    obj.lien = ''; obj.structure = ''; obj.poste = '';
    if (o === 'stage' || o === 'alternance' || o === 'pmsmp') {
      obj.duree = ''; obj.dates = ''; obj.heures = '';
    }
  },
  sousSections: [
    {
      id: 'informations', titre: 'Informations sur votre candidature',
      complet: informationsCandidatureSuffisantes,
      contenuHTML: contenuCandidature,
      wire: function (rerender) { wireObjectifDetails(); },
      enEvidence: function () { return doitMettreEnEvidence('candidature'); },
      clefEvidence: 'candidature'
    }
  ]
};

// TACHE (refonte Mon projet, Etape F) : configuration reelle du bloc
// "Compléments" (Loisirs, Engagements) — dernier bloc du tableau de bord.
// Meme logique de resume unifie + suppression ciblee que les blocs precedents.
function resumeComplements() {
  var items = [];
  (dossier.loisirs || []).forEach(function (l, i) { items.push({ label: l, source: 'loisir', index: i }); });
  (dossier.engagements || []).forEach(function (e, i) { items.push({ label: e, source: 'engagement', index: i }); });
  return items;
}
function resumeOnSuppressionComplements(idx) {
  var item = resumeComplements()[idx];
  if (!item) { return; }
  if (item.source === 'loisir') { dossier.loisirs.splice(item.index, 1); }
  else if (item.source === 'engagement') { dossier.engagements.splice(item.index, 1); }
}
var CONFIG_BLOC_COMPLEMENTS = {
  id: 'complements', icone: '&#127917;', titre: 'Compléments',
  resume: resumeComplements,
  resumeOnSuppression: resumeOnSuppressionComplements,
  onResetTout: function () {
    dossier.loisirs = [];
    dossier.engagements = [];
    dossier.catalogueActif = dossier.catalogueActif || {};
    delete dossier.catalogueActif.loisirs;
    delete dossier.catalogueActif.engagements;
  },
  sousSections: [
    {
      id: 'loisirs', titre: 'Loisirs',
      complet: function () { return !!dossier.catalogueActif && dossier.catalogueActif.loisirs !== undefined; },
      contenuHTML: function () { return contenuCatalogueOuiNon(CONFIG_LOISIRS); },
      wire: function (rerender) { wireCatalogueOuiNon(CONFIG_LOISIRS, rerender); }
    },
    {
      id: 'engagements', titre: 'Engagements',
      complet: function () { return !!dossier.catalogueActif && dossier.catalogueActif.engagements !== undefined; },
      contenuHTML: function () { return contenuCatalogueOuiNon(CONFIG_ENGAGEMENTS); },
      wire: function (rerender) { wireCatalogueOuiNon(CONFIG_ENGAGEMENTS, rerender); }
    }
  ]
};

function pageResultats() {
  var competences = deduireCompetences();
  var savoirEtre = competences.filter(function (c) { return categorieCompetence[c] === 'Savoir-etre'; });
  var savoirFaire = competences.filter(function (c) { return categorieCompetence[c] === 'Savoir-faire'; });
  var savoirs = obtenirSavoirs();
  var metiers = suggererMetiers();

  var expHtml = dossier.experiences.map(function (e, i) { return '<div class="cv-item"><div><strong>' + e.poste + '</strong> &ndash; ' + e.entreprise + ' (' + e.lieu + ')<br><small>' + e.dateDebut + ' &rarr; ' + (e.dateFin || 'En cours') + '</small>' + (e.missions ? '<br><small class="text-muted">' + e.missions + '</small>' : '') + '</div><span class="remove-item" data-index="' + i + '" data-type="exp">&#10005;</span></div>'; }).join('');

  var cvComplet = (dossier.modeCreation !== 'pret');
  var sectionsCV = '';
  if (cvComplet) {
    sectionsCV =
      '<div class="mt-3"><h5>Experience professionnelle</h5>' + (expHtml || '<p class="text-muted">Aucune experience.</p>') +
      '<div class="row g-2 mt-2"><div class="col-md-3"><input type="text" class="form-control form-control-sm" id="expPoste" placeholder="Poste"></div>' +
      '<div class="col-md-3"><input type="text" class="form-control form-control-sm" id="expEntreprise" placeholder="Entreprise / proche"></div>' +
      '<div class="col-md-2"><input type="text" class="form-control form-control-sm" id="expLieu" placeholder="Lieu"></div>' +
      '<div class="col-md-2"><input type="month" class="form-control form-control-sm" id="expDateDebut"></div>' +
      '<div class="col-md-2"><input type="month" class="form-control form-control-sm" id="expDateFin"></div></div>' +
      '<div class="row g-2 mt-1"><div class="col-12">' +
      '<textarea class="form-control form-control-sm" id="expMissions" rows="2" placeholder="Missions / taches principales (optionnel)"></textarea>' +
      '</div></div>' +
      '<button class="btn btn-primary btn-sm mt-2" id="ajouterExpBtn">+ Ajouter</button></div><hr>';
  }

  var html = afficherProgression('resultats') +
    '<div class="text-center"><h1>&#128640; Passons a l\'action</h1><p class="sousTitre">Vous avez les cles. Completez votre profil puis choisissez votre etape.</p></div>' +
    '<div class="cv-section"><h4>&#128196; Mon CV</h4>' +
    sectionsCV + '</div>' +
    '<div class="row mt-4"><div class="col-md-6">' +
    blocAccordeon('profil', '&#128203; Votre profil', '',
      '<div><h5>Savoir-etre</h5>' + (savoirEtre.length ? savoirEtre.map(function (c) { return '<span class="badge bg-success badge-cliquable m-1" data-competence-nom="' + echapperAttribut(c) + '">' + c + '</span>'; }).join('') : 'Aucun') + '</div>' +
      '<div><h5>Savoir-faire</h5>' + (savoirFaire.length ? savoirFaire.map(function (c) { return '<span class="badge bg-primary badge-cliquable m-1" data-competence-nom="' + echapperAttribut(c) + '">' + c + '</span>'; }).join('') : 'Aucun') + '</div>' +
      '<div><h5>Savoirs</h5>' + (savoirs.length ? savoirs.map(function (c) { return '<span class="badge bg-info badge-cliquable m-1" data-competence-nom="' + echapperAttribut(c) + '">' + c + '</span>'; }).join('') : 'Aucun') + '</div>') +
    blocAccordeon('export-canva', '&#128424; Imprimer mon CV', '',
      '<p class="mb-3">Prévisualisez votre CV avant de l\'imprimer. Choisissez parmi plusieurs modèles de ' +
      'présentation, puis imprimez-le ou enregistrez-le au format PDF directement depuis la fenêtre d\'aperçu. ' +
      'Les fonctions d\'export complémentaires (dont Canva) restent disponibles dans la fenêtre ' +
      '&laquo;&nbsp;Créer votre CV&nbsp;&raquo;, section &laquo;&nbsp;Exporter&nbsp;&raquo;.</p>' +
      '<button type="button" class="btn-copy" id="btnApercuCVAction">&#128269; Aperçu du CV</button>') +
    '</div>' +
    '<div class="col-md-6">' +
    // TACHE (correction : fonctions manquantes) : reutilise desormais le
    // VRAI bloc "Vous" complet (blocERIP(CONFIG_BLOC_VOUS), identique a Mon
    // projet -- Identite + Mobilite + Langues + Anonymiser/Personnaliser +
    // "A quoi servent ces informations ?"), plutot qu'une version simplifiee
    // qui ne reprenait que l'identite. Le bouton "Je valide", lui, reste
    // propre a CETTE page (pas ajoute a CONFIG_BLOC_VOUS, donc absent de
    // Mon projet), desactive (style outil-desactive) tant que tous les
    // champs texte ne sont pas remplis.
    '<div id="blocIdentiteAction"' + (identiteActionEnEvidence ? ' class="a-completer"' : '') + '>' +
    blocERIP(CONFIG_BLOC_VOUS_ACTION) +
    '<div class="cv-section text-center mt-2 mb-3">' +
    '<button type="button" class="btn-copy' + (identiteActionEstComplete() ? '' : ' outil-desactive') + '" id="btnValiderIdentiteAction" ' +
    (identiteActionEstComplete() ? '' : 'title="Completez toutes les informations ci-dessus pour continuer."') + '>' +
    '&#9989; Je valide</button>' +
    (identiteActionEstComplete() ? '' : '<p class="small text-muted mt-1 mb-0">Merci de completer toutes les informations ci-dessus (Identite : nom, prenom, telephone, e-mail, adresse, ville, age).</p>') +
    '</div></div>' +
    '<p class="small text-muted mb-1">Avec l\'assistant IA</p><div class="outils-grid">' +
    '<div class="outil-item outil-ia outil-ia-grand' + (cvDisponible() ? '' : ' outil-desactive') + '" data-outil="cv"' +
      (cvDisponible() ? '' : ' title="Deposez ou creez d\'abord votre CV pour activer cette option."') +
      '><i class="bi bi-file-earmark-text"></i> &#128196; Créer votre CV</div>' +
    '<div class="outil-item outil-ia outil-ia-grand" data-outil="lettre"><i class="bi bi-envelope"></i> &#9993; Lettre de motivation</div>' +
    '<div class="outil-item outil-ia outil-ia-grand" data-outil="entretien"><i class="bi bi-chat-dots"></i> &#127908; Préparer un entretien</div>' +
    '</div>' +
    blocAccordeon('ressources', '&#128218; Ressources et liens utiles',
      'Vous souhaitez poursuivre votre réflexion ou découvrir d\'autres possibilités ? Cliquez ici pour accéder aux ressources complémentaires proposées.',
      '<div class="outils-grid">' +
      '<div class="outil-item" data-outil="pmsmp"><i class="bi bi-search"></i> &#128269; Trouver une immersion (PMSMP)</div>' +
      '<div class="outil-item" data-outil="formation"><i class="bi bi-mortarboard"></i> &#127891; Trouver une formation</div>' +
      '<div class="outil-item" data-outil="explorer"><i class="bi bi-compass"></i> &#129517; Explorer d\'autres métiers</div>' +
      '</div>') +
    '</div></div></div>' +
    barreNavigation('revelation', null, null, { recommencer: true });
  app.innerHTML = html;

  brancherEvenementsResultats();
}

function brancherEvenementsResultats() {
  // TACHE 47 : accordeon "Ressources et liens utiles" (replie par defaut)
  wireAccordeon(pageResultats);

  // TACHE (demande : meme systeme partout) : pastilles de competences
  // "Votre profil" -> meme ecran de choix que sur la page Potentiel.
  wireCompetencesCliquablesGlobal(pageResultats);

  // TACHE (renommage bandeau "Imprimer mon CV") : reutilise directement la
  // fonction ouvrirApercuCV() existante, sans aucune modification -- seul
  // l'emplacement du bouton declencheur change (fusionne ici, l'ancien
  // bouton independant "Apercu du CV (Beta)" est retire pour eviter un
  // doublon).
  var btnApercuCVAction = document.getElementById('btnApercuCVAction');
  if (btnApercuCVAction) {
    btnApercuCVAction.addEventListener('click', function () { ouvrirApercuCV(); });
  }

  // Outils
  document.querySelectorAll('.outil-item').forEach(function (el) {
    el.addEventListener('click', function () {
      var outil = this.dataset.outil;
      // TACHE (demande : identite avant CV/lettre/entretien) : pour ces 3
      // outils uniquement, verifie d'abord que "Vous" est complet. Si non,
      // met le bloc en evidence, memorise la demande, et n'ouvre rien --
      // "Je valide" (ci-dessous) reprendra cette demande une fois complete.
      if ((outil === 'cv' || outil === 'lettre' || outil === 'entretien') && !identiteActionEstComplete()) {
        demandeOutilEnAttente = outil;
        identiteActionEnEvidence = true;
        // TACHE (correction bug : bloc "Vous" pas forcement ouvert) :
        // blocERIP() utilise 2 etats -- le bloc lui-meme (etatBlocERIPOuvert)
        // et la sous-section deplie a l'interieur (etatAccordeonGroupe) --
        // les deux doivent etre ouverts pour que les champs existent dans le
        // DOM, sinon le defilement ci-dessous ne trouve rien.
        etatBlocERIPOuvert = 'vous';
        etatAccordeonGroupe.vous = 'identite';
        pageResultats();
        var blocVous = document.getElementById('blocIdentiteAction');
        if (blocVous) { blocVous.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }
      if (outil === 'cv') {
        if (!cvDisponible()) { return; } // carte desactivee : aucun CV disponible
        ouvrirAideIA('cv');
      } else if (outil === 'lettre') {
        if (cvDisponible()) {
          ouvrirAideIA('lettre');
        } else {
          // Complement tache 8 : reutilisation de la fenetre de depot du CV,
          // avec des textes adaptes au contexte "lettre de motivation".
          ouvrirFenetreCV(null, {
            titre: '&#9993; Avant de créer votre lettre de motivation',
            intro: 'Déposez votre CV pour que l\'assistant puisse rédiger une lettre de motivation cohérente ' +
              'avec votre profil. Formats acceptés : PDF, Word (.docx) ou texte (.txt). Votre CV est lu ' +
              'directement dans votre navigateur, il n\'est envoyé nulle part.',
            onTerminer: function () { ouvrirAideIA('lettre'); }
          });
        }
      } else if (outil === 'entretien') {
        // TACHE (correction anonymisation) : la fenetre de confirmation
        // d'identite a ete retiree (source de confusion : elle demandait
        // Nom/Prenom/Adresse tout en promettant l'anonymisation). L'anonymisation
        // fonctionne desormais sans jamais exiger ces informations au prealable.
        var lancerEntretien = function () {
          ouvrirAideIA('entretien');
        };
        if (cvDisponible()) {
          lancerEntretien();
        } else {
          // Complement tache 8 : nouvelle fenetre CV (obligatoire) + lettre (facultative).
          ouvrirFenetreEntretien(lancerEntretien);
        }
      }
      else if (outil === 'pmsmp') { window.open('https://immersion-facile.beta.gouv.fr/', '_blank'); }
      else if (outil === 'formation') { window.open('https://rafael.cap-metiers.pro/recherche/accueil', '_blank'); }
      else if (outil === 'explorer') { window.open('https://www.parcoureo.fr/', '_blank'); }
    });
  });

  // TACHE (correction : fonctions manquantes) : cablage du VRAI bloc "Vous"
  // complet (meme mecanisme que Mon projet, gere Identite/Mobilite/Langues/
  // Anonymiser-Personnaliser/info en interne) + du bouton "Je valide",
  // propre a cette page.
  wireBlocERIP(CONFIG_BLOC_VOUS_ACTION, pageResultats);
  var btnValiderIdentite = document.getElementById('btnValiderIdentiteAction');
  if (btnValiderIdentite) {
    btnValiderIdentite.addEventListener('click', function () {
      if (!identiteActionEstComplete()) { return; } // garde-fou : le bouton est desactive dans ce cas, mais par securite
      identiteActionEnEvidence = false;
      var outilEnAttente = demandeOutilEnAttente;
      demandeOutilEnAttente = null;
      pageResultats();
      if (outilEnAttente) {
        // Reutilise directement le clic sur la carte correspondante,
        // maintenant que l'identite est complete.
        var carte = document.querySelector('.outil-item[data-outil="' + outilEnAttente + '"]');
        if (carte) { carte.click(); }
      }
    });
  }

  // Suppressions (experience, langue, experience perso)
  wireRemoveItems(pageResultats);

  // Experience
  var expBtn = document.getElementById('ajouterExpBtn');
  if (expBtn) {
    expBtn.addEventListener('click', function () {
      var poste = document.getElementById('expPoste').value.trim();
      var entreprise = document.getElementById('expEntreprise').value.trim();
      var lieu = document.getElementById('expLieu').value.trim();
      var dateDebut = document.getElementById('expDateDebut').value;
      var dateFin = document.getElementById('expDateFin').value;
      var missions = document.getElementById('expMissions').value.trim();
      if (poste && entreprise && lieu && dateDebut) {
        dossier.experiences.push({ poste: poste, entreprise: entreprise, lieu: lieu, dateDebut: dateDebut, dateFin: dateFin, missions: missions });
        pageResultats();
      } else { alert('Remplissez Poste, Entreprise, Lieu et Date de debut.'); }
    });
  }

  // Langues : cablage regroupe dans wireLangues (appelee depuis pageProjet)

}

/* ------------------------------------------------------------
   8. AIDE IA : profil visible + prompt CACHE, bouton Copier
   ------------------------------------------------------------ */
// TACHE 43 : anonymisation automatique (preparation d'entretien uniquement).
// Ne retire QUE des valeurs connues avec certitude : celles deja confirmees
// dans dossier.identite (jamais devinees), plus e-mails/telephones/liens
// detectes par un motif fiable (le meme que celui utilise pour l'extraction).
function anonymiserTexte(texte) {
  var t = String(texte || '');
  if (!t) { return t; }
  var id = dossier.identite || {};
  [id.nom, id.prenom, id.adresse, id.telephone, id.email, id.ville, id.age].forEach(function (valeur) {
    if (valeur && String(valeur).trim()) {
      var echappe = String(valeur).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp(echappe, 'gi'), '[information supprimee]');
    }
  });
  // Filets fiables complementaires (au cas ou une valeur n'aurait pas encore ete confirmee)
  t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[information supprimee]');
  t = t.replace(/(?:(?:\+33|0033)[\s.-]?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}/g, '[information supprimee]');
  t = t.replace(/https?:\/\/\S+/gi, '[lien supprime]');
  t = t.replace(/\bwww\.\S+/gi, '[lien supprime]');
  return t;
}

function texteProfil(type) {
  var metiers = suggererMetiers().join(', ');
  var competences = deduireCompetences();
  var savoirEtre = competences.filter(function (c) { return categorieCompetence[c] === 'Savoir-etre'; }).join(', ');
  var savoirFaire = competences.filter(function (c) { return categorieCompetence[c] === 'Savoir-faire'; }).join(', ');
  var savoirs = obtenirSavoirs().join(', ');
  var valeurs = dossier.valeurs.map(function (v) { var d = trouverItemParId(CATALOGUE_VALEURS_PROFESSIONNELLES, v); return d ? d.label : v; }).join(', ');

  var langues = dossier.langues.map(function (l) { return l.langue + ' (' + l.niveau + ')'; }).join(', ');
  var permis = '';
  if (dossier.permis.possede === true) {
    permis = 'Permis ' + (dossier.permis.categories.length ? dossier.permis.categories.join(', ') : 'oui');
    if (dossier.permis.vehicule === true) { permis += ', vehicule personnel'; }
    else if (dossier.permis.vehicule === false) { permis += ', sans vehicule'; }
  } else if (dossier.permis.possede === false) {
    permis = 'Pas de permis';
  }

  var t = 'PROFIL DU CANDIDAT\n';
  if (dossier.metierCible) { t += '- Metier vise (a cibler en priorite pour le CV) : ' + dossier.metierCible + '\n'; }
  else if (dossier.secteurCible) { t += '- Secteur d\'activite vise (pas un metier precis, documents adaptes au secteur) : ' + dossier.secteurCible + '\n'; }
  // TACHE (correction, CV general/specifique sans effet) : le choix devient
  // desormais une instruction explicite dans le profil transmis a l'IA --
  // uniquement pour la generation du CV lui-meme (pas pour la lettre ou
  // l'entretien, ou cette distinction n'a pas de sens).
  if (type === 'cv') {
    if (dossier.typeCV === 'specifique' && dossier.metierCible) {
      var ficheCibleTypeCV = metierParNom(dossier.metierCible);
      t += '- Mode CV SPECIFIQUE active : adaptez precisement ce CV aux exigences du metier vise ci-dessus, plutot qu\'un CV generique.';
      if (ficheCibleTypeCV) {
        var attendus = [].concat(ficheCibleTypeCV.savoirFaire || [], ficheCibleTypeCV.savoirEtre || [], ficheCibleTypeCV.savoirs || []);
        if (attendus.length) { t += ' Competences typiquement attendues pour ce metier : ' + attendus.join(', ') + '.'; }
      }
      t += '\n';
    } else {
      t += '- Mode CV GENERAL : redigez un CV polyvalent, adaptable a plusieurs employeurs/metiers proches.\n';
    }
  }
  t += '- Objectif : ' + (dossier.objectif || 'non defini') + '\n';
  t += '- Metiers envisages : ' + (metiers || 'non renseigne') + '\n';
  t += '- Savoir-etre : ' + (savoirEtre || 'non renseigne') + '\n';
  t += '- Savoir-faire : ' + (savoirFaire || 'non renseigne') + '\n';
  t += '- Savoirs : ' + (savoirs || 'non renseigne') + '\n';
  t += '- Valeurs : ' + (valeurs || 'non renseigne') + '\n';
  if (dossier.experiences.length) {
    t += '- Experiences professionnelles :\n' + dossier.experiences.map(function (e) {
      return '   . ' + e.poste + ' (' + e.entreprise + ', ' + e.lieu + ', ' + e.dateDebut + ' a ' + (e.dateFin || 'en cours') + ')' + (e.missions ? ' -- Missions : ' + e.missions : '');
    }).join('\n') + '\n';
  }
  if (dossier.experiencesPerso.length) {
    t += '- Experiences personnelles (benevolat, entraide, foyer...) :\n' + dossier.experiencesPerso.map(function (e) {
      return '   . ' + e.intitule + (e.detail ? ' : ' + e.detail : '');
    }).join('\n') + '\n';
  }
  if (dossier.niveauFormation) {
    var nf = dossier.niveauFormation;
    t += '- Niveau de diplome : ' + nf.niveauVisible + (nf.intitule ? ' (' + nf.intitule + ')' : '') + (nf.annee ? ', obtenu en ' + nf.annee : '') + '\n';
  }
  if (langues) { t += '- Langues : ' + langues + '\n'; }
  if (permis) { t += '- Mobilite : ' + permis + '\n'; }
  if (dossier.contrat.length) { t += '- Type de contrat recherche : ' + dossier.contrat.join(', ') + '\n'; }
  if (dossier.tempsTravail.length) { t += '- Temps de travail : ' + dossier.tempsTravail.join(', ') + '\n'; }
  if (dossier.accepte && dossier.accepte.indexOf('alimentaire') !== -1) {
    t += '- Le candidat accepte un emploi alimentaire pour favoriser un retour rapide a l\'emploi.\n';
  }
  if (dossier.accepte && dossier.accepte.indexOf('saisonnier') !== -1) {
    t += '- Le candidat accepte egalement les emplois saisonniers.\n';
  }
  // TACHE 36 : informations saisies via le parcours autonome "Preparer un entretien"
  if (dossier.entretienDirect && (dossier.entretienDirect.structure || dossier.entretienDirect.poste)) {
    if (dossier.entretienDirect.poste) { t += '- Poste vise : ' + dossier.entretienDirect.poste + '\n'; }
    if (dossier.entretienDirect.structure) { t += '- Entreprise / lien : ' + dossier.entretienDirect.structure + '\n'; }
  }
  // TACHE (recherche assistant) : entreprise saisie depuis le parcours guide
  if (dossier.rechercheEntreprise && dossier.rechercheEntreprise.structure) {
    t += '- Entreprise / lien (recherche) : ' + dossier.rechercheEntreprise.structure + '\n';
  }
  if (dossier.objectif === 'offre' || dossier.objectif === 'spontanee' || dossier.objectif === 'reconversion') {
    var of = dossier[dossier.objectif];
    if (dossier.objectif === 'offre') {
      if (of.lien) { t += '- Offre visee (lien) : ' + of.lien + '\n'; }
      if (of.poste || of.structure) { t += '- Poste vise : ' + (of.poste || '?') + (of.structure ? ' chez ' + of.structure : '') + '\n'; }
    } else if (dossier.objectif === 'spontanee') {
      t += '- Demarche : candidature spontanee.\n';
      if (of.lien) { t += '- Offre de reference (lien) : ' + of.lien + '\n'; }
      if (of.poste || of.structure) { t += '- Poste souhaite : ' + (of.poste || '?') + (of.structure ? ' chez ' + of.structure : '') + '\n'; }
    } else { // reconversion
      t += '- Demarche : changer de metier (reconversion).\n';
      if (of.poste) { t += '- Metier vise : ' + of.poste + '\n'; }
      if (of.structure) { t += '- Entreprise cible : ' + of.structure + '\n'; }
      if (of.lien) { t += '- Adresse internet : ' + of.lien + '\n'; }
    }
    if (of.dispo && of.dispo.length) { t += '- Disponibilites : ' + of.dispo.join(', ') + '\n'; }
  }
  if (dossier.objectif === 'stage' || dossier.objectif === 'alternance' || dossier.objectif === 'pmsmp') {
    var im = dossier[CLE_DETAILS[dossier.objectif]];
    var infos = [];
    if (im.structure) { infos.push('structure : ' + im.structure); }
    if (im.poste) { infos.push('poste vise : ' + im.poste); }
    if (im.lien) { infos.push('adresse internet : ' + im.lien); }
    if (im.duree) { infos.push('duree : ' + im.duree); }
    if (im.dates) { infos.push('dates : ' + im.dates); }
    if (im.heures) { infos.push('heures/semaine : ' + im.heures); }
    if (infos.length) { t += '- ' + (dossier.objectif === 'pmsmp' ? 'Immersion (PMSMP)' : (dossier.objectif === 'stage' ? 'Stage' : 'Alternance')) + ' : ' + infos.join(', ') + '\n'; }
    if (im.dispo && im.dispo.length) { t += '- Disponibilites : ' + im.dispo.join(', ') + '\n'; }
  }
  if (dossier.loisirs.length) {
    t += '- Loisirs : ' + dossier.loisirs.join(', ') + '\n';
  }
  if (dossier.engagements && dossier.engagements.length) {
    t += '- Engagements : ' + dossier.engagements.join(', ') + '\n';
  }
  if (dossier.certifications && dossier.certifications.length) {
    t += '- Certifications : ' + dossier.certifications.join(', ') + '\n';
  }
  return t;
}

// Prompt specialise (CACHE a l'ecran). Copie en meme temps que le profil.
// TACHE (prompts externes) : les 3 textes d'instructions envoyes a l'IA (CV,
// lettre de motivation, entretien) peuvent desormais etre modifies SANS
// toucher au code : il suffit d'editer les fichiers prompts/cv.md,
// prompts/lettre.md et prompts/entretien.md (simple texte, aucune syntaxe
// particuliere requise).
//
// Ces fichiers sont charges une seule fois, en arriere-plan, des le tout
// debut du chargement de l'application (voir chargerPromptsExternes(),
// appelee au DOMContentLoaded en bas de ce fichier) -- PAS au moment du
// clic sur "Creer votre CV"/"Lettre de motivation"/"Preparer un entretien" :
// window.open() doit rester appele de facon totalement synchrone au clic,
// sinon la plupart des navigateurs bloquent l'ouverture de la fenetre
// (fenetre popup). Charger en arriere-plan, tot, permet au fichier d'etre
// deja pret au moment ou la personne clique, sans jamais retarder ni
// bloquer cette ouverture.
//
// Si un fichier est introuvable (par exemple le site est ouvert localement
// en double-cliquant sur index.html, sans serveur web -- les navigateurs
// bloquent alors par securite la lecture de fichiers voisins), le texte
// par defaut ci-dessous (promptParDefaut) est utilise a la place :
// aucune fonctionnalite n'est perdue, seule la personnalisation externe
// est indisponible dans ce cas precis (elle fonctionne normalement une
// fois le site deploye sur un hebergement web, ex. GitHub Pages).
var FICHIERS_PROMPTS_EXTERNES = {
  cv: 'prompts/cv.md',
  lettre: 'prompts/lettre.md',
  entretien: 'prompts/entretien.md',
  // TACHE (V2 IA, etape 1) : prompt separe et dedie, pour ne prendre aucun
  // risque sur le prompt principal de redaction du CV (prompts/cv.md).
  accroche: 'prompts/accroche.md'
};
var promptsExternesCharges = { cv: null, lettre: null, entretien: null, accroche: null };

function chargerPromptsExternes() {
  if (typeof fetch !== 'function') { return; } // navigateur trop ancien : reste sur le texte par defaut
  Object.keys(FICHIERS_PROMPTS_EXTERNES).forEach(function (type) {
    fetch(FICHIERS_PROMPTS_EXTERNES[type], { cache: 'no-cache' })
      .then(function (reponse) {
        if (!reponse.ok) { throw new Error('Fichier de prompt introuvable : ' + FICHIERS_PROMPTS_EXTERNES[type]); }
        return reponse.text();
      })
      .then(function (texte) {
        var t = texte.trim();
        if (t) { promptsExternesCharges[type] = t; }
      })
      .catch(function () {
        // Silencieux : le texte par defaut (promptParDefaut) prend le relais,
        // que ce soit une ouverture locale sans serveur ou un fichier absent.
      });
  });
}

// Textes par defaut (utilises tant que le fichier externe correspondant n'a
// pas ete charge avec succes). Identiques aux 3 fichiers prompts/*.md.
function promptParDefaut(type) {
  if (type === 'accroche') {
    return 'Tu es un conseiller en insertion professionnelle. A partir du profil ci-dessous, ' +
      'propose un contenu court pour enrichir un CV : une accroche professionnelle (2 a 4 phrases), ' +
      'une liste de 3 a 5 points forts (phrases courtes), et une liste de 5 a 10 mots-cles pertinents. ' +
      'Reponds UNIQUEMENT avec un objet JSON strictement valide, sans aucun texte avant ou apres, ' +
      'exactement selon ce format : {"profil": "...", "pointsForts": ["...", "..."], "motsCles": ["...", "..."]}.';
  }
  if (type === 'lettre') {
    // TACHE (integration prompt Lettre V2) : texte de secours aligne sur
    // prompts/lettre.md (version validee) -- utilise uniquement si le
    // fichier externe ne peut pas etre charge (ex. site ouvert en file://).
    return 'Tu es un conseiller en insertion professionnelle experimente. Ton role n\'est pas de rediger un texte ' +
      'de lettre mis en forme, mais de construire une veritable strategie de communication, dont la lettre n\'est ' +
      'que le resultat. Une lettre de motivation est un outil de persuasion : elle doit toujours repondre, meme ' +
      'implicitement, a trois questions que se pose tout recruteur : Pourquoi cette personne ? Pourquoi notre ' +
      'entreprise ? Pourquoi maintenant ? Adapte l\'angle et la longueur au type de candidature indique dans le ' +
      'profil (offre, candidature spontanee, reconversion, stage, alternance, immersion). Ne repete jamais le CV : ' +
      'complete-le en donnant du sens au parcours. Choisis, hierarchise, et laisse volontairement de cote ce qui ' +
      'ne sert aucune des trois questions. Ne jamais inventer un fait qui ne figure pas dans le profil. Redige ' +
      'd\'abord quelques phrases lisibles expliquant ta strategie, puis termine IMPERATIVEMENT par un bloc de code ' +
      'JSON strictement valide, exactement selon ce format : {"accroche": "...", "arguments": ["...", "..."]}.';
  }
  if (type === 'entretien') {
    return 'Tu es un conseiller en insertion professionnelle. A partir du profil ci-dessous, ' +
      'prepare la personne a un entretien : liste les questions frequentes, propose des reponses ' +
      'appuyees sur son profil, donne des conseils de presentation et des points a valoriser. ' +
      'Reste bienveillant et concret.';
  }
  // TACHE (integration prompt CV V2) : texte de secours aligne sur
  // prompts/cv.md (version validee) -- utilise uniquement si le fichier
  // externe ne peut pas etre charge (ex. site ouvert en file://). Doit
  // rester coherent avec le vrai fichier pour ne jamais faire retomber
  // silencieusement sur l'ancien prompt V1.
  return 'Tu es un conseiller en insertion professionnelle experimente. Ton role n\'est pas de rediger un CV ' +
    'complet et mis en forme (l\'application s\'en charge deja via ses propres modeles de presentation) : ' +
    'ton role est d\'analyser le profil ci-dessous et de construire une veritable strategie de candidature. ' +
    'Ton objectif n\'est pas de produire le CV le plus complet, mais le plus pertinent : tu selectionnes les ' +
    'informations qui maximisent les chances d\'obtenir un entretien, et tu peux volontairement laisser de ' +
    'cote celles qui n\'apportent pas de valeur pour cette candidature precise. Adapte ta strategie au mode ' +
    'du CV (general ou specifique), au metier ou secteur vise, et au type de candidature indiques dans le ' +
    'profil. Privilegie les competences transferables et les experiences personnelles (benevolat, entraide, ' +
    'gestion du foyer, engagement) quand l\'experience directe dans le metier vise est limitee. Ne jamais ' +
    'inventer un fait qui ne figure pas dans le profil. Redige d\'abord quelques phrases lisibles expliquant ' +
    'ta strategie, puis termine IMPERATIVEMENT par un bloc de code JSON strictement valide, exactement selon ' +
    'ce format : {"profil": "...", "pointsForts": ["...", "..."], "motsCles": ["...", "..."]}.';
}

// TACHE (V2 IA, etape 1 : lien assistant IA -> moteur de rendu) : parsing
// ROBUSTE de la reponse collee par la personne apres avoir demande a l'IA
// le prompt "accroche" (voir prompts/accroche.md). Ne modifie JAMAIS
// dossier.ia en cas d'echec -- retourne uniquement un resultat annonçant le
// succes ou l'echec, avec un message clair (jamais une exception brute).
//
// GENERIQUE et TOLERANT : les assistants IA respectent rarement une consigne
// de format a 100% (ils ajoutent parfois une phrase d'introduction, ou
// entourent leur reponse de balises de code ```json ... ```). Plusieurs
// tentatives d'extraction sont faites, de la plus stricte a la plus
// permissive, avant d'abandonner proprement.
// TACHE (import IA, resume apres import) : construit un petit compte-rendu
// HTML apres un import reussi, en distinguant clairement DEUX sources
// differentes (jamais melangees comme si l'IA les avait toutes fournies) :
// 1. ce que l'IA vient de fournir (resultatIA -- profil/pointsForts/motsCles) ;
// 2. l'etat des lieux du CV tel qu'il existe DEJA dans dossier (faits saisis
//    par la personne), recalcule via normaliserDonneesCV() -- meme source
//    que le moteur de rendu, jamais un comptage separe/duplique.
// Aucun texte libre de l'IA n'est reinjecte ici (uniquement des comptes et
// des booleens) : aucun risque d'injection HTML depuis un contenu externe.
function genererResumeImportCV(resultatIA, dossierActuel) {
  var objetCV = normaliserDonneesCV(dossierActuel);
  var lignes = [];

  lignes.push('<p class="mb-1" style="color:#15803d;">✅ Import terminé avec succès.</p>');

  lignes.push('<p class="mb-1 mt-2"><strong>Contenu ajouté par l\'IA :</strong></p>');
  lignes.push('<p class="mb-0">' + (resultatIA.profil ? '✅ Profil (accroche) détecté' : '⚠️ Aucun profil détecté') + '</p>');
  lignes.push('<p class="mb-0">' + (resultatIA.pointsForts.length ? '✅ ' + resultatIA.pointsForts.length + ' point(s) fort(s) identifié(s)' : '⚠️ Aucun point fort identifié') + '</p>');
  lignes.push('<p class="mb-0">' + (resultatIA.motsCles.length ? '✅ ' + resultatIA.motsCles.length + ' mot(s)-clé(s) identifié(s)' : '⚠️ Aucun mot-clé identifié') + '</p>');

  lignes.push('<p class="mb-1 mt-2"><strong>Aperçu de votre CV :</strong></p>');
  lignes.push('<p class="mb-0">' + (objetCV.experiences.length ? '✅ ' + objetCV.experiences.length + ' expérience(s) professionnelle(s)' : 'ℹ️ Aucune expérience professionnelle renseignée') + '</p>');
  lignes.push('<p class="mb-0">' + (objetCV.formations.length ? '✅ ' + objetCV.formations.length + ' formation(s)' : 'ℹ️ Aucune formation renseignée') + '</p>');
  var nbCompetences = objetCV.competences.savoirFaire.length + objetCV.competences.savoirEtre.length + objetCV.competences.savoirs.length;
  lignes.push('<p class="mb-0">' + (nbCompetences ? '✅ ' + nbCompetences + ' compétence(s)' : 'ℹ️ Aucune compétence déduite') + '</p>');
  lignes.push('<p class="mb-0">' + (objetCV.langues.length ? '✅ ' + objetCV.langues.length + ' langue(s)' : 'ℹ️ Aucune langue renseignée') + '</p>');
  lignes.push('<p class="mb-0">' + (objetCV.photo.url ? '✅ Photo' : '⚠️ Aucune photo') + '</p>');

  // TACHE (gestion intelligente des rubriques) : reutilise EXACTEMENT le
  // meme critere que les templates (tableau vide) pour lister les rubriques
  // qui seront masquees -- jamais une seconde logique de decision.
  var rubriquesVides = [];
  if (!objetCV.experiences.length) { rubriquesVides.push('Expériences professionnelles'); }
  if (!objetCV.experiencesPersonnelles.length) { rubriquesVides.push('Expériences personnelles'); }
  if (!objetCV.formations.length) { rubriquesVides.push('Formations'); }
  if (!objetCV.certifications.length) { rubriquesVides.push('Certifications'); }
  if (!objetCV.langues.length) { rubriquesVides.push('Langues'); }
  if (!objetCV.loisirs.length) { rubriquesVides.push('Loisirs'); }
  if (!objetCV.engagements.length) { rubriquesVides.push('Engagements'); }

  if (rubriquesVides.length) {
    lignes.push('<p class="mb-0 mt-2">ℹ️ ' + rubriquesVides.length + ' rubrique(s) seront automatiquement masquée(s) :</p>');
    lignes.push('<ul class="mb-0">' + rubriquesVides.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>');
  }

  return lignes.join('');
}

// TACHE (integration Lettre V2) : logique de RECHERCHE/EXTRACTION du bloc
// JSON, extraite de l'ancienne analyserReponseIACV() pour etre partagee
// avec le nouveau analyserReponseIALettre() -- une seule logique de
// recherche, jamais dupliquee. Ne fait QUE trouver et parser un objet JSON
// dans le texte colle ; ne connait rien des champs attendus (profil vs
// accroche, etc.), ca reste la responsabilite de chaque fonction appelante.
function extraireBlocJSONDepuisTexte(texteColle) {
  var brut = (texteColle || '').trim();
  if (!brut) { return null; }

  var candidatsJSON = [brut];

  // Tentative : extraire le contenu d'un bloc de code ```json ... ``` ou ``` ... ```
  var blocCode = brut.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (blocCode) { candidatsJSON.push(blocCode[1].trim()); }

  // Tentative : ne garder que la portion entre la premiere '{' et la derniere '}'
  // (utile si l'IA a ajoute une phrase avant ou apres le JSON malgre la consigne).
  var premiereAccolade = brut.indexOf('{');
  var derniereAccolade = brut.lastIndexOf('}');
  if (premiereAccolade !== -1 && derniereAccolade > premiereAccolade) {
    candidatsJSON.push(brut.slice(premiereAccolade, derniereAccolade + 1));
  }

  for (var i = 0; i < candidatsJSON.length; i++) {
    try {
      var tentative = JSON.parse(candidatsJSON[i]);
      if (tentative && typeof tentative === 'object' && !Array.isArray(tentative)) {
        return tentative;
      }
    } catch (e) {
      // Tentative suivante.
    }
  }
  return null;
}

// Normalisations SOUPLES partagees : un champ manquant ou du mauvais type
// retombe sur une valeur neutre plutot que de faire echouer tout le parsing.
function normaliserTexteIA(v) { return (typeof v === 'string') ? v.trim() : ''; }
function normaliserListeTextesIA(v) {
  if (!Array.isArray(v)) { return []; }
  return v.filter(function (e) { return typeof e === 'string'; })
    .map(function (e) { return e.trim(); })
    .filter(function (e) { return e.length > 0; });
}

function analyserReponseIACV(texteColle) {
  if (!(texteColle || '').trim()) {
    return { succes: false, erreur: 'Aucun texte a analyser. Collez la reponse de l\'assistant IA avant de continuer.' };
  }

  var objet = extraireBlocJSONDepuisTexte(texteColle);
  if (!objet) {
    return {
      succes: false,
      erreur: 'Le texte collé ne semble pas être un JSON valide. Vérifiez que vous avez bien copié ' +
        'l\'intégralité de la réponse de l\'IA, sans texte ajouté avant ou après.'
    };
  }

  var resultat = {
    profil: normaliserTexteIA(objet.profil),
    pointsForts: normaliserListeTextesIA(objet.pointsForts),
    motsCles: normaliserListeTextesIA(objet.motsCles)
  };

  if (!resultat.profil && resultat.pointsForts.length === 0 && resultat.motsCles.length === 0) {
    return {
      succes: false,
      erreur: 'Le JSON a été lu, mais ne contient aucune information exploitable ' +
        '(profil, pointsForts ou motsCles). Vérifiez le contenu collé.'
    };
  }

  return { succes: true, valeurs: resultat };
}

// TACHE (integration Lettre V2) : meme principe que analyserReponseIACV(),
// memes garanties de robustesse (jamais d'exception, jamais de plantage),
// mais pour les champs propres a la lettre (accroche/arguments). Reutilise
// extraireBlocJSONDepuisTexte() -- aucune logique de recherche dupliquee.
function analyserReponseIALettre(texteColle) {
  if (!(texteColle || '').trim()) {
    return { succes: false, erreur: 'Aucun texte a analyser. Collez la reponse de l\'assistant IA avant de continuer.' };
  }

  var objet = extraireBlocJSONDepuisTexte(texteColle);
  if (!objet) {
    return {
      succes: false,
      erreur: 'Le texte collé ne semble pas être un JSON valide. Vérifiez que vous avez bien copié ' +
        'l\'intégralité de la réponse de l\'IA, sans texte ajouté avant ou après.'
    };
  }

  var resultat = {
    accroche: normaliserTexteIA(objet.accroche),
    arguments: normaliserListeTextesIA(objet.arguments)
  };

  if (!resultat.accroche && resultat.arguments.length === 0) {
    return {
      succes: false,
      erreur: 'Le JSON a été lu, mais ne contient aucune information exploitable ' +
        '(accroche ou arguments). Vérifiez le contenu collé.'
    };
  }

  return { succes: true, valeurs: resultat };
}

function promptCache(type, profilTexte) {
  var instructions = promptsExternesCharges[type] || promptParDefaut(type);
  return instructions + '\n\n' + profilTexte;
}

// TACHE (demande : export Canva) : genere un CSV pret pour l'import "Bulk
// Create" de Canva (fonctionnalite native de Canva, disponible des l'offre
// Pro -- aucune cle API/serveur necessaire cote ERIP, juste un fichier a
// telecharger puis importer soi-meme dans Canva).
// TACHE (complement) : les noms de colonnes ci-dessous sont un point de
// depart raisonnable -- si le gabarit Canva utilise d'autres noms de champs,
// il suffit de renommer la 1ere ligne du CSV (aucun code a changer), ou de
// me donner les noms exacts pour que je les cable directement ici.
// TACHE (complement, texte ameliore par l'IA) : pour le CONTENU du CV
// (competences/experiences/formation/langues), priorite au texte colle par
// la personne (dossier.texteAmelioreCanva) si rempli -- sinon, retombe sur
// les informations derivees automatiquement du dossier.
// TACHE (correction, donnees incompletes + coherence Anonymiser) :
// - inclureIdentite (parametre) : contrairement a avant (toujours inclus),
//   permet de retirer nom/prenom/email/telephone/adresse -- utilise par la
//   fenetre "Creer votre CV" pour respecter le bouton Anonymiser en direct.
//   L'export de la page Action (bouton independant, pas d'IA impliquee)
//   continue d'appeler cette fonction avec inclureIdentite=true.
// - Ajout de tous les champs deja existants dans le dossier mais absents du
//   CSV jusqu'ici : lieu de chaque experience, permis, contrat(s) recherches,
//   temps de travail, certifications, loisirs, engagements.
function genererCSVCanva(inclureIdentite) {
  if (inclureIdentite === undefined) { inclureIdentite = true; }
  // TACHE (modules/cv-core) : lecture de "dossier" desormais deleguee a
  // extraireDonneesCV() (modules/cv-core/extraireDonneesCV.js), partagee
  // avec normaliserDonneesCV() -- une seule logique d'extraction, pas deux.
  // Le comportement et la sortie CSV restent strictement identiques.
  var donnees = extraireDonneesCV(dossier);
  var id = donnees.identite;
  var texteAmeliore = (donnees.texteAmelioreCanva || '').trim();

  var champs = inclureIdentite
    ? [
        ['Nom', id.nom || ''],
        ['Prenom', id.prenom || ''],
        ['Email', id.email || ''],
        ['Telephone', id.telephone || ''],
        ['Adresse', id.adresse || '']
      ]
    : [];
  champs.push(['Titre_CV', donnees.titreCV || '']);

  if (texteAmeliore) {
    champs.push(['Contenu_CV_ameliore_IA', texteAmeliore]);
  } else {
    var savoirEtre = donnees.competences.savoirEtre.join(', ');
    var savoirFaire = donnees.competences.savoirFaire.join(', ');
    var savoirs = donnees.competences.savoirs.join(', ');
    // TACHE (correction, informations incompletes) : le lieu manquait ici,
    // alors qu'il est bien saisi et disponible dans dossier.experiences.
    var experiencesTxt = donnees.experiences.map(function (e) {
      return e.poste + ' - ' + e.entreprise + ' (' + e.lieu + ') : du ' + e.dateDebut + ' au ' + (e.dateFin || 'aujourd\'hui (poste actuel)') + (e.missions ? '. Missions : ' + e.missions : '');
    }).join(' | ');
    var experiencesPersoTxt = donnees.experiencesPersonnelles.map(function (e) {
      return e.intitule + (e.detail ? ' : ' + e.detail : '');
    }).join(' | ');
    var formationTxt = donnees.formation
      ? (donnees.formation.niveau + (donnees.formation.intitule ? ' - ' + donnees.formation.intitule : '') + (donnees.formation.annee ? ' (' + donnees.formation.annee + ')' : ''))
      : '';
    var certificationsTxt = donnees.certifications.join(', ');
    var languesTxt = donnees.langues.map(function (l) { return l.langue + ' (' + l.niveau + ')'; }).join(', ');
    var permisTxt = donnees.permis.possede
      ? ('Permis ' + donnees.permis.categories.join(', ') + (donnees.permis.vehicule ? ' - vehicule personnel' : ''))
      : '';
    var contratTxt = donnees.contrat.join(', ');
    var tempsTravailTxt = donnees.tempsTravail.join(', ');
    var loisirsTxt = donnees.loisirs.join(', ');
    var engagementsTxt = donnees.engagements.join(', ');
    champs.push(
      ['Competences_savoir_etre', savoirEtre],
      ['Competences_savoir_faire', savoirFaire],
      ['Savoirs', savoirs],
      ['Experiences_professionnelles', experiencesTxt],
      ['Experiences_personnelles_benevolat', experiencesPersoTxt],
      ['Formation', formationTxt],
      ['Certifications', certificationsTxt],
      ['Langues', languesTxt],
      ['Permis', permisTxt],
      ['Type_de_contrat_recherche', contratTxt],
      ['Temps_de_travail_recherche', tempsTravailTxt],
      ['Loisirs', loisirsTxt],
      ['Engagements', engagementsTxt]
    );
  }

  function echapperCSV(val) { return '"' + String(val || '').replace(/"/g, '""') + '"'; }
  var entetes = champs.map(function (c) { return echapperCSV(c[0]); }).join(',');
  var valeurs = champs.map(function (c) { return echapperCSV(c[1]); }).join(',');
  return entetes + '\n' + valeurs;
}

// TACHE (apercu du CV, Beta) : ouvre une fenetre dediee affichant le rendu
// du CV a partir de "dossier" -> normaliserDonneesCV() -> rendreTemplate().
// Lecture seule pour l'instant (aucun champ modifiable ici) : l'edition du
// CV fera l'objet d'une tache independante, une fois ce flux valide.
//
// TACHE (selecteur de modele) : la fenetre contient desormais une liste
// deroulante (construite a partir de MODELES_CV_DISPONIBLES, voir
// modules/cv-editor/modelesDisponibles.js) permettant de changer de modele
// SANS fermer la fenetre ni recharger l'application -- chargerEtAfficherApercuCV()
// est appelee aussi bien a l'ouverture qu'a chaque changement de selection,
// une seule fonction pour les deux cas (aucune logique dupliquee).
//
// GENERIQUE : aucun nom de modele n'est jamais fige dans ce code, ni ici ni
// dans chargerEtAfficherApercuCV() -- tout provient de MODELES_CV_DISPONIBLES
// et du parametre "modele". Ajouter un futur modele ne demande AUCUNE
// modification de ces deux fonctions (voir modelesDisponibles.js).
//
// Reutilise exactement la meme technique de fenetre que ouvrirAideIA() plus
// bas dans ce fichier (window.open('', ...) appele de facon SYNCHRONE au
// clic, puis remplissage du contenu une fois les fichiers du modele charges),
// et le meme principe de reference memorisee que fenetreIAOuverte.
var fenetreApercuCVOuverte = null;
// TACHE (V2 IA, etape 1) : memorise le dernier modele affiche dans la
// fenetre d'apercu, pour pouvoir la rafraichir avec CE MEME modele des que
// dossier.ia est mis a jour (voir rafraichirApercuCVSiOuvert() plus bas).
var dernierModeleApercuAffiche = 'moderne';

// TACHE (selecteur en cartes) : cache simple des metadonnees JSON de chaque
// modele (colors, sections...), pour ne pas les re-telecharger a chaque
// changement de modele -- ce sont de petits fichiers statiques qui ne
// changent jamais en cours de session.
var cacheMetaModelesCV = {};

function obtenirMetaModele(idModele) {
  if (cacheMetaModelesCV[idModele]) { return Promise.resolve(cacheMetaModelesCV[idModele]); }
  return fetch('modules/cv-editor/templates/' + idModele + '/' + idModele + '.json')
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (meta) { cacheMetaModelesCV[idModele] = meta; return meta; })
    .catch(function () { return {}; });
}

// Genere une miniature SVG generique a partir des SEULES metadonnees deja
// presentes dans le JSON du modele (colors.primary/secondary/background,
// presence de "photo" dans sections) -- aucune image a fournir, aucun nom
// de modele en dur : fonctionne automatiquement pour tout futur modele
// respectant le meme schema JSON que les modeles existants.
function genererMiniatureSVG(meta) {
  var couleurs = meta.colors || {};
  var primaire = couleurs.primary || '#999999';
  var secondaire = couleurs.secondary || '#CCCCCC';
  var fond = couleurs.background || '#FFFFFF';
  var avecPhoto = (meta.sections || []).indexOf('photo') !== -1;
  var decalage = avecPhoto ? 34 : 10;

  return '<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="120" height="160" fill="' + fond + '" stroke="#DDDDDD"/>' +
    '<rect x="0" y="0" width="120" height="26" fill="' + primaire + '"/>' +
    (avecPhoto ? '<circle cx="18" cy="13" r="8" fill="' + fond + '"/>' : '') +
    '<rect x="' + decalage + '" y="8" width="50" height="4" fill="' + fond + '"/>' +
    '<rect x="' + decalage + '" y="16" width="30" height="3" fill="' + fond + '"/>' +
    '<rect x="10" y="36" width="70" height="4" fill="' + secondaire + '"/>' +
    '<rect x="10" y="46" width="100" height="3" fill="#E5E5E5"/>' +
    '<rect x="10" y="52" width="100" height="3" fill="#E5E5E5"/>' +
    '<rect x="10" y="58" width="80" height="3" fill="#E5E5E5"/>' +
    '<rect x="10" y="72" width="60" height="4" fill="' + secondaire + '"/>' +
    '<rect x="10" y="82" width="100" height="3" fill="#E5E5E5"/>' +
    '<rect x="10" y="88" width="100" height="3" fill="#E5E5E5"/>' +
    '<rect x="10" y="94" width="90" height="3" fill="#E5E5E5"/>' +
    '<rect x="10" y="108" width="60" height="4" fill="' + secondaire + '"/>' +
    '<rect x="10" y="118" width="100" height="3" fill="#E5E5E5"/>' +
    '<rect x="10" y="124" width="70" height="3" fill="#E5E5E5"/>' +
    '</svg>';
}

// Construit le HTML des cartes (une par modele de MODELES_CV_DISPONIBLES),
// avec indicateur visuel du modele actuellement selectionne. Aucune logique
// specifique a un modele : entierement pilote par le manifeste + les JSON.
function genererCartesSelecteurCV(modeleActif, metasParModele) {
  return MODELES_CV_DISPONIBLES.map(function (m) {
    var meta = metasParModele[m.id] || {};
    var actif = (m.id === modeleActif);
    return '<div class="carte-modele-cv' + (actif ? ' carte-modele-cv-active' : '') + '" data-modele="' + m.id + '">' +
      '<div class="carte-modele-cv-miniature">' + genererMiniatureSVG(meta) + '</div>' +
      '<div class="carte-modele-cv-nom">' + m.nom + (actif ? ' &#9989;' : '') + '</div>' +
      '</div>';
  }).join('');
}

function ouvrirApercuCV(modele) {
  if (!modele) { modele = 'moderne'; }

  if (fenetreApercuCVOuverte && !fenetreApercuCVOuverte.closed) {
    fenetreApercuCVOuverte.focus();
    chargerEtAfficherApercuCV(modele);
    return;
  }

  var win = window.open('', '_blank', 'width=1000,height=900,scrollbars=yes');
  if (!win) { alert('Autorisez les fenetres pop-up pour cet outil.'); return; }
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<title>Aperçu du CV</title></head><body style="font-family:sans-serif;padding:2rem;">' +
    '<p>Chargement de l\'aperçu...</p></body></html>');
  win.document.close();
  fenetreApercuCVOuverte = win;

  chargerEtAfficherApercuCV(modele);
}

// Charge le template+style du modele demande, produit le rendu a partir de
// "dossier", et reecrit ENTIEREMENT le contenu de la fenetre d'apercu deja
// ouverte (barre de selection incluse) -- appelee a l'ouverture initiale ET
// depuis le <select> a l'interieur de la fenetre (via window.opener).
function chargerEtAfficherApercuCV(modele) {
  var win = fenetreApercuCVOuverte;
  if (!win || win.closed) { return; }
  dernierModeleApercuAffiche = modele;

  var cheminTemplate = 'modules/cv-editor/templates/' + modele + '/template.html';
  var cheminStyle = 'modules/cv-editor/templates/' + modele + '/style.css';

  Promise.all([
    fetch(cheminTemplate).then(function (r) {
      if (!r.ok) { throw new Error('Modele "' + modele + '" introuvable.'); }
      return r.text();
    }),
    fetch(cheminStyle).then(function (r) { return r.ok ? r.text() : ''; }),
    // TACHE (selecteur en cartes) : metadonnees de TOUS les modeles du
    // manifeste (pas seulement celui affiche), necessaires pour dessiner
    // chaque miniature de la grille de cartes.
    Promise.all(MODELES_CV_DISPONIBLES.map(function (m) { return obtenirMetaModele(m.id); }))
  ]).then(function (resultats) {
    var templateHtml = resultats[0];
    var styleCss = resultats[1];
    var metas = resultats[2];
    var metasParModele = {};
    MODELES_CV_DISPONIBLES.forEach(function (m, i) { metasParModele[m.id] = metas[i]; });

    var objetCV = normaliserDonneesCV(dossier);
    var corpsRendu = rendreTemplate(objetCV, templateHtml);
    var cartesHtml = genererCartesSelecteurCV(modele, metasParModele);

    var pageComplete = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
      '<title>Aperçu du CV</title>' +
      '<style>' +
      'body{margin:0;background:#F3F4F6;font-family:Arial,sans-serif;}' +
      '.apercu-cv-barre{position:sticky;top:0;background:#FFFFFF;border-bottom:1px solid #E5E7EB;' +
      'padding:0.8rem 1.2rem;z-index:10;}' +
      '.apercu-cv-barre p{margin:0 0 0.6rem 0;font-weight:bold;}' +
      '.apercu-cv-cartes{display:flex;flex-wrap:wrap;align-items:flex-start;gap:0.8rem;}' +
      '.carte-modele-cv{cursor:pointer;border:2px solid #E5E7EB;border-radius:8px;padding:0.4rem;' +
      'width:100px;text-align:center;background:#FFFFFF;transition:border-color 0.15s;}' +
      '.carte-modele-cv:hover{border-color:#93C5FD;}' +
      '.carte-modele-cv-active{border-color:#2563EB;border-width:3px;background:#EFF6FF;}' +
      '.carte-modele-cv-miniature svg{width:100%;height:auto;display:block;border-radius:4px;}' +
      '.carte-modele-cv-nom{font-size:0.8rem;margin-top:0.4rem;color:#1F2937;}' +
      '.apercu-cv-conteneur{padding:1.5rem 0;}' +
      // TACHE (export PDF) : bouton d'impression, exclu de la grille de
      // cartes (marge automatique a gauche pour le separer visuellement).
      '.btn-imprimer-cv{margin-left:auto;align-self:center;background:#2563EB;color:#FFFFFF;border:none;' +
      'border-radius:6px;padding:0.6rem 1.1rem;font-size:0.9rem;cursor:pointer;}' +
      '.btn-imprimer-cv:hover{background:#1D4ED8;}' +
      styleCss +
      // TACHE (export PDF) : feuille @media print GENERIQUE, ajoutee une
      // seule fois ici -- AUCUNE modification des style.css des 6 modeles.
      // Les selecteurs par motif de classe ([class*="-bloc"], [class*=
      // "-experience"], etc.) et l'element "section" couvrent l'ensemble
      // des modeles existants (leurs conventions de nommage deja en place),
      // sans avoir a lister chaque modele individuellement -- reste valable
      // pour un futur modele qui suivrait la meme convention.
      '@media print {' +
      '.apercu-cv-barre { display: none !important; }' +
      'body { background: #FFFFFF !important; }' +
      '.apercu-cv-conteneur { padding: 0 !important; }' +
      '@page { size: A4; margin: 15mm; }' +
      '* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '.apercu-cv-conteneur section, ' +
      '.apercu-cv-conteneur [class*="-bloc"], ' +
      '.apercu-cv-conteneur [class*="-experience"], ' +
      '.apercu-cv-conteneur [class*="-ligne"] { break-inside: avoid; }' +
      '}' +
      '</style>' +
      '</head><body>' +
      '<div class="apercu-cv-barre">' +
      '<p>Modele de CV :</p>' +
      '<div class="apercu-cv-cartes">' + cartesHtml +
      '<button type="button" class="btn-imprimer-cv" id="btnImprimerCV">&#128196; Télécharger / Imprimer le PDF</button>' +
      '</div>' +
      '</div>' +
      '<div class="apercu-cv-conteneur">' + corpsRendu + '</div>' +
      '<script>' +
      'document.querySelectorAll(".carte-modele-cv").forEach(function (carte) {' +
      'carte.addEventListener("click", function () {' +
      'window.opener.chargerEtAfficherApercuCV(this.dataset.modele);' +
      '});' +
      '});' +
      'document.getElementById("btnImprimerCV").addEventListener("click", function () { window.print(); });' +
      '<\/script>' +
      '</body></html>';

    win.document.open();
    win.document.write(pageComplete);
    win.document.close();
  }).catch(function (erreur) {
    win.document.open();
    win.document.write('<p style="font-family:sans-serif;padding:2rem;">Impossible de charger l\'aperçu du CV : ' +
      erreur.message + '</p>');
    win.document.close();
  });
}

// TACHE (V2 IA, etape 1 : lien assistant IA -> moteur de rendu) : rafraichit
// l'apercu du CV, uniquement s'il est deja ouvert, avec le meme modele que
// celui actuellement affiche -- sans rien faire sinon (aucune fenetre a
// ouvrir de force). Appelee automatiquement des que dossier.ia est mis a
// jour avec succes (voir plus bas, fenetre "Creer mon CV").
function rafraichirApercuCVSiOuvert() {
  if (fenetreApercuCVOuverte && !fenetreApercuCVOuverte.closed) {
    chargerEtAfficherApercuCV(dernierModeleApercuAffiche);
  }
}

function ouvrirAideIA(type) {
  var profil = texteProfil(type);
  var prefixe = promptCache(type, '').replace(/\n+$/, '');   // instructions seules
  // TACHE (V2 IA, etape 1) : prompt separe, uniquement utilise dans la
  // fenetre "Creer mon CV" (estFenetreCV plus bas), mais calcule ici pour
  // rester au meme endroit que les autres prompts de cette fonction.
  var promptAccrocheComplet = promptCache('accroche', profil);
  var titres = { cv: '📄 Creer un CV', lettre: '✉️ Lettre de motivation', entretien: '🎤 Preparer un entretien' };
  var titre = titres[type] || 'Assistant IA';
  var aDepose = !!dossier.cvAnalyse;              // la personne a depose son CV sur le site
  var cvTexte = dossier.cvTexte || '';
  // TÂCHE 8 : lettre de motivation redigee/importee, soumise a la meme regle d'anonymisation que le CV.
  var lettreTexte = (dossier.lettreMotivation && dossier.lettreMotivation.texte) ? dossier.lettreMotivation.texte.trim() : '';
  var aLettre = !!lettreTexte;

  var estLettre = (type === 'lettre');
  var estEntretien = (type === 'entretien');
  // TACHE (demande : export Canva) : uniquement pertinent pour le CV.
  // TACHE (correction, coherence Anonymiser) : deux versions calculees a
  // l'avance (comme CV_RAW/CV_ANON), le choix se fait dynamiquement dans la
  // fenetre selon l'etat EN DIRECT du bouton Anonymiser (pas fige a
  // l'ouverture).
  // TACHE (deplacement export Canva) : le CSV n'est plus precalcule ici --
  // il est desormais recalcule EN DIRECT au moment du clic sur le bouton
  // (voir plus bas, section Exporter), via window.opener.genererCSVCanva(),
  // pour refleter le texte ameliore tel que saisi a ce moment-la (le champ
  // de saisie vit desormais dans cette meme fenetre, voir plus bas).
  var estFenetreCV = (type === 'cv');
  // TACHE (correction anonymisation) : le bouton Anonymiser et le bloc
  // Identite civile sont desormais proposes pour TOUS les parcours, y compris
  // l'entretien (coherence demandee : meme fonctionnement partout). L'ancienne
  // regle "jamais d'option pour l'entretien" (TACHE 43) est levee : l'entretien
  // beneficie du meme anonymat selectif que le CV et la lettre.
  var afficherAnon = (aDepose || aLettre);

  // TACHE (correction anonymisation) : anonymisation SELECTIVE, jamais
  // exclusive. anonymiserTexte() retire uniquement les donnees identifiantes
  // (nom, prenom, adresse, telephone, e-mail, liens connus) et conserve tout
  // le reste du texte (experiences, competences, formulations). Les deux
  // versions (brute et anonymisee) sont toujours calculees ; le choix entre
  // les deux se fait dynamiquement dans la fenetre via le bouton Anonymiser.
  var cvTexteAnonymise = anonymiserTexte(cvTexte);
  var lettreTexteAnonymisee = anonymiserTexte(lettreTexte);
  // TACHE (correction anonymisation, faille comblee) : le "Profil du candidat"
  // (experiences, entreprise visee, liens...) n'etait jusqu'ici JAMAIS filtre,
  // meme en mode anonymise -- une adresse, un telephone ou un lien tape dans
  // un champ libre (entreprise, lien d'offre...) partait donc tel quel. Meme
  // traitement desormais applique au profil qu'au CV/lettre.
  var profilAnonymise = anonymiserTexte(profil);

  // TACHE (correction anonymisation) : identite transmise uniquement si
  // l'utilisateur desactive explicitement l'anonymisation, quel que soit le parcours.
  var id = dossier.identite || {};
  var lignesIdentite = [];
  if (id.nom) { lignesIdentite.push('Nom : ' + id.nom); }
  if (id.prenom) { lignesIdentite.push('Prenom : ' + id.prenom); }
  if (id.age) { lignesIdentite.push('Age : ' + id.age + ' ans'); }
  if (id.adresse) { lignesIdentite.push('Adresse : ' + id.adresse); }
  if (id.ville) { lignesIdentite.push('Ville : ' + id.ville); }
  if (id.telephone) { lignesIdentite.push('Telephone : ' + id.telephone); }
  if (id.email) { lignesIdentite.push('E-mail : ' + id.email); }
  var identiteTexte = lignesIdentite.join('\n');

  // Contexte pour les mises en avant (lettre uniquement pour les questions ; entretien reutilise le choix)
  var mobiliteDispo = !!(dossier.permis && (dossier.permis.possede === true || dossier.permis.vehicule === true));
  var candActif = (dossier.objectif && dossier[dossier.objectif]) || {};
  var proximiteDispo = !!((candActif && candActif.structure) || (dossier.valeurs && dossier.valeurs.indexOf('proximite') !== -1));
  var montrerMobilite = estLettre && mobiliteDispo;
  var montrerProximite = estLettre && proximiteDispo;
  var prefMob = !!(dossier.miseEnAvant && dossier.miseEnAvant.mobilite);
  var prefProx = !!(dossier.miseEnAvant && dossier.miseEnAvant.proximite);

  // Civilite par defaut = celle du Dossier Candidat (rubrique "Mon identite"
  // sur Mon projet), modifiable ponctuellement dans cette fenetre.
  var civiliteDefaut = (id.civilite === 'Madame' || id.civilite === 'Monsieur') ? id.civilite : 'Non précisée';

  // TACHE (correction anonymisation) : bloc "Votre identite" (civilite),
  // desormais affiche pour tous les parcours, y compris l'entretien.
  var blocIdentiteCard =
    '<div class="card"><h3>Votre identite</h3>' +
    '<p class="aide">La civilite sert uniquement a adapter l\'ecriture. Elle est <strong>toujours transmise</strong>, meme en mode anonymise.</p>' +
    '<div class="civilite">' +
    '<label><input type="radio" name="civ" value="Madame"' + (civiliteDefaut === 'Madame' ? ' checked' : '') + '> Madame</label>' +
    '<label><input type="radio" name="civ" value="Monsieur"' + (civiliteDefaut === 'Monsieur' ? ' checked' : '') + '> Monsieur</label>' +
    '<label><input type="radio" name="civ" value="Non précisée"' + (civiliteDefaut === 'Non précisée' ? ' checked' : '') + '> Ne pas preciser</label>' +
    '</div></div>';

  // Bloc anonymisation : des qu'un CV depose OU une lettre de motivation existe.
  var blocAnonymiser = afficherAnon
    ? '<div class="card"><h3>2. Vos donnees personnelles</h3>' +
      '<button class="btn-anon" id="btnAnon" data-anon="1">Anonymiser</button>' +
      '<p class="aide" id="noteAnon"><strong>Bouton rouge = donnees anonymisees.</strong> ' +
      'Par defaut, votre CV' + (aLettre ? ' et votre lettre de motivation sont transmis' : ' est transmis') +
      ' a l\'IA, mais votre nom, prenom, telephone, adresse et e-mail sont retires du texte avant l\'envoi. ' +
      'Si vous acceptez de transmettre votre identite complete pour un resultat plus personnalise, cliquez : le bouton ' +
      'passe au vert. Vous pouvez revenir en arriere a tout moment.</p></div>'
    : '';

  // Questions de mise en avant : uniquement dans la fenetre Lettre, et seulement si l'info existe
  var blocLettre = '';
  if (montrerMobilite || montrerProximite) {
    blocLettre = '<div class="card"><h3>Mise en avant dans la lettre</h3>';
    if (montrerMobilite) {
      blocLettre += '<p class="question">&#128663; Souhaitez-vous mettre en avant votre mobilite ?</p>' +
        '<div class="civilite"><label><input type="radio" name="mob" value="oui"' + (prefMob ? ' checked' : '') + '> Oui</label>' +
        '<label><input type="radio" name="mob" value="non"' + (prefMob ? '' : ' checked') + '> Non</label></div>';
    }
    if (montrerProximite) {
      blocLettre += '<p class="question">&#128205; Souhaitez-vous mettre en avant la proximite de votre domicile avec l\'entreprise ?</p>' +
        '<div class="civilite"><label><input type="radio" name="prox" value="oui"' + (prefProx ? ' checked' : '') + '> Oui</label>' +
        '<label><input type="radio" name="prox" value="non"' + (prefProx ? '' : ' checked') + '> Non</label></div>';
    }
    blocLettre += '</div>';
  }

  // TACHE (correction anonymisation) : bloc "Profil du candidat" unifie,
  // identique pour tous les parcours (l'ancienne version speciale pour
  // l'entretien, sans etatCivilite/etatDonnees, est retiree par coherence).
  var blocProfilCandidat =
    '<div class="card"><h3>&#128100; Profil du candidat</h3>' +
    '<p class="etat" id="etatCivilite"></p>' +
    '<p class="etat" id="etatDonnees"></p>' +
    '<div class="d-flex justify-content-between align-items-center">' +
    '<p class="aide mb-0">Apercu exact de ce qui sera transmis a l\'IA :</p>' +
    '<button type="button" class="btn-editer-apercu" id="btnEditerApercu">&#9999;&#65039; Je modifie</button>' +
    '</div>' +
    '<div class="profil" id="apercuProfil"></div>' +
    '<textarea class="profil-edit" id="apercuProfilEdit" hidden></textarea>' +
    '<div id="zoneValiderApercu" hidden>' +
    '<button type="button" class="btn-copy" id="btnValiderApercu">&#9989; Je valide</button>' +
    '</div>' +
    '<p class="aide" id="noteApercuModifie" hidden>&#8635; Ce texte a ete modifie manuellement. ' +
    '<a href="#" id="lienRevenirApercuAuto">Revenir a la version automatique</a></p>' +
    '</div>';

  var htmlContent =
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>' + titre + '</title>' +
    '<style>body{font-family:Segoe UI,sans-serif;max-width:900px;margin:2rem auto;padding:2rem;background:#f5f7fb;}' +
    'h1{color:#0b1a33;}.card{background:white;border-radius:1.2rem;padding:1.5rem;margin:1rem 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);}' +
    '.profil{background:#f0f4fa;padding:1rem;border-radius:0.75rem;white-space:pre-wrap;border-left:4px solid #0d6efd;line-height:1.6;}' +
    '.etat{margin:0.4rem 0;font-size:1.1rem;color:#0b1a33;}.etat strong{color:#0d6efd;}' +
    '.question{font-weight:600;margin:0.9rem 0 0.3rem;color:#0b1a33;}' +
    '.ia-grid{display:flex;flex-wrap:wrap;gap:1rem;margin:1rem 0;}' +
    '.ia-btn{background:#0d6efd;color:white;padding:0.7rem 1.4rem;border-radius:40px;text-decoration:none;font-weight:600;}' +
    '.btn-copy,.btn-anon{border:none;padding:0.9rem 2rem;border-radius:40px;cursor:pointer;font-weight:700;font-size:1.1rem;color:white;}' +
    '.btn-copy{background:#198754;}.btn-copy:hover{background:#157347;}' +
    '.btn-anon[data-anon="1"]{background:#dc3545;}.btn-anon[data-anon="0"]{background:#198754;}' +
    '.civilite{margin:0.5rem 0;}.civilite label{margin-right:1.2rem;font-weight:600;cursor:pointer;}' +
    '.aide{color:#4a5b6e;font-size:0.95rem;margin-top:0.6rem;}' +
    '.btn-editer-apercu{background:#eef1f6;border:2px solid #d5dbe4;color:#0b1a33;border-radius:30px;' +
    'padding:0.35rem 1rem;font-weight:600;font-size:0.9rem;cursor:pointer;white-space:nowrap;}' +
    '.btn-editer-apercu:hover{background:#dde3ec;}' +
    '.profil-edit{width:100%;min-height:260px;background:#f0f4fa;padding:1rem;border-radius:0.75rem;' +
    'border:1px solid #0d6efd;border-left:4px solid #0d6efd;line-height:1.6;font-family:inherit;font-size:1rem;box-sizing:border-box;}' +
    '#zoneValiderApercu{margin-top:0.8rem;}</style></head><body>' +
    '<h1>' + titre + '</h1>' +
    blocProfilCandidat +
    blocIdentiteCard +
    blocAnonymiser +
    blocLettre +
    '<div class="card"><h3>' + (afficherAnon ? '3. ' : '') + 'Copiez tout</h3>' +
    '<button class="btn-copy" id="btnCopier">Copier</button>' +
    '<p class="aide">' + (estEntretien
      ? 'En cliquant, le contexte de votre préparation d\'entretien est copié, prêt à l\'emploi. ' +
        'Ouvrez l\'IA de votre choix, créez une nouvelle conversation, cliquez dans la zone de saisie, ' +
        'puis faites <strong>Ctrl + V</strong> et appuyez sur <strong>Entrée</strong> : votre séance ' +
        'commencera automatiquement, sans rien taper de plus.'
      : 'En cliquant, votre profil <strong>et les instructions pour l\'IA</strong> sont copies. ' +
        'Ouvrez ensuite l\'IA de votre choix et collez avec <strong>Ctrl + V</strong> dans la zone de message.') + '</p></div>' +
    '<div class="card"><h3>' + (afficherAnon ? '4. ' : '') + 'Choisissez votre IA</h3><div class="ia-grid">' +
    '<a href="https://claude.ai/" target="_blank" class="ia-btn">Claude</a>' +
    '<a href="https://chat.openai.com/" target="_blank" class="ia-btn">ChatGPT</a>' +
    '<a href="https://gemini.google.com/" target="_blank" class="ia-btn">Gemini</a>' +
    '<a href="https://www.perplexity.ai/" target="_blank" class="ia-btn">Perplexity</a>' +
    '<a href="https://chat.mistral.ai/" target="_blank" class="ia-btn">Mistral</a>' +
    '</div></div>' +
    (estFenetreCV
      ? '<details class="card"><summary style="cursor:pointer;list-style:none;">' +
        '<strong>&#129302; Importer la réponse de l\'assistant IA</strong> ' +
        '<span style="color:#6b7280;font-size:0.85rem;">(accroche, points forts, mots-clés)</span>' +
        '</summary>' +
        '<div style="margin-top:0.9rem;">' +
        '<p class="mb-2 small text-muted">Copiez ce prompt, collez-le dans ChatGPT, Claude, Gemini (ou l\'IA de votre choix) ci-dessous, ' +
        'puis copiez <strong>l\'intégralité de sa réponse</strong> (pas besoin de n\'en garder qu\'une partie) et collez-la ci-dessous.</p>' +
        '<button class="btn-copy" id="btnCopierPromptAccroche" style="margin-bottom:0.8rem;">Copier le prompt</button>' +
        '<textarea class="form-control mb-2" id="texteReponseIACV" rows="8" ' +
        'placeholder="Collez ici l\'intégralité de la réponse de l\'assistant IA..."></textarea>' +
        '<button class="btn-copy" id="btnAnalyserReponseIACV" style="background:#0d9488;">Importer dans le CV</button>' +
        '<div id="messageAnalyseIACV" class="mt-2 small" style="min-height:1.2em;"></div>' +
        '</div></details>'
      : '') +
    (estFenetreCV
      ? '<details class="card"><summary style="cursor:pointer;list-style:none;">' +
        '<strong>&#128228; Exporter</strong> <span style="color:#6b7280;font-size:0.85rem;">(fonctions d\'export, dont Canva)</span>' +
        '</summary>' +
        '<div style="margin-top:0.9rem;">' +
        '<p class="mb-2 small text-muted">Vous avez demandé à l\'assistant IA d\'améliorer votre CV ? ' +
        'Collez sa réponse ci-dessous : le fichier exporté reprendra ce texte amélioré. ' +
        'Si vous laissez ce champ vide, l\'export se basera directement sur les informations de votre profil.</p>' +
        '<textarea class="form-control mb-3" id="texteAmelioreCanvaInputPopup" rows="6" ' +
        'placeholder="Collez ici la réponse de l\'assistant IA (CV amélioré)...">' + echapperAttribut(dossier.texteAmelioreCanva || '') + '</textarea>' +
        '<h3>&#128444; Exporter pour Canva</h3>' +
        '<button class="btn-copy" id="btnExportCanva" style="background:#7c3aed;">Télécharger le fichier (CSV)</button>' +
        '<p class="aide">Téléchargez ce fichier, puis importez-le dans Canva via <strong>Bulk Create</strong> ' +
        '(fonctionnalité Canva Pro) pour remplir automatiquement un gabarit de CV avec vos informations. ' +
        'Si les noms de champs de votre gabarit sont différents, vous pouvez renommer la 1ère ligne du fichier ' +
        'avant de l\'importer. Ce fichier respecte le bouton Anonymiser ci-dessus : vos coordonnées ne sont pas ' +
        'incluses tant qu\'il est actif.</p>' +
        '</div></details>'
      : '') +
    (estLettre
      ? '<details class="card"><summary style="cursor:pointer;list-style:none;">' +
        '<strong>&#129302; Importer la réponse de l\'assistant IA</strong> ' +
        '<span style="color:#6b7280;font-size:0.85rem;">(accroche, arguments)</span>' +
        '</summary>' +
        '<div style="margin-top:0.9rem;">' +
        '<p class="mb-2 small text-muted">Copiez l\'intégralité de la réponse de l\'assistant IA (obtenue avec le ' +
        'bouton "Copier" ci-dessus) et collez-la ci-dessous.</p>' +
        '<textarea class="form-control mb-2" id="texteReponseIALettre" rows="8" ' +
        'placeholder="Collez ici l\'intégralité de la réponse de l\'assistant IA...">' +
        '</textarea>' +
        '<button class="btn-copy" id="btnAnalyserReponseIALettre" style="background:#0d9488;">Importer dans la lettre</button>' +
        '<div id="messageAnalyseIALettre" class="mt-2 small" style="min-height:1.2em;"></div>' +
        '</div></details>'
      : '') +
    '<script>(function(){' +
    'var PREFIXE=' + JSON.stringify(prefixe) + ';' +
    'var PROFIL=' + JSON.stringify(profil) + ';' +
    'var PROFIL_ANON=' + JSON.stringify(profilAnonymise) + ';' +
    'var CV_RAW=' + JSON.stringify(cvTexte) + ';' +
    'var CV_ANON=' + JSON.stringify(cvTexteAnonymise) + ';' +
    'var HAS_CV=' + JSON.stringify(aDepose) + ';' +
    'var LETTRE_RAW=' + JSON.stringify(lettreTexte) + ';' +
    'var LETTRE_ANON=' + JSON.stringify(lettreTexteAnonymisee) + ';' +
    'var HAS_LETTRE=' + JSON.stringify(aLettre) + ';' +
    'var IDENTITE=' + JSON.stringify(identiteTexte) + ';' +
    'var EST_LETTRE=' + JSON.stringify(estLettre) + ';' +
    'var EST_ENTRETIEN=' + JSON.stringify(estEntretien) + ';' +
    'var PREF_MOB=' + JSON.stringify(prefMob) + ';' +
    'var PREF_PROX=' + JSON.stringify(prefProx) + ';' +
    // TACHE (correction anonymisation) : meme comportement par defaut pour
    // tous les parcours desormais (anonymise par defaut, bascule possible).
    'var anon=' + JSON.stringify(dossier.anonymiser !== false) + ';' +
    'var btnAnon=document.getElementById("btnAnon");' +
    'if(btnAnon){btnAnon.dataset.anon=anon?"1":"0";btnAnon.textContent=anon?"Anonymiser":"Donnees transmises (OK)";' +
    'btnAnon.addEventListener("click",function(){anon=!anon;this.dataset.anon=anon?"1":"0";this.textContent=anon?"Anonymiser":"Donnees transmises (OK)";' +
    'document.getElementById("noteAnon").innerHTML=anon?"<strong>Bouton rouge = donnees anonymisees.</strong> Votre CV et vos documents sont transmis, mais votre nom, prenom, telephone, adresse et e-mail sont retires.":"<strong>Bouton vert = identite complete transmise</strong> pour un resultat plus complet. Cliquez a nouveau pour revenir a l\'anonymat.";maj();});}' +
    'function civ(){var r=document.querySelector("input[name=civ]:checked");return r?r.value:"Non précisée";}' +
    'function mob(){if(EST_LETTRE){var r=document.querySelector("input[name=mob]:checked");return !!(r&&r.value==="oui");}if(EST_ENTRETIEN){return PREF_MOB;}return false;}' +
    'function prox(){if(EST_LETTRE){var r=document.querySelector("input[name=prox]:checked");return !!(r&&r.value==="oui");}if(EST_ENTRETIEN){return PREF_PROX;}return false;}' +
    'function prefs(){var s="";if(mob()){s+="- Mettre en avant la mobilite du candidat (permis / vehicule).\\n";}if(prox()){s+="- Mettre en avant la proximite du domicile avec l\'entreprise.\\n";}return s;}' +
    // TACHE (correction anonymisation) : coeur du correctif. texteCV()/texteLettre()
    // choisissent dynamiquement entre la version brute et la version anonymisee
    // (donnees identifiantes retirees, TOUT le reste du contenu conserve).
    'function texteCV(){return anon?CV_ANON:CV_RAW;}' +
    'function texteLettre(){return anon?LETTRE_ANON:LETTRE_RAW;}' +
    'function texteProfilFn(){return anon?PROFIL_ANON:PROFIL;}' +
    // TACHE (demande : apercu editable) : si la personne a modifie et valide
    // l'apercu, ce texte remplace ENTIEREMENT ce qui est copie -- plus besoin
    // de reconstruire le texte automatique dans ce cas.
    'var texteApercuOverride=null;' +
    'function construire(){' +
    'if(texteApercuOverride!==null){return texteApercuOverride;}' +
    'if(EST_ENTRETIEN){' +
      // TACHE 36 : ordre demande specifiquement pour l'entretien : le contexte
      // d'abord, puis le prompt "Preparation d'entretien", puis "Start" a la
      // toute fin (le mot declencheur est deja inclus, l'utilisateur n'a plus
      // rien a taper lui-meme).
      'var t2="";' +
      'if(HAS_CV&&texteCV()){t2+="CV actuel de la personne a reutiliser"+(anon?" (donnees personnelles retirees)":"")+" :\\n"+texteCV()+"\\n\\n";}' +
      'if(HAS_LETTRE&&texteLettre()){t2+="Lettre de motivation deja redigee par la personne"+(anon?" (donnees personnelles retirees)":"")+" :\\n"+texteLettre()+"\\n\\n";}' +
      't2+=texteProfilFn();' +
      't2+="\\n\\n"+PREFIXE;' +
      't2+="\\n\\nStart";' +
      'return t2;' +
    '}' +
    'var t=PREFIXE+"\\n\\n";var c=civ();if(c){t+="Civilite : "+c+"\\n";}var p=prefs();if(p){t+=p;}' +
    'if(IDENTITE&&!anon){t+="\\nIdentite du candidat :\\n"+IDENTITE+"\\n";}' +
    'if(HAS_CV){t+="\\nCV actuel de la personne a reutiliser"+(anon?" (donnees personnelles retirees)":"")+" :\\n"+texteCV()+"\\n";}' +
    'if(HAS_LETTRE){t+="\\nLettre de motivation deja redigee par la personne"+(anon?" (donnees personnelles retirees)":"")+" :\\n"+texteLettre()+"\\n";}' +
    't+="\\n"+texteProfilFn();return t;}' +
    'function apercu(){' +
    'if(texteApercuOverride!==null){return texteApercuOverride;}' +
    'var t="";var c=civ();if(c){t+="Civilite : "+c+"\\n";}var p=prefs();if(p){t+=p;}' +
    'if(IDENTITE&&!anon){t+="\\nIdentite transmise : "+IDENTITE.replace(/\\n/g," | ")+"\\n";}' +
    // TACHE (correction, apercu pas "exact") : l'apercu affichait seulement
    // une mention entre crochets pour le CV/la lettre, sans jamais montrer
    // leur contenu reel -- alors que ce contenu (avec experiences, missions,
    // formation... ecrites dedans) part bel et bien tel quel a l'IA via
    // construire(). L'apercu affiche desormais exactement le meme contenu.
    'if(HAS_CV){t+="\\nCV actuel de la personne a reutiliser"+(anon?" (donnees personnelles retirees)":"")+" :\\n"+texteCV()+"\\n";}' +
    'if(HAS_LETTRE){t+="\\nLettre de motivation deja redigee par la personne"+(anon?" (donnees personnelles retirees)":"")+" :\\n"+texteLettre()+"\\n";}' +
    't+="\\n"+texteProfilFn();return t;}' +
    'function maj(){' +
    'var elCiv=document.getElementById("etatCivilite");if(elCiv){elCiv.innerHTML="\\uD83D\\uDC64 Civilite : <strong>"+civ()+"</strong>";}' +
    'var elDon=document.getElementById("etatDonnees");if(elDon){elDon.innerHTML=((HAS_CV||HAS_LETTRE)&&!anon)?"\\uD83D\\uDD13 Donnees personnelles : <strong>Identite complete</strong>":"\\uD83D\\uDD12 Donnees personnelles : <strong>\\uD83D\\uDFE2 Anonymisees</strong>";}' +
    'document.getElementById("apercuProfil").textContent=apercu();' +
    // TACHE (demande : synchronisation) : la civilite choisie ICI repercute
    // desormais vers "Vous" (Mon projet/page Action), pour TOUS les
    // parcours (avant, seul miseEnAvant etait renvoye, et seulement pour la
    // lettre). Rafraichit la page ouvrante si elle affiche "Vous" en ce moment.
    'try{if(window.opener&&window.opener.dossier){' +
    'window.opener.dossier.identite=window.opener.dossier.identite||{};' +
    'window.opener.dossier.identite.civilite=(civ()==="Non précisée")?null:civ();' +
    'if(EST_LETTRE){window.opener.dossier.miseEnAvant={mobilite:mob(),proximite:prox()};}' +
    'if(typeof window.opener.rafraichirSiIdentiteAffichee==="function"){window.opener.rafraichirSiIdentiteAffichee();}' +
    '}}catch(err){}' +
    '}' +
    // TACHE (demande : synchronisation) : sens inverse -- appele depuis la
    // page ouvrante quand la civilite change dans "Vous", pour repercuter
    // ici sans avoir a refermer/rouvrir cette fenetre.
    'window.synchroniserCivilite=function(civilite){' +
    'var val=(civilite==="Madame"||civilite==="Monsieur")?civilite:"Non précisée";' +
    'var r=document.querySelector(\'input[name=civ][value="\'+val+\'"]\');' +
    'if(r){r.checked=true;maj();}' +
    '};' +
    'Array.prototype.forEach.call(document.querySelectorAll("input[name=civ],input[name=mob],input[name=prox]"),function(el){el.addEventListener("change",maj);});' +
    'maj();' +
    // TACHE (demande : apercu editable) : "Je modifie" bascule vers une
    // zone de texte librement modifiable ; "Je valide" enregistre cette
    // version (elle remplace alors TOUT ce qui est copie) ; un lien permet
    // de revenir a la version automatique a tout moment.
    'var elApercu=document.getElementById("apercuProfil");' +
    'var elApercuEdit=document.getElementById("apercuProfilEdit");' +
    'var elBtnEditer=document.getElementById("btnEditerApercu");' +
    'var elZoneValider=document.getElementById("zoneValiderApercu");' +
    'var elNoteModifie=document.getElementById("noteApercuModifie");' +
    'if(elBtnEditer){elBtnEditer.addEventListener("click",function(){' +
    'elApercuEdit.value=apercu();' +
    'elApercu.hidden=true;elBtnEditer.hidden=true;elApercuEdit.hidden=false;elZoneValider.hidden=false;' +
    'elApercuEdit.focus();' +
    '});}' +
    'var elBtnValider=document.getElementById("btnValiderApercu");' +
    'if(elBtnValider){elBtnValider.addEventListener("click",function(){' +
    'texteApercuOverride=elApercuEdit.value;' +
    'elApercu.textContent=texteApercuOverride;' +
    'elApercu.hidden=false;elBtnEditer.hidden=false;elApercuEdit.hidden=true;elZoneValider.hidden=true;' +
    'elNoteModifie.hidden=false;' +
    '});}' +
    'var elLienRevenir=document.getElementById("lienRevenirApercuAuto");' +
    'if(elLienRevenir){elLienRevenir.addEventListener("click",function(e){' +
    'e.preventDefault();texteApercuOverride=null;elNoteModifie.hidden=true;maj();' +
    '});}' +
    'document.getElementById("btnCopier").addEventListener("click",function(){var TXT=construire();' +
    'navigator.clipboard.writeText(TXT).then(function(){var b=document.getElementById("btnCopier");b.textContent="Copie !";setTimeout(function(){b.textContent="Copier";},2000);})' +
    '.catch(function(){var z=document.createElement("textarea");z.value=TXT;document.body.appendChild(z);z.select();document.execCommand("copy");z.remove();alert("Copie !");});' +
    '});' +
    // TACHE (V2 IA, etape 1 : lien assistant IA -> moteur de rendu) :
    // bouton "Copier le prompt" (accroche), meme technique de copie que le
    // bouton "Copier" principal juste au-dessus (avec repli si le
    // presse-papier est indisponible).
    'var PROMPT_ACCROCHE=' + JSON.stringify(promptAccrocheComplet) + ';' +
    'var btnCopierPromptAccroche=document.getElementById("btnCopierPromptAccroche");' +
    'if(btnCopierPromptAccroche){btnCopierPromptAccroche.addEventListener("click",function(){' +
    'navigator.clipboard.writeText(PROMPT_ACCROCHE).then(function(){var b=btnCopierPromptAccroche;var t=b.textContent;b.textContent="Copié !";setTimeout(function(){b.textContent=t;},2000);})' +
    '.catch(function(){var z=document.createElement("textarea");z.value=PROMPT_ACCROCHE;document.body.appendChild(z);z.select();document.execCommand("copy");z.remove();alert("Copié !");});' +
    '});}' +
    // Bouton "Importer dans le CV" : delegue TOUT le parsing a
    // window.opener.analyserReponseIACV() (recherche/extraction tolerante
    // d\'un bloc JSON, meme noye dans la partie redactionnelle de la
    // reponse -- une seule logique de parsing, partagee, jamais dupliquee
    // dans cette fenetre). Message clair affiche dans tous les cas --
    // jamais d\'exception brute visible par la personne, jamais de
    // plantage de l\'application.
    'var btnAnalyserReponseIACV=document.getElementById("btnAnalyserReponseIACV");' +
    'var messageAnalyseIACV=document.getElementById("messageAnalyseIACV");' +
    'if(btnAnalyserReponseIACV){btnAnalyserReponseIACV.addEventListener("click",function(){' +
    'var texte=document.getElementById("texteReponseIACV").value;' +
    'if(!(window.opener&&window.opener.analyserReponseIACV&&window.opener.dossier)){' +
    'messageAnalyseIACV.style.color="#b91c1c";messageAnalyseIACV.textContent="Impossible de communiquer avec la fenêtre principale.";return;' +
    '}' +
    'var resultat=window.opener.analyserReponseIACV(texte);' +
    'if(!resultat.succes){messageAnalyseIACV.style.color="#b91c1c";messageAnalyseIACV.textContent="⚠️ "+resultat.erreur;return;}' +
    'if(!window.opener.dossier.ia){window.opener.dossier.ia={cv:{profil:"",pointsForts:[],motsCles:[],recommandations:{}},lettre:{},entretien:{}};}' +
    'if(!window.opener.dossier.ia.cv){window.opener.dossier.ia.cv={profil:"",pointsForts:[],motsCles:[],recommandations:{}};}' +
    'window.opener.dossier.ia.cv.profil=resultat.valeurs.profil;' +
    'window.opener.dossier.ia.cv.pointsForts=resultat.valeurs.pointsForts;' +
    'window.opener.dossier.ia.cv.motsCles=resultat.valeurs.motsCles;' +
    'if(typeof window.opener.rafraichirApercuCVSiOuvert==="function"){window.opener.rafraichirApercuCVSiOuvert();}' +
    'messageAnalyseIACV.style.color="inherit";' +
    'if(typeof window.opener.genererResumeImportCV==="function"){' +
    'messageAnalyseIACV.innerHTML=window.opener.genererResumeImportCV(resultat.valeurs,window.opener.dossier);' +
    '}else{messageAnalyseIACV.textContent="✅ Import réussi. L\'aperçu du CV a été mis à jour.";}' +
    '});}' +
    // TACHE (integration Lettre V2) : meme schema que le CV -- delegue tout
    // le parsing a window.opener.analyserReponseIALettre(), jamais de
    // logique dupliquee dans cette fenetre. Message clair dans tous les
    // cas, jamais d'exception brute, jamais de plantage.
    'var btnAnalyserReponseIALettre=document.getElementById("btnAnalyserReponseIALettre");' +
    'var messageAnalyseIALettre=document.getElementById("messageAnalyseIALettre");' +
    'if(btnAnalyserReponseIALettre){btnAnalyserReponseIALettre.addEventListener("click",function(){' +
    'var texte=document.getElementById("texteReponseIALettre").value;' +
    'if(!(window.opener&&window.opener.analyserReponseIALettre&&window.opener.dossier)){' +
    'messageAnalyseIALettre.style.color="#b91c1c";messageAnalyseIALettre.textContent="Impossible de communiquer avec la fenêtre principale.";return;' +
    '}' +
    'var resultatLettre=window.opener.analyserReponseIALettre(texte);' +
    'if(!resultatLettre.succes){messageAnalyseIALettre.style.color="#b91c1c";messageAnalyseIALettre.textContent="⚠️ "+resultatLettre.erreur;return;}' +
    'if(!window.opener.dossier.ia){window.opener.dossier.ia={cv:{profil:"",pointsForts:[],motsCles:[],recommandations:{}},lettre:{},entretien:{}};}' +
    'if(!window.opener.dossier.ia.lettre){window.opener.dossier.ia.lettre={};}' +
    'window.opener.dossier.ia.lettre.accroche=resultatLettre.valeurs.accroche;' +
    'window.opener.dossier.ia.lettre.arguments=resultatLettre.valeurs.arguments;' +
    'messageAnalyseIALettre.style.color="#15803d";' +
    'messageAnalyseIALettre.textContent="✅ Import réussi ("+resultatLettre.valeurs.arguments.length+" argument(s) retenu(s)).";' +
    '});}' +
    'var inputTexteAmelioreCanvaPopup=document.getElementById("texteAmelioreCanvaInputPopup");' +
    'if(inputTexteAmelioreCanvaPopup){inputTexteAmelioreCanvaPopup.addEventListener("input",function(){' +
    'if(window.opener&&window.opener.dossier){window.opener.dossier.texteAmelioreCanva=this.value;}' +
    '});}' +
    'var btnExportCanva=document.getElementById("btnExportCanva");' +
    'if(btnExportCanva){btnExportCanva.addEventListener("click",function(){' +
    // TACHE (correction, coherence Anonymiser) : lit "anon" EN DIRECT au
    // moment du clic (deja mis a jour par le bouton Anonymiser de cette
    // fenetre), pas une valeur figee a l'ouverture. Le CSV lui-meme est
    // desormais recalcule EN DIRECT via window.opener.genererCSVCanva(),
    // pour refleter le texte ameliore tel que saisi juste au-dessus, sans
    // dupliquer la logique de generation du CSV dans cette fenetre.
    'var csvChoisi=(window.opener&&window.opener.genererCSVCanva)?window.opener.genererCSVCanva(!anon):"";' +
    'var blob=new Blob(["\\uFEFF"+csvChoisi],{type:"text/csv;charset=utf-8;"});' +
    'var url=URL.createObjectURL(blob);' +
    'var a=document.createElement("a");a.href=url;a.download="canva_cv.csv";document.body.appendChild(a);a.click();' +
    'document.body.removeChild(a);URL.revokeObjectURL(url);' +
    '});}' +
    '})();<\/script>' +
    '</body></html>';

  var win = window.open('', '_blank', 'width=920,height=860,scrollbars=yes');
  if (win) { win.document.write(htmlContent); win.document.close(); fenetreIAOuverte = win; }
  else { alert('Autorisez les fenetres pop-up pour cet outil.'); }
}

/* ------------------------------------------------------------
   9. REINITIALISATION + LANCEMENT
   ------------------------------------------------------------ */
function recommencer() {
  dossier = {
    modeCreation: null, objectif: null, activites: [], actions: [], environnement: [],
    valeurs: [], metiersAjoutes: [], metiersExclus: [], metierCible: null, typeCV: 'general',
    metiersCandidats: [], modeMetierCible: null, secteurCible: null,
    identite: { civilite: null, nom: '', prenom: '', adresse: '', telephone: '', email: '', ville: '', age: '' }, anonymiser: true,
    entretienDirect: { structure: '', poste: '' },
    rechercheEntreprise: { structure: '' },
    catalogueActif: {}, experiences: [], experiencesPerso: [], niveauFormation: null,
    formations: [], loisirs: [], engagements: [], certifications: [], langues: [], permis: { possede: null, categories: [], vehicule: null },
    contrat: [], tempsTravail: [], accepte: [], accepteAucune: false,
    offre: { lien: '', poste: '', structure: '', type: '', dispo: [] },
    spontanee: { lien: '', poste: '', structure: '', type: '', dispo: [] },
    reconversion: { lien: '', poste: '', structure: '', type: '', dispo: [] },
    stage: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [] },
    alternance: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [] },
    immersion: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [] },
    miseEnAvant: { mobilite: false, proximite: false },
    lettreMotivation: { texte: '' },
    texteAmelioreCanva: '',
    ia: creerDossierIAVide(),
    metiersHorsRepertoire: []
  };
  blocsAMettreEnEvidence = { candidature: false, mobilite: false, formation: false, metier: false };
  historiquePages = ['cv'];
  naviguerVers('cv');
}

// ============================================================
// TÂCHE 27 : Reinitialiser / Restaurer la derniere session
// ============================================================

// Stockage de la sauvegarde : navigateur (survit au rechargement) avec repli
// en memoire si le stockage est indisponible (navigation privee, etc.).
var CLE_SESSION = 'aps_session_sauvegarde';
var sauvegardeMemoire = null;

function ecrireSauvegarde(obj) {
  sauvegardeMemoire = obj;
  try { localStorage.setItem(CLE_SESSION, JSON.stringify(obj)); } catch (e) { /* repli memoire */ }
}
function lireSauvegarde() {
  try {
    var s = localStorage.getItem(CLE_SESSION);
    if (s) { return JSON.parse(s); }
  } catch (e) { /* repli memoire */ }
  return sauvegardeMemoire;
}
function effacerSauvegarde() {
  sauvegardeMemoire = null;
  try { localStorage.removeItem(CLE_SESSION); } catch (e) { /* rien */ }
}
function sauvegardeExiste() { return lireSauvegarde() !== null; }

// Copie complete et independante de la session : tout le dossier, l'etape en
// cours et les etapes deja visitees, pour retrouver exactement l'etat precedent.
function sauvegarderSession() {
  return {
    dossier: JSON.parse(JSON.stringify(dossier)),
    historique: historiquePages.slice(),
    page: pageActuelle
  };
}

function reinitialiserSession() {
  confirmerAction(
    'Réinitialiser la session ?',
    'Vous allez supprimer toutes les informations actuellement saisies. Vous pourrez toutefois restaurer cette session tant que vous n\'aurez pas commencé une nouvelle.',
    'Réinitialiser', 'btn-danger',
    function () {
      ecrireSauvegarde(sauvegarderSession());   // sauvegarde AVANT suppression
      recommencer();                             // vide la session et revient au 1er ecran
    }
  );
}

function restaurerSession() {
  confirmerAction(
    '↩ Restaurer',
    'Votre dernière session sera restaurée exactement dans l\'état où elle se trouvait avant la réinitialisation.',
    'Restaurer', 'btn-primary',
    function () {
      var s = lireSauvegarde();
      if (!s) { return; }
      dossier = JSON.parse(JSON.stringify(s.dossier));
      // TACHE (V2 IA, etape 1 : robustesse) : garantit que dossier.ia existe
      // toujours apres une restauration, meme dans le cas limite d'une
      // sauvegarde anterieure a l'ajout de cette structure -- dossier.ia
      // reste toujours optionnel, mais ne doit jamais etre absent au point
      // de faire echouer une ecriture ulterieure (voir creerDossierIAVide()).
      if (!dossier.ia) { dossier.ia = creerDossierIAVide(); }
      historiquePages = (s.historique || ['cv']).slice();
      var page = s.page || 'cv';
      effacerSauvegarde();     // session restauree : elle n'est plus "supprimee"
      naviguerVers(page);      // retrouve exactement l'etape
    }
  );
}

// Fenetre de confirmation reutilisable, au style du site.
function confirmerAction(titre, texte, labelConfirmer, classeConfirmer, onConfirmer) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-confirmation';
  overlay.innerHTML =
    '<div class="modal-boite">' +
      '<h3>' + titre + '</h3>' +
      '<p>' + texte + '</p>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-outline-secondary" data-role="annuler">Annuler</button>' +
        '<button class="btn ' + classeConfirmer + '" data-role="confirmer">' + labelConfirmer + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  function fermer() { if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); } }
  overlay.querySelector('[data-role="annuler"]').addEventListener('click', fermer);
  overlay.querySelector('[data-role="confirmer"]').addEventListener('click', function () { fermer(); onConfirmer(); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) { fermer(); } });
}

// Exposition globale (pour les onclick et pour metiers.js)
window.dossier = dossier;
window.naviguerVers = naviguerVers;
window.recommencer = recommencer;
window.ouvrirAideIA = ouvrirAideIA;
window.suggererMetiers = suggererMetiers;
window.deduireCompetences = deduireCompetences;
window.obtenirSavoirs = obtenirSavoirs;
window.construireProfil = construireProfil;
window.rienEteChoisi = rienEteChoisi;
window.categorieCompetence = categorieCompetence;
window.pageRevelation = pageRevelation;
// TACHE (recherche assistant) : complete la reference manquante pour les
// certifications (CATALOGUE_CERTIFICATIONS n'est declaree que plus haut dans
// ce fichier ; on l'assigne ici, une fois certaine d'etre initialisee).
BASE_CONNAISSANCES_ERIP.certifications = CATALOGUE_CERTIFICATIONS;

// Note : "dossier" est une variable globale partagee avec data/metiers.js
// (les deux fichiers sont des scripts classiques, pas des modules).

document.addEventListener('DOMContentLoaded', function () {
  naviguerVers('cv');
  // TACHE (prompts externes) : lance le chargement en arriere-plan des 3
  // fichiers prompts/*.md, des le debut, sans jamais bloquer l'affichage ni
  // les clics ulterieurs sur "Creer votre CV"/"Lettre de motivation"/
  // "Preparer un entretien" (voir promptCache()/chargerPromptsExternes()).
  chargerPromptsExternes();
});