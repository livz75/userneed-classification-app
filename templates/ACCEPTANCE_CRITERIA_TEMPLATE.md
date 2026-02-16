# Template Critères d'Acceptation

## Guide d'utilisation

Les critères d'acceptation définissent les conditions qui doivent être satisfaites pour qu'une fonctionnalité soit considérée comme complète. Ils servent de contrat entre le Product Owner et l'équipe de développement.

**Principes clés** :
- ✅ **Testables** : Chaque critère doit pouvoir être validé objectivement (pas d'ambiguïté)
- ✅ **Spécifiques** : Décrire précisément le comportement attendu
- ✅ **Mesurables** : Utiliser des métriques quantifiables quand possible
- ✅ **Complets** : Couvrir les cas nominaux, d'erreur et limites
- ✅ **Compréhensibles** : Lisibles par tous (dev, QA, PO, stakeholders)

---

## Format Gherkin (Recommandé)

Le format **Gherkin** (Given-When-Then) est le standard de l'industrie pour écrire des critères d'acceptation testables. Il est utilisé notamment avec Cucumber, Behave, et autres outils de BDD (Behavior Driven Development).

### Structure de base

```gherkin
ÉTANT DONNÉ [contexte initial / préconditions]
QUAND [action ou événement déclencheur]
ALORS [résultat attendu observable]
ET [résultat complémentaire]
MAIS [exception ou limite]
```

### Traduction anglaise (pour outils BDD)

```gherkin
GIVEN [initial context / preconditions]
WHEN [action or trigger event]
THEN [expected observable result]
AND [additional result]
BUT [exception or limitation]
```

---

## Template 1 : Cas Nominal (Happy Path)

### Scénario : [Nom du scénario - décrit le cas d'usage principal]

```gherkin
ÉTANT DONNÉ [état initial du système]
  ET [précondition supplémentaire si nécessaire]
  ET [données disponibles]
QUAND [l'utilisateur effectue l'action principale]
  ET [action complémentaire si applicable]
ALORS [premier résultat visible/mesurable]
  ET [deuxième résultat attendu]
  ET [troisième résultat si nécessaire]
```

**Exemple concret** :

```gherkin
ÉTANT DONNÉ que je suis sur la page d'accueil de l'application
  ET que j'ai configuré ma clé API OpenRouter valide
  ET que j'ai copié le contenu d'un article de 500 mots
QUAND je colle le texte dans la zone de saisie
  ET que je clique sur le bouton "Analyser"
ALORS un indicateur de chargement s'affiche pendant maximum 5 secondes
  ET les résultats affichent 3 userneeds (principal, secondaire, tertiaire)
  ET chaque userneed est accompagné d'un score numérique
  ET la somme des 3 scores est égale à 100
  ET une justification de maximum 10 mots est affichée pour chaque userneed
```

---

## Template 2 : Cas d'Erreur (Error Handling)

### Scénario : [Nom du scénario - décrit le cas d'erreur]

```gherkin
ÉTANT DONNÉ [contexte où l'erreur peut se produire]
  ET [condition qui va causer l'erreur]
QUAND [action déclenchant l'erreur]
ALORS [message d'erreur explicite s'affiche]
  ET [comportement du système face à l'erreur]
  ET [aucune donnée n'est perdue / état du système reste cohérent]
  MAIS [l'action principale n'est pas exécutée]
```

**Exemple concret** :

```gherkin
ÉTANT DONNÉ que je suis sur la page d'analyse
  ET que je n'ai PAS configuré de clé API OpenRouter
QUAND je tente de cliquer sur "Analyser"
ALORS un message d'erreur s'affiche : "⚠️ Clé API manquante"
  ET un lien vers la page de configuration est proposé
  ET le texte que j'ai saisi reste dans la zone de saisie
  ET l'analyse ne se lance pas
  MAIS je peux corriger la configuration et réessayer
```

**Exemple 2 - Erreur API externe** :

```gherkin
ÉTANT DONNÉ que j'ai lancé une analyse valide
  ET que l'API OpenRouter est temporairement indisponible (erreur 503)
QUAND la requête échoue après 3 tentatives avec backoff exponentiel
ALORS un message d'erreur explicite s'affiche : "Service temporairement indisponible. Veuillez réessayer dans quelques instants."
  ET un bouton "Réessayer" est disponible
  ET mon texte saisi est préservé
  ET l'erreur est loggée côté serveur avec timestamp et détails pour debug
```

---

## Template 3 : Cas Limite (Edge Cases)

### Scénario : [Nom du scénario - décrit le cas limite]

```gherkin
ÉTANT DONNÉ [situation inhabituelle ou limite du système]
QUAND [action dans ce contexte limite]
ALORS [comportement attendu défini clairement]
  ET [gestion gracieuse du cas limite]
```

**Exemples concrets** :

#### Cas limite 1 : Texte très court

```gherkin
ÉTANT DONNÉ que je suis sur la page d'analyse
QUAND je saisis un texte de moins de 50 caractères
  ET que je clique sur "Analyser"
ALORS un message d'avertissement s'affiche : "Le texte est trop court pour une analyse pertinente (minimum 50 caractères)"
  ET l'analyse ne se lance pas
  ET un compteur de caractères est visible sous la zone de saisie
```

#### Cas limite 2 : Texte extrêmement long

```gherkin
ÉTANT DONNÉ que je colle un texte de plus de 10 000 mots
QUAND je clique sur "Analyser"
ALORS un message d'avertissement s'affiche : "Le texte est trop long (max 10 000 mots). Seuls les 10 000 premiers mots seront analysés."
  ET l'analyse se lance sur les 10 000 premiers mots uniquement
  ET un indicateur montre que le texte a été tronqué
```

#### Cas limite 3 : Caractères spéciaux

```gherkin
ÉTANT DONNÉ que je colle un texte contenant des emojis, symboles mathématiques et caractères non-latins
QUAND je lance l'analyse
ALORS l'analyse fonctionne normalement
  ET les caractères spéciaux sont correctement traités par l'API
  ET aucune erreur d'encodage ne se produit
```

---

## Template 4 : Validation de Données

### Scénario : Validation [champ/donnée] - [règle de validation]

```gherkin
ÉTANT DONNÉ [formulaire ou champ concerné]
QUAND [utilisateur saisit une donnée invalide selon la règle X]
  ET [tente de valider/soumettre]
ALORS [message de validation spécifique s'affiche]
  ET [champ est mis en évidence visuellement]
  ET [soumission est bloquée jusqu'à correction]
```

**Exemple - Validation clé API** :

```gherkin
ÉTANT DONNÉ que je suis sur la page de configuration
QUAND je saisis une clé API au format invalide (ne commence pas par "sk-or-")
  ET que je clique sur "Enregistrer"
ALORS un message d'erreur s'affiche : "Format de clé API invalide. Une clé OpenRouter doit commencer par 'sk-or-'"
  ET le champ clé API est surligné en rouge
  ET la configuration n'est pas enregistrée
  ET je peux corriger et réessayer
```

---

## Template 5 : Performance et Temps de Réponse

### Scénario : Performance [action] sous [condition]

```gherkin
ÉTANT DONNÉ [contexte de charge ou volume]
QUAND [action déclenchant l'opération à mesurer]
ALORS [opération se termine en moins de X secondes/millisecondes]
  ET [interface reste responsive pendant l'opération]
  ET [indicateur de progression est affiché si > Y secondes]
```

**Exemple - Performance analyse** :

```gherkin
ÉTANT DONNÉ que je lance une analyse sur un article de 2000 mots
  ET que l'API OpenRouter fonctionne normalement
QUAND je clique sur "Analyser"
ALORS l'analyse se termine en moins de 5 secondes (95e percentile)
  ET un spinner de chargement est affiché pendant l'analyse
  ET l'interface reste responsive (je peux annuler l'analyse)
  ET si l'analyse dépasse 5 secondes, un message "Analyse en cours..." rassure l'utilisateur
```

---

## Template 6 : Sécurité et Confidentialité

### Scénario : Sécurité [donnée sensible] - [protection attendue]

```gherkin
ÉTANT DONNÉ [contexte où donnée sensible est manipulée]
QUAND [action impliquant la donnée]
ALORS [mesure de sécurité est appliquée]
  ET [donnée n'est jamais exposée dans X endroit]
  ET [validation/sanitisation est effectuée]
```

**Exemple - Sécurité clé API** :

```gherkin
ÉTANT DONNÉ que j'ai configuré ma clé API OpenRouter
QUAND je recharge la page de configuration
ALORS la clé API est affichée partiellement masquée (ex: "sk-or-v1-****xyz")
  ET la clé API complète n'est JAMAIS visible dans le code source HTML
  ET la clé API n'est JAMAIS envoyée au frontend depuis le backend
  ET la clé API est stockée uniquement en localStorage avec chiffrement
```

**Exemple 2 - Protection CORS** :

```gherkin
ÉTANT DONNÉ que l'application est déployée en production sur le domaine franceinfo.fr
QUAND une requête provient d'un autre domaine (ex: malicious.com)
ALORS la requête est bloquée par la politique CORS
  ET une erreur 403 Forbidden est retournée
  ET l'erreur est loggée côté serveur avec l'origine de la requête
```

---

## Template 7 : Accessibilité (a11y)

### Scénario : Accessibilité [fonctionnalité] pour [type d'utilisateur/handicap]

```gherkin
ÉTANT DONNÉ [utilisateur avec handicap ou utilisant technologie d'assistance]
QUAND [utilise la fonctionnalité via technologie d'assistance]
ALORS [fonctionnalité est pleinement accessible]
  ET [feedback approprié est fourni]
  ET [respect des standards WCAG 2.1 niveau AA]
```

**Exemple - Navigation clavier** :

```gherkin
ÉTANT DONNÉ que je navigue uniquement au clavier (sans souris)
QUAND j'utilise la touche Tab pour naviguer entre les éléments
ALORS tous les éléments interactifs sont accessibles dans un ordre logique
  ET l'élément ayant le focus est clairement visible (outline)
  ET je peux soumettre l'analyse avec la touche Entrée
  ET je peux fermer les modales avec la touche Échap
```

**Exemple 2 - Lecteur d'écran** :

```gherkin
ÉTANT DONNÉ que j'utilise un lecteur d'écran (NVDA, JAWS, VoiceOver)
QUAND je navigue sur la page d'analyse
ALORS tous les champs de formulaire ont des labels explicites
  ET les boutons ont des aria-label descriptifs
  ET les messages d'erreur sont annoncés automatiquement (aria-live)
  ET la structure de la page utilise les balises sémantiques (header, main, nav, section)
```

---

## Template 8 : Compatibilité Multi-navigateurs

### Scénario : Compatibilité [fonctionnalité] sur [navigateur/device]

```gherkin
ÉTANT DONNÉ que j'utilise [navigateur X version Y] sur [OS/device]
QUAND [j'utilise la fonctionnalité]
ALORS [fonctionnalité fonctionne de manière identique]
  ET [aucune régression visuelle ou fonctionnelle]
```

**Exemple** :

```gherkin
ÉTANT DONNÉ que j'utilise Firefox 110 sur macOS
QUAND je lance une analyse d'article
ALORS l'analyse fonctionne exactement comme sur Chrome
  ET l'affichage des résultats est identique
  ET les performances sont équivalentes (écart < 10%)
```

---

## Template 9 : Responsive Design

### Scénario : Responsive [écran/device] - [résolution]

```gherkin
ÉTANT DONNÉ que je consulte l'application sur [device/résolution]
QUAND [j'utilise la fonctionnalité]
ALORS [interface s'adapte correctement]
  ET [tous les éléments restent accessibles]
  ET [pas de débordement ou scrolling horizontal]
```

**Exemple - Tablette** :

```gherkin
ÉTANT DONNÉ que je consulte l'application sur iPad (1024x768)
QUAND je lance une analyse
ALORS l'interface s'adapte à la largeur de l'écran
  ET tous les boutons restent accessibles et cliquables (taille min 44x44px)
  ET la zone de saisie occupe 80% de la largeur disponible
  ET les résultats s'affichent en colonnes empilées verticalement
```

---

## Checklist de Qualité des Critères d'Acceptation

Avant de valider vos critères d'acceptation, vérifiez :

- [ ] **Testables** : Peut-on vérifier objectivement chaque critère ?
- [ ] **Complets** : Couvre-t-on cas nominal + erreurs + limites ?
- [ ] **Spécifiques** : Pas d'ambiguïté, comportement précisément décrit ?
- [ ] **Indépendants** : Chaque scénario est autonome et compréhensible seul ?
- [ ] **Mesurables** : Utilise-t-on des métriques quantifiables (temps, taille, pourcentage) ?
- [ ] **Réalistes** : Les critères sont-ils réalisables techniquement et économiquement ?
- [ ] **Orientés utilisateur** : Décrivent-ils le comportement du point de vue de l'utilisateur ?
- [ ] **Non-technique** : Compréhensibles par tous (éviter jargon technique excessif) ?

---

## Exemples Complets par Type de Fonctionnalité

### Exemple 1 : Fonctionnalité d'export de données

#### Scénario 1 : Export réussi au format Excel

```gherkin
ÉTANT DONNÉ que j'ai effectué au moins 10 analyses
  ET que je suis sur la page des résultats
QUAND je clique sur le bouton "Exporter en Excel"
ALORS un fichier .xlsx est téléchargé sur mon ordinateur
  ET le fichier contient toutes les analyses (10 lignes)
  ET le fichier inclut les colonnes : Date, Titre, Userneed Principal, Score, Justification
  ET le fichier peut être ouvert sans erreur dans Microsoft Excel et LibreOffice
  ET le nom du fichier suit le format : "analyses_franceTV_YYYY-MM-DD.xlsx"
```

#### Scénario 2 : Export impossible si aucune donnée

```gherkin
ÉTANT DONNÉ que je n'ai effectué aucune analyse
QUAND je clique sur "Exporter en Excel"
ALORS un message d'information s'affiche : "Aucune donnée à exporter. Effectuez au moins une analyse."
  ET aucun fichier n'est téléchargé
  MAIS le bouton reste accessible pour un futur export
```

---

### Exemple 2 : Fonctionnalité de comparaison de modèles

#### Scénario : Comparaison de 3 modèles IA

```gherkin
ÉTANT DONNÉ que je suis sur la page de comparaison de modèles
  ET que j'ai configuré ma clé API OpenRouter
  ET que j'ai collé un article dans la zone de texte
QUAND je sélectionne 3 modèles différents (Claude 3.5 Haiku, GPT-4o, Gemini Pro)
  ET que je clique sur "Comparer"
ALORS les 3 analyses se lancent en parallèle
  ET un indicateur de progression montre l'avancement pour chaque modèle
  ET une fois terminées, les 3 analyses s'affichent côte à côte en colonnes
  ET je peux comparer visuellement les userneeds identifiés par chaque modèle
  ET un tableau récapitulatif montre les divergences et convergences
  ET le temps de réponse de chaque modèle est affiché
```

---

## Erreurs Courantes à Éviter

❌ **Trop vague** :
```gherkin
ALORS le système fonctionne correctement
```

✅ **Spécifique** :
```gherkin
ALORS l'analyse retourne 3 userneeds avec scores totalisant 100
  ET chaque userneed a une justification de max 10 mots
  ET le temps de réponse est < 5 secondes
```

---

❌ **Trop technique** :
```gherkin
ALORS le endpoint /api/analyze retourne un JSON avec status 200 et payload contenant un array de objects
```

✅ **Orienté utilisateur** :
```gherkin
ALORS les résultats de l'analyse s'affichent à l'écran
  ET incluent 3 userneeds avec leurs scores et justifications
```

---

❌ **Non testable** :
```gherkin
ALORS l'interface est intuitive et agréable à utiliser
```

✅ **Testable** :
```gherkin
ALORS tous les boutons ont des labels explicites
  ET l'ordre de navigation au clavier est logique (de haut en bas, gauche à droite)
  ET les messages d'erreur sont affichés en rouge avec une icône ⚠️
```

---

## Ressources Complémentaires

- **Gherkin Syntax** : [Documentation officielle Cucumber](https://cucumber.io/docs/gherkin/reference/)
- **WCAG 2.1** : [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- **BDD (Behavior Driven Development)** : [Introduction BDD](https://www.agilealliance.org/glossary/bdd/)

---

**Template à copier-coller** :

```gherkin
### Scénario : [Nom du scénario]

ÉTANT DONNÉ [contexte initial]
  ET [précondition]
QUAND [action utilisateur]
  ET [action complémentaire]
ALORS [résultat attendu 1]
  ET [résultat attendu 2]
  ET [résultat attendu 3]
  MAIS [exception ou limite]
```

---

**Conseil final** : Commencez par le cas nominal, puis ajoutez les cas d'erreur et limites. Validez vos critères avec l'équipe de développement pour éviter les ambiguïtés. Un critère d'acceptation bien écrit fait gagner du temps à tout le monde ! 🚀
