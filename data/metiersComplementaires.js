/* ============================================================
   data/metiersComplementaires.js
   ------------------------------------------------------------
   Fichier dedie aux metiers ajoutes A LA MAIN, separement du
   referentiel officiel (data/referentielMetiersERIP.js, 58 metiers) et
   des metiers d'origine (data/metiers.js, 65 metiers). Aucun de ces deux
   fichiers n'est modifie par celui-ci.

   PRINCIPE : chaque metier ajoute ici est pousse dans "baseMetiers"
   (data/metiers.js) au chargement de la page (voir la derniere ligne de
   ce fichier) -- il devient alors IDENTIQUE a n'importe quel metier
   d'origine pour toute l'application : recherche par nom, suggestions
   basees sur le profil, calcul de score, tout fonctionne pareil.

   ============================================================
   COMMENT AJOUTER UN NOUVEAU METIER SOI-MEME
   ============================================================

   1. Copier un bloc { ... } ci-dessous, le coller juste avant la ligne
      "];" qui ferme le tableau.
   2. Remplir CES CHAMPS avec de vraies valeurs -- ce sont eux qui
      rendent le metier reellement fonctionnel (recherche, suggestions,
      calcul de score) :
        - id          : identifiant unique, en minuscules, sans espace
                        (ex. "gendarme")
        - nom         : nom affiche (ex. "Gendarme")
        - rome        : code ROME UNIQUEMENT si vous en etes certain,
                        sinon laisser null (jamais invente)
        - secteur     : libre (ex. "Sécurité publique")
        - activites   : IDENTIFIANTS EXACTS pris dans
                        data/personnesMaterielsLieux.js (ex. "clients",
                        "vehicules", "documents", "collegues", "bureau",
                        "exterieur", "machines", "outils"...)
        - actions     : IDENTIFIANTS EXACTS pris dans
                        data/actionsProfessionnelles.js (ex. "controler",
                        "aider", "conduire", "rediger", "organiser",
                        "analyser", "informer"...)
        - environnement : IDENTIFIANTS EXACTS pris dans
                        data/environnementsTravail.js (ex. "administration",
                        "exterieur", "bureau", "sante", "exploitation_agricole"...)
        - valeurs     : IDENTIFIANTS EXACTS pris dans
                        data/valeursProfessionnelles.js (ex. "metier_sens",
                        "responsabilites", "stabilite", "travail_equipe",
                        "autonomie", "contact_humain"...)
        - savoirFaire, savoirEtre, savoirs : texte libre, pas de catalogue
                        fixe pour ces 3 champs

      ATTENTION : si vous inventez un identifiant qui n'existe pas dans
      ces 4 fichiers (ex. "surveiller" au lieu de "controler"), le metier
      restera trouvable par son NOM dans la recherche, mais n'apparaitra
      JAMAIS dans les suggestions automatiques basees sur le profil de la
      personne -- le lien ne se fait que sur une correspondance exacte
      d'identifiant, jamais par proximite de sens.

   3. Ces champs sont FACULTATIFS -- l'application ne les exploite pas
      encore aujourd'hui (aucun code ne les lit, meme pour les metiers
      deja presents dans le referentiel officiel), mais les remplir ne
      coute rien et prepare un usage futur eventuel :
        argumentsCV, argumentsLettre, pistesEntretien, synonymes,
        motsCles, conceptsAssocies, famille, fap, niveauPertinence

   ============================================================ */

var METIERS_COMPLEMENTAIRES = [
  {
    id: 'gendarme', nom: 'Gendarme', famille: 'Sécurité et défense', secteur: 'Sécurité publique',
    rome: 'K1706', fap: null,
    // TACHE (ajout manuel, verifie) : identifiants reels, confirmes dans
    // les 4 catalogues existants -- pas de mots inventes.
    activites: ['clients', 'vehicules', 'documents', 'collegues'],
    actions: ['controler', 'aider', 'conduire', 'rediger'],
    environnement: ['administration', 'exterieur'],
    valeurs: ['metier_sens', 'responsabilites', 'stabilite', 'travail_equipe'],
    savoirFaire: ['Intervention', 'Rédaction de procédures', 'Secourisme'],
    savoirEtre: ['Rigueur', 'Sang-froid', 'Sens du devoir', 'Esprit d\'équipe', 'Discrétion'],
    savoirs: ['Droit pénal', 'Procédure judiciaire', 'Sécurité publique'],
    argumentsCV: ['protéger et assister le public au quotidien, avec rigueur et sang-froid'],
    argumentsLettre: ['contribuer à la sécurité et à la protection des citoyens, dans le respect strict de la loi'],
    pistesEntretien: ['Décrire une situation gérée avec calme malgré un contexte tendu ou imposé.'],
    synonymes: ['gendarme adjoint', 'sous-officier de gendarmerie', 'militaire de la gendarmerie'],
    motsCles: [], conceptsAssocies: [],
    niveauPertinence: null
  }
];

// INTEGRATION : identique au principe de referentielMetiersERIP.js -- ne
// modifie ni data/metiers.js ni data/referentielMetiersERIP.js.
METIERS_COMPLEMENTAIRES.forEach(function (m) { baseMetiers.push(m); });
