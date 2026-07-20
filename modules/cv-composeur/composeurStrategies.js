/* ============================================================
   composeurStrategies.js
   ------------------------------------------------------------
   Moteur "Composeur (Bêta)" — Étape 2 du plan de développement défini
   dans composeur-strategies-cv-v2.md (contrat de référence des 3
   stratégies). Ajoute la structure Strategie et la règle R005 qui les
   sélectionne, SANS toucher à R004 (composeurRegles.js) ni à
   determinerTypeCV() (decouverteStrategie.js) -- cohabitation explicite
   avec l'existant jusqu'à ce que le Composeur soit entièrement
   opérationnel (étapes 3 à 5, pas encore commencées).

   Ce fichier ne fait QUE poser la structure de données et la sélection.
   Il ne construit aucun des composants qu'il référence par leur id
   prévu (bandeauCompetencesCles, groupeParTheme, ligneCompacte) -- ces
   variantes n'existent pas encore dans composeurComposants.js. Les
   utiliser avant leur construction (étapes 3/4) échouerait proprement,
   jamais silencieusement (composeurComposition.js devra vérifier leur
   existence avant de les invoquer).
   ============================================================ */

// Les 3 stratégies, fidèles au contrat composeur-strategies-cv-v2.md
// (§1, §3, §4). Chaque champ répond directement à une question du
// document de conception -- rien ajouté qui n'y figure pas.
var STRATEGIES_CV = [
  {
    id: 'chronologique',
    narration: 'progression',
    objectif: 'Démontrer une progression de carrière cohérente et continue.',
    casRecommandes: 'Parcours professionnel solide, sans rupture majeure, secteur cohérent ou progression logique de responsabilités.',
    ordreRubriques: ['enTete', 'profil', 'experiences', 'formations', 'competences', 'loisirsEngagements', 'competencesPersonnelles'],
    // TACHE : variantes déjà existantes dans composeurComposants.js --
    // aucune construction nécessaire pour cette stratégie précise.
    variantesParRubrique: { experiences: 'standard', competences: 'liste' },
    reglesSpecifiques: ['rubriquePrioritaire:experiences', 'aucunRegroupementThematiqueCompetences']
  },
  {
    id: 'mixte',
    narration: 'equilibre',
    objectif: 'Équilibrer expérience prouvée et compétences transférables.',
    casRecommandes: 'Parcours avec quelques changements de direction, mélange d’expériences professionnelles et personnelles, sans rupture aussi marquée qu’une reconversion.',
    ordreRubriques: ['enTete', 'profil', 'competencesCles', 'experiences', 'formations', 'loisirsEngagements', 'competencesPersonnelles'],
    // TACHE (étape 4, pas encore construite) : 'bandeauCompetencesCles'
    // n'existe pas encore dans composeurComposants.js -- id réservé ici,
    // composeurComposition.js devra vérifier sa présence avant usage.
    variantesParRubrique: { competencesCles: 'bandeauCompetencesCles', experiences: 'standard' },
    reglesSpecifiques: ['selectionCompetencesCles:4-6', 'experiencesResserrees']
  },
  {
    id: 'parCompetences',
    narration: 'competences',
    objectif: 'Démontrer les compétences en s’appuyant sur les expériences comme preuve -- jamais seulement les regrouper par thème.',
    casRecommandes: 'Reconversion marquée, peu d’expériences formelles, profil par défaut mince.',
    ordreRubriques: ['enTete', 'profil', 'competences', 'experiences', 'formations', 'competencesPersonnelles'],
    // TACHE (étape 3/5, pas encore construites) : 'groupeParTheme' et
    // 'ligneCompacte' n'existent pas encore. Le mode "Illustré par"
    // (étape 5) ne s'applique qu'aux dossiers issus du module Découverte
    // (contrat §3.1, décision tranchée) -- mode dégradé sinon.
    variantesParRubrique: { competences: 'groupeParTheme', experiences: 'ligneCompacte' },
    reglesSpecifiques: [
      'regroupementThematiqueCompetences',
      'illustreParSiOrigineDecouverte', // sinon : mode dégradé, regroupement par thème sans preuve
      'aucuneReconstitutionArtificielleDuLien' // contrat §3.1 : jamais de rapprochement par mots-clés devine
    ]
  }
];

function strategieParId(id) {
  return STRATEGIES_CV.filter(function (s) { return s.id === id; })[0] || null;
}

