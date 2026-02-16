#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.request
from urllib.parse import urlparse, parse_qs
import os

PORT = int(os.environ.get('PORT', 8000))

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
                'provider': 'openrouter',
                'default_model': 'anthropic/claude-3.5-haiku'
            }).encode('utf-8'))
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

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
        print(f"✅ Serveur démarré sur http://localhost:{PORT}")
        print(f"📡 API Analyze activée (OpenRouter uniquement)")
        print(f"   - /api/analyze (tous modèles via OpenRouter)")
        print("Appuyez sur Ctrl+C pour arrêter le serveur")
        httpd.serve_forever()
