#!/usr/bin/env python3
"""
Cron local : récupère les derniers articles Franceinfo via RSS et les envoie dans Supabase.

Usage:
    python3 fetch_articles.py              # tous les feeds RSS
    python3 fetch_articles.py --feed titres  # un seul feed
    python3 fetch_articles.py --no-scrape  # sans scraping du corps
"""
import json
import re
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime

# ── Config ──────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, 'config.json')

RSS_FEEDS = {
    'titres':    'https://www.francetvinfo.fr/titres.rss',
    'politique': 'https://www.francetvinfo.fr/politique.rss',
    'monde':     'https://www.francetvinfo.fr/monde.rss',
    'societe':   'https://www.francetvinfo.fr/societe.rss',
    'economie':  'https://www.francetvinfo.fr/economie.rss',
    'culture':   'https://www.francetvinfo.fr/culture.rss',
}

HEADERS_RSS = {
    'Accept': 'application/rss+xml, application/xml, text/xml',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
}

HEADERS_HTML = {
    'Accept': 'text/html,application/xhtml+xml',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
}

SCRAPE_DELAY = 0.5  # secondes entre chaque requête de scraping


def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)


# ── Scraping du corps ────────────────────────────────────────────────
def normalize_media_type(raw_type):
    """Normalise le @type JSON-LD en valeur simple : 'video', 'article', ou 'autre'."""
    if not raw_type:
        return None
    if isinstance(raw_type, list):
        raw_type = raw_type[0]
    t = raw_type.lower()
    if 'video' in t:
        return 'video'
    if 'article' in t or 'reportage' in t or 'news' in t:
        return 'article'
    return 'autre'


def scrape_article_body(url):
    """
    Récupère le corps complet d'un article et son type de média depuis son URL.
    Extrait 'articleBody' et '@type' du JSON-LD embarqué dans la page.
    Retourne un tuple (corps: str, media_type: str|None).
    """
    try:
        req = urllib.request.Request(url, headers=HEADERS_HTML)
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='replace')

        # Extraire tous les blocs JSON-LD
        jsonld_blocks = re.findall(
            r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            html, re.DOTALL
        )

        def find_key(obj, key):
            if isinstance(obj, dict):
                if key in obj:
                    return obj[key]
                for v in obj.values():
                    r = find_key(v, key)
                    if r:
                        return r
            elif isinstance(obj, list):
                for item in obj:
                    r = find_key(item, key)
                    if r:
                        return r
            return None

        body = ''
        media_type = None

        for block in jsonld_blocks:
            try:
                data = json.loads(block)
                if not body:
                    b = find_key(data, 'articleBody')
                    if b and len(b) > 50:
                        body = b.strip()
                if not media_type:
                    t = find_key(data, '@type')
                    media_type = normalize_media_type(t)
            except Exception:
                continue

    except Exception as e:
        print(f'    ⚠️  Scraping échoué ({url[:60]}...): {e}')
        return '', None

    return body, media_type


