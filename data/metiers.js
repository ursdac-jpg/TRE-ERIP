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
    id: "conseiller_vente", nom: "Conseiller de vente", rome: "D1214", secteur: "Commerce",    activites: ["clients", "magasin", "collegues", "marchandises"],
    actions: ["vendre", "conseiller"],
    environnement: ["magasin"],
    valeurs: ["contact_humain", "evolution"],
    savoirFaire: ["Merchandising", "Gestion des stocks", "Négociation", "Persuasion", "Conseil"],
    savoirEtre: ["Relation client", "Communication", "Écoute", "Sens du service", "Accueil"],
    savoirs: ["Techniques de vente", "Connaissance des produits", "Encaissement"]
  },
  {
    id: "agent_accueil", nom: "Agent d'accueil", rome: "M1601", secteur: "Services",    activites: ["clients", "bureau", "ordinateur", "documents"],
    actions: ["conseiller", "organiser"],
    environnement: ["bureau"],
    valeurs: ["contact_humain", "horaires_fixes"],
    savoirFaire: ["Bureautique", "Gestion administrative", "Conseil"],
    savoirEtre: ["Accueil", "Communication", "Écoute", "Patience", "Sens du service"],
    savoirs: ["Standard téléphonique", "Procédures d'accueil"]
  },
  {
    id: "teleconseiller", nom: "Téléconseiller", rome: "D1408", secteur: "Relation client",    activites: ["clients", "bureau", "collegues", "ordinateur", "documents"],
    actions: ["conseiller", "vendre"],
    environnement: ["bureau"],
    valeurs: ["contact_humain", "horaires_fixes"],
    savoirFaire: ["Bureautique", "Négociation", "Persuasion", "Conseil"],
    savoirEtre: ["Relation client", "Communication", "Écoute", "Patience"],
    savoirs: ["Outils informatiques", "Scripts d'appel"]
  },
  {
    id: "employe_libre_service", nom: "Employé libre-service", rome: "D1507", secteur: "Grande distribution",    activites: ["magasin", "seul", "collegues", "marchandises"],
    actions: ["organiser", "nettoyer"],
    environnement: ["magasin"],
    valeurs: ["stabilite", "horaires_fixes", "proximite"],
    savoirFaire: ["Merchandising", "Gestion des stocks", "Entretien"],
    savoirEtre: ["Rigueur", "Organisation", "Autonomie", "Endurance"],
    savoirs: ["Rotation des produits", "Règles d'hygiène"]
  },
  {
    id: "preparateur_commandes", nom: "Préparateur de commandes / Magasinier", rome: "N1103", secteur: "Logistique",    activites: ["machines", "seul", "collegues", "marchandises"],
    actions: ["organiser", "transporter"],
    environnement: ["usine"],
    valeurs: ["stabilite", "autonomie", "salaire"],
    savoirFaire: ["Logistique", "Gestion des stocks", "Conduite", "Planification"],
    savoirEtre: ["Rigueur", "Organisation", "Autonomie", "Respect des délais"],
    savoirs: ["CACES", "Logiciels de gestion d'entrepôt"]
  },
  {
    id: "cariste", nom: "Cariste", rome: "N1101", secteur: "Logistique",    activites: ["machines", "seul", "marchandises"],
    actions: ["transporter", "organiser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "salaire"],
    savoirFaire: ["Conduite", "Logistique", "Gestion des stocks"],
    savoirEtre: ["Rigueur", "Sécurité", "Autonomie"],
    savoirs: ["CACES 1-3-5", "Règles de sécurité entrepôt"]
  },
  {
    id: "chauffeur_livreur", nom: "Chauffeur-livreur", rome: "N4105", secteur: "Transport",    activites: ["deplacement", "seul", "clients", "marchandises", "vehicules"],
    actions: ["transporter", "organiser"],
    environnement: ["route"],
    valeurs: ["autonomie", "proximite"],
    savoirFaire: ["Conduite", "Logistique", "Planification"],
    savoirEtre: ["Autonomie", "Gestion du temps", "Respect des délais", "Sens du service"],
    savoirs: ["Code de la route", "Lecture d'itinéraires"]
  },
  {
    id: "chauffeur_routier", nom: "Chauffeur routier", rome: "N4101", secteur: "Transport",    activites: ["deplacement", "seul", "vehicules"],
    actions: ["transporter"],
    environnement: ["route"],
    valeurs: ["autonomie", "salaire"],
    savoirFaire: ["Conduite", "Logistique"],
    savoirEtre: ["Autonomie", "Fiabilité", "Respect des délais"],
    savoirs: ["Code de la route", "Réglementation des transports", "Permis C"]
  },
  {
    id: "agent_entretien", nom: "Agent d'entretien", rome: "K2204", secteur: "Propreté",    activites: ["seul", "outils"],
    actions: ["nettoyer", "organiser"],
    environnement: ["bureau", "domicile"],
    valeurs: ["autonomie", "horaires_fixes", "proximite"],
    savoirFaire: ["Hygiène", "Entretien"],
    savoirEtre: ["Rigueur", "Autonomie", "Organisation", "Fiabilité"],
    savoirs: ["Protocoles de nettoyage", "Sécurité des produits"]
  },
  {
    id: "advf", nom: "Assistant de vie aux familles (ADVF)", rome: "K1302", secteur: "Services à la personne",    activites: ["personnes_agees", "seul", "deplacement"],
    actions: ["soigner", "cuisiner", "nettoyer"],
    environnement: ["domicile"],
    valeurs: ["contact_humain", "proximite"],
    savoirFaire: ["Soins", "Hygiène", "Cuisine", "Entretien"],
    savoirEtre: ["Empathie", "Aide à la personne", "Écoute", "Patience", "Bienveillance"],
    savoirs: ["Gestes de premiers secours", "Manutention des personnes"]
  },
  {
    id: "aide_soignant", nom: "Aide-soignant", rome: "J1501", secteur: "Santé",    activites: ["personnes_agees", "collegues"],
    actions: ["soigner"],
    environnement: ["sante"],
    valeurs: ["contact_humain", "stabilite"],
    savoirFaire: ["Soins", "Hygiène", "Précision"],
    savoirEtre: ["Empathie", "Écoute", "Bienveillance", "Travail en équipe"],
    savoirs: ["Protocoles de soins", "Hygiène hospitalière", "Gestes de premiers secours"]
  },
  {
    id: "infirmier", nom: "Infirmier", rome: "J1506", secteur: "Santé",    activites: ["personnes_agees", "collegues"],
    actions: ["soigner", "organiser", "analyser"],
    environnement: ["sante"],
    valeurs: ["contact_humain", "evolution", "salaire"],
    savoirFaire: ["Soins", "Précision", "Planification"],
    savoirEtre: ["Empathie", "Rigueur", "Responsabilité", "Travail en équipe"],
    savoirs: ["Pharmacologie", "Protocoles médicaux"]
  },
  {
    id: "auxiliaire_petite_enfance", nom: "Auxiliaire petite enfance", rome: "K1303", secteur: "Petite enfance",    activites: ["enfants", "collegues"],
    actions: ["soigner", "former", "creer"],
    environnement: ["sante"],
    valeurs: ["contact_humain", "horaires_fixes"],
    savoirFaire: ["Soins", "Hygiène", "Transmission"],
    savoirEtre: ["Patience", "Bienveillance", "Pédagogie", "Créativité", "Sécurité"],
    savoirs: ["Développement de l'enfant", "Règles de sécurité"]
  },
  {
    id: "animateur", nom: "Animateur", rome: "G1202", secteur: "Animation",    activites: ["enfants", "collegues", "exterieur"],
    actions: ["former", "creer", "organiser"],
    environnement: ["exterieur"],
    valeurs: ["contact_humain", "evolution"],
    savoirFaire: ["Transmission", "Gestion de projet", "Planification"],
    savoirEtre: ["Pédagogie", "Créativité", "Communication", "Adaptabilité", "Esprit d'équipe"],
    savoirs: ["Réglementation ACM", "Techniques d'animation"]
  },
  {
    id: "formateur", nom: "Formateur / Éducateur", rome: "K2111", secteur: "Formation",    activites: ["enfants", "collegues", "bureau"],
    actions: ["former", "conseiller", "organiser"],
    environnement: ["bureau"],
    valeurs: ["contact_humain", "evolution"],
    savoirFaire: ["Formation", "Transmission", "Conseil", "Rédaction"],
    savoirEtre: ["Pédagogie", "Patience", "Communication", "Écoute"],
    savoirs: ["Ingénierie pédagogique", "Techniques d'évaluation"]
  },
  {
    id: "serveur", nom: "Serveur en restauration", rome: "G1803", secteur: "Hôtellerie-restauration",    activites: ["clients", "collegues"],
    actions: ["vendre", "conseiller"],
    environnement: ["cuisine"],
    valeurs: ["contact_humain"],
    savoirFaire: ["Négociation", "Conseil"],
    savoirEtre: ["Sens du service", "Communication", "Endurance", "Adaptabilité", "Accueil"],
    savoirs: ["Hygiène alimentaire (HACCP)", "Techniques de service", "Encaissement"]
  },
  {
    id: "cuisinier", nom: "Cuisinier / Commis de cuisine", rome: "G1602", secteur: "Hôtellerie-restauration",    activites: ["collegues", "machines"],
    actions: ["cuisiner", "organiser"],
    environnement: ["cuisine"],
    valeurs: ["evolution"],
    savoirFaire: ["Cuisine", "Hygiène", "Précision", "Planification"],
    savoirEtre: ["Rigueur", "Créativité", "Esprit d'équipe", "Endurance", "Respect des normes"],
    savoirs: ["Techniques culinaires", "Hygiène alimentaire (HACCP)"]
  },
  {
    id: "agent_production", nom: "Agent de production", rome: "H2909", secteur: "Industrie",    activites: ["machines", "collegues"],
    actions: ["construire", "analyser", "organiser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "horaires_fixes", "salaire"],
    savoirFaire: ["Technique", "Précision", "Maintenance"],
    savoirEtre: ["Rigueur", "Esprit d'équipe", "Respect des normes", "Fiabilité"],
    savoirs: ["Règles de sécurité", "Procédures qualité"]
  },
  {
    id: "technicien_maintenance", nom: "Technicien de maintenance", rome: "I1304", secteur: "Industrie",    activites: ["machines", "seul", "deplacement", "outils"],
    actions: ["reparer", "analyser"],
    environnement: ["usine"],
    valeurs: ["autonomie", "evolution", "salaire"],
    savoirFaire: ["Diagnostic", "Réparation", "Maintenance", "Technique", "Lecture de plans"],
    savoirEtre: ["Autonomie", "Rigueur", "Adaptabilité"],
    savoirs: ["Lecture de schémas", "Habilitations électriques"]
  },
  {
    id: "mecanicien", nom: "Mécanicien automobile", rome: "I1604", secteur: "Automobile",    activites: ["machines", "seul", "vehicules", "outils"],
    actions: ["reparer", "analyser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "autonomie"],
    savoirFaire: ["Diagnostic", "Réparation", "Maintenance", "Technique", "Précision"],
    savoirEtre: ["Rigueur", "Autonomie", "Raisonnement logique"],
    savoirs: ["Mécanique automobile", "Électronique embarquée"]
  },
  {
    id: "macon", nom: "Maçon", rome: "F1703", secteur: "BTP",    activites: ["exterieur", "collegues", "machines", "outils"],
    actions: ["construire"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "salaire"],
    savoirFaire: ["Bâtiment", "Lecture de plans", "Travail manuel"],
    savoirEtre: ["Endurance", "Esprit d'équipe", "Sécurité", "Rigueur"],
    savoirs: ["Normes de construction", "Sécurité sur chantier"]
  },
  {
    id: "peintre", nom: "Peintre en bâtiment", rome: "F1606", secteur: "BTP",    activites: ["seul", "exterieur", "outils"],
    actions: ["construire", "creer"],
    environnement: ["exterieur", "domicile"],
    valeurs: ["autonomie", "proximite"],
    savoirFaire: ["Bâtiment", "Travail manuel", "Précision"],
    savoirEtre: ["Rigueur", "Autonomie", "Créativité"],
    savoirs: ["Types de peintures", "Préparation des surfaces"]
  },
  {
    id: "plombier", nom: "Plombier", rome: "F1603", secteur: "BTP",    activites: ["seul", "deplacement", "clients", "outils"],
    actions: ["reparer", "construire"],
    environnement: ["domicile", "exterieur"],
    valeurs: ["autonomie", "proximite", "salaire"],
    savoirFaire: ["Réparation", "Diagnostic", "Lecture de plans", "Travail manuel"],
    savoirEtre: ["Autonomie", "Rigueur", "Sens du service"],
    savoirs: ["Normes de plomberie", "Lecture de plans hydrauliques"]
  },
  {
    id: "electricien", nom: "Électricien", rome: "F1602", secteur: "BTP",    activites: ["seul", "deplacement", "machines", "outils"],
    actions: ["reparer", "construire", "analyser"],
    environnement: ["exterieur", "domicile"],
    valeurs: ["autonomie", "evolution", "salaire"],
    savoirFaire: ["Technique", "Lecture de plans", "Diagnostic", "Précision"],
    savoirEtre: ["Rigueur", "Sécurité", "Autonomie", "Raisonnement logique"],
    savoirs: ["Normes électriques", "Lecture de schémas électriques", "Habilitations"]
  },
  {
    id: "paysagiste", nom: "Ouvrier paysagiste / Jardinier", rome: "A1203", secteur: "Espaces verts",    activites: ["exterieur", "seul", "machines", "outils"],
    actions: ["creer", "nettoyer", "construire"],
    environnement: ["exterieur", "espaces_verts"],
    valeurs: ["exterieur", "autonomie", "proximite"],
    savoirFaire: ["Entretien", "Travail manuel", "Conduite"],
    savoirEtre: ["Endurance", "Autonomie", "Créativité", "Adaptabilité"],
    savoirs: ["Végétaux", "Matériel motorisé"]
  },
  {
    id: "ouvrier_agricole", nom: "Ouvrier agricole / viticole", rome: "A1405", secteur: "Agriculture",    activites: ["exterieur", "collegues", "machines", "outils"],
    actions: ["transporter", "organiser", "nettoyer"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "proximite"],
    savoirFaire: ["Travail manuel", "Conduite", "Entretien"],
    savoirEtre: ["Endurance", "Adaptabilité", "Esprit d'équipe"],
    savoirs: ["Cycle de la vigne", "Matériel agricole"]
  },
  {
    id: "agent_securite", nom: "Agent de sécurité", rome: "K2503", secteur: "Sécurité",    activites: ["seul", "magasin", "clients"],
    actions: ["analyser", "organiser"],
    environnement: ["magasin", "bureau"],
    valeurs: ["stabilite", "horaires_fixes"],
    savoirFaire: ["Planification"],
    savoirEtre: ["Sécurité", "Rigueur", "Fiabilité", "Responsabilité"],
    savoirs: ["CQP APS", "Consignes incendie", "Gestes de premiers secours"]
  },
  {
    id: "assistant_administratif", nom: "Assistant administratif", rome: "M1607", secteur: "Administration",    activites: ["bureau", "seul", "collegues", "ordinateur", "documents"],
    actions: ["organiser", "analyser"],
    environnement: ["bureau"],
    valeurs: ["stabilite", "horaires_fixes"],
    savoirFaire: ["Bureautique", "Gestion administrative", "Rédaction", "Planification"],
    savoirEtre: ["Organisation", "Rigueur", "Communication", "Fiabilité"],
    savoirs: ["Outils bureautiques", "Orthographe", "Procédures administratives"]
  },
  {
    id: "comptable", nom: "Comptable / Assistant comptable", rome: "M1203", secteur: "Gestion",    activites: ["bureau", "seul", "ordinateur", "documents"],
    actions: ["analyser", "organiser"],
    environnement: ["bureau"],
    valeurs: ["stabilite", "salaire", "evolution"],
    savoirFaire: ["Analyse de données", "Gestion financière", "Bureautique", "Rédaction"],
    savoirEtre: ["Rigueur", "Organisation", "Raisonnement logique"],
    savoirs: ["Comptabilité générale", "Droit fiscal", "Logiciels comptables"]
  },
  {
    id: "chef_equipe", nom: "Chef d'équipe", rome: "M1302", secteur: "Encadrement",    activites: ["collegues", "machines", "documents"],
    actions: ["organiser", "former", "analyser"],
    environnement: ["usine", "exterieur"],
    valeurs: ["evolution", "salaire"],
    savoirFaire: ["Management", "Gestion de projet", "Planification", "Formation"],
    savoirEtre: ["Leadership", "Coordination", "Responsabilité", "Travail en équipe"],
    savoirs: ["Règles de sécurité", "Gestion de planning"]
  },
  {
    id: "developpeur", nom: "Développeur informatique", rome: "M1855", secteur: "Numérique",    activites: ["bureau", "seul", "collegues", "ordinateur"],
    actions: ["analyser", "creer"],
    environnement: ["bureau"],
    valeurs: ["evolution", "autonomie", "salaire"],
    savoirFaire: ["Analyse de données", "Innovation", "Rédaction", "Gestion de projet"],
    savoirEtre: ["Raisonnement logique", "Autonomie", "Rigueur", "Apprentissage"],
    savoirs: ["Langages de programmation", "Bases de données", "Méthodes agiles"]
  },
  {
    id: "employe_polyvalent_restauration", nom: "Employé polyvalent de restauration / Aide de cuisine", rome: "G1603", secteur: "Restauration",    activites: ["clients", "collegues"],
    actions: ["cuisiner", "nettoyer", "organiser"],
    environnement: ["cuisine"],
    valeurs: ["contact_humain", "proximite"],
    savoirFaire: ["Cuisine", "Hygiène", "Entretien"],
    savoirEtre: ["Adaptabilité", "Esprit d'équipe", "Endurance", "Sens du service"],
    savoirs: ["Hygiène alimentaire (HACCP)", "Préparation froide et chaude"]
  },
  {
    id: "plongeur", nom: "Plongeur en restauration", rome: "G1605", secteur: "Restauration",    activites: ["collegues", "seul"],
    actions: ["nettoyer", "organiser"],
    environnement: ["cuisine"],
    valeurs: ["proximite", "stabilite"],
    savoirFaire: ["Hygiène", "Entretien"],
    savoirEtre: ["Endurance", "Rigueur", "Esprit d'équipe"],
    savoirs: ["Hygiène alimentaire (HACCP)", "Matériel de plonge"]
  },
  {
    id: "receptionniste", nom: "Réceptionniste en hôtellerie", rome: "G1703", secteur: "Hôtellerie-tourisme",    activites: ["clients", "bureau", "ordinateur", "documents"],
    actions: ["conseiller", "organiser"],
    environnement: ["bureau"],
    valeurs: ["contact_humain", "evolution"],
    savoirFaire: ["Bureautique", "Gestion administrative", "Conseil", "Planification"],
    savoirEtre: ["Accueil", "Communication", "Sens du service", "Adaptabilité"],
    savoirs: ["Anglais et langues étrangères", "Logiciels de réservation", "Encaissement"]
  },
  {
    id: "employe_etage", nom: "Employé d'étage en hôtellerie", rome: "G1501", secteur: "Hôtellerie-tourisme",    activites: ["seul", "collegues"],
    actions: ["nettoyer", "organiser"],
    environnement: ["bureau"],
    valeurs: ["horaires_fixes", "proximite"],
    savoirFaire: ["Hygiène", "Entretien"],
    savoirEtre: ["Rigueur", "Autonomie", "Fiabilité"],
    savoirs: ["Protocoles de nettoyage", "Présentation des chambres"]
  },
  {
    id: "barman", nom: "Barman / Employé de café", rome: "G1801", secteur: "Hôtellerie-restauration",    activites: ["clients", "collegues"],
    actions: ["vendre", "conseiller", "cuisiner"],
    environnement: ["cuisine"],
    valeurs: ["contact_humain"],
    savoirFaire: ["Cuisine", "Négociation"],
    savoirEtre: ["Sens du service", "Communication", "Endurance", "Accueil"],
    savoirs: ["Encaissement", "Règles d'hygiène", "Préparation des boissons"]
  },
  {
    id: "accueil_touristique", nom: "Agent d'accueil touristique", rome: "G1101", secteur: "Tourisme",    activites: ["clients", "bureau", "exterieur", "ordinateur"],
    actions: ["conseiller", "organiser"],
    environnement: ["bureau", "exterieur"],
    valeurs: ["contact_humain", "exterieur"],
    savoirFaire: ["Conseil", "Planification", "Bureautique"],
    savoirEtre: ["Accueil", "Communication", "Adaptabilité", "Écoute"],
    savoirs: ["Patrimoine local", "Anglais et langues étrangères"]
  },
  {
    id: "ouvrier_chai", nom: "Ouvrier de chai / Agent de cave", rome: "A1413", secteur: "Viticulture",    activites: ["machines", "collegues", "exterieur"],
    actions: ["organiser", "nettoyer", "analyser"],
    environnement: ["usine", "exterieur"],
    valeurs: ["proximite", "stabilite"],
    savoirFaire: ["Technique", "Hygiène", "Précision", "Travail manuel"],
    savoirEtre: ["Rigueur", "Esprit d'équipe", "Endurance"],
    savoirs: ["Vinification", "Hygiène alimentaire", "CACES"]
  },
  {
    id: "ouvrier_horticole", nom: "Ouvrier horticole / Maraîcher", rome: "A1414", secteur: "Agriculture",    activites: ["exterieur", "seul", "collegues", "outils"],
    actions: ["creer", "nettoyer", "organiser"],
    environnement: ["exterieur", "espaces_verts"],
    valeurs: ["exterieur", "proximite"],
    savoirFaire: ["Travail manuel", "Entretien"],
    savoirEtre: ["Endurance", "Rigueur", "Autonomie"],
    savoirs: ["Végétaux et cycles de culture", "Techniques de plantation"]
  },
  {
    id: "conducteur_engins_agricoles", nom: "Conducteur d'engins agricoles", rome: "A1101", secteur: "Agriculture",    activites: ["machines", "exterieur", "seul", "vehicules"],
    actions: ["transporter", "reparer"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "autonomie"],
    savoirFaire: ["Conduite", "Maintenance", "Travail manuel"],
    savoirEtre: ["Autonomie", "Rigueur", "Adaptabilité"],
    savoirs: ["Matériel agricole", "Règles de sécurité"]
  },
  {
    id: "operateur_agroalimentaire", nom: "Opérateur de production agroalimentaire", rome: "H2102", secteur: "Agroalimentaire",    activites: ["machines", "collegues"],
    actions: ["cuisiner", "organiser", "analyser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "horaires_fixes"],
    savoirFaire: ["Technique", "Hygiène", "Précision"],
    savoirEtre: ["Rigueur", "Esprit d'équipe", "Respect des normes"],
    savoirs: ["Hygiène alimentaire (HACCP)", "Procédures qualité"]
  },
  {
    id: "operateur_decoupe", nom: "Opérateur en transformation des viandes / conserverie", rome: "H2101", secteur: "Agroalimentaire",    activites: ["machines", "collegues"],
    actions: ["cuisiner", "analyser"],
    environnement: ["usine"],
    valeurs: ["stabilite", "salaire"],
    savoirFaire: ["Précision", "Hygiène", "Travail manuel", "Technique"],
    savoirEtre: ["Rigueur", "Endurance", "Respect des normes"],
    savoirs: ["Découpe", "Chaîne du froid", "Traçabilité"]
  },
  {
    id: "operateur_chimie", nom: "Opérateur de production chimique", rome: "H2301", secteur: "Industrie chimique",    activites: ["machines", "collegues"],
    actions: ["analyser", "organiser"],
    environnement: ["usine"],
    valeurs: ["salaire", "stabilite", "evolution"],
    savoirFaire: ["Technique", "Précision", "Analyse de données"],
    savoirEtre: ["Rigueur", "Sécurité", "Respect des normes"],
    savoirs: ["Procédés chimiques", "Règles de sécurité", "CACES"]
  },
  {
    id: "soudeur", nom: "Soudeur", rome: "H2913", secteur: "Industrie",    activites: ["machines", "seul"],
    actions: ["construire", "reparer"],
    environnement: ["usine", "exterieur"],
    valeurs: ["salaire", "stabilite"],
    savoirFaire: ["Technique", "Précision", "Travail manuel", "Lecture de plans"],
    savoirEtre: ["Rigueur", "Autonomie"],
    savoirs: ["Procédés de soudage", "Lecture de plans", "Règles de sécurité"]
  },
  {
    id: "usineur", nom: "Opérateur d'usinage (commande numérique)", rome: "H2903", secteur: "Industrie",    activites: ["machines", "seul"],
    actions: ["construire", "analyser"],
    environnement: ["usine"],
    valeurs: ["salaire", "evolution"],
    savoirFaire: ["Technique", "Précision", "Lecture de plans"],
    savoirEtre: ["Rigueur", "Autonomie", "Raisonnement logique"],
    savoirs: ["Machines à commande numérique", "Métrologie"]
  },
  {
    id: "ash", nom: "Agent de service hospitalier (ASH)", rome: "J1301", secteur: "Santé",    activites: ["personnes_agees", "collegues", "seul"],
    actions: ["nettoyer", "organiser"],
    environnement: ["sante"],
    valeurs: ["stabilite", "contact_humain"],
    savoirFaire: ["Hygiène", "Entretien"],
    savoirEtre: ["Rigueur", "Bienveillance", "Esprit d'équipe"],
    savoirs: ["Hygiène hospitalière", "Protocoles de bionettoyage"]
  },
  {
    id: "aes", nom: "Accompagnant éducatif et social (AES)", rome: "K1301", secteur: "Médico-social",    activites: ["personnes_agees", "collegues"],
    actions: ["soigner", "former"],
    environnement: ["sante", "domicile"],
    valeurs: ["contact_humain", "stabilite"],
    savoirFaire: ["Soins", "Transmission"],
    savoirEtre: ["Empathie", "Aide à la personne", "Patience", "Bienveillance", "Écoute"],
    savoirs: ["Connaissance du handicap", "Gestes de premiers secours"]
  },
  {
    id: "menage_domicile", nom: "Employé de ménage à domicile", rome: "K1304", secteur: "Services à la personne",    activites: ["seul"],
    actions: ["nettoyer", "organiser"],
    environnement: ["domicile"],
    valeurs: ["proximite", "autonomie", "horaires_fixes"],
    savoirFaire: ["Entretien", "Hygiène", "Cuisine"],
    savoirEtre: ["Autonomie", "Fiabilité", "Rigueur"],
    savoirs: ["Produits d'entretien", "Repassage"]
  },
  {
    id: "secretaire_medicale", nom: "Secrétaire médicale", rome: "M1609", secteur: "Santé",    activites: ["bureau", "clients", "ordinateur", "documents"],
    actions: ["organiser", "conseiller"],
    environnement: ["sante", "bureau"],
    valeurs: ["stabilite", "horaires_fixes"],
    savoirFaire: ["Bureautique", "Gestion administrative", "Rédaction", "Planification"],
    savoirEtre: ["Accueil", "Communication", "Écoute", "Organisation"],
    savoirs: ["Terminologie médicale", "Logiciels de gestion de cabinet"]
  },
  {
    id: "ambulancier", nom: "Ambulancier / Auxiliaire ambulancier", rome: "J1305", secteur: "Santé",    activites: ["deplacement", "personnes_agees", "collegues", "vehicules"],
    actions: ["transporter", "soigner"],
    environnement: ["route", "sante"],
    valeurs: ["contact_humain", "autonomie"],
    savoirFaire: ["Conduite", "Soins"],
    savoirEtre: ["Empathie", "Sécurité", "Sens du service"],
    savoirs: ["Gestes d'urgence", "Code de la route", "Diplôme d'État d'ambulancier"]
  },
  {
    id: "hote_caisse", nom: "Hôte de caisse", rome: "D1505", secteur: "Commerce",    activites: ["clients", "magasin", "marchandises"],
    actions: ["vendre", "organiser"],
    environnement: ["magasin"],
    valeurs: ["contact_humain", "horaires_fixes", "proximite"],
    savoirFaire: ["Conseil"],
    savoirEtre: ["Accueil", "Relation client", "Rigueur", "Patience"],
    savoirs: ["Encaissement", "Rendu de monnaie"]
  },
  {
    id: "vendeur_alimentation", nom: "Vendeur en alimentation", rome: "D1106", secteur: "Commerce alimentaire",    activites: ["clients", "magasin", "marchandises"],
    actions: ["vendre", "conseiller"],
    environnement: ["magasin"],
    valeurs: ["contact_humain", "proximite"],
    savoirFaire: ["Conseil", "Hygiène"],
    savoirEtre: ["Accueil", "Sens du service", "Communication"],
    savoirs: ["Hygiène alimentaire", "Encaissement", "Produits du terroir"]
  },
  {
    id: "boulanger", nom: "Boulanger", rome: "D1102", secteur: "Artisanat alimentaire",    activites: ["seul", "machines"],
    actions: ["cuisiner", "creer"],
    environnement: ["cuisine", "magasin"],
    valeurs: ["autonomie", "proximite"],
    savoirFaire: ["Cuisine", "Précision", "Travail manuel"],
    savoirEtre: ["Rigueur", "Créativité", "Endurance"],
    savoirs: ["Panification", "Hygiène alimentaire", "Fermentation"]
  },
  {
    id: "boucher", nom: "Boucher", rome: "D1101", secteur: "Artisanat alimentaire",    activites: ["clients", "magasin", "machines"],
    actions: ["cuisiner", "vendre", "conseiller"],
    environnement: ["magasin"],
    valeurs: ["proximite", "salaire"],
    savoirFaire: ["Précision", "Travail manuel", "Hygiène", "Conseil"],
    savoirEtre: ["Rigueur", "Relation client", "Sens du service"],
    savoirs: ["Découpe des viandes", "Chaîne du froid", "Traçabilité"]
  },
  {
    id: "coiffeur", nom: "Coiffeur", rome: "D1202", secteur: "Artisanat / Beauté",    activites: ["clients"],
    actions: ["creer", "conseiller", "vendre"],
    environnement: ["magasin"],
    valeurs: ["contact_humain", "proximite"],
    savoirFaire: ["Précision", "Conseil"],
    savoirEtre: ["Créativité", "Relation client", "Écoute", "Communication"],
    savoirs: ["Techniques de coiffure", "Colorimétrie", "Hygiène"]
  },
  {
    id: "manoeuvre_btp", nom: "Manœuvre / Aide de chantier", rome: "F1704", secteur: "BTP",    activites: ["exterieur", "collegues", "outils"],
    actions: ["construire", "transporter", "nettoyer"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "salaire"],
    savoirFaire: ["Travail manuel", "Bâtiment"],
    savoirEtre: ["Endurance", "Esprit d'équipe", "Sécurité"],
    savoirs: ["Sécurité sur chantier", "Outillage"]
  },
  {
    id: "menuisier_poseur", nom: "Menuisier poseur", rome: "F1607", secteur: "BTP",    activites: ["seul", "deplacement", "clients", "outils"],
    actions: ["construire", "reparer"],
    environnement: ["domicile", "exterieur"],
    valeurs: ["autonomie", "proximite"],
    savoirFaire: ["Travail manuel", "Précision", "Lecture de plans", "Bâtiment"],
    savoirEtre: ["Rigueur", "Autonomie", "Sens du service"],
    savoirs: ["Menuiseries et fermetures", "Prise de mesures"]
  },
  {
    id: "plaquiste", nom: "Plaquiste", rome: "F1604", secteur: "BTP",    activites: ["seul", "collegues", "outils"],
    actions: ["construire"],
    environnement: ["exterieur", "domicile"],
    valeurs: ["autonomie", "salaire"],
    savoirFaire: ["Bâtiment", "Travail manuel", "Précision", "Lecture de plans"],
    savoirEtre: ["Rigueur", "Autonomie"],
    savoirs: ["Isolation", "Matériaux de construction sèche"]
  },
  {
    id: "couvreur", nom: "Couvreur", rome: "F1610", secteur: "BTP",    activites: ["exterieur", "collegues", "outils"],
    actions: ["construire", "reparer"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "salaire"],
    savoirFaire: ["Bâtiment", "Travail manuel", "Lecture de plans"],
    savoirEtre: ["Endurance", "Sécurité", "Rigueur"],
    savoirs: ["Matériaux de couverture", "Travail en hauteur", "Zinguerie"]
  },
  {
    id: "conducteur_engins_chantier", nom: "Conducteur d'engins de chantier", rome: "F1302", secteur: "BTP",    activites: ["machines", "exterieur", "vehicules"],
    actions: ["construire", "transporter"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "salaire"],
    savoirFaire: ["Conduite", "Technique", "Précision"],
    savoirEtre: ["Sécurité", "Rigueur", "Autonomie"],
    savoirs: ["CACES engins de chantier", "Lecture de plans", "Sécurité sur chantier"]
  },
  {
    id: "agent_maintenance_batiment", nom: "Agent de maintenance des bâtiments", rome: "I1203", secteur: "Maintenance",    activites: ["seul", "deplacement", "machines", "outils"],
    actions: ["reparer", "construire", "organiser"],
    environnement: ["bureau", "domicile"],
    valeurs: ["autonomie", "stabilite"],
    savoirFaire: ["Réparation", "Maintenance", "Diagnostic", "Travail manuel", "Bâtiment"],
    savoirEtre: ["Autonomie", "Adaptabilité", "Sens du service"],
    savoirs: ["Électricité de base", "Plomberie de base", "Règles de sécurité"]
  },
  {
    id: "carrossier", nom: "Carrossier-peintre automobile", rome: "I1606", secteur: "Automobile",    activites: ["machines", "seul", "vehicules", "outils"],
    actions: ["reparer", "creer"],
    environnement: ["usine"],
    valeurs: ["stabilite", "salaire"],
    savoirFaire: ["Réparation", "Précision", "Travail manuel", "Diagnostic"],
    savoirEtre: ["Rigueur", "Créativité"],
    savoirs: ["Peinture automobile", "Matériaux composites"]
  },
  {
    id: "conducteur_bus", nom: "Conducteur de transport en commun", rome: "N4103", secteur: "Transport",    activites: ["clients", "deplacement", "seul", "vehicules"],
    actions: ["transporter"],
    environnement: ["route"],
    valeurs: ["stabilite", "horaires_fixes", "contact_humain"],
    savoirFaire: ["Conduite"],
    savoirEtre: ["Accueil", "Patience", "Sécurité", "Fiabilité"],
    savoirs: ["Permis D", "Réglementation du transport de personnes"]
  },
  {
    id: "manutentionnaire", nom: "Manutentionnaire / Agent de quai", rome: "N1105", secteur: "Logistique",    activites: ["collegues", "seul", "marchandises"],
    actions: ["transporter", "organiser"],
    environnement: ["usine"],
    valeurs: ["salaire", "stabilite"],
    savoirFaire: ["Logistique", "Travail manuel"],
    savoirEtre: ["Endurance", "Esprit d'équipe", "Rigueur"],
    savoirs: ["Gestes et postures", "Règles de sécurité"]
  },
  {
    id: "agent_proprete_urbaine", nom: "Agent de propreté urbaine / Ripeur", rome: "K2303", secteur: "Environnement",    activites: ["exterieur", "collegues"],
    actions: ["nettoyer", "transporter"],
    environnement: ["exterieur"],
    valeurs: ["exterieur", "stabilite", "horaires_fixes"],
    savoirFaire: ["Entretien", "Conduite"],
    savoirEtre: ["Endurance", "Esprit d'équipe", "Fiabilité"],
    savoirs: ["Tri des déchets", "Sécurité sur la voie publique"]
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
    personnes_agees: "avec des personnes âgées",
    collegues: "en équipe",
    seul: "de façon autonome",
    exterieur: "en extérieur",
    magasin: "en magasin",
    bureau: "en bureau",
    deplacement: "en déplacement"
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
      "Aucun métier ne ressort pour le moment. " +
      "Complétez davantage de choix pour affiner les résultats." +
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
  'title="Voir la fiche métier sur France Travail">' +
  metier.secteur + " &middot; ROME " + metier.rome + " &#x1F517;" +
"</a>" +
          "</div>" +
          (metier.sansScore
            ? '<p class="small text-success mb-2">&#10004; Métier ouvert aux débutants, sans expérience exigée.</p>'
            : '<div class="progress mb-2" style="height:18px;" role="progressbar" ' +
              'aria-valuenow="' + metier.score + '" aria-valuemin="0" aria-valuemax="100">' +
              '<div class="progress-bar ' + couleurBarre(metier.score) + '" ' +
                'style="width:' + metier.score + '%;">' +
                metier.score + " % de cohérence" +
              "</div></div>") +
          (raisonsHTML
            ? '<p class="mb-1 fw-semibold small">Pourquoi ce métier ?</p>' +
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
    liste = '<p class="text-muted mb-0">Aucun métier de la base ne mentionne ' +
      'directement cette compétence pour le moment.</p>';
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
      '<p class="small text-muted mt-2 mb-0">Cliquez sur un métier pour ouvrir sa fiche ' +
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

  // Fermeture : croix, touche Echap (plus de clic sur le fond -- retour
  // utilisateur : un clic accidentel a cote, notamment au trackpad, ne
  // doit plus fermer la fenetre).
  document.getElementById('fermerCompetenceBtn').addEventListener('click', fermerFenetreCompetence);
  document.addEventListener('keydown', function echap(e) {
    if (e.key === 'Escape') {
      fermerFenetreCompetence();
      document.removeEventListener('keydown', echap);
    }
  });
}

// TACHE (retour utilisateur : fenetres superposees) : l'ancien detecteur
// global de clic sur les badges de competence (ouvrirFenetreCompetence) a
// ete retire -- il reagissait a n'importe quel badge vert/bleu/cyan sur
// TOUTE la page, y compris ceux deja geres explicitement par le systeme
// plus recent (app.js, data-competence-nom + ouvrirPanneauChoixMetiersAssocies()/
// ouvrirDescriptifMetier()), ce qui ouvrait les 2 fenetres en meme temps sur
// un seul clic. Le systeme app.js couvre deja tous les badges cliquables
// existants de maniere explicite (attribut dedie, cablage precis) : plus
// besoin d'une detection automatique globale en parallele. Le style
// (curseur + survol) reste, ces badges restent visuellement cliquables.
(function () {
  if (typeof document === 'undefined') { return; }

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
        "Recrute sans expérience préalable",
        "Formation assurée à la prise de poste"
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
// texteDisponible : est-ce que le parcours "Analyse rapide" a
// seulement un sens a proposer pour ce document ?
function determinerRecommandationDocument(typeFichier, niveauTexte) {
  if (typeFichier === 'image') {
    return {
      niveau: 'ia_uniquement',
      texteDisponible: false,
      message: 'Votre document est une image ou un scan. Vous allez pouvoir le vérifier et masquer les ' +
        'informations sensibles avant de l\'envoyer à l\'assistant IA.'
    };
  }
  if (typeFichier === 'pdf') {
    if (niveauTexte === 'aucun') {
      return {
        niveau: 'ia_uniquement',
        texteDisponible: false,
        message: 'Votre document semble être un scan (aucun texte n\'a pu être lu directement). Vous allez ' +
          'pouvoir le vérifier et masquer les informations sensibles avant de l\'envoyer à l\'assistant IA.'
      };
    }
    if (niveauTexte === 'peu') {
      return {
        niveau: 'ia_fortement_recommandee',
        texteDisponible: true,
        message: 'Votre document semble contenir peu de texte directement lisible (peut-être un scan partiel ' +
          'ou une mise en page complexe). Vérifiez bien le texte extrait à l\'étape suivante avant de l\'envoyer.'
      };
    }
    return {
      niveau: 'analyse_rapide_suffisante',
      texteDisponible: true,
      message: 'Votre document semble être un texte exploitable. Vous allez pouvoir le vérifier et le corriger ' +
        'avant de l\'envoyer à l\'assistant IA.'
    };
  }
  // .docx et .txt : toujours consideres comme du texte, aucune ambiguite
  // possible pour ces formats (pas de notion de "docx scanne").
  return {
    niveau: 'analyse_rapide_suffisante',
    texteDisponible: true,
    message: 'Votre document semble être un texte exploitable. Vous allez pouvoir le vérifier et le corriger ' +
      'avant de l\'envoyer à l\'assistant IA.'
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
// ============================================================
// ASSISTANT DE DEPOT DU CV -- WIZARD
// ------------------------------------------------------------
// Remplace l'ancienne ouvrirFenetreCV() (retiree, Tache 6) -- point d'entree
// unique desormais pour le depot/analyse du CV et le contexte "lettre".
//
// Philosophie validee, valable pour TOUTES les etapes :
// - une etape = une responsabilite = une decision ;
// - jamais d'accumulation visuelle -- le contenu est INTEGRALEMENT
//   remplace a chaque etape, jamais empile (contrairement a l'ancienne
//   fenetre, qui grossissait au fil du parcours) ;
// - "Retour" ne fait jamais perdre une information deja saisie -- un etat
//   partage unique (etat), jamais recree entre deux etapes, que chaque
//   etape lit pour se pre-remplir plutot que repartir de zero.
// ============================================================

function fermerAssistantDepotCV() {
  var f = document.getElementById('assistantDepotCV');
  if (f) { f.remove(); }
}

// TACHE (retour utilisateur : "je veux le tel/mail en jaune pour les
// trouver plus facilement", option B validée) : detecte les telephones
// (formats francais courants, espaces/points/tirets optionnels) et les
// emails dans un texte, et affiche le resultat en lecture seule, en
// evidence (fond jaune), au-dessus du textarea correspondant -- jamais
// dans le textarea lui-meme (un <textarea> ne peut afficher aucune mise
// en forme). Purement indicatif : n'efface rien automatiquement, la
// personne reste seule a decider et a modifier le texte.
function afficherDetectionCoordonnees(texte) {
  var zone = document.getElementById('detectionCoordonneesEtape2');
  if (!zone) { return; }
  var regexTelephone = /\b0[1-9](?:[\s.\-]?\d{2}){4}\b|\+33[\s.\-]?[1-9](?:[\s.\-]?\d{2}){4}/g;
  var regexEmail = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  var telephones = (texte.match(regexTelephone) || []).filter(function (t, i, arr) { return arr.indexOf(t) === i; });
  var emails = (texte.match(regexEmail) || []).filter(function (t, i, arr) { return arr.indexOf(t) === i; });
  var trouves = telephones.concat(emails);
  if (!trouves.length) { zone.innerHTML = ''; return; }
  zone.innerHTML = '<p class="small text-muted mb-1">Coordonnées détectées dans le texte ci-dessous — pensez à les retirer si vous ne voulez pas les envoyer :</p>' +
    '<div class="d-flex flex-wrap gap-2">' +
    trouves.map(function (t) {
      return '<span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:6px;padding:0.2rem 0.6rem;font-size:0.85rem;font-weight:600;">' +
        echapperAttribut(t) + '</span>';
    }).join('') + '</div>';
}

function ouvrirAssistantDepotCV(mode, options) {
  fermerAssistantDepotCV();
  var modeCV = mode || 'maj';
  var contexte = options || {};

  // TACHE 1 : etat partage unique. Les champs ci-dessous anticipent les
  // besoins des Taches 2 a 5 (juste leur NOM, pas leur logique) -- ce n'est
  // pas une anticipation artificielle de fonctionnalites non demandees,
  // c'est la structure de donnees necessaire au fonctionnement meme du
  // wizard deja valide (dossier, methode, image editee, assistant, reponse).
  var etat = {
    etapeCourante: 1,
    fichier: null,
    resultatAnalyse: null,
    modeEditeur: null,
    imageEditee: null,
    assistantChoisi: null,
    texteReponseIA: ''
  };

  var fenetre = document.createElement('div');
  fenetre.id = 'assistantDepotCV';
  fenetre.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2000;padding:1rem;';
  document.body.appendChild(fenetre);
  // TACHE (retour utilisateur : plus de fermeture au clic sur le fond) :
  // la croix (fermerAssistantDepotCVBtn, plus bas) reste le seul moyen
  // explicite de fermer, en plus de la fin naturelle du parcours.

  function etapeSuivanteWizard() {
    fermerAssistantDepotCV();
    if (contexte && typeof contexte.onTerminer === 'function') {
      contexte.onTerminer();
    } else {
      dossier.modeCreation = modeCV;
      naviguerVers('objectif');
    }
  }

  // TACHE 1 : coeur du squelette. Remplace INTEGRALEMENT le contenu a
  // chaque appel (jamais d'accumulation) et pose un pied de page uniforme
  // (Retour a gauche des l'etape 2, Continuer a droite), dont le
  // comportement est fourni par la definition de l'etape elle-meme.
  function afficherEtape(numero) {
    etat.etapeCourante = numero;
    var etape = obtenirDefinitionEtape(numero);

    fenetre.innerHTML =
      '<div style="background:white;border-radius:1.5rem;max-width:680px;width:100%;' +
      'max-height:90vh;overflow-y:auto;padding:1.5rem;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div class="d-flex justify-content-between align-items-center mb-3">' +
      '<h5 class="mb-0">' + etape.titre + '</h5>' +
      '<button type="button" id="fermerAssistantDepotCVBtn" class="btn btn-sm btn-outline-secondary" ' +
      'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
      '</div>' +
      '<div id="contenuEtapeWizard">' + etape.contenuHTML + '</div>' +
      '<div class="d-flex justify-content-between align-items-center mt-3 pt-3" style="border-top:1px solid #E5E7EB;">' +
      (numero > 1 || (numero === 1 && typeof contexte.onRetourEtape1 === 'function')
        ? '<button type="button" id="btnRetourWizard" class="btn btn-outline-secondary">&#8592; Retour</button>'
        : '<span></span>') +
      (etape.boutonMilieuHTML || '<span></span>') +
      (etape.masquerContinuer ? '' :
      '<button type="button" id="btnContinuerWizard" class="btn btn-primary"' +
      (etape.peutContinuer ? '' : ' disabled') + '>' + (etape.libelleContinuer || 'Continuer &#8594;') + '</button>') +
      '</div></div>';

    document.getElementById('fermerAssistantDepotCVBtn').addEventListener('click', fermerAssistantDepotCV);
    var btnRetour = document.getElementById('btnRetourWizard');
    if (btnRetour) {
      btnRetour.addEventListener('click', function () {
        // TACHE (retour utilisateur : bouton Retour vers le choix initial) :
        // depuis l'etape 1, si ce wizard a ete ouvert via "Co-construire ma
        // lettre" (ouvrirChoixPreparationAccueil), Retour y renvoie plutot
        // que de fermer la fenetre sans rien faire.
        if (numero === 1 && typeof contexte.onRetourEtape1 === 'function') {
          fermerAssistantDepotCV();
          contexte.onRetourEtape1();
        } else {
          allerEtapePrecedente(numero);
        }
      });
    }
    if (!etape.masquerContinuer) {
      document.getElementById('btnContinuerWizard').addEventListener('click', function () {
        if (typeof etape.onContinuer === 'function') { etape.onContinuer(); }
      });
    }
    if (typeof etape.onCablerBoutonMilieu === 'function') { etape.onCablerBoutonMilieu(); }

    if (typeof etape.onAfficher === 'function') { etape.onAfficher(); }
  }

  // TACHE 2 : navigation arriere consciente des etapes sautees -- si
  // l'etape 2 ne s'applique pas (methode rapide, ou document texte pour
  // la methode IA), "Retour" depuis l'etape 3 doit revenir a l'etape 1,
  // jamais s'arreter sur une etape 2 qui n'a jamais ete affichee.
  function allerEtapePrecedente(depuis) {
    afficherEtape(Math.max(1, depuis - 1));
  }

  // TACHE 2 (Etape 1) : cable le depot de fichier + la detection deja
  // construite (analyserDocumentDepose(), Tache 1 du chantier precedent) --
  // aucune logique dupliquee. Si l'etat contient deja un resultat d'analyse
  // (retour en arriere puis re-avance), le reaffiche directement plutot
  // que d'exiger un nouveau depot.
  function cablerEtape1() {
    var inputFichier = document.getElementById('fichierWizardCV');
    var zoneAnalyse = document.getElementById('zoneAnalyseEtape1');

    var btnPasser = document.getElementById('btnPasserEtapeWizard');
    if (btnPasser) {
      btnPasser.addEventListener('click', function () {
        fermerAssistantDepotCV();
        if (typeof contexte.onDocumentPrepare === 'function') { contexte.onDocumentPrepare(null); }
      });
    }

    if (etat.resultatAnalyse) {
      afficherRecommandation(etat.resultatAnalyse);
    }

    inputFichier.addEventListener('change', function () {
      if (!inputFichier.files.length) { return; }
      etat.fichier = inputFichier.files[0];
      var btnContinuer = document.getElementById('btnContinuerWizard');
      if (btnContinuer) { btnContinuer.disabled = true; }
      zoneAnalyse.innerHTML = '<div class="alert alert-light border mb-0">&#8987; Analyse du document en cours...</div>';

      analyserDocumentDepose(etat.fichier).then(function (resultatAnalyse) {
        dossier.cvTexte = resultatAnalyse.texteExtrait || '';
        dossier.cvAnalyse = true;
        etat.resultatAnalyse = resultatAnalyse;
        // TACHE (unification du parcours) : un seul mode restant --
        // l'application ne demande plus de choisir, elle oriente
        // automatiquement vers l'editeur adapte (texte ou graphique).
        etat.modeEditeur = resultatAnalyse.recommandation.texteDisponible ? 'texte' : 'image';
        afficherRecommandation(resultatAnalyse);
      }).catch(function (erreur) {
        zoneAnalyse.innerHTML = '<div class="alert alert-warning mb-0">Impossible de lire ce fichier (' +
          erreur.message + ').</div>';
      });
    });

    function afficherRecommandation(resultatAnalyse) {
      zoneAnalyse.innerHTML =
        '<div class="mb-2" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:0.6rem 0.9rem;">' +
        '<p class="mb-0 small"><strong>&#128161; ' + (etat.modeEditeur === 'texte' ? 'Document texte détecté' : 'Document image/scan détecté') +
        '</strong> — ' + resultatAnalyse.recommandation.message + '</p>' +
        '</div>';
      var btnContinuer = document.getElementById('btnContinuerWizard');
      if (btnContinuer) { btnContinuer.disabled = false; }
    }
  }

  function cablerEtape2() {
    var zoneEditeur = document.getElementById('zoneEditeurCV');

    function afficherEditeur(img) {
      etat.imageSource = img;
      if (typeof etat.rotationDegres !== 'number') { etat.rotationDegres = 0; }
      if (!etat.rectangles) { etat.rectangles = []; }

      // TACHE (retour utilisateur : lisibilite) : canvas un peu plus grand
      // (460 -> 560px), coherent avec la fenetre elle-meme agrandie (voir
      // afficherEtape()) -- "un peu plus grand mais sans trop".
      zoneEditeur.innerHTML =
        '<div class="d-flex justify-content-center gap-2 mb-2">' +
        '<button type="button" id="btnRotationGauche" class="btn btn-sm btn-outline-secondary">&#8634; Pivoter à gauche</button>' +
        '<button type="button" id="btnRotationDroite" class="btn btn-sm btn-outline-secondary">&#8635; Pivoter à droite</button>' +
        '</div>' +
        '<canvas id="canvasEditeurCV" style="max-width:100%;border:1px solid #E5E7EB;border-radius:8px;cursor:crosshair;"></canvas>' +
        '<div class="d-flex justify-content-between align-items-center mt-2">' +
        '<button type="button" id="btnCommentFaireMasquage" class="btn btn-sm btn-outline-secondary">Comment faire ?</button>' +
        '<div class="d-flex align-items-center gap-2">' +
        '<button type="button" id="btnMasquageLocalInfo" class="btn btn-sm btn-outline-secondary">&#128274; Masquage local</button>' +
        '<button type="button" id="btnAgrandirEditeur" title="Agrandir l’aperçu" ' +
        'style="font-weight:700;padding:0.5rem 1.1rem;background:#0d6efd;color:#FFFFFF;border:none;' +
        'border-radius:999px;box-shadow:0 2px 8px rgba(13,110,253,.4);">&#128470;&#65039; Agrandir</button>' +
        '</div>' +
        '</div>' +
        // TACHE (chantier "Videos d'accompagnement") : geste "masquage-image",
        // sur sa propre ligne plutot que dans la barre d'outils deja dense
        // ci-dessus -- reste discret, ne concurrence pas "Comment faire ?"
        // ni le bouton Agrandir.
        '<div class="text-center mt-2">' + htmlDeclencheurDemoVideo('masquage-image') + '</div>';

      var canvas = document.getElementById('canvasEditeurCV');
      var redessiner = initialiserCanvasEditeur(canvas, img, etat, 560);

      document.getElementById('btnRotationGauche').addEventListener('click', function () {
        etat.rotationDegres = calculerNouvelleRotation(etat.rotationDegres, 'gauche');
        // La rotation reinitialise les zones deja masquees : une zone
        // dessinee avant rotation ne correspondrait plus au bon endroit
        // une fois l'image tournee. Workflow naturel : on pivote d'abord,
        // on masque ensuite.
        etat.rectangles = [];
        redessiner();
      });
      document.getElementById('btnRotationDroite').addEventListener('click', function () {
        etat.rotationDegres = calculerNouvelleRotation(etat.rotationDegres, 'droite');
        etat.rectangles = [];
        redessiner();
      });

      document.getElementById('btnCommentFaireMasquage').addEventListener('click', function () {
        ouvrirBulleAide('Comment faire ?',
          'Cliquez-glissez pour dessiner un rectangle noir sur une information à masquer (nom, adresse, ' +
          'téléphone, photo...). Cliquez sur un rectangle existant pour le supprimer.');
      });
      document.getElementById('btnMasquageLocalInfo').addEventListener('click', function () {
        ouvrirBulleAide(null, '&#128274; Rien n’est envoyé nulle part avant votre validation à l’étape suivante.');
      });
      document.getElementById('btnAgrandirEditeur').addEventListener('click', function () {
        ouvrirGrandEditeurMasquage(etat, img, function () { redessiner(); });
      });
    }

    // TACHE 3 ("Retour" ne perd rien) : si le document a deja ete charge
    // (aller-retour dans le wizard), on reaffiche directement l'etat deja
    // construit plutot que de recharger/reconvertir le fichier.
    if (etat.imageSource) {
      afficherEditeur(etat.imageSource);
    } else {
      chargerImageDepuisFichier(etat.fichier).then(afficherEditeur).catch(function (erreur) {
        zoneEditeur.innerHTML = '<div class="alert alert-warning mb-0">' + erreur.message + '</div>';
      });
    }
  }

  // TACHE 3 : genere le document securise a PLEINE RESOLUTION (jamais a
  // l'echelle d'affichage reduite de l'editeur) -- rotation et rectangles
  // "cuits" dans une seule image finale, prete a etre copiee (Tache 4).
  // Declenche un vrai telechargement navigateur du document securise --
  // permet a l utilisateur de le glisser manuellement dans l assistant IA
  // (Etape 3, cas image/scan) si le collage automatique ne suffit pas.

  function genererDocumentSecurise() {
    var img = etat.imageSource;
    var rotation = etat.rotationDegres || 0;
    var largeurFinale = (rotation === 90 || rotation === 270) ? img.height : img.width;
    var hauteurFinale = (rotation === 90 || rotation === 270) ? img.width : img.height;

    var canvasFinal = document.createElement('canvas');
    canvasFinal.width = largeurFinale;
    canvasFinal.height = hauteurFinale;
    var ctxFinal = canvasFinal.getContext('2d');

    ctxFinal.save();
    ctxFinal.translate(canvasFinal.width / 2, canvasFinal.height / 2);
    ctxFinal.rotate(rotation * Math.PI / 180);
    ctxFinal.drawImage(img, -img.width / 2, -img.height / 2);
    ctxFinal.restore();

    (etat.rectangles || []).forEach(function (rectangleAffichage) {
      var r = convertirRectanglePourExport(rectangleAffichage, etat.echelleAffichageEditeur);
      ctxFinal.fillStyle = 'black';
      ctxFinal.fillRect(r.x, r.y, r.largeur, r.hauteur);
    });

    return new Promise(function (resoudre) {
      canvasFinal.toBlob(function (blob) { resoudre(blob); }, 'image/png');
    });
  }

  // ============================================================
  // ETAPE 3 : ANALYSE ASSISTEE PAR IA (Tache 4)
  // ------------------------------------------------------------
  // Absorbe directement dans le wizard, comme demande -- plus de fenetre
  // separee. Reutilise ASSISTANTS_IA et ETAPES_ASSISTANT_IA_TEXTE (deja
  // partagees, app.js), aucune duplication de ces listes. Une nouvelle
  // liste d'etapes est necessaire pour le mode "image securisee" (collage
  // automatique, valide dans notre echange) -- differente de l'ancien
  // mode "piece jointe manuelle" utilise par l'ancienne fenetre.
  // ============================================================

  // TACHE (retour utilisateur : plus de copie d'image en double) : un seul
  // parcours desormais -- le document (masque si vous avez utilise l'outil
  // prevu a cet effet) est deja telecharge a l'Etape 2 (bouton Enregistrer),
  // il ne reste qu'a le glisser dans la conversation avec l'assistant IA
  // choisi.
  // TACHE (menage confidentialite) : "anonymise" retire du texte -- rien ne
  // garantit que la personne a reellement dessine un rectangle de masquage,
  // ce mot affirmait a tort un etat systematiquement atteint.
  var ETAPES_ASSISTANT_IA_IMAGE_SECURISEE_TELECHARGEMENT = [
    'Le prompt d’instructions est <strong>automatiquement copié</strong> dans votre presse-papiers.',
    'Votre document a déjà été téléchargé à l’étape précédente.',
    'Une fois sur le site de {ASSISTANT}, cliquez dans la zone de conversation et faites <strong>Ctrl + V</strong> ' +
    'pour coller le prompt.',
    'Glissez ensuite le document téléchargé dans la conversation, puis appuyez sur <strong>Entrée</strong>.',
    'Une fois sa réponse affichée, cliquez sur le bouton "Copier" de {ASSISTANT}.',
    'Revenez ensuite ici pour importer cette réponse.'
  ];
  // TACHE : detection simple -- ClipboardItem + navigator.clipboard.write()
  // doivent tous les deux exister pour pouvoir copier une image.

  function cablerEtape3() {
    var zone = document.getElementById('zoneEtape3');

    function rendreChoixAssistant() {
      zone.innerHTML =
        // TACHE (retour utilisateur : "une personne a bloqué ici sans
        // comprendre qu'il faut cliquer sur une pastille") : titre
        // agrandi (etait un simple <p> discret), instruction explicite
        // ajoutee juste en dessous plutot que sous-entendue par le seul
        // titre, pastilles agrandies avec un effet de survol plus
        // marque pour bien signaler qu'elles sont cliquables.
        '<p class="fw-bold mb-1" style="font-size:1.3rem;">Choisissez votre assistant IA</p>' +
        '<p class="small text-muted mb-2">Cliquez sur une des pastilles ci-dessous pour continuer.</p>' +
        '<div class="d-flex flex-wrap gap-2 mb-3" id="carteAssistantsIAWizard">' +
        ASSISTANTS_IA.map(function (a) {
          var actif = (etat.assistantChoisi && etat.assistantChoisi.id === a.id) ? ' active-card' : '';
          return '<div class="carte carte-selection-compacte carte-assistant-agrandie' + actif + '" data-assistant-id="' + a.id + '" ' +
            'style="cursor:pointer;padding:0.75rem 1.4rem;font-size:1.05rem;font-weight:600;">' + a.nom + '</div>';
        }).join('') +
        '</div>' +
        '<div id="zoneExplicationAssistant"></div>';

      document.querySelectorAll('#carteAssistantsIAWizard [data-assistant-id]').forEach(function (carte) {
        carte.addEventListener('click', function () {
          document.querySelectorAll('#carteAssistantsIAWizard [data-assistant-id]').forEach(function (c) {
            c.classList.remove('active-card');
          });
          carte.classList.add('active-card');
          etat.assistantChoisi = ASSISTANTS_IA.filter(function (a) { return a.id === carte.dataset.assistantId; })[0];
          var btnContinuer = document.getElementById('btnContinuerWizard');
          if (btnContinuer) { btnContinuer.disabled = false; }
          rendreExplication();
        });
      });

      if (etat.assistantChoisi) { rendreExplication(); }
    }

    function rendreExplication() {
      var zoneExplication = document.getElementById('zoneExplicationAssistant');
      if (!zoneExplication) { return; }
      // TACHE (retour utilisateur : retrait Anonymiser) : la fonction
      // provoquait des remplacements corrompus (ex. "prenom" -> "Pre[ANONYMISE]"
      // quand une valeur courte comme "Nom" apparaissait comme sous-chaine
      // d'un autre mot, anonymiserTexte() n'appliquant aucune limite de mot).
      // Retiree plutot que corrigee sur decision explicite : le risque d'un
      // faux sentiment de confidentialite (donnee partiellement masquee,
      // pas totalement) est juge pire que l'absence de l'option.
      var etapes = etat.modeEditeur === 'image'
        ? ETAPES_ASSISTANT_IA_IMAGE_SECURISEE_TELECHARGEMENT
        : ETAPES_ASSISTANT_IA_TEXTE;
      var etapesHTML = etapes.map(function (etape) {
        return '<li>' + etape.replace(/\{ASSISTANT\}/g, etat.assistantChoisi.nom) + '</li>';
      }).join('');

      // TACHE (chantier "Videos d'accompagnement") : geste "import-reponse-ia"
      // ou "export-ia-image" selon le mode -- ce dernier n'a pas encore de
      // video fournie (voir DEMOS_VIDEO_ERIP, app.js) : htmlDeclencheurDemoVideo()
      // ne genere alors rien, aucune condition supplementaire necessaire ici.
      // TACHE (retour utilisateur : "la vidéo n'est pas la bonne, il faut
      // mettre importer_IA.mp4") : cette etape couvre tout l'aller-retour
      // (envoi ET recuperation de la reponse), et c'est bien importer_IA.mp4
      // (deja utilisee ailleurs sous la cle 'import-reponse-ia') qui montre
      // ce parcours complet -- pas 'export-ia-texte' (Exp_imp_ai.mp4), qui
      // ne montre que l'envoi seul et a trouve sa place ailleurs (voir
      // accordeonChoixIA, app.js).
      var idDemoExport = etat.modeEditeur === 'image' ? 'export-ia-image' : 'import-reponse-ia';

      zoneExplication.innerHTML =
        '<p class="small">Vous allez être redirigé(e) vers le site externe de <strong>' + etat.assistantChoisi.nom +
        '</strong>. Voici exactement ce qui va se passer.</p>' +
        '<ol class="small ps-3 mb-3">' + etapesHTML + '</ol>' +
        '<div class="text-center mb-2">' + htmlDeclencheurDemoVideo(idDemoExport) + '</div>' +
        // TACHE (retour utilisateur : "il me manque une vidéo, l'astuce
        // Astuce_img.mp4", parcours avec image/photo/scan non modifiable) :
        // 3e appelant de htmlBlocAstuceImageRefusee() (les 2 autres sont a
        // l'etape suivante, "Importer la reponse") -- manquait ici, a
        // l'etape d'ENVOI, qui est pourtant le moment le plus utile pour
        // prevenir d'un refus d'image cote assistant.
        (etat.modeEditeur === 'image' ? htmlBlocAstuceImageRefusee() : '');
    }

    rendreChoixAssistant();
  }

  // TACHE 4 : declenchement unique (bouton Continuer du wizard) -- copie
  // (texte ou prompt+image selon le mode) puis ouverture de l'assistant.
  function lancerEnvoiVersAssistantIA() {
    if (!etat.assistantChoisi) { return; }

    function ouvrirAssistantEtContinuer() {
      window.open(etat.assistantChoisi.url, '_blank');
      afficherEtape(4);
    }

    if (etat.modeEditeur === 'image') {
      // TACHE (retour utilisateur : l'image n'atteint jamais l'IA) : le
      // texte d'instructions s'adapte au mode reellement disponible dans ce
      // navigateur -- image collee via un second Ctrl+V (voir le bouton
      // "Copier l'image", Etape 3) si possible, sinon repli glisser-deposer
      // du fichier telecharge (comportement d'origine, inchange dans ce cas).
      // TACHE (retour utilisateur : plus de copie d'image en double) : le
      // document a deja ete telecharge a l'Etape 2 (bouton Enregistrer) --
      // un seul scenario possible desormais, glisser ce fichier dans la
      // conversation.
      var instructions = promptsExternesCharges['extraction-cv'] || promptParDefaut('extraction-cv');
      var messageImage = 'Le document à analyser (image) est fourni séparément : glissez le fichier téléchargé dans la conversation.';
      var instructionsAdaptees = instructions.replace(/Voici le texte du CV à lire\s*:\s*$/, messageImage);
      navigator.clipboard.writeText(instructionsAdaptees).then(ouvrirAssistantEtContinuer).catch(ouvrirAssistantEtContinuer);
    } else {
      // TACHE (retour utilisateur : retrait Anonymiser) : texte brut, plus
      // de version anonymisee (voir rendreExplication ci-dessus).
      var texteDocument = etat.texteDocumentPrepare || dossier.cvTexte;
      var texteACopier = promptCache('extraction-cv', texteDocument);
      navigator.clipboard.writeText(texteACopier).then(ouvrirAssistantEtContinuer).catch(ouvrirAssistantEtContinuer);
    }
  }

  // TACHE 1 : definitions PROVISOIRES des 4 etapes -- juste assez pour
  // valider la mecanique de navigation avant d'y apporter du contenu reel
  // (Taches 2 a 5). Chaque etape est deja individuellement identifiable,
  // navigable dans les deux sens, sans aucune accumulation visuelle.
  // ETAPE 4 : import de la reponse IA -- reutilise integralement le
  // pipeline deja construit (analyserReponseImport/SPECIFICATION_IMPORT/
  // ouvrirEcranValidationImport), aucune logique dupliquee.
  function cablerEtape4() {
    var messageImport = document.getElementById('messageImportWizard');
    activerCollageInstantane({
      idZoneAuto: 'zoneCollageAutoWizard',
      idZoneApercu: 'zoneApercuCollageWizard',
      idTextarea: 'texteCollageWizard',
      idBoutonColler: 'btnCollerAutoWizard',
      idBoutonCollerManuel: 'btnCollerManuelWizard',
      idBoutonEffacerRecoller: 'btnEffacerRecoller',
      idBoutonImporter: 'btnImporterWizard',
      onErreur: function (message) { messageImport.style.color = '#b91c1c'; messageImport.textContent = '⚠️ ' + message; },
      onEffacer: function () { messageImport.textContent = ''; },
      onSucces: function (texte, estAjout) { messageImport.style.color = '#157347'; messageImport.textContent = estAjout ? '✅ Morceau suivant ajouté à la suite. Copiez le prochain morceau puis recliquez, ou cliquez Importer si c’était le dernier.' : '✅ Réponse importée automatiquement depuis le presse-papiers. Si la réponse de l’IA fait plusieurs morceaux, copiez le morceau suivant puis cliquez sur "Coller un morceau supplémentaire", juste en dessous : il s’ajoutera à la suite. Vérifiez l’aperçu ci-dessous, puis cliquez sur "Importer".'; },
      onCollerManuel: function () { messageImport.textContent = ''; }
    });

    document.getElementById('btnImporterWizard').addEventListener('click', function () {
      var texteColle = document.getElementById('texteCollageWizard').value;
      var resultatImport = analyserReponseImport(texteColle, SPECIFICATION_IMPORT);
      if (!resultatImport.succes) {
        messageImport.style.color = '#b91c1c';
        messageImport.textContent = '⚠️ ' + resultatImport.erreur;
        return;
      }
      var nomFichier = (etat.fichier && etat.fichier.name) || '';
      var typeSource = /\.docx$/i.test(nomFichier) ? 'cv_word' : (/\.pdf$/i.test(nomFichier) ? 'cv_pdf' : 'autre');
      dossier.imports.courant = {
        schemaVersion: 1,
        typeSource: typeSource,
        date: new Date().toISOString(),
        donnees: resultatImport.valeurs
      };
      // TACHE (retour utilisateur : bouton Retour sur validation d'import) :
      // le wizard n'est PLUS ferme avant d'ouvrir l'ecran de validation --
      // il reste present (juste recouvert visuellement par l'ecran de
      // validation, z-index superieur), pour pouvoir y revenir sans tout
      // reperdre si la personne clique sur "Retour" (reaffiche l'Etape 2,
      // le texte deja saisi/colle reste intact dans etat.texteDocumentPrepare).
      // etapeSuivanteWizard() ferme deja le wizard elle-meme (voir plus bas).
      ouvrirEcranValidationImport(etapeSuivanteWizard, function () { afficherEtape(2); });
    });
  }

  function obtenirDefinitionEtape(numero) {
    if (numero === 1) {
      return {
        titre: (contexte && contexte.titre) || 'Étape 1 · Déposer votre document',
        contenuHTML:
          '<p class="text-muted small">' + ((contexte && contexte.intro) ||
          'Formats acceptés : PDF, Word (.docx), texte (.txt), ou une photo/scan de ' +
          'votre CV (.jpg, .png...). Votre document est lu directement dans votre navigateur, il n’est envoyé nulle part.') + '</p>' +
          '<input type="file" id="fichierWizardCV" class="form-control mb-3" ' +
          'accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.heic">' +
          '<div id="zoneAnalyseEtape1"></div>' +
          // TACHE (Entretien, document facultatif) : n apparait que si
          // contexte.optionnel est vrai (ex. lettre de motivation) --
          // absent par defaut, comportement du CV inchange.
          (contexte && contexte.optionnel
            ? '<button type="button" id="btnPasserEtapeWizard" class="btn btn-link btn-sm mt-2 p-0">Passer cette étape</button>'
            : ''),
        // TACHE (unification du parcours) : Continuer disponible des que
        // le document est analyse (plus de choix de methode a faire).
        peutContinuer: !!etat.modeEditeur,
        onContinuer: function () { afficherEtape(2); },
        onAfficher: function () { cablerEtape1(); }
      };
    }
    if (numero === 2) {
      if (etat.modeEditeur === 'texte') {
        return {
          titre: 'Étape 2 · Vérifier le texte',
          contenuHTML:
            '<p class="text-muted small">Corrigez le texte si besoin, et masquez les informations personnelles ' +
            'que vous ne souhaitez pas envoyer à l’assistant IA.</p>' +
            // TACHE (retour utilisateur : message uniforme sur tous les
            // ecrans de verification/import de document) : meme message,
            // meme icone, que sur "Vérifier vos documents" (Preparer un
            // entretien depuis l'accueil).
            '<p class="small mb-2" style="color:#B45309;">&#128274; Il est fortement recommandé de masquer les ' +
            'informations qui permettraient de vous identifier facilement (nom, coordonnées, photo) avant l’envoi ' +
            'à l’assistant IA.</p>' +
            // TACHE (retour utilisateur : "je veux le tel/mail en jaune
            // pour les trouver plus facilement") : un <textarea> ne peut
            // afficher aucune mise en forme (limite du HTML, pas du
            // code) -- solution retenue (option B, validée) : une liste
            // en LECTURE SEULE, juste au-dessus, qui detecte
            // automatiquement les telephones/emails presents dans le
            // texte et les affiche en evidence (fond jaune) pour que la
            // personne les retrouve vite dans le texte ci-dessous et les
            // efface elle-meme. Mise a jour a chaque frappe (voir
            // cablerEtape2VerificationTexte ci-dessous).
            '<div id="detectionCoordonneesEtape2" class="mb-2"></div>' +
            '<textarea class="form-control" id="texteEditeurCV" rows="16" style="font-size:0.85rem;"></textarea>' +
            // TACHE (chantier "Videos d'accompagnement") : geste
            // "masquage-texte" -- htmlDeclencheurDemoVideo() (app.js) ne
            // genere rien si la video n'est pas disponible dans la table.
            '<div class="text-center mt-2">' + htmlDeclencheurDemoVideo('masquage-texte') + '</div>',
          peutContinuer: true,
          libelleContinuer: 'Enregistrer',
          onContinuer: function () {
            etat.texteDocumentPrepare = document.getElementById('texteEditeurCV').value;
            // TACHE (Entretien, sortie anticipee) : si l appelant ne veut
            // que le document prepare (pas d extraction IA structuree),
            // on s arrete ici. Comportement par defaut inchange sinon.
            if (typeof contexte.onDocumentPrepare === 'function') {
              fermerAssistantDepotCV();
              contexte.onDocumentPrepare({ type: 'texte', valeur: etat.texteDocumentPrepare });
              return;
            }
            afficherEtape(3);
          },
          onAfficher: function () {
            var champ = document.getElementById('texteEditeurCV');
            champ.value = (typeof etat.texteDocumentPrepare === 'string') ? etat.texteDocumentPrepare : dossier.cvTexte;
            afficherDetectionCoordonnees(champ.value);
            champ.addEventListener('input', function () { afficherDetectionCoordonnees(champ.value); });
          }
        };
      }
      return {
        titre: 'Étape 2 · Vérifier le document',
        contenuHTML:
          // TACHE (retour utilisateur : message uniforme sur tous les
          // ecrans de verification/import de document) : meme message,
          // meme icone, que sur "Vérifier vos documents" (Preparer un
          // entretien depuis l'accueil).
          '<p class="small mb-2" style="color:#B45309;">&#128274; Il est fortement recommandé de masquer les ' +
          'informations qui permettraient de vous identifier facilement (nom, coordonnées, photo) avant l’envoi ' +
          'à l’assistant IA.</p>' +
          '<button type="button" id="btnInfoEtape2" title="Informations" ' +
          'style="width:28px;height:28px;border-radius:50%;background:#0d6efd;color:#fff;border:none;' +
          'font-weight:700;font-style:italic;font-family:Georgia,serif;margin-bottom:0.75rem;">i</button>' +
          '<div id="zoneEditeurCV" class="text-center"><p class="text-muted small">Chargement du document...</p></div>' +
          // TACHE (retour utilisateur : l'enregistrement doit reellement se
          // produire ici, pas juste faire avancer le wizard) : message
          // d'incitation, mis a jour dynamiquement une fois enregistre.
          '<p class="text-center small mt-3 mb-0" id="messageEnregistrerEtape2" style="color:#B45309;">' +
          '&#128161; Pensez à enregistrer votre document (après avoir masqué les informations sensibles si besoin) : ' +
          'c’est indispensable pour l’envoyer à l’assistant IA à l’étape suivante.</p>',
        // TACHE : Continuer reste bloque tant que le document n'a pas ete
        // reellement enregistre (etat.imageEditee sert de temoin, deja
        // present si on revient sur cette etape apres un aller-retour).
        peutContinuer: !!etat.imageEditee,
        libelleContinuer: 'Continuer &#8594;',
        onContinuer: function () {
          // TACHE (retour utilisateur : parcours "Co-construire votre
          // lettre de motivation") : meme crochet de sortie anticipee que
          // le mode texte (voir plus haut) -- manquait ici jusqu'a present.
          // En mode image, rien a transmettre directement (le fichier est
          // deja telecharge sur le poste, voir onCablerBoutonMilieu) : on
          // signale juste que le document est pret, la personne le glisse
          // elle-meme dans la conversation avec l'assistant IA.
          if (typeof contexte.onDocumentPrepare === 'function') {
            fermerAssistantDepotCV();
            contexte.onDocumentPrepare({ type: 'image' });
            return;
          }
          afficherEtape(3);
        },
        boutonMilieuHTML:
          '<button type="button" id="btnEnregistrerEtape2" class="btn btn-primary" ' +
          'style="font-weight:700;">&#128190; Enregistrer</button>',
        onCablerBoutonMilieu: function () {
          document.getElementById('btnEnregistrerEtape2').addEventListener('click', function () {
            var btnMilieu = document.getElementById('btnEnregistrerEtape2');
            btnMilieu.disabled = true;
            btnMilieu.textContent = 'Enregistrement en cours...';
            genererDocumentSecurise().then(function (blob) {
              etat.imageEditee = blob;
              telechargerDocumentSecurise(blob);
              btnMilieu.disabled = false;
              btnMilieu.textContent = '✅ Document enregistré';
              var message = document.getElementById('messageEnregistrerEtape2');
              if (message) {
                message.style.color = '#15803D';
                message.innerHTML = '&#9989; Document enregistré. Vous pouvez continuer.';
              }
              var btnContinuer = document.getElementById('btnContinuerWizard');
              if (btnContinuer) { btnContinuer.disabled = false; }
            }).catch(function () {
              btnMilieu.disabled = false;
              btnMilieu.textContent = '&#128190; Enregistrer';
              alert('Une erreur est survenue lors de l’enregistrement du document. Réessayez.');
            });
          });
        },
        onAfficher: function () {
          cablerEtape2();
          document.getElementById('btnInfoEtape2').addEventListener('click', function () {
            ouvrirBulleAide(null, 'Faites pivoter le document si besoin, et masquez les informations ' +
              'personnelles que vous ne souhaitez pas envoyer à l’assistant IA.');
          });
        }
      };
    }
    if (numero === 3) {
      return {
        titre: 'Étape 3 · Analyse assistée par IA',
        contenuHTML: '<div id="zoneEtape3"></div>',
        peutContinuer: !!etat.assistantChoisi,
        onContinuer: function () { lancerEnvoiVersAssistantIA(); },
        // TACHE (retour utilisateur : eviter de rouvrir l'assistant pour
        // rien) : si l'Etape 4 a deja ete affichee au moins une fois dans
        // CETTE session du wizard (la personne est deja allee jusqu'a
        // l'assistant), un bouton supplementaire permet d'y retourner
        // directement -- sans redeclencher la copie du prompt ni
        // rouvrir un nouvel onglet vers l'assistant.
        boutonMilieuHTML: etat.etape4DejaVisitee
          ? '<button type="button" id="btnDejaVuAssistant" class="btn btn-outline-primary">J’ai déjà ma réponse &#8594;</button>'
          : '',
        onCablerBoutonMilieu: function () {
          var btn = document.getElementById('btnDejaVuAssistant');
          if (btn) { btn.addEventListener('click', function () { afficherEtape(4); }); }
        },
        onAfficher: function () { cablerEtape3(); }
      };
    }
    return {
      titre: 'Étape 4 · Importer la réponse',
      contenuHTML:
        '<p class="small text-muted">Retournez sur la conversation avec l’assistant IA, cliquez sur son bouton ' +
        '<strong>"Copier"</strong> juste sous sa réponse, puis revenez ici.</p>' +
        // TACHE (retour utilisateur : coller en un clic, generalise) :
        // reutilise le composant partage (app.js), voir son commentaire
        // pour le detail du comportement (lecture seule, Entree globale,
        // filet de secours).
        htmlCollageInstantane('Wizard',
          '<div class="d-flex align-items-center gap-2 mb-2 mt-2">' +
          // TACHE (retour utilisateur : "je clique sur la vidéo par erreur
          // 2 fois sur 3") : "Importer" etait un petit bouton bootstrap
          // standard (btn-sm), nettement moins visible que "Voir la
          // démonstration" juste en dessous (grand bouton bleu en
          // pilule) -- la personne cliquait le mauvais des deux par
          // reflexe visuel. Meme style proeminent que "Importer dans le
          // CV" (page Action) desormais, pour qu'il soit clairement le
          // bouton principal de cette etape.
          '<button type="button" id="btnImporterWizard" style="font-size:1.05rem;font-weight:700;padding:0.65rem 1.5rem;' +
          'background:#0d6efd;color:#FFFFFF;border:none;border-radius:999px;box-shadow:0 4px 14px rgba(13,110,253,.4);">&#128229; Importer</button>' +
          '<button type="button" class="btn btn-outline-secondary btn-sm" id="btnEffacerRecoller">Effacer et recoller</button>' +
          '</div>') +
        '<div id="messageImportWizard" class="mt-2 small"></div>' +
        // TACHE (chantier "Videos d'accompagnement") : bloc Astuce, affiche
        // uniquement si le document depose etait une image/PDF -- sans
        // objet en mode texte.
        (etat.modeEditeur === 'image' ? htmlBlocAstuceImageRefusee() : ''),
      masquerContinuer: true,
      onAfficher: function () {
        // TACHE (retour utilisateur : eviter de rouvrir l'assistant pour
        // rien) : marque cette etape comme deja visitee, pour que
        // l'Etape 3 propose ensuite un raccourci direct (voir plus haut).
        etat.etape4DejaVisitee = true;
        cablerEtape4();
      }
    };
  }

  afficherEtape(1);
}

// ============================================================
// EDITEUR DE DOCUMENT (Tache 3, Etape 2)
// ------------------------------------------------------------
// Petit editeur volontairement limite : rotation, rectangles noirs,
// suppression d'un rectangle -- jamais un logiciel de retouche complet.
// Fonctionne a l'identique pour une image et un PDF scanne (converti de
// facon transparente en image via pdf.js, deja utilise ailleurs dans
// l'application pour l'extraction de texte).
// ============================================================

// Fonctions PURES (aucune dependance au DOM/canvas), testables isolement.

// Trouve l'INDEX du dernier rectangle (le plus recent, dessine au-dessus)
// contenant le point (x, y), ou -1 si aucun. Utilise pour le clic de
// suppression.
function trouverRectangleSousPoint(rectangles, x, y) {
  for (var i = (rectangles || []).length - 1; i >= 0; i--) {
    var r = rectangles[i];
    if (x >= r.x && x <= r.x + r.largeur && y >= r.y && y <= r.y + r.hauteur) { return i; }
  }
  return -1;
}

// Cycle de rotation par pas de 90°, toujours ramene entre 0 et 359.
function calculerNouvelleRotation(rotationActuelle, sens) {
  var delta = (sens === 'gauche') ? -90 : 90;
  return ((rotationActuelle || 0) + delta + 360) % 360;
}

// Convertit un rectangle exprime en coordonnees d'AFFICHAGE (canvas mis a
// l'echelle pour tenir dans la fenetre) vers des coordonnees a la
// RESOLUTION REELLE du document -- indispensable pour ne pas envoyer une
// version degradee a l'IA au moment de generer le document securise.
function convertirRectanglePourExport(rectangleAffichage, echelleAffichage) {
  var e = echelleAffichage || 1;
  return {
    x: rectangleAffichage.x / e,
    y: rectangleAffichage.y / e,
    largeur: rectangleAffichage.largeur / e,
    hauteur: rectangleAffichage.hauteur / e
  };
}

// TACHE 3 (transparence PDF/image) : point d'entree unique, quel que soit
// le format d'origine -- retourne toujours une <img> chargee, prete a
// dessiner sur un canvas. La personne n'a jamais besoin de savoir si son
// document etait un PDF ou une image.
function chargerImageDepuisFichier(fichier) {
  var nom = (fichier.name || '').toLowerCase();
  if (nom.endsWith('.pdf')) { return chargerPremierePagePDFCommeImage(fichier); }
  return new Promise(function (resoudre, rejeter) {
    var url = URL.createObjectURL(fichier);
    var img = new Image();
    img.onload = function () { resoudre(img); };
    img.onerror = function () { rejeter(new Error('Impossible de charger ce document.')); };
    img.src = url;
  });
}

// Convertit la 1ere page d'un PDF en image, via pdf.js -- reutilise
// exactement le meme chargement paresseux que lireFichierCV() (Tache 1,
// moteur d'import), aucune logique dupliquee.
function chargerPremierePagePDFCommeImage(fichier) {
  var promessePdfLib = window.pdfjsLib
    ? Promise.resolve()
    : chargerScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  return promessePdfLib.then(function () {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return fichier.arrayBuffer();
  }).then(function (donnees) {
    return window.pdfjsLib.getDocument({ data: donnees }).promise;
  }).then(function (pdf) {
    return pdf.getPage(1);
  }).then(function (page) {
    var viewport = page.getViewport({ scale: 2 });
    var canvasTemp = document.createElement('canvas');
    canvasTemp.width = viewport.width;
    canvasTemp.height = viewport.height;
    var ctxTemp = canvasTemp.getContext('2d');
    return page.render({ canvasContext: ctxTemp, viewport: viewport }).promise.then(function () {
      return new Promise(function (resoudre, rejeter) {
        var img = new Image();
        img.onload = function () { resoudre(img); };
        img.onerror = function () { rejeter(new Error('Impossible de convertir la page PDF en image.')); };
        img.src = canvasTemp.toDataURL('image/png');
      });
    });
  });
}

// TACHE (retour utilisateur : bouton "agrandir") : les rectangles de
// masquage sont stockes en coordonnees d'AFFICHAGE (echelle du canvas au
// moment ou ils ont ete dessines, cf. convertirRectanglePourExport()
// juste au-dessus). Pour pouvoir dessiner/afficher les MEMES rectangles
// sur un canvas a une autre echelle (petite vue <-> grande vue), il
// suffit de les reconvertir proportionnellement -- pas de matrice
// complexe puisque la rotation est deja appliquee identiquement des deux
// cotes, seule l'echelle finale differe.
function rebasculerRectanglesVersEchelle(etatPartage, nouvelleEchelle) {
  var echelleActuelle = etatPartage.echelleAffichageEditeur;
  if (echelleActuelle && echelleActuelle !== nouvelleEchelle) {
    var facteur = nouvelleEchelle / echelleActuelle;
    (etatPartage.rectangles || []).forEach(function (r) {
      r.x *= facteur; r.y *= facteur; r.largeur *= facteur; r.hauteur *= facteur;
    });
  }
  etatPartage.echelleAffichageEditeur = nouvelleEchelle;
}

// TACHE (retour utilisateur : bouton "agrandir") : rendu + interactions
// souris du canvas d'edition, extraits pour etre reutilises A L'IDENTIQUE
// par la petite vue (dans la fenetre) et la grande vue (bouton agrandir) --
// aucune logique dupliquee entre les deux.
function initialiserCanvasEditeur(canvas, img, etatPartage, largeurMax, onRectanglesModifies) {
  var ctx = canvas.getContext('2d');

  function redessiner() {
    var rotation = etatPartage.rotationDegres || 0;
    var largeurFinale = (rotation === 90 || rotation === 270) ? img.height : img.width;
    var hauteurFinale = (rotation === 90 || rotation === 270) ? img.width : img.height;
    var echelle = Math.min(1, largeurMax / largeurFinale);
    rebasculerRectanglesVersEchelle(etatPartage, echelle);

    canvas.width = largeurFinale * echelle;
    canvas.height = hauteurFinale * echelle;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(echelle, echelle);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    (etatPartage.rectangles || []).forEach(function (r) {
      ctx.fillStyle = 'black';
      ctx.fillRect(r.x, r.y, r.largeur, r.hauteur);
    });
  }

  var dessinEnCours = null;
  canvas.addEventListener('mousedown', function (e) {
    var rectCanvas = canvas.getBoundingClientRect();
    dessinEnCours = {
      xDepart: e.clientX - rectCanvas.left, yDepart: e.clientY - rectCanvas.top,
      xActuel: e.clientX - rectCanvas.left, yActuel: e.clientY - rectCanvas.top
    };
  });
  canvas.addEventListener('mousemove', function (e) {
    if (!dessinEnCours) { return; }
    var rectCanvas = canvas.getBoundingClientRect();
    dessinEnCours.xActuel = e.clientX - rectCanvas.left;
    dessinEnCours.yActuel = e.clientY - rectCanvas.top;
    redessiner();
    ctx.fillStyle = 'black';
    ctx.fillRect(
      Math.min(dessinEnCours.xDepart, dessinEnCours.xActuel),
      Math.min(dessinEnCours.yDepart, dessinEnCours.yActuel),
      Math.abs(dessinEnCours.xActuel - dessinEnCours.xDepart),
      Math.abs(dessinEnCours.yActuel - dessinEnCours.yDepart)
    );
  });
  canvas.addEventListener('mouseup', function () {
    if (!dessinEnCours) { return; }
    var distance = Math.hypot(dessinEnCours.xActuel - dessinEnCours.xDepart, dessinEnCours.yActuel - dessinEnCours.yDepart);
    if (distance < 5) {
      var indexTrouve = trouverRectangleSousPoint(etatPartage.rectangles, dessinEnCours.xDepart, dessinEnCours.yDepart);
      if (indexTrouve !== -1) { etatPartage.rectangles.splice(indexTrouve, 1); }
    } else {
      etatPartage.rectangles.push({
        x: Math.min(dessinEnCours.xDepart, dessinEnCours.xActuel),
        y: Math.min(dessinEnCours.yDepart, dessinEnCours.yActuel),
        largeur: Math.abs(dessinEnCours.xActuel - dessinEnCours.xDepart),
        hauteur: Math.abs(dessinEnCours.yActuel - dessinEnCours.yDepart)
      });
    }
    dessinEnCours = null;
    redessiner();
    if (typeof onRectanglesModifies === 'function') { onRectanglesModifies(); }
  });

  redessiner();
  return redessiner;
}

// TACHE (retour utilisateur : bulles d'aide) : composant generique reutilise
// pour les 3 textes d'aide de l'etape 2 -- meme principe de fermeture que
// la fenetre wizard elle-meme (clic sur le fond OU sur la croix).
// TACHE (migration Design System - Phase 2, chantier "metiers.js", 1ere
// migration) : devient une recette qui appelle la primitive
// ouvrirFenetreERIP() (definie dans app.js, chargee et executee bien avant
// tout clic utilisateur qui pourrait invoquer cette fonction -- aucun
// probleme d'ordre de chargement entre les deux fichiers). Ne construit
// plus son propre overlay, sa propre croix, ni sa propre logique de clic
// exterieur. Contrat public STRICTEMENT inchange : meme signature
// (titre, texteHTML), aucune valeur de retour avant comme apres.
// Le titre optionnel (peut etre null) est normalise en chaine vide avant
// d'etre transmis a la primitive, pour ne jamais afficher le mot "null".
function ouvrirBulleAide(titre, texteHTML) {
  ouvrirFenetreERIP({
    titre: titre || '',
    contenuHTML: '<p class="mb-0" style="font-size:1.1rem;line-height:1.5;">' + texteHTML + '</p>'
  });
}

// TACHE (retour utilisateur : bouton "agrandir") : grande vue de l'editeur,
// MEME etat partage (etatPartage.rectangles/rotationDegres/imageSource)
// que la petite vue -- tout changement fait ici (rotation exclue, non
// demandee dans la grande vue) est immediatement repercute, y compris
// apres fermeture. A la fermeture, rafraichit la petite vue pour refleter
// les eventuelles modifications.
function ouvrirGrandEditeurMasquage(etatPartage, img, onFermeture) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,26,51,0.55);' +
    'display:flex;align-items:center;justify-content:center;z-index:2200;padding:1rem;';
  // TACHE (retour utilisateur : encore plus grande) : plafond releve de
  // 1000 a 1400px -- c'est lui qui limitait la taille reelle sur les
  // grands ecrans (95vw/95vh servaient deja de plafond proportionnel,
  // inchanges).
  var largeurMax = Math.min(1400, window.innerWidth * 0.9, window.innerHeight * 0.85);
  overlay.innerHTML =
    '<div style="background:white;border-radius:1rem;max-width:95vw;max-height:95vh;overflow:auto;padding:1.5rem;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
    '<div class="d-flex justify-content-between align-items-center mb-2">' +
    '<h6 class="mb-0">Masquer une information</h6>' +
    '<button type="button" id="btnFermerGrandEditeur" class="btn btn-sm btn-outline-secondary" ' +
    'style="border-radius:50%;width:32px;height:32px;padding:0;">&#10005;</button>' +
    '</div>' +
    '<div class="d-flex justify-content-center gap-2 mb-2">' +
    '<button type="button" id="btnRotationGaucheGrand" class="btn btn-sm btn-outline-secondary">&#8634; Pivoter à gauche</button>' +
    '<button type="button" id="btnRotationDroiteGrand" class="btn btn-sm btn-outline-secondary">&#8635; Pivoter à droite</button>' +
    '</div>' +
    '<p class="text-muted mb-2" style="font-size:1.05rem;">Cliquez-glissez pour dessiner un rectangle noir sur une ' +
    'information à masquer. Cliquez sur un rectangle existant pour le supprimer.</p>' +
    '<canvas id="canvasGrandEditeurCV" style="max-width:100%;border:1px solid #E5E7EB;border-radius:8px;cursor:crosshair;"></canvas>' +
    '</div>';
  document.body.appendChild(overlay);
  function fermer() {
    overlay.remove();
    if (typeof onFermeture === 'function') { onFermeture(); }
  }
  // TACHE (retour utilisateur : plus de fermeture au clic sur le fond) :
  // la croix (btnFermerGrandEditeur) reste le seul moyen explicite de fermer.
  document.getElementById('btnFermerGrandEditeur').addEventListener('click', fermer);
  var redessinerGrand = initialiserCanvasEditeur(document.getElementById('canvasGrandEditeurCV'), img, etatPartage, largeurMax);
  // TACHE (retour utilisateur : rotation dans la grande vue) : meme
  // comportement que la petite vue (les 2 boutons existants, meme regle
  // de reinitialisation des zones masquees a la rotation -- coherence
  // partagee via calculerNouvelleRotation(), deja utilisee ailleurs).
  document.getElementById('btnRotationGaucheGrand').addEventListener('click', function () {
    etatPartage.rotationDegres = calculerNouvelleRotation(etatPartage.rotationDegres, 'gauche');
    etatPartage.rectangles = [];
    redessinerGrand();
  });
  document.getElementById('btnRotationDroiteGrand').addEventListener('click', function () {
    etatPartage.rotationDegres = calculerNouvelleRotation(etatPartage.rotationDegres, 'droite');
    etatPartage.rectangles = [];
    redessinerGrand();
  });
}

// Cable l'etape 2 : charge le document (image ou PDF, de facon
// transparente), affiche le canvas d'edition, les boutons de rotation, et
// la gestion souris (glisser = dessiner un rectangle, clic simple sur un
// rectangle existant = le supprimer).

function telechargerDocumentSecurise(blob, nomFichier) {
  var url = URL.createObjectURL(blob);
  var lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier || 'document-securise.png';
  lien.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

// TACHE (Preparer un entretien, Etape 2) : version PARAMETREE de la
// generation "document securise" (rotation + rectangles "cuits" a pleine
// resolution) -- meme principe exact que genererDocumentSecurise() (restee
// dans l'ancienne fenetre a document unique, toujours utilisee telle
// quelle par elle), mais qui ne depend d'aucun etat ferme : reutilisable
// pour n'importe quel document, y compris plusieurs a la fois. Reutilise
// convertirRectanglePourExport(), deja hissee au niveau global.
function construireCanvasDocumentSecurise(img, rotationDegres, rectangles, echelleAffichageEditeur) {
  var rotation = rotationDegres || 0;
  var largeurFinale = (rotation === 90 || rotation === 270) ? img.height : img.width;
  var hauteurFinale = (rotation === 90 || rotation === 270) ? img.width : img.height;
  var canvasFinal = document.createElement('canvas');
  canvasFinal.width = largeurFinale;
  canvasFinal.height = hauteurFinale;
  var ctxFinal = canvasFinal.getContext('2d');
  ctxFinal.save();
  ctxFinal.translate(canvasFinal.width / 2, canvasFinal.height / 2);
  ctxFinal.rotate(rotation * Math.PI / 180);
  ctxFinal.drawImage(img, -img.width / 2, -img.height / 2);
  ctxFinal.restore();
  (rectangles || []).forEach(function (rectangleAffichage) {
    var r = convertirRectanglePourExport(rectangleAffichage, echelleAffichageEditeur);
    ctxFinal.fillStyle = 'black';
    ctxFinal.fillRect(r.x, r.y, r.largeur, r.hauteur);
  });
  return canvasFinal;
}

// TACHE (retour utilisateur : "vieille popup" surprise) : "Enregistrer"
// declenchait window.print() (fenetre d'impression native du navigateur),
// vecue comme une popup ancienne/inattendue par rapport au reste de
// l'appli. Remplace par un VRAI telechargement, meme mecanisme et memes
// fonctions que la carte "j'ai un cv" (genererDocumentSecurise() +
// telechargerDocumentSecurise(), deja existantes) -- un fichier par
// document en mode image (le mode texte n'a rien a telecharger, le texte
// reste dans l'etat pour l'etape suivante, comme partout ailleurs).
function enregistrerDocumentsVerification(documents, callback) {
  var documentsImage = documents.filter(function (doc) { return doc.mode === 'image' && doc.imageChargee; });
  documentsImage.forEach(function (doc, i) {
    var canvasFinal = construireCanvasDocumentSecurise(doc.imageChargee, doc.rotationDegres, doc.rectangles, doc.echelleAffichageEditeur);
    canvasFinal.toBlob(function (blob) {
      if (blob) { telechargerDocumentSecurise(blob, (doc.cle || 'document') + '-verifie.png'); }
      if (i === documentsImage.length - 1 && typeof callback === 'function') { callback(); }
    }, 'image/png');
  });
  if (documentsImage.length === 0 && typeof callback === 'function') { callback(); }
}

// TACHE (migration Design System, chantier "metiers.js", 8e et derniere
// migration) : devient une recette qui appelle la primitive
// ouvrirFenetreERIP() au premier affichage, puis
// mettreAJourContenuFenetreERIP() a chaque navigation entre documents --
// meme fenetre, contenu reecrit, exactement le motif qui a justifie cette
// 3e fonction de la primitive (validee independamment au prealable, 48
// verifications). fermerVerificationEntretien() est retiree (aucun
// appelant externe, verifie avant suppression) : fermerFenetreERIP() migre
// desormais ce role. Largeur 680px -> taille "large" (700px), harmonisation
// habituelle.
//
// Simplification permise par la nouvelle capacite : la croix de fermeture
// et le clic exterieur ne sont plus reconstruits ni recables a chaque
// affichage (comme c'etait le cas avant) -- ils appartiennent a l'en-tete
// et a l'overlay de la primitive, jamais touches par une mise a jour de
// contenu (regle 6 du contrat de mettreAJourContenuFenetreERIP()).
//
// TACHE (Preparer un entretien, Etape 2) : verification/masquage pour 1 OU
// 2 documents (CV + Lettre, selon ce qui a ete depose a l'Etape 1).
// Reutilise integralement les briques deja hissees au niveau global
// (chargerImageDepuisFichier, initialiserCanvasEditeur, calculerNouvelleRotation) --
// aucune logique de masquage/rotation dupliquee, seulement la navigation
// entre documents et l'assemblage final.
function ouvrirVerificationEntretien(etatDocuments, onTerminer, onRetour) {

  function construireListeDocuments() {
    var liste = [];
    ['cv', 'lettre'].forEach(function (cle) {
      var d = etatDocuments[cle];
      if (!d || !d.analyse) { return; }
      liste.push({
        cle: cle,
        titre: cle === 'cv' ? '&#128196; Votre CV' : '&#9993;&#65039; Votre lettre de motivation',
        fichier: d.fichier,
        mode: d.analyse.recommandation.texteDisponible ? 'texte' : 'image',
        imageChargee: null, rotationDegres: 0, rectangles: [], echelleAffichageEditeur: null,
        texteEdite: d.analyse.texteExtrait || '',
        vu: false
      });
    });
    return liste;
  }

  // TACHE (correction bug : ecran gris apres Retour) : cette fonction est
  // appelee dans 2 cas differents -- (1) premier passage depuis
  // ouvrirDepotEntretien(), etatDocuments est alors l'objet {cv:{...},
  // lettre:{...}} attendu par construireListeDocuments() ; (2) retour
  // depuis "Entreprise et poste vise", etatDocuments est DEJA le tableau
  // de documents (avec masquages/corrections deja faits) produit par le
  // premier passage. Repasser ce tableau dans construireListeDocuments()
  // (qui lit etatDocuments['cv']/etatDocuments['lettre'], absents sur un
  // tableau) produisait une liste vide puis un plantage a l'affichage --
  // fenetre grise vide, sans jamais reconstruire son contenu.
  var documents = Array.isArray(etatDocuments) ? etatDocuments : construireListeDocuments();
  var indexActif = 0;
  var premierAffichage = true;

  function tousVus() { return documents.every(function (d) { return d.vu; }); }

  function sauverEtatCourant() {
    var doc = documents[indexActif];
    if (doc.mode === 'texte') {
      var champ = document.getElementById('texteVerifDoc');
      if (champ) { doc.texteEdite = champ.value; }
    }
  }

  function initialiserEtCablerCanvas(doc) {
    var canvas = document.getElementById('canvasVerifDoc');
    function pret() {
      var redessiner = initialiserCanvasEditeur(canvas, doc.imageChargee, doc, 560);
      document.getElementById('btnRotGaucheVerif').addEventListener('click', function () {
        doc.rotationDegres = calculerNouvelleRotation(doc.rotationDegres, 'gauche');
        doc.rectangles = [];
        redessiner();
      });
      document.getElementById('btnRotDroiteVerif').addEventListener('click', function () {
        doc.rotationDegres = calculerNouvelleRotation(doc.rotationDegres, 'droite');
        doc.rectangles = [];
        redessiner();
      });
      document.getElementById('btnAgrandirVerif').addEventListener('click', function () {
        ouvrirGrandEditeurMasquage(doc, doc.imageChargee, function () { redessiner(); });
      });
    }
    if (doc.imageChargee) { pret(); return; }
    chargerImageDepuisFichier(doc.fichier).then(function (img) {
      doc.imageChargee = img;
      pret();
    }).catch(function () {
      canvas.outerHTML = '<p class="text-danger small">Impossible de charger ce document.</p>';
    });
  }

  function afficher() {
    documents[indexActif].vu = true;
    var doc = documents[indexActif];

    var navigation = documents.length > 1
      ? '<div class="d-flex justify-content-between align-items-center mb-2">' +
        '<button type="button" id="btnDocPrecedent" class="btn btn-sm btn-outline-secondary"' +
        (indexActif === 0 ? ' disabled' : '') + '>&#9664;</button>' +
        '<span class="small fw-bold">' + doc.titre + ' (' + (indexActif + 1) + '/' + documents.length + ')</span>' +
        '<button type="button" id="btnDocSuivant" class="btn btn-sm btn-outline-secondary"' +
        (indexActif === documents.length - 1 ? ' disabled' : '') + '>&#9654;</button>' +
        '</div>'
      : '<p class="fw-bold small mb-2">' + doc.titre + '</p>';

    // TACHE (chantier "Videos d'accompagnement") : memes gestes
    // "masquage-texte"/"masquage-image" que dans le wizard CV (cablerEtape2()) --
    // ecran distinct, mais meme table DEMOS_VIDEO_ERIP, aucune duplication
    // de video.
    var corpsHTML = (doc.mode === 'texte')
      ? '<textarea id="texteVerifDoc" class="form-control" rows="14" style="font-size:0.95rem;">' +
        echapperAttribut(doc.texteEdite) + '</textarea>' +
        '<div class="text-center mt-2">' + htmlDeclencheurDemoVideo('masquage-texte') + '</div>'
      : '<div class="d-flex justify-content-center flex-wrap gap-2 mb-2">' +
        '<button type="button" id="btnRotGaucheVerif" class="btn btn-sm btn-outline-secondary">&#8634; Pivoter à gauche</button>' +
        '<button type="button" id="btnRotDroiteVerif" class="btn btn-sm btn-outline-secondary">&#8635; Pivoter à droite</button>' +
        '<button type="button" id="btnAgrandirVerif" title="Agrandir l’aperçu" ' +
        'style="font-weight:700;padding:0.4rem 1rem;background:#0d6efd;color:#FFFFFF;border:none;' +
        'border-radius:999px;box-shadow:0 2px 8px rgba(13,110,253,.4);">&#128470;&#65039; Agrandir</button>' +
        '</div>' +
        '<canvas id="canvasVerifDoc" style="max-width:100%;border:1px solid #E5E7EB;border-radius:8px;cursor:crosshair;"></canvas>' +
        '<p class="text-muted small mt-2 mb-0">Cliquez-glissez pour masquer une information. Cliquez sur un rectangle existant pour le supprimer.</p>' +
        '<div class="text-center mt-2">' + htmlDeclencheurDemoVideo('masquage-image') + '</div>';

    var contenuComplet =
      // TACHE (retour utilisateur : inciter au masquage des donnees
      // sensibles) : message discret mais visible, icone cadenas.
      '<p class="small mb-3" style="color:#B45309;">&#128274; Il est fortement recommandé de masquer les ' +
      'informations qui permettraient de vous identifier facilement (nom, coordonnées, photo) avant l’envoi à ' +
      'l’assistant IA.</p>' +
      navigation +
      '<div id="corpsVerifDoc">' + corpsHTML + '</div>' +
      (documents.length > 1 && !tousVus()
        ? '<p class="small text-muted mt-2 mb-0">&#8505;&#65039; Consultez chaque document avant de pouvoir enregistrer.</p>'
        : '') +
      '<div class="d-flex justify-content-between align-items-center mt-3 pt-3" style="border-top:1px solid #E5E7EB;">' +
      (typeof onRetour === 'function'
        ? '<button type="button" id="btnRetourVerif" class="btn btn-outline-secondary">&#8592; Retour</button>'
        : '<span></span>') +
      '<button type="button" id="btnEnregistrerVerif" class="btn btn-primary"' + (tousVus() ? '' : ' disabled') + '>Enregistrer</button>' +
      '</div>';

    if (premierAffichage) {
      ouvrirFenetreERIP({ titre: 'Vérifier vos documents', taille: 'large', contenuHTML: contenuComplet });
      premierAffichage = false;
    } else {
      mettreAJourContenuFenetreERIP({ titre: 'Vérifier vos documents', contenuHTML: contenuComplet });
    }

    var btnRetour = document.getElementById('btnRetourVerif');
    if (btnRetour) {
      btnRetour.addEventListener('click', function () {
        fermerFenetreERIP();
        onRetour();
      });
    }

    if (documents.length > 1) {
      var btnPrec = document.getElementById('btnDocPrecedent');
      var btnSuiv = document.getElementById('btnDocSuivant');
      if (btnPrec) { btnPrec.addEventListener('click', function () { sauverEtatCourant(); indexActif--; afficher(); }); }
      if (btnSuiv) { btnSuiv.addEventListener('click', function () { sauverEtatCourant(); indexActif++; afficher(); }); }
    }

    if (doc.mode === 'texte') {
      document.getElementById('texteVerifDoc').addEventListener('input', function () { doc.texteEdite = this.value; });
    } else {
      initialiserEtCablerCanvas(doc);
    }

    document.getElementById('btnEnregistrerVerif').addEventListener('click', function () {
      sauverEtatCourant();
      if (!tousVus()) { return; }
      var btn = document.getElementById('btnEnregistrerVerif');
      btn.disabled = true;
      btn.textContent = 'Enregistrement...';
      enregistrerDocumentsVerification(documents, function () {
        fermerFenetreERIP();
        if (typeof onTerminer === 'function') { onTerminer(documents); }
      });
    });
  }

  afficher();
}

// TACHE (migration Design System, chantier "metiers.js", 5e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP() -- ecran
// unique, aucun cycle, meme principe que la 1ere et la 2e migration (aller
// simple, pas de second etat). fermerChoixIAEntretien() est retiree (aucun
// appelant externe, verifie avant suppression) : fermerFenetreERIP() migre
// desormais ce role. Largeur (520px), rayon et z-index deja identiques a
// la primitive avant migration -- aucune harmonisation necessaire ici,
// contrairement a la 4e migration.
//
// TACHE (Preparer un entretien, Etape 4) : choix de l'assistant IA. Cette
// fonction ne reutilise, EN PROPRE, que ASSISTANTS_IA et stylePastilleInline()
// (toutes deux app.js) -- texteProfil()/promptCache() interviennent plus
// loin dans le parcours (demarrerEnvoiIAEntretien(), hors perimetre de
// cette migration), pas ici : commentaire corrige a cette occasion, aucun
// changement de comportement.
function ouvrirChoixIAEntretien(onAssistantChoisi) {
  ouvrirFenetreERIP({
    titre: '&#129302; Choisissez votre assistant IA',
    contenuHTML:
      '<p class="text-muted small">Le clic prépare et copie automatiquement votre demande, puis ouvre l’assistant ' +
      'choisi dans un nouvel onglet. Vous n’aurez qu’à faire Ctrl+V, puis glisser le fichier téléchargé à l’étape ' +
      'précédente dans la conversation.</p>' +
      '<div class="d-flex flex-wrap gap-2 justify-content-center mt-2">' +
      ASSISTANTS_IA.map(function (a) {
        return '<button type="button" class="pastille-selection" data-assistant-id="' + a.id + '" style="' +
          stylePastilleInline(false) + '">' + a.nom + '</button>';
      }).join('') +
      '</div>' +
      // TACHE (chantier "Videos d'accompagnement") : geste "export-ia-texte" --
      // ce raccourci (entretien-accueil) transmet toujours du texte, jamais
      // d'image, voir demarrerEnvoiIAEntretien(). Preserve telle quelle par
      // la migration.
      '<div class="text-center mt-3">' + htmlDeclencheurDemoVideo('export-ia-texte') + '</div>'
  });

  document.querySelectorAll('#fenetreERIP [data-assistant-id]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      var assistant = ASSISTANTS_IA.filter(function (a) { return a.id === bouton.dataset.assistantId; })[0];
      if (!assistant) { return; }
      fermerFenetreERIP();
      if (typeof onAssistantChoisi === 'function') { onAssistantChoisi(assistant); }
    });
  });
}

// ============================================================
// TACHE (retour utilisateur : "Co-construire votre lettre de motivation",
// icone dediee sur l'accueil) : parcours autonome, distinct de la lettre
// V2 integree (accordeon page Action) -- utilise le prompt V1 tres complet
// et conversationnel (prompts/lettre-v1.md), qui redemande lui-meme tout
// ce dont il a besoin au fil du dialogue. Reutilise le systeme de
// depot/verification/masquage CV deja existant (ouvrirAssistantDepotCV,
// via son crochet de sortie anticipee onDocumentPrepare) -- CV UNIQUEMENT,
// jamais de lettre a deposer ici (ce serait contradictoire, le but de cet
// ecran est justement d'en ecrire une). Le CV n'est PAS injecte
// automatiquement dans le prompt copie (choix assume : la personne le
// donne elle-meme pendant le dialogue avec l'IA, pour une experience
// moins "programmee").
// ============================================================
function ouvrirDepotLettreV1() {
  ouvrirAssistantDepotCV('pret', {
    onDocumentPrepare: function (documentPrepare) {
      ouvrirChoixAssistantLettreV1(documentPrepare);
    },
    onRetourEtape1: ouvrirChoixPreparationAccueil
  });
}

// TACHE (migration Design System - Phase 2, chantier "metiers.js", 2e
// migration) : devient une recette qui appelle la primitive
// ouvrirFenetreERIP(). Le selecteur des tuiles, auparavant scope par l'id
// de la fenetre elle-meme (#choixPreparationAccueil, qui disparait avec la
// migration), est desormais scope a l'element racine retourne par la
// primitive -- meme principe que toutes les recettes deja migrees.
function fermerChoixPreparationAccueil() {
  fermerFenetreERIP();
}

// TACHE (retour utilisateur : icone mallette unique, accueil) : remplace la
// carte pleine largeur "Preparer un entretien" ET le bouton crayon separe
// "Co-construire votre lettre" -- un seul point d'entree, cette petite
// fenetre, avec 2 options de MEME taille et MEME theme bleu (icones
// Bootstrap, comme partout ailleurs dans l'appli -- pas d'emoji ici, pour
// pouvoir les colorer en bleu). Ne duplique aucune logique : chaque option
// appelle directement la fonction de parcours deja existante.
function ouvrirChoixPreparationAccueil() {
  function tuile(id, icone, label) {
    return '<button type="button" id="' + id + '" style="flex:1 1 150px;max-width:180px;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem;' +
      'background:#eaf2ff;border:2px solid #0d6efd;color:#0d6efd;border-radius:1rem;' +
      'padding:1.4rem 1rem;font-weight:700;font-size:0.95rem;cursor:pointer;transition:0.2s;">' +
      '<i class="bi ' + icone + '" style="font-size:2rem;"></i>' + label + '</button>';
  }

  var overlay = ouvrirFenetreERIP({
    titre: 'Préparer ma candidature',
    // TACHE (retour utilisateur : "je ne veux pas sur 2 lignes mais 1
    // ligne") : 520px (taille par défaut) ne laissait pas assez de place
    // pour 3 tuiles côte à côte -- passée à "large" (700px, déjà une
    // taille prévue ailleurs dans l'app, pas une nouvelle valeur inventée).
    taille: 'large',
    contenuHTML:
      '<div class="d-flex gap-3 justify-content-center flex-nowrap">' +
      // TACHE (retour utilisateur : nouvel ordre demandé explicitement)
      tuile('btnChoixDecouverteAccueil', 'bi-lightbulb', 'Découvrir mes compétences') +
      tuile('btnChoixLettreAccueil', 'bi-pen', 'Co-construire ma lettre') +
      tuile('btnChoixEntretienAccueil', 'bi-mic', 'Préparer un entretien') +
      '</div>'
  });

  overlay.querySelectorAll('button[id^="btnChoix"]').forEach(function (bouton) {
    bouton.addEventListener('mouseenter', function () { this.style.background = '#0d6efd'; this.style.color = '#fff'; });
    bouton.addEventListener('mouseleave', function () { this.style.background = '#eaf2ff'; this.style.color = '#0d6efd'; });
  });
  document.getElementById('btnChoixEntretienAccueil').addEventListener('click', function () {
    fermerFenetreERIP();
    ouvrirParcoursEntretien();
  });
  document.getElementById('btnChoixLettreAccueil').addEventListener('click', function () {
    fermerFenetreERIP();
    if (typeof ouvrirDepotLettreV1 === 'function') { ouvrirDepotLettreV1(); }
  });
  // TACHE (branchement minimal, module Découverte et valorisation des
  // compétences) : point d'entrée UNIQUE du module (decouverteMoteur.js)
  // -- jamais un appel direct à ouvrirDecouverteCompetences() ou à un
  // autre fichier du module depuis ici, exactement comme pour les 2
  // autres tuiles qui passent chacune par leur propre point d'entrée
  // établi (ouvrirParcoursEntretien, ouvrirDepotLettreV1).
  document.getElementById('btnChoixDecouverteAccueil').addEventListener('click', function () {
    fermerFenetreERIP();
    if (typeof demarrerDecouverteCompetences === 'function') { demarrerDecouverteCompetences(); }
  });
}

// TACHE (migration Design System, chantier "metiers.js", 7e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP(), taille
// "standard" (520px). fermerChoixAssistantLettreV1() est retiree (aucun
// appelant externe, verifie avant suppression) : fermerFenetreERIP() migre
// desormais ce role.
//
// DECISION D'ARCHITECTURE prise en amont, hors perimetre de cette seule
// migration (point d'architecture dedie) : la largeur d'origine (560px) ne
// correspond a aucun palier de la primitive (standard/520, large/700).
// Plutot que d'ajouter une largeur personnalisee au contrat public de la
// primitive pour un cas unique, un recensement empirique de TOUTES les
// largeurs de fenetre ayant existe dans app.js et metiers.js a montre que
// 560px est un cas isole (5 des 6 largeurs historiques se regroupent
// naturellement autour de 480-520 ou 680-700 -- aucun besoin recurrent
// d'une troisieme famille de largeur). Choix retenu : "standard" (520px,
// ecart de 40px), qui rattache cette fenetre a son groupe naturel plutot
// que de creer une exception. Rendu visuel (lisibilite, disposition des
// elements sur cette largeur legerement reduite) NON suppose ici -- fait
// partie du protocole de validation comportementale fourni a part.
function ouvrirChoixAssistantLettreV1(documentPrepare) {
  var estTexte = documentPrepare && documentPrepare.type === 'texte';
  var estImage = documentPrepare && documentPrepare.type === 'image';

  ouvrirFenetreERIP({
    titre: '&#9997;&#65039; Co-construire votre lettre de motivation',
    contenuHTML:
      '<p class="text-muted small">Cliquez sur un assistant ci-dessous : l’application prépare et copie le prompt ' +
      'pour vous, puis ouvre l’assistant. Vous n’avez rien à taper.</p>' +
      (estTexte
        // TACHE (retour utilisateur : "ca marche pas -- au moment de coller
        // le CV, le presse-papiers contenait encore le prompt") : bug de
        // sequencement identifie -- "Copier mon CV" ETAIT sur CET ecran,
        // mais cliquer ensuite sur un assistant recopie le PROMPT dans le
        // presse-papiers (juste en dessous), ecrasant le CV avant meme que
        // la personne ait pu le coller dans la conversation. Retire d'ici
        // -- le bouton "Copier mon CV" vit desormais sur l'ecran suivant
        // (ouvrirRecuperationLettreV1, affiche des l'assistant ouvert, plus
        // rien ne peut plus ecraser le presse-papiers entre le clic et le
        // collage). Simple texte explicatif ici, plus de bouton.
        ? '<div class="mb-3 small text-muted">' +
          'L’assistant vous demandera votre CV pendant l’échange. Une fois l’assistant ouvert, revenez sur cet ' +
          'onglet ERIP : un bouton "Copier mon CV" vous y attendra, juste avant de retourner coller (Ctrl+V) dans ' +
          'la conversation.</div>'
        : estImage
          ? '<div class="mb-3 small" style="background:#F0F9FF;border-radius:8px;padding:0.6rem 0.8rem;">' +
            '&#128206; Votre CV protégé a été téléchargé sur votre poste. L’assistant vous le demandera pendant ' +
            'l’échange : glissez ce fichier directement dans la conversation à ce moment-là.</div>'
          : '') +
      '<div class="d-flex flex-wrap gap-2">' +
      ASSISTANTS_IA.map(function (a) {
        return '<button type="button" class="btn btn-primary" data-assistant-lettre-v1="' + a.id + '">' + a.nom + '</button>';
      }).join('') +
      '</div>' +
      // TACHE (chantier "Videos d'accompagnement") : la branche texte
      // utilise desormais un copier-coller (comme le reste de
      // l'application), plus un fichier a glisser -- la video pertinente
      // n'est donc plus "export-ia-image" pour ce cas, uniquement pour le
      // cas image (fichier reellement incontournable, glisser reste le geste).
      (estImage
        ? '<div class="text-center mt-3">' + htmlDeclencheurDemoVideo('export-ia-image') + '</div>'
        : '')
  });

  document.querySelectorAll('#fenetreERIP [data-assistant-lettre-v1]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      var assistant = ASSISTANTS_IA.filter(function (a) { return a.id === bouton.dataset.assistantLettreV1; })[0];
      if (!assistant) { return; }
      var promptTexte = (typeof promptsExternesCharges !== 'undefined' && promptsExternesCharges['lettre-v1']) ||
        (typeof promptParDefaut === 'function' ? promptParDefaut('lettre-v1') : '');
      // TACHE (retour utilisateur : "comment adapter le prompt si c'est
      // image ou texte ?") : le prompt (prompts/lettre-v1.md) contient 2
      // jetons -- {INSTRUCTION_TRANSMISSION_CV} (phrase longue, section
      // "Mot de demarrage") et {INSTRUCTION_BLOCAGE_CV} (message affiche
      // si la personne ecrit autre chose que "Start") -- remplaces ici
      // selon le type reel de document depose, pour ne jamais proposer une
      // option impossible (coller du texte pour un CV scanne, par ex.).
      // Repli generique (double option) si le type est inconnu.
      if (estTexte) {
        promptTexte = promptTexte
          .replace(/\{INSTRUCTION_TRANSMISSION_CV\}/g, 'en collant directement le texte de son CV dans cette conversation (Ctrl+V)')
          .replace(/\{INSTRUCTION_BLOCAGE_CV\}/g, 'Collez d\u2019abord le texte de votre CV dans la conversation (Ctrl+V)');
      } else if (estImage) {
        promptTexte = promptTexte
          .replace(/\{INSTRUCTION_TRANSMISSION_CV\}/g, 'en déposant le fichier de son CV dans cette conversation')
          .replace(/\{INSTRUCTION_BLOCAGE_CV\}/g, 'Déposez d\u2019abord le fichier de votre CV dans la conversation');
      } else {
        promptTexte = promptTexte
          .replace(/\{INSTRUCTION_TRANSMISSION_CV\}/g, 'en le collant directement en texte, ou en déposant le fichier si la plateforme le permet')
          .replace(/\{INSTRUCTION_BLOCAGE_CV\}/g, 'Collez d\u2019abord le texte de votre CV dans la conversation (ou déposez le fichier si la plateforme le permet)');
      }
      navigator.clipboard.writeText(promptTexte).catch(function () {});
      window.open(assistant.url, '_blank');
      ouvrirRecuperationLettreV1(estImage, estTexte ? ((documentPrepare && documentPrepare.valeur) || '') : null);
    });
  });
}

// TACHE (migration Design System - Phase 2, chantier "metiers.js", 3e
// migration) : devient une recette qui appelle la primitive
// ouvrirFenetreERIP(). Contrat public strictement inchange.
function fermerRecuperationLettreV1() {
  fermerFenetreERIP();
}

// TACHE (retour utilisateur : impression a la fin, comme pour l'entretien) :
// meme principe que ouvrirRecuperationEntretien() -- collage instantane,
// analyse de la reponse (meme forme JSON que lettre.md V2 : accroche/
// arguments/lettre{objet,texte}, voir prompts/lettre-v1.md elargi), puis
// generation du VRAI document Word natif (genererDocxNatifLettre, deja
// existante -- reutilisee telle quelle, aucune logique dupliquee).
// TACHE (chantier "Videos d'accompagnement") : parametre estImage ajoute
// (facultatif, false par defaut) -- seul changement de signature necessaire
// pour piloter l'affichage du bloc Astuce, sans quoi cette fonction n'avait
// aucun moyen de savoir si le document depose etait une image/PDF (voir
// ouvrirChoixAssistantLettreV1(), seul appelant, mis a jour en consequence).
function ouvrirRecuperationLettreV1(estImage, texteCV) {
  // TACHE (retour utilisateur : bug de sequencement -- "Copier mon CV"
  // deplace depuis ouvrirChoixAssistantLettreV1, voir son commentaire) :
  // affiche EN MEME TEMPS que l'onglet de l'assistant s'ouvre (voir son
  // appelant) -- la personne colle d'abord le prompt dans l'assistant,
  // PUIS revient sur cet onglet ERIP pour copier son CV maintenant, juste
  // avant de retourner le coller. Plus aucune autre action ERIP entre les
  // deux ne vient recopier quoi que ce soit dans le presse-papiers.
  var htmlCopierCv = texteCV
    ? '<div class="mb-3 p-2 text-center" style="background:#EFF6FF;border-radius:8px;">' +
      // TACHE (retour utilisateur : "mettre le bouton 'Copier mon CV' en
      // plus grand, visible") : btn-outline-primary btn-sm -> btn-primary
      // (plein, plus contrastant sur le fond bleu clair de l'encart) taille
      // standard, avec un peu de padding supplementaire.
      '<button type="button" id="btnCopierCvLettreV1" class="btn btn-primary" style="padding:0.6rem 1.4rem;font-size:1.05rem;font-weight:700;">' +
      '&#128203; Copier mon CV</button>' +
      '<p class="small text-muted mt-2 mb-0">Cliquez ici, puis retournez dans la conversation avec l’assistant : ' +
      'cliquez dans la zone de conversation, faites <span class="cle-pulse">Ctrl + V</span>, puis validez.</p></div>'
    : '';
  var overlay = ouvrirFenetreERIP({
    titre: '&#9997;&#65039; En attente de votre lettre de motivation',
    contenuHTML:
      htmlCopierCv +
      '<p class="text-muted small">Une fois votre lettre finalisée avec l’assistant IA, copiez sa toute dernière ' +
      'réponse (celle qui contient la lettre complète), puis revenez ici.</p>' +
      htmlCollageInstantane('LettreV1',
        '<div class="d-flex gap-2 mb-2 mt-2">' +
        '<button type="button" id="btnExportDocxLettreV1" class="btn btn-primary">&#128196; Enregistrer en DOCX</button>' +
        '<button type="button" id="btnEffacerRecollerLettreV1" class="btn btn-outline-secondary">Effacer et recoller</button>' +
        '</div>') +
      '<div id="messageRecuperationLettreV1" class="small mb-2"></div>' +
      (estImage ? htmlBlocAstuceImageRefusee() : '') +
      '<div class="d-flex justify-content-end mt-2">' +
      '<button type="button" id="btnTermineLettreV1" class="btn btn-success" disabled>&#9989; Terminé, merci !</button>' +
      '</div>'
  });

  document.getElementById('btnTermineLettreV1').addEventListener('click', fermerFenetreERIP);
  var message = document.getElementById('messageRecuperationLettreV1');

  var btnCopierCv = document.getElementById('btnCopierCvLettreV1');
  if (btnCopierCv) {
    btnCopierCv.addEventListener('click', function () {
      var btn = this;
      var texteOriginal = btn.innerHTML;
      function confirmerCopie() {
        btn.textContent = '✅ Copié';
        setTimeout(function () { btn.innerHTML = texteOriginal; }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texteCV).then(confirmerCopie).catch(function () {
          var z = document.createElement('textarea');
          z.value = texteCV;
          document.body.appendChild(z);
          z.select();
          document.execCommand('copy');
          z.remove();
          confirmerCopie();
        });
      }
    });
  }

  activerCollageInstantane({
    idZoneAuto: 'zoneCollageAutoLettreV1', idZoneApercu: 'zoneApercuCollageLettreV1',
    idTextarea: 'texteCollageLettreV1', idBoutonColler: 'btnCollerAutoLettreV1',
    idBoutonCollerManuel: 'btnCollerManuelLettreV1', idBoutonEffacerRecoller: 'btnEffacerRecollerLettreV1',
    idBoutonImporter: 'btnExportDocxLettreV1',
    onErreur: function (msg) { message.style.color = '#b91c1c'; message.textContent = '⚠️ ' + msg; },
    onEffacer: function () { message.textContent = ''; },
    onSucces: function (texte, estAjout) { message.style.color = '#157347'; message.textContent = estAjout ? '✅ Morceau suivant ajouté à la suite. Copiez le prochain morceau puis recliquez, ou cliquez Importer si c’était le dernier.' : '✅ Réponse importée automatiquement depuis le presse-papiers. Si la réponse de l’IA fait plusieurs morceaux, copiez le morceau suivant puis cliquez sur "Coller un morceau supplémentaire", juste en dessous : il s’ajoutera à la suite.'; },
    onCollerManuel: function () { message.textContent = ''; }
  });

  document.getElementById('btnExportDocxLettreV1').addEventListener('click', function () {
    var texte = document.getElementById('texteCollageLettreV1').value;
    if (!texte.trim()) {
      message.style.color = '#b91c1c';
      message.textContent = '⚠️ Collez d’abord la réponse de l’assistant IA dans la zone ci-dessus.';
      return;
    }
    var resultat = (typeof analyserReponseIALettre === 'function')
      ? analyserReponseIALettre(texte)
      : { succes: false, erreur: 'Fonction d’analyse indisponible pour le moment.' };
    if (!resultat.succes) {
      message.style.color = '#b91c1c';
      message.textContent = '⚠️ ' + resultat.erreur;
      return;
    }
    if (!dossier.ia) { dossier.ia = creerDossierIAVide(); }
    if (!dossier.ia.lettre) { dossier.ia.lettre = {}; }
    dossier.ia.lettre.accroche = resultat.valeurs.accroche;
    dossier.ia.lettre.arguments = resultat.valeurs.arguments;
    dossier.ia.lettre.lettre = resultat.valeurs.lettre;
    dossier.dernierDocumentPrepare = 'lettre';

    var btn = this;
    var texteOriginal = btn.textContent;
    // TACHE (retour utilisateur : lettre modifiable, champs grises pour
    // l'identite) : genererDocxNatifLettre() reste pour l'instant celle
    // deja utilisee par la lettre V2 -- pas encore de champs grises pour
    // nom/prenom/e-mail manquants (necessite exportDocxNatifLettre.js et
    // normaliserDonneesLettre.js a jour, pas encore recus). A completer
    // dans une prochaine tache, sans rien casser ici en attendant.
    if (typeof genererDocxNatifLettre !== 'function' || typeof normaliserDonneesLettre !== 'function') {
      message.style.color = '#b91c1c';
      message.textContent = '⚠️ Générateur de document indisponible pour le moment.';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Génération…';
    message.style.color = 'inherit';
    message.textContent = '';
    genererDocxNatifLettre('sobre', normaliserDonneesLettre(dossier)).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var lien = document.createElement('a');
      lien.href = url;
      lien.download = 'lettre-motivation.docx';
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      btn.disabled = false;
      btn.textContent = texteOriginal;
      var btnTermine = document.getElementById('btnTermineLettreV1');
      if (btnTermine) { btnTermine.disabled = false; }
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = texteOriginal;
      message.style.color = '#b91c1c';
      message.textContent = '⚠️ Impossible de générer le fichier Word pour le moment.';
    });
  });
}

// TACHE (migration Design System - Phase 2, chantier "metiers.js", 3e
// migration) : devient une recette qui appelle la primitive
// ouvrirFenetreERIP(). Contrat public strictement inchange -- appelee
// depuis demarrerEnvoiIAEntretien() apres une operation asynchrone
// (copie presse-papiers), sans aucune incidence sur la primitive.
function fermerRecuperationEntretien() {
  fermerFenetreERIP();
}

// TACHE (Preparer un entretien, Etape 5) : fenetre "en attente de votre
// reponse", affichee immediatement au moment de quitter l'appli pour
// l'assistant IA choisi.
// TACHE (retour utilisateur : nettoyage + DOCX répare) : le carre
// "Agrandir" et le bouton "Enregistrer en PDF" sont retires (plus
// d'actualite). Le bouton DOCX ne se contentait plus que de coller le
// texte brut tel quel dans l'ancien mecanisme html-docx.js (echouait
// silencieusement si le texte etait vide -- "ne fait rien"). Il analyse
// desormais reellement la reponse collee (analyserReponseIAEntretien,
// deja existante), l'enregistre dans dossier.ia.entretien, puis genere le
// VRAI document Word natif (genererDocxNatifEntretien, deja construite --
// meme mise en forme pistes/amorce que partout ailleurs dans l'appli,
// aucune logique dupliquee).
function ouvrirRecuperationEntretien() {
  var overlay = ouvrirFenetreERIP({
    titre: '&#128302; En attente de votre préparation d’entretien',
    contenuHTML:
      '<p class="text-muted small">Une fois la réponse de l’assistant IA affichée, copiez-la (bouton "Copier" de ' +
      'l’assistant), puis revenez ici.</p>' +
      htmlCollageInstantane('Entretien',
        '<div class="d-flex gap-2 mb-2 mt-2">' +
        '<button type="button" id="btnExportDocxEntretien" class="btn btn-primary">&#128196; Enregistrer en DOCX</button>' +
        '<button type="button" id="btnEffacerRecollerEntretien" class="btn btn-outline-secondary">Effacer et recoller</button>' +
        '</div>') +
      '<div id="messageRecuperationEntretien" class="small mb-2"></div>' +
      '<div class="d-flex justify-content-end mt-2">' +
      '<button type="button" id="btnTermineEntretien" class="btn btn-success" disabled>&#9989; Terminé, merci !</button>' +
      '</div>'
  });

  document.getElementById('btnTermineEntretien').addEventListener('click', fermerFenetreERIP);
  var message = document.getElementById('messageRecuperationEntretien');
  activerCollageInstantane({
    idZoneAuto: 'zoneCollageAutoEntretien',
    idZoneApercu: 'zoneApercuCollageEntretien',
    idTextarea: 'texteCollageEntretien',
    idBoutonColler: 'btnCollerAutoEntretien',
    idBoutonCollerManuel: 'btnCollerManuelEntretien',
    idBoutonEffacerRecoller: 'btnEffacerRecollerEntretien',
    idBoutonImporter: 'btnExportDocxEntretien',
    onErreur: function (msg) { message.style.color = '#b91c1c'; message.textContent = '⚠️ ' + msg; },
    onEffacer: function () { message.textContent = ''; },
    onSucces: function (texte, estAjout) { message.style.color = '#157347'; message.textContent = estAjout ? '✅ Morceau suivant ajouté à la suite. Copiez le prochain morceau puis recliquez, ou cliquez Importer si c’était le dernier.' : '✅ Réponse importée automatiquement depuis le presse-papiers. Si la réponse de l’IA fait plusieurs morceaux, copiez le morceau suivant puis cliquez sur "Coller un morceau supplémentaire", juste en dessous : il s’ajoutera à la suite.'; },
    onCollerManuel: function () { message.textContent = ''; }
  });

  document.getElementById('btnExportDocxEntretien').addEventListener('click', function () {
    var texte = document.getElementById('texteCollageEntretien').value;
    if (!texte.trim()) {
      message.style.color = '#b91c1c';
      message.textContent = '⚠️ Collez d’abord la réponse de l’assistant IA dans la zone ci-dessus.';
      return;
    }
    var resultat = analyserReponseIAEntretien(texte);
    if (!resultat.succes) {
      message.style.color = '#b91c1c';
      message.textContent = '⚠️ ' + resultat.erreur;
      return;
    }
    if (!dossier.ia) { dossier.ia = creerDossierIAVide(); }
    if (!dossier.ia.entretien) { dossier.ia.entretien = {}; }
    dossier.ia.entretien.presentation = resultat.valeurs.presentation;
    dossier.ia.entretien.pointsAPreparer = resultat.valeurs.pointsAPreparer;
    dossier.ia.entretien.questionsAnticipees = resultat.valeurs.questionsAnticipees;
    dossier.ia.entretien.questionsDuCandidat = resultat.valeurs.questionsDuCandidat;
    dossier.dernierDocumentPrepare = 'entretien';

    var btn = this;
    var texteOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Génération…';
    message.style.color = 'inherit';
    message.textContent = '';
    genererDocxNatifEntretien('clair', normaliserDonneesEntretien(dossier)).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var lien = document.createElement('a');
      lien.href = url;
      lien.download = 'preparation-entretien.docx';
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      btn.disabled = false;
      btn.textContent = texteOriginal;
      var btnTermine = document.getElementById('btnTermineEntretien');
      if (btnTermine) { btnTermine.disabled = false; }
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = texteOriginal;
      message.style.color = '#b91c1c';
      message.textContent = '⚠️ Impossible de générer le fichier Word pour le moment.';
    });
  });
}

