/* ============================================================
   modules/cv-editor/rendreTemplate.js
   ------------------------------------------------------------
   rendreTemplate(objetCV, templateHtml) : moteur de rendu GENERIQUE.

   Remplace les marqueurs presents dans templateHtml par les valeurs
   de objetCV (produit par normaliserDonneesCV(), voir docs/SCHEMA_CV.md).

   Ce fichier ne contient AUCUNE donnee, AUCUNE logique specifique au
   modele "Moderne" ni a aucun autre modele : il est concu pour etre
   reutilise tel quel par tous les futurs modeles (Classique, Elegant,
   Creatif...). Toute la presentation (couleurs, mise en page, choix
   d'affichage) reste dans le HTML/CSS de chaque modele, jamais ici.

   Syntaxe supportee (volontairement minimale, sans dependance externe) :

   1. Marqueur simple : {{chemin.vers.champ}}
      Recherche la valeur par chemin (notation pointee) dans l'objet en
      cours (objetCV, ou l'element courant a l'interieur d'une boucle).
      Un tableau de chaines est joint avec ", ". Une valeur absente ou
      null devient une chaine vide (jamais "undefined"/"null" affiche).

   2. Boucle : {{#each chemin.vers.tableau}} ... {{/each}}
      Repete le contenu entre les balises pour chaque element du
      tableau trouve a ce chemin. A l'interieur d'une boucle, les
      marqueurs simples sont resolus par rapport a l'element courant
      (ex. {{poste}} a l'interieur d'un {{#each experiences}}).
      Le marqueur special {{.}} designe l'element lui-meme, utile pour
      les tableaux de chaines simples (ex. {{#each loisirs}}{{.}}{{/each}}).

   3. Condition : {{#if chemin.vers.champ}} ... {{/if}}
      Affiche le contenu entre les balises uniquement si la valeur au
      chemin indique est "vraie" (voir estValeurVraie ci-dessous).
      Sinon, retire ENTIEREMENT le contenu -- aucun element vide, aucun
      cadre, aucun espace reserve ne subsiste dans le rendu. Generique :
      fonctionne avec n'importe quel champ de l'objet CV (photo.url,
      ou tout autre champ facultatif dans de futurs modeles), jamais
      limite a un cas particulier. Pas de "sinon" ({{#else}}) a ce
      stade : non demande, on reste au strict minimum generique.

   Les blocs #each et #if peuvent etre imbriques (y compris l'un dans
   l'autre) : ils sont resolus en boucle, de l'interieur vers
   l'exterieur, jusqu'a stabilisation.
   ============================================================ */

function rendreTemplate(objetCV, templateHtml) {

  function obtenirValeur(scope, chemin) {
    if (chemin === '.') { return scope; }
    var parties = chemin.split('.');
    var valeur = scope;
    for (var i = 0; i < parties.length; i++) {
      if (valeur === null || valeur === undefined) { return undefined; }
      valeur = valeur[parties[i]];
    }
    return valeur;
  }

  function formaterValeur(valeur) {
    if (valeur === null || valeur === undefined) { return ''; }
    // TACHE (correction de bug, passe de finition) : un booleen affiche tel
    // quel produisait le texte "true"/"false" (litteralement, en anglais)
    // dans le CV -- illisible pour l'utilisateur final. Affichage generique
    // "Oui"/"Non", valable pour n'importe quel champ booleen present ou
    // futur (ex. permis.possede, permis.vehicule), sans logique propre a un
    // modele en particulier.
    if (typeof valeur === 'boolean') { return valeur ? 'Oui' : 'Non'; }
    if (Array.isArray(valeur)) { return valeur.join(', '); }
    return String(valeur);
  }

  // Verite generique : une valeur absente, nulle, fausse, une chaine vide
  // ou un tableau vide sont consideres "faux". Toute autre valeur (y
  // compris une chaine non vide comme une URL de photo) est "vraie".
  function estValeurVraie(valeur) {
    if (valeur === null || valeur === undefined || valeur === false || valeur === '') { return false; }
    if (Array.isArray(valeur) && valeur.length === 0) { return false; }
    return true;
  }

  // Remplace les marqueurs simples {{...}} (pas les balises de bloc) par
  // rapport a un scope donne (objetCV en racine, ou l'element courant dans
  // une boucle).
  function substituerMarqueursSimples(texte, scope) {
    return texte.replace(/\{\{\s*([^#\/][^}]*?)\s*\}\}/g, function (correspondance, chemin) {
      var valeur = obtenirValeur(scope, chemin.trim());
      return formaterValeur(valeur);
    });
  }

  // Traite les blocs {{#if ...}}...{{/if}} et {{#each ...}}...{{/each}},
  // imbriques ou non, en resolvant a chaque passage le bloc le PLUS
  // INTERIEUR d'abord (grace au motif non-gourmand qui exclut une
  // reouverture du meme type de bloc), puis en repetant jusqu'a ce que
  // plus aucun bloc ne subsiste (utile si un #if contient un #each, ou
  // l'inverse).
  function traiterBlocs(texte, scope) {
    var precedent;
    do {
      precedent = texte;

      texte = texte.replace(
        /\{\{#if\s+([\w.]+)\s*\}\}((?:(?!\{\{#if)(?!\{\{\/if)[\s\S])*?)\{\{\/if\}\}/g,
        function (correspondance, chemin, contenu) {
          var valeur = obtenirValeur(scope, chemin.trim());
          return estValeurVraie(valeur) ? contenu : '';
        }
      );

      texte = texte.replace(
        /\{\{#each\s+([\w.]+)\s*\}\}((?:(?!\{\{#each)(?!\{\{\/each)[\s\S])*?)\{\{\/each\}\}/g,
        function (correspondance, chemin, contenu) {
          var tableau = obtenirValeur(scope, chemin.trim());
          if (!Array.isArray(tableau) || tableau.length === 0) { return ''; }
          return tableau.map(function (element) {
            // Resout d'abord les eventuels #if/#each imbriques par
            // rapport a l'element courant, puis les marqueurs simples.
            var contenuInterieur = traiterBlocs(contenu, element);
            return substituerMarqueursSimples(contenuInterieur, element);
          }).join('');
        }
      );
    } while (texte !== precedent);
    return texte;
  }

  var apresBlocs = traiterBlocs(templateHtml, objetCV);
  return substituerMarqueursSimples(apresBlocs, objetCV);
}