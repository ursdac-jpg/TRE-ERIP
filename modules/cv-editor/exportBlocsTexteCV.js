// ============================================================
// exportBlocsTexteCV.js
// ------------------------------------------------------------
// TACHE (simplification : DOCX seul + filet de secours) : genere un
// fichier texte simple, organise section par section, avec exactement
// les memes donnees et le meme decoupage que les generateurs Word
// natifs (voir exportDocxNatifCV.js -- reutilise ses fonctions
// utilitaires _dnTexteProfil/_dnListe/_dnTexteJoint, chargees avant ce
// fichier). Objectif : une personne qui n'aime pas le rendu Word peut
// copier-coller ce texte, deja redige et organise, dans Canva ou
// n'importe quel autre outil, sans avoir a retaper son CV depuis zero.
//
// Aucune mise en forme, aucune couleur -- juste le contenu, propre et
// dans l'ordre, pret a coller. Chaque rubrique facultative disparait
// entierement si vide (meme principe que partout ailleurs).
// ============================================================

function genererBlocsTexteCV(objetCV) {
  var lignes = [];
  function titre(texte) { lignes.push(''); lignes.push(texte.toUpperCase()); lignes.push('-'.repeat(texte.length)); }
  function ligne(texte) { lignes.push(texte); }
  function puce(texte) { lignes.push('• ' + texte); }

  var identite = objetCV.identite || {};
  var permis = objetCV.permis || {};

  ligne((identite.prenom || '') + ' ' + (identite.nom || ''));
  if (objetCV.objectifProfessionnel) { ligne(objetCV.objectifProfessionnel); }

  var coordonnees = [identite.telephone, identite.email, [identite.adresse, identite.ville].filter(Boolean).join(' ')].filter(Boolean);
  if (permis.possede) { coordonnees.push('Permis ' + _dnTexteJoint(permis.categories) + (permis.vehicule ? ' — véhicule personnel' : '')); }
  if (coordonnees.length) { ligne(coordonnees.join(' · ')); }

  var texteProfil = _dnTexteProfil(objetCV);
  if (texteProfil) { titre('Profil'); ligne(texteProfil); }

  var savoirFaire = _dnListe(objetCV.competences && objetCV.competences.savoirFaire);
  var savoirEtre = _dnListe(objetCV.competences && objetCV.competences.savoirEtre);
  var savoirs = _dnListe(objetCV.competences && objetCV.competences.savoirs);
  if (savoirFaire.length || savoirEtre.length || savoirs.length) {
    titre('Compétences');
    savoirFaire.concat(savoirEtre).concat(savoirs).forEach(puce);
  }

  var experiences = _dnListe(objetCV.experiences);
  if (experiences.length) {
    titre('Expérience professionnelle');
    experiences.forEach(function (e, i) {
      if (i > 0) { lignes.push(''); }
      ligne(e.poste + (e.entreprise ? ' — ' + e.entreprise : ''));
      var meta = [e.lieu, [e.dateDebut, e.dateFin].filter(Boolean).join(' - '), e.contrat].filter(Boolean).join(' · ');
      if (meta) { ligne(meta); }
      if (e.missions) { ligne(e.missions); }
    });
  }

  var experiencesPerso = _dnListe(objetCV.experiencesPersonnelles);
  if (experiencesPerso.length) {
    titre('Expériences personnelles');
    experiencesPerso.forEach(function (e, i) {
      if (i > 0) { lignes.push(''); }
      ligne(e.intitule);
      if (e.detail) { ligne(e.detail); }
    });
  }

  var formations = _dnListe(objetCV.formations);
  if (formations.length) {
    titre('Formations');
    formations.forEach(function (f) {
      ligne(f.niveau + (f.intitule ? ' — ' + f.intitule : ''));
      var meta = [f.etablissement, f.annee].filter(Boolean).join(' · ');
      if (meta) { ligne(meta); }
    });
  }

  var langues = _dnListe(objetCV.langues);
  if (langues.length) { titre('Langues'); langues.forEach(function (l) { ligne(l.langue + ' — ' + l.niveau); }); }

  var certifications = _dnListe(objetCV.certifications);
  if (certifications.length) { titre('Certifications'); certifications.forEach(puce); }

  var loisirsTexte = _dnTexteJoint(objetCV.loisirs);
  if (loisirsTexte) { titre("Centres d'intérêt"); ligne(loisirsTexte); }

  var engagementsTexte = _dnTexteJoint(objetCV.engagements);
  if (engagementsTexte) { titre('Engagements'); ligne(engagementsTexte); }

  return lignes.join('\n');
}