# ── RSS parsing ──────────────────────────────────────────────────────
def fetch_rss(feed_url):
    req = urllib.request.Request(feed_url, headers=HEADERS_RSS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read()


def parse_date(date_str):
    """Convertit une date RFC 2822 (RSS) en ISO 8601."""
    if not date_str:
        return None
    try:
        return parsedate_to_datetime(date_str).isoformat()
    except Exception:
        return None


def normalize_item(item):
    """Transforme un <item> RSS en dict compatible Supabase."""
    title = item.findtext('title', '').strip()
    description = item.findtext('description', '').strip()
    pub_date = item.findtext('pubDate', '')

    # URL propre (sans tracking #xtor=...)
    raw_link = item.findtext('link', '') or item.findtext('guid', '')
    url = raw_link.split('#')[0].strip()

    # Extraction de l'ID depuis l'URL : _1234567.html
    m = re.search(r'_(\d+)\.html', url)
    if not m:
        return None
    external_id = m.group(1)

    # Extraction du path depuis l'URL
    path_part = url.replace('https://www.francetvinfo.fr/', '').replace('https://france3-regions.franceinfo.fr/', '')
    parts = path_part.split('/')
    path = '/'.join(parts[:-1]) if len(parts) > 1 else ''

    return {
        'external_id': external_id,
        'titre': title,
        'chapo': description,
        'corps': '',
        'url': url,
        'auteur': None,
        'path': path,
        'word_count': len(description.split()) if description else 0,
        'date_publication': parse_date(pub_date),
        'date_modification': parse_date(pub_date),
        'metadata': {},
    }


def fetch_feed_articles(name, url):
    """Récupère et parse un feed RSS, retourne la liste d'articles normalisés."""
    xml_bytes = fetch_rss(url)
    root = ET.fromstring(xml_bytes)
    articles = []
    seen_ids = set()
    for item in root.findall('.//item'):
        a = normalize_item(item)
        if a and a['external_id'] not in seen_ids:
            seen_ids.add(a['external_id'])
            articles.append(a)
    return articles


# ── Supabase : suppression articles sans corps ───────────────────────
def delete_empty_corps(config):
    """
    Supprime de Supabase les articles dont le corps est vide ou nul,
    sauf ceux qui ont déjà une classification humaine.
    Retourne le nombre d'articles supprimés.
    """
    url = config['supabase_url']
    key = config['supabase_anon_key']
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Accept': 'application/json',
    }

    # Récupérer les IDs des articles sans corps qui n'ont pas de classification
    req = urllib.request.Request(
        f'{url}/rest/v1/articles'
        '?select=id,human_classifications(id)'
        '&or=(corps.is.null,corps.eq."")'
        '&limit=500',
        headers=headers
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            articles = json.loads(resp.read())
    except Exception as e:
        print(f'  ❌ Erreur lecture articles vides: {e}')
        return 0

    # Garder uniquement ceux sans classification
    ids_to_delete = [
        a['id'] for a in articles
        if not a.get('human_classifications')
    ]

    if not ids_to_delete:
        return 0

    # Supprimer par batch (l'API Supabase accepte un filtre in)
    ids_filter = ','.join(f'"{i}"' for i in ids_to_delete)
    del_req = urllib.request.Request(
        f'{url}/rest/v1/articles?id=in.({ids_filter})',
        method='DELETE',
        headers={**headers, 'Prefer': 'return=minimal'}
    )
    try:
        with urllib.request.urlopen(del_req, timeout=30) as resp:
            return len(ids_to_delete)
    except urllib.error.HTTPError as e:
        print(f'  ❌ Erreur suppression: {e.code} {e.read().decode()}')
        return 0


# ── Supabase upsert ─────────────────────────────────────────────────
def upsert_to_supabase(articles, config):
    url = config['supabase_url']
    key = config['supabase_anon_key']

    payload = json.dumps(articles).encode('utf-8')
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
            return resp.status
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f'  ❌ Supabase error {e.code}: {body}')
        return e.code


