#!/usr/bin/env python3
import http.server
import socketserver
import json
import ssl
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs, quote
import os
import re
import base64
from html import unescape

import anthropic

PORT = int(os.environ.get('PORT', 8000))

# Basic Auth credentials (depuis les variables d'environnement)
BASIC_AUTH_USER = os.environ.get('BASIC_AUTH_USER', '')
BASIC_AUTH_PASSWORD = os.environ.get('BASIC_AUTH_PASSWORD', '')

def is_auth_enabled():
    """Auth activée uniquement si les deux variables sont définies."""
    return bool(BASIC_AUTH_USER and BASIC_AUTH_PASSWORD)


# Routes accessibles sans mot de passe : santé du serveur et tableau de bord
# public Présidentielle 2027 (page + données agrégées, en lecture seule).
PUBLIC_DASHBOARD_PATHS = ('/tableau-de-bord', '/tableau-de-bord/')
PUBLIC_PATHS = {'/api/health', '/api/public/presidentielle', *PUBLIC_DASHBOARD_PATHS}


# ── Classification directe via l'API Anthropic (page Présidentielle 2027) ──
# La clé reste côté serveur : variable d'environnement ANTHROPIC_API_KEY
# (dashboard Render en prod, `export` en local). Jamais dans config.json,
# qui est servi tel quel au navigateur.
ANTHROPIC_MODEL = 'claude-sonnet-5-5'
USERNEED_LABELS = [
    'UPDATE ME', 'EXPLAIN ME', 'GIVE ME PERSPECTIVE', 'SUMMARIZE', 'VERIFY',
    'FEEL', 'GUIDE ME', 'INSPIRE ME', 'DIVERT ME',
]
# Sortie structurée : garantit un JSON valide au format attendu par le prompt V7
# (même ordre de champs : le raisonnement avant le verdict).
USERNEED_OUTPUT_SCHEMA = {
    'type': 'object',
    'properties': {
        'cheminement': {'type': 'string'},
        'justification': {'type': 'string'},
        'user_need': {'type': 'string', 'enum': USERNEED_LABELS},
        'confidence': {'type': 'number'},
    },
    'required': ['cheminement', 'justification', 'user_need', 'confidence'],
    'additionalProperties': False,
}

_anthropic_client = None


def get_anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        if not os.environ.get('ANTHROPIC_API_KEY'):
            return None
        # Clé non rattachée à un workspace : l'API exige l'en-tête anthropic-workspace-id.
        workspace_id = os.environ.get('ANTHROPIC_WORKSPACE_ID')
        headers = {'anthropic-workspace-id': workspace_id} if workspace_id else None
        _anthropic_client = anthropic.Anthropic(max_retries=4, timeout=120.0, default_headers=headers)
    return _anthropic_client


def format_article_for_llm(titre, chapo, corps):
    def field(v):
        v = (v or '').strip()
        return v if v else 'non renseigné'
    return (
        '<article>\n'
        f'TITRE : {field(titre)}\n\n'
        f'CHAPÔ : {field(chapo)}\n\n'
        f'TEXTE :\n{field(corps)}\n'
        '</article>'
    )


def classify_with_anthropic(system_prompt, titre, chapo, corps, effort='medium'):
    client = get_anthropic_client()
    if client is None:
        raise RuntimeError('ANTHROPIC_API_KEY non configurée sur le serveur')

    response = client.beta.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=8000,
        betas=['server-side-fallback-2026-07-01'],
        fallbacks='default',
        # Prompt identique d'un article à l'autre : mis en cache (lecture ~10 % du prix).
        system=[{'type': 'text', 'text': system_prompt, 'cache_control': {'type': 'ephemeral'}}],
        messages=[{'role': 'user', 'content': format_article_for_llm(titre, chapo, corps)}],
        output_config={
            'effort': effort,
            'format': {'type': 'json_schema', 'schema': USERNEED_OUTPUT_SCHEMA},
        },
    )

    if response.stop_reason == 'refusal':
        category = response.stop_details.category if response.stop_details else None
        raise RuntimeError(f'Refus du modèle (catégorie : {category})')
    if response.stop_reason == 'max_tokens':
        raise RuntimeError('Réponse tronquée (max_tokens atteint)')

    text = next((b.text for b in response.content if b.type == 'text'), '')
    result = json.loads(text)
    usage = response.usage
    return {
        'result': result,
        'raw': text,
        'model': response.model,
        'request_id': response._request_id,
        'usage': {
            'input_tokens': usage.input_tokens,
            'output_tokens': usage.output_tokens,
            'cache_read_input_tokens': usage.cache_read_input_tokens or 0,
            'cache_creation_input_tokens': usage.cache_creation_input_tokens or 0,
        },
    }