// TACHE (Preparer un entretien, Etapes 4 et 5) : enchaine automatiquement --
// des le clic sur un assistant, celui-ci s'ouvre ET la fenetre de
// recuperation apparait dans le meme geste (demande explicitement).
function demarrerEnvoiIAEntretien(assistant) {
  // TACHE (prompt allege, carte accueil) : ce raccourci utilise desormais
  // 'entretien-accueil' (prompt court, tout livre des la 1ere reponse) --
  // le profil transmis (texteProfil) reste identique, seul le texte
  // d'instructions change. L'ancien prompt 'entretien' (coaching approfondi)
  // reste utilise partout ailleurs (voir ouvrirAideIA, page Action).
  // TACHE (retour utilisateur : verification transmission IA) : utilise
  // desormais texteProfilEffectif() (comme la page Action) au lieu de
  // texteProfil() directement -- respecte une eventuelle correction
  // manuelle faite via "Verifier les informations" ailleurs dans la
  // session, au lieu de l'ignorer silencieusement sur ce chemin precis.
  var texteACopier = promptCache('entretien-accueil', texteProfilEffectif('entretien'));
  navigator.clipboard.writeText(texteACopier).catch(function () {}).then(function () {
    window.open(assistant.url, '_blank');
    ouvrirRecuperationEntretien();
  });
}

