# /// script
# requires-python = ">=3.10"
# dependencies = ["laya"]
# ///
"""Benchmark zero-shot de Laya multilingue sur les articles labellisés.

Même protocole que le benchmark Jev 1.13 (71,7 % P1 / 93,2 % top 3) :
- state        = {titre, chapo, corps}
- instructions = DECISION_INSTRUCTIONS_DEFAULT de script.js
- criteria     = USERNEED_CRITERIA de script.js (les 9 définitions officielles),
                 relus dans le fichier pour ne jamais diverger de l'app.

Usage :
    uv run bench/laya_zero_shot.py --limit 5        # fumée : format de sortie
    uv run bench/laya_zero_shot.py                  # les 501
    uv run bench/laya_zero_shot.py --jev-run <uuid> # + McNemar contre un run Jev
    uv run bench/laya_zero_shot.py --list-jev-runs

Device : LAYA_DEVICE=mps (Apple Silicon) ou cpu.
"""
import argparse
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from math import comb
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = Path(__file__).resolve().parent / "results"


# ── Prompt : relu dans script.js, source unique de vérité ──────────────────

def load_decision_prompt():
    src = (ROOT / "script.js").read_text(encoding="utf-8")
    bloc = re.search(r"const USERNEED_CRITERIA = \{(.*?)\n\};", src, re.S).group(1)
    criteria = {k: json.loads(f'"{v}"') for k, v in re.findall(r"'([A-Z ]+)':\s*\"((?:[^\"\\]|\\.)*)\"", bloc)}
    instr = re.search(r"const DECISION_INSTRUCTIONS_DEFAULT =\s*\"((?:[^\"\\]|\\.)*)\"", src).group(1)
    assert len(criteria) == 9, f"{len(criteria)} critères lus dans script.js au lieu de 9"
    return json.loads(f'"{instr}"'), criteria


# ── Supabase (REST, clé anon de config.json) ───────────────────────────────

CFG = json.loads((ROOT / "config.json").read_text())


def supabase_get(path, page=1000):
    rows, start = [], 0
    while True:
        req = urllib.request.Request(
            f"{CFG['supabase_url']}/rest/v1/{path}",
            headers={"apikey": CFG["supabase_anon_key"],
                     "Authorization": f"Bearer {CFG['supabase_anon_key']}",
                     "Range": f"{start}-{start + page - 1}"})
        with urllib.request.urlopen(req, timeout=30) as r:
            batch = json.load(r)
        rows += batch
        if len(batch) < page:
            return rows
        start += page


def load_dataset():
    labels = supabase_get("human_classifications?select=article_id,userneed,classified_at&order=classified_at.asc")
    # Plusieurs labellisateurs possibles par article : on garde le plus récent.
    by_article = {}
    for l in labels:
        by_article[l["article_id"]] = l["userneed"]
    conflits = len(labels) - len(by_article)

    articles = {}
    ids = list(by_article)
    for i in range(0, len(ids), 100):
        chunk = ",".join(ids[i:i + 100])
        for a in supabase_get(f"articles?select=id,titre,chapo,corps&id=in.({chunk})"):
            articles[a["id"]] = a
    data = [(articles[i], by_article[i]) for i in ids if i in articles]
    return data, conflits


def load_jev_run(run_id):
    rows = supabase_get(f"ai_analyses?select=article_id,predicted_userneed&test_run_id=eq.{run_id}")
    return {r["article_id"]: r["predicted_userneed"] for r in rows}


# ── Lecture défensive de la réponse Laya ───────────────────────────────────

def parse_answer(answer, labels):
    """Renvoie (distribution triée, confiance, escalate) quel que soit le format exact."""
    probs = answer.get("probabilities") or answer.get("scores") or {}
    if isinstance(probs, list):  # [{"option":..,"probability":..}] éventuel
        probs = {p.get("option") or p.get("label"): p.get("probability") or p.get("score") for p in probs}
    if not probs and answer.get("choice"):
        probs = {answer["choice"]: answer.get("confidence", 1.0)}
    ranked = sorted(((k, float(v)) for k, v in probs.items() if k in labels), key=lambda kv: -kv[1])
    # answer_confidence = max(p), la seule confiance calibrée chez Laya ; `confidence`
    # est une entropie normalisée, sur une autre échelle (cf. laya/common.py).
    conf = answer.get("answer_confidence", ranked[0][1] if ranked else None)
    return ranked, conf, (answer.get("action") or {}).get("act_probability")


