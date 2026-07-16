/* ============================================================
   data/environnementsTravail.js
   ------------------------------------------------------------
   TACHE 23A + 23B : referentiel dedie a l'ecran "Dans quel
   environnement travailliez-vous le plus souvent ?".

   Meme structure et meme esprit que data/actionsProfessionnelles.js
   et data/personnesMaterielsLieux.js, pour un fonctionnement
   identique dans toute l'application (futur socle commun de la
   Base de connaissances ERIP) :

   {
     id, label, icon, categorie,
     savoirFaire: [...],  // termes DEJA presents dans categorieCompetence (app.js)
     savoirEtre: [...],   // termes DEJA presents dans categorieCompetence (app.js)
     savoirs: [...],      // connaissances/notions, libres
     metiers: [...]       // noms EXACTS de metiers (baseMetiers[].nom, data/metiers.js)
   }

   Evolutivite : ajouter un environnement = ajouter une entree dans le
   tableau "items" de la categorie concernee (ou une nouvelle categorie
   directement dans CATALOGUE_ENVIRONNEMENTS_TRAVAIL). Aucune
   modification du code des composants n'est necessaire.

   IMPORTANT (migration progressive, TACHE 23A/23B) :
   - L'ancienne constante "dataEnvironnement" (js/app.js) reste
     INCHANGEE et continue de fonctionner tant que la TACHE 23C
     (nettoyage) n'a pas ete demandee. Voir cette tache pour le detail
     du nettoyage effectue en parallele de cette livraison.
   - Les identifiants deja utilises par dataEnvironnement (bureau,
     usine, magasin, sante, cuisine, exterieur, domicile, route) sont
     REPRIS A L'IDENTIQUE ici pour continuer a beneficier des donnees
     de mappingCompetences la ou elles existaient (bureau, magasin,
     exterieur).
   ============================================================ */

