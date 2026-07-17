/* ============================================================
   data/actionsProfessionnelles.js
   ------------------------------------------------------------
   TACHE 21A puis 21C : referentiel des actions professionnelles
   ("Que faisiez-vous souvent ?").

   Ce fichier est la source de reference pour :
   - la liste des actions affichees (categorie, icone) ;
   - le moteur d'identification automatique des competences
     (savoir-faire, savoir-etre, savoirs) ;
   - les metiers associes a chaque action.

   Structure par action :
   {
     id: identifiant unique (utilise par dossier.actions),
     label: libelle affiche,
     icon: icone affichee sur la carte,
     categorie: nom de la categorie (redondant avec le groupe,
                mais permet une recherche directe par id sans
                parcourir tous les groupes),
     savoirFaire: [...],   // termes DEJA presents dans categorieCompetence (app.js)
     savoirEtre: [...],    // termes DEJA presents dans categorieCompetence (app.js)
     savoirs: [...],       // connaissances/notions, libres
     metiers: [...]        // noms EXACTS de metiers (memes chaines que
                            // baseMetiers[].nom dans data/metiers.js)
   }

   Evolutivite : pour ajouter une action, ajouter une entree dans le
   tableau "items" de la categorie concernee (ou une nouvelle categorie
   directement dans CATALOGUE_ACTIONS_PRO). Pour enrichir une action
   existante, modifier ses tableaux savoirFaire/savoirEtre/savoirs/metiers.
   Aucune modification du code des composants n'est necessaire.

   IMPORTANT (migration progressive, TACHE 21A/21C) :
   - L'ancienne constante "dataActions" et l'ancien dictionnaire
     "mappingCompetences" (voir js/app.js) restent INCHANGES et
     continuent de fonctionner. Ils seront supprimes uniquement lors
     de la TACHE 21D, apres validation complete.
   - Les identifiants communs aux deux systemes (organiser, reparer,
     conseiller, vendre, transporter, nettoyer, former, soigner,
     cuisiner, construire, analyser, creer) remontent donc les memes
     competences via les deux systemes en parallele (sans doublon a
     l'affichage, la fonction ajouter() du moteur etant deduplicatrice).
   - Les metiers cites ici n'ont volontairement pas ete inventes pour
     les actions de la categorie Creation (aucun metier de ce type
     dans le referentiel des metiers actuel) : mieux vaut une liste
     vide qu'une association hasardeuse. Facilement complete plus tard.
   ============================================================ */

