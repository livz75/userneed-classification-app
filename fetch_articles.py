#!/usr/bin/env python3
"""
Cron local : récupère les derniers articles Franceinfo et les envoie dans Supabase.
Fonctionne uniquement depuis une IP résidentielle (l'API bloque les IP datacenter).

Usage:
    python3 fetch_articles.py              # fetch 30 derniers articles
    python3 fetch_articles.py --pages 3    # fetch 3 pages (90 articles)
"""
import json
import re
import os
import sys
import urllib.request
from html.parser import HTMLParser
from datetime import datetime

# ── Config ──────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, 'config.json')

FRANCEINFO_API = 'https://api-front.publish.franceinfo.francetvinfo.fr'
HEADERS = {
    'Accept': 'application/ld+json',
    'Accept-Language': 'fr-FR,fr;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
}
ITEMS_PER_PAGE = 30


def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)


# ── HTML cleaner ────────────────────────────────────────────────────
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


def strip_html(html_text):
    if not html_text:
        return ''
    extractor = HTMLTextExtractor()
    extractor.feed(html_text)
    text = ''.join(extractor.result)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


# ── Franceinfo API ──────────────────────────────────────────────────
def fetch_api(api_path):
    url = f'{FRANCEINFO_API}{api_path}'
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def normalize_article(raw):
    path = raw.get('path', '')
    url_page = raw.get('urlPage', '')
    article_id = str(raw.get('id', ''))
    public_url = raw.get('url') or (
        f"https://www.franceinfo.fr/{path}/{url_page}_{article_id}.html"
        if path and url_page and article_id else ''
    )
    return {
        'external_id': article_id,
        'titre': raw.get('title', ''),
        'chapo': raw.get('description', ''),
        'corps': strip_html(raw.get('text', '')),
        'url': public_url,
        'auteur': raw.get('author', None),
        'path': path,
        'word_count': raw.get('wordCount', 0),
        'date_publication': raw.get('firstPublicationDate', None),
        'date_modification': raw.get('lastUpdateDate', None),
        'metadata': {
            'teams': raw.get('teams', []),
            'source': raw.get('source', None),
            'pushed': raw.get('pushed', False),
            'breakingNews': raw.get('breakingNews', False),
        }
    }


def fetch_latest_articles(page=1):
    data = fetch_api(f'/contents.jsonld?itemsPerPage={ITEMS_PER_PAGE}&page={page}')
    members = data.get('hydra:member', [])
    return [normalize_article(m) for m in members]


def fetch_article_detail(external_id):
    data = fetch_api(f'/contents/{external_id}.jsonld')
    return normalize_article(data)


# ── Supabase upsert ────────────────────────────────────────────────
def upsert_to_supabase(articles, config):
    url = config['supabase_url']
    key = config['supabase_anon_key']

    rows = []
    for a in articles:
        rows.append({
            'external_id': a['external_id'],
            'url': a['url'],
            'titre': a['titre'],
            'chapo': a['chapo'],
            'corps': a['corps'],
            'auteur': a['auteur'],
            'path': a['path'],
            'word_count': a['word_count'],
            'date_publication': a['date_publication'],
            'date_modification': a['date_modification'],
            'metadata': a['metadata'],
        })

    payload = json.dumps(rows).encode('utf-8')
    req = urllib.request.Request(
        f'{url}/rest/v1/articles?on_conflict=external_id',
        data=payload,
        method='POST',
        headers={
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Prefer': 'resolution=merge-duplicates,return=minimal',
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            return status
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f'  ❌ Supabase error {e.code}: {body}')
        return e.code


# ── Enrichissement (fetch corps manquants) ──────────────────────────
def enrich_articles(articles):
    to_enrich = [
        a for a in articles
        if not a['corps'] and a.get('metadata', {}).get('source') != 'afp'
    ]
    if not to_enrich:
        return articles

    print(f'  📝 Enrichissement de {len(to_enrich)} articles...')
    import time
    for a in to_enrich:
        try:
            full = fetch_article_detail(a['external_id'])
            if full['corps']:
                a['corps'] = full['corps']
            time.sleep(0.3)
        except Exception as e:
            print(f'  ⚠️  Article {a["external_id"]}: {e}')
    return articles


# ── Main ────────────────────────────────────────────────────────────
def main():
    pages = 1
    if '--pages' in sys.argv:
        idx = sys.argv.index('--pages')
        pages = int(sys.argv[idx + 1])

    config = load_config()
    now = datetime.now().strftime('%H:%M:%S')
    print(f'[{now}] 🚀 Fetch articles Franceinfo ({pages} page(s))...')

    total = 0
    for page in range(1, pages + 1):
        print(f'  📄 Page {page}/{pages}...')
        try:
            articles = fetch_latest_articles(page)
            print(f'  ✅ {len(articles)} articles récupérés')

            articles = enrich_articles(articles)

            status = upsert_to_supabase(articles, config)
            if status in (200, 201):
                print(f'  ✅ Supabase: {len(articles)} articles upsertés')
            else:
                print(f'  ⚠️  Supabase status: {status}')

            total += len(articles)
        except Exception as e:
            print(f'  ❌ Erreur page {page}: {e}')

    now = datetime.now().strftime('%H:%M:%S')
    print(f'[{now}] 🏁 Terminé: {total} articles envoyés à Supabase')


if __name__ == '__main__':
    main()
