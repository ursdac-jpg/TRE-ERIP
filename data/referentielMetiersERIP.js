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
    argumentsCV: ['travailler en extérieur au rythme des saisons viticoles'],
    argumentsLettre: ['contribuer à la production viticole locale, un secteur qui me tient à cœur'],
    pistesEntretien: ['Décrire une tâche viticole réalisée au fil des saisons (taille, vendanges, entretien du sol).'],
    synonymes: ['ouvrier viticole', 'exploitant viticole'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'arboriculteur', nom: 'Arboriculteur', famille: 'Agriculture et viticulture', secteur: 'Agriculture',
    rome: 'A1401', fap: null,
    activites: ['exterieur', 'outils'], actions: ['construire'],
    environnement: ['exploitation_agricole', 'exterieur', 'espaces_verts'], valeurs: ['exterieur', 'autonomie'],
    savoirFaire: ['Travail manuel', 'Technique'], savoirEtre: ['Endurance', 'Adaptabilité'],
    savoirs: ['Cycle des arbres fruitiers', 'Techniques de taille et de traitement'],
    argumentsCV: ['entretenir des vergers dans le respect des cycles naturels'],
    argumentsLettre: ['mettre mon goût du travail en extérieur au service de la production fruitière'],
    pistesEntretien: ['Expliquer les principales tâches saisonnières en arboriculture.'],
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
    argumentsLettre: ['exercer un métier de plein air en lien avec la biodiversité'],
    pistesEntretien: ['Décrire le suivi d\'une ruche sur une saison.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'chef_de_culture', nom: 'Chef de culture viticole', famille: 'Agriculture et viticulture', secteur: 'Viticulture',
    rome: null, fap: null,
    activites: ['exterieur', 'outils', 'collegues'], actions: ['organiser', 'gerer', 'construire'],
    environnement: ['exploitation_agricole', 'exterieur'], valeurs: ['responsabilites', 'autonomie', 'metier_sens'],
    savoirFaire: ['Planification', 'Gestion de projet', 'Technique'], savoirEtre: ['Responsabilité', 'Organisation', 'Leadership'],
    savoirs: ['Cycle de la vigne', 'Encadrement d\'équipe agricole'],
    argumentsCV: ['coordonner les travaux viticoles sur l\'ensemble d\'une exploitation'],
    argumentsLettre: ['mettre mon expérience du terrain au service de l\'encadrement d\'une équipe viticole'],
    pistesEntretien: ['Décrire une situation d\'organisation du travail d\'une équipe sur une exploitation.'],
    synonymes: ['responsable d\'exploitation viticole'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Restauration ----------
  {
    id: 'patissier', nom: 'Pâtissier', famille: 'Hôtellerie-restauration', secteur: 'Artisanat alimentaire',
    rome: 'D1104', fap: null,
    activites: ['clients', 'outils'], actions: ['cuisiner', 'creer'],
    environnement: ['cuisine'], valeurs: ['metier_sens', 'fier_metier'],
    savoirFaire: ['Cuisine', 'Précision'], savoirEtre: ['Créativité', 'Rigueur', 'Respect des normes'],
    savoirs: ['Règles d\'hygiène alimentaire (HACCP)', 'Techniques de pâtisserie'],
    argumentsCV: ['réaliser des créations pâtissières dans le respect des normes d\'hygiène'],
    argumentsLettre: ['allier précision technique et créativité au quotidien'],
    pistesEntretien: ['Décrire une réalisation pâtissière dont vous êtes fier.'],
    synonymes: ['artisan pâtissier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'chef_cuisine', nom: 'Chef de cuisine', famille: 'Hôtellerie-restauration', secteur: 'Restauration',
    rome: null, fap: null,
    activites: ['clients', 'collegues', 'outils'], actions: ['cuisiner', 'organiser', 'creer'],
    environnement: ['cuisine'], valeurs: ['responsabilites', 'fier_metier', 'metier_sens'],
    savoirFaire: ['Cuisine', 'Gestion de projet'], savoirEtre: ['Créativité', 'Responsabilité', 'Leadership'],
    savoirs: ['Règles d\'hygiène alimentaire (HACCP)', 'Gestion d\'une brigade'],
    argumentsCV: ['encadrer une équipe en cuisine et élaborer les cartes'],
    argumentsLettre: ['mettre mon expérience culinaire au service d\'une équipe et d\'un établissement'],
    pistesEntretien: ['Décrire une carte ou un plat que vous avez conçu.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'sommelier', nom: 'Sommelier', famille: 'Hôtellerie-restauration', secteur: 'Restauration',
    rome: null, fap: null,
    activites: ['clients'], actions: ['conseiller', 'vendre'],
    environnement: ['cuisine', 'hotel'], valeurs: ['contact_humain', 'metier_sens', 'fier_metier'],
    savoirFaire: ['Conseil'], savoirEtre: ['Relation client', 'Communication', 'Sens du détail'],
    savoirs: ['Connaissance des vins et accords mets-vins'],
    argumentsCV: ['conseiller une clientèle sur le choix des vins'],
    argumentsLettre: ['partager ma connaissance des vins avec une clientèle exigeante'],
    pistesEntretien: ['Décrire un accord mets-vins que vous recommanderiez.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- BTP ----------
  {
    id: 'charpentier', nom: 'Charpentier', famille: 'BTP', secteur: 'BTP',
    rome: 'F1503', fap: null,
    activites: ['outils', 'exterieur'], actions: ['construire', 'monter'],
    environnement: ['exterieur'], valeurs: ['exterieur', 'fier_metier'],
    savoirFaire: ['Bâtiment', 'Lecture de plans', 'Travail manuel'], savoirEtre: ['Précision', 'Sécurité'],
    savoirs: ['Normes de sécurité sur chantier'],
    argumentsCV: ['realiser des ouvrages en bois dans le respect des plans et des normes'],
    argumentsLettre: ['mettre mon savoir-faire manuel au service de projets de construction'],
    pistesEntretien: ['Décrire un ouvrage en charpente que vous avez réalisé.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'carreleur', nom: 'Carreleur', famille: 'BTP', secteur: 'BTP',
    rome: null, fap: null,
    activites: ['outils'], actions: ['construire', 'monter'],
    environnement: ['exterieur'], valeurs: ['fier_metier'],
    savoirFaire: ['Travail manuel', 'Précision'], savoirEtre: ['Rigueur', 'Sens du détail'],
    savoirs: ['Techniques de pose de carrelage'],
    argumentsCV: ['réaliser des poses de carrelage soignées'],
    argumentsLettre: ['apporter un travail minutieux sur des chantiers variés'],
    pistesEntretien: ['Décrire une pose de carrelage complexe réalisée.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'chef_chantier', nom: 'Chef de chantier', famille: 'BTP', secteur: 'BTP',
    rome: null, fap: null,
    activites: ['collegues', 'outils'], actions: ['organiser', 'gerer', 'construire'],
    environnement: ['exterieur'], valeurs: ['responsabilites', 'fier_metier'],
    savoirFaire: ['Planification', 'Bâtiment', 'Lecture de plans'], savoirEtre: ['Responsabilité', 'Leadership', 'Organisation'],
    savoirs: ['Normes de sécurité sur chantier', 'Coordination d\'équipe BTP'],
    argumentsCV: ['coordonner une équipe et le suivi d\'un chantier'],
    argumentsLettre: ['mettre mon expérience du terrain au service de l\'encadrement de chantier'],
    pistesEntretien: ['Décrire une situation de coordination d\'équipe sur un chantier.'],
    synonymes: ['conducteur de travaux junior'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'grutier', nom: 'Grutier', famille: 'BTP', secteur: 'BTP',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['conduire'],
    environnement: ['exterieur'], valeurs: ['autonomie', 'pas_physique'],
    savoirFaire: ['Conduite', 'Technique'], savoirEtre: ['Sécurité', 'Rigueur', 'Autonomie'],
    savoirs: ['Consignes de sécurité de levage'],
    argumentsCV: ['assurer la conduite d\'une grue en respectant les consignes de sécurité'],
    argumentsLettre: ['exercer un métier technique nécessitant précision et vigilance'],
    pistesEntretien: ['Décrire une manœuvre de levage délicate.'],
    synonymes: ['conducteur de grue'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'monteur_reseaux_electriques', nom: 'Monteur de réseaux électriques', famille: 'BTP', secteur: 'Énergie',
    rome: 'F1608', fap: null,
    activites: ['outils', 'exterieur'], actions: ['installer', 'construire'],
    environnement: ['exterieur'], valeurs: ['exterieur', 'fier_metier'],
    savoirFaire: ['Technique', 'Réparation'], savoirEtre: ['Sécurité', 'Rigueur'],
    savoirs: ['Normes électriques', 'Consignes de sécurité en hauteur'],
    argumentsCV: ['installer et entretenir des réseaux électriques extérieurs'],
    argumentsLettre: ['contribuer au développement des infrastructures énergétiques locales'],
    pistesEntretien: ['Décrire une intervention sur un réseau électrique.'],
    synonymes: ['électricien réseaux'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'technicien_froid_climatisation', nom: 'Technicien froid et climatisation', famille: 'BTP', secteur: 'Industrie',
    rome: 'I1302', fap: null,
    activites: ['outils', 'machines'], actions: ['installer', 'reparer', 'diagnostiquer'],
    environnement: ['exterieur', 'usine'], valeurs: ['autonomie', 'missions_variees'],
    savoirFaire: ['Technique', 'Diagnostic', 'Réparation'], savoirEtre: ['Rigueur', 'Autonomie'],
    savoirs: ['Fluides frigorigènes et normes associées'],
    argumentsCV: ['installer et dépanner des systèmes de froid et de climatisation'],
    argumentsLettre: ['exercer un métier technique en constante évolution'],
    pistesEntretien: ['Décrire un dépannage de système de climatisation.'],
    synonymes: ['frigoriste'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Industrie / Logistique ----------
  {
    id: 'technicien_qualite', nom: 'Technicien qualité', famille: 'Industrie', secteur: 'Industrie',
    rome: null, fap: null,
    activites: ['documents', 'machines'], actions: ['controler', 'analyser'],
    environnement: ['usine', 'laboratoire'], valeurs: ['calme', 'missions_variees'],
    savoirFaire: ['Diagnostic', 'Analyse de donnees'], savoirEtre: ['Rigueur', 'Sens du détail'],
    savoirs: ['Normes qualité industrielle'],
    argumentsCV: ['contrôler la conformité des produits selon les normes en vigueur'],
    argumentsLettre: ['garantir la qualité des produits par un contrôle rigoureux'],
    pistesEntretien: ['Décrire un contrôle qualité ayant permis d\'identifier un problème.'],
    synonymes: ['contrôleur qualité'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'regleur_cn', nom: 'Régleur sur machine à commande numérique', famille: 'Industrie', secteur: 'Industrie',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['programmer', 'reparer', 'diagnostiquer'],
    environnement: ['usine'], valeurs: ['missions_variees', 'autonomie'],
    savoirFaire: ['Technique', 'Précision'], savoirEtre: ['Rigueur', 'Autonomie'],
    savoirs: ['Programmation de machines à commande numérique'],
    argumentsCV: ['régler et programmer des machines à commande numérique'],
    argumentsLettre: ['exercer un métier technique au cœur de la production industrielle'],
    pistesEntretien: ['Décrire un réglage de machine réalisé.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'conducteur_ligne', nom: 'Conducteur de ligne de production', famille: 'Industrie', secteur: 'Industrie',
    rome: 'H2909', fap: null,
    activites: ['machines'], actions: ['controler', 'diagnostiquer'],
    environnement: ['usine'], valeurs: ['horaires_fixes', 'stabilite'],
    savoirFaire: ['Technique', 'Diagnostic'], savoirEtre: ['Rigueur', 'Sécurité'],
    savoirs: ['Fonctionnement d\'une ligne de production'],
    argumentsCV: ['assurer le pilotage et la surveillance d\'une ligne de production'],
    argumentsLettre: ['garantir la continuité et la qualité d\'une production industrielle'],
    pistesEntretien: ['Décrire une intervention suite à un incident sur une ligne.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'logisticien', nom: 'Logisticien', famille: 'Transport et logistique', secteur: 'Logistique',
    rome: 'N1301', fap: null,
    activites: ['marchandises', 'documents'], actions: ['organiser', 'gerer'],
    environnement: ['entrepot_logistique'], valeurs: ['missions_variees', 'responsabilites'],
    savoirFaire: ['Logistique', 'Gestion des stocks', 'Planification'], savoirEtre: ['Organisation', 'Rigueur'],
    savoirs: ['Chaîne logistique', 'Gestion des flux'],
    argumentsCV: ['organiser et optimiser les flux logistiques d\'un entrepôt'],
    argumentsLettre: ['mettre mes compétences organisationnelles au service de la chaîne logistique'],
    pistesEntretien: ['Décrire une amélioration apportée à un processus logistique.'],
    synonymes: ['gestionnaire logistique'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'agent_tri', nom: 'Agent de tri', famille: 'Transport et logistique', secteur: 'Logistique',
    rome: 'N1103', fap: null,
    activites: ['marchandises'], actions: ['controler', 'transporter'],
    environnement: ['entrepot_logistique'], valeurs: ['horaires_fixes', 'pas_physique'],
    savoirFaire: ['Gestion des stocks'], savoirEtre: ['Rigueur', 'Endurance'],
    savoirs: ['Procédures de tri logistique'],
    argumentsCV: ['assurer le tri et l\'acheminement des marchandises'],
    argumentsLettre: ['contribuer à la fluidité d\'une chaîne logistique'],
    pistesEntretien: ['Décrire une journée type en centre de tri.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'livreur_velo', nom: 'Livreur à vélo', famille: 'Transport et logistique', secteur: 'Transport',
    rome: 'N4105', fap: null,
    activites: ['vehicules', 'clients'], actions: ['transporter'],
    environnement: ['route'], valeurs: ['autonomie', 'temps_libre', 'choisir_horaires'],
    savoirFaire: ['Logistique'], savoirEtre: ['Autonomie', 'Endurance', 'Respect des délais'],
    savoirs: ['Code de la route'],
    argumentsCV: ['assurer des livraisons rapides en autonomie'],
    argumentsLettre: ['exercer une activité physique et autonome au contact de la ville'],
    pistesEntretien: ['Décrire l\'organisation d\'une tournée de livraison.'],
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
    argumentsLettre: ['mettre mes compétences administratives au service des ressources humaines'],
    pistesEntretien: ['Décrire une procédure RH que vous avez gérée.'],
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
    argumentsLettre: ['apporter mon sérieux au sein d\'un service ressources humaines'],
    pistesEntretien: ['Décrire une tâche administrative RH réalisée.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Social / Insertion / Formation ----------
  {
    id: 'conseiller_insertion_professionnelle', nom: 'Conseiller en insertion professionnelle', famille: 'Social et formation', secteur: 'Insertion professionnelle',
    rome: 'K1801', fap: null,
    activites: ['clients', 'collegues', 'ordinateur'], actions: ['conseiller', 'accompagner', 'informer'],
    environnement: ['bureau', 'administration'], valeurs: ['sentir_utile', 'contact_humain', 'metier_sens'],
    savoirFaire: ['Conseil'], savoirEtre: ['Empathie', 'Écoute', 'Communication', 'Pédagogie'],
    savoirs: ['Dispositifs d\'insertion professionnelle', 'Marché de l\'emploi'],
    argumentsCV: ['accompagner des personnes dans leur parcours d\'insertion professionnelle'],
    argumentsLettre: ['mettre mon écoute et ma pédagogie au service de l\'accompagnement des publics en insertion'],
    pistesEntretien: ['Décrire un accompagnement individuel que vous avez mené.'],
    synonymes: ['CIP', 'conseiller emploi'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'educateur_specialise', nom: 'Éducateur spécialisé', famille: 'Social et formation', secteur: 'Social',
    rome: 'K1207', fap: null,
    activites: ['enfants', 'personnes_agees', 'patients'], actions: ['accompagner', 'aider', 'former'],
    environnement: ['sante'], valeurs: ['sentir_utile', 'metier_sens', 'contact_humain'],
    savoirFaire: ['Formation'], savoirEtre: ['Empathie', 'Patience', 'Écoute', 'Bienveillance'],
    savoirs: ['Accompagnement social et educatif'],
    argumentsCV: ['accompagner des personnes en difficulté dans leur parcours de vie'],
    argumentsLettre: ['mettre mon sens de l\'écoute au service de personnes en situation de vulnérabilité'],
    pistesEntretien: ['Décrire une situation d\'accompagnement éducatif menée.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'assistant_social', nom: 'Assistant de service social', famille: 'Social et formation', secteur: 'Social',
    rome: 'K1201', fap: null,
    activites: ['clients', 'famille', 'documents'], actions: ['accompagner', 'conseiller', 'informer'],
    environnement: ['bureau', 'administration'], valeurs: ['sentir_utile', 'metier_sens'],
    savoirFaire: ['Conseil', 'Gestion administrative'], savoirEtre: ['Empathie', 'Écoute', 'Bienveillance'],
    savoirs: ['Dispositifs d\'aide sociale'],
    argumentsCV: ['accompagner des personnes dans leurs démarches sociales'],
    argumentsLettre: ['mettre mon sens de l\'écoute au service de publics en difficulté'],
    pistesEntretien: ['Décrire un accompagnement social mené de bout en bout.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'moniteur_auto_ecole', nom: 'Moniteur auto-école', famille: 'Social et formation', secteur: 'Formation',
    rome: 'K2110', fap: null,
    activites: ['eleves_etudiants', 'vehicules'], actions: ['former', 'conduire'],
    environnement: ['ecole_formation', 'route'], valeurs: ['contact_humain', 'metier_sens', 'autonomie'],
    savoirFaire: ['Formation', 'Conduite'], savoirEtre: ['Patience', 'Pédagogie', 'Sécurité'],
    savoirs: ['Code de la route', 'Pédagogie de la conduite'],
    argumentsCV: ['former des candidats à la conduite et au code de la route'],
    argumentsLettre: ['transmettre les bonnes pratiques de conduite avec patience et rigueur'],
    pistesEntretien: ['Décrire l\'accompagnement d\'un élève en difficulté.'],
    synonymes: ['enseignant de la conduite'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'aesh', nom: 'Accompagnant d\'eleves en situation de handicap (AESH)', famille: 'Social et formation', secteur: 'Éducation',
    rome: 'K2104', fap: null,
    activites: ['enfants', 'eleves_etudiants'], actions: ['accompagner', 'aider'],
    environnement: ['ecole_formation'], valeurs: ['sentir_utile', 'metier_sens', 'contact_humain'],
    savoirFaire: [], savoirEtre: ['Patience', 'Empathie', 'Bienveillance', 'Adaptabilité'],
    savoirs: ['Accompagnement du handicap en milieu scolaire'],
    argumentsCV: ['accompagner des élèves en situation de handicap dans leur scolarité'],
    argumentsLettre: ['mettre ma patience et mon adaptabilité au service d\'enfants en situation de handicap'],
    pistesEntretien: ['Décrire une situation d\'adaptation pour un élève accompagné.'],
    synonymes: ['AVS', 'auxiliaire de vie scolaire'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'garde_enfants_domicile', nom: 'Garde d\'enfants à domicile', famille: 'Services à la personne', secteur: 'Services à la personne',
    rome: null, fap: null,
    activites: ['enfants', 'famille'], actions: ['aider', 'accompagner'],
    environnement: ['domicile'], valeurs: ['sentir_utile', 'choisir_horaires', 'contact_humain'],
    savoirFaire: [], savoirEtre: ['Patience', 'Bienveillance', 'Responsabilité'],
    savoirs: ['Sécurité et éveil de l\'enfant'],
    argumentsCV: ['assurer la garde et l\'éveil d\'enfants à domicile'],
    argumentsLettre: ['mettre ma bienveillance au service de familles ayant besoin de confiance'],
    pistesEntretien: ['Décrire une activité d\'éveil proposée à un enfant gardé.'],
    synonymes: ['nourrice à domicile', 'baby-sitter'], motsCles: [], conceptsAssocies: [],
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
    argumentsCV: ['manager une équipe et piloter l\'activité commerciale d\'un magasin'],
    argumentsLettre: ['mettre mon sens du commerce et du management au service d\'un point de vente'],
    pistesEntretien: ['Décrire une action commerciale que vous avez pilotée.'],
    synonymes: ['directeur de magasin'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'merchandiseur', nom: 'Merchandiseur', famille: 'Commerce', secteur: 'Commerce',
    rome: null, fap: null,
    activites: ['marchandises', 'produits'], actions: ['organiser', 'creer'],
    environnement: ['magasin'], valeurs: ['missions_variees', 'metier_sens'],
    savoirFaire: ['Merchandising'], savoirEtre: ['Créativité', 'Sens du détail'],
    savoirs: ['Techniques de merchandising visuel'],
    argumentsCV: ['optimiser la présentation des produits en magasin'],
    argumentsLettre: ['mettre mon sens esthétique au service de la mise en valeur des produits'],
    pistesEntretien: ['Décrire une implantation produit réalisée.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Artisanat / Beauté ----------
  {
    id: 'fleuriste', nom: 'Fleuriste', famille: 'Artisanat', secteur: 'Artisanat',
    rome: 'A1408', fap: null,
    activites: ['clients', 'produits'], actions: ['creer', 'vendre', 'conseiller'],
    environnement: ['magasin'], valeurs: ['metier_sens', 'fier_metier'],
    savoirFaire: ['Merchandising'], savoirEtre: ['Créativité', 'Relation client', 'Sens du détail'],
    savoirs: ['Connaissance des fleurs et compositions florales'],
    argumentsCV: ['réaliser des compositions florales pour une clientèle variée'],
    argumentsLettre: ['mettre ma créativité au service d\'un commerce de proximité'],
    pistesEntretien: ['Décrire une composition florale réalisée pour un événement.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'estheticienne', nom: 'Esthéticienne', famille: 'Artisanat', secteur: 'Beauté',
    rome: null, fap: null,
    activites: ['clients'], actions: ['conseiller', 'vendre'],
    environnement: ['magasin'], valeurs: ['contact_humain', 'metier_sens'],
    savoirFaire: [], savoirEtre: ['Relation client', 'Sens du détail', 'Écoute'],
    savoirs: ['Techniques de soins esthétiques', 'Connaissance des produits cosmétiques'],
    argumentsCV: ['réaliser des soins esthétiques adaptés à chaque cliente'],
    argumentsLettre: ['mettre mon sens du contact et du soin au service d\'une clientèle'],
    pistesEntretien: ['Décrire un soin esthétique que vous maîtrisez particulièrement.'],
    synonymes: ['esthéticien'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'ebeniste', nom: 'Ébéniste', famille: 'Artisanat', secteur: 'Artisanat',
    rome: null, fap: null,
    activites: ['outils'], actions: ['fabriquer', 'creer'],
    environnement: ['usine'], valeurs: ['fier_metier', 'metier_sens', 'autonomie'],
    savoirFaire: ['Travail manuel', 'Précision'], savoirEtre: ['Créativité', 'Sens du détail', 'Patience'],
    savoirs: ['Techniques de menuiserie fine'],
    argumentsCV: ['concevoir et réaliser des meubles sur mesure'],
    argumentsLettre: ['mettre ma passion du travail du bois au service de créations uniques'],
    pistesEntretien: ['Décrire une pièce de mobilier que vous avez réalisée.'],
    synonymes: ['menuisier d\'art'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'bijoutier', nom: 'Bijoutier', famille: 'Artisanat', secteur: 'Artisanat',
    rome: null, fap: null,
    activites: ['outils', 'clients'], actions: ['fabriquer', 'creer', 'vendre'],
    environnement: ['magasin'], valeurs: ['fier_metier', 'metier_sens'],
    savoirFaire: ['Travail manuel', 'Précision'], savoirEtre: ['Créativité', 'Sens du détail', 'Patience'],
    savoirs: ['Techniques de bijouterie'],
    argumentsCV: ['créer et réparer des bijoux avec précision'],
    argumentsLettre: ['mettre ma minutie au service d\'un artisanat de précision'],
    pistesEntretien: ['Décrire la création ou réparation d\'un bijou.'],
    synonymes: ['joaillier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'toiletteur_animalier', nom: 'Toiletteur animalier', famille: 'Artisanat', secteur: 'Services',
    rome: null, fap: null,
    activites: ['clients'], actions: ['soigner'],
    environnement: ['magasin'], valeurs: ['metier_sens', 'contact_humain'],
    savoirFaire: ['Soins'], savoirEtre: ['Patience', 'Empathie', 'Sens du détail'],
    savoirs: ['Techniques de toilettage animalier'],
    argumentsCV: ['réaliser le toilettage d\'animaux dans le respect de leur bien-être'],
    argumentsLettre: ['mettre ma patience et mon amour des animaux au service de ce métier'],
    pistesEntretien: ['Décrire le toilettage d\'un animal difficile.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Numérique / Création ----------
  {
    id: 'technicien_reseau', nom: 'Technicien réseau informatique', famille: 'Numérique', secteur: 'Numérique',
    rome: null, fap: null,
    activites: ['ordinateur', 'appareils_numeriques'], actions: ['installer', 'diagnostiquer', 'reparer'],
    environnement: ['bureau'], valeurs: ['missions_variees', 'autonomie'],
    savoirFaire: ['Technique', 'Diagnostic'], savoirEtre: ['Rigueur', 'Autonomie'],
    savoirs: ['Réseaux informatiques', 'Dépannage informatique'],
    argumentsCV: ['installer et dépanner des infrastructures réseau'],
    argumentsLettre: ['mettre mes compétences techniques au service du bon fonctionnement des réseaux'],
    pistesEntretien: ['Décrire un dépannage réseau réalisé.'],
    synonymes: ['technicien informatique'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'webmaster', nom: 'Webmaster', famille: 'Numérique', secteur: 'Numérique',
    rome: null, fap: null,
    activites: ['ordinateur'], actions: ['programmer', 'creer'],
    environnement: ['bureau', 'teletravail_domicile'], valeurs: ['teletravail', 'missions_variees', 'evolution'],
    savoirFaire: ['Technique', 'Innovation'], savoirEtre: ['Autonomie', 'Rigueur'],
    savoirs: ['Création et maintenance de sites internet'],
    argumentsCV: ['créer et maintenir des sites internet'],
    argumentsLettre: ['mettre mes compétences numériques au service de projets web'],
    pistesEntretien: ['Décrire un site internet que vous avez créé ou maintenu.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'community_manager', nom: 'Community manager', famille: 'Numérique', secteur: 'Communication',
    rome: null, fap: null,
    activites: ['ordinateur', 'appareils_numeriques'], actions: ['communiquer_ecrit', 'creer', 'informer'],
    environnement: ['bureau', 'teletravail_domicile'], valeurs: ['teletravail', 'missions_variees', 'evolution'],
    savoirFaire: ['Rédaction', 'Innovation'], savoirEtre: ['Créativité', 'Communication', 'Adaptabilité'],
    savoirs: ['Réseaux sociaux et stratégie de contenu'],
    argumentsCV: ['animer les réseaux sociaux et la communauté en ligne d\'une structure'],
    argumentsLettre: ['mettre ma créativité au service de la communication digitale'],
    pistesEntretien: ['Décrire une campagne ou publication que vous avez conçue.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'graphiste', nom: 'Graphiste', famille: 'Création', secteur: 'Communication',
    rome: null, fap: null,
    activites: ['ordinateur'], actions: ['creer', 'dessiner', 'imaginer'],
    environnement: ['bureau', 'teletravail_domicile'], valeurs: ['teletravail', 'metier_sens', 'fier_metier'],
    savoirFaire: ['Expression artistique', 'Innovation'], savoirEtre: ['Créativité', 'Sens du détail'],
    savoirs: ['Logiciels de création graphique'],
    argumentsCV: ['concevoir des supports visuels pour différents supports de communication'],
    argumentsLettre: ['mettre ma créativité graphique au service de vos projets de communication'],
    pistesEntretien: ['Décrire une création graphique dont vous êtes fier.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'photographe', nom: 'Photographe', famille: 'Création', secteur: 'Communication',
    rome: null, fap: null,
    activites: ['appareils_numeriques', 'clients'], actions: ['photographier', 'creer'],
    environnement: ['route', 'evenementiel'], valeurs: ['metier_sens', 'missions_variees', 'autonomie'],
    savoirFaire: ['Expression artistique'], savoirEtre: ['Créativité', 'Sens du détail', 'Adaptabilité'],
    savoirs: ['Techniques photographiques et retouche d\'image'],
    argumentsCV: ['réaliser des reportages photographiques pour des événements ou des clients'],
    argumentsLettre: ['mettre mon regard artistique au service de vos événements ou projets'],
    pistesEntretien: ['Décrire un reportage photo réalisé.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Tourisme / Hôtellerie ----------
  {
    id: 'guide_touristique', nom: 'Guide touristique', famille: 'Tourisme', secteur: 'Tourisme',
    rome: 'G1101', fap: null,
    activites: ['clients'], actions: ['informer', 'accueillir'],
    environnement: ['aeroport_gare', 'evenementiel'], valeurs: ['contact_humain', 'metier_sens', 'missions_variees'],
    savoirFaire: ['Conseil'], savoirEtre: ['Communication', 'Accueil', 'Adaptabilité'],
    savoirs: ['Patrimoine et culture locale'],
    argumentsCV: ['faire découvrir le patrimoine local à des visiteurs variés'],
    argumentsLettre: ['partager ma connaissance du territoire avec des visiteurs'],
    pistesEntretien: ['Décrire une visite guidée que vous avez animée.'],
    synonymes: ['guide-conférencier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'concierge_hotel', nom: 'Concierge d\'hôtel', famille: 'Tourisme', secteur: 'Hôtellerie',
    rome: null, fap: null,
    activites: ['clients'], actions: ['accueillir', 'informer', 'conseiller'],
    environnement: ['hotel'], valeurs: ['contact_humain', 'metier_sens'],
    savoirFaire: [], savoirEtre: ['Accueil', 'Sens du service', 'Communication'],
    savoirs: ['Offre touristique locale'],
    argumentsCV: ['accueillir et conseiller une clientèle hôtelière exigeante'],
    argumentsLettre: ['mettre mon sens du service au cœur de l\'expérience client'],
    pistesEntretien: ['Décrire une demande client particulière que vous avez satisfaite.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'chef_reception', nom: 'Chef de reception', famille: 'Tourisme', secteur: 'Hôtellerie',
    rome: null, fap: null,
    activites: ['clients', 'collegues'], actions: ['organiser', 'accueillir', 'gerer'],
    environnement: ['hotel'], valeurs: ['responsabilites', 'contact_humain'],
    savoirFaire: ['Gestion administrative', 'Planification'], savoirEtre: ['Leadership', 'Accueil', 'Organisation'],
    savoirs: ['Gestion hôtelière'],
    argumentsCV: ['coordonner l\'équipe de réception et l\'accueil de la clientèle'],
    argumentsLettre: ['mettre mon expérience de l\'accueil au service du management d\'une équipe'],
    pistesEntretien: ['Décrire une situation de gestion d\'équipe en réception.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Sport ----------
  {
    id: 'educateur_sportif', nom: 'Éducateur sportif', famille: 'Sport et animation', secteur: 'Sport',
    rome: 'G1204', fap: null,
    activites: ['enfants', 'eleves_etudiants', 'clients'], actions: ['former', 'accompagner'],
    environnement: ['salle_sport'], valeurs: ['contact_humain', 'metier_sens', 'bonne_ambiance'],
    savoirFaire: ['Formation'], savoirEtre: ['Pédagogie', 'Communication', 'Adaptabilité'],
    savoirs: ['Techniques sportives et pédagogie du sport'],
    argumentsCV: ['encadrer des séances sportives pour des publics variés'],
    argumentsLettre: ['transmettre ma passion du sport avec pédagogie'],
    pistesEntretien: ['Décrire une séance que vous avez animée.'],
    synonymes: ['moniteur sportif'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'moniteur_fitness', nom: 'Moniteur de fitness', famille: 'Sport et animation', secteur: 'Sport',
    rome: null, fap: null,
    activites: ['clients'], actions: ['former', 'accompagner'],
    environnement: ['salle_sport'], valeurs: ['contact_humain', 'bonne_ambiance', 'choisir_horaires'],
    savoirFaire: [], savoirEtre: ['Communication', 'Adaptabilité', 'Motivation'],
    savoirs: ['Techniques de remise en forme'],
    argumentsCV: ['animer des cours collectifs de fitness'],
    argumentsLettre: ['transmettre mon énergie et ma motivation à une clientèle variée'],
    pistesEntretien: ['Décrire un cours collectif que vous animez régulièrement.'],
    synonymes: ['coach sportif'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'maitre_nageur', nom: 'Maître-nageur sauveteur', famille: 'Sport et animation', secteur: 'Sport',
    rome: null, fap: null,
    activites: ['clients', 'enfants'], actions: ['former', 'controler'],
    environnement: ['salle_sport'], valeurs: ['responsabilites', 'contact_humain'],
    savoirFaire: ['Soins'], savoirEtre: ['Sécurité', 'Rigueur', 'Communication'],
    savoirs: ['Techniques de sauvetage aquatique', 'Premiers secours'],
    argumentsCV: ['assurer la surveillance et l\'enseignement de la natation'],
    argumentsLettre: ['mettre ma vigilance et mon sens des responsabilités au service de la sécurité des baigneurs'],
    pistesEntretien: ['Décrire une intervention de sécurité en piscine.'],
    synonymes: ['MNS'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'animateur_evenementiel', nom: 'Animateur evenementiel', famille: 'Sport et animation', secteur: 'Événementiel',
    rome: 'G1203', fap: null,
    activites: ['clients'], actions: ['organiser', 'informer', 'accueillir'],
    environnement: ['evenementiel'], valeurs: ['contact_humain', 'missions_variees', 'bonne_ambiance'],
    savoirFaire: ['Gestion de projet'], savoirEtre: ['Communication', 'Adaptabilité', 'Sens du service'],
    savoirs: ['Organisation d\'événements'],
    argumentsCV: ['animer et coordonner des événements pour un public varié'],
    argumentsLettre: ['mettre mon dynamisme au service de vos événements'],
    pistesEntretien: ['Décrire un événement que vous avez animé ou organisé.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'technicien_son_lumiere', nom: 'Technicien son et lumière', famille: 'Sport et animation', secteur: 'Événementiel',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['installer', 'controler'],
    environnement: ['evenementiel'], valeurs: ['missions_variees', 'autonomie'],
    savoirFaire: ['Technique'], savoirEtre: ['Rigueur', 'Adaptabilité', 'Autonomie'],
    savoirs: ['Matériel de sonorisation et d\'éclairage'],
    argumentsCV: ['installer et régler le matériel son et lumière d\'un événement'],
    argumentsLettre: ['mettre ma maîtrise technique au service de la réussite d\'événements'],
    pistesEntretien: ['Décrire une installation technique réalisée pour un événement.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Santé (accessible, hors professions reglementees longues) ----------
  {
    id: 'assistant_dentaire', nom: 'Assistant dentaire', famille: 'Santé', secteur: 'Santé',
    rome: null, fap: null,
    activites: ['patients', 'documents'], actions: ['accueillir', 'aider'],
    environnement: ['sante'], valeurs: ['sentir_utile', 'contact_humain', 'stabilite'],
    savoirFaire: [], savoirEtre: ['Rigueur', 'Accueil', 'Empathie'],
    savoirs: ['Hygiène et asepsie en cabinet dentaire'],
    argumentsCV: ['assister le praticien et accueillir les patients d\'un cabinet dentaire'],
    argumentsLettre: ['mettre mon sens de l\'hygiène et de l\'accueil au service d\'un cabinet dentaire'],
    pistesEntretien: ['Décrire l\'accueil d\'un patient anxieux.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'preparateur_pharmacie', nom: 'Préparateur en pharmacie', famille: 'Santé', secteur: 'Santé',
    rome: null, fap: null,
    activites: ['clients', 'produits'], actions: ['conseiller', 'vendre'],
    environnement: ['sante', 'magasin'], valeurs: ['sentir_utile', 'stabilite', 'contact_humain'],
    savoirFaire: ['Conseil'], savoirEtre: ['Rigueur', 'Relation client', 'Écoute'],
    savoirs: ['Connaissance des médicaments courants'],
    argumentsCV: ['délivrer des médicaments et conseiller une clientèle en pharmacie'],
    argumentsLettre: ['mettre ma rigueur au service de la santé des patients'],
    pistesEntretien: ['Décrire un conseil apporté à un client en pharmacie.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'brancardier', nom: 'Brancardier', famille: 'Santé', secteur: 'Santé',
    rome: null, fap: null,
    activites: ['patients'], actions: ['transporter', 'aider'],
    environnement: ['sante'], valeurs: ['sentir_utile', 'stabilite'],
    savoirFaire: [], savoirEtre: ['Empathie', 'Sécurité', 'Endurance'],
    savoirs: ['Manutention et transport de patients'],
    argumentsCV: ['assurer le transport des patients au sein d\'un établissement de santé'],
    argumentsLettre: ['mettre mon sens du service au cœur d\'un établissement de santé'],
    pistesEntretien: ['Décrire une situation de prise en charge d\'un patient.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Immobilier / Banque / Assurance / Culture ----------
  {
    id: 'agent_immobilier', nom: 'Agent immobilier', famille: 'Immobilier et finance', secteur: 'Immobilier',
    rome: 'C1504', fap: null,
    activites: ['clients', 'documents'], actions: ['negocier', 'conseiller', 'vendre'],
    environnement: ['bureau'], valeurs: ['evolution', 'autonomie', 'salaire'],
    savoirFaire: ['Négociation', 'Conseil'], savoirEtre: ['Relation client', 'Communication', 'Autonomie'],
    savoirs: ['Droit immobilier de base', 'Marché immobilier local'],
    argumentsCV: ['accompagner des clients dans leurs projets immobiliers'],
    argumentsLettre: ['mettre mon sens de la négociation au service de vos projets immobiliers'],
    pistesEntretien: ['Décrire une transaction immobilière menée.'],
    synonymes: ['négociateur immobilier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'conseiller_bancaire', nom: 'Conseiller bancaire', famille: 'Immobilier et finance', secteur: 'Banque',
    rome: null, fap: null,
    activites: ['clients', 'documents', 'ordinateur'], actions: ['conseiller', 'vendre', 'gerer'],
    environnement: ['bureau'], valeurs: ['stabilite', 'evolution', 'contact_humain'],
    savoirFaire: ['Conseil', 'Gestion administrative'], savoirEtre: ['Relation client', 'Rigueur', 'Communication'],
    savoirs: ['Produits bancaires et financiers de base'],
    argumentsCV: ['conseiller une clientèle sur ses produits bancaires'],
    argumentsLettre: ['mettre ma rigueur et mon sens du conseil au service d\'une clientèle bancaire'],
    pistesEntretien: ['Décrire un conseil bancaire apporté à un client.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'agent_assurance', nom: 'Agent d\'assurance', famille: 'Immobilier et finance', secteur: 'Assurance',
    rome: null, fap: null,
    activites: ['clients', 'documents'], actions: ['conseiller', 'vendre', 'gerer'],
    environnement: ['bureau'], valeurs: ['stabilite', 'evolution'],
    savoirFaire: ['Conseil', 'Négociation'], savoirEtre: ['Relation client', 'Communication', 'Rigueur'],
    savoirs: ['Produits d\'assurance de base'],
    argumentsCV: ['conseiller et accompagner une clientèle en matière d\'assurance'],
    argumentsLettre: ['mettre mon sens du conseil au service de la protection de vos clients'],
    pistesEntretien: ['Décrire une souscription d\'assurance accompagnée.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'bibliothecaire', nom: 'Bibliothécaire', famille: 'Culture', secteur: 'Culture',
    rome: null, fap: null,
    activites: ['clients', 'documents'], actions: ['classer', 'informer', 'conseiller'],
    environnement: ['administration'], valeurs: ['calme', 'metier_sens', 'stabilite'],
    savoirFaire: ['Gestion administrative'], savoirEtre: ['Organisation', 'Sens du service', 'Rigueur'],
    savoirs: ['Classification documentaire'],
    argumentsCV: ['gérer les collections et accueillir le public d\'une bibliothèque'],
    argumentsLettre: ['mettre mon organisation et mon goût pour la culture au service du public'],
    pistesEntretien: ['Décrire une animation ou un conseil de lecture proposé au public.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Environnement / Énergie ----------
  {
    id: 'technicien_eolien', nom: 'Technicien de maintenance éolienne', famille: 'Énergie et environnement', secteur: 'Énergie',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['reparer', 'diagnostiquer', 'controler'],
    environnement: ['exterieur'], valeurs: ['exterieur', 'evolution', 'missions_variees'],
    savoirFaire: ['Technique', 'Maintenance', 'Diagnostic'], savoirEtre: ['Sécurité', 'Rigueur', 'Autonomie'],
    savoirs: ['Fonctionnement des éoliennes', 'Travail en hauteur'],
    argumentsCV: ['assurer la maintenance d\'installations éoliennes'],
    argumentsLettre: ['contribuer au développement des énergies renouvelables'],
    pistesEntretien: ['Décrire une intervention de maintenance en hauteur.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'agent_collecte_dechets', nom: 'Agent de collecte des dechets', famille: 'Énergie et environnement', secteur: 'Environnement',
    rome: null, fap: null,
    activites: ['vehicules', 'exterieur'], actions: ['transporter', 'nettoyer'],
    environnement: ['exterieur', 'route'], valeurs: ['exterieur', 'horaires_fixes', 'metier_sens'],
    savoirFaire: [], savoirEtre: ['Endurance', 'Sécurité', 'Rigueur'],
    savoirs: ['Tri et gestion des déchets'],
    argumentsCV: ['assurer la collecte et le tri des déchets dans le respect des consignes de sécurité'],
    argumentsLettre: ['contribuer à la propreté et à la gestion environnementale du territoire'],
    pistesEntretien: ['Décrire l\'organisation d\'une tournée de collecte.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'technicien_eaux', nom: 'Technicien de traitement des eaux', famille: 'Énergie et environnement', secteur: 'Environnement',
    rome: null, fap: null,
    activites: ['machines', 'outils'], actions: ['controler', 'diagnostiquer'],
    environnement: ['exterieur', 'usine'], valeurs: ['stabilite', 'metier_sens'],
    savoirFaire: ['Diagnostic', 'Technique'], savoirEtre: ['Rigueur', 'Sécurité'],
    savoirs: ['Traitement et analyse de l\'eau'],
    argumentsCV: ['assurer le suivi et le contrôle d\'installations de traitement des eaux'],
    argumentsLettre: ['contribuer à la qualité et à la gestion des ressources en eau'],
    pistesEntretien: ['Décrire un contrôle de qualité de l\'eau réalisé.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },

  // ---------- Administration / collectivite ----------
  {
    id: 'agent_polyvalent_collectivite', nom: 'Agent polyvalent de collectivite', famille: 'Administration et gestion', secteur: 'Collectivites',
    rome: null, fap: null,
    activites: ['documents', 'exterieur', 'clients'], actions: ['organiser', 'nettoyer', 'accueillir'],
    environnement: ['administration', 'exterieur'], valeurs: ['stabilite', 'missions_variees'],
    savoirFaire: [], savoirEtre: ['Adaptabilité', 'Organisation', 'Sens du service'],
    savoirs: ['Fonctionnement des services publics locaux'],
    argumentsCV: ['assurer des missions polyvalentes au service d\'une collectivité'],
    argumentsLettre: ['mettre ma polyvalence au service d\'une collectivité locale'],
    pistesEntretien: ['Décrire la diversité des missions réalisées au sein d\'une collectivité.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  // TACHE (retour utilisateur : catalogue "Animaux", point 13) : 5
  // nouveaux metiers, prealables indispensables au catalogue -- sans eux,
  // la plupart de ses entrees n'auraient eu aucun metier reel a proposer
  // derriere (seuls Apiculteur et Toiletteur animalier existaient avant).
  {
    id: 'veterinaire', nom: 'Vétérinaire', famille: 'Santé animale', secteur: 'Santé',
    rome: null, fap: null,
    activites: ['patients', 'outils'], actions: ['soigner', 'diagnostiquer'],
    environnement: ['sante'], valeurs: ['metier_sens', 'contact_humain'],
    savoirFaire: ['Diagnostic', 'Soins'], savoirEtre: ['Empathie', 'Rigueur', 'Responsabilité'],
    savoirs: ['Notions médicales de base', 'Pharmacologie'],
    argumentsCV: ['assurer le diagnostic et les soins des animaux dans le respect de leur bien-être'],
    argumentsLettre: ['mettre ma rigueur et mon empathie au service de la santé animale'],
    pistesEntretien: ['Décrire une consultation ou une intervention marquante.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'auxiliaire_veterinaire', nom: 'Auxiliaire vétérinaire', famille: 'Santé animale', secteur: 'Santé',
    rome: null, fap: null,
    activites: ['patients', 'clients'], actions: ['soigner', 'accueillir'],
    environnement: ['sante'], valeurs: ['metier_sens', 'contact_humain'],
    savoirFaire: ['Soins', 'Accueil'], savoirEtre: ['Empathie', 'Patience', 'Rigueur'],
    savoirs: ['Notions médicales de base', 'Hygiène et asepsie en cabinet vétérinaire'],
    argumentsCV: ['assister le vétérinaire et accueillir les propriétaires d\'animaux'],
    argumentsLettre: ['mettre mon sens de l\'accueil et mon amour des animaux au service d\'un cabinet vétérinaire'],
    pistesEntretien: ['Décrire l\'accueil d\'un propriétaire inquiet pour son animal.'],
    synonymes: ['ASV'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'agent_equestre', nom: 'Agent équestre / Palefrenier', famille: 'Agriculture et viticulture', secteur: 'Agriculture',
    rome: null, fap: null,
    activites: ['exterieur', 'outils'], actions: ['soigner', 'nettoyer'],
    environnement: ['exploitation_agricole', 'exterieur'], valeurs: ['exterieur', 'metier_sens'],
    savoirFaire: ['Soins', 'Entretien'], savoirEtre: ['Rigueur', 'Endurance', 'Autonomie'],
    savoirs: ['Alimentation et santé du cheval'],
    argumentsCV: ['assurer les soins quotidiens et l\'entretien des chevaux et de leurs installations'],
    argumentsLettre: ['mettre mon endurance et mon sens du soin au service d\'une structure équestre'],
    pistesEntretien: ['Décrire une journée type auprès des chevaux.'],
    synonymes: ['palefrenier', 'lad'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'eleveur', nom: 'Éleveur', famille: 'Agriculture et viticulture', secteur: 'Agriculture',
    rome: null, fap: null,
    activites: ['exterieur', 'outils'], actions: ['soigner', 'gerer'],
    environnement: ['exploitation_agricole', 'exterieur'], valeurs: ['exterieur', 'autonomie', 'metier_sens'],
    savoirFaire: ['Soins', 'Gestion administrative'], savoirEtre: ['Autonomie', 'Rigueur', 'Endurance'],
    savoirs: ['Alimentation et reproduction animale'],
    argumentsCV: ['assurer le suivi sanitaire et la gestion d\'un cheptel'],
    argumentsLettre: ['contribuer à la production animale locale, un secteur qui me tient à cœur'],
    pistesEntretien: ['Décrire une tâche d\'élevage réalisée au fil des saisons.'],
    synonymes: [], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  },
  {
    id: 'agent_animalier', nom: 'Agent animalier', famille: 'Services', secteur: 'Environnement',
    rome: null, fap: null,
    activites: ['clients', 'outils'], actions: ['soigner', 'nettoyer', 'accueillir'],
    environnement: ['espaces_verts', 'exterieur'], valeurs: ['metier_sens', 'contact_humain'],
    savoirFaire: ['Soins', 'Entretien'], savoirEtre: ['Empathie', 'Rigueur', 'Patience'],
    savoirs: ['Comportement animalier de base'],
    argumentsCV: ['assurer les soins quotidiens et l\'entretien des espaces d\'un refuge ou d\'un parc animalier'],
    argumentsLettre: ['mettre mon sens du soin et ma patience au service du bien-être animal'],
    pistesEntretien: ['Décrire une situation de prise en charge d\'un animal difficile.'],
    synonymes: ['soigneur animalier'], motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  }
];

// TACHE 32 : integration sans modifier le moteur existant. baseMetiers
// (metiers.js, "const" mais tableau mutable) recoit les nouveaux metiers ;
// BASE_CONNAISSANCES_ERIP.metiers (qui reference le meme tableau) en
// beneficie automatiquement, de meme que rechercherMetiers/analyserCV/etc.
REFERENTIEL_METIERS_ERIP.forEach(function (m) { baseMetiers.push(m); });
