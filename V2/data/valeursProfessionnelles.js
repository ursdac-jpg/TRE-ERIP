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
    categorie: 'Equilibre de vie',
    icone: '⚖️',
    items: [
      { id: 'equilibre_vie_pro_perso', label: 'Bon equilibre vie professionnelle / vie personnelle', icon: '👨‍👩‍👧', categorie: 'Equilibre de vie',
        description: 'Trouver un juste equilibre entre le travail et la vie personnelle.',
        motivations: ['Equilibre de vie'], savoirEtre: ['Organisation', 'Gestion du temps'], metiers: [],
        arguments: ['maintenir un equilibre durable entre vie professionnelle et vie personnelle', 'preserver du temps pour mes proches et mes activites personnelles'] },
      { id: 'choisir_horaires', label: 'Choisir mes horaires', icon: '🕐', categorie: 'Equilibre de vie',
        description: 'Avoir de la flexibilite sur ses horaires de travail.',
        motivations: ['Equilibre de vie'], savoirEtre: ['Autonomie', 'Organisation'], metiers: [],
        arguments: ['organiser mon temps de travail avec flexibilite', 'adapter mes horaires a mes contraintes personnelles'] },
      { id: 'temps_libre', label: 'Avoir du temps libre', icon: '🏖️', categorie: 'Equilibre de vie',
        description: 'Disposer de temps disponible en dehors du travail.',
        motivations: ['Equilibre de vie'], savoirEtre: ['Gestion du temps'], metiers: [],
        arguments: ['preserver du temps libre pour me ressourcer'] },
      { id: 'proximite', label: 'Travailler pres de chez moi', icon: '📍', categorie: 'Equilibre de vie',
        description: 'Limiter les temps de trajet domicile-travail.',
        motivations: ['Equilibre de vie'], savoirEtre: ['Organisation', 'Gestion du temps'], metiers: [],
        arguments: ['reduire mes temps de trajet pour plus d\'equilibre au quotidien'] },
      { id: 'teletravail', label: 'Pouvoir teletravailler', icon: '💻', categorie: 'Equilibre de vie',
        description: 'Pouvoir travailler depuis son domicile tout ou partie du temps.',
        motivations: ['Equilibre de vie', 'Autonomie'], savoirEtre: ['Autonomie', 'Organisation'],
        metiers: ['Developpeur informatique', 'Assistant administratif'],
        arguments: ['organiser mon travail de maniere autonome depuis mon domicile'] }
    ]
  },
  {
    categorie: 'Ambiance',
    icone: '🤝',
    items: [
      { id: 'bonne_ambiance', label: 'Une bonne ambiance de travail', icon: '😊', categorie: 'Ambiance',
        description: 'Travailler dans un climat agreable et bienveillant.',
        motivations: ['Relationnel'], savoirEtre: ['Travail en equipe', 'Esprit d\'equipe'], metiers: [],
        arguments: ['evoluer dans un environnement de travail agreable et bienveillant'] },
      { id: 'travail_equipe', label: 'Travailler en equipe', icon: '🤝', categorie: 'Ambiance',
        description: 'Collaborer regulierement avec d\'autres personnes.',
        motivations: ['Relationnel'], savoirEtre: ['Travail en equipe', 'Coordination', 'Entraide'], metiers: ['Chef d\'equipe'],
        arguments: ['collaborer efficacement au sein d\'une equipe', 'contribuer a un travail collectif'] },
      { id: 'sentir_utile', label: 'Se sentir utile', icon: '❤️', categorie: 'Ambiance',
        description: 'Avoir le sentiment d\'apporter une contribution positive.',
        motivations: ['Utilite sociale'], savoirEtre: ['Empathie', 'Aide a la personne'],
        metiers: ['Aide-soignant', 'Assistant de vie aux familles (ADVF)'],
        arguments: ['contribuer au bien-etre des autres', 'avoir un impact positif', 'apporter une aide concrete'] },
      { id: 'contact_humain', label: 'Avoir du contact humain', icon: '💬', categorie: 'Ambiance',
        description: 'Interagir regulierement avec d\'autres personnes.',
        motivations: ['Relationnel'], savoirEtre: ['Relation client', 'Communication'],
        metiers: ['Conseiller de vente', 'Agent d\'accueil'],
        arguments: ['echanger regulierement avec un public varie'] },
      { id: 'etre_reconnu', label: 'Etre reconnu pour mon travail', icon: '👏', categorie: 'Ambiance',
        description: 'Voir ses efforts et sa contribution valorises.',
        motivations: ['Reconnaissance'], savoirEtre: ['Motivation'], metiers: [],
        arguments: ['voir mon travail et mes efforts reconnus'] }
    ]
  },
  {
    categorie: 'Sens et evolution',
    icone: '🌱',
    items: [
      { id: 'metier_sens', label: 'Faire un metier qui a du sens', icon: '🌍', categorie: 'Sens et evolution',
        description: 'Exercer une activite en accord avec ses valeurs.',
        motivations: ['Sens et utilite'], savoirEtre: ['Motivation', 'Empathie'], metiers: [],
        arguments: ['exercer un metier aligne avec mes valeurs', 'donner du sens a mon activite professionnelle'] },
      { id: 'apprendre', label: 'Apprendre de nouvelles choses', icon: '💡', categorie: 'Sens et evolution',
        description: 'Continuer a se former et decouvrir de nouvelles competences.',
        motivations: ['Curiosite'], savoirEtre: ['Apprentissage', 'Motivation'], metiers: [],
        arguments: ['continuer a apprendre et a me former', 'decouvrir de nouvelles competences au fil du temps'] },
      { id: 'missions_variees', label: 'Avoir des missions variees', icon: '🎯', categorie: 'Sens et evolution',
        description: 'Ne pas se limiter a des taches repetitives.',
        motivations: ['Evolution professionnelle'], savoirEtre: ['Adaptabilite'], metiers: [],
        arguments: ['diversifier mes missions au quotidien'] },
      { id: 'evolution', label: 'Pouvoir evoluer', icon: '📈', categorie: 'Sens et evolution',
        description: 'Avoir des perspectives de progression professionnelle.',
        motivations: ['Evolution professionnelle'], savoirEtre: ['Motivation', 'Apprentissage'], metiers: [],
        arguments: ['developper mes competences', 'progresser professionnellement', 'relever de nouveaux defis'] },
      { id: 'responsabilites', label: 'Avoir des responsabilites', icon: '🎖️', categorie: 'Sens et evolution',
        description: 'Se voir confier des missions a responsabilite.',
        motivations: ['Leadership'], savoirEtre: ['Responsabilite', 'Leadership', 'Organisation', 'Coordination'],
        metiers: ['Chef d\'equipe'],
        arguments: ['prendre des responsabilites au sein d\'une equipe ou d\'un projet'] },
      { id: 'fier_metier', label: 'Etre fier de mon metier', icon: '⭐', categorie: 'Sens et evolution',
        description: 'Exercer une activite dont on peut etre fier.',
        motivations: ['Reconnaissance'], savoirEtre: ['Motivation'], metiers: [],
        arguments: ['exercer une activite dont je suis fier'] }
    ]
  },
  {
    categorie: 'Conditions de travail',
    icone: '🛠',
    items: [
      { id: 'pas_physique', label: 'Un travail pas trop physique', icon: '💪', categorie: 'Conditions de travail',
        description: 'Limiter la charge physique du poste.',
        motivations: ['Confort'], savoirEtre: [], metiers: ['Assistant administratif', 'Teleconseiller'],
        arguments: ['exercer une activite avec une charge physique limitee'] },
      { id: 'calme', label: 'Un travail calme', icon: '🪑', categorie: 'Conditions de travail',
        description: 'Travailler dans un environnement peu stressant.',
        motivations: ['Confort'], savoirEtre: ['Rigueur'], metiers: ['Comptable / Assistant comptable'],
        arguments: ['travailler dans un environnement calme et pose'] },
      { id: 'peu_deplacements', label: 'Peu de deplacements', icon: '🚗', categorie: 'Conditions de travail',
        description: 'Limiter les deplacements lies au poste.',
        motivations: ['Equilibre de vie'], savoirEtre: ['Organisation'], metiers: [],
        arguments: ['limiter mes deplacements professionnels'] },
      { id: 'bien_forme', label: 'Etre bien forme(e) au debut', icon: '📚', categorie: 'Conditions de travail',
        description: 'Beneficier d\'un accompagnement solide a la prise de poste.',
        motivations: ['Securite dans l\'emploi'], savoirEtre: ['Apprentissage'], metiers: [],
        arguments: ['beneficier d\'une formation solide au demarrage'] },
      { id: 'autonomie', label: 'Etre autonome', icon: '🦸', categorie: 'Conditions de travail',
        description: 'Organiser soi-meme une partie de son travail.',
        motivations: ['Autonomie'], savoirEtre: ['Autonomie', 'Responsabilite'], metiers: [],
        arguments: ['organiser mon travail de facon autonome'] },
      { id: 'exterieur', label: 'Travailler dehors', icon: '🌿', categorie: 'Conditions de travail',
        description: 'Exercer une activite en exterieur plutot qu\'en interieur.',
        motivations: ['Epanouissement personnel'], savoirEtre: ['Adaptabilite', 'Endurance', 'Securite'],
        metiers: ['Ouvrier paysagiste / Jardinier', 'Manoeuvre / Aide de chantier'],
        arguments: ['exercer une activite au grand air'] }
    ]
  },
  {
    categorie: 'Securite',
    icone: '💰',
    items: [
      { id: 'stabilite', label: 'Un travail stable', icon: '🏛️', categorie: 'Securite',
        description: 'Rechercher une situation professionnelle durable.',
        motivations: ['Recherche de stabilite'], savoirEtre: ['Stabilite', 'Fiabilite'], metiers: [],
        arguments: ['construire un projet professionnel durable', 'm\'investir sur le long terme'] },
      { id: 'salaire', label: 'Un bon salaire', icon: '💶', categorie: 'Securite',
        description: 'Beneficier d\'une remuneration satisfaisante.',
        motivations: ['Securite financiere'], savoirEtre: ['Rigueur'], metiers: [],
        arguments: ['obtenir une remuneration a la hauteur de mon investissement', 'assurer une stabilite financiere'] },
      { id: 'horaires_fixes', label: 'Des horaires fixes', icon: '⏰', categorie: 'Securite',
        description: 'Avoir des horaires previsibles et reguliers.',
        motivations: ['Recherche de stabilite'], savoirEtre: ['Organisation'], metiers: [],
        arguments: ['beneficier d\'horaires previsibles et reguliers'] }
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
