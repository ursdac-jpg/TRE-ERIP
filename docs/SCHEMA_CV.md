# SCHEMA_CV.md — Objet CV standardisé (ERIP)

Ce document décrit la structure renvoyée par `normaliserDonneesCV(dossier)`
(`modules/cv-core/normaliserDonneesCV.js`). Cette structure est le **contrat**
partagé par tous les modules liés au CV : éditeur, templates, export PDF,
export DOCX, futurs formats. Toute évolution de cette structure doit être
répercutée dans ce document.

`dossier` (état global de l'application, `js/app.js`) reste l'unique source
de vérité. `normaliserDonneesCV()` ne fait que le lire (via
`extraireDonneesCV()`) pour en dériver cette structure : elle ne modifie
jamais `dossier`.

**Important** : cette structure ne contient aucune logique de présentation
(pas de mise en majuscules, pas de troncature, pas de texte concaténé pour
l'affichage...). La mise en forme est entièrement du ressort des futurs
templates HTML/CSS.

---

## `meta`

Informations techniques sur l'objet CV lui-même (pas sur le candidat).

| Propriété | Type | Rôle |
|---|---|---|
| `version` | `number` | Version du schéma. Permet de gérer une migration si la structure évolue un jour. |
| `dateGeneration` | `string` (ISO 8601) | Date/heure de génération de cet objet CV. |
| `modele` | `string \| null` | Identifiant du modèle graphique choisi (ex. `"moderne"`), une fois l'éditeur de CV créé. `null` tant qu'aucun modèle n'est choisi. |

```json
"meta": { "version": 1, "dateGeneration": "2026-07-07T18:49:56.078Z", "modele": null }
```

---

## `identite`

Coordonnées du candidat, telles que saisies dans "Mon projet" / page Action
(`dossier.identite`).

| Propriété | Type | Rôle |
|---|---|---|
| `civilite` | `"Madame" \| "Monsieur" \| null` | Civilité, jamais devinée. |
| `nom` | `string` | Nom de famille. |
| `prenom` | `string` | Prénom. |
| `telephone` | `string` | Numéro de téléphone. |
| `email` | `string` | Adresse e-mail. |
| `adresse` | `string` | Adresse postale. |
| `ville` | `string` | Ville. |
| `age` | `string` | Âge (chaîne, telle que saisie dans le formulaire). |

```json
"identite": { "civilite": "Madame", "nom": "Dupont", "prenom": "Julie", "telephone": "0600000000", "email": "julie@test.fr", "adresse": "1 rue Test", "ville": "Bordeaux", "age": "32" }
```

---

## `photo`

Emplacement réservé pour une future photo de CV. **Aucune logique d'upload
ni d'affichage conditionnel à ce stade** — ce sera une tâche indépendante,
ultérieure. `dossier` ne contient aujourd'hui aucune donnée photo.

| Propriété | Type | Rôle |
|---|---|---|
| `url` | `string \| null` | URL ou donnée de la photo. `null` tant qu'aucune photo n'est fournie. |

Affichage conditionnel géré par le moteur de rendu générique (bloc
`{{#if photo.url}}...{{/if}}`, voir `modules/cv-editor/rendreTemplate.js`) :
si `url` est vide ou `null`, aucun élément ni espace n'est présent dans le
rendu — pas de logique spécifique à la photo ni à un modèle en particulier.

```json
"photo": { "url": null }
```

---

## `objectifProfessionnel`

| Type | Rôle |
|---|---|
| `string` | Métier ou secteur d'activité cible (`dossier.metierCible` ou `dossier.secteurCible`), pour orienter le titre du CV. Chaîne vide si aucun choix n'a encore été fait. |

```json
"objectifProfessionnel": "Assistant administratif"
```

---

## `profil`

Accroche professionnelle (paragraphe d'introduction du CV). Deux champs
distincts, pour ne jamais perdre l'un au profit de l'autre.

| Propriété | Type | Rôle |
|---|---|---|
| `profilIA` | `string` | Accroche proposée par l'IA, lue depuis `dossier.ia.cv.profil` (voir `docs/ARCHITECTURE_V2_IA.md`). Vide si `dossier.ia` est absent ou non renseigné (lecture toujours défensive). Ne provient volontairement pas de `dossier.texteAmelioreCanva`, qui contient un CV entier retapé par l'IA (pas une simple accroche) — le réutiliser créerait une confusion sémantique durable. |
| `profilUtilisateur` | `string` | Accroche modifiée ou écrite librement par la personne, si elle personnalise la proposition de l'IA. |

**Règle d'affichage prévue** (à appliquer côté template, pas ici) :
`profilUtilisateur` si rempli, sinon `profilIA`, sinon rien.

```json
"profil": { "profilIA": "", "profilUtilisateur": "" }
```

---

## `pointsForts` / `motsCles`

Contenus courts proposés par l'IA, lus depuis `dossier.ia.cv.pointsForts` /
`dossier.ia.cv.motsCles` (voir `docs/ARCHITECTURE_V2_IA.md`). Toujours des
tableaux (vides si non renseignés).

| Propriété | Type | Rôle |
|---|---|---|
| `pointsForts` | `string[]` | Phrases courtes mettant en avant des points forts du profil, proposées par l'IA. |
| `motsCles` | `string[]` | Mots-clés identifiés par l'IA comme pertinents pour le métier/secteur visé. |

**Non affiché par les 6 modèles existants pour l'instant** — ces champs sont
exposés dans l'objet CV standardisé (lien `dossier.ia` → objet CV
opérationnel de bout en bout), mais leur intégration visuelle dans les
templates est une tâche distincte, non encore réalisée.

```json
"pointsForts": [], "motsCles": []
```

---

## `competences`

Compétences déduites automatiquement du parcours (`deduireCompetences()`,
`obtenirSavoirs()`, déjà existantes dans `js/app.js`).

| Propriété | Type | Rôle |
|---|---|---|
| `savoirFaire` | `string[]` | Savoir-faire (compétences techniques). |
| `savoirEtre` | `string[]` | Savoir-être (qualités comportementales). |
| `savoirs` | `string[]` | Savoirs / connaissances théoriques. |

```json
"competences": { "savoirFaire": ["Bureautique"], "savoirEtre": ["Relation client", "Rigueur"], "savoirs": ["Bases de comptabilite"] }
```

---

## `experiences`

Expériences professionnelles classiques (`dossier.experiences`).

| Propriété | Type | Rôle |
|---|---|---|
| `poste` | `string` | Intitulé du poste occupé. |
| `entreprise` | `string` | Nom de l'entreprise (ou proche, dans le cas d'une expérience d'entraide). |
| `lieu` | `string` | Lieu d'exercice. |
| `dateDebut` | `string` | Date de début (format `AAAA-MM`). |
| `dateFin` | `string` | Date de fin. Chaîne vide si le poste est toujours en cours. |
| `missions` | `string` | Description des missions/tâches principales (facultatif). |

```json
"experiences": [ { "poste": "Assistante", "entreprise": "ACME", "lieu": "Bordeaux", "dateDebut": "2020-01", "dateFin": "2022-06", "missions": "Accueil" } ]
```

---

## `experiencesPersonnelles`

Expériences personnelles valorisables (bénévolat, entraide familiale,
gestion du foyer...) — `dossier.experiencesPerso`.

| Propriété | Type | Rôle |
|---|---|---|
| `intitule` | `string` | Intitulé de l'expérience. |
| `detail` | `string` | Détail complémentaire (facultatif). |

```json
"experiencesPersonnelles": [ { "intitule": "Gestion d'un foyer", "detail": "Budget familial" } ]
```

---

## `formations`

Diplômes/formations, **sous forme de tableau** — même si `dossier` ne
stocke aujourd'hui qu'un seul niveau de diplôme (`dossier.niveauFormation`).
Le tableau contient alors 0 ou 1 élément. Cette forme en tableau permet
d'accueillir plusieurs formations à l'avenir sans casser la structure.

| Propriété | Type | Rôle |
|---|---|---|
| `niveau` | `string` | Niveau du diplôme (ex. `"Bac +2"`). |
| `intitule` | `string` | Intitulé précis (ex. `"BTS Gestion"`). |
| `annee` | `string` | Année d'obtention. |

```json
"formations": [ { "niveau": "Bac +2", "intitule": "BTS Gestion", "annee": "2019" } ]
```

---

## `certifications`

| Type | Rôle |
|---|---|
| `string[]` | Certifications obtenues (ex. `"PIX"`, `"SST"`, `"CACES R489"`). |

```json
"certifications": ["PIX"]
```

---

## `langues`

| Propriété | Type | Rôle |
|---|---|---|
| `langue` | `string` | Nom de la langue. |
| `niveau` | `string` | Niveau CECRL (`A1` à `C2`). |

```json
"langues": [ { "langue": "Anglais", "niveau": "B2" } ]
```

---

## `permis`

| Propriété | Type | Rôle |
|---|---|---|
| `possede` | `boolean \| null` | Permis obtenu ou non. `null` si non renseigné. |
| `categories` | `string[]` | Catégories de permis obtenues (ex. `["B"]`). |
| `vehicule` | `boolean \| null` | Dispose ou non d'un véhicule personnel. `null` si non renseigné. |

```json
"permis": { "possede": true, "categories": ["B"], "vehicule": true }
```

---

## `loisirs`

| Type | Rôle |
|---|---|
| `string[]` | Loisirs renseignés par la personne. |

```json
"loisirs": ["Lecture"]
```

---

## `engagements`

| Type | Rôle |
|---|---|
| `string[]` | Engagements associatifs/citoyens renseignés par la personne. |

```json
"engagements": []
```

---

## Fonctions liées

- **`extraireDonneesCV(dossier)`** (`modules/cv-core/extraireDonneesCV.js`) :
  lecture brute et partagée de `dossier`, sans mise en forme. Utilisée à la
  fois par `normaliserDonneesCV()` et par `genererCSVCanva()` (`js/app.js`),
  qui reste responsable de sa propre mise en forme texte (jointures,
  formatage CSV) — cette mise en forme n'est **pas** dans le schéma ci-dessus,
  qui décrit uniquement l'objet CV standardisé.
- **`normaliserDonneesCV(dossier)`** (`modules/cv-core/normaliserDonneesCV.js`) :
  produit l'objet CV décrit dans ce document.
