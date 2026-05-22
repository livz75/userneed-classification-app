# Application « Analyse IA des User Needs »

> **Outil interne France Télévisions pour évaluer la capacité d'une IA à classer des articles Franceinfo selon les 9 « User Needs ».**
> Version POC — non destiné à la production éditoriale en l'état.

**URL d'accès :** https://userneed-classification-app.onrender.com
**Pas d'authentification** : toute personne avec le lien accède à l'app et voit/modifie les mêmes données.

---

## Sommaire

1. [À quoi sert l'app](#1-à-quoi-sert-lapp)
2. [Les 9 User Needs](#2-les-9-user-needs)
3. [Parcours utilisateur type](#3-parcours-utilisateur-type)
4. [Les modules en détail](#4-les-modules-en-détail)
   - [📰 Articles](#41--articles)
   - [🤖 LLM](#42--llm)
   - [📝 Prompts](#43--prompts)
   - [Analyse IA](#44-analyse-ia)
   - [📋 Tests](#45--tests)
5. [Où sont les données ?](#5-où-sont-les-données-)
6. [Limites connues du POC](#6-limites-connues-du-poc)
7. [Annexe technique](#7-annexe-technique)
8. [Contacts & ressources](#8-contacts--ressources)

---

## 1. À quoi sert l'app

L'app répond à une question éditoriale : **un modèle d'IA peut-il classer correctement un article Franceinfo selon le « User Need » qu'il sert** ?

Le principe est simple :

1. Un éditeur classe **manuellement** un corpus d'articles selon les 9 User Needs (= vérité terrain).
2. Il lance une **analyse IA** : un modèle (Claude, GPT, Gemini, Mistral, Llama…) reproduit l'exercice sur le même corpus avec un prompt donné.
3. L'app **compare** les deux et affiche un taux de concordance, une matrice de confusion, des justifications.
4. On peut **rejouer** l'analyse en faisant varier le modèle ou le prompt, et **comparer** les configurations entre elles pour identifier la meilleure.

Objectif à terme : si une configuration atteint une concordance suffisamment élevée et stable, on pourra **automatiser** la classification de nouveaux articles à grande échelle.

---

## 2. Les 9 User Needs

| User Need | Ce que ça veut dire |
|---|---|
| **UPDATE ME** | L'article tient informé d'une actualité en cours. |
| **SUMMARIZE** | _[Définition à valider]_ L'article fait la synthèse d'un sujet ou d'une période (digest, point récap, l'essentiel en bref). |
| **EXPLAIN ME** | L'article explique un sujet, un contexte, un mécanisme. |
| **GIVE ME PERSPECTIVE** | L'article apporte une analyse, une mise en recul, un éclairage d'expert. |
| **DIVERT ME** | L'article est léger, divertissant, fait souffler. |
| **GUIDE ME** | L'article alerte ou prévient sur un sujet préoccupant qui peut concerner le lecteur. |
| **INSPIRE ME** | L'article raconte une histoire positive, motivante. |
| **FEEL** | L'article est émotionnel, immersif, un témoignage. |
| **VERIFY** | L'article révèle une enquête, une info exclusive, un fact-check. |

> ⚠️ **À noter** : la taxonomie a évolué entre les versions du POC. Les anciens libellés (`REVEAL NEWS`, `MAKE ME FEEL THE NEWS`, `GIVE ME A BREAK`, `GIVE ME CONCERNING NEWS`) ont été remplacés, mais l'app les remappe automatiquement vers leur équivalent canonique pour rester compatible avec les analyses historiques.

---

## 3. Parcours utilisateur type

```
1. Récupérer le corpus  →  les articles arrivent automatiquement chaque jour depuis Franceinfo
2. Classer à la main    →  module "📰 Articles" : pour chaque article, choisir 1 User Need parmi 9
3. Configurer l'IA      →  modules "🤖 LLM" + "📝 Prompts" : choisir le modèle + le prompt à tester
4. Lancer l'analyse     →  bouton "Analyse IA" : l'IA classe les mêmes articles, en live
5. Lire les résultats   →  matrice de confusion 9×9, taux de concordance, justifications par article
6. Capitaliser          →  module "📋 Tests" : revoir l'historique, comparer 2 tests, classement global
7. Itérer sur le prompt →  bouton "💡 Adapter le prompt" : l'IA propose elle-même des reformulations
```

---

## 4. Les modules en détail

### 4.1 📰 Articles

**Le module central — c'est ici que se construit la vérité terrain.**

**Sources des articles**
- Récupération automatique quotidienne depuis l'API publique Franceinfo (cron local).
- Possibilité d'**ajouter un article à la main** en collant une URL Franceinfo.

**Affichage**
- Liste de cartes : ID interne, catégorie (politique, économie, santé…), nombre de mots, titre, chapô, date de publication, lien externe vers l'article.
- Bouton de classification : un menu déroulant à 9 valeurs pour chaque article.

**Filtres**
- **Statut** : Tous / Classifiés / Non classifiés.
- **Sous-filtre User Need** (quand « Classifiés » est actif) : 10 chips (Tous + 9 UN) avec le nombre d'articles par User Need, permet de voir tous les articles classés dans un UN précis.
- **Catégorie éditoriale** : politique, économie, monde, sport, santé, etc.
- **Type de média** : article / vidéo / autre.
- **Recherche libre par titre**.

**Outil de cadrage : « 📊 Répartition »**
Graphique en barres affichant la répartition du corpus classifié, avec une indication « équilibre bon / déséquilibré » et une ligne idéale à 1/9. Permet de s'assurer que la vérité terrain n'est pas biaisée par une sur-représentation de certains UN.

---

### 4.2 🤖 LLM

**Module de configuration du modèle d'IA utilisé pour l'analyse.**

- **Provider unique** : OpenRouter (une seule clé API donne accès à tous les modèles).
- **Modèles disponibles** : Claude (Anthropic), GPT (OpenAI), Gemini (Google), Mistral, Llama (Meta), et autres.
- **Sélection** : choisir le modèle qui servira à la prochaine analyse.
- **Clé API** : configurable dans l'UI, ou via `config.json` côté serveur.

> 💡 La clé OpenRouter en production est stockée en variable d'environnement Render — pas besoin de la rentrer dans l'UI à chaque session.

---

### 4.3 📝 Prompts

**Module de gestion des prompts** — les instructions données à l'IA pour classer un article.

- Création / édition / duplication / suppression de prompts.
- Un seul prompt actif à la fois (= celui qui sera utilisé à la prochaine analyse).
- Structure libre, mais les prompts efficaces suivent souvent un canevas :
  - `#ROLE` — qui est l'IA
  - `#VISION DE FRANCEINFO` — contexte éditorial
  - `#DÉFINITIONS DES USERNEEDS` — les 9 catégories détaillées
  - `#TÂCHE` — ce qu'on attend en sortie (format de réponse, ordre des prédictions, etc.)
- La section `#ARTICLE À ANALYSER` est ajoutée automatiquement par l'app au moment de l'analyse — pas besoin de la mettre dans le prompt.

**Versionnage automatique** : chaque exécution d'analyse capture un **snapshot** du prompt utilisé. Si tu modifies un prompt après coup, les anciens tests restent associés à la version qu'ils ont utilisée — la traçabilité est préservée.

---

### 4.4 Analyse IA

**Le moteur d'évaluation — comparer ce que l'IA prédit à ce qu'un humain a classé.**

**Comment ça marche**
1. L'app charge tous les articles déjà classifiés humainement.
2. Pour chaque article (séquentiel, ~5 s entre articles), elle envoie au modèle : le prompt actif + le titre/chapô/corps de l'article.
3. L'IA répond avec **3 User Needs classés** (principal, secondaire, tertiaire), chacun avec un **score 0-100** et une **justification courte**.
4. L'app compare le User Need principal de l'IA à la classification humaine → concordant ou non.

**Ce que tu vois pendant l'analyse**
- **Barre de progression** avec le temps écoulé et le débit (articles/min).
- **Bandeau de configuration** : modèle + prompt en cours d'utilisation.
- **Stats live** : total / concordants / non-concordants (en %).
- **Matrice de confusion 9×9** : lignes = catégorie humaine, colonnes = prédiction IA. La diagonale en vert = succès. Les cases hors-diagonale (en dégradé rouge selon l'intensité) signalent où l'IA confond les catégories.
- **Liste live des articles analysés** : chaque article s'affiche avec un badge concordant / non-concordant et la justification IA.
- **Tableau détaillé** : numéro, titre, UN attribué, prédiction IA (3 prédictions + scores), justification, niveau de confiance (HAUTE / MOYENNE / BASSE).

**Contrôles**
- Pause / Reprendre / Stop / Reset.
- Clic sur une cellule de la matrice → filtre le tableau pour ne montrer que les articles correspondant à ce croisement.
- Export CSV de l'analyse complète.

**Score de confiance**
Calculé à partir de l'écart entre le score du UN principal et celui du UN secondaire :
- Delta ≥ 30 → **HAUTE** (l'IA est sûre d'elle)
- Delta ≥ 15 → **MOYENNE**
- Sinon → **BASSE** (l'IA hésite entre plusieurs UN)

**Fonctionnalité bonus : « 💡 Adapter le prompt »**
Disponible après une analyse. En 2 étapes :
1. L'IA examine la matrice de confusion (les erreurs les plus fréquentes) et propose 5 à 8 reformulations ciblées du prompt.
2. L'utilisateur clique « Appliquer » → l'IA génère uniquement les diffs à appliquer (pas tout le prompt) → l'app les applique localement → le prompt adapté est prêt à être sauvegardé comme nouvelle version.

---

### 4.5 📋 Tests

**L'historique et la gouvernance des analyses passées.**

Chaque exécution d'« Analyse IA » est automatiquement archivée comme un « test ». Un test = un couple **(modèle + prompt + corpus)** à une date donnée.

**Onglet « Historique »**
- Liste de tous les tests, groupés par prompt.
- Pour chaque test : badge modèle, date, statut (Terminé / Arrêté / En cours), nombre d'articles, taux de concordance.
- Actions : `📊 Voir détail` (recharge la matrice et les résultats) · `📥 Export CSV` · `🗑️ Supprimer`.
- **Comparaison** : cocher 2 tests → bouton « ⚖️ Comparer » → vue côte à côte avec :
  - Concordance globale + delta
  - Tableau précision / rappel par User Need (couleurs sur le gagnant et le perdant)
  - **Synthèse IA** : Claude 3.5 Sonnet rédige automatiquement un constat (3-4 phrases) et une recommandation explicite du meilleur combo.
  - Modal pédagogique « C'est quoi la Précision et le Rappel ? » pour les non-statisticiens.

**Onglet « Classement »**
- **Scatter plot** de tous les tests terminés :
  - Axe X = concordance globale (%)
  - Axe Y = F1 macro (%) — moyenne harmonique précision/rappel sur l'ensemble des UN
  - Couleur = famille de modèle (Anthropic / OpenAI / Google / Mistral / Meta)
  - Chiffre dans le point = volume d'articles analysés
  - Le meilleur test = celui en haut à droite (🏆)
- **Filtres** : par modèle, par prompt, par volume minimum d'articles.
- **Tableau triable** synchronisé avec le scatter.

---

## 5. Où sont les données ?

**Base de données : Supabase** (hébergement managé Postgres)
- `articles` : le corpus (alimenté automatiquement chaque jour)
- `human_classifications` : les classifications manuelles (vérité terrain)
- `prompts` : les versions de prompts éditoriaux
- `test_runs` : l'historique des analyses (avec snapshot du prompt et de la matrice)
- `ai_analyses` : le résultat IA détaillé pour chaque (test, article)

**Pas d'authentification** dans la version actuelle. Toutes les données sont partagées entre utilisateurs : si quelqu'un classe un article ou lance une analyse, ça se voit chez tout le monde.

**Articles dispo** : ~quelques milliers, rafraîchissement quotidien.

---

## 6. Limites connues du POC

À avoir en tête avant de tirer des conclusions opérationnelles :

- **Pas d'authentification** ni de gestion utilisateurs : tout est partagé, anonyme.
- **Analyse côté navigateur** : si tu fermes l'onglet pendant une analyse longue (200 articles ≈ 17 min), elle s'arrête. Pas de reprise serveur.
- **Pas de tests automatisés** sur le code de l'app.
- **Une seule classification humaine par article** est prise en compte (la première). Pas d'agrégation entre plusieurs annotateurs ni de gestion du désaccord inter-juges.
- **Parsing de la réponse IA par regex** : robuste mais sensible si un modèle change subtilement son format de sortie.
- **Le prompt de classification est testable**, mais les prompts internes de l'app (analyse comparative, suggestion d'adaptation) sont hardcodés et utilisent Claude 3.5 Sonnet en dur.
- **Pas de versioning sémantique des prompts** : la traçabilité par snapshot suffit côté test, mais il n'y a pas de "v1 / v2 / v3" affiché clairement dans l'UI.

---

## 7. Annexe technique

### Stack

| Couche | Techno |
|---|---|
| Front | HTML + CSS + JavaScript vanilla (pas de framework). Un fichier monolithique `script.js` (~5 200 lignes) + 4 modules dans `js/`. |
| Backend | Python Flask (`server.py`) — sert uniquement de **proxy** vers OpenRouter (pour ne pas exposer la clé API côté client) et de serveur de fichiers statiques. |
| Base de données | Supabase (Postgres managé) — accédée directement depuis le navigateur via le client JS Supabase. |
| LLM provider | OpenRouter (gateway multi-modèles). |
| Hébergement | Render (web service auto-deploy depuis la branche `main` sur GitHub). |
| Acquisition articles | Script Python `fetch_articles.py` qui interroge l'API publique Franceinfo, lancé par cron quotidien. |

### Repo

GitHub : `livz75/userneed-classification-app` (privé)

Branches :
- `main` : version en production (Render redéploie automatiquement à chaque push).
- Branches de feature pour les développements en cours.

### Lancer l'app en local

```bash
# 1. Cloner le repo
git clone <repo-url>
cd "App qualif user needs"

# 2. Vérifier que Python 3 est installé (3.9+ recommandé)
python3 --version

# 3. (Optionnel) Configurer la clé OpenRouter dans config.json (sinon on peut la rentrer dans l'UI)
cp config.json.example config.json
# Éditer config.json et mettre la clé OpenRouter

# 4. Lancer le serveur
python3 server.py
# ou : ./start.sh

# 5. Ouvrir le navigateur sur http://localhost:8000
```

### Variables d'environnement (Render)

| Variable | Rôle |
|---|---|
| `OPENROUTER_API_KEY` | Clé d'accès OpenRouter (prioritaire sur `config.json`) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Connexion à la base Supabase |

### Tables Supabase

Schéma complet dans `supabase-schema.sql` à la racine du repo. Migrations dans `supabase-migration-*.sql`.

---

## 8. Contacts & ressources

| Ressource | Lien |
|---|---|
| App en production | https://userneed-classification-app.onrender.com |
| Repo GitHub | _[à compléter]_ |
| Dashboard Render | _[à compléter]_ |
| Dashboard Supabase | _[à compléter]_ |
| Console OpenRouter | https://openrouter.ai |
| Référent produit | Livio Ricci — `lricci@lri-consulting.com` |

---

_Dernière mise à jour : mai 2026. POC en évolution active — cette page est susceptible de changer fréquemment._