# ── Tableau de bord public Présidentielle 2027 ──
# Données lues côté serveur (aucune clé envoyée au navigateur), réduites aux
# champs affichés, et mises en cache : la page est publique et le rôle anon
# de Supabase a un statement_timeout de 3 s.
PUBLIC_TAG = 'Présidentielle 2027'
PUBLIC_RUN_PREFIX = 'Présidentielle 2027'
PUBLIC_CACHE_SECONDS = 600
_public_cache = {'at': 0, 'payload': None}

RUBRIQUES = {
    'elections': 'Élections', 'politique': 'Politique', 'replay-jt': 'Replay JT',
    'replay-magazine': 'Replay magazine', 'replay-radio': 'Replay radio',
}


def supabase_config():
    try:
        with open('config.json') as f:
            config = json.load(f)
    except FileNotFoundError:
        config = {}
    return (os.environ.get('SUPABASE_URL') or config.get('supabase_url', ''),
            os.environ.get('SUPABASE_ANON_KEY') or config.get('supabase_anon_key', ''))


def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def _supabase_get(query, attempts=2):
    url, key = supabase_config()
    if not url or not key:
        raise RuntimeError('Supabase non configuré (SUPABASE_URL / SUPABASE_ANON_KEY)')
    req = urllib.request.Request(f'{url}/rest/v1/{query}', headers={
        'apikey': key, 'Authorization': f'Bearer {key}', 'Accept': 'application/json'})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=30, context=_ssl_context()) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError:
            if attempt == attempts - 1:
                raise


def decision_step(cheminement):
    """Dernière étape du cheminement qui porte un verdict (« É4:FEEL → É5:non atteint » → 4)."""
    steps = [m for m in re.finditer(r'É\s*(\d)\s*:\s*([^→]+)', cheminement or '')
             if not re.match(r'\s*non\b', m.group(2), re.I)]
    return int(steps[-1].group(1)) if steps else None


def build_public_presidentielle():
    runs = _supabase_get('test_runs?select=id&llm_model=eq.' + ANTHROPIC_MODEL
                         + '&name=like.' + quote(PUBLIC_RUN_PREFIX + '*'))
    run_ids = {r['id'] for r in runs}

    rows, offset, page = [], 0, 200
    tag_filter = quote('{"' + PUBLIC_TAG + '"}')
    while True:
        batch = _supabase_get(
            'articles?select=external_id,titre,url,date_publication,word_count,tags,'
            'human_classifications(userneed,classified_at),'
            'ai_analyses(test_run_id,predicted_userneed,justification,predictions,icp,confidence_level,analyzed_at)'
            f'&tags=cs.{tag_filter}&order=date_publication.desc&limit={page}&offset={offset}')
        rows += batch
        if len(batch) < page:
            break
        offset += page

    articles, to_classify = [], 0
    for a in rows:
        sonnet = sorted((r for r in a.get('ai_analyses') or [] if r['test_run_id'] in run_ids),
                        key=lambda r: r.get('analyzed_at') or '', reverse=True)
        if not sonnet:
            to_classify += 1
            continue
        s = sonnet[0]
        pred = (s.get('predictions') or [{}])[0] or {}
        confidence = pred.get('confidence')
        if confidence is None and s.get('icp') is not None:
            confidence = s['icp'] / 100
        url = a.get('url') or ''
        section = url.split('/')[3] if url.count('/') >= 4 else ''
        articles.append({
            'id': a['external_id'],
            'date': a['date_publication'],
            'rubrique': RUBRIQUES.get(section, 'Autres rubriques'),
            'titre': a.get('titre') or '',
            'url': url,
            'nb_mots': a.get('word_count'),
            'user_need': s['predicted_userneed'],
            'confiance': confidence,
            'niveau': (s.get('confidence_level') or '').capitalize(),
            'etape': decision_step(pred.get('cheminement')),
            'justification': s.get('justification') or '',
            'tags': a.get('tags') or [],
            'valide': bool(a.get('human_classifications')),
        })
    return {
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'tag': PUBLIC_TAG,
        'model': ANTHROPIC_MODEL,
        'a_classer': to_classify,
        'articles': articles,
    }


