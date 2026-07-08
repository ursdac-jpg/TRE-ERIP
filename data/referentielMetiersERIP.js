/* ============================================================
   data/referentielMetiersERIP.js
   ------------------------------------------------------------
   TACHE 32 : referentiel dedie aux metiers, enrichissement de la
   Base de connaissances ERIP.

   Structure de chaque metier :
   {
     id, nom, famille, secteur,
     rome,                    // code ROME UNIQUEMENT si raisonnablement
                               // certain ; sinon null (jamais invente/suppose)
     fap: null,                // code FAP : architecture prete, aucun code
                               // renseigne dans cette premiere version
     activites: [...],         // ids CATALOGUE_PERSONNES_MATERIELS_LIEUX
     actions: [...],           // ids CATALOGUE_ACTIONS_PRO
     environnement: [...],     // ids CATALOGUE_ENVIRONNEMENTS_TRAVAIL
     valeurs: [...],           // ids CATALOGUE_VALEURS_PROFESSIONNELLES
     savoirFaire: [...], savoirEtre: [...], savoirs: [...],
     argumentsCV: [...], argumentsLettre: [...], pistesEntretien: [...],
     synonymes: [...], motsCles: [], conceptsAssocies: [],
     niveauPertinence: null    // architecture prete pour un futur systeme
                               // de classement ; non exploite (TACHE 33B+)
   }

   NOTE SUR LES NOMS DE CHAMPS :
   Le moteur de recommandation existant (rechercherMetiers/calculerScoreMetier,
   metiers.js) lit precisement les cles "activites", "actions", "environnement"
   et "valeurs" sur chaque metier pour le croisement avec le profil du
   candidat. Ces memes noms de cles sont repris ici a l'identique, afin que
   les 60 nouveaux metiers soient immediatement pris en compte par ce moteur
   sans qu'il soit necessaire d'y toucher.

   NOTE SUR LES CODES ROME :
   Renseignes UNIQUEMENT lorsque raisonnablement certains. Sinon : null,
   a completer plus tard depuis une source officielle (jamais invente).
   Ces codes ne sont pas affiches a l'utilisateur (usage interne uniquement).

   INTEGRATION : voir la derniere ligne de ce fichier — les nouveaux
   metiers sont ajoutes a la fin de "baseMetiers" (metiers.js), qui reste
   par ailleurs totalement inchangee. Le moteur existant, ainsi que
   BASE_CONNAISSANCES_ERIP.metiers (qui reference le meme tableau), en
   beneficient automatiquement.
   ============================================================ */

