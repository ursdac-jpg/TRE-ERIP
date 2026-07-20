/* ============================================================
   composeurRegles.js
   ------------------------------------------------------------
   Moteur "Composeur (Bêta)" — Couche ② : Rule Engine (§4 de
   l'architecture-moteur-cv.md, contrat V4).

   Bibliothèque de règles CATÉGORISÉES (dure / préférée / word /
   esthétique — §4.1), appliquées dans un ORDRE FIXE et déterministe
   (§4.2) : jamais un solveur de contraintes générique, jamais de score
   global à optimiser, jamais de retour en arrière.

   Chaque règle documente : numéro, catégorie, description, justification,
   et une fonction appliquer(profil) qui renvoie TOUJOURS { valeur, regle }
   — jamais une valeur nue. C'est la condition posée par le contrat (§5)
   pour que le système d'explication (§7.3) puisse un jour tracer "quelle
   règle a produit quelle décision" sans avoir à deviner après coup.
   ============================================================ */

var COMPOSEUR_REGLES = [
  {
    numero: 'R003', categorie: 'dure',
    description: 'La police ne descend jamais sous 12pt.',
    justification: 'Lisibilité minimale garantie, quel que soit le volume de contenu (principe directeur n°6).',
    cle: 'tailleMinPolice',
    appliquer: function () { return { valeur: 12, regle: 'R003' }; }
  },
  {
    numero: 'R004', categorie: 'preferee',
    description: 'Les expériences sont prioritaires (affichées avant les formations) pour un profil confirmé ou cadre ; la formation est prioritaire pour un profil débutant.',
    justification: 'Met en avant ce qui constitue le principal atout réel du profil pour ce type de parcours.',
    cle: 'rubriquePrioritaire',
    appliquer: function (profil) {
      if (profil.profilParcours === 'debutant') {
        return {
          valeur: 'formations', regle: 'R004',
          texteExplication: 'Votre formation apparaît en premier car votre profil correspond à un début de parcours.'
        };
      }
      return {
        valeur: 'experiences', regle: 'R004',
        texteExplication: 'Vos expériences ont été mises en avant car elles constituent votre principal atout.'
      };
    }
  },
  {
    // TACHE (contrat V4, §4.1) : R002 RÉTROGRADÉE -- formulée initialement
    // comme une contrainte chiffree ("une colonne ne depasse pas l'autre
    // de plus de X%"), jugee irrealiste a l'implementation (docx.js/Word
    // ne permettent aucune mesure du rendu reel -- voir architecture
    // §4.3). Reformulee en regle PREFEREE, honnete sur ce qu'elle peut
    // reellement faire.
    numero: 'R002', categorie: 'preferee',
    description: 'Répartir les rubriques par poids de contenu approximatif (nombre de lignes estimées), sans viser un seuil de précision numérique.',
    justification: 'Rétrogradée depuis une contrainte chiffrée (contrat V4) — aucune mesure du rendu réel n\'est possible depuis notre code.',
    cle: 'repartitionColonnes',
    appliquer: function () { return { valeur: 'approximative', regle: 'R002' }; }
  },
  {
    numero: 'R005', categorie: 'preferee',
    description: 'Échelle de police selon la densité globale : contenu faible → texte plus grand ; contenu fort → texte resserré, jamais sous le plancher de R003.',
    justification: 'Remplit mieux la page pour un profil avec peu de contenu ; évite un débordement pour un profil dense. Même principe que _dnEchelleTexteCourant (moteur des 16 modèles existants), pour rester cohérent avec ce que l\'appli fait déjà ailleurs.',
    cle: 'echelleTaillePolice',
    appliquer: function (profil) {
      var echelle = profil.densite === 'faible' ? 1.15 : (profil.densite === 'forte' ? 0.9 : 1.0);
      return { valeur: echelle, regle: 'R005' };
    }
  },
  {
    numero: 'R001', categorie: 'word',
    description: 'Une rubrique ne commence jamais seule en bas de page.',
    justification: 'Requête envoyée à Word (keepLines) — jamais vérifiable après coup depuis notre code (architecture §4.3, catégorie "Word").',
    cle: 'controleVeuvesOrphelines',
    appliquer: function () { return { valeur: true, regle: 'R001' }; }
  }
];

// Applique TOUTES les regles, dans l'ORDRE FIXE des categories (dures ->
// preferees -> word -> esthetiques, §4.2) -- jamais un solveur. Retourne
// un objet { cleDeRegle: {valeur, regle, texteExplication?} }, lu ensuite
// par composeurComposition.js (③).
function composeurAppliquerRegles(profil) {
  var ordreCategories = ['dure', 'preferee', 'word', 'esthetique'];
  var decisions = {};
  ordreCategories.forEach(function (categorie) {
    COMPOSEUR_REGLES
      .filter(function (regle) { return regle.categorie === categorie; })
      .forEach(function (regle) { decisions[regle.cle] = regle.appliquer(profil); });
  });
  return decisions;
}
