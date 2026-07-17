/* ============================================================
   data/valeursProfessionnelles.js
   ------------------------------------------------------------
   TACHE 24A + 24B + 24C : referentiel dedie a l'ecran "Qu'est-ce
   qui est important pour vous dans un travail ?" (Valeurs
   professionnelles).

   Structure par valeur :
   {
     id, label, icon, categorie,
     description: '...',      // courte description
     motivations: [...],      // profil(s) de motivation alimentes (TACHE 24B)
     savoirEtre: [...],       // termes DEJA presents dans categorieCompetence (app.js)
     metiers: [...],          // noms EXACTS de metiers (baseMetiers[].nom, data/metiers.js)
     arguments: [...]         // formulations reutilisables (TACHE 24C, Base de connaissances ERIP)
   }

   Evolutivite : ajouter une valeur = ajouter une entree dans le tableau
   "items" de la categorie concernee. Ajouter une motivation ou un
   argument = ajouter une chaine dans le tableau correspondant. Aucune
   modification du code des composants n'est necessaire.

   IMPORTANT (migration progressive, TACHE 24A/24B) :
   - L'ancienne constante "dataValeurs" et les cles correspondantes de
     "mappingCompetences" (js/app.js) restent INCHANGEES et continuent
     de fonctionner (voir TACHE 24C pour le detail du nettoyage
     effectue en parallele de cette livraison).
   - Les identifiants deja utilises par dataValeurs (stabilite, salaire,
     horaires_fixes, contact_humain, exterieur, evolution, autonomie,
     responsabilites, teletravail, proximite) sont REPRIS A L'IDENTIQUE
     ici. 'exterieur' reste par ailleurs partagee avec
     CATALOGUE_PERSONNES_MATERIELS_LIEUX (Lieux) et
     CATALOGUE_ENVIRONNEMENTS_TRAVAIL (En exterieur).
   ============================================================ */