// TACHE : R005, nouvelle règle, catégorie "préférée" (même catégorie que
// R004 -- une préférence de composition, jamais une contrainte dure).
// Consomme calculerScoresStrategies() (decouverteStrategie.js, déjà
// testée en isolation et comparée à determinerTypeCV() -- voir
// composeur-journal-calibration.md) plutôt que de dupliquer sa logique
// ici. Nécessite que decouverteStrategie.js soit chargé avant ce fichier
// (index.html) -- vérifié explicitement plutôt que supposé.
var COMPOSEUR_REGLE_R005 = {
  numero: 'R005', categorie: 'preferee',
  description: 'Sélectionne la stratégie de présentation du CV (chronologique/mixte/par compétences) par mise en balance de signaux, pas par bascule séquentielle.',
  justification: 'Contrat composeur-strategies-cv-v2.md §2 -- le moteur conseille une stratégie, ne l’impose jamais ; la personne garde toujours la main pour en choisir une autre.',
  cle: 'strategieCV',
  appliquer: function (profil) {
    if (typeof calculerScoresStrategies !== 'function') {
      // Filet de secours honnête : jamais un plantage silencieux si les
      // fichiers ne sont pas chargés dans le bon ordre -- repli sur la
      // stratégie chronologique, jamais un choix arbitraire caché.
      return {
        valeur: strategieParId('chronologique'), scores: null, regle: 'R005',
        texteExplication: 'calculerScoresStrategies() indisponible (ordre de chargement des scripts) -- repli sur la stratégie chronologique.'
      };
    }
    var resultat = calculerScoresStrategies({
      nombreExperiencesProfessionnelles: profil.nombreExperiencesProfessionnelles,
      nombreExperiencesPersonnelles: profil.nombreExperiencesPersonnelles,
      objectifReconversion: profil.objectifReconversion
    });
    var strategie = strategieParId(resultat.recommandation);
    return {
      valeur: strategie, scores: resultat.scores, regle: 'R005',
      texteExplication: 'Stratégie recommandée : ' + strategie.narration + ' (' + resultat.scores[resultat.recommandation] + '% de pertinence estimée parmi les 3).'
    };
  }
};

// TACHE (cohabitation explicite, comme convenu) : R005 n'est PAS ajoutée
// à COMPOSEUR_REGLES (composeurRegles.js) à ce stade -- composeurAppliquerRegles()
// continue de fonctionner à l'identique, sans jamais appeler R005. Elle
// reste appelable isolément (testable, comme R004 l'a été) en attendant
// que composeurComposition.js (étape 2, suite) soit prêt à la consommer
// réellement pour construire ordreRubriques/variantesParRubrique du CV.
function composeurTesterR005(profil) {
  return COMPOSEUR_REGLE_R005.appliquer(profil);
}

// TACHE (étape 4, consigne explicite : "une sélection éditoriale, pas une
// liste des premières compétences disponibles") : R006, signature
// différente de R004/R005 -- a besoin des compétences BRUTES et du
// métier visé, pas seulement du profil résumé (composeurProfil.js).
// Appelée explicitement par composeurComposition.js pour la stratégie
// Mixte uniquement, jamais via la boucle générique
// composeurAppliquerRegles() (qui ne passe que `profil`). Encapsule
// entièrement le critère de sélection -- si ce critère évolue demain, il
// change ICI, jamais dans composeurRender.js ni dans un futur composant
// "bandeau compétences clés".
var COMPOSEUR_REGLE_R006 = {
  numero: 'R006', categorie: 'preferee',
  description: 'Sélectionne jusqu’à 6 compétences clés pour le bandeau de la stratégie Mixte : un vrai équilibre technique/savoir-être, priorisé par pertinence avec le métier visé si connu -- jamais une simple liste des premières compétences disponibles.',
  justification: 'Contrat composeur-strategies-cv-v2.md §4, consigne explicite : "le moteur doit choisir les quelques compétences qui racontent le mieux le profil et servent le mieux l’objectif de la stratégie Mixte".',
  cle: 'competencesCles',
  appliquer: function (competencesBrutes, metierViseNom) {
    competencesBrutes = competencesBrutes || {};
    var savoirFaire = (competencesBrutes.savoirFaire || []).concat(competencesBrutes.savoirs || []);
    var savoirEtre = competencesBrutes.savoirEtre || [];

    // Priorisation par pertinence métier -- réutilise metierParNom() et
    // correspond() (metiers.js, jamais modifiées), le même mécanisme
    // déjà éprouvé ailleurs dans ce projet pour ce genre de rapprochement.
    var ficheMetier = (metierViseNom && typeof metierParNom === 'function') ? metierParNom(metierViseNom) : null;
    var motsCleFiche = ficheMetier
      ? [].concat(ficheMetier.savoirFaire || [], ficheMetier.savoirEtre || [], ficheMetier.savoirs || [])
      : [];

    function trierParPertinence(liste) {
      if (!motsCleFiche.length || typeof correspond !== 'function') { return liste.slice(); }
      var pertinentes = liste.filter(function (c) { return motsCleFiche.some(function (m) { return correspond(c, m); }); });
      var autres = liste.filter(function (c) { return pertinentes.indexOf(c) === -1; });
      return pertinentes.concat(autres);
    }

    var techniques = trierParPertinence(savoirFaire);
    var etre = trierParPertinence(savoirEtre);

    // Équilibre volontaire : alterne entre les 2 catégories plutôt que de
    // vider la première avant de toucher à la seconde -- jamais un
    // bandeau tout-technique ou tout-savoir-être, cohérent avec la
    // narration "equilibre" de cette stratégie (contrat §4).
    var MAX_TOTAL = 6;
    var selection = [];
    var i = 0;
    while (selection.length < MAX_TOTAL && (i < techniques.length || i < etre.length)) {
      if (i < techniques.length && selection.length < MAX_TOTAL) { selection.push(techniques[i]); }
      if (i < etre.length && selection.length < MAX_TOTAL) { selection.push(etre[i]); }
      i++;
    }

    return {
      valeur: selection, regle: 'R006',
      texteExplication: ficheMetier
        ? 'Compétences sélectionnées en priorité pour leur pertinence avec le métier visé (' + metierViseNom + '), en équilibrant savoir-faire et savoir-être.'
        : 'Compétences sélectionnées pour équilibrer savoir-faire technique et savoir-être, faute de métier visé identifié.'
    };
  }
};
