#!/usr/bin/env python3
"""
Import d'articles classifiés depuis un fichier Excel vers Supabase.
- Upsert les articles dans la table `articles`
- Insère les classifications humaines dans `human_classifications`
"""
import json
import os
import re
import sys
import urllib.request

# ── Config ──────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, 'config.json')

# Mapping Excel → schéma Supabase
USERNEED_MAP = {
    'UPDATE ME': 'UPDATE ME',
    'EXPLAIN ME': 'EXPLAIN ME',
    'GIVE ME PERSPECTIVE': 'GIVE ME PERSPECTIVE',
    'GIVE ME A BREAK': 'GIVE ME A BREAK',
    'CONCERNING NEWS': 'GIVE ME CONCERNING NEWS',
    'INSPIRE ME': 'INSPIRE ME',
    'MAKE ME FEEL': 'MAKE ME FEEL THE NEWS',
    'REVEAL ME': 'REVEAL NEWS',
}


def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)


def extract_external_id(url):
    """Extrait l'external_id depuis l'URL franceinfo (ex: _7295985.html → 7295985)
    Pour les URLs sans ID numérique, utilise le slug comme identifiant."""
    match = re.search(r'_(\d+)\.html', url)
    if match:
        return match.group(1)
    # Ancien format sans ID numérique : utiliser le dernier segment du path
    match = re.search(r'/([^/]+?)(?:\.html)?$', url.rstrip('/'))
    return match.group(1) if match else None


def read_excel(filepath):
    import openpyxl
    wb = openpyxl.load_workbook(filepath, read_only=True)
    ws = wb['ARTICLES']

    articles = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        userneed_raw, _, url, titre, chapo, corps = row[:6]
        if not url or not titre:
            continue

        external_id = extract_external_id(url)
        if not external_id:
            print(f'  ⚠️  Impossible d\'extraire l\'ID depuis: {url}')
            continue

        userneed = USERNEED_MAP.get(userneed_raw)
        if not userneed:
            print(f'  ⚠️  User need inconnu: {userneed_raw}')
            continue

        articles.append({
            'external_id': external_id,
            'url': url,
            'titre': titre,
            'chapo': chapo or '',
            'corps': corps or '',
            'userneed': userneed,
        })

    wb.close()
    return articles


def supabase_request(url, key, endpoint, data, method='POST', extra_headers=None):
    """Fait une requête vers l'API REST Supabase"""
    payload = json.dumps(data).encode('utf-8')
    headers = {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': f'Bearer {key}',
    }
    if extra_headers:
        headers.update(extra_headers)

    req = urllib.request.Request(
        f'{url}/rest/v1/{endpoint}',
        data=payload,
        method=method,
        headers=headers
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, body


def main():
    filepath = sys.argv[1] if len(sys.argv) > 1 else '/Users/livioricci/Downloads/User needs attribués (3).xlsx'

    config = load_config()
    sb_url = config['supabase_url']
    sb_key = config['supabase_anon_key']

    print(f'📖 Lecture du fichier Excel...')
    articles = read_excel(filepath)
    print(f'  ✅ {len(articles)} articles lus')

    # 1. Upsert articles
    print(f'\n📤 Upsert des articles dans Supabase...')
    article_rows = [{
        'external_id': a['external_id'],
        'url': a['url'],
        'titre': a['titre'],
        'chapo': a['chapo'],
        'corps': a['corps'],
        'path': '',
        'word_count': len(a['corps'].split()) if a['corps'] else 0,
    } for a in articles]

    # Envoyer par batch de 50
    for i in range(0, len(article_rows), 50):
        batch = article_rows[i:i+50]
        status, body = supabase_request(
            sb_url, sb_key,
            'articles?on_conflict=external_id',
            batch,
            extra_headers={'Prefer': 'resolution=merge-duplicates,return=minimal'}
        )
        if status in (200, 201):
            print(f'  ✅ Batch {i//50+1}: {len(batch)} articles upsertés')
        else:
            print(f'  ❌ Batch {i//50+1}: erreur {status} - {body}')
            return

    # 2. Récupérer les UUIDs des articles depuis Supabase
    print(f'\n🔍 Récupération des UUIDs articles...')
    external_ids = ','.join(f'"{a["external_id"]}"' for a in articles)
    get_url = f'{sb_url}/rest/v1/articles?external_id=in.({external_ids})&select=id,external_id'
    req = urllib.request.Request(get_url, headers={
        'apikey': sb_key,
        'Authorization': f'Bearer {sb_key}',
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        db_articles = json.loads(resp.read())

    id_map = {a['external_id']: a['id'] for a in db_articles}
    print(f'  ✅ {len(id_map)} articles trouvés en base')

    # 3. Insérer les classifications humaines
    print(f'\n📤 Insertion des classifications humaines...')
    classifications = []
    skipped = 0
    for a in articles:
        article_uuid = id_map.get(a['external_id'])
        if not article_uuid:
            skipped += 1
            continue
        classifications.append({
            'article_id': article_uuid,
            'userneed': a['userneed'],
            'classified_by': 'excel_import',
        })

    if skipped:
        print(f'  ⚠️  {skipped} articles sans UUID (ignorés)')

    # Envoyer par batch de 50
    for i in range(0, len(classifications), 50):
        batch = classifications[i:i+50]
        status, body = supabase_request(
            sb_url, sb_key,
            'human_classifications?on_conflict=article_id,classified_by',
            batch,
            extra_headers={'Prefer': 'resolution=merge-duplicates,return=minimal'}
        )
        if status in (200, 201):
            print(f'  ✅ Batch {i//50+1}: {len(batch)} classifications insérées')
        else:
            print(f'  ❌ Batch {i//50+1}: erreur {status} - {body}')
            return

    print(f'\n🏁 Import terminé: {len(classifications)} articles classifiés importés')


if __name__ == '__main__':
    main()
