#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.request
from urllib.parse import urlparse, parse_qs
import os

PORT = 8000

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'ok',
                'timestamp': int(__import__('time').time() * 1000),
                'model': 'claude-3-5-haiku-20241022'
            }).encode('utf-8'))
            return
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/claude':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                request_data = json.loads(post_data.decode('utf-8'))
                api_key = request_data['apiKey']
                prompt = request_data['prompt']

                # Préparer la requête vers l'API Anthropic avec Prompt Caching
                api_url = 'https://api.anthropic.com/v1/messages'

                # Extraire les instructions fixes (à mettre en cache) et le contenu dynamique
                # Le prompt contient généralement : instructions + liste userneeds + article
                # On va séparer les instructions fixes du contenu de l'article

                # Instructions système (mises en cache) - partie fixe du prompt
                system_instructions = [{
                    "type": "text",
                    "text": """Analyse cet article et détermine OBLIGATOIREMENT le userneed principal, un userneed secondaire et un userneed tertiaire parmi ces options, et donne à chacun un score (le total des 3 scores doit être égal à 100).

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

Règle CRITIQUE : Le total des 3 scores doit être exactement égal à 100.""",
                    "cache_control": {"type": "ephemeral"}
                }]

                api_data = json.dumps({
                    'model': 'claude-3-5-haiku-20241022',
                    'max_tokens': 1024,
                    'system': system_instructions,
                    'messages': [{
                        'role': 'user',
                        'content': prompt  # Contenu de l'article (partie dynamique)
                    }]
                }).encode('utf-8')

                # Créer la requête
                req = urllib.request.Request(api_url, data=api_data, method='POST')
                req.add_header('Content-Type', 'application/json')
                req.add_header('x-api-key', api_key)
                req.add_header('anthropic-version', '2023-06-01')
                req.add_header('anthropic-beta', 'prompt-caching-2024-07-31')

                # Envoyer la requête
                with urllib.request.urlopen(req) as response:
                    response_data = response.read()
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

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
        print(f"✅ Serveur démarré sur http://localhost:{PORT}")
        print(f"📡 Proxy API Claude activé sur http://localhost:{PORT}/api/claude")
        print("Appuyez sur Ctrl+C pour arrêter le serveur")
        httpd.serve_forever()
