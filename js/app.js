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
      // TACHE (Moteur de decision de candidature, Tache 1 : extension du
      // prompt CV V2) : typeCV reste un objet unique (une seule decision
      // possible) ; les 3 autres deviennent des LISTES d'objets, chacun
      // portant sa propre justification -- conforme a
      // docs/ARCHITECTURE_MOTEUR_DECISION_CANDIDATURE.md (§5, §7).
      // Volontairement pas d'identifiant technique sur les elements de
      // liste (ex. pas d'id sur une experience) : le rapprochement avec
      // dossier.experiences se fera par correspondance de champs
      // (poste/entreprise), comme deja fait pour le moteur d'import
      // (SPECIFICATION_IMPORT, champsRapprochement) -- jamais anticipe
      // sous forme d'identifiant stable a ce stade.
      recommandations: {
        typeCV: { valeur: null, justification: '' },
        experiencesAMettreEnAvant: [],  // [{ poste, entreprise, justification }]
        competencesAValoriser: [],      // [{ competence, justification }]
        rubriquesMasquables: [],        // [{ rubrique, justification }]
        // TACHE (retour utilisateur : vide/sommaire/trop long/bavard) :
        // missions proposees par experience, utilisees quand l'IA juge que
        // le texte de la personne merite d'etre complete OU condense (voir
        // appliquerMoteurDecisionCV) -- jamais pour une experience deja
        // bien ecrite et concise. Rapprochement avec dossier.experiences
        // par poste/entreprise, meme mecanisme que experiencesAMettreEnAvant.
        savoirFaireParExperience: []    // [{ poste, entreprise, missions: [...] }]
      },
      // TACHE (retour utilisateur : 5 propositions d'accroche, choix
      // unique + bouton "Revenir aux propositions de l'IA") : conserve les
      // 5 propositions BRUTES de l'IA (pas seulement celle finalement
      // choisie, stockee elle dans .profil ci-dessus) -- indispensable
      // pour que rouvrir l'ecran de choix plus tard (depuis l'apercu)
      // retrouve les 5 options, pas seulement la derniere selectionnee.
      accrochesProposees: []
    },
    // TACHE (Lettre V2, tache 1 : texte complet) : structure par defaut,
    // conforme au format desormais produit par analyserReponseIALettre().
    // TACHE (retour utilisateur : 3 versions de lettre, cartes dans
    // l'apercu) : "versions" porte les 3 propositions brutes de l'IA (ou
    // moins/plus si un import different se produit) ; "versionActive"
    // l'index actuellement choisi ; "lettre" reste le point d'entree LU
    // PAR normaliserDonneesLettre.js (jamais modifie, cf. commentaire
    // dans ce fichier) -- toujours une COPIE de versions[versionActive],
    // synchronisee a chaque changement de carte ou edition (voir
    // wireApercuVersionsLettre ci-dessous). Rien d'autre dans l'app ne
    // lit "versions" directement.
    lettre: {
      accroche: '',
      arguments: [],
      versions: [],
      versionActive: 0,
      lettre: { objet: '', texte: '' }
    },
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
  // TACHE (refonte Candidature/Potentiel, Etape 3 -- nettoyage architecture) :
  // modeMetierCible ('metier'|'secteur') a ete retire -- c'etait une pure
  // redondance avec metierCible/secteurCible (partout ou il etait ecrit, il
  // l'etait deja en meme temps que l'un de ces deux champs, l'autre remis a
  // null). Le moteur de generation (extraireDonneesCV.js, formatA5CV.js,
  // normaliserDonneesEntretien.js, metiers.js) n'a d'ailleurs jamais lu
  // modeMetierCible : il lit directement metierCible puis secteurCible.
  // La regle desormais : AU PLUS UN des deux est renseigne a la fois (jamais
  // les deux). Pour savoir lequel est actif, lire directement le champ
  // concerne (if (dossier.metierCible) ... else if (dossier.secteurCible)).
  secteurCible: null,    // secteur ou "Interim" ou texte libre -- jamais renseigne EN MEME TEMPS que metierCible
  typeCV: 'general',     // Complement tache 8 : 'general' ou 'specifique'
  // TACHE 43 : identite du candidat. email/telephone peuvent etre pre-remplis
  // automatiquement (extraction fiable) ; nom/prenom/adresse jamais devines.
  identite: { civilite: null, nom: '', prenom: '', adresse: '', codePostal: '', telephone: '', email: '', ville: '' },
  entretienDirect: { structure: '', poste: '' },  // TACHE 36 : parcours autonome "Preparer un entretien"
  rechercheEntreprise: { structure: '' },  // TACHE (recherche assistant) : entreprise saisie depuis le parcours guide
  catalogueActif: {},    // Etape 3 : suivi Oui/Non par catalogue (cle = nom du champ, ex. 'loisirs')
  experiences: [],
  experiencesPerso: [],  // benevolat, entraide familiale, foyer... (valorisation)
  // TACHE (Tache 1 : formations en tableau) : remplace l'ancien niveauFormation
  // (valeur unique). Chaque element : { niveau, intitule, annee }. Le moteur
  // de rendu du CV attendait deja un tableau (voir normaliserDonneesCV.js) --
  // ce champ n'a plus besoin d'etre enveloppe artificiellement.
  formations: [],
  loisirs: [],
  engagements: [],       // Etape 5 : catalogue engagements (tableau de chaines)
  certifications: [],    // Etape 8 : referentiel certifications (tableau de chaines)
  // TACHE (Tache 2 : preparation du moteur d'import) : logiciels/outils
  // maitrises (ex. "Excel", "SAGE", "Photoshop"), tableau de chaines, meme
  // nature que loisirs/engagements/certifications ci-dessus. Champ cree
  // maintenant pour que le futur moteur d'import (voir
  // docs/ARCHITECTURE_MOTEUR_IMPORT.md) ait un endroit ou ranger cette
  // information des sa premiere version -- aucune interface de saisie ni
  // aucune logique ne l'alimente ou ne le lit encore a ce stade.
  logiciels: [],
  langues: [],           // { langue, niveau }
  permis: { possede: null, categories: [], vehicule: null },
  contrat: [],           // CDD, CDI, Remplacements, Interim
  tempsTravail: [],       // Temps plein, Temps partiel
  accepte: [],            // alimentaire, saisonnier (J'accepte egalement)
  accepteAucune: false,   // TACHE (complement) : "Aucune de ces propositions", exclusif des 2 ci-dessus, absent du resume
  offre: { lien: '', poste: '', structure: '', type: '', dispo: [] },   // objectif "offre" (dispo = choix multiple)
  spontanee: { lien: '', poste: '', structure: '', type: '', dispo: [] },    // objectif "spontanee"
  reconversion: { lien: '', poste: '', structure: '', type: '', dispo: [] }, // objectif "reconversion"
  stage: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [],
    dureeQuantite: '', dureeUnite: null, dateDebut: '', dateFin: '' },       // objectif "stage"
  alternance: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [],
    dureeQuantite: '', dureeUnite: null, dateDebut: '', dateFin: '' },  // objectif "alternance"
  immersion: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [],
    dureeQuantite: '', dureeUnite: null, dateDebut: '', dateFin: '' }, // objectif "pmsmp" (immersion)
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
  // TACHE (Tache 2 : preparation du moteur d'import) : porte d'entree du
  // futur moteur generique d'alimentation du dossier (voir
  // docs/ARCHITECTURE_MOTEUR_IMPORT.md, §2 et §11). "courant" accueillera,
  // le moment venu, UN import en cours de validation
  // ({ schemaVersion, typeSource, date, donnees }) -- jamais plusieurs en
  // meme temps, jamais lu directement par le reste de l'application tant
  // qu'il n'a pas ete valide par la personne et fusionne dans dossier.
  // Aucune logique d'import n'existe encore : ce champ reste vide (null)
  // jusqu'a la tache dediee.
  imports: { courant: null },
  // TACHE (demande : metiers hors repertoire) : jusqu'a 3 intitules saisis
  // librement par la personne, quand son metier n'existe pas dans notre
  // referentiel. Distincts de metiersCandidats (ne comptent PAS dans la
  // limite de 5) -- pas de fiche ROME ni de competences associees, puisque
  // ce ne sont pas des metiers de notre base de connaissances.
  metiersHorsRepertoire: [],
  // TACHE (bandeau contextuel Impression) : garde en memoire la derniere
  // carte utilisee ("Creer votre CV" ou "Lettre de motivation"), pour
  // n'afficher qu'un seul bandeau d'impression a la fois sur la page
  // Action -- jamais les deux en meme temps, aucun tant que rien n'est
  // commence.
  dernierDocumentPrepare: null,
  // TACHE (page Action, verrouillage progressif des cartes) : poses a true
  // la premiere fois que le document concerne atteint reellement l'etape
  // "Exporter" (voir btnContinuerApercu) -- pilotent le deverrouillage des
  // cartes Lettre/Entretien selon le parcours choisi (modeCreation).
  cvTermine: false,
  lettreTerminee: false,
  // TACHE (bouton "Merci bien, j'ai fini") : poses a true au moment ou la
  // personne enregistre reellement le document (telechargement du Word ou
  // du texte a copier) -- distinct de cvTermine/lettreTerminee ci-dessus,
  // qui pilotent le DEVERROUILLAGE de la carte suivante des l'etape
  // Exporter atteinte. Ici, c'est la confirmation que le document a bien
  // ete recupere par la personne, qui pilote l'affichage du bouton de fin
  // de parcours (voir pageResultats()/terminerParcours()).
  documentsEnregistres: { cv: false, lettre: false, entretien: false },
  // TACHE (refonte page Action, architecture) : preferences globales de
  // redaction, definies UNE FOIS par la personne et reutilisees par tous les
  // modules generateurs de contenu (CV, lettre, entretien, futurs modules).
  // Valeurs possibles :
  // niveauPoste : 'employe' | 'ouvrier_qualifie' | 'technicien' | 'agent_maitrise' | 'cadre' | 'direction' | null
  // niveauLangage : 'naturel' | 'professionnel' | 'tres_professionnel' | null
  // adaptationMetier : 'standard' | 'adaptee' | 'specialisee' | null
  // ton : 'dynamique' | 'equilibre' | 'institutionnel' | null
  // longueur : 'synthetique' | 'equilibree' | 'detaillee' | null
  // Ne sont JAMAIS affichees telles quelles dans un document : elles servent
  // uniquement de contexte transmis a l'IA (aucune logique de prompt cablee
  // a ce stade, voir tache dediee).
  preferencesIA: {
    niveauPoste: null,
    niveauLangage: null,
    adaptationMetier: null,
    ton: null,
    longueur: null
  },
  // TACHE (retour utilisateur : "Verifier les informations") : override
  // manuel du texte transmis a l'IA (texteProfilEffectif()) -- null tant
  // que la personne n'a rien valide depuis la fenetre de verification.
  profilTexteManuel: null,
  // TACHE (refonte Candidature/Potentiel, Etape 1) : nouveau point d'entree
  // UNIQUE pour indiquer comment personnaliser sa candidature -- remplace,
  // cote experience utilisateur seulement, le choix qui se faisait jusque-la
  // sur la page Potentiel ("Ce metier"/"Secteur(s) d'activite"). Dimension
  // volontairement INDEPENDANTE de dossier.objectif (qui repond a "pourquoi
  // je suis ici ?" -- offre/spontanee/reconversion/stage/alternance/pmsmp,
  // non modifie par cette refonte). Migration en 3 etapes (voir echanges de
  // conception) : Etape 1 (ces 3 champs, isoles), Etape 2 (Potentiel les lit
  // pour adapter son affichage), Etape 3 (nettoyage -- modeMetierCible,
  // redondant, a ete retire ; voir metierCible/secteurCible plus bas).
  modeRecherche: null,       // 'metier' | 'domaine' | null (pas encore choisi)
  typeRecherche: null,       // 'simple' | 'offre' | null -- uniquement si modeRecherche === 'metier'
  rechercheCandidature: { entreprise: '', lienOffre: '' }, // uniquement si typeRecherche === 'offre'
  // champs remplis par l'analyse CV (voir metiers.js) :
  // competencesCV, savoirsCV, cvAnalyse
};

// Complement tache 8 (bouton "Personnaliser ma candidature") : blocs de l'ecran
// Revelation a mettre en evidence (contour rouge) tant qu'ils ne sont pas
// suffisamment renseignes. Uniquement en memoire (pas sauvegarde, pas persistant).
// Mecanisme unique, reutilise pour les 4 blocs (candidature, mobilite, formation, metier).
var blocsAMettreEnEvidence = { candidature: false, mobilite: false, formation: false, metier: false };
// TACHE (Tache 1 : formations en tableau) : brouillon de la formation en
// cours d'ajout (niveau/intitule/annee), jamais ecrit dans dossier.formations
// tant que la personne n'a pas clique sur "+ Ajouter" -- uniquement en
// memoire, memes garanties que blocsAMettreEnEvidence ci-dessus.
var brouillonFormationEnCours = null;
// TACHE (retour utilisateur : animation "cliquez ici") : petite icone
// animee (CSS pur, sans JS), reutilisee partout ou l'on invite a cliquer
// sur une pastille de metier -- rend le geste attendu plus intuitif,
// notamment pour un public peu autonome en informatique.
function animationCliquezIci() {
  return '<span style="display:inline-block;animation:pointerCliquezIci 1.2s ease-in-out infinite;">&#128070;</span>' +
    '<style>@keyframes pointerCliquezIci{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}</style>';
}

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
  { id: 'sansdiplome', label: 'Sans diplôme', rncp: 1, placeholder: 'Facultatif' },
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
  'Relation client': 'Savoir-etre', 'Communication': 'Savoir-etre', 'Écoute': 'Savoir-etre',
  'Technique': 'Savoir-faire', 'Maintenance': 'Savoir-faire', 'Précision': 'Savoir-faire',
  'Pédagogie': 'Savoir-etre', 'Patience': 'Savoir-etre', 'Bienveillance': 'Savoir-etre',
  'Empathie': 'Savoir-etre', 'Aide à la personne': 'Savoir-etre', 'Travail en équipe': 'Savoir-etre',
  'Coordination': 'Savoir-etre', 'Entraide': 'Savoir-etre', 'Autonomie': 'Savoir-etre',
  'Organisation': 'Savoir-etre', 'Responsabilité': 'Savoir-etre', 'Adaptabilité': 'Savoir-etre',
  'Endurance': 'Savoir-etre', 'Sécurité': 'Savoir-etre', 'Merchandising': 'Savoir-faire',
  'Accueil': 'Savoir-etre', 'Gestion des stocks': 'Savoir-faire', 'Bureautique': 'Savoir-faire',
  'Gestion administrative': 'Savoir-faire', 'Gestion du temps': 'Savoir-etre', 'Planification': 'Savoir-faire',
  'Diagnostic': 'Savoir-faire', 'Réparation': 'Savoir-faire', 'Conseil': 'Savoir-faire',
  'Négociation': 'Savoir-faire', 'Persuasion': 'Savoir-faire', 'Logistique': 'Savoir-faire',
  'Conduite': 'Savoir-faire', 'Respect des délais': 'Savoir-etre', 'Hygiène': 'Savoir-faire',
  'Entretien': 'Savoir-faire', 'Rigueur': 'Savoir-etre', 'Formation': 'Savoir-faire',
  'Transmission': 'Savoir-faire', 'Soins': 'Savoir-faire', 'Cuisine': 'Savoir-faire',
  'Créativité': 'Savoir-etre', 'Respect des normes': 'Savoir-etre', 'Bâtiment': 'Savoir-faire',
  'Lecture de plans': 'Savoir-faire', 'Travail manuel': 'Savoir-faire', 'Analyse de données': 'Savoir-faire',
  'Raisonnement logique': 'Savoir-faire', 'Rédaction': 'Savoir-faire', 'Innovation': 'Savoir-faire',
  'Expression artistique': 'Savoir-faire', 'Motivation': 'Savoir-etre', 'Apprentissage': 'Savoir-etre',
  'Esprit d\'équipe': 'Savoir-etre', 'Sens du service': 'Savoir-etre', 'Gestion de projet': 'Savoir-faire',
  'Gestion financière': 'Savoir-faire', 'Management': 'Savoir-faire', 'Leadership': 'Savoir-etre',
  'Stabilité': 'Savoir-etre', 'Fiabilité': 'Savoir-etre',
  // Etape 3 : nouveaux termes introduits par les exemples d'enrichissement loisirs
  'Persévérance': 'Savoir-etre', 'Respect des règles': 'Savoir-etre', 'Sens du détail': 'Savoir-faire'
};

// TACHE (retour utilisateur : aucun savoir-être identifié depuis un CV
// importé) : la table figee ci-dessus ne connait qu'un referentiel interne
// (~50 libelles) -- un savoir-etre importe et reconnu comme tel par l'IA
// (extraction-cv.md) mais absent de cette table etait donc traite comme un
// savoir-faire par defaut (cf. correction precedente). Ce helper priorise
// desormais dossier.savoirEtreCV (rempli a la fusion, voir plus bas) : un
// element qui s'y trouve est un VRAI savoir-etre, meme absent de la table
// figee. Utiliser CE helper partout plutot que categorieCompetence[c] en
// direct, pour rester coherent.
function categorieReelleCompetence(c) {
  if ((dossier.savoirEtreCV || []).indexOf(c) !== -1) { return 'Savoir-etre'; }
  // TACHE (chantier langue francaise, tolerance accent/sans-accent) :
  // categorieCompetence est une table figee historique, pas encore
  // accentuee -- chercherDansDictionnaireSansAccentERIP() (voir
  // data/toleranceOrthographiqueERIP.js) evite qu'un libelle desormais
  // accentue dans un catalogue de donnees (ex. "Adaptabilité") ne soit
  // plus reconnu ici faute de correspondre au caractere pres a la cle
  // "Adaptabilite" de cette table.
  return chercherDansDictionnaireSansAccentERIP(categorieCompetence, c);
}

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
    zone.innerHTML = '<p class="text-muted text-center mt-3">Aucun resultat pour "' + echapperAttribut(texte) + '".</p>';
    activerOverlay(true);
    return;
  }
  zone.innerHTML = groupes.map(function (groupe) {
    var cartes = groupe.resultats.map(function (r) {
      if (groupe.type === 'metier') { return carteMetierHTML(r); }
      if (groupe.type === 'metier_suggere') { return carteMetierSuggereHTML(r); }
      if (groupe.type === 'item') {
        // TACHE (amelioration recherche) : environnements de travail
        // deviennent cliquables (metiers associes), au meme titre que les
        // competences/savoir-etre/savoirs. TACHE (retour utilisateur :
        // recherche allegee) : "Valeurs professionnelles" retiree de cette
        // recherche (voir baseConnaissancesERIP.js) -- ce type n'y produit
        // plus jamais ce groupe, la branche associee est donc retiree ici.
        var champAssocie = groupe.categorie === 'Environnements de travail' ? 'environnement' : null;
        return carteItemHTML(r, !!champAssocie, champAssocie);
      }
      if (groupe.type === 'domaine') {
        // TACHE (amelioration recherche : domaine d'activite) : meme
        // principe que les cartes competence/savoir-etre/savoirs ci-dessous
        // -- toujours cliquable, ouvre les metiers de ce domaine.
        return '<div class="carte-resultat-erip carte-resultat-texte carte-resultat-cliquable" ' +
          'data-domaine-nom="' + echapperAttribut(r) + '">' + r + '</div>';
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
// TACHE (migration Design System, chantier "Fenetre ERIP", 3e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP() -- ne
// construit plus son propre overlay, son propre bouton de fermeture, ni sa
// propre logique de clic exterieur. Contrat public STRICTEMENT inchange :
// meme signature (titre, contenuHTML), retourne toujours l'element racine
// pour que les 11 fonctions appelantes y cablent leurs propres boutons
// exactement comme avant -- aucune d'elles n'a besoin d'etre modifiee.
function fermerPanneauGuide() {
  fermerFenetreERIP();
}

function ouvrirPanneauGuide(titre, contenuHTML) {
  return ouvrirFenetreERIP({ titre: titre, contenuHTML: contenuHTML });
}

// TACHE (retour utilisateur : CV specifique sans quitter la page) : reutilise
// ouvrirPanneauGuide() (deja en page, pas une popup) + contenuCandidature()/
// wireObjectifDetails() (deja existantes, memes champs que sur "Mon Projet")
// -- aucune logique dupliquee. Remplace la navigation vers "Mon Projet".
function ouvrirFenetreCandidatureRapide(rerender, onRetour) {
  var panneau = ouvrirPanneauGuide('&#128221; Votre candidature',
    '<p class="text-muted small">Ces informations permettront de personnaliser votre CV, votre lettre et votre entretien.</p>' +
    contenuCandidature() +
    '<div class="d-flex justify-content-between mt-3">' +
    (onRetour ? '<button type="button" id="btnRetourCandidatureRapide" class="btn btn-outline-secondary">&#8592; Retour</button>' : '<span></span>') +
    '<button type="button" id="btnValiderCandidatureRapide" class="btn btn-primary">Valider</button></div>');
  wireObjectifDetails(rerender);
  // TACHE (retour utilisateur : bouton Valider desactive sans info) : le
  // clavier (majuscule auto, Entree -> champ suivant) est deja cable par
  // wireObjectifDetails() -> activerChampsStandardises() (#zoneCandidatureChamps,
  // deja existant). Ici, uniquement : (1) etat du bouton selon
  // informationsCandidatureSuffisantes(), reevalue a chaque saisie ; (2) sur
  // le DERNIER champ, Entree declenche Valider (comme un clic), pas juste
  // une perte de focus.
  var btnValider = panneau.querySelector('#btnValiderCandidatureRapide');
  var zoneCandidature = panneau.querySelector('#zoneCandidatureChamps');
  function actualiserBoutonValider() {
    if (!btnValider) { return; }
    var suffisant = informationsCandidatureSuffisantes();
    btnValider.disabled = !suffisant;
    btnValider.style.opacity = suffisant ? '1' : '0.4';
    btnValider.style.cursor = suffisant ? 'pointer' : 'not-allowed';
  }
  actualiserBoutonValider();
  if (zoneCandidature) {
    zoneCandidature.addEventListener('input', actualiserBoutonValider);
    zoneCandidature.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') { return; }
      var champs = Array.prototype.slice.call(zoneCandidature.querySelectorAll(
        'input[type="text"], input[type="url"], input[type="tel"], input[type="email"]'));
      var dernier = champs[champs.length - 1];
      if (e.target === dernier && btnValider && !btnValider.disabled) { btnValider.click(); }
    });
  }
  if (btnValider) {
    btnValider.addEventListener('click', function () {
      if (btnValider.disabled) { return; }
      fermerPanneauGuide();
      if (typeof rerender === 'function') { rerender(); }
    });
  }
  var btnRetour = panneau.querySelector('#btnRetourCandidatureRapide');
  if (btnRetour) {
    btnRetour.addEventListener('click', function () {
      fermerPanneauGuide();
      onRetour();
    });
  }
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
// travail clique dans les resultats. TACHE (retour utilisateur : recherche
// allegee) : la branche "valeurs" est retiree -- plus aucune carte
// n'envoie plus champ='valeurs' depuis le retrait de cette categorie de la
// recherche (voir baseConnaissancesERIP.js).
function ouvrirPanneauMetiersAssociesChamp(champ, id, label, icone) {
  ouvrirPanneauMetiersAssociesGenerique((icone || '') + ' ' + label,
    'Cet environnement de travail correspond notamment aux metiers suivants :',
    trouverMetiersParChampId(champ, id, 5));
}

// TACHE (amelioration recherche : domaine d'activite) : meme principe,
// mais pour un domaine d'activite clique dans les resultats -- reutilise
// trouverMetiersParSecteur() (baseConnaissancesERIP.js), champ texte simple
// plutot qu'un id de catalogue.
function ouvrirPanneauMetiersAssociesDomaine(domaineNom) {
  ouvrirPanneauMetiersAssociesGenerique('&#127981; ' + domaineNom,
    'Ce domaine regroupe notamment les metiers suivants :',
    trouverMetiersParSecteur(domaineNom, 5));
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
    '<label class="pastille-parcours"><input type="radio" name="parcoursGuide" value="cv"> &#128196; Préparer mon CV</label>' +
    '<label class="pastille-parcours"><input type="radio" name="parcoursGuide" value="lettre"> &#9993; Préparer ma lettre de motivation</label>' +
    '<label class="pastille-parcours"><input type="radio" name="parcoursGuide" value="entretien"> &#127908; Préparer mon entretien</label>' +
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
    'title="Choisissez une réponse pour continuer.">Continuer &#8594;</button></div>';
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
      btnValider.title = 'Choisissez une réponse pour continuer.';
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
    'title="Choisissez une réponse pour continuer.">Continuer &#8594;</button></div>';
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
      // TACHE (retour utilisateur : "Créer un CV" après une tentative
      // "Mettre à jour mon CV" saute Mon Projet directement) : cvAnalyse
      // (et les 2 champs associes, remplis par le meme import CV -- voir
      // metiers.js) restaient a true indefiniment, meme apres avoir choisi
      // explicitement de repartir sur un CV neuf -- pageObjectif() s'appuie
      // dessus pour sauter Activites/Actions/Environnement/Valeurs et
      // atterrir directement sur Mon Projet, sans chemin de retour vers ces
      // pages. Reinitialise ici, au moment ou "Creer un CV" est choisi sans
      // ambiguite possible.
      dossier.cvAnalyse = false;
      dossier.competencesCV = undefined;
      dossier.savoirsCV = undefined;
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
    'title="Choisissez une réponse pour continuer.">Continuer &#8594;</button></div>';
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
      // TACHE (migration parcours Entretien) : le nouveau parcours gere
      // deja lui-meme CV + lettre + entreprise/poste puis lance l IA --
      // remplace l ancienne fenetre + la navigation separee vers
      // 'resultats' (l IA est desormais lancee directement, comportement
      // simplifie et assume).
      ouvrirParcoursEntretien();
    } else {
      ouvrirAssistantDepotCV(dossier.modeCreation, { onTerminer: destination });
    }
  });
}

// Destination finale une fois le CV disponible sans reimport necessaire :
// ecran ACTION pour le CV et la lettre, parcours moderne dedie pour
// l'entretien.
// TACHE (retour utilisateur : regression grave, vieil ecran ouvrirAideIA()
// revenu) : ce dernier appel a ouvrirAideIA() est retire -- c'etait le
// SEUL chemin restant vers cet ecran legacy dans toute l'application (deja
// deconnecte partout ailleurs), jamais raccorde au parcours moderne
// (page Action, accordeons) contrairement au reste. 'lettre' et 'entretien'
// routent desormais vers leurs equivalents modernes, exactement comme 'cv'.
function lancerParcoursGuide() {
  if (rechercheGuidee.parcours === 'cv') {
    naviguerVers('resultats');
  } else if (rechercheGuidee.parcours === 'entretien') {
    ouvrirParcoursEntretien();
  } else if (rechercheGuidee.parcours === 'lettre') {
    dossier.dernierDocumentPrepare = 'lettre';
    naviguerVers('resultats');
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
  { categorie: 'Santé / Sécurité', items: ['SST', 'PSC1', 'AFGSU', 'SSIAP', 'H0B0', 'BS', 'BE Manœuvre'] },
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
  'Football': ['Esprit d\'équipe', 'Persévérance', 'Respect des règles'],
  'Rugby': ['Esprit d\'équipe', 'Persévérance', 'Respect des règles'],
  'Tennis': ['Persévérance', 'Rigueur', 'Autonomie'],
  'Natation': ['Persévérance', 'Autonomie', 'Endurance'],
  'Course à pied': ['Persévérance', 'Endurance', 'Autonomie'],
  'Cyclisme': ['Endurance', 'Autonomie', 'Persévérance'],
  'Musculation / Fitness': ['Persévérance', 'Rigueur', 'Autonomie'],
  'Arts martiaux': ['Respect des règles', 'Persévérance', 'Sécurité'],
  'Danse': ['Créativité', 'Expression artistique', 'Rigueur'],
  'Randonnée': ['Endurance', 'Autonomie', 'Adaptabilité'],
  'Escalade': ['Persévérance', 'Sécurité', 'Autonomie'],
  'Sports mécaniques': ['Technique', 'Précision', 'Sécurité'],
  'Sports nautiques': ['Adaptabilité', 'Sécurité', 'Autonomie'],
  'Dessin': ['Créativité', 'Expression artistique', 'Sens du détail'],
  'Peinture': ['Créativité', 'Expression artistique', 'Sens du détail'],
  'Photographie': ['Créativité', 'Sens du détail'],
  'Couture': ['Précision', 'Travail manuel', 'Sens du détail'],
  'Tricot': ['Précision', 'Patience', 'Travail manuel'],
  'Bricolage': ['Travail manuel', 'Technique', 'Réparation'],
  'Menuiserie': ['Travail manuel', 'Technique', 'Précision'],
  'Sculpture': ['Créativité', 'Travail manuel', 'Expression artistique'],
  'Décoration': ['Créativité', 'Sens du détail', 'Expression artistique'],
  'DIY (Do It Yourself)': ['Créativité', 'Travail manuel', 'Innovation'],
  'Lecture': ['Apprentissage', 'Autonomie'],
  'Écriture': ['Rédaction', 'Créativité', 'Expression artistique'],
  'Musique': ['Créativité', 'Expression artistique'],
  'Chant': ['Expression artistique', 'Créativité'],
  'Théâtre': ['Communication', 'Expression artistique', 'Créativité'],
  'Cinéma': ['Créativité', 'Apprentissage'],
  'Jeux de société': ['Esprit d\'équipe', 'Raisonnement logique'],
  'Langues étrangères': ['Communication', 'Adaptabilité', 'Apprentissage'],
  'Informatique': ['Bureautique', 'Technique', 'Analyse de données'],
  'Programmation': ['Raisonnement logique', 'Technique', 'Rigueur'],
  'Jeux vidéo': ['Raisonnement logique', 'Adaptabilité'],
  'Création de site Internet': ['Technique', 'Créativité', 'Innovation'],
  'Montage vidéo': ['Créativité', 'Technique', 'Sens du détail'],
  'Création graphique': ['Créativité', 'Expression artistique', 'Sens du détail'],
  'Impression 3D': ['Technique', 'Innovation', 'Précision'],
  'Robotique': ['Technique', 'Innovation', 'Raisonnement logique'],
  'Jardinage': ['Patience', 'Organisation', 'Travail manuel'],
  'Potager': ['Patience', 'Organisation', 'Travail manuel'],
  'Observation de la nature': ['Patience', 'Autonomie'],
  'Pêche': ['Patience', 'Autonomie'],
  'Chasse': ['Patience', 'Sécurité', 'Autonomie'],
  'Camping': ['Autonomie', 'Adaptabilité', 'Organisation'],
  'Cuisine': ['Organisation', 'Gestion du temps', 'Rigueur'],
  'Pâtisserie': ['Précision', 'Rigueur', 'Créativité'],
  'Voyage': ['Adaptabilité', 'Autonomie'],
  'Collection': ['Organisation', 'Rigueur'],
  'Animaux': ['Empathie', 'Responsabilité', 'Patience']
};

// Petit echappement pour inserer une valeur dans un attribut HTML (value="...")
// sans risquer de casser le markup si l'utilisateur saisit des guillemets.
function echapperAttribut(t) {
  return String(t || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// TACHE (retour utilisateur : coller en un clic, generalise a tous les
// ecrans de collage de reponse IA) : composant partage -- gros bouton qui
// lit directement le presse-papiers (navigator.clipboard.readText()),
// affiche le resultat en LECTURE SEULE (jamais modifiable par erreur),
// Entree (ecouteur GLOBAL document, fonctionne quelle que soit la
// position de la souris/le focus) declenche l'import. Filet de secours
// (collage manuel Ctrl+V, editable) si la lecture automatique echoue ou
// n'est pas supportee par ce navigateur (Firefox notamment). Un seul
// endroit a maintenir pour ce comportement, partage par : l'assistant
// pas-a-pas Etape 4 (metiers.js), la recuperation entretien (metiers.js),
// et l'accordeon "Importer les informations IA" de la page Action (app.js).
//
// TACHE (correction bug : fenetres qui s'assombrissent en boucle) : un
// ecouteur Entree PAR idTextarea (version precedente) restait actif meme
// une fois l'ecran de collage recouvert par un AUTRE ecran (ex. "Verifiez
// les informations importees", ouvert PAR-DESSUS sans fermer le wizard
// en dessous, cf. bouton Retour). Chaque Entree redeclenchait alors
// l'import du DESSOUS, qui rouvrait un NOUVEL ecran de validation
// empile sur l'ancien -- assombrissement progressif, plus aucun bouton
// cliquable (ce n'etait plus le bon calque au-dessus). Corrige : un seul
// ecouteur global (jamais duplique), qui ne verifie que le SEUL
// "collage actif" du moment (_configCollageActif) -- desactiverCollageInstantane()
// permet a tout ecran ouvert par-dessus de le neutraliser pendant qu'il
// est affiche.
//
// config attendu (tous des id d'elements deja presents dans le DOM) :
// idBoutonColler, idZoneAuto, idZoneApercu, idTextarea, idBoutonImporter
// idBoutonCollerManuel, idBoutonEffacerRecoller, onErreur(message),
// onEffacer(), onSucces(texte), onCollerManuel() -- facultatifs.
var _configCollageActif = null;
var _ecouteurEntreeCollageInstantaneInstalle = false;
function desactiverCollageInstantane() { _configCollageActif = null; }
function activerCollageInstantane(config) {
  var zoneAuto = document.getElementById(config.idZoneAuto);
  var zoneApercu = document.getElementById(config.idZoneApercu);
  var texteArea = document.getElementById(config.idTextarea);
  var btnColler = document.getElementById(config.idBoutonColler);
  if (!zoneAuto || !zoneApercu || !texteArea || !btnColler) { return; }
  var btnCollerManuel = config.idBoutonCollerManuel && document.getElementById(config.idBoutonCollerManuel);
  var btnEffacer = config.idBoutonEffacerRecoller && document.getElementById(config.idBoutonEffacerRecoller);

  _configCollageActif = config;

  function afficherApercu(texte) {
    texteArea.value = texte;
    zoneAuto.style.display = 'none';
    zoneApercu.style.display = 'block';
  }
  function activerCollageManuel() {
    if (typeof config.onCollerManuel === 'function') { config.onCollerManuel(); }
    zoneAuto.style.display = 'none';
    zoneApercu.style.display = 'block';
    texteArea.removeAttribute('readonly');
    texteArea.style.background = '';
    texteArea.value = '';
    texteArea.focus();
  }

  btnColler.addEventListener('click', function () {
    if (!(navigator.clipboard && navigator.clipboard.readText)) { activerCollageManuel(); return; }
    navigator.clipboard.readText().then(function (texte) {
      if (!texte || !texte.trim()) {
        if (typeof config.onErreur === 'function') {
          config.onErreur('Le presse-papiers semble vide. Copiez la réponse de l\'assistant, puis réessayez.');
        }
        return;
      }
      afficherApercu(texte);
      // TACHE (retour utilisateur : "j'ai perdu la fonction" -- message de
      // confirmation disparu) : perdu lors de la generalisation de ce
      // composant a 4 ecrans (voir commentaire plus haut) -- ce callback
      // n'existait pas encore a ce moment-la. Confirme que le texte a bien
      // ete recupere automatiquement du presse-papiers, SANS toucher au
      // reste du parcours (apercu en lecture seule, bouton "Importer",
      // ecran de verification ensuite : tout ca reste identique, y
      // compris pour le filet de secours "Coller manuellement").
      if (typeof config.onSucces === 'function') { config.onSucces(texte); }
    }).catch(activerCollageManuel);
  });
  if (btnCollerManuel) { btnCollerManuel.addEventListener('click', activerCollageManuel); }
  if (btnEffacer) {
    btnEffacer.addEventListener('click', function () {
      texteArea.value = '';
      texteArea.setAttribute('readonly', 'readonly');
      texteArea.style.background = '#F9FAFB';
      zoneApercu.style.display = 'none';
      zoneAuto.style.display = 'block';
      if (typeof config.onEffacer === 'function') { config.onEffacer(); }
    });
  }

  if (!_ecouteurEntreeCollageInstantaneInstalle) {
    _ecouteurEntreeCollageInstantaneInstalle = true;
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !_configCollageActif) { return; }
      var cfg = _configCollageActif;
      var ta = document.getElementById(cfg.idTextarea);
      var btn = document.getElementById(cfg.idBoutonImporter);
      if (ta && btn && ta.hasAttribute('readonly')) { e.preventDefault(); btn.click(); }
    });
  }
}

// Petit HTML reutilisable pour la zone "collage instantane" (gros bouton +
// apercu lecture seule), a inserer dans le contenuHTML de chaque ecran --
// seuls les id changent (suffixe fourni), pour coexister sur une meme page
// si besoin. idBoutonImporter/libelleImporter restent definis par l'appelant
// (texte et logique d'import different selon l'ecran).
function htmlCollageInstantane(suffixe, boutonsApercuHTML) {
  // TACHE (chantier "Videos d'accompagnement") : declencheur du geste
  // "import-reponse-ia", ajoute UNE SEULE FOIS ici plutot que dans chacun
  // des 4 appelants (Wizard CV, LettreV1, Entretien, accordeon ActionIA) --
  // ce composant etant deja partage, le geste "recuperer la reponse de
  // l'IA" y est le meme quel que soit l'appelant (voir "Principe de
  // deploiement" du plan d'implementation). htmlDeclencheurDemoVideo()
  // retourne une chaine vide si aucune video n'est disponible pour ce
  // geste : rien n'est affiche dans ce cas, aucune condition a gerer ici.
  return '<div id="zoneCollageAuto' + suffixe + '" class="text-center py-3">' +
    '<button type="button" id="btnCollerAuto' + suffixe + '" title="Coller la réponse copiée" ' +
    'style="width:96px;height:96px;border-radius:50%;border:none;background:#0d6efd;color:#FFFFFF;' +
    'font-size:2.2rem;box-shadow:0 4px 14px rgba(13,110,253,.4);cursor:pointer;">&#128203;</button>' +
    '<p class="small text-muted mt-2 mb-0">Cliquez pour coller la réponse copiée</p>' +
    '<button type="button" id="btnCollerManuel' + suffixe + '" class="btn btn-link mt-2" style="font-size:1rem;">' +
    'Coller manuellement à la place</button>' +
    '</div>' +
    '<div id="zoneApercuCollage' + suffixe + '" style="display:none;">' +
    '<textarea class="form-control form-control-sm mb-2" id="texteCollage' + suffixe + '" rows="8" readonly ' +
    'style="background:#F9FAFB;" placeholder="Collez ici la réponse complète de l\'assistant IA..."></textarea>' +
    (boutonsApercuHTML || '') +
    '</div>' +
    '<div class="text-center mt-2">' + htmlDeclencheurDemoVideo('import-reponse-ia') + '</div>';
}

// ============================================================
// DEMONSTRATIONS VIDEO (chantier "Videos d'accompagnement") :
// ------------------------------------------------------------
// Table de correspondance UNIQUE, indexee par GESTE (jamais par parcours
// -- voir Plan_Implementation_Videos_ERIP.md, "Principe de deploiement").
// Un meme geste (masquer, envoyer a l'IA, importer une reponse) declenche
// toujours la meme entree ici, quel que soit l'ecran d'origine (wizard CV,
// entretien, lettre V1, accordeon Action...).
//
// Chaque entree : fichier (chemin relatif, jamais present tant que la
// video n'est pas fournie -- voir 'export-ia-image' ci-dessous, absent
// volontairement), titre (affiche en haut de la fenetre), texteAlternatif
// (TOUJOURS affiche a cote du bouton, jamais seulement dans la fenetre --
// principe deja acte : l'utilisateur doit pouvoir reussir son parcours
// sans jamais regarder une seule video).
//
// 'export-ia-image' : geste identifie dans les maquettes (joindre une
// image/PDF a l'assistant IA) mais AUCUN fichier fourni a ce jour. Entree
// deliberement absente de la table plutot que renseignee avec un chemin
// invalide -- htmlDeclencheurDemoVideo() ci-dessous ne genere alors aucun
// bouton pour ce geste (voir sa garde), ce qui evite un lien mort tant que
// la video n'existe pas. Ajouter l'entree suffira le jour ou le fichier
// sera fourni, aucune autre modification necessaire.
var DEMOS_VIDEO_ERIP = {
  'masquage-texte': {
    fichier: 'videos/Anonym_txt.mp4',
    titre: 'Masquer des informations dans un texte',
    texteAlternatif: 'Cette démonstration montre comment sélectionner puis effacer les informations personnelles ' +
      'dans un texte modifiable, avant de l’envoyer à l’assistant IA.'
  },
  'masquage-image': {
    fichier: 'videos/Anonym_vid_importer.mp4',
    titre: 'Masquer des informations sur une image',
    texteAlternatif: 'Cette démonstration montre comment dessiner un rectangle noir sur une image ou un PDF ' +
      'scanné, pour masquer les informations personnelles avant l’envoi à l’assistant IA.'
  },
  'export-ia-texte': {
    fichier: 'videos/Exp_imp_ai.mp4',
    titre: 'Envoyer un texte à un assistant IA',
    texteAlternatif: 'Cette démonstration montre comment coller le texte préparé par ERIP dans la conversation ' +
      'avec l’assistant IA choisi.'
  },
  'import-reponse-ia': {
    fichier: 'videos/importer_IA.mp4',
    titre: 'Récupérer la réponse de l’assistant IA',
    texteAlternatif: 'Cette démonstration montre comment copier la réponse complète de l’assistant IA, puis la ' +
      'coller dans ERIP pour l’importer.'
  },
  'astuce-image-refusee': {
    fichier: 'videos/Astuce_img.mp4',
    titre: 'Astuce : image refusée par l’assistant',
    texteAlternatif: 'Certains assistants IA gratuits limitent ou refusent l’envoi d’images. Cette démonstration ' +
      'montre comment continuer malgré tout, en utilisant le texte à la place.'
  }
};

// TACHE (chantier "Videos d'accompagnement", refonte du composant apres
// audit) : trois etats explicites geres par de vrais evenements du lecteur
// (loadedmetadata/error), plutot qu'un <video> brut livre a lui-meme --
// chargement (cadre reserve a ratio fixe, aucun saut visuel), pret (le
// lecteur apparait), erreur (message clair, jamais un rectangle noir muet).
// Cadre a ratio fixe (.demo-video-cadre, style.css) : la fenetre garde la
// meme silhouette du chargement a la lecture, quelle que soit la duree du
// chargement ou la resolution reelle du fichier. Titres raccourcis dans la
// table ci-dessus (le texte alternatif, plus long, reste la description
// complete -- toujours affiche sous la video, jamais uniquement dans le
// titre).
// TACHE (retour utilisateur : "est-ce possible que la vidéo démarre
// directement sans appuyer sur play ?") : la personne a deja explicitement
// cliqué "Voir la démonstration" pour ouvrir cette fenetre -- lui demander
// un second clic sur le bouton play du lecteur est une friction inutile.
// Lecture automatique activee (attribut "autoplay"), MUETTE par defaut
// (attribut "muted", necessaire pour que les navigateurs autorisent le
// demarrage automatique sans interaction) -- controls reste present, la
// personne peut reactiver le son au besoin.
function ouvrirDemoVideo(idDemo) {
  var demo = DEMOS_VIDEO_ERIP[idDemo];
  if (!demo || !demo.fichier) { return; } // geste sans video disponible : rien a ouvrir
  ouvrirFenetreERIP({
    titre: '&#127909; ' + demo.titre,
    taille: 'large',
    contenuHTML:
      '<div class="demo-video-cadre" id="demoVideoCadre">' +
        '<div class="demo-video-etat" id="demoVideoChargement">' +
          '<div class="demo-video-spinner" aria-hidden="true"></div>' +
          '<p class="small mb-0">Chargement de la vidéo…</p>' +
        '</div>' +
        '<div class="demo-video-etat demo-video-etat-erreur d-none" id="demoVideoErreur">' +
          '<p class="small mb-0">&#9888;&#65039; Cette vidéo n’a pas pu être chargée.</p>' +
        '</div>' +
        '<video class="demo-video-lecteur d-none" id="demoVideoLecteur" ' +
          'src="' + echapperAttribut(demo.fichier) + '" controls autoplay muted playsinline preload="metadata">' +
          '<p class="small mb-0">Votre navigateur ne peut pas lire cette vidéo.</p>' +
        '</video>' +
      '</div>' +
      '<p class="text-muted small mt-2 mb-0">' + demo.texteAlternatif + '</p>'
  });

  var video = document.getElementById('demoVideoLecteur');
  var chargement = document.getElementById('demoVideoChargement');
  var erreur = document.getElementById('demoVideoErreur');

  video.addEventListener('loadedmetadata', function () {
    chargement.classList.add('d-none');
    erreur.classList.add('d-none');
    video.classList.remove('d-none');
  });
  video.addEventListener('error', function () {
    chargement.classList.add('d-none');
    video.classList.add('d-none');
    erreur.classList.remove('d-none');
  });
}

// Petit HTML reutilisable pour le bouton declencheur -- a inserer dans le
// contenuHTML de n'importe quel ecran qui a besoin de ce geste. Retourne
// une chaine VIDE si la video n'existe pas encore dans la table (voir
// 'export-ia-image' ci-dessus) : aucun appelant n'a besoin de verifier
// lui-meme si le fichier existe, ce test est centralise ici.
function htmlDeclencheurDemoVideo(idDemo, libelle) {
  var demo = DEMOS_VIDEO_ERIP[idDemo];
  if (!demo || !demo.fichier) { return ''; }
  return '<button type="button" class="demo-video-declencheur" data-demo-video="' + idDemo + '">' +
    '<span class="demo-video-declencheur-icone" aria-hidden="true">&#9654;</span>' +
    (libelle || 'Voir la démonstration (20 s)') + '</button>';
}

// Bloc "Astuce" complet (pas un simple bouton comme htmlDeclencheurDemoVideo) --
// reprend la mise en forme de la maquette 2 : separe par une ligne, plus
// petit que le geste principal au-dessus (jamais en concurrence avec lui).
// A inserer UNIQUEMENT quand le contexte est reellement celui d'une image/PDF
// (voir les 3 appelants : chacun connait son propre etat.modeEditeur/type) --
// jamais affiche sur un contexte texte, ou le refus d'image n'a pas de sens.
function htmlBlocAstuceImageRefusee() {
  var demo = DEMOS_VIDEO_ERIP['astuce-image-refusee'];
  if (!demo || !demo.fichier) { return ''; }
  return '<div class="mt-3 pt-3" style="border-top:1px solid #E5E7EB;">' +
    '<p class="small fw-bold mb-1">&#128161; Astuce (20 s)</p>' +
    '<p class="small text-muted mb-1">L’assistant refuse votre image ? Regardez cette courte démonstration pour ' +
    'savoir comment continuer avec le texte à la place.</p>' +
    htmlDeclencheurDemoVideo('astuce-image-refusee', 'Voir l’astuce (20 s)') +
    '</div>';
}

// Delegation globale (meme principe deja utilise dans metiers.js pour
// data-action="mode") : un seul ecouteur, installe une fois, qui fonctionne
// quel que soit l'ecran ou le bouton est re-rendu -- aucun cablage
// supplementaire necessaire dans chaque wireXxx()/onAfficher() qui integre
// htmlDeclencheurDemoVideo().
document.addEventListener('click', function (e) {
  var bouton = e.target.closest ? e.target.closest('[data-demo-video]') : null;
  if (bouton) { ouvrirDemoVideo(bouton.dataset.demoVideo); }
});

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

// TACHE (migration Design System, chantier "Fenetre ERIP", 2e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP() -- ne
// construit plus son propre overlay. Comportement strictement preserve :
// fermeture INCONDITIONNELLE au clic sur "Valider", callback onValider()
// declenche UNIQUEMENT si au moins un element a ete choisi (case cochee
// ou saisie libre) -- jamais l'inverse. L'ancien appel a
// fermerFenetreCatalogue() en tout debut de fonction (qui fermait une
// eventuelle fenetre catalogue deja ouverte avant d'en ouvrir une
// nouvelle) n'a plus lieu d'etre : ouvrirFenetreERIP() applique deja cette
// regle pour TOUTE fenetre ERIP, plus besoin de la repeter ici.
function fermerFenetreCatalogue() {
  fermerFenetreERIP();
}

// Fenetre de selection : catalogue groupe par categories (cases a cocher pour
// les items pas encore choisis) + champ "Autre" libre. onValider(choisis[]) est
// appele avec les valeurs cochees + la saisie libre eventuelle.
function ouvrirFenetreCatalogue(config, onValider) {
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

  var fenetre = ouvrirFenetreERIP({
    titre: config.titre,
    contenuHTML:
      corpsCategories +
      '<div class="catalogue-categorie"><h6>Autre</h6>' +
      '<input type="text" class="form-control form-control-sm" id="catalogueAutreTexte" placeholder="Préciser..."></div>' +
      '<div class="d-flex justify-content-end mt-3">' +
        '<button type="button" id="validerCatalogueBtn" class="btn btn-primary">Valider</button>' +
      '</div>'
  });

  document.getElementById('validerCatalogueBtn').addEventListener('click', function () {
    var choisis = [];
    fenetre.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) { choisis.push(cb.value); });
    var autre = document.getElementById('catalogueAutreTexte').value.trim();
    if (autre) { choisis.push(autre); }
    fermerFenetreERIP();
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

// TACHE (retour utilisateur : "Oui" seul ne doit pas suffire, contrairement
// à "Non") : logique commune aux 4 sous-sections Oui/Non de Mon Projet
// (Certifications, Expériences et savoir-faire personnels, Loisirs,
// Engagements -- toutes basées sur contenuCatalogueOuiNon/wireCatalogueOuiNon
// ci-dessus). "Non" est une réponse valide en soi (rien à ajouter), donc
// suffisante pour marquer la sous-section complète. "Oui" seul ne l'est
// PAS : ça ne devient complet qu'une fois qu'au moins un élément a
// réellement été ajouté -- répondre "oui" sans jamais rien renseigner
// n'a pas de sens à afficher comme terminé.
function completOuiNonAvecContenu(cle) {
  // TACHE (retour utilisateur : coche jamais activee malgre un import
  // reconnu) : du contenu reellement present (import, ou saisie directe
  // sans etre passe par le Oui/Non) suffit desormais a lui seul -- la
  // reponse Oui/Non n'est plus qu'un moyen PARMI D'AUTRES d'arriver a
  // "complet", pas une condition bloquante en plus du contenu.
  if ((dossier[cle] || []).length > 0) { return true; }
  var reponse = dossier.catalogueActif ? dossier.catalogueActif[cle] : undefined;
  return reponse === false;
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
  return {
    activites: dossier.activites,
    actions: dossier.actions,
    environnement: dossier.environnement,
    valeurs: dossier.valeurs,
    // TACHE (dette technique, chantier 2) : utilise desormais les fonctions
    // canoniques savoirFaireActuels()/savoirEtreActuels() (definies plus
    // bas) au lieu de reimplementer localement la meme regle -- une
    // competence non reconnue dans la table figee categorieCompetence
    // (typiquement importee depuis un vrai CV) est rattachee par defaut a
    // "Savoir-faire" plutot que d'etre silencieusement exclue du score de
    // recommandation.
    savoirFaire: savoirFaireActuels(),
    savoirEtre: savoirEtreActuels(),
    savoirs: dossier.savoirsCV || [],
    accepte: dossier.accepte || []
  };
}

// TACHE (retour utilisateur : suggestions != metiers vises) : suggererMetiers()
// retiree -- elle n'etait plus utilisee que par texteProfil() pour la ligne
// "Metiers envisages", elle-meme retiree (les suggestions ne doivent pas
// nourrir le prompt IA). L'affichage des metiers recommandes continue de
// fonctionner via metiersPourAffichage(), inchangee.

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
  // TACHE (retour utilisateur : "1 seule valeur" pour un profil importe) :
  // le repli se limitait aux competences EXACTEMENT reconnues "Savoir-etre"
  // dans la table figee categorieCompetence (~15 libelles internes) --
  // pour un CV importe, la quasi-totalite des competences (souvent des
  // savoir-faire non reconnus dans cette table) etaient donc ignorees ici,
  // meme si "Analyse de votre profil" les affichait deja correctement par
  // ailleurs (cf. correction precedente). Elargi a TOUTES les competences
  // identifiees (deduireCompetences(), sans filtre de categorie) -- phrase
  // neutre ("X", pas "faire preuve de X") pour rester grammaticalement
  // correcte quelle que soit la nature reelle de la competence.
  if (aime.length < 10) {
    deduireCompetences().forEach(function (c) { ajoute(c.toLowerCase()); });
  }
  if (aime.length === 0) { ajoute('apprendre'); ajoute('vous depasser'); }
  return { texte: aime.map(function (a) { return '&#10004; ' + a; }).join(' &middot; '), nombre: aime.length };
}

// Message competences detectees en cours de parcours (toutes, en gras)
// TACHE (retour utilisateur) : passe en accordeon (replie par defaut,
// reutilise blocAccordeon()/wireAccordeon() deja existants, meme principe
// que messageVAE()) -- icone commune aux 4 pages concernees (Experience/
// Ce que vous faisiez/Environnement/Attentes), differente de celle de la
// page Potentiel (voir pageRevelation()), + compteur visible sans avoir a
// deplier.
function afficherCompetencesDetectees(etape) {
  var comps = deduireCompetences();
  if (comps.length === 0) { return ''; }
  var liste = '<strong>' + comps.map(function (c) { return '&#10004; ' + c; }).join(' &middot; ') + '</strong>';
  var intro;
  if (etape === 'activites') { intro = 'L’assistant commence à mieux vous connaître.'; }
  else if (etape === 'actions') { intro = 'Grâce à vos réponses, votre profil s’enrichit.'; }
  else { intro = 'Votre profil se précise.'; }
  return blocAccordeon('competences-detectees-' + etape,
    '&#129513; Compétences déjà identifiées <span class="badge bg-primary ms-1">' + comps.length + '</span>',
    intro, liste);
}

/* ------------------------------------------------------------
   4. NAVIGATION CLIQUABLE
   ------------------------------------------------------------ */
var ETAPES = [
  { id: 'cv', label: '👤' },
  { id: 'objectif', label: '🎯' },
  { id: 'activites', label: '🤝 Expérience' },
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
  // TACHE (bouton Restaurer limite a l'accueil) : visible UNIQUEMENT sur la
  // page d'accueil ('cv'), et seulement tant que la personne ne s'est pas
  // "engagee" dans un nouveau parcours depuis la reinitialisation -- cet
  // engagement efface deja la sauvegarde a la source (voir naviguerVers(),
  // les clics sur les 3 cartes d'accueil et sur "Boite a outils"), donc
  // sauvegardeExiste() suffit ici a lui seul une fois combine a la
  // condition de page.
  var boutonRestaurer = (activeId === 'cv' && sauvegardeExiste())
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
  // TACHE (bouton Restaurer limite a l'accueil) : quitter la page d'accueil
  // constitue un "engagement" dans un parcours -- la sauvegarde issue d'une
  // reinitialisation n'est plus proposee au retour (voir aussi les clics
  // directs sur les 3 cartes d'accueil et sur "Boite a outils", qui
  // effacent deja la sauvegarde des le clic, avant meme la navigation).
  if (route !== 'cv') { effacerSauvegarde(); }
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
// options.terminerParcours = true : bouton vert "Merci bien, j'ai fini" a
// droite, affiche UNIQUEMENT quand le document actif de la page Action a
// ete reellement enregistre (voir dossier.documentsEnregistres, pose au
// telechargement -- pageResultats() calcule la condition et ne passe cette
// option que si elle est vraie). Remplace l'ancien "Recommencer" (rouge,
// toujours visible, effacait tout sans distinction de parcours).
function barreNavigation(precedent, suivant, labelSuivant, options) {
  options = options || {};
  var html = '<div class="d-flex justify-content-between align-items-center mt-4 barre-navigation">';
  html += precedent
    ? '<button class="btn btn-outline-secondary btn-lg" onclick="naviguerVers(\'' + precedent + '\')">&#8592; Retour</button>'
    : '<span></span>';
  html += '<button class="btn btn-light btn-accueil border" onclick="naviguerVers(\'cv\')">&#127968; Accueil</button>';
  if (options.terminerParcours) {
    html += '<button class="btn btn-success btn-lg" onclick="terminerParcours()">&#9989; Merci bien, j\'ai fini</button>';
  } else if (suivant) {
    // TACHE 43bis : bouton "suivant" desactivable (ex. selection minimale requise),
    // sans impact sur les appelants qui ne passent pas cette option.
    // TACHE (complement) : l'onclick est TOUJOURS present (meme quand
    // disabled) -- un bouton HTML disabled ignore nativement les clics, donc
    // aucun risque -- et un id fixe (btnSuivantNavigation) permet a un
    // appelant de basculer disabled/enabled en direct si besoin, sans avoir
    // a re-rendre toute la page.
    var jsOnclickSuivant = options.onclickSuivant || ("naviguerVers('" + suivant + "')");
    if (options.suivantDesactive) {
      html += '<button class="btn btn-primary btn-lg" id="btnSuivantNavigation" onclick="' + jsOnclickSuivant + '" disabled title="' +
        (options.suivantDesactiveMessage || 'Selectionnez au moins un element pour continuer.') + '">' +
        (labelSuivant || 'Continuer &#8594;') + '</button>';
    } else {
      // TACHE (avertissement metier cible) : options.onclickSuivant permet a un
      // appelant d'intercepter le clic (ex. verifier qu'un metier cible est
      // renseigne) plutot que de naviguer directement -- sans rien changer
      // pour les appelants qui ne passent pas cette option.
      html += '<button class="btn btn-primary btn-lg" id="btnSuivantNavigation" onclick="' + jsOnclickSuivant + '">' + (labelSuivant || 'Continuer &#8594;') + '</button>';
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
// ============================================================
// DESIGN SYSTEM ERIP -- COMPOSANT "FENETRE ERIP"
// ------------------------------------------------------------
// Conforme a la specification validee (spec-fenetre-erip.md). Primitive
// UNIQUE pour toute fenetre/panneau/modale de l'application -- aucune
// fenetre ne doit plus jamais construire son propre overlay a la main
// (regle absolue de la specification). Toute fenetre existante est migree
// progressivement vers cette primitive, une a la fois.
//
// Regles structurelles (voir specification pour le detail complet) :
// - une seule fenetre ERIP ouverte a la fois : en ouvrir une ferme
//   automatiquement toute fenetre ERIP deja ouverte ;
// - z-index unique (2000) pour toutes les fenetres, sans exception ;
// - 3 tailles nommees seulement : 'standard' (defaut, 520px), 'large'
//   (700px), 'tresLarge' (900px) -- jamais de largeur au cas par cas ;
// - fermeture par croix, par clic exterieur, et desormais par Echap ;
// - gestion du focus (focus initial dans la fenetre, piege pendant son
//   ouverture, restauration a la fermeture) et attributs ARIA -- absents
//   de tous les generateurs de fenetre actuels, vrais ajouts.
//
// Contrat : ouvrirFenetreERIP({ titre, contenuHTML, taille }) construit et
// affiche la fenetre, retourne son element racine (meme convention que
// l'ancien ouvrirPanneauGuide()) pour que l'appelant cable ses propres
// boutons a l'interieur de contenuHTML, exactement comme avant.
// fermerFenetreERIP() ferme la fenetre actuellement ouverte, quel que soit
// l'appelant (le bouton croix interne, un clic exterieur, Echap, ou un
// bouton propre au contenu de l'appelant, ex. un bouton "Fermer" dedie).
// ============================================================
// TACHE (Design System, evolution de la primitive -- decouverte lors de la
// 6e migration, ouvrirVerificationInformations()) : definition UNIQUE de ce
// qu'est un "element interactif" dans une fenetre ERIP -- utilisee a la
// fois par le piege de focus (Tab/Shift+Tab) et par le choix du focus
// initial a l'ouverture, pour qu'aucune divergence ne puisse plus exister
// entre les deux (avant ce correctif, le focus initial ignorait <select>
// et <textarea>, contrairement au piege de focus -- invisible tant
// qu'aucune fenetre ne commencait par un tel champ, revele par la 6e
// migration). "prefixe" permet de restreindre la recherche a une zone
// precise (ex. ".fenetre-erip-corps", pour exclure la croix de l'en-tete
// du choix de focus initial) sans dupliquer la liste des clauses.
var CLAUSES_ELEMENTS_FOCALISABLES_ERIP = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
];
function selecteurElementsFocalisablesERIP(prefixe) {
  return CLAUSES_ELEMENTS_FOCALISABLES_ERIP.map(function (clause) {
    return (prefixe ? prefixe + ' ' : '') + clause;
  }).join(', ');
}

// TACHE (Design System, evolution de la primitive -- decouverte lors de la
// 3e migration, ouvrirPanneauGuide()) : reference du minuteur de fermeture
// actuellement en attente (ou null si aucun). Necessaire pour que
// l'ouverture d'une nouvelle fenetre puisse annuler la restitution de focus
// DIFFEREE d'une fermeture precedente encore en cours -- voir le detail
// dans ouvrirFenetreERIP() ci-dessous. Portee volontairement globale a la
// primitive (une seule fenetre ERIP possible a la fois, donc un seul
// minuteur possible a la fois) : pas une variable propre a un appelant.
var _minuteurFermetureFenetreERIP = null;

function fermerFenetreERIP() {
  var overlay = document.getElementById('fenetreERIP');
  if (!overlay) { return; }
  overlay.classList.remove('visible');
  document.removeEventListener('keydown', overlay._surToucheFenetreERIP);
  var declencheur = overlay._elementDeclencheurFenetreERIP;
  // Annule un eventuel minuteur deja en attente avant d'en poser un nouveau
  // -- rend fermerFenetreERIP() idempotente (un second appel rapproche sur
  // la meme fenetre ne programme jamais deux restitutions de focus).
  if (_minuteurFermetureFenetreERIP) { clearTimeout(_minuteurFermetureFenetreERIP); }
  _minuteurFermetureFenetreERIP = setTimeout(function () {
    _minuteurFermetureFenetreERIP = null;
    if (overlay.parentNode) { overlay.remove(); }
    // Restitution du focus a l'element qui avait ouvert la fenetre --
    // uniquement s'il existe encore et reste focalisable (ex. un bouton
    // qui n'a pas disparu entre-temps a la suite d'un rerendu de page).
    if (declencheur && typeof declencheur.focus === 'function' && document.body.contains(declencheur)) {
      declencheur.focus();
    }
  }, 200);
}

// TACHE (Design System, evolution de la primitive -- point d'architecture
// dedie, valide avant implementation) : troisieme fonction de la primitive,
// PUREMENT ADDITIVE. Repond a un besoin verifie generique (pas le cas d'une
// seule recette) : au moins deux fenetres du projet (ouvrirVerificationEntretien(),
// en cours de migration, et ouvrirAssistantDepotCV(), plus grosse fenetre du
// projet, hors perimetre actuel) construisent un unique overlay puis
// REECRIVENT son contenu a plusieurs reprises au fil d'une navigation
// interne (etapes, documents), sans jamais fermer/rouvrir la fenetre.
// Avant cette fonction, la seule option pour une recette migree etait de
// rappeler ouvrirFenetreERIP() a chaque changement de contenu -- ce qui
// recree integralement l'overlay (visible, potentiel effet de
// clignotement), la ou le comportement d'origine ne remplacait qu'un
// contenu interne.
//
// Sept regles verifiees avant implementation (aucune n'a demande de
// complication supplementaire) :
// 1. Met a jour l'etat visible d'une fenetre DEJA OUVERTE (titre + contenu
//    + focus) -- rien d'autre.
// 2. Ne cree jamais de fenetre (voir ouvrirFenetreERIP() pour cela).
// 3. Ne ferme jamais de fenetre (voir fermerFenetreERIP() pour cela).
// 4. Ne recree jamais l'overlay -- seuls le titre et le corps sont
//    reecrits, le noeud #fenetreERIP lui-meme n'est jamais retire ni
//    recree.
// 5. Suppose qu'une fenetre ERIP est deja ouverte -- si ce n'est pas le
//    cas, ne fait rien (pas d'erreur, pas de creation implicite).
// 6. Ne touche : ni la taille (portee par une classe CSS sur
//    .fenetre-erip-boite, jamais reposee ici), ni la regle de fenetre
//    unique (vit dans ouvrirFenetreERIP(), jamais appelee ici), ni le
//    piege de focus (le gestionnaire de Tab recalcule DEJA dynamiquement
//    la liste des elements focalisables a chaque pression de touche --
//    aucun recablage necessaire, il s'adapte de lui-meme au nouveau
//    contenu), ni Echap (meme ecouteur, inchange), ni la fermeture par
//    clic exterieur (ecouteur attache a l'overlay lui-meme, jamais
//    retire).
// 7. Reste totalement independante de la logique metier : ne connait ni
//    etapes, ni documents, ni assistants, ni navigation -- uniquement
//    "quel HTML afficher maintenant", fourni entierement par l'appelant,
//    exactement comme contenuHTML l'est deja pour ouvrirFenetreERIP().
//
// Pas de parametre "taille" (volontairement absent) : aucun des deux
// besoins identifies n'a jamais besoin de changer la largeur d'une fenetre
// deja ouverte -- champ omis tant qu'aucun besoin reel ne l'exige, plutot
// qu'ajoute par anticipation.
function mettreAJourContenuFenetreERIP(config) {
  var overlay = document.getElementById('fenetreERIP');
  if (!overlay) { return; }

  if (config && config.titre !== undefined) {
    var titreEl = document.getElementById('fenetreERIPTitre');
    if (titreEl) { titreEl.innerHTML = config.titre; }
  }
  var corps = overlay.querySelector('.fenetre-erip-corps');
  if (corps) { corps.innerHTML = (config && config.contenuHTML) || ''; }

  // Meme logique de focus initial que ouvrirFenetreERIP() : le premier
  // element interactif du nouveau contenu, a defaut la boite elle-meme.
  var boite = overlay.querySelector('.fenetre-erip-boite');
  var premierFocusable = overlay.querySelector(selecteurElementsFocalisablesERIP('.fenetre-erip-corps'));
  (premierFocusable || boite).focus();
}

function ouvrirFenetreERIP(config) {
  // TACHE (Design System, evolution de la primitive) : annule tout minuteur
  // de fermeture EN ATTENTE d'une fenetre precedente, avant toute autre
  // chose. Sans ce correctif, un appelant qui ferme une fenetre puis en
  // rouvre une autre dans la foulee (schema tres frequent : boutons
  // "Retour", branches "Non", enchainements de choix -- voir
  // ouvrirPanneauGuide() et ses appelants) laissait la restitution de focus
  // DIFFEREE de l'ancienne fermeture se declencher ~200ms plus tard,
  // volant silencieusement le focus a la fenetre qui vient tout juste de
  // s'ouvrir. Correctif entierement generique : beneficie a TOUTE
  // succession fermeture->ouverture rapprochee, quel que soit l'appelant --
  // ce n'est pas un comportement specifique a une fenetre en particulier,
  // et les fenetres deja migrees en beneficient automatiquement, sans
  // aucune modification de leur part.
  if (_minuteurFermetureFenetreERIP) {
    clearTimeout(_minuteurFermetureFenetreERIP);
    _minuteurFermetureFenetreERIP = null;
  }
  // Regle absolue : une seule fenetre ERIP ouverte a la fois -- en ouvrir
  // une ferme immediatement toute fenetre ERIP deja presente, sans
  // attendre son animation de fermeture (fermeture immediate, pas
  // temporisee, pour ne jamais laisser deux fenetres coexister meme
  // brievement).
  var fenetreExistante = document.getElementById('fenetreERIP');
  if (fenetreExistante) {
    document.removeEventListener('keydown', fenetreExistante._surToucheFenetreERIP);
    fenetreExistante.remove();
  }

  var elementDeclencheur = document.activeElement;
  var taille = config.taille || 'standard';
  var classeTaille = taille === 'large' ? ' fenetre-erip-boite-large' :
    taille === 'tresLarge' ? ' fenetre-erip-boite-tres-large' : '';
  var idTitre = 'fenetreERIPTitre';

  var overlay = document.createElement('div');
  overlay.id = 'fenetreERIP';
  overlay.className = 'fenetre-erip-overlay';
  overlay.innerHTML =
    '<div class="fenetre-erip-boite' + classeTaille + '" role="dialog" aria-modal="true" ' +
      'aria-labelledby="' + idTitre + '" tabindex="-1">' +
      '<div class="fenetre-erip-entete">' +
        '<h5 class="fenetre-erip-titre" id="' + idTitre + '">' + config.titre + '</h5>' +
        '<button type="button" class="fenetre-erip-fermer" id="fenetreERIPFermerBtn" ' +
          'aria-label="Fermer" title="Fermer">&#10005;</button>' +
      '</div>' +
      '<div class="fenetre-erip-corps">' + config.contenuHTML + '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay._elementDeclencheurFenetreERIP = elementDeclencheur;

  overlay.addEventListener('click', function (e) { if (e.target === overlay) { fermerFenetreERIP(); } });
  document.getElementById('fenetreERIPFermerBtn').addEventListener('click', fermerFenetreERIP);

  // Echap ferme la fenetre ; Tab reste confine a l'interieur (piege de
  // focus) tant qu'elle est ouverte -- ecouteur retire explicitement a la
  // fermeture (voir fermerFenetreERIP()), jamais laisse actif en arriere-plan.
  function surToucheFenetreERIP(e) {
    if (e.key === 'Escape') { fermerFenetreERIP(); return; }
    if (e.key !== 'Tab') { return; }
    var elementsFocusables = overlay.querySelectorAll(selecteurElementsFocalisablesERIP());
    if (!elementsFocusables.length) { return; }
    var premier = elementsFocusables[0];
    var dernier = elementsFocusables[elementsFocusables.length - 1];
    if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
  }
  overlay._surToucheFenetreERIP = surToucheFenetreERIP;
  document.addEventListener('keydown', surToucheFenetreERIP);

  requestAnimationFrame(function () { overlay.classList.add('visible'); });

  // Focus initial : le premier element interactif du CONTENU (pas le
  // bouton croix de l'en-tete) -- une fenetre avec un formulaire place
  // ainsi le focus directement dans son premier champ ; a defaut, la
  // boite elle-meme recoit le focus (tabindex="-1" prevu a cet effet).
  var boite = overlay.querySelector('.fenetre-erip-boite');
  var premierFocusable = overlay.querySelector(selecteurElementsFocalisablesERIP('.fenetre-erip-corps'));
  (premierFocusable || boite).focus();

  return overlay;
}

// TACHE 42 : petite fenetre d'information, accueil uniquement.
// TACHE (migration Design System, chantier "Fenetre ERIP", 1ere migration) :
// devient une simple RECETTE qui appelle la primitive ouvrirFenetreERIP()
// ci-dessus -- ne construit plus son propre overlay. C'est cette fenetre
// qui avait introduit l'animation d'ouverture/fermeture, desormais
// generalisee a toutes les fenetres ERIP par la primitive elle-meme.
function fermerModaleConfidentialite() {
  fermerFenetreERIP();
}

function ouvrirModaleConfidentialite() {
  ouvrirFenetreERIP({
    titre: '&#128737;&#65039; Confidentialité de vos données',
    contenuHTML:
      '<p>Les informations que vous renseignez sont utilisées uniquement pour personnaliser votre accompagnement.</p>' +
      '<p>Elles permettent notamment de générer un CV, une lettre de motivation ou de préparer un entretien avec l’assistant IA.</p>' +
      '<p>Vos informations restent disponibles tant que cette page reste ouverte.</p>' +
      '<p>Elles ne sont pas enregistrées de manière permanente par l’application et disparaissent lorsque vous fermez ou rechargez la page.</p>' +
      '<p>L’identité (nom, prénom, adresse, téléphone, e-mail) n’est jamais transmise à l’assistant IA lors de la génération du CV, de la lettre ou de la préparation d’entretien.</p>' +
      '<p>En revanche, si vous déposez un CV ou un autre document existant, son contenu est transmis tel quel à l’assistant IA que vous choisissez : aucune anonymisation automatique n’est effectuée (elle s’est avérée impossible à fiabiliser). Des outils vous permettent de masquer vous-même les informations sensibles (texte à corriger, ou rectangles noirs sur une image) avant l’envoi — pensez à les utiliser.</p>' +
      '<p>&#128373;&#65039; Pour une navigation sans trace, ouvrez d’abord une fenêtre privée ' +
      '(Ctrl+Maj+N sur Chrome/Edge, Ctrl+Maj+P sur Firefox), puis revenez sur cette page.</p>' +
      '<div class="text-end"><button type="button" class="btn btn-primary btn-sm" id="fermerConfidBtn2">Fermer</button></div>'
  });
  var btnFermer2 = document.getElementById('fermerConfidBtn2');
  if (btnFermer2) { btnFermer2.addEventListener('click', fermerFenetreERIP); }
}


function pageChoixCV() {
  // Page d'accueil : PAS de bouton Accueil (on y est deja)
  app.innerHTML =
    afficherProgression('cv') +
    '<div class="text-center"><h1>&#128075; Commençons par votre CV</h1>' +
    '<p class="sousTitre">Choisissez votre point de départ.</p></div>' +
    '<div class="objectifs objectifs-accueil">' +
      '<div class="carte' + classeMemoriseSi(dossier.modeCreation, 'nouveau') + '" data-action="mode" data-value="nouveau"><i class="bi bi-stars"></i>' +
        '<h3>Créer un nouveau CV</h3><p>L’assistant m’accompagne pas à pas.</p></div>' +
      '<div class="carte' + classeMemoriseSi(dossier.modeCreation, 'pret') + '" data-action="mode" data-value="pret"><i class="bi bi-file-earmark-check"></i>' +
        '<h3>J’ai déjà un CV</h3><p>Je dépose mon CV, il est déjà complet.</p></div>' +
      '<div class="carte' + classeMemoriseSi(dossier.modeCreation, 'maj') + '" data-action="mode" data-value="maj"><i class="bi bi-pencil-square"></i>' +
        '<h3>Mettre mon CV à jour</h3><p>Je dépose mon CV et je le complète.</p></div>' +
    '</div>' +
    // TACHE (mise en page accueil) : Ateliers ERIP (gauche) et Preparer un
    // entretien (droite), remontees legerement, sans toucher les 3 cartes
    // principales ni se chevaucher entre elles.
    '<div class="zone-ateliers-entretien">' +
      '<a href="https://www.linscription.com/pro/catalogue-missionlocale-r.php?P1=11241&P2=411" ' +
        'target="_blank" rel="noopener" class="carte carte-erip"><i class="bi bi-mortarboard"></i>' +
        '<h3>Ateliers &amp; visites d’entreprise</h3>' +
        '<p>Découvrez gratuitement les ateliers thématiques et les visites d’entreprise proposés par l’ERIP du Bergeracois.</p>' +
        '<p class="carte-erip-action">&#128073; Voir les prochaines dates &#8599;</p>' +
      '</a>' +
      '<div class="carte carte-entretien-direct" id="btnPreparationAccueil"><i class="bi bi-briefcase"></i>' +
        '<h3>Boîte à outils</h3>' +
        '<p>Préparez un entretien ou co-construisez votre lettre de motivation avec l’assistant IA.</p>' +
      '</div>' +
    '</div>' +
    // TACHE 33A : Explorateur de la Base de connaissances ERIP — grand rectangle
    // horizontal centre entre les deux cartes ci-dessus (n'est plus une carte).
    '<div class="zone-recherche-erip-large">' +
      '<input type="text" class="form-control" id="rechercheERIPInput" ' +
      'placeholder="&#128269; Rechercher un métier, un domaine d’activité, une compétence...">' +
      '<div id="resultatsRechercheERIP" class="resultats-erip-dropdown"></div>' +
    '</div>' +
    '<div id="overlayRechercheERIP" class="overlay-recherche-erip"></div>' +
    // TACHE 42 : information de confidentialite, uniquement sur l'ecran d'accueil.
    '<button type="button" id="btnConfidentialite" class="lien-confidentialite">&#128737;&#65039; Confidentialité de vos données</button>';
  // les clics sur "Mettre a jour" et "J'ai deja un CV" sont interceptes par metiers.js
  // (fenetre de depot). Seul "Creer un nouveau CV" est gere ici.
  document.querySelectorAll('[data-action="mode"]').forEach(function (el) {
    el.addEventListener('click', function () {
      // TACHE (bouton Restaurer limite a l'accueil) : le clic sur une des 3
      // cartes constitue l'engagement, qu'il s'agisse de "nouveau" (gere
      // ici) ou de "pret"/"maj" (interceptes par metiers.js) -- efface tout
      // de suite, avant meme que la navigation n'ait lieu.
      effacerSauvegarde();
      if (this.dataset.value === 'nouveau') {
        dossier.modeCreation = 'nouveau';
        // TACHE (retour utilisateur : "Créer un CV" après une tentative
        // "Mettre à jour mon CV" saute Mon Projet directement) : meme
        // reinitialisation qu'au choix "Non" du panneau guide "Avez-vous
        // un CV ?" (voir commentaire la-bas) -- second point d'entree vers
        // modeCreation = 'nouveau', meme risque de cvAnalyse residuel.
        dossier.cvAnalyse = false;
        dossier.competencesCV = undefined;
        dossier.savoirsCV = undefined;
        naviguerVers('objectif');
      }
    });
  });
  document.getElementById('btnConfidentialite').addEventListener('click', ouvrirModaleConfidentialite);

  // TACHE (retour utilisateur : icone mallette unique) : remplace l'ancienne
  // carte "Preparer un entretien" ET le bouton crayon separe -- un seul clic
  // ouvre desormais un choix entre les deux parcours (ouvrirChoixPreparationAccueil,
  // metiers.js), qui appelle lui-meme ouvrirParcoursEntretien() ou
  // ouvrirDepotLettreV1() selon le choix de la personne.
  var btnPreparationAccueil = document.getElementById('btnPreparationAccueil');
  if (btnPreparationAccueil) {
    btnPreparationAccueil.addEventListener('click', function () {
      // TACHE (bouton Restaurer limite a l'accueil) : ouvrir la Boite a
      // outils (parcours autonome Lettre/Entretien) est aussi un
      // engagement, meme sans passer par le CV.
      effacerSauvegarde();
      if (typeof ouvrirChoixPreparationAccueil === 'function') { ouvrirChoixPreparationAccueil(); }
    });
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
      var carteDomaine = e.target.closest('[data-domaine-nom]');
      // TACHE (bouton Restaurer limite a l'accueil) : cliquer sur un
      // resultat de recherche (metier, competence, champ associe, ou
      // domaine d'activite) est aussi un engagement dans un parcours, meme
      // si la page reste 'cv' (ces panneaux s'ouvrent en surimpression,
      // sans naviguerVers()).
      if (carteMetier || carteCompetence || carteChamp || carteDomaine) { effacerSauvegarde(); }
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
      } else if (carteDomaine) {
        if (inputRechercheERIP) { inputRechercheERIP.value = ''; }
        rendreResultatsRechercheERIP('');
        ouvrirPanneauMetiersAssociesDomaine(carteDomaine.dataset.domaineNom);
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
    { id: 'offre', icon: 'bi-file-earmark-text', title: 'Répondre à une offre', desc: 'Adapter votre CV à une offre.' },
    { id: 'spontanee', icon: 'bi-building', title: 'Candidature spontanée', desc: 'Créer un CV pour une entreprise.' },
    { id: 'reconversion', icon: 'bi-arrow-repeat', title: 'Changer de métier', desc: 'Valoriser vos compétences.' },
    { id: 'stage', icon: 'bi-mortarboard', title: 'Stage', desc: 'CV adapté à une recherche de stage.' },
    { id: 'alternance', icon: 'bi-people', title: 'Alternance', desc: 'CV adapté à une alternance.' },
    { id: 'pmsmp', icon: 'bi-search', title: 'PMSMP (immersion)', desc: 'Préparer une période d’immersion en entreprise.' }
  ];
  var html = afficherProgression('objectif') +
    '<div class="text-center"><h1>&#127919; Quel est votre objectif ?</h1>' +
    '<p class="sousTitre">Nous adapterons votre CV à votre projet.</p></div><div class="objectifs">';
  items.forEach(function (o) {
    html += '<div class="carte' + classeMemoriseSi(dossier.objectif, o.id) + '" data-action="objectif" data-value="' + o.id + '">' +
      '<i class="bi ' + o.icon + '"></i><h3>' + o.title + '</h3><p>' + o.desc + '</p></div>';
  });
  html += '</div>' + barreNavigation('cv', null);
  app.innerHTML = html;
  document.querySelectorAll('[data-action="objectif"]').forEach(function (el) {
    el.addEventListener('click', function () {
      var nouvelObjectif = this.dataset.value;
      // TACHE (retour utilisateur : informations qui s'interferent en
      // changeant d'objectif) : modeRecherche/typeRecherche/
      // rechercheCandidature n'ont aucun sens pour stage/alternance/pmsmp
      // (question jamais posee pour ces 3 objectifs, voir
      // CONFIG_BLOC_CANDIDATURE) -- sans ce nettoyage, un choix fait plus
      // tot pour offre/spontanee/reconversion restait affiche dans le
      // resume du bloc Candidature meme apres avoir change d'objectif.
      if (nouvelObjectif === 'stage' || nouvelObjectif === 'alternance' || nouvelObjectif === 'pmsmp') {
        dossier.modeRecherche = null;
        dossier.typeRecherche = null;
        dossier.rechercheCandidature = { entreprise: '', lienOffre: '' };
      }
      dossier.objectif = nouvelObjectif;
      // TACHE (retour utilisateur : "mettre a jour mon CV" ne doit plus
      // sauter directement a Potentiel) : apres un CV analyse, on atterrit
      // desormais sur "Mon projet" -- une bonne partie des informations y
      // sont deja enregistrees/pre-remplies (import du CV), la personne peut
      // les ajuster, choisir metier/domaine dans le bloc Candidature comme
      // n'importe quel autre parcours, puis avancer normalement vers
      // Potentiel via le meme bouton "Reveler mon potentiel" que tout le
      // monde -- plus de cas particulier a gerer sur Potentiel lui-meme.
      naviguerVers(dossier.cvAnalyse ? 'projet' : 'activites');
    });
  });
}

// Fabrique une page a cartes multi-selection (activites, actions, environnement, valeurs)
function pageCartes(config) {
  var selected = dossier[config.champ] || [];
  var limiteAtteinte = config.max && selected.length >= config.max;
  var boutonEffacer = selected.length
    ? '<div class="text-center mb-3"><button class="btn btn-outline-danger btn-effacer" data-effacer="' + config.champ + '">&#10227; Tout désélectionner</button></div>'
    : '';
  var messageLimite = limiteAtteinte
    ? '<div class="message-limite">&#9888;&#65039; Vous avez atteint le maximum de ' + config.max + ' choix. Désélectionnez-en un pour en choisir un autre.</div>'
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
    sousTitre: 'Choisissez ce qui correspond le mieux à vos expériences.',
    catalogue: CATALOGUE_PERSONNES_MATERIELS_LIEUX, limite: 9,
    titreSelection: 'Vos principaux environnements', iconeSelection: '&#11088;',
    placeholderRecherche: '&#128269; Rechercher une personne, un matériel ou un lieu...',
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
  var zoneSelection = '<div class="cv-section cv-section-compact mt-3"><h4>' + config.iconeSelection + ' ' + config.titreSelection + '</h4>' +
    '<p class="compteur-actions">' + selectedIds.length + ' / ' + config.limite + '</p>' +
    '<div class="grille-selection-compacte">' +
    (itemsSelectionnes.length
      ? itemsSelectionnes.map(carteSelectionneeHTML).join('')
      : '<p class="text-muted text-center w-100 mb-0">Aucune sélection pour le moment.</p>') +
    '</div>' +
    (selectedIds.length
      ? '<div class="text-center mt-2"><button type="button" class="btn btn-outline-danger btn-effacer-selection">&#10227; Tout désélectionner</button></div>'
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
      : '<p class="text-muted text-center w-100">Aucun élément disponible' + (rechercheNormalisee ? ' pour cette recherche' : ' dans cette catégorie') + '.</p>') +
    '</div>';

  var messageLimite = limiteAtteinte
    ? '<div class="message-limite">&#9888;&#65039; Vous avez atteint le maximum de ' + config.limite +
      ' selections. Désélectionnez-en une pour en choisir une autre.</div>'
    : '';

  var html = afficherProgression(config.etape) +
    '<div class="text-center"><h1>' + config.titre + '</h1><p class="sousTitre">' + config.sousTitre + '</p></div>' +
    afficherCompetencesDetectees(config.etape) +
    zoneSelection +
    '<div class="cv-section cv-section-compact mt-3"><h4>&#128218; Catalogue</h4>' +
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

  wireAccordeon(function () { pageSelectionCatalogue(config); });

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
    sousTitre: 'Choisissez les actions que vous réalisiez régulièrement.',
    catalogue: CATALOGUE_ACTIONS_PRO, limite: LIMITE_ACTIONS,
    titreSelection: 'Vos actions sélectionnées', iconeSelection: '&#9989;',
    placeholderRecherche: '&#128269; Rechercher une action...',
    precedent: 'activites', suivant: 'environnement', labelSuivant: null
  });
}

function pageEnvironnement() {
  pageSelectionCatalogue({
    champ: 'environnement', etape: 'environnement',
    titre: '&#127757; Dans quel environnement travailliez-vous le plus souvent ?',
    sousTitre: 'Choisissez les environnements qui correspondent le mieux à vos expériences.',
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
  return '<div class="bloc-preferences"><h5>&#127919; J’accepte également</h5>' + contenuAccepte() + '</div>';
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
    titre: '&#10084;&#65039; Qu’est-ce qui est important pour vous dans un travail ?',
    sousTitre: 'Choisissez ce qui compte le plus pour vous.',
    catalogue: CATALOGUE_VALEURS_PROFESSIONNELLES, limite: 5,
    titreSelection: 'Vos priorités', iconeSelection: '&#11088;',
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
  var aDiplome = dossier.formations.length > 0;
  if (aExperience && !aDiplome) {
    return '<div class="message-vae-accordeon">' +
      blocAccordeon('vae', '&#128161; Vous avez de l’expérience sans diplôme correspondant ?', '',
        '<p class="mb-0">Cette expérience, même auprès de proches ou de la famille, peut être reconnue par une ' +
        '<strong>VAE</strong> (Validation des Acquis de l’Expérience). ' +
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
// ============================================================
// TACHE (refonte Candidature/Potentiel, Etape 1 -- migration progressive) :
// nouvelle sous-section "Comment souhaitez-vous rechercher un emploi ?",
// point d'entree unique de dossier.modeRecherche / dossier.typeRecherche /
// dossier.rechercheCandidature (voir commentaire a leur declaration, debut
// de fichier). Ne lit ni ne modifie dossier.objectif ni typeCV.
// A l'Etape 2, la page Potentiel lira dossier.modeRecherche pour adapter son
// affichage ; a l'Etape 3, l'ancien choix "Ce metier"/"Secteur(s)" sur
// Potentiel sera retire, une fois la nouvelle logique validee en conditions
// reelles.
// ============================================================
function contenuModeRecherche() {
  var mode = dossier.modeRecherche;
  var type = dossier.typeRecherche;

  // TACHE (retour utilisateur : chaque bouton avec son propre texte
  // explicatif) : 2 colonnes independantes (bouton + exemple juste en
  // dessous), plutot qu'une seule phrase partagee en bas qui ne rattachait
  // visuellement l'exemple a aucun des deux boutons.
  var html = '<div class="pastilles-mode-recherche mb-2">' +
    '<div class="pastille-mode-recherche-colonne">' +
    '<span class="pastille' + (mode === 'metier' ? ' actif' : '') + '" data-mode-recherche="metier">Un métier précis</span>' +
    '<p class="text-muted small mb-0 mt-2">Exemple : boulanger, secrétaire, plombier...</p>' +
    '</div>' +
    '<div class="pastille-mode-recherche-colonne">' +
    '<span class="pastille' + (mode === 'domaine' ? ' actif' : '') + '" data-mode-recherche="domaine">Plusieurs métiers d’un même domaine</span>' +
    '<p class="text-muted small mb-0 mt-2">Exemple : commerce, bâtiment, logistique...</p>' +
    '</div>' +
    '</div>';

  if (mode === 'metier') {
    // TACHE (retour utilisateur : uniformiser l'interaction, pas de radios) :
    // meme composant "pastille" que "Type de contrat recherché" / "Quel est
    // le niveau de votre diplôme ?" (contenuFormations()) -- choix unique,
    // pastille bleue a l'etat actif. Les grandes cartes .carte restent
    // reservees au choix principal ci-dessus (metier/domaine) ; ce
    // sous-choix, plus secondaire, reprend le langage "pastille" deja etabli
    // pour ce type de question dans le reste de l'appli.
    html += '<hr class="my-3">' +
      '<p class="mb-2">Votre recherche concerne :</p>' +
      '<div class="pastilles mb-2">' +
      '<span class="pastille' + (type === 'simple' ? ' actif' : '') + '" data-type-recherche="simple">Je cherche simplement un emploi</span>' +
      '<span class="pastille' + (type === 'offre' ? ' actif' : '') + '" data-type-recherche="offre">Je réponds à une offre d’emploi</span>' +
      '</div>';

    if (type === 'offre') {
      // TACHE (retour utilisateur : eviter une incoherence metier/entreprise) :
      // le nom de l'entreprise n'est PLUS demande ici -- le metier n'est
      // choisi qu'ensuite, sur Potentiel. Le demander ici risquait un
      // decalage (ex. une entreprise du sport indiquee ici, un metier du
      // BTP choisi ensuite). La question est desormais posee au moment de
      // "Passer a l'action" (voir verifierAvantPasserAction()), une fois le
      // metier fixe -- reutilise dossier.rechercheCandidature, meme champ.
      html += '<p class="text-muted small mb-0">Vous indiquerez les coordonnées de l’entreprise un peu plus loin, ' +
        'une fois votre métier choisi sur la page suivante.</p>';
    }
  }
  return '<div id="zoneModeRecherche">' + html + '</div>';
}

function modeRechercheRempli() {
  if (!dossier.modeRecherche) { return false; }
  if (dossier.modeRecherche === 'domaine') { return true; }
  return !!dossier.typeRecherche;
}

// TACHE (retour utilisateur : garde-fou avant remplacement) : vrai s'il
// existe deja quelque chose qu'un changement de mode ferait perdre --
// exactement ce que viderMetiersCandidats() efface. Sert a decider si une
// confirmation est necessaire avant de changer de mode.
function existeSelectionMetierOuDomaine() {
  return !!(dossier.metiersCandidats.length || dossier.metiersHorsRepertoire.length ||
    dossier.metierCible || dossier.secteurCible);
}

// TACHE (retour utilisateur : message de confirmation plus rassurant, avec
// la selection concernee) : libelle lisible de ce qui serait remplace --
// priorite a la cible deja validee (metierCible/secteurCible), sinon les
// candidats pas encore finalises (recherche en cours).
function libelleSelectionMetierOuDomaine() {
  if (dossier.metierCible) { return dossier.metierCible; }
  if (dossier.secteurCible) { return dossier.secteurCible; }
  var tousCandidats = dossier.metiersCandidats.concat(dossier.metiersHorsRepertoire);
  if (tousCandidats.length) { return tousCandidats.join(', '); }
  return '';
}

function wireModeRecherche(rerender) {
  var zone = document.getElementById('zoneModeRecherche');
  if (zone) { activerChampsStandardises(zone); }

  document.querySelectorAll('[data-mode-recherche]').forEach(function (el) {
    el.addEventListener('click', function () {
      var nouveauMode = this.dataset.modeRecherche;
      if (nouveauMode === dossier.modeRecherche) {
        // TACHE (retour utilisateur : bouton "Changer de mode de recherche") :
        // re-cliquer sur le mode DEJA actif referme simplement ce repli
        // (rien a changer) -- equivalent au bouton Annuler.
        etatAfficherChoixModeRecherche = false;
        rerender();
        return;
      }

      function appliquerChangementMode() {
        // TACHE (retour utilisateur : jamais de metier ET de domaine cibles
        // en meme temps) : reutilise viderMetiersCandidats() (deja utilisee
        // par le bouton "Tout effacer" de la banniere Potentiel), aucune
        // nouvelle regle de decision ecrite.
        viderMetiersCandidats();
        dossier.modeRecherche = nouveauMode;
        // TACHE (coherence) : "domaine" n'a pas de sous-question -- on
        // efface typeRecherche pour ne pas garder une reponse sans objet.
        if (nouveauMode === 'domaine') {
          dossier.typeRecherche = null;
          // TACHE (retour utilisateur : question systematique en mode
          // metier) : "domaine" n'a rien de plus a demander -- referme
          // immediatement ce repli. "Metier", lui, a encore la sous-question
          // "Votre recherche concerne" a poser : NE PAS refermer tout de
          // suite (voir data-type-recherche plus bas, qui refermera lui-meme
          // une fois cette sous-question repondue).
          etatAfficherChoixModeRecherche = false;
        }
        rerender();
      }

      // TACHE (retour utilisateur : garde-fou avant remplacement) : si une
      // selection metier/domaine existe deja, on demande confirmation avant
      // de l'ecraser (reutilise confirmerAction(), deja utilisee ailleurs
      // dans l'appli -- ex. reinitialiserSession()) ; sinon, changement
      // immediat comme avant (rien a perdre).
      if (existeSelectionMetierOuDomaine()) {
        var libelle = libelleSelectionMetierOuDomaine();
        var texteConfirmation = 'Vous avez déjà commencé cette recherche' +
          (libelle ? ' : « ' + echapperAttribut(libelle) + ' »' : '') +
          '.<br>Si vous changez de mode, votre sélection actuelle sera remplacée.<br>Souhaitez-vous continuer ?';
        confirmerAction(
          'Changer de type de recherche ?',
          texteConfirmation,
          'Continuer', 'btn-primary',
          appliquerChangementMode
        );
      } else {
        appliquerChangementMode();
      }
    });
  });
  document.querySelectorAll('[data-type-recherche]').forEach(function (el) {
    el.addEventListener('click', function () {
      var nouveauType = this.dataset.typeRecherche;
      // TACHE (retour utilisateur : question systematique en mode metier) :
      // repondre a cette sous-question (meme en reconfirmant la reponse deja
      // en place) referme le repli "changer de mode" -- c'est cette reponse
      // qui le clot, pas le choix du mode seul (voir appliquerChangementMode()
      // ci-dessus, qui laisse volontairement ce repli ouvert pour le mode
      // "metier" tant que cette question n'a pas ete traitee).
      if (nouveauType === dossier.typeRecherche) {
        etatAfficherChoixModeRecherche = false;
        rerender();
        return;
      }
      dossier.typeRecherche = nouveauType;
      // TACHE (retour utilisateur : eviter les fausses informations) : en
      // repassant a "recherche simple", les informations d'entreprise/lien
      // saisies pour "je reponds a une offre" n'ont plus lieu d'etre --
      // effacees pour ne pas laisser une information perimee associee au
      // metier, potentiellement transmise a l'IA a tort.
      if (nouveauType !== 'offre') {
        dossier.rechercheCandidature = { entreprise: '', lienOffre: '' };
      }
      etatAfficherChoixModeRecherche = false;
      rerender();
    });
  });
}

function contenuCandidature() {
  var o = dossier.objectif;
  if (o === 'offre' || o === 'spontanee' || o === 'reconversion') {
    var of = dossier[o];
    if (!Array.isArray(of.dispo)) { of.dispo = []; }
    of.type = GROUPE_CANDIDATURE.noms[o];
    var intro, labelLien, labelStructure, labelPoste;
    if (o === 'offre') {
      intro = 'Deux possibilités : collez le lien de l’offre, ou bien indiquez l’entreprise et le poste. ' +
        'Ces informations permettront à l’IA de se renseigner sur l’entreprise et d’adapter votre CV, votre lettre et votre entretien.';
      labelLien = 'Lien de l’offre (internet)';
      labelStructure = 'Nom de l’entreprise';
      labelPoste = 'Poste visé';
    } else if (o === 'spontanee') {
      intro = 'Candidature spontanée : indiquez l’entreprise et le poste souhaité. Le lien d’offre est facultatif. ' +
        'Ces informations personnaliseront votre CV, votre lettre et votre entretien.';
      labelLien = 'Lien d’une offre (facultatif)';
      labelStructure = 'Nom de l’entreprise';
      labelPoste = 'Poste souhaité';
    } else {
      intro = 'Changement de métier : indiquez le métier visé, et éventuellement une entreprise cible. ' +
        'Ces informations aideront l’IA à adapter les compétences mises en avant, votre CV, votre lettre et votre entretien.';
      labelLien = 'Adresse internet (facultatif)';
      labelStructure = 'Entreprise cible (facultatif)';
      labelPoste = 'Métier visé';
    }
    var champLien = '<div class="mb-3"><label class="form-label small">' + labelLien + '</label>' +
      '<input type="url" class="form-control form-control-sm" id="offreLien" placeholder="https://..." value="' + (of.lien || '') + '"></div>';
    var boutonImportCand = autresSectionsG(GROUPE_CANDIDATURE, o)
      ? '<div class="text-end mb-2"><button class="btn btn-sm btn-outline-primary" id="importDetails">&#128229; Importer des informations</button></div>'
      : '';
    return '<div id="zoneCandidatureChamps">' + boutonImportCand +
      '<p class="mb-2">' + intro + '</p>' +
      champLien +
      '<div class="row g-2">' +
      '<div class="col-md-6"><input type="text" class="form-control form-control-sm" id="offreStructure" placeholder="' + labelStructure + '" value="' + (of.structure || '') + '"></div>' +
      '<div class="col-md-6"><input type="text" class="form-control form-control-sm" id="offrePoste" placeholder="' + labelPoste + '" value="' + (of.poste || '') + '"></div>' +
      '</div></div>';
  }
  if (o === 'stage' || o === 'alternance' || o === 'pmsmp') {
    var im = dossier[CLE_DETAILS[o]];
    im.type = NOM_SECTION[o];
    var boutonImport = autresSectionsRenseignees(o)
      ? '<div class="text-end mb-2"><button class="btn btn-sm btn-outline-primary" id="importDetails">&#128229; Importer des informations</button></div>'
      : '';
    // TACHE (retour utilisateur : doublon avec Potentiel) : le champ "Poste
    // visé" a ete retire -- le metier vise pour stage/alternance/immersion
    // se choisit desormais sur Potentiel (mono-selection automatique, voir
    // modeRechercheEffectif()), cette zone ne garde que ce qui lui est propre
    // (structure, lien, duree, dates, heures).
    // TACHE (retour utilisateur : retour au texte libre simple) : plus de
    // widget (calendrier natif, menus Mois/Annee, quantite+unite) -- retour
    // a de simples champs texte avec un exemple de format en placeholder.
    // Seule Structure reste obligatoire pour acceder a Potentiel (voir
    // etatAccesRevelation()) ; Duree/Dates/Heures sont toutes facultatives.
    return '<div id="zoneCandidatureChamps">' + boutonImport +
      '<p class="mb-2">Si vous connaissez déjà ces informations, renseignez-les : elles seront transmises à l’IA.</p>' +
      '<div class="mb-3"><label class="form-label small">Adresse internet (facultatif)</label>' +
      '<input type="url" class="form-control form-control-sm" id="immLien" placeholder="https://..." value="' + (im.lien || '') + '"></div>' +
      '<div class="row g-2"><div class="col-md-12"><label class="form-label small">Nom de la structure</label>' +
      '<input type="text" class="form-control form-control-sm" id="immStructure" placeholder="Ex : Boulangerie Martin" value="' + (im.structure || '') + '"></div></div>' +
      '<div class="row g-2 mt-2">' +
      '<div class="col-md-4"><label class="form-label small">Durée (facultatif)</label>' +
      '<input type="text" class="form-control form-control-sm" id="immDuree" placeholder="Ex : 2 mois" value="' + (im.duree || '') + '"></div>' +
      '<div class="col-md-4"><label class="form-label small">Dates (facultatif)</label>' +
      '<input type="text" class="form-control form-control-sm" id="immDates" placeholder="Ex : Octobre 2027 à Mars 2028" value="' + (im.dates || '') + '"></div>' +
      '<div class="col-md-4"><label class="form-label small">Heures / semaine (facultatif)</label>' +
      '<input type="text" class="form-control form-control-sm" id="immHeures" placeholder="Ex : 35h" value="' + (im.heures || '') + '"></div>' +
      '</div></div>';
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
  // TACHE (retour utilisateur : bouton Valider desactive sans info) : le
  // lien seul est deja presente comme une alternative valable ("Deux
  // possibilites : collez le lien de l'offre, ou bien indiquez l'entreprise
  // et le poste") -- la verification doit refleter cette meme regle
  // partout, pas seulement dans le texte d'introduction.
  if (o === 'offre' || o === 'spontanee') {
    var c = dossier[o];
    return !!(c && (c.lien || (c.structure && c.poste)));
  }
  if (o === 'reconversion') {
    var r = dossier.reconversion;
    return !!(r && (r.lien || r.poste));
  }
  if (o === 'stage' || o === 'alternance' || o === 'pmsmp') {
    var im = dossier[CLE_DETAILS[o]];
    return !!(im && (im.lien || im.structure));
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

function wireObjectifDetails(rerender) {
  // TACHE (retour utilisateur : bandeau Candidature) : cablee AVANT la
  // synchronisation vers dossier ci-dessous (meme raison que pour
  // l'identite : la majuscule doit etre appliquee avant la lecture de la
  // valeur). L'adresse internet (type="url") n'est jamais mise en majuscule.
  var zoneCandidature = document.getElementById('zoneCandidatureChamps');
  if (zoneCandidature) { activerChampsStandardises(zoneCandidature); }
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
    // TACHE (retour utilisateur : bouton reste bloque apres saisie) : la
    // structure est le seul champ qui conditionne l'acces a Potentiel pour
    // ce parcours (voir etatAccesRevelation()) -- mise a jour du bouton en
    // direct a chaque frappe, en plus de la liaison ci-dessus.
    var champImmStructure = document.getElementById('immStructure');
    if (champImmStructure) { champImmStructure.addEventListener('input', majEtatBoutonRevelation); }
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
  dossier.identite = dossier.identite || { civilite: null, nom: '', prenom: '', adresse: '', codePostal: '', telephone: '', email: '', ville: '' };
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
  // TACHE (retour utilisateur : generalisation "champs standardises") :
  // reutilise activerChampsStandardises(), deja construite pour la page
  // Action -- majuscule automatique + Entree = champ suivant. Scope a
  // #zoneIdentiteChamps (pas tout le document) pour ne pas interferer avec
  // d'autres champs ouverts simultanement ailleurs sur "Mon Projet". Cablee
  // AVANT la synchronisation vers dossier.identite juste en dessous, pour
  // que cette derniere lise bien la valeur deja mise en majuscule.
  var zoneIdentite = document.getElementById('zoneIdentiteChamps');
  if (zoneIdentite) { activerChampsStandardises(zoneIdentite); }
  var champs = { identiteNom: 'nom', identitePrenom: 'prenom', identiteAdresse: 'adresse', identiteCodePostal: 'codePostal', identiteTelephone: 'telephone', identiteEmail: 'email', identiteVille: 'ville' };
  Object.keys(champs).forEach(function (idChamp) {
    var el = document.getElementById(idChamp);
    if (el) { el.addEventListener('input', function () { dossier.identite[champs[idChamp]] = this.value; }); }
  });

  // TACHE (photo optionnelle) : upload -> redimensionnement cote client
  // (evite un base64 demesure, ralentirait l'app et alourdirait le .docx
  // pour rien -- une photo de CV n'a jamais besoin d'etre en haute
  // definition) -> stockage dans dossier.photo.url. Case "inclure" separee
  // du simple fait d'avoir televerse une photo (jamais d'inclusion
  // automatique, voir contenuIdentite()).
  var inputPhoto = document.getElementById('inputPhotoIdentite');
  if (inputPhoto) {
    inputPhoto.addEventListener('change', function () {
      var fichier = this.files && this.files[0];
      if (!fichier) { return; }
      if (!fichier.type || fichier.type.indexOf('image/') !== 0) { alert('Merci de choisir un fichier image (JPG, PNG...).'); return; }
      var lecteur = new FileReader();
      lecteur.onload = function (evenement) {
        var img = new Image();
        img.onload = function () {
          // Redimensionne au carre (400x400 max), recadre au centre --
          // suffisant pour un CV, garde un fichier leger.
          var taille = 400;
          var canvas = document.createElement('canvas');
          canvas.width = taille; canvas.height = taille;
          var ctx = canvas.getContext('2d');
          var cote = Math.min(img.width, img.height);
          var sx = (img.width - cote) / 2, sy = (img.height - cote) / 2;
          ctx.drawImage(img, sx, sy, cote, cote, 0, 0, taille, taille);
          dossier.photo = { url: canvas.toDataURL('image/jpeg', 0.85), inclure: true };
          rerender();
        };
        img.onerror = function () { alert('Impossible de lire cette image, essayez-en une autre.'); };
        img.src = evenement.target.result;
      };
      lecteur.readAsDataURL(fichier);
    });
  }
  var checkInclurePhoto = document.getElementById('checkInclurePhoto');
  if (checkInclurePhoto) {
    checkInclurePhoto.addEventListener('change', function () {
      dossier.photo = dossier.photo || { url: null, inclure: false };
      dossier.photo.inclure = this.checked;
    });
  }
  var btnSupprimerPhoto = document.getElementById('btnSupprimerPhoto');
  if (btnSupprimerPhoto) {
    btnSupprimerPhoto.addEventListener('click', function () {
      dossier.photo = { url: null, inclure: false };
      rerender();
    });
  }
  var btnValiderPhotoRetourApercu = document.getElementById('btnValiderPhotoRetourApercu');
  if (btnValiderPhotoRetourApercu) {
    btnValiderPhotoRetourApercu.addEventListener('click', function () {
      // TACHE (retour utilisateur : bouton Valider) : ouvre directement
      // l'etape CV + l'accordeon "Apercu et finalisation" (memes cles
      // qu'utilisees partout ailleurs pour ce document -- voir
      // avancerEtape()/etapeAtteinte()).
      dossier.dernierDocumentPrepare = 'cv';
      etatAccordeon['apercu-document'] = true;
      etatVenantDePhotoAction = false;
      naviguerVers('resultats');
    });
  }
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

// TACHE (Tache 1 : formations en tableau) : construit un brouillon
// (niveau + intitule + annee), jamais ecrit directement dans
// dossier.formations -- seul le clic sur "+ Ajouter" pousse une entree
// definitive dans le tableau, sur le meme principe que l'ajout d'une
// experience (formulaire de saisie, puis validation explicite).
function wireFormation(rerender) {
  document.querySelectorAll('[data-niveau-diplome]').forEach(function (el) {
    el.addEventListener('click', function () {
      var rncp = parseInt(this.dataset.niveauDiplome, 10);
      var n = NIVEAUX_DIPLOME_SIMPLES.filter(function (x) { return x.rncp === rncp; })[0];
      if (!n) { return; }
      // TACHE (retour utilisateur : "Sans diplôme" ne devrait pas exiger de
      // cliquer sur "Ajouter") : seule cette pastille -- aucun intitule ni
      // annee n'a de sens a saisir pour "sans diplome", le passage par le
      // brouillon + "+ Ajouter" n'est qu'une friction inutile. Ajout/retrait
      // DIRECT dans dossier.formations, en bascule (reclic = retire), sans
      // jamais passer par brouillonFormationEnCours. Toutes les autres
      // pastilles gardent le comportement existant (brouillon + Ajouter),
      // inchange ci-dessous.
      if (n.id === 'sansdiplome') {
        var indexExistant = dossier.formations.findIndex(function (f) { return f.niveau === n.label && !f.intitule && !f.annee; });
        if (indexExistant !== -1) { dossier.formations.splice(indexExistant, 1); }
        else { dossier.formations.push({ niveau: n.label, intitule: '', annee: '' }); }
        brouillonFormationEnCours = null;
        rerender();
        return;
      }
      if (brouillonFormationEnCours && brouillonFormationEnCours.niveauRNCP === rncp) {
        brouillonFormationEnCours = null;
        rerender();
        return;
      }
      brouillonFormationEnCours = { niveauRNCP: n.rncp, niveauVisible: n.label, intitule: '', annee: '' };
      rerender();
    });
  });
  var champIntituleNiveau = document.getElementById('niveauFormationIntitule');
  if (champIntituleNiveau) {
    champIntituleNiveau.addEventListener('input', function () {
      if (brouillonFormationEnCours) { brouillonFormationEnCours.intitule = this.value; }
    });
    // TACHE (retour utilisateur : navigation au clavier entre les champs) :
    // Entree dans "Intitule" -> passe au champ "Annee", sans soumettre quoi
    // que ce soit (preventDefault, pas de formulaire HTML natif ici de toute
    // facon, mais evite tout comportement par defaut inattendu).
    champIntituleNiveau.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var champAnnee = document.getElementById('niveauFormationAnnee');
        if (champAnnee) { champAnnee.focus(); }
      }
    });
  }
  var champAnneeNiveau = document.getElementById('niveauFormationAnnee');
  if (champAnneeNiveau) {
    champAnneeNiveau.addEventListener('input', function () {
      if (brouillonFormationEnCours) { brouillonFormationEnCours.annee = this.value; }
    });
    // TACHE (retour utilisateur : navigation au clavier entre les champs) :
    // Entree dans "Annee" (le dernier champ) -> equivalent a cliquer sur
    // "+ Ajouter" -- coherent avec l'attente naturelle de fin de saisie.
    champAnneeNiveau.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var btn = document.getElementById('ajouterFormationBtn');
        if (btn && !btn.disabled) { btn.click(); }
      }
    });
  }
  var btnAjouterFormation = document.getElementById('ajouterFormationBtn');
  if (btnAjouterFormation) {
    btnAjouterFormation.addEventListener('click', function () {
      if (!brouillonFormationEnCours) { return; }
      dossier.formations.push({
        niveau: brouillonFormationEnCours.niveauVisible,
        intitule: brouillonFormationEnCours.intitule,
        annee: brouillonFormationEnCours.annee
      });
      brouillonFormationEnCours = null;
      rerender();
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
  // TACHE (retour utilisateur : parcours "J'ai deja un CV" allege) : cette
  // personne a deja un CV complet -- Parcours/Experiences et savoir-faire
  // personnels/Complements n'ont plus lieu d'etre redemandes ici, seuls
  // Vous/Projet professionnel/Candidature restent utiles (coordonnees,
  // objectif/metier vise, candidature). Les rubriques a l'interieur de ces
  // 3 blocs restent inchangees.
  var modeAllege = (dossier.modeCreation === 'pret');
  var html = afficherProgression('projet') +
    '<div class="text-center"><h1>&#128203; Mon projet</h1>' +
    '<p class="sousTitre">Les informations qui personnaliseront votre candidature.</p></div>' +
    '<div class="grille-mon-projet">' +
    // TACHE (retour utilisateur : reorganisation Mon Projet, 3+3) : gauche
    // (Vous / Experiences et savoir-faire personnels / Complements) et
    // droite (Parcours / Projet professionnel / Candidature), alignes ligne
    // par ligne.
    (modeAllege
      ? '<div class="rangee-mon-projet">' + blocERIP(CONFIG_BLOC_VOUS) + blocERIP(CONFIG_BLOC_PROJET) + '</div>' +
        '<div class="rangee-mon-projet">' + blocERIP(CONFIG_BLOC_CANDIDATURE) + '</div>'
      : '<div class="rangee-mon-projet">' + blocERIP(CONFIG_BLOC_VOUS) + blocERIP(CONFIG_BLOC_PARCOURS) + '</div>' +
        '<div class="rangee-mon-projet">' + blocERIP(CONFIG_BLOC_EXPERIENCES_PERSO) + blocERIP(CONFIG_BLOC_PROJET) + '</div>' +
        '<div class="rangee-mon-projet">' + blocERIP(CONFIG_BLOC_COMPLEMENTS) + blocERIP(CONFIG_BLOC_CANDIDATURE) + '</div>') +
    '</div>' +
    // TACHE (complement) : barre de navigation fixee en bas de l'ecran,
    // toujours visible sans avoir a defiler, quel que soit le nombre de
    // blocs ouverts/replies. Uniquement sur cette page (classe dediee) :
    // les autres ecrans gardent leur barre de navigation normale, en flux.
    // TACHE (retour utilisateur : bloc Candidature obligatoire avant
    // Potentiel) : bouton desactive (grise/transparent, curseur interdit,
    // message au survol) tant que le choix n'est pas complet -- reutilise
    // options.suivantDesactive/suivantDesactiveMessage, deja gere par
    // barreNavigation() (meme mecanisme que Potentiel -> Action).
    '<div class="barre-navigation-fixe">' + barreNavigation('valeurs', 'revelation', '&#128302; Révéler mon potentiel',
      { suivantDesactive: !etatAccesRevelation().accessible, suivantDesactiveMessage: etatAccesRevelation().message }) + '</div>';
  app.innerHTML = html;

  wireBlocERIP(CONFIG_BLOC_VOUS, pageProjet);
  wireBlocERIP(CONFIG_BLOC_PROJET, pageProjet);
  wireBlocERIP(CONFIG_BLOC_CANDIDATURE, pageProjet);
  if (!modeAllege) {
    wireBlocERIP(CONFIG_BLOC_PARCOURS, pageProjet);
    wireBlocERIP(CONFIG_BLOC_EXPERIENCES_PERSO, pageProjet);
    wireBlocERIP(CONFIG_BLOC_COMPLEMENTS, pageProjet);
  }
  wireContratTemps();
}

// TACHE (retour utilisateur : bloc Candidature obligatoire avant Potentiel) :
// determine si l'acces a Potentiel est possible, et pourquoi pas sinon --
// utilise par pageProjet() pour desactiver le bouton "Reveler mon potentiel"
// avec un message explicite. Stage/alternance/pmsmp n'ont pas cette question
// (voir modeRechercheEffectif()) : jamais bloques par ces regles.
function etatAccesRevelation() {
  // TACHE (retour utilisateur : seule restriction = nom de la structure) :
  // stage/alternance/pmsmp ne bloquent plus que sur le nom de la structure --
  // dates/duree/heures restent facultatives, jamais bloquantes.
  if (dossier.objectif === 'stage' || dossier.objectif === 'alternance' || dossier.objectif === 'pmsmp') {
    var im = dossier[CLE_DETAILS[dossier.objectif]] || {};
    if (!im.structure) {
      return { accessible: false, message: 'Indiquez le nom de la structure, dans le bloc Candidature, pour pouvoir continuer.' };
    }
    return { accessible: true };
  }
  if (!dossier.modeRecherche) {
    return { accessible: false, message: 'Choisissez d\'abord, dans le bloc Candidature, comment vous souhaitez rechercher un emploi.' };
  }
  if (dossier.modeRecherche === 'domaine') {
    return { accessible: true };
  }
  // dossier.modeRecherche === 'metier'
  if (!dossier.typeRecherche) {
    return { accessible: false, message: 'Précisez, dans le bloc Candidature, si vous cherchez simplement un emploi ou si vous répondez à une offre.' };
  }
  if (dossier.typeRecherche === 'simple') {
    return { accessible: true };
  }
  // dossier.typeRecherche === 'offre' -- l'entreprise n'est plus demandee ici
  // (voir contenuModeRecherche()) : elle le sera au moment de "Passer a
  // l'action", une fois le metier fixe sur Potentiel (verifierAvantPasserAction()).
  return { accessible: true };
}

// TACHE (retour utilisateur : "vrai bug" -- bouton reste bloque apres avoir
// rempli la structure) : la saisie dans les champs de Candidature (via
// lier(), voir wireObjectifDetails()) met a jour dossier en silence, SANS
// jamais re-rendre toute la page "Mon projet" (pour ne pas faire perdre le
// focus/curseur en pleine frappe) -- consequence directe : le bouton
// "Reveler mon potentiel", lui, garde l'etat (disabled/enabled) calcule au
// dernier rendu COMPLET de la page, donc AVANT la saisie. Ce helper met a
// jour uniquement ce bouton, en direct, sans toucher au reste de la page.
function majEtatBoutonRevelation() {
  var bouton = document.getElementById('btnSuivantNavigation');
  if (!bouton) { return; }
  var etat = etatAccesRevelation();
  bouton.disabled = !etat.accessible;
  bouton.title = etat.accessible ? '' : (etat.message || '');
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
  // TACHE (refonte Candidature/Potentiel, Etape 2 -- solution B) : en mode
  // "Un metier precis", plus aucun metier n'est jamais "bloque" -- en
  // choisir un nouveau remplace silencieusement le precedent (voir
  // ajouterMetierCandidat), il n'y a donc plus de notion de limite atteinte
  // a signaler visuellement dans ce mode.
  if (modeRechercheEffectif() === 'metier') { return false; }
  return dossier.metiersCandidats.indexOf(nom) === -1 &&
    dossier.metiersCandidats.length >= LIMITE_METIERS_CANDIDATS;
}
// TACHE (retour utilisateur : stage/alternance/immersion sans question
// "metier ou domaine") : pour ces 3 objectifs, la question "Comment
// souhaitez-vous rechercher un emploi ?" n'est plus posee (bloc Candidature,
// voir CONFIG_BLOC_CANDIDATURE) -- quelqu'un qui cherche un stage/une
// alternance/une immersion cherche presque toujours quelque chose de bien
// cible, jamais un domaine large. Ce mode "metier precis" est donc IMPLICITE
// pour ces objectifs, sans jamais ecrire dossier.modeRecherche (qui reste
// null, refletant fidelement qu'aucune question n'a ete posee) -- cette
// fonction calcule le mode a utiliser PARTOUT ou le comportement (mono-
// selection, dispatch metier/domaine sur Potentiel) en depend.
function modeRechercheEffectif() {
  if (dossier.objectif === 'stage' || dossier.objectif === 'alternance' || dossier.objectif === 'pmsmp') {
    return 'metier';
  }
  return dossier.modeRecherche;
}

// TACHE (retour utilisateur : "Ce metier" automatique en mode "metier
// precis") : dossier.typeRecherche a deja ete renseigne dans le bloc
// Candidature (Etape 1) -- on en deduit directement dossier.typeCV, exactement
// la correspondance prevue des le document de conception initial (mode
// metier + reponse a une offre => CV specifique ; mode metier + recherche
// simple => CV general). Pas de valeur au hasard si typeRecherche n'est pas
// encore renseigne (ordre de remplissage libre) : repli sur 'general'.
function typeCVDepuisTypeRecherche() {
  return dossier.typeRecherche === 'offre' ? 'specifique' : 'general';
}

function ajouterMetierCandidat(nom, rerender) {
  // TACHE (refonte Candidature/Potentiel, Etape 2 -- decision "solution B") :
  // en mode "Un metier precis" (dossier.modeRecherche === 'metier'), la
  // selection devient MONO-selection -- un nouveau metier ajoute REMPLACE
  // le precedent (candidat classique OU hors repertoire, les deux tableaux
  // sont vides ensemble), au lieu de s'accumuler dans une liste comme avant.
  // Ce mono-choix suffit a lui seul a empecher "Secteur(s) d'activite"
  // (reserve a 2+ candidats, cf. banniereMetierCible) de jamais apparaitre
  // dans ce mode -- aucune regle d'auto-deduction n'a besoin d'etre ecrite
  // (voir aussi Etape 3 : dossier.modeMetierCible a ete retire, redondant).
  // TACHE (retour utilisateur : "Ce metier" automatique) : dans ce mode, le
  // metier choisi devient DIRECTEMENT la cible -- plus besoin de cliquer sur
  // "Ce metier" (ce bouton ne s'affiche d'ailleurs plus dans ce mode, voir
  // banniereMetierCible). typeCV deduit de typeRecherche (voir ci-dessus).
  // TACHE (retour utilisateur : avertissement avant remplacement) : si un
  // metier cible DIFFERENT existe deja, on avertit avant de l'ecraser plutot
  // que de le faire silencieusement -- les informations d'entreprise/lien
  // associees a l'ancien metier deviendraient sinon perimees sans que la
  // personne s'en rende compte (voir confirmerRemplacementMetierCible()).
  // Hors de ce mode (modeRecherche 'domaine' ou pas encore choisi) :
  // comportement multi-candidats + confirmation manuelle strictement inchange.
  if (modeRechercheEffectif() === 'metier') {
    if (dossier.metiersCandidats.length === 1 && dossier.metiersCandidats[0] === nom) { return; }
    if (dossier.metierCible && dossier.metierCible !== nom && rerender) {
      confirmerRemplacementMetierCible(nom, false, rerender);
      return;
    }
    finaliserMetierCible(nom, false, rerender);
    return;
  }
  if (dossier.metiersCandidats.indexOf(nom) === -1) {
    // Garde-fou silencieux : l'affichage empeche deja normalement d'arriver
    // ici (metiers grises, non cliquables), le message sous les pastilles
    // du bandeau explique la limite -- plus besoin d'une alerte intrusive.
    if (dossier.metiersCandidats.length >= LIMITE_METIERS_CANDIDATS) { return; }
    dossier.metiersCandidats.push(nom);
  }
  majMetierCibleAuto();
}

// TACHE (retour utilisateur : avertissement avant remplacement) : applique
// effectivement le nouveau metier cible (candidat classique OU hors
// repertoire selon estHorsRepertoire) -- point de sortie UNIQUE, une fois
// que toute confirmation/reponse necessaire a ete obtenue.
function finaliserMetierCible(nom, estHorsRepertoire, rerender) {
  if (estHorsRepertoire) {
    dossier.metiersCandidats = [];
    dossier.metiersHorsRepertoire = [nom];
  } else {
    dossier.metiersCandidats = [nom];
    dossier.metiersHorsRepertoire = [];
  }
  dossier.metierCible = nom;
  dossier.secteurCible = null;
  dossier.typeCV = typeCVDepuisTypeRecherche();
  if (typeof rerender === 'function') { rerender(); }
}

// TACHE (retour utilisateur : avertissement avant remplacement) : previent
// qu'un changement de metier cible va effacer les informations de
// candidature associees a l'ancien metier. L'entreprise n'est plus
// redemandee ICI (voir contenuModeRecherche()/verifierAvantPasserAction()) --
// simplement effacee si elle existait (elle concernait l'ancien metier) ;
// elle sera re-demandee naturellement au prochain "Passer a l'action" si
// "Je reponds a une offre d'emploi" est toujours actif.
function confirmerRemplacementMetierCible(nouveauNom, estHorsRepertoire, rerender) {
  var ancien = dossier.metierCible;
  confirmerAction(
    'Changer de métier cible ?',
    'Vous allez remplacer « ' + echapperAttribut(ancien) + ' » par « ' + echapperAttribut(nouveauNom) + ' ».<br>' +
    'Les informations de candidature associées à l\'ancien métier seront effacées.<br>Souhaitez-vous continuer ?',
    'Continuer', 'btn-primary',
    function () {
      dossier.rechercheCandidature = { entreprise: '', lienOffre: '' };
      finaliserMetierCible(nouveauNom, estHorsRepertoire, rerender);
    }
  );
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
  dossier.secteurCible = null;
}
// TACHE (demande) : "Tout effacer" vide desormais AUSSI les metiers hors
// repertoire (avant, seuls les candidats "classiques" etaient vides).
function viderMetiersCandidats() {
  dossier.metiersCandidats = [];
  dossier.metiersHorsRepertoire = [];
  dossier.metierCible = null;
  dossier.secteurCible = null;
}

// TACHE (demande : metiers hors repertoire) : jusqu'a 3 intitules libres,
// distincts des 5 candidats "classiques" (ne comptent pas dans cette limite).
// Pas de fiche ROME ni de competences associees pour ces metiers-la.
var LIMITE_METIERS_HORS_REPERTOIRE = 3;
function metierEstHorsRepertoire(nom) {
  return dossier.metiersHorsRepertoire.indexOf(nom) !== -1;
}
function ajouterMetierHorsRepertoire(nom, rerender) {
  nom = (nom || '').trim();
  if (!nom) { return false; }
  // TACHE (retour utilisateur : barre de recherche unique) : premiere
  // lettre en majuscule, coherent avec les intitules du repertoire.
  nom = nom.charAt(0).toUpperCase() + nom.slice(1);
  // TACHE (refonte Candidature/Potentiel, Etape 2 -- solution B) : meme
  // regle de mono-selection qu'ajouterMetierCandidat() ci-dessus, pour
  // qu'un metier "hors repertoire" remplace lui aussi toute selection
  // precedente (classique ou hors repertoire) en mode "Un metier precis".
  // TACHE (retour utilisateur : avertissement avant remplacement) : meme
  // garde-fou qu'ajouterMetierCandidat() ci-dessus.
  if (modeRechercheEffectif() === 'metier') {
    if (dossier.metiersHorsRepertoire.length === 1 && dossier.metiersHorsRepertoire[0] === nom) { return false; }
    if (dossier.metierCible && dossier.metierCible !== nom && rerender) {
      confirmerRemplacementMetierCible(nom, true, rerender);
      return false;
    }
    finaliserMetierCible(nom, true, rerender);
    return true;
  }
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
  }
}
// TACHE (retour utilisateur : suppression definitive du toggle "Ce
// metier"/"Secteur(s) d'activite") : les 2 panneaux qui vivaient ici
// (ouvrirPanneauChoixMetierParmiCandidats, ouvrirPanneauChoixSecteur)
// n'etaient plus atteignables que par ce toggle, desormais retire -- la
// decision metier precis/domaine se prend exclusivement dans le bloc
// Candidature (voir etatAccesRevelation(), qui rend ce choix obligatoire
// avant d'acceder a Potentiel). Supprimes avec lui plutot que laisses en
// code mort.

// TACHE (retour utilisateur : meme comportement metier reconnu/non reconnu) :
// ouvrirPanneauChoixMetierHorsRepertoire() (le panneau "Choisissez le
// metier" ouvert en cliquant sur le nom d'un metier hors repertoire) et
// contenuDetailMetierCandidat()/etatDetailMetierCandidatOuvert() (le detail
// competences/fiche ROME ouvert en cliquant sur le nom d'un metier du
// referentiel) ont ete retires -- en mono-selection, le metier affiche est
// TOUJOURS deja la cible (fixee automatiquement des son ajout, voir
// ajouterMetierCandidat()/ajouterMetierHorsRepertoire()) : plus aucune
// confirmation ni detail supplementaire n'a de sens ici, qu'il vienne du
// referentiel ou d'une saisie libre. Seule la croix de retrait reste
// cliquable, pour les deux.
var fenetreIAOuverte = null;
// Pastille d'un candidat : croix a gauche (retrait), nom en texte simple --
// plus de detail competences/fiche ROME au clic (voir commentaire ci-dessus).
function pastilleMetierCandidatHTML(nom) {
  return '<span class="metier-resume-chip metier-resume-chip-candidat">' +
    '<span class="metier-resume-suppr" data-metier-candidat-suppr="' + echapperAttribut(nom) + '" title="Retirer">&#10005;</span>' +
    '<span class="metier-resume-nom">' + nom + '</span>' +
    '</span>';
}

// TACHE (demande) : bandeau "Je postule", visible plus bas sur la page une
// fois qu'un metier ou un secteur a ete choisi -- reprend la meme phrase de
// confirmation que dans le bandeau "Metier(s) cible(s)", mais dans un
// encart separe et bien visible, pour la garder sous les yeux plus loin
// dans la page.
function banniereJePostule() {
  if (dossier.metierCible) {
    // TACHE (retour utilisateur : retirer les couleurs bleu/jaune) : le
    // candidat ne doit jamais voir si son metier est "reconnu" ou non par le
    // referentiel -- meme bandeau, quelle que soit l'origine du metier.
    return '<div class="banniere-je-postule banniere-je-postule-accent">' +
      '<div class="banniere-je-postule-titre">&#128640; Votre candidature est prête</div>' +
      '<p class="mb-1">Votre candidature sera automatiquement personnalisée pour le métier sélectionné : ' +
      '<strong>' + dossier.metierCible + '</strong>.</p>' +
      '<p class="mb-0">Votre CV, votre lettre de motivation et votre préparation à l’entretien seront adaptés ' +
      'afin de mettre en valeur les compétences, les qualités et les attentes spécifiques de ce métier.</p>' +
      '</div>';
  }
  if (dossier.secteurCible) {
    return '<div class="banniere-je-postule banniere-je-postule-accent">' +
      '<div class="banniere-je-postule-titre">&#128640; Votre candidature est prête</div>' +
      '<p class="mb-1">Votre candidature sera automatiquement personnalisée pour le secteur sélectionné : ' +
      '<strong>' + echapperAttribut(dossier.secteurCible) + '</strong> (pas un métier précis -- utile par exemple ' +
      'pour postuler auprès d’agences d’intérim, sur plusieurs métiers).</p>' +
      '<p class="mb-0">Votre CV, votre lettre de motivation et votre préparation à l’entretien seront adaptés ' +
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
  if (!metierOuSecteurChoisi) {
    ouvrirPanneauAvertissementMetierCible();
    return;
  }
  // TACHE (retour utilisateur : coordonnees entreprise demandees ICI, pas
  // dans le bloc Candidature) : evite toute incoherence entre une entreprise
  // saisie tot et un metier choisi ensuite sur Potentiel (ex. une entreprise
  // du sport indiquee au debut, un metier du BTP choisi apres coup). Si
  // "Je reponds a une offre d'emploi" a ete choisi et qu'aucune entreprise
  // n'est encore connue, on la demande maintenant -- une seule fois, le
  // metier etant desormais fixe.
  if (dossier.typeRecherche === 'offre' && !(dossier.rechercheCandidature && dossier.rechercheCandidature.entreprise)) {
    ouvrirDemandeCoordonneesEntreprise(function () { naviguerVers('resultats'); });
    return;
  }
  naviguerVers('resultats');
}

// TACHE (retour utilisateur : coordonnees entreprise demandees au moment de
// "Passer a l'action") : premiere etape -- demande si l'entreprise est deja
// connue. "Continuer sans" reclasse en recherche simple (coherent avec
// typeCVDepuisTypeRecherche() : sans entreprise, ce n'est plus une reponse a
// une offre precise). "Indiquer l'entreprise" ouvre le formulaire, qui peut
// revenir ici via son bouton Retour.
// TACHE (migration Design System, chantier "Fenetre ERIP", 4e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP() -- ne
// construit plus son propre overlay, sa propre croix, ni sa propre logique
// de clic exterieur. Reste une recette METIER (boutons a semantique propre,
// mutation directe de dossier) : n'est volontairement pas fusionnee avec
// confirmerAction(), dont le motif "Annuler/Confirmer" ne correspond pas a
// ce choix reel a deux issues distinctes.
function ouvrirDemandeCoordonneesEntreprise(onTermine) {
  var overlay = ouvrirFenetreERIP({
    titre: '&#127970; Connaissez-vous l’entreprise ?',
    contenuHTML:
      '<p>Vous avez indiqué répondre à une offre d’emploi. Connaissez-vous déjà les coordonnées de l’entreprise ' +
      '(utile pour personnaliser votre CV, votre lettre et votre entretien) ?</p>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-outline-secondary" data-role="entreprise-inconnue">Continuer sans</button>' +
        '<button class="btn btn-primary" data-role="entreprise-connue">Indiquer l’entreprise</button>' +
      '</div>'
  });
  overlay.querySelector('[data-role="entreprise-inconnue"]').addEventListener('click', function () {
    fermerFenetreERIP();
    // TACHE (coherence) : sans entreprise connue, il ne s'agit plus d'une
    // reponse a une offre precise -- reclasse en recherche simple.
    dossier.typeRecherche = 'simple';
    dossier.rechercheCandidature = { entreprise: '', lienOffre: '' };
    dossier.typeCV = typeCVDepuisTypeRecherche();
    onTermine();
  });
  overlay.querySelector('[data-role="entreprise-connue"]').addEventListener('click', function () {
    fermerFenetreERIP();
    ouvrirFormulaireCoordonneesEntreprise(onTermine);
  });
}

// TACHE (retour utilisateur) : formulaire nom (obligatoire) + lien
// (facultatif). Le bouton Retour ramene a la question precedente
// (ouvrirDemandeCoordonneesEntreprise), plutot que de fermer sans rien faire.
function ouvrirFormulaireCoordonneesEntreprise(onTermine) {
  var panneau = ouvrirPanneauGuide('&#127970; Coordonnées de l’entreprise',
    '<div class="mb-2"><label class="form-label small">Nom de l’entreprise</label>' +
    '<input type="text" class="form-control form-control-sm" id="coordEntrepriseNom" placeholder="Nom de l’entreprise"></div>' +
    '<div class="mb-3"><label class="form-label small">Lien du site / de l’offre (facultatif)</label>' +
    '<input type="url" class="form-control form-control-sm" id="coordEntrepriseLien" placeholder="https://..."></div>' +
    '<div class="d-flex justify-content-between">' +
    '<button type="button" class="btn btn-outline-secondary" id="btnRetourCoordEntreprise">&#8592; Retour</button>' +
    '<button type="button" class="btn btn-primary" id="btnValiderCoordEntreprise" disabled>Valider</button>' +
    '</div>');
  var champNom = panneau.querySelector('#coordEntrepriseNom');
  var champLien = panneau.querySelector('#coordEntrepriseLien');
  var btnValider = panneau.querySelector('#btnValiderCoordEntreprise');
  function actualiser() {
    var ok = champNom.value.trim().length > 0;
    btnValider.disabled = !ok;
    btnValider.style.opacity = ok ? '1' : '0.5';
  }
  actualiser();
  champNom.addEventListener('input', actualiser);
  panneau.querySelector('#btnRetourCoordEntreprise').addEventListener('click', function () {
    fermerPanneauGuide();
    ouvrirDemandeCoordonneesEntreprise(onTermine);
  });
  btnValider.addEventListener('click', function () {
    if (btnValider.disabled) { return; }
    // TACHE (coherence) : nom obligatoire pour valider, lien reellement
    // facultatif.
    dossier.rechercheCandidature = { entreprise: champNom.value.trim(), lienOffre: champLien.value.trim() };
    dossier.typeRecherche = 'offre';
    dossier.typeCV = typeCVDepuisTypeRecherche();
    fermerPanneauGuide();
    onTermine();
  });
}

// TACHE (migration Design System, chantier "Fenetre ERIP", 4e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP() -- meme
// principe que ouvrirDemandeCoordonneesEntreprise() ci-dessus, boutons a
// semantique propre, volontairement distincte de confirmerAction().
function ouvrirPanneauAvertissementMetierCible() {
  var overlay = ouvrirFenetreERIP({
    titre: '&#9888;&#65039; Aucun métier ciblé',
    contenuHTML:
      '<p>Vous n’avez pas encore renseigné de métier ni de secteur d’activité cible. ' +
      'Cette information permet de personnaliser votre CV, votre lettre de motivation et ' +
      'votre préparation à l’entretien.</p>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-outline-primary" data-role="choisir-metier">&#127919; Choisir un métier</button>' +
        '<button class="btn btn-primary" data-role="continuer-quand-meme">Continuer quand même</button>' +
      '</div>'
  });
  overlay.querySelector('[data-role="continuer-quand-meme"]').addEventListener('click', function () {
    fermerFenetreERIP();
    naviguerVers('resultats');
  });
  overlay.querySelector('[data-role="choisir-metier"]').addEventListener('click', function () {
    fermerFenetreERIP();
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

// ============================================================
// TACHE (refonte Candidature/Potentiel, Etape 2 -- mode "domaine") : ecran
// affiche a la place de la recherche de metier quand dossier.modeRecherche
// === 'domaine'. Ecrit directement dans dossier.secteurCible -- exactement
// le meme champ que l'ancien panneau "Choisissez un secteur d'activite"
// (ouvrirPanneauChoixSecteur ci-dessus), donc aucun changement cote moteur
// (banniereJePostule, verifierAvantPasserAction, generation CV/lettre/
// entretien) : seule la maniere d'obtenir la valeur change. La liste des
// domaines proposes est calculee directement a partir de baseMetiers.secteur
// (metiers.js) -- aucune nomenclature dupliquee, toute evolution du
// referentiel se repercute automatiquement ici.
// ============================================================
var LIMITE_RACCOURCIS_DOMAINES = 8;

function secteursDisponibles() {
  if (typeof baseMetiers === 'undefined') { return []; }
  var comptes = {};
  baseMetiers.forEach(function (m) {
    if (!m.secteur) { return; }
    comptes[m.secteur] = (comptes[m.secteur] || 0) + 1;
  });
  return Object.keys(comptes).map(function (nom) { return { nom: nom, count: comptes[nom] }; });
}

// TACHE (complement) : texte de recherche du mode "domaine", meme principe
// que etatSelectionCatalogue -- purement transitoire (pas sauvegarde),
// reinitialise a chaque rechargement, garde la frappe entre deux re-rendus.
var etatRechercheDomaine = { texte: '' };
// TACHE (retour utilisateur : impossible de revenir sur le choix
// metier/domaine une fois fait) : bascule transitoire (jamais sauvegardee)
// forcant l'affichage du choix "Comment souhaitez-vous rechercher un
// emploi ?" (contenuModeRecherche()/wireModeRecherche(), memes fonctions
// que le bloc Candidature) directement depuis Potentiel, meme quand
// dossier.modeRecherche est deja renseigne -- reactivee par un petit bouton
// "Changer" sur les 2 bannieres (metier et domaine), remise a false des
// qu'un choix est reellement fait ou reconfirme.
var etatAfficherChoixModeRecherche = false;

function banniereDomaineCible() {
  var actif = !!dossier.secteurCible;
  var tousLesSecteurs = secteursDisponibles();
  var texteNormalise = normaliserTexte(etatRechercheDomaine.texte).trim();

  function pastilleSecteur(s) {
    return '<span class="pastille" data-domaine-choix="' + echapperAttribut(s.nom) + '">' +
      echapperAttribut(s.nom) + '</span>';
  }

  var zoneChoix = '';
  if (!actif) {
    var raccourcis = tousLesSecteurs.slice()
      .sort(function (a, b) { return b.count - a.count || a.nom.localeCompare(b.nom, 'fr'); })
      .slice(0, LIMITE_RACCOURCIS_DOMAINES);
    var listeComplete = tousLesSecteurs.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
    var enRecherche = texteNormalise.length > 0;
    var listeAffichee = enRecherche
      ? listeComplete.filter(function (s) { return normaliserTexte(s.nom).indexOf(texteNormalise) !== -1; })
      : null;

    zoneChoix = '<div class="banniere-metier-cible-recherche">' +
      '<p class="mb-1 small fw-semibold">&#128269; Recherchez un domaine, ou choisissez parmi les plus courants :</p>' +
      '<input type="text" class="form-control" id="rechercheDomaineInput" placeholder="Un domaine..." ' +
      'value="' + echapperAttribut(etatRechercheDomaine.texte) + '"></div>' +
      (!enRecherche
        ? '<div class="pastilles mt-2">' + raccourcis.map(pastilleSecteur).join('') + '</div>' +
          '<p class="text-muted small mt-2 mb-0">Ou recherchez dans la liste complète (' +
          tousLesSecteurs.length + ' domaines) ci-dessus.</p>'
        : (listeAffichee.length
            ? '<div class="pastilles mt-2">' + listeAffichee.map(pastilleSecteur).join('') + '</div>'
            : '<p class="text-muted small mt-2 mb-0">Aucun domaine ne correspond à cette recherche.</p>'));
  }

  var confirmation = actif
    ? '<p class="mb-0 mt-2 small banniere-metier-cible-max">&#9989; Domaine cible : <strong>' +
      echapperAttribut(dossier.secteurCible) + '</strong>.</p>'
    : '';
  var btnEffacerTout = actif
    ? '<div class="mt-2"><button type="button" class="btn btn-sm btn-outline-danger btn-effacer banniere-metier-cible-effacer" ' +
      'data-domaine-reset="1">&#10227; Changer de domaine</button></div>'
    : '';

  return '<div class="banniere-metier-cible' + (actif ? ' banniere-metier-cible-actif banniere-metier-cible-compacte' : '') +
    (metierCibleEnEvidence ? ' a-completer' : '') + '" id="banniereMetierCibleZone">' +
    '<div class="banniere-metier-cible-titre d-flex justify-content-between align-items-center flex-wrap gap-2">' +
    '<span>&#127760; Domaine cible</span>' +
    '<button type="button" class="btn btn-sm btn-outline-primary btn-changer-mode-recherche" ' +
    'id="btnChangerModeRecherche">&#128260; Changer de mode</button></div>' +
    btnEffacerTout +
    zoneChoix +
    confirmation +
    '</div>';
}

function wireBanniereDomaineCible(rerender) {
  // TACHE (retour utilisateur : bouton "Changer de mode de recherche") :
  // present sur cette banniere (mode domaine).
  var btnChangerMode = document.getElementById('btnChangerModeRecherche');
  if (btnChangerMode) {
    btnChangerMode.addEventListener('click', function () {
      etatAfficherChoixModeRecherche = true;
      rerender();
    });
  }
  var input = document.getElementById('rechercheDomaineInput');
  if (input) {
    input.addEventListener('input', function () {
      etatRechercheDomaine.texte = this.value;
      rerender();
    });
    input.focus();
    var pos = input.value.length;
    input.setSelectionRange(pos, pos);
  }
  document.querySelectorAll('[data-domaine-choix]').forEach(function (el) {
    el.addEventListener('click', function () {
      // TACHE (reutilisation du moteur existant) : meme champ que l'ancien
      // panneau "Choisissez un secteur d'activite" (ouvrirPanneauChoixSecteur).
      dossier.secteurCible = this.dataset.domaineChoix;
      dossier.metierCible = null;
      etatRechercheDomaine.texte = '';
      rerender();
    });
  });
  var btnReset = document.querySelector('[data-domaine-reset]');
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      dossier.secteurCible = null;
      rerender();
    });
  }
}

function banniereMetierCible() {
  // TACHE (retour utilisateur : impossible de revenir sur le choix
  // metier/domaine) : si le bouton "Changer" (voir plus bas, present sur
  // les 2 bannieres) a ete utilise, on affiche le choix "Comment
  // souhaitez-vous rechercher un emploi ?" quel que soit le mode DEJA
  // choisi -- verifie AVANT le dispatch metier/domaine habituel, qui ne
  // s'applique donc que si ce choix n'est pas en train d'etre modifie.
  if (etatAfficherChoixModeRecherche) {
    return '<div class="banniere-metier-cible" id="banniereMetierCibleZone">' +
      '<div class="banniere-metier-cible-titre">&#127919; Comment souhaitez-vous rechercher un emploi ?</div>' +
      '<p class="text-muted small mb-2">Vous pouvez changer ce choix à tout moment.</p>' +
      contenuModeRecherche() +
      '</div>';
  }

  // TACHE (refonte Candidature/Potentiel, Etape 2) : en mode "domaine", cette
  // banniere entiere est remplacee par l'ecran de choix de domaine ci-dessus
  // -- plus de recherche de metier ni de "Ce metier"/"Secteur(s)" dans ce
  // mode, un seul choix guide.
  if (modeRechercheEffectif() === 'domaine') { return banniereDomaineCible(); }

  // TACHE (retour utilisateur : nettoyage code mort) : cette fonction ne
  // s'execute donc plus JAMAIS qu'en mode "metier precis" (modeRechercheEffectif()
  // === 'metier' garanti : choisi explicitement dans le bloc Candidature,
  // prerequis desormais impossible a contourner -- voir pageObjectif(), qui
  // envoie systematiquement vers "Mon projet" apres un CV analyse, plutot
  // que de sauter directement vers Potentiel -- ou implicite pour
  // stage/alternance/pmsmp) -- la mono-selection (au plus 1 metier, classique
  // OU hors repertoire) y est donc elle aussi garantie. Tout ce qui necessitait
  // de distinguer "mono" vs "multi" ou d'afficher une limite (compteurs X/5 et
  // X/3, message "selection complete") a ete retire : ces cas ne se
  // produisent plus jamais ici. LIMITE_METIERS_CANDIDATS/LIMITE_METIERS_HORS_
  // REPERTOIRE restent neanmoins utilisees ailleurs (ex. clic sur un metier
  // recommande depuis un autre bloc de Potentiel, hors de ce bandeau).
  var actif = !!(dossier.metierCible || dossier.secteurCible);

  // TACHE (retour utilisateur : "Ce metier" automatique) : le choix est
  // desormais immediat (voir ajouterMetierCandidat) -- la recherche reste
  // donc accessible meme apres un choix, pour changer directement de metier
  // sans passer par "Tout effacer".
  var zoneRecherche = '<div class="banniere-metier-cible-recherche">' +
    '<p class="mb-1 small fw-semibold">&#128269; ' +
    (actif ? 'Vous pouvez choisir un autre métier à tout moment :' :
      'Recherchez un métier : s’il est dans notre répertoire, cliquez dessus pour l’ajouter. ' +
      'Sinon, appuyez sur Entrée pour l’ajouter tel quel :') +
    '</p>' +
    '<input type="text" class="form-control" id="rechercheMetierCibleInput" ' +
    'placeholder="Quel métier recherchez-vous ?">' +
    '<div id="resultatsMetierCible"></div>' +
    '</div>';

  // TACHE (demande : metiers hors repertoire) : la saisie libre se fait
  // desormais directement dans la barre de recherche ci-dessus (voir
  // wireRechercheMetierCible) -- seuls les metiers hors repertoire DEJA
  // ajoutes restent affiches ici (chips), plus de bouton/champ separes.
  var horsRepertoire = dossier.metiersHorsRepertoire;
  var zoneHorsRepertoire = horsRepertoire.length
    ? '<div class="banniere-metier-cible-hors-repertoire">' +
      '<div class="metiers-chips mt-2">' + horsRepertoire.map(pastilleMetierHorsRepertoireHTML).join('') + '</div>' +
      '</div>'
    : '';

  var candidats = dossier.metiersCandidats;
  var htmlPastillesCandidats = candidats.length
    ? '<div class="metiers-chips mt-2">' + candidats.map(pastilleMetierCandidatHTML).join('') + '</div>'
    : '';

  // TACHE (retour utilisateur : suppression definitive du toggle "Ce
  // metier"/"Secteur(s) d'activite") : desormais que le choix "Comment
  // souhaitez-vous rechercher un emploi ?" du bloc Candidature est un
  // prerequis pour acceder a Potentiel (voir etatAccesRevelation()),
  // Potentiel n'a plus jamais a arbitrer lui-meme entre metier/secteur --
  // il ne fait plus que s'adapter au choix deja fait.

  // TACHE (retour utilisateur : "Tout effacer" inutile) : en mono-selection,
  // il n'y a jamais qu'un seul metier -- la croix de retrait sur son chip
  // (deja disponible) fait exactement la meme chose, "Tout effacer" est donc
  // retire (bouton + cablage data-metiers-candidats-reset).

  // TACHE (retour utilisateur : retirer les couleurs bleu/jaune) : plus de
  // variante jaune -- le candidat ne doit jamais voir si son metier est
  // "reconnu" par le referentiel ou saisi librement.
  // TACHE (retour utilisateur : pas de "changer de mode" pour stage/
  // alternance/immersion) : ces 3 parcours n'ont jamais eu ce choix a faire
  // (mode "metier" implicite, voir modeRechercheEffectif()) -- le bouton
  // n'a donc pas lieu d'etre ici, contrairement a offre/spontanee/
  // reconversion ou le choix metier/domaine est reel.
  var estImmersion = (dossier.objectif === 'stage' || dossier.objectif === 'alternance' || dossier.objectif === 'pmsmp');
  var boutonChangerMode = estImmersion ? '' :
    '<button type="button" class="btn btn-sm btn-outline-primary btn-changer-mode-recherche" ' +
    'id="btnChangerModeRecherche">&#128260; Changer de mode</button>';

  return '<div class="banniere-metier-cible' +
    (actif ? ' banniere-metier-cible-actif' : '') +
    (actif ? ' banniere-metier-cible-compacte' : '') +
    (metierCibleEnEvidence ? ' a-completer' : '') + '" id="banniereMetierCibleZone">' +
    '<div class="banniere-metier-cible-titre d-flex justify-content-between align-items-center flex-wrap gap-2">' +
    '<span>&#127919; Métier cible</span>' +
    boutonChangerMode + '</div>' +
    zoneRecherche +
    zoneHorsRepertoire +
    htmlPastillesCandidats +
    (candidats.length === 0 && horsRepertoire.length === 0
      ? '<p class="mb-0 mt-2 small text-muted">Aucun métier sélectionné. Recherchez un métier ci-dessus pour personnaliser ' +
        'votre CV, votre lettre de motivation et votre préparation à l’entretien.</p>'
      : '') +
    '</div>';
}
// Pastille d'un metier hors repertoire : croix de retrait + nom en texte
// simple -- meme comportement que pastilleMetierCandidatHTML (retour
// utilisateur : metier reconnu ou non, le meme traitement partout).
function pastilleMetierHorsRepertoireHTML(nom) {
  var estCible = dossier.metierCible === nom;
  return '<span class="metier-resume-chip' + (estCible ? ' metier-resume-cible' : '') + '">' +
    '<span class="metier-resume-suppr" data-metier-hr-suppr="' + echapperAttribut(nom) + '" title="Retirer">&#10005;</span>' +
    '<span class="metier-resume-nom">' + (estCible ? '&#127919; ' : '') + nom + '</span>' +
    '</span>';
}
function wireBanniereMetierCible(rerender) {
  // TACHE (retour utilisateur : impossible de revenir sur le choix
  // metier/domaine) : cablage du repli "changer de mode" (voir
  // banniereMetierCible()) -- reutilise wireModeRecherche() tel quel.
  if (etatAfficherChoixModeRecherche) {
    wireModeRecherche(rerender);
    return;
  }

  // TACHE (refonte Candidature/Potentiel, Etape 2) : cablage dedie en mode
  // "domaine" (voir banniereDomaineCible ci-dessus) -- aucun des elements
  // ci-dessous (recherche metier, candidats, "Ce metier"/"Secteur(s)") n'est
  // present dans ce mode, donc rien a cabler parmi eux.
  if (modeRechercheEffectif() === 'domaine') { wireBanniereDomaineCible(rerender); return; }

  // TACHE (retour utilisateur : bouton "Changer de mode de recherche") :
  // present sur cette banniere (mode metier) une fois un choix deja fait.
  var btnChangerMode = document.getElementById('btnChangerModeRecherche');
  if (btnChangerMode) {
    btnChangerMode.addEventListener('click', function () {
      etatAfficherChoixModeRecherche = true;
      rerender();
    });
  }

  document.querySelectorAll('[data-metier-candidat-suppr]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      retirerMetierCandidat(this.dataset.metierCandidatSuppr);
      rerender();
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
// TACHE (autocompletion, mise en evidence) : affichage uniquement -- entoure
// la portion du nom qui correspond au texte tape d'un <mark>. Insensible aux
// accents/majuscules (comme la recherche elle-meme), jamais utilisee pour
// filtrer ou trier : rechercherMetiersPourAjout() reste seule responsable de ca.
function surlignerCorrespondance(nom, texteRecherche) {
  var texte = (texteRecherche || '').trim();
  if (!texte) { return echapperAttribut(nom); }
  var nomNormalise = normaliserTexte(nom);
  var texteNormalise = normaliserTexte(texte);
  var index = nomNormalise.indexOf(texteNormalise);
  if (index === -1) { return echapperAttribut(nom); }
  var avant = nom.slice(0, index);
  var correspondance = nom.slice(index, index + texte.length);
  var apres = nom.slice(index + texte.length);
  return echapperAttribut(avant) + '<mark>' + echapperAttribut(correspondance) + '</mark>' + echapperAttribut(apres);
}
function wireRechercheMetierCible(rerender) {
  var input = document.getElementById('rechercheMetierCibleInput');
  var zoneResultats = document.getElementById('resultatsMetierCible');
  if (!input || !zoneResultats) { return; }
  // TACHE (retour utilisateur : barre de recherche unique) : suit les
  // suggestions actuellement affichees -- Entree n'ajoute le texte tape
  // comme metier hors repertoire QUE si AUCUNE suggestion ne correspond
  // (evite qu'une faute de frappe proche d'un metier existant devienne une
  // fiche a part, alors que le vrai metier est juste en dessous).
  var dernierResultats = [];
  function rafraichirResultats() {
    var texte = input.value;
    var resultats = rechercherMetiersPourAjout(texte);
    dernierResultats = resultats;
    var texteAssezLong = normaliserTexte(texte).trim().length >= 2;
    zoneResultats.innerHTML = resultats.length
      ? resultats.map(function (m) {
          var bloque = metierEstBloque(m.nom);
          var lienRome = m.rome
            ? '<a href="' + lienFicheROME(m) + '" target="_blank" rel="noopener" class="option-metier-ajout-rome" title="Voir la fiche ROME">&#128206;</a>'
            : '';
          return '<div class="option-metier-ajout' + (bloque ? ' option-metier-ajout-bloque' : '') + '" ' +
            (bloque ? '' : 'data-metier-cible-direct="' + echapperAttribut(m.nom) + '" ') +
            (bloque ? 'title="Retirez d\'abord un métier cible pour en ajouter un autre"' : '') + '>' +
            '<span class="option-metier-ajout-nom">&#128204; ' + surlignerCorrespondance(m.nom, texte) + lienRome + '</span></div>';
        }).join('')
      : (texteAssezLong
          ? '<p class="text-muted small">Aucun métier trouvé dans notre répertoire — appuyez sur <strong>Entrée</strong> ' +
            'pour l\'ajouter tel quel.</p>'
          : '');
    zoneResultats.querySelectorAll('[data-metier-cible-direct]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('a')) { return; }
        ajouterMetierCandidat(this.dataset.metierCibleDirect, rerender);
        rerender();
      });
    });
  }
  input.addEventListener('input', rafraichirResultats);
  input.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') { return; }
    e.preventDefault();
    var texteNorm = normaliserTexte(this.value).trim();
    if (texteNorm.length < 2) { return; }
    // TACHE (retour utilisateur : Entree doit aussi selectionner un metier
    // reconnu) : si le texte tape correspond EXACTEMENT (une fois normalise)
    // a l'une des suggestions du referentiel actuellement affichees, Entree
    // la selectionne directement -- inutile de cliquer dessus. S'il y a des
    // suggestions mais aucune correspondance exacte, on laisse cliquer
    // (ambigu : mieux vaut voir les propositions que trancher a l'aveugle).
    var correspondanceExacte = dernierResultats.filter(function (m) {
      return normaliserTexte(m.nom) === texteNorm && !metierEstBloque(m.nom);
    })[0];
    if (correspondanceExacte) {
      ajouterMetierCandidat(correspondanceExacte.nom, rerender);
      rerender();
      return;
    }
    if (dernierResultats.length > 0) { return; }
    if (ajouterMetierHorsRepertoire(this.value, rerender)) { rerender(); }
  });
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
// TACHE (retour utilisateur : descriptif avant de choisir, PARTOUT SAUF le
// bandeau "Metier cible" lui-meme) : petite fenetre avec les competences
// typiques du metier (savoir-etre/savoir-faire/savoirs) et son nom cliquable
// vers la fiche ROME, avant de le choisir comme cible -- utilisee par
// "Metiers recommandes", "Autres pistes", "Voir tous les metiers", et les
// panneaux "competence cliquable" (unique + liste). Le bouton "Choisir ce
// metier" reutilise ajouterMetierCandidat() tel quel : meme mono-selection,
// meme avertissement de remplacement (confirmerRemplacementMetierCible(),
// "Changer de metier cible ?") que partout ailleurs -- aucune logique dupliquee.
// Le bandeau "Metier cible" (pastilleMetierCandidatHTML()/
// pastilleMetierHorsRepertoireHTML(), plus haut) reste volontairement simple
// (nom + croix seulement) : le metier y est deja la cible, ce descriptif n'a
// de sens qu'AVANT de choisir, pas apres.
function ouvrirDescriptifMetier(nom, rerender) {
  var fiche = metierParNom(nom);
  function badgesListe(liste, classeBadge) {
    return (liste || []).map(function (s) { return '<span class="badge ' + classeBadge + ' me-1 mb-1">' + s + '</span>'; }).join('');
  }
  var titre = (fiche && fiche.rome)
    ? '<a href="' + lienFicheROME(fiche) + '" target="_blank" rel="noopener" title="Voir la fiche ROME">&#127919; ' +
      echapperAttribut(nom) + ' &#128206;</a>'
    : '&#127919; ' + echapperAttribut(nom);
  var contenu = (fiche && ((fiche.savoirEtre && fiche.savoirEtre.length) || (fiche.savoirFaire && fiche.savoirFaire.length) || (fiche.savoirs && fiche.savoirs.length))
    ? (fiche.savoirEtre && fiche.savoirEtre.length ? '<div class="mb-1">' + badgesListe(fiche.savoirEtre, 'bg-success') + '</div>' : '') +
      (fiche.savoirFaire && fiche.savoirFaire.length ? '<div class="mb-1">' + badgesListe(fiche.savoirFaire, 'bg-primary') + '</div>' : '') +
      (fiche.savoirs && fiche.savoirs.length ? '<div class="mb-1">' + badgesListe(fiche.savoirs, 'bg-info') + '</div>' : '')
    : '<p class="text-muted small">Aucune information complémentaire disponible pour ce métier.</p>') +
    '<div class="mt-3"><button type="button" class="btn btn-primary w-100" id="btnChoisirCeMetierDescriptif">&#127919; Choisir ce métier</button></div>';
  var panneau = ouvrirPanneauGuide(titre, contenu);
  panneau.querySelector('#btnChoisirCeMetierDescriptif').addEventListener('click', function () {
    fermerPanneauGuide();
    ajouterMetierCandidat(nom, rerender);
    rerender();
  });
}

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
    ' title="' + (bloque ? 'Retirez d\'abord un métier cible pour en ajouter un autre' : 'Définir comme métier cible') + '">' +
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
      ouvrirDescriptifMetier(this.dataset.metierCible, rerender);
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
  if (!liste.length) { return '<p class="text-muted small">Aucun métier recommandé pour le moment.</p>'; }
  return '<p class="mb-2">' + animationCliquezIci() + ' Cliquez sur un métier pour le définir comme métier cible (CV, lettre, entretien).</p>' +
    '<div class="metiers-chips">' + liste.map(function (nom, i) { return carteMetierResumeHTML(nom, 'metiers', i); }).join('') + '</div>';
}
// Sous-section 3 : "Ajouter un metier" -- moteur de recherche intelligent
// (rechercherMetiersPourAjout, meme moteur que la barre de recherche ERIP).
// Seule la zone de resultats se rafraichit a la frappe (pas toute la page),
// pour ne jamais perdre le focus du champ.
function contenuAjouterMetier() {
  return '<p class="mb-2">Recherchez un métier, une compétence, une valeur, ou décrivez ce que vous cherchez :</p>' +
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
      : (normaliserTexte(texte).trim().length >= 2 ? '<p class="text-muted small">Aucun métier trouvé.</p>' : '');
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
// TACHE (retour utilisateur : compétences invisibles après import) :
// categorieCompetence est une table FIGEE (~50 libelles internes du
// referentiel de l'app) -- une competence extraite par l'IA depuis un vrai
// CV ("Pilotage operationnel du projet", "Recueil et analyse des besoins
// de formation"...) n'y figure presque jamais mot pour mot, et etait donc
// silencieusement ecartee du comptage/affichage (categorieReelleCompetence(c)
// === undefined, ni "Savoir-etre" ni "Savoir-faire"). Corrige : toute
// competence NON reconnue dans la table (donc typiquement une competence
// importee) est desormais rattachee par defaut au bucket "Savoir-faire" --
// choix pragmatique assumee (la plupart des competences professionnelles
// extraites d'un CV reel sont des savoir-faire), pas une categorisation
// fiable a 100%. A ajuster si besoin d'une repartition plus precise.
function savoirEtreActuels() {
  return deduireCompetences().filter(function (c) { return categorieReelleCompetence(c) === 'Savoir-etre'; });
}
function savoirFaireActuels() {
  return deduireCompetences().filter(function (c) {
    var cat = categorieReelleCompetence(c);
    return cat === 'Savoir-faire' || cat === undefined;
  });
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
// TACHE (retour utilisateur : compétences sans métier associé dans le
// référentiel -- ex. "Persévérance"/"Entraide"/"Stabilité"/"Respect des
// règles", déduites des loisirs mais jamais tagguées sur aucun des ~65
// métiers du référentiel) : repli sur metiersRecommandes() (déjà calculé
// pour le bloc "Métiers recommandés", aucune logique dupliquée), pour
// TOUJOURS pouvoir choisir un métier depuis ce panneau, meme sans
// correspondance directe -- reutilise par les 3 panneaux "competence"/
// "critere" ci-dessous.
function lignesMetiersAssociesOuRepli(metiers, max) {
  var utilises = metiers.length
    ? metiers
    : metiersRecommandes().slice(0, max).map(function (nom) { return metierParNom(nom); }).filter(Boolean);
  if (!utilises.length) { return '<p class="text-muted small">Aucun métier associé trouvé pour le moment.</p>'; }
  var intro = metiers.length ? '' :
    '<p class="text-muted small mb-2">Aucun métier n\'est directement lié à cette compétence dans notre référentiel, mais voici ' +
    (max === 1 ? 'un métier recommandé pour vous' : 'des métiers recommandés pour vous') + ' :</p>';
  return intro + utilises.map(function (m) {
    var lienRome = m.rome
      ? '<a href="' + lienFicheROME(m) + '" target="_blank" rel="noopener" class="ms-2" title="Ouvrir la fiche ROME">&#128206;</a>'
      : '';
    return '<div class="ligne-metier-associe" data-metier-nom-cible="' + echapperAttribut(m.nom) + '">' +
      '<span>' + m.nom + '</span>' + lienRome + '</div>';
  }).join('');
}
function ouvrirPanneauMetierUniquePourCible(competence, rerender) {
  var meilleur = meilleurMetierAssocie(trouverMetiersAssocies(competence, 20));
  var lignes = lignesMetiersAssociesOuRepli(meilleur ? [meilleur] : [], 1);
  var panneau = ouvrirPanneauGuide('&#128218; ' + competence,
    '<p class="text-muted small">Une piste à explorer, au regard de cette compétence :</p>' + lignes);
  panneau.querySelectorAll('[data-metier-nom-cible]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; }
      ouvrirDescriptifMetier(this.dataset.metierNomCible, rerender);
    });
  });
}
function ouvrirPanneauMetiersListePourCible(competence, rerender) {
  var metiers = trouverMetiersAssocies(competence, 5);
  var lignes = lignesMetiersAssociesOuRepli(metiers, 5);
  var panneau = ouvrirPanneauGuide('&#128218; ' + competence,
    '<p class="text-muted small">Quelques pistes où cette compétence peut être utile :</p>' + lignes);
  panneau.querySelectorAll('[data-metier-nom-cible]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; }
      ouvrirDescriptifMetier(this.dataset.metierNomCible, rerender);
    });
  });
}
function ouvrirPanneauChoixMetiersAssocies(competence, rerender) {
  var panneau = ouvrirPanneauGuide('&#128218; ' + competence,
    '<p class="text-muted small mb-3">Que souhaitez-vous voir ?</p>' +
    '<div class="d-flex flex-column gap-2">' +
    '<button type="button" class="choix-panneau-competence" data-choix-panneau-competence="unique">' +
    '&#129517; Une piste à explorer</button>' +
    '<button type="button" class="choix-panneau-competence" data-choix-panneau-competence="liste">' +
    '&#128203; Quelques pistes à explorer (jusqu\'à 5)</button>' +
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
  if (!noms.length) { return '<p class="text-muted small">Aucun autre métier disponible avec ces critères pour le moment.</p>'; }
  return '<p class="mb-2">' + animationCliquezIci() + ' Cliquez sur un métier pour le définir comme métier cible (CV, lettre, entretien).</p>' +
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
        ' title="' + (bloque ? 'Retirez d’abord un métier cible pour en ajouter un autre' : 'Définir comme métier cible') + '">' +
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
      id: 'explorer', titre: 'Explorer d’autres métiers',
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
  var lignes = lignesMetiersAssociesOuRepli(meilleur ? [meilleur] : [], 1);
  var panneau = ouvrirPanneauGuide('&#128218; ' + label,
    '<p class="text-muted small">Une piste à explorer, au regard de ce critère :</p>' + lignes);
  panneau.querySelectorAll('[data-metier-nom-cible]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; }
      ouvrirDescriptifMetier(this.dataset.metierNomCible, rerender);
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
  var messageOrigine = (pointsFortsSynthese().length === 0 && ((dossier.competencesCV || []).length > 0 || (dossier.savoirsCV || []).length > 0))
    ? '<p class="text-muted small mb-2">Ce résumé s’appuie surtout sur les réponses du questionnaire « Mon Projet » — ' +
      'les compétences de votre CV importé sont déjà prises en compte ci-dessous et dans « Métiers recommandés ».</p>'
    : '';
  if (!metiersTop.length) { return messageOrigine + '<p class="text-muted small">Rien renseigné pour le moment.</p>'; }
  return messageOrigine + '<p class="mb-2 fw-semibold small">Les métiers qui correspondent le mieux à l’ensemble de vos critères :</p>' +
    '<div class="metiers-chips">' + metiersTop.map(function (m) {
      var bloque = metierEstBloque(m.nom);
      var lienRome = m.rome
        ? '<a href="' + lienFicheROME(m) + '" target="_blank" rel="noopener" class="rome-link" title="Fiche ROME ' + m.rome + '">&#128279;</a>'
        : '';
      return '<span class="metier-chip' + (bloque ? ' metier-chip-bloque' : '') + '"' +
        (bloque ? '' : ' data-metier-cible="' + echapperAttribut(m.nom) + '"') +
        ' title="' + (bloque ? 'Retirez d’abord un métier cible pour en ajouter un autre' : '') + '">' + m.nom + ' ' + lienRome + '</span>';
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
      'title="Voir le métier le plus lié">' + echapperAttribut(p.label) + '</span>';
  }).join('');
}
var CONFIG_BLOC_CORRESPONDANCE = {
  id: 'correspondance', icone: '&#128161;', titre: 'Ce qui vous correspond',
  masquerReset: true, // synthese derivee automatiquement, rien a "effacer" ici
  masquerResumeSiFerme: true, // TACHE (complement, allegement visuel) : voir blocERIP()
  // TACHE (retour utilisateur : "0 points forts" pour un profil importe) :
  // pointsFortsSynthese() ne repose QUE sur le questionnaire guide
  // (activites/actions/environnement/valeurs) -- vide pour une personne
  // passee par l'import de CV, sans lien possible avec le texte libre du
  // CV (aucune fonction de rapprochement CV importe <-> ces catalogues
  // n'existe aujourd'hui, contrairement a ce qu'un commentaire plus bas
  // laissait supposer). Plutot que de forcer de faux "points forts" non
  // cliquables utilement (aucun metier associe trouvable pour du texte
  // libre), le compteur reste honnete dans ce cas precis.
  compteurTexte: function () {
    var n = pointsFortsSynthese().length;
    if (n === 0 && ((dossier.competencesCV || []).length > 0 || (dossier.savoirsCV || []).length > 0)) {
      return 'basé sur le questionnaire';
    }
    return n + ' points forts';
  },
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

  var messageAime = construireMessageAime();
  // TACHE (retour utilisateur : blocs bases sur le questionnaire, sans
  // interet pour un CV importe) : "Ce qui fait votre valeur" et "Ce qui
  // vous correspond" derivent entierement des reponses au questionnaire
  // guide (activites/actions/environnement/valeurs) -- vides ou quasi
  // vides pour "j'ai un cv"/"mettre a jour mon cv". Plutot que d'afficher
  // un message de repli ("base sur le questionnaire"), ces deux blocs sont
  // desormais entierement masques hors parcours "creer un cv" (nouveau).
  var afficherBlocsQuestionnaire = (dossier.modeCreation === 'nouveau');
  // TACHE (retour utilisateur : le choix du bloc Candidature determine
  // ENTIEREMENT le comportement de Potentiel -- dernier point fonctionnel
  // de la refonte, solution 1) : en mode "domaine", "Metiers recommandes",
  // "Autres pistes" ET "Ce qui vous correspond" (les 3 seuls blocs, hors
  // banniereMetierCible deja geree a part, qui permettent de cibler un
  // metier precis via clic -- ce 3e bloc via ses pastilles de resume
  // "Voir le metier le plus lie" ET sa sous-section "En savoir plus") sont
  // entierement masques. Un clic ne peut donc plus jamais remplacer
  // silencieusement un domaine deja choisi -- en mode "metier", rien ne change.
  var modeDomaineEffectif = modeRechercheEffectif() === 'domaine';
  var html = afficherProgression('revelation') +
    '<div class="text-center"><h1>&#128302; Révélons votre potentiel</h1>' +
    '<p class="sousTitre">Au-delà de votre expérience, voici ce qui fait votre valeur.</p></div>' +
    // TACHE (retour utilisateur) : accordeon (reutilise blocAccordeon(),
    // meme principe que afficherCompetencesDetectees()/messageVAE()) --
    // icone DIFFERENTE de celle des 4 pages precedentes (voir
    // afficherCompetencesDetectees()), + compteur visible sans deplier.
    (afficherBlocsQuestionnaire
      ? blocAccordeon('potentiel-identifie',
          '&#128142; Ce qui fait votre valeur <span class="badge bg-primary ms-1">' + messageAime.nombre + '</span>',
          'Au-delà de votre expérience, l\'assistant a identifié ceci chez vous.',
          'Vous aimez : <strong>' + messageAime.texte + '</strong>')
      : '') +
    banniereMetierCible() +
    banniereJePostule() +
    messageVAE() +
    (modeDomaineEffectif ? '' : blocERIP(CONFIG_BLOC_METIERS)) +
    blocERIP(CONFIG_BLOC_PROFIL) +
    (afficherBlocsQuestionnaire && !modeDomaineEffectif ? blocERIP(CONFIG_BLOC_CORRESPONDANCE) : '') +
    (modeDomaineEffectif ? '' : blocERIP(CONFIG_BLOC_PISTES)) +
    barreNavigation('projet', 'resultats', '&#128640; Passer à l’action', { onclickSuivant: 'verifierAvantPasserAction()' });
  app.innerHTML = html;

  if (!modeDomaineEffectif) { wireBlocERIP(CONFIG_BLOC_PISTES, function () { pageRevelation(true); }); }

  if (afficherBlocsQuestionnaire && !modeDomaineEffectif) { wireBlocERIP(CONFIG_BLOC_CORRESPONDANCE, function () { pageRevelation(true); }); }

  wireBlocERIP(CONFIG_BLOC_PROFIL, function () { pageRevelation(true); });

  if (!modeDomaineEffectif) { wireBlocERIP(CONFIG_BLOC_METIERS, function () { pageRevelation(true); }); }

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
    'le tourisme et les services. Niveaux du cadre européen : A1 débutant à C2 langue maternelle.</p>' +
    '<div class="row g-2 mt-2 align-items-center">' +
    '<div class="col-md-5"><select class="form-select form-select-sm" id="langueSelect"><option value="">Choisir une langue</option>' + options + '<option value="__autre">Autre...</option></select></div>' +
    '<div class="col-md-3"><input type="text" class="form-control form-control-sm d-none" id="langueAutre" placeholder="Préciser la langue"></div>' +
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
  var photo = dossier.photo || { url: null, inclure: false };
  // TACHE (photo optionnelle, retour utilisateur : "les personnes que
  // j'accompagne et les CIP ne sont pas forcement favorables aux photos") :
  // upload facultatif + case a cocher separee ("inclure sur le CV"),
  // decochee par defaut MEME si une photo est deja telechargee -- jamais
  // d'inclusion automatique. Stockee en base64 (dossier.photo.url), pas
  // de televersement serveur (l'app n'en a pas).
  var apercuPhoto = photo.url
    ? '<img src="' + photo.url + '" alt="Aperçu" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #E5E7EB;">'
    : '<div style="width:64px;height:64px;border-radius:8px;border:1px dashed #D1D5DB;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:0.7rem;text-align:center;">Aucune<br>photo</div>';
  var blocPhoto =
    '<div class="d-flex align-items-center gap-3 mt-3 p-2" style="background:#F9FAFB;border-radius:8px;">' +
    apercuPhoto +
    '<div class="flex-grow-1">' +
    '<label class="btn btn-sm btn-outline-secondary mb-1" for="inputPhotoIdentite">' + (photo.url ? 'Changer la photo' : 'Ajouter une photo (facultatif)') + '</label>' +
    '<input type="file" accept="image/*" id="inputPhotoIdentite" class="visually-hidden">' +
    (photo.url ? ' <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2" id="btnSupprimerPhoto">Retirer</button>' : '') +
    '<div class="form-check mt-1">' +
    '<input class="form-check-input" type="checkbox" id="checkInclurePhoto"' + (photo.inclure ? ' checked' : '') + (photo.url ? '' : ' disabled') + '>' +
    '<label class="form-check-label small" for="checkInclurePhoto">Inclure ma photo sur les modèles de CV qui le permettent</label>' +
    '</div>' +
    // TACHE (retour utilisateur : bouton visible a tort) : n'a de sens que
    // pour quelqu'un arrive ici via "Ajouter/Changer ma photo" depuis la
    // page Action (etatVenantDePhotoAction) -- sinon, cliquer dessus
    // renverrait vers un apercu de document pas forcement redige, et la
    // personne se retrouverait perdue en plein milieu de son parcours.
    (etatVenantDePhotoAction
      ? '<button type="button" class="btn btn-primary btn-sm mt-2" id="btnValiderPhotoRetourApercu">&#10003; Valider et revenir à l’aperçu du CV</button>'
      : '') +
    '</div>' +
    '</div>';
  return '<div id="zoneIdentiteChamps">' +
    '<div class="d-flex flex-wrap gap-2 mb-2">' +
    '<span class="pastille' + (civiliteVal === 'Madame' ? ' actif' : '') + '" data-civilite="Madame">Madame</span>' +
    '<span class="pastille' + (civiliteVal === 'Monsieur' ? ' actif' : '') + '" data-civilite="Monsieur">Monsieur</span>' +
    '<span class="pastille' + (!civiliteVal ? ' actif' : '') + '" data-civilite="">Ne pas préciser</span>' +
    '</div>' +
    '<div class="row g-2">' +
    '<div class="col-6 col-md-3"><input type="text" class="form-control form-control-sm" id="identiteNom" placeholder="Nom" value="' + echapperAttribut(id.nom) + '"></div>' +
    '<div class="col-6 col-md-3"><input type="text" class="form-control form-control-sm" id="identitePrenom" placeholder="Prénom" value="' + echapperAttribut(id.prenom) + '"></div>' +
    '<div class="col-6 col-md-3"><input type="tel" class="form-control form-control-sm" id="identiteTelephone" placeholder="Téléphone" value="' + echapperAttribut(id.telephone) + '"></div>' +
    '<div class="col-6 col-md-3"><input type="email" class="form-control form-control-sm" id="identiteEmail" placeholder="E-mail" value="' + echapperAttribut(id.email) + '"></div>' +
    '</div>' +
    '<div class="row g-2 mt-1">' +
    '<div class="col-6"><input type="text" class="form-control form-control-sm" id="identiteAdresse" placeholder="Adresse postale" value="' + echapperAttribut(id.adresse) + '"></div>' +
    '<div class="col-3"><input type="text" class="form-control form-control-sm" id="identiteCodePostal" placeholder="Code postal" value="' + echapperAttribut(id.codePostal) + '"></div>' +
    '<div class="col-3"><input type="text" class="form-control form-control-sm" id="identiteVille" placeholder="Ville" value="' + echapperAttribut(id.ville) + '"></div>' +
    '</div>' +
    blocPhoto +
    '</div>';
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
    html += '<div class="mt-3"><p class="mb-2">Catégories obtenues (cliquez pour sélectionner) :</p>' + boutonsPermis + '</div>';
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

// TACHE (Tache 1 : formations en tableau) : formulaire d'AJOUT (plus une
// selection unique). Le niveau choisi par pastille + l'intitule + l'annee
// forment un brouillon (brouillonFormationEnCours, jamais ecrit directement
// dans dossier.formations). Le bouton "+ Ajouter" (cable dans wireFormation)
// pousse ce brouillon dans le tableau. La liste des formations deja
// ajoutees s'affiche dans le resume du bloc "Parcours" (resumeParcours()),
// pas ici -- meme principe que les experiences.
function contenuFormations() {
  var nf = brouillonFormationEnCours || null;
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
    '<div class="pastilles mb-2">' + pastillesNiveau + '</div>' +
    '<button class="btn btn-primary btn-sm" id="ajouterFormationBtn"' + (nf ? '' : ' disabled') + '>+ Ajouter</button>';
}

// Conservee pour compatibilite (plus appelee par pageProjet depuis l'Etape C).
function blocFormations() {
  var formHtml = dossier.formations.map(function (f, i) {
    var label = f.niveau + (f.intitule ? ' — ' + f.intitule : '') + (f.annee ? ' (' + f.annee + ')' : '');
    return '<div class="cv-item"><div><strong>' + label + '</strong>' +
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
// que le metier soit deja choisi ou non : il aide a completer les
// informations de candidature utiles au CV, a la lettre et a l'entretien.
// TACHE (retour utilisateur) : ne verifie plus que la candidature (voir
// blocPersonnaliserCandidature() ci-dessous) -- l'ancienne verification a 4
// criteres (informationsSuffisantesPourCVSpecifique) est retiree, devenue
// inutilisee suite a ce changement.
function blocPersonnaliserCandidature() {
  // TACHE (retour utilisateur : candidature deja suffisante = specifique
  // automatique) : ce bouton ("Completer mon dossier") ne concerne plus que
  // la candidature (structure/poste/site) -- verifie desormais avec
  // informationsCandidatureSuffisantes() (candidature seule), pas le
  // controle plus large a 4 criteres (permis/formations/metier inclus), qui
  // n'a plus de rapport avec ce que ce bouton ouvre desormais.
  if (dossier.typeCV !== 'specifique' || informationsCandidatureSuffisantes()) { return ''; }
  return '<div class="mt-3 mb-2">' +
    '<button class="btn btn-outline-primary btn-lg" id="btnPersonnaliserCandidature">&#10024; Compléter mon dossier</button>' +
    '<p class="text-muted small mt-2">Complétez quelques informations pour obtenir des documents plus personnalisés.</p>' +
    '</div>';
}

// Complement tache 8 : choix exclusif CV general / CV specifique, affiche au-dessus
// des cartes "Creer votre CV / Lettre de motivation / Preparer un entretien".
// TACHE (retour utilisateur, comportement confirme) : si les informations de
// candidature (page Potentiel) sont deja suffisantes, "CV specifique" n'est
// plus impose automatiquement -- une seule pastille "CV general" est
// affichee au depart. Cliquer dessus revele "CV specifique" a cote (les 2
// options deviennent visibles). Cliquer sur "CV specifique" (ici ou dans le
// cas normal ci-dessous) ouvre systematiquement la fenetre "Votre
// candidature", deja pre-remplie si les informations existent deja.
var revelerSpecifiqueCandidatureRemplie = false;
function blocTypeCV() {
  if (informationsCandidatureSuffisantes()) {
    var revele = revelerSpecifiqueCandidatureRemplie || dossier.typeCV === 'specifique';
    var estGeneralActif = dossier.typeCV !== 'specifique';
    var html = '<div class="type-cv-choix">' +
      '<button type="button" class="pastille-selection" data-typecv-candidature-remplie="general" style="' +
      stylePastilleInline(estGeneralActif) + '">CV général</button>';
    if (revele) {
      html += '<button type="button" class="pastille-selection" data-typecv-candidature-remplie="specifique" style="' +
        stylePastilleInline(!estGeneralActif) + '">CV spécifique</button>';
    }
    html += '</div>';
    return html;
  }
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
// TACHE (retour utilisateur : navigation libre entre CV/Lettre/Entretien) :
// un etat de pyramide DISTINCT par type de document -- avant cette tache,
// etatAccordeon etait un objet UNIQUE partage par les 3 documents, remis a
// zero (ou force sur une etape precise) a chaque changement de document,
// meme pour revenir sur un document deja termine. "etatAccordeon" reste la
// variable lue/modifiee par tout le reste du code (etapeAtteinte, ouvert,
// avancerEtape...) -- accordeonPourType() la fait simplement POINTER vers
// le bon "tiroir" avant chaque rendu de pageResultats(), sans toucher a
// aucune des ~25 lectures/ecritures existantes ailleurs dans ce fichier.
var etatAccordeonParType = {};
function accordeonPourType(type) {
  if (!etatAccordeonParType[type]) { etatAccordeonParType[type] = { 'adaptation-metier': true }; }
  return etatAccordeonParType[type];
}
// TACHE (retour utilisateur : bouton "Valider et revenir a l'apercu du CV"
// visible a tort) : ce bouton n'a de sens QUE si la personne est arrivee
// ici via "Ajouter/Changer ma photo" depuis la page Action -- sinon, elle
// n'a pas forcement prepare de CV et se retrouverait perdue en cliquant
// dessus (renvoyee vers un aperçu de document jamais redige). Flag
// transitoire (jamais sauvegarde), pose au clic sur ce bouton cote Action,
// leve des que le bouton "Valider" est utilise ou que la personne quitte
// la sous-section Identite.
var etatVenantDePhotoAction = false;

// TACHE (page Action, navigation guidee) : helper generique -- ferme une
// etape et ouvre la suivante, reutilise par tous les parcours en accordeons
// (pas seulement la page Action). Ne supprime rien : l'etape fermee reste
// visible et rouvrable (etatAccordeon ne fait que basculer un booleen).
function avancerEtape(idActuel, idSuivant) {
  etatAccordeon[idActuel] = false;
  etatAccordeon[idSuivant] = true;
}

// TACHE (page Action, "pastille generique") : composant unique reutilisable
// pour toute selection a choix unique (remplace les radios HTML natifs).
// Scope actuel : page Action uniquement (valide ainsi), generalisable
// ensuite sans modification -- stylePastilleInline()/pastillesSelection()
// ne dependent d'aucun contexte specifique a "Adaptation au metier".
function stylePastilleInline(actif) {
  return 'display:inline-block;padding:0.45rem 1rem;margin:0.25rem 0.4rem 0.25rem 0;border-radius:999px;' +
    'font-size:0.9rem;cursor:pointer;transition:background .15s,border-color .15s,color .15s;' +
    (actif
      ? 'background:#0d6efd;color:#FFFFFF;border:2px solid #0d6efd;'
      : 'background:#F3F4F6;color:#374151;border:2px solid #E5E7EB;');
}
function pastillesSelection(champ, options, valeurActuelle) {
  return options.map(function (opt) {
    var actif = (opt.valeur === valeurActuelle);
    return '<button type="button" class="pastille-selection" data-pastille-champ="' + champ + '" ' +
      'data-pastille-valeur="' + opt.valeur + '" aria-pressed="' + actif + '" style="' + stylePastilleInline(actif) + '">' +
      opt.label + '</button>';
  }).join('');
}

// TACHE (page Action, "champs standardises") : uniformise les champs texte
// de la page (hauteur/police), majuscule automatique en premiere position,
// et Entree -> passe au champ suivant (uniquement pour les <input>, jamais
// pour les <textarea> ou Entree doit rester un retour a la ligne normal).
// Scope actuel : page Action uniquement (comme convenu), appelable ailleurs
// tel quel plus tard sans modification.
// TACHE (page Action, "selecteur de dates") : remplace le calendrier HTML
// natif (input type="month", peu adapte -- mois et annee geres par le meme
// widget navigateur, lent a utiliser pour des periodes anciennes) par deux
// listes deroulantes independantes (mois francais en toutes lettres, annee
// en chiffres). Le mois ne genera jamais le choix de l'annee et vice-versa
// puisque ce sont deux controles distincts. Format de stockage INCHANGE
// ("AAAA-MM", identique a l'ancien input month) pour ne rien casser des
// usages existants de dossier.experiences[].dateDebut/dateFin ailleurs
// dans l'appli (rendu CV, etc.).
var MOIS_FRANCAIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
function selectMoisAnnee(idBase, valeurActuelle, optionnelEnCours) {
  var moisVal = '', anneeVal = '';
  if (valeurActuelle) {
    var p = valeurActuelle.split('-');
    anneeVal = p[0];
    moisVal = p[1];
  }
  var optionsMois = (optionnelEnCours ? '<option value="">En cours</option>' : '<option value="">Mois</option>') +
    MOIS_FRANCAIS.map(function (nom, i) {
      var v = (i + 1 < 10 ? '0' : '') + (i + 1);
      return '<option value="' + v + '"' + (v === moisVal ? ' selected' : '') + '>' + nom + '</option>';
    }).join('');
  var anneeCourante = new Date().getFullYear();
  var optionsAnnee = '<option value="">Année</option>';
  for (var a = anneeCourante + 1; a >= anneeCourante - 60; a--) {
    optionsAnnee += '<option value="' + a + '"' + (String(a) === anneeVal ? ' selected' : '') + '>' + a + '</option>';
  }
  return '<div class="d-flex gap-2">' +
    '<select class="form-select form-select-sm" id="' + idBase + 'Mois" style="height:2.75rem;flex:1;">' + optionsMois + '</select>' +
    '<select class="form-select form-select-sm" id="' + idBase + 'Annee" style="height:2.75rem;flex:1;">' + optionsAnnee + '</select>' +
    '</div>';
}
function lireValeurMoisAnnee(idBase) {
  var mois = document.getElementById(idBase + 'Mois');
  var annee = document.getElementById(idBase + 'Annee');
  // TACHE (page Action, validation allegee) : l'annee seule est valide (le
  // mois reste facultatif) -- seule l'annee est desormais obligatoire pour
  // une experience (voir ajouterExpBtn plus bas).
  if (!annee || !annee.value) { return ''; }
  return (mois && mois.value) ? (annee.value + '-' + mois.value) : annee.value;
}

function activerChampsStandardises(racine) {
  racine = racine || document;
  // TACHE (retour utilisateur : bandeau Candidature) : la navigation par
  // Entree couvre desormais aussi url/tel/email (ex. le lien d'offre), mais
  // la majuscule automatique reste reservee au texte libre (type="text") --
  // une adresse internet ne doit jamais etre mise en majuscule.
  var champsNavigables = Array.prototype.slice.call(racine.querySelectorAll('input[type="text"], input[type="url"], input[type="tel"], input[type="email"]'));
  champsNavigables.forEach(function (champ, index) {
    champ.style.cssText += 'height:2.75rem;font-size:1rem;padding:0.5rem 0.75rem;';
    if (champ.type === 'text') {
      champ.addEventListener('input', function () {
        if (this.value.length > 0 && this.value.charAt(0) !== this.value.charAt(0).toUpperCase()) {
          var position = this.selectionStart;
          this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1);
          this.setSelectionRange(position, position);
        }
      });
    }
    champ.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') { return; }
      e.preventDefault();
      var suivant = champsNavigables[index + 1];
      if (suivant) { suivant.focus(); } else { champ.blur(); }
    });
  });
  Array.prototype.slice.call(racine.querySelectorAll('textarea')).forEach(function (zone) {
    zone.style.cssText += 'font-size:1rem;padding:0.5rem 0.75rem;';
  });
}

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
      var futureOuvert = !etatAccordeon[id];
      // TACHE (retour utilisateur : une seule pyramide ouverte a la fois) :
      // en ouvrir une ferme automatiquement toutes les autres deja
      // ouvertes -- etapeAtteinte() ne regarde que etatAccordeon[id] !==
      // undefined, jamais sa valeur, donc les etapes deja visitees restent
      // bien affichees (juste repliees), rien n'est "oublie".
      if (futureOuvert) {
        Object.keys(etatAccordeon).forEach(function (autreId) {
          if (autreId !== id && etatAccordeon[autreId] === true) { etatAccordeon[autreId] = false; }
        });
      }
      etatAccordeon[id] = futureOuvert;
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
      // TACHE (complement) : les boutons speciaux d'un bloc (facultatif,
      // via config.boutonsSpeciaux) restent visibles meme replie, pour
      // pouvoir changer d'avis a tout moment sans avoir a ouvrir le bloc.
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
    // TACHE (retour utilisateur : visuel de complétion par sous-section) :
    // chaque sous-section a deja un booleen "complet" (utilise depuis le
    // debut pour le compteur X/Y du bloc, voir compteurBlocERIP()) --
    // simplement jamais affiche individuellement jusqu'ici. Vert = deja
    // rempli (par la personne OU pre-rempli par l'appli, ex. import CV,
    // peu importe l'origine) ; gris = encore a completer, pour inciter au
    // clic sans donner l'impression d'un probleme (pas rouge).
    var estComplet = !!s.complet();
    var indicateurSousSection = '<span class="accordeon-erip-check' + (estComplet ? ' complet' : '') + '" ' +
      'title="' + (estComplet ? 'Renseigné' : 'À compléter') + '">&#10003;</span>';
    return '<div class="accordeon-erip' + (ouvert ? ' ouvert' : '') + (enEvidence ? ' a-completer' : '') + '" id="' + idCorps + '">' +
      '<button type="button" class="accordeon-erip-entete" data-bloc-accordeon="' + config.id + '" data-sous-section="' + s.id + '">' +
      '<span>&#9656; ' + s.titre + '</span>' +
      '<span class="accordeon-erip-droite">' +
      (icone ? '<span class="accordeon-erip-icone" title="' + echapperAttribut(infoBulle) + '">' + icone + '</span>' : '') +
      indicateurSousSection +
      '</span>' +
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
  // Cablage des boutons speciaux d'un bloc (facultatif, via
  // config.wireBoutonsSpeciaux), toujours presents, meme quand aucun
  // accordeon n'est ouvert.
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
  var champsRenseignes = [id.civilite, id.prenom, id.nom, id.adresse, id.telephone, id.email, id.ville].filter(Boolean);
  if (champsRenseignes.length) {
    var tooltip = [id.civilite, id.prenom, id.nom].filter(Boolean).join(' ') +
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
    dossier.identite.telephone = ''; dossier.identite.email = ''; dossier.identite.ville = '';
  }
  else if (item.source === 'permis') { dossier.permis.possede = null; dossier.permis.categories = []; dossier.permis.vehicule = null; }
  else if (item.source === 'langue') { dossier.langues.splice(item.index, 1); }
}
function identiteEstComplete() {
  var id = dossier.identite || {};
  // TACHE (retour utilisateur : adresse postale facultative) : retiree des
  // champs obligatoires -- sans pour autant la marquer "facultatif" dans
  // son placeholder (voir contenuIdentite()), a la difference d'autres
  // champs deja explicitement marques comme tels ailleurs dans l'app.
  return !!(id.nom && id.prenom && id.telephone && id.email && id.civilite);
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
  // TACHE (retour utilisateur : retrait Anonymiser, nettoyage final) :
  // boutons Anonymiser/Personnaliser/"A quoi servent ces informations ?"
  // retires (boutonsSpeciauxVous(), ouvrirModaleInfoIdentite() et
  // blocIdentite() supprimees, plus aucun appelant nulle part).
  resume: resumeVous,
  resumeOnSuppression: resumeOnSuppressionVous,
  onResetTout: function () {
    dossier.identite = { civilite: null, nom: '', prenom: '', adresse: '', codePostal: '', telephone: '', email: '', ville: '' };
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
// TACHE (refonte Mon projet, Etape C) : configuration reelle du bloc
// "Parcours" (Formations, Certifications, Expériences et savoir-faire
// personnels). Meme logique de resume unifie + suppression ciblee que le
// bloc "Vous".
function resumeParcours() {
  var items = [];
  // TACHE (Tache 1 : formations en tableau) : meme motif que certifications
  // juste en dessous -- une entree par element du tableau, avec son index
  // pour permettre la suppression ciblee.
  (dossier.formations || []).forEach(function (f, i) {
    var label = f.niveau + (f.intitule ? ' — ' + f.intitule : '') + (f.annee ? ' (' + f.annee + ')' : '');
    items.push({ label: label, source: 'formation', index: i });
  });
  (dossier.certifications || []).forEach(function (c, i) { items.push({ label: c, source: 'certification', index: i }); });
  return items;
}
function resumeOnSuppressionParcours(idx) {
  var item = resumeParcours()[idx];
  if (!item) { return; }
  if (item.source === 'formation') { dossier.formations.splice(item.index, 1); }
  else if (item.source === 'certification') { dossier.certifications.splice(item.index, 1); }
}
// TACHE (retour utilisateur : bloc "Experiences et savoir-faire personnels"
// autonome) : extrait de Parcours, meme donnees (dossier.experiencesPerso),
// aucune logique dupliquee -- juste sorti de son bloc d'origine.
function resumeExperiencesPerso() {
  return (dossier.experiencesPerso || []).map(function (e, i) {
    return { label: e.intitule, source: 'experiencePerso', index: i };
  });
}
function resumeOnSuppressionExperiencesPerso(idx) {
  var item = resumeExperiencesPerso()[idx];
  if (!item) { return; }
  if (item.source === 'experiencePerso') { dossier.experiencesPerso.splice(item.index, 1); }
}
var CONFIG_BLOC_PARCOURS = {
  id: 'parcours', icone: '&#127891;', titre: 'Parcours',
  resume: resumeParcours,
  resumeOnSuppression: resumeOnSuppressionParcours,
  onResetTout: function () {
    dossier.formations = [];
    dossier.certifications = [];
    dossier.catalogueActif = dossier.catalogueActif || {};
    delete dossier.catalogueActif.certifications;
  },
  sousSections: function () {
    var sections = [];
    // TACHE 8 (regle preexistante, preservee) : Formations masquee si un CV
    // complet a deja ete depose ("J'ai deja un CV"), les formations y figurent deja.
    if (dossier.modeCreation !== 'pret') {
      sections.push({
        id: 'formations', titre: 'Formations et diplômes',
        complet: function () { return dossier.formations.length > 0; },
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
      complet: function () { return completOuiNonAvecContenu('certifications'); },
      contenuHTML: function () { return contenuCatalogueOuiNon(CONFIG_CERTIFICATIONS); },
      wire: function (rerender) { wireCatalogueOuiNon(CONFIG_CERTIFICATIONS, rerender); }
    });
    return sections;
  }
};

// TACHE (retour utilisateur : bloc autonome) : "Experiences et savoir-faire
// personnels", auparavant une sous-section de Parcours -- meme contenu
// (CONFIG_EXPERIENCES_PERSO, contenuCatalogueOuiNon, wireCatalogueOuiNon),
// juste sorti dans son propre bloc du tableau de bord.
var CONFIG_BLOC_EXPERIENCES_PERSO = {
  id: 'experiences-perso', icone: '&#127775;', titre: 'Expériences et savoir-faire personnels',
  resume: resumeExperiencesPerso,
  resumeOnSuppression: resumeOnSuppressionExperiencesPerso,
  onResetTout: function () {
    dossier.experiencesPerso = [];
    dossier.catalogueActif = dossier.catalogueActif || {};
    delete dossier.catalogueActif.experiencesPerso;
  },
  sousSections: function () {
    return [{
      id: 'experiencesPerso', titre: 'Expériences et savoir-faire personnels',
      complet: function () { return completOuiNonAvecContenu('experiencesPerso'); },
      contenuHTML: function () { return contenuCatalogueOuiNon(CONFIG_EXPERIENCES_PERSO); },
      wire: function (rerender) { wireCatalogueOuiNon(CONFIG_EXPERIENCES_PERSO, rerender); }
    }];
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
      id: 'accepte', titre: 'J’accepte également',
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
  var estImmersion = (o === 'stage' || o === 'alternance' || o === 'pmsmp');
  // TACHE (refonte Candidature/Potentiel, Etape 1) : nouveau choix, affiche
  // en premier -- purement additif, ne touche pas aux sources existantes
  // ci-dessous (structure/poste/lien/duree/dates/heures).
  // TACHE (retour utilisateur : informations qui s'interferent en changeant
  // d'objectif) : ces 3 puces n'ont de sens QUE pour offre/spontanee/
  // reconversion -- masquees pour stage/alternance/pmsmp, meme si des
  // valeurs residuelles trainent encore (choix fait avant de changer
  // d'objectif, desormais nettoye a la source aussi, voir pageObjectif()).
  if (!estImmersion) {
    if (dossier.modeRecherche === 'metier') { items.push({ label: 'Un métier précis', source: 'modeRecherche' }); }
    else if (dossier.modeRecherche === 'domaine') { items.push({ label: 'Plusieurs métiers d’un même domaine', source: 'modeRecherche' }); }
    if (dossier.typeRecherche === 'simple') { items.push({ label: 'Recherche simple', source: 'typeRecherche' }); }
    else if (dossier.typeRecherche === 'offre') { items.push({ label: 'Réponse à une offre', source: 'typeRecherche' }); }
    var rc = dossier.rechercheCandidature || {};
    if (rc.entreprise) { items.push({ label: rc.entreprise, source: 'rc-entreprise' }); }
    if (rc.lienOffre) { items.push({ label: rc.lienOffre, source: 'rc-lien' }); }
  }
  if (obj.structure) { items.push({ label: obj.structure, source: 'structure' }); }
  if (obj.poste) { items.push({ label: obj.poste, source: 'poste' }); }
  if (obj.lien) { items.push({ label: obj.lien, source: 'lien' }); }
  if (estImmersion) {
    if (obj.duree) { items.push({ label: obj.duree, source: 'duree' }); }
    if (obj.dates) { items.push({ label: obj.dates, source: 'dates' }); }
    if (obj.heures) { items.push({ label: obj.heures, source: 'heures' }); }
  }
  return items;
}
function resumeOnSuppressionCandidature(idx) {
  var item = resumeCandidature()[idx];
  if (!item) { return; }
  if (item.source === 'modeRecherche') { dossier.modeRecherche = null; dossier.typeRecherche = null; return; }
  if (item.source === 'typeRecherche') { dossier.typeRecherche = null; return; }
  if (item.source === 'rc-entreprise') { dossier.rechercheCandidature.entreprise = ''; return; }
  if (item.source === 'rc-lien') { dossier.rechercheCandidature.lienOffre = ''; return; }
  var o = dossier.objectif;
  var obj = o && dossier[o];
  if (!obj) { return; }
  obj[item.source] = '';
}
var CONFIG_BLOC_CANDIDATURE = {
  id: 'candidature', icone: '&#128221;', titre: 'Candidature',
  resume: resumeCandidature,
  resumeOnSuppression: resumeOnSuppressionCandidature,
  onResetTout: function () {
    var o = dossier.objectif;
    var obj = o && dossier[o];
    if (obj) {
      obj.lien = ''; obj.structure = ''; obj.poste = '';
      if (o === 'stage' || o === 'alternance' || o === 'pmsmp') {
        obj.duree = ''; obj.dates = ''; obj.heures = '';
      }
    }
    dossier.modeRecherche = null;
    dossier.typeRecherche = null;
    dossier.rechercheCandidature = { entreprise: '', lienOffre: '' };
  },
  // TACHE (retour utilisateur : 2 sous-sections qui se repetaient) : une
  // SEULE sous-section a la fois desormais, choisie selon l'objectif --
  // "Comment souhaitez-vous rechercher un emploi ?" pour offre/spontanee/
  // reconversion (ou le choix metier precis/domaine a un sens), "Informations
  // sur votre candidature" pour stage/alternance/pmsmp (rarement une
  // recherche par domaine -- voir modeRechercheEffectif()). resoudreSousSections()
  // sait deja appeler sousSections() quand c'est une fonction plutot qu'un
  // tableau fixe (meme mecanisme que "Formations", masquee selon le contexte).
  sousSections: function () {
    var o = dossier.objectif;
    if (o === 'stage' || o === 'alternance' || o === 'pmsmp') {
      return [
        {
          id: 'informations', titre: 'Informations sur votre candidature',
          complet: informationsCandidatureSuffisantes,
          contenuHTML: contenuCandidature,
          wire: function (rerender) { wireObjectifDetails(rerender); },
          enEvidence: function () { return doitMettreEnEvidence('candidature'); },
          clefEvidence: 'candidature'
        }
      ];
    }
    return [
      {
        id: 'modeRecherche', titre: 'Comment souhaitez-vous rechercher un emploi ?',
        complet: modeRechercheRempli,
        contenuHTML: contenuModeRecherche,
        wire: function (rerender) { wireModeRecherche(rerender); },
        enEvidence: function () { return false; },
        clefEvidence: null
      }
    ];
  }
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
      complet: function () { return completOuiNonAvecContenu('loisirs'); },
      contenuHTML: function () { return contenuCatalogueOuiNon(CONFIG_LOISIRS); },
      wire: function (rerender) { wireCatalogueOuiNon(CONFIG_LOISIRS, rerender); }
    },
    {
      id: 'engagements', titre: 'Engagements',
      complet: function () { return completOuiNonAvecContenu('engagements'); },
      contenuHTML: function () { return contenuCatalogueOuiNon(CONFIG_ENGAGEMENTS); },
      wire: function (rerender) { wireCatalogueOuiNon(CONFIG_ENGAGEMENTS, rerender); }
    }
  ]
};

// TACHE (refonte page Action, tache 1 : architecture generale) : la page
// Action devient un flux integre en une seule page, pilote par un
// selecteur de document (CV / Lettre / Entretien) et organise en
// accordeons. Cette tache pose UNIQUEMENT le squelette + le cablage de
// dossier.preferencesIA ; aucun traitement IA, aucun import, aucun apercu
// editable (taches dediees ulterieures -- voir accordeons "squelette"
// ci-dessous, clairement signales comme temporaires).
function pageResultats() {
  var carteChoisie = !!dossier.dernierDocumentPrepare;
  // TACHE (retour utilisateur : "Sélectionné" affiché sur une carte
  // verrouillée) : le repli par defaut pointait toujours vers 'cv', meme
  // quand cette carte est verrouillee (mode "pret") -- une carte pouvait
  // alors etre a la fois grisee ET marquee "Selectionne", deux etats
  // normalement incompatibles. Repli intelligent : pointe vers la premiere
  // carte reellement disponible.
  var docActif = docActifActuel();
  // TACHE (retour utilisateur : navigation libre entre CV/Lettre/Entretien) :
  // etatAccordeon pointe desormais vers le tiroir du document ACTIF avant
  // toute autre chose dans cette fonction -- voir accordeonPourType().
  etatAccordeon = accordeonPourType(docActif);

  // TACHE (retour utilisateur : validation trop stricte) : Entreprise et
  // Lieu sont desormais facultatifs -- sous-titre construit uniquement a
  // partir de ce qui est reellement renseigne, jamais de parenthese vide.
  var expHtml = dossier.experiences.map(function (e, i) {
    var sousTitre = [e.entreprise, e.lieu ? '(' + e.lieu + ')' : ''].filter(Boolean).join(' ');
    return '<div class="cv-item"><div><strong>' + e.poste + '</strong>' + (sousTitre ? ' &ndash; ' + sousTitre : '') + '<br><small>' + e.dateDebut + ' &rarr; ' + (e.dateFin || 'En cours') + '</small>' + (e.missions ? '<br><small class="text-muted">' + e.missions + '</small>' : '') + '</div><span class="remove-item" data-index="' + i + '" data-type="exp">&#10005;</span></div>';
  }).join('');

  var cvComplet = (dossier.modeCreation !== 'pret');
  // TACHE (migration "Mon CV") : ce formulaire d'ajout rapide d'experience
  // reste l'unique endroit de l'application qui alimente dossier.experiences
  // (verifie avant migration) -- il ne disparait pas, il rejoint simplement
  // l'accordeon "Informations transmises a l'IA" qu'il alimente directement.
  var sectionExperiences = '';
  if (cvComplet) {
    sectionExperiences =
      '<div class="mt-3"><h5>Expérience professionnelle</h5>' + (expHtml || '<p class="text-muted">Aucune expérience.</p>') +
      '<div class="row g-2 mt-2"><div class="col-md-4"><input type="text" class="form-control form-control-sm" id="expPoste" placeholder="Poste"></div>' +
      '<div class="col-md-4"><input type="text" class="form-control form-control-sm" id="expEntreprise" placeholder="Entreprise / proche"></div>' +
      '<div class="col-md-4"><input type="text" class="form-control form-control-sm" id="expLieu" placeholder="Lieu"></div></div>' +
      '<div class="row g-2 mt-1">' +
      '<div class="col-md-6"><label class="small text-muted mb-1">Date de début</label>' + selectMoisAnnee('expDateDebut', '', false) + '</div>' +
      '<div class="col-md-6"><label class="small text-muted mb-1">Date de fin</label>' + selectMoisAnnee('expDateFin', '', true) + '</div>' +
      '</div>' +
      '<div class="row g-2 mt-1"><div class="col-12">' +
      '<textarea class="form-control form-control-sm" id="expMissions" rows="2" placeholder="Missions / tâches principales (optionnel)"></textarea>' +
      '</div></div>' +
      '<button class="btn btn-primary btn-sm mt-2" id="ajouterExpBtn">+ Ajouter</button></div>';
  }

  // Selecteur de document : pilote l'ensemble de la page (accordeon
  // "Informations transmises a l'IA" adapte son apercu au document actif).
  // TACHE (page Action, "cartes agrandies") : styles en inline -- je n'ai
  // pas acces au vrai css/style.css de l'appli dans ce projet (deja signale
  // en tache 1), donc j'evite de toucher aux classes partagees existantes
  // (.outil-item/.outils-grid, toujours utilisees telles quelles par le
  // bloc "Ressources" plus bas) pour ne rien casser ailleurs.
  // TACHE (retour utilisateur) : titres d'etapes plus grands/engageants --
  // public avec peu d'autonomie informatique. Wrapper local uniquement
  // (n'affecte pas blocAccordeon(), toujours utilisee telle quelle ailleurs
  // dans l'appli, ex. Mon Projet).
  function titreEtape(html) {
    return '<span style="font-size:1.25rem;">' + html + '</span>';
  }

  // TACHE (retour utilisateur) : mini-animation CSS (pas de minuteur JS,
  // juste un keyframe qui boucle) pour rendre plus concrets les etapes
  // "Choisissez votre IA" et "Importer les informations IA" -- public avec
  // peu d'autonomie informatique, qui a besoin de VOIR ce qui va se passer.
  var styleMiniAnimation = '<style>@keyframes pulseEtapeIA{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(13,110,253,.35);}' +
    '50%{transform:scale(1.12);box-shadow:0 0 0 7px rgba(13,110,253,0);}}' +
    '.mini-anim-etape{width:2.5rem;height:2.5rem;border-radius:50%;background:#0d6efd;color:#fff;' +
    'display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;' +
    'animation:pulseEtapeIA 2.2s ease-in-out infinite;margin:0 auto;}</style>';
  function miniAnimationEtapes(etapes) {
    return '<div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:center;gap:0.4rem;margin:0.5rem 0 1rem;">' +
      etapes.map(function (texte, i) {
        var bloc = '<div style="text-align:center;width:110px;">' +
          '<div class="mini-anim-etape" style="animation-delay:' + (i * 0.5) + 's;">' + (i + 1) + '</div>' +
          '<div class="small text-muted mt-1">' + texte + '</div></div>';
        return bloc + (i < etapes.length - 1 ? '<div style="font-size:1.4rem;color:#9CA3AF;padding-top:0.4rem;">&#8594;</div>' : '');
      }).join('') + '</div>';
  }

  function carteDocument(id, icone, label, actif, desactive, messageVerrou) {
    var style = 'display:block;flex:1 1 220px;text-align:center;padding:1.5rem 1rem;' +
      'font-size:1.2rem;font-weight:600;border-radius:12px;' +
      'transition:background .15s,border-color .15s,color .15s;' +
      // TACHE (retour utilisateur : cartes verrouillees toujours trop
      // discretes) : contraste renforce (texte plus fonce, fond legerement
      // plus marque) + !important -- au cas ou une regle CSS externe
      // (.outil-desactive dans style.css, non fourni dans cette tache)
      // ecraserait le style en ligne malgre sa specificite normalement
      // superieure. Signe "interdit" (cursor:not-allowed) et bulle de
      // message au survol deja en place, inchanges.
      // TACHE (retour utilisateur : ni signe interdit ni message au survol) :
      // hypothese forte -- .outil-desactive dans style.css (non fourni)
      // definit probablement pointer-events:none (habituel pour un style
      // "desactive"), ce qui bloque TOUT le survol CSS, y compris la bulle
      // de message (.carte-verrou-tooltip:hover::after) et meme le
      // changement de curseur -- le navigateur n'a plus rien a detecter.
      // Force sa reactivation ici : le clic reste bloque cote JavaScript
      // (gestionnaire de clic, inchange), seul le survol est restaure.
      (desactive ? 'cursor:not-allowed !important;background:#EEF0F3 !important;color:#4B5563 !important;border:2px solid #D1D5DB !important;opacity:1 !important;pointer-events:auto !important;'
        : actif ? 'cursor:pointer;background:#0d6efd;color:#FFFFFF;border:2px solid #0d6efd;'
          : 'cursor:pointer;background:#F3F4F6;color:#374151;border:2px solid #E5E7EB;');
    return '<div class="outil-item outil-ia outil-ia-grand' + (desactive ? ' outil-desactive carte-verrou-tooltip' : '') + '" data-outil="' + id + '"' +
      ' style="' + style + '"' +
      (desactive ? ' title="' + (messageVerrou || 'Cette option n’est pas encore disponible.') +
        '" data-tooltip="' + echapperAttribut(messageVerrou || 'Cette option n’est pas encore disponible.') + '"' : '') +
      // TACHE (retour utilisateur : "Sélectionné" sur une carte verrouillée) :
      // garde-fou explicite ici, en plus de la correction du defaut de
      // docActif -- une carte desactivee ne doit JAMAIS afficher ce badge,
      // quelle que soit la valeur de "actif" recue.
      '>' + icone + ' ' + label + ((actif && !desactive) ? ' <span class="badge bg-light text-primary ms-1">Sélectionné</span>' : '') + '</div>';
  }
  // TACHE (retour utilisateur : message plus visible qu'un simple title) :
  // vraie bulle CSS (delai/discretion du title natif souvent manques),
  // affichee au survol d'une carte verrouillee, en plus du curseur
  // "interdit" deja pose ci-dessus (cursor:not-allowed).
  var styleTooltipVerrou = '<style>.carte-verrou-tooltip{position:relative;}' +
    '.carte-verrou-tooltip::after{content:attr(data-tooltip);position:absolute;bottom:calc(100% + 10px);left:50%;' +
    'transform:translateX(-50%);background:#1F2937;color:#FFFFFF;padding:0.5rem 0.75rem;border-radius:6px;' +
    'font-size:0.8rem;font-weight:400;white-space:normal;width:220px;line-height:1.3;opacity:0;visibility:hidden;' +
    'pointer-events:none;transition:opacity .15s;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,.25);}' +
    '.carte-verrou-tooltip:hover::after{opacity:1;visibility:visible;}</style>';
  // TACHE (page Action, verrouillage progressif des cartes) : regles selon
  // le parcours choisi (dossier.modeCreation) -- voir plan valide avec
  // Denis. "pret" (deja un CV) : la carte CV elle-meme est inutile, jamais
  // proposee ; Lettre disponible d'emblee. "nouveau"/"maj" : Lettre attend
  // que le CV soit reellement termine (Exporter atteint). Entretien attend
  // toujours que la Lettre soit terminee, quel que soit le parcours.
  var modePret = (dossier.modeCreation === 'pret');
  var desactiveCV = modePret;
  var desactiveLettre = !modePret && !dossier.cvTermine;
  var desactiveEntretien = !dossier.lettreTerminee;
  // TACHE (retour utilisateur : messages plus subtils/elegants) : formule
  // courte, orientee sur ce qu'il reste a faire, sans exposer de detail
  // technique (nom d'etape interne, etc.).
  var selecteurDocument = styleTooltipVerrou + '<div class="cv-section text-center"><h4>Choisissez votre action</h4>' +
    '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;max-width:900px;margin:0 auto;">' +
    carteDocument('cv', '&#128196;', 'Créer un CV', docActif === 'cv', desactiveCV,
      'Vous avez indiqué posséder déjà un CV : cette étape ne vous concerne pas.') +
    carteDocument('lettre', '&#9993;', 'Lettre de motivation', docActif === 'lettre', desactiveLettre,
      'Complétez d’abord votre CV pour débloquer la lettre de motivation.') +
    carteDocument('entretien', '&#127908;', 'Préparer un entretien', docActif === 'entretien', desactiveEntretien,
      'Complétez d’abord votre lettre de motivation pour débloquer la préparation d’entretien.') +
    '</div></div>';

  // Accordeon "Informations transmises a l'IA" : reutilise texteProfil(),
  // deja existante, pour un apercu EXACT (aucune duplication de logique).
  var accordeonInfosIA = blocAccordeon('infos-ia', titreEtape('&#128203; Informations transmises à l’IA'),
    'Ces informations sont extraites automatiquement de votre dossier et seront transmises à l’assistant IA.',
    '<p class="mb-1"><strong>Civilité :</strong> ' + (dossier.identite.civilite || 'Non précisée') + '</p>' +
    '<p class="mb-1"><strong>Mode CV :</strong> ' + (dossier.typeCV === 'specifique' ? 'Spécifique au métier visé' : 'Général') + '</p>' +
    '<p class="mb-1"><strong>Objectif :</strong> ' + (dossier.objectif || 'Non défini') + '</p>' +
    '<p class="mb-3"><strong>Métier / secteur visé :</strong> ' + (dossier.metierCible || dossier.secteurCible || 'Non défini') + '</p>' +
    '<div class="text-center my-3"><button type="button" class="btn btn-outline-primary" id="btnVerifierInfosIA">' +
    '&#128269; Vérifier les informations</button></div>' +
    sectionExperiences +
    // TACHE (retour utilisateur : "je valide, mais en realite les nouvelles
    // informations ne remontent pas") : cause identifiee -- une fois
    // "Vérifier les informations" validé, dossier.profilTexteManuel fige un
    // instantane du texte, utilisé ensuite PARTOUT a la place du texte
    // auto-genere (texteProfilEffectif()), meme apres avoir ajoute de
    // nouvelles informations dans le dossier -- silencieusement, sans
    // aucune indication a l'ecran. Ce bandeau rend l'etat visible et permet
    // de revenir en un clic au texte automatique, toujours a jour.
    (dossier.profilTexteManuel
      ? '<div class="alert alert-warning py-2 px-3 small mb-2">&#9888;&#65039; Vous utilisez une version personnalisée de ce texte (modifiée manuellement lors d’une précédente vérification) : les informations ajoutées à votre dossier depuis ne s’y ajoutent plus automatiquement. <button type="button" class="btn btn-link btn-sm p-0 align-baseline" id="btnRevenirTexteAutoIA">Revenir au texte automatique, à jour</button></div>'
      : '') +
    '<p class="small text-muted mt-3 mb-1">Aperçu exact du texte transmis à l’IA :</p>' +
    '<pre style="white-space:pre-wrap;background:#f8f9fa;padding:0.75rem;border-radius:6px;font-size:0.82rem;max-height:220px;overflow:auto;">' +
    echapperAttribut(texteProfilEffectif(docActif)) + '</pre>' +
    '<button type="button" class="btn btn-primary mt-2" id="btnContinuerInfosIA">Continuer &#8594;</button>');

  // Accordeon "Adaptation au metier" : seule logique fonctionnelle demandee
  // pour cette tache -- ecrit directement dans dossier.preferencesIA,
  // reutilise par tous les futurs modules (CV, lettre, entretien...).
  function groupePreference(champ, titre, options) {
    var valeurActuelle = dossier.preferencesIA[champ];
    return '<p class="question mb-1"><strong>' + titre + '</strong></p><div class="mb-3">' +
      pastillesSelection(champ, options, valeurActuelle) + '</div>';
  }
  var accordeonAdaptation = blocAccordeon('adaptation-metier', titreEtape('&#127891; Adaptation au métier'),
    'Ces préférences ne sont jamais affichées dans vos documents : elles orientent uniquement les réponses de ' +
    'l’assistant IA. Elles sont conservées et réutilisées automatiquement pour le CV, la lettre et l’entretien.',
    groupePreference('niveauPoste', 'Niveau du poste recherché', [
      { valeur: 'employe', label: 'Employé / Opérateur' },
      { valeur: 'ouvrier_qualifie', label: 'Ouvrier qualifié' },
      { valeur: 'technicien', label: 'Technicien' },
      { valeur: 'agent_maitrise', label: 'Agent de maîtrise' },
      { valeur: 'cadre', label: 'Cadre' },
      { valeur: 'direction', label: 'Direction / Encadrement' }
    ]) +
    groupePreference('niveauLangage', 'Niveau de langage souhaité', [
      { valeur: 'naturel', label: 'Naturel' },
      { valeur: 'professionnel', label: 'Professionnel' },
      { valeur: 'tres_professionnel', label: 'Très professionnel' }
    ]) +
    groupePreference('adaptationMetier', 'Adaptation au vocabulaire du métier', [
      { valeur: 'standard', label: 'Standard — document généraliste' },
      { valeur: 'adaptee', label: 'Adaptée — vocabulaire du métier recherché (recommandé)' },
      { valeur: 'specialisee', label: 'Spécialisée — expressions propres au secteur' }
    ]) +
    groupePreference('ton', 'Ton de la candidature', [
      { valeur: 'dynamique', label: 'Dynamique' },
      { valeur: 'equilibre', label: 'Équilibré' },
      { valeur: 'institutionnel', label: 'Institutionnel' }
    ]) +
    groupePreference('longueur', 'Longueur souhaitée', [
      { valeur: 'synthetique', label: 'Très synthétique' },
      { valeur: 'equilibree', label: 'Équilibrée' },
      { valeur: 'detaillee', label: 'Détaillée' }
    ]) +
    '<button type="button" class="btn btn-primary" id="btnContinuerAdaptation">Continuer &#8594;</button>');

  // TACHE (page Action, tache 2) : reutilise ASSISTANTS_IA + ouvrirFenetreAssistantIA(),
  // deja prets pour cet usage (voir leurs commentaires). Aucune logique dupliquee.
  var accordeonChoixIA = blocAccordeon('choix-ia', titreEtape('&#129302; Choisissez votre assistant IA'),
    'Cliquez sur un assistant ci-dessous. L’application prépare et copie tout pour vous, puis ouvre l’assistant : vous n’avez rien à taper.',
    styleMiniAnimation +
    miniAnimationEtapes(['Vous cliquez sur un assistant', 'Tout est copié pour vous', 'Il s’ouvre automatiquement', 'Vous revenez ici après']) +
    // TACHE (retour utilisateur : "ici il me manque une vidéo, rajoute
    // Exp_imp_ai.mp4") : cle 'export-ia-texte' desormais libre pour cet
    // usage (l'etape "Analyse assistee par IA" du wizard, qui couvrait le
    // meme geste, utilise maintenant 'import-reponse-ia' -- voir metiers.js,
    // rendreExplication()).
    '<div class="text-center mb-2">' + htmlDeclencheurDemoVideo('export-ia-texte') + '</div>' +
    '<div class="ia-grid text-center">' + ASSISTANTS_IA.map(function (a) {
      return '<button type="button" class="pastille-selection" data-assistant="' + a.id + '" style="' +
        stylePastilleInline(false) + 'font-size:1.15rem;padding:0.75rem 1.5rem;font-weight:600;">' + a.nom + '</button>';
    }).join('') + '</div>');
  // TACHE (page Action, tache 3) : reutilise integralement analyserReponseIACV/
  // Lettre/Entretien + genererResumeImportCV/genererResumeGeneriqueImportIA
  // (deja existantes, memes fonctions que celles utilisees par l'ancienne
  // popup) -- aucune logique de parsing dupliquee, juste le meme appel,
  // sans passer par window.opener puisque tout vit desormais sur cette page.
  var libellesImportIA = { cv: 'le CV', lettre: 'la lettre', entretien: 'la préparation' };
  var accordeonImportIA = blocAccordeon('import-ia', titreEtape('&#128229; Importer les informations IA'), '',
    styleMiniAnimation +
    miniAnimationEtapes(['Dans l’assistant, copiez toute sa réponse', 'Collez-la (ou cliquez le bouton)', 'Cliquez sur Importer', 'C’est ajouté automatiquement']) +
    // TACHE (retour utilisateur : coller en un clic, generalise) :
    // reutilise le composant partage (voir activerCollageInstantane/
    // htmlCollageInstantane plus haut dans ce fichier).
    htmlCollageInstantane('ActionIA',
      '<button type="button" class="pastille-selection" id="btnImporterReponseIA" style="' +
      stylePastilleInline(true) + 'font-size:1.1rem;padding:0.7rem 1.75rem;font-weight:600;margin-top:0.5rem;">&#128229; Importer dans ' +
      libellesImportIA[docActif] + '</button> ' +
      '<button type="button" id="btnEffacerRecollerActionIA" class="btn btn-outline-secondary mt-2">Effacer et recoller</button>') +
    '<div id="messageImportIA" class="mt-2 small" style="min-height:1.2em;"></div>');
  // TACHE (page Action, tache "navigation guidee") : "Exporter" redevient un
  // accordeon separe (derniere etape du parcours), sur demande explicite --
  // annule la fusion faite en tache 4. Meme contenu, meme cablage, juste
  // deplace.
  var formatsParTypeExport = {
    // TACHE (simplification : DOCX seul + apercu integre) : PDF (pdfmake)
    // et Personnaliser (GrapesJS) retires de cette liste -- geles sur
    // decision explicite, faute de compatibilite fiable avec le reste du
    // systeme. Le DOCX natif reste la SEULE source de verite : "Aperçu"
    // affiche desormais le vrai fichier .docx (voir apercuDocxIntegre.js),
    // et "Texte à copier" (ex-Canva CSV, qui necessitait un abonnement
    // payant) donne le meme contenu en texte brut pour toute personne qui
    // prefererait mettre en forme elle-meme dans un autre outil.
    // TACHE (retour utilisateur : doublon) : "Copier le texte" retire --
    // faisait doublon avec "Texte a copier" (memes donnees, juste
    // telechargement vs presse-papiers). genererCSVCanva() reste disponible
    // (non appelee) si un compte Canva payant devient pertinent un jour.
    // TACHE (retour utilisateur : "Autre" regroupe JSON+CSV, CV uniquement) :
    // JSON et CSV (Canva) n'ont d'utilite que pour le CV -- aucun interet
    // pour la lettre/l'entretien (pas de gabarit Canva pour ces types, pas
    // de reimport JSON prevu). "Autre" ouvre un petit sous-menu au clic.
    // TACHE (retour utilisateur : retrait Envoyer par mail) : fonctionnalite
    // retiree (jamais fiable confirmee en conditions reelles) -- "Autre"
    // redevient CV uniquement, plus rien a y loger pour lettre/entretien.
    cv: [{ id: 'apercu', label: 'Aperçu' }, { id: 'docx', label: 'Télécharger le Word' }, { id: 'texte-blocs', label: 'Texte à copier' }, { id: 'autre', label: 'Autre' }],
    // TACHE (traitement DOCX natif etendu a la lettre et l'entretien) :
    // meme simplification que le CV -- Aperçu (panneau integre, vrai
    // rendu .docx) + Telecharger le Word + Texte a copier.
    lettre: [{ id: 'apercu', label: 'Aperçu' }, { id: 'docx', label: 'Télécharger le Word' }, { id: 'texte-blocs', label: 'Texte à copier' }],
    entretien: [{ id: 'apercu', label: 'Aperçu' }, { id: 'docx', label: 'Télécharger le Word' }, { id: 'texte-blocs', label: 'Texte à copier' }]
  };
  var listeFormatsExport = (formatsParTypeExport[docActif] || []).map(function (f) {
    return '<button type="button" class="pastille-selection" data-format-export="' + f.id + '" style="' + stylePastilleInline(false) + '">' + f.label + '</button>';
  }).join('');
  // TACHE (retour utilisateur : navigation croisee, deplacee dans Exporter) :
  // suggere le document suivant -- ne reinitialise rien (etatAccordeon
  // reste partage), mais ouvre directement l'etape "Choisissez votre IA"
  // du document suivant (pas seulement le selecteur), pour eviter de
  // repartir de zero dans son parcours.
  var suggestionSuivante = '';
  if (docActif === 'cv') {
    suggestionSuivante = '<div class="d-flex align-items-center justify-content-between flex-wrap gap-2 border rounded p-3 mt-3" style="background:#F8FAFC;">' +
      '<p class="small mb-0 me-2">Avec ces informations, on peut aussi rédiger votre lettre de motivation.</p>' +
      '<button type="button" id="btnSuggererLettre" class="btn btn-outline-primary text-nowrap">&#9993; Lettre de motivation</button>' +
      '</div>';
  } else if (docActif === 'lettre') {
    suggestionSuivante = '<div class="d-flex align-items-center justify-content-between flex-wrap gap-2 border rounded p-3 mt-3" style="background:#F8FAFC;">' +
      '<p class="small mb-0 me-2">On peut préparer ensemble l’entretien d’embauche, à partir de cette lettre et du CV créé précédemment.</p>' +
      '<button type="button" id="btnSuggererEntretien" class="btn btn-outline-primary text-nowrap">&#127908; Préparation à l’entretien</button>' +
      '</div>';
  }
  var accordeonExporter = blocAccordeon('exporter-document', titreEtape('&#128228; Exporter'), '',
    (listeFormatsExport || '<span class="text-muted small">Aucun format disponible pour le moment.</span>') +
    // TACHE (retour utilisateur : "Autre" regroupe JSON+CSV, CV uniquement) :
    // sous-menu masque par defaut, revele au clic sur "Autre".
    // TACHE (retour utilisateur : retrait Envoyer par mail) : fonctionnalite
    // retiree completement (jamais fiable confirmee en conditions reelles) --
    // "Autre" redevient CV uniquement, JSON + CSV seulement.
    (docActif === 'cv'
      ? '<div id="zoneAutreExport" style="display:none !important;" class="d-flex flex-wrap gap-2 mt-2">' +
        '<button type="button" class="pastille-selection" data-format-export="json" style="' + stylePastilleInline(false) + '">JSON</button>' +
        '<button type="button" class="pastille-selection" data-format-export="csv-canva" style="' + stylePastilleInline(false) + '">CSV (Canva)</button>' +
        '</div>'
      : '') +
    // TACHE (retour utilisateur : rappel de sauvegarde) : apparait a chaque
    // telechargement du Word (voir le gestionnaire "docx" plus bas).
    '<p id="messageTelechargerWord" class="small mt-2 mb-0" style="display:none;color:#B45309;"></p>' +
    suggestionSuivante);

  var accordeonApercuDoc = blocAccordeon('apercu-document', titreEtape('&#128065; Aperçu et finalisation'),
    'Choisissez un modèle. Une fois sélectionné, choisissez sa couleur. Le mini aperçu est mis à jour automatiquement.',
    (function () {
      // TACHE (refonte "Aperçu et finalisation", cahier des charges dedie) :
      // deux colonnes cote a cote (modeles+couleurs a gauche, apercu a
      // droite) au lieu du bandeau horizontal precedent. Miniatures
      // STRICTEMENT inchangees (genererCartesSelecteurModeles/
      // genererMiniatureSVG non touchees, meme largeur 64px qu'avant) --
      // seule la disposition du conteneur passe d'un defilement horizontal
      // a fleches a une grille de 4 par ligne (voir construireCarrouselModeles()).
      var idSuffixe = docActif === 'lettre' ? 'Lettre' : docActif === 'entretien' ? 'Entretien' : 'CV';
      var libelleModeles = docActif === 'lettre' ? 'Modèles de lettre' : docActif === 'entretien' ? 'Modèles de fiche' : 'Modèles de CV';

      var styleGrilleModeles = '<style>' +
        '#grilleModeles' + idSuffixe + ', #grilleModelesA5' + idSuffixe + '{display:grid;grid-template-columns:repeat(4,64px);gap:0.75rem;justify-content:start;}' +
        '#grilleModeles' + idSuffixe + ' .carte-modele-cv, #grilleModelesA5' + idSuffixe + ' .carte-modele-cv{cursor:pointer;border:2px solid #E5E7EB;' +
        'border-radius:6px;padding:0.25rem;text-align:center;background:#FFFFFF;}' +
        '#grilleModeles' + idSuffixe + ' .carte-modele-cv:hover, #grilleModelesA5' + idSuffixe + ' .carte-modele-cv:hover{border-color:#93C5FD;}' +
        '#grilleModeles' + idSuffixe + ' .carte-modele-cv-active, #grilleModelesA5' + idSuffixe + ' .carte-modele-cv-active{border-color:#2563EB;border-width:3px;background:#EFF6FF;}' +
        '#grilleModeles' + idSuffixe + ' .carte-modele-cv-miniature svg, #grilleModelesA5' + idSuffixe + ' .carte-modele-cv-miniature svg{width:100%;height:auto;display:block;border-radius:3px;}' +
        '#grilleModeles' + idSuffixe + ' .carte-modele-cv-nom, #grilleModelesA5' + idSuffixe + ' .carte-modele-cv-nom{font-size:0.6rem;margin-top:0.2rem;color:#1F2937;white-space:nowrap;' +
        'overflow:hidden;text-overflow:ellipsis;}' +
        // TACHE (palette de couleurs) : pastilles rondes, compactes, meme
        // esprit que celles du panneau plein ecran (apercuDocxIntegre.js).
        '.pastille-couleur-cv{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid #FFFFFF;' +
        'box-shadow:0 0 0 1px #D1D5DB;padding:0;}' +
        '.pastille-couleur-cv-active{box-shadow:0 0 0 2px #111827;}' +
        // TACHE (retour utilisateur : "Nuances rapides", 10 nuances) :
        // pastilles plus petites que le rond principal, meme esprit visuel.
        '.pastille-nuance-cv{width:18px;height:18px;border-radius:50%;cursor:pointer;border:1px solid #FFFFFF;' +
        'box-shadow:0 0 0 1px #D1D5DB;padding:0;}' +
        '.pastille-nuance-cv-active{box-shadow:0 0 0 2px #111827;}' +
        '</style>';

      var estFormatMini = docActif === 'cv' && etatApercuInline.cv.formatPage === 'A5';
      var colonneGauche =
        '<div style="flex:1 1 340px;min-width:300px;">' +
        (estFormatMini
          ? '<h3 style="font-size:0.95rem;font-weight:700;margin-bottom:0.6rem;">&#128196; Modèles Mini CV (A5)</h3>' +
            '<div id="grilleModelesA5' + idSuffixe + '"><p class="small text-muted mb-0">Chargement des modèles…</p></div>' +
            '<div id="grilleModeles' + idSuffixe + '" style="display:none;"></div>'
          : '<h3 style="font-size:0.95rem;font-weight:700;margin-bottom:0.6rem;">&#128196; ' + libelleModeles + '</h3>' +
            '<div id="grilleModeles' + idSuffixe + '"><p class="small text-muted mb-0">Chargement des modèles…</p></div>' +
            '<div id="grilleModelesA5' + idSuffixe + '" style="display:none;"></div>') +
        // TACHE (spec : "uniquement lorsqu'un modèle est sélectionné") :
        // masque par defaut (display:none), affiche par construirePaletteCouleurs()
        // uniquement quand le modele actif supporte la couleur.
        '<div id="paletteCouleurs' + idSuffixe + '" style="display:none;margin-top:1.1rem;padding-top:0.9rem;border-top:1px solid #E5E7EB;">' +
        '<h4 style="font-size:0.85rem;font-weight:700;margin-bottom:0.5rem;">&#127912; Couleurs disponibles</h4>' +
        '<div id="pastillesCouleurs' + idSuffixe + '" style="display:flex;gap:0.5rem;flex-wrap:wrap;"></div>' +
        '</div>' +
        // TACHE (format A5) : CV uniquement (lettre/entretien n'ont pas de
        // contenu recadre defini pour ce format). Toujours visible (pas de
        // condition sur la selection d'un modele, contrairement a la
        // palette de couleurs) -- le format concerne le document entier,
        // pas un modele en particulier.
        // TACHE (couleurs + formats pour la lettre et l'entretien) :
        // desormais disponible pour les 3 types -- toujours visible (pas de
        // condition sur la selection d'un modele, contrairement a la
        // palette de couleurs) : le format concerne le document entier,
        // pas un modele en particulier.
        (function () {
          var LIBELLES_MINI = { cv: 'Mini CV (A5)', lettre: 'Mini lettre (A5)', entretien: 'Fiche compacte (A5)' };
          // TACHE (retour utilisateur : "A4 Essentiel" pas utile pour la
          // lettre) : le CV garde ses 3 formats (A4 Détaillé/A4 Essentiel/
          // Mini A5, inchange). La lettre n'a plus qu'un seul format
          // possible : A4 Détaillé -- une lettre de motivation n'a pas
          // besoin d'un format "allégé" séparé (elle tient déjà sur une
          // page par construction, voir lettre.md). L'entretien, lui,
          // n'a jamais eu qu'un seul format non plus (A4 Détaillé), pour
          // les memes raisons qu'avant (document de préparation complet).
          var boutonsFormat =
            '<button type="button" class="bouton-format-page-accordeon' + ((etatApercuInline[docActif].formatPage || 'A4') === 'A4' ? ' bouton-format-page-accordeon-active' : '') + '" data-format-page="A4">A4 Détaillé</button>';
          if (docActif === 'cv') {
            boutonsFormat += '<button type="button" class="bouton-format-page-accordeon' + (etatApercuInline[docActif].formatPage === 'A4-essentiel' ? ' bouton-format-page-accordeon-active' : '') + '" data-format-page="A4-essentiel">A4 Essentiel</button>';
            boutonsFormat += '<button type="button" class="bouton-format-page-accordeon' + (etatApercuInline[docActif].formatPage === 'A5' ? ' bouton-format-page-accordeon-active' : '') + '" data-format-page="A5">' + LIBELLES_MINI[docActif] + '</button>';
          }
          var LIBELLES_EXPLICATION = {
            cv: 'A4 Essentiel : contenu allégé sur une page A4 normale. Mini CV (A5) : vraie demi-page, rubriques essentielles uniquement. Dans les deux cas, la sélection se fait automatiquement selon le métier visé.',
            lettre: '',
            entretien: ''
          };
          return '<div style="margin-top:1.1rem;padding-top:0.9rem;border-top:1px solid #E5E7EB;">' +
            '<h4 style="font-size:0.85rem;font-weight:700;margin-bottom:0.5rem;">&#128209; Format</h4>' +
            '<div id="boutonsFormatPage' + idSuffixe + '" style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
            boutonsFormat +
            '</div>' +
            (LIBELLES_EXPLICATION[docActif] ? '<p class="small text-muted mt-2 mb-0">' + LIBELLES_EXPLICATION[docActif] + '</p>' : '') +
            // TACHE (retour utilisateur : "je veux gerer la photo ici, sans
            // repasser par Mon Projet") : bloc complet -- si une photo
            // existe deja (dossier.photo.url), case a cocher "inclure" +
            // bouton "Retirer" directement ici ; sinon, simple lien vers
            // Mon Projet pour en ajouter une (l'upload lui-meme reste dans
            // Identite, c'est la SEULE action qui necessite d'y aller).
            (docActif === 'cv'
              ? '<div class="small mt-2 mb-0" style="background:#F0F9FF;border-radius:6px;padding:0.5rem 0.75rem;">' +
                '&#128247; Certains modèles (Chic, Mini CV) peuvent afficher une photo. ' +
                (dossier.photo && dossier.photo.url
                  ? '<div class="form-check d-inline-block mt-1">' +
                    '<input class="form-check-input" type="checkbox" id="checkInclurePhotoApercu"' + (dossier.photo.inclure ? ' checked' : '') + '>' +
                    '<label class="form-check-label" for="checkInclurePhotoApercu">Inclure ma photo</label>' +
                    '</div>' +
                    ' · <button type="button" class="btn btn-link btn-sm p-0 align-baseline text-danger" id="btnRetirerPhotoApercu">Retirer la photo</button>' +
                    ' · <button type="button" class="btn btn-link btn-sm p-0 align-baseline" id="btnAllerPhotoIdentite">Changer la photo</button>'
                  : '<button type="button" class="btn btn-link btn-sm p-0 align-baseline" id="btnAllerPhotoIdentite">Ajouter ma photo</button>') +
                '</div>'
              : '') +
            '</div>';
        })() +
        '</div>';

      var styleBoutonsFormatPage = '<style>' +
        '.bouton-format-page-accordeon{border:1px solid #E5E7EB;background:#FFFFFF;border-radius:999px;padding:0.3rem 0.9rem;font-size:0.82rem;cursor:pointer;}' +
        '.bouton-format-page-accordeon-active{background:#111827;color:#FFFFFF;border-color:#111827;}' +
        '</style>';

      // TACHE (spec : mini apercu = element principal du panneau de droite,
      // occupe pratiquement toute la hauteur disponible) : 70vh au lieu des
      // 320px precedents (delibrement petits a l'origine). "Ouvrir le grand
      // apercu" directement en dessous, plus separe visuellement.
      var colonneDroite =
        '<div style="flex:1 1 320px;min-width:280px;display:flex;flex-direction:column;">' +
        '<h3 style="font-size:0.95rem;font-weight:700;margin-bottom:0.6rem;">Aperçu</h3>' +
        '<div id="messageApercuInline' + idSuffixe + '" class="small text-muted mb-2"></div>' +
        '<div id="zoneApercuInline' + idSuffixe + '" style="width:100%;height:70vh;min-height:420px;overflow:auto;' +
        'border:1px solid #E5E7EB;border-radius:8px;background:#F3F4F6;padding:1rem;display:flex;justify-content:center;"></div>' +
        '<button type="button" id="btnOuvrirGrandApercu" style="font-size:1.05rem;font-weight:700;padding:0.7rem 1.6rem;' +
        'background:#0d6efd;color:#FFFFFF;border:none;border-radius:999px;box-shadow:0 4px 14px rgba(13,110,253,.4);' +
        'white-space:nowrap;align-self:center;margin-top:1rem;">&#128065;&#65039; Ouvrir le grand aperçu</button>' +
        '</div>';

      // TACHE (retour utilisateur : 3 versions de lettre, cartes dans
      // l'apercu) : visible uniquement pour la lettre, uniquement si un
      // import a deja fourni plusieurs versions. Carte active mise en
      // evidence ; clic sur une autre carte = elle devient la version
      // active (dossier.ia.lettre.lettre, lu par normaliserDonneesLettre.js,
      // en est synchronise). "Modifier le texte" ouvre un editeur simple
      // (objet + corps) pour la version actuellement active.
      var cartesVersionsLettre = '';
      if (docActif === 'lettre' && dossier.ia && dossier.ia.lettre && (dossier.ia.lettre.versions || []).length > 1) {
        var versionsLettreActuelles = dossier.ia.lettre.versions;
        var indexVersionActive = dossier.ia.lettre.versionActive || 0;
        cartesVersionsLettre = '<div class="mb-3">' +
          '<h3 style="font-size:0.95rem;font-weight:700;margin-bottom:0.6rem;">&#9993;&#65039; Versions proposées</h3>' +
          '<div style="display:flex;gap:0.75rem;flex-wrap:wrap;">' +
          versionsLettreActuelles.map(function (v, i) {
            var extrait = (v.texte || '').trim().slice(0, 90);
            return '<div class="carte-version-lettre' + (i === indexVersionActive ? ' carte-version-lettre-active' : '') +
              '" data-version-lettre="' + i + '">' +
              '<div class="fw-bold small mb-1">Version ' + (i + 1) + (i === indexVersionActive ? ' — sélectionnée' : '') + '</div>' +
              '<div class="small text-muted">' + echapperAttribut(extrait) + (v.texte && v.texte.trim().length > 90 ? '…' : '') + '</div>' +
              '</div>';
          }).join('') +
          '</div>' +
          '<button type="button" class="btn btn-outline-secondary btn-sm mt-2" id="btnModifierVersionLettre">&#9999;&#65039; Modifier le texte</button>' +
          '</div>';
      }

      // TACHE (retour utilisateur : "je veux aussi un bouton modifier ici,
      // si jamais la personne veut rajouter des choses") : pas de versions
      // multiples pour l'entretien (decision explicitement mise en attente,
      // "je vais voir juste apres") -- juste un editeur simple pour Ma
      // présentation, Points à préparer et Questions à poser au recruteur
      // (listes de texte, une ligne = un element). "Questions anticipées"
      // (question + pistes + amorce, structure plus complexe) volontairement
      // HORS de cet editeur pour l'instant -- a traiter avec la decision sur
      // les versions, pas avant.
      var boutonModifierEntretien = '';
      if (docActif === 'entretien' && dossier.ia && dossier.ia.entretien && dossier.ia.entretien.presentation) {
        boutonModifierEntretien = '<div class="mb-3"><button type="button" class="btn btn-outline-secondary btn-sm" id="btnModifierEntretien">&#9999;&#65039; Modifier le texte</button></div>';
      }

      return styleGrilleModeles + styleBoutonsFormatPage + cartesVersionsLettre + boutonModifierEntretien +
        // TACHE (retour utilisateur : pouvoir revenir changer les
        // propositions de l'IA depuis l'aperçu) : visible uniquement pour
        // le CV (seul type couvert par l'Écran 3 pour l'instant) et
        // uniquement s'il y a réellement quelque chose à reprendre (un
        // import IA a déjà eu lieu). Rouvre le même écran à onglets
        // qu'après "Importer", reconstruit a partir de l'etat ACTUEL de
        // dossier.ia.cv (donc les choix precedents, pas la proposition
        // brute d'origine) -- "Je valide" ecrase ensuite dossier.ia.cv et
        // rafraichit l'apercu, sans jamais changer d'etape/de page.
        ((docActif === 'cv' && dossier.ia && dossier.ia.cv && (
          dossier.ia.cv.profil || (dossier.ia.cv.pointsForts || []).length ||
          (dossier.ia.cv.recommandations && (
            (dossier.ia.cv.recommandations.experiencesAMettreEnAvant || []).length ||
            (dossier.ia.cv.recommandations.competencesAValoriser || []).length ||
            (dossier.ia.cv.recommandations.rubriquesMasquables || []).length
          ))
        ))
          ? '<div class="text-end mb-2"><button type="button" class="btn btn-outline-primary btn-sm" id="btnRevoirPropositionsIA">&#8630; Revenir aux propositions de l’IA</button></div>'
          : '') +
        '<div style="display:flex;gap:2rem;align-items:flex-start;flex-wrap:wrap;">' +
        colonneGauche + colonneDroite +
        '</div>' +
        '<p class="small text-muted mt-3 mb-2">&#128196; Ceci est le rendu exact du fichier Word qui sera téléchargé — ' +
        'vous pourrez le modifier librement, avec toutes les options de mise en forme de Word, une fois ouvert.</p>' +
        '<button type="button" class="btn btn-primary mt-3" id="btnContinuerApercu">Continuer &#8594;</button>';
    })());

  // TACHE (retour utilisateur : bandeaux hors parcours) : retires -- prevus
  // depuis le debut comme temporaires ("a garder tel quel jusqu'a ce que
  // l'accordeon Exporter soit operationnel, puis a retirer"). L'etape
  // "Exporter" du parcours (PDF/DOCX/JSON/Copier) fait desormais exactement
  // la meme chose, a l'interieur de la pyramide -- plus de doublon en
  // dehors du parcours.

  // TACHE (migration "Ressources et liens utiles") : simple deplacement en
  // bas de page, aucun changement fonctionnel.
  var accordeonRessources = blocAccordeon('ressources', titreEtape('&#128218; Ressources et liens utiles'),
    'Vous souhaitez poursuivre votre réflexion ou découvrir d’autres possibilités ? Cliquez ici pour accéder aux ressources complémentaires proposées.',
    '<div class="outils-grid">' +
    '<div class="outil-item" data-outil="pmsmp"><i class="bi bi-search"></i> &#128269; Trouver une immersion (PMSMP)</div>' +
    '<div class="outil-item" data-outil="formation"><i class="bi bi-mortarboard"></i> &#127891; Trouver une formation</div>' +
    '<div class="outil-item" data-outil="explorer"><i class="bi bi-compass"></i> &#129517; Explorer d’autres métiers</div>' +
    '</div>');

  // TACHE (retour utilisateur) : une etape n'apparait qu'une fois atteinte
  // (etatAccordeon[id] a ete defini au moins une fois par avancerEtape() ou
  // par le premier choix de carte) -- pas seulement repliee, litteralement
  // absente tant qu'on n'y est pas arrive. Une fois tout le parcours fait,
  // toutes restent visibles (repliables/rouvrables librement).
  function etapeAtteinte(id) { return etatAccordeon[id] !== undefined; }
  // TACHE (retour utilisateur : une seule pyramide ouverte a la fois) :
  // normalise l'etat au rendu -- si plusieurs etapes se retrouvent a `true`
  // en meme temps (observe notamment sur le parcours "mettre a jour mon
  // CV"), seule la DERNIERE dans l'ordre du parcours reste ouverte
  // visuellement ; les autres restent "atteintes" (etapeAtteinte() les
  // affiche toujours, juste repliees) -- meme regle que wireAccordeon()
  // applique au clic, ci-dessous.
  var ordreEtapesAction = ['adaptation-metier', 'infos-ia', 'choix-ia', 'import-ia', 'apercu-document', 'exporter-document'];
  // TACHE (retour utilisateur : pyramides fermees par defaut, seule la 1ere
  // ouverte) : garde-fou -- si un document est actif mais qu'aucune etape
  // n'a jamais ete marquee atteinte (etatAccordeon vide, ex. arrivee directe
  // sur cette page sans passer par un des clics qui l'initialisent
  // normalement), on ouvre "Adaptation au metier" plutot que de n'afficher
  // aucune etape du tout.
  if (carteChoisie && !ordreEtapesAction.some(function (id) { return etatAccordeon[id] !== undefined; })) {
    etatAccordeon['adaptation-metier'] = true;
  }
  var derniereEtapeOuverte = null;
  ordreEtapesAction.forEach(function (id) { if (etatAccordeon[id] === true) { derniereEtapeOuverte = id; } });
  if (derniereEtapeOuverte) {
    ordreEtapesAction.forEach(function (id) {
      if (id !== derniereEtapeOuverte && etatAccordeon[id] === true) { etatAccordeon[id] = false; }
    });
  }
  var html = afficherProgression('resultats') +
    // TACHE (retour utilisateur : sous-titre pas pertinent hors "creer un cv") :
    // "Choisissez votre document, personnalisez-le..." suppose un parcours
    // de creation depuis zero -- ne correspond pas a ce que vit une
    // personne en "mettre a jour"/"j'ai un cv" (elle a deja son document).
    '<div class="text-center"><h1>&#128640; Passons à l’action</h1>' +
    (dossier.modeCreation === 'nouveau' ? '<p class="sousTitre">Choisissez votre document, personnalisez-le, puis laissez l’assistant IA vous accompagner.</p>' : '') +
    '</div>' +
    selecteurDocument +
    (carteChoisie
      ? (etapeAtteinte('adaptation-metier') ? accordeonAdaptation : '') +
        (etapeAtteinte('infos-ia') ? accordeonInfosIA : '') +
        (etapeAtteinte('choix-ia') ? accordeonChoixIA : '') +
        (etapeAtteinte('import-ia') ? accordeonImportIA : '') +
        (etapeAtteinte('apercu-document') ? accordeonApercuDoc : '') +
        (etapeAtteinte('exporter-document') ? accordeonExporter : '')
      : '') +
    accordeonRessources +
    // TACHE (bouton "Merci bien, j'ai fini") : n'apparait que si le document
    // ACTUELLEMENT actif (docActif) a ete reellement enregistre par la
    // personne (telechargement Word ou texte) -- pas seulement atteint son
    // etape Exporter (cvTermine/lettreTerminee, qui deverrouillent juste la
    // carte suivante). Change de document actif => disparait, jusqu'a ce
    // que CE nouveau document soit a son tour enregistre.
    barreNavigation('revelation', null, null,
      { terminerParcours: !!(dossier.documentsEnregistres && dossier.documentsEnregistres[docActif]) });
  app.innerHTML = html;

  brancherEvenementsResultats();
}

// TACHE (retour utilisateur : Envoyer par mail) : logique de generation du
// document extraite de l'ancien gestionnaire "Telecharger le Word" (memes
// generateurs natifs, memes reglages etat.modele/couleur/formatPage),
// desormais partagee -- Telecharger le Word ET Envoyer par mail l'utilisent
// toutes deux, aucune duplication.
function genererBlobDocumentActif(type) {
  var etat = etatApercuInline[type] || {};
  // TACHE (retour utilisateur : bouton "Envoyer par mail" ne fait rien) :
  // etat.modele vaut null tant que l'accordeon "Apercu et finalisation"
  // n'a jamais ete ouvert (voir etatApercuInline, valeurs initiales) -- si
  // "Exporter"/"Envoyer par mail" est utilise AVANT d'avoir visite cet
  // accordeon, aucun modele n'est defini et la generation echouait
  // silencieusement (rejetee car absent de la liste des modeles natifs).
  // Meme repli que ouvrirApercuDocxIntegre() ailleurs dans ce fichier.
  var modeleParDefautParType = { cv: 'aquarelle', lettre: 'sobre', entretien: 'clair' };
  // TACHE (retour utilisateur : sélecteur de modèles A5, comme pour A4) :
  // en format A5, le modele choisi vit dans etat.modeleA5 (champ distinct,
  // jamais etat.modele -- qui reste reserve au choix A4).
  var modeleActif = (type === 'cv' && etat.formatPage === 'A5')
    ? (etat.modeleA5 || 'portrait')
    : (etat.modele || modeleParDefautParType[type]);
  var nomFichierDocx = type === 'lettre' ? 'lettre.docx' : type === 'entretien' ? 'preparation-entretien.docx' : 'cv.docx';
  var GENERATEURS_NATIFS_PAR_TYPE = {
    cv: {
      generer: function (modele, donnees, couleur) {
        if (typeof _dnConstruireDocumentAvecOptions === 'function') {
          return chargerLibrairieDocxNatif().then(function (docx) {
            var document = _dnConstruireDocumentAvecOptions(docx, donnees, modele, couleur, etat.formatPage);
            if (!document) { throw new Error('Modele non couvert.'); }
            return docx.Packer.toBlob(document);
          });
        }
        return (typeof genererDocxNatifCVColore === 'function' ? genererDocxNatifCVColore : genererDocxNatifCV)(modele, donnees, couleur);
      },
      // TACHE (retour utilisateur : sélecteur A5) : liste de validation
      // distincte en A5 (MODELES_AVEC_DOCX_NATIF_A5_CV, voir formatA5CV.js/
      // miniCvA5.js) -- un id de modele A5 ('portrait') n'a aucune raison
      // d'exister dans la liste des modeles A4.
      liste: etat.formatPage === 'A5'
        ? (typeof MODELES_AVEC_DOCX_NATIF_A5_CV !== 'undefined' ? MODELES_AVEC_DOCX_NATIF_A5_CV : ['portrait'])
        : (typeof MODELES_AVEC_DOCX_NATIF_CV !== 'undefined' ? MODELES_AVEC_DOCX_NATIF_CV : []),
      donnees: function () {
        // TACHE (retour utilisateur : "A4 Essentiel" et "A4 Détaillé"
        // produisent le meme contenu) : cause identifiee -- seul le format
        // A5 etait distingue ici, 'A4-essentiel' retombait silencieusement
        // sur construireObjetCVPourExport (le jeu de donnees COMPLET,
        // celui d'A4 Détaillé) au lieu de construireObjetCVPourExportEssentiel
        // (contenu allege). Meme branchement que genererDocxNatifCVFormat()
        // (formatA5CV.js, deja correct), desormais aligne ici aussi. Ce bug
        // ne touchait que "Télécharger le Word"/"Envoyer par mail" -- le
        // panneau d'apercu integre (_configApercuDocx) passe deja par
        // genererDocxNatifCVFormat() et n'etait pas concerne.
        if (etat.formatPage === 'A5' && typeof construireObjetCVPourExportA5 === 'function') { return Promise.resolve(construireObjetCVPourExportA5(modeleActif)); }
        if (etat.formatPage === 'A4-essentiel' && typeof construireObjetCVPourExportEssentiel === 'function') { return Promise.resolve(construireObjetCVPourExportEssentiel(modeleActif)); }
        return (typeof construireObjetCVPourExport === 'function') ? construireObjetCVPourExport(modeleActif) : Promise.resolve(normaliserDonneesCV(dossier));
      }
    },
    // TACHE (couleurs + formats pour la lettre et l'entretien) :
    // genererDocxNatifLettreFormat()/genererDocxNatifEntretienFormat()
    // (formatsLettreEntretien.js) construisent DEJA les donnees recadrees
    // en interne selon etat.formatPage -- donnees() devient un simple
    // passe-plat, tout se joue dans generer().
    lettre: {
      generer: function (modele, donnees, couleur) {
        if (typeof genererDocxNatifLettreFormat === 'function') { return genererDocxNatifLettreFormat(modele, couleur, etat.formatPage); }
        return (typeof genererDocxNatifLettre !== 'undefined' ? genererDocxNatifLettre : null)(modele, donnees);
      },
      liste: typeof MODELES_AVEC_DOCX_NATIF_LETTRE !== 'undefined' ? MODELES_AVEC_DOCX_NATIF_LETTRE : [],
      donnees: function () { return Promise.resolve(normaliserDonneesLettre(dossier)); }
    },
    entretien: {
      generer: function (modele, donnees, couleur) {
        if (typeof genererDocxNatifEntretienFormat === 'function') { return genererDocxNatifEntretienFormat(modele, couleur, etat.formatPage); }
        return (typeof genererDocxNatifEntretien !== 'undefined' ? genererDocxNatifEntretien : null)(modele, donnees);
      },
      liste: typeof MODELES_AVEC_DOCX_NATIF_ENTRETIEN !== 'undefined' ? MODELES_AVEC_DOCX_NATIF_ENTRETIEN : [],
      donnees: function () { return Promise.resolve(normaliserDonneesEntretien(dossier)); }
    }
  };
  var configNatif = GENERATEURS_NATIFS_PAR_TYPE[type];
  var estAvecGenerateurNatif = configNatif && configNatif.generer && configNatif.liste.indexOf(modeleActif) !== -1;
  if (!estAvecGenerateurNatif) { return Promise.reject(new Error('Pas de generateur Word natif disponible pour ce modele.')); }
  return configNatif.donnees().then(function (donnees) {
    return configNatif.generer(modeleActif, donnees, etat.couleur);
  }).then(function (blob) {
    return { blob: blob, nomFichier: nomFichierDocx };
  });
}

function brancherEvenementsResultats() {
  // Accordeons (generique, fonctionne pour tous les data-accordeon de la page)
  wireAccordeon(pageResultats);

  // TACHE (page Action, "pastille generique") : remplace le cablage des
  // radios natifs -- meme ecriture dans dossier.preferencesIA, mais mise a
  // jour visuelle LOCALE (pas de re-render complet, evite tout saut de
  // defilement) + desactivation possible d'un second clic sur la pastille
  // deja active (retour a "aucune preference").
  document.querySelectorAll('[data-pastille-champ]').forEach(function (el) {
    el.addEventListener('click', function () {
      var champ = this.dataset.pastilleChamp;
      var valeurClic = this.dataset.pastilleValeur;
      var nouvelleValeur = (dossier.preferencesIA[champ] === valeurClic) ? null : valeurClic;
      dossier.preferencesIA[champ] = nouvelleValeur;
      document.querySelectorAll('[data-pastille-champ="' + champ + '"]').forEach(function (p) {
        var actif = (p.dataset.pastilleValeur === nouvelleValeur);
        p.setAttribute('aria-pressed', actif ? 'true' : 'false');
        p.style.cssText = stylePastilleInline(actif);
      });
    });
  });

  // TACHE (page Action, tache 2) : les cartes deviennent UNIQUEMENT le
  // selecteur de document actif -- plus aucune popup declenchee ici (toute
  // la navigation passe desormais par les accordeons de cette page).
  document.querySelectorAll('.outil-item').forEach(function (el) {
    el.addEventListener('click', function () {
      var outil = this.dataset.outil;
      // TACHE (retour utilisateur : navigation libre entre CV/Lettre/Entretien) :
      // changer de document ne reinitialise plus rien ici -- chaque type a
      // desormais son propre tiroir de progression (etatAccordeonParType,
      // voir accordeonPourType()), resynchronise automatiquement en debut
      // de pageResultats(). Revenir sur un document deja avance retrouve
      // exactement l'etat ou on l'avait laisse ; un document jamais visite
      // demarre naturellement a "Adaptation au metier" (etat initial de
      // accordeonPourType()).
      // TACHE (page Action, verrouillage progressif des cartes) : memes
      // regles que dans pageResultats() (desactiveCV/Lettre/Entretien),
      // recalculees ici car cette fonction n'a pas acces aux variables
      // locales de pageResultats() (portee separee).
      var modePret = (dossier.modeCreation === 'pret');
      if (outil === 'cv') {
        if (modePret) { return; } // carte verrouillee : deja un CV (mode "pret")
        dossier.dernierDocumentPrepare = 'cv';
        pageResultats();
      } else if (outil === 'lettre') {
        if (!modePret && !dossier.cvTermine) { return; } // carte verrouillee : CV pas encore termine
        dossier.dernierDocumentPrepare = 'lettre';
        pageResultats();
      } else if (outil === 'entretien') {
        if (!dossier.lettreTerminee) { return; } // carte verrouillee : lettre pas encore terminee
        dossier.dernierDocumentPrepare = 'entretien';
        pageResultats();
      }
      else if (outil === 'pmsmp') { window.open('https://immersion-facile.beta.gouv.fr/', '_blank'); }
      else if (outil === 'formation') { window.open('https://rafael.cap-metiers.pro/recherche/accueil', '_blank'); }
      else if (outil === 'explorer') { window.open('https://www.parcoureo.fr/', '_blank'); }
    });
  });

  // TACHE (navigation guidee) : boutons "Continuer ->" des etapes qui n'ont
  // pas d'action naturelle de cloture (Adaptation, Informations, Apercu).
  var btnContinuerAdaptation = document.getElementById('btnContinuerAdaptation');
  if (btnContinuerAdaptation) {
    btnContinuerAdaptation.addEventListener('click', function () {
      avancerEtape('adaptation-metier', 'infos-ia');
      pageResultats();
    });
  }
  var btnContinuerInfosIA = document.getElementById('btnContinuerInfosIA');
  if (btnContinuerInfosIA) {
    btnContinuerInfosIA.addEventListener('click', function () {
      avancerEtape('infos-ia', 'choix-ia');
      pageResultats();
    });
  }
  var btnVerifierInfosIA = document.getElementById('btnVerifierInfosIA');
  if (btnVerifierInfosIA) {
    btnVerifierInfosIA.addEventListener('click', function () {
      ouvrirVerificationInformations(docActifActuel());
    });
  }
  // TACHE (retour utilisateur : texte manuel fige, ajouts ulterieurs ignores) :
  // efface l'instantane fige -- texteProfilEffectif() retombe alors
  // immediatement sur texteProfil(), toujours regenere a partir du dossier
  // a jour.
  var btnRevenirTexteAutoIA = document.getElementById('btnRevenirTexteAutoIA');
  if (btnRevenirTexteAutoIA) {
    btnRevenirTexteAutoIA.addEventListener('click', function () {
      dossier.profilTexteManuel = null;
      pageResultats();
    });
  }
  var btnAllerPhotoIdentite = document.getElementById('btnAllerPhotoIdentite');
  if (btnAllerPhotoIdentite) {
    btnAllerPhotoIdentite.addEventListener('click', function () {
      // TACHE (retour utilisateur : comprendre pourquoi on est envoye ici) :
      // ouvre directement le bloc "Vous" et sa sous-section "Identite"
      // (ou se trouve le champ photo) avant de naviguer -- coherent avec
      // le bouton "Valider et revenir à l'aperçu du CV" qui s'y trouve.
      etatBlocERIPOuvert = 'vous';
      etatAccordeonGroupe.vous = 'identite';
      etatVenantDePhotoAction = true;
      naviguerVers('projet');
    });
  }
  var checkInclurePhotoApercu = document.getElementById('checkInclurePhotoApercu');
  if (checkInclurePhotoApercu) {
    checkInclurePhotoApercu.addEventListener('change', function () {
      dossier.photo.inclure = this.checked;
      rechargerApercuInline('cv', etatApercuInline.cv.modele);
    });
  }
  var btnRetirerPhotoApercu = document.getElementById('btnRetirerPhotoApercu');
  if (btnRetirerPhotoApercu) {
    btnRetirerPhotoApercu.addEventListener('click', function () {
      dossier.photo = { url: null, inclure: false };
      pageResultats();
    });
  }
  var btnContinuerApercu = document.getElementById('btnContinuerApercu');
  if (btnContinuerApercu) {
    btnContinuerApercu.addEventListener('click', function () {
      // TACHE (page Action, verrouillage progressif des cartes) : c'est ici
      // -- et seulement ici -- que le document ACTUELLEMENT actif est
      // considere reellement termine (il atteint sa propre etape Exporter),
      // ce qui deverrouille la carte suivante. Ne concerne jamais l'autre
      // document par effet de bord, contrairement a etatAccordeon (partage).
      // TACHE (dette technique, chantier 1) : utilise desormais
      // docActifActuel(), la fonction centrale -- ne recalcule plus
      // localement une formule potentiellement divergente.
      var typeApercuActif = docActifActuel();
      if (typeApercuActif === 'cv') { dossier.cvTermine = true; }
      else if (typeApercuActif === 'lettre') { dossier.lettreTerminee = true; }
      avancerEtape('apercu-document', 'exporter-document');
      pageResultats();
    });
  }
  // TACHE (retour utilisateur : navigation croisee) : bascule le document
  // actif ET ouvre directement "Choisissez votre assistant IA" du nouveau
  // document, MAIS seulement s'il n'a jamais ete commence -- avec le
  // stockage par type (etatAccordeonParType), un document deja avance
  // (visite precedemment, meme abandonne en cours de route) retrouve son
  // propre etat tel quel, jamais ecrase par ce raccourci.
  var btnSuggererLettre = document.getElementById('btnSuggererLettre');
  if (btnSuggererLettre) {
    btnSuggererLettre.addEventListener('click', function () {
      dossier.dernierDocumentPrepare = 'lettre';
      if (!etatAccordeonParType.lettre) {
        etatAccordeonParType.lettre = { 'adaptation-metier': false, 'infos-ia': false, 'choix-ia': true };
      }
      pageResultats();
    });
  }
  var btnSuggererEntretien = document.getElementById('btnSuggererEntretien');
  if (btnSuggererEntretien) {
    btnSuggererEntretien.addEventListener('click', function () {
      dossier.dernierDocumentPrepare = 'entretien';
      if (!etatAccordeonParType.entretien) {
        etatAccordeonParType.entretien = { 'adaptation-metier': false, 'infos-ia': false, 'choix-ia': true };
      }
      pageResultats();
    });
  }

  // TACHE (page Action, tache 2) : accordeon "Choisissez votre assistant IA"
  // -- reutilise ouvrirFenetreAssistantIA() (composant generique existant,
  // deja utilise ailleurs pour le meme usage) et texteProfil()/promptCache()
  // (deja utilisees par "Informations transmises a l'IA"). Aucune gestion
  // de l'identite/mise en avant ici : migration prevue dans une tache
  // dediee (limite connue).
  document.querySelectorAll('[data-assistant]').forEach(function (el) {
    el.addEventListener('click', function () {
      var idAssistant = this.dataset.assistant;
      var assistant = ASSISTANTS_IA.filter(function (a) { return a.id === idAssistant; })[0];
      if (!assistant) { return; }
      var type = docActifActuel();
      ouvrirFenetreAssistantIA({
        nomAssistant: assistant.nom,
        urlAssistant: assistant.url,
        construireTexteACopier: function () {
          return promptCache(type, texteProfilEffectif(type));
        },
        onApresValidation: function () {
          avancerEtape('choix-ia', 'import-ia');
          pageResultats();
        }
      });
    });
  });

  // TACHE (page Action, tache 3) : bouton "Importer" -- dispatch par type de
  // document actif, meme logique que l'ancienne popup (analyserReponseIA*
  // + genererResumeImportCV/genererResumeGeneriqueImportIA), sans window.opener.
  var btnImporterReponseIA = document.getElementById('btnImporterReponseIA');
  var messageImportIA = document.getElementById('messageImportIA');
  if (btnImporterReponseIA) {
    activerCollageInstantane({
      idZoneAuto: 'zoneCollageAutoActionIA',
      idZoneApercu: 'zoneApercuCollageActionIA',
      idTextarea: 'texteCollageActionIA',
      idBoutonColler: 'btnCollerAutoActionIA',
      idBoutonCollerManuel: 'btnCollerManuelActionIA',
      idBoutonEffacerRecoller: 'btnEffacerRecollerActionIA',
      idBoutonImporter: 'btnImporterReponseIA',
      onErreur: function (msg) { messageImportIA.style.color = '#b91c1c'; messageImportIA.textContent = '⚠️ ' + msg; },
      onEffacer: function () { messageImportIA.textContent = ''; },
      onSucces: function () { messageImportIA.style.color = '#157347'; messageImportIA.textContent = '✅ Réponse importée automatiquement depuis le presse-papiers, aucune saisie nécessaire.'; },
      onCollerManuel: function () { messageImportIA.textContent = ''; }
    });
    btnImporterReponseIA.addEventListener('click', function () {
      var texte = document.getElementById('texteCollageActionIA').value;
      var type = docActifActuel();
      if (type === 'cv') {
        var resultat = analyserReponseIACV(texte);
        if (!resultat.succes) { messageImportIA.style.color = '#b91c1c'; messageImportIA.textContent = '⚠️ ' + resultat.erreur; return; }
        // TACHE (retour utilisateur : "Écran 3" -- choisir/réordonner les
        // propositions IA) : n'ecrit plus directement dans dossier.ia.cv ici
        // -- s'ouvre d'abord sur un ecran de choix (brouillon en memoire,
        // rien dans dossier tant que "Je valide" n'a pas ete clique). Le
        // reste (avancerEtape + pageResultats) n'a lieu qu'APRES validation,
        // voir plus bas.
        var brouillon = creerBrouillonChoixIACV(resultat.valeurs);
        ouvrirEcranChoixReponseIACV(brouillon, function (brouillonValide) {
          var valeursFinales = appliquerBrouillonChoixIACV(brouillonValide);
          if (!dossier.ia) { dossier.ia = creerDossierIAVide(); }
          if (!dossier.ia.cv) { dossier.ia.cv = creerDossierIAVide().cv; }
          dossier.ia.cv.profil = valeursFinales.profil;
          dossier.ia.cv.accrochesProposees = valeursFinales.accrochesProposees;
          dossier.ia.cv.pointsForts = valeursFinales.pointsForts;
          dossier.ia.cv.motsCles = valeursFinales.motsCles;
          dossier.ia.cv.recommandations = valeursFinales.recommandations;
          if (typeof rafraichirApercuCVSiOuvert === 'function') { rafraichirApercuCVSiOuvert(); }
          messageImportIA.style.color = 'inherit';
          messageImportIA.innerHTML = genererResumeImportCV(valeursFinales, dossier);
          avancerEtape('import-ia', 'apercu-document');
          pageResultats();
        }, function () { /* Retour : ferme l'ecran de choix, la zone de collage reste affichee telle quelle pour recoller/reimporter. */ });
        return;
      } else if (type === 'lettre') {
        var resultatLettre = analyserReponseIALettre(texte);
        if (!resultatLettre.succes) { messageImportIA.style.color = '#b91c1c'; messageImportIA.textContent = '⚠️ ' + resultatLettre.erreur; return; }
        if (!dossier.ia) { dossier.ia = creerDossierIAVide(); }
        if (!dossier.ia.lettre) { dossier.ia.lettre = creerDossierIAVide().lettre; }
        dossier.ia.lettre.accroche = resultatLettre.valeurs.accroche;
        dossier.ia.lettre.arguments = resultatLettre.valeurs.arguments;
        // TACHE (retour utilisateur : 3 versions de lettre, cartes dans
        // l'apercu) : la premiere version est active par defaut (deja la
        // mieux classee par l'IA) -- "lettre" (lu par
        // normaliserDonneesLettre.js) est toujours une copie de
        // versions[versionActive], jamais une reference partagee (edition
        // independante de chaque version, voir wireApercuVersionsLettre).
        dossier.ia.lettre.versions = resultatLettre.valeurs.versions;
        dossier.ia.lettre.versionActive = 0;
        dossier.ia.lettre.lettre = { objet: resultatLettre.valeurs.versions[0].objet, texte: resultatLettre.valeurs.versions[0].texte };
        messageImportIA.style.color = 'inherit';
        messageImportIA.innerHTML = genererResumeGeneriqueImportIA(
          { accroche: resultatLettre.valeurs.accroche, arguments: resultatLettre.valeurs.arguments, texteLettre: dossier.ia.lettre.lettre.texte },
          SPEC_AFFICHAGE_LETTRE
        );
      } else if (type === 'entretien') {
        var resultatEntretien = analyserReponseIAEntretien(texte);
        if (!resultatEntretien.succes) { messageImportIA.style.color = '#b91c1c'; messageImportIA.textContent = '⚠️ ' + resultatEntretien.erreur; return; }
        if (!dossier.ia) { dossier.ia = creerDossierIAVide(); }
        if (!dossier.ia.entretien) { dossier.ia.entretien = {}; }
        dossier.ia.entretien.presentation = resultatEntretien.valeurs.presentation;
        dossier.ia.entretien.pointsAPreparer = resultatEntretien.valeurs.pointsAPreparer;
        dossier.ia.entretien.questionsAnticipees = resultatEntretien.valeurs.questionsAnticipees;
        dossier.ia.entretien.questionsDuCandidat = resultatEntretien.valeurs.questionsDuCandidat;
        messageImportIA.style.color = 'inherit';
        messageImportIA.innerHTML = genererResumeGeneriqueImportIA(resultatEntretien.valeurs, SPEC_AFFICHAGE_ENTRETIEN);
      }
      // TACHE (navigation guidee) : import reussi (les 3 branches ci-dessus
      // "return" plus tot en cas d'echec) -> avance automatiquement.
      avancerEtape('import-ia', 'apercu-document');
      pageResultats();
    });
  }

  // TACHE (retour utilisateur : cartes de modeles pour Lettre/Entretien) :
  // le <select> n'existe plus pour aucun des 3 types (carrousel de
  // vignettes partout desormais, cf. construireCarrouselModeles) -- son
  // cablage est retire.
  // TACHE (page Action, apercu inline reel) : "Ouvrir le grand aperçu"
  // pointe desormais directement vers le panneau plein ecran reel
  // (apercuDocxIntegre.js) -- l'ancien mecanisme de synchronisation par
  // sondage (ouvrirGrandApercuEtSynchroniser/setInterval) n'a plus de
  // raison d'etre : l'apercu inline affiche deja le vrai rendu, il n'y a
  // plus de "petit apercu" desynchronise a rattraper.
  var btnOuvrirGrandApercu = document.getElementById('btnOuvrirGrandApercu');
  if (btnOuvrirGrandApercu) {
    btnOuvrirGrandApercu.addEventListener('click', function () {
      var type = docActifActuel();
      var modele = (etatApercuInline[type] && etatApercuInline[type].modele) || 'moderne';
      if (typeof ouvrirApercuDocxIntegre === 'function') { ouvrirApercuDocxIntegre(type, modele); }
    });
  }
  var btnRevoirPropositionsIA = document.getElementById('btnRevoirPropositionsIA');
  if (btnRevoirPropositionsIA) {
    btnRevoirPropositionsIA.addEventListener('click', function () {
      var ia = (dossier.ia && dossier.ia.cv) || creerDossierIAVide().cv;
      var brouillon = creerBrouillonChoixIACV(ia);
      ouvrirEcranChoixReponseIACV(brouillon, function (brouillonValide) {
        var valeursFinales = appliquerBrouillonChoixIACV(brouillonValide);
        dossier.ia.cv.profil = valeursFinales.profil;
        dossier.ia.cv.accrochesProposees = valeursFinales.accrochesProposees;
        dossier.ia.cv.pointsForts = valeursFinales.pointsForts;
        dossier.ia.cv.motsCles = valeursFinales.motsCles;
        dossier.ia.cv.recommandations = valeursFinales.recommandations;
        if (typeof rafraichirApercuCVSiOuvert === 'function') { rafraichirApercuCVSiOuvert(); }
        pageResultats();
      }, function () { /* Retour : ne change rien, referme simplement l'ecran. */ });
    });
  }
  // TACHE (retour utilisateur : 3 versions de lettre, cartes dans
  // l'apercu) : clic sur une carte = elle devient la version active ;
  // "lettre" (seul champ lu par normaliserDonneesLettre.js) est
  // resynchronise sur cette version avant de re-rendre la page --
  // l'apercu inline se recharge automatiquement via
  // initialiserApercuInlineSiOuvert(), deja appelee en fin de pageResultats().
  document.querySelectorAll('[data-version-lettre]').forEach(function (carte) {
    carte.addEventListener('click', function () {
      var i = parseInt(this.dataset.versionLettre, 10);
      var v = dossier.ia.lettre.versions[i];
      if (!v) { return; }
      dossier.ia.lettre.versionActive = i;
      dossier.ia.lettre.lettre = { objet: v.objet, texte: v.texte };
      pageResultats();
    });
  });
  var btnModifierEntretien = document.getElementById('btnModifierEntretien');
  if (btnModifierEntretien) {
    btnModifierEntretien.addEventListener('click', function () {
      var ent = dossier.ia.entretien;
      ouvrirFenetreERIP({
        titre: 'Modifier la préparation à l’entretien',
        taille: 'large',
        contenuHTML:
          '<label class="small fw-bold text-muted d-block mb-1">Ma présentation</label>' +
          '<textarea class="form-control form-control-sm mb-3" rows="4" id="editionPresentationEntretien">' + echapperAttribut(ent.presentation || '') + '</textarea>' +
          '<label class="small fw-bold text-muted d-block mb-1">Points à préparer (un par ligne)</label>' +
          '<textarea class="form-control form-control-sm mb-3" rows="4" id="editionPointsEntretien">' + echapperAttribut((ent.pointsAPreparer || []).join('\n')) + '</textarea>' +
          '<label class="small fw-bold text-muted d-block mb-1">Questions à poser au recruteur (une par ligne)</label>' +
          '<textarea class="form-control form-control-sm" rows="4" id="editionQuestionsCandidatEntretien">' + echapperAttribut((ent.questionsDuCandidat || []).join('\n')) + '</textarea>' +
          '<p class="small text-muted mt-2 mb-0">Les questions anticipées ne se modifient pas encore ici.</p>' +
          '<div class="text-end mt-3"><button type="button" id="btnEnregistrerEntretien" style="font-size:1rem;font-weight:700;padding:0.6rem 1.6rem;' +
          'background:#0d6efd;color:#FFFFFF;border:none;border-radius:999px;box-shadow:0 4px 14px rgba(13,110,253,.4);">Enregistrer</button></div>'
      });
      document.getElementById('btnEnregistrerEntretien').addEventListener('click', function () {
        function versListeLignes(id) {
          return document.getElementById(id).value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        }
        dossier.ia.entretien.presentation = document.getElementById('editionPresentationEntretien').value;
        dossier.ia.entretien.pointsAPreparer = versListeLignes('editionPointsEntretien');
        dossier.ia.entretien.questionsDuCandidat = versListeLignes('editionQuestionsCandidatEntretien');
        fermerFenetreERIP();
        pageResultats();
      });
    });
  }
  var btnModifierVersionLettre = document.getElementById('btnModifierVersionLettre');
  if (btnModifierVersionLettre) {
    btnModifierVersionLettre.addEventListener('click', function () {
      var i = dossier.ia.lettre.versionActive || 0;
      var v = dossier.ia.lettre.versions[i] || { objet: '', texte: '' };
      ouvrirFenetreERIP({
        titre: 'Modifier la version ' + (i + 1),
        taille: 'large',
        contenuHTML:
          '<label class="small fw-bold text-muted d-block mb-1">Objet</label>' +
          '<input type="text" class="form-control form-control-sm mb-3" id="editionObjetLettre" value="' + echapperAttribut(v.objet) + '">' +
          '<label class="small fw-bold text-muted d-block mb-1">Texte de la lettre</label>' +
          '<textarea class="form-control form-control-sm" rows="14" id="editionTexteLettre">' + echapperAttribut(v.texte) + '</textarea>' +
          '<div class="text-end mt-3"><button type="button" id="btnEnregistrerVersionLettre" style="font-size:1rem;font-weight:700;padding:0.6rem 1.6rem;' +
          'background:#0d6efd;color:#FFFFFF;border:none;border-radius:999px;box-shadow:0 4px 14px rgba(13,110,253,.4);">Enregistrer</button></div>'
      });
      document.getElementById('btnEnregistrerVersionLettre').addEventListener('click', function () {
        var nouvelObjet = document.getElementById('editionObjetLettre').value;
        var nouveauTexte = document.getElementById('editionTexteLettre').value;
        dossier.ia.lettre.versions[i] = { objet: nouvelObjet, texte: nouveauTexte };
        dossier.ia.lettre.lettre = { objet: nouvelObjet, texte: nouveauTexte };
        fermerFenetreERIP();
        pageResultats();
      });
    });
  }
  document.querySelectorAll('[data-format-export]').forEach(function (el) {
    el.addEventListener('click', function () {
      var format = this.dataset.formatExport;
      var type = docActifActuel();
      // TACHE (retour utilisateur : retrait vieux systeme de popup) : le
      // format "pdf" n'est declenche par aucun bouton (voir
      // formatsParTypeExport plus haut) -- bloc mort retire, avec le
      // systeme de popup dont il dependait (ouvrirApercuCV/ouvrirApercuLettre).
      if (format === 'autre') {
        // TACHE (correction bug : "Autre" ne faisait rien) : bascule via une
        // classe CSS (plus robuste qu'une lecture de style inline, qui peut
        // se desynchroniser silencieusement) -- voir aussi zoneAutreExport
        // construite avec display:none par defaut, cette classe l'emporte
        // toujours (meme niveau de specificite, appliquee en dernier).
        var zoneAutre = document.getElementById('zoneAutreExport');
        if (zoneAutre) {
          var estMasquee = zoneAutre.style.display === 'none' || zoneAutre.style.display === '';
          zoneAutre.style.setProperty('display', estMasquee ? 'block' : 'none', 'important');
        }
      } else if (format === 'json') {
        var objet = normaliserDonneesCV(dossier);
        telechargerFichierTexte('cv.json', JSON.stringify(objet, null, 2), 'application/json;charset=utf-8');
        marquerDocumentEnregistre(type);
      } else if (format === 'csv-canva') {
        // TACHE (retour utilisateur : "Autre" regroupe JSON+CSV) : reutilise
        // genererCSVCanva(), deja existante (servait auparavant a l'ancienne
        // popup ouvrirAideIA()) -- identite complete incluse (plus
        // d'anonymisation, cf. retrait de cette fonctionnalite).
        if (typeof genererCSVCanva === 'function') {
          telechargerFichierTexte('canva_cv.csv', '\uFEFF' + genererCSVCanva(true), 'text/csv;charset=utf-8;');
          marquerDocumentEnregistre(type);
        }
      } else if (format === 'docx') {
        var etat = etatApercuInline[type] || {};
        var boutonDocx = this;
        var texteOriginalDocx = boutonDocx.textContent;
        boutonDocx.textContent = 'Génération…';
        boutonDocx.disabled = true;
        genererBlobDocumentActif(type).then(function (resultat) {
          var urlBlob = URL.createObjectURL(resultat.blob);
          var lien = document.createElement('a');
          lien.href = urlBlob;
          lien.download = resultat.nomFichier;
          document.body.appendChild(lien);
          lien.click();
          lien.remove();
          setTimeout(function () { URL.revokeObjectURL(urlBlob); }, 1000);
          boutonDocx.textContent = texteOriginalDocx;
          boutonDocx.disabled = false;
          // TACHE (bouton "Merci bien, j'ai fini") : le telechargement reussi
          // du Word est la confirmation que la personne a bien recupere son
          // document -- c'est ce qui declenche l'apparition du bouton de fin
          // de parcours (voir pageResultats()), independamment de
          // cvTermine/lettreTerminee (qui pilotent le deverrouillage de la
          // carte suivante, deja poses avant meme d'arriver a l'export).
          marquerDocumentEnregistre(type);
          // TACHE (retour utilisateur : rappel de sauvegarde) : affiche a
          // chaque telechargement -- ce site ne conserve rien (statique,
          // aucune donnee stockee), le fichier telecharge est la SEULE
          // copie du document tant qu'il n'est pas sauvegarde ailleurs.
          var messageRappel = document.getElementById('messageTelechargerWord');
          if (messageRappel) {
            messageRappel.style.display = 'block';
            messageRappel.innerHTML = '&#128190; Pensez à sauvegarder ce document : envoyez-le-vous par e-mail, ' +
              'ou copiez-le sur une clé USB ou un espace personnel — ce site ne conserve aucune donnée, ce fichier ' +
              'téléchargé est votre seule copie tant qu\'il n\'est pas enregistré ailleurs.';
          }
        }).catch(function () {
          boutonDocx.textContent = texteOriginalDocx;
          boutonDocx.disabled = false;
          var nomFichierDocx = type === 'lettre' ? 'lettre.docx' : type === 'entretien' ? 'preparation-entretien.docx' : 'cv.docx';
          exporterDocumentEnDocx(etat.html, etat.css, nomFichierDocx, boutonDocx, function () { marquerDocumentEnregistre(type); });
        });
      } else if (format === 'apercu') {
        // TACHE (simplification : DOCX seul + apercu integre, etendu a la
        // lettre et l'entretien) : ouvre le panneau integre qui affiche
        // le VRAI rendu .docx (voir apercuDocxIntegre.js), a la place de
        // l'ancienne fenetre popup.
        var modeleParDefautParType = { cv: 'aquarelle', lettre: 'sobre', entretien: 'clair' };
        var modelePourApercu = (etatApercuInline[type] && etatApercuInline[type].modele) || modeleParDefautParType[type];
        if (typeof ouvrirApercuDocxIntegre === 'function') {
          ouvrirApercuDocxIntegre(type, modelePourApercu);
        }
      } else if (format === 'texte-blocs') {
        // TACHE (simplification : filet de secours sans depenser d'argent,
        // etendu a la lettre et l'entretien) : remplace l'ancien export
        // CSV "Canva" (qui necessitait Canva Pro, payant) par un texte
        // simple, pret a copier-coller. Memes donnees que le DOCX, aucune
        // divergence possible.
        if (type === 'cv' && typeof genererBlocsTexteCV === 'function') {
          // TACHE (correction regression : moteur de decision IA) : meme
          // logique que le Word (construireObjetCVPourExport), pour que le
          // texte a copier reflete les memes recommandations IA -- pas une
          // deuxieme version divergente du contenu.
          var modelePourTexte = (etatApercuInline.cv && etatApercuInline.cv.modele) || 'moderne';
          var promesseObjetTexte = (typeof construireObjetCVPourExport === 'function')
            ? construireObjetCVPourExport(modelePourTexte)
            : Promise.resolve(normaliserDonneesCV(dossier));
          promesseObjetTexte.then(function (objetCV) {
            telechargerFichierTexte('cv-texte.txt', genererBlocsTexteCV(objetCV), 'text/plain;charset=utf-8');
            marquerDocumentEnregistre(type);
          });
        } else if (type === 'lettre' && typeof genererBlocsTexteLettre === 'function') {
          telechargerFichierTexte('lettre-texte.txt', genererBlocsTexteLettre(normaliserDonneesLettre(dossier)), 'text/plain;charset=utf-8');
          marquerDocumentEnregistre(type);
        } else if (type === 'entretien' && typeof genererBlocsTexteEntretien === 'function') {
          telechargerFichierTexte('entretien-texte.txt', genererBlocsTexteEntretien(normaliserDonneesEntretien(dossier)), 'text/plain;charset=utf-8');
          marquerDocumentEnregistre(type);
        }
      }
    });
  });

  initialiserApercuInlineSiOuvert();

  // Suppressions (experience, langue, experience perso)
  wireRemoveItems(pageResultats);

  // Experience (formulaire migre dans l'accordeon "Informations transmises a l'IA")
  var expBtn = document.getElementById('ajouterExpBtn');
  if (expBtn) {
    expBtn.addEventListener('click', function () {
      var poste = document.getElementById('expPoste').value.trim();
      var entreprise = document.getElementById('expEntreprise').value.trim();
      var lieu = document.getElementById('expLieu').value.trim();
      var dateDebut = lireValeurMoisAnnee('expDateDebut');
      var dateFin = lireValeurMoisAnnee('expDateFin');
      var missions = document.getElementById('expMissions').value.trim();
      // TACHE (retour utilisateur : validation trop stricte) : seuls le
      // Poste et l'Annee de debut sont desormais obligatoires -- Entreprise,
      // Lieu, mois de debut, date de fin et missions restent facultatifs.
      if (poste && dateDebut) {
        dossier.experiences.push({ poste: poste, entreprise: entreprise, lieu: lieu, dateDebut: dateDebut, dateFin: dateFin, missions: missions });
        pageResultats();
      } else { alert('Remplissez au moins le Poste et l\'année de début.'); }
    });
  }

  // Langues : cablage regroupe dans wireLangues (appelee depuis pageProjet)

  // TACHE (page Action, "champs standardises") : uniformise tous les
  // champs texte/textarea rendus sur cette page (hauteur/police, majuscule
  // auto, Entree -> champ suivant pour les input simples).
  activerChampsStandardises();

  // TACHE (retour utilisateur) : majuscule automatique EGALEMENT pour
  // "Missions / taches" -- cas particulier volontaire, contrairement aux
  // autres textarea (reponse IA collee, notamment) qui ne doivent jamais
  // etre alterees automatiquement.
  var champMissions = document.getElementById('expMissions');
  if (champMissions) {
    champMissions.addEventListener('input', function () {
      if (this.value.length > 0 && this.value.charAt(0) !== this.value.charAt(0).toUpperCase()) {
        var position = this.selectionStart;
        this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1);
        this.setSelectionRange(position, position);
      }
    });
  }
}

/* ------------------------------------------------------------
   8. AIDE IA : profil visible + prompt CACHE, bouton Copier
   ------------------------------------------------------------ */

// TACHE (standard IA, composant generique) : liste partagee des assistants
// IA proposes dans l'application. Reprend exactement les 5 memes (memes
// noms, memes URLs) que celles deja utilisees dans ouvrirAideIA() -- pas
// une nouvelle liste parallele, juste rendue reutilisable ailleurs (ici,
// pour le nouveau selecteur par cartes). ouvrirAideIA() elle-meme n'est
// pas touchee dans cette tache.
var ASSISTANTS_IA = [
  { id: 'claude', nom: 'Claude', url: 'https://claude.ai/' },
  { id: 'chatgpt', nom: 'ChatGPT', url: 'https://chat.openai.com/' },
  { id: 'gemini', nom: 'Gemini', url: 'https://gemini.google.com/' },
  { id: 'perplexity', nom: 'Perplexity', url: 'https://www.perplexity.ai/' },
  { id: 'mistral', nom: 'Mistral', url: 'https://chat.mistral.ai/' }
];

// ============================================================
// TACHE (standard IA, composant generique) : fenetre d'information/mise en
// confiance, destinee a devenir LE standard de toute interaction avec un
// assistant IA externe dans l'application. Pensee des le depart comme un
// composant reutilisable, pas specifique a l'import de CV -- seul le
// contenu (config) change selon le contexte d'appel (import de CV
// aujourd'hui ; creation du CV, lettre, entretien plus tard, sans modifier
// cette fonction).
//
// config attendu :
// - nomAssistant, urlAssistant : l'assistant deja choisi (par les cartes
//   affichees AVANT l'ouverture de cette fenetre -- cette fenetre ne fait
//   jamais choisir l'IA, uniquement confirmer et informer)
// - construireTexteACopier() : fonction fournie par l'appelant, qui
//   retourne le texte final a copier
// - onApresValidation() (optionnel) : callback apres copie + ouverture
// ============================================================
// TACHE (migration Design System, chantier "Fenetre ERIP", 5e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP() -- ne
// construit plus son propre overlay. Point de vigilance propre a cette
// migration : la fermeture peut desormais intervenir de facon ASYNCHRONE
// (apres resolution de la promesse de copie presse-papiers, ou apres son
// repli synchrone execCommand('copy')) -- jamais uniquement en reaction
// immediate a un clic, contrairement a toutes les fenetres migrees jusqu'ici.
// L'ORDRE exact des operations est preserve au caractere pres sur les deux
// chemins : copier -> ouvrir l'assistant dans un nouvel onglet -> FERMER la
// fenetre -> appeler onApresValidation().
function fermerFenetreAssistantIA() {
  fermerFenetreERIP();
}

// TACHE 3 (composant generique, etapes parametrables) : etapes du mode
// "texte" (document deja lu, contenu textuel copie avec le prompt) --
// c'etait jusqu'ici la SEULE sequence possible, en dur dans le composant.
// Devient la valeur PAR DEFAUT de config.etapes, pour ne rien casser chez
// les appelants existants (aucun ne precise etapes aujourd'hui). Le jeton
// {ASSISTANT} est remplace par config.nomAssistant au moment de l'affichage.
var ETAPES_ASSISTANT_IA_TEXTE = [
  'Le texte nécessaire est <strong>automatiquement copié</strong> dans votre presse-papiers.',
  'Une fois sur le site de {ASSISTANT}, cliquez simplement dans la zone de conversation.',
  'Faites <strong>Ctrl + V</strong>, puis appuyez sur <strong>Entrée</strong>.',
  'Une fois sa réponse affichée, cliquez sur le bouton "Copier" de {ASSISTANT}.',
  'Revenez ensuite ici pour importer cette réponse.'
];

function ouvrirFenetreAssistantIA(config) {
  var etapes = config.etapes || ETAPES_ASSISTANT_IA_TEXTE;
  var etapesHTML = etapes.map(function (etape) {
    return '<li>' + etape.replace(/\{ASSISTANT\}/g, config.nomAssistant) + '</li>';
  }).join('');

  var overlay = ouvrirFenetreERIP({
    titre: 'Avant de continuer vers ' + config.nomAssistant,
    contenuHTML:
      '<p class="small">Vous allez être redirigé(e) vers le site externe de <strong>' + config.nomAssistant + '</strong>. ' +
      'Rien de compliqué : voici exactement ce qui va se passer.</p>' +
      '<ol class="small ps-3 mb-3">' + etapesHTML + '</ol>' +
      '<div class="d-flex justify-content-end mt-3">' +
      '<button type="button" id="validerAssistantIABtn" class="btn btn-primary">Je comprends, continuer</button>' +
      '</div>'
  });

  document.getElementById('validerAssistantIABtn').addEventListener('click', function () {
    // TACHE (standard IA) : seul et unique declencheur de toute la
    // sequence -- construction du texte, copie, ouverture de l'IA.
    var texteACopier = config.construireTexteACopier();
    function ouvrirAssistant() {
      window.open(config.urlAssistant, '_blank');
      fermerFenetreERIP();
      if (typeof config.onApresValidation === 'function') { config.onApresValidation(); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texteACopier).then(ouvrirAssistant).catch(function () {
        var z = document.createElement('textarea');
        z.value = texteACopier;
        document.body.appendChild(z);
        z.select();
        document.execCommand('copy');
        z.remove();
        ouvrirAssistant();
      });
    } else {
      ouvrirAssistant();
    }
  });
}

// TACHE (retour utilisateur : verification transmission IA) : memes
// libelles que ceux affiches dans l'accordeon "Adaptation au metier"
// (pageResultats), pour que le texte transmis a l'IA soit lisible et
// coherent avec ce que la personne a choisi a l'ecran.
var LABELS_PREFERENCES_IA = {
  niveauPoste: {
    employe: 'Employé / Opérateur', ouvrier_qualifie: 'Ouvrier qualifié', technicien: 'Technicien',
    agent_maitrise: 'Agent de maîtrise', cadre: 'Cadre', direction: 'Direction / Encadrement'
  },
  niveauLangage: { naturel: 'Naturel', professionnel: 'Professionnel', tres_professionnel: 'Très professionnel' },
  adaptationMetier: {
    standard: 'Standard — document généraliste',
    adaptee: 'Adaptée au vocabulaire du métier recherché',
    specialisee: 'Spécialisée — expressions propres au secteur'
  },
  ton: { dynamique: 'Dynamique', equilibre: 'Équilibré', institutionnel: 'Institutionnel' },
  longueur: { synthetique: 'Très synthétique', equilibree: 'Équilibrée', detaillee: 'Détaillée' }
};

// ============================================================
// TACHE (pont retour utilisateur : bloc Candidature <-> generation) : point
// d'acces UNIQUE pour lire l'entreprise/le lien cible transmis a l'IA, quelle
// que soit leur origine -- jamais lus directement ailleurs dans le moteur de
// generation. Priorite explicitement demandee :
//   1. le nouveau parcours (dossier.rechercheCandidature, bloc Candidature,
//      Etape 1 de la refonte) ;
//   2. a defaut, l'ancien circuit (dossier[dossier.objectif].structure/.lien,
//      rempli via l'ecran "objectif", volontairement hors perimetre de la
//      refonte et donc jamais modifie) ;
//   3. a defaut, chaine vide.
// Avantage : le moteur de generation (texteProfil() ci-dessous) ne connait
// plus la structure interne des donnees candidature -- le jour ou l'ancien
// circuit sera retire, seules CES deux fonctions auront besoin d'etre
// modifiees, pas chaque endroit qui lit une entreprise/un lien.
// ============================================================
function entrepriseCibleActuelle() {
  var rc = dossier.rechercheCandidature;
  if (rc && rc.entreprise) { return rc.entreprise; }
  var o = dossier.objectif;
  var obj = o && dossier[o];
  if (obj && obj.structure) { return obj.structure; }
  return '';
}
function lienOffreCibleActuel() {
  var rc = dossier.rechercheCandidature;
  if (rc && rc.lienOffre) { return rc.lienOffre; }
  var o = dossier.objectif;
  var obj = o && dossier[o];
  if (obj && obj.lien) { return obj.lien; }
  return '';
}
// TACHE (retour utilisateur : "Poste vise : ?" deroutant) : le champ "poste"
// de l'ancien circuit (dossier[objectif].poste) n'est plus rempli via
// aucune interface depuis la refonte -- le metier cible (deja renseigne via
// Potentiel) EST la reponse a "quel poste ?", mais n'etait pas utilise ici
// en repli, d'ou l'affichage confus d'un "?" alors que l'IA recevait deja
// le metier ailleurs (ligne "Metier vise", plus haut dans ce texte).
function posteCibleActuel() {
  var o = dossier.objectif;
  var obj = o && dossier[o];
  if (obj && obj.poste) { return obj.poste; }
  return dossier.metierCible || dossier.secteurCible || '';
}

// TACHE (dette technique, chantier 1 : calcul du document actif) : point
// d'acces UNIQUE pour determiner quel document (cv/lettre/entretien) est
// actuellement actif sur la page "Passons a l'action", quel que soit
// l'endroit du code qui en a besoin -- jamais recalcule localement ailleurs.
// TACHE (retour utilisateur : "Sélectionné" affiché sur une carte
// verrouillée) : le simple repli "dernierDocumentPrepare || 'cv'" pointait
// toujours vers 'cv', meme quand cette carte est verrouillee (mode "pret",
// carte CV grisee car deja fournie) -- une carte pouvait alors etre a la
// fois grisee ET marquee "Selectionne", deux etats normalement
// incompatibles. Repli intelligent : pointe vers la premiere carte
// reellement disponible. Avant cette centralisation, cette regle exacte
// n'etait appliquee qu'a 3 endroits sur 10 -- les 7 autres utilisaient un
// repli simplifie ('cv' toujours), avec un resultat potentiellement
// different dans ce cas precis (mode "pret", aucun document choisi).
function docActifActuel() {
  return dossier.dernierDocumentPrepare || (dossier.modeCreation === 'pret' ? 'lettre' : 'cv');
}

// TACHE (context engineering : restructuration de texteProfil()) : la
// fonction ne construit plus une liste plate -- elle assemble desormais
// 7 sections nommees (une variable de contenu par section), puis ne
// rajoute le titre d'une section que si elle contient reellement quelque
// chose (jamais de titre suivi de rien). Chaque ligne de contenu, chaque
// condition, chaque libelle est repris A L'IDENTIQUE de l'ancienne
// version -- seul l'ORDRE et le REGROUPEMENT changent. Voir le document
// de reference Context Engineering pour la justification de cette
// structure (ordre des sections, separation faits/consignes, etc.).
function texteProfil(type) {
  var savoirEtre = savoirEtreActuels().join(', ');
  var savoirFaire = savoirFaireActuels().join(', ');
  var savoirs = obtenirSavoirs().join(', ');
  var valeurs = dossier.valeurs.map(function (v) { var d = trouverItemParId(CATALOGUE_VALEURS_PROFESSIONNELLES, v); return d ? d.label : v; }).join(', ');

  var langues = dossier.langues.map(function (l) { return l.langue + ' (' + l.niveau + ')'; }).join(', ');
  var permis = '';
  if (dossier.permis.possede === true) {
    permis = 'Permis ' + (dossier.permis.categories.length ? dossier.permis.categories.join(', ') : 'oui');
    if (dossier.permis.vehicule === true) { permis += ', véhicule personnel'; }
    else if (dossier.permis.vehicule === false) { permis += ', sans véhicule'; }
  } else if (dossier.permis.possede === false) {
    permis = 'Pas de permis';
  }

  // ---- SECTION : CONTEXTE DE LA CANDIDATURE ----
  var candidature = '';
  // TACHE (retour utilisateur : suggestions != metiers vises) : les metiers
  // RECOMMANDES par le moteur (suggererMetiers()) ne sont plus transmis a
  // l'IA -- ce sont des suggestions a explorer par la personne, pas des
  // metiers vises. Seuls comptent desormais : le metier CIBLE (un seul,
  // choix explicite) OU, en mode secteur, les metiers de la LISTE COURTE
  // (dossier.metiersCandidats -- pastilles gardees volontairement par la
  // personne, cf. "Voir tous les metiers"), jamais la liste de suggestions.
  if (dossier.metierCible) {
    candidature += '- Métier visé (à cibler en priorité pour le CV) : ' + dossier.metierCible + '\n';
  } else if (dossier.secteurCible) {
    candidature += '- Secteur d’activité visé (pas un métier précis, documents adaptés au secteur) : ' + dossier.secteurCible + '\n';
    // TACHE (retour utilisateur : verification transmission IA) : les
    // metiers "hors repertoire" (ajoutes librement par la personne, pas
    // presents dans le referentiel) restent une liste separee de
    // metiersCandidats PARTOUT ailleurs dans l'appli (affichage, garde-fous
    // de changement de mode...) -- fusion UNIQUEMENT ici, au moment de
    // construire le texte envoye a l'IA, pour ne rien casser de cette
    // logique existante tout en ne perdant plus ce choix a la transmission.
    var metiersCiblesSecteur = (dossier.metiersCandidats || []).concat(dossier.metiersHorsRepertoire || []);
    if (metiersCiblesSecteur.length) {
      candidature += '- Métiers ciblés dans ce secteur : ' + metiersCiblesSecteur.join(', ') + '\n';
    }
  }
  // TACHE (correction, CV general/specifique sans effet) : le choix devient
  // desormais une instruction explicite dans le profil transmis a l'IA --
  // uniquement pour la generation du CV lui-meme (pas pour la lettre ou
  // l'entretien, ou cette distinction n'a pas de sens).
  // TACHE (context engineering) : classee ici (contexte) et non dans
  // "Consignes de redaction" -- a la demande explicite de Denis, ce n'est
  // pas une consigne de style mais une information qui participe a la
  // comprehension de la mission.
  if (type === 'cv') {
    if (dossier.typeCV === 'specifique' && dossier.metierCible) {
      var ficheCibleTypeCV = metierParNom(dossier.metierCible);
      candidature += '- Mode CV SPÉCIFIQUE activé : adaptez précisément ce CV aux exigences du métier visé ci-dessus, plutôt qu’un CV générique.';
      if (ficheCibleTypeCV) {
        var attendus = [].concat(ficheCibleTypeCV.savoirFaire || [], ficheCibleTypeCV.savoirEtre || [], ficheCibleTypeCV.savoirs || []);
        if (attendus.length) { candidature += ' Compétences typiquement attendues pour ce métier : ' + attendus.join(', ') + '.'; }
      }
      candidature += '\n';
    } else {
      candidature += '- Mode CV GÉNÉRAL : rédigez un CV polyvalent, adaptable à plusieurs employeurs/métiers proches.\n';
    }
  }
  candidature += '- Objectif : ' + (dossier.objectif || 'non défini') + '\n';
  // TACHE 36 (context engineering, chantier 2 recadre : contradiction
  // avaree) : informations saisies via le parcours autonome "Preparer un
  // entretien" -- reservees a type === 'entretien'. Ce champ etait
  // jusqu'ici transmis SANS CONDITION DE TYPE : quelqu'un ayant deja
  // utilise ce raccourci une fois voyait l'entreprise de cet entretien
  // "fuiter" dans le contexte d'un CV ou d'une lettre generes plus tard,
  // sans rapport. dossier.entretienDirect est par nature specifique a ce
  // seul usage (voir le meme principe deja documente dans metiers.js,
  // obtenirEntrepriseEtPosteExistants()) -- il n'a jamais eu vocation a
  // s'appliquer au CV ou a la lettre.
  if (type === 'entretien' && dossier.entretienDirect && (dossier.entretienDirect.structure || dossier.entretienDirect.poste)) {
    if (dossier.entretienDirect.poste) { candidature += '- Poste visé : ' + dossier.entretienDirect.poste + '\n'; }
    if (dossier.entretienDirect.structure) { candidature += '- Entreprise / lien : ' + dossier.entretienDirect.structure + '\n'; }
  }
  // TACHE (recherche assistant) : entreprise saisie depuis le parcours guide
  if (dossier.rechercheEntreprise && dossier.rechercheEntreprise.structure) {
    candidature += '- Entreprise / lien (recherche) : ' + dossier.rechercheEntreprise.structure + '\n';
  }
  if (dossier.objectif === 'offre' || dossier.objectif === 'spontanee' || dossier.objectif === 'reconversion') {
    var of = dossier[dossier.objectif];
    // TACHE (pont retour utilisateur : bloc Candidature <-> generation) :
    // entreprise/lien lus via la couche d'abstraction (voir
    // entrepriseCibleActuelle() plus haut dans ce fichier) -- priorite au
    // nouveau parcours (rechercheCandidature), repli sur of.structure/
    // of.lien (ancien circuit, toujours modifiable depuis l'ecran
    // "Informations sur votre candidature").
    var entrepriseCible = entrepriseCibleActuelle();
    var lienCible = lienOffreCibleActuel();
    var posteCible = posteCibleActuel();
    if (dossier.objectif === 'offre') {
      if (lienCible) { candidature += '- Offre visée (lien) : ' + lienCible + '\n'; }
      if (posteCible || entrepriseCible) { candidature += '- Poste visé : ' + (posteCible || '?') + (entrepriseCible ? ' chez ' + entrepriseCible : '') + '\n'; }
    } else if (dossier.objectif === 'spontanee') {
      candidature += '- Démarche : candidature spontanée.\n';
      if (lienCible) { candidature += '- Offre de référence (lien) : ' + lienCible + '\n'; }
      if (posteCible || entrepriseCible) { candidature += '- Poste souhaité : ' + (posteCible || '?') + (entrepriseCible ? ' chez ' + entrepriseCible : '') + '\n'; }
    } else { // reconversion
      candidature += '- Démarche : changer de métier (reconversion).\n';
      if (posteCible) { candidature += '- Métier visé : ' + posteCible + '\n'; }
      if (entrepriseCible) { candidature += '- Entreprise cible : ' + entrepriseCible + '\n'; }
      if (lienCible) { candidature += '- Adresse internet : ' + lienCible + '\n'; }
    }
    if (of.dispo && of.dispo.length) { candidature += '- Disponibilités : ' + of.dispo.join(', ') + '\n'; }
  }
  if (dossier.objectif === 'stage' || dossier.objectif === 'alternance' || dossier.objectif === 'pmsmp') {
    var im = dossier[CLE_DETAILS[dossier.objectif]];
    var infos = [];
    if (im.structure) { infos.push('structure : ' + im.structure); }
    if (im.poste) { infos.push('poste visé : ' + im.poste); }
    if (im.lien) { infos.push('adresse internet : ' + im.lien); }
    if (im.duree) { infos.push('durée : ' + im.duree); }
    if (im.dates) { infos.push('dates : ' + im.dates); }
    if (im.heures) { infos.push('heures/semaine : ' + im.heures); }
    if (infos.length) { candidature += '- ' + (dossier.objectif === 'pmsmp' ? 'Immersion (PMSMP)' : (dossier.objectif === 'stage' ? 'Stage' : 'Alternance')) + ' : ' + infos.join(', ') + '\n'; }
    if (im.dispo && im.dispo.length) { candidature += '- Disponibilités : ' + im.dispo.join(', ') + '\n'; }
  }
  // TACHE (verification bout en bout : bloc Candidature -> IA) : le bloc
  // ci-dessus (offre/spontanee/reconversion) transmet deja l'entreprise/le
  // lien du nouveau parcours via entrepriseCibleActuelle()/
  // lienOffreCibleActuel(). Mais dossier.modeRecherche/typeRecherche sont
  // VOLONTAIREMENT independants de dossier.objectif (voir Etape 1) -- rien
  // n'empeche quelqu'un dont l'objectif est stage/alternance/pmsmp d'avoir
  // quand meme rempli "Je reponds a une offre" avec une entreprise dans le
  // bloc Candidature. Sans ce complement, cette information ne serait
  // jamais transmise (le bloc ci-dessus ne s'execute pas pour ces objectifs).
  if (dossier.objectif !== 'offre' && dossier.objectif !== 'spontanee' && dossier.objectif !== 'reconversion') {
    var rcOrpheline = dossier.rechercheCandidature;
    if (rcOrpheline && (rcOrpheline.entreprise || rcOrpheline.lienOffre)) {
      if (rcOrpheline.entreprise) { candidature += '- Entreprise ciblée (parcours Candidature) : ' + rcOrpheline.entreprise + '\n'; }
      if (rcOrpheline.lienOffre) { candidature += '- Lien de l’offre (parcours Candidature) : ' + rcOrpheline.lienOffre + '\n'; }
    }
  }

  // ---- SECTION : STRATÉGIE DÉJÀ ENGAGÉE ----
  // TACHE (retour utilisateur : la strategie CV n'etait jamais transmise a
  // la lettre/l'entretien) : lettre.md et entretien.md demandent tous deux
  // de s'appuyer sur le travail deja realise pour le CV (pas seulement
  // l'accroche/les mots-cles, mais aussi le detail des recommandations) --
  // transmis uniquement pour la lettre/l'entretien (pas pour le CV
  // lui-meme, qui n'a pas a se referencer sa propre strategie avant meme
  // qu'elle existe).
  var strategie = '';
  if (type !== 'cv') {
    var iaCv = dossier.ia && dossier.ia.cv;
    if (iaCv && (iaCv.profil || (iaCv.pointsForts && iaCv.pointsForts.length))) {
      strategie += 'Stratégie déjà définie pour le CV (à réutiliser et rester cohérent avec elle, jamais à refaire depuis zéro) :\n';
      if (iaCv.profil) { strategie += '- Accroche retenue pour le CV : ' + iaCv.profil + '\n'; }
      if (iaCv.pointsForts && iaCv.pointsForts.length) { strategie += '- Points forts retenus : ' + iaCv.pointsForts.join(', ') + '\n'; }
      if (iaCv.motsCles && iaCv.motsCles.length) { strategie += '- Mots-clés retenus : ' + iaCv.motsCles.join(', ') + '\n'; }
      var reco = iaCv.recommandations || {};
      if (reco.experiencesAMettreEnAvant && reco.experiencesAMettreEnAvant.length) {
        strategie += '- Expériences mises en avant sur le CV, et pourquoi :\n' + reco.experiencesAMettreEnAvant.map(function (e) {
          return '   . ' + e.poste + (e.entreprise ? ' (' + e.entreprise + ')' : '') + (e.justification ? ' — ' + e.justification : '');
        }).join('\n') + '\n';
      }
      if (reco.competencesAValoriser && reco.competencesAValoriser.length) {
        strategie += '- Compétences valorisées sur le CV, et pourquoi :\n' + reco.competencesAValoriser.map(function (c) {
          return '   . ' + c.competence + (c.justification ? ' — ' + c.justification : '');
        }).join('\n') + '\n';
      }
      if (reco.rubriquesMasquables && reco.rubriquesMasquables.length) {
        strategie += '- Rubriques jugées sans intérêt pour cette candidature sur le CV (à ne pas remettre en avant sans raison) :\n' + reco.rubriquesMasquables.map(function (r) {
          return '   . ' + r.rubrique + (r.justification ? ' — ' + r.justification : '');
        }).join('\n') + '\n';
      }
    }
  }
  // TACHE (context engineering, chantier 1 : stratégie lettre absente de
  // l'entretien) : entretien.md demande explicitement de s'appuyer sur le
  // travail déjà réalisé "pour le CV ET pour la lettre de motivation... pas
  // seulement l'accroche et les arguments retenus" -- vocabulaire qui
  // correspond exactement aux champs accroche/arguments de dossier.ia.lettre
  // (produits par lettre.md). Réservé à l'entretien uniquement (jamais à la
  // lettre elle-même). Transmet la stratégie (accroche, arguments), pas le
  // texte intégral déjà rédigé de la lettre : symétrique du bloc CV.
  if (type === 'entretien') {
    var iaLettre = dossier.ia && dossier.ia.lettre;
    if (iaLettre && (iaLettre.accroche || (iaLettre.arguments && iaLettre.arguments.length))) {
      strategie += (strategie ? '\n' : '') + 'Stratégie déjà définie pour la lettre (à réutiliser et rester cohérent avec elle, jamais à refaire depuis zéro) :\n';
      if (iaLettre.accroche) { strategie += '- Accroche retenue pour la lettre : ' + iaLettre.accroche + '\n'; }
      if (iaLettre.arguments && iaLettre.arguments.length) { strategie += '- Arguments retenus pour la lettre : ' + iaLettre.arguments.join(', ') + '\n'; }
    }
  }

  // ---- SECTION : PROFIL DU CANDIDAT ----
  var profil = '';
  if (dossier.experiences.length) {
    // TACHE (retour utilisateur : validation trop stricte) : Entreprise et
    // Lieu sont desormais facultatifs -- la parenthese ne mentionne que ce
    // qui est reellement renseigne (l'annee de debut reste, elle, toujours
    // presente, seul champ de date obligatoire).
    profil += '- Expériences professionnelles :\n' + dossier.experiences.map(function (e) {
      var lieuEntreprise = [e.entreprise, e.lieu].filter(Boolean).join(', ');
      var periode = e.dateDebut + ' à ' + (e.dateFin || 'en cours');
      return '   . ' + e.poste + ' (' + (lieuEntreprise ? lieuEntreprise + ', ' + periode : periode) + ')' + (e.missions ? ' — Missions : ' + e.missions : '');
    }).join('\n') + '\n';
  }
  if (dossier.experiencesPerso.length) {
    profil += '- Expériences personnelles (bénévolat, entraide, foyer...) :\n' + dossier.experiencesPerso.map(function (e) {
      return '   . ' + e.intitule + (e.detail ? ' : ' + e.detail : '');
    }).join('\n') + '\n';
  }
  if (dossier.formations.length) {
    profil += '- Formations :\n' + dossier.formations.map(function (f) {
      return '   . ' + f.niveau + (f.intitule ? ' (' + f.intitule + ')' : '') + (f.annee ? ', obtenu en ' + f.annee : '');
    }).join('\n') + '\n';
  }

  // ---- SECTION : COMPÉTENCES ET ATOUTS ----
  var competences = '';
  competences += '- Savoir-être : ' + (savoirEtre || 'non renseigné') + '\n';
  competences += '- Savoir-faire : ' + (savoirFaire || 'non renseigné') + '\n';
  competences += '- Savoirs : ' + (savoirs || 'non renseigné') + '\n';
  competences += '- Valeurs : ' + (valeurs || 'non renseigné') + '\n';

  // ---- SECTION : INFORMATIONS COMPLÉMENTAIRES ----
  var complements = '';
  if (langues) { complements += '- Langues : ' + langues + '\n'; }
  if (permis) { complements += '- Mobilité : ' + permis + '\n'; }
  if (dossier.loisirs.length) {
    complements += '- Loisirs : ' + dossier.loisirs.join(', ') + '\n';
  }
  if (dossier.engagements && dossier.engagements.length) {
    complements += '- Engagements : ' + dossier.engagements.join(', ') + '\n';
  }
  if (dossier.certifications && dossier.certifications.length) {
    complements += '- Certifications : ' + dossier.certifications.join(', ') + '\n';
  }
  // TACHE (retour utilisateur : verification transmission IA) : ces deux
  // champs sont alimentes par le moteur d'import (voir extraction-cv.md,
  // CONFIG_CHAMPS_IMPORT) -- la donnee etait bien dans le dossier, mais
  // n'atteignait jamais l'IA avant correction.
  if (dossier.logiciels && dossier.logiciels.length) {
    complements += '- Logiciels et outils maîtrisés : ' + dossier.logiciels.join(', ') + '\n';
  }
  if (dossier.informationsNonClassees && dossier.informationsNonClassees.length) {
    complements += '- Autres informations transmises par la personne : ' + dossier.informationsNonClassees.join(', ') + '\n';
  }

  // ---- SECTION : CONTRAINTES ----
  var contraintes = '';
  if (dossier.contrat.length) { contraintes += '- Type de contrat recherché : ' + dossier.contrat.join(', ') + '\n'; }
  if (dossier.tempsTravail.length) { contraintes += '- Temps de travail : ' + dossier.tempsTravail.join(', ') + '\n'; }
  if (dossier.accepte && dossier.accepte.indexOf('alimentaire') !== -1) {
    contraintes += '- Le candidat accepte un emploi alimentaire pour favoriser un retour rapide à l’emploi.\n';
  }
  if (dossier.accepte && dossier.accepte.indexOf('saisonnier') !== -1) {
    contraintes += '- Le candidat accepte également les emplois saisonniers.\n';
  }

  // ---- SECTION : CONSIGNES DE RÉDACTION ----
  // TACHE (retour utilisateur : verification transmission IA) : dossier.
  // preferencesIA etait ecrit par l'accordeon "Adaptation au metier" mais
  // jamais lu ici -- ces reglages n'avaient donc aucun effet reel sur les
  // reponses de l'IA. Transmis desormais, uniquement les champs
  // effectivement choisis (aucune valeur imposee par defaut). TACHE
  // (context engineering) : regroupees ici, separees des faits sur le
  // candidat -- ce sont des instructions de forme, pas des donnees sur la
  // personne.
  var consignes = '';
  var prefs = dossier.preferencesIA || {};
  if (prefs.niveauPoste) { consignes += '- Niveau du poste recherché : ' + (LABELS_PREFERENCES_IA.niveauPoste[prefs.niveauPoste] || prefs.niveauPoste) + '\n'; }
  if (prefs.niveauLangage) { consignes += '- Niveau de langage souhaité : ' + (LABELS_PREFERENCES_IA.niveauLangage[prefs.niveauLangage] || prefs.niveauLangage) + '\n'; }
  if (prefs.adaptationMetier) { consignes += '- Adaptation au vocabulaire du métier : ' + (LABELS_PREFERENCES_IA.adaptationMetier[prefs.adaptationMetier] || prefs.adaptationMetier) + '\n'; }
  if (prefs.ton) { consignes += '- Ton de la candidature souhaité : ' + (LABELS_PREFERENCES_IA.ton[prefs.ton] || prefs.ton) + '\n'; }
  if (prefs.longueur) { consignes += '- Longueur souhaitée : ' + (LABELS_PREFERENCES_IA.longueur[prefs.longueur] || prefs.longueur) + '\n'; }

  // ---- ASSEMBLAGE FINAL ----
  // TACHE (context engineering) : une ligne "Document demande" en tete,
  // a la frontiere entre les instructions du prompt (cv.md/lettre.md/
  // entretien.md, qui precedent ce texte) et les donnees qui suivent --
  // rappelle la mission au moment precis ou le texte bascule de
  // l'instruction vers la donnee. Chaque section n'apparait que si elle
  // contient reellement quelque chose : jamais un titre suivi de rien.
  var LABELS_TYPE_DOCUMENT_PROFIL = { cv: 'CV', lettre: 'Lettre de motivation', entretien: 'Préparation à l’entretien' };
  var t = 'Document demandé : ' + (LABELS_TYPE_DOCUMENT_PROFIL[type] || type) + '\n\n';
  function ajouterSectionProfil(titre, contenu) {
    if (contenu) { t += titre + '\n' + contenu + '\n'; }
  }
  ajouterSectionProfil('CONTEXTE DE LA CANDIDATURE', candidature);
  ajouterSectionProfil('STRATÉGIE DÉJÀ ENGAGÉE', strategie);
  ajouterSectionProfil('PROFIL DU CANDIDAT', profil);
  ajouterSectionProfil('COMPÉTENCES ET ATOUTS', competences);
  ajouterSectionProfil('INFORMATIONS COMPLÉMENTAIRES', complements);
  ajouterSectionProfil('CONTRAINTES', contraintes);
  ajouterSectionProfil('CONSIGNES DE RÉDACTION', consignes);

  // Normalise la fin du texte a un seul saut de ligne final (au lieu des
  // sauts de ligne multiples laisses par le separateur entre sections) --
  // identique au comportement de l'ancienne version, qui ne terminait
  // jamais par une ligne vide.
  return t.replace(/\n+$/, '\n');
}

// TACHE (retour utilisateur : "Verifier les informations") : la personne
// peut desormais remplacer le texte AUTO-GENERE ci-dessus par sa propre
// version, modifiee librement (zone de texte unique, validee). Quand un
// texte manuel existe, il est utilise PARTOUT ou texteProfil() l'etait --
// aussi bien pour l'apercu affiche que pour ce qui est reellement copie
// vers l'assistant IA -- pour ne jamais montrer un aperçu different de ce
// qui est envoye.
function texteProfilEffectif(type) {
  if (typeof dossier.profilTexteManuel === 'string' && dossier.profilTexteManuel.trim() !== '') {
    return dossier.profilTexteManuel;
  }
  return texteProfil(type);
}

// TACHE (retour utilisateur : "Verifier les informations") : fenetre EN
// PAGE (pas une popup navigateur), reutilise le meme principe de fermeture
// que les autres fenetres deja construites sur ce modele (clic sur le fond
// OU sur la croix) -- coherent avec ouvrirBulleAide()/ouvrirFenetreAssistantIA().
// TACHE (migration Design System, chantier "Fenetre ERIP", 6e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP() avec la
// taille "large" (700px) -- premiere fenetre migree avec un contenu
// reellement volumineux et variable (le texte complet transmis a l'IA),
// plutot qu'un contenu statique ou court.
function ouvrirVerificationInformations(type) {
  var overlay = ouvrirFenetreERIP({
    titre: 'Vérifier les informations',
    taille: 'large',
    contenuHTML:
      '<p class="small text-muted">Voici toutes les informations qui seront transmises à l\'assistant IA (les ' +
      'instructions elles-mêmes ne sont pas affichées ici). Modifiez librement ce texte si besoin.</p>' +
      '<textarea id="texteVerificationInfos" class="form-control" rows="16" ' +
      'style="font-size:0.95rem;">' + echapperAttribut(texteProfilEffectif(type)) + '</textarea>' +
      '<div class="d-flex justify-content-end mt-3">' +
      '<button type="button" id="btnValiderVerificationInfos" class="btn btn-primary">Valider</button>' +
      '</div>'
  });
  document.getElementById('btnValiderVerificationInfos').addEventListener('click', function () {
    dossier.profilTexteManuel = document.getElementById('texteVerificationInfos').value;
    fermerFenetreERIP();
    pageResultats();
  });
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
  // TACHE (prompt allege, carte accueil) : fichier distinct de entretien.md
  // -- manquait ici, ce qui faisait retomber silencieusement sur le texte
  // de secours (promptParDefaut) meme quand le vrai fichier existait.
  'entretien-accueil': 'prompts/entretien-accueil.md',
  // TACHE (V2 IA, etape 1) : prompt separe et dedie, pour ne prendre aucun
  // risque sur le prompt principal de redaction du CV (prompts/cv.md).
  accroche: 'prompts/accroche.md',
  // TACHE 5 (moteur d'import) : prompt d'extraction, distinct des 4
  // precedents -- ceux-la construisent une strategie, celui-ci ne fait que
  // lire un CV depose pour en extraire les faits (voir docs/ARCHITECTURE_MOTEUR_IMPORT.md).
  'extraction-cv': 'prompts/extraction-cv.md',
  // TACHE (retour utilisateur : "co-construire votre lettre de motivation",
  // icone dediee sur l'accueil) : prompt V1, conversationnel, entierement
  // autonome (il redemande lui-meme tout ce dont il a besoin, aucun profil
  // a lui injecter contrairement aux autres) -- fichier distinct, jamais
  // mele a prompts/lettre.md (le prompt V2 actuel).
  'lettre-v1': 'prompts/lettre-v1.md'
};
var promptsExternesCharges = { cv: null, lettre: null, entretien: null, 'entretien-accueil': null, accroche: null, 'extraction-cv': null, 'lettre-v1': null };

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
  if (type === 'lettre-v1') {
    // TACHE (retour utilisateur : "co-construire votre lettre de
    // motivation") : prompt V1 tres long (guide conversationnel complet) --
    // contrairement aux autres prompts, pas raisonnable de le reproduire
    // integralement ici comme texte de secours. Message clair invitant a
    // reessayer plutot qu'un repli degrade et incomplet.
    return 'Le prompt n\'a pas pu etre charge pour le moment. Verifiez votre connexion et reessayez, ou ' +
      'signalez ce probleme si cela persiste.';
  }
  if (type === 'extraction-cv') {
    // TACHE 5 (moteur d'import) : texte de secours aligne sur
    // prompts/extraction-cv.md (version validee) -- utilise uniquement si
    // le fichier externe ne peut pas etre charge.
    return 'Tu es un assistant d\'extraction. Lis le texte du CV ci-dessous et extrait uniquement les informations ' +
      'factuelles qui y figurent (identite, experiences avec leurs missions en liste, formations, competences, ' +
      'langues, certifications, logiciels explicitement cites, permis, loisirs, engagements). N\'invente rien, ne ' +
      'reformule rien, ne selectionne rien. Ne deduis jamais un logiciel a partir d\'un metier. Ne normalise jamais ' +
      'une date, recopie le texte tel quel. Pour le permis, "possede" ne vaut true que si explicitement mentionne ' +
      'comme possede, false que si son absence est explicitement mentionnee, null sinon. Ajoute un champ ' +
      '"confiance" ("elevee", "moyenne" ou "faible") sur chaque experience/formation/langue, et un champ "alertes" ' +
      'si un element te semble incomplet ou ambigu. Place toute information ne correspondant a aucune categorie ' +
      'dans "informationsNonClassees". Respecte strictement les types (booleen : true/false/null uniquement, ' +
      'jamais "oui"/"non" ; liste : toujours un tableau). Termine ta reponse par un bloc de code JSON strictement ' +
      'valide, exactement selon ce format : {"identite": {"civilite": "", "nom": "", "prenom": "", "telephone": "", ' +
      '"email": "", "adresse": "", "ville": ""}, "experiences": [{"poste": "", "entreprise": "", "lieu": "", ' +
      '"dateDebut": "", "dateFin": "", "missions": [], "confiance": "elevee", "alertes": []}], "formations": ' +
      '[{"niveau": "", "intitule": "", "annee": "", "confiance": "elevee", "alertes": []}], "competences": ' +
      '{"savoirFaire": [], "savoirEtre": [], "savoirs": []}, "langues": [{"langue": "", "niveau": "", "confiance": ' +
      '"elevee", "alertes": []}], "certifications": [], "logiciels": [], "permis": {"possede": null, "categories": ' +
      '[], "vehicule": null}, "loisirs": [], "engagements": [], "informationsNonClassees": []}. N\'ajoute jamais de ' +
      'propriete JSON en dehors de ce format.';
  }
  if (type === 'accroche') {
    return 'Tu es un conseiller en insertion professionnelle. A partir du profil ci-dessous, ' +
      'propose un contenu court pour enrichir un CV : une accroche professionnelle (2 a 4 phrases), ' +
      'une liste de 3 a 5 points forts (phrases courtes), et une liste de 5 a 10 mots-cles pertinents. ' +
      'Reponds UNIQUEMENT avec un objet JSON strictement valide, sans aucun texte avant ou apres, ' +
      'exactement selon ce format : {"profil": "...", "pointsForts": ["...", "..."], "motsCles": ["...", "..."]}.';
  }
  if (type === 'lettre') {
    // TACHE (integration prompt Lettre V2, tache 1 : texte complet) : texte
    // de secours aligne sur prompts/lettre.md (version validee) -- utilise
    // uniquement si le fichier externe ne peut pas etre charge (ex. site
    // ouvert en file://).
    return 'Tu es un conseiller en insertion professionnelle experimente. Ton role est de construire une veritable ' +
      'strategie de communication, puis de rediger, a partir de cette strategie, le texte complet de la lettre de ' +
      'motivation elle-meme (tu ne dois pas te soucier de la mise en forme graphique, geree par l\'application). ' +
      'Une lettre de motivation est un outil de persuasion : elle doit toujours repondre, meme implicitement, a ' +
      'trois questions que se pose tout recruteur : Pourquoi cette personne ? Pourquoi notre entreprise ? ' +
      'Pourquoi maintenant ? Adapte l\'angle et la longueur au type de candidature indique dans le profil (offre, ' +
      'candidature spontanee, reconversion, stage, alternance, immersion). Ne repete jamais le CV : complete-le en ' +
      'donnant du sens au parcours. Choisis, hierarchise, et laisse volontairement de cote ce qui ne sert aucune ' +
      'des trois questions. Ne jamais inventer un fait qui ne figure pas dans le profil. La lettre finale tient ' +
      'sur une seule page A4, avec une police jamais inferieure a 10 pt : reste suffisamment concis pour y tenir ' +
      'naturellement, sans jamais reduire la police pour compenser. Redige d\'abord quelques ' +
      'phrases lisibles expliquant ta strategie, puis termine IMPERATIVEMENT par un bloc de code JSON strictement ' +
      'valide, exactement selon ce format : {"accroche": "...", "arguments": ["...", "..."], "lettre": {"objet": ' +
      '"...", "texte": "..."}}.';
  }
  if (type === 'entretien') {
    // TACHE (integration prompt Entretien V2) : texte de secours aligne sur
    // prompts/entretien.md (version validee) -- utilise uniquement si le
    // fichier externe ne peut pas etre charge (ex. site ouvert en file://).
    return 'Tu es un conseiller en insertion professionnelle experimente, agissant comme coach de preparation a ' +
      'l\'entretien d\'embauche. Contrairement au CV et a la lettre, cette preparation n\'est pas une reponse ' +
      'unique : c\'est un accompagnement progressif par le dialogue, qui se termine par un bilan. Analyse ' +
      'silencieusement le fil conducteur de la candidature, les zones de fragilite (periode d\'inactivite, ' +
      'reconversion, manque d\'experience, sujets sensibles), le niveau de preparation et le contexte (stage, ' +
      'alternance, immersion, premier emploi) deductibles du profil, sans redemander ce qui y figure deja. ' +
      'Demarre par la presentation de debut d\'entretien, puis prepare les questions anticipees avec une ' +
      'structure de reponse (situation, tache, action, resultat) et un retour bref, les zones de fragilite avec ' +
      'bienveillance, les questions que le candidat pourra poser au recruteur, et quelques conseils de ' +
      'comportement si utile. Pour chaque question anticipee travaillee, distille 2 a 3 pistes courtes ' +
      '(mots-cles/angle, jamais une phrase redigee) et, si utile, une amorce tres courte (5-6 mots maximum) -- ' +
      'jamais une reponse toute redigee a apprendre par coeur. N\'aborde jamais un handicap de ta propre ' +
      'initiative. Ne jamais inventer un fait. Quand la preparation est terminee, termine ta derniere reponse ' +
      'IMPERATIVEMENT par un bloc de code JSON strictement valide, exactement selon ce format : ' +
      '{"presentation": "...", "pointsAPreparer": ["...", "..."], "questionsAnticipees": [{"question": "...", ' +
      '"pistes": ["...", "..."], "amorce": "..."}], "questionsDuCandidat": ["...", "..."]}.';
  }
  if (type === 'entretien-accueil') {
    // TACHE (prompt allege, carte accueil) : texte de secours aligne sur
    // prompts/entretien-accueil.md -- utilise uniquement si le fichier
    // externe ne peut pas etre charge. Manquait jusqu'ici : sans ce bloc,
    // le type retombait silencieusement sur le prompt CV (dernier "return"
    // de cette fonction, aucune correspondance explicite ci-dessus).
    return 'Tu es un conseiller en insertion professionnelle experimente, agissant comme coach de preparation a ' +
      'l\'entretien d\'embauche. Contrairement a la version complete (par dialogue), cette version est plus ' +
      'legere : produis l\'ensemble de la preparation directement dans ta toute premiere reponse, sans echange ' +
      'prealable. Analyse silencieusement le fil conducteur de la candidature, les zones de fragilite et le ' +
      'contexte deductibles du profil, sans redemander ce qui y figure deja. Produis directement : une ' +
      'presentation de debut d\'entretien (une a deux minutes), des points a preparer, 4 a 6 questions ' +
      'anticipees reellement probables pour ce profil (chacune avec 2 a 3 pistes courtes -- mots-cles/angle, ' +
      'jamais une phrase redigee -- et si utile une amorce tres courte de 5-6 mots maximum, jamais une reponse ' +
      'toute redigee), et quelques questions a poser au recruteur. N\'aborde jamais un handicap de ta propre ' +
      'initiative. Ne jamais inventer un fait. Termine cette reponse (la premiere et unique) IMPERATIVEMENT par ' +
      'un bloc de code JSON strictement valide, exactement selon ce format : {"presentation": "...", ' +
      '"pointsAPreparer": ["...", "..."], "questionsAnticipees": [{"question": "...", "pistes": ["...", "..."], ' +
      '"amorce": "..."}], "questionsDuCandidat": ["...", "..."]}.';
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
    'inventer un fait qui ne figure pas dans le profil. Le CV final tient sur une seule page A4, avec une police ' +
    'jamais inferieure a 10 pt : limite le nombre d\'experiences detaillees et de missions par experience pour ' +
    'que ta selection y tienne naturellement, sans jamais reduire la police pour compenser. Recommande aussi, ' +
    'sans jamais inventer un fait, un type de CV (specifique/general) avec justification, les experiences a ' +
    'mettre en avant en priorite (poste + entreprise + justification), les competences a valoriser en priorite ' +
    '(competence + justification), et les rubriques entieres a masquer si elles n\'apportent rien (rubrique + ' +
    'justification) -- listes vides si rien a recommander, jamais remplies par defaut. Redige d\'abord ' +
    'quelques phrases lisibles expliquant ta strategie, puis termine IMPERATIVEMENT par un bloc de code JSON ' +
    'strictement valide, exactement selon ce format : {"profil": "...", "pointsForts": ["...", "..."], ' +
    '"motsCles": ["...", "..."], "recommandations": {"typeCV": {"valeur": "specifique", "justification": "..."}, ' +
    '"experiencesAMettreEnAvant": [{"poste": "...", "entreprise": "...", "justification": "..."}], ' +
    '"competencesAValoriser": [{"competence": "...", "justification": "..."}], ' +
    '"rubriquesMasquables": [{"rubrique": "...", "justification": "..."}]}}.';
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
// TACHE (integration Entretien V2, generalisation) : fonction GENERIQUE de
// resume post-import, utilisable par tout module (utilisee ici par
// Entretien ; le CV garde sa propre fonction dediee genererResumeImportCV(),
// plus riche car elle croise aussi les faits deja presents dans dossier --
// voir plus bas). Chaque module ne fait que decrire ses champs et leurs
// libelles ; toute la mecanique d'affichage est ecrite une seule fois ici.
function genererResumeGeneriqueImportIA(valeurs, specificationAffichage) {
  var lignes = ['<p class="mb-1" style="color:#15803d;">✅ Import terminé avec succès.</p>'];
  specificationAffichage.forEach(function (champ) {
    var val = valeurs[champ.cle];
    if (champ.type === 'liste') {
      var n = val.length;
      var libelle = (n === 1) ? champ.libelleUnite : champ.libellePluriel;
      lignes.push('<p class="mb-0">' + (n ? '✅ ' + n + ' ' + libelle : '⚠️ Aucun(e) ' + champ.libellePluriel + ' identifié(e)') + '</p>');
    } else {
      lignes.push('<p class="mb-0">' + (val ? '✅ ' + champ.libelle + ' détectée' : '⚠️ Aucune ' + champ.libelle.toLowerCase() + ' détectée') + '</p>');
    }
  });
  return lignes.join('');
}

var SPEC_AFFICHAGE_ENTRETIEN = [
  { cle: 'presentation', type: 'texte', libelle: 'Présentation' },
  { cle: 'pointsAPreparer', type: 'liste', libelleUnite: 'point à préparer', libellePluriel: 'points à préparer' },
  { cle: 'questionsAnticipees', type: 'liste', libelleUnite: 'question anticipée', libellePluriel: 'questions anticipées' },
  { cle: 'questionsDuCandidat', type: 'liste', libelleUnite: 'question à poser au recruteur', libellePluriel: 'questions à poser au recruteur' }
];

// TACHE (Lettre V2, tache 1 : texte complet) : specification d'affichage
// pour le resume generique -- "texteLettre" est une cle synthetique (pas un
// champ plat du JSON), construite au moment de l'affichage a partir du
// champ imbrique lettre.texte, pour reutiliser genererResumeGeneriqueImportIA()
// sans le modifier.
var SPEC_AFFICHAGE_LETTRE = [
  { cle: 'accroche', type: 'texte', libelle: 'Accroche' },
  { cle: 'arguments', type: 'liste', libelleUnite: 'argument retenu', libellePluriel: 'arguments retenus' },
  { cle: 'texteLettre', type: 'texte', libelle: 'Lettre complète' }
];

// ============================================================
// TACHE (retour utilisateur : "Écran 3" -- choisir/réordonner les
// propositions de l'IA pour le CV) : s'ouvre juste après avoir importé
// avec succès la réponse de l'assistant IA (bouton "Importer", voir plus
// bas), AVANT d'avancer vers l'aperçu du document. Remplace l'ancien
// comportement ("import direct, sans relecture possible") -- chaque
// proposition (points forts, mots clés, expériences à mettre en avant,
// compétences à valoriser, rubriques à masquer) est présentée
// individuellement : à cocher/décocher, à réordonner (flèches ▲▼,
// réutilisable partout où un classement par pertinence a du sens), et
// modifiable librement. 5 onglets thématiques (Profil/Accroche,
// Expériences, Compétences à valoriser, Stratégie de candidature,
// Informations complémentaires), même principe d'onglets que l'écran
// "Vérifiez les informations importées" (classes/câblage réutilisés tels
// quels : .onglets-validation-import / wireOngletsValidationImport()).
// ============================================================

// Construit une copie de travail EDITABLE a partir des valeurs brutes
// renvoyees par analyserReponseIACV() -- jamais ecrit directement dans
// dossier.ia.cv tant que la personne n'a pas clique sur "Je valide" (voir
// appliquerBrouillonChoixIACV plus bas). "garder" (true par defaut) porte
// la case a cocher ; l'ORDRE du tableau porte le classement (modifie par
// les fleches ▲▼, jamais par un champ separe).
function creerBrouillonChoixIACV(valeursIA) {
  var reco = valeursIA.recommandations || {};
  function versListe(items, mapper) {
    return (items || []).map(function (it) { var o = mapper(it); o.garder = true; return o; });
  }
  var savoirFaireParExperience = reco.savoirFaireParExperience || [];
  // TACHE (retour utilisateur : 5 propositions d'accroche, choix unique) :
  // liste a SELECTION UNIQUE (comme des boutons radio), pas a cases a
  // cocher independantes comme les autres listes -- une seule accroche
  // finit dans le CV. La premiere proposition de l'IA est selectionnee par
  // defaut (deja la mieux classee), la personne peut en choisir une autre
  // ou modifier librement le texte de n'importe laquelle avant de choisir.
  var accroches = (valeursIA.accrochesProposees || []).map(function (texte, i) {
    return { texte: texte, selectionnee: false };
  });
  if (accroches.length) {
    var indexActuel = valeursIA.profil ? accroches.findIndex(function (a) { return a.texte === valeursIA.profil; }) : -1;
    accroches[indexActuel !== -1 ? indexActuel : 0].selectionnee = true;
  } else {
    accroches = [{ texte: valeursIA.profil || '', selectionnee: true }];
  }
  return {
    accroches: accroches,
    pointsForts: versListe(valeursIA.pointsForts, function (t) { return { texte: t }; }),
    motsCles: versListe(valeursIA.motsCles, function (t) { return { texte: t }; }),
    typeCV: {
      valeur: (reco.typeCV && reco.typeCV.valeur) || null,
      justification: (reco.typeCV && reco.typeCV.justification) || ''
    },
    experiences: versListe(reco.experiencesAMettreEnAvant, function (e) {
      var correspondance = savoirFaireParExperience.filter(function (s) {
        return normaliserTexte(s.poste || '') === normaliserTexte(e.poste || '') &&
          normaliserTexte(s.entreprise || '') === normaliserTexte(e.entreprise || '');
      })[0];
      return {
        poste: e.poste || '', entreprise: e.entreprise || '', texte: e.justification || '',
        missions: ((correspondance && correspondance.missions) || []).map(function (m) { return { texte: m, garder: true }; })
      };
    }),
    competences: versListe(reco.competencesAValoriser, function (c) { return { texte: c.competence, sousTexte: c.justification }; }),
    rubriquesMasquables: versListe(reco.rubriquesMasquables, function (r) { return { texte: r.rubrique, sousTexte: r.justification }; })
  };
}

// Une ligne reordonnable generique : pastille de rang, case a cocher,
// texte editable (input ou textarea selon estArea), sous-texte facultatif
// en LECTURE SEULE (justification de l'IA -- jamais modifiable, ce n'est
// pas un fait du dossier mais une explication), fleches Monter/Descendre
// (desactivees en haut/bas de liste). "prefixe" identifie de facon unique
// la liste ET l'element (ex. "reco_pointsForts_2").
function ligneRecommandationReordonnable(prefixe, index, total, item, estArea) {
  var idBase = prefixe + '_' + index;
  var champTexte = estArea
    ? '<textarea class="form-control form-control-sm" rows="2" id="' + idBase + '_texte" data-champ="texte">' + echapperAttribut(item.texte) + '</textarea>'
    : '<input type="text" class="form-control form-control-sm" id="' + idBase + '_texte" data-champ="texte" value="' + echapperAttribut(item.texte) + '">';
  return '<div class="reco-item mb-2" data-reco-prefixe="' + prefixe + '" data-reco-index="' + index + '">' +
    '<span class="reco-rang">' + (index + 1) + '</span>' +
    '<input type="checkbox" class="reco-case" id="' + idBase + '_case"' + (item.garder ? ' checked' : '') + '>' +
    '<div class="reco-corps">' + champTexte +
    (item.sousTexte ? '<p class="small text-muted mb-0 mt-1">' + echapperAttribut(item.sousTexte) + '</p>' : '') +
    '</div>' +
    '<div class="reco-fleches">' +
    '<button type="button" class="reco-fleche" data-reco-sens="haut"' + (index === 0 ? ' disabled' : '') + ' title="Monter">&#9650;</button>' +
    '<button type="button" class="reco-fleche" data-reco-sens="bas"' + (index === total - 1 ? ' disabled' : '') + ' title="Descendre">&#9660;</button>' +
    '</div></div>';
}

// Rendu d'une LISTE complete de propositions reordonnables (pointsForts,
// motsCles, competences, rubriquesMasquables -- meme mecanique pour les
// 4), avec l'etat vide explicite (meme principe que l'ecran 1 : le vide
// doit se voir, jamais se deviner par une absence).
function contenuListeRecommandationsIA(prefixe, liste, estArea, messageVide) {
  if (!liste.length) { return '<p class="text-muted small fst-italic mb-0">' + messageVide + '</p>'; }
  return liste.map(function (item, i) { return ligneRecommandationReordonnable(prefixe, i, liste.length, item, estArea); }).join('');
}

function contenuOngletProfilIA(brouillon) {
  return '<div class="mb-3"><h6>Points forts</h6>' + contenuListeRecommandationsIA('reco_pointsForts', brouillon.pointsForts, false, 'Aucun point fort proposé par l’assistant.') + '</div>' +
    '<div class="mb-1"><h6>Mots clés</h6>' + contenuListeRecommandationsIA('reco_motsCles', brouillon.motsCles, false, 'Aucun mot clé proposé par l’assistant.') + '</div>';
}

// TACHE (retour utilisateur : 5 propositions d'accroche, choix unique) :
// rendu DEDIE (bouton radio, pas case a cocher) -- une seule proposition
// peut etre selectionnee a la fois, contrairement aux autres listes de cet
// ecran ou plusieurs elements peuvent etre gardes en meme temps. Chaque
// proposition reste modifiable librement, y compris celles non
// selectionnees (au cas ou la personne veuille en garder le texte sous la
// main avant de trancher).
function contenuOngletAccrocheIA(brouillon) {
  if (!brouillon.accroches.length) {
    return '<p class="text-muted small fst-italic mb-0">Aucune proposition d’accroche de l’assistant.</p>';
  }
  return brouillon.accroches.map(function (a, i) {
    var idBase = 'reco_accroches_' + i;
    return '<div class="reco-item mb-2" data-reco-prefixe="reco_accroches" data-reco-index="' + i + '">' +
      '<span class="reco-rang">' + (i + 1) + '</span>' +
      '<input type="radio" name="recoAccrocheChoix" class="reco-case" id="' + idBase + '_case"' + (a.selectionnee ? ' checked' : '') + '>' +
      '<div class="reco-corps">' +
      '<textarea class="form-control form-control-sm" rows="3" id="' + idBase + '_texte" data-champ="texte">' + echapperAttribut(a.texte) + '</textarea>' +
      '</div></div>';
  }).join('');
}

function contenuOngletExperiencesIA(brouillon) {
  if (!brouillon.experiences.length) {
    return '<p class="text-muted small fst-italic mb-0">Aucune expérience à mettre en avant proposée par l’assistant.</p>';
  }
  return brouillon.experiences.map(function (e, i) {
    var idBase = 'reco_experiences_' + i;
    var missionsHtml = e.missions.length
      ? e.missions.map(function (m, j) {
          return '<div class="d-flex align-items-start gap-2 mb-1">' +
            '<input type="checkbox" id="' + idBase + '_mission_' + j + '_case"' + (m.garder ? ' checked' : '') + '>' +
            '<input type="text" class="form-control form-control-sm" id="' + idBase + '_mission_' + j + '_texte" value="' + echapperAttribut(m.texte) + '"></div>';
        }).join('')
      : '<p class="text-muted small mb-0">Aucune mission proposée pour cette expérience.</p>';
    return '<div class="reco-item reco-item-experience mb-2" data-reco-prefixe="reco_experiences" data-reco-index="' + i + '">' +
      '<span class="reco-rang">' + (i + 1) + '</span>' +
      '<input type="checkbox" class="reco-case" id="' + idBase + '_case"' + (e.garder ? ' checked' : '') + '>' +
      '<div class="reco-corps">' +
      '<p class="fw-bold mb-1">' + echapperAttribut(e.poste) + (e.entreprise ? ' — ' + echapperAttribut(e.entreprise) : '') + '</p>' +
      '<textarea class="form-control form-control-sm mb-2" rows="2" id="' + idBase + '_texte" data-champ="texte">' + echapperAttribut(e.texte) + '</textarea>' +
      '<div class="bloc-missions-validation">' + '<label class="small fw-bold text-muted d-block mb-1">Missions proposées</label>' + missionsHtml + '</div>' +
      '</div>' +
      '<div class="reco-fleches">' +
      '<button type="button" class="reco-fleche" data-reco-sens="haut"' + (i === 0 ? ' disabled' : '') + ' title="Monter">&#9650;</button>' +
      '<button type="button" class="reco-fleche" data-reco-sens="bas"' + (i === brouillon.experiences.length - 1 ? ' disabled' : '') + ' title="Descendre">&#9660;</button>' +
      '</div></div>';
  }).join('');
}

function contenuOngletCompetencesIA(brouillon) {
  return contenuListeRecommandationsIA('reco_competences', brouillon.competences, false, 'Aucune compétence à valoriser proposée par l’assistant.');
}

function contenuOngletStrategieIA(brouillon) {
  var tc = brouillon.typeCV;
  var html = '<div class="mb-3"><h6>Type de CV recommandé</h6>';
  if (tc.valeur) {
    html += '<p class="mb-1">' + echapperAttribut(tc.valeur === 'specifique' ? 'CV spécifique au métier visé' : 'CV général') + '</p>' +
      (tc.justification ? '<p class="small text-muted mb-0">' + echapperAttribut(tc.justification) + '</p>' : '');
  } else {
    html += '<p class="text-muted small fst-italic mb-0">Aucune recommandation de l’assistant sur ce point.</p>';
  }
  html += '</div>';
  return html;
}

function contenuOngletComplementsIA(brouillon) {
  return '<div class="mb-1"><h6>Rubriques proposées comme masquables</h6>' +
    contenuListeRecommandationsIA('reco_rubriques', brouillon.rubriquesMasquables, false, 'Aucune rubrique proposée comme masquable.') + '</div>';
}

var GROUPES_ONGLETS_CHOIX_IA_CV = [
  { id: 'profil', titre: 'Profil', rendu: contenuOngletProfilIA },
  { id: 'accroche', titre: 'Accroche', rendu: contenuOngletAccrocheIA },
  { id: 'experiences', titre: 'Expériences', rendu: contenuOngletExperiencesIA },
  { id: 'competences', titre: 'Compétences à valoriser', rendu: contenuOngletCompetencesIA },
  { id: 'strategie', titre: 'Stratégie de candidature', rendu: contenuOngletStrategieIA },
  { id: 'complements', titre: 'Informations complémentaires', rendu: contenuOngletComplementsIA }
];

function genererEcranChoixReponseIACV(brouillon) {
  var boutons = '', panneaux = '';
  GROUPES_ONGLETS_CHOIX_IA_CV.forEach(function (g, i) {
    boutons += '<button type="button" class="onglet-validation-import-btn' + (i === 0 ? ' actif' : '') +
      '" data-onglet-btn="' + g.id + '">' + g.titre + '</button>';
    panneaux += '<div class="onglet-validation-import-panel' + (i === 0 ? ' actif' : '') + '" data-onglet-panel="' + g.id + '">' +
      g.rendu(brouillon) + '</div>';
  });
  return '<div class="onglets-validation-import">' + boutons + '</div>' +
    '<div class="onglets-validation-import-corps">' + panneaux + '</div>';
}

// Cablage des fleches Monter/Descendre + des cases/textes -- rerender
// REGENERE tout l'ecran (simple et fiable), mais garde l'onglet actif en
// cours (sinon on reviendrait toujours sur "Profil" apres chaque clic,
// experience frustrante des le 2e ou 3e reordonnancement).
function wireEcranChoixReponseIACV(brouillon, rafraichirEcran) {
  var LISTES_BROUILLON = {
    reco_pointsForts: brouillon.pointsForts, reco_motsCles: brouillon.motsCles,
    reco_experiences: brouillon.experiences, reco_competences: brouillon.competences,
    reco_rubriques: brouillon.rubriquesMasquables
  };
  document.querySelectorAll('.reco-item').forEach(function (el) {
    var prefixe = el.dataset.recoPrefixe;
    var index = parseInt(el.dataset.recoIndex, 10);
    var liste = LISTES_BROUILLON[prefixe];
    if (!liste) { return; }
    el.querySelectorAll('[data-reco-sens]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cible = index + (this.dataset.recoSens === 'haut' ? -1 : 1);
        if (cible < 0 || cible >= liste.length) { return; }
        var tmp = liste[index]; liste[index] = liste[cible]; liste[cible] = tmp;
        rafraichirEcran();
      });
    });
  });
  // TACHE (retour utilisateur : 5 propositions d'accroche, choix unique) :
  // cablage dedie (bouton radio) -- une seule "selectionnee" a true a la
  // fois, jamais gere par le mecanisme generique ci-dessous (case a cocher
  // independante).
  brouillon.accroches.forEach(function (a, i) {
    var idBase = 'reco_accroches_' + i;
    var radio = document.getElementById(idBase + '_case');
    var champTexte = document.getElementById(idBase + '_texte');
    if (radio) {
      radio.addEventListener('change', function () {
        if (this.checked) { brouillon.accroches.forEach(function (x) { x.selectionnee = false; }); a.selectionnee = true; }
      });
    }
    if (champTexte) { champTexte.addEventListener('input', function () { a.texte = this.value; }); }
  });
  Object.keys(LISTES_BROUILLON).forEach(function (prefixe) {
    LISTES_BROUILLON[prefixe].forEach(function (item, i) {
      var idBase = prefixe + '_' + i;
      var caseACocher = document.getElementById(idBase + '_case');
      var champTexte = document.getElementById(idBase + '_texte');
      if (caseACocher) { caseACocher.addEventListener('change', function () { item.garder = this.checked; }); }
      if (champTexte) { champTexte.addEventListener('input', function () { item.texte = this.value; }); }
      if (item.missions) {
        item.missions.forEach(function (m, j) {
          var mCase = document.getElementById(idBase + '_mission_' + j + '_case');
          var mTexte = document.getElementById(idBase + '_mission_' + j + '_texte');
          if (mCase) { mCase.addEventListener('change', function () { m.garder = this.checked; }); }
          if (mTexte) { mTexte.addEventListener('input', function () { m.texte = this.value; }); }
        });
      }
    });
  });
}

// Ouvre l'ecran (fenetre ERIP, "large"), "Retour" en bas a gauche (rappelle
// onRetour, ex. rouvrir le collage pour corriger/recoller), "Je valide" en
// bas a droite (rappelle onValider(brouillon) -- c'est l'appelant qui
// applique ensuite le brouillon dans dossier.ia.cv, voir
// appliquerBrouillonChoixIACV ci-dessous, et qui avance vers l'etape
// suivante du parcours).
function ouvrirEcranChoixReponseIACV(brouillon, onValider, onRetour) {
  function rafraichir() {
    var ongletActif = document.querySelector('.onglet-validation-import-btn.actif');
    var idOngletActif = ongletActif ? ongletActif.dataset.ongletBtn : null;
    document.getElementById('corpsEcranChoixIACV').innerHTML = genererEcranChoixReponseIACV(brouillon);
    if (idOngletActif) {
      var btn = document.querySelector('[data-onglet-btn="' + idOngletActif + '"]');
      if (btn) { btn.click(); }
    }
    wireOngletsValidationImport();
    wireEcranChoixReponseIACV(brouillon, rafraichir);
  }

  ouvrirFenetreERIP({
    titre: 'Choisissez ce que l’IA propose pour votre CV',
    taille: 'large',
    contenuHTML:
      '<p class="text-muted small">Décochez ce que vous ne souhaitez pas garder, modifiez librement le texte, réordonnez avec les flèches.</p>' +
      '<div id="corpsEcranChoixIACV"></div>' +
      '<div class="d-flex justify-content-between align-items-center mt-3">' +
      '<button type="button" id="retourChoixIACVBtn" class="btn btn-outline-secondary">&#8592; Retour</button>' +
      '<button type="button" id="validerChoixIACVBtn" class="btn btn-primary">Je valide</button>' +
      '</div>'
  });
  document.getElementById('corpsEcranChoixIACV').innerHTML = genererEcranChoixReponseIACV(brouillon);
  wireOngletsValidationImport();
  wireEcranChoixReponseIACV(brouillon, rafraichir);

  document.getElementById('retourChoixIACVBtn').addEventListener('click', function () {
    fermerFenetreERIP();
    if (typeof onRetour === 'function') { onRetour(); }
  });
  document.getElementById('validerChoixIACVBtn').addEventListener('click', function () {
    fermerFenetreERIP();
    onValider(brouillon);
  });
}

// Relit le brouillon (deja tenu a jour en memoire par wireEcranChoixReponseIACV
// a chaque frappe/coche/fleche -- rien a relire dans le DOM ici) et produit
// la forme attendue par dossier.ia.cv.* -- ne conserve que les elements
// "garder", dans leur ORDRE final. Jamais d'ecriture dans dossier avant cet
// appel (voir le clic sur "Je valide" ci-dessus).
function appliquerBrouillonChoixIACV(brouillon) {
  function garder(liste) { return liste.filter(function (it) { return it.garder; }); }
  // TACHE (retour utilisateur : 5 propositions d'accroche, choix unique) :
  // le CV final n'a besoin que d'UN texte de profil -- celle marquee
  // "selectionnee" (repli sur la premiere si, cas limite, aucune ne
  // l'etait pour une raison quelconque).
  var accrocheChoisie = brouillon.accroches.filter(function (a) { return a.selectionnee; })[0] || brouillon.accroches[0] || { texte: '' };
  return {
    profil: accrocheChoisie.texte,
    accrochesProposees: brouillon.accroches.map(function (a) { return a.texte; }),
    pointsForts: garder(brouillon.pointsForts).map(function (it) { return it.texte; }),
    motsCles: garder(brouillon.motsCles).map(function (it) { return it.texte; }),
    recommandations: {
      typeCV: brouillon.typeCV,
      experiencesAMettreEnAvant: garder(brouillon.experiences).map(function (e) { return { poste: e.poste, entreprise: e.entreprise, justification: e.texte }; }),
      competencesAValoriser: garder(brouillon.competences).map(function (it) { return { competence: it.texte, justification: it.sousTexte || '' }; }),
      rubriquesMasquables: garder(brouillon.rubriquesMasquables).map(function (it) { return { rubrique: it.texte, justification: it.sousTexte || '' }; }),
      savoirFaireParExperience: garder(brouillon.experiences).map(function (e) {
        return { poste: e.poste, entreprise: e.entreprise, missions: garder(e.missions).map(function (m) { return m.texte; }) };
      })
    }
  };
}

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

  // TACHE (retour utilisateur : "ne semble pas etre un JSON valide" alors
  // que le texte colle en a visuellement toute l'apparence) : cause tres
  // frequente -- l'interface de l'assistant IA (ou un correcteur du
  // systeme d'exploitation au moment du copier-coller) remplace les
  // guillemets droits par des guillemets typographiques ("courbes"), quasi
  // indiscernables a l'oeil dans une zone de texte, mais qui font
  // systematiquement echouer JSON.parse. Ajoute une 2e serie de tentatives
  // avec ces caracteres normalises, sur les MEMES candidats deja
  // construits ci-dessus (bloc code, texte complet).
  function normaliserGuillemets(t) {
    return t.replace(/[\u201C\u201D\u201F\u2033]/g, '"').replace(/[\u2018\u2019\u201B\u2032]/g, '\'');
  }
  // TACHE : les virgules superflues juste avant une accolade/crochet
  // fermant(e) (ex. un dernier element de liste suivi d'une virgule) sont
  // egalement une erreur frequente et facile a corriger sans risque.
  function retirerVirgulesSuperflues(t) {
    return t.replace(/,(\s*[}\]])/g, '$1');
  }
  // TACHE (retour utilisateur : "confiance": elevee au lieu de "elevee") :
  // l'IA oublie parfois les guillemets autour d'une valeur texte (mot seul,
  // sans espace ni caractere special) -- invalide en JSON (traite comme un
  // identifiant inconnu), fait echouer le parsing de tout le texte meme si
  // le reste est correct. Repare uniquement les mots seuls immediatement
  // suivis d'une virgule ou d'une accolade/crochet fermant(e) -- jamais
  // true/false/null, qui sont des valeurs JSON valides sans guillemets.
  function reparerValeursTexteSansGuillemets(t) {
    return t.replace(/:\s*([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9_-]*)(\s*[,}\]])/g, function (correspondance, mot, suite) {
      if (mot === 'true' || mot === 'false' || mot === 'null') { return correspondance; }
      return ': "' + mot + '"' + suite;
    });
  }
  var candidatsSupplementaires = candidatsJSON.map(function (c) {
    return reparerValeursTexteSansGuillemets(retirerVirgulesSuperflues(normaliserGuillemets(c)));
  });
  candidatsJSON = candidatsJSON.concat(candidatsSupplementaires);

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
// TACHE (retour utilisateur : reponses courtes + conseils par question,
// entretien) : une question anticipee n'est plus une simple chaine, mais
// un petit objet {question, pistes, amorce} -- pistes (mots-cles/angle,
// jamais une reponse redigee) et amorce (5-6 mots max, facultative).
// Normalisation tolerante : un element mal forme (pas d'objet, pas de
// "question" non vide) est ignore plutot que de faire echouer tout le
// parsing -- meme principe que le reste de ce moteur.
function normaliserQuestionAnticipeeIA(v) {
  if (!v || typeof v !== 'object') { return null; }
  var question = normaliserTexteIA(v.question);
  if (!question) { return null; }
  return {
    question: question,
    pistes: normaliserListeTextesIA(v.pistes),
    amorce: normaliserTexteIA(v.amorce)
  };
}
function normaliserListeQuestionsIA(v) {
  if (!Array.isArray(v)) { return []; }
  return v.map(normaliserQuestionAnticipeeIA).filter(function (q) { return q !== null; });
}

// TACHE (integration Entretien V2, generalisation) : petite fonction
// utilitaire pour un message d'erreur naturel ("a, b ou c"), utilisee par
// le coeur generique ci-dessous.
function joindreAvecOu(liste) {
  if (liste.length <= 1) { return liste[0] || ''; }
  return liste.slice(0, -1).join(', ') + ' ou ' + liste[liste.length - 1];
}

// TACHE (integration Entretien V2, generalisation) : coeur GENERIQUE de
// validation d'une reponse IA, partage par CV, Lettre, Entretien et tout
// futur module -- une seule logique de recherche (extraireBlocJSONDepuisTexte),
// une seule logique de normalisation par champ (normaliserTexteIA /
// normaliserListeTextesIA), un seul jeu de messages d'erreur. Chaque module
// ne fait que decrire SES champs attendus (nom + type texte/liste) ; toute
// la mecanique de parsing/validation/tolerance est ecrite une seule fois ici.
//
// specification : tableau de { cle: 'profil', type: 'texte' } ou
// { cle: 'pointsForts', type: 'liste' }.
function analyserReponseIA(texteColle, specification) {
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

  var resultat = {};
  var auMoinsUnChampRempli = false;
  specification.forEach(function (champ) {
    var valeur = (champ.type === 'liste') ? normaliserListeTextesIA(objet[champ.cle])
      : (champ.type === 'liste-questions') ? normaliserListeQuestionsIA(objet[champ.cle])
      : normaliserTexteIA(objet[champ.cle]);
    resultat[champ.cle] = valeur;
    if (champ.type === 'liste' || champ.type === 'liste-questions') {
      if (valeur.length > 0) { auMoinsUnChampRempli = true; }
    } else if (!!valeur) { auMoinsUnChampRempli = true; }
  });

  if (!auMoinsUnChampRempli) {
    return {
      succes: false,
      erreur: 'Le JSON a été lu, mais ne contient aucune information exploitable ' +
        '(' + joindreAvecOu(specification.map(function (c) { return c.cle; })) + '). Vérifiez le contenu collé.'
    };
  }

  return { succes: true, valeurs: resultat };
}

var SPEC_CHAMPS_ENTRETIEN = [
  { cle: 'presentation', type: 'texte' },
  { cle: 'pointsAPreparer', type: 'liste' },
  { cle: 'questionsAnticipees', type: 'liste-questions' },
  { cle: 'questionsDuCandidat', type: 'liste' }
];

// TACHE (Moteur de decision de candidature, Tache 1) : normalise une LISTE
// de recommandations (chacune un objet a champs texte simples + une
// justification), en filtrant les entrees entierement vides. Reutilise
// normaliserTexteIA(), deja partagee -- aucune nouvelle logique de
// normalisation de texte. Meme esprit que le traitement des categories
// 'liste-objets' du moteur d'import, mais reste ici une fonction dediee au
// CV (pas ajoutee a SPECIFICATION_IMPORT, qui ne concerne que l'import).
function normaliserListeRecommandationsIA(brut, champs) {
  var liste = Array.isArray(brut) ? brut : [];
  return liste.map(function (item) {
    var e = {};
    champs.forEach(function (c) { e[c] = normaliserTexteIA(item ? item[c] : ''); });
    return e;
  }).filter(function (e) { return champs.some(function (c) { return !!e[c]; }); });
}

// TACHE (retour utilisateur : vide/sommaire/trop long/bavard) : forme
// dediee (poste/entreprise + une LISTE de missions proposees, pas un champ
// texte simple) -- normaliserListeRecommandationsIA ne convient pas ici
// (elle ne gere qu'un texte par champ). Entrees sans poste ou sans aucune
// mission exploitable sont filtrees, meme principe de robustesse que
// normaliserListeRecommandationsIA ci-dessus.
function normaliserSavoirFaireParExperienceIA(brut) {
  var liste = Array.isArray(brut) ? brut : [];
  return liste.map(function (item) {
    return {
      poste: normaliserTexteIA(item ? item.poste : ''),
      entreprise: normaliserTexteIA(item ? item.entreprise : ''),
      missions: normaliserListeTextesIA(item ? item.missions : [])
    };
  }).filter(function (e) { return e.poste && e.missions.length; });
}

// TACHE (Moteur de decision de candidature, Tache 1) : fonction DEDIEE
// (comme analyserReponseIALettre()), pas une delegation vers
// analyserReponseIA() -- "recommandations" melange un objet unique
// (typeCV) et des listes d'objets (experiencesAMettreEnAvant,
// competencesAValoriser, rubriquesMasquables), une forme que le coeur
// generique (SPEC_CHAMPS_*, pense pour CV/Lettre/Entretien) ne sait pas
// exprimer. Le succes/echec reste uniquement determine par
// profil/pointsForts/motsCles (les recommandations sont un enrichissement,
// jamais le critere de succes du parsing).
function analyserReponseIACV(texteColle) {
  if (!(texteColle || '').trim()) {
    return { succes: false, erreur: 'Aucun texte a analyser. Collez la reponse de l\'assistant IA avant de continuer.' };
  }

  var objetBrut = extraireBlocJSONDepuisTexte(texteColle);
  if (!objetBrut) {
    return {
      succes: false,
      erreur: 'Le texte collé ne semble pas être un JSON valide. Vérifiez que vous avez bien copié ' +
        'l\'intégralité de la réponse de l\'IA, sans texte ajouté avant ou après.'
    };
  }

  var recoBrut = objetBrut.recommandations || {};
  var typeCVBrut = recoBrut.typeCV || {};

  var resultat = {
    accrochesProposees: normaliserListeTextesIA(objetBrut.accrochesProposees),
    pointsForts: normaliserListeTextesIA(objetBrut.pointsForts),
    motsCles: normaliserListeTextesIA(objetBrut.motsCles),
    recommandations: {
      typeCV: {
        valeur: normaliserTexteIA(typeCVBrut.valeur) || null,
        justification: normaliserTexteIA(typeCVBrut.justification)
      },
      experiencesAMettreEnAvant: normaliserListeRecommandationsIA(recoBrut.experiencesAMettreEnAvant, ['poste', 'entreprise', 'justification']),
      competencesAValoriser: normaliserListeRecommandationsIA(recoBrut.competencesAValoriser, ['competence', 'justification']),
      rubriquesMasquables: normaliserListeRecommandationsIA(recoBrut.rubriquesMasquables, ['rubrique', 'justification']),
      savoirFaireParExperience: normaliserSavoirFaireParExperienceIA(recoBrut.savoirFaireParExperience)
    }
  };

  if (resultat.accrochesProposees.length === 0 && resultat.pointsForts.length === 0 && resultat.motsCles.length === 0) {
    return {
      succes: false,
      erreur: 'Le JSON a été lu, mais ne contient aucune information exploitable ' +
        '(accrochesProposees, pointsForts ou motsCles). Vérifiez le contenu collé.'
    };
  }

  return { succes: true, valeurs: resultat };
}

// TACHE (Lettre V2, tache 1 : texte complet) : normalise le champ imbrique
// "lettre" ({objet, texte}) -- toujours un objet valide en sortie, meme si
// absent ou mal forme (jamais d'exception, jamais de plantage).
function normaliserLettreImbriquee(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) { return { objet: '', texte: '' }; }
  return { objet: normaliserTexteIA(v.objet), texte: normaliserTexteIA(v.texte) };
}

// TACHE (Lettre V2, tache 1 : texte complet) : fonction DEDIEE (pas une
// delegation vers analyserReponseIA()), car le champ imbrique "lettre" n'est
// pas un type gere par le coeur generique -- exactement comme convenu
// (option B : coeur generique inchange, champ imbrique traite uniquement
// ici). Reutilise neanmoins extraireBlocJSONDepuisTexte() et les memes
// normalisations souples (normaliserTexteIA/normaliserListeTextesIA) --
// aucune logique de recherche/normalisation dupliquee, seule la structure
// du resultat differe.
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
    arguments: normaliserListeTextesIA(objet.arguments),
    // TACHE (retour utilisateur : 3 versions de lettre, cartes dans
    // l'apercu) : versions est desormais une LISTE de {objet, texte} (au
    // lieu d'un objet "lettre" unique) -- normaliserLettreImbriquee reste
    // utilisee telle quelle pour chaque element, aucune duplication de
    // logique. Repli sur l'ancien champ "lettre" (objet unique) si
    // present et "versions" absent, pour ne rien casser si un texte colle
    // avant cette mise a jour traine encore dans le presse-papiers.
    versions: Array.isArray(objet.versions)
      ? objet.versions.map(normaliserLettreImbriquee)
      : [normaliserLettreImbriquee(objet.lettre)]
  };

  var auMoinsUneVersionRemplie = resultat.versions.some(function (v) { return !!v.texte || !!v.objet; });
  var auMoinsUnChampRempli = !!resultat.accroche || resultat.arguments.length > 0 || auMoinsUneVersionRemplie;

  if (!auMoinsUnChampRempli) {
    return {
      succes: false,
      erreur: 'Le JSON a été lu, mais ne contient aucune information exploitable ' +
        '(accroche, arguments ou versions). Vérifiez le contenu collé.'
    };
  }

  return { succes: true, valeurs: resultat };
}

// TACHE (integration Entretien V2) : meme mecanique generique que CV et
// Lettre, aucune logique dupliquee -- seule la specification des champs change.
function analyserReponseIAEntretien(texteColle) { return analyserReponseIA(texteColle, SPEC_CHAMPS_ENTRETIEN); }

// ============================================================
// TACHE 3 (moteur d'import, structures communes) : conforme a
// docs/ARCHITECTURE_MOTEUR_IMPORT.md. Cette specification decrit,
// categorie par categorie ET champ par champ, la forme attendue -- ni
// analyserReponseImport() ci-dessous, ni le futur moteur de comparaison/
// fusion (taches 5 et 7) ne doivent jamais connaitre un nom de categorie
// "en dur" : ils se contentent de parcourir cette liste. Ajouter une
// future categorie (portfolio, publications...) se fait ici, jamais dans
// le moteur lui-meme.
//
// Types de CATEGORIE geres (spec.type) :
// - 'texte'                  : chaine simple
// - 'liste-textes'            : tableau de chaines (ex. certifications)
// - 'objet'                   : objet a champs fixes, chacun type (voir
//                               ci-dessous) (ex. identite, permis)
// - 'liste-objets'             : tableau d'elements structures, chaque
//                               champ type, chaque element pouvant porter
//                               des "alertes" (voir §4 du document
//                               d'architecture)
// - 'objet-de-listes-textes'   : objet dont chaque champ est lui-meme un
//                               tableau de chaines (ex. competences)
//
// Types de CHAMP geres, a l'interieur d'un 'objet' ou d'un 'liste-objets'
// (champ.type) -- volontairement simple a ce stade (pas de validateur
// complet construit ici), mais suffisant pour que le moteur puisse, plus
// tard, valider les types, detecter les incoherences et normaliser plus
// finement, sans avoir a retoucher la structure de la specification :
// - 'texte'    : chaine simple
// - 'liste'    : tableau de chaines (ex. permis.categories)
// - 'booleen'  : true / false uniquement -- toute autre valeur (chaine,
//               nombre...) est consideree comme non renseignee (null),
//               jamais devinee ou convertie a l'aveugle
// - 'date'     : chaine, traitee comme un texte pour l'instant (aucun
//               format impose) -- le type est deja pose pour permettre une
//               validation de format plus stricte plus tard, sans casser
//               la specification actuelle
// ============================================================
var SPECIFICATION_IMPORT = [
  { cle: 'identite', type: 'objet', champs: [
    { nom: 'civilite', type: 'texte' }, { nom: 'nom', type: 'texte' }, { nom: 'prenom', type: 'texte' },
    { nom: 'telephone', type: 'texte' }, { nom: 'email', type: 'texte' }, { nom: 'adresse', type: 'texte' }, { nom: 'ville', type: 'texte' }
  ]},
  // TACHE (raffinement prompt extraction-cv.md) : missions en LISTE (une
  // mission par element), pas une chaine unique -- permet a l'avenir de
  // masquer/reordonner/raccourcir des missions individuellement (ex. via
  // appliquerPrioritesIA()), sans avoir a re-parser du texte libre.
  { cle: 'experiences', type: 'liste-objets', champs: [
    { nom: 'poste', type: 'texte' }, { nom: 'entreprise', type: 'texte' }, { nom: 'lieu', type: 'texte' },
    { nom: 'dateDebut', type: 'date' }, { nom: 'dateFin', type: 'date' },
    // TACHE 8 (moteur de fusion) : dossier.experiences[].missions est une
    // CHAINE unique (deja le cas avant le moteur d'import, confirme dans le
    // rendu des templates -- <p>{{missions}}</p>, jamais une liste). Le
    // schema d'import produit une liste (une mission par element, plus
    // utile pour l'IA et l'ecran de validation). "transformationVersDossier"
    // fait la conversion au moment de la fusion, de facon DECLARATIVE --
    // le moteur de fusion (fusionnerDonnees) n'a jamais besoin de connaitre
    // "experiences" ou "missions" en dur, il applique juste cette fonction
    // si elle est presente.
    { nom: 'missions', type: 'liste', transformationVersDossier: function (valeur) { return (valeur || []).join('. '); } }
  ], champsRapprochement: ['poste', 'entreprise'] },
  { cle: 'formations', type: 'liste-objets', champs: [
    { nom: 'niveau', type: 'texte' }, { nom: 'intitule', type: 'texte' }, { nom: 'annee', type: 'texte' }
  ], champsRapprochement: ['intitule', 'annee'] },
  { cle: 'competences', type: 'objet-de-listes-textes', champs: ['savoirFaire', 'savoirEtre', 'savoirs'] },
  { cle: 'langues', type: 'liste-objets', champs: [
    { nom: 'langue', type: 'texte' }, { nom: 'niveau', type: 'texte' }
  ], champsRapprochement: ['langue'] },
  { cle: 'certifications', type: 'liste-textes', champsRapprochement: null },
  { cle: 'logiciels', type: 'liste-textes', champsRapprochement: null },
  { cle: 'permis', type: 'objet', champs: [
    { nom: 'possede', type: 'booleen' }, { nom: 'categories', type: 'liste' }, { nom: 'vehicule', type: 'booleen' }
  ]},
  { cle: 'loisirs', type: 'liste-textes', champsRapprochement: null },
  { cle: 'engagements', type: 'liste-textes', champsRapprochement: null },
  // TACHE (raffinement prompt extraction-cv.md, point 7) : filet de
  // securite generique -- toute information reperee par l'IA mais ne
  // correspondant a aucune categorie ci-dessus (disponibilite, mobilite,
  // LinkedIn, RQTH si explicitement mentionnee, pretentions salariales...)
  // atterrit ici plutot que d'etre perdue. Simple liste de texte ; le tri
  // eventuel vers une categorie future reste une decision humaine ou une
  // evolution ulterieure du moteur, jamais une deduction automatique.
  { cle: 'informationsNonClassees', type: 'liste-textes', champsRapprochement: null }
];

// TACHE 3 (moteur d'import) : normalise UNE valeur selon le type de CHAMP
// declare dans la specification (pas le type de categorie) -- utilisee par
// les branches 'objet' et 'liste-objets' ci-dessous. Jamais d'exception,
// jamais de valeur inventee : une valeur du mauvais type retombe sur une
// valeur neutre (null pour un booleen, chaine/liste vide sinon).
// TACHE (raffinement prompt extraction-cv.md, point 2) : seules 3 valeurs
// autorisees pour le niveau de confiance d'un element extrait. Toute autre
// valeur (absente, mal ecrite, dans une autre langue...) retombe sur null --
// jamais devinee, jamais une valeur par defaut optimiste.
function normaliserConfianceIA(v) {
  return (v === 'elevee' || v === 'moyenne' || v === 'faible') ? v : null;
}

function normaliserChampSelonType(valeur, typeChamp) {
  if (typeChamp === 'liste') { return normaliserListeTextesIA(valeur); }
  if (typeChamp === 'booleen') { return (valeur === true || valeur === false) ? valeur : null; }
  if (typeChamp === 'date') { return normaliserTexteIA(valeur); } // pas de validation de format a ce stade
  return normaliserTexteIA(valeur); // 'texte' par defaut
}

// Un champ est-il considere "rempli" pour la detection generale
// (auMoinsUnChampRempli) ? Depend du type -- un booleen "false" est une
// reponse valide (donc "rempli"), contrairement a null (non renseigne).
function champEstRempli(valeur, typeChamp) {
  if (typeChamp === 'liste') { return valeur.length > 0; }
  if (typeChamp === 'booleen') { return valeur !== null; }
  return !!valeur;
}

// TACHE 3 (moteur d'import) : parsing GENERIQUE, partage par toute future
// source (CV, LinkedIn, Europass...) -- seule la specification passee en
// parametre change, jamais cette fonction. Reutilise extraireBlocJSONDepuisTexte()
// et normaliserTexteIA()/normaliserListeTextesIA(), deja partagees par le CV/
// la Lettre/l'Entretien -- aucune logique de recherche ou de normalisation
// dupliquee. Toujours tolerant : un champ absent ou mal forme retombe sur
// une valeur neutre, jamais une exception.
function analyserReponseImport(texteColle, specification) {
  if (!(texteColle || '').trim()) {
    return { succes: false, erreur: 'Aucun texte a analyser. Collez la reponse de l\'assistant IA avant de continuer.' };
  }

  var objetBrut = extraireBlocJSONDepuisTexte(texteColle);
  if (!objetBrut) {
    return {
      succes: false,
      erreur: 'Le texte collé ne semble pas être un JSON valide. Vérifiez que vous avez bien copié ' +
        'l\'intégralité de la réponse de l\'IA, sans texte ajouté avant ou après.'
    };
  }

  var resultat = {};
  var auMoinsUnChampRempli = false;

  specification.forEach(function (spec) {
    var brut = objetBrut[spec.cle];

    if (spec.type === 'texte') {
      resultat[spec.cle] = normaliserTexteIA(brut);
      if (resultat[spec.cle]) { auMoinsUnChampRempli = true; }

    } else if (spec.type === 'liste-textes') {
      resultat[spec.cle] = normaliserListeTextesIA(brut);
      if (resultat[spec.cle].length > 0) { auMoinsUnChampRempli = true; }

    } else if (spec.type === 'objet') {
      var objetSource = (brut && typeof brut === 'object' && !Array.isArray(brut)) ? brut : {};
      var objetNormalise = {};
      var objetRempli = false;
      spec.champs.forEach(function (champ) {
        var v = normaliserChampSelonType(objetSource[champ.nom], champ.type);
        objetNormalise[champ.nom] = v;
        if (champEstRempli(v, champ.type)) { objetRempli = true; }
      });
      resultat[spec.cle] = objetNormalise;
      if (objetRempli) { auMoinsUnChampRempli = true; }

    } else if (spec.type === 'liste-objets') {
      var listeSource = Array.isArray(brut) ? brut : [];
      resultat[spec.cle] = listeSource.map(function (item) {
        var e = {};
        spec.champs.forEach(function (champ) {
          e[champ.nom] = normaliserChampSelonType(item ? item[champ.nom] : undefined, champ.type);
        });
        // TACHE (alertes, §4 du document d'architecture) : incertitude
        // signalee par l'IA elle-meme sur cet element precis (ex. "date de
        // fin manquante") -- toujours optionnel, jamais invente ici.
        e.alertes = normaliserListeTextesIA(item ? item.alertes : []);
        // TACHE (raffinement prompt extraction-cv.md, point 2) : niveau de
        // confiance de l'IA sur CET element precis -- champ UNIVERSEL,
        // comme alertes, jamais a redeclarer categorie par categorie dans
        // "champs". Seules 3 valeurs autorisees ; toute autre valeur
        // (absente, mal orthographiee...) retombe sur null plutot que
        // d'etre devinee.
        e.confiance = normaliserConfianceIA(item ? item.confiance : null);
        return e;
      });
      if (resultat[spec.cle].length > 0) { auMoinsUnChampRempli = true; }

    } else if (spec.type === 'objet-de-listes-textes') {
      var objetListesSource = (brut && typeof brut === 'object') ? brut : {};
      var objetListesNormalise = {};
      var objetListesRempli = false;
      spec.champs.forEach(function (c) {
        objetListesNormalise[c] = normaliserListeTextesIA(objetListesSource[c]);
        if (objetListesNormalise[c].length > 0) { objetListesRempli = true; }
      });
      resultat[spec.cle] = objetListesNormalise;
      if (objetListesRempli) { auMoinsUnChampRempli = true; }
    }
  });

  if (!auMoinsUnChampRempli) {
    return {
      succes: false,
      erreur: 'Le JSON a été lu, mais ne contient aucune information exploitable. Vérifiez le contenu collé.'
    };
  }

  return { succes: true, valeurs: resultat };
}

// ============================================================
// TACHE 6 (moteur d'import, comparaison) : conforme a
// docs/ARCHITECTURE_MOTEUR_IMPORT.md, §6. Fonction PURE -- ne modifie
// jamais dossier, ne decide jamais rien, se contente de CONSTATER des
// differences. Pilotee entierement par SPECIFICATION_IMPORT : ne connait
// aucun nom de categorie en dur, fonctionne a l'identique pour une future
// categorie ajoutee a la specification. Reutilisable telle quelle, plus
// tard, pour comparer deux CV entre eux ou un dossier ancien/nouveau (§13
// du document d'architecture) -- elle ne sait meme pas que l'un des deux
// cotes s'appelle "dossier".
// ============================================================

// Compare deux chaines en ignorant casse/espaces superflus -- jamais une
// egalite stricte de chaines brutes, pour eviter des faux "nouveaux"
// evidents (ex. "Excel" vs "excel ").
function normaliserPourComparaison(texte) {
  return (texte || '').toString().trim().toLowerCase();
}

// Un element de liste (dossier.certifications, logiciels...) existe-t-il
// deja, a la casse/espaces pres ?
function texteExisteDeja(liste, texte) {
  var t = normaliserPourComparaison(texte);
  if (!t) { return false; }
  return (liste || []).some(function (e) { return normaliserPourComparaison(e) === t; });
}

// Deux elements structures (une experience, une formation...) sont-ils un
// doublon PROBABLE ? Compare uniquement les champs de rapprochement
// declares dans la specification (jamais tous les champs) -- toujours une
// heuristique, jamais une certitude (voir §9 du document d'architecture).
// Exige qu'au moins un champ compare soit non vide, pour ne jamais
// rapprocher deux elements entierement vides entre eux.
function estDoublonProbable(existant, propose, champsRapprochement) {
  if (!champsRapprochement || champsRapprochement.length === 0) { return false; }
  var auMoinsUnChampNonVide = false;
  var tousCorrespondent = champsRapprochement.every(function (champ) {
    var a = normaliserPourComparaison(existant[champ]);
    var b = normaliserPourComparaison(propose[champ]);
    if (b) { auMoinsUnChampNonVide = true; }
    return a === b;
  });
  return auMoinsUnChampNonVide && tousCorrespondent;
}

// Une valeur de champ (texte/liste/booleen) est-elle consideree "non vide" ?
// Utilise pour savoir s'il y a quelque chose a comparer/proposer.
function champNonVide(valeur, typeChamp) {
  if (typeChamp === 'liste') { return Array.isArray(valeur) && valeur.length > 0; }
  if (typeChamp === 'booleen') { return valeur !== null && valeur !== undefined; }
  return !!valeur;
}

function comparerDonnees(dossierExistant, donneesProposees, specification) {
  var resultat = {};

  specification.forEach(function (spec) {
    var existant = dossierExistant ? dossierExistant[spec.cle] : undefined;
    var propose = donneesProposees ? donneesProposees[spec.cle] : undefined;

    if (spec.type === 'liste-textes') {
      var listeExistanteTextes = Array.isArray(existant) ? existant : [];
      var listeProposeeTextes = Array.isArray(propose) ? propose : [];
      var nouveauxTextes = [], doublonsTextes = [];
      listeProposeeTextes.forEach(function (item) {
        (texteExisteDeja(listeExistanteTextes, item) ? doublonsTextes : nouveauxTextes).push(item);
      });
      resultat[spec.cle] = { nouveaux: nouveauxTextes, doublonsProbables: doublonsTextes, conflits: [] };

    } else if (spec.type === 'liste-objets') {
      var listeExistanteObjets = Array.isArray(existant) ? existant : [];
      var listeProposeeObjets = Array.isArray(propose) ? propose : [];
      var nouveauxObjets = [], doublonsObjets = [];
      listeProposeeObjets.forEach(function (item) {
        var aUnDoublon = listeExistanteObjets.some(function (e) {
          return estDoublonProbable(e, item, spec.champsRapprochement);
        });
        (aUnDoublon ? doublonsObjets : nouveauxObjets).push(item);
      });
      resultat[spec.cle] = { nouveaux: nouveauxObjets, doublonsProbables: doublonsObjets, conflits: [] };

    } else if (spec.type === 'objet') {
      var existantObj = existant || {};
      var proposeObj = propose || {};
      var nouveauxChamps = [];
      var conflitsChamps = [];
      spec.champs.forEach(function (champ) {
        var valExistante = existantObj[champ.nom];
        var valProposee = proposeObj[champ.nom];
        if (!champNonVide(valProposee, champ.type)) { return; } // rien de propose pour ce champ
        if (!champNonVide(valExistante, champ.type)) {
          nouveauxChamps.push({ champ: champ.nom, valeur: valProposee });
          return;
        }
        // Les deux cotes ont une valeur : conflit uniquement si elles different reellement.
        var identique = (champ.type === 'liste')
          ? JSON.stringify((valExistante || []).slice().sort()) === JSON.stringify((valProposee || []).slice().sort())
          : valExistante === valProposee;
        if (!identique) {
          conflitsChamps.push({ champ: champ.nom, valeurExistante: valExistante, valeurProposee: valProposee });
        }
      });
      resultat[spec.cle] = { nouveaux: nouveauxChamps, doublonsProbables: [], conflits: conflitsChamps };

    } else if (spec.type === 'objet-de-listes-textes') {
      var sousResultat = {};
      spec.champs.forEach(function (sousChamp) {
        var listeExistanteSous = (existant && existant[sousChamp]) || [];
        var listeProposeeSous = (propose && propose[sousChamp]) || [];
        var nouveauxSous = [], doublonsSous = [];
        listeProposeeSous.forEach(function (item) {
          (texteExisteDeja(listeExistanteSous, item) ? doublonsSous : nouveauxSous).push(item);
        });
        sousResultat[sousChamp] = { nouveaux: nouveauxSous, doublonsProbables: doublonsSous, conflits: [] };
      });
      resultat[spec.cle] = sousResultat;

    } else if (spec.type === 'texte') {
      var proposeTexte = propose || '';
      if (!proposeTexte) {
        resultat[spec.cle] = { nouveaux: [], doublonsProbables: [], conflits: [] };
      } else if (!existant) {
        resultat[spec.cle] = { nouveaux: [proposeTexte], doublonsProbables: [], conflits: [] };
      } else if (existant === proposeTexte) {
        resultat[spec.cle] = { nouveaux: [], doublonsProbables: [proposeTexte], conflits: [] };
      } else {
        resultat[spec.cle] = { nouveaux: [], doublonsProbables: [], conflits: [{ valeurExistante: existant, valeurProposee: proposeTexte }] };
      }
    }
  });

  return resultat;
}

// ============================================================
// TACHE 7 (moteur d'import, ecran de validation) : conforme a
// docs/ARCHITECTURE_MOTEUR_IMPORT.md, §3 et §9. Genere une vue d'ensemble,
// categorie par categorie, a partir du resultat de comparerDonnees() --
// jamais d'ecriture dans dossier ici (voir Tache 8, pas encore construite).
// Entierement pilote par SPECIFICATION_IMPORT : ne connait aucun nom de
// categorie en dur.
//
// Convention d'attributs data-* utilisee pour relier chaque controle a
// l'element qu'il represente, relue ensuite par lireDecisionsValidationImport() :
// - data-categorie, data-sous-categorie (pour competences), data-groupe
//   ("nouveaux"/"doublonsProbables"), data-index (position dans ce groupe),
//   data-champ (pour les listes d'objets et les objets).
// ============================================================

function badgeConfiance(confiance) {
  if (confiance === 'elevee') { return '<span style="color:#15803d;" title="Confiance elevee">&#128994;</span>'; }
  if (confiance === 'moyenne') { return '<span style="color:#b45309;" title="Confiance moyenne">&#128993;</span>'; }
  if (confiance === 'faible') { return '<span style="color:#b91c1c;" title="Confiance faible">&#128308;</span>'; }
  return '';
}

function texteAlertes(alertes) {
  if (!alertes || !alertes.length) { return ''; }
  return '<div class="small" style="color:#b45309;">&#9888;&#65039; ' + alertes.join(' — ') + '</div>';
}

// Une ligne pour un element simple de liste-textes (certifications,
// logiciels, loisirs, engagements, informationsNonClassees...). Checkbox
// cochee par defaut pour un "nouveau", decochee par defaut pour un
// "doublon probable" (deja present, l'ajouter a nouveau est un choix
// explicite, pas le comportement par defaut).
function ligneItemListeTextes(categorie, groupe, index, texte) {
  var idBase = 'val_' + categorie + '_' + groupe + '_' + index;
  var cocheParDefaut = (groupe === 'nouveaux') ? ' checked' : '';
  return '<div class="d-flex align-items-center gap-2 mb-1">' +
    '<input type="checkbox" id="' + idBase + '_case" data-categorie="' + categorie + '" data-groupe="' + groupe +
    '" data-index="' + index + '"' + cocheParDefaut + '>' +
    '<input type="text" class="form-control form-control-sm" id="' + idBase + '_valeur" value="' + echapperAttribut(texte) + '">' +
    '</div>';
}

// Meme principe, pour un sous-champ de competences (objet-de-listes-textes).
function ligneItemCompetence(sousCategorie, groupe, index, texte) {
  var idBase = 'val_competences_' + sousCategorie + '_' + groupe + '_' + index;
  var cocheParDefaut = (groupe === 'nouveaux') ? ' checked' : '';
  return '<div class="d-flex align-items-center gap-2 mb-1">' +
    '<input type="checkbox" id="' + idBase + '_case" data-categorie="competences" data-sous-categorie="' + sousCategorie +
    '" data-groupe="' + groupe + '" data-index="' + index + '"' + cocheParDefaut + '>' +
    '<input type="text" class="form-control form-control-sm" id="' + idBase + '_valeur" value="' + echapperAttribut(texte) + '">' +
    '</div>';
}

// TACHE (refonte onglets, ecran "Verifiez les informations importees") :
// variante de ligneItemListeObjets ci-dessus, RESERVEE aux experiences --
// meme convention d'identifiants (val_experiences_{groupe}_{index}_{champ}),
// lireDecisionsValidationImport() n'a donc besoin d'AUCUNE modification.
// Seule la presentation change : poste/entreprise/lieu/dates groupes en
// en-tete de carte, "Missions" isole dans son propre bloc visuel en
// dessous (zone de texte, plus confortable qu'un simple champ une ligne).
function ligneItemExperience(categorie, groupe, index, item, champs) {
  var idBase = 'val_' + categorie + '_' + groupe + '_' + index;
  var cocheParDefaut = (groupe === 'nouveaux') ? ' checked' : '';
  function champExiste(nom) { return champs.some(function (c) { return c.nom === nom; }); }
  function champTexte(nom, placeholder, classe) {
    if (!champExiste(nom)) { return ''; }
    return '<input type="text" class="form-control form-control-sm ' + (classe || '') + '" ' +
      'id="' + idBase + '_' + nom + '" data-champ="' + nom + '" placeholder="' + echapperAttribut(placeholder) + '" ' +
      'value="' + echapperAttribut(item[nom] || '') + '">';
  }
  var missionsExiste = champExiste('missions');
  return '<div class="carte-experience-validation mb-2">' +
    '<div class="d-flex align-items-center gap-2 mb-2">' +
    '<input type="checkbox" id="' + idBase + '_case" data-categorie="' + categorie + '" data-groupe="' + groupe +
    '" data-index="' + index + '"' + cocheParDefaut + '>' +
    champTexte('poste', 'Poste', 'fw-bold flex-grow-1') +
    badgeConfiance(item.confiance) +
    '</div>' +
    '<div class="row g-2 mb-2">' +
    '<div class="col-md-6">' + champTexte('entreprise', 'Entreprise') + '</div>' +
    '<div class="col-md-6">' + champTexte('lieu', 'Lieu') + '</div>' +
    '<div class="col-md-6">' + champTexte('dateDebut', 'Début (ex. 2023-09)') + '</div>' +
    '<div class="col-md-6">' + champTexte('dateFin', 'Fin (vide = en cours)') + '</div>' +
    '</div>' +
    (missionsExiste
      ? '<div class="bloc-missions-validation"><label class="small fw-bold text-muted d-block mb-1">Missions</label>' +
        '<textarea class="form-control form-control-sm" rows="3" id="' + idBase + '_missions" data-champ="missions">' +
        echapperAttribut((item.missions || []).join(', ')) + '</textarea></div>'
      : '') +
    texteAlertes(item.alertes) +
    '</div>';
}

// Une ligne pour un element de liste-objets (experiences, formations,
// langues) : une checkbox globale pour l'element + un champ texte editable
// par sous-champ, plus le badge de confiance et les alertes eventuelles.
function ligneItemListeObjets(categorie, groupe, index, item, champs) {
  var idBase = 'val_' + categorie + '_' + groupe + '_' + index;
  var cocheParDefaut = (groupe === 'nouveaux') ? ' checked' : '';
  var champsHtml = champs.map(function (champ) {
    var valeurAffichee = (champ.type === 'liste') ? (item[champ.nom] || []).join(', ') : (item[champ.nom] || '');
    return '<input type="text" class="form-control form-control-sm mb-1" ' +
      'id="' + idBase + '_' + champ.nom + '" data-champ="' + champ.nom + '" ' +
      'placeholder="' + echapperAttribut(champ.nom) + '" value="' + echapperAttribut(valeurAffichee) + '">';
  }).join('');
  return '<div class="border rounded p-2 mb-2">' +
    '<div class="d-flex align-items-center gap-2 mb-1">' +
    '<input type="checkbox" id="' + idBase + '_case" data-categorie="' + categorie + '" data-groupe="' + groupe +
    '" data-index="' + index + '"' + cocheParDefaut + '>' +
    badgeConfiance(item.confiance) +
    '</div>' + champsHtml + texteAlertes(item.alertes) +
    '</div>';
}

// Un champ scalaire d'un "objet" (identite, permis) propose comme NOUVEAU
// (le champ etait vide dans dossier) : checkbox + valeur editable.
function ligneChampObjetNouveau(categorie, champNom, valeur, typeChamp) {
  var idBase = 'val_' + categorie + '_nouveauChamp_' + champNom;
  var valeurAffichee = (typeChamp === 'liste') ? (valeur || []).join(', ') : (typeChamp === 'booleen' ? (valeur ? 'Oui' : 'Non') : valeur);
  var champInput = (typeChamp === 'booleen')
    ? '<select class="form-select form-select-sm" id="' + idBase + '_valeur"><option value="true"' + (valeur ? ' selected' : '') + '>Oui</option><option value="false"' + (!valeur ? ' selected' : '') + '>Non</option></select>'
    : '<input type="text" class="form-control form-control-sm" id="' + idBase + '_valeur" value="' + echapperAttribut(valeurAffichee) + '">';
  return '<div class="d-flex align-items-center gap-2 mb-1">' +
    '<input type="checkbox" id="' + idBase + '_case" data-categorie="' + categorie + '" data-groupe="nouveauChamp" ' +
    'data-champ="' + champNom + '" checked>' +
    '<label class="small text-muted mb-0" style="min-width:110px;">' + champNom + '</label>' + champInput +
    '</div>';
}

// Un champ scalaire d'un "objet" en CONFLIT (dossier a deja une valeur,
// l'import en propose une differente) : choix explicite garder/remplacer,
// jamais de remplacement automatique.
function ligneChampObjetConflit(categorie, champNom, valeurExistante, valeurProposee, typeChamp) {
  var idBase = 'val_' + categorie + '_conflit_' + champNom;
  var afficheExistant = (typeChamp === 'liste') ? (valeurExistante || []).join(', ') : (typeChamp === 'booleen' ? (valeurExistante ? 'Oui' : 'Non') : valeurExistante);
  var afficheProposee = (typeChamp === 'liste') ? (valeurProposee || []).join(', ') : (typeChamp === 'booleen' ? (valeurProposee ? 'Oui' : 'Non') : valeurProposee);
  return '<div class="border rounded p-2 mb-2">' +
    '<label class="small text-muted mb-1 d-block">' + champNom + '</label>' +
    '<div class="form-check"><input class="form-check-input" type="radio" name="' + idBase + '" id="' + idBase + '_garder" value="garder" checked>' +
    '<label class="form-check-label small" for="' + idBase + '_garder">Garder : ' + afficheExistant + '</label></div>' +
    '<div class="form-check"><input class="form-check-input" type="radio" name="' + idBase + '" id="' + idBase + '_remplacer" value="remplacer">' +
    '<label class="form-check-label small" for="' + idBase + '_remplacer">Remplacer par : ' + afficheProposee + '</label></div>' +
    '</div>';
}

// TACHE (refonte onglets, ecran "Verifiez les informations importees") :
// regroupement des 10 categories de SPECIFICATION_IMPORT en 5 onglets
// thematiques (decision validee avec la personne) -- "informationsNonClassees"
// n'a volontairement AUCUN groupe fixe ici : ce n'est pas une vraie
// categorie renseignee par la personne (filet de securite generique), un
// onglet "Autres informations" n'est ajoute par genererEcranValidationImport()
// QUE s'il contient reellement quelque chose.
var GROUPES_ONGLETS_VALIDATION_IMPORT = [
  { id: 'identite', titre: 'Identité & mobilité', cles: ['identite', 'permis', 'langues'] },
  { id: 'experiences', titre: 'Expériences professionnelles', cles: ['experiences'] },
  { id: 'formations', titre: 'Formations & certifications', cles: ['formations', 'certifications'] },
  { id: 'competences', titre: 'Compétences transférables', cles: ['competences'] },
  { id: 'complements', titre: 'Loisirs, engagements & logiciels', cles: ['loisirs', 'engagements', 'logiciels'] }
];
var LIBELLES_CATEGORIES_VALIDATION_IMPORT = {
  identite: 'Identité', permis: 'Mobilité (permis)', langues: 'Langues',
  experiences: 'Expériences professionnelles', formations: 'Formations et diplômes', certifications: 'Certifications',
  competences: 'Compétences', logiciels: 'Logiciels', loisirs: 'Loisirs', engagements: 'Engagements',
  informationsNonClassees: 'Autres informations'
};
var LIBELLES_SOUS_COMPETENCES_VALIDATION_IMPORT = { savoirFaire: 'Savoir-faire', savoirEtre: 'Savoir-être', savoirs: 'Savoirs' };

// Une categorie a-t-elle reellement quelque chose a montrer (nouveaux,
// doublons probables ou conflits, selon son type) ? Utilisee pour decider
// entre le rendu normal et le message "Rien detecte ici pour le moment."
function resultatCategorieAContenu(spec, res) {
  if (!res) { return false; }
  if (spec.type === 'liste-textes' || spec.type === 'liste-objets') {
    return !!((res.nouveaux && res.nouveaux.length) || (res.doublonsProbables && res.doublonsProbables.length));
  }
  if (spec.type === 'objet') {
    return !!((res.nouveaux && res.nouveaux.length) || (res.conflits && res.conflits.length));
  }
  if (spec.type === 'objet-de-listes-textes') {
    return spec.champs.some(function (sc) {
      var sr = res[sc];
      return sr && ((sr.nouveaux && sr.nouveaux.length) || (sr.doublonsProbables && sr.doublonsProbables.length));
    });
  }
  return false;
}

// Contenu HTML d'UNE categorie (identite, experiences, ...), avec son
// propre sous-titre -- utilise a l'interieur de chaque onglet (un onglet
// peut regrouper plusieurs categories, ex. "Identité & mobilité" = identite
// + permis + langues). TACHE (retour utilisateur : "si c'est vide je veux
// que la personne remarque cela") : chaque categorie garde son sous-titre
// MEME vide, avec un message explicite plutot que de disparaitre -- le
// vide doit se voir, pas se deviner par une absence.
function contenuCategorieValidation(spec, res) {
  var titre = LIBELLES_CATEGORIES_VALIDATION_IMPORT[spec.cle] || spec.cle;
  if (!resultatCategorieAContenu(spec, res)) {
    return '<div class="mb-3"><h6>' + titre + '</h6>' +
      '<p class="text-muted small fst-italic mb-0">Rien détecté ici pour le moment.</p></div>';
  }
  var corps = '';
  if (spec.type === 'liste-textes') {
    corps = (res.nouveaux || []).map(function (t, i) { return ligneItemListeTextes(spec.cle, 'nouveaux', i, t); }).join('') +
      (res.doublonsProbables || []).map(function (t, i) { return ligneItemListeTextes(spec.cle, 'doublonsProbables', i, t); }).join('');
  } else if (spec.type === 'liste-objets') {
    var renduLigne = (spec.cle === 'experiences') ? ligneItemExperience : ligneItemListeObjets;
    corps = (res.nouveaux || []).map(function (it, i) { return renduLigne(spec.cle, 'nouveaux', i, it, spec.champs); }).join('') +
      (res.doublonsProbables || []).map(function (it, i) { return renduLigne(spec.cle, 'doublonsProbables', i, it, spec.champs); }).join('');
  } else if (spec.type === 'objet') {
    corps = (res.nouveaux || []).map(function (n) {
      var champDef = spec.champs.filter(function (c) { return c.nom === n.champ; })[0];
      return ligneChampObjetNouveau(spec.cle, n.champ, n.valeur, champDef ? champDef.type : 'texte');
    }).join('') + (res.conflits || []).map(function (c) {
      var champDef = spec.champs.filter(function (ch) { return ch.nom === c.champ; })[0];
      return ligneChampObjetConflit(spec.cle, c.champ, c.valeurExistante, c.valeurProposee, champDef ? champDef.type : 'texte');
    }).join('');
  } else if (spec.type === 'objet-de-listes-textes') {
    corps = spec.champs.map(function (sousChamp) {
      var sousRes = res[sousChamp];
      if (!sousRes || (!sousRes.nouveaux.length && !sousRes.doublonsProbables.length)) { return ''; }
      var lignesSous = sousRes.nouveaux.map(function (t, i) { return ligneItemCompetence(sousChamp, 'nouveaux', i, t); }).join('') +
        sousRes.doublonsProbables.map(function (t, i) { return ligneItemCompetence(sousChamp, 'doublonsProbables', i, t); }).join('');
      return '<p class="small text-muted mb-1">' + (LIBELLES_SOUS_COMPETENCES_VALIDATION_IMPORT[sousChamp] || sousChamp) + '</p>' + lignesSous;
    }).join('');
  }
  return '<div class="mb-3"><h6>' + titre + '</h6>' + corps + '</div>';
}

// Assemble l'ecran complet, ONGLET par ONGLET (chaque onglet regroupant
// plusieurs categories de SPECIFICATION_IMPORT, voir GROUPES_ONGLETS_
// VALIDATION_IMPORT), a partir du resultat de comparerDonnees(). Retourne
// une chaine HTML, ne touche a aucun DOM ici -- la bascule d'un onglet a
// l'autre (affichage/masquage des panneaux) est cablee separement par
// wireOngletsValidationImport(), appelee une fois ce HTML insere dans la
// page (voir ouvrirEcranValidationImport()).
function genererEcranValidationImport(resultatComparaison, specification) {
  var specParCle = {};
  specification.forEach(function (s) { specParCle[s.cle] = s; });

  var groupes = GROUPES_ONGLETS_VALIDATION_IMPORT.slice();
  // Onglet supplementaire "Autres informations" : uniquement si ce filet
  // de securite generique contient reellement quelque chose -- ce n'est
  // pas une vraie categorie renseignee par la personne, pas de sens a la
  // montrer "vide" comme les 5 onglets thematiques habituels.
  var specAutres = specParCle.informationsNonClassees;
  if (specAutres && resultatCategorieAContenu(specAutres, resultatComparaison.informationsNonClassees)) {
    groupes = groupes.concat([{ id: 'autres', titre: 'Autres informations', cles: ['informationsNonClassees'] }]);
  }

  var boutons = '';
  var panneaux = '';
  groupes.forEach(function (g, i) {
    var contenuGroupe = g.cles.map(function (cle) {
      var spec = specParCle[cle];
      return spec ? contenuCategorieValidation(spec, resultatComparaison[cle]) : '';
    }).join('');
    boutons += '<button type="button" class="onglet-validation-import-btn' + (i === 0 ? ' actif' : '') +
      '" data-onglet-btn="' + g.id + '">' + g.titre + '</button>';
    panneaux += '<div class="onglet-validation-import-panel' + (i === 0 ? ' actif' : '') + '" data-onglet-panel="' + g.id + '">' +
      contenuGroupe + '</div>';
  });

  return '<div class="onglets-validation-import">' + boutons + '</div>' +
    '<div class="onglets-validation-import-corps">' + panneaux + '</div>';
}

// Cablage de la bascule d'onglet (clic = affiche ce panneau, masque les
// autres) -- a appeler une fois apres insertion du HTML ci-dessus dans la
// page. Ne touche a AUCUNE case a cocher/valeur : purement visuel.
function wireOngletsValidationImport() {
  document.querySelectorAll('.onglet-validation-import-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cible = this.dataset.ongletBtn;
      document.querySelectorAll('.onglet-validation-import-btn').forEach(function (b) { b.classList.toggle('actif', b === btn); });
      document.querySelectorAll('.onglet-validation-import-panel').forEach(function (p) {
        p.classList.toggle('actif', p.dataset.ongletPanel === cible);
      });
    });
  });
}

// Relit l'ecran genere ci-dessus (une fois affiche dans une vraie page) et
// produit une structure "decisionsUtilisateur", prete pour le futur
// fusionnerDonnees() (Tache 8). Ne modifie jamais dossier elle-meme.
function lireDecisionsValidationImport(resultatComparaison, specification) {
  var decisions = {};

  specification.forEach(function (spec) {
    var res = resultatComparaison[spec.cle];
    if (!res) { return; }

    if (spec.type === 'liste-textes') {
      var elements = [];
      ['nouveaux', 'doublonsProbables'].forEach(function (groupe) {
        (res[groupe] || []).forEach(function (_, i) {
          var idBase = 'val_' + spec.cle + '_' + groupe + '_' + i;
          var caseACocher = document.getElementById(idBase + '_case');
          var champValeur = document.getElementById(idBase + '_valeur');
          if (caseACocher && caseACocher.checked && champValeur) { elements.push(champValeur.value.trim()); }
        });
      });
      decisions[spec.cle] = { elementsAAjouter: elements };

    } else if (spec.type === 'liste-objets') {
      var elementsObjets = [];
      ['nouveaux', 'doublonsProbables'].forEach(function (groupe) {
        (res[groupe] || []).forEach(function (_, i) {
          var idBase = 'val_' + spec.cle + '_' + groupe + '_' + i;
          var caseACocher = document.getElementById(idBase + '_case');
          if (!caseACocher || !caseACocher.checked) { return; }
          var e = {};
          spec.champs.forEach(function (champ) {
            var champInput = document.getElementById(idBase + '_' + champ.nom);
            var val = champInput ? champInput.value : '';
            e[champ.nom] = (champ.type === 'liste') ? val.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : val;
          });
          elementsObjets.push(e);
        });
      });
      decisions[spec.cle] = { elementsAAjouter: elementsObjets };

    } else if (spec.type === 'objet') {
      var champsAAppliquer = {};
      (res.nouveaux || []).forEach(function (n) {
        var idBase = 'val_' + spec.cle + '_nouveauChamp_' + n.champ;
        var caseACocher = document.getElementById(idBase + '_case');
        if (!caseACocher || !caseACocher.checked) { return; }
        var champDef = spec.champs.filter(function (c) { return c.nom === n.champ; })[0];
        var champValeur = document.getElementById(idBase + '_valeur');
        var brut = champValeur ? champValeur.value : '';
        if (champDef && champDef.type === 'booleen') { champsAAppliquer[n.champ] = (brut === 'true'); }
        else if (champDef && champDef.type === 'liste') { champsAAppliquer[n.champ] = brut.split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
        else { champsAAppliquer[n.champ] = brut; }
      });
      (res.conflits || []).forEach(function (c) {
        var idBase = 'val_' + spec.cle + '_conflit_' + c.champ;
        var choixRemplacer = document.getElementById(idBase + '_remplacer');
        if (choixRemplacer && choixRemplacer.checked) { champsAAppliquer[c.champ] = c.valeurProposee; }
        // Sinon ("garder"), on n'ajoute rien : la valeur existante reste inchangee.
      });
      decisions[spec.cle] = { champsAAppliquer: champsAAppliquer };

    } else if (spec.type === 'objet-de-listes-textes') {
      var sousDecisions = {};
      spec.champs.forEach(function (sousChamp) {
        var sousRes = res[sousChamp];
        var elementsSous = [];
        if (sousRes) {
          ['nouveaux', 'doublonsProbables'].forEach(function (groupe) {
            (sousRes[groupe] || []).forEach(function (_, i) {
              var idBase = 'val_competences_' + sousChamp + '_' + groupe + '_' + i;
              var caseACocher = document.getElementById(idBase + '_case');
              var champValeur = document.getElementById(idBase + '_valeur');
              if (caseACocher && caseACocher.checked && champValeur) { elementsSous.push(champValeur.value.trim()); }
            });
          });
        }
        sousDecisions[sousChamp] = { elementsAAjouter: elementsSous };
      });
      decisions[spec.cle] = sousDecisions;
    }
  });

  return decisions;
}

// Orchestre l'ouverture de l'ecran de validation : lit dossier.imports.courant,
// calcule la comparaison, affiche l'ecran, et relie le bouton "Valider" a la
// lecture des decisions -- PAS ENCORE a une fusion reelle (Tache 8).
// ============================================================
// TACHE 8 (moteur d'import, fusion) : conforme a
// docs/ARCHITECTURE_MOTEUR_IMPORT.md, §7. N'applique QUE ce qui a ete
// explicitement decide (voir lireDecisionsValidationImport(), Tache 7) --
// jamais de deduction, jamais d'ecrasement, jamais de suppression
// automatique. Entierement pilotee par la specification : ne connait
// aucun nom de categorie en dur (le cas particulier "competences", dont la
// forme dans dossier ne correspond pas exactement au schema d'import --
// voir plus bas -- reste la seule exception assumee et commentee).
//
// Retourne { dossier, resume } : le resume (ce qui a ete reellement
// ajoute/modifie) prepare le terrain pour une future historisation
// (§12 du document d'architecture), sans qu'elle soit construite ici.
// ============================================================
function fusionnerDonnees(dossierCible, decisionsUtilisateur, specification) {
  var resume = {};

  specification.forEach(function (spec) {
    var decision = decisionsUtilisateur[spec.cle];
    if (!decision) { return; }

    if (spec.type === 'liste-textes') {
      if (!Array.isArray(dossierCible[spec.cle])) { dossierCible[spec.cle] = []; }
      var ajoutesTextes = [];
      (decision.elementsAAjouter || []).forEach(function (texte) {
        if (texte && !texteExisteDeja(dossierCible[spec.cle], texte)) {
          dossierCible[spec.cle].push(texte);
          ajoutesTextes.push(texte);
        }
      });
      resume[spec.cle] = { ajoutes: ajoutesTextes };

    } else if (spec.type === 'liste-objets') {
      if (!Array.isArray(dossierCible[spec.cle])) { dossierCible[spec.cle] = []; }
      var ajoutesObjets = [];
      (decision.elementsAAjouter || []).forEach(function (item) {
        var itemPourDossier = {};
        spec.champs.forEach(function (champ) {
          var v = item[champ.nom];
          itemPourDossier[champ.nom] = (typeof champ.transformationVersDossier === 'function')
            ? champ.transformationVersDossier(v) : v;
        });
        dossierCible[spec.cle].push(itemPourDossier);
        ajoutesObjets.push(itemPourDossier);
      });
      resume[spec.cle] = { ajoutes: ajoutesObjets };

    } else if (spec.type === 'objet') {
      if (!dossierCible[spec.cle] || typeof dossierCible[spec.cle] !== 'object') { dossierCible[spec.cle] = {}; }
      var champsAppliques = {};
      var champsAAppliquer = decision.champsAAppliquer || {};
      Object.keys(champsAAppliquer).forEach(function (champNom) {
        dossierCible[spec.cle][champNom] = champsAAppliquer[champNom];
        champsAppliques[champNom] = champsAAppliquer[champNom];
      });
      resume[spec.cle] = { champsAppliques: champsAppliques };

    } else if (spec.type === 'objet-de-listes-textes' && spec.cle === 'competences') {
      // TACHE 8 (cas particulier assume) : dossier n'a pas de champ
      // "competences" structure en {savoirFaire, savoirEtre, savoirs} --
      // il a deux champs plats, dossier.competencesCV (savoir-faire ET
      // savoir-etre reunis) et dossier.savoirsCV, alimentes historiquement
      // par l'ancienne analyse rapide (appliquerAnalyseCV(), Tache 9 a
      // venir). On fusionne donc vers ces memes champs, pour que les
      // competences importees soient reellement prises en compte par
      // deduireCompetences() (deja lu ces deux champs).
      if (!Array.isArray(dossierCible.competencesCV)) { dossierCible.competencesCV = []; }
      if (!Array.isArray(dossierCible.savoirsCV)) { dossierCible.savoirsCV = []; }
      // TACHE (retour utilisateur : aucun savoir-être identifié) : champ
      // dedie, en plus de competencesCV (toujours alimente pour ne rien
      // casser cote export) -- seul moyen de RETROUVER quels elements de
      // competencesCV sont des savoir-etre une fois fusionnes, puisque
      // competencesCV les reunit tous a plat avec les savoir-faire.
      if (!Array.isArray(dossierCible.savoirEtreCV)) { dossierCible.savoirEtreCV = []; }
      var ajoutesCompetences = { savoirFaire: [], savoirEtre: [], savoirs: [] };
      ['savoirFaire', 'savoirEtre'].forEach(function (sousChamp) {
        var d = decision[sousChamp] || { elementsAAjouter: [] };
        (d.elementsAAjouter || []).forEach(function (texte) {
          if (texte && !texteExisteDeja(dossierCible.competencesCV, texte)) {
            dossierCible.competencesCV.push(texte);
            ajoutesCompetences[sousChamp].push(texte);
            if (sousChamp === 'savoirEtre') { dossierCible.savoirEtreCV.push(texte); }
          }
        });
      });
      var dSavoirs = decision.savoirs || { elementsAAjouter: [] };
      (dSavoirs.elementsAAjouter || []).forEach(function (texte) {
        if (texte && !texteExisteDeja(dossierCible.savoirsCV, texte)) {
          dossierCible.savoirsCV.push(texte);
          ajoutesCompetences.savoirs.push(texte);
        }
      });
      resume[spec.cle] = ajoutesCompetences;
    }
  });

  return { dossier: dossierCible, resume: resume };
}

// ============================================================
// TACHE 9 (moteur d'import, resume des operations) : conforme a
// docs/ARCHITECTURE_MOTEUR_IMPORT.md, §12. Transforme le "resume" retourne
// par fusionnerDonnees() (deja structure, voir Tache 8) en quelques lignes
// lisibles pour la personne -- purement presentationnel, ne modifie jamais
// dossier, ne relit jamais le DOM. Les libelles ci-dessous sont les seules
// exceptions "categorie en dur" de tout le moteur d'import, et c'est
// assume : ils ne servent qu'a l'affichage, jamais a la logique de
// comparaison/validation/fusion elle-meme (deja entierement generiques).
// ============================================================
var LIBELLES_RESUME_IMPORT = {
  experiences: { singulier: 'expérience ajoutée', pluriel: 'expériences ajoutées' },
  formations: { singulier: 'formation ajoutée', pluriel: 'formations ajoutées' },
  langues: { singulier: 'langue ajoutée', pluriel: 'langues ajoutées' },
  certifications: { singulier: 'certification ajoutée', pluriel: 'certifications ajoutées' },
  logiciels: { singulier: 'logiciel ajouté', pluriel: 'logiciels ajoutés' },
  loisirs: { singulier: 'loisir ajouté', pluriel: 'loisirs ajoutés' },
  engagements: { singulier: 'engagement ajouté', pluriel: 'engagements ajoutés' },
  informationsNonClassees: { singulier: 'information complémentaire ajoutée', pluriel: 'informations complémentaires ajoutées' }
};

var LIBELLES_CHAMPS_IMPORT = {
  'identite.civilite': 'Civilité', 'identite.nom': 'Nom', 'identite.prenom': 'Prénom',
  'identite.telephone': 'Téléphone', 'identite.email': 'E-mail', 'identite.adresse': 'Adresse', 'identite.ville': 'Ville',
  'permis.possede': 'Permis de conduire', 'permis.categories': 'Catégories de permis', 'permis.vehicule': 'Véhicule personnel'
};

function libelleChampImport(categorie, champ) {
  return LIBELLES_CHAMPS_IMPORT[categorie + '.' + champ] ||
    (champ.charAt(0).toUpperCase() + champ.slice(1));
}

// Produit une liste de lignes lisibles (tableau de chaines), a partir du
// "resume" structure retourne par fusionnerDonnees(). Entierement pilotee
// par la specification pour l'ORDRE et la PRESENCE des categories -- seuls
// les libelles ci-dessus sont fixes par categorie/champ.
function genererResumeFusionImport(resultatFusion, specification) {
  var lignes = [];
  var resume = (resultatFusion && resultatFusion.resume) || {};

  specification.forEach(function (spec) {
    var r = resume[spec.cle];
    if (!r) { return; }

    if (spec.type === 'liste-textes' || spec.type === 'liste-objets') {
      var n = (r.ajoutes || []).length;
      if (n > 0) {
        var lib = LIBELLES_RESUME_IMPORT[spec.cle] || { singulier: spec.cle, pluriel: spec.cle };
        lignes.push('✅ ' + n + ' ' + (n === 1 ? lib.singulier : lib.pluriel));
      }

    } else if (spec.type === 'objet') {
      Object.keys(r.champsAppliques || {}).forEach(function (champNom) {
        lignes.push('✅ ' + libelleChampImport(spec.cle, champNom) + ' renseigné');
      });

    } else if (spec.type === 'objet-de-listes-textes') {
      var total = 0;
      Object.keys(r).forEach(function (sc) { total += (r[sc] || []).length; });
      if (total > 0) { lignes.push('✅ ' + total + ' compétence' + (total > 1 ? 's' : '') + ' ajoutée' + (total > 1 ? 's' : '')); }
    }
  });

  return lignes;
}

// TACHE (retour automatique au parcours) : "onImportTermine" est un
// callback OPTIONNEL, appele une fois la fusion validee ET la fenetre de
// resume fermee (automatiquement apres une courte temporisation, ou
// immediatement si la personne clique). Cette fonction (generique,
// ne connait rien de ouvrirFenetreCV() ni d'etapeSuivante()) ne fait que
// prevenir l'appelant que le processus est termine -- c'est a l'appelant
// de decider ce que "reprendre le parcours" signifie dans son contexte
// (ex. metiers.js passe etapeSuivante(), qui ferme sa propre fenetre et
// navigue vers l'etape suivante).
// ============================================================
// MOTEUR DE DECISION DE CANDIDATURE (Tache 3, coeur generique)
// ------------------------------------------------------------
// Conforme a docs/ARCHITECTURE_MOTEUR_DECISION_CANDIDATURE.md. Ce moteur
// ne connait AUCUN support de candidature (jamais le mot "CV") -- il ne
// fait que selectionner, ordonner et masquer, a partir de ce qui existe
// deja dans dossier et des recommandations deja produites par l'IA.
//
// Reutilise deux fonctions deja construites pour le moteur d'import,
// jamais dupliquees :
// - normaliserPourComparaison() : comparaison de texte insensible a la
//   casse/aux espaces (categories 'liste-textes')
// - estDoublonProbable() : rapprochement flou sur les champs declares dans
//   "champsRapprochement" de SPECIFICATION_IMPORT (categories 'liste-objets')
//
// IMPORTANT (Tache 3, construction et tests via donnees synthetiques
// uniquement) : ce moteur ne sait pas, et n'a pas besoin de savoir, que
// "competence" ou "poste"/"entreprise" sont les noms de champs utilises
// par le prompt CV V2. Il attend une forme deja normalisee en entree :
// - pour une categorie 'liste-textes' : [{ texte: "...", justification: "..." }]
// - pour une categorie 'liste-objets' : [{ ...memes champs que champsRapprochement, justification: "..." }]
// La traduction depuis la forme brute de dossier.ia.cv.recommandations
// (avec ses noms de champs propres au CV) est une responsabilite du CV
// (Tache 4), jamais de ce moteur.
// ============================================================

// La rubrique "cle" (ex. 'experiences') est-elle explicitement demandee
// comme masquable par l'IA ? Recherche insensible a la casse, sur le nom
// de rubrique tel qu'ecrit par l'IA (dossier.ia.cv.recommandations.rubriquesMasquables).
function rubriqueEstMasquee(rubriquesMasquables, nomCategorie) {
  var cible = normaliserPourComparaison(nomCategorie);
  return (rubriquesMasquables || []).some(function (r) { return normaliserPourComparaison(r.rubrique) === cible; });
}
function explicationMasquageRubrique(rubriquesMasquables, nomCategorie) {
  var cible = normaliserPourComparaison(nomCategorie);
  var trouve = (rubriquesMasquables || []).filter(function (r) { return normaliserPourComparaison(r.rubrique) === cible; })[0];
  return trouve ? trouve.justification : '';
}

// Decision pour une categorie de type 'liste-textes' (ex. competences,
// certifications, logiciels, loisirs, engagements, langues si traitees
// comme telles). Classe (recommandes d'abord, dans l'ordre de l'IA, puis
// le reste du dossier), deduplique, plafonne -- chaque element, retenu ou
// exclu, porte une explication (§7 de l'architecture).
function deciderListeTextes(elementsDossier, recommandations, capacite) {
  var elementsOrdonnes = [];
  var dejaTraites = [];

  (recommandations || []).forEach(function (reco) {
    var texteReco = normaliserPourComparaison(reco.texte);
    if (!texteReco) { return; }
    var correspondance = (elementsDossier || []).filter(function (e) {
      return normaliserPourComparaison(e) === texteReco && dejaTraites.indexOf(normaliserPourComparaison(e)) === -1;
    })[0];
    if (correspondance !== undefined) {
      elementsOrdonnes.push({ element: correspondance, explication: reco.justification || 'Recommandé par l\'assistant IA.' });
      dejaTraites.push(normaliserPourComparaison(correspondance));
    }
  });

  (elementsDossier || []).forEach(function (e) {
    var norm = normaliserPourComparaison(e);
    if (dejaTraites.indexOf(norm) === -1) {
      elementsOrdonnes.push({ element: e, explication: 'Présent dans votre dossier, aucune recommandation spécifique de l\'IA.' });
      dejaTraites.push(norm);
    }
  });

  var capaciteEffective = (typeof capacite === 'number') ? capacite : elementsOrdonnes.length;
  var elementsRetenus = elementsOrdonnes.slice(0, capaciteEffective);
  var elementsExclus = elementsOrdonnes.slice(capaciteEffective).map(function (e) {
    return { element: e.element, explication: 'Non retenu par manque de place (capacité atteinte pour cette rubrique).' };
  });

  return { elementsRetenus: elementsRetenus, elementsExclus: elementsExclus };
}

// Meme principe pour une categorie de type 'liste-objets' (ex.
// experiences, formations, langues) -- le rapprochement recommandation
// <-> element du dossier se fait via estDoublonProbable() et
// champsRapprochement, pas via une egalite de texte simple.
function deciderListeObjets(elementsDossier, recommandations, champsRapprochement, capacite) {
  var elementsOrdonnes = [];
  var indicesTraites = [];

  (recommandations || []).forEach(function (reco) {
    var indexTrouve = -1;
    (elementsDossier || []).forEach(function (e, i) {
      if (indexTrouve === -1 && indicesTraites.indexOf(i) === -1 && estDoublonProbable(e, reco, champsRapprochement)) {
        indexTrouve = i;
      }
    });
    if (indexTrouve !== -1) {
      elementsOrdonnes.push({ element: elementsDossier[indexTrouve], explication: reco.justification || 'Recommandé par l\'assistant IA.' });
      indicesTraites.push(indexTrouve);
    }
  });

  (elementsDossier || []).forEach(function (e, i) {
    if (indicesTraites.indexOf(i) === -1) {
      elementsOrdonnes.push({ element: e, explication: 'Présent dans votre dossier, aucune recommandation spécifique de l\'IA.' });
      indicesTraites.push(i);
    }
  });

  var capaciteEffective = (typeof capacite === 'number') ? capacite : elementsOrdonnes.length;
  var elementsRetenus = elementsOrdonnes.slice(0, capaciteEffective);
  var elementsExclus = elementsOrdonnes.slice(capaciteEffective).map(function (e) {
    return { element: e.element, explication: 'Non retenu par manque de place (capacité atteinte pour cette rubrique).' };
  });

  return { elementsRetenus: elementsRetenus, elementsExclus: elementsExclus };
}

// Point d'entree unique du moteur (interface publique, §12 de l'architecture).
// Fonction PURE : ne modifie jamais dossier, ne lit jamais le DOM, aucun
// effet de bord. Ignore silencieusement toute categorie de
// specificationCategories qui ne serait pas 'liste-textes' ou
// 'liste-objets' (identite, permis, competences en tant
// qu'objet-de-listes-textes... restent hors perimetre, §9 de l'architecture).
function decider(dossier, recommandationsParCategorie, capacites, specificationCategories) {
  var recos = recommandationsParCategorie || {};
  var rubriquesMasquables = recos.rubriquesMasquables || [];
  var resultat = {};

  (specificationCategories || []).forEach(function (spec) {
    if (spec.type !== 'liste-textes' && spec.type !== 'liste-objets') { return; }

    var elementsDossier = (dossier && dossier[spec.cle]) || [];
    var recommandationsCategorie = recos[spec.cle] || [];
    var capaciteCategorie = capacites ? capacites[spec.cle] : undefined;

    var decision = (spec.type === 'liste-textes')
      ? deciderListeTextes(elementsDossier, recommandationsCategorie, capaciteCategorie)
      : deciderListeObjets(elementsDossier, recommandationsCategorie, spec.champsRapprochement, capaciteCategorie);

    decision.rubriqueMasquee = rubriqueEstMasquee(rubriquesMasquables, spec.cle);
    decision.explicationMasquage = decision.rubriqueMasquee ? explicationMasquageRubrique(rubriquesMasquables, spec.cle) : '';

    resultat[spec.cle] = decision;
  });

  return resultat;
}

// ============================================================
// INTEGRATION CV DU MOTEUR DE DECISION (Tache 4)
// ------------------------------------------------------------
// Tout ce qui suit est volontairement CV-specifique (§9 de l'architecture) :
// decider() lui-meme, ci-dessus, ne connait toujours pas le mot "CV". Cette
// couche fait deux choses que le moteur generique ne doit jamais faire :
// 1. Traduire dossier.ia.cv.recommandations (noms de champs propres au
//    prompt CV : "competence", "poste"/"entreprise", "rubrique") vers la
//    forme generique attendue par decider() ({texte, justification} ou
//    {...champsRapprochement, justification}).
// 2. Traiter le cas particulier des competences (savoirFaire/savoirEtre/
//    savoirs), qui n'est pas une simple 'liste-textes' mais un objet de
//    3 listes -- non gere par decider() (hors perimetre, §9). La capacite
//    du modele pour "competences" est traitee comme un budget PARTAGE
//    entre les 3 sous-categories, pas un plafond independant par
//    sous-categorie (sinon "6 competences" pourrait afficher jusqu'a 18
//    elements au total).
// ============================================================

// TACHE (retour utilisateur : plafond de competences) : remplace
// appliquerDecisionCompetences() (budget PARTAGE entre les 3 sous-listes,
// et actif seulement si l'IA a donne des recommandations). Nouvelle regle
// explicite : 5 maximum PAR categorie (savoirFaire/savoirEtre/savoirs),
// TOUJOURS applique -- avec ou sans recommandation IA. Ordre de priorite :
// 1) recommandations de l'IA (deja au fait du metier vise) ; 2) a defaut,
// les competences presentes dans REFERENTIEL_METIERS_ERIP pour le metier
// cible (deja existant, aucune donnee inventee) ; 3) le reste, dans l'ordre
// du dossier. Les competences non retenues ne sont pas perdues : elles
// restent dans dossier et continuent d'alimenter texteProfil() (donc l'IA
// et la lettre de motivation), seule la rubrique "Competences" du CV rendu
// est plafonnee.
function classerCompetencesParPertinence(competencesObjetCV, recommandationsCompetences, metierCible, plafondParCategorie) {
  // TACHE (chantier langue francaise, tolerance accent/sans-accent) :
  // motsEquivalentsSansAccentERIP() (data/toleranceOrthographiqueERIP.js)
  // remplace une comparaison stricte (m.nom === metierCible) -- evite une
  // correspondance manquee si l'un des deux cote est accentue et l'autre
  // pas encore mis a jour.
  var metierRef = (REFERENTIEL_METIERS_ERIP || []).filter(function (m) { return motsEquivalentsSansAccentERIP(m.nom, metierCible); })[0] || null;

  function ordonnerCategorie(sousCle) {
    var elements = (competencesObjetCV[sousCle] || []).slice();
    var dejaTraites = [];
    var ordonnes = [];

    (recommandationsCompetences || []).forEach(function (reco) {
      var texteReco = normaliserPourComparaison(reco.texte);
      if (!texteReco) { return; }
      var trouve = elements.filter(function (e) {
        return normaliserPourComparaison(e) === texteReco && dejaTraites.indexOf(normaliserPourComparaison(e)) === -1;
      })[0];
      if (trouve !== undefined) { ordonnes.push(trouve); dejaTraites.push(normaliserPourComparaison(trouve)); }
    });

    if (metierRef && metierRef[sousCle]) {
      var referentielNorm = metierRef[sousCle].map(normaliserPourComparaison);
      elements.forEach(function (e) {
        var norm = normaliserPourComparaison(e);
        if (dejaTraites.indexOf(norm) === -1 && referentielNorm.indexOf(norm) !== -1) {
          ordonnes.push(e); dejaTraites.push(norm);
        }
      });
    }

    elements.forEach(function (e) {
      var norm = normaliserPourComparaison(e);
      if (dejaTraites.indexOf(norm) === -1) { ordonnes.push(e); dejaTraites.push(norm); }
    });

    return ordonnes.slice(0, plafondParCategorie);
  }

  return {
    savoirFaire: ordonnerCategorie('savoirFaire'),
    savoirEtre: ordonnerCategorie('savoirEtre'),
    savoirs: ordonnerCategorie('savoirs')
  };
}

// TACHE (retour utilisateur : une seule categorie "Compétences
// professionnelles", plafond uniforme a 5, tous les modeles sauf Chic) :
// meme principe que classerCompetencesParPertinence() ci-dessus
// (recommandations IA en priorite, puis referentiel du metier vise, puis
// le reste), mais sur un SEUL pool fusionne (savoirFaire+savoirEtre+savoirs)
// au lieu de 3 plafonds separes. Resultat entierement place dans
// savoirFaire (savoirEtre/savoirs vides) : tous les generateurs de CV
// existants concatenent deja les 3 champs a l'affichage (verifie sur les
// 6 gabarits) -- aucune modification necessaire de leur cote, la fusion
// se fait silencieusement en amont.
function unifierEtPlafonnerCompetences(competencesObjetCV, recommandationsCompetences, metierCible, plafondTotal) {
  var metierRef = (REFERENTIEL_METIERS_ERIP || []).filter(function (m) { return motsEquivalentsSansAccentERIP(m.nom, metierCible); })[0] || null;
  var pool = []
    .concat((competencesObjetCV && competencesObjetCV.savoirFaire) || [])
    .concat((competencesObjetCV && competencesObjetCV.savoirEtre) || [])
    .concat((competencesObjetCV && competencesObjetCV.savoirs) || []);

  var dejaTraites = [];
  var ordonnes = [];

  (recommandationsCompetences || []).forEach(function (reco) {
    var texteReco = normaliserPourComparaison(reco.texte);
    if (!texteReco) { return; }
    var trouve = pool.filter(function (e) {
      return normaliserPourComparaison(e) === texteReco && dejaTraites.indexOf(normaliserPourComparaison(e)) === -1;
    })[0];
    if (trouve !== undefined) { ordonnes.push(trouve); dejaTraites.push(normaliserPourComparaison(trouve)); }
  });

  if (metierRef) {
    var referentielNorm = []
      .concat(metierRef.savoirFaire || [])
      .concat(metierRef.savoirEtre || [])
      .concat(metierRef.savoirs || [])
      .map(normaliserPourComparaison);
    pool.forEach(function (e) {
      var norm = normaliserPourComparaison(e);
      if (dejaTraites.indexOf(norm) === -1 && referentielNorm.indexOf(norm) !== -1) {
        ordonnes.push(e); dejaTraites.push(norm);
      }
    });
  }

  pool.forEach(function (e) {
    var norm = normaliserPourComparaison(e);
    if (dejaTraites.indexOf(norm) === -1) { ordonnes.push(e); dejaTraites.push(norm); }
  });

  return { savoirFaire: ordonnes.slice(0, plafondTotal), savoirEtre: [], savoirs: [] };
}

// TACHE 4 : point d'entree CV-specifique. Prend l'objet CV DEJA normalise
// (normaliserDonneesCV(dossier)) et retourne un NOUVEL objet, pret pour
// rendreTemplate() -- ne modifie jamais l'objet recu en entree (copie
// defensive), conforme au principe de fonction pure deja suivi partout
// ailleurs dans ce moteur.
// TACHE (ajustement : moteur conditionnel, pas systematique) : distingue
// "l'objet recommandations existe" (toujours vrai, il est scaffolde des
// la creation du dossier -- voir creerDossierIAVide()) de "l'IA a
// reellement produit quelque chose d'exploitable". Seul ce second cas doit
// declencher le moteur de decision -- sinon, le comportement historique
// (tout afficher, aucune selection automatique) doit rester inchange.
function recommandationsIAPresentes(recommandations) {
  if (!recommandations) { return false; }
  return !!(recommandations.typeCV && recommandations.typeCV.valeur) ||
    (recommandations.experiencesAMettreEnAvant || []).length > 0 ||
    (recommandations.competencesAValoriser || []).length > 0 ||
    (recommandations.rubriquesMasquables || []).length > 0;
}

// ============================================================
// TACHE (correction regression : moteur de decision IA jamais rebranche
// apres le passage au tout-DOCX) : appliquerMoteurDecisionCV() et
// classerCompetencesParPertinence() existaient deja et fonctionnent
// toujours -- mais plus personne ne les appelait depuis que l'ancien
// apercu HTML (qui les invoquait) a ete remplace par le systeme DOCX
// natif. Consequence concrete avant ce correctif : les recommandations
// de l'IA (experiences/competences a mettre en avant selon le metier
// vise) etaient calculees mais jamais appliquees au CV genere.
//
// Point d'entree UNIQUE, reutilise par les 3 endroits qui produisent un
// CV (apercu integre, telechargement Word, texte a copier) -- pour ne
// jamais dupliquer cette logique et garantir qu'un changement futur ne
// beneficie qu'a un seul des trois par erreur.
//
// Retourne une Promise (obtenirMetaModeleType est asynchrone, va
// chercher les "capacites" du modele) ; en cas d'echec (modele
// introuvable, etc.), repli honnete sur le CV complet, sans decision IA
// -- jamais de blocage de l'export pour cette raison.
// ============================================================
function construireObjetCVPourExport(modeleId) {
  var objetCV = normaliserDonneesCV(dossier);
  return obtenirMetaModeleType('cv', modeleId).then(function (meta) {
    // TACHE (retour utilisateur : "le contenu doit être identique pour
    // tous les modèles, juste la forme qui change") : CAPACITES_A4_DETAILLE_CV
    // (formatA5CV.js), commune a tous les modeles, remplace la lecture de
    // meta.capacites (qui avait fini par diverger d'un modele a l'autre).
    var capacites = (typeof CAPACITES_A4_DETAILLE_CV !== 'undefined') ? CAPACITES_A4_DETAILLE_CV : ((meta && meta.capacites) || {});
    var recommandationsIACV = (dossier.ia && dossier.ia.cv && dossier.ia.cv.recommandations) || {};

    // TACHE (retour utilisateur : "le diplome le plus eleve montre le
    // niveau d'education, meme sans lien direct avec le metier vise --
    // important pour les competences transferables/la reconversion") :
    // trie les formations par rang RNCP decroissant AVANT le moteur de
    // decision (voir _dnTrierFormationsParNiveauDecroissant(),
    // formatA5CV.js) -- utile des qu'un modele plafonne les formations a
    // moins que le nombre reel dans le dossier. Sans effet si l'IA
    // recommande explicitement une formation precise.
    var objetCVPourDecision = objetCV;
    if (typeof _dnTrierFormationsParNiveauDecroissant === 'function') {
      objetCVPourDecision = {};
      Object.keys(objetCV).forEach(function (cle) { objetCVPourDecision[cle] = objetCV[cle]; });
      objetCVPourDecision.formations = _dnTrierFormationsParNiveauDecroissant(objetCV.formations);
    }

    var objetDecide = recommandationsIAPresentes(recommandationsIACV)
      ? appliquerMoteurDecisionCV(objetCVPourDecision, recommandationsIACV, capacites)
      : objetCV;

    // TACHE (retour utilisateur : "Compétences professionnelles" unifiee,
    // plafond uniforme a 5, tous les modeles sauf Chic) : Chic garde
    // volontairement son ancien comportement (categories separees) --
    // exclusion explicite demandee, pas un oubli.
    var recoCompetences = (recommandationsIACV.competencesAValoriser || []).map(function (c) {
      return { texte: c.competence, justification: c.justification };
    });
    var objetFinal = {};
    Object.keys(objetDecide).forEach(function (cle) { objetFinal[cle] = objetDecide[cle]; });
    if (modeleId === 'chic') {
      var plafondCompetences = capacites.competences || 5;
      objetFinal.competences = classerCompetencesParPertinence(objetDecide.competences, recoCompetences, dossier.metierCible, plafondCompetences);
    } else {
      objetFinal.competences = unifierEtPlafonnerCompetences(objetDecide.competences, recoCompetences, dossier.metierCible, 5);
    }

    return objetFinal;
  }).catch(function () {
    return objetCV;
  });
}

function appliquerMoteurDecisionCV(objetCV, recommandationsIA, capacitesModele) {
  var reco = recommandationsIA || {};
  var capacites = capacitesModele || {};

  // Traduction des recommandations brutes du CV vers la forme generique.
  var rubriquesMasquables = reco.rubriquesMasquables || [];
  var recommandationsGenerique = {
    experiences: (reco.experiencesAMettreEnAvant || []).map(function (r) {
      return { poste: r.poste, entreprise: r.entreprise, justification: r.justification };
    }),
    rubriquesMasquables: rubriquesMasquables
  };

  // TACHE (aucune anticipation artificielle) : le prompt CV V2 ne produit
  // aujourd'hui de recommandations que pour experiences et competences.
  // formations/langues/certifications/loisirs/engagements passent donc par
  // decider() avec une liste de recommandations vide -- repli honnete
  // (§5 de l'architecture), pas une erreur.
  var specification = [
    { cle: 'experiences', type: 'liste-objets', champsRapprochement: ['poste', 'entreprise'] },
    { cle: 'formations', type: 'liste-objets', champsRapprochement: ['intitule', 'annee'] },
    { cle: 'langues', type: 'liste-objets', champsRapprochement: ['langue'] },
    { cle: 'certifications', type: 'liste-textes' },
    { cle: 'loisirs', type: 'liste-textes' },
    { cle: 'engagements', type: 'liste-textes' }
  ];

  var decisions = decider(objetCV, recommandationsGenerique, capacites, specification);

  // TACHE (retour utilisateur : langues disparaissant du CV alors que
  // saisies) : cause identifiee -- rubriquesMasquables (recommandation IA)
  // pouvait vider entierement "langues" pour une candidature jugee sans
  // rapport, sans aucune trace visible pour la personne. Une langue est
  // une information quasiment toujours valorisable (jamais un handicap) :
  // elle n'est desormais plus jamais masquable par ce moteur, quoi que
  // l'IA recommande -- seul le plafond normal (capacites.langues) continue
  // de s'appliquer, comme pour toute autre rubrique.
  if (decisions.langues) { decisions.langues.rubriqueMasquee = false; }

  // Copie defensive : objetCV (deja normalise) n'est jamais modifie.
  var objetDecide = {};
  Object.keys(objetCV).forEach(function (cle) { objetDecide[cle] = objetCV[cle]; });

  specification.forEach(function (spec) {
    var d = decisions[spec.cle];
    if (!d) { return; }
    objetDecide[spec.cle] = d.rubriqueMasquee ? [] : d.elementsRetenus.map(function (e) { return e.element; });
  });

  // TACHE (retour utilisateur : plafond de competences) : n'est plus geree
  // ici -- deplacee vers classerCompetencesParPertinence(), appliquee
  // SYSTEMATIQUEMENT (avec ou sans recommandation IA) aux points d'appel
  // (chargerApercuCVInline/chargerEtAfficherApercuCV), contrairement au
  // reste de cette fonction qui reste conditionne a recommandationsIAPresentes().
  // On respecte neanmoins ici le masquage explicite de la rubrique par l'IA,
  // s'il existe.
  if (rubriqueEstMasquee(rubriquesMasquables, 'competences')) {
    objetDecide.competences = { savoirFaire: [], savoirEtre: [], savoirs: [] };
  }

  // TACHE (retour utilisateur : vide/sommaire/trop long/bavard, pas
  // seulement vide) : pour chaque experience retenue, si l'IA a produit une
  // proposition de missions (cv.md, point 6 -- rapprochee par
  // poste/entreprise, meme mecanisme que experiencesAMettreEnAvant), on
  // l'utilise TOUJOURS a la place du texte brut du dossier : c'est l'IA qui
  // decide, au moment de l'analyse, si une experience merite d'etre
  // completee (vide/sommaire) ou condensee (trop longue) -- le code ne
  // fait aucune supposition sur la longueur ici, il applique simplement ce
  // que l'IA a juge utile de proposer. Si l'IA n'a rien propose pour une
  // experience (deja bien ecrite et concise), le texte du dossier reste
  // inchange. Le dossier lui-meme (page Action) n'est JAMAIS modifie :
  // seul le CV Word genere reflete la proposition, toujours modifiable
  // ensuite par la personne.
  var savoirFaireParExperience = reco.savoirFaireParExperience || [];
  if (savoirFaireParExperience.length && objetDecide.experiences && objetDecide.experiences.length) {
    objetDecide.experiences = objetDecide.experiences.map(function (e) {
      var propose = savoirFaireParExperience.filter(function (s) {
        return estDoublonProbable(e, s, ['poste', 'entreprise']);
      })[0];
      if (!propose || !propose.missions || !propose.missions.length) { return e; }
      var copie = {};
      Object.keys(e).forEach(function (k) { copie[k] = e[k]; });
      copie.missions = propose.missions.join('. ') + '.';
      return copie;
    });
  }

  return objetDecide;
}

// TACHE (migration Design System, chantier "Fenetre ERIP", 7e et derniere
// migration d'app.js) : devient une recette qui appelle la primitive
// ouvrirFenetreERIP() -- DEUX FOIS, l'une apres l'autre, plutot que de
// faire evoluer la primitive pour gerer plusieurs "etats" d'une meme
// fenetre (choix architectural valide : le resume final est une SECONDE
// fenetre, pas un second etat de la premiere -- chaque ecran garde sa
// propre identite : titre, contenu, taille, boutons). La regle "une seule
// fenetre a la fois" et le correctif du minuteur de fermeture (3e
// migration) s'appliquent ici sans aucune modification.
//
// POINT DE VIGILANCE, transitoire, A REPRENDRE lors du futur chantier
// "metiers.js" : cette fenetre s'ouvre par-dessus ouvrirAssistantDepotCV()
// (metiers.js, pas encore migree, z-index:2000 comme la primitive) SANS la
// fermer, pour permettre un retour exact via le bouton "Retour". Avant
// cette migration, l'empilement visuel correct etait garanti par un
// z-index strictement superieur (2100 contre 2000). Il repose desormais
// sur l'ORDRE D'AJOUT au DOM (cette fenetre est toujours ajoutee APRES le
// magicien deja ouvert, donc au-dessus a z-index egal) -- correct en
// pratique, mais une garantie implicite plutot qu'explicite. A traiter
// clairement quand le magicien sera lui-meme migre vers cette primitive.
function ouvrirEcranValidationImport(onImportTermine, onRetour) {
  if (!dossier.imports || !dossier.imports.courant) {
    alert('Aucun import en attente de validation.');
    return;
  }
  // TACHE (correction bug : fenetres qui s'assombrissent en boucle) : cet
  // ecran s'ouvre PAR-DESSUS un ecran de collage (etape 4 du wizard,
  // toujours present en dessous depuis l'ajout du bouton Retour) sans le
  // fermer -- neutralise son raccourci Entree tant que CET ecran-ci est
  // au premier plan, pour eviter de redeclencher l'import du dessous a
  // chaque frappe.
  desactiverCollageInstantane();
  var resultatComparaison = comparerDonnees(dossier, dossier.imports.courant.donnees, SPECIFICATION_IMPORT);
  var contenuEcran = genererEcranValidationImport(resultatComparaison, SPECIFICATION_IMPORT);

  ouvrirFenetreERIP({
    titre: 'Vérifiez les informations importées',
    taille: 'large',
    contenuHTML:
      '<p class="text-muted small">Décochez ce que vous ne souhaitez pas ajouter, modifiez librement le texte avant de valider.</p>' +
      contenuEcran +
      '<div class="d-flex justify-content-between align-items-center mt-3">' +
      (typeof onRetour === 'function'
        ? '<button type="button" id="retourValidationImportBtn" class="btn btn-outline-secondary">&#8592; Retour</button>'
        : '<span></span>') +
      '<button type="button" id="validerImportBtn" class="btn btn-primary">Valider ma sélection</button>' +
      '</div>'
  });
  wireOngletsValidationImport();

  // TACHE (retour utilisateur : bouton Retour sur l'ecran de validation) :
  // referme cet ecran et rend la main a l'appelant (ex. reafficher l'etape
  // 2 du wizard, pour corriger le texte avant de reimporter) -- ne
  // consomme PAS l'import en attente (dossier.imports.courant reste
  // inchange, au cas ou la personne reviendrait directement valider).
  var btnRetour = document.getElementById('retourValidationImportBtn');
  if (btnRetour) {
    btnRetour.addEventListener('click', function () {
      fermerFenetreERIP();
      onRetour();
    });
  }

  document.getElementById('validerImportBtn').addEventListener('click', function () {
    var decisions = lireDecisionsValidationImport(resultatComparaison, SPECIFICATION_IMPORT);
    // TACHE 8 (moteur de fusion) : applique REELLEMENT les decisions dans
    // dossier -- premiere fois que ce moteur ecrit dans dossier. L'import
    // en attente est ensuite vide (il a ete consomme), pour eviter de le
    // refusionner par erreur.
    var resultatFusion = fusionnerDonnees(dossier, decisions, SPECIFICATION_IMPORT);
    dossier.imports.courant = null;
    // TACHE 9 (resume des operations) : remplace la confirmation generique
    // par le detail reel de ce qui a ete ajoute/modifie.
    var lignesResume = genererResumeFusionImport(resultatFusion, SPECIFICATION_IMPORT);

    // TACHE (retour automatique au parcours) : la validation est desormais
    // la FIN du processus, pas une etape intermediaire -- fermeture
    // automatique apres une courte lecture du message, ou immediatement si
    // la personne clique sur "Continuer maintenant". "terminer()" ne peut
    // etre appelee qu'une seule fois (garde-fou explicite), pour eviter un
    // double appel du callback (clic + minuteur qui se declenchent tous les
    // deux).
    var dejaTermine = false;
    function terminer() {
      if (dejaTermine) { return; }
      dejaTermine = true;
      clearTimeout(minuteur);
      fermerFenetreERIP();
      if (typeof onImportTermine === 'function') { onImportTermine(); }
    }

    // Seconde fenetre (le resume) : remplace la premiere via la regle "une
    // seule fenetre ERIP a la fois", deja eprouvee sur les migrations
    // precedentes -- pas un second etat de la meme fenetre.
    ouvrirFenetreERIP({
      titre: '&#9989; Informations intégrées',
      contenuHTML:
        '<p class="small mb-2">' + (lignesResume.length
          ? 'Les informations sélectionnées ont été intégrées à votre dossier avec succès. Vous pouvez maintenant poursuivre votre parcours.'
          : 'Aucune information n\'a été ajoutée à votre dossier. Vous pouvez poursuivre votre parcours.') + '</p>' +
        (lignesResume.length
          ? '<div class="mb-3">' + lignesResume.map(function (l) { return '<p class="mb-1 small">' + l + '</p>'; }).join('') + '</div>'
          : '') +
        '<div class="d-flex justify-content-end"><button type="button" id="fermerResumeImportBtn" class="btn btn-primary btn-sm">Continuer maintenant</button></div>'
    });
    document.getElementById('fermerResumeImportBtn').addEventListener('click', terminer);
    var minuteur = setTimeout(terminer, 2500);
  });
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
    // TACHE (retour utilisateur : validation trop stricte) : Entreprise et
    // Lieu sont desormais facultatifs, meme principe que texteProfil().
    var experiencesTxt = donnees.experiences.map(function (e) {
      var lieuEntreprise = [e.entreprise, e.lieu].filter(Boolean).join(', ');
      return e.poste + (lieuEntreprise ? ' - ' + lieuEntreprise : '') + ' : du ' + e.dateDebut + ' au ' + (e.dateFin || 'aujourd\'hui (poste actuel)') + (e.missions ? '. Missions : ' + e.missions : '');
    }).join(' | ');
    var experiencesPersoTxt = donnees.experiencesPersonnelles.map(function (e) {
      return e.intitule + (e.detail ? ' : ' + e.detail : '');
    }).join(' | ');
    var formationTxt = donnees.formations.map(function (f) {
      return f.niveau + (f.intitule ? ' - ' + f.intitule : '') + (f.annee ? ' (' + f.annee + ')' : '');
    }).join(' | ');
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

// TACHE (selecteur en cartes) : cache simple des metadonnees JSON de chaque
// modele (colors, sections...), pour ne pas les re-telecharger a chaque
// changement de modele -- ce sont de petits fichiers statiques qui ne
// changent jamais en cours de session.
var cacheMetaModelesCV = {};

// TACHE (page Action, tache 4) : etat de l'apercu INLINE (accordeon).
// TACHE (retour utilisateur : editeur de mise en page) : taillePct (zoom en
// %, 100 = taille d'origine du modele), police (chaine CSS font-family,
// vide = police d'origine du modele) et formatPage ('A4'/'A5') --
// persistes par type de document, PARTAGES entre le petit apercu (iframe)
// et le grand apercu (popup) : un changement dans l'un se reflete dans
// l'autre a la prochaine (re)ouverture/rafraichissement.
var etatApercuInline = {
  // TACHE (refonte "Aperçu et finalisation" : palette de couleurs) :
  // couleur ajoutee -- null = couleur d'origine du modele (comportement
  // inchange), sinon un id de PALETTES_COULEURS_CV (voir
  // coloriationDocxNatifCV.js).
  // TACHE (format A5) : formatPage (deja present dans cet objet) reutilise
  // tel quel -- 'A4' = format complet (comportement inchange), 'A5' =
  // contenu recadre + page reduite (CV uniquement pour l'instant).
  cv: { modele: null, modeleA5: 'portrait', couleur: null, choisiManuellement: false, taillePct: 100, police: '', formatPage: 'A4' },
  lettre: { modele: null, couleur: null, choisiManuellement: false, taillePct: 100, police: '', formatPage: 'A4' },
  entretien: { modele: null, couleur: null, choisiManuellement: false, taillePct: 100, police: '', formatPage: 'A4' }
};
var POLICES_APERCU_DISPONIBLES = [
  { id: '', nom: 'Police du modèle' },
  { id: 'Arial, Helvetica, sans-serif', nom: 'Arial' },
  { id: 'Georgia, "Times New Roman", serif', nom: 'Georgia' },
  { id: '"Verdana", sans-serif', nom: 'Verdana' },
  { id: '"Courier New", monospace', nom: 'Courier New' }
];

// TACHE (page Action, tache 5) : helpers generiques d'export, reutilisables
// par tout format de document (aucune logique specifique au CV/a la lettre
// ici). Meme technique de copie (avec repli) que celle deja utilisee dans
// les popups existantes (ouvrirAideIA), juste factorisee car desormais
// appelee depuis plusieurs endroits de la page principale.
function copierTexteVersPressePapier(texte, boutonPourFeedback) {
  function feedback() {
    if (!boutonPourFeedback) { return; }
    var t = boutonPourFeedback.textContent;
    boutonPourFeedback.textContent = 'Copié !';
    setTimeout(function () { boutonPourFeedback.textContent = t; }, 2000);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texte).then(feedback).catch(function () {
      var z = document.createElement('textarea');
      z.value = texte;
      document.body.appendChild(z);
      z.select();
      document.execCommand('copy');
      z.remove();
      feedback();
    });
  } else {
    var z2 = document.createElement('textarea');
    z2.value = texte;
    document.body.appendChild(z2);
    z2.select();
    document.execCommand('copy');
    z2.remove();
    feedback();
  }
}

function telechargerFichierTexte(nomFichier, contenu, typeMime) {
  var blob = new Blob([contenu], { type: typeMime || 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

// TACHE (page Action, tache 6, option A validee) : chargement A LA DEMANDE
// de html-docx-js (aucun poids ajoute pour les personnes qui n'exportent
// jamais en DOCX). Mise en cache de la promesse : un seul chargement par
// session, meme si plusieurs exports DOCX sont demandes.
var _promesseLibrairieHtmlDocx = null;
function chargerLibrairieHtmlDocx() {
  if (_promesseLibrairieHtmlDocx) { return _promesseLibrairieHtmlDocx; }
  _promesseLibrairieHtmlDocx = new Promise(function (resolve, reject) {
    if (window.htmlDocx) { resolve(window.htmlDocx); return; }
    var script = document.createElement('script');
    // TACHE (independance reseau, meme traitement que docx.umd.js) :
    // fichier local (modules/cv-editor/html-docx.js), plus de CDN externe.
    // A telecharger une fois depuis https://cdn.jsdelivr.net/npm/html-docx-js/dist/html-docx.js
    // et placer tel quel a ce chemin (voir instructions fournies).
    script.src = 'modules/cv-editor/html-docx.js';
    script.onload = function () { window.htmlDocx ? resolve(window.htmlDocx) : reject(new Error('Librairie DOCX indisponible.')); };
    script.onerror = function () { reject(new Error('Impossible de charger la librairie DOCX.')); };
    document.head.appendChild(script);
  });
  return _promesseLibrairieHtmlDocx;
}

// TACHE (page Action, tache 6) : exporteur DOCX GENERIQUE et reutilisable --
// prend en entree EXACTEMENT le HTML deja produit par rendreTemplate() (la
// meme source que le PDF), jamais relu depuis l'iframe : CV et lettre
// appellent cette meme fonction, aucune logique dupliquee par type de
// document. Un echec (reseau, librairie indisponible...) ne bloque jamais
// l'application : message clair, PDF et Copier restent utilisables.
function exporterDocumentEnDocx(corpsRendu, styleCss, nomFichier, boutonPourFeedback, onReussite) {
  if (!corpsRendu) {
    alert('L\'aperçu est encore en cours de chargement, patientez un instant puis réessayez.');
    return;
  }
  var texteOriginal = boutonPourFeedback ? boutonPourFeedback.textContent : '';
  if (boutonPourFeedback) { boutonPourFeedback.textContent = 'Génération…'; boutonPourFeedback.disabled = true; }
  function restaurerBouton() {
    if (boutonPourFeedback) { boutonPourFeedback.textContent = texteOriginal; boutonPourFeedback.disabled = false; }
  }
  chargerLibrairieHtmlDocx().then(function (htmlDocx) {
    var pageComplete = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + (styleCss || '') + '</style></head><body>' + corpsRendu + '</body></html>';
    var blob = htmlDocx.asBlob(pageComplete);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    restaurerBouton();
    // TACHE (bouton "Merci bien, j'ai fini") : meme logique que le chemin
    // principal (genererBlobDocumentActif) -- ce chemin de secours produit
    // lui aussi un vrai telechargement.
    if (typeof onReussite === 'function') { onReussite(); }
  }).catch(function () {
    alert('Impossible de générer le fichier Word pour le moment. Vous pouvez exporter en PDF ou copier le texte à la place.');
    restaurerBouton();
  });
}

// TACHE (retour utilisateur : "le contenu doit être identique pour tous
// les modèles, juste la forme qui change") : cette fonction recommandait
// un MODELE selon le volume de contenu (capacites qui variaient d'un
// modele a l'autre) -- desormais sans objet, puisque tous les modeles
// partagent le meme jeu de capacites (CAPACITES_A4_DETAILLE_CV). Repli
// neutre (aucune recommandation) plutot que suppression : les appelants
// géraient déjà l'absence de valeur (etatApercuInline.cv.modele || 'moderne').
// Le VRAI levier pour adapter le volume de contenu est desormais le choix
// Essentiel/Détaillé (formatPage), pas le modele.
function choisirModeleRecommandeCV(metasParModele) {
  return null;
}

function chargerApercuCVInline(modele) {
  var zone = document.getElementById('zoneApercuInlineCV');
  if (!zone) { return; }
  // TACHE (retour utilisateur : sélecteur de modèles A5, comme pour A4) :
  // etatApercuInline.cv.modele et .modeleA5 sont desormais deux champs
  // DISTINCTS (le choix A5 ne doit jamais ecraser/deranger le choix A4,
  // et inversement -- exigence explicite : "je ne veux pas que le format
  // A4 soit adapte pour A5"). Stocke dans le bon champ selon le format
  // actuellement actif.
  if (etatApercuInline.cv.formatPage === 'A5') {
    etatApercuInline.cv.modeleA5 = modele;
  } else {
    etatApercuInline.cv.modele = modele;
  }

  // TACHE (page Action, apercu inline reel) : reutilise EXACTEMENT le meme
  // moteur de rendu que "Ouvrir le grand aperçu" (_rafraichirApercuDocx,
  // apercuDocxIntegre.js) -- generalise pour accepter une zone/message
  // differents de ceux du panneau plein ecran. Aucune divergence possible
  // entre l'apercu inline, le grand apercu, et le fichier telecharge.
  // TACHE (refonte "Aperçu et finalisation" : palette de couleurs) :
  // transmet la couleur actuellement choisie (etatApercuInline.cv.couleur,
  // null si aucune -- couleur d'origine du modele dans ce cas).
  // TACHE (format A5) : transmet le format de page actuellement choisi
  // (etatApercuInline.cv.formatPage, 'A4' par defaut -- comportement
  // inchange dans ce cas).
  if (typeof _rafraichirApercuDocx === 'function') {
    _rafraichirApercuDocx('cv', modele, zone, document.getElementById('messageApercuInlineCV'), true, etatApercuInline.cv.couleur, etatApercuInline.cv.formatPage);
  }
}

// TACHE (page Action, tache 4) : equivalent pour la lettre. Pas de moteur de
// decision/capacites pour la lettre (n'existe pas aujourd'hui) -- fidele a
// l'existant, aucune logique inventee.
function chargerApercuLettreInline(modele) {
  var zone = document.getElementById('zoneApercuInlineLettre');
  if (!zone) { return; }
  etatApercuInline.lettre.modele = modele;

  if (typeof _rafraichirApercuDocx === 'function') {
    _rafraichirApercuDocx('lettre', modele, zone, document.getElementById('messageApercuInlineLettre'), true, etatApercuInline.lettre.couleur, etatApercuInline.lettre.formatPage);
  }
}

// TACHE (retour utilisateur : apercu Entretien) : meme principe que
// chargerApercuLettreInline() ci-dessus -- pas de moteur de decision/
// capacites pour l'entretien (n'existe pas, comme pour la lettre),
// reutilise normaliserDonneesEntretien() (nouvelle, meme esprit que
// normaliserDonneesLettre()) + rendreTemplate() (deja generique, aucune
// modification).
function chargerApercuEntretienInline(modele) {
  var zone = document.getElementById('zoneApercuInlineEntretien');
  if (!zone) { return; }
  etatApercuInline.entretien.modele = modele;

  if (typeof _rafraichirApercuDocx === 'function') {
    _rafraichirApercuDocx('entretien', modele, zone, document.getElementById('messageApercuInlineEntretien'), true, etatApercuInline.entretien.couleur, etatApercuInline.entretien.formatPage);
  }
}

// TACHE (page Action, tache 4) : point d'entree appele a chaque rendu de la
// page Action si l'accordeon "Apercu et finalisation" est ouvert -- choisit
// automatiquement un modele recommande (une seule fois, tant que la personne
// n'a rien choisi elle-meme) puis charge l'apercu inline correspondant.
// TACHE (retour utilisateur : editeur de mise en page) : dispatch commun,
// evite de repeter le meme if/else CV/Lettre/Entretien a chaque endroit ou
// l'apercu doit etre recharge (modele, taille, police...).
function rechargerApercuInline(type, modele) {
  if (type === 'lettre') { chargerApercuLettreInline(modele); }
  else if (type === 'entretien') { chargerApercuEntretienInline(modele); }
  else { chargerApercuCVInline(modele); }
}

function initialiserApercuInlineSiOuvert() {
  var type = docActifActuel();
  if (type === 'cv' && document.getElementById('zoneApercuInlineCV')) {
    // TACHE (retour utilisateur : sélecteur de modèles A5, comme pour A4) :
    // deux grilles DISTINCTES coexistent dans le DOM (une par format,
    // l'autre masquee -- voir accordeonApercuDoc plus haut), on ne
    // construit desormais QUE celle qui correspond au format actuellement
    // actif, jamais les deux.
    if (etatApercuInline.cv.formatPage === 'A5') {
      var listeA5 = (typeof MODELES_A5_CV_DISPONIBLES !== 'undefined') ? MODELES_A5_CV_DISPONIBLES : [{ id: 'portrait', nom: 'Portrait' }];
      Promise.all(listeA5.map(function (m) { return obtenirMetaModeleType('cv', m.id); })).then(function (metas) {
        var carrouselA5 = document.getElementById('grilleModelesA5CV');
        if (!carrouselA5) { return; }
        var metasA5ParModele = {};
        listeA5.forEach(function (m, i) { metasA5ParModele[m.id] = metas[i]; });
        construireCarrouselModeles('cv', 'A5CV', listeA5, etatApercuInline.cv.modeleA5 || 'portrait', metasA5ParModele, 'modeleA5', 'CV');
        // Le conteneur reel utilise par le reste du code (palette, apercu)
        // reste "CV" -- seule la grille de MINIATURES vit sous un id
        // distinct ('A5CV'). On reconstruit ici la palette/l'apercu sous
        // le bon id ('CV', pas 'A5CV'), pour rester coherent avec le reste
        // de l'accordeon "Aperçu et finalisation".
        construireBoutonsFormatPage('cv', 'CV');
        chargerApercuCVInline(etatApercuInline.cv.modeleA5 || 'portrait');
      });
      return;
    }
    Promise.all(MODELES_CV_DISPONIBLES.map(function (m) { return obtenirMetaModele(m.id); })).then(function (metas) {
      var carrousel = document.getElementById('grilleModelesCV');
      if (!carrousel) { return; }
      var metasParModele = {};
      MODELES_CV_DISPONIBLES.forEach(function (m, i) { metasParModele[m.id] = metas[i]; });
      if (!etatApercuInline.cv.choisiManuellement) {
        etatApercuInline.cv.modele = choisirModeleRecommandeCV(metasParModele);
      }
      if (etatApercuInline.cv.formatPage !== 'A5') {
        construireCarrouselModeles('cv', 'CV', MODELES_CV_DISPONIBLES, etatApercuInline.cv.modele || 'moderne', metasParModele);
      }
      construireBoutonsFormatPage('cv', 'CV');
      chargerApercuCVInline(etatApercuInline.cv.modele || 'moderne');
    });
  } else if (type === 'lettre' && document.getElementById('zoneApercuInlineLettre')) {
    Promise.all(MODELES_LETTRE_DISPONIBLES.map(function (m) { return obtenirMetaModeleType('lettre', m.id); })).then(function (metas) {
      var carrousel = document.getElementById('grilleModelesLettre');
      if (!carrousel) { return; }
      var metasParModele = {};
      MODELES_LETTRE_DISPONIBLES.forEach(function (m, i) { metasParModele[m.id] = metas[i]; });
      var modele = etatApercuInline.lettre.modele || 'sobre';
      construireCarrouselModeles('lettre', 'Lettre', MODELES_LETTRE_DISPONIBLES, modele, metasParModele);
      construireBoutonsFormatPage('lettre', 'Lettre');
      chargerApercuLettreInline(modele);
    });
  } else if (type === 'entretien' && document.getElementById('zoneApercuInlineEntretien')) {
    Promise.all(MODELES_ENTRETIEN_DISPONIBLES.map(function (m) { return obtenirMetaModeleType('entretien', m.id); })).then(function (metas) {
      var carrousel = document.getElementById('grilleModelesEntretien');
      if (!carrousel) { return; }
      var metasParModele = {};
      MODELES_ENTRETIEN_DISPONIBLES.forEach(function (m, i) { metasParModele[m.id] = metas[i]; });
      var modele = etatApercuInline.entretien.modele || 'clair';
      construireCarrouselModeles('entretien', 'Entretien', MODELES_ENTRETIEN_DISPONIBLES, modele, metasParModele);
      construireBoutonsFormatPage('entretien', 'Entretien');
      chargerApercuEntretienInline(modele);
    });
  }
}

// TACHE (retour utilisateur : cartes de modeles pour Lettre/Entretien) :
// version generique -- meme schema JSON (colors.primary/secondary/
// background, sections) deja confirme present pour au moins un modele de
// chaque type (cv, lettre "sobre"). Cache partage par type+id pour ne
// jamais refetcher deux fois le meme modele.
// TACHE (retour utilisateur : 5 designs A5, comme pour A4 -- on commence
// par 2) : liste des modeles propres au format Mini CV (A5), INDEPENDANTE
// de MODELES_CV_DISPONIBLES (A4) -- un choix de modele A5 ne doit jamais
// affecter le choix A4, et inversement. "Portrait" reprend le design
// existant (miniCvA5.js) comme base ; "Paysage" viendra ensuite.
var MODELES_A5_CV_DISPONIBLES = [
  { id: 'portrait', nom: 'Portrait' },
  { id: 'paysage', nom: 'Paysage' }
];

var CHEMINS_TEMPLATES_PAR_TYPE = {
  cv: 'modules/cv-editor/templates/',
  lettre: 'modules/lettre-editor/templates/',
  entretien: 'modules/entretien-editor/templates/'
};
function obtenirMetaModeleType(type, idModele) {
  var cle = type + ':' + idModele;
  if (cacheMetaModelesCV[cle]) { return Promise.resolve(cacheMetaModelesCV[cle]); }
  var base = CHEMINS_TEMPLATES_PAR_TYPE[type] || CHEMINS_TEMPLATES_PAR_TYPE.cv;
  return fetch(base + idModele + '/' + idModele + '.json')
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (meta) { cacheMetaModelesCV[cle] = meta; return meta; })
    .catch(function () { return {}; });
}
function obtenirMetaModele(idModele) {
  return obtenirMetaModeleType('cv', idModele);
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
function genererCartesSelecteurModeles(modeles, modeleActif, metasParModele) {
  return modeles.map(function (m) {
    var meta = metasParModele[m.id] || {};
    var actif = (m.id === modeleActif);
    return '<div class="carte-modele-cv' + (actif ? ' carte-modele-cv-active' : '') + '" data-modele="' + m.id + '">' +
      '<div class="carte-modele-cv-miniature">' + genererMiniatureSVG(meta) + '</div>' +
      '<div class="carte-modele-cv-nom">' + m.nom + '</div>' +
      '</div>';
  }).join('');
}
// Conservee pour compatibilite (appelee ailleurs specifiquement pour le CV).
function genererCartesSelecteurCV(modeleActif, metasParModele) {
  return genererCartesSelecteurModeles(MODELES_CV_DISPONIBLES, modeleActif, metasParModele);
}

// TACHE (retour utilisateur : selecteur en vignettes, etendu a Lettre et
// Entretien) : construit le carrousel de l'accordeon "Apercu et
// finalisation" -- reutilise integralement genererCartesSelecteurModeles()/
// genererMiniatureSVG() (aucune duplication), cable le clic (choix manuel,
// comme l'ancien <select>) et les deux fleches (defilement horizontal, pas
// de logique de pagination complexe : le navigateur gere le scroll, les
// fleches avancent d'environ une largeur de carrousel a chaque clic).
// idSuffixe : 'CV'/'Lettre'/'Entretien', coherent avec les ids deja
// utilises par zoneApercuInline*/messageApercuInline*.
// TACHE (refonte "Aperçu et finalisation") : "carrouselModeles<idSuffixe>"
// devient "grilleModeles<idSuffixe>" -- fini le defilement horizontal
// avec fleches, place a une grille de 4 miniatures par ligne (voir
// accordeonApercuDoc plus bas pour le squelette HTML). Miniatures
// STRICTEMENT inchangees (genererCartesSelecteurModeles/
// genererMiniatureSVG non touchees) : seule la disposition du
// conteneur change.
// TACHE (retour utilisateur : sélecteur A5, comme pour A4) : champEtat
// (facultatif, 'modele' par defaut) permet de reutiliser cette meme
// fonction pour un choix de modele STOCKE AILLEURS que etat.modele --
// necessaire pour le nouveau selecteur Mini CV (A5), qui doit ecrire dans
// etat.modeleA5 SANS jamais toucher au choix A4 (etat.modele).
function construireCarrouselModeles(type, idSuffixe, modeles, modeleActif, metasParModele, champEtat, idSuffixePalette) {
  champEtat = champEtat || 'modele';
  // TACHE (retour utilisateur : palette de couleurs absente pour le
  // sélecteur A5) : la grille de vignettes A5 vit sous un id distinct
  // ('A5CV'), mais la palette de couleurs, elle, reste dans le MEME
  // conteneur que l'A4 ('CV', un seul bloc "Couleurs disponibles" partage
  // par les deux formats) -- idSuffixePalette permet de les decoupler.
  // Par defaut (A4/lettre/entretien, appel inchange) : identique a idSuffixe.
  idSuffixePalette = idSuffixePalette || idSuffixe;
  var grille = document.getElementById('grilleModeles' + idSuffixe);
  if (!grille) { return; }
  grille.innerHTML = genererCartesSelecteurModeles(modeles, modeleActif, metasParModele);
  grille.querySelectorAll('[data-modele]').forEach(function (carte) {
    carte.addEventListener('click', function () {
      var id = this.dataset.modele;
      etatApercuInline[type][champEtat] = id;
      etatApercuInline[type].choisiManuellement = true;
      // TACHE (refonte : palette de couleurs) : un changement de modele
      // conserve la couleur choisie si le nouveau modele la supporte
      // aussi, sinon revient a la couleur d'origine du modele.
      if (!(type === 'cv' && typeof modeleSupporteCouleurs === 'function' && modeleSupporteCouleurs(id))) {
        etatApercuInline[type].couleur = null;
      }
      grille.querySelectorAll('[data-modele]').forEach(function (c) { c.classList.remove('carte-modele-cv-active'); });
      this.classList.add('carte-modele-cv-active');
      construirePaletteCouleurs(type, idSuffixePalette, id);
      rechargerApercuInline(type, id);
    });
  });
  construirePaletteCouleurs(type, idSuffixePalette, modeleActif);
}

// TACHE (refonte "Aperçu et finalisation" : palette de couleurs) :
// affiche/masque et (re)construit la rangee de pastilles pour le modele
// actuellement choisi. N'affiche la palette QUE si un modele est
// selectionne ET qu'il supporte la couleur (voir spec : "uniquement
// lorsqu'un modèle est sélectionné, la palette de couleurs"). Appelee au
// chargement initial et a chaque changement de modele.
function construirePaletteCouleurs(type, idSuffixe, modeleActif) {
  var bloc = document.getElementById('paletteCouleurs' + idSuffixe);
  var zonePastilles = document.getElementById('pastillesCouleurs' + idSuffixe);
  if (!bloc || !zonePastilles) { return; }
  // TACHE (couleurs + formats pour la lettre et l'entretien) : chaque
  // type a sa propre fonction de verification (un seul modele chacun
  // aujourd'hui, mais structure prete pour en accueillir d'autres).
  var FONCTIONS_SUPPORT_COULEURS = {
    cv: typeof modeleSupporteCouleurs === 'function' ? modeleSupporteCouleurs : null,
    lettre: typeof modeleLettreSupporteCouleurs === 'function' ? modeleLettreSupporteCouleurs : null,
    entretien: typeof modeleEntretienSupporteCouleurs === 'function' ? modeleEntretienSupporteCouleurs : null
  };
  var fonctionSupport = FONCTIONS_SUPPORT_COULEURS[type];
  var supporte = !!(modeleActif && fonctionSupport && fonctionSupport(modeleActif));
  bloc.style.display = supporte ? 'block' : 'none';
  if (!supporte) { return; }
  var couleurActive = etatApercuInline[type].couleur;
  var palettes = obtenirPalettesCouleursCV();
  // TACHE (retour utilisateur : "Nuances rapides", 10 nuances par
  // couleur) : uniquement disponible pour le CV pour l'instant
  // (obtenirNuancesCouleurCV, coloriationDocxNatifCV.js) -- la lettre et
  // l'entretien gardent le choix simple d'origine (un seul niveau par
  // couleur), sans rangee depliable.
  var avecNuances = (type === 'cv' && typeof obtenirNuancesCouleurCV === 'function');
  var baseActive = couleurActive ? String(couleurActive).split('-')[0] : null;

  function appliquerCouleur(couleurId) {
    if (couleurId === etatApercuInline[type].couleur) { return; }
    etatApercuInline[type].couleur = couleurId;
    var modeleARecharger = (type === 'cv' && etatApercuInline.cv.formatPage === 'A5')
      ? (etatApercuInline.cv.modeleA5 || 'portrait')
      : etatApercuInline[type].modele;
    rechargerApercuInline(type, modeleARecharger);
    // Re-rendu complet : remet a jour quelle rangee de nuances est ouverte
    // et laquelle est active, sans etat divergent possible.
    construirePaletteCouleurs(type, idSuffixe, modeleActif);
  }

  zonePastilles.innerHTML = palettes.map(function (p) {
    var estBaseActive = (baseActive === p.id);
    var nuances = avecNuances ? obtenirNuancesCouleurCV(p.id) : [];
    var rangeeNuances = (avecNuances && estBaseActive)
      ? '<div class="rangee-nuances-cv" style="display:flex;gap:0.3rem;margin-top:0.4rem;flex-wrap:wrap;max-width:220px;">' +
        nuances.map(function (n) {
          var actifNuance = (n.id === couleurActive) || (couleurActive === p.id && n.niveau === 10);
          return '<button type="button" class="pastille-nuance-cv' + (actifNuance ? ' pastille-nuance-cv-active' : '') + '" ' +
            'data-couleur="' + n.id + '" title="' + n.nom + '" aria-label="' + n.nom + '" style="background:#' + n.hex + ';"></button>';
        }).join('') + '</div>'
      : '';
    return '<div class="groupe-couleur-cv" style="display:inline-block;vertical-align:top;margin-right:0.3rem;">' +
      '<button type="button" class="pastille-couleur-cv' + (estBaseActive ? ' pastille-couleur-cv-active' : '') + '" ' +
      'data-couleur-base="' + p.id + '" title="' + p.nom + (avecNuances ? ' — cliquez pour voir les nuances' : '') + '" ' +
      'aria-label="Couleur ' + p.nom + '" style="background:#' + p.hex + ';"></button>' +
      rangeeNuances + '</div>';
  }).join('');

  zonePastilles.querySelectorAll('[data-couleur-base]').forEach(function (rond) {
    rond.addEventListener('click', function () {
      var baseId = this.dataset.couleurBase;
      if (!avecNuances) {
        // Pas de nuances pour ce type (lettre/entretien) : comportement
        // simple d'origine, une couleur = un seul clic.
        appliquerCouleur(baseId);
        return;
      }
      // TACHE ("Nuances rapides") : un clic sur le rond deplie sa rangee
      // de 10 nuances si elle n'etait pas deja ouverte (et selectionne la
      // nuance 10/10 par defaut) ; un second clic la replie sans rien
      // changer si elle etait deja ouverte pour cette couleur.
      if (baseActive === baseId) {
        baseActive = null;
        construirePaletteCouleurs(type, idSuffixe, modeleActif);
        return;
      }
      baseActive = baseId;
      // Choix par defaut a l'ouverture : la nuance 10/10 (couleur pleine),
      // sauf si une nuance de CETTE couleur est deja active.
      if (!couleurActive || String(couleurActive).split('-')[0] !== baseId) {
        appliquerCouleur(baseId + '-' + NB_NUANCES_CV);
      } else {
        construirePaletteCouleurs(type, idSuffixe, modeleActif);
      }
    });
  });
  zonePastilles.querySelectorAll('.pastille-nuance-cv').forEach(function (pastille) {
    pastille.addEventListener('click', function (e) {
      e.stopPropagation();
      appliquerCouleur(this.dataset.couleur);
    });
  });
}

// TACHE (format A5) : cable les 2 boutons "A4 complet"/"A5 compact" de
// l'accordeon -- CV uniquement (les boutons ne sont meme pas construits
// pour lettre/entretien, voir accordeonApercuDoc). Meme principe que
// construirePaletteCouleurs() : bascule etatApercuInline.cv.formatPage et
// rafraichit l'apercu, rien de plus (le contenu recadre est entierement
// gere par formatA5CV.js).
function construireBoutonsFormatPage(type, idSuffixe) {
  var zone = document.getElementById('boutonsFormatPage' + idSuffixe);
  if (!zone) { return; }
  zone.querySelectorAll('[data-format-page]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      var valeur = this.dataset.formatPage;
      if (valeur === etatApercuInline[type].formatPage) { return; }
      etatApercuInline[type].formatPage = valeur;
      // TACHE (retour utilisateur : "je ne veux pas voir les modeles A4
      // dans l'option A5") : un simple rafraichissement de l'apercu ne
      // suffit pas ici -- il faut aussi basculer entre la grille de
      // modeles et le message explicatif (voir accordeonApercuDoc plus
      // haut), qui depend de ce meme etatApercuInline[type].formatPage.
      // Un re-rendu complet de la page est le moyen le plus sur de
      // garder les deux parfaitement synchronises.
      pageResultats();
    });
  });
}

function construireCarrouselModelesCV(modeleActif, metasParModele) {
  construireCarrouselModeles('cv', 'CV', MODELES_CV_DISPONIBLES, modeleActif, metasParModele);
}

// TACHE (retour utilisateur : retrait vieux systeme de popup) : la popup
// qu'elle rafraichissait (chargerEtAfficherApercuCV) est supprimee -- ne
// fait plus rien, mais reste definie car appelee ailleurs (un point
// d'entree "Creer mon CV") sans le casser. TACHE (menage confidentialite) :
// ouvrirAideIA(), qu'elle rafraichissait aussi autrefois, a ete supprimee
// entierement (ecran legacy deja deconnecte de tout bouton, mais qui
// envoyait l'identite complete a l'IA -- risque juge inutile a conserver).
function rafraichirApercuCVSiOuvert() {}


/* ------------------------------------------------------------
   9. REINITIALISATION + LANCEMENT
   ------------------------------------------------------------ */
// TACHE (retour utilisateur : confirmation avant "Recommencer") : le
// bouton "Recommencer" appelle desormais cette fonction plutot que
// recommencer() directement -- reutilise la modale deja existante dans
// l'app (confirmerAction(), voir plus bas, deja utilisee par
// reinitialiserSession()) pour rester coherent visuellement, plutot
// qu'une boite de dialogue navigateur qui detonnerait avec le reste.
// IMPORTANT : recommencer() elle-meme reste SANS confirmation integree
// -- reinitialiserSession() (plus bas) l'appelle deja APRES sa propre
// confirmation ; en ajouter une seconde a l'interieur de recommencer()
// aurait double la demande de confirmation pour ce chemin-la.
function confirmerRecommencer() {
  confirmerAction(
    'Recommencer ?',
    'Toutes les informations saisies seront définitivement effacées. Cette action est irréversible.',
    'Recommencer', 'btn-danger',
    function () { recommencer(); }
  );
}

function recommencer() {
  revelerSpecifiqueCandidatureRemplie = false;
  // TACHE (retour utilisateur : navigation libre entre CV/Lettre/Entretien) :
  // un vrai "recommencer" efface aussi les 3 tiroirs de progression, pas
  // seulement le dossier -- sinon un document deja avance dans la session
  // precedente reapparaitrait "atteint" des la premiere carte choisie.
  etatAccordeonParType = {};
  dossier = {
    modeCreation: null, objectif: null, activites: [], actions: [], environnement: [],
    valeurs: [], metiersAjoutes: [], metiersExclus: [], metierCible: null, typeCV: 'general',
    metiersCandidats: [], secteurCible: null,
    identite: { civilite: null, nom: '', prenom: '', adresse: '', codePostal: '', telephone: '', email: '', ville: '' },
    entretienDirect: { structure: '', poste: '' },
    rechercheEntreprise: { structure: '' },
    catalogueActif: {}, experiences: [], experiencesPerso: [],
    formations: [], loisirs: [], engagements: [], certifications: [], langues: [], permis: { possede: null, categories: [], vehicule: null },
    contrat: [], tempsTravail: [], accepte: [], accepteAucune: false,
    offre: { lien: '', poste: '', structure: '', type: '', dispo: [] },
    spontanee: { lien: '', poste: '', structure: '', type: '', dispo: [] },
    reconversion: { lien: '', poste: '', structure: '', type: '', dispo: [] },
    stage: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [],
      dureeQuantite: '', dureeUnite: null, dateDebut: '', dateFin: '' },
    alternance: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [],
      dureeQuantite: '', dureeUnite: null, dateDebut: '', dateFin: '' },
    immersion: { structure: '', poste: '', lien: '', duree: '', dates: '', heures: '', type: '', dispo: [],
      dureeQuantite: '', dureeUnite: null, dateDebut: '', dateFin: '' },
    miseEnAvant: { mobilite: false, proximite: false },
    lettreMotivation: { texte: '' },
    cvTermine: false,
    lettreTerminee: false,
    documentsEnregistres: { cv: false, lettre: false, entretien: false },
    texteAmelioreCanva: '',
    ia: creerDossierIAVide(),
    // TACHE (Tache 2 : preparation du moteur d'import) : voir les
    // commentaires a l'initialisation principale de dossier, meme role.
    logiciels: [],
    imports: { courant: null },
    metiersHorsRepertoire: [],
    dernierDocumentPrepare: null,
    preferencesIA: { niveauPoste: null, niveauLangage: null, adaptationMetier: null, ton: null, longueur: null },
    profilTexteManuel: null,
    modeRecherche: null, typeRecherche: null, rechercheCandidature: { entreprise: '', lienOffre: '' }
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

// TACHE (retour utilisateur : bouton invisible tant qu'aucun autre clic ne
// force un rerender) : petite fonction partagee, appelee a chaque
// telechargement reussi (Word, texte a copier, JSON, CSV) d'un des 3
// documents -- centralise la garde "objet pas encore initialise" (utile
// pour les sauvegardes anterieures a l'ajout de ce champ), ET rafraichit
// tout de suite la barre du bas (au lieu d'attendre un clic sans rapport,
// ex. ouvrir l'accordeon Ressources, pour que le bouton apparaisse enfin).
// Ne re-rend QUE la barre de navigation (pas toute la page, via
// pageResultats()) pour ne pas ecraser le message de rappel "Pensez a
// sauvegarder ce document" qui vient de s'afficher juste au-dessus.
function marquerDocumentEnregistre(type) {
  if (!dossier.documentsEnregistres) { dossier.documentsEnregistres = { cv: false, lettre: false, entretien: false }; }
  dossier.documentsEnregistres[type] = true;
  var conteneur = document.querySelector('.barre-navigation');
  if (conteneur && pageActuelle === 'resultats') {
    var docActifCourant = docActifActuel();
    var enveloppe = document.createElement('div');
    enveloppe.innerHTML = barreNavigation('revelation', null, null,
      { terminerParcours: !!(dossier.documentsEnregistres && dossier.documentsEnregistres[docActifCourant]) });
    conteneur.replaceWith(enveloppe.firstElementChild);
  }
}

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

// TACHE (bouton "Merci bien, j'ai fini") : remplace confirmerRecommencer()
// comme action du bouton de fin de la page Action -- pose une question
// contextuelle selon le document actif (docActif), avec deux issues
// possibles : enchainer sur le document suivant (infos deja renseignees
// reutilisees, meme mecanisme que btnSuggererLettre/btnSuggererEntretien
// existants), ou tout effacer (comme reinitialiserSession(), avec la meme
// sauvegarde restaurable tant que non reengage).
function terminerParcours() {
  var actif = docActifActuel();

  function effacerEtRecommencer() {
    ecrireSauvegarde(sauvegarderSession());   // sauvegarde AVANT suppression, comme reinitialiserSession()
    recommencer();
  }

  function proposerDocumentSuivant(titre, texte, suivantType) {
    confirmerAction(
      titre, texte, 'Oui, continuer', 'btn-primary',
      function () {
        dossier.dernierDocumentPrepare = suivantType;
        // TACHE (retour utilisateur : navigation libre entre CV/Lettre/
        // Entretien) : avec le stockage par type (etatAccordeonParType),
        // plus besoin de reinitialiser ici -- un document jamais visite
        // demarre naturellement a "Adaptation au metier" (accordeonPourType()),
        // un document deja avance retrouve son propre etat.
        pageResultats();
      },
      'Merci, tout est en ordre', effacerEtRecommencer
    );
  }

  if (actif === 'cv') {
    proposerDocumentSuivant(
      'Et maintenant ?',
      'Voulez-vous préparer votre lettre de motivation ? Les informations déjà renseignées seront réutilisées.',
      'lettre'
    );
  } else if (actif === 'lettre') {
    proposerDocumentSuivant(
      'Et maintenant ?',
      'Voulez-vous préparer votre entretien ? Les informations déjà renseignées seront réutilisées.',
      'entretien'
    );
  } else {
    // Entretien = dernier maillon, rien a proposer ensuite : message final direct.
    confirmerAction(
      'Merci, tout est en ordre',
      'Votre parcours est terminé. Toutes les informations de cette session vont être effacées ; vous pourrez les restaurer depuis la page d\'accueil tant que vous n\'aurez pas commencé un nouveau parcours.',
      'Terminer', 'btn-success', effacerEtRecommencer
    );
  }
}

// TACHE (migration Design System, chantier "Fenetre ERIP", 4e migration) :
// fermerToutModalConfirmation() est supprimee -- son role (empecher
// l'empilement de plusieurs fenetres .modal-confirmation, voir l'historique
// du bug "ecran de plus en plus noir" ci-dessous) est desormais repris
// entierement par la regle de fenetre unique de la primitive elle-meme,
// plus robuste (garantie structurelle, pas une purge defensive avant coup).
//
// confirmerAction() reste a sa place, avec une signature STRICTEMENT
// inchangee -- ses 8 appelants n'ont besoin d'aucune adaptation. Seule son
// implementation interne delegue desormais a ouvrirFenetreERIP() plutot que
// de construire sa propre fenetre. Analyse validee (voir echanges de
// conception) : cette fonction ne contient aucune connaissance du domaine
// ERIP et represente un motif d'interaction universel ("poser une question,
// deux issues possibles") -- elle est donc deja, de fait, un second
// composant du Design System, pas une simple recette metier, meme si elle
// reste physiquement dans app.js pour cette migration.
//
// TACHE (bouton "Merci bien, j'ai fini") : parametres labelAnnuler/onAnnuler
// en fin de liste, tous deux optionnels -- les appelants qui ne les passent
// pas gardent le comportement par defaut (bouton "Annuler" qui ferme sans
// rien faire). Seul terminerParcours() les utilise, pour transformer ce
// bouton en un vrai second choix plutot qu'une simple fermeture neutre.
function confirmerAction(titre, texte, labelConfirmer, classeConfirmer, onConfirmer, labelAnnuler, onAnnuler) {
  var overlay = ouvrirFenetreERIP({
    titre: titre,
    contenuHTML:
      '<p>' + texte + '</p>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-outline-secondary" data-role="annuler">' + (labelAnnuler || 'Annuler') + '</button>' +
        '<button class="btn ' + classeConfirmer + '" data-role="confirmer">' + labelConfirmer + '</button>' +
      '</div>'
  });
  overlay.querySelector('[data-role="annuler"]').addEventListener('click', function () { fermerFenetreERIP(); if (onAnnuler) { onAnnuler(); } });
  overlay.querySelector('[data-role="confirmer"]').addEventListener('click', function () { fermerFenetreERIP(); onConfirmer(); });
}

// Exposition globale (pour les onclick et pour metiers.js)
window.dossier = dossier;
window.naviguerVers = naviguerVers;
window.recommencer = recommencer;
window.confirmerRecommencer = confirmerRecommencer;
window.terminerParcours = terminerParcours;
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