/* ============================================================
   decouverteMapping.js
   ------------------------------------------------------------
   Module « Découverte et valorisation des compétences ».
   Répond à : document 1 §9 (construction du profil) et §11 (documents
   générés) -- le pont mécanique entre ce module et le format `dossier`
   déjà utilisé par tout le reste d'ERIP (CV, lettre, entretien, Composeur).

   RÈGLE STRICTE (exigée explicitement) : AUCUNE décision métier n'est
   prise ici. Ni appel IA, ni heuristique, ni inférence, ni nouvelle
   règle de choix. Ce fichier ne fait que transformer des données DÉJÀ
   VALIDÉES (fragments à l'état "valide", compétences déjà retenues) vers
   le format attendu ailleurs -- une table de correspondance fixe, jamais
   un jugement.

   TRAÇABILITÉ (exigée explicitement) : ce fichier ne renvoie jamais
   seulement les données prêtes à l'emploi -- il renvoie TOUJOURS, à
   côté, un "journal de provenance" qui répond pour chaque donnée
   produite à : quel champ du dossier, quelle valeur, quelle origine
   (personneDirecte / iaEnrichissement / regleMetier / calcul), et quel
   fragment/quelle compétence l'a produite. Ce journal reste séparé des
   données elles-mêmes -- jamais mélangé dedans -- car `dossier.competences.
   savoirFaire` par exemple doit rester un tableau de simples chaînes de
   caractères, exactement comme l'attendent déjà les autres modules
   d'ERIP (aucune tolérance pour un objet enrichi à la place d'une chaîne).

   CE FICHIER EST LE CONTRAT OFFICIEL : toute évolution future du module
   (nouvelles catégories, nouvelles origines, nouveau format de sortie)
   passe par ici, jamais par une modification des autres fichiers d'ERIP.
   ============================================================ */

// Table fixe : origine d'un fragment (doc2 §3, axe 1) -> destination
// mécanique dans dossier. Une simple correspondance structurelle, jamais
// un jugement de valeur sur le fragment -- même esprit que la table
// catégorie -> champ du profil métiers déjà utilisée dans
// decouverteStrategie.js (mais une destination différente, le format
// cible n'est pas le même : ici le dossier complet, pas seulement le
// profil de recherche de métiers).
var _DECOUVERTE_DESTINATION_PAR_ORIGINE = {
  proDeclaree: 'experiences',
  proNonDeclaree: 'experiences',
  personnelleFamiliale: 'loisirs',
  benevoleAssociative: 'engagements',
  autre: 'loisirs'
};

