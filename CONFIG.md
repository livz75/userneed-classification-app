# Configuration des clés API

## 📁 Fichier de configuration

Les clés API peuvent être stockées dans le fichier `config.json` à la racine du projet. Ce fichier est **déjà configuré** avec votre clé Anthropic.

### Structure du fichier

```json
{
  "anthropic_api_key": "sk-ant-...",
  "openrouter_api_key": "sk-or-...",
  "default_provider": "anthropic",
  "default_model": "anthropic/claude-3.5-haiku"
}
```

## 🔑 Configuration des providers

### Option 1 : Anthropic Direct (par défaut)

Pour utiliser l'API Anthropic directement :

1. Le fichier `config.json` contient déjà votre clé Anthropic
2. `default_provider` est défini sur `"anthropic"`
3. Aucune configuration supplémentaire n'est nécessaire

### Option 2 : OpenRouter

Pour utiliser OpenRouter et tester différents modèles :

1. Créez un compte sur [openrouter.ai](https://openrouter.ai)
2. Obtenez votre clé API OpenRouter (commence par `sk-or-`)
3. Ajoutez-la dans `config.json` :
   ```json
   "openrouter_api_key": "sk-or-VOTRE_CLE_ICI"
   ```
4. (Optionnel) Définissez OpenRouter comme provider par défaut :
   ```json
   "default_provider": "openrouter",
   "default_model": "openai/gpt-4o-mini"
   ```

## 🎯 Modèles disponibles via OpenRouter

| Modèle | Provider | Coût | Vitesse | Description |
|--------|----------|------|---------|-------------|
| `anthropic/claude-3.5-haiku` | Anthropic | $ | ⚡⚡⚡ | Identique à l'API directe |
| `openai/gpt-4o-mini` | OpenAI | $ | ⚡⚡⚡ | Rapide et performant |
| `google/gemini-2.5-flash-lite` | Google | $ | ⚡⚡⚡⚡ | Version allégée ultra-rapide |
| `google/gemini-flash-1.5` | Google | $ | ⚡⚡⚡⚡ | Ultra-rapide, économique |
| `meta-llama/llama-3.1-8b-instruct` | Meta | **GRATUIT** | ⚡⚡⚡⚡ | Parfait pour les tests |
| `meta-llama/llama-3.3-70b-instruct` | Meta | $ | ⚡⚡ | Qualité élevée |
| `mistralai/mistral-small-24b-instruct-2501` | Mistral | $ | ⚡⚡⚡ | Bon rapport qualité/prix |
| `qwen/qwen-2.5-72b-instruct` | Alibaba | $ | ⚡⚡ | Alternative qualité |

## 🔄 Changement de provider via l'interface

Même si vous configurez un provider par défaut dans `config.json`, vous pouvez toujours :

1. Cliquer sur le bouton **PROMPTS** dans l'interface
2. Sélectionner un provider différent dans le dropdown
3. Changer de modèle (pour OpenRouter)
4. Les préférences UI sont sauvegardées dans le navigateur

## 🔒 Sécurité

- ✅ Le fichier `config.json` est dans `.gitignore` (jamais committé)
- ✅ Les clés ne sont jamais exposées dans l'interface
- ✅ Utiliser `config.json` est plus sûr que localStorage
- ✅ Un fichier `config.json.example` est fourni comme template

## 💡 Ordre de priorité

L'application charge les clés dans cet ordre :

1. **Fichier `config.json`** (prioritaire) ✨
2. **localStorage du navigateur** (fallback)
3. **Saisie manuelle** via l'interface (sauvegardé dans localStorage)

## 🚀 Démarrage rapide

Votre configuration actuelle :
- ✅ Clé Anthropic : Configurée dans `config.json`
- ⚠️ Clé OpenRouter : Non configurée (optionnel)

Pour tester OpenRouter :
1. Ajoutez votre clé dans `config.json`
2. Redémarrez le serveur : `python3 server.py`
3. Rechargez l'interface dans le navigateur
4. Ouvrez PROMPTS → sélectionnez OpenRouter
