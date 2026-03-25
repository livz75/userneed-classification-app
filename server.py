#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.request
from urllib.parse import urlparse, parse_qs
import os
import re
import base64
from html import unescape

PORT = int(os.environ.get('PORT', 8000))

# Basic Auth credentials (depuis les variables d'environnement)
BASIC_AUTH_USER = os.environ.get('BASIC_AUTH_USER', '')
BASIC_AUTH_PASSWORD = os.environ.get('BASIC_AUTH_PASSWORD', '')

def is_auth_enabled():
    """Auth activée uniquement si les deux variables sont définies."""
    return bool(BASIC_AUTH_USER and BASIC_AUTH_PASSWORD)

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):

    def _check_auth(self):
        """Vérifie le header Authorization. Retourne True si OK, False sinon."""
        if not is_auth_enabled():
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
                'default_model': 'anthropic/claude-3.5-haiku'
            }).encode('utf-8'))
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
- EXPLAIN ME
- GIVE ME PERSPECTIVE
- GIVE ME A BREAK
- GIVE ME CONCERNING NEWS
- INSPIRE ME
- MAKE ME FEEL THE NEWS
- REVEAL NEWS

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
                prompt = request_data['prompt']
                model = request_data.get('model', 'anthropic/claude-3.5-haiku')
                system = request_data.get('system', None)
                max_tokens = request_data.get('max_tokens', 4096)

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
                body, media_type = scrape_article_body(article_url)
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

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

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
        print("Appuyez sur Ctrl+C pour arrêter le serveur")
        httpd.serve_forever()