// TACHE (Entretien, reutilisation) : ne redemande jamais une information
// deja connue. Ordre de priorite : entretienDirect (deja specifique a cet
// usage) -> objectif actif (offre/spontanee/reconversion/stage/alternance/
// immersion) -> metierCible (poste seul, pas d entreprise associee).
function obtenirEntrepriseEtPosteExistants() {
  if (dossier.entretienDirect && (dossier.entretienDirect.structure || dossier.entretienDirect.poste)) {
    return { structure: dossier.entretienDirect.structure || '', poste: dossier.entretienDirect.poste || '' };
  }
  var objectifActif = dossier.objectif && dossier[dossier.objectif];
  if (objectifActif && (objectifActif.structure || objectifActif.poste)) {
    return { structure: objectifActif.structure || '', poste: objectifActif.poste || dossier.metierCible || '' };
  }
  if (dossier.metierCible) {
    return { structure: '', poste: dossier.metierCible };
  }
  return { structure: '', poste: '' };
}

// TACHE (migration Design System, chantier "metiers.js", 4e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP() -- DEUX
// FOIS, l'une apres l'autre (formulaire, puis incitation), exactement le
// meme choix architectural que la 7e et derniere migration d'app.js
// (ouvrirEcranValidationImport) : chaque ecran garde sa propre identite
// (titre, contenu, boutons), pas un second etat d'une meme fenetre. La
// regle "une seule fenetre ERIP a la fois" et le correctif du minuteur de
// fermeture (3e migration) s'appliquent ici sans aucune modification. Le
// cycle formulaire -> incitation -> formulaire (potentiellement plusieurs
// fois) n'est qu'une repetition de ce meme mecanisme deja eprouve, pas un
// cas nouveau pour la primitive -- voir le protocole de test dedie fourni
// a part, qui couvre explicitement ce cas.
//
// Largeur harmonisee : 480px (ancien) -> taille "standard" de la primitive
// (520px), comme toutes les fenetres deja migrees.
//
// fermerFenetreEntrepriseposte() est retiree (aucun appelant externe,
// verifie avant suppression) : fermerFenetreERIP() migre desormais ce role,
// y compris le clic sur la croix (fermeture silencieuse, sans callback ni
// onRetour -- comportement identique a l'ancienne croix custom).
function verifierOuDemanderEntrepriseEtPoste(callback, onRetour) {
  var existant = obtenirEntrepriseEtPosteExistants();
  if (existant.structure && existant.poste) {
    dossier.entretienDirect = { structure: existant.structure, poste: existant.poste };
    callback();
    return;
  }

  // TACHE (retour utilisateur : champ Poste visé toujours visible) :
  // meme si un poste est deja connu (ex. metier issu de la Revelation),
  // le champ reste affiche et editable -- ce n'est pas forcement le poste
  // precis vise pour CET entretien, la personne doit pouvoir le corriger.
  function rendreFormulaire() {
    ouvrirFenetreERIP({
      titre: 'Entreprise et poste visé',
      contenuHTML:
        '<div id="zoneChampsEntrepriseposte">' +
        '<label class="form-label small fw-bold">Poste visé</label>' +
        '<input type="text" id="champPosteEntretien" class="form-control mb-2" placeholder="Poste visé" value="' +
        echapperAttribut(existant.poste || '') + '">' +
        (existant.structure
          ? ''
          : '<label class="form-label small fw-bold">Entreprise</label>' +
            '<input type="text" id="champEntrepriseEntretien" class="form-control mb-2" ' +
            'placeholder="Nom de l’entreprise ou lien de l’offre">') +
        '</div>' +
        '<div class="d-flex justify-content-between align-items-center mt-2">' +
        (typeof onRetour === 'function'
          ? '<button type="button" id="btnRetourEntrepriseposte" class="btn btn-outline-secondary">&#8592; Retour</button>'
          : '<span></span>') +
        // TACHE (retour utilisateur : sans poste visé, pas de validation) :
        // desactive tant que "Poste vise" n'est pas rempli.
        '<button type="button" id="btnValiderEntrepriseposte" class="btn btn-primary"' +
        (existant.poste ? '' : ' disabled') + '>Continuer</button>' +
        '</div>'
    });

    var btnRetour = document.getElementById('btnRetourEntrepriseposte');
    if (btnRetour) {
      btnRetour.addEventListener('click', function () {
        fermerFenetreERIP();
        onRetour();
      });
    }

    var btnValider = document.getElementById('btnValiderEntrepriseposte');
    var champPoste = document.getElementById('champPosteEntretien');

    function valider() {
      if (btnValider.disabled) { return; }
      var champEntreprise = document.getElementById('champEntrepriseEntretien');
      var entrepriseValeur = existant.structure || (champEntreprise ? champEntreprise.value.trim() : '');
      // TACHE (retour utilisateur : message d'incitation) : ni lien/offre
      // ni nom d'entreprise -> petit ecran intermediaire avant de
      // continuer, plutot que de laisser passer silencieusement.
      if (!entrepriseValeur) {
        rendreIncitation(champPoste.value.trim());
        return;
      }
      validerDefinitivement(champPoste.value.trim(), entrepriseValeur);
    }

    // TACHE (retour utilisateur : clavier complet) : reutilise
    // activerChampsStandardises() (app.js, deja existante) -- majuscule
    // automatique + Entree -> champ suivant. Sur le DERNIER champ, Entree
    // declenche directement la validation (comme un clic sur "Continuer").
    activerChampsStandardises(document.getElementById('zoneChampsEntrepriseposte'));
    if (champPoste) {
      champPoste.addEventListener('input', function () {
        btnValider.disabled = !this.value.trim();
      });
    }
    document.getElementById('zoneChampsEntrepriseposte').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') { return; }
      var champs = Array.prototype.slice.call(this.querySelectorAll('input[type="text"]'));
      if (e.target === champs[champs.length - 1]) { valider(); }
    });

    btnValider.addEventListener('click', valider);
  }

  // TACHE (retour utilisateur : phrase élégante) : rappelle pourquoi
  // l'information est utile, sans bloquer -- deux issues claires. Seconde
  // fenetre (remplace la premiere via la regle "une seule fenetre a la
  // fois"), pas un second etat de rendreFormulaire().
  function rendreIncitation(posteValeur) {
    ouvrirFenetreERIP({
      titre: '&#128161; Une précision utile',
      contenuHTML:
        '<p class="text-muted small">Indiquer l’entreprise ou le lien de l’offre permet à l’assistant d’adapter ' +
        'précisément votre préparation aux attentes du recruteur. Sans cette information, la préparation restera ' +
        'plus générale.</p>' +
        '<div class="d-flex justify-content-between mt-3">' +
        '<button type="button" id="btnContinuerSansPreciser" class="btn btn-outline-secondary">Continuer sans préciser</button>' +
        '<button type="button" id="btnCompleterMaintenant" class="btn btn-primary">Compléter maintenant</button>' +
        '</div>'
    });
    // TACHE (cycle formulaire <-> incitation) : rendreFormulaire() rouvre
    // une TROISIEME fenetre (au sens de la primitive), qui remplace
    // celle-ci -- meme mecanisme que n'importe quel aller simple, juste
    // invoque plusieurs fois de suite si necessaire.
    document.getElementById('btnCompleterMaintenant').addEventListener('click', rendreFormulaire);
    document.getElementById('btnContinuerSansPreciser').addEventListener('click', function () {
      validerDefinitivement(posteValeur, '');
    });
  }

  function validerDefinitivement(posteValeur, entrepriseValeur) {
    dossier.entretienDirect = { poste: posteValeur || existant.poste || '', structure: entrepriseValeur };
    fermerFenetreERIP();
    callback();
  }

  rendreFormulaire();
}

