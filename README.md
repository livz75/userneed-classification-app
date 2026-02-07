# Application d'Analyse IA des Userneeds Franceinfo

Application web pour l'analyse automatique et la classification des articles Franceinfo selon leurs "user needs" en utilisant l'IA Claude (Anthropic).

## 🚀 Démarrage Rapide

### Méthode 1 : Script Automatique (Recommandé)

```bash
./start.sh
```

Le script va :
- Vérifier que Python 3 est installé
- Détecter si le port 8000 est libre
- Démarrer le serveur automatiquement
- Ouvrir l'application sur http://localhost:8000

### Méthode 2 : Démarrage Manuel

1. **Ouvrir un terminal**

2. **Naviguer vers le dossier du projet :**
   ```bash
   cd "/Users/livioricci/Documents/FRANCETV/App qualif user needs"
   ```

3. **Démarrer le serveur :**
   ```bash
   python3 server.py
   ```

4. **Ouvrir l'application dans le navigateur :**
   ```
   http://localhost:8000
   ```

5. **Arrêter le serveur (quand terminé) :**
   - Dans le terminal : `Ctrl + C`

## 📋 Prérequis

### Obligatoires

- **Python 3** (testé avec Python 3.9+)
  ```bash
  python3 --version
  ```
  Si non installé : https://www.python.org/downloads/

- **Clé API Anthropic** (Claude)
  - Obtenir une clé sur : https://console.anthropic.com/
  - Ajouter la clé dans `config.json`

### Vérification de la Configuration

Le fichier `config.json` doit contenir votre clé API :

```json
{
  "apiKey": "sk-ant-api03-VOTRE_CLE_API_ICI"
}
```

⚠️ **Important :** Ne partagez jamais votre clé API publiquement !

## 🎯 Utilisation

### 1. Charger un fichier Excel

- Cliquez sur le bouton "📁 Fichier"
- Sélectionnez un fichier `.xlsx` contenant les articles
- Format attendu :
  - Colonne `url` : URL de l'article
  - Colonne `titre` : Titre de l'article
  - Colonne `userneeds` ou `userneed` : User need attendu

### 2. Lancer l'analyse

- Cliquez sur "Analyse IA"
- L'IA va analyser chaque article et prédire son user need
- Progression affichée en temps réel

### 3. Consulter les résultats

- **Tableau détaillé** : Tous les articles avec prédictions
- **Matrice de confusion** : Visualisation des concordances/erreurs
- **Statistiques** : Taux de concordance, distribution, etc.

### 4. Filtrer les résultats

- Cliquez sur une cellule de la matrice de confusion
- Le tableau se filtre pour afficher uniquement les articles correspondants
- Cliquez à nouveau pour désactiver le filtre

### 5. Exporter

- Cliquez sur "📥 Exporter Excel"
- Téléchargez le fichier avec tous les résultats

## 🎨 Thèmes

Basculez entre thème sombre et clair avec le bouton 🌙/☀️ en haut à droite.

## ⚙️ Configuration Avancée

### Modifier les Prompts

Cliquez sur le bouton "PROMPTS" pour personnaliser :
- Prompt système (contexte et instructions)
- Prompt utilisateur (format de la requête)
- Réinitialiser aux valeurs par défaut

### Modèle IA Utilisé

- **Modèle :** Claude 3.5 Sonnet (20241022)
- **Max tokens :** 1024
- Configuré dans `server.py` (lignes 35-36)

## 🛠️ Dépannage

### Erreur "Failed to fetch"

**Cause :** Le serveur n'est pas démarré

**Solution :**
```bash
python3 server.py
```

### Port 8000 déjà utilisé

**Solution :**
```bash
# Trouver le processus qui utilise le port
lsof -i :8000

# Arrêter le processus
kill -9 <PID>

# Redémarrer le serveur
python3 server.py
```

### Clé API invalide (Status 401)

**Cause :** Clé API incorrecte ou expirée

**Solution :**
1. Vérifiez `config.json`
2. Obtenez une nouvelle clé sur https://console.anthropic.com/
3. Remplacez la clé dans `config.json`

### Limite de requêtes (Status 429)

**Cause :** Quota API dépassé

**Solution :**
- Attendez quelques minutes
- Vérifiez votre plan sur console.anthropic.com

### Timeout

**Cause :** Connexion lente ou article très long

**Solution :**
- Vérifiez votre connexion Internet
- Le timeout est fixé à 30 secondes (configurable dans `script.js`)

## 📁 Structure du Projet

```
.
├── index.html          # Interface utilisateur
├── style.css           # Styles (thèmes clair/sombre)
├── script.js           # Logique de l'application
├── server.py           # Serveur proxy Python
├── config.json         # Configuration (clé API)
├── start.sh            # Script de démarrage automatique
└── README.md           # Documentation (ce fichier)
```

## 🔒 Sécurité

- ⚠️ La clé API est stockée en clair dans `config.json`
- Ne committez jamais `config.json` dans Git
- Ne partagez jamais votre clé API
- Pour la production, utilisez des variables d'environnement

## 🆕 Fonctionnalités

### ✅ Implémentées

- Analyse IA avec Claude 3.5 Sonnet
- Matrice de confusion interactive
- Filtrage des résultats par clic
- Export Excel complet
- Thèmes clair/sombre
- Health check automatique du serveur
- Gestion d'erreur robuste avec messages détaillés
- Timeout configurable (30s)
- Prompts personnalisables
- Logs détaillés de l'analyse

### 🚧 À Venir

- Analyse en batch optimisée
- Mode hors ligne avec cache
- Multi-modèles (GPT, Mistral, etc.)
- Statistiques avancées
- Graphiques interactifs
- Comparaison de modèles

## 📊 User Needs Supportés

L'application reconnaît et classe selon 8 user needs :

1. **UPDATE ME** - Actualités et mises à jour
2. **GIVE ME PERSPECTIVE** - Analyses et contexte
3. **KEEP ME ON TREND** - Tendances et popularité
4. **EDUCATE ME** - Contenu éducatif
5. **INSPIRE ME** - Inspiration et découverte
6. **ENTERTAIN ME** - Divertissement
7. **CONNECT ME** - Communauté et interaction
8. **HELP ME** - Aide et solutions pratiques

## 🤝 Support

Pour toute question ou problème :
1. Vérifiez la section "Dépannage" ci-dessus
2. Consultez les logs dans la console du navigateur (F12)
3. Vérifiez les logs du serveur dans le terminal

## 📝 Changelog

### Version 1.1 (5 février 2026)
- 🚀 **Nouveau** : Health check automatique au démarrage
- 🎯 **Amélioration** : Messages d'erreur détaillés et actionnables
- ⏱️ **Amélioration** : Timeout configuré à 30 secondes
- 🔧 **Correction** : Modèle API mis à jour (Haiku → Sonnet 3.5)
- 🔢 **Correction** : Max tokens augmenté (100 → 1024)
- 📜 **Nouveau** : Script de démarrage automatique `start.sh`
- 📚 **Nouveau** : Documentation complète (README.md)

### Version 1.0 (5 février 2026)
- 🎨 Thème clair/sombre
- 🏢 Logo Franceinfo dans le header
- 📊 Matrice de confusion interactive avec filtrage
- 🔤 Police Poppins
- 📤 Export Excel
- 🎯 Prompts personnalisables

## 📜 Licence

© 2026 France Télévisions - Usage interne uniquement
