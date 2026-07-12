// ============================================================
// exportBlocsTexteLettreEntretien.js
// ------------------------------------------------------------
// TACHE (simplification : DOCX seul + filet de secours, etendu a la
// lettre et l'entretien) : meme principe que exportBlocsTexteCV.js --
// texte simple, pret a copier-coller, memes donnees que les generateurs
// Word natifs correspondants.
// ============================================================

function genererBlocsTexteLettre(objetLettre) {
  var identite = objetLettre.identite || {};
  var lignes = [];
  lignes.push((identite.prenom || '') + ' ' + (identite.nom || ''));
  if (identite.adresse) { lignes.push(identite.adresse); }
  if (identite.ville) { lignes.push(identite.ville); }
  if (identite.telephone) { lignes.push(identite.telephone); }
  if (identite.email) { lignes.push(identite.email); }
  lignes.push('');
  lignes.push(objetLettre.date || '');
  lignes.push('');
  if (objetLettre.objet) { lignes.push('Objet : ' + objetLettre.objet); lignes.push(''); }
  if (objetLettre.texte) { lignes.push(objetLettre.texte); }
  return lignes.join('\n');
}

function genererBlocsTexteEntretien(objetEntretien) {
  var identite = objetEntretien.identite || {};
  var lignes = [];
  function titre(texte) { lignes.push(''); lignes.push(texte.toUpperCase()); lignes.push('-'.repeat(texte.length)); }
  function puce(texte) { lignes.push('• ' + texte); }

  lignes.push("Préparation à l'entretien");
  lignes.push(((identite.civilite || '') + ' ' + (identite.prenom || '') + ' ' + (identite.nom || '')).trim());
  if (objetEntretien.metierVise) {
    lignes.push('Poste visé : ' + objetEntretien.metierVise + (objetEntretien.entreprise ? ' — ' + objetEntretien.entreprise : ''));
  }

  if (objetEntretien.presentation) { titre('Ma présentation'); lignes.push(objetEntretien.presentation); }

  var points = (objetEntretien.pointsAPreparer || []).filter(Boolean);
  if (points.length) { titre('Points à préparer'); points.forEach(puce); }

  // TACHE (retour utilisateur : réponses courtes + conseils par question) :
  // chaque question anticipee est desormais {question, pistes, amorce} au
  // lieu d'une simple chaine -- rendu en texte : la question en puce,
  // pistes et amorce en retrait juste en dessous, uniquement si presentes.
  var questions = (objetEntretien.questionsAnticipees || []).filter(function (q) { return q && q.question; });
  if (questions.length) {
    titre('Questions anticipées');
    questions.forEach(function (q) {
      puce(q.question);
      if (q.pistes && q.pistes.length) { lignes.push('   Pistes : ' + q.pistes.join(' · ')); }
      if (q.amorce) { lignes.push('   Amorce : « ' + q.amorce + ' »'); }
    });
  }

  var questionsCandidat = (objetEntretien.questionsDuCandidat || []).filter(Boolean);
  if (questionsCandidat.length) { titre('Questions à poser au recruteur'); questionsCandidat.forEach(puce); }

  return lignes.join('\n');
}
