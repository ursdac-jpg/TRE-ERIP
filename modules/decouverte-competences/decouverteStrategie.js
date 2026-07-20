/* ============================================================
   decouverteStrategie.js
   ------------------------------------------------------------
   Module « Découverte et valorisation des compétences ».
   Répond à : document 1 §10 (stratégie de retour à l'emploi) et
   document 2 §11 (métiers compatibles) et §12 (type de CV).

   PRINCIPE STRICT (exigé explicitement) : ce fichier ne recrée et ne
   recopie JAMAIS le référentiel métiers d'ERIP, ni sa logique de score.
   Il construit uniquement un profil compatible avec rechercherMetiers()
   (metiers.js, INCHANGÉE), et délègue entièrement le calcul de
   pertinence à cette fonction existante. Ce fichier est un orchestrateur
   et un adaptateur -- jamais un second moteur de recommandation.

   L'ADAPTATEUR (validé) : rapproche chaque compétence découverte du
   vocabulaire canonique déjà utilisé partout ailleurs dans ERIP
   (categorieCompetence, app.js) pour maximiser les vraies correspondances
   avec le référentiel métiers -- en réutilisant les fonctions de
   correspondance déjà existantes (correspond()/motsCles(), metiers.js),
   jamais une réimplémentation. Deux principes non négociables,
   confirmés explicitement :
   - le texte validé par la personne reste TOUJOURS présent tel quel et
     n'est jamais modifié ni remplacé ;
   - le terme canonique, s'il existe, est ajouté EN PLUS, uniquement
     pour améliorer la correspondance -- jamais à la place.

   TRAÇABILITÉ (exigée explicitement) : pour chaque métier proposé, ce
   fichier reconstruit la liste des contributions qui ont pesé dans le
   score, en distinguant explicitement ce qui vient du texte validé par
   la personne et ce qui vient d'un terme canonique ajouté par
   l'adaptateur -- jamais un simple score sans explication.
   ============================================================ */

// TACHE (doc2 §12) : les 3 types de CV possibles -- l'énumération vit
// dans decouverteClassification.js (DECOUVERTE_TYPES_CV), réutilisée ici
// telle quelle.

// Convertit une catégorie de compétence (doc1 §7.2) vers le champ du
// profil attendu par rechercherMetiers() (activites/actions/environnement/
// valeurs/savoirFaire/savoirEtre/savoirs). "centreInteret" n'est
// volontairement jamais transmis : ce n'est pas un savoir au sens du
// référentiel métiers, sa valeur est ailleurs (motivation en entretien,
// doc1 §7.2).
function _decouverteChampProfilPourCategorie(categorie) {
  if (categorie === DECOUVERTE_CATEGORIES.TECHNIQUE || categorie === DECOUVERTE_CATEGORIES.TRANSFERABLE) {
    return 'savoirFaire';
  }
  if (categorie === DECOUVERTE_CATEGORIES.SAVOIR_ETRE || categorie === DECOUVERTE_CATEGORIES.APTITUDE) {
    return 'savoirEtre';
  }
  return null;
}

// Cherche, parmi le vocabulaire canonique déjà existant (categorieCompetence,
// app.js), le terme le plus proche d'un texte donné -- réutilise
// correspond() (metiers.js) telle quelle, jamais une nouvelle logique de
// similarité. Retourne null si rien ne correspond (cas normal et attendu,
// pas une erreur -- doc1 le mentionne explicitement comme un risque
// assumé, pas un échec du module).
function _decouverteTrouverTermeCanoniqueProche(texte) {
  if (typeof categorieCompetence === 'undefined' || typeof correspond !== 'function') { return null; }
  var termesCanoniques = Object.keys(categorieCompetence);
  for (var i = 0; i < termesCanoniques.length; i++) {
    if (correspond(texte, termesCanoniques[i])) { return termesCanoniques[i]; }
  }
  return null;
}

