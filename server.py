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
                'model': 'claude-sonnet-4-20250514'
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

                # Préparer la requête vers l'API Anthropic
                api_url = 'https://api.anthropic.com/v1/messages'
                api_data = json.dumps({
                    'model': 'claude-sonnet-4-20250514',
                    'max_tokens': 2048,
                    'messages': [{
                        'role': 'user',
                        'content': prompt
                    }]
                }).encode('utf-8')

                # Créer la requête
                req = urllib.request.Request(api_url, data=api_data, method='POST')
                req.add_header('Content-Type', 'application/json')
                req.add_header('x-api-key', api_key)
                req.add_header('anthropic-version', '2023-06-01')

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