// TACHE (Preparer un entretien, refonte demandee) : nouvelle Etape 1 --
// remplace l'ancien enchainement sequentiel (etapeCV() PUIS etapeLettre(),
// deux fenetres l'une apres l'autre) par UNE seule fenetre avec les 2
// depots cote a cote. Reutilise integralement analyserDocumentDepose(),
// deja existante -- aucune logique de lecture/detection de fichier
// dupliquee, seulement une nouvelle mise en page (2 zones au lieu d'1) et
// un etat qui suit les 2 documents en parallele.
// TACHE (migration Design System, chantier "metiers.js", 6e migration) :
// devient une recette qui appelle la primitive ouvrirFenetreERIP() -- ecran
// unique, aller simple. fermerDepotEntretien() est retiree (aucun appelant
// externe, verifie avant suppression) : fermerFenetreERIP() migre desormais
// ce role. Largeur 680px -> taille "large" de la primitive (700px),
// harmonisation habituelle.
//
// POINT DE VIGILANCE explicitement tranche avant implementation (pas une
// decision ergonomique prise en silence pendant la migration) : le bouton
// "i" (astuce ChatGPT vocal) reste a sa place actuelle -- dans l'en-tete, a
// cote du titre -- en l'inserant directement dans la chaine config.titre,
// qui accepte du HTML libre (deja le cas pour toutes les icones de titre
// existantes, jamais echappee par la primitive). Aucune evolution
// necessaire de ouvrirFenetreERIP(). Rendu visuel exact (alignement,
// espacement) NON verifie ici, faute de style.css a jour dans cette
// session -- fait partie integrante du protocole de validation
// comportementale fourni a part, pas suppose ici.
function ouvrirDepotEntretien(onTerminer) {
  var etat = {
    cv: { fichier: null, analyse: null },
    lettre: { fichier: null, analyse: null }
  };

  function zoneDocument(cle, titre, obligatoire, conseil) {
    return '<div class="mb-3">' +
      '<label class="form-label fw-bold small">' + titre +
      (obligatoire ? '' : ' <span class="text-muted fw-normal">(facultatif' + (conseil ? ' — ' + conseil : '') + ')</span>') +
      '</label>' +
      '<input type="file" id="fichierDepot' + cle + '" class="form-control" ' +
      'accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.heic">' +
      '<div id="zoneAnalyseDepot' + cle + '" class="mt-2"></div>' +
      '</div>';
  }

  ouvrirFenetreERIP({
    titre: '&#127908; Préparer un entretien — vos documents ' +
      '<button type="button" id="btnInfoDepotEntretien" title="Astuce" class="btn btn-sm btn-outline-secondary" ' +
      'style="border-radius:50%;width:26px;height:26px;padding:0;font-weight:700;">i</button>',
    taille: 'large',
    contenuHTML:
      '<p class="text-muted small">Sans CV, difficile de préparer un entretien : c’est indispensable. La lettre de ' +
      'motivation, elle, est facultative mais fortement conseillée pour personnaliser la préparation.</p>' +
      zoneDocument('CV', '&#128196; Votre CV', true, null) +
      zoneDocument('Lettre', '&#9993; Votre lettre de motivation', false, 'pour personnaliser l’entretien') +
      '<div class="d-flex justify-content-between align-items-center mt-3 pt-3" style="border-top:1px solid #E5E7EB;">' +
      '<button type="button" id="btnRetourDepotEntretien" class="btn btn-outline-secondary">&#8592; Retour</button>' +
      '<button type="button" id="btnContinuerDepotEntretien" class="btn btn-primary" disabled>Continuer &#8594;</button>' +
      '</div>'
  });

  // TACHE (retour utilisateur : bouton Retour vers le choix initial) : cet
  // ecran n'est jamais atteint que depuis "Préparer ma candidature"
  // (ouvrirChoixPreparationAccueil) -- Retour y renvoie donc toujours.
  document.getElementById('btnRetourDepotEntretien').addEventListener('click', function () {
    fermerFenetreERIP();
    if (typeof ouvrirChoixPreparationAccueil === 'function') { ouvrirChoixPreparationAccueil(); }
  });
  document.getElementById('btnInfoDepotEntretien').addEventListener('click', function () {
    ouvrirBulleAide(null, 'Vous avez un compte ChatGPT ? Vous pouvez faire cette préparation d’entretien à la ' +
      'voix, en utilisant la commande vocale de ChatGPT au lieu de taper vos réponses.');
  });

  function actualiserBoutonContinuer() {
    var btn = document.getElementById('btnContinuerDepotEntretien');
    // TACHE (retour utilisateur : CV obligatoire, lettre facultative) :
    // seul le CV conditionne "Continuer" -- la lettre n'est jamais requise.
    if (btn) { btn.disabled = !etat.cv.analyse; }
  }

  function cablerZone(cle) {
    var input = document.getElementById('fichierDepot' + cle);
    var zone = document.getElementById('zoneAnalyseDepot' + cle);
    var cleEtat = cle.toLowerCase();
    input.addEventListener('change', function () {
      if (!input.files.length) { return; }
      etat[cleEtat].fichier = input.files[0];
      etat[cleEtat].analyse = null;
      zone.innerHTML = '<div class="alert alert-light border mb-0 py-2 small">&#8987; Analyse en cours...</div>';
      actualiserBoutonContinuer();
      analyserDocumentDepose(input.files[0]).then(function (resultatAnalyse) {
        etat[cleEtat].analyse = resultatAnalyse;
        var modeEditeur = resultatAnalyse.recommandation.texteDisponible ? 'texte' : 'image';
        zone.innerHTML = '<div class="py-2 px-2 small" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;">' +
          '<strong>&#128161; ' + (modeEditeur === 'texte' ? 'Document texte détecté' : 'Document image/scan détecté') +
          '</strong> — ' + resultatAnalyse.recommandation.message + '</div>';
        actualiserBoutonContinuer();
      }).catch(function (erreur) {
        etat[cleEtat].analyse = null;
        zone.innerHTML = '<div class="alert alert-warning mb-0 py-2 small">Impossible de lire ce fichier (' +
          erreur.message + ').</div>';
        actualiserBoutonContinuer();
      });
    });
  }
  cablerZone('CV');
  cablerZone('Lettre');

  document.getElementById('btnContinuerDepotEntretien').addEventListener('click', function () {
    if (!etat.cv.analyse) { return; }
    fermerFenetreERIP();
    if (typeof onTerminer === 'function') { onTerminer(etat); }
  });
}