// Construit le profil compatible avec rechercherMetiers(), ET la carte
// d'origine de chaque terme (validé par la personne / ajouté par
// l'adaptateur) -- nécessaire à la traçabilité exigée.
function _decouverteConstruireProfilEtOrigines(competencesValidees) {
  var profil = { activites: [], actions: [], environnement: [], valeurs: [], savoirFaire: [], savoirEtre: [], savoirs: [] };
  var origineParTerme = {}; // texte normalisé -> { competenceId, texteValide, estCanonique }

  (competencesValidees || []).forEach(function (competence) {
    var champ = _decouverteChampProfilPourCategorie(competence.categorie);
    if (!champ) { return; } // ex. centreInteret : jamais transmis au moteur

    // Le texte validé par la personne -- TOUJOURS ajouté, jamais modifié.
    profil[champ].push(competence.texte);
    origineParTerme[normaliserTexte(competence.texte)] = {
      competenceId: competence.id, texteValide: competence.texte, estCanonique: false
    };

    // Terme canonique le plus proche, ajouté EN PLUS si trouvé -- jamais
    // à la place du texte validé.
    var termeCanonique = _decouverteTrouverTermeCanoniqueProche(competence.texte);
    if (termeCanonique && normaliserTexte(termeCanonique) !== normaliserTexte(competence.texte)) {
      profil[champ].push(termeCanonique);
      origineParTerme[normaliserTexte(termeCanonique)] = {
        competenceId: competence.id, texteValide: competence.texte, estCanonique: true, termeCanonique: termeCanonique
      };
    }
  });

  return { profil: profil, origineParTerme: origineParTerme };
}

// Reconstruit, pour UN métier déjà retourné par rechercherMetiers(), la
// liste des contributions (doc1/doc2 : "pourquoi ce métier ?") --
// recalculée à partir de NOTRE profil et de la carte d'origine, jamais en
// reparsant les "raisons" de calculerScoreMetier() (qui restent, elles,
// dans le vocabulaire du métier, pas du profil -- une reconstruction
// propre est plus fiable qu'un parsing de texte).
function _decouverteExpliquerContributions(profil, origineParTerme, metier) {
  var contributions = [];
  ['savoirFaire', 'savoirEtre'].forEach(function (champ) {
    (profil[champ] || []).forEach(function (termeProfil) {
      var correspondACeMetier = (metier[champ] || []).some(function (termeMetier) {
        return correspond(termeProfil, termeMetier);
      });
      if (!correspondACeMetier) { return; }
      var origine = origineParTerme[normaliserTexte(termeProfil)] || {};
      contributions.push({
        champ: champ,
        terme: termeProfil,
        estTermeCanonique: !!origine.estCanonique,
        texteValideParLaPersonne: origine.texteValide || termeProfil,
        competenceOrigineId: origine.competenceId || null
      });
    });
  });
  return contributions;
}

// TACHE (doc2 §12) : choix du type de CV -- tableau de règles
// entièrement déterministe, aucun appel IA. Chaque résultat porte sa
// règle (même discipline que le Rule Engine du Composeur : une décision
// sans son origine n'est pas une décision traçable).
//
// params = { nombreExperiencesProfessionnelles, nombreExperiencesPersonnelles,
//            objectifReconversion (bool, réutilise dossier.objectif existant,
//            jamais une nouvelle détection) }
function determinerTypeCV(params) {
  params = params || {};
  var nbPro = params.nombreExperiencesProfessionnelles || 0;
  var nbPerso = params.nombreExperiencesPersonnelles || 0;

  if (params.objectifReconversion) {
    return { type: DECOUVERTE_TYPES_CV.PAR_COMPETENCES, regle: 'reconversion-marquee' };
  }
  if (nbPro >= 2) {
    return nbPerso > 0
      ? { type: DECOUVERTE_TYPES_CV.MIXTE, regle: 'plusieurs-experiences-plus-personnel' }
      : { type: DECOUVERTE_TYPES_CV.CHRONOLOGIQUE, regle: 'plusieurs-experiences-coherentes' };
  }
  if (nbPro >= 1 && nbPerso >= 1) {
    return { type: DECOUVERTE_TYPES_CV.MIXTE, regle: 'melange-pro-et-personnel' };
  }
  if (nbPro === 0 && nbPerso >= 1) {
    return { type: DECOUVERTE_TYPES_CV.PAR_COMPETENCES, regle: 'peu-experiences-formelles' };
  }
  // Cas par défaut (doc2 §12, précision ajoutée à la relecture finale) :
  // profil trop mince pour correspondre clairement à une ligne du tableau.
  return { type: DECOUVERTE_TYPES_CV.PAR_COMPETENCES, regle: 'defaut-profil-mince' };
}

