/* ============================================================
   modules/cv-editor/modelesDisponibles.js
   ------------------------------------------------------------
   Liste centrale des modeles de CV disponibles (id du dossier dans
   modules/cv-editor/templates/, + nom affiche dans le selecteur).

   SEUL endroit a modifier pour ajouter un futur modele a la liste
   deroulante : ajouter une ligne ici (en plus de creer le dossier
   modules/cv-editor/templates/<id>/ avec template.html, style.css et
   <id>.json, comme les modeles existants). Aucune autre modification
   de code n'est necessaire -- ouvrirApercuCV() et
   chargerEtAfficherApercuCV() (js/app.js) lisent cette liste de facon
   generique, sans jamais nommer un modele en dur.
   ============================================================ */

var MODELES_CV_DISPONIBLES = [
  { id: 'moderne', nom: 'Moderne' },
  { id: 'classique', nom: 'Classique' },
  { id: 'elegant', nom: 'Élégant' },
  { id: 'minimaliste', nom: 'Minimaliste' },
  { id: 'institutionnel', nom: 'Institutionnel' },
  { id: 'jeune-diplome', nom: 'Jeune diplômé' }
];
