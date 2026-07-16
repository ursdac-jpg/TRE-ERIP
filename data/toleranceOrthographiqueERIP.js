/* ============================================================
   data/toleranceOrthographiqueERIP.js
   ------------------------------------------------------------
   Raffinement du moteur de recherche : tolerance raisonnable aux
   fautes de frappe/orthographe, evoquee dans la vision initiale du
   moteur de pertinence ERIP ("une tolerance raisonnable aux fautes
   d'orthographe").

   Principe : distance de Levenshtein (nombre minimal de caracteres a
   ajouter/retirer/remplacer pour passer d'un mot a l'autre), avec un
   seuil de tolerance qui depend de la longueur du mot -- pour eviter
   qu'un mot court (3 lettres ou moins) ne devienne mechant a force
   d'etre trop permissif ("bar" ne doit pas se confondre avec "car").

   Seuils retenus :
   - mots de 3 lettres ou moins : aucune tolerance (correspondance exacte
     uniquement -- trop court pour distinguer une faute d'une confusion
     avec un autre mot different) ;
   - mots de 4 a 6 lettres : 1 caractere de tolerance ;
   - mots de 7 lettres ou plus : 2 caracteres de tolerance.

   Fonction pure, reutilisable partout ou une comparaison de mots est
   necessaire. Ne modifie rien d'existant : extraireConceptsDeRecherche()
   (Etape B) est mise a jour separement pour s'en servir a la place d'une
   comparaison stricte.
   ============================================================ */

// Distance de Levenshtein classique (programmation dynamique).
function distanceLevenshteinERIP(a, b) {
  a = String(a || '');
  b = String(b || '');
  var m = a.length;
  var n = b.length;
  if (m === 0) { return n; }
  if (n === 0) { return m; }

  var precedente = [];
  var courante = [];
  for (var j = 0; j <= n; j++) { precedente.push(j); }

  for (var i = 1; i <= m; i++) {
    courante[0] = i;
    for (j = 1; j <= n; j++) {
      var cout = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      courante[j] = Math.min(
        precedente[j] + 1,      // suppression
        courante[j - 1] + 1,    // insertion
        precedente[j - 1] + cout // substitution
      );
    }
    precedente = courante.slice();
  }
  return precedente[n];
}

// Seuil de tolerance en fonction de la longueur d'un mot.
function seuilToleranceOrthographeERIP(longueur) {
  if (longueur <= 3) { return 0; }
  if (longueur <= 6) { return 1; }
  return 2;
}

// Deux mots sont consideres "proches" s'ils sont identiques, ou si leur
// distance de Levenshtein reste dans le seuil de tolerance (le plus petit
// des deux seuils est retenu, par prudence).
function motsProchesERIP(a, b) {
  if (a === b) { return true; }
  var seuil = Math.min(seuilToleranceOrthographeERIP(a.length), seuilToleranceOrthographeERIP(b.length));
  if (seuil === 0) { return false; }
  if (Math.abs(a.length - b.length) > seuil) { return false; } // evite un calcul inutile
  return distanceLevenshteinERIP(a, b) <= seuil;
}

// Un mot est-il present, exactement ou approximativement, dans une liste
// de mots ?
function motDansListeApprocheERIP(mot, liste) {
  return liste.some(function (autre) { return motsProchesERIP(mot, autre); });
}

/* ============================================================
   TACHE (retour utilisateur, chantier langue francaise) : a partir de
   cet instant, tout le texte VISIBLE par la personne dans l'application
   (labels, categories, descriptions, boutons, messages...) doit etre
   ecrit en francais correct, avec tous les accents. Cette regle ne
   s'applique jamais aux identifiants techniques (id, cles internes),
   aux commentaires de code, ni aux quelques listes deliberement sans
   accent par construction (ex. DICTIONNAIRE_LEXICAL_ERIP,
   MOTS_VIDES_RECHERCHE_ERIP) : elles comparent du texte deja normalise,
   les accentuer casserait leur fonctionnement.
   ------------------------------------------------------------
   Consequence directe de cette regle : plusieurs libelles identiques
   existent en parallele dans deux familles de fichiers -- les catalogues
   de donnees (ex. savoirFaire/savoirEtre des fichiers data/*.js,
   desormais accentues) et d'anciens dictionnaires de correspondance
   EXACTE plus figes (ex. categorieCompetence, js/app.js, ou
   REFERENTIEL_METIERS_ERIP compare par nom), pas encore tous mis a jour
   en meme temps. Plutot que d'exiger une synchronisation parfaite et
   permanente de l'orthographe exacte entre des dizaines de fichiers (un
   seul oubli suffit a casser une correspondance, silencieusement), les
   deux fonctions ci-dessous rendent ces correspondances tolerantes aux
   differences d'accentuation, une fois pour toutes.
   ============================================================ */

// Deux mots (ou libelles) sont-ils identiques, une fois les accents
// retires ? Distinct de motsProchesERIP() ci-dessus (tolerance aux
// fautes de frappe, qui varie selon la longueur du mot) : un accent en
// plus ou en moins n'est pas une faute a proprement parler, c'est un
// choix de saisie -- ce cas merite une regle systematique a part.
// Reutilise normaliserTexte() (deja chargee avant ce fichier, voir
// data/metiers.js), qui retire deja accents/casse/tirets -- aucune
// logique dupliquee ici.
function motsEquivalentsSansAccentERIP(a, b) {
  return normaliserTexte(a) === normaliserTexte(b);
}

// Recherche la valeur associee a une cle dans un dictionnaire simple
// { cle: valeur }, en tolerant les differences d'accentuation entre la
// cle cherchee et les cles du dictionnaire. Essaie d'abord une
// correspondance exacte (cas le plus frequent, le plus rapide), puis se
// rabat sur une comparaison sans accent si besoin. Utile pour tout
// dictionnaire fige (ex. categorieCompetence, js/app.js) confronte a des
// libelles progressivement accentues dans les catalogues de donnees.
function chercherDansDictionnaireSansAccentERIP(dictionnaire, cle) {
  if (Object.prototype.hasOwnProperty.call(dictionnaire, cle)) { return dictionnaire[cle]; }
  var cles = Object.keys(dictionnaire);
  for (var i = 0; i < cles.length; i++) {
    if (motsEquivalentsSansAccentERIP(cles[i], cle)) { return dictionnaire[cles[i]]; }
  }
  return undefined;
}