// TACHE (Composeur, contrat composeur-strategies-cv-v2.md §2) : nouvelle
// fonction, indépendante de determinerTypeCV() ci-dessus -- les deux
// coexistent temporairement, aucune régression possible sur le module
// Découverte (qui continue d'utiliser determinerTypeCV() sans le savoir).
// Étape 1 du plan de développement du Composeur : calcule un score de
// pertinence pour chacune des 3 stratégies plutôt qu'une décision unique,
// pour que le moteur conseille sans jamais imposer. Les mêmes signaux que
// determinerTypeCV() sont réutilisés (aucune nouvelle détection), mais
// combinés en parallèle plutôt qu'en cascade -- les poids ci-dessous sont
// un premier réglage, à recalibrer sur de vrais cas de recette (annoncé
// dès la conception, jamais prétendu définitif sur le seul papier).
//
// params = { nombreExperiencesProfessionnelles, nombreExperiencesPersonnelles,
//            objectifReconversion (bool) }
function calculerScoresStrategies(params) {
  params = params || {};
  var nbPro = params.nombreExperiencesProfessionnelles || 0;
  var nbPerso = params.nombreExperiencesPersonnelles || 0;
  var reconversion = !!params.objectifReconversion;

  var points = { chronologique: 0, mixte: 0, parCompetences: 0 };

  // Signal : reconversion marquée -> pousse fortement vers Par compétences
  // (reprend 'reconversion-marquee', le signal le plus fort de l'ancienne
  // logique, qui coupait court à toute autre règle).
  if (reconversion) { points.parCompetences += 50; }

  // Signal : nombre d'expériences professionnelles -> pousse vers
  // Chronologique (plafonné à 4, un profil très riche ne doit pas
  // écraser totalement les deux autres scores).
  points.chronologique += Math.min(nbPro, 4) * 15;

  // Signal : mélange pro + personnel -> pousse vers Mixte (reprend
  // 'plusieurs-experiences-plus-personnel' et 'melange-pro-et-personnel').
  if (nbPro >= 1 && nbPerso >= 1) { points.mixte += 45; }
  else if (nbPro >= 2 && nbPerso === 0) { points.mixte += 10; }

  // Signal : peu ou pas d'expérience professionnelle -> pousse vers Par
  // compétences (reprend 'peu-experiences-formelles').
  if (nbPro === 0) { points.parCompetences += 30; }
  if (nbPro === 0 && nbPerso >= 1) { points.parCompetences += 15; }

  // Signal : profil très mince (aucune expérience du tout) -> reprend le
  // repli 'defaut-profil-mince'.
  if (nbPro === 0 && nbPerso === 0) { points.parCompetences += 25; }

  // Plancher : aucune stratégie n'est jamais totalement exclue (0%), même
  // la moins pertinente garde une petite chance visible -- cohérent avec
  // "le moteur conseille, l'humain décide" : rien n'est présenté comme
  // impossible.
  points.chronologique = Math.max(points.chronologique, 5);
  points.mixte = Math.max(points.mixte, 5);
  points.parCompetences = Math.max(points.parCompetences, 5);

  var total = points.chronologique + points.mixte + points.parCompetences;
  var scores = {
    chronologique: Math.round(points.chronologique / total * 100),
    mixte: Math.round(points.mixte / total * 100),
    parCompetences: Math.round(points.parCompetences / total * 100)
  };

  var classement = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });

  return { scores: scores, recommandation: classement[0], classement: classement };
}

// Point d'entrée unique de ce fichier. Ne calcule RIEN lui-même côté
// pertinence métiers -- délègue entièrement à rechercherMetiers()
// (metiers.js, jamais modifiée), et se contente d'habiller le résultat
// d'une explication traçable.
function proposerStrategie(competencesValidees, contexte) {
  contexte = contexte || {};

  var construction = _decouverteConstruireProfilEtOrigines(competencesValidees);
  var metiersBruts = (typeof rechercherMetiers === 'function')
    ? rechercherMetiers(construction.profil, contexte.nombreMax || 5)
    : [];

  var metiersProposes = metiersBruts.map(function (metier) {
    return {
      metier: metier,
      contributions: _decouverteExpliquerContributions(construction.profil, construction.origineParTerme, metier)
    };
  });

  var typeCVRecommande = determinerTypeCV({
    nombreExperiencesProfessionnelles: contexte.nombreExperiencesProfessionnelles,
    nombreExperiencesPersonnelles: contexte.nombreExperiencesPersonnelles,
    objectifReconversion: contexte.objectifReconversion
  });

  return {
    metiersProposes: metiersProposes,
    aucunMetierPertinent: metiersProposes.length === 0,
    typeCVRecommande: typeCVRecommande
  };
}
