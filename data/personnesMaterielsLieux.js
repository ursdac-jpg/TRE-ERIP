/* ============================================================
   data/personnesMaterielsLieux.js
   ------------------------------------------------------------
   TACHE 22A puis 22B : referentiel dedie a l'ecran "Avec qui ou
   avec quoi travailliez-vous principalement ?" (personnes,
   materiels, animaux -- ex "lieux", retiree TACHE (retour utilisateur) :
   faisait doublon avec la page "Environnement", remplacee par "Animaux",
   qui comble un vrai manque plutot que de simplement retirer une
   categorie).

   Meme structure et meme esprit que data/actionsProfessionnelles.js
   (TACHE 21C), pour un fonctionnement identique dans toute
   l'application :

   {
     id, label, icon, categorie,
     savoirFaire: [...],  // termes DEJA presents dans categorieCompetence (app.js)
     savoirEtre: [...],   // termes DEJA presents dans categorieCompetence (app.js)
     savoirs: [...],      // connaissances/notions, libres
     metiers: [...]       // noms EXACTS de metiers (baseMetiers[].nom, data/metiers.js)
   }

   Evolutivite : ajouter une personne/un materiel/un lieu = ajouter une
   entree dans le tableau "items" de la categorie concernee (ou une
   nouvelle categorie directement dans CATALOGUE_PERSONNES_MATERIELS_LIEUX).
   Aucune modification du code des composants n'est necessaire.

   IMPORTANT (migration progressive, TACHE 22A/22B) :
   - L'ancienne constante "dataActivites" et l'ancien dictionnaire
     "mappingCompetences" (js/app.js) restent INCHANGES et continuent
     de fonctionner. Ils seront supprimes uniquement apres validation
     complete (pas avant que l'utilisateur ne le demande explicitement).
   - Les identifiants communs aux deux systemes (clients, collegues,
     enfants, personnes_agees, machines, ordinateur, documents,
     marchandises, vehicules, outils, magasin, bureau, exterieur,
     deplacement, famille, seul) remontent donc les memes competences
     via les deux systemes en parallele (sans doublon a l'affichage,
     la fonction ajouter() du moteur etant deduplicatrice).
   ============================================================ */