// TACHE (Entretien, refonte terminee) : parcours complet Etape 1 -> 2 -> 3
// -> 4 -> 5, sans plus jamais passer par la page Action ni par l'ancienne
// popup (ouvrirAideIA) pour ce raccourci -- entierement autonome, comme
// demande des le debut de cette refonte.
function ouvrirParcoursEntretien() {
  function etapeEntrepriseEtPoste(documentsVerifies) {
    verifierOuDemanderEntrepriseEtPoste(function () {
      dossier.dernierDocumentPrepare = 'entretien';
      // TACHE (correction bug : page Action bloquee) : ce raccourci ne passe
      // jamais par le clic sur une carte (pageResultats()), qui est le seul
      // autre endroit initialisant cette etape -- sans cette ligne, la page
      // Action affiche "carteChoisie" vrai mais aucun accordeon jamais
      // "atteint", et reste bloquee en permanence (meme pour les autres
      // cartes). Meme convention deja utilisee ailleurs (app.js, boutons
      // btnSuggererLettre/btnSuggererEntretien).
      etatAccordeon['adaptation-metier'] = etatAccordeon['adaptation-metier'] || false;
      ouvrirChoixIAEntretien(function (assistant) {
        demarrerEnvoiIAEntretien(assistant);
      });
    }, function () {
      // TACHE (retour utilisateur : bouton Retour) : rouvre l'ecran de
      // verification avec les MEMES documents (deja masques/modifies),
      // sans repartir du depot de fichiers -- juste une occasion de
      // revoir/corriger avant de repartir vers l'entreprise et le poste.
      ouvrirVerificationEntretien(documentsVerifies, function (documentsReverifies) {
        etapeEntrepriseEtPoste(documentsReverifies);
      }, etapeDepot);
    });
  }

  // TACHE (retour utilisateur : mauvais fichier inserer) : nommee pour
  // pouvoir etre relancee depuis le bouton Retour du modal de verification,
  // sans dupliquer la logique de depot.
  function etapeDepot() {
    ouvrirDepotEntretien(function (etatDocuments) {
      ouvrirVerificationEntretien(etatDocuments, function (documentsVerifies) {
        // TACHE (limite connue) : recupere le texte final (modifie ou non)
        // des documents en mode texte, pour alimenter texteProfil('entretien')
        // a l'etape 4. Un document en mode image (masque) est correctement
        // "cuit" dans le fichier telecharge (Etape 2), mais son CONTENU
        // n'alimente pas texteProfil() (pas d'OCR cote client) -- la personne
        // le glisse manuellement dans la conversation IA, comme convenu.
        documentsVerifies.forEach(function (doc) {
          if (doc.mode !== 'texte') { return; }
          if (doc.cle === 'cv') { dossier.cvTexte = doc.texteEdite; dossier.cvAnalyse = true; }
          else { dossier.lettreMotivation = dossier.lettreMotivation || {}; dossier.lettreMotivation.texte = doc.texteEdite; }
        });
        etapeEntrepriseEtPoste(documentsVerifies);
      }, etapeDepot);
    });
  }

  etapeDepot();
}

/* ------------------------------------------------------------
   AIGUILLAGE AUTOMATIQUE
   "J'ai deja un CV" / "Mettre a jour" ouvre la fenetre de depot.
   ------------------------------------------------------------ */

(function () {
  if (typeof document === 'undefined') { return; }

  document.addEventListener('click', function (e) {
    var carte = e.target.closest ? e.target.closest('[data-action="mode"]') : null;
    if (carte && (carte.dataset.value === 'maj' || carte.dataset.value === 'pret')) {
      e.stopPropagation();
      e.preventDefault();
      ouvrirAssistantDepotCV(carte.dataset.value);
    }
  }, true);
})();