// Table fixe : catégorie de compétence (doc1 §7.2) -> champ de
// dossier.competences (ou dossier.loisirs pour un centre d'intérêt,
// cohérent avec son rôle décrit au document 1 -- utile pour la
// motivation en entretien, pas un savoir-faire/savoir-être à proprement
// parler).
// TACHE (retour utilisateur : bug réel constaté sur un CV généré --
// "Goût pour le service aux personnes" et "Apprendre des nouvelles
// choses" affichés à tort sous "Centres d'intérêt") : garde-fou côté
// code, jamais une confiance aveugle dans le prompt (decouverte-
// competences.md a déjà été renforcé sur ce point, mais un garde-fou
// mécanique reste nécessaire, comme partout ailleurs dans ce module).
// Détecte les formulations qui décrivent une DISPOSITION/qualité (jamais
// le nom d'une activité) -- "Goût pour...", "Envie de...", "Capacité
// à...", etc. -- quelle que soit la categorie assignée par l'IA.
function _decouverteRessembleADisposition(texte) {
  var t = (texte || '').trim();
  var motifs = [/^go[uû]t pour/i, /^envie d[e']/i, /^capacit[ée] [aà]/i, /^aisance (avec|dans)/i,
    /^sens (du|de|des|de la|de l')/i, /^apprendre /i, /^aptitude [aà]/i, /^plaisir (a|à|de)/i];
  return motifs.some(function (regex) { return regex.test(t); });
}

function _decouverteChampDossierPourCategorie(categorie) {
  if (categorie === DECOUVERTE_CATEGORIES.TECHNIQUE || categorie === DECOUVERTE_CATEGORIES.TRANSFERABLE) { return 'savoirFaire'; }
  if (categorie === DECOUVERTE_CATEGORIES.SAVOIR_ETRE || categorie === DECOUVERTE_CATEGORIES.APTITUDE) { return 'savoirEtre'; }
  if (categorie === DECOUVERTE_CATEGORIES.CENTRE_INTERET) { return 'loisirs'; }
  return 'savoirFaire'; // repli défensif -- ne devrait jamais survenir, la catégorie est déjà validée en amont (decouverteAnalyse.js)
}

// Rassemble, dédoublonnée, toute la preuve d'un fragment (une preuve peut
// être répartie sur plusieurs compétences validées pour le même
// fragment) -- pur calcul mécanique, aucune reformulation.
// TACHE (retour utilisateur : "j'ai fait ... maçonnerie ; j'ai fait ...
// carrelage ; j'ai fait électricité, maçonnerie, carrelage, plomberie" --
// texte de missions répétitif) : bug réel trouvé -- sur un récit court
// (une simple liste de métiers, sans détail), la preuve de plusieurs
// compétences distinctes reformule souvent la MÊME phrase source de
// façons légèrement différentes. Le dédoublonnage strict (chaînes
// EXACTEMENT identiques) ne détectait jamais ces quasi-doublons.
//
// Un premier essai avec correspond() (metiers.js) s'est révélé
// insuffisant : cette fonction ne retire pas la ponctuation (virgules,
// points de suspension), ce qui casse la comparaison mot à mot dès qu'une
// preuve contient une liste avec virgules. Détection dédiée ci-dessous :
// ponctuation retirée intégralement, comparaison par RATIO de mots
// significatifs communs (pas une stricte inclusion), pour rester robuste
// sur des phrases courtes et proches sans être trop strict.
function _decouverteMotsSignificatifs(texte) {
  return String(texte).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(function (m) { return m.length >= 4; });
}

function _decouvertePreuvesProches(a, b) {
  var motsA = _decouverteMotsSignificatifs(a);
  var motsB = _decouverteMotsSignificatifs(b);
  if (!motsA.length || !motsB.length) { return false; }
  var commun = motsA.filter(function (m) { return motsB.indexOf(m) !== -1; });
  var court = motsA.length <= motsB.length ? motsA : motsB;
  return (commun.length / court.length) >= 0.6;
}

function _decouverteToutesLesPreuves(competencesValidees) {
  var toutes = [];
  (competencesValidees || []).forEach(function (c) {
    (c.preuve || []).forEach(function (p) {
      var estProche = toutes.some(function (dejaRetenue) { return _decouvertePreuvesProches(p, dejaRetenue); });
      if (!estProche) { toutes.push(p); }
    });
  });
  return toutes;
}

// Concatène la preuve en une phrase unique -- format attendu par
// dossier.experiences[].missions (une CHAÎNE, jamais un tableau, comme
// partout ailleurs dans ERIP). Simple ponctuation, aucune reformulation.
// TACHE (retour utilisateur : "le texte est sur la même ligne en continu,
// c'est normal ?") : point-virgule plutôt que point final entre chaque
// fait -- un point donne l'impression que la phrase se termine puis
// repart, ce qui se lit comme cassé une fois plusieurs faits concaténés
// (surtout depuis que jusqu'à 4 compétences, chacune avec sa preuve,
// peuvent maintenant contribuer aux missions d'une même expérience).
function _decouverteConcatenerPreuve(preuve) {
  if (!preuve || !preuve.length) { return ''; }
  return preuve.map(function (p) { return p.replace(/[;.\s]+$/, ''); }).join(' ; ') + '.';
}

// Point d'entrée principal : transforme une liste de fragments à l'état
// "valide" (decouverteRaffinement.js) en deux sorties séparées :
// - misesAJour : les données, dans le format EXACT attendu par dossier,
//   prêtes à être fusionnées (voir appliquerMisesAJourDossier ci-dessous) ;
// - journalProvenance : la traçabilité complète, jamais mélangée aux
//   données elles-mêmes.
//
// infosComplementairesParFragment (optionnel) = { [fragmentId]: { entreprise,
// lieu, dateDebut, dateFin } } -- des informations DÉJÀ structurées,
// obtenues directement de la personne ailleurs dans le parcours (ex. une
// question ciblée avec un champ de date) : ce fichier ne les déduit
// JAMAIS lui-même, il se contente de les recopier si elles existent.
function mapperFragmentsVersDossier(fragmentsValides, infosComplementairesParFragment) {
  infosComplementairesParFragment = infosComplementairesParFragment || {};

  var misesAJour = {
    experiences: [],
    loisirs: [],
    engagements: [],
    competences: { savoirFaire: [], savoirEtre: [] },
    // TACHE (retour utilisateur : loisirs factuels vs compétences
    // personnelles) : reçoit la reformulation professionnelle des
    // fragments loisirs (etatFragment.texteRetenu), jamais le texte du
    // loisir lui-même (celui-là va dans misesAJour.loisirs, sous sa
    // forme factuelle). Fusionné plus tard, côté génération, avec les
    // compétences personnelles proposées par l'IA classique (cv.md) --
    // deux sources, un seul bloc à l'affichage.
    competencesPersonnelles: []
  };
  var journalProvenance = [];

  function tracer(champDossier, valeur, origine, fragmentId, competenceId) {
    journalProvenance.push({
      champDossier: champDossier,
      valeur: valeur,
      origine: origine, // 'personneDirecte' | 'iaEnrichissement' | 'regleMetier' | 'calcul'
      moduleProducteur: 'decouverte-competences',
      fragmentId: fragmentId || null,
      competenceId: competenceId || null
    });
  }

  (fragmentsValides || []).forEach(function (etatFragment) {
    // Garde-fou : ce fichier ne traite JAMAIS un fragment qui n'est pas
    // explicitement à l'état "valide" -- il ne devine rien, il ne
    // suppose rien, il fait confiance uniquement à ce que
    // decouverteRaffinement.js a déjà validé.
    if (!etatFragment || etatFragment.etat !== DECOUVERTE_ETATS_FRAGMENT.VALIDE) { return; }

    var destination = _DECOUVERTE_DESTINATION_PAR_ORIGINE[etatFragment.origine] || 'loisirs';
    tracer('(règle de destination)', destination, 'regleMetier', etatFragment.fragmentId);

    var infosCompl = infosComplementairesParFragment[etatFragment.fragmentId] || {};
    var origineTexte = etatFragment.texteOriginalConserve ? 'personneDirecte' : 'iaEnrichissement';

    if (destination === 'experiences') {
      var missions = _decouverteConcatenerPreuve(_decouverteToutesLesPreuves(etatFragment.competencesValidees));
      var experience = {
        poste: etatFragment.texteRetenu,
        entreprise: infosCompl.entreprise || '',
        lieu: infosCompl.lieu || '',
        dateDebut: infosCompl.dateDebut || '',
        dateFin: infosCompl.dateFin || '',
        missions: missions,
        // TACHE (étape 5, contrat modele-relation-competence-experience.md
        // §1) : "l'expérience produit des preuves de compétences" -- une
        // simple liste de textes en V1 (transitoire, assumé -- la cible
        // reste une référence stable, voir le contrat). Jamais lu
        // directement ailleurs : experiencesQuiDemontrent() (app.js) est
        // le seul point d'accès prévu à cette relation.
        competencesDemontrees: (etatFragment.competencesValidees || []).map(function (c) { return c.texte; })
      };
      misesAJour.experiences.push(experience);
      tracer('experiences[].poste', experience.poste, origineTexte, etatFragment.fragmentId);
      tracer('experiences[].missions', experience.missions, 'calcul', etatFragment.fragmentId);
      if (infosCompl.entreprise || infosCompl.lieu || infosCompl.dateDebut || infosCompl.dateFin) {
        tracer('experiences[].(entreprise/lieu/dates)', infosCompl, 'personneDirecte', etatFragment.fragmentId);
      }
    } else if (destination === 'loisirs') {
      // TACHE (retour utilisateur : "je veux que les loisirs soient
      // cités tel que dans un cv classique... les compétences
      // personnelles ne remplacent pas les loisirs, c'est un plus") :
      // le loisir affiché reste factuel (elementsFactuels) -- jamais la
      // reformulation professionnelle. Repli sur texteRetenu si
      // elementsFactuels est vide (réponses IA antérieures à ce champ,
      // ou fragment sans reformulation utile), pour ne jamais perdre le
      // loisir entièrement.
      var texteLoisir = etatFragment.elementsFactuels.length
        ? etatFragment.elementsFactuels.join(', ')
        : etatFragment.texteRetenu;
      misesAJour.loisirs.push(texteLoisir);
      tracer('loisirs[]', texteLoisir, origineTexte, etatFragment.fragmentId);
      // La reformulation professionnelle (texteRetenu) ne disparaît pas
      // pour autant -- elle devient une compétence personnelle candidate,
      // avec le loisir factuel comme source tracée.
      if (etatFragment.texteRetenu && etatFragment.texteRetenu !== texteLoisir) {
        misesAJour.competencesPersonnelles.push({ competence: etatFragment.texteRetenu, source: texteLoisir });
        tracer('competencesPersonnelles[]', etatFragment.texteRetenu, 'iaEnrichissement', etatFragment.fragmentId);
      }
    } else {
      // TACHE (retour utilisateur : "je veux bien que les expériences
      // personnelles [engagements] aient des missions au même titre que
      // l'expérience professionnelle, tirées de ce que la personne a
      // dit, sous le même format et avec les mêmes règles") : missions
      // construites EXACTEMENT comme pour les expériences pro
      // (_decouverteConcatenerPreuve(_decouverteToutesLesPreuves(...)),
      // même fonction, jamais un second mécanisme dupliqué) -- vide si
      // aucune compétence validée n'a de preuve exploitable, jamais un
      // champ manquant qui ferait planter le rendu.
      var missionsEngagement = _decouverteConcatenerPreuve(_decouverteToutesLesPreuves(etatFragment.competencesValidees));
      var engagement = {
        texte: etatFragment.texteRetenu,
        dateDebut: infosCompl.dateDebut || '',
        dateFin: infosCompl.dateFin || '',
        missions: missionsEngagement
      };
      misesAJour[destination].push(engagement);
      tracer(destination + '[]', engagement, origineTexte, etatFragment.fragmentId);
    }

    (etatFragment.competencesValidees || []).forEach(function (competence) {
      var champ = _decouverteChampDossierPourCategorie(competence.categorie);
      // TACHE (retour utilisateur : bug réel -- "Goût pour le service
      // aux personnes"/"Apprendre des nouvelles choses" affichés à tort
      // sous Centres d'intérêt) : reroute vers savoirEtre si le texte
      // ressemble à une disposition/qualité, quelle que soit la
      // categorie assignée par l'IA -- jamais un nom d'activité.
      if (champ === 'loisirs' && _decouverteRessembleADisposition(competence.texte)) { champ = 'savoirEtre'; }
      tracer('(règle de catégorie -> champ)', champ, 'regleMetier', etatFragment.fragmentId, competence.id);

      var cible = (champ === 'loisirs') ? misesAJour.loisirs : misesAJour.competences[champ];
      if (cible.indexOf(competence.texte) === -1) { cible.push(competence.texte); }

      var origineCompetence = competence.texteOriginalConserve ? 'personneDirecte' : 'iaEnrichissement';
      tracer((champ === 'loisirs' ? 'loisirs[]' : 'competences.' + champ + '[]'), competence.texte, origineCompetence,
        etatFragment.fragmentId, competence.id);
    });
  });

  return { misesAJour: misesAJour, journalProvenance: journalProvenance };
}

// Applique les misesAJour à un dossier réel -- TOUJOURS de façon
// additive (jamais un écrasement), même principe que le CV existant
// jamais modifié par ce module (doc1 §4, étape 0, précision de la
// relecture finale) : on ajoute ce qui est nouveau, on ne remplace rien.
// Dédoublonnage simple (chaîne strictement identique) -- aucune
// heuristique de similarité ici, exactement comme demandé.
// TACHE (retour utilisateur : doublons de loisirs -- "Sport" en plus de
// "sport, randonnée, natation, sports collectifs") : retire une entrée
// courte quand son contenu (normalisé, insensible à la casse/accents) est
// déjà entièrement présent comme sous-chaîne d'une entrée plus longue de
// la même liste -- garde toujours la version la plus complète, jamais
// l'inverse. Ne touche jamais deux entrées de longueur comparable qui ne
// se recoupent pas (ex. "Lecture" et "Cinéma" restent toutes les deux).
function _decouverteDedupliquerSousEnsembles(liste) {
  var normalise = function (t) {
    return (typeof normaliserTexte === 'function' ? normaliserTexte(t) : t.toLowerCase()).trim();
  };
  return liste.filter(function (item, i) {
    var itemNorm = normalise(item);
    return !liste.some(function (autre, j) {
      if (i === j) { return false; }
      var autreNorm = normalise(autre);
      var autrePlusLong = autreNorm.length > itemNorm.length || (autreNorm.length === itemNorm.length && j < i);
      return autrePlusLong && autreNorm.indexOf(itemNorm) !== -1;
    });
  });
}

function appliquerMisesAJourDossier(dossierCible, misesAJour) {
  dossierCible.experiences = (dossierCible.experiences || []).concat(misesAJour.experiences);

  ['loisirs', 'engagements'].forEach(function (champ) {
    var existants = dossierCible[champ] || [];
    // TACHE (chantier "exp perso", Phase 4) : engagements contient
    // désormais des objets {texte, dateDebut, dateFin} -- une comparaison
    // par égalité stricte (indexOf) ne peut plus détecter un doublon
    // entre deux objets distincts portant le même texte (chaque objet a
    // sa propre référence). Comparaison par .texte pour engagements,
    // inchangée (indexOf direct sur la chaîne) pour loisirs.
    var nouveaux = misesAJour[champ].filter(function (v) {
      if (champ === 'engagements') {
        return !existants.some(function (e) { return e && e.texte === v.texte; });
      }
      return existants.indexOf(v) === -1;
    });
    var fusionne = existants.concat(nouveaux);
    // TACHE (retour utilisateur : "Sport", "Randonnée", "Sports
    // collectifs" apparaissaient en double, déjà couverts par "sport,
    // randonnée, natation, sports collectifs" -- bug réel confirmé par
    // export JSON) : filet de sécurité, en plus de la consigne de prompt
    // déjà corrigée (jamais à la place) -- si l'IA crée malgré tout un
    // fragment redondant pour une activité déjà couverte par un fragment
    // plus large, cette entrée courte disparaît ici plutôt que de
    // s'afficher en double sur le CV.
    dossierCible[champ] = (champ === 'loisirs') ? _decouverteDedupliquerSousEnsembles(fusionne) : fusionne;
  });

  dossierCible.competences = dossierCible.competences || { savoirFaire: [], savoirEtre: [], savoirs: [] };
  ['savoirFaire', 'savoirEtre'].forEach(function (champ) {
    var existants = dossierCible.competences[champ] || [];
    var nouveaux = misesAJour.competences[champ].filter(function (v) { return existants.indexOf(v) === -1; });
    dossierCible.competences[champ] = existants.concat(nouveaux);
  });

  // TACHE (retour utilisateur : loisirs factuels vs compétences
  // personnelles) : champ persistant distinct de dossier.ia.cv.
  // recommandations.competencesPersonnelles (celui-là vient de l'IA
  // classique, cv.md, et reste conditionné au déclencheur -- voir
  // appliquerMoteurDecisionCV) -- fusionné avec lui au moment de la
  // génération, jamais ici.
  dossierCible.competencesPersonnellesDecouverte = (dossierCible.competencesPersonnellesDecouverte || [])
    .concat(misesAJour.competencesPersonnelles);

  return dossierCible;
}