def mcnemar_p(b, c):
    """Test exact bilatéral (binomial) sur les paires discordantes."""
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    return min(1.0, 2 * sum(comb(n, i) for i in range(k + 1)) / 2 ** n)


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, help="n'évaluer que les N premiers articles")
    ap.add_argument("--max-len", type=int, default=8192, help="contexte du checkpoint multilingue (1024 par défaut chez Laya)")
    ap.add_argument("--head-max-len", type=int, default=None,
                    help="budget tokens question + options (192 par défaut chez Laya ; chaque option est de toute façon coupée à 48)")
    ap.add_argument("--criteria-file", help="JSON {userneed: définition} à la place de USERNEED_CRITERIA")
    ap.add_argument("--model", default="multilingual")
    ap.add_argument("--jev-run", help="test_run_id Jev pour comparaison article par article")
    ap.add_argument("--list-jev-runs", action="store_true")
    args = ap.parse_args()

    if args.list_jev_runs:
        for r in supabase_get("test_runs?select=id,name,analyzed_articles,concordant_percent,started_at"
                              "&llm_model=ilike.*jev*&order=started_at.desc"):
            print(r)
        return

    instructions, criteria = load_decision_prompt()
    if args.criteria_file:
        criteria = json.loads(Path(args.criteria_file).read_text(encoding="utf-8"))
        assert sorted(criteria) == sorted(load_decision_prompt()[1]), "les 9 libellés doivent être identiques"
    labels = list(criteria)
    data, conflits = load_dataset()
    if args.limit:
        data = data[:args.limit]
    print(f"{len(data)} articles  ({conflits} labels en doublon écartés)  —  répartition : "
          f"{dict(Counter(y for _, y in data))}")

    from laya import Router
    router = Router()
    questions = {"userneed": {"type": "choice", "instructions": instructions, "criteria": criteria}}

    OUT_DIR.mkdir(exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    rows, t0 = [], time.time()
    for i, (a, truth) in enumerate(data, 1):
        state = {"titre": a["titre"], "chapo": a.get("chapo") or "", "corps": a.get("corps") or ""}
        res = router.predict(state, questions, model=args.model, max_len=args.max_len,
                             head_max_len=args.head_max_len)
        answer = res["answers"]["userneed"]
        if i == 1 and args.limit:
            print("Réponse brute du 1er article (vérifier le format) :")
            print(json.dumps(res, ensure_ascii=False, indent=2, default=str)[:2000])
        ranked, conf, esc = parse_answer(answer, labels)
        rows.append({"article_id": a["id"], "truth": truth,
                     "p1": ranked[0][0] if ranked else answer.get("choice"),
                     "top3": [k for k, _ in ranked[:3]], "confidence": conf, "escalate": esc,
                     "probabilities": dict(ranked)})
        if i % 50 == 0:
            print(f"  {i}/{len(data)}  ({(time.time() - t0) / i * 1000:.0f} ms/article)")
    elapsed = time.time() - t0

    # ── Métriques, mêmes indicateurs que pour Jev ──
    n = len(rows)
    ok = [r["p1"] == r["truth"] for r in rows]
    top3 = sum(r["truth"] in r["top3"] for r in rows)
    variante = f"head={args.head_max_len or 192}" + (f", critères={Path(args.criteria_file).stem}" if args.criteria_file else "")
    print(f"\n══ Laya {args.model} zero-shot, max_len={args.max_len}, {variante} — {n} articles, "
          f"{elapsed:.0f} s ({elapsed / n * 1000:.0f} ms/article)")
    print(f"Concordance P1        {sum(ok) / n:6.1%}   (Jev 1.13 : 71,7 %)")
    print(f"Bon need dans top 3   {top3 / n:6.1%}   (Jev 1.13 : 93,2 %)")

    print(f"\n{'Classe':22} {'n':>4} {'rappel':>7} {'prédits':>8} {'précision':>10}")
    pred = Counter(r["p1"] for r in rows)
    for u in labels:
        tp = sum(1 for r in rows if r["truth"] == u and r["p1"] == u)
        nt = sum(1 for r in rows if r["truth"] == u)
        print(f"{u:22} {nt:4} {tp / nt if nt else 0:7.1%} {pred[u]:8} {tp / pred[u] if pred[u] else 0:10.1%}")

    confs = [(r["confidence"], o) for r, o in zip(rows, ok) if isinstance(r["confidence"], (int, float))]
    if confs:
        print("\nConfiance → justesse (Jev : >80 % → 80,7 % ; <40 % → 32,4 %)")
        for lo, hi, lib in [(0.8, 1.01, "> 80 %"), (0.6, 0.8, "60-80 %"), (0.4, 0.6, "40-60 %"), (0, 0.4, "< 40 %")]:
            b = [o for c, o in confs if lo <= c < hi]
            if b:
                print(f"  {lib:8} {len(b):4} articles   justesse {sum(b) / len(b):6.1%}")
        # ECE sur 10 intervalles
        ece = sum(abs(sum(o for c, o in confs if k / 10 <= c < (k + 1) / 10 + (k == 9) * 0.01)
                      - sum(c for c, o in confs if k / 10 <= c < (k + 1) / 10 + (k == 9) * 0.01))
                  for k in range(10)) / len(confs)
        print(f"  ECE (calibration) : {ece:.3f}")

    if args.jev_run:
        jev = load_jev_run(args.jev_run)
        commun = [(r, jev[r["article_id"]]) for r in rows if r["article_id"] in jev]
        b = sum(1 for r, j in commun if r["p1"] == r["truth"] and j != r["truth"])
        c = sum(1 for r, j in commun if r["p1"] != r["truth"] and j == r["truth"])
        jev_ok = sum(1 for r, j in commun if j == r["truth"])
        print(f"\nvs Jev (run {args.jev_run[:8]}, {len(commun)} articles communs) : "
              f"Jev {jev_ok / len(commun):.1%}  |  Laya corrige {b}, casse {c}, net {b - c:+d}, "
              f"McNemar p = {mcnemar_p(b, c):.4f}")

    tag = f"h{args.head_max_len or 192}" + (f"_{Path(args.criteria_file).stem}" if args.criteria_file else "")
    out = OUT_DIR / f"laya_{args.model}_{tag}_{stamp}.csv"
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        for r in rows:
            w.writerow({**r, "top3": "|".join(r["top3"]), "probabilities": json.dumps(r["probabilities"])})
    print(f"\nDétail par article : {out.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
