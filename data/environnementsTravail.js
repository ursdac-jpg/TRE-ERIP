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
    categorie: 'En interieur',
    icone: '🏢',
    items: [
      { id: 'bureau', label: 'Bureau', icon: '🏢', categorie: 'En interieur',
        savoirFaire: ['Bureautique', 'Gestion administrative'], savoirEtre: ['Organisation'],
        savoirs: [], metiers: ['Assistant administratif', 'Comptable / Assistant comptable'] },
      { id: 'usine', label: 'Usine / Atelier / Site industriel', icon: '🏭', categorie: 'En interieur',
        savoirFaire: ['Technique'], savoirEtre: ['Securite', 'Rigueur'],
        savoirs: ['Normes de securite industrielle'], metiers: ['Agent de production', 'Operateur d\'usinage (commande numerique)'] },
      { id: 'magasin', label: 'Magasin / Commerce', icon: '🛒', categorie: 'En interieur',
        savoirFaire: ['Merchandising', 'Gestion des stocks'], savoirEtre: ['Accueil'],
        savoirs: [], metiers: ['Conseiller de vente', 'Hote de caisse'] },
      { id: 'sante', label: 'Etablissement de sante', icon: '🏥', categorie: 'En interieur',
        savoirFaire: ['Soins'], savoirEtre: ['Empathie', 'Rigueur'],
        savoirs: [], metiers: ['Aide-soignant', 'Agent de service hospitalier (ASH)'] },
      { id: 'ecole_formation', label: 'Ecole / Centre de formation', icon: '🏫', categorie: 'En interieur',
        savoirFaire: ['Formation', 'Transmission'], savoirEtre: ['Pedagogie', 'Patience'],
        savoirs: [], metiers: ['Formateur / Educateur', 'Animateur'] },
      { id: 'cuisine', label: 'Restaurant / Cuisine', icon: '🍽', categorie: 'En interieur',
        savoirFaire: ['Cuisine'], savoirEtre: ['Respect des normes'],
        savoirs: ['Regles d\'hygiene alimentaire (HACCP)'], metiers: ['Cuisinier / Commis de cuisine', 'Serveur en restauration'] },
      { id: 'hotel', label: 'Hotel', icon: '🏨', categorie: 'En interieur',
        savoirFaire: [], savoirEtre: ['Accueil', 'Sens du service'],
        savoirs: [], metiers: ['Receptionniste en hotellerie', 'Employe d\'etage en hotellerie'] },
      { id: 'administration', label: 'Administration / Collectivite', icon: '🏛', categorie: 'En interieur',
        savoirFaire: ['Gestion administrative', 'Bureautique'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Assistant administratif', 'Secretaire medicale'] },
      { id: 'laboratoire', label: 'Laboratoire', icon: '🧪', categorie: 'En interieur',
        savoirFaire: ['Precision', 'Technique'], savoirEtre: ['Rigueur'],
        savoirs: ['Normes d\'hygiene et de securite en laboratoire'], metiers: ['Operateur de production chimique'] }
    ]
  },
  {
    categorie: 'A domicile',
    icone: '🏠',
    items: [
      { id: 'domicile', label: 'Au domicile des particuliers', icon: '🏠', categorie: 'A domicile',
        savoirFaire: [], savoirEtre: ['Aide a la personne', 'Adaptabilite', 'Bienveillance'],
        savoirs: [], metiers: ['Assistant de vie aux familles (ADVF)', 'Employe de menage a domicile'] },
      { id: 'teletravail_domicile', label: 'A votre domicile (teletravail)', icon: '🏡', categorie: 'A domicile',
        savoirFaire: ['Bureautique'], savoirEtre: ['Autonomie', 'Organisation'],
        savoirs: [], metiers: ['Assistant administratif', 'Developpeur informatique'] }
    ]
  },
  {
    categorie: 'En exterieur',
    icone: '🌳',
    items: [
      { id: 'exterieur', label: 'Exterieur / Chantier', icon: '🌳', categorie: 'En exterieur',
        savoirFaire: [], savoirEtre: ['Adaptabilite', 'Endurance', 'Securite'],
        savoirs: [], metiers: ['Ouvrier paysagiste / Jardinier', 'Manoeuvre / Aide de chantier'] },
      { id: 'exploitation_agricole', label: 'Exploitation agricole', icon: '🚜', categorie: 'En exterieur',
        savoirFaire: ['Travail manuel'], savoirEtre: ['Endurance', 'Adaptabilite'],
        savoirs: [], metiers: ['Ouvrier agricole / viticole', 'Conducteur d\'engins agricoles'] },
      { id: 'espaces_verts', label: 'Espaces verts / Nature', icon: '🌲', categorie: 'En exterieur',
        savoirFaire: ['Travail manuel'], savoirEtre: ['Endurance'],
        savoirs: [], metiers: ['Ouvrier paysagiste / Jardinier', 'Ouvrier horticole / Maraicher'] },
      { id: 'evenementiel', label: 'Salle de spectacle / Evenementiel', icon: '🎭', categorie: 'En exterieur',
        savoirFaire: [], savoirEtre: ['Organisation', 'Adaptabilite', 'Sens du service'],
        savoirs: [], metiers: ['Animateur'] },
      { id: 'salle_sport', label: 'Salle de sport / Loisirs', icon: '🏋️', categorie: 'En exterieur',
        savoirFaire: [], savoirEtre: ['Sens du service', 'Securite'],
        savoirs: [], metiers: ['Animateur'] }
    ]
  },
  {
    categorie: 'En deplacement',
    icone: '🚛',
    items: [
      { id: 'aeroport_gare', label: 'Aeroport / Gare', icon: '✈️', categorie: 'En deplacement',
        savoirFaire: [], savoirEtre: ['Accueil', 'Adaptabilite'],
        savoirs: [], metiers: ['Agent d\'accueil touristique'] },
      { id: 'port', label: 'Port / Zone portuaire', icon: '🚢', categorie: 'En deplacement',
        savoirFaire: ['Logistique'], savoirEtre: ['Securite'],
        savoirs: [], metiers: ['Cariste', 'Manutentionnaire / Agent de quai'] },
      { id: 'route', label: 'Route / Transport', icon: '🚛', categorie: 'En deplacement',
        savoirFaire: ['Conduite', 'Logistique'], savoirEtre: ['Securite', 'Autonomie'],
        savoirs: ['Code de la route'], metiers: ['Chauffeur routier', 'Chauffeur-livreur'] },
      { id: 'entrepot_logistique', label: 'Entrepot / Plateforme logistique', icon: '📦', categorie: 'En deplacement',
        savoirFaire: ['Gestion des stocks', 'Logistique'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Preparateur de commandes / Magasinier', 'Cariste', 'Manutentionnaire / Agent de quai'] }
    ]
  }
];
