#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.request
from urllib.parse import urlparse, parse_qs
import os
import base64

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

    def _call_openrouter(self, api_key, model, prompt):
        """Call OpenRouter API with specified model"""
        api_url = 'https://openrouter.ai/api/v1/chat/completions'

        # System message (identique à Anthropic mais format OpenAI)
        system_message = """Analyse cet article et détermine OBLIGATOIREMENT le userneed principal, un userneed secondaire et un userneed tertiaire parmi ces options, et donne à chacun un score (le total des 3 scores doit être égal à 100).

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

        api_data = json.dumps({
            'model': model,
            'messages': [
                {'role': 'system', 'content': system_message},
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 1024
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

                # Toujours utiliser OpenRouter
                response_data = self._call_openrouter(api_key, model, prompt)

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