var CATALOGUE_ACTIONS_PRO = [
  {
    categorie: 'Organisation / Gestion',
    icone: '📋',
    items: [
      { id: 'organiser', label: 'Organiser', icon: '📋', categorie: 'Organisation / Gestion',
        savoirFaire: ['Planification', 'Gestion de projet'], savoirEtre: ['Coordination', 'Organisation'],
        savoirs: [], metiers: ['Chef d\'équipe', 'Assistant administratif'] },
      { id: 'planifier', label: 'Planifier', icon: '📅', categorie: 'Organisation / Gestion',
        savoirFaire: ['Planification', 'Gestion de projet'], savoirEtre: ['Organisation', 'Gestion du temps'],
        savoirs: [], metiers: ['Chef d\'équipe', 'Assistant administratif'] },
      { id: 'gerer', label: 'Gérer', icon: '📊', categorie: 'Organisation / Gestion',
        savoirFaire: ['Gestion administrative', 'Gestion de projet'], savoirEtre: ['Organisation', 'Responsabilité'],
        savoirs: [], metiers: ['Comptable / Assistant comptable', 'Chef d\'équipe'] },
      { id: 'controler', label: 'Contrôler', icon: '🔍', categorie: 'Organisation / Gestion',
        savoirFaire: ['Diagnostic', 'Analyse de données'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Agent de production', 'Technicien de maintenance'] },
      { id: 'analyser', label: 'Analyser', icon: '📈', categorie: 'Organisation / Gestion',
        savoirFaire: ['Analyse de données', 'Raisonnement logique', 'Rédaction'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Comptable / Assistant comptable', 'Développeur informatique'] },
      { id: 'negocier', label: 'Négocier', icon: '🤝', categorie: 'Organisation / Gestion',
        savoirFaire: ['Négociation', 'Persuasion'], savoirEtre: ['Communication'],
        savoirs: [], metiers: ['Conseiller de vente', 'Chef d\'équipe'] }
    ]
  },
  {
    categorie: 'Relationnel',
    icone: '🤝',
    items: [
      { id: 'conseiller', label: 'Conseiller', icon: '💬', categorie: 'Relationnel',
        savoirFaire: ['Conseil'], savoirEtre: ['Communication', 'Pédagogie'],
        savoirs: [], metiers: ['Conseiller de vente', 'Agent d\'accueil'] },
      { id: 'accompagner', label: 'Accompagner', icon: '🤝', categorie: 'Relationnel',
        savoirFaire: ['Soins'], savoirEtre: ['Empathie', 'Aide à la personne', 'Patience'],
        savoirs: [], metiers: ['Assistant de vie aux familles (ADVF)', 'Accompagnant éducatif et social (AES)'] },
      { id: 'vendre', label: 'Vendre', icon: '🛒', categorie: 'Relationnel',
        savoirFaire: ['Négociation', 'Persuasion'], savoirEtre: ['Relation client'],
        savoirs: [], metiers: ['Conseiller de vente', 'Vendeur en alimentation'] },
      { id: 'former', label: 'Former', icon: '🎓', categorie: 'Relationnel',
        savoirFaire: ['Formation', 'Transmission'], savoirEtre: ['Pédagogie'],
        savoirs: [], metiers: ['Formateur / Éducateur', 'Animateur'] },
      { id: 'soigner', label: 'Soigner', icon: '❤️', categorie: 'Relationnel',
        savoirFaire: ['Soins', 'Précision'], savoirEtre: ['Empathie'],
        savoirs: ['Notions d\'anatomie et de premiers secours'], metiers: ['Aide-soignant', 'Infirmier'] },
      { id: 'accueillir', label: 'Accueillir', icon: '📞', categorie: 'Relationnel',
        savoirFaire: [], savoirEtre: ['Accueil', 'Communication', 'Sens du service'],
        savoirs: [], metiers: ['Agent d\'accueil', 'Réceptionniste en hôtellerie'] },
      { id: 'aider', label: 'Aider', icon: '🤲', categorie: 'Relationnel',
        savoirFaire: [], savoirEtre: ['Empathie', 'Aide à la personne', 'Entraide'],
        savoirs: [], metiers: ['Assistant de vie aux familles (ADVF)', 'Accompagnant éducatif et social (AES)'] },
      { id: 'informer', label: 'Informer', icon: '📢', categorie: 'Relationnel',
        savoirFaire: ['Rédaction'], savoirEtre: ['Communication', 'Sens du service'],
        savoirs: [], metiers: ['Agent d\'accueil', 'Agent d\'accueil touristique'] }
    ]
  },
  {
    categorie: 'Technique',
    icone: '🔧',
    items: [
      { id: 'reparer', label: 'Réparer', icon: '🔧', categorie: 'Technique',
        savoirFaire: ['Diagnostic', 'Réparation', 'Maintenance'], savoirEtre: [],
        savoirs: [], metiers: ['Technicien de maintenance', 'Mécanicien automobile'] },
      { id: 'transporter', label: 'Transporter', icon: '🚚', categorie: 'Technique',
        savoirFaire: ['Logistique', 'Conduite'], savoirEtre: ['Respect des délais'],
        savoirs: ['Réglementation du transport routier'], metiers: ['Chauffeur-livreur', 'Cariste'] },
      { id: 'nettoyer', label: 'Nettoyer', icon: '🧹', categorie: 'Technique',
        savoirFaire: ['Hygiène', 'Entretien'], savoirEtre: ['Rigueur'],
        savoirs: ['Produits et dosages d\'entretien'], metiers: ['Agent d\'entretien', 'Agent de service hospitalier (ASH)'] },
      { id: 'construire', label: 'Construire', icon: '🏗', categorie: 'Technique',
        savoirFaire: ['Bâtiment', 'Lecture de plans', 'Travail manuel'], savoirEtre: [],
        savoirs: ['Normes de sécurité sur chantier'], metiers: ['Maçon', 'Manœuvre / Aide de chantier'] },
      { id: 'fabriquer', label: 'Fabriquer', icon: '⚙️', categorie: 'Technique',
        savoirFaire: ['Travail manuel', 'Technique', 'Précision'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Soudeur', 'Opérateur d\'usinage (commande numérique)'] },
      { id: 'installer', label: 'Installer', icon: '🔌', categorie: 'Technique',
        savoirFaire: ['Technique', 'Réparation'], savoirEtre: ['Sécurité'],
        savoirs: [], metiers: ['Électricien', 'Plombier'] },
      { id: 'monter', label: 'Monter', icon: '🔨', categorie: 'Technique',
        savoirFaire: ['Travail manuel', 'Technique', 'Précision'], savoirEtre: [],
        savoirs: [], metiers: ['Menuisier poseur', 'Plaquiste'] },
      { id: 'decouper', label: 'Découper', icon: '✂️', categorie: 'Technique',
        savoirFaire: ['Travail manuel', 'Précision'], savoirEtre: ['Sécurité'],
        savoirs: [], metiers: ['Boucher', 'Opérateur en transformation des viandes / conserverie'] },
      { id: 'preparer_commandes', label: 'Préparer des commandes', icon: '📦', categorie: 'Technique',
        savoirFaire: ['Gestion des stocks', 'Logistique'], savoirEtre: ['Rigueur', 'Organisation'],
        savoirs: [], metiers: ['Préparateur de commandes / Magasinier', 'Cariste'] },
      { id: 'conduire', label: 'Conduire / Piloter', icon: '🚜', categorie: 'Technique',
        savoirFaire: ['Conduite'], savoirEtre: ['Sécurité', 'Autonomie'],
        savoirs: ['Code de la route'], metiers: ['Chauffeur routier', 'Conducteur d\'engins de chantier'] },
      { id: 'diagnostiquer', label: 'Diagnostiquer', icon: '🩺', categorie: 'Technique',
        savoirFaire: ['Diagnostic', 'Analyse de données'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Technicien de maintenance', 'Mécanicien automobile'] },
      { id: 'programmer', label: 'Programmer', icon: '💻', categorie: 'Technique',
        savoirFaire: ['Raisonnement logique', 'Technique'], savoirEtre: ['Rigueur', 'Autonomie'],
        savoirs: ['Langages de programmation'], metiers: ['Développeur informatique'] }
    ]
  },
  {
    categorie: 'Création',
    icone: '🎨',
    items: [
      { id: 'creer', label: 'Créer', icon: '🎨', categorie: 'Création',
        savoirFaire: ['Innovation', 'Expression artistique'], savoirEtre: ['Créativité'],
        savoirs: [], metiers: [] },
      { id: 'rediger', label: 'Rediger', icon: '✍️', categorie: 'Création',
        savoirFaire: ['Rédaction'], savoirEtre: ['Créativité'],
        savoirs: [], metiers: [] },
      { id: 'imaginer', label: 'Imaginer', icon: '💡', categorie: 'Création',
        savoirFaire: ['Innovation'], savoirEtre: ['Créativité'],
        savoirs: [], metiers: [] },
      { id: 'photographier', label: 'Photographier', icon: '📷', categorie: 'Création',
        savoirFaire: ['Expression artistique'], savoirEtre: ['Créativité'],
        savoirs: [], metiers: [] },
      { id: 'dessiner', label: 'Dessiner', icon: '✏️', categorie: 'Création',
        savoirFaire: ['Expression artistique'], savoirEtre: ['Créativité'],
        savoirs: [], metiers: [] }
    ]
  },
  {
    categorie: 'Cuisine',
    icone: '🍳',
    items: [
      { id: 'cuisiner', label: 'Cuisiner', icon: '🍳', categorie: 'Cuisine',
        savoirFaire: ['Cuisine'], savoirEtre: ['Créativité', 'Respect des normes'],
        savoirs: ['Règles d\'hygiène alimentaire (HACCP)'],
        metiers: ['Cuisinier / Commis de cuisine', 'Employé polyvalent de restauration / Aide de cuisine', 'Boulanger'] }
    ]
  },
  {
    categorie: 'Administration',
    icone: '💼',
    items: [
      { id: 'calculer', label: 'Calculer', icon: '🧮', categorie: 'Administration',
        savoirFaire: ['Gestion financière'], savoirEtre: ['Rigueur'],
        savoirs: ['Bases de comptabilité'], metiers: ['Comptable / Assistant comptable'] },
      { id: 'classer', label: 'Classer', icon: '🗂', categorie: 'Administration',
        savoirFaire: ['Gestion administrative'], savoirEtre: ['Organisation', 'Rigueur'],
        savoirs: [], metiers: ['Assistant administratif', 'Secrétaire médicale'] },
      { id: 'saisir', label: 'Saisir', icon: '📑', categorie: 'Administration',
        savoirFaire: ['Bureautique'], savoirEtre: ['Rigueur'],
        savoirs: [], metiers: ['Assistant administratif', 'Secrétaire médicale', 'Téléconseiller'] },
      { id: 'communiquer_ecrit', label: 'Communiquer par écrit', icon: '📧', categorie: 'Administration',
        savoirFaire: ['Rédaction', 'Bureautique'], savoirEtre: ['Communication'],
        savoirs: [], metiers: ['Assistant administratif', 'Secrétaire médicale'] },
      { id: 'archiver', label: 'Archiver', icon: '📂', categorie: 'Administration',
        savoirFaire: ['Gestion administrative'], savoirEtre: ['Organisation', 'Rigueur'],
        savoirs: [], metiers: ['Assistant administratif'] }
    ]
  }
];
