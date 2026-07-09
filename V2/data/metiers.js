/* ============================================================
   metiers.js — Moteur de rapprochement métiers ERIP
   ------------------------------------------------------------
   Fichier autonome contenant :
   1. La base des fiches métiers (baseMetiers)
   2. Le moteur de score (rechercherMetiers)
   3. Le générateur d'affichage Bootstrap (genererHTMLMetiers)

   Le vocabulaire (activites, actions, environnement, valeurs,
   savoirFaire, savoirEtre) est aligné sur les identifiants et
   libellés de l'Assistant Parcours Professionnel :
   - activites : clients, machines, enfants, personnes_agees,
     collegues, seul, exterieur, magasin, bureau, deplacement
   - actions : organiser, reparer, conseiller, vendre, transporter,
     nettoyer, former, soigner, cuisiner, construire, analyser, creer
   - environnement : bureau, usine, route, domicile, magasin,
     exterieur, sante, cuisine
   - valeurs : stabilite, salaire, horaires_fixes, contact_humain,
     exterieur, evolution, autonomie, proximite

   Pour ajouter un métier : copier une fiche, adapter les champs.
   ============================================================ */

const baseMetiers = [
  {
    id: "conseiller_vente", nom: "Conseiller de vente", rome: "D1214", secteur: "Commerce",
    activites: ["clients", "magasin", "collegues", "marchandises"],
    actions: ["vendre", "conseiller"],
    environnement: ["magasin"],
    valeurs: ["contact_humain", "evolution"],
    savoirFaire: ["Merchandising", "Gestion des stocks", "Negociation", "Persuasion", "Conseil"],
    savoirEtre: ["Relation client", "Communication", "Ecoute", "Sens du service", "Accueil"],
    savoirs: ["Techniques de vente", "Connaissance des produits", "Encaissement"]
  },
  {
    id: "agent_accueil", nom: "Agent d'accueil", rome: "M1601", secteur: "Services",
    activites: ["clients", "bureau", "ordinateur", "documents"],
    actions: ["conseiller", "organiser"],
    environnement: ["bureau"],
    valeurs: ["contact_humain", "horaires_fixes"],
    savoirFaire: ["Bureautique", "Gestion administrative", "Conseil"],
    savoirEtre: ["Accueil", "Communication", "Ecoute", "Patience", "Sens du service"],
    savoirs: ["Standard telephonique", "Procedures d'accueil"]
  },
  {
    id: "teleconseiller", nom: "Teleconseiller", rome: "D1408", secteur: "Relation client",
    activites: ["clients", "bureau", "collegues", "ordinateur", "documents"],
    actions: ["conseiller", "vendre"],
    environnement: ["bureau"],
    valeurs: ["contact_humain", "horaires_fixes"],
    savoirFaire: ["Bureautique", "Negociation", "Persuasion", "Conseil"],
    savoirEtre: ["Relation client", "Communication", "Ecoute", "Patience"],
    savoirs: ["Outils informatiques", "Scripts d'appel"]
  },
  {
    id: "employe_libre_service", nom: "Employe libre-service", rome: "D1507", secteur: "Grande distribution",
    activites: ["magasin", "seul", "collegues", "marchandises"],
    actions: ["organiser", "nettoyer"],
    environnement: ["magasin"],
    valeurs: ["stabilite", "horaires_fixes", "proximite"],
    savoirFaire: ["Merchandising", "Gestion des stocks", "Entretien"],
    savoirEtre: ["Rigueur", "Organisation", "Autonomie", "Endurance"],
    savoirs: ["Rotation des produits", "Regles d'hygiene"]
  },
  {
    id: "preparateur_commandes", nom: "Preparateur de commandes / Magasinier", rome: "N1103", secteur: "Logistique",
    activites: ["machines", "seul", "collegues", "marchandises"],
    actions: ["organiser", "transporter"],
    environnement: ["usine"],
    valeurs: ["stabilite", "autonomie", "salaire"],
    savoirFaire: ["Logistique", "Gestion des stocks", "Conduite", "Planification"],
    savoirEtre: ["Rigueur", "Organisation", "Autonomie", "Respect des delais"],
    savoirs: ["CACES", "Logiciels de gestion d'entrepot"]
  },
  {
    id: "cariste", nom: "Cariste", rome: "N1101", secteur: "Logistique",
    activites: ["machines", "seul", "marchandises"],
    actions: ["transporter", "organiser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "salaire"],
    savoirFaire: ["Conduite", "Logistique", "Gestion des stocks"],
    savoirEtre: ["Rigueur", "Securite", "Autonomie"],
    savoirs: ["CACES 1-3-5", "Regles de securite entrepot"]
  },
  {
    id: "chauffeur_livreur", nom: "Chauffeur-livreur", rome: "N4105", secteur: "Transport",
    activites: ["deplacement", "seul", "clients", "marchandises", "vehicules"],
    actions: ["transporter", "organiser"],
    environnement: ["route"],
    valeurs: ["autonomie", "proximite"],
    savoirFaire: ["Conduite", "Logistique", "Planification"],
    savoirEtre: ["Autonomie", "Gestion du temps", "Respect des delais", "Sens du service"],
    savoirs: ["Code de la route", "Lecture d'itineraires"]
  },
  {
    id: "chauffeur_routier", nom: "Chauffeur routier", rome: "N4101", secteur: "Transport",
    activites: ["deplacement", "seul", "vehicules"],
    actions: ["transporter"],
    environnement: ["route"],
    valeurs: ["autonomie", "salaire"],
    savoirFaire: ["Conduite", "Logistique"],
    savoirEtre: ["Autonomie", "Fiabilite", "Respect des delais"],
    savoirs: ["Code de la route", "Reglementation des transports", "Permis C"]
  },
  {
    id: "agent_entretien", nom: "Agent d'entretien", rome: "K2204", secteur: "Proprete",
    activites: ["seul", "outils"],
    actions: ["nettoyer", "organiser"],
    environnement: ["bureau", "domicile"],
    valeurs: ["autonomie", "horaires_fixes", "proximite"],
    savoirFaire: ["Hygiene", "Entretien"],
    savoirEtre: ["Rigueur", "Autonomie", "Organisation", "Fiabilite"],
    savoirs: ["Protocoles de nettoyage", "Securite des produits"]
  },
  {
    id: "advf", nom: "Assistant de vie aux familles (ADVF)", rome: "K1302", secteur: "Services a la personne",
    activites: ["personnes_agees", "seul", "deplacement"],
    actions: ["soigner", "cuisiner", "nettoyer"],
    environnement: ["domicile"],
    valeurs: ["contact_humain", "proximite"],
    savoirFaire: ["Soins", "Hygiene", "Cuisine", "Entretien"],
    savoirEtre: ["Empathie", "Aide a la personne", "Ecoute", "Patience", "Bienveillance"],
    savoirs: ["Gestes de premiers secours", "Manutention des personnes"]
  },
  {
    id: "aide_soignant", nom: "Aide-soignant", rome: "J1501", secteur: "Sante",
    activites: ["personnes_agees", "collegues"],
    actions: ["soigner"],
    environnement: ["sante"],
    valeurs: ["contact_humain", "stabilite"],
    savoirFaire: ["Soins", "Hygiene", "Precision"],
    savoirEtre: ["Empathie", "Ecoute", "Bienveillance", "Travail en equipe"],
    savoirs: ["Protocoles de soins", "Hygiene hospitaliere", "Gestes de premiers secours"]
  },
  {
    id: "infirmier", nom: "Infirmier", rome: "J1506", secteur: "Sante",
    activites: ["personnes_agees", "collegues"],
    actions: ["soigner", "organiser", "analyser"],
    environnement: ["sante"],
    valeurs: ["contact_humain", "evolution", "salaire"],
    savoirFaire: ["Soins", "Precision", "Planification"],
    savoirEtre: ["Empathie", "Rigueur", "Responsabilite", "Travail en equipe"],
    savoirs: ["Pharmacologie", "Protocoles medicaux"]
  },
  {
    id: "auxiliaire_petite_enfance", nom: "Auxiliaire petite enfance", rome: "K1303", secteur: "Petite enfance",
    activites: ["enfants", "collegues"],
    actions: ["soigner", "former", "creer"],
    environnement: ["sante"],
    valeurs: ["contact_humain", "horaires_fixes"],
    savoirFaire: ["Soins", "Hygiene", "Transmission"],
    savoirEtre: ["Patience", "Bienveillance", "Pedagogie", "Creativite", "Securite"],
    savoirs: ["Developpement de l'enfant", "Regles de securite"]
  },
  {
    id: "animateur", nom: "Animateur", rome: "G1202", secteur: "Animation",
    activites: ["enfants", "collegues", "exterieur"],
    actions: ["former", "creer", "organiser"],
    environnement: ["exterieur"],
    valeurs: ["contact_humain", "evolution"],
    savoirFaire: ["Transmission", "Gestion de projet", "Planification"],
    savoirEtre: ["Pedagogie", "Creativite", "Communication", "Adaptabilite", "Esprit d'equipe"],
    savoirs: ["Reglementation ACM", "Techniques d'animation"]
  },
  {
    id: "formateur", nom: "Formateur / Educateur", rome: "K2111", secteur: "Formation",
    activites: ["enfants", "collegues", "bureau"],
    actions: ["former", "conseiller", "organiser"],
    environnement: ["bureau"],
    valeurs: ["contact_humain", "evolution"],
    savoirFaire: ["Formation", "Transmission", "Conseil", "Redaction"],
    savoirEtre: ["Pedagogie", "Patience", "Communication", "Ecoute"],
    savoirs: ["Ingenierie pedagogique", "Techniques d'evaluation"]
  },
  {
    id: "serveur", nom: "Serveur en restauration", rome: "G1803", secteur: "Hotellerie-restauration",
    activites: ["clients", "collegues"],
    actions: ["vendre", "conseiller"],
    environnement: ["cuisine"],
    valeurs: ["contact_humain"],
    savoirFaire: ["Negociation", "Conseil"],
    savoirEtre: ["Sens du service", "Communication", "Endurance", "Adaptabilite", "Accueil"],
    savoirs: ["Hygiene alimentaire (HACCP)", "Techniques de service", "Encaissement"]
  },
  {
    id: "cuisinier", nom: "Cuisinier / Commis de cuisine", rome: "G1602", secteur: "Hotellerie-restauration",
    activites: ["collegues", "machines"],
    actions: ["cuisiner", "organiser"],
    environnement: ["cuisine"],
    valeurs: ["evolution"],
    savoirFaire: ["Cuisine", "Hygiene", "Precision", "Planification"],
    savoirEtre: ["Rigueur", "Creativite", "Esprit d'equipe", "Endurance", "Respect des normes"],
    savoirs: ["Techniques culinaires", "Hygiene alimentaire (HACCP)"]
  },
  {
    id: "agent_production", nom: "Agent de production", rome: "H2909", secteur: "Industrie",
    activites: ["machines", "collegues"],
    actions: ["construire", "analyser", "organiser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "horaires_fixes", "salaire"],
    savoirFaire: ["Technique", "Precision", "Maintenance"],
    savoirEtre: ["Rigueur", "Esprit d'equipe", "Respect des normes", "Fiabilite"],
    savoirs: ["Regles de securite", "Procedures qualite"]
  },
  {
    id: "technicien_maintenance", nom: "Technicien de maintenance", rome: "I1304", secteur: "Industrie",
    activites: ["machines", "seul", "deplacement", "outils"],
    actions: ["reparer", "analyser"],
    environnement: ["usine"],
    valeurs: ["autonomie", "evolution", "salaire"],
    savoirFaire: ["Diagnostic", "Reparation", "Maintenance", "Technique", "Lecture de plans"],
    savoirEtre: ["Autonomie", "Rigueur", "Adaptabilite"],
    savoirs: ["Lecture de schemas", "Habilitations electriques"]
  },
  {
    id: "mecanicien", nom: "Mecanicien automobile", rome: "I1604", secteur: "Automobile",
    activites: ["machines", "seul", "vehicules", "outils"],
    actions: ["reparer", "analyser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "autonomie"],
    savoirFaire: ["Diagnostic", "Reparation", "Maintenance", "Technique", "Precision"],
    savoirEtre: ["Rigueur", "Autonomie", "Raisonnement logique"],
    savoirs: ["Mecanique automobile", "Electronique embarquee"]
  },
  {
    id: "macon", nom: "Macon", rome: "F1703", secteur: "BTP",
    activites: ["exterieur", "collegues", "machines", "outils"],
    actions: ["construire"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "salaire"],
    savoirFaire: ["Batiment", "Lecture de plans", "Travail manuel"],
    savoirEtre: ["Endurance", "Esprit d'equipe", "Securite", "Rigueur"],
    savoirs: ["Normes de construction", "Securite sur chantier"]
  },
  {
    id: "peintre", nom: "Peintre en batiment", rome: "F1606", secteur: "BTP",
    activites: ["seul", "exterieur", "outils"],
    actions: ["construire", "creer"],
    environnement: ["exterieur", "domicile"],
    valeurs: ["autonomie", "proximite"],
    savoirFaire: ["Batiment", "Travail manuel", "Precision"],
    savoirEtre: ["Rigueur", "Autonomie", "Creativite"],
    savoirs: ["Types de peintures", "Preparation des surfaces"]
  },
  {
    id: "plombier", nom: "Plombier", rome: "F1603", secteur: "BTP",
    activites: ["seul", "deplacement", "clients", "outils"],
    actions: ["reparer", "construire"],
    environnement: ["domicile", "exterieur"],
    valeurs: ["autonomie", "proximite", "salaire"],
    savoirFaire: ["Reparation", "Diagnostic", "Lecture de plans", "Travail manuel"],
    savoirEtre: ["Autonomie", "Rigueur", "Sens du service"],
    savoirs: ["Normes de plomberie", "Lecture de plans hydrauliques"]
  },
  {
    id: "electricien", nom: "Electricien", rome: "F1602", secteur: "BTP",
    activites: ["seul", "deplacement", "machines", "outils"],
    actions: ["reparer", "construire", "analyser"],
    environnement: ["exterieur", "domicile"],
    valeurs: ["autonomie", "evolution", "salaire"],
    savoirFaire: ["Technique", "Lecture de plans", "Diagnostic", "Precision"],
    savoirEtre: ["Rigueur", "Securite", "Autonomie", "Raisonnement logique"],
    savoirs: ["Normes electriques", "Lecture de schemas electriques", "Habilitations"]
  },
  {
    id: "paysagiste", nom: "Ouvrier paysagiste / Jardinier", rome: "A1203", secteur: "Espaces verts",
    activites: ["exterieur", "seul", "machines", "outils"],
    actions: ["creer", "nettoyer", "construire"],
    environnement: ["exterieur", "espaces_verts"],
    valeurs: ["exterieur", "autonomie", "proximite"],
    savoirFaire: ["Entretien", "Travail manuel", "Conduite"],
    savoirEtre: ["Endurance", "Autonomie", "Creativite", "Adaptabilite"],
    savoirs: ["Vegetaux", "Materiel motorise"]
  },
  {
    id: "ouvrier_agricole", nom: "Ouvrier agricole / viticole", rome: "A1405", secteur: "Agriculture",
    activites: ["exterieur", "collegues", "machines", "outils"],
    actions: ["transporter", "organiser", "nettoyer"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "proximite"],
    savoirFaire: ["Travail manuel", "Conduite", "Entretien"],
    savoirEtre: ["Endurance", "Adaptabilite", "Esprit d'equipe"],
    savoirs: ["Cycle de la vigne", "Materiel agricole"]
  },
  {
    id: "agent_securite", nom: "Agent de securite", rome: "K2503", secteur: "Securite",
    activites: ["seul", "magasin", "clients"],
    actions: ["analyser", "organiser"],
    environnement: ["magasin", "bureau"],
    valeurs: ["stabilite", "horaires_fixes"],
    savoirFaire: ["Planification"],
    savoirEtre: ["Securite", "Rigueur", "Fiabilite", "Responsabilite"],
    savoirs: ["CQP APS", "Consignes incendie", "Gestes de premiers secours"]
  },
  {
    id: "assistant_administratif", nom: "Assistant administratif", rome: "M1607", secteur: "Administration",
    activites: ["bureau", "seul", "collegues", "ordinateur", "documents"],
    actions: ["organiser", "analyser"],
    environnement: ["bureau"],
    valeurs: ["stabilite", "horaires_fixes"],
    savoirFaire: ["Bureautique", "Gestion administrative", "Redaction", "Planification"],
    savoirEtre: ["Organisation", "Rigueur", "Communication", "Fiabilite"],
    savoirs: ["Outils bureautiques", "Orthographe", "Procedures administratives"]
  },
  {
    id: "comptable", nom: "Comptable / Assistant comptable", rome: "M1203", secteur: "Gestion",
    activites: ["bureau", "seul", "ordinateur", "documents"],
    actions: ["analyser", "organiser"],
    environnement: ["bureau"],
    valeurs: ["stabilite", "salaire", "evolution"],
    savoirFaire: ["Analyse de donnees", "Gestion financiere", "Bureautique", "Redaction"],
    savoirEtre: ["Rigueur", "Organisation", "Raisonnement logique"],
    savoirs: ["Comptabilite generale", "Droit fiscal", "Logiciels comptables"]
  },
  {
    id: "chef_equipe", nom: "Chef d'equipe", rome: "M1302", secteur: "Encadrement",
    activites: ["collegues", "machines", "documents"],
    actions: ["organiser", "former", "analyser"],
    environnement: ["usine", "exterieur"],
    valeurs: ["evolution", "salaire"],
    savoirFaire: ["Management", "Gestion de projet", "Planification", "Formation"],
    savoirEtre: ["Leadership", "Coordination", "Responsabilite", "Travail en equipe"],
    savoirs: ["Regles de securite", "Gestion de planning"]
  },
  {
    id: "developpeur", nom: "Developpeur informatique", rome: "M1855", secteur: "Numerique",
    activites: ["bureau", "seul", "collegues", "ordinateur"],
    actions: ["analyser", "creer"],
    environnement: ["bureau"],
    valeurs: ["evolution", "autonomie", "salaire"],
    savoirFaire: ["Analyse de donnees", "Innovation", "Redaction", "Gestion de projet"],
    savoirEtre: ["Raisonnement logique", "Autonomie", "Rigueur", "Apprentissage"],
    savoirs: ["Langages de programmation", "Bases de donnees", "Methodes agiles"]
  },
  {
    id: "employe_polyvalent_restauration", nom: "Employe polyvalent de restauration / Aide de cuisine", rome: "G1603", secteur: "Restauration",
    activites: ["clients", "collegues"],
    actions: ["cuisiner", "nettoyer", "organiser"],
    environnement: ["cuisine"],
    valeurs: ["contact_humain", "proximite"],
    savoirFaire: ["Cuisine", "Hygiene", "Entretien"],
    savoirEtre: ["Adaptabilite", "Esprit d'equipe", "Endurance", "Sens du service"],
    savoirs: ["Hygiene alimentaire (HACCP)", "Preparation froide et chaude"]
  },
  {
    id: "plongeur", nom: "Plongeur en restauration", rome: "G1605", secteur: "Restauration",
    activites: ["collegues", "seul"],
    actions: ["nettoyer", "organiser"],
    environnement: ["cuisine"],
    valeurs: ["proximite", "stabilite"],
    savoirFaire: ["Hygiene", "Entretien"],
    savoirEtre: ["Endurance", "Rigueur", "Esprit d'equipe"],
    savoirs: ["Hygiene alimentaire (HACCP)", "Materiel de plonge"]
  },
  {
    id: "receptionniste", nom: "Receptionniste en hotellerie", rome: "G1703", secteur: "Hotellerie-tourisme",
    activites: ["clients", "bureau", "ordinateur", "documents"],
    actions: ["conseiller", "organiser"],
    environnement: ["bureau"],
    valeurs: ["contact_humain", "evolution"],
    savoirFaire: ["Bureautique", "Gestion administrative", "Conseil", "Planification"],
    savoirEtre: ["Accueil", "Communication", "Sens du service", "Adaptabilite"],
    savoirs: ["Anglais et langues etrangeres", "Logiciels de reservation", "Encaissement"]
  },
  {
    id: "employe_etage", nom: "Employe d'etage en hotellerie", rome: "G1501", secteur: "Hotellerie-tourisme",
    activites: ["seul", "collegues"],
    actions: ["nettoyer", "organiser"],
    environnement: ["bureau"],
    valeurs: ["horaires_fixes", "proximite"],
    savoirFaire: ["Hygiene", "Entretien"],
    savoirEtre: ["Rigueur", "Autonomie", "Fiabilite"],
    savoirs: ["Protocoles de nettoyage", "Presentation des chambres"]
  },
  {
    id: "barman", nom: "Barman / Employe de cafe", rome: "G1801", secteur: "Hotellerie-restauration",
    activites: ["clients", "collegues"],
    actions: ["vendre", "conseiller", "cuisiner"],
    environnement: ["cuisine"],
    valeurs: ["contact_humain"],
    savoirFaire: ["Cuisine", "Negociation"],
    savoirEtre: ["Sens du service", "Communication", "Endurance", "Accueil"],
    savoirs: ["Encaissement", "Regles d'hygiene", "Preparation des boissons"]
  },
  {
    id: "accueil_touristique", nom: "Agent d'accueil touristique", rome: "G1101", secteur: "Tourisme",
    activites: ["clients", "bureau", "exterieur", "ordinateur"],
    actions: ["conseiller", "organiser"],
    environnement: ["bureau", "exterieur"],
    valeurs: ["contact_humain", "exterieur"],
    savoirFaire: ["Conseil", "Planification", "Bureautique"],
    savoirEtre: ["Accueil", "Communication", "Adaptabilite", "Ecoute"],
    savoirs: ["Patrimoine local", "Anglais et langues etrangeres"]
  },
  {
    id: "ouvrier_chai", nom: "Ouvrier de chai / Agent de cave", rome: "A1413", secteur: "Viticulture",
    activites: ["machines", "collegues", "exterieur"],
    actions: ["organiser", "nettoyer", "analyser"],
    environnement: ["usine", "exterieur"],
    valeurs: ["proximite", "stabilite"],
    savoirFaire: ["Technique", "Hygiene", "Precision", "Travail manuel"],
    savoirEtre: ["Rigueur", "Esprit d'equipe", "Endurance"],
    savoirs: ["Vinification", "Hygiene alimentaire", "CACES"]
  },
  {
    id: "ouvrier_horticole", nom: "Ouvrier horticole / Maraicher", rome: "A1414", secteur: "Agriculture",
    activites: ["exterieur", "seul", "collegues", "outils"],
    actions: ["creer", "nettoyer", "organiser"],
    environnement: ["exterieur", "espaces_verts"],
    valeurs: ["exterieur", "proximite"],
    savoirFaire: ["Travail manuel", "Entretien"],
    savoirEtre: ["Endurance", "Rigueur", "Autonomie"],
    savoirs: ["Vegetaux et cycles de culture", "Techniques de plantation"]
  },
  {
    id: "conducteur_engins_agricoles", nom: "Conducteur d'engins agricoles", rome: "A1101", secteur: "Agriculture",
    activites: ["machines", "exterieur", "seul", "vehicules"],
    actions: ["transporter", "reparer"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "autonomie"],
    savoirFaire: ["Conduite", "Maintenance", "Travail manuel"],
    savoirEtre: ["Autonomie", "Rigueur", "Adaptabilite"],
    savoirs: ["Materiel agricole", "Regles de securite"]
  },
  {
    id: "operateur_agroalimentaire", nom: "Operateur de production agroalimentaire", rome: "H2102", secteur: "Agroalimentaire",
    activites: ["machines", "collegues"],
    actions: ["cuisiner", "organiser", "analyser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "horaires_fixes"],
    savoirFaire: ["Technique", "Hygiene", "Precision"],
    savoirEtre: ["Rigueur", "Esprit d'equipe", "Respect des normes"],
    savoirs: ["Hygiene alimentaire (HACCP)", "Procedures qualite"]
  },
  {
    id: "operateur_decoupe", nom: "Operateur en transformation des viandes / conserverie", rome: "H2101", secteur: "Agroalimentaire",
    activites: ["machines", "collegues"],
    actions: ["cuisiner", "analyser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "salaire"],
    savoirFaire: ["Precision", "Hygiene", "Travail manuel", "Technique"],
    savoirEtre: ["Rigueur", "Endurance", "Respect des normes"],
    savoirs: ["Decoupe", "Chaine du froid", "Tracabilite"]
  },
  {
    id: "operateur_chimie", nom: "Operateur de production chimique", rome: "H2301", secteur: "Industrie chimique",
    activites: ["machines", "collegues"],
    actions: ["analyser", "organiser"],
    environnement: ["usine"],
    valeurs: ["salaire", "stabilite", "evolution"],
    savoirFaire: ["Technique", "Precision", "Analyse de donnees"],
    savoirEtre: ["Rigueur", "Securite", "Respect des normes"],
    savoirs: ["Procedes chimiques", "Regles de securite", "CACES"]
  },
  {
    id: "soudeur", nom: "Soudeur", rome: "H2913", secteur: "Industrie",
    activites: ["machines", "seul"],
    actions: ["construire", "reparer"],
    environnement: ["usine", "exterieur"],
    valeurs: ["salaire", "stabilite"],
    savoirFaire: ["Technique", "Precision", "Travail manuel", "Lecture de plans"],
    savoirEtre: ["Rigueur", "Autonomie"],
    savoirs: ["Procedes de soudage", "Lecture de plans", "Regles de securite"]
  },
  {
    id: "usineur", nom: "Operateur d'usinage (commande numerique)", rome: "H2903", secteur: "Industrie",
    activites: ["machines", "seul"],
    actions: ["construire", "analyser"],
    environnement: ["usine"],
    valeurs: ["salaire", "evolution"],
    savoirFaire: ["Technique", "Precision", "Lecture de plans"],
    savoirEtre: ["Rigueur", "Autonomie", "Raisonnement logique"],
    savoirs: ["Machines a commande numerique", "Metrologie"]
  },
  {
    id: "ash", nom: "Agent de service hospitalier (ASH)", rome: "J1301", secteur: "Sante",
    activites: ["personnes_agees", "collegues", "seul"],
    actions: ["nettoyer", "organiser"],
    environnement: ["sante"],
    valeurs: ["stabilite", "contact_humain"],
    savoirFaire: ["Hygiene", "Entretien"],
    savoirEtre: ["Rigueur", "Bienveillance", "Esprit d'equipe"],
    savoirs: ["Hygiene hospitaliere", "Protocoles de bionettoyage"]
  },
  {
    id: "aes", nom: "Accompagnant educatif et social (AES)", rome: "K1301", secteur: "Medico-social",
    activites: ["personnes_agees", "collegues"],
    actions: ["soigner", "former"],
    environnement: ["sante", "domicile"],
    valeurs: ["contact_humain", "stabilite"],
    savoirFaire: ["Soins", "Transmission"],
    savoirEtre: ["Empathie", "Aide a la personne", "Patience", "Bienveillance", "Ecoute"],
    savoirs: ["Connaissance du handicap", "Gestes de premiers secours"]
  },
  {
    id: "menage_domicile", nom: "Employe de menage a domicile", rome: "K1304", secteur: "Services a la personne",
    activites: ["seul"],
    actions: ["nettoyer", "organiser"],
    environnement: ["domicile"],
    valeurs: ["proximite", "autonomie", "horaires_fixes"],
    savoirFaire: ["Entretien", "Hygiene", "Cuisine"],
    savoirEtre: ["Autonomie", "Fiabilite", "Rigueur"],
    savoirs: ["Produits d'entretien", "Repassage"]
  },
  {
    id: "secretaire_medicale", nom: "Secretaire medicale", rome: "M1609", secteur: "Sante",
    activites: ["bureau", "clients", "ordinateur", "documents"],
    actions: ["organiser", "conseiller"],
    environnement: ["sante", "bureau"],
    valeurs: ["stabilite", "horaires_fixes"],
    savoirFaire: ["Bureautique", "Gestion administrative", "Redaction", "Planification"],
    savoirEtre: ["Accueil", "Communication", "Ecoute", "Organisation"],
    savoirs: ["Terminologie medicale", "Logiciels de gestion de cabinet"]
  },
  {
    id: "ambulancier", nom: "Ambulancier / Auxiliaire ambulancier", rome: "J1305", secteur: "Sante",
    activites: ["deplacement", "personnes_agees", "collegues", "vehicules"],
    actions: ["transporter", "soigner"],
    environnement: ["route", "sante"],
    valeurs: ["contact_humain", "autonomie"],
    savoirFaire: ["Conduite", "Soins"],
    savoirEtre: ["Empathie", "Securite", "Sens du service"],
    savoirs: ["Gestes d'urgence", "Code de la route", "Diplome d'Etat d'ambulancier"]
  },
  {
    id: "hote_caisse", nom: "Hote de caisse", rome: "D1505", secteur: "Commerce",
    activites: ["clients", "magasin", "marchandises"],
    actions: ["vendre", "organiser"],
    environnement: ["magasin"],
    valeurs: ["contact_humain", "horaires_fixes", "proximite"],
    savoirFaire: ["Conseil"],
    savoirEtre: ["Accueil", "Relation client", "Rigueur", "Patience"],
    savoirs: ["Encaissement", "Rendu de monnaie"]
  },
  {
    id: "vendeur_alimentation", nom: "Vendeur en alimentation", rome: "D1106", secteur: "Commerce alimentaire",
    activites: ["clients", "magasin", "marchandises"],
    actions: ["vendre", "conseiller"],
    environnement: ["magasin"],
    valeurs: ["contact_humain", "proximite"],
    savoirFaire: ["Conseil", "Hygiene"],
    savoirEtre: ["Accueil", "Sens du service", "Communication"],
    savoirs: ["Hygiene alimentaire", "Encaissement", "Produits du terroir"]
  },
  {
    id: "boulanger", nom: "Boulanger", rome: "D1102", secteur: "Artisanat alimentaire",
    activites: ["seul", "machines"],
    actions: ["cuisiner", "creer"],
    environnement: ["cuisine", "magasin"],
    valeurs: ["autonomie", "proximite"],
    savoirFaire: ["Cuisine", "Precision", "Travail manuel"],
    savoirEtre: ["Rigueur", "Creativite", "Endurance"],
    savoirs: ["Panification", "Hygiene alimentaire", "Fermentation"]
  },
  {
    id: "boucher", nom: "Boucher", rome: "D1101", secteur: "Artisanat alimentaire",
    activites: ["clients", "magasin", "machines"],
    actions: ["cuisiner", "vendre", "conseiller"],
    environnement: ["magasin"],
    valeurs: ["proximite", "salaire"],
    savoirFaire: ["Precision", "Travail manuel", "Hygiene", "Conseil"],
    savoirEtre: ["Rigueur", "Relation client", "Sens du service"],
    savoirs: ["Decoupe des viandes", "Chaine du froid", "Tracabilite"]
  },
  {
    id: "coiffeur", nom: "Coiffeur", rome: "D1202", secteur: "Artisanat / Beaute",
    activites: ["clients"],
    actions: ["creer", "conseiller", "vendre"],
    environnement: ["magasin"],
    valeurs: ["contact_humain", "proximite"],
    savoirFaire: ["Precision", "Conseil"],
    savoirEtre: ["Creativite", "Relation client", "Ecoute", "Communication"],
    savoirs: ["Techniques de coiffure", "Colorimetrie", "Hygiene"]
  },
  {
    id: "manoeuvre_btp", nom: "Manoeuvre / Aide de chantier", rome: "F1704", secteur: "BTP",
    activites: ["exterieur", "collegues", "outils"],
    actions: ["construire", "transporter", "nettoyer"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "salaire"],
    savoirFaire: ["Travail manuel", "Batiment"],
    savoirEtre: ["Endurance", "Esprit d'equipe", "Securite"],
    savoirs: ["Securite sur chantier", "Outillage"]
  },
  {
    id: "menuisier_poseur", nom: "Menuisier poseur", rome: "F1607", secteur: "BTP",
    activites: ["seul", "deplacement", "clients", "outils"],
    actions: ["construire", "reparer"],
    environnement: ["domicile", "exterieur"],
    valeurs: ["autonomie", "proximite"],
    savoirFaire: ["Travail manuel", "Precision", "Lecture de plans", "Batiment"],
    savoirEtre: ["Rigueur", "Autonomie", "Sens du service"],
    savoirs: ["Menuiseries et fermetures", "Prise de mesures"]
  },
  {
    id: "plaquiste", nom: "Plaquiste", rome: "F1604", secteur: "BTP",
    activites: ["seul", "collegues", "outils"],
    actions: ["construire"],
    environnement: ["exterieur", "domicile"],
    valeurs: ["autonomie", "salaire"],
    savoirFaire: ["Batiment", "Travail manuel", "Precision", "Lecture de plans"],
    savoirEtre: ["Rigueur", "Autonomie"],
    savoirs: ["Isolation", "Materiaux de construction seche"]
  },
  {
    id: "couvreur", nom: "Couvreur", rome: "F1610", secteur: "BTP",
    activites: ["exterieur", "collegues", "outils"],
    actions: ["construire", "reparer"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "salaire"],
    savoirFaire: ["Batiment", "Travail manuel", "Lecture de plans"],
    savoirEtre: ["Endurance", "Securite", "Rigueur"],
    savoirs: ["Materiaux de couverture", "Travail en hauteur", "Zinguerie"]
  },
  {
    id: "conducteur_engins_chantier", nom: "Conducteur d'engins de chantier", rome: "F1302", secteur: "BTP",
    activites: ["machines", "exterieur", "vehicules"],
    actions: ["construire", "transporter"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "salaire"],
    savoirFaire: ["Conduite", "Technique", "Precision"],
    savoirEtre: ["Securite", "Rigueur", "Autonomie"],
    savoirs: ["CACES engins de chantier", "Lecture de plans", "Securite sur chantier"]
  },
  {
    id: "agent_maintenance_batiment", nom: "Agent de maintenance des batiments", rome: "I1203", secteur: "Maintenance",
    activites: ["seul", "deplacement", "machines", "outils"],
    actions: ["reparer", "construire", "organiser"],
    environnement: ["bureau", "domicile"],
    valeurs: ["autonomie", "stabilite"],
    savoirFaire: ["Reparation", "Maintenance", "Diagnostic", "Travail manuel", "Batiment"],
    savoirEtre: ["Autonomie", "Adaptabilite", "Sens du service"],
    savoirs: ["Electricite de base", "Plomberie de base", "Regles de securite"]
  },
  {
    id: "carrossier", nom: "Carrossier-peintre automobile", rome: "I1606", secteur: "Automobile",
    activites: ["machines", "seul", "vehicules", "outils"],
    actions: ["reparer", "creer"],
    environnement: ["usine"],
    valeurs: ["stabilite", "salaire"],
    savoirFaire: ["Reparation", "Precision", "Travail manuel", "Diagnostic"],
    savoirEtre: ["Rigueur", "Creativite"],
    savoirs: ["Peinture automobile", "Materiaux composites"]
  },
  {
    id: "conducteur_bus", nom: "Conducteur de transport en commun", rome: "N4103", secteur: "Transport",
    activites: ["clients", "deplacement", "seul", "vehicules"],
    actions: ["transporter"],
    environnement: ["route"],
    valeurs: ["stabilite", "horaires_fixes", "contact_humain"],
    savoirFaire: ["Conduite"],
    savoirEtre: ["Accueil", "Patience", "Securite", "Fiabilite"],
    savoirs: ["Permis D", "Reglementation du transport de personnes"]
  },
  {
    id: "manutentionnaire", nom: "Manutentionnaire / Agent de quai", rome: "N1105", secteur: "Logistique",
    activites: ["collegues", "seul", "marchandises"],
    actions: ["transporter", "organiser"],
    environnement: ["usine"],
    valeurs: ["salaire", "stabilite"],
    savoirFaire: ["Logistique", "Travail manuel"],
    savoirEtre: ["Endurance", "Esprit d'equipe", "Rigueur"],
    savoirs: ["Gestes et postures", "Regles de securite"]
  },
  {
    id: "agent_proprete_urbaine", nom: "Agent de proprete urbaine / Ripeur", rome: "K2303", secteur: "Environnement",
    activites: ["exterieur", "collegues"],
    actions: ["nettoyer", "transporter"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "stabilite", "horaires_fixes"],
    savoirFaire: ["Entretien", "Conduite"],
    savoirEtre: ["Endurance", "Esprit d'equipe", "Fiabilite"],
    savoirs: ["Tri des dechets", "Securite sur la voie publique"]
  }
];

/* ------------------------------------------------------------
   MOTEUR DE SCORE
   Pondération (total = 100) :
   Activités 25, Actions 25, Savoir-faire 20, Savoir-être 15,
   Savoirs 10, Valeurs + environnement 5.
   Note : si le profil ne contient aucun "savoirs" (cas actuel de
   l'application), la pondération est automatiquement redistribuée
   pour que le score reste sur 100.
   ------------------------------------------------------------ */

const PONDERATION = {
  activites: 25,
  actions: 25,
  savoirFaire: 20,
  savoirEtre: 15,
  savoirs: 10,
  valeursEnvironnement: 5
};

function normaliserTexte(texte) {
  return String(texte)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]/g, " ")
    .trim();
}

// Découpe un libellé en mots-clés normalisés (le "s" final est retiré
// pour que "clients" corresponde à "client").
function motsCles(texte) {
  return normaliserTexte(texte)
    .split(/\s+/)
    .filter(function (mot) { return mot.length >= 3; })
    .map(function (mot) {
      return mot.length > 3 && mot.charAt(mot.length - 1) === "s" ? mot.slice(0, -1) : mot;
    });
}

// Deux libellés correspondent si identiques après normalisation, ou si
// tous les mots-clés du plus court se retrouvent dans le plus long
// ("client" correspond à "Relation client", mais "reparer" ne
// correspond pas à "preparer").
function correspond(a, b) {
  var na = normaliserTexte(a);
  var nb = normaliserTexte(b);
  if (na === nb) return true;
  var motsA = motsCles(a);
  var motsB = motsCles(b);
  if (motsA.length === 0 || motsB.length === 0) return false;
  var court = motsA.length <= motsB.length ? motsA : motsB;
  var long_ = motsA.length <= motsB.length ? motsB : motsA;
  return court.every(function (mot) { return long_.indexOf(mot) !== -1; });
}

// Compare une liste du profil avec une liste du métier.
// Le taux est calculé par rapport à la plus petite des deux listes :
// si la personne a coché 2 éléments et que les 2 correspondent,
// la catégorie est pleinement couverte.
function comparerListes(listeProfil, listeMetier) {
  var profil = Array.isArray(listeProfil) ? listeProfil : [];
  var metier = Array.isArray(listeMetier) ? listeMetier : [];
  if (profil.length === 0 || metier.length === 0) {
    return { taux: 0, correspondances: [], vide: profil.length === 0 };
  }
  var correspondances = metier.filter(function (itemMetier) {
    return profil.some(function (itemProfil) { return correspond(itemProfil, itemMetier); });
  });
  var referentiel = Math.min(metier.length, profil.length);
  return {
    taux: Math.min(correspondances.length / referentiel, 1),
    correspondances: correspondances,
    vide: false
  };
}

function calculerScoreMetier(profil, metier) {
  var points = 0;
  var poidsUtilise = 0;
  var raisons = [];

  function ajouter(resultat, poids, formatRaison) {
    if (!resultat.vide) {
      points += resultat.taux * poids;
      poidsUtilise += poids;
      resultat.correspondances.forEach(function (c) { raisons.push(formatRaison(c)); });
    }
  }

  ajouter(comparerListes(profil.activites, metier.activites), PONDERATION.activites,
    function (c) { return "Vous aimez travailler " + libelleActivite(c); });
  ajouter(comparerListes(profil.actions, metier.actions), PONDERATION.actions,
    function (c) { return "Vous aimez " + normaliserTexte(c); });
  ajouter(comparerListes(profil.savoirFaire, metier.savoirFaire), PONDERATION.savoirFaire,
    function (c) { return "Savoir-faire en commun : " + c; });
  ajouter(comparerListes(profil.savoirEtre, metier.savoirEtre), PONDERATION.savoirEtre,
    function (c) { return "Savoir-etre en commun : " + c; });
  ajouter(comparerListes(profil.savoirs, metier.savoirs), PONDERATION.savoirs,
    function (c) { return "Connaissance utile : " + c; });

  var rValeurs = comparerListes(profil.valeurs, metier.valeurs);
  var rEnv = comparerListes(profil.environnement, metier.environnement);
  if (!rValeurs.vide || !rEnv.vide) {
    var tauxVE = ((rValeurs.vide ? 0 : rValeurs.taux) + (rEnv.vide ? 0 : rEnv.taux)) /
      ((rValeurs.vide ? 0 : 1) + (rEnv.vide ? 0 : 1));
    points += tauxVE * PONDERATION.valeursEnvironnement;
    poidsUtilise += PONDERATION.valeursEnvironnement;
    rEnv.correspondances.forEach(function (c) { raisons.push("Environnement souhaite : " + normaliserTexte(c)); });
    rValeurs.correspondances.forEach(function (c) { raisons.push("Valeur partagee : " + normaliserTexte(c)); });
  }

  var score = poidsUtilise > 0 ? Math.round((points / poidsUtilise) * 100) : 0;

  var copie = {};
  for (var cle in metier) { copie[cle] = metier[cle]; }
  copie.score = score;
  copie.raisons = raisons;
  return copie;
}

// Libellés lisibles pour les identifiants d'activités
function libelleActivite(id) {
  var libelles = {
    clients: "avec des clients",
    machines: "avec des machines",
    enfants: "avec des enfants",
    personnes_agees: "avec des personnes agees",
    collegues: "en equipe",
    seul: "de facon autonome",
    exterieur: "en exterieur",
    magasin: "en magasin",
    bureau: "en bureau",
    deplacement: "en deplacement"
  };
  return libelles[id] || normaliserTexte(id);
}

/* ------------------------------------------------------------
   FONCTION PRINCIPALE
   profil = { activites, actions, environnement, valeurs,
              savoirFaire, savoirEtre, savoirs } (champs facultatifs)
   Retourne les 5 meilleurs métiers (score > 0), triés.
   ------------------------------------------------------------ */

function rechercherMetiers(profil, nombreMax) {
  var max = nombreMax || 5;
  var p = profil || {};
  var profilComplet = {
    activites: p.activites || [],
    actions: p.actions || [],
    environnement: p.environnement || [],
    valeurs: p.valeurs || [],
    savoirFaire: p.savoirFaire || [],
    savoirEtre: p.savoirEtre || [],
    savoirs: p.savoirs || []
  };

  // Compatibilité : un champ "competences" non trié est fusionné
  // dans savoir-faire et savoir-être.
  if (Array.isArray(p.competences) && p.competences.length > 0) {
    profilComplet.savoirFaire = profilComplet.savoirFaire.concat(p.competences);
    profilComplet.savoirEtre = profilComplet.savoirEtre.concat(p.competences);
  }

  return baseMetiers
    .map(function (metier) { return calculerScoreMetier(profilComplet, metier); })
    .map(function (metier) {
      // "J'accepte egalement" : bonus applique uniquement aux metiers deja
      // compatibles (score > 0), pour elargir sans jamais proposer un metier
      // sans rapport avec les competences de la personne.
      if (metier.score > 0 && p.accepte && p.accepte.length) {
        var bonus = 0;
        if (p.accepte.indexOf('alimentaire') !== -1 && METIERS_ALIMENTAIRE.indexOf(metier.id) !== -1) { bonus += 10; }
        if (p.accepte.indexOf('saisonnier') !== -1 && METIERS_SAISONNIERS.indexOf(metier.id) !== -1) { bonus += 10; }
        if (bonus > 0) { metier.score = Math.min(100, metier.score + bonus); }
      }
      return metier;
    })
    .filter(function (metier) { return metier.score > 0; })
    .sort(function (a, b) { return b.score - a.score; })
    .slice(0, max);
}

/* ------------------------------------------------------------
   AFFICHAGE (Bootstrap 5)
   conteneur.innerHTML = genererHTMLMetiers(metiers);
   ------------------------------------------------------------ */

function couleurBarre(score) {
  if (score >= 70) return "bg-success";
  if (score >= 45) return "bg-info";
  if (score >= 25) return "bg-warning";
  return "bg-secondary";
}

function genererHTMLMetiers(metiers) {
  if (!metiers || metiers.length === 0) {
    return '<div class="alert alert-light border">' +
      "Aucun metier ne ressort pour le moment. " +
      "Completez davantage de choix pour affiner les resultats." +
      "</div>";
  }

  var html = "";
  metiers.forEach(function (metier) {
    var raisonsHTML = metier.raisons
      .slice(0, 4)
      .map(function (r) { return '<li class="small text-muted">&#10004; ' + r + "</li>"; })
      .join("");

    html +=
      '<div class="card mb-3 shadow-sm">' +
        '<div class="card-body">' +
          '<div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">' +
            '<h5 class="card-title mb-0">' + metier.nom + "</h5>" +
            '<a href="' + lienFicheROME(metier) + '" target="_blank" rel="noopener" ' +
  'class="badge bg-light text-dark border text-decoration-none" ' +
  'title="Voir la fiche metier sur France Travail">' +
  metier.secteur + " &middot; ROME " + metier.rome + " &#x1F517;" +
"</a>" +
          "</div>" +
          (metier.sansScore
            ? '<p class="small text-success mb-2">&#10004; Metier ouvert aux debutants, sans experience exigee.</p>'
            : '<div class="progress mb-2" style="height:18px;" role="progressbar" ' +
              'aria-valuenow="' + metier.score + '" aria-valuemin="0" aria-valuemax="100">' +
              '<div class="progress-bar ' + couleurBarre(metier.score) + '" ' +
                'style="width:' + metier.score + '%;">' +
                metier.score + " % de coherence" +
              "</div></div>") +
          (raisonsHTML
            ? '<p class="mb-1 fw-semibold small">Pourquoi ce metier ?</p>' +
              '<ul class="list-unstyled mb-0">' + raisonsHTML + "</ul>"
            : "") +
        "</div>" +
      "</div>";
  });
  return html;
}

// Lien direct vers la fiche métier MétierScope (France Travail).
// Le code ROME suffit, France Travail complète l'adresse tout seul.
function lienFicheROME(metier) {
  return "https://candidat.francetravail.fr/metierscope/fiche-metier/" + metier.rome;
}

// Retrouve une fiche de la base a partir d'un nom saisi (souple : accents,
// pluriels, correspondance partielle). Renvoie null si rien ne matche.
function metierParNom(nom) {
  var cible = normaliserTexte(nom);
  if (cible.length < 3) { return null; }
  // 1. correspondance exacte (nom court sans / ni parenthese)
  for (var i = 0; i < baseMetiers.length; i++) {
    var court = normaliserTexte(baseMetiers[i].nom.split('/')[0].split('(')[0]);
    if (court === cible || normaliserTexte(baseMetiers[i].nom) === cible) { return baseMetiers[i]; }
  }
  // 2. correspondance partielle par mots-cles
  for (var j = 0; j < baseMetiers.length; j++) {
    if (correspond(nom, baseMetiers[j].nom.split('/')[0].split('(')[0])) { return baseMetiers[j]; }
  }
  return null;
}

/* ------------------------------------------------------------
   FENETRE COMPETENCE → METIERS
   Rend cliquables les badges de competences (verts, bleus, cyan)
   sur toutes les pages. Un clic ouvre une petite fenetre avec
   les 5 metiers les plus lies a cette competence, chacun
   renvoyant vers sa fiche ROME sur France Travail.
   Aucune modification necessaire dans index.html.
   ------------------------------------------------------------ */

// Trouve les métiers les plus liés à une compétence donnée.
// Une compétence trouvée dans les savoir-faire ou les savoirs pèse
// plus lourd qu'un savoir-être (plus transversal), et une compétence
// placée en tête de liste dans la fiche compte un peu plus.
function metiersPourCompetence(competence, nombreMax) {
  var max = nombreMax || 5;
  return baseMetiers
    .map(function (metier) {
      var pertinence = 0;
      function verifier(liste, poids) {
        for (var i = 0; i < liste.length; i++) {
          if (correspond(competence, liste[i])) {
            pertinence += poids + (liste.length - i) / (liste.length * 10);
            return;
          }
        }
      }
      verifier(metier.savoirFaire, 3);
      verifier(metier.savoirEtre, 2);
      verifier(metier.savoirs, 3);
      var copie = {};
      for (var cle in metier) { copie[cle] = metier[cle]; }
      copie.pertinence = pertinence;
      return copie;
    })
    .filter(function (m) { return m.pertinence > 0; })
    .sort(function (a, b) { return b.pertinence - a.pertinence; })
    .slice(0, max);
}

function fermerFenetreCompetence() {
  var fenetre = document.getElementById('fenetreCompetence');
  if (fenetre) { fenetre.remove(); }
}

function ouvrirFenetreCompetence(competence) {
  fermerFenetreCompetence();
  var metiers = metiersPourCompetence(competence);

  var liste;
  if (metiers.length === 0) {
    liste = '<p class="text-muted mb-0">Aucun metier de la base ne mentionne ' +
      'directement cette competence pour le moment.</p>';
  } else {
    liste = metiers.map(function (m) {
      return '<a href="' + lienFicheROME(m) + '" target="_blank" rel="noopener" ' +
        'class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">' +
        '<span><strong>' + m.nom + '</strong><br>' +
        '<small class="text-muted">' + m.secteur + '</small></span>' +
        '<span class="badge bg-light text-dark border">ROME ' + m.rome + ' &#x1F517;</span>' +
        '</a>';
    }).join('');
    liste = '<div class="list-group">' + liste + '</div>' +
      '<p class="small text-muted mt-2 mb-0">Cliquez sur un metier pour ouvrir sa fiche ' +
      'France Travail dans un nouvel onglet.</p>';
  }

  var fenetre = document.createElement('div');
  fenetre.id = 'fenetreCompetence';
  fenetre.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2000;padding:1rem;';
  fenetre.innerHTML =
    '<div style="background:white;border-radius:1.5rem;max-width:520px;width:100%;' +
      'max-height:80vh;overflow-y:auto;padding:1.5rem;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div class="d-flex justify-content-between align-items-center mb-3">' +
        '<h5 class="mb-0">&#x1F4BC; Metiers lies a : <span class="badge bg-primary">' + competence + '</span></h5>' +
        '<button type="button" id="fermerCompetenceBtn" class="btn btn-sm btn-outline-secondary" ' +
          'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      liste +
    '</div>';

  document.body.appendChild(fenetre);

  // Fermeture : croix, clic sur le fond, touche Echap
  document.getElementById('fermerCompetenceBtn').addEventListener('click', fermerFenetreCompetence);
  fenetre.addEventListener('click', function (e) {
    if (e.target === fenetre) { fermerFenetreCompetence(); }
  });
  document.addEventListener('keydown', function echap(e) {
    if (e.key === 'Escape') {
      fermerFenetreCompetence();
      document.removeEventListener('keydown', echap);
    }
  });
}

// Detection automatique des clics sur les badges de competences,
// quelle que soit la page (Revelation, Resultats...).
(function () {
  if (typeof document === 'undefined') { return; }

  document.addEventListener('click', function (e) {
    var badge = e.target.closest ? e.target.closest('span.badge') : null;
    if (!badge) { return; }
    // Seuls les badges de competences sont concernes :
    // vert = savoir-etre, bleu = savoir-faire, cyan = savoirs.
    var estCompetence = badge.classList.contains('bg-success') ||
      badge.classList.contains('bg-primary') ||
      badge.classList.contains('bg-info');
    if (!estCompetence) { return; }
    // Exclusions : suggestions de loisirs et autres badges speciaux
    if (badge.classList.contains('suggestion-loisir')) { return; }
    if (badge.closest('#fenetreCompetence')) { return; }
    var texte = badge.textContent.trim();
    if (texte.length < 2) { return; }
    ouvrirFenetreCompetence(texte);
  });

  // Curseur main + effet de survol sur les badges cliquables
  var style = document.createElement('style');
  style.textContent =
    'span.badge.bg-success, span.badge.bg-primary, span.badge.bg-info { cursor: pointer; transition: 0.15s; } ' +
    'span.badge.bg-success:hover, span.badge.bg-primary:hover, span.badge.bg-info:hover ' +
    '{ transform: scale(1.07); box-shadow: 0 3px 10px rgba(0,0,0,0.25); }';
  (document.head || document.documentElement).appendChild(style);
})();
/* ------------------------------------------------------------
   METIERS ACCESSIBLES SANS EXPERIENCE
   ------------------------------------------------------------ */

var METIERS_DEBUTANTS = [
  "manoeuvre_btp", "employe_libre_service", "plongeur",
  "employe_polyvalent_restauration", "agent_entretien", "manutentionnaire",
  "preparateur_commandes", "ouvrier_agricole", "ouvrier_horticole",
  "employe_etage", "agent_proprete_urbaine", "hote_caisse",
  "menage_domicile", "ash", "agent_accueil", "teleconseiller",
  "conducteur_engins_chantier", "agent_securite", "vendeur_alimentation",
  "ouvrier_chai", "cariste"
];

// "J'accepte egalement" : metiers a retour rapide a l'emploi (Emploi alimentaire)
var METIERS_ALIMENTAIRE = [
  "preparateur_commandes", "cariste", "manutentionnaire", "chauffeur_livreur",
  "employe_libre_service", "hote_caisse", "vendeur_alimentation", "conseiller_vente",
  "serveur", "employe_polyvalent_restauration", "plongeur", "cuisinier",
  "agent_entretien", "agent_proprete_urbaine", "menage_domicile",
  "ouvrier_agricole", "ouvrier_horticole", "agent_production",
  "operateur_agroalimentaire", "manoeuvre_btp", "ash"
];

// "J'accepte egalement" : metiers saisonniers (Emploi saisonnier)
var METIERS_SAISONNIERS = [
  "ouvrier_chai", "ouvrier_agricole", "conducteur_engins_agricoles", "ouvrier_horticole",
  "serveur", "cuisinier", "employe_polyvalent_restauration", "plongeur", "barman",
  "receptionniste", "employe_etage", "accueil_touristique", "animateur"
];

function rechercherMetiersDebutants(nombreMax) {
  var max = nombreMax || 5;
  var ids = METIERS_DEBUTANTS.slice();
  for (var i = ids.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
  }
  var resultats = [];
  ids.slice(0, max).forEach(function (id) {
    var metier = null;
    for (var k = 0; k < baseMetiers.length; k++) {
      if (baseMetiers[k].id === id) { metier = baseMetiers[k]; break; }
    }
    if (metier) {
      var copie = {};
      for (var cle in metier) { copie[cle] = metier[cle]; }
      copie.sansScore = true;
      copie.raisons = [
        "Recrute sans experience prealable",
        "Formation assuree a la prise de poste"
      ];
      resultats.push(copie);
    }
  });
  return resultats;
}

function rienEteChoisi() {
  if (typeof dossier === 'undefined' || !dossier) { return true; }
  var total = (dossier.activites || []).length + (dossier.actions || []).length +
    (dossier.environnement || []).length + (dossier.valeurs || []).length +
    (dossier.loisirs || []).length + (dossier.engagements || []).length +
    (dossier.experiencesPerso || []).length;
  return total === 0 && !dossier.cvAnalyse;
}

function metiersPourAffichage() {
  if (rienEteChoisi()) { return rechercherMetiersDebutants(); }
  var resultats = rechercherMetiers(construireProfil());
  return resultats.length > 0 ? resultats : rechercherMetiersDebutants();
}

/* ------------------------------------------------------------
   ANALYSE DE CV (PDF, DOCX, TXT) - tout reste dans le navigateur
   ------------------------------------------------------------ */

function analyserCV(texte) {
  var t = ' ' + normaliserTexte(texte).replace(/\s+/g, ' ') + ' ';
  var res = { savoirFaire: [], savoirEtre: [], savoirs: [], metiers: [], langues: [], permis: null };
  function chercher(label, tableau) {
    var l = normaliserTexte(label);
    if (l.length >= 4 && t.indexOf(l) !== -1 && tableau.indexOf(label) === -1) {
      tableau.push(label);
    }
  }
  baseMetiers.forEach(function (m) {
    m.savoirFaire.forEach(function (c) { chercher(c, res.savoirFaire); });
    m.savoirEtre.forEach(function (c) { chercher(c, res.savoirEtre); });
    m.savoirs.forEach(function (c) { chercher(c, res.savoirs); });
    var nomCourt = m.nom.split('/')[0].split('(')[0].trim();
    if (nomCourt.length >= 5 && t.indexOf(normaliserTexte(nomCourt)) !== -1 &&
        res.metiers.indexOf(m.nom) === -1) {
      res.metiers.push(m.nom);
    }
  });
  // Detection des langues courantes citees dans le CV
  var languesConnues = ['Anglais', 'Espagnol', 'Allemand', 'Italien', 'Portugais', 'Russe', 'Arabe', 'Chinois', 'Neerlandais'];
  languesConnues.forEach(function (lg) {
    if (t.indexOf(normaliserTexte(lg)) !== -1) { res.langues.push(lg); }
  });
  // Detection du permis (categorie B par defaut si "permis" mentionne sans lettre)
  if (/\bpermis\b/.test(t)) {
    var cats = [];
    ['a', 'b', 'c', 'd', 'e'].forEach(function (c) {
      var re = new RegExp('permis[^.]{0,20}\\b' + c + '\\b');
      if (re.test(t)) { cats.push(c.toUpperCase()); }
    });
    if (cats.length === 0) { cats.push('B'); }
    res.permis = cats;
  }
  // TACHE 43 : extraction fiable uniquement (e-mail, telephone). Le texte
  // ORIGINAL (non normalise) est utilise, jamais la version en minuscules/sans
  // accents. Aucune tentative n'est faite pour deviner Nom/Prenom/Adresse.
  res.contact = extraireContact(texte);
  return res;
}

// TACHE 43 : extraction fiable par expression reguliere. E-mail et telephone
// uniquement — formats suffisamment standardises pour etre surs. Ne renvoie
// une valeur que si le motif est trouve avec certitude ; sinon null.
function extraireContact(texteOriginal) {
  var resultat = { email: null, telephone: null };
  var t = String(texteOriginal || '');
  var matchEmail = t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (matchEmail) { resultat.email = matchEmail[0]; }
  var matchTel = t.match(/(?:(?:\+33|0033)[\s.-]?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}/);
  if (matchTel) { resultat.telephone = matchTel[0].replace(/\s+/g, ' ').trim(); }
  return resultat;
}

function appliquerAnalyseCV(res) {
  dossier.competencesCV = res.savoirFaire.concat(res.savoirEtre);
  dossier.savoirsCV = res.savoirs.slice();
  dossier.metiersAjoutes = dossier.metiersAjoutes || [];
  res.metiers.forEach(function (m) {
    if (dossier.metiersAjoutes.indexOf(m) === -1) { dossier.metiersAjoutes.push(m); }
  });
  // Pre-remplissage des langues detectees (niveau a preciser par la personne)
  dossier.langues = dossier.langues || [];
  (res.langues || []).forEach(function (lg) {
    if (!dossier.langues.some(function (x) { return x.langue === lg; })) {
      dossier.langues.push({ langue: lg, niveau: 'B1' });
    }
  });
  // Pre-remplissage du permis detecte
  if (res.permis) {
    dossier.permis = { possede: true, categories: res.permis, vehicule: dossier.permis ? dossier.permis.vehicule : null };
  }
  // TACHE 43 : e-mail/telephone detectes avec certitude, jamais ecrases si deja connus
  dossier.identite = dossier.identite || { civilite: null, nom: '', prenom: '', adresse: '', telephone: '', email: '' };
  if (res.contact) {
    if (res.contact.email && !dossier.identite.email) { dossier.identite.email = res.contact.email; }
    if (res.contact.telephone && !dossier.identite.telephone) { dossier.identite.telephone = res.contact.telephone; }
  }
  dossier.cvAnalyse = true;
}

// ============================================================
// MOTEUR D'EXTRACTION DOCUMENTAIRE (Tache 2a)
// ------------------------------------------------------------
// Meme role que analyserReponseImport() (app.js, extraction par IA) :
// produit une sortie conforme a SPECIFICATION_IMPORT, pour traverser
// EXACTEMENT le meme pipeline ensuite (comparerDonnees() -> ecran de
// validation -> fusionnerDonnees()), sans aucune adaptation. Seule la
// METHODE d'extraction differe -- ici, expressions regulieres et
// comparaison au catalogue de metiers deja connu, pas d'IA.
//
// Nomme volontairement de facon generique ("documentaire", pas "locale") :
// demain, une partie de cette extraction pourrait reposer sur de l'OCR, un
// modele IA embarque, ou toute autre technique, sans avoir a renommer
// cette brique ni le pipeline qui la consomme.
//
// LIMITE ASSUMEE, PAS UN OUBLI : cette premiere version sait detecter, avec
// une confiance suffisante, l'e-mail/telephone, les langues (liste fixe
// connue), le permis, et les competences deja repertoriees dans la base de
// metiers. Les experiences, formations, logiciels, certifications
// distinctes, loisirs et engagements restent hors de portee d'une simple
// analyse de texte par mots-cles -- listes vides, jamais devinees. Ce
// moteur est concu pour ameliorer PROGRESSIVEMENT ces categories plus
// tard, jamais pour etre remplace par une seconde implementation.
//
// TACHE (rigueur "jamais deviner") : contrairement a l'ancien mecanisme
// (appliquerAnalyseCV(), qui affectait un niveau de langue "B1" par
// defaut et une categorie de permis "B" par defaut si aucune lettre
// n'etait trouvee), ce moteur reste plus strict sur le niveau de langue
// (jamais devine, laisse vide) mais conserve le choix "B par defaut" pour
// le permis, deja documente comme une convention raisonnable (la plupart
// des permis mentionnes sans precision sont des permis B).
function extraireDocumentaire(texte) {
  if (!(texte || '').trim()) {
    return { succes: false, erreur: 'Aucun texte disponible pour l\'analyse.' };
  }

  var t = ' ' + normaliserTexte(texte).replace(/\s+/g, ' ') + ' ';

  function chercher(label, tableau) {
    var l = normaliserTexte(label);
    if (l.length >= 4 && t.indexOf(l) !== -1 && tableau.indexOf(label) === -1) {
      tableau.push(label);
    }
  }

  // Competences : reutilise exactement la meme comparaison au catalogue
  // de metiers que l'ancien analyserCV() -- aucune logique dupliquee,
  // juste une sortie differente (conforme a SPECIFICATION_IMPORT au lieu
  // d'une ecriture directe dans dossier).
  var savoirFaire = [], savoirEtre = [], savoirs = [];
  (typeof baseMetiers !== 'undefined' ? baseMetiers : []).forEach(function (m) {
    (m.savoirFaire || []).forEach(function (c) { chercher(c, savoirFaire); });
    (m.savoirEtre || []).forEach(function (c) { chercher(c, savoirEtre); });
    (m.savoirs || []).forEach(function (c) { chercher(c, savoirs); });
  });

  // Langues : meme liste fixe que l'ancien mecanisme, mais le niveau
  // n'est plus devine (voir commentaire au-dessus de la fonction).
  var languesConnues = ['Anglais', 'Espagnol', 'Allemand', 'Italien', 'Portugais', 'Russe', 'Arabe', 'Chinois', 'Neerlandais'];
  var languesDetectees = [];
  languesConnues.forEach(function (lg) {
    if (t.indexOf(normaliserTexte(lg)) !== -1) {
      languesDetectees.push({ langue: lg, niveau: '' });
    }
  });

  // Permis : meme detection par expression reguliere que l'ancien mecanisme.
  var permisDetecte = { possede: null, categories: [], vehicule: null };
  if (/\bpermis\b/.test(t)) {
    var cats = [];
    ['a', 'b', 'c', 'd', 'e'].forEach(function (c) {
      var re = new RegExp('permis[^.]{0,20}\\b' + c + '\\b');
      if (re.test(t)) { cats.push(c.toUpperCase()); }
    });
    if (cats.length === 0) { cats.push('B'); }
    permisDetecte = { possede: true, categories: cats, vehicule: null };
  }

  // Identite : uniquement e-mail/telephone (deja fiables par expression
  // reguliere) -- jamais de tentative de deviner nom/prenom/adresse.
  var contact = extraireContact(texte);

  return {
    succes: true,
    valeurs: {
      identite: { civilite: '', nom: '', prenom: '', telephone: contact.telephone || '', email: contact.email || '', adresse: '', ville: '' },
      experiences: [],
      formations: [],
      competences: { savoirFaire: savoirFaire, savoirEtre: savoirEtre, savoirs: savoirs },
      langues: languesDetectees,
      certifications: [],
      logiciels: [],
      permis: permisDetecte,
      loisirs: [],
      engagements: [],
      informationsNonClassees: []
    }
  };
}

function chargerScript(url) {
  return new Promise(function (ok, ko) {
    var s = document.createElement('script');
    s.src = url; s.onload = ok; s.onerror = ko;
    document.head.appendChild(s);
  });
}

// ============================================================
// DETECTION INTELLIGENTE DU DOCUMENT DEPOSE (Tache 1)
// ------------------------------------------------------------
// Objectif unique de cette tache : DETECTER, jamais BLOQUER ni MODIFIER
// l'interface (Tache 2) ni le champ de depot lui-meme (accept=".pdf,.docx,
// .txt" -- l'elargir aux images fait partie de la Tache 2, pas de celle-ci).
// Ces fonctions sont pensees pour etre testables independamment de tout
// depot reel de fichier.
// ============================================================

// Seuil INDICATIF, pas une regle rigide -- sert uniquement a distinguer
// "peu de texte" de "texte detecte". Un chiffre de depart raisonnable,
// ajustable si l'usage reel montre qu'il est mal calibre (aucune science
// exacte derriere ce nombre).
var SEUIL_MOTS_PEU_DE_TEXTE = 30;

// Type de fichier, uniquement d'apres son nom -- ne prejuge jamais de son
// contenu reel (un .pdf peut etre du texte ou un scan, voir plus bas).
function detecterTypeFichier(nomFichier) {
  var nom = (nomFichier || '').toLowerCase();
  if (nom.endsWith('.txt')) { return 'txt'; }
  if (nom.endsWith('.docx')) { return 'docx'; }
  if (nom.endsWith('.pdf')) { return 'pdf'; }
  if (/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/.test(nom)) { return 'image'; }
  return 'inconnu';
}

// Evaluation PROGRESSIVE du texte extrait -- jamais un simple seuil
// binaire "assez/pas assez". 3 niveaux, comme demande : aucun, peu,
// detecte. Compte les mots plutot que les caracteres (plus robuste face a
// des espaces multiples issus de l'extraction PDF).
function evaluerNiveauTexte(texteExtrait) {
  var texte = (texteExtrait || '').trim();
  if (!texte) { return 'aucun'; }
  var nbMots = texte.split(/\s+/).filter(Boolean).length;
  if (nbMots === 0) { return 'aucun'; }
  if (nbMots < SEUIL_MOTS_PEU_DE_TEXTE) { return 'peu'; }
  return 'detecte';
}

// Construit la recommandation (jamais un blocage, sauf le cas image/scan
// certain ou l'analyse rapide n'a tout simplement aucune matiere pour
// fonctionner -- ce n'est pas une restriction arbitraire, c'est un fait
// technique : l'analyse rapide ne sait lire que du texte).
//
// niveau : 'analyse_rapide_suffisante' | 'ia_fortement_recommandee' | 'ia_uniquement'
// analyseRapideDisponible : est-ce que le parcours "Analyse rapide" a
// seulement un sens a proposer pour ce document ?
function determinerRecommandationDocument(typeFichier, niveauTexte) {
  if (typeFichier === 'image') {
    return {
      niveau: 'ia_uniquement',
      analyseRapideDisponible: false,
      message: 'Votre document est une image ou un scan. Nous vous recommandons fortement l\'analyse assistée ' +
        'par IA, beaucoup plus fiable pour ce type de document.'
    };
  }
  if (typeFichier === 'pdf') {
    if (niveauTexte === 'aucun') {
      return {
        niveau: 'ia_uniquement',
        analyseRapideDisponible: false,
        message: 'Votre document semble être un scan (aucun texte n\'a pu être lu directement). Nous vous ' +
          'recommandons l\'analyse assistée par IA.'
      };
    }
    if (niveauTexte === 'peu') {
      return {
        niveau: 'ia_fortement_recommandee',
        analyseRapideDisponible: true,
        message: 'Votre document semble contenir peu de texte directement lisible (peut-être un scan partiel ' +
          'ou une mise en page complexe). L\'analyse assistée par IA sera probablement plus fiable, mais vous ' +
          'pouvez tout de même essayer l\'analyse rapide.'
      };
    }
    return {
      niveau: 'analyse_rapide_suffisante',
      analyseRapideDisponible: true,
      message: 'Votre CV semble être un document texte. L\'analyse rapide de l\'application devrait être ' +
        'suffisante dans la plupart des cas. Vous pourrez toujours utiliser l\'analyse assistée par IA si ' +
        'certaines informations ne sont pas correctement détectées ou si vous souhaitez une extraction plus complète.'
    };
  }
  // .docx et .txt : toujours consideres comme du texte, aucune ambiguite
  // possible pour ces formats (pas de notion de "docx scanne").
  return {
    niveau: 'analyse_rapide_suffisante',
    analyseRapideDisponible: true,
    message: 'Votre CV semble être un document texte. L\'analyse rapide de l\'application devrait être ' +
      'suffisante dans la plupart des cas. Vous pourrez toujours utiliser l\'analyse assistée par IA si ' +
      'certaines informations ne sont pas correctement détectées ou si vous souhaitez une extraction plus complète.'
  };
}

// Point d'entree unique de cette tache : detecte le type, tente
// l'extraction si pertinent (reutilise lireFichierCV(), aucune logique
// d'extraction dupliquee), et retourne une recommandation structuree.
// Ne modifie jamais rien dans dossier -- fonction d'analyse pure, la
// decision de l'utiliser revient a la Tache 2 (interface).
function analyserDocumentDepose(fichier) {
  var typeFichier = detecterTypeFichier(fichier.name);

  if (typeFichier === 'image') {
    // Aucune tentative d'extraction : techniquement impossible aujourd'hui
    // (pas d'OCR cote client), et sans objet pour une image.
    return Promise.resolve({
      typeFichier: 'image',
      niveauTexte: null,
      texteExtrait: '',
      recommandation: determinerRecommandationDocument('image', null)
    });
  }

  if (typeFichier === 'inconnu') {
    return Promise.reject(new Error('Format non pris en charge.'));
  }

  return lireFichierCV(fichier).then(function (texte) {
    // .docx/.txt : toujours "detecte" (pas d'ambiguite pour ces formats).
    // .pdf : evaluation progressive reelle du texte obtenu.
    var niveauTexte = (typeFichier === 'pdf') ? evaluerNiveauTexte(texte) : 'detecte';
    return {
      typeFichier: typeFichier,
      niveauTexte: niveauTexte,
      texteExtrait: texte,
      recommandation: determinerRecommandationDocument(typeFichier, niveauTexte)
    };
  });
}

function lireFichierCV(fichier) {
  var nom = fichier.name.toLowerCase();
  if (nom.endsWith('.txt')) {
    return fichier.text();
  }
  if (nom.endsWith('.pdf')) {
    var promessePdf = window.pdfjsLib
      ? Promise.resolve()
      : chargerScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    return promessePdf.then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      return fichier.arrayBuffer();
    }).then(function (donnees) {
      return window.pdfjsLib.getDocument({ data: donnees }).promise;
    }).then(function (pdf) {
      var pages = [];
      for (var i = 1; i <= pdf.numPages; i++) { pages.push(i); }
      return Promise.all(pages.map(function (num) {
        return pdf.getPage(num).then(function (page) {
          return page.getTextContent();
        }).then(function (contenu) {
          return contenu.items.map(function (item) { return item.str; }).join(' ');
        });
      }));
    }).then(function (textes) { return textes.join(' '); });
  }
  if (nom.endsWith('.docx')) {
    var promesseMammoth = window.mammoth
      ? Promise.resolve()
      : chargerScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
    return promesseMammoth.then(function () {
      return fichier.arrayBuffer();
    }).then(function (donnees) {
      return window.mammoth.extractRawText({ arrayBuffer: donnees });
    }).then(function (resultat) { return resultat.value; });
  }
  return Promise.reject(new Error('Format non pris en charge. Utilisez un fichier PDF, DOCX ou TXT.'));
}

function fermerFenetreCV() {
  var f = document.getElementById('fenetreCV');
  if (f) { f.remove(); }
}

// Complement tache 8 : le parametre "options" permet de reutiliser exactement cette
// fenetre depuis l'ecran ACTION (carte "Lettre de motivation") quand aucun CV n'est
// encore disponible. Seuls les textes et l'etape suivante changent :
// - options.titre / options.intro : textes adaptes au contexte
// - options.onTerminer() : appelee a la place de la navigation vers "objectif"
//   (le mode de creation du CV n'est alors pas modifie, car il ne s'agit pas du
//   parcours initial de creation du CV)
function ouvrirFenetreCV(mode, options) {
  fermerFenetreCV();
  var modeCV = mode || 'maj';
  var contexte = options || null;
  var titre = contexte && contexte.titre ? contexte.titre : '&#128196; Deposez votre CV';
  var intro = contexte && contexte.intro ? contexte.intro :
    'Formats acceptes : PDF, Word (.docx) ou texte (.txt). ' +
    'Votre CV est lu directement dans votre navigateur, il n\'est envoye nulle part.';
  var fenetre = document.createElement('div');
  fenetre.id = 'fenetreCV';
  fenetre.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2000;padding:1rem;';
  fenetre.innerHTML =
    '<div style="background:white;border-radius:1.5rem;max-width:560px;width:100%;padding:1.5rem;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div class="d-flex justify-content-between align-items-center mb-3">' +
        '<h5 class="mb-0">' + titre + '</h5>' +
        '<button type="button" id="fermerCVBtn" class="btn btn-sm btn-outline-secondary" ' +
          'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      '<p class="text-muted small">' + intro + '</p>' +
      '<input type="file" id="fichierCV" class="form-control mb-3" accept=".pdf,.docx,.txt">' +
      '<div id="resultatAnalyseCV"></div>' +
      // TACHE (parcours recherche assistant, point 3) : le CV est desormais
      // TOUJOURS obligatoire dans cette fenetre, quel que soit le contexte
      // d'appel (accueil, lettre, recherche guidee). Le bouton "Continuer
      // sans deposer de CV" a ete retire partout ici (il reste en revanche
      // disponible pour l'import de la lettre de motivation, fenetre distincte).
      '<div class="d-flex justify-content-end align-items-center mt-3">' +
        '<button type="button" id="analyserCVBtn" class="btn btn-primary" disabled>Analyser mon CV</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fenetre);

  var input = document.getElementById('fichierCV');
  var btnAnalyser = document.getElementById('analyserCVBtn');
  var zoneResultat = document.getElementById('resultatAnalyseCV');

  function etapeSuivante() {
    fermerFenetreCV();
    if (contexte && typeof contexte.onTerminer === 'function') {
      contexte.onTerminer();
    } else {
      dossier.modeCreation = modeCV;
      naviguerVers('objectif');
    }
  }

  document.getElementById('fermerCVBtn').addEventListener('click', fermerFenetreCV);
  fenetre.addEventListener('click', function (e) { if (e.target === fenetre) { fermerFenetreCV(); } });

  input.addEventListener('change', function () {
    btnAnalyser.disabled = !input.files.length;
    zoneResultat.innerHTML = '';
  });

  btnAnalyser.addEventListener('click', function () {
    if (!input.files.length) { return; }
    zoneResultat.innerHTML = '<div class="alert alert-light border mb-0">&#8987; Lecture du CV en cours...</div>';
    btnAnalyser.disabled = true;
    lireFichierCV(input.files[0]).then(function (texte) {
      dossier.cvTexte = texte;
      // TACHE 10 (suppression progressive d'appliquerAnalyseCV) : cette
      // fenetre a desormais un vrai remplacement (l'accordeon "Importer
      // automatiquement toutes les informations de mon CV" juste en
      // dessous, construit en Tache 5) -- l'ancienne analyse directe par
      // expression reguliere (analyserCV/appliquerAnalyseCV, qui ecrivait
      // dans dossier SANS validation) n'est donc plus utilisee ici.
      // dossier.cvAnalyse reste mis a true : ce champ signifie "un CV a ete
      // depose et lu", independamment de la methode d'extraction utilisee
      // ensuite, et plusieurs endroits de l'application en dependent deja
      // (navigation, cvDisponible()...).
      dossier.cvAnalyse = true;
      zoneResultat.innerHTML =
        '<div class="alert alert-success mb-0">&#10004; CV lu avec succès. Utilisez la section ci-dessous pour en extraire ' +
        'automatiquement toutes les informations (expériences, formations, compétences...), ou continuez directement.' +
        '<div class="mt-2"><button type="button" id="continuerApresCV" class="btn btn-success btn-sm">Continuer &#8594;</button></div></div>' +
        // TACHE 5 (moteur d'import, conforme a docs/ARCHITECTURE_MOTEUR_IMPORT.md) :
        // extrait TOUTES les informations factuelles du CV via un
        // assistant IA externe, et les depose dans dossier.imports.courant,
        // en attente de validation. Le pipeline complet (comparaison,
        // ecran de validation, fusion) est construit (Taches 6 a 9) et
        // accessible via le bouton "Verifier et valider" qui apparait
        // apres l'import.
        '<details class="mt-3" style="border:1px solid #E5E7EB;border-radius:8px;padding:0.6rem 0.9rem;">' +
        '<summary style="cursor:pointer;"><strong>&#129302; Importer automatiquement toutes les informations de mon CV</strong> ' +
        '<span class="text-muted small">(experiences, formations, competences, langues...)</span></summary>' +
        '<div class="mt-2">' +
        '<p class="small fw-bold mb-2">Choisissez votre assistant IA</p>' +
        '<div class="d-flex flex-wrap gap-2 mb-2" id="carteAssistantsIA">' +
        ASSISTANTS_IA.map(function (a) {
          return '<div class="carte carte-selection-compacte" data-assistant-id="' + a.id + '" ' +
            'style="cursor:pointer;padding:0.5rem 1rem;">' + a.nom + '</div>';
        }).join('') +
        '</div>' +
        '<button type="button" class="btn btn-sm btn-primary mb-3" id="btnContinuerVersAssistantIA" disabled>Continuer</button>' +
        '<p class="small text-muted mb-2">Une fois revenu(e) avec la réponse de l\'assistant IA, collez-la ci-dessous.</p>' +
        '<textarea class="form-control form-control-sm mb-2" id="texteReponseExtractionCV" rows="6" ' +
        'placeholder="Collez ici la reponse complete de l\'assistant IA..."></textarea>' +
        '<button type="button" class="btn btn-sm btn-primary" id="btnImporterExtractionCV">Importer ces informations</button>' +
        '<div id="messageImportExtractionCV" class="mt-2 small"></div>' +
        '</div></details>';
      document.getElementById('continuerApresCV').addEventListener('click', etapeSuivante);

      // TACHE (standard IA, integration import CV) : selection de l'assistant
      // (cartes, meme principe que pageChoixCV()) -- le bouton Continuer
      // reste desactive tant qu'aucune carte n'est active. Au clic sur
      // Continuer, ouvre le composant generique ouvrirFenetreAssistantIA()
      // (app.js), qui devient l'UNIQUE declencheur de la copie + ouverture.
      var assistantChoisi = null;
      var btnContinuerVersAssistantIA = document.getElementById('btnContinuerVersAssistantIA');
      document.querySelectorAll('#carteAssistantsIA [data-assistant-id]').forEach(function (carte) {
        carte.addEventListener('click', function () {
          document.querySelectorAll('#carteAssistantsIA [data-assistant-id]').forEach(function (c) {
            c.classList.remove('active-card');
          });
          carte.classList.add('active-card');
          assistantChoisi = ASSISTANTS_IA.filter(function (a) { return a.id === carte.dataset.assistantId; })[0];
          btnContinuerVersAssistantIA.disabled = false;
        });
      });
      btnContinuerVersAssistantIA.addEventListener('click', function () {
        if (!assistantChoisi) { return; }
        ouvrirFenetreAssistantIA({
          nomAssistant: assistantChoisi.nom,
          urlAssistant: assistantChoisi.url,
          afficherAnonymisation: true,
          construireTexteACopier: function (anonymiserActif) {
            var texteCV = anonymiserActif ? anonymiserTexte(dossier.cvTexte) : dossier.cvTexte;
            return promptCache('extraction-cv', texteCV);
          }
        });
      });

      // TACHE 5 (moteur d'import) : delegue tout le parsing a
      // analyserReponseImport() + SPECIFICATION_IMPORT (deja construits,
      // app.js) -- aucune logique dupliquee ici. S'arrete a
      // dossier.imports.courant : aucun ecran de validation construit a ce
      // stade (Tache 6), rien n'est encore ecrit dans dossier lui-meme.
      var btnImporterExtractionCV = document.getElementById('btnImporterExtractionCV');
      if (btnImporterExtractionCV) {
        btnImporterExtractionCV.addEventListener('click', function () {
          var messageImport = document.getElementById('messageImportExtractionCV');
          var texteColle = document.getElementById('texteReponseExtractionCV').value;
          var resultatImport = analyserReponseImport(texteColle, SPECIFICATION_IMPORT);
          if (!resultatImport.succes) {
            messageImport.style.color = '#b91c1c';
            messageImport.textContent = '⚠️ ' + resultatImport.erreur;
            return;
          }
          var nomFichier = (input.files[0] && input.files[0].name) || '';
          var typeSource = /\.docx$/i.test(nomFichier) ? 'cv_word' : (/\.pdf$/i.test(nomFichier) ? 'cv_pdf' : 'autre');
          dossier.imports.courant = {
            schemaVersion: 1,
            typeSource: typeSource,
            date: new Date().toISOString(),
            donnees: resultatImport.valeurs
          };
          messageImport.innerHTML = '<span style="color:#15803d;">✅ Informations importées et en attente de vérification.</span> ' +
            '<button type="button" class="btn btn-sm btn-success ms-2" id="btnVerifierImportCV">Vérifier et valider</button>';
          // TACHE 7 (moteur d'import, ecran de validation) : ouvre l'ecran
          // de vue d'ensemble construit dans app.js -- rien n'est encore
          // ecrit dans dossier avant que la personne valide explicitement.
          var btnVerifierImportCV = document.getElementById('btnVerifierImportCV');
          if (btnVerifierImportCV) {
            // TACHE (retour automatique au parcours) : la validation
            // devient la fin du processus, pas une etape intermediaire.
            // etapeSuivante() ferme deja fenetreCV et poursuit le parcours
            // normal (naviguerVers('objectif') ou contexte.onTerminer()) --
            // exactement la meme fonction que le bouton "Continuer"
            // classique, aucune logique de reprise dupliquee ici.
            btnVerifierImportCV.addEventListener('click', function () { ouvrirEcranValidationImport(etapeSuivante); });
          }
        });
      }
    }).catch(function (erreur) {
      btnAnalyser.disabled = false;
      zoneResultat.innerHTML = '<div class="alert alert-warning mb-0">Impossible de lire ce fichier (' +
        erreur.message + '). Essayez un autre format ou continuez sans CV.</div>';
    });
  });
}

// Complement tache 8 : fenetre de preparation d'entretien quand aucun CV n'est
// encore disponible. Depot du CV (obligatoire) et de la lettre de motivation
// (facultative), en reutilisant les memes fonctions de lecture/analyse que la
// fenetre de depot du CV.
// TACHE 43 : Nom/Prenom/Adresse ne sont jamais devines. S'ils manquent encore,
// une confirmation ponctuelle est necessaire avant le premier COPIER de
// l'entretien, pour permettre une anonymisation fiable du CV/de la lettre.
function identiteAnonymisationIncomplete() {
  var id = dossier.identite || {};
  return !id.nom || !id.prenom || !id.adresse;
}

function fermerFenetreIdentite() {
  var f = document.getElementById('fenetreIdentite');
  if (f) { f.remove(); }
}

function ouvrirFenetreConfirmationIdentite(onTerminer) {
  fermerFenetreIdentite();
  var id = dossier.identite || {};
  var fenetre = document.createElement('div');
  fenetre.id = 'fenetreIdentite';
  fenetre.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2000;padding:1rem;';
  fenetre.innerHTML =
    '<div style="background:white;border-radius:1.5rem;max-width:480px;width:100%;padding:1.5rem;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<h5 class="mb-2">&#128274; Avant de continuer</h5>' +
      '<p class="text-muted small">Ces informations servent uniquement a anonymiser correctement votre CV et ' +
      'votre lettre de motivation avant de les transmettre a l\'IA pour la preparation de l\'entretien. ' +
      'Elles seront memorisees et ne vous seront plus jamais redemandees.</p>' +
      '<input type="text" class="form-control form-control-sm mb-2" id="confirmNom" placeholder="Nom" value="' + (id.nom || '') + '">' +
      '<input type="text" class="form-control form-control-sm mb-2" id="confirmPrenom" placeholder="Prenom" value="' + (id.prenom || '') + '">' +
      '<input type="text" class="form-control form-control-sm mb-3" id="confirmAdresse" placeholder="Adresse postale" value="' + (id.adresse || '') + '">' +
      '<div class="d-flex justify-content-end"><button type="button" class="btn btn-primary btn-sm" id="confirmIdentiteBtn">Continuer &#8594;</button></div>' +
    '</div>';
  document.body.appendChild(fenetre);
  fenetre.addEventListener('click', function (e) { if (e.target === fenetre) { fermerFenetreIdentite(); } });
  document.getElementById('confirmIdentiteBtn').addEventListener('click', function () {
    dossier.identite = dossier.identite || { civilite: null, nom: '', prenom: '', adresse: '', telephone: '', email: '' };
    dossier.identite.nom = document.getElementById('confirmNom').value.trim();
    dossier.identite.prenom = document.getElementById('confirmPrenom').value.trim();
    dossier.identite.adresse = document.getElementById('confirmAdresse').value.trim();
    fermerFenetreIdentite();
    if (typeof onTerminer === 'function') { onTerminer(); }
  });
}

// TACHE 36 : parcours autonome "Preparer un entretien", accessible directement
// depuis l'ecran d'accueil. Une seule fenetre regroupant CV (obligatoire),
// lettre (facultative), entreprise/lien et poste vise. Reutilise entierement
// les fonctions d'analyse deja existantes (lireFichierCV, analyserCV,
// appliquerAnalyseCV, extraireContact via appliquerAnalyseCV) ainsi que
// l'anonymisation automatique et la fenetre de confirmation d'identite deja
// mises en place pour l'entretien (TACHE 43).
function fermerFenetreEntretienDirect() {
  var f = document.getElementById('fenetreEntretienDirect');
  if (f) { f.remove(); }
}

function ouvrirFenetreEntretienDirect() {
  fermerFenetreEntretienDirect();
  var fenetre = document.createElement('div');
  fenetre.id = 'fenetreEntretienDirect';
  fenetre.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2000;padding:1rem;';
  fenetre.innerHTML =
    '<div style="background:white;border-radius:1.5rem;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:1.5rem;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div class="d-flex justify-content-between align-items-center mb-2">' +
        '<h5 class="mb-0">&#127908; Préparer un entretien</h5>' +
        '<button type="button" id="fermerEntretienDirectBtn" class="btn btn-sm btn-outline-secondary" ' +
          'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      '<p class="text-muted small">Votre CV est obligatoire. La lettre de motivation est facultative mais ' +
      'fortement recommandée afin d\'obtenir une préparation plus personnalisée.</p>' +
      '<hr>' +
      '<label class="form-label small fw-bold d-block mb-1">&#128196; Mon CV <span class="text-danger">*</span></label>' +
      '<input type="file" id="edCvFichier" class="form-control form-control-sm mb-1" accept=".pdf,.docx,.txt">' +
      '<p class="text-success small mb-0" id="edCvStatut" style="display:none;">&#10004; Obligatoire</p>' +
      '<hr>' +
      '<label class="form-label small fw-bold d-block mb-1">&#128196; Ma lettre de motivation <span class="text-muted fw-normal">(facultatif)</span></label>' +
      '<input type="file" id="edLettreFichier" class="form-control form-control-sm mb-1" accept=".pdf,.docx,.txt">' +
      '<p class="text-muted small mb-0">&#8505; Recommandé</p>' +
      '<hr>' +
      '<label class="form-label small fw-bold d-block mb-1">&#127970; Entreprise</label>' +
      '<input type="text" id="edEntreprise" class="form-control form-control-sm mb-2" placeholder="Nom de l\'entreprise ou lien internet">' +
      '<label class="form-label small fw-bold d-block mb-1">&#128188; Poste visé</label>' +
      '<input type="text" id="edPoste" class="form-control form-control-sm" placeholder="Poste visé">' +
      '<hr>' +
      '<p class="small mb-0"><strong>&#128274; Confidentialité</strong><br>' +
      '<span class="text-muted">Les documents seront automatiquement anonymisés avant leur transmission à ' +
      'l\'assistant IA. Cette anonymisation est toujours activée pour la préparation de l\'entretien.</span></p>' +
      '<div id="edResultat" class="mt-2"></div>' +
      '<div class="d-flex justify-content-end mt-3">' +
      '<button type="button" id="edValiderBtn" class="btn btn-primary" disabled ' +
        'title="Un CV, un poste vise et une entreprise (ou un lien) sont necessaires pour continuer.">' +
        'Préparer mon entretien</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fenetre);

  var champCv = document.getElementById('edCvFichier');
  var champLettre = document.getElementById('edLettreFichier');
  var champEntreprise = document.getElementById('edEntreprise');
  var champPoste = document.getElementById('edPoste');
  var btnValider = document.getElementById('edValiderBtn');
  var zoneResultat = document.getElementById('edResultat');

  document.getElementById('fermerEntretienDirectBtn').addEventListener('click', fermerFenetreEntretienDirect);
  fenetre.addEventListener('click', function (e) { if (e.target === fenetre) { fermerFenetreEntretienDirect(); } });

  function conditionsReunies() {
    return champCv.files.length > 0 && champEntreprise.value.trim() && champPoste.value.trim();
  }
  function majBouton() {
    var ok = conditionsReunies();
    btnValider.disabled = !ok;
    btnValider.title = ok ? '' : 'Un CV, un poste vise et une entreprise (ou un lien) sont necessaires pour continuer.';
    document.getElementById('edCvStatut').style.display = champCv.files.length ? 'block' : 'none';
  }
  champCv.addEventListener('change', majBouton);
  champEntreprise.addEventListener('input', majBouton);
  champPoste.addEventListener('input', majBouton);

  btnValider.addEventListener('click', function () {
    if (!conditionsReunies()) { return; }
    btnValider.disabled = true;
    zoneResultat.innerHTML = '<div class="alert alert-light border mb-0">&#8987; Analyse en cours...</div>';

    lireFichierCV(champCv.files[0]).then(function (texteCv) {
      dossier.cvTexte = texteCv;
      // TACHE 10 (suppression progressive, en attente pour cette fenetre) :
      // cette fenetre (preparation d'entretien, parcours direct) n'a pas
      // encore le nouveau mecanisme d'import (Tache 5 ne l'a construit que
      // pour ouvrirFenetreCV()). Le retirer ici sans remplacement priverait
      // la personne de toute pre-remplissage -- conserve donc
      // volontairement pour l'instant, a migrer dans une tache separee.
      appliquerAnalyseCV(analyserCV(texteCv));
      if (champLettre.files.length) {
        return lireFichierCV(champLettre.files[0]).then(function (texteLettre) {
          dossier.lettreMotivation = dossier.lettreMotivation || {};
          dossier.lettreMotivation.texte = texteLettre;
          var contact = extraireContact(texteLettre);
          dossier.identite = dossier.identite || { civilite: null, nom: '', prenom: '', adresse: '', telephone: '', email: '' };
          if (contact.email && !dossier.identite.email) { dossier.identite.email = contact.email; }
          if (contact.telephone && !dossier.identite.telephone) { dossier.identite.telephone = contact.telephone; }
        });
      }
    }).then(function () {
      dossier.entretienDirect = { structure: champEntreprise.value.trim(), poste: champPoste.value.trim() };
      fermerFenetreEntretienDirect();
      ouvrirAideIA('entretien');
    }).catch(function (erreur) {
      btnValider.disabled = false;
      zoneResultat.innerHTML = '<div class="alert alert-warning mb-0">Impossible de lire un des fichiers (' +
        erreur.message + '). Essayez un autre format.</div>';
    });
  });
}

function fermerFenetreEntretien() {
  var f = document.getElementById('fenetreEntretien');
  if (f) { f.remove(); }
}

function ouvrirFenetreEntretien(onTerminer) {
  fermerFenetreEntretien();
  var fenetre = document.createElement('div');
  fenetre.id = 'fenetreEntretien';
  fenetre.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2000;padding:1rem;';
  fenetre.innerHTML =
    '<div style="background:white;border-radius:1.5rem;max-width:560px;width:100%;padding:1.5rem;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div class="d-flex justify-content-between align-items-center mb-3">' +
        '<h5 class="mb-0">&#127908; Preparer votre entretien</h5>' +
        '<button type="button" id="fermerEntretienBtn" class="btn btn-sm btn-outline-secondary" ' +
          'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      '<p class="text-muted small">Vos documents sont lus directement dans votre navigateur, ils ne sont envoyes nulle part.</p>' +
      '<div class="mb-3"><label class="form-label small fw-bold d-block">CV <span class="text-danger">(obligatoire)</span></label>' +
        '<input type="file" id="fichierCVEntretien" class="form-control" accept=".pdf,.docx,.txt"></div>' +
      '<div class="mb-2"><label class="form-label small fw-bold d-block">Lettre de motivation <span class="text-muted fw-normal">(facultative)</span></label>' +
        '<input type="file" id="fichierLettreEntretien" class="form-control" accept=".pdf,.docx,.txt"></div>' +
      '<p class="text-muted small">La lettre de motivation permettra a l\'IA de poser des questions plus pertinentes ' +
      'et de personnaliser davantage la preparation de votre entretien.</p>' +
      '<div id="resultatEntretienImport"></div>' +
      '<div class="d-flex justify-content-end mt-3">' +
        '<button type="button" id="validerEntretienBtn" class="btn btn-primary" disabled>Continuer &#8594;</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fenetre);

  var inputCV = document.getElementById('fichierCVEntretien');
  var inputLettre = document.getElementById('fichierLettreEntretien');
  var btnValider = document.getElementById('validerEntretienBtn');
  var zoneResultat = document.getElementById('resultatEntretienImport');

  document.getElementById('fermerEntretienBtn').addEventListener('click', fermerFenetreEntretien);
  fenetre.addEventListener('click', function (e) { if (e.target === fenetre) { fermerFenetreEntretien(); } });

  inputCV.addEventListener('change', function () {
    btnValider.disabled = !inputCV.files.length;
    zoneResultat.innerHTML = '';
  });

  btnValider.addEventListener('click', function () {
    if (!inputCV.files.length) { return; }
    btnValider.disabled = true;
    zoneResultat.innerHTML = '<div class="alert alert-light border mb-0">&#8987; Lecture des documents en cours...</div>';

    lireFichierCV(inputCV.files[0]).then(function (texteCV) {
      dossier.cvTexte = texteCV;
      // TACHE 10 (suppression progressive, en attente pour cette fenetre) :
      // meme remarque que dans ouvrirFenetreEntretienDirect() -- pas encore
      // migree vers le nouveau moteur d'import, conserve volontairement.
      appliquerAnalyseCV(analyserCV(texteCV));
      if (inputLettre.files.length) {
        return lireFichierCV(inputLettre.files[0]).then(function (texteLettre) {
          dossier.lettreMotivation = dossier.lettreMotivation || {};
          dossier.lettreMotivation.texte = texteLettre;
          // TACHE 43 : extraction fiable egalement depuis la lettre importee
          var contactLettre = extraireContact(texteLettre);
          dossier.identite = dossier.identite || { civilite: null, nom: '', prenom: '', adresse: '', telephone: '', email: '' };
          if (contactLettre.email && !dossier.identite.email) { dossier.identite.email = contactLettre.email; }
          if (contactLettre.telephone && !dossier.identite.telephone) { dossier.identite.telephone = contactLettre.telephone; }
        });
      }
    }).then(function () {
      fermerFenetreEntretien();
      if (typeof onTerminer === 'function') { onTerminer(); }
    }).catch(function (erreur) {
      btnValider.disabled = false;
      zoneResultat.innerHTML = '<div class="alert alert-warning mb-0">Impossible de lire un des fichiers (' +
        erreur.message + '). Essayez un autre format.</div>';
    });
  });
}

/* ------------------------------------------------------------
   AIGUILLAGE AUTOMATIQUE
   1. "J'ai deja un CV" ouvre la fenetre de depot.
   2. Apres un CV analyse, le choix de l'objectif mene
      directement a la page Revelation.
   ------------------------------------------------------------ */

(function () {
  if (typeof document === 'undefined') { return; }

  document.addEventListener('click', function (e) {
    var carte = e.target.closest ? e.target.closest('[data-action="mode"]') : null;
    if (carte && (carte.dataset.value === 'maj' || carte.dataset.value === 'pret')) {
      e.stopPropagation();
      e.preventDefault();
      ouvrirFenetreCV(carte.dataset.value);
    }
  }, true);

  document.addEventListener('click', function (e) {
    var carte = e.target.closest ? e.target.closest('[data-action="objectif"]') : null;
    if (carte && typeof dossier !== 'undefined' && dossier && dossier.cvAnalyse) {
      e.stopPropagation();
      dossier.objectif = carte.dataset.value;
      naviguerVers('revelation');
    }
  }, true);
})();