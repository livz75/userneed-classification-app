# Configuration de l'application

## Fichier config.json (développement local)

Créez le fichier `config.json` à la racine du projet. Ce fichier est dans `.gitignore` et ne doit **jamais être versionné**.

```json
{
  "supabase_url": "https://xxxx.supabase.co",
  "supabase_anon_key": "eyJ...",
  "openrouter_api_key": "sk-or-..."
}
```

| Clé | Description | Où l'obtenir |
|-----|-------------|--------------|
| `supabase_url` | URL du projet Supabase | Dashboard Supabase → Project Settings → API |
| `supabase_anon_key` | Clé publique Supabase (anon/public, format `sb_publishable_...`) | Dashboard Supabase → Project Settings → API |
| `openrouter_api_key` | Clé API OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) |

## Variables d'environnement (production — Render.com)

En production, la configuration est fournie via des variables d'environnement, accessibles via l'endpoint `/api/config`.

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique Supabase (format `sb_publishable_...`) |
| `OPENROUTER_API_KEY` | Clé API OpenRouter |
| `DEFAULT_MODEL` | Modèle LLM par défaut (ex. `anthropic/claude-3.5-haiku`) |
| `FRANCEINFO_PROXY_URL` | URL du proxy pour récupérer les articles Franceinfo |
| `BASIC_AUTH_USER` | Identifiant pour l'authentification HTTP Basic |
| `BASIC_AUTH_PASSWORD` | Mot de passe pour l'authentification HTTP Basic |
| `PORT` | Port d'écoute (géré automatiquement par Render) |

Ces variables se configurent dans le dashboard Render : **Service → Environment**.

## Variables d'environnement (Hostinger VPS)

Sur le VPS Hostinger, la configuration se fait via le fichier `config.json` situé à `/opt/userneed-classification-app/config.json`. Ce fichier suit le même format que le `config.json` local :

```json
{
  "supabase_url": "https://xxxx.supabase.co",
  "supabase_anon_key": "sb_publishable_...",
  "openrouter_api_key": "sk-or-..."
}
```

Pour l'authentification HTTP Basic, les variables `BASIC_AUTH_USER` et `BASIC_AUTH_PASSWORD` sont définies en tant que variables d'environnement shell lors du lancement de `server.py` :

```bash
BASIC_AUTH_USER=mon_user BASIC_AUTH_PASSWORD=mon_mdp python3 server.py
```

Alternativement, elles peuvent être exportées dans le profil shell ou le fichier de service systemd.

## Ordre de priorité au chargement

```
1. config.json (local)                          ← prioritaire en développement
2. config.json Hostinger (/opt/userneed-...)     ← utilisé sur le VPS Hostinger
3. /api/config (variables Render)                ← utilisé en production Render
4. localStorage du navigateur                    ← fallback pour la clé OpenRouter
5. Saisie manuelle dans l'UI                     ← sauvegardée dans localStorage
```

## Sécurité

- ✅ `config.json` est dans `.gitignore`
- ✅ La clé OpenRouter transite uniquement par le serveur Python (`/api/analyze`)
- ✅ La clé n'est jamais exposée dans le code source ni dans les logs
- ⚠️ Supabase utilise une clé `anon` publique — les politiques RLS limitent les accès