var CATALOGUE_VALEURS_PROFESSIONNELLES = [
  {
    categorie: 'Équilibre de vie',
    icone: '⚖️',
    items: [
      { id: 'equilibre_vie_pro_perso', label: 'Bon équilibre vie professionnelle / vie personnelle', icon: '👨‍👩‍👧', categorie: 'Équilibre de vie',
        description: 'Trouver un juste équilibre entre le travail et la vie personnelle.',
        motivations: ['Équilibre de vie'], savoirEtre: ['Organisation', 'Gestion du temps'], metiers: [],
        arguments: ['maintenir un équilibre durable entre vie professionnelle et vie personnelle', 'préserver du temps pour mes proches et mes activités personnelles'] },
      { id: 'choisir_horaires', label: 'Choisir mes horaires', icon: '🕐', categorie: 'Équilibre de vie',
        description: 'Avoir de la flexibilité sur ses horaires de travail.',
        motivations: ['Équilibre de vie'], savoirEtre: ['Autonomie', 'Organisation'], metiers: [],
        arguments: ['organiser mon temps de travail avec flexibilité', 'adapter mes horaires à mes contraintes personnelles'] },
      { id: 'temps_libre', label: 'Avoir du temps libre', icon: '🏖️', categorie: 'Équilibre de vie',
        description: 'Disposer de temps disponible en dehors du travail.',
        motivations: ['Équilibre de vie'], savoirEtre: ['Gestion du temps'], metiers: [],
        arguments: ['préserver du temps libre pour me ressourcer'] },
      { id: 'proximite', label: 'Travailler près de chez moi', icon: '📍', categorie: 'Équilibre de vie',
        description: 'Limiter les temps de trajet domicile-travail.',
        motivations: ['Équilibre de vie'], savoirEtre: ['Organisation', 'Gestion du temps'], metiers: [],
        arguments: ['réduire mes temps de trajet pour plus d\'équilibre au quotidien'] },
      { id: 'teletravail', label: 'Pouvoir télétravailler', icon: '💻', categorie: 'Équilibre de vie',
        description: 'Pouvoir travailler depuis son domicile tout ou partie du temps.',
        motivations: ['Équilibre de vie', 'Autonomie'], savoirEtre: ['Autonomie', 'Organisation'],
        metiers: ['Développeur informatique', 'Assistant administratif'],
        arguments: ['organiser mon travail de manière autonome depuis mon domicile'] }
    ]
  },
  {
    categorie: 'Ambiance',
    icone: '🤝',
    items: [
      { id: 'bonne_ambiance', label: 'Une bonne ambiance de travail', icon: '😊', categorie: 'Ambiance',
        description: 'Travailler dans un climat agréable et bienveillant.',
        motivations: ['Relationnel'], savoirEtre: ['Travail en équipe', 'Esprit d\'équipe'], metiers: [],
        arguments: ['évoluer dans un environnement de travail agréable et bienveillant'] },
      { id: 'travail_equipe', label: 'Travailler en équipe', icon: '🤝', categorie: 'Ambiance',
        description: 'Collaborer régulièrement avec d\'autres personnes.',
        motivations: ['Relationnel'], savoirEtre: ['Travail en équipe', 'Coordination', 'Entraide'], metiers: ['Chef d\'équipe'],
        arguments: ['collaborer efficacement au sein d\'une équipe', 'contribuer à un travail collectif'] },
      { id: 'sentir_utile', label: 'Se sentir utile', icon: '❤️', categorie: 'Ambiance',
        description: 'Avoir le sentiment d\'apporter une contribution positive.',
        motivations: ['Utilite sociale'], savoirEtre: ['Empathie', 'Aide à la personne'],
        metiers: ['Aide-soignant', 'Assistant de vie aux familles (ADVF)'],
        arguments: ['contribuer au bien-être des autres', 'avoir un impact positif', 'apporter une aide concrète'] },
      { id: 'contact_humain', label: 'Avoir du contact humain', icon: '💬', categorie: 'Ambiance',
        description: 'Interagir régulièrement avec d\'autres personnes.',
        motivations: ['Relationnel'], savoirEtre: ['Relation client', 'Communication'],
        metiers: ['Conseiller de vente', 'Agent d\'accueil'],
        arguments: ['échanger régulièrement avec un public varié'] },
      { id: 'etre_reconnu', label: 'Être reconnu pour mon travail', icon: '👏', categorie: 'Ambiance',
        description: 'Voir ses efforts et sa contribution valorisés.',
        motivations: ['Reconnaissance'], savoirEtre: ['Motivation'], metiers: [],
        arguments: ['voir mon travail et mes efforts reconnus'] }
    ]
  },
  {
    categorie: 'Sens et évolution',
    icone: '🌱',
    items: [
      { id: 'metier_sens', label: 'Faire un métier qui a du sens', icon: '🌍', categorie: 'Sens et évolution',
        description: 'Exercer une activité en accord avec ses valeurs.',
        motivations: ['Sens et utilité'], savoirEtre: ['Motivation', 'Empathie'], metiers: [],
        arguments: ['exercer un métier aligné avec mes valeurs', 'donner du sens à mon activité professionnelle'] },
      { id: 'apprendre', label: 'Apprendre de nouvelles choses', icon: '💡', categorie: 'Sens et évolution',
        description: 'Continuer à se former et découvrir de nouvelles compétences.',
        motivations: ['Curiosite'], savoirEtre: ['Apprentissage', 'Motivation'], metiers: [],
        arguments: ['continuer à apprendre et à me former', 'découvrir de nouvelles compétences au fil du temps'] },
      { id: 'missions_variees', label: 'Avoir des missions variées', icon: '🎯', categorie: 'Sens et évolution',
        description: 'Ne pas se limiter à des tâches répétitives.',
        motivations: ['Evolution professionnelle'], savoirEtre: ['Adaptabilité'], metiers: [],
        arguments: ['diversifier mes missions au quotidien'] },
      { id: 'evolution', label: 'Pouvoir évoluer', icon: '📈', categorie: 'Sens et évolution',
        description: 'Avoir des perspectives de progression professionnelle.',
        motivations: ['Evolution professionnelle'], savoirEtre: ['Motivation', 'Apprentissage'], metiers: [],
        arguments: ['développer mes compétences', 'progresser professionnellement', 'relever de nouveaux défis'] },
      { id: 'responsabilites', label: 'Avoir des responsabilités', icon: '🎖️', categorie: 'Sens et évolution',
        description: 'Se voir confier des missions à responsabilité.',
        motivations: ['Leadership'], savoirEtre: ['Responsabilité', 'Leadership', 'Organisation', 'Coordination'],
        metiers: ['Chef d\'équipe'],
        arguments: ['prendre des responsabilités au sein d\'une équipe ou d\'un projet'] },
      { id: 'fier_metier', label: 'Être fier de mon métier', icon: '⭐', categorie: 'Sens et évolution',
        description: 'Exercer une activité dont on peut être fier.',
        motivations: ['Reconnaissance'], savoirEtre: ['Motivation'], metiers: [],
        arguments: ['exercer une activité dont je suis fier'] }
    ]
  },
  {
    categorie: 'Conditions de travail',
    icone: '🛠',
    items: [
      { id: 'pas_physique', label: 'Un travail pas trop physique', icon: '💪', categorie: 'Conditions de travail',
        description: 'Limiter la charge physique du poste.',
        motivations: ['Confort'], savoirEtre: [], metiers: ['Assistant administratif', 'Téléconseiller'],
        arguments: ['exercer une activité avec une charge physique limitée'] },
      { id: 'calme', label: 'Un travail calme', icon: '🪑', categorie: 'Conditions de travail',
        description: 'Travailler dans un environnement peu stressant.',
        motivations: ['Confort'], savoirEtre: ['Rigueur'], metiers: ['Comptable / Assistant comptable'],
        arguments: ['travailler dans un environnement calme et posé'] },
      { id: 'peu_deplacements', label: 'Peu de déplacements', icon: '🚗', categorie: 'Conditions de travail',
        description: 'Limiter les déplacements liés au poste.',
        motivations: ['Équilibre de vie'], savoirEtre: ['Organisation'], metiers: [],
        arguments: ['limiter mes déplacements professionnels'] },
      { id: 'bien_forme', label: 'Être bien formé(e) au début', icon: '📚', categorie: 'Conditions de travail',
        description: 'Bénéficier d\'un accompagnement solide à la prise de poste.',
        motivations: ['Sécurité dans l\'emploi'], savoirEtre: ['Apprentissage'], metiers: [],
        arguments: ['bénéficier d\'une formation solide au démarrage'] },
      { id: 'autonomie', label: 'Être autonome', icon: '🦸', categorie: 'Conditions de travail',
        description: 'Organiser soi-même une partie de son travail.',
        motivations: ['Autonomie'], savoirEtre: ['Autonomie', 'Responsabilité'], metiers: [],
        arguments: ['organiser mon travail de façon autonome'] },
      { id: 'exterieur', label: 'Travailler dehors', icon: '🌿', categorie: 'Conditions de travail',
        description: 'Exercer une activité en extérieur plutôt qu\'en intérieur.',
        motivations: ['Epanouissement personnel'], savoirEtre: ['Adaptabilité', 'Endurance', 'Sécurité'],
        metiers: ['Ouvrier paysagiste / Jardinier', 'Manœuvre / Aide de chantier'],
        arguments: ['exercer une activité au grand air'] }
    ]
  },
  {
    categorie: 'Sécurité',
    icone: '💰',
    items: [
      { id: 'stabilite', label: 'Un travail stable', icon: '🏛️', categorie: 'Sécurité',
        description: 'Rechercher une situation professionnelle durable.',
        motivations: ['Recherche de stabilité'], savoirEtre: ['Stabilité', 'Fiabilité'], metiers: [],
        arguments: ['construire un projet professionnel durable', 'm\'investir sur le long terme'] },
      { id: 'salaire', label: 'Un bon salaire', icon: '💶', categorie: 'Sécurité',
        description: 'Bénéficier d\'une rémunération satisfaisante.',
        motivations: ['Sécurité financière'], savoirEtre: ['Rigueur'], metiers: [],
        arguments: ['obtenir une rémunération à la hauteur de mon investissement', 'assurer une stabilité financière'] },
      { id: 'horaires_fixes', label: 'Des horaires fixes', icon: '⏰', categorie: 'Sécurité',
        description: 'Avoir des horaires prévisibles et réguliers.',
        motivations: ['Recherche de stabilité'], savoirEtre: ['Organisation'], metiers: [],
        arguments: ['bénéficier d\'horaires prévisibles et réguliers'] }
    ]
  }
];

// TACHE 24B : "Profil de motivation professionnelle" — architecture preparee,
// PAS ENCORE affichee dans l'interface (comme demande). Determine le profil
// dominant a partir des valeurs actuellement selectionnees (dossier.valeurs),
// en comptant la frequence de chaque motivation associee.
// Retourne le nom du profil dominant (chaine), ou null si aucune valeur
// selectionnee. Non appelee par aucun composant a ce stade.
function profilMotivationDominant() {
  if (typeof dossier === 'undefined' || !dossier || !dossier.valeurs || !dossier.valeurs.length) { return null; }
  var comptage = {};
  dossier.valeurs.forEach(function (idValeur) {
    var valeur = trouverItemParId(CATALOGUE_VALEURS_PROFESSIONNELLES, idValeur);
    if (valeur) {
      (valeur.motivations || []).forEach(function (m) { comptage[m] = (comptage[m] || 0) + 1; });
    }
  });
  var meilleur = null;
  var max = 0;
  Object.keys(comptage).forEach(function (m) {
    if (comptage[m] > max) { max = comptage[m]; meilleur = m; }
  });
  return meilleur;
}