var REFERENTIEL_METIERS_ERIP = [
  // ---------- Agriculture / Viticulture ----------
  {
    id: 'vigneron', nom: 'Vigneron', famille: 'Agriculture et viticulture', secteur: 'Viticulture',
    rome: 'A1401', fap: null,
    activites: ['exterieur', 'outils', 'vehicules'], actions: ['construire'],
    environnement: ['exploitation_agricole', 'exterieur'], valeurs: ['exterieur', 'autonomie', 'metier_sens'],
    savoirFaire: ['Travail manuel', 'Technique'], savoirEtre: ['Endurance', 'Autonomie', 'Rigueur'],
    savoirs: ['Cycle de la vigne', 'Techniques de vinification de base'],
    argumentsCV: ['travailler en exterieur au rythme des saisons viticoles'],
    argumentsLettre: ['contribuer a la production viticole locale, un secteur qui me tient a coeur'],
    pistesEntretien: ['Decrire une tache viticole realisee au fil des saisons (taille, vendanges, entretien du sol).'],
    synonymes: ['ouvrier viticole', 'exploitant viticole'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'arboriculteur', nom: 'Arboriculteur', famille: 'Agriculture et viticulture', secteur: 'Agriculture',
    rome: 'A1401', fap: null,
    activites: ['exterieur', 'outils'], actions: ['construire'],
    environnement: ['exploitation_agricole', 'exterieur', 'espaces_verts'], valeurs: ['exterieur', 'autonomie'],
    savoirFaire: ['Travail manuel', 'Technique'], savoirEtre: ['Endurance', 'Adaptabilite'],
    savoirs: ['Cycle des arbres fruitiers', 'Techniques de taille et de traitement'],
    argumentsCV: ['entretenir des vergers dans le respect des cycles naturels'],
    argumentsLettre: ['mettre mon gout du travail en exterieur au service de la production fruitiere'],
    pistesEntretien: ['Expliquer les principales taches saisonnieres en arboriculture.'],
    synonymes: ['ouvrier arboricole'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'apiculteur', nom: 'Apiculteur', famille: 'Agriculture et viticulture', secteur: 'Agriculture',
    rome: null, fap: null,
    activites: ['exterieur', 'outils'], actions: ['construire'],
    environnement: ['exploitation_agricole', 'exterieur'], valeurs: ['exterieur', 'autonomie', 'metier_sens'],
    savoirFaire: ['Travail manuel'], savoirEtre: ['Patience', 'Autonomie', 'Rigueur'],
    savoirs: ['Cycle des abeilles', 'Techniques d\'apiculture de base'],
    argumentsCV: ['assurer le suivi de ruches et la production de miel'],
    argumentsLettre: ['exercer un metier de plein air en lien avec la biodiversite'],
    pistesEntretien: ['Decrire le suivi d\'une ruche sur une saison.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'chef_de_culture', nom: 'Chef de culture viticole', famille: 'Agriculture et viticulture', secteur: 'Viticulture',
    rome: null, fap: null,
    activites: ['exterieur', 'outils', 'collegues'], actions: ['organiser', 'gerer', 'construire'],
    environnement: ['exploitation_agricole', 'exterieur'], valeurs: ['responsabilites', 'autonomie', 'metier_sens'],
    savoirFaire: ['Planification', 'Gestion de projet', 'Technique'], savoirEtre: ['Responsabilite', 'Organisation', 'Leadership'],
    savoirs: ['Cycle de la vigne', 'Encadrement d\'equipe agricole'],
    argumentsCV: ['coordonner les travaux viticoles sur l\'ensemble d\'une exploitation'],
    argumentsLettre: ['mettre mon experience du terrain au service de l\'encadrement d\'une equipe viticole'],
    pistesEntretien: ['Decrire une situation d\'organisation du travail d\'une equipe sur une exploitation.'],
    synonymes: ['responsable d\'exploitation viticole'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Restauration ----------
  {
    id: 'patissier', nom: 'Patissier', famille: 'Hotellerie-restauration', secteur: 'Artisanat alimentaire',
    rome: 'D1104', fap: null,
    activites: ['clients', 'outils'], actions: ['cuisiner', 'creer'],
    environnement: ['cuisine'], valeurs: ['metier_sens', 'fier_metier'],
    savoirFaire: ['Cuisine', 'Precision'], savoirEtre: ['Creativite', 'Rigueur', 'Respect des normes'],
    savoirs: ['Regles d\'hygiene alimentaire (HACCP)', 'Techniques de patisserie'],
    argumentsCV: ['realiser des creations patissieres dans le respect des normes d\'hygiene'],
    argumentsLettre: ['allier precision technique et creativite au quotidien'],
    pistesEntretien: ['Decrire une realisation patissiere dont vous etes fier.'],
    synonymes: ['artisan patissier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'chef_cuisine', nom: 'Chef de cuisine', famille: 'Hotellerie-restauration', secteur: 'Restauration',
    rome: null, fap: null,
    activites: ['clients', 'collegues', 'outils'], actions: ['cuisiner', 'organiser', 'creer'],
    environnement: ['cuisine'], valeurs: ['responsabilites', 'fier_metier', 'metier_sens'],
    savoirFaire: ['Cuisine', 'Gestion de projet'], savoirEtre: ['Creativite', 'Responsabilite', 'Leadership'],
    savoirs: ['Regles d\'hygiene alimentaire (HACCP)', 'Gestion d\'une brigade'],
    argumentsCV: ['encadrer une equipe en cuisine et elaborer les cartes'],
    argumentsLettre: ['mettre mon experience culinaire au service d\'une equipe et d\'un etablissement'],
    pistesEntretien: ['Decrire une carte ou un plat que vous avez concu.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'sommelier', nom: 'Sommelier', famille: 'Hotellerie-restauration', secteur: 'Restauration',
    rome: null, fap: null,
    activites: ['clients'], actions: ['conseiller', 'vendre'],
    environnement: ['cuisine', 'hotel'], valeurs: ['contact_humain', 'metier_sens', 'fier_metier'],
    savoirFaire: ['Conseil'], savoirEtre: ['Relation client', 'Communication', 'Sens du detail'],
    savoirs: ['Connaissance des vins et accords mets-vins'],
    argumentsCV: ['conseiller une clientele sur le choix des vins'],
    argumentsLettre: ['partager ma connaissance des vins avec une clientele exigeante'],
    pistesEntretien: ['Decrire un accord mets-vins que vous recommanderiez.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- BTP ----------
  {
    id: 'charpentier', nom: 'Charpentier', famille: 'BTP', secteur: 'BTP',
    rome: 'F1503', fap: null,
    activites: ['outils', 'exterieur'], actions: ['construire', 'monter'],
    environnement: ['exterieur'], valeurs: ['exterieur', 'fier_metier'],
    savoirFaire: ['Batiment', 'Lecture de plans', 'Travail manuel'], savoirEtre: ['Precision', 'Securite'],
    savoirs: ['Normes de securite sur chantier'],
    argumentsCV: ['realiser des ouvrages en bois dans le respect des plans et des normes'],
    argumentsLettre: ['mettre mon savoir-faire manuel au service de projets de construction'],
    pistesEntretien: ['Decrire un ouvrage en charpente que vous avez realise.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'carreleur', nom: 'Carreleur', famille: 'BTP', secteur: 'BTP',
    rome: null, fap: null,
    activites: ['outils'], actions: ['construire', 'monter'],
    environnement: ['exterieur'], valeurs: ['fier_metier'],
    savoirFaire: ['Travail manuel', 'Precision'], savoirEtre: ['Rigueur', 'Sens du detail'],
    savoirs: ['Techniques de pose de carrelage'],
    argumentsCV: ['realiser des poses de carrelage soignees'],
    argumentsLettre: ['apporter un travail minutieux sur des chantiers varies'],
    pistesEntretien: ['Decrire une pose de carrelage complexe realisee.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'chef_chantier', nom: 'Chef de chantier', famille: 'BTP', secteur: 'BTP',
    rome: null, fap: null,
    activites: ['collegues', 'outils'], actions: ['organiser', 'gerer', 'construire'],
    environnement: ['exterieur'], valeurs: ['responsabilites', 'fier_metier'],
    savoirFaire: ['Planification', 'Batiment', 'Lecture de plans'], savoirEtre: ['Responsabilite', 'Leadership', 'Organisation'],
    savoirs: ['Normes de securite sur chantier', 'Coordination d\'equipe BTP'],
    argumentsCV: ['coordonner une equipe et le suivi d\'un chantier'],
    argumentsLettre: ['mettre mon experience du terrain au service de l\'encadrement de chantier'],
    pistesEntretien: ['Decrire une situation de coordination d\'equipe sur un chantier.'],
    synonymes: ['conducteur de travaux junior'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'grutier', nom: 'Grutier', famille: 'BTP', secteur: 'BTP',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['conduire'],
    environnement: ['exterieur'], valeurs: ['autonomie', 'pas_physique'],
    savoirFaire: ['Conduite', 'Technique'], savoirEtre: ['Securite', 'Rigueur', 'Autonomie'],
    savoirs: ['Consignes de securite de levage'],
    argumentsCV: ['assurer la conduite d\'une grue en respectant les consignes de securite'],
    argumentsLettre: ['exercer un metier technique necessitant precision et vigilance'],
    pistesEntretien: ['Decrire une manoeuvre de levage delicate.'],
    synonymes: ['conducteur de grue'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'monteur_reseaux_electriques', nom: 'Monteur de reseaux electriques', famille: 'BTP', secteur: 'Energie',
    rome: 'F1608', fap: null,
    activites: ['outils', 'exterieur'], actions: ['installer', 'construire'],
    environnement: ['exterieur'], valeurs: ['exterieur', 'fier_metier'],
    savoirFaire: ['Technique', 'Reparation'], savoirEtre: ['Securite', 'Rigueur'],
    savoirs: ['Normes electriques', 'Consignes de securite en hauteur'],
    argumentsCV: ['installer et entretenir des reseaux electriques exterieurs'],
    argumentsLettre: ['contribuer au developpement des infrastructures energetiques locales'],
    pistesEntretien: ['Decrire une intervention sur un reseau electrique.'],
    synonymes: ['electricien reseaux'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'technicien_froid_climatisation', nom: 'Technicien froid et climatisation', famille: 'BTP', secteur: 'Industrie',
    rome: 'I1302', fap: null,
    activites: ['outils', 'machines'], actions: ['installer', 'reparer', 'diagnostiquer'],
    environnement: ['exterieur', 'usine'], valeurs: ['autonomie', 'missions_variees'],
    savoirFaire: ['Technique', 'Diagnostic', 'Reparation'], savoirEtre: ['Rigueur', 'Autonomie'],
    savoirs: ['Fluides frigorigenes et normes associees'],
    argumentsCV: ['installer et depanner des systemes de froid et de climatisation'],
    argumentsLettre: ['exercer un metier technique en constante evolution'],
    pistesEntretien: ['Decrire un depannage de systeme de climatisation.'],
    synonymes: ['frigoriste'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Industrie / Logistique ----------
  {
    id: 'technicien_qualite', nom: 'Technicien qualite', famille: 'Industrie', secteur: 'Industrie',
    rome: null, fap: null,
    activites: ['documents', 'machines'], actions: ['controler', 'analyser'],
    environnement: ['usine', 'laboratoire'], valeurs: ['calme', 'missions_variees'],
    savoirFaire: ['Diagnostic', 'Analyse de donnees'], savoirEtre: ['Rigueur', 'Sens du detail'],
    savoirs: ['Normes qualite industrielle'],
    argumentsCV: ['controler la conformite des produits selon les normes en vigueur'],
    argumentsLettre: ['garantir la qualite des produits par un controle rigoureux'],
    pistesEntretien: ['Decrire un controle qualite ayant permis d\'identifier un probleme.'],
    synonymes: ['controleur qualite'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'regleur_cn', nom: 'Regleur sur machine a commande numerique', famille: 'Industrie', secteur: 'Industrie',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['programmer', 'reparer', 'diagnostiquer'],
    environnement: ['usine'], valeurs: ['missions_variees', 'autonomie'],
    savoirFaire: ['Technique', 'Precision'], savoirEtre: ['Rigueur', 'Autonomie'],
    savoirs: ['Programmation de machines a commande numerique'],
    argumentsCV: ['regler et programmer des machines a commande numerique'],
    argumentsLettre: ['exercer un metier technique au coeur de la production industrielle'],
    pistesEntretien: ['Decrire un reglage de machine realise.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'conducteur_ligne', nom: 'Conducteur de ligne de production', famille: 'Industrie', secteur: 'Industrie',
    rome: 'H2909', fap: null,
    activites: ['machines'], actions: ['controler', 'diagnostiquer'],
    environnement: ['usine'], valeurs: ['horaires_fixes', 'stabilite'],
    savoirFaire: ['Technique', 'Diagnostic'], savoirEtre: ['Rigueur', 'Securite'],
    savoirs: ['Fonctionnement d\'une ligne de production'],
    argumentsCV: ['assurer le pilotage et la surveillance d\'une ligne de production'],
    argumentsLettre: ['garantir la continuite et la qualite d\'une production industrielle'],
    pistesEntretien: ['Decrire une intervention suite a un incident sur une ligne.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'logisticien', nom: 'Logisticien', famille: 'Transport et logistique', secteur: 'Logistique',
    rome: 'N1301', fap: null,
    activites: ['marchandises', 'documents'], actions: ['organiser', 'gerer'],
    environnement: ['entrepot_logistique'], valeurs: ['missions_variees', 'responsabilites'],
    savoirFaire: ['Logistique', 'Gestion des stocks', 'Planification'], savoirEtre: ['Organisation', 'Rigueur'],
    savoirs: ['Chaine logistique', 'Gestion des flux'],
    argumentsCV: ['organiser et optimiser les flux logistiques d\'un entrepot'],
    argumentsLettre: ['mettre mes competences organisationnelles au service de la chaine logistique'],
    pistesEntretien: ['Decrire une amelioration apportee a un processus logistique.'],
    synonymes: ['gestionnaire logistique'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'agent_tri', nom: 'Agent de tri', famille: 'Transport et logistique', secteur: 'Logistique',
    rome: 'N1103', fap: null,
    activites: ['marchandises'], actions: ['controler', 'transporter'],
    environnement: ['entrepot_logistique'], valeurs: ['horaires_fixes', 'pas_physique'],
    savoirFaire: ['Gestion des stocks'], savoirEtre: ['Rigueur', 'Endurance'],
    savoirs: ['Procedures de tri logistique'],
    argumentsCV: ['assurer le tri et l\'acheminement des marchandises'],
    argumentsLettre: ['contribuer a la fluidite d\'une chaine logistique'],
    pistesEntretien: ['Decrire une journee type en centre de tri.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'livreur_velo', nom: 'Livreur a velo', famille: 'Transport et logistique', secteur: 'Transport',
    rome: 'N4105', fap: null,
    activites: ['vehicules', 'clients'], actions: ['transporter'],
    environnement: ['route'], valeurs: ['autonomie', 'temps_libre', 'choisir_horaires'],
    savoirFaire: ['Logistique'], savoirEtre: ['Autonomie', 'Endurance', 'Respect des delais'],
    savoirs: ['Code de la route'],
    argumentsCV: ['assurer des livraisons rapides en autonomie'],
    argumentsLettre: ['exercer une activite physique et autonome au contact de la ville'],
    pistesEntretien: ['Decrire l\'organisation d\'une tournee de livraison.'],
    synonymes: ['coursier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Administration / RH ----------
  {
    id: 'gestionnaire_rh', nom: 'Gestionnaire ressources humaines', famille: 'Administration et gestion', secteur: 'Ressources humaines',
    rome: 'M1502', fap: null,
    activites: ['documents', 'collegues', 'ordinateur'], actions: ['gerer', 'organiser', 'communiquer_ecrit'],
    environnement: ['bureau', 'administration'], valeurs: ['stabilite', 'responsabilites'],
    savoirFaire: ['Gestion administrative', 'Bureautique'], savoirEtre: ['Rigueur', 'Organisation', 'Communication'],
    savoirs: ['Droit du travail de base', 'Gestion de la paie'],
    argumentsCV: ['assurer la gestion administrative du personnel'],
    argumentsLettre: ['mettre mes competences administratives au service des ressources humaines'],
    pistesEntretien: ['Decrire une procedure RH que vous avez geree.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'assistant_rh', nom: 'Assistant ressources humaines', famille: 'Administration et gestion', secteur: 'Ressources humaines',
    rome: 'M1501', fap: null,
    activites: ['documents', 'collegues', 'ordinateur'], actions: ['classer', 'saisir', 'communiquer_ecrit'],
    environnement: ['bureau', 'administration'], valeurs: ['stabilite', 'calme'],
    savoirFaire: ['Bureautique', 'Gestion administrative'], savoirEtre: ['Rigueur', 'Organisation'],
    savoirs: ['Bases du droit du travail'],
    argumentsCV: ['assister la gestion administrative du personnel'],
    argumentsLettre: ['apporter mon serieux au sein d\'un service ressources humaines'],
    pistesEntretien: ['Decrire une tache administrative RH realisee.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Social / Insertion / Formation ----------
  {
    id: 'conseiller_insertion_professionnelle', nom: 'Conseiller en insertion professionnelle', famille: 'Social et formation', secteur: 'Insertion professionnelle',
    rome: 'K1801', fap: null,
    activites: ['clients', 'collegues', 'ordinateur'], actions: ['conseiller', 'accompagner', 'informer'],
    environnement: ['bureau', 'administration'], valeurs: ['sentir_utile', 'contact_humain', 'metier_sens'],
    savoirFaire: ['Conseil'], savoirEtre: ['Empathie', 'Ecoute', 'Communication', 'Pedagogie'],
    savoirs: ['Dispositifs d\'insertion professionnelle', 'Marche de l\'emploi'],
    argumentsCV: ['accompagner des personnes dans leur parcours d\'insertion professionnelle'],
    argumentsLettre: ['mettre mon ecoute et ma pedagogie au service de l\'accompagnement des publics en insertion'],
    pistesEntretien: ['Decrire un accompagnement individuel que vous avez mene.'],
    synonymes: ['CIP', 'conseiller emploi'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'educateur_specialise', nom: 'Educateur specialise', famille: 'Social et formation', secteur: 'Social',
    rome: 'K1207', fap: null,
    activites: ['enfants', 'personnes_agees', 'patients'], actions: ['accompagner', 'aider', 'former'],
    environnement: ['sante'], valeurs: ['sentir_utile', 'metier_sens', 'contact_humain'],
    savoirFaire: ['Formation'], savoirEtre: ['Empathie', 'Patience', 'Ecoute', 'Bienveillance'],
    savoirs: ['Accompagnement social et educatif'],
    argumentsCV: ['accompagner des personnes en difficulte dans leur parcours de vie'],
    argumentsLettre: ['mettre mon sens de l\'ecoute au service de personnes en situation de vulnerabilite'],
    pistesEntretien: ['Decrire une situation d\'accompagnement educatif menee.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'assistant_social', nom: 'Assistant de service social', famille: 'Social et formation', secteur: 'Social',
    rome: 'K1201', fap: null,
    activites: ['clients', 'famille', 'documents'], actions: ['accompagner', 'conseiller', 'informer'],
    environnement: ['bureau', 'administration'], valeurs: ['sentir_utile', 'metier_sens'],
    savoirFaire: ['Conseil', 'Gestion administrative'], savoirEtre: ['Empathie', 'Ecoute', 'Bienveillance'],
    savoirs: ['Dispositifs d\'aide sociale'],
    argumentsCV: ['accompagner des personnes dans leurs demarches sociales'],
    argumentsLettre: ['mettre mon sens de l\'ecoute au service de publics en difficulte'],
    pistesEntretien: ['Decrire un accompagnement social mene de bout en bout.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'moniteur_auto_ecole', nom: 'Moniteur auto-ecole', famille: 'Social et formation', secteur: 'Formation',
    rome: 'K2110', fap: null,
    activites: ['eleves_etudiants', 'vehicules'], actions: ['former', 'conduire'],
    environnement: ['ecole_formation', 'route'], valeurs: ['contact_humain', 'metier_sens', 'autonomie'],
    savoirFaire: ['Formation', 'Conduite'], savoirEtre: ['Patience', 'Pedagogie', 'Securite'],
    savoirs: ['Code de la route', 'Pedagogie de la conduite'],
    argumentsCV: ['former des candidats a la conduite et au code de la route'],
    argumentsLettre: ['transmettre les bonnes pratiques de conduite avec patience et rigueur'],
    pistesEntretien: ['Decrire l\'accompagnement d\'un eleve en difficulte.'],
    synonymes: ['enseignant de la conduite'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'aesh', nom: 'Accompagnant d\'eleves en situation de handicap (AESH)', famille: 'Social et formation', secteur: 'Education',
    rome: 'K2104', fap: null,
    activites: ['enfants', 'eleves_etudiants'], actions: ['accompagner', 'aider'],
    environnement: ['ecole_formation'], valeurs: ['sentir_utile', 'metier_sens', 'contact_humain'],
    savoirFaire: [], savoirEtre: ['Patience', 'Empathie', 'Bienveillance', 'Adaptabilite'],
    savoirs: ['Accompagnement du handicap en milieu scolaire'],
    argumentsCV: ['accompagner des eleves en situation de handicap dans leur scolarite'],
    argumentsLettre: ['mettre ma patience et mon adaptabilite au service d\'enfants en situation de handicap'],
    pistesEntretien: ['Decrire une situation d\'adaptation pour un eleve accompagne.'],
    synonymes: ['AVS', 'auxiliaire de vie scolaire'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'garde_enfants_domicile', nom: 'Garde d\'enfants a domicile', famille: 'Services a la personne', secteur: 'Services a la personne',
    rome: null, fap: null,
    activites: ['enfants', 'famille'], actions: ['aider', 'accompagner'],
    environnement: ['domicile'], valeurs: ['sentir_utile', 'choisir_horaires', 'contact_humain'],
    savoirFaire: [], savoirEtre: ['Patience', 'Bienveillance', 'Responsabilite'],
    savoirs: ['Securite et eveil de l\'enfant'],
    argumentsCV: ['assurer la garde et l\'eveil d\'enfants a domicile'],
    argumentsLettre: ['mettre ma bienveillance au service de familles ayant besoin de confiance'],
    pistesEntretien: ['Decrire une activite d\'eveil proposee a un enfant garde.'],
    synonymes: ['nourrice a domicile', 'baby-sitter'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Commerce ----------
  {
    id: 'responsable_magasin', nom: 'Responsable de magasin', famille: 'Commerce', secteur: 'Commerce',
    rome: 'D1401', fap: null,
    activites: ['clients', 'collegues', 'marchandises'], actions: ['gerer', 'organiser', 'vendre'],
    environnement: ['magasin'], valeurs: ['responsabilites', 'evolution'],
    savoirFaire: ['Merchandising', 'Gestion des stocks', 'Gestion de projet'], savoirEtre: ['Leadership', 'Organisation', 'Relation client'],
    savoirs: ['Gestion commerciale d\'un point de vente'],
    argumentsCV: ['manager une equipe et piloter l\'activite commerciale d\'un magasin'],
    argumentsLettre: ['mettre mon sens du commerce et du management au service d\'un point de vente'],
    pistesEntretien: ['Decrire une action commerciale que vous avez pilotee.'],
    synonymes: ['directeur de magasin'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'merchandiseur', nom: 'Merchandiseur', famille: 'Commerce', secteur: 'Commerce',
    rome: null, fap: null,
    activites: ['marchandises', 'produits'], actions: ['organiser', 'creer'],
    environnement: ['magasin'], valeurs: ['missions_variees', 'metier_sens'],
    savoirFaire: ['Merchandising'], savoirEtre: ['Creativite', 'Sens du detail'],
    savoirs: ['Techniques de merchandising visuel'],
    argumentsCV: ['optimiser la presentation des produits en magasin'],
    argumentsLettre: ['mettre mon sens esthetique au service de la mise en valeur des produits'],
    pistesEntretien: ['Decrire une implantation produit realisee.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Artisanat / Beaute ----------
  {
    id: 'fleuriste', nom: 'Fleuriste', famille: 'Artisanat', secteur: 'Artisanat',
    rome: 'A1408', fap: null,
    activites: ['clients', 'produits'], actions: ['creer', 'vendre', 'conseiller'],
    environnement: ['magasin'], valeurs: ['metier_sens', 'fier_metier'],
    savoirFaire: ['Merchandising'], savoirEtre: ['Creativite', 'Relation client', 'Sens du detail'],
    savoirs: ['Connaissance des fleurs et compositions florales'],
    argumentsCV: ['realiser des compositions florales pour une clientele variee'],
    argumentsLettre: ['mettre ma creativite au service d\'un commerce de proximite'],
    pistesEntretien: ['Decrire une composition florale realisee pour un evenement.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'estheticienne', nom: 'Estheticienne', famille: 'Artisanat', secteur: 'Beaute',
    rome: null, fap: null,
    activites: ['clients'], actions: ['conseiller', 'vendre'],
    environnement: ['magasin'], valeurs: ['contact_humain', 'metier_sens'],
    savoirFaire: [], savoirEtre: ['Relation client', 'Sens du detail', 'Ecoute'],
    savoirs: ['Techniques de soins esthetiques', 'Connaissance des produits cosmetiques'],
    argumentsCV: ['realiser des soins esthetiques adaptes a chaque cliente'],
    argumentsLettre: ['mettre mon sens du contact et du soin au service d\'une clientele'],
    pistesEntretien: ['Decrire un soin esthetique que vous maitrisez particulierement.'],
    synonymes: ['estheticien'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'ebeniste', nom: 'Ebeniste', famille: 'Artisanat', secteur: 'Artisanat',
    rome: null, fap: null,
    activites: ['outils'], actions: ['fabriquer', 'creer'],
    environnement: ['usine'], valeurs: ['fier_metier', 'metier_sens', 'autonomie'],
    savoirFaire: ['Travail manuel', 'Precision'], savoirEtre: ['Creativite', 'Sens du detail', 'Patience'],
    savoirs: ['Techniques de menuiserie fine'],
    argumentsCV: ['concevoir et realiser des meubles sur mesure'],
    argumentsLettre: ['mettre ma passion du travail du bois au service de creations uniques'],
    pistesEntretien: ['Decrire une piece de mobilier que vous avez realisee.'],
    synonymes: ['menuisier d\'art'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'bijoutier', nom: 'Bijoutier', famille: 'Artisanat', secteur: 'Artisanat',
    rome: null, fap: null,
    activites: ['outils', 'clients'], actions: ['fabriquer', 'creer', 'vendre'],
    environnement: ['magasin'], valeurs: ['fier_metier', 'metier_sens'],
    savoirFaire: ['Travail manuel', 'Precision'], savoirEtre: ['Creativite', 'Sens du detail', 'Patience'],
    savoirs: ['Techniques de bijouterie'],
    argumentsCV: ['creer et reparer des bijoux avec precision'],
    argumentsLettre: ['mettre ma minutie au service d\'un artisanat de precision'],
    pistesEntretien: ['Decrire la creation ou reparation d\'un bijou.'],
    synonymes: ['joaillier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'toiletteur_animalier', nom: 'Toiletteur animalier', famille: 'Artisanat', secteur: 'Services',
    rome: null, fap: null,
    activites: ['clients'], actions: ['soigner'],
    environnement: ['magasin'], valeurs: ['metier_sens', 'contact_humain'],
    savoirFaire: ['Soins'], savoirEtre: ['Patience', 'Empathie', 'Sens du detail'],
    savoirs: ['Techniques de toilettage animalier'],
    argumentsCV: ['realiser le toilettage d\'animaux dans le respect de leur bien-etre'],
    argumentsLettre: ['mettre ma patience et mon amour des animaux au service de ce metier'],
    pistesEntretien: ['Decrire le toilettage d\'un animal difficile.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Numerique / Creation ----------
  {
    id: 'technicien_reseau', nom: 'Technicien reseau informatique', famille: 'Numerique', secteur: 'Numerique',
    rome: null, fap: null,
    activites: ['ordinateur', 'appareils_numeriques'], actions: ['installer', 'diagnostiquer', 'reparer'],
    environnement: ['bureau'], valeurs: ['missions_variees', 'autonomie'],
    savoirFaire: ['Technique', 'Diagnostic'], savoirEtre: ['Rigueur', 'Autonomie'],
    savoirs: ['Reseaux informatiques', 'Depannage informatique'],
    argumentsCV: ['installer et depanner des infrastructures reseau'],
    argumentsLettre: ['mettre mes competences techniques au service du bon fonctionnement des reseaux'],
    pistesEntretien: ['Decrire un depannage reseau realise.'],
    synonymes: ['technicien informatique'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'webmaster', nom: 'Webmaster', famille: 'Numerique', secteur: 'Numerique',
    rome: null, fap: null,
    activites: ['ordinateur'], actions: ['programmer', 'creer'],
    environnement: ['bureau', 'teletravail_domicile'], valeurs: ['teletravail', 'missions_variees', 'evolution'],
    savoirFaire: ['Technique', 'Innovation'], savoirEtre: ['Autonomie', 'Rigueur'],
    savoirs: ['Creation et maintenance de sites internet'],
    argumentsCV: ['creer et maintenir des sites internet'],
    argumentsLettre: ['mettre mes competences numeriques au service de projets web'],
    pistesEntretien: ['Decrire un site internet que vous avez cree ou maintenu.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'community_manager', nom: 'Community manager', famille: 'Numerique', secteur: 'Communication',
    rome: null, fap: null,
    activites: ['ordinateur', 'appareils_numeriques'], actions: ['communiquer_ecrit', 'creer', 'informer'],
    environnement: ['bureau', 'teletravail_domicile'], valeurs: ['teletravail', 'missions_variees', 'evolution'],
    savoirFaire: ['Redaction', 'Innovation'], savoirEtre: ['Creativite', 'Communication', 'Adaptabilite'],
    savoirs: ['Reseaux sociaux et strategie de contenu'],
    argumentsCV: ['animer les reseaux sociaux et la communaute en ligne d\'une structure'],
    argumentsLettre: ['mettre ma creativite au service de la communication digitale'],
    pistesEntretien: ['Decrire une campagne ou publication que vous avez concue.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'graphiste', nom: 'Graphiste', famille: 'Creation', secteur: 'Communication',
    rome: null, fap: null,
    activites: ['ordinateur'], actions: ['creer', 'dessiner', 'imaginer'],
    environnement: ['bureau', 'teletravail_domicile'], valeurs: ['teletravail', 'metier_sens', 'fier_metier'],
    savoirFaire: ['Expression artistique', 'Innovation'], savoirEtre: ['Creativite', 'Sens du detail'],
    savoirs: ['Logiciels de creation graphique'],
    argumentsCV: ['concevoir des supports visuels pour differents supports de communication'],
    argumentsLettre: ['mettre ma creativite graphique au service de vos projets de communication'],
    pistesEntretien: ['Decrire une creation graphique dont vous etes fier.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'photographe', nom: 'Photographe', famille: 'Creation', secteur: 'Communication',
    rome: null, fap: null,
    activites: ['appareils_numeriques', 'clients'], actions: ['photographier', 'creer'],
    environnement: ['route', 'evenementiel'], valeurs: ['metier_sens', 'missions_variees', 'autonomie'],
    savoirFaire: ['Expression artistique'], savoirEtre: ['Creativite', 'Sens du detail', 'Adaptabilite'],
    savoirs: ['Techniques photographiques et retouche d\'image'],
    argumentsCV: ['realiser des reportages photographiques pour des evenements ou des clients'],
    argumentsLettre: ['mettre mon regard artistique au service de vos evenements ou projets'],
    pistesEntretien: ['Decrire un reportage photo realise.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Tourisme / Hotellerie ----------
  {
    id: 'guide_touristique', nom: 'Guide touristique', famille: 'Tourisme', secteur: 'Tourisme',
    rome: 'G1101', fap: null,
    activites: ['clients'], actions: ['informer', 'accueillir'],
    environnement: ['aeroport_gare', 'evenementiel'], valeurs: ['contact_humain', 'metier_sens', 'missions_variees'],
    savoirFaire: ['Conseil'], savoirEtre: ['Communication', 'Accueil', 'Adaptabilite'],
    savoirs: ['Patrimoine et culture locale'],
    argumentsCV: ['faire decouvrir le patrimoine local a des visiteurs varies'],
    argumentsLettre: ['partager ma connaissance du territoire avec des visiteurs'],
    pistesEntretien: ['Decrire une visite guidee que vous avez animee.'],
    synonymes: ['guide-conferencier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'concierge_hotel', nom: 'Concierge d\'hotel', famille: 'Tourisme', secteur: 'Hotellerie',
    rome: null, fap: null,
    activites: ['clients'], actions: ['accueillir', 'informer', 'conseiller'],
    environnement: ['hotel'], valeurs: ['contact_humain', 'metier_sens'],
    savoirFaire: [], savoirEtre: ['Accueil', 'Sens du service', 'Communication'],
    savoirs: ['Offre touristique locale'],
    argumentsCV: ['accueillir et conseiller une clientele hoteliere exigeante'],
    argumentsLettre: ['mettre mon sens du service au coeur de l\'experience client'],
    pistesEntretien: ['Decrire une demande client particuliere que vous avez satisfaite.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'chef_reception', nom: 'Chef de reception', famille: 'Tourisme', secteur: 'Hotellerie',
    rome: null, fap: null,
    activites: ['clients', 'collegues'], actions: ['organiser', 'accueillir', 'gerer'],
    environnement: ['hotel'], valeurs: ['responsabilites', 'contact_humain'],
    savoirFaire: ['Gestion administrative', 'Planification'], savoirEtre: ['Leadership', 'Accueil', 'Organisation'],
    savoirs: ['Gestion hoteliere'],
    argumentsCV: ['coordonner l\'equipe de reception et l\'accueil de la clientele'],
    argumentsLettre: ['mettre mon experience de l\'accueil au service du management d\'une equipe'],
    pistesEntretien: ['Decrire une situation de gestion d\'equipe en reception.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Sport ----------
  {
    id: 'educateur_sportif', nom: 'Educateur sportif', famille: 'Sport et animation', secteur: 'Sport',
    rome: 'G1204', fap: null,
    activites: ['enfants', 'eleves_etudiants', 'clients'], actions: ['former', 'accompagner'],
    environnement: ['salle_sport'], valeurs: ['contact_humain', 'metier_sens', 'bonne_ambiance'],
    savoirFaire: ['Formation'], savoirEtre: ['Pedagogie', 'Communication', 'Adaptabilite'],
    savoirs: ['Techniques sportives et pedagogie du sport'],
    argumentsCV: ['encadrer des seances sportives pour des publics varies'],
    argumentsLettre: ['transmettre ma passion du sport avec pedagogie'],
    pistesEntretien: ['Decrire une seance que vous avez animee.'],
    synonymes: ['moniteur sportif'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'moniteur_fitness', nom: 'Moniteur de fitness', famille: 'Sport et animation', secteur: 'Sport',
    rome: null, fap: null,
    activites: ['clients'], actions: ['former', 'accompagner'],
    environnement: ['salle_sport'], valeurs: ['contact_humain', 'bonne_ambiance', 'choisir_horaires'],
    savoirFaire: [], savoirEtre: ['Communication', 'Adaptabilite', 'Motivation'],
    savoirs: ['Techniques de remise en forme'],
    argumentsCV: ['animer des cours collectifs de fitness'],
    argumentsLettre: ['transmettre mon energie et ma motivation a une clientele variee'],
    pistesEntretien: ['Decrire un cours collectif que vous animez regulierement.'],
    synonymes: ['coach sportif'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'maitre_nageur', nom: 'Maitre-nageur sauveteur', famille: 'Sport et animation', secteur: 'Sport',
    rome: null, fap: null,
    activites: ['clients', 'enfants'], actions: ['former', 'controler'],
    environnement: ['salle_sport'], valeurs: ['responsabilites', 'contact_humain'],
    savoirFaire: ['Soins'], savoirEtre: ['Securite', 'Rigueur', 'Communication'],
    savoirs: ['Techniques de sauvetage aquatique', 'Premiers secours'],
    argumentsCV: ['assurer la surveillance et l\'enseignement de la natation'],
    argumentsLettre: ['mettre ma vigilance et mon sens des responsabilites au service de la securite des baigneurs'],
    pistesEntretien: ['Decrire une intervention de securite en piscine.'],
    synonymes: ['MNS'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'animateur_evenementiel', nom: 'Animateur evenementiel', famille: 'Sport et animation', secteur: 'Evenementiel',
    rome: 'G1203', fap: null,
    activites: ['clients'], actions: ['organiser', 'informer', 'accueillir'],
    environnement: ['evenementiel'], valeurs: ['contact_humain', 'missions_variees', 'bonne_ambiance'],
    savoirFaire: ['Gestion de projet'], savoirEtre: ['Communication', 'Adaptabilite', 'Sens du service'],
    savoirs: ['Organisation d\'evenements'],
    argumentsCV: ['animer et coordonner des evenements pour un public varie'],
    argumentsLettre: ['mettre mon dynamisme au service de vos evenements'],
    pistesEntretien: ['Decrire un evenement que vous avez anime ou organise.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'technicien_son_lumiere', nom: 'Technicien son et lumiere', famille: 'Sport et animation', secteur: 'Evenementiel',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['installer', 'controler'],
    environnement: ['evenementiel'], valeurs: ['missions_variees', 'autonomie'],
    savoirFaire: ['Technique'], savoirEtre: ['Rigueur', 'Adaptabilite', 'Autonomie'],
    savoirs: ['Materiel de sonorisation et d\'eclairage'],
    argumentsCV: ['installer et regler le materiel son et lumiere d\'un evenement'],
    argumentsLettre: ['mettre ma maitrise technique au service de la reussite d\'evenements'],
    pistesEntretien: ['Decrire une installation technique realisee pour un evenement.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Sante (accessible, hors professions reglementees longues) ----------
  {
    id: 'assistant_dentaire', nom: 'Assistant dentaire', famille: 'Sante', secteur: 'Sante',
    rome: null, fap: null,
    activites: ['patients', 'documents'], actions: ['accueillir', 'aider'],
    environnement: ['sante'], valeurs: ['sentir_utile', 'contact_humain', 'stabilite'],
    savoirFaire: [], savoirEtre: ['Rigueur', 'Accueil', 'Empathie'],
    savoirs: ['Hygiene et asepsie en cabinet dentaire'],
    argumentsCV: ['assister le praticien et accueillir les patients d\'un cabinet dentaire'],
    argumentsLettre: ['mettre mon sens de l\'hygiene et de l\'accueil au service d\'un cabinet dentaire'],
    pistesEntretien: ['Decrire l\'accueil d\'un patient anxieux.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'preparateur_pharmacie', nom: 'Preparateur en pharmacie', famille: 'Sante', secteur: 'Sante',
    rome: null, fap: null,
    activites: ['clients', 'produits'], actions: ['conseiller', 'vendre'],
    environnement: ['sante', 'magasin'], valeurs: ['sentir_utile', 'stabilite', 'contact_humain'],
    savoirFaire: ['Conseil'], savoirEtre: ['Rigueur', 'Relation client', 'Ecoute'],
    savoirs: ['Connaissance des medicaments courants'],
    argumentsCV: ['delivrer des medicaments et conseiller une clientele en pharmacie'],
    argumentsLettre: ['mettre ma rigueur au service de la sante des patients'],
    pistesEntretien: ['Decrire un conseil apporte a un client en pharmacie.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'brancardier', nom: 'Brancardier', famille: 'Sante', secteur: 'Sante',
    rome: null, fap: null,
    activites: ['patients'], actions: ['transporter', 'aider'],
    environnement: ['sante'], valeurs: ['sentir_utile', 'stabilite'],
    savoirFaire: [], savoirEtre: ['Empathie', 'Securite', 'Endurance'],
    savoirs: ['Manutention et transport de patients'],
    argumentsCV: ['assurer le transport des patients au sein d\'un etablissement de sante'],
    argumentsLettre: ['mettre mon sens du service au coeur d\'un etablissement de sante'],
    pistesEntretien: ['Decrire une situation de prise en charge d\'un patient.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Immobilier / Banque / Assurance / Culture ----------
  {
    id: 'agent_immobilier', nom: 'Agent immobilier', famille: 'Immobilier et finance', secteur: 'Immobilier',
    rome: 'C1504', fap: null,
    activites: ['clients', 'documents'], actions: ['negocier', 'conseiller', 'vendre'],
    environnement: ['bureau'], valeurs: ['evolution', 'autonomie', 'salaire'],
    savoirFaire: ['Negociation', 'Conseil'], savoirEtre: ['Relation client', 'Communication', 'Autonomie'],
    savoirs: ['Droit immobilier de base', 'Marche immobilier local'],
    argumentsCV: ['accompagner des clients dans leurs projets immobiliers'],
    argumentsLettre: ['mettre mon sens de la negociation au service de vos projets immobiliers'],
    pistesEntretien: ['Decrire une transaction immobiliere menee.'],
    synonymes: ['negociateur immobilier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'conseiller_bancaire', nom: 'Conseiller bancaire', famille: 'Immobilier et finance', secteur: 'Banque',
    rome: null, fap: null,
    activites: ['clients', 'documents', 'ordinateur'], actions: ['conseiller', 'vendre', 'gerer'],
    environnement: ['bureau'], valeurs: ['stabilite', 'evolution', 'contact_humain'],
    savoirFaire: ['Conseil', 'Gestion administrative'], savoirEtre: ['Relation client', 'Rigueur', 'Communication'],
    savoirs: ['Produits bancaires et financiers de base'],
    argumentsCV: ['conseiller une clientele sur ses produits bancaires'],
    argumentsLettre: ['mettre ma rigueur et mon sens du conseil au service d\'une clientele bancaire'],
    pistesEntretien: ['Decrire un conseil bancaire apporte a un client.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'agent_assurance', nom: 'Agent d\'assurance', famille: 'Immobilier et finance', secteur: 'Assurance',
    rome: null, fap: null,
    activites: ['clients', 'documents'], actions: ['conseiller', 'vendre', 'gerer'],
    environnement: ['bureau'], valeurs: ['stabilite', 'evolution'],
    savoirFaire: ['Conseil', 'Negociation'], savoirEtre: ['Relation client', 'Communication', 'Rigueur'],
    savoirs: ['Produits d\'assurance de base'],
    argumentsCV: ['conseiller et accompagner une clientele en matiere d\'assurance'],
    argumentsLettre: ['mettre mon sens du conseil au service de la protection de vos clients'],
    pistesEntretien: ['Decrire une souscription d\'assurance accompagnee.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'bibliothecaire', nom: 'Bibliothecaire', famille: 'Culture', secteur: 'Culture',
    rome: null, fap: null,
    activites: ['clients', 'documents'], actions: ['classer', 'informer', 'conseiller'],
    environnement: ['administration'], valeurs: ['calme', 'metier_sens', 'stabilite'],
    savoirFaire: ['Gestion administrative'], savoirEtre: ['Organisation', 'Sens du service', 'Rigueur'],
    savoirs: ['Classification documentaire'],
    argumentsCV: ['gerer les collections et accueillir le public d\'une bibliotheque'],
    argumentsLettre: ['mettre mon organisation et mon gout pour la culture au service du public'],
    pistesEntretien: ['Decrire une animation ou un conseil de lecture propose au public.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Environnement / Energie ----------
  {
    id: 'technicien_eolien', nom: 'Technicien de maintenance eolienne', famille: 'Energie et environnement', secteur: 'Energie',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['reparer', 'diagnostiquer', 'controler'],
    environnement: ['exterieur'], valeurs: ['exterieur', 'evolution', 'missions_variees'],
    savoirFaire: ['Technique', 'Maintenance', 'Diagnostic'], savoirEtre: ['Securite', 'Rigueur', 'Autonomie'],
    savoirs: ['Fonctionnement des eoliennes', 'Travail en hauteur'],
    argumentsCV: ['assurer la maintenance d\'installations eoliennes'],
    argumentsLettre: ['contribuer au developpement des energies renouvelables'],
    pistesEntretien: ['Decrire une intervention de maintenance en hauteur.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'agent_collecte_dechets', nom: 'Agent de collecte des dechets', famille: 'Energie et environnement', secteur: 'Environnement',
    rome: null, fap: null,
    activites: ['vehicules', 'exterieur'], actions: ['transporter', 'nettoyer'],
    environnement: ['exterieur', 'route'], valeurs: ['exterieur', 'horaires_fixes', 'metier_sens'],
    savoirFaire: [], savoirEtre: ['Endurance', 'Securite', 'Rigueur'],
    savoirs: ['Tri et gestion des dechets'],
    argumentsCV: ['assurer la collecte et le tri des dechets dans le respect des consignes de securite'],
    argumentsLettre: ['contribuer a la proprete et a la gestion environnementale du territoire'],
    pistesEntretien: ['Decrire l\'organisation d\'une tournee de collecte.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'technicien_eaux', nom: 'Technicien de traitement des eaux', famille: 'Energie et environnement', secteur: 'Environnement',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['controler', 'diagnostiquer'],
    environnement: ['exterieur', 'usine'], valeurs: ['stabilite', 'metier_sens'],
    savoirFaire: ['Diagnostic', 'Technique'], savoirEtre: ['Rigueur', 'Securite'],
    savoirs: ['Traitement et analyse de l\'eau'],
    argumentsCV: ['assurer le suivi et le controle d\'installations de traitement des eaux'],
    argumentsLettre: ['contribuer a la qualite et a la gestion des ressources en eau'],
    pistesEntretien: ['Decrire un controle de qualite de l\'eau realise.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Administration / collectivite ----------
  {
    id: 'agent_polyvalent_collectivite', nom: 'Agent polyvalent de collectivite', famille: 'Administration et gestion', secteur: 'Collectivites',
    rome: null, fap: null,
    activites: ['documents', 'exterieur', 'clients'], actions: ['organiser', 'nettoyer', 'accueillir'],
    environnement: ['administration', 'exterieur'], valeurs: ['stabilite', 'missions_variees'],
    savoirFaire: [], savoirEtre: ['Adaptabilite', 'Organisation', 'Sens du service'],
    savoirs: ['Fonctionnement des services publics locaux'],
    argumentsCV: ['assurer des missions polyvalentes au service d\'une collectivite'],
    argumentsLettre: ['mettre ma polyvalence au service d\'une collectivite locale'],
    pistesEntretien: ['Decrire la diversite des missions realisees au sein d\'une collectivite.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  }
];

// TACHE 32 : integration sans modifier le moteur existant. baseMetiers
// (metiers.js, "const" mais tableau mutable) recoit les nouveaux metiers ;
// BASE_CONNAISSANCES_ERIP.metiers (qui reference le meme tableau) en
// beneficie automatiquement, de meme que rechercherMetiers/analyserCV/etc.
REFERENTIEL_METIERS_ERIP.forEach(function (m) { baseMetiers.push(m); });