var CATALOGUE_PERSONNES_MATERIELS_LIEUX = [
  {
    categorie: 'Personnes',
    icone: '👥',
    items: [
      { id: 'clients', label: 'Des clients', icon: '👥', categorie: 'Personnes',
        savoirFaire: [], savoirEtre: ['Relation client', 'Communication', 'Écoute'],
        savoirs: [], metiers: ['Conseiller de vente', 'Agent d\'accueil'] },
      { id: 'collegues', label: 'Des collègues', icon: '🤝', categorie: 'Personnes',
        savoirFaire: [], savoirEtre: ['Travail en équipe', 'Coordination', 'Entraide'],
        savoirs: [], metiers: ['Chef d\'équipe'] },
      { id: 'enfants', label: 'Des enfants', icon: '👶', categorie: 'Personnes',
        savoirFaire: [], savoirEtre: ['Pédagogie', 'Patience', 'Bienveillance'],
        savoirs: [], metiers: ['Auxiliaire petite enfance', 'Animateur'] },
      { id: 'personnes_agees', label: 'Des personnes âgées', icon: '👵', categorie: 'Personnes',
        savoirFaire: [], savoirEtre: ['Empathie', 'Aide à la personne', 'Écoute'],
        savoirs: [], metiers: ['Aide-soignant', 'Assistant de vie aux familles (ADVF)'] },
      { id: 'patients', label: 'Des patients', icon: '🧑‍⚕️', categorie: 'Personnes',
        savoirFaire: ['Soins'], savoirEtre: ['Empathie'],
        savoirs: ['Notions médicales de base'], metiers: ['Aide-soignant', 'Infirmier'] },
      { id: 'eleves_etudiants', label: 'Des élèves / étudiants', icon: '👨‍🏫', categorie: 'Personnes',
        savoirFaire: ['Formation', 'Transmission'], savoirEtre: ['Pédagogie', 'Patience'],
        savoirs: [], metiers: ['Formateur / Éducateur', 'Animateur'] }
    ]
  },
  {
    categorie: 'Matériels',
    icone: '📦',
    items: [
      { id: 'machines', label: 'Des machines', icon: '⚙️', categorie: 'Matériels',
        savoirFaire: ['Technique', 'Maintenance', 'Précision'], savoirEtre: [],
        savoirs: [], metiers: ['Technicien de maintenance', 'Agent de production'] },
      { id: 'ordinateur', label: 'Un ordinateur', icon: '💻', categorie: 'Matériels',
        savoirFaire: ['Bureautique', 'Analyse de données'], savoirEtre: ['Organisation'],
        savoirs: [], metiers: ['Assistant administratif', 'Développeur informatique'] },
      { id: 'documents', label: 'Des documents', icon: '📄', categorie: 'Matériels',
        savoirFaire: ['Gestion administrative', 'Bureautique'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Assistant administratif', 'Secrétaire médicale'] },
      { id: 'marchandises', label: 'Des marchandises', icon: '📦', categorie: 'Matériels',
        savoirFaire: ['Gestion des stocks', 'Logistique'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Préparateur de commandes / Magasinier', 'Cariste'] },
      { id: 'vehicules', label: 'Des véhicules', icon: '🚗', categorie: 'Matériels',
        savoirFaire: ['Conduite', 'Logistique'], savoirEtre: ['Sécurité'],
        savoirs: ['Code de la route'], metiers: ['Chauffeur routier', 'Chauffeur-livreur'] },
      { id: 'outils', label: 'Des outils', icon: '🛠️', categorie: 'Matériels',
        savoirFaire: ['Travail manuel', 'Technique', 'Précision'], savoirEtre: [],
        savoirs: [], metiers: ['Maçon', 'Électricien'] },
      { id: 'appareils_numeriques', label: 'Des appareils numériques', icon: '📱', categorie: 'Matériels',
        savoirFaire: ['Bureautique', 'Technique'], savoirEtre: [],
        savoirs: [], metiers: ['Téléconseiller', 'Assistant administratif'] },
      { id: 'produits', label: 'Des produits', icon: '💊', categorie: 'Matériels',
        savoirFaire: ['Gestion des stocks'], savoirEtre: ['Rigueur'],
        savoirs: ['Règles d\'hygiène et de conservation'], metiers: ['Vendeur en alimentation', 'Préparateur de commandes / Magasinier'] }
    ]
  },
  {
    // TACHE (retour utilisateur : "Lieux" fait doublon avec la page
    // "Environnement", remplacé par "Animaux" -- comble un vrai manque
    // (aucune des 2 autres categories, Personnes/Materiels, ne couvre le
    // travail avec des animaux) plutot que de simplement retirer une
    // categorie redondante. 5 nouveaux metiers crees pour l'occasion
    // (Vétérinaire, Auxiliaire vétérinaire, Agent équestre/Palefrenier,
    // Éleveur, Agent animalier -- voir referentielMetiersERIP.js),
    // combines aux 2 deja existants (Apiculteur, Toiletteur animalier).
    categorie: 'Animaux',
    icone: '🐾',
    items: [
      { id: 'animaux_compagnie', label: 'Des animaux de compagnie', icon: '🐕', categorie: 'Animaux',
        savoirFaire: ['Soins'], savoirEtre: ['Patience', 'Empathie', 'Sens du détail'],
        savoirs: ['Techniques de toilettage animalier'], metiers: ['Toiletteur animalier', 'Agent animalier'] },
      { id: 'chevaux', label: 'Des chevaux', icon: '🐴', categorie: 'Animaux',
        savoirFaire: ['Soins', 'Entretien'], savoirEtre: ['Rigueur', 'Endurance', 'Autonomie'],
        savoirs: ['Alimentation et santé du cheval'], metiers: ['Agent équestre / Palefrenier'] },
      { id: 'elevage_ferme', label: 'Des animaux d\'élevage / de ferme', icon: '🐄', categorie: 'Animaux',
        savoirFaire: ['Soins', 'Gestion administrative'], savoirEtre: ['Autonomie', 'Rigueur', 'Endurance'],
        savoirs: ['Alimentation et reproduction animale'], metiers: ['Éleveur'] },
      { id: 'abeilles', label: 'Des abeilles', icon: '🐝', categorie: 'Animaux',
        savoirFaire: ['Travail manuel'], savoirEtre: ['Patience', 'Autonomie', 'Rigueur'],
        savoirs: ['Cycle des abeilles', 'Techniques d\'apiculture de base'], metiers: ['Apiculteur'] },
      { id: 'soins_veterinaires', label: 'Des soins vétérinaires', icon: '🩺', categorie: 'Animaux',
        savoirFaire: ['Diagnostic', 'Soins'], savoirEtre: ['Empathie', 'Rigueur', 'Responsabilité'],
        savoirs: ['Notions médicales de base'], metiers: ['Vétérinaire', 'Auxiliaire vétérinaire'] }
    ]
  }
];
