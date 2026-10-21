#!/usr/bin/env python3
"""
Rattrapage d'une période où l'import RSS ne tournait pas, à partir des sitemaps
mensuels franceinfo (https://www.franceinfo.fr/sitemap/AAAA-MM-article.xml).

Pour chaque URL du sitemap absente de la base : téléchargement de la page,
extraction du titre, chapô, dates, texte, type de média et tags, puis insertion.
Comme fetch_articles.py, les articles sans texte (vidéos, directs) sont écartés.

Usage:
    python3 backfill_sitemap.py --months 2026-05 2026-06                 # à blanc
    python3 backfill_sitemap.py --months 2026-05 2026-06 --apply
    python3 backfill_sitemap.py --months 2026-06 --since 2026-06-01 --until 2026-07-01 --apply
    python3 backfill_sitemap.py --months 2026-01 2026-02 --tag "Présidentielle 2027" --apply
"""
import argparse
import json
import re
import ssl
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html import unescape

from fetch_articles import HEADERS_HTML, load_config, parse_article_html

WORKERS = 4
INSERT_BATCH = 50


def ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


CTX = ssl_context()


def sb_headers(config):
    key = config['supabase_anon_key']
    return {'apikey': key, 'Authorization': f'Bearer {key}', 'Accept': 'application/json'}


def sitemap_urls(month):
    req = urllib.request.Request(f'https://www.franceinfo.fr/sitemap/{month}-article.xml', headers=HEADERS_HTML)
    with urllib.request.urlopen(req, timeout=30, context=CTX) as resp:
        xml = resp.read().decode('utf-8', errors='replace')
    return [unescape(u).strip() for u in re.findall(r'<loc>([^<]+)</loc>', xml)]


def existing_external_ids(config):
    ids, offset = set(), 0
    while True:
        req = urllib.request.Request(
            f"{config['supabase_url']}/rest/v1/articles?select=external_id&order=id&limit=1000&offset={offset}",
            headers=sb_headers(config),
        )
        with urllib.request.urlopen(req, timeout=60, context=CTX) as resp:
            page = json.loads(resp.read())
        ids.update(r['external_id'] for r in page if r.get('external_id'))
        if len(page) < 1000:
            return ids
        offset += 1000


def meta(html, prop):
    m = re.search(rf'<meta\s+property="{re.escape(prop)}"\s+content="([^"]*)"', html)
    return re.sub(r'[\x00-\x1f\x7f]', ' ', unescape(m.group(1))).strip() if m else ''


def fetch_article(url):
    """Retourne (dict article | None, raison si écarté)."""
    m = re.search(r'_(\d+)\.html', url)
    if not m:
        return None, 'url sans id'
    try:
        req = urllib.request.Request(url, headers=HEADERS_HTML)
        with urllib.request.urlopen(req, timeout=20, context=CTX) as resp:
            html = resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        return None, f'téléchargement : {e}'
    finally:
        time.sleep(0.25)

    body, media_type, tags = parse_article_html(html)
    if not body:
        return None, 'sans texte'
    body = re.sub(r'[\x00-\x1f\x7f]', ' ', body)
    return {
        'external_id': m.group(1),
        'titre': meta(html, 'og:title'),
        'chapo': meta(html, 'og:description'),
        'corps': body,
        'url': url,
        'auteur': None,
        # Même forme que fetch_articles.normalize_item sur les URL franceinfo.fr : URL de la rubrique.
        'path': url.rsplit('/', 1)[0],
        'word_count': len(body.split()),
        'date_publication': meta(html, 'article:published_time') or None,
        'date_modification': meta(html, 'article:modified_time') or None,
        'metadata': {'media_type': media_type or 'article', 'source': 'backfill_sitemap'},
        'tags': tags,
    }, None


def insert_batch(config, rows):
    req = urllib.request.Request(
        f"{config['supabase_url']}/rest/v1/articles?on_conflict=external_id",
        data=json.dumps(rows).encode('utf-8'),
        method='POST',
        headers={**sb_headers(config), 'Content-Type': 'application/json',
                 'Prefer': 'resolution=ignore-duplicates,return=minimal'},
    )
    with urllib.request.urlopen(req, timeout=60, context=CTX):
        pass


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--months', nargs='+', required=True, help='mois AAAA-MM des sitemaps à lire')
    ap.add_argument('--since', help='date de publication minimale (AAAA-MM-JJ), incluse')
    ap.add_argument('--until', help='date de publication maximale (AAAA-MM-JJ), exclue')
    ap.add_argument('--tag', help="n'insérer que les articles portant ce tag franceinfo")
    ap.add_argument('--apply', action='store_true', help='écrire en base (sinon : à blanc)')
    args = ap.parse_args()

    config = load_config()
    known = existing_external_ids(config)
    urls = []
    for month in args.months:
        month_urls = sitemap_urls(month)
        print(f'🗺️  Sitemap {month} : {len(month_urls)} URLs')
        urls += month_urls
    seen, todo = set(), []
    for u in urls:
        m = re.search(r'_(\d+)\.html', u)
        if m and m.group(1) not in known and m.group(1) not in seen:
            seen.add(m.group(1))
            todo.append(u)
    print(f"📥 {len(todo)} articles absents de la base ({len(known)} déjà en base) — "
          f"{'APPLY' if args.apply else 'À BLANC'}", flush=True)

    pending, inserted, skipped, failed = [], 0, {}, 0
    with ThreadPoolExecutor(WORKERS) as ex:
        for i, (article, reason) in enumerate(ex.map(fetch_article, todo), 1):
            if article is None:
                key = 'erreurs' if reason.startswith('téléchargement') else reason
                skipped[key] = skipped.get(key, 0) + 1
            else:
                d = (article['date_publication'] or '')[:10]
                if (args.since and d < args.since) or (args.until and d >= args.until):
                    skipped['hors période'] = skipped.get('hors période', 0) + 1
                elif args.tag and args.tag not in article['tags']:
                    skipped['autre tag'] = skipped.get('autre tag', 0) + 1
                else:
                    pending.append(article)
            if len(pending) >= INSERT_BATCH or (i == len(todo) and pending):
                if args.apply:
                    try:
                        insert_batch(config, pending)
                        inserted += len(pending)
                    except Exception as e:
                        failed += len(pending)
                        print(f'  ❌ insertion de {len(pending)} articles : {e}', flush=True)
                else:
                    inserted += len(pending)
                pending = []
            if i % 200 == 0:
                print(f'  … {i}/{len(todo)} pages lues, {inserted} {"insérés" if args.apply else "à insérer"}', flush=True)

    print(f"\n✅ {inserted} articles {'insérés' if args.apply else 'à insérer'}, "
          f"{failed} échecs d'insertion, écartés : {skipped}")


if __name__ == '__main__':
    main()
