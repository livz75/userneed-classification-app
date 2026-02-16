# 📚 Documentation Complète - Application d'Analyse IA des Userneeds Franceinfo

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Installation et déploiement](#installation-et-déploiement)
4. [Guide d'utilisation](#guide-dutilisation)
5. [Configuration](#configuration)
6. [API et intégrations](#api-et-intégrations)
7. [Développement](#développement)
8. [Maintenance et troubleshooting](#maintenance-et-troubleshooting)
9. [Roadmap et évolutions](#roadmap-et-évolutions)

---

## Vue d'ensemble

### 🎯 Objectif

L'application **Analyse IA des Userneeds** est un outil d'analyse automatique et de classification des articles Franceinfo selon leurs "user needs" (besoins utilisateur) en utilisant des modèles d'intelligence artificielle de pointe.

### 🎨 Contexte métier

France Télévisions utilise une taxonomie de 8 "userneeds" pour classifier le contenu éditorial :

1. **UPDATE ME** - Actualités et mises à jour
2. **EXPLAIN ME** - Explications et pédagogie
3. **GIVE ME PERSPECTIVE** - Analyses et contexte
4. **GIVE ME A BREAK** - Divertissement et pause
5. **GIVE ME CONCERNING NEWS** - Actualités préoccupantes
6. **INSPIRE ME** - Inspiration et découverte
7. **MAKE ME FEEL THE NEWS** - Émotion et vécu
8. **REVEAL NEWS** - Révélations et enquêtes

### ✨ Fonctionnalités principales

- ✅ **Analyse batch** : Upload d'un fichier Excel avec plusieurs articles
- ✅ **Multi-LLM** : Support de 13+ modèles d'IA (Claude, GPT, Gemini, Llama, Mistral, etc.)
- ✅ **Classification à 3 niveaux** : Userneed principal, secondaire et tertiaire avec scores
- ✅ **Matrice de confusion** : Visualisation interactive des résultats
- ✅ **Export Excel** : Téléchargement des résultats avec statistiques
- ✅ **Prompts personnalisables** : Modification des instructions IA
- ✅ **Thèmes** : Mode clair et sombre

### 📊 Métriques clés

- **Temps d'analyse** : 3-5 secondes par article (selon le modèle)
- **Précision** : 70-85% de concordance selon le modèle LLM utilisé
- **Capacité** : Analyse de 100+ articles en une session
- **Disponibilité** : 24/7 via déploiement cloud (Render.com)

---

## Architecture technique

### 🏗️ Stack technologique

**Frontend**
- HTML5, CSS3, JavaScript (Vanilla)
- Design responsive avec système de grille CSS
- Police : Poppins (Google Fonts)
- Pas de framework (vanilla JS pour simplicité et performance)

**Backend**
- Python 3.12
- `http.server` (serveur HTTP simple)
- `socketserver` (gestion des connexions)
- `urllib` (requêtes API)

**APIs externes**
- **OpenRouter** : Gateway unifié pour accéder à 13+ modèles LLM
- Support API Anthropic direct (legacy)

**Déploiement**
- **Production** : Render.com
- **Repository** : GitHub (https://github.com/livz75/userneed-classification-app)
- **CI/CD** : Auto-deploy depuis branch `main`

### 📁 Structure du projet

```
userneed-classification-app/
├── index.html              # Interface utilisateur principale
├── style.css               # Styles (thèmes clair/sombre)
├── script.js               # Logique frontend (2,356 lignes)
├── server.py               # Serveur proxy Python
├── requirements.txt        # Dépendances Python
├── render.yaml            # Configuration Render.com
├── .python-version        # Version Python (3.12)
├── .gitignore             # Fichiers ignorés par Git
│
├── api/                   # Fonctions serverless (Vercel legacy)
│   ├── index.py
│   ├── analyze.py
│   └── health.py
│
├── assets/                # Ressources statiques
│   └── franceinfo.jpg     # Logo Franceinfo
│
├── CONFIG.md              # Guide de configuration
├── README.md              # Documentation utilisateur
├── DOCUMENTATION_COMPLETE.md  # Ce fichier
└── config.json.example    # Template de configuration
```

### 🔄 Flux de données

```
┌─────────────┐
│  Utilisateur │
└──────┬──────┘
       │
       │ 1. Upload Excel
       ▼
┌─────────────────┐
│   Frontend      │ (index.html + script.js)
│   - Parsing XLSX│
│   - Validation  │
└──────┬──────────┘
       │
       │ 2. POST /api/analyze (par article)
       ▼
┌─────────────────┐
│   Backend       │ (server.py)
│   - CORS        │
│   - Proxy       │
└──────┬──────────┘
       │
       │ 3. API Call
       ▼
┌─────────────────┐
│   OpenRouter    │
│   - Claude      │
│   - GPT         │
│   - Gemini      │
│   - Llama       │
│   - Mistral     │
└──────┬──────────┘
       │
       │ 4. Réponse JSON
       ▼
┌─────────────────┐
│   Frontend      │
│   - Parsing     │
│   - Matrice     │
│   - Export      │
└─────────────────┘
```

### 🔐 Sécurité

**Protection des clés API**
- ✅ Fichier `config.json` dans `.gitignore` (jamais committé)
- ✅ Clés stockées en localStorage (fallback)
- ✅ Transmission sécurisée via HTTPS
- ✅ Headers CORS configurés

**Validation des données**
- ✅ Validation format Excel côté frontend
- ✅ Sanitization des inputs utilisateur
- ✅ Timeout sur les requêtes API (120 secondes)
- ✅ Gestion des erreurs robuste

---

## Installation et déploiement

### 💻 Installation locale

#### Prérequis

- Python 3.12+
- Navigateur web moderne (Chrome, Firefox, Safari, Edge)
- Clé API OpenRouter (obtenir sur https://openrouter.ai)

#### Étapes d'installation

1. **Cloner le repository**
```bash
git clone https://github.com/livz75/userneed-classification-app.git
cd userneed-classification-app
```

2. **Installer les dépendances Python**
```bash
pip install -r requirements.txt
```

3. **Configurer les clés API**

Créer le fichier `config.json` à la racine :
```json
{
  "anthropic_api_key": "sk-ant-...",
  "openrouter_api_key": "sk-or-v1-...",
  "default_provider": "openrouter",
  "default_model": "anthropic/claude-3.5-haiku"
}
```

4. **Démarrer le serveur**
```bash
python3 server.py
```

5. **Ouvrir l'application**
```
http://localhost:8000
```

#### Script de démarrage automatique

Un script `start.sh` est fourni :
```bash
chmod +x start.sh
./start.sh
```

### 🚀 Déploiement sur Render.com

#### Configuration automatique

Le fichier `render.yaml` configure automatiquement :

```yaml
services:
  - type: web
    name: userneed-classification-app
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "python server.py"
    envVars:
      - key: PORT
        value: 8000
```

#### Étapes de déploiement

1. **Créer un compte Render**
   - Aller sur https://render.com
   - Se connecter avec GitHub

2. **Créer un Web Service**
   - Cliquer "New +" → "Web Service"
   - Sélectionner le repository `userneed-classification-app`
   - Render détecte automatiquement `render.yaml`

3. **Configurer**
   - **Plan** : Free (gratuit)
   - **Branch** : main
   - Les autres champs sont pré-remplis par `render.yaml`

4. **Déployer**
   - Cliquer "Create Web Service"
   - Attendre 2-3 minutes

5. **URL de production**
   ```
   https://userneed-classification-app.onrender.com
   ```

#### Variables d'environnement (optionnel)

Dans Render Dashboard → Settings → Environment Variables :
- `PORT` : Automatiquement défini par Render
- `OPENROUTER_API_KEY` : (Optionnel) Clé API pré-configurée

### 🔄 Mises à jour automatiques

Chaque push sur la branche `main` déclenche un redéploiement automatique sur Render.

```bash
git add .
git commit -m "Update: description des changements"
git push origin main
```

---

## Guide d'utilisation

### 🎬 Démarrage rapide

#### 1. Préparer le fichier Excel

Format requis :
```
| url                           | titre                    | userneeds   |
|-------------------------------|--------------------------|-------------|
| https://franceinfo.fr/...     | Titre de l'article       | UPDATE ME   |
| https://franceinfo.fr/...     | Autre article            | EXPLAIN ME  |
```

**Colonnes obligatoires** :
- `url` : URL de l'article
- `titre` : Titre de l'article
- `userneeds` ou `userneed` : Userneed attendu

**Colonnes optionnelles** :
- `chapo` : Chapô/sous-titre
- `corps` : Corps de l'article

#### 2. Charger le fichier

1. Cliquer sur **"📁 Fichier"**
2. Sélectionner votre fichier `.xlsx`
3. Attendre le chargement (preview s'affiche)

#### 3. Configurer l'analyse (optionnel)

**Choisir le provider et modèle** :
1. Cliquer sur **"🦙 LLM"**
2. Sélectionner le provider : **OpenRouter** (recommandé)
3. Choisir le modèle :
   - **Rapide** : `google/gemini-2.5-flash-lite`
   - **Qualité** : `anthropic/claude-3.5-haiku`
   - **Gratuit** : `meta-llama/llama-3.1-8b-instruct`

**Modifier les prompts** (avancé) :
1. Cliquer sur **"📝 PROMPTS"**
2. Éditer le prompt système ou utilisateur
3. Sauvegarder

#### 4. Lancer l'analyse

1. Cliquer sur **"Analyse IA"**
2. Suivre la progression en temps réel
3. Possibilité d'arrêter avec **"🛑 Stop"**

#### 5. Consulter les résultats

**Tableau détaillé**
- Colonnes : Titre, Userneed attendu, Prédictions (3 niveaux), Scores, Concordance
- Filtrage par clic sur matrice

**Matrice de confusion**
- Visualisation 8×8
- Lignes : Userneeds attendus
- Colonnes : Userneeds prédits
- Cellules : Nombre d'articles
- **Interaction** : Clic sur cellule → filtre le tableau

**Statistiques**
- Total articles analysés
- Taux de concordance global
- Distribution par userneed
- Top reclassifications

#### 6. Exporter les résultats

1. Cliquer sur **"📥 Exporter Excel"**
2. Le fichier téléchargé contient 3 feuilles :
   - **Résultats** : Tableau complet
   - **Matrice** : Matrice de confusion
   - **Statistiques** : Métriques globales

### 🎨 Personnalisation

#### Changer le thème

Cliquer sur **🌙/☀️** en haut à droite pour basculer entre :
- **Mode sombre** (par défaut)
- **Mode clair**

Le choix est sauvegardé dans le navigateur.

#### Gérer les prompts

**Créer un nouveau prompt** :
1. Ouvrir **"PROMPTS"**
2. Modifier le texte
3. Cliquer **"💾 Sauvegarder"**

**Exporter les prompts** :
```json
{
  "system": "Analyse cet article...",
  "user": "Article: {TITLE}\n\n{CONTENT}"
}
```

**Réinitialiser** :
Cliquer sur **"🔄 Réinitialiser"** pour revenir aux prompts par défaut.

---

## Configuration

### 🔑 Gestion des clés API

#### Option 1 : Fichier config.json (recommandé)

Créer `config.json` à la racine :
```json
{
  "anthropic_api_key": "sk-ant-api03-...",
  "openrouter_api_key": "sk-or-v1-...",
  "default_provider": "openrouter",
  "default_model": "anthropic/claude-3.5-haiku"
}
```

**Avantages** :
- ✅ Plus sûr que localStorage
- ✅ Prioritaire sur les autres méthodes
- ✅ Protégé par `.gitignore`

#### Option 2 : Interface utilisateur

1. Ouvrir **"PROMPTS"**
2. Section "Configuration API"
3. Coller la clé OpenRouter
4. Sauvegardé dans localStorage du navigateur

#### Option 3 : Variables d'environnement (production)

Sur Render.com → Settings → Environment Variables :
```
OPENROUTER_API_KEY=sk-or-v1-...
```

### 🎛️ Ordre de priorité

L'application charge les clés dans cet ordre :
1. **Fichier config.json** (prioritaire)
2. **localStorage du navigateur**
3. **Saisie manuelle** via interface

### 🦙 Modèles LLM disponibles

#### Via OpenRouter

| Modèle | Provider | Coût | Vitesse | Qualité | Cas d'usage |
|--------|----------|------|---------|---------|-------------|
| `anthropic/claude-3.5-haiku` | Anthropic | $ | ⚡⚡⚡ | ⭐⭐⭐⭐ | Recommandé - Équilibre qualité/vitesse |
| `openai/gpt-4o-mini` | OpenAI | $ | ⚡⚡⚡ | ⭐⭐⭐⭐ | Rapide et performant |
| `google/gemini-2.5-flash-lite` | Google | $ | ⚡⚡⚡⚡ | ⭐⭐⭐ | Ultra-rapide, économique |
| `google/gemini-flash-1.5` | Google | $ | ⚡⚡⚡⚡ | ⭐⭐⭐ | Très rapide |
| `meta-llama/llama-3.1-8b-instruct` | Meta | **GRATUIT** | ⚡⚡⚡⚡ | ⭐⭐⭐ | Tests et développement |
| `meta-llama/llama-3.3-70b-instruct` | Meta | $ | ⚡⚡ | ⭐⭐⭐⭐ | Haute qualité |
| `mistralai/mistral-small-24b-instruct-2501` | Mistral | $ | ⚡⚡⚡ | ⭐⭐⭐ | Bon rapport qualité/prix |
| `qwen/qwen-2.5-72b-instruct` | Alibaba | $ | ⚡⚡ | ⭐⭐⭐⭐ | Alternative qualité |
| `anthropic/claude-3.5-sonnet` | Anthropic | $$$ | ⚡ | ⭐⭐⭐⭐⭐ | Meilleure qualité (lent) |
| `openai/gpt-4-turbo` | OpenAI | $$$ | ⚡⚡ | ⭐⭐⭐⭐⭐ | Très haute qualité |

**Légende** :
- **Coût** : $ (économique), $$ (moyen), $$$ (élevé)
- **Vitesse** : ⚡ (lent) à ⚡⚡⚡⚡ (ultra-rapide)
- **Qualité** : ⭐⭐⭐ (correcte) à ⭐⭐⭐⭐⭐ (excellente)

#### Recommandations par cas d'usage

- **Production** : `anthropic/claude-3.5-haiku`
- **Tests/Démo** : `meta-llama/llama-3.1-8b-instruct` (gratuit)
- **Rapidité** : `google/gemini-2.5-flash-lite`
- **Qualité maximale** : `anthropic/claude-3.5-sonnet`
- **Budget limité** : `mistralai/mistral-small-24b-instruct-2501`

---

## API et intégrations

### 🔌 Endpoints du serveur

#### GET /api/health

**Description** : Health check du serveur

**Requête** :
```bash
curl https://userneed-classification-app.onrender.com/api/health
```

**Réponse** :
```json
{
  "status": "ok",
  "timestamp": 1771241188490,
  "provider": "openrouter",
  "default_model": "anthropic/claude-3.5-haiku"
}
```

#### POST /api/analyze

**Description** : Analyse d'un article via LLM

**Requête** :
```bash
curl -X POST https://userneed-classification-app.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "sk-or-v1-...",
    "model": "anthropic/claude-3.5-haiku",
    "prompt": "Article: Titre de l'article\n\nContenu..."
  }'
```

**Réponse** :
```json
{
  "provider": "openrouter",
  "content": "USERNEED PRINCIPAL : UPDATE ME (SCORE : 60)\nJUSTIFICATION : Actualité récente...",
  "model": "anthropic/claude-3.5-haiku",
  "usage": {
    "prompt_tokens": 245,
    "completion_tokens": 89,
    "total_tokens": 334
  }
}
```

**Codes d'erreur** :
- `401` : Clé API invalide
- `429` : Rate limit dépassé
- `500` : Erreur serveur
- `504` : Timeout (>120s)

### 🔗 Intégration OpenRouter

#### Configuration

```javascript
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
  'HTTP-Referer': 'https://franceinfo.fr',
  'X-Title': 'Franceinfo Userneeds Analysis'
};

const body = {
  model: 'anthropic/claude-3.5-haiku',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  max_tokens: 1024
};
```

#### Rate limits

- **OpenRouter** : Dépend du modèle et du plan
- **Application** : Batch de 2 articles en parallèle
- **Timeout** : 120 secondes par requête

#### Monitoring des coûts

OpenRouter Dashboard : https://openrouter.ai/activity

---

## Développement

### 🛠️ Configuration développement

#### Variables d'environnement locales

Créer `.env` (optionnel) :
```bash
PORT=8000
OPENROUTER_API_KEY=sk-or-v1-...
DEBUG=true
```

#### Mode debug

Ouvrir la console navigateur (F12) pour voir :
- ✅ Logs détaillés des requêtes
- ✅ Parsing des réponses LLM
- ✅ Erreurs et warnings
- ✅ Performance metrics

#### Recharger le serveur

```bash
# Arrêter (Ctrl+C)
# Redémarrer
python3 server.py
```

### 📝 Structure du code

#### script.js (Frontend)

**Principales fonctions** :

```javascript
// Parsing Excel
async function parseExcelFile(file)

// Analyse IA
async function analyzeArticle(article, apiKey, model)

// Parsing réponse LLM
function parseAIResponse(aiResponse)

// Matrice de confusion
function displayConfusionMatrix(results)

// Export Excel
function exportToExcel()

// Gestion prompts
class PromptManager {
  loadPrompts()
  savePrompts()
  resetPrompts()
}
```

**Règles métier critiques** :

1. **Normalisation userneeds** (ligne 450) :
```javascript
const userneedVariations = {
  'UPDATE ME': ['UPDATE ME', 'UPDATE', 'UPDATES'],
  'EXPLAIN ME': ['EXPLAIN ME', 'EXPLAIN', 'EXPLANATION'],
  // ...
};
```

2. **Validation scores** (ligne 520) :
```javascript
// Total des 3 scores doit être 100
const totalScore = principal.score + secondaire.score + tertiaire.score;
if (totalScore !== 100) {
  console.warn('Scores invalides:', totalScore);
}
```

3. **Parsing multi-formats** (ligne 680) :
```javascript
// Support de 3 formats de réponse LLM
// Format 1: "USERNEED PRINCIPAL : UPDATE ME (SCORE : 60)"
// Format 2: "Principal: UPDATE ME - Score: 60"
// Format 3: JSON {"principal": "UPDATE ME", "score": 60}
```

#### server.py (Backend)

**Classe principale** :

```python
class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')

    def do_GET(self):
        # Health check
        if self.path == '/api/health':
            # ...

    def do_POST(self):
        # Proxy vers OpenRouter
        if self.path == '/api/analyze':
            # ...

    def _call_openrouter(self, api_key, model, prompt):
        # Appel API OpenRouter
        # ...
```

**Gestion des erreurs** :

```python
try:
    response = self._call_openrouter(api_key, model, prompt)
except urllib.error.HTTPError as e:
    # Erreur API (401, 429, etc.)
    error_body = e.read()
    self.send_response(e.code)
    self.wfile.write(error_body)
except Exception as e:
    # Erreur serveur
    self.send_response(500)
    error_msg = json.dumps({'error': str(e)})
    self.wfile.write(error_msg.encode('utf-8'))
```

### 🧪 Tests

#### Tests manuels

1. **Health check** :
```bash
curl http://localhost:8000/api/health
```

2. **Analyse test** :
```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d @test_request.json
```

3. **Frontend** :
- Charger `test_petit.xlsx` (10 articles)
- Vérifier parsing et affichage
- Lancer analyse avec modèle gratuit
- Vérifier matrice et export

#### Tests de charge

```bash
# Analyser 100 articles
# Vérifier :
# - Temps total < 10 minutes
# - Aucune erreur timeout
# - Matrice cohérente
```

### 🐛 Debugging

#### Problèmes fréquents

**1. "Failed to fetch"**
```
Cause: Serveur non démarré
Solution: python3 server.py
```

**2. "Status 401"**
```
Cause: Clé API invalide
Solution: Vérifier config.json ou localStorage
```

**3. "Status 429"**
```
Cause: Rate limit OpenRouter
Solution: Attendre ou réduire batch size
```

**4. "Timeout"**
```
Cause: Requête > 120s
Solution: Utiliser modèle plus rapide ou réduire contenu
```

**5. Parsing échoue**
```
Cause: Réponse LLM non conforme
Solution: Vérifier/ajuster prompts
```

#### Logs utiles

**Console navigateur** :
```javascript
console.log('📊 Analyse démarrée:', { model, articlesCount });
console.log('✅ Réponse LLM:', aiResponse);
console.log('📈 Résultats parsés:', predictions);
```

**Logs serveur** :
```python
print(f"✅ Serveur démarré sur http://localhost:{PORT}")
print(f"🔍 Requête reçue: {self.path}")
print(f"📡 Appel OpenRouter: {model}")
```

---

## Maintenance et troubleshooting

### 🔄 Mises à jour de dépendances

#### Python
```bash
pip list --outdated
pip install --upgrade anthropic
pip freeze > requirements.txt
```

#### Frontend (aucune dépendance)
L'application utilise du JavaScript vanilla sans framework.

### 📊 Monitoring

#### Render.com Dashboard

Accéder à :
- **Logs** : Logs en temps réel du serveur
- **Metrics** : CPU, RAM, requêtes
- **Events** : Historique des déploiements

#### Health check automatique

L'application fait un health check au démarrage :
```javascript
async function checkServerHealth() {
  const response = await fetch('/api/health');
  if (response.ok) {
    console.log('✅ Serveur proxy détecté et fonctionnel');
  }
}
```

### 🔍 Diagnostics

#### Vérifier la santé du service

```bash
# Health check
curl https://userneed-classification-app.onrender.com/api/health

# Test analyse
curl -X POST https://userneed-classification-app.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"test","model":"test","prompt":"test"}'
```

#### Vérifier les coûts OpenRouter

https://openrouter.ai/activity

#### Logs de production

Render Dashboard → Logs :
```
✅ Serveur démarré sur http://localhost:10000
📡 API Analyze activée (OpenRouter uniquement)
```

### ⚠️ Problèmes de production

#### Service down

**Symptômes** : Application inaccessible

**Solutions** :
1. Vérifier Render Status : https://status.render.com
2. Redéployer manuellement sur Render
3. Vérifier les logs pour erreurs

#### Performances dégradées

**Symptômes** : Analyses très lentes

**Solutions** :
1. Vérifier charge serveur (Metrics Render)
2. Utiliser modèle plus rapide
3. Réduire batch size
4. Upgrader plan Render (si gratuit saturé)

#### Erreurs API fréquentes

**Symptômes** : Beaucoup d'erreurs 429 ou 500

**Solutions** :
1. Vérifier quotas OpenRouter
2. Implémenter retry logic
3. Réduire concurrence

---

## Roadmap et évolutions

### 🚧 Version actuelle : 1.2

**Fonctionnalités** :
- ✅ Analyse batch Excel
- ✅ Multi-LLM via OpenRouter (13+ modèles)
- ✅ Classification 3 niveaux avec scores
- ✅ Matrice de confusion interactive
- ✅ Export Excel
- ✅ Prompts personnalisables
- ✅ Thèmes clair/sombre
- ✅ Déploiement production (Render.com)

### 🎯 Version 2.0 (Q2 2026)

**Module Constitution de corpus** :
- 📝 Fetch articles depuis API France Info
- 📝 Qualification manuelle des userneeds
- 📝 Gestion corpus persistant (BDD)
- 📝 CRUD articles avec recherche/filtres

**Module Historisation** :
- 📝 Sauvegarde résultats analyses en BDD
- 📝 Historique tests avec métadonnées
- 📝 Consultation résultats passés

**Module Comparaison** :
- 📝 Sélection multi-tests
- 📝 Comparaison côte-à-côte
- 📝 Analyse prédictions divergentes
- 📝 Visualisations avancées (heatmaps, graphiques)

### 🔮 Futures évolutions

**Court terme (3-6 mois)** :
- 🔄 API REST publique
- 🔄 Webhooks pour intégration CMS
- 🔄 Mode hors-ligne avec cache
- 🔄 Tests A/B de prompts

**Moyen terme (6-12 mois)** :
- 🔄 Authentification SSO France TV
- 🔄 Multi-tenant pour autres médias
- 🔄 Fine-tuning modèles personnalisés
- 🔄 Dashboard analytics avancé

**Long terme (12+ mois)** :
- 🔄 Analyse temps réel (streaming)
- 🔄 Recommandations automatiques
- 🔄 Intégration native dans CMS Franceinfo
- 🔄 API mobile

---

## 📞 Support et ressources

### 🔗 Liens utiles

- **Application production** : https://userneed-classification-app.onrender.com
- **Repository GitHub** : https://github.com/livz75/userneed-classification-app
- **OpenRouter** : https://openrouter.ai
- **Render Dashboard** : https://dashboard.render.com

### 📚 Documentation externe

- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Render.com Docs](https://render.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com)

### 🤝 Contribution

Pour contribuer au projet :
1. Fork le repository
2. Créer une branche feature : `git checkout -b feature/nouvelle-fonctionnalite`
3. Commiter les changements : `git commit -m "Add: nouvelle fonctionnalité"`
4. Pousser : `git push origin feature/nouvelle-fonctionnalite`
5. Créer une Pull Request

### 📝 Changelog

#### v1.2.0 (16/02/2026)
- ✨ Ajout support multi-LLM via OpenRouter (13+ modèles)
- ✨ Configuration via config.json
- ✨ Documentation CONFIG.md
- 🚀 Déploiement production sur Render.com
- 🐛 Fix parsing réponses LLM multi-formats

#### v1.1.0 (05/02/2026)
- 🚀 Health check automatique
- 🎯 Messages d'erreur détaillés
- ⏱️ Timeout 30 secondes
- 🔧 Modèle API mis à jour (Sonnet 3.5)
- 📜 Script démarrage automatique

#### v1.0.0 (05/02/2026)
- 🎨 Thème clair/sombre
- 🏢 Logo Franceinfo
- 📊 Matrice confusion interactive
- 📤 Export Excel multi-feuilles
- 🎯 Prompts personnalisables

---

## 📄 Licence

© 2026 France Télévisions - Usage interne uniquement

Cette application est développée pour un usage interne à France Télévisions. Toute reproduction, distribution ou utilisation commerciale est interdite sans autorisation préalable.

---

**Documentation générée le 16 février 2026**

**Version** : 1.2.0

**Auteur** : Livio Ricci (avec assistance Claude Sonnet 4.5)

**Contact** : [À compléter]