var CATALOGUE_ENVIRONNEMENTS_TRAVAIL = [
  {
    categorie: 'En intérieur',
    icone: '🏢',
    items: [
      { id: 'bureau', label: 'Bureau', icon: '🏢', categorie: 'En intérieur',
        savoirFaire: ['Bureautique', 'Gestion administrative'], savoirEtre: ['Organisation'],
        savoirs: [], metiers: ['Assistant administratif', 'Comptable / Assistant comptable'] },
      { id: 'usine', label: 'Usine / Atelier / Site industriel', icon: '🏭', categorie: 'En intérieur',
        savoirFaire: ['Technique'], savoirEtre: ['Sécurité', 'Rigueur'],
        savoirs: ['Normes de sécurité industrielle'], metiers: ['Agent de production', 'Operateur d\'usinage (commande numerique)'] },
      { id: 'magasin', label: 'Magasin / Commerce', icon: '🛒', categorie: 'En intérieur',
        savoirFaire: ['Merchandising', 'Gestion des stocks'], savoirEtre: ['Accueil'],
        savoirs: [], metiers: ['Conseiller de vente', 'Hote de caisse'] },
      { id: 'sante', label: 'Établissement de santé', icon: '🏥', categorie: 'En intérieur',
        savoirFaire: ['Soins'], savoirEtre: ['Empathie', 'Rigueur'],
        savoirs: [], metiers: ['Aide-soignant', 'Agent de service hospitalier (ASH)'] },
      { id: 'ecole_formation', label: 'École / Centre de formation', icon: '🏫', categorie: 'En intérieur',
        savoirFaire: ['Formation', 'Transmission'], savoirEtre: ['Pédagogie', 'Patience'],
        savoirs: [], metiers: ['Formateur / Educateur', 'Animateur'] },
      { id: 'cuisine', label: 'Restaurant / Cuisine', icon: '🍽', categorie: 'En intérieur',
        savoirFaire: ['Cuisine'], savoirEtre: ['Respect des normes'],
        savoirs: ['Règles d\'hygiène alimentaire (HACCP)'], metiers: ['Cuisinier / Commis de cuisine', 'Serveur en restauration'] },
      { id: 'hotel', label: 'Hôtel', icon: '🏨', categorie: 'En intérieur',
        savoirFaire: [], savoirEtre: ['Accueil', 'Sens du service'],
        savoirs: [], metiers: ['Receptionniste en hotellerie', 'Employe d\'etage en hotellerie'] },
      { id: 'administration', label: 'Administration / Collectivité', icon: '🏛', categorie: 'En intérieur',
        savoirFaire: ['Gestion administrative', 'Bureautique'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Assistant administratif', 'Secretaire medicale'] },
      { id: 'laboratoire', label: 'Laboratoire', icon: '🧪', categorie: 'En intérieur',
        savoirFaire: ['Précision', 'Technique'], savoirEtre: ['Rigueur'],
        savoirs: ['Normes d\'hygiène et de sécurité en laboratoire'], metiers: ['Operateur de production chimique'] }
    ]
  },
  {
    categorie: 'À domicile',
    icone: '🏠',
    items: [
      { id: 'domicile', label: 'Au domicile des particuliers', icon: '🏠', categorie: 'À domicile',
        savoirFaire: [], savoirEtre: ['Aide à la personne', 'Adaptabilité', 'Bienveillance'],
        savoirs: [], metiers: ['Assistant de vie aux familles (ADVF)', 'Employe de menage a domicile'] },
      { id: 'teletravail_domicile', label: 'À votre domicile (télétravail)', icon: '🏡', categorie: 'À domicile',
        savoirFaire: ['Bureautique'], savoirEtre: ['Autonomie', 'Organisation'],
        savoirs: [], metiers: ['Assistant administratif', 'Developpeur informatique'] }
    ]
  },
  {
    categorie: 'En extérieur',
    icone: '🌳',
    items: [
      { id: 'exterieur', label: 'Extérieur / Chantier', icon: '🌳', categorie: 'En extérieur',
        savoirFaire: [], savoirEtre: ['Adaptabilité', 'Endurance', 'Sécurité'],
        savoirs: [], metiers: ['Ouvrier paysagiste / Jardinier', 'Manoeuvre / Aide de chantier'] },
      { id: 'exploitation_agricole', label: 'Exploitation agricole', icon: '🚜', categorie: 'En extérieur',
        savoirFaire: ['Travail manuel'], savoirEtre: ['Endurance', 'Adaptabilité'],
        savoirs: [], metiers: ['Ouvrier agricole / viticole', 'Conducteur d\'engins agricoles'] },
      { id: 'espaces_verts', label: 'Espaces verts / Nature', icon: '🌲', categorie: 'En extérieur',
        savoirFaire: ['Travail manuel'], savoirEtre: ['Endurance'],
        savoirs: [], metiers: ['Ouvrier paysagiste / Jardinier', 'Ouvrier horticole / Maraicher'] },
      { id: 'evenementiel', label: 'Salle de spectacle / Événementiel', icon: '🎭', categorie: 'En extérieur',
        savoirFaire: [], savoirEtre: ['Organisation', 'Adaptabilité', 'Sens du service'],
        savoirs: [], metiers: ['Animateur'] },
      { id: 'salle_sport', label: 'Salle de sport / Loisirs', icon: '🏋️', categorie: 'En extérieur',
        savoirFaire: [], savoirEtre: ['Sens du service', 'Sécurité'],
        savoirs: [], metiers: ['Animateur'] }
    ]
  },
  {
    categorie: 'En déplacement',
    icone: '🚛',
    items: [
      { id: 'aeroport_gare', label: 'Aéroport / Gare', icon: '✈️', categorie: 'En déplacement',
        savoirFaire: [], savoirEtre: ['Accueil', 'Adaptabilité'],
        savoirs: [], metiers: ['Agent d\'accueil touristique'] },
      { id: 'port', label: 'Port / Zone portuaire', icon: '🚢', categorie: 'En déplacement',
        savoirFaire: ['Logistique'], savoirEtre: ['Sécurité'],
        savoirs: [], metiers: ['Cariste', 'Manutentionnaire / Agent de quai'] },
      { id: 'route', label: 'Route / Transport', icon: '🚛', categorie: 'En déplacement',
        savoirFaire: ['Conduite', 'Logistique'], savoirEtre: ['Sécurité', 'Autonomie'],
        savoirs: ['Code de la route'], metiers: ['Chauffeur routier', 'Chauffeur-livreur'] },
      { id: 'entrepot_logistique', label: 'Entrepôt / Plateforme logistique', icon: '📦', categorie: 'En déplacement',
        savoirFaire: ['Gestion des stocks', 'Logistique'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Preparateur de commandes / Magasinier', 'Cariste', 'Manutentionnaire / Agent de quai'] }
    ]
  }
];
