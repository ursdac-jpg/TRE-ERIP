/* ============================================================
   data/personnesMaterielsLieux.js
   ------------------------------------------------------------
   TACHE 22A puis 22B : referentiel dedie a l'ecran "Avec qui ou
   avec quoi travailliez-vous principalement ?" (personnes,
   materiels, lieux).

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
        savoirs: [], metiers: ['Chef d\'equipe'] },
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
        savoirs: [], metiers: ['Formateur / Educateur', 'Animateur'] }
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
        savoirs: [], metiers: ['Assistant administratif', 'Developpeur informatique'] },
      { id: 'documents', label: 'Des documents', icon: '📄', categorie: 'Matériels',
        savoirFaire: ['Gestion administrative', 'Bureautique'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Assistant administratif', 'Secretaire medicale'] },
      { id: 'marchandises', label: 'Des marchandises', icon: '📦', categorie: 'Matériels',
        savoirFaire: ['Gestion des stocks', 'Logistique'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Preparateur de commandes / Magasinier', 'Cariste'] },
      { id: 'vehicules', label: 'Des véhicules', icon: '🚗', categorie: 'Matériels',
        savoirFaire: ['Conduite', 'Logistique'], savoirEtre: ['Sécurité'],
        savoirs: ['Code de la route'], metiers: ['Chauffeur routier', 'Chauffeur-livreur'] },
      { id: 'outils', label: 'Des outils', icon: '🛠️', categorie: 'Matériels',
        savoirFaire: ['Travail manuel', 'Technique', 'Précision'], savoirEtre: [],
        savoirs: [], metiers: ['Macon', 'Electricien'] },
      { id: 'appareils_numeriques', label: 'Des appareils numériques', icon: '📱', categorie: 'Matériels',
        savoirFaire: ['Bureautique', 'Technique'], savoirEtre: [],
        savoirs: [], metiers: ['Teleconseiller', 'Assistant administratif'] },
      { id: 'produits', label: 'Des produits', icon: '💊', categorie: 'Matériels',
        savoirFaire: ['Gestion des stocks'], savoirEtre: ['Rigueur'],
        savoirs: ['Règles d\'hygiène et de conservation'], metiers: ['Vendeur en alimentation', 'Preparateur de commandes / Magasinier'] }
    ]
  },
  {
    categorie: 'Lieux',
    icone: '📍',
    items: [
      { id: 'magasin', label: 'En magasin', icon: '🛒', categorie: 'Lieux',
        savoirFaire: ['Merchandising', 'Gestion des stocks'], savoirEtre: ['Accueil'],
        savoirs: [], metiers: ['Conseiller de vente', 'Hote de caisse'] },
      { id: 'bureau', label: 'En bureau', icon: '🏢', categorie: 'Lieux',
        savoirFaire: ['Bureautique', 'Gestion administrative'], savoirEtre: ['Organisation'],
        savoirs: [], metiers: ['Assistant administratif', 'Comptable / Assistant comptable'] },
      { id: 'exterieur', label: 'En extérieur', icon: '🌳', categorie: 'Lieux',
        savoirFaire: [], savoirEtre: ['Adaptabilité', 'Endurance', 'Sécurité'],
        savoirs: [], metiers: ['Ouvrier paysagiste / Jardinier', 'Manoeuvre / Aide de chantier'] },
      { id: 'deplacement', label: 'En déplacement', icon: '🚗', categorie: 'Lieux',
        savoirFaire: ['Planification'], savoirEtre: ['Gestion du temps', 'Autonomie'],
        savoirs: [], metiers: ['Chauffeur-livreur', 'Agent d\'accueil touristique'] },
      { id: 'famille', label: 'Chez des particuliers / en famille', icon: '🏠', categorie: 'Lieux',
        savoirFaire: [], savoirEtre: ['Aide à la personne', 'Entraide', 'Adaptabilité', 'Bienveillance'],
        savoirs: [], metiers: ['Assistant de vie aux familles (ADVF)', 'Employe de menage a domicile'] },
      { id: 'seul', label: 'Seul(e)', icon: '👤', categorie: 'Lieux',
        savoirFaire: [], savoirEtre: ['Autonomie', 'Organisation', 'Responsabilité'],
        savoirs: [], metiers: ['Chauffeur routier', 'Ouvrier agricole / viticole'] },
      { id: 'atelier_usine', label: 'En atelier / usine', icon: '🏭', categorie: 'Lieux',
        savoirFaire: ['Technique'], savoirEtre: ['Sécurité', 'Rigueur'],
        savoirs: ['Normes de sécurité industrielle'], metiers: ['Agent de production', 'Operateur d\'usinage (commande numerique)'] },
      { id: 'etablissement', label: 'En établissement', icon: '🏥', categorie: 'Lieux',
        savoirFaire: ['Soins'], savoirEtre: ['Empathie', 'Rigueur'],
        savoirs: [], metiers: ['Aide-soignant', 'Agent de service hospitalier (ASH)'] }
    ]
  }
];