# ── Mise à jour du media_type pour les articles existants ────────────
def update_missing_media_types(config):
    """Scrape les articles existants sans media_type et met à jour Supabase."""
    import time
    url_base = config['supabase_url']
    key = config['supabase_anon_key']
    headers_sb = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Accept': 'application/json',
    }

    # Récupérer tous les articles par pages de 500
    all_articles = []
    offset = 0
    page_size = 500
    while True:
        req = urllib.request.Request(
            f'{url_base}/rest/v1/articles?select=id,url,metadata'
            f'&limit={page_size}&offset={offset}',
            headers=headers_sb
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                page = json.loads(resp.read())
        except Exception as e:
            print(f'  ❌ Erreur lecture Supabase: {e}')
            break
        if not page:
            break
        all_articles.extend(page)
        if len(page) < page_size:
            break
        offset += page_size

    # Filtrer ceux sans media_type
    to_update = [
        a for a in all_articles
        if not (a.get('metadata') or {}).get('media_type') and a.get('url')
    ]
    print(f'  📊 {len(to_update)} articles sans media_type (sur {len(all_articles)} en base)')

    if not to_update:
        print('  ✅ Tous les articles ont déjà un media_type.')
        return

    updated = 0
    failed = 0
    for i, a in enumerate(to_update):
        print(f'  [{i+1}/{len(to_update)}] ', end='', flush=True)
        _, media_type = scrape_article_body(a['url'])
        if not media_type:
            media_type = 'article'  # fallback

        new_metadata = {**(a.get('metadata') or {}), 'media_type': media_type}
        patch_data = json.dumps({'metadata': new_metadata}).encode('utf-8')
        patch_req = urllib.request.Request(
            f'{url_base}/rest/v1/articles?id=eq.{a["id"]}',
            data=patch_data,
            method='PATCH',
            headers={
                **headers_sb,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            }
        )
        try:
            with urllib.request.urlopen(patch_req, timeout=30):
                updated += 1
                print(f'{media_type} ✅')
        except Exception as e:
            failed += 1
            print(f'❌ {e}')

        time.sleep(SCRAPE_DELAY)

    print(f'\n  ✅ {updated} articles mis à jour, {failed} échecs.')


# ── Main ─────────────────────────────────────────────────────────────
def main():
    import time

    # Mode mise à jour du media_type uniquement
    if '--update-metadata' in sys.argv:
        config = load_config()
        print('🔄 Mise à jour du media_type pour les articles existants...')
        update_missing_media_types(config)
        return

    no_scrape = '--no-scrape' in sys.argv

    # Sélection du/des feed(s)
    if '--feed' in sys.argv:
        idx = sys.argv.index('--feed')
        feed_name = sys.argv[idx + 1]
        if feed_name not in RSS_FEEDS:
            print(f'Feed inconnu : {feed_name}. Disponibles : {", ".join(RSS_FEEDS)}')
            sys.exit(1)
        feeds = {feed_name: RSS_FEEDS[feed_name]}
    else:
        feeds = RSS_FEEDS

    config = load_config()
    now = datetime.now().strftime('%H:%M:%S')
    print(f'[{now}] 🚀 Fetch RSS Franceinfo ({len(feeds)} feed(s))...')

    all_articles = {}  # external_id → article (dédoublonnage cross-feeds)
    for name, url in feeds.items():
        print(f'  📡 Feed "{name}"...')
        try:
            articles = fetch_feed_articles(name, url)
            new = 0
            for a in articles:
                if a['external_id'] not in all_articles:
                    all_articles[a['external_id']] = a
                    new += 1
            print(f'  ✅ {new} articles (+{len(articles) - new} doublons ignorés)')
        except Exception as e:
            print(f'  ❌ Erreur feed "{name}": {e}')

    articles_list = list(all_articles.values())
    if not articles_list:
        print('  ⚠️  Aucun article à envoyer.')
        return

    # Scraping du corps
    if not no_scrape:
        to_scrape = [a for a in articles_list if not a['corps'] and a['url']]
        print(f'  📝 Scraping du corps ({len(to_scrape)} articles)...')
        scraped = 0
        for a in to_scrape:
            body, media_type = scrape_article_body(a['url'])
            if body:
                a['corps'] = body
                a['word_count'] = len(body.split())
                scraped += 1
            if media_type:
                a.setdefault('metadata', {})['media_type'] = media_type
            time.sleep(SCRAPE_DELAY)
        print(f'  ✅ Corps récupéré pour {scraped}/{len(to_scrape)} articles')

    # Filtrer : ne garder que les articles avec un corps
    before = len(articles_list)
    articles_list = [a for a in articles_list if a.get('corps')]
    dropped = before - len(articles_list)
    if dropped:
        print(f'  🚫 {dropped} articles sans corps écartés (non insérés)')

    if not articles_list:
        print('  ⚠️  Aucun article avec corps à envoyer.')
    else:
        print(f'  📤 Envoi de {len(articles_list)} articles à Supabase...')
        status = upsert_to_supabase(articles_list, config)
        if status in (200, 201):
            print(f'  ✅ {len(articles_list)} articles upsertés')
        else:
            print(f'  ⚠️  Supabase status: {status}')

    # Nettoyer les articles sans corps déjà en base (sauf ceux classifiés)
    deleted = delete_empty_corps(config)
    if deleted:
        print(f'  🗑  {deleted} articles sans corps supprimés de la base')

    now = datetime.now().strftime('%H:%M:%S')
    print(f'[{now}] 🏁 Terminé')


if __name__ == '__main__':
    main()