def public_presidentielle_payload():
    now = time.time()
    if _public_cache['payload'] is None or now - _public_cache['at'] > PUBLIC_CACHE_SECONDS:
        _public_cache['payload'] = json.dumps(build_public_presidentielle(), ensure_ascii=False).encode('utf-8')
        _public_cache['at'] = now
    return _public_cache['payload']


class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):

    def _check_auth(self):
        """Vérifie le header Authorization. Retourne True si OK, False sinon."""
        if not is_auth_enabled():
            return True

        # Seules les routes publiques échappent au mot de passe. Les /api/ restent
        # protégées : elles exposent des clés (/api/config) et des appels payants
        # (/api/classify-anthropic). Le navigateur renvoie de lui-même les
        # identifiants Basic Auth saisis au chargement de la page pour les fetch().
        if urlparse(self.path).path in PUBLIC_PATHS:
            return True

        auth_header = self.headers.get('Authorization', '')

        if not auth_header.startswith('Basic '):
            self._send_auth_required()
            return False

        try:
            encoded_credentials = auth_header.split(' ', 1)[1]
            decoded = base64.b64decode(encoded_credentials).decode('utf-8')
            username, password = decoded.split(':', 1)

            if username == BASIC_AUTH_USER and password == BASIC_AUTH_PASSWORD:
                return True
        except Exception:
            pass

        self._send_auth_required()
        return False

    def _send_auth_required(self):
        """Envoie une réponse 401 avec le challenge Basic Auth."""
        self.send_response(401)
        self.send_header('WWW-Authenticate', 'Basic realm="Accès protégé - Qualification Userneeds"')
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(b'<h1>401 - Authentification requise</h1>')

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        """OPTIONS ne nécessite pas d'auth (preflight CORS)."""
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if not self._check_auth():
            return

        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'ok',
                'timestamp': int(__import__('time').time() * 1000),
                'provider': 'openrouter',
                'default_model': 'anthropic/claude-haiku-4.5'
            }).encode('utf-8'))
            return

        elif path in PUBLIC_DASHBOARD_PATHS:
            with open('tableau-de-bord.html', 'rb') as f:
                body = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(body)
            return

        elif path == '/api/public/presidentielle':
            try:
                body, status = public_presidentielle_payload(), 200
            except Exception as e:
                print(f'⚠️  /api/public/presidentielle : {type(e).__name__}: {e}')
                body, status = json.dumps({'error': 'Données momentanément indisponibles'}).encode('utf-8'), 502
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'public, max-age=300')
            self.end_headers()
            self.wfile.write(body)
            return

        elif path == '/api/config':
            # Retourne la config depuis les variables d'environnement (pour Render)
            config = {}
            if os.environ.get('SUPABASE_URL'):
                config['supabase_url'] = os.environ['SUPABASE_URL']
            if os.environ.get('SUPABASE_ANON_KEY'):
                config['supabase_anon_key'] = os.environ['SUPABASE_ANON_KEY']
            if os.environ.get('OPENROUTER_API_KEY'):
                config['openrouter_api_key'] = os.environ['OPENROUTER_API_KEY']
            if os.environ.get('DEFAULT_MODEL'):
                config['default_model'] = os.environ['DEFAULT_MODEL']

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(config).encode('utf-8'))
            return

        else:
            super().do_GET()

    def _call_openrouter(self, api_key, model, prompt, system=None, max_tokens=4096):
        """Call OpenRouter API with specified model.
        If system is None, uses the default classification system message.
        If system is an empty string, sends no system message.
        Otherwise uses the provided system message.
        """
        api_url = 'https://openrouter.ai/api/v1/chat/completions'

        default_system = """Analyse cet article et détermine OBLIGATOIREMENT le userneed principal, un userneed secondaire et un userneed tertiaire parmi ces options, et donne à chacun un score (le total des 3 scores doit être égal à 100).

OPTIONS :
- UPDATE ME
- SUMMARIZE
- EXPLAIN ME
- GIVE ME PERSPECTIVE
- DIVERT ME
- GUIDE ME
- INSPIRE ME
- FEEL
- VERIFY

IMPORTANT : Réponds EXACTEMENT avec ce format (ne rajoute rien d'autre) :

USERNEED PRINCIPAL : [nom exact] (SCORE : [nombre])
JUSTIFICATION : [explication en 10 mots maximum]

USERNEED SECONDAIRE : [nom exact] (SCORE : [nombre])
JUSTIFICATION : [explication en 10 mots maximum]

USERNEED TERTIAIRE : [nom exact] (SCORE : [nombre])
JUSTIFICATION : [explication en 10 mots maximum]

Règle CRITIQUE : Le total des 3 scores doit être exactement égal à 100."""

        if system is None:
            system_message = default_system
        else:
            system_message = system  # peut être "" pour aucun system message

        messages = []
        if system_message:
            messages.append({'role': 'system', 'content': system_message})
        messages.append({'role': 'user', 'content': prompt})

        api_data = json.dumps({
            'model': model,
            'messages': messages,
            'max_tokens': min(int(max_tokens), 32000)
        }).encode('utf-8')

        req = urllib.request.Request(api_url, data=api_data, method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Authorization', f'Bearer {api_key}')
        req.add_header('HTTP-Referer', 'https://franceinfo.fr')
        req.add_header('X-Title', 'Franceinfo Userneeds Analysis')

        with urllib.request.urlopen(req) as response:
            openrouter_response = json.loads(response.read())

            # Transformer pour compatibilité frontend
            transformed_response = {
                'provider': 'openrouter',
                'content': openrouter_response['choices'][0]['message']['content'],
                'model': model,
                'usage': openrouter_response.get('usage', {})
            }

            return json.dumps(transformed_response).encode('utf-8')

    # Ordre des rangs attendu par le frontend (parseAIResponse produit le même)
    _DECISION_RANKS = ['principal', 'secondaire', 'tertiaire']

    def _call_openrouter_decisions(self, api_key, model, state, instructions, criteria):
        """Appelle l'API Decisions d'OpenRouter (/api/alpha/decisions).

        Les modèles de décision (Jev) ne répondent PAS sur chat/completions : ils
        prennent une question typée et renvoient une probabilité par option, sans
        aucun texte ni raisonnement. On convertit ici cette réponse dans le même
        contrat `predictions` que celui produit par parseAIResponse côté front,
        pour que rien en aval n'ait à connaître la différence.
        """
        api_url = 'https://openrouter.ai/api/alpha/decisions'

        default_instructions = (
            "Quel est le besoin principal (userneed) auquel cet article répond pour le lecteur ?"
        )

        api_data = json.dumps({
            'model': model,
            'state': state,
            'questions': {
                'userneed': {
                    'type': 'choice',
                    'instructions': instructions or default_instructions,
                    'criteria': criteria
                }
            }
        }).encode('utf-8')

        req = urllib.request.Request(api_url, data=api_data, method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Authorization', f'Bearer {api_key}')
        req.add_header('HTTP-Referer', 'https://franceinfo.fr')
        req.add_header('X-Title', 'Franceinfo Userneeds Analysis')

        with urllib.request.urlopen(req) as response:
            decisions_response = json.loads(response.read())

            answer = decisions_response.get('answers', {}).get('userneed', {})
            probabilities = answer.get('probabilities') or {}

            # Filet : si le modèle n'a renvoyé que le choix retenu, on le traite
            # comme une distribution à une seule entrée plutôt que d'échouer.
            if not probabilities and answer.get('choice'):
                probabilities = {answer['choice']: answer.get('confidence', 1.0)}

            ranked = sorted(probabilities.items(), key=lambda kv: kv[1], reverse=True)

            # Complète jusqu'à 3 entrées avec les options restantes (probabilité nulle) :
            # le frontend n'affiche la vue détaillée que s'il reçoit bien 3 rangs.
            if len(ranked) < 3:
                already = {name for name, _ in ranked}
                ranked += [(name, 0.0) for name in criteria if name not in already]

            predictions = [
                {
                    # Probabilités brutes × 100, sans renormalisation : la somme des
                    # 3 rangs reste volontairement < 100, le reste étant réparti sur
                    # les 6 autres userneeds. Choix produit assumé (cf. ICP).
                    'userneed': name,
                    'score': int(round(prob * 100)),
                    'rank': self._DECISION_RANKS[i],
                    'justification': ''
                }
                for i, (name, prob) in enumerate(ranked[:3])
            ]

            transformed_response = {
                'provider': 'openrouter',
                'content': None,
                'model': decisions_response.get('model', model),
                'usage': decisions_response.get('usage', {}),
                'predictions': predictions,
                'probabilities': probabilities,
                'jevConfidence': answer.get('confidence')
            }

            return json.dumps(transformed_response).encode('utf-8')

    def do_POST(self):
        if not self._check_auth():
            return

        # Unified analyze endpoint - OpenRouter only
        if self.path == '/api/analyze':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                request_data = json.loads(post_data.decode('utf-8'))
                api_key = request_data['apiKey']
                # Absent pour les modèles de décision : la question est portée par
                # `instructions` + `criteria`, pas par un prompt libre.
                prompt = request_data.get('prompt', '')
                model = request_data.get('model', 'anthropic/claude-haiku-4.5')
                system = request_data.get('system', None)
                max_tokens = request_data.get('max_tokens', 4096)

                # Les modèles de décision passent par un autre endpoint OpenRouter,
                # avec un format de requête et de réponse entièrement différent.
                if request_data.get('api') == 'decisions':
                    response_data = self._call_openrouter_decisions(
                        api_key,
                        model,
                        request_data.get('state', {}),
                        request_data.get('instructions', ''),
                        request_data.get('criteria', {})
                    )
                else:
                    response_data = self._call_openrouter(api_key, model, prompt, system=system, max_tokens=max_tokens)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response_data)

            except urllib.error.HTTPError as e:
                error_body = e.read()
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(error_body)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_msg = json.dumps({'error': str(e)}).encode('utf-8')
                self.wfile.write(error_msg)
        elif self.path == '/api/classify-anthropic':
            try:
                content_length = int(self.headers['Content-Length'])
                request_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
                system_prompt = (request_data.get('system') or '').strip()
                if not system_prompt:
                    raise ValueError('Prompt système manquant')
                effort = request_data.get('effort', 'medium')
                if effort not in ('low', 'medium', 'high', 'xhigh', 'max'):
                    raise ValueError(f'Effort invalide : {effort}')
                payload = classify_with_anthropic(
                    system_prompt,
                    request_data.get('titre', ''),
                    request_data.get('chapo', ''),
                    request_data.get('corps', ''),
                    effort=effort,
                )
                status = 200
            except ValueError as e:
                status, payload = 400, {'error': str(e)}
            except RuntimeError as e:
                status, payload = 503 if 'ANTHROPIC_API_KEY' in str(e) else 502, {'error': str(e)}
            except anthropic.RateLimitError as e:
                status, payload = 429, {'error': f'Limite de débit Anthropic : {e.message}'}
            except anthropic.APIStatusError as e:
                status, payload = 502, {'error': f'API Anthropic ({e.status_code}) : {e.message}'}
            except anthropic.APIConnectionError:
                status, payload = 502, {'error': "API Anthropic injoignable"}
            except Exception as e:
                status, payload = 500, {'error': f'{type(e).__name__}: {e}'}

            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))

        elif self.path == '/api/add-article':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                request_data = json.loads(post_data.decode('utf-8'))
                article_input = request_data.get('article_id', '').strip()

                # Accepter un ID numérique ou une URL complète
                m = re.search(r'(\d{5,10})', article_input)
                if not m:
                    raise ValueError("ID article invalide. Entrez un ID numérique ou une URL Franceinfo.")
                ext_id = m.group(1)

                # Si c'est une URL, l'utiliser directement, sinon construire l'URL de recherche
                if article_input.startswith('http'):
                    article_url = article_input.split('#')[0].split('?')[0]
                else:
                    # On ne peut pas construire l'URL sans le slug, on cherche via l'API
                    raise ValueError("Veuillez entrer l'URL complète de l'article Franceinfo.")

                # Vérifier si l'article existe déjà en base
                # Charger config depuis config.json (local) ou env vars (Render)
                try:
                    config = json.load(open('config.json'))
                except FileNotFoundError:
                    config = {
                        'supabase_url': os.environ.get('SUPABASE_URL', ''),
                        'supabase_anon_key': os.environ.get('SUPABASE_ANON_KEY', ''),
                    }
                check_req = urllib.request.Request(
                    f'{config["supabase_url"]}/rest/v1/articles?external_id=eq.{ext_id}&select=id,titre',
                    headers={
                        'apikey': config['supabase_anon_key'],
                        'Authorization': f'Bearer {config["supabase_anon_key"]}',
                        'Accept': 'application/json',
                    }
                )
                with urllib.request.urlopen(check_req, timeout=15) as resp:
                    existing = json.loads(resp.read(), strict=False)

                if existing:
                    result = {'status': 'exists', 'message': f'Article déjà en base : {existing[0]["titre"]}', 'id': existing[0]['id']}
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode('utf-8'))
                    return

                # Scraper l'article
                from fetch_articles import scrape_article_body
                body, media_type, tags = scrape_article_body(article_url)
                # Nettoyer les caractères de contrôle qui cassent le JSON
                if body:
                    body = re.sub(r'[\x00-\x1f\x7f]', ' ', body)

                # Récupérer titre et chapô depuis les meta tags
                meta_req = urllib.request.Request(article_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'text/html',
                })
                with urllib.request.urlopen(meta_req, timeout=15) as resp:
                    html = resp.read().decode('utf-8', errors='replace')

                title_match = re.search(r'<meta property="og:title" content="([^"]+)"', html)
                desc_match = re.search(r'<meta property="og:description" content="([^"]+)"', html)
                titre = re.sub(r'[\x00-\x1f\x7f]', ' ', unescape(title_match.group(1))) if title_match else ''
                chapo = re.sub(r'[\x00-\x1f\x7f]', ' ', unescape(desc_match.group(1))) if desc_match else ''

                # Extraire les dates de publication/modification depuis les meta tags
                pub_date_match = re.search(r'<meta property="article:published_time" content="([^"]+)"', html)
                mod_date_match = re.search(r'<meta property="article:modified_time" content="([^"]+)"', html)
                date_publication = pub_date_match.group(1) if pub_date_match else None
                date_modification = mod_date_match.group(1) if mod_date_match else None
                # Fallback : utiliser la date courante si aucune date trouvée
                if not date_publication:
                    from datetime import datetime, timezone
                    date_publication = datetime.now(timezone.utc).isoformat()

                path_part = article_url.replace('https://www.franceinfo.fr/', '')
                path = '/'.join(path_part.split('/')[:-1])

                # Insérer dans Supabase
                article_data = json.dumps({
                    'external_id': ext_id,
                    'titre': titre,
                    'chapo': chapo,
                    'corps': body or '',
                    'url': article_url,
                    'auteur': None,
                    'path': path,
                    'word_count': len(body.split()) if body else 0,
                    'date_publication': date_publication,
                    'date_modification': date_modification,
                    'metadata': {'media_type': media_type or 'article'},
                    'tags': tags,
                }).encode('utf-8')

                ins_req = urllib.request.Request(
                    f'{config["supabase_url"]}/rest/v1/articles',
                    data=article_data,
                    method='POST',
                    headers={
                        'apikey': config['supabase_anon_key'],
                        'Authorization': f'Bearer {config["supabase_anon_key"]}',
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    }
                )
                with urllib.request.urlopen(ins_req, timeout=15) as resp:
                    inserted = json.loads(resp.read(), strict=False)

                result = {
                    'status': 'created',
                    'message': f'Article ajouté : {titre}',
                    'article': inserted[0] if isinstance(inserted, list) else inserted
                }
                self.send_response(201)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))

            except ValueError as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            except Exception as e:
                import traceback
                traceback.print_exc()
                error_detail = f'{type(e).__name__}: {e}'
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': error_detail}).encode('utf-8'))

        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")

class ReusableTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    # Multi-thread : chaque requête est traitée dans son propre thread.
    # Sans ça (TCPServer mono-thread), une analyse batch (488 POST /api/analyze
    # serialisés) bloque tout autre appel — ex. "Adapter le prompt" — qui finit
    # coupé par le timeout edge (~100s) et renvoie un corps vide au front.
    # Les requêtes sont I/O-bound (attente OpenRouter/Supabase), pas d'état
    # mutable partagé : le threading est sûr ici.
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    with ReusableTCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
        print(f"✅ Serveur démarré sur http://localhost:{PORT}")
        if is_auth_enabled():
            print(f"🔒 Basic Auth activée (user: {BASIC_AUTH_USER})")
        else:
            print(f"🔓 Basic Auth désactivée (variables BASIC_AUTH_USER / BASIC_AUTH_PASSWORD non définies)")
        print(f"📡 API endpoints actifs :")
        print(f"   - /api/health")
        print(f"   - /api/analyze (OpenRouter LLM)")
        print(f"   - /api/classify-anthropic ({ANTHROPIC_MODEL}, "
              f"{'clé OK' if os.environ.get('ANTHROPIC_API_KEY') else 'ANTHROPIC_API_KEY absente'})")
        print("Appuyez sur Ctrl+C pour arrêter le serveur")
        httpd.serve_forever()
