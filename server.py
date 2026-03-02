#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.request
from urllib.parse import urlparse, parse_qs
from html.parser import HTMLParser
import os
import re
try:
    import requests as req_lib
    USE_REQUESTS = True
except ImportError:
    USE_REQUESTS = False

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

    def _strip_html(self, html_text):
        """Nettoie le HTML et retourne du texte brut"""
        if not html_text:
            return ''

        class HTMLTextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.result = []
                self.skip_tags = {'script', 'style', 'iframe'}
                self.current_skip = False

            def handle_starttag(self, tag, attrs):
                if tag in self.skip_tags:
                    self.current_skip = True
                elif tag in ('p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'):
                    self.result.append('\n')

            def handle_endtag(self, tag):
                if tag in self.skip_tags:
                    self.current_skip = False

            def handle_data(self, data):
                if not self.current_skip:
                    self.result.append(data)

        extractor = HTMLTextExtractor()
        extractor.feed(html_text)
        text = ''.join(extractor.result)
        # Nettoyer les espaces multiples et lignes vides
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def _normalize_article(self, raw):
        """Normalise un article de l'API franceinfo en format standard"""
        path = raw.get('path', '')
        url_page = raw.get('urlPage', '')
        article_id = str(raw.get('id', ''))
        public_url = raw.get('url') or (f"https://www.franceinfo.fr/{path}/{url_page}_{article_id}.html" if path and url_page and article_id else '')

        return {
            'external_id': article_id,
            'titre': raw.get('title', ''),
            'chapo': raw.get('description', ''),
            'corps': self._strip_html(raw.get('text', '')),
            'url': public_url,
            'auteur': raw.get('author', None),
            'path': path,
            'word_count': raw.get('wordCount', 0),
            'date_publication': raw.get('firstPublicationDate', None),
            'date_modification': raw.get('lastUpdateDate', None),
            'content_type': raw.get('class', raw.get('@type', 'Unknown')),
            'metadata': {
                'teams': raw.get('teams', []),
                'source': raw.get('source', None),
                'pushed': raw.get('pushed', False),
                'breakingNews': raw.get('breakingNews', False),
            }
        }

    def _fetch_franceinfo_api(self, api_path):
        """Appelle l'API franceinfo et retourne le JSON"""
        base_url = 'https://api-front.publish.franceinfo.francetvinfo.fr'
        url = f'{base_url}{api_path}'
        headers = {
            'Accept': 'application/ld+json',
            'User-Agent': 'Mozilla/5.0 (compatible; FranceTVUserneeds/1.0; +https://franceinfo.fr)',
        }
        try:
            if USE_REQUESTS:
                response = req_lib.get(url, headers=headers, timeout=10)
                response.raise_for_status()
                return response.json()
            else:
                request = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(request, timeout=10) as resp:
                    return json.loads(resp.read())
        except Exception as e:
            err_type = type(e).__name__
            err_msg = str(e)
            if 'timed out' in err_msg or 'Timeout' in err_type or 'timeout' in err_msg:
                raise Exception(
                    "API franceinfo inaccessible depuis ce serveur (timeout). "
                    "L'API est probablement restreinte aux IP France TV / réseau France. "
                    "Utilisez le serveur en local pour récupérer de nouveaux articles."
                )
            raise

    def do_GET(self):
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

        elif path == '/api/articles/latest':
            try:
                page = params.get('page', ['1'])[0]
                items_per_page = params.get('itemsPerPage', ['30'])[0]
                api_path = f'/contents.jsonld?itemsPerPage={items_per_page}&page={page}'
                data = self._fetch_franceinfo_api(api_path)

                members = data.get('hydra:member', [])
                articles = [self._normalize_article(m) for m in members]

                # Pagination info
                view = data.get('hydra:view', {})
                result = {
                    'articles': articles,
                    'pagination': {
                        'current_page': int(page),
                        'items_per_page': int(items_per_page),
                        'has_next': 'hydra:next' in view
                    }
                }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        elif re.match(r'^/api/articles/\d+$', path):
            try:
                article_id = path.split('/')[-1]
                api_path = f'/contents/{article_id}.jsonld'
                data = self._fetch_franceinfo_api(api_path)
                article = self._normalize_article(data)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(article, ensure_ascii=False).encode('utf-8'))
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'Article {article_id} non trouvé'}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
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

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    with ReusableTCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
        print(f"✅ Serveur démarré sur http://localhost:{PORT}")
        print(f"📡 API endpoints actifs :")
        print(f"   - /api/health")
        print(f"   - /api/analyze (OpenRouter LLM)")
        print(f"   - /api/articles/latest (proxy franceinfo)")
        print(f"   - /api/articles/{{id}} (proxy franceinfo)")
        print("Appuyez sur Ctrl+C pour arrêter le serveur")
        httpd.serve_forever()
