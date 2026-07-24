/* ============================================================
   composeurComposants.js
   ------------------------------------------------------------
   Moteur "Composeur (Bêta)" — Registre statique de composants (§3 de
   l'architecture). Un catalogue EXPLICITE, pas un système de plugins
   dynamique (garde-fou §3 du contrat) : chaque entrée porte ses propres
   métadonnées à côté de son code, mais rien n'est découvert ni chargé
   dynamiquement.

   V1 (Bêta) : UNE SEULE variante par rubrique — structure prévue pour en
   recevoir davantage (prochaines étapes) sans jamais changer sa forme :
   ajouter une variante = ajouter une entrée dans le bon groupe, jamais
   modifier composeurComposition.js ni composeurRender.js.

   Chaque entrée décrit :
   - son identité (id, rubrique) ;
   - sa hauteur estimée, en NOMBRE DE LIGNES (jamais en points/pixels —
     voir architecture §4.3 : le moteur ne peut pas garantir une mesure
     réelle du rendu Word).
   ============================================================ */

var COMPOSEUR_REGISTRE_COMPOSANTS = {
  enTete: {
    classique: {
      id: 'classique', rubrique: 'enTete',
      // TACHE (composeur-theme-engine-conception.md §1, décision révisée) :
      // le nombre de colonnes appartenait ici jusqu'à la conception du
      // Theme Engine -- déplacé vers le thème (theme.colonnes,
      // composeurTheme.js), qui passe le test d'architecture du document
      // ("s'applique à l'identique quel que soit le contenu") alors que
      // ce n'était pas vraiment le cas pour une variante d'en-tête.
      // L'en-tête ne porte plus désormais que sa propre présentation.
      hauteurLignesEstimee: function () { return 3; }
    }
  },
  profil: {
    paragraphe: {
      id: 'paragraphe', rubrique: 'profil', colonnesCompatibles: ['principale'],
      hauteurLignesEstimee: function (objetCV) {
        var texte = (objetCV.profil && (objetCV.profil.profilIA || objetCV.profil.profilUtilisateur)) || '';
        return texte ? Math.max(1, Math.ceil(texte.length / 90)) : 0;
      }
    }
  },
  experiences: {
    standard: {
      id: 'standard', rubrique: 'experiences', colonnesCompatibles: ['principale'],
      hauteurLignesEstimee: function (objetCV) {
        return (objetCV.experiences || []).reduce(function (total, e) {
          return total + 2 + (e.missions ? Math.ceil(e.missions.length / 90) : 0);
        }, 0);
      }
    }
  },
  formations: {
    standard: {
      id: 'standard', rubrique: 'formations', colonnesCompatibles: ['principale', 'laterale'],
      hauteurLignesEstimee: function (objetCV) { return (objetCV.formations || []).length * 2; }
    }
  },
  competences: {
    liste: {
      id: 'liste', rubrique: 'competences', colonnesCompatibles: ['principale', 'laterale'],
      hauteurLignesEstimee: function (objetCV) {
        var c = objetCV.competences || {};
        return (c.savoirFaire || []).length + (c.savoirEtre || []).length + (c.savoirs || []).length;
      }
    }
  },
  langues: {
    liste: {
      id: 'liste', rubrique: 'langues', colonnesCompatibles: ['principale', 'laterale'],
      hauteurLignesEstimee: function (objetCV) { return (objetCV.langues || []).length; }
    }
  },
  loisirsEngagements: {
    liste: {
      id: 'liste', rubrique: 'loisirsEngagements', colonnesCompatibles: ['principale', 'laterale'],
      hauteurLignesEstimee: function (objetCV) { return (objetCV.loisirs || []).length + (objetCV.engagements || []).length; }
    }
  },
  // TACHE (étape B2, "2 colonnes") : ces deux rubriques n'avaient jamais
  // été enregistrées ici (construites directement dans
  // composeurComposition.js/composeurRender.js, jamais via
  // composeurObtenirComposant()) -- ajoutées maintenant uniquement pour
  // porter leurs métadonnées de compatibilité de colonne, seule
  // information qui manquait pour l'étape B2. Le bandeau de compétences
  // clés a besoin de largeur (principale uniquement) ; les compétences
  // personnelles, une simple liste, peuvent aller dans les deux.
  competencesCles: {
    bandeau: { id: 'bandeau', rubrique: 'competencesCles', colonnesCompatibles: ['principale'] }
  },
  competencesPersonnelles: {
    liste: { id: 'liste', rubrique: 'competencesPersonnelles', colonnesCompatibles: ['principale', 'laterale'] }
  },
  // TACHE (retour utilisateur : "mélange loisirs/centre d'intérêt" --
  // Projet XXL uniquement, voir composeurComposition.js/composeurRender.js) :
  // rubrique EXCLUSIVE a Projet XXL, jamais injectee pour les 3 autres
  // themes. colonnesCompatibles ne porte QUE 'principale' -- ce n'est
  // plus un "centre d'interet", jamais deplacable en colonne laterale
  // (contrairement a loisirsEngagements ci-dessus). Comme
  // competencesPersonnelles, cette entree n'est pas lue aujourd'hui par
  // composeurRender.js (dessine directement, sans passer par
  // composeurObtenirComposant()) -- ajoutee ici uniquement pour la
  // coherence du registre et si composeurRubriqueCompatibleColonne()
  // est un jour appelee pour cette rubrique.
  experiencesPersonnelles: {
    liste: { id: 'liste', rubrique: 'experiencesPersonnelles', colonnesCompatibles: ['principale'] }
  },
  // TACHE (retour utilisateur : bug de contenu manquant, corrigé) :
  // rubrique EXCLUSIVE aux 3 thèmes non-Projet XXL (voir composeurComposition.js
  // -- intégrée à "Formation" pour Projet XXL, jamais sa propre rubrique
  // pour ce thème). Comme experiencesPersonnelles/competencesPersonnelles,
  // cette entrée n'est pas lue aujourd'hui par composeurRender.js (dessinée
  // directement) -- ajoutée pour la cohérence du registre.
  certifications: {
    liste: { id: 'liste', rubrique: 'certifications', colonnesCompatibles: ['principale'] }
  }
};

// Point d'accès unique au registre (jamais une lecture directe de
// COMPOSEUR_REGISTRE_COMPOSANTS ailleurs) -- repli sur null si la
// rubrique/variante n'existe pas, jamais une exception.
function composeurObtenirComposant(rubrique, variante) {
  var groupe = COMPOSEUR_REGISTRE_COMPOSANTS[rubrique];
  if (!groupe) { return null; }
  return groupe[variante] || null;
}

// TACHE (étape B2, "2 colonnes") : point d'accès unique pour savoir si
// une rubrique peut aller dans une colonne donnée -- jamais une lecture
// directe de colonnesCompatibles ailleurs (composeurComposition.js
// l'utilise pour répartir, jamais pour redéfinir la règle elle-même).
// Vérifie TOUTES les variantes connues de cette rubrique (V1 : une
// seule, mais reste correct le jour où plusieurs variantes existeront) --
// compatible si AU MOINS une variante le permet.
function composeurRubriqueCompatibleColonne(rubrique, colonne) {
  var groupe = COMPOSEUR_REGISTRE_COMPOSANTS[rubrique];
  if (!groupe) { return false; }
  return Object.keys(groupe).some(function (variante) {
    var compat = groupe[variante].colonnesCompatibles;
    return !compat || compat.indexOf(colonne) !== -1;
  });
}
