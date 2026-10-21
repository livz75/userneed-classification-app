#!/usr/bin/env python3
"""
Rattrapage des tags éditoriaux franceinfo (<meta property="article:tag">) pour
les articles déjà en base, dont la colonne `tags` est vide.

Usage:
    python3 backfill_tags.py                      # à blanc, articles publiés depuis le 2025-09-01
    python3 backfill_tags.py --apply              # écrit en base
    python3 backfill_tags.py --since 2026-01-01 --apply
"""
import argparse
import json
import ssl
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from fetch_articles import HEADERS_HTML, extract_tags, load_config

WORKERS = 4


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


def load_untagged(config, since):
    rows, offset = [], 0
    while True:
        req = urllib.request.Request(
            f"{config['supabase_url']}/rest/v1/articles?select=id,url"
            f"&date_publication=gte.{since}&or=(tags.is.null,tags.eq.{{}})"
            f"&order=date_publication.desc&limit=1000&offset={offset}",
            headers=sb_headers(config),
        )
        with urllib.request.urlopen(req, timeout=60, context=CTX) as resp:
            page = json.loads(resp.read())
        rows += page
        if len(page) < 1000:
            return [r for r in rows if r.get('url')]
        offset += 1000


def fetch_tags(article):
    try:
        req = urllib.request.Request(article['url'], headers=HEADERS_HTML)
        with urllib.request.urlopen(req, timeout=15, context=CTX) as resp:
            html = resp.read().decode('utf-8', errors='replace')
        return article, extract_tags(html), None
    except Exception as e:
        return article, None, e
    finally:
        time.sleep(0.25)


def patch_tags(config, article_id, tags):
    req = urllib.request.Request(
        f"{config['supabase_url']}/rest/v1/articles?id=eq.{article_id}",
        data=json.dumps({'tags': tags}).encode('utf-8'),
        method='PATCH',
        headers={**sb_headers(config), 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
    )
    with urllib.request.urlopen(req, timeout=30, context=CTX):
        pass


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--since', default='2025-09-01', help='date de publication minimale (AAAA-MM-JJ)')
    ap.add_argument('--apply', action='store_true', help='écrire en base (sinon : à blanc)')
    args = ap.parse_args()

    config = load_config()
    articles = load_untagged(config, args.since)
    print(f"🏷️  {len(articles)} articles sans tags publiés depuis le {args.since} — "
          f"{'APPLY' if args.apply else 'À BLANC'}")

    tagged = empty = failed = 0
    with ThreadPoolExecutor(WORKERS) as ex:
        for i, (a, tags, err) in enumerate(ex.map(fetch_tags, articles), 1):
            if err is not None:
                failed += 1
                print(f'  [{i}] ❌ {a["url"][:70]} : {err}')
                continue
            if not tags:
                empty += 1
                continue
            if args.apply:
                try:
                    patch_tags(config, a['id'], tags)
                except Exception as e:
                    failed += 1
                    print(f'  [{i}] ❌ écriture : {e}')
                    continue
            tagged += 1
            if i % 100 == 0:
                print(f'  … {i}/{len(articles)}')

    print(f'\n✅ {tagged} articles tagués, {empty} pages sans tag, {failed} échecs.')


if __name__ == '__main__':
    main()
