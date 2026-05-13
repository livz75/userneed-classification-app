# User Story Template

## Format Standard

**ID** : US-[Numéro]
**Titre** : [Titre court et descriptif]
**Priorité** : [P0 - Critique / P1 - Important / P2 - Nice to have]
**Statut** : [Draft / Ready / In Progress / Review / Done]

---

### User Story

**En tant que** [type d'utilisateur / persona]
**Je veux** [action ou fonctionnalité souhaitée]
**Afin de** [bénéfice ou valeur obtenue]

### Contexte et Justification

[Expliquer le contexte d'usage, pourquoi cette fonctionnalité est importante, quel problème elle résout]

**Exemple** :
> Les journalistes de France Télévisions ont besoin d'analyser rapidement le type de besoin utilisateur (userneed) que leur article satisfait pour optimiser la curation de contenu. Actuellement, cette analyse est manuelle et subjective, ce qui ralentit le processus éditorial.

---

### Critères d'Acceptation

#### Format Gherkin

```gherkin
ÉTANT DONNÉ [contexte initial / état du système]
QUAND [action de l'utilisateur ou événement déclencheur]
ALORS [résultat attendu observable]
ET [résultat complémentaire si applicable]
MAIS [exception ou limite si applicable]
```

#### Scénario 1 : [Cas nominal]

```gherkin
ÉTANT DONNÉ que je suis sur la page d'accueil de l'application
ET que j'ai une clé API OpenRouter valide
QUAND je colle le contenu d'un article dans la zone de texte
ET que je clique sur "Analyser"
ALORS l'application affiche 3 userneeds (principal, secondaire, tertiaire)
ET chaque userneed a un score affiché
ET la somme des 3 scores est égale à 100
ET une justification courte (max 10 mots) est affichée pour chaque userneed
```

#### Scénario 2 : [Cas d'erreur]

```gherkin
ÉTANT DONNÉ que je suis sur la page d'analyse
QUAND je tente d'analyser un article sans avoir configuré ma clé API
ALORS un message d'erreur s'affiche : "Veuillez configurer votre clé API OpenRouter"
ET l'application me redirige vers la section de configuration
```

#### Scénario 3 : [Cas limite]

```gherkin
ÉTANT DONNÉ que j'ai lancé une analyse
ET que l'API OpenRouter est temporairement indisponible
QUAND l'analyse échoue après 3 tentatives de retry
ALORS un message d'erreur explicite s'affiche : "Service temporairement indisponible"
ET je peux réessayer manuellement
ET mes données saisies ne sont pas perdues
```

---

### Règles Métier

Liste des règles métier critiques à respecter :

1. **[RG-001] Validation scores** : La somme des 3 scores (principal + secondaire + tertiaire) doit TOUJOURS être égale à 100.

2. **[RG-002] Userneeds valides** : Les userneeds retournés doivent être exclusivement parmi ces 8 options :
   - UPDATE ME
   - EXPLAIN ME
   - GIVE ME PERSPECTIVE
   - DIVERT ME
   - GUIDE ME
   - INSPIRE ME
   - FEEL
   - VERIFY

3. **[RG-003] Justification longueur** : Chaque justification doit contenir maximum 10 mots pour garantir la concision.

4. **[Ajoutez vos règles métier ici]**

---

### Contraintes Techniques

- **Performance** : L'analyse doit se terminer en moins de 5 secondes (95e percentile)
- **Compatibilité** : Doit fonctionner sur Chrome, Firefox, Safari (dernières 2 versions)
- **Responsive** : Interface doit être utilisable sur desktop (priorité) et tablette
- **Accessibilité** : Niveau WCAG 2.1 AA minimum (labels, contraste, navigation clavier)

---

### Dépendances

**Bloqué par** :
- [ ] US-[X] : [Titre de la user story dont celle-ci dépend]

**Bloque** :
- [ ] US-[Y] : [Titre de la user story qui dépend de celle-ci]

**APIs / Services externes requis** :
- OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`)
- [Autre dépendance si applicable]

---

### Wireframes / Mockups

**Lien vers les assets visuels** :
- 📎 [Wireframe Figma/Sketch/etc.](lien-vers-wireframe)
- 📎 [Mockup haute-fidélité](lien-vers-mockup)
- 📎 [User flow diagram](lien-vers-flow)

**Captures d'écran POC** (si applicable) :
- 📸 [Screenshot état initial](chemin/vers/screenshot1.png)
- 📸 [Screenshot état succès](chemin/vers/screenshot2.png)
- 📸 [Screenshot état erreur](chemin/vers/screenshot3.png)

---

### Données de Test

**Jeu de données pour tests** :

**Exemple d'article (cas nominal)** :
```
Titre: "Inflation : Les prix de l'alimentation augmentent de 15% en un an"
Contenu: "Selon l'INSEE, les prix de l'alimentation ont connu une hausse..."
Userneed attendu (principal): UPDATE ME
```

**Exemple d'article (cas limite)** :
```
Titre: "Le sauvetage héroïque d'un chat coincé dans un arbre"
Contenu: "Un pompier a sauvé..."
Userneed attendu: DIVERT ME
```

**API Key de test** :
- Environnement dev : `sk-or-v1-test-key-xxx` (quota limité à 100 requêtes/jour)

---

### Estimation

**Story Points** : [1, 2, 3, 5, 8, 13, 21] (Fibonacci)
**Estimation développeur** : [X jours / heures]
**Complexité** : [Simple / Moyenne / Complexe]

**Justification de l'estimation** :
[Expliquer pourquoi cette estimation, quels éléments rendent la story simple ou complexe]

---

### Notes Techniques

**Approche suggérée** (non prescriptive) :
1. [Étape 1 : ex. "Créer composant FormInput.jsx"]
2. [Étape 2 : ex. "Implémenter validation côté client"]
3. [Étape 3 : ex. "Connecter au endpoint /api/analyze"]

**Points d'attention** :
- ⚠️ [Attention particulière sur validation des scores pour éviter erreurs d'arrondi]
- ⚠️ [Gérer le retry en cas d'échec API avec backoff exponentiel]

**Ressources utiles** :
- 📚 [Documentation OpenRouter API](https://openrouter.ai/docs)
- 📚 [Guide des 8 userneeds France TV](lien-interne)

---

### Définition de "Done"

Cette user story est considérée terminée quand :

- [ ] Code développé et testé localement
- [ ] Tests unitaires écrits et passent (couverture > 70%)
- [ ] Tests d'intégration écrits pour flux critiques
- [ ] Code revue par un pair (code review)
- [ ] Documentation technique mise à jour si nécessaire
- [ ] Critères d'acceptation validés en environnement de staging
- [ ] Product Owner a validé fonctionnellement (démo + sign-off)
- [ ] Déployé en production sans régression
- [ ] Pas de bugs bloquants identifiés post-déploiement (24h)

---

### Historique

| Date | Auteur | Action | Commentaires |
|------|--------|--------|--------------|
| [YYYY-MM-DD] | [Nom PO] | Création | Version initiale |
| [YYYY-MM-DD] | [Nom Dev] | Estimation | Story points: 5 |
| [YYYY-MM-DD] | [Nom PO] | Modification | Ajout scénario 3 (cas limite) |
| [YYYY-MM-DD] | [Nom Dev] | Terminé | Validé en prod |

---

### Questions / Clarifications

**Q1** : [Question du développeur sur un point ambigu]
**R1** : [Réponse du Product Owner avec clarification]

**Q2** : [Autre question]
**R2** : [Réponse]

---

## Exemple Complet : US-001 - Analyse des Userneeds d'un Article

**ID** : US-001
**Titre** : Analyser un article pour en extraire les userneeds
**Priorité** : P0 - Critique (MUST HAVE)
**Statut** : Done

---

### User Story

**En tant que** journaliste de France Télévisions
**Je veux** coller le contenu d'un article et obtenir une analyse automatique des userneeds
**Afin de** comprendre quel type de besoin utilisateur mon article satisfait et optimiser ma stratégie éditoriale

### Contexte et Justification

Actuellement, l'identification des userneeds est manuelle et subjective. Cette fonctionnalité permettra aux journalistes d'obtenir une analyse objective et rapide basée sur l'IA, facilitant la curation de contenu et l'adaptation aux attentes des lecteurs.

---

### Critères d'Acceptation

#### Scénario 1 : Analyse réussie avec API OpenRouter

```gherkin
ÉTANT DONNÉ que je suis sur la page d'accueil de l'application
ET que j'ai configuré ma clé API OpenRouter valide
QUAND je colle le contenu d'un article (titre + texte) dans la zone de texte
ET que je clique sur le bouton "Analyser"
ALORS l'application envoie une requête à l'API OpenRouter
ET affiche un indicateur de chargement pendant l'analyse
ET après maximum 5 secondes, affiche les résultats :
  - Userneed principal avec son score (ex: "UPDATE ME (50)")
  - Justification en max 10 mots
  - Userneed secondaire avec son score (ex: "EXPLAIN ME (30)")
  - Justification en max 10 mots
  - Userneed tertiaire avec son score (ex: "GIVE ME PERSPECTIVE (20)")
  - Justification en max 10 mots
ET la somme des 3 scores est égale à 100
```

#### Scénario 2 : Erreur si clé API manquante

```gherkin
ÉTANT DONNÉ que je n'ai pas configuré de clé API OpenRouter
QUAND je tente d'analyser un article
ALORS un message d'erreur s'affiche : "⚠️ Clé API manquante. Veuillez configurer votre clé OpenRouter dans les paramètres."
ET un lien vers la page de configuration est proposé
ET l'analyse ne se lance pas
```

#### Scénario 3 : Gestion d'erreur API

```gherkin
ÉTANT DONNÉ que j'ai lancé une analyse valide
ET que l'API OpenRouter retourne une erreur (500, timeout, quota dépassé)
QUAND l'erreur se produit
ALORS un message d'erreur explicite s'affiche selon le cas :
  - Quota dépassé : "Quota API dépassé. Veuillez attendre ou changer de clé."
  - Timeout : "L'analyse a pris trop de temps. Veuillez réessayer."
  - Erreur serveur : "Erreur serveur temporaire. Réessayez dans quelques instants."
ET je peux cliquer sur "Réessayer" sans perdre mon texte
ET l'erreur est loggée côté serveur pour investigation
```

---

### Règles Métier

1. **[RG-001]** Somme des scores = 100 (validation stricte)
2. **[RG-002]** Userneeds doivent être parmi les 8 valeurs autorisées
3. **[RG-003]** Justifications max 10 mots
4. **[RG-004]** Timeout API fixé à 30 secondes max (avec retry 3x)
5. **[RG-005]** Articles < 50 caractères sont rejetés comme trop courts

---

### Contraintes Techniques

- **Performance** : Réponse en < 5 secondes (95e percentile)
- **Compatibilité** : Chrome 110+, Firefox 110+, Safari 16+
- **Responsive** : Desktop prioritaire (tablette supportée, mobile en v2)
- **Accessibilité** : Labels ARIA, navigation clavier, contraste WCAG AA

---

### Dépendances

**APIs externes** :
- OpenRouter API v1 : `https://openrouter.ai/api/v1/chat/completions`
- Modèle par défaut : `anthropic/claude-3.5-haiku`

---

### Wireframes / Mockups

- 📎 [Wireframe Figma](https://figma.com/file/xxx)
- 📸 [Screenshot POC actuel](./screenshots/analyse-userneed.png)

---

### Données de Test

**Cas 1 : Article actualité (UPDATE ME attendu)** :
```
Titre: "Inflation : Les prix de l'alimentation augmentent de 15%"
Contenu: "Selon l'INSEE, les prix de l'alimentation ont connu une hausse..."
```

**Cas 2 : Article détente (DIVERT ME attendu)** :
```
Titre: "Les 10 plus belles plages de France à découvrir cet été"
Contenu: "Pour les vacances, voici notre sélection de plages paradisiaques..."
```

---

### Estimation

**Story Points** : 8
**Complexité** : Moyenne
**Estimation** : 3 jours développeur

**Justification** :
- Intégration API externe (nécessite gestion erreurs)
- Validation scores complexe (arrondi, total 100)
- Affichage résultats avec states (loading, success, error)

---

### Définition de "Done"

- [x] Code développé et testé
- [x] Tests unitaires (couverture 85%)
- [x] Code review validée
- [x] Validé par PO en staging
- [x] Déployé en production
- [x] Monitoring : 0 erreur critique en 24h

---

### Historique

| Date | Auteur | Action | Commentaires |
|------|--------|--------|--------------|
| 2024-01-15 | Livio | Création | Première version |
| 2024-01-17 | Développeur | Estimation | 8 story points |
| 2024-01-22 | Développeur | Terminé | Déployé avec succès |

---

## Template Vierge (à copier-coller)

```markdown
# User Story - US-[XXX]

**ID** : US-XXX
**Titre** : [Titre court]
**Priorité** : [P0/P1/P2]
**Statut** : [Draft]

---

### User Story

**En tant que** [persona]
**Je veux** [action]
**Afin de** [bénéfice]

### Contexte et Justification

[Expliquer le contexte]

---

### Critères d'Acceptation

#### Scénario 1 : [Cas nominal]

```gherkin
ÉTANT DONNÉ [contexte]
QUAND [action]
ALORS [résultat]
```

---

### Règles Métier

1. **[RG-XXX]** [Description de la règle]

---

### Estimation

**Story Points** : [X]
**Complexité** : [Simple/Moyenne/Complexe]

---

### Définition de "Done"

- [ ] Code développé et testé
- [ ] Tests unitaires
- [ ] Code review
- [ ] Validé par PO
- [ ] Déployé en production

---
```

**Conseil** : Copiez ce template vierge et remplissez-le pour chaque nouvelle user story. N'hésitez pas à adapter les sections selon vos besoins spécifiques !
