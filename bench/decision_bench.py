"""Banc d'essai des modèles de décision : Jev 1.13 (OpenRouter) vs Cloudflare Clef / Clef-flash.

Protocole identique au run Jev de référence (3f4eb129, 488 articles, 82,4 %) :
- state        = {titre, chapo, corps}, champs vides → '' et aucune troncature (comme script.js)
- instructions = DECISION_INSTRUCTIONS_DEFAULT de script.js
- criteria     = USERNEED_CRITERIA de script.js (jeu « V5 »), dans le même ordre
                 — l'ordre compte : en cas d'égalité, Clef suit l'ordre des options.
- articles     = exactement ceux du run de référence ; vérité = dernier label humain.

Usage :
    python3 bench/decision_bench.py --provider clef --limit 1 --raw 1     # réponse brute
    python3 bench/decision_bench.py --provider clef --limit 10 --raw 2
    python3 bench/decision_bench.py --provider clef-flash --concurrency 8
    python3 bench/decision_bench.py --provider jev --from-run              # prédictions Jev déjà en base
    python3 bench/decision_bench.py --report bench/results/a.csv bench/results/b.csv

Secrets lus dans l'environnement, jamais affichés : CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AUTH_TOKEN,
OPENROUTER_API_KEY (repli : config.json). URL de base surchargeable : CLEF_BASE_URL, JEV_BASE_URL
(pour viser l'API IA interne ou un auto-hébergement sans toucher au reste).
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import random
import socket
import statistics
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from laya_zero_shot import CFG, ROOT, OUT_DIR, load_decision_prompt, mcnemar_p, supabase_get  # noqa: E402

REFERENCE_RUN = "3f4eb129-7b94-4540-9810-6bdba2213787"
QUESTION_ID = "userneed"  # identique à server.py
TIMEOUT_S = 30
MAX_RETRIES = 3
PRICE_PER_M_INPUT = {"clef": 0.24, "clef-flash": 0.09, "jev": 0.042}


# ── Prédiction ─────────────────────────────────────────────────────────────

@dataclass
class Prediction:
    article_id: str
    model: str
    userneed: str | None = None
    probabilities: dict = field(default_factory=dict)
    confidence: float | None = None   # champ du modèle : CONCENTRATION, pas P(juste)
    p_max: float | None = None        # probabilité de l'option retenue
    latency_ms: float | None = None
    input_tokens: int | None = None
    raw: dict | None = None
    error: str | None = None


def parse_answer(answer: dict, labels: list) -> tuple:
    """(choix, probabilités ordonnées, confiance) — même lecture que server.py."""
    probs = answer.get("probabilities") or {}
    if not probs and answer.get("choice"):
        probs = {answer["choice"]: answer.get("confidence", 1.0)}
    probs = {k: float(v) for k, v in probs.items() if k in labels}
    choice = answer.get("choice") or (max(probs, key=probs.get) if probs else None)
    return choice, probs, answer.get("confidence")


# ── Fournisseurs ───────────────────────────────────────────────────────────

class DecisionProvider:
    name = "?"

    def __init__(self, instructions: str, criteria: dict):
        self.instructions, self.criteria = instructions, criteria

    def build_body(self, state: dict) -> dict:
        raise NotImplementedError

    def url(self) -> str:
        raise NotImplementedError

    def headers(self) -> dict:
        raise NotImplementedError

    def unwrap(self, resp: dict) -> dict:
        return resp

    def questions(self) -> dict:
        return {QUESTION_ID: {"type": "choice", "instructions": self.instructions, "criteria": self.criteria}}

    def classify(self, article: dict) -> Prediction:
        state = {"titre": article.get("titre") or "", "chapo": article.get("chapo") or "",
                 "corps": article.get("corps") or ""}
        pred = Prediction(article_id=article["id"], model=self.name)
        data = json.dumps(self.build_body(state)).encode("utf-8")
        t0 = time.perf_counter()
        try:
            resp = http_post(self.url(), data, self.headers())
        except Exception as e:  # échec définitif : on note et on continue
            pred.latency_ms = (time.perf_counter() - t0) * 1000
            pred.error = f"{type(e).__name__}: {e}"[:500]
            return pred
        pred.latency_ms = (time.perf_counter() - t0) * 1000
        pred.raw = resp
        body = self.unwrap(resp)
        answer = (body.get("answers") or {}).get(QUESTION_ID)
        if not answer:
            pred.error = "réponse sans answers.userneed"
            return pred
        pred.userneed, pred.probabilities, pred.confidence = parse_answer(answer, list(self.criteria))
        pred.p_max = pred.probabilities.get(pred.userneed)
        usage = body.get("usage") or {}
        pred.input_tokens = usage.get("prompt_tokens") or usage.get("input_tokens")
        return pred


class JevProvider(DecisionProvider):
    """Reproduit à l'identique la requête de server.py:_call_openrouter_decisions."""
    name = "jev"
    model = "typesafe/jev-1.13"

    def build_body(self, state):
        return {"model": self.model, "state": state, "questions": self.questions()}

    def url(self):
        return (os.environ.get("JEV_BASE_URL") or "https://openrouter.ai/api/alpha") + "/decisions"

    def headers(self):
        key = os.environ.get("OPENROUTER_API_KEY") or CFG.get("openrouter_api_key")
        return {"Content-Type": "application/json", "Authorization": f"Bearer {key}",
                "HTTP-Referer": "https://franceinfo.fr", "X-Title": "Franceinfo Userneeds Analysis"}


class ClefProvider(DecisionProvider):
    """Cloudflare Workers AI — API annoncée compatible Jev."""

    def __init__(self, model: str, *a):
        super().__init__(*a)
        self.name = model  # "clef" | "clef-flash"

    def build_body(self, state):
        return {"model": self.name, "state": state, "questions": self.questions()}

    def url(self):
        base = os.environ.get("CLEF_BASE_URL")
        if not base:
            acct = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
            if not acct:
                raise SystemExit("CLOUDFLARE_ACCOUNT_ID absent de l'environnement")
            base = f"https://api.cloudflare.com/client/v4/accounts/{acct}/ai/run"
        return f"{base}/@cf/cloudflare/{self.name}"

    def headers(self):
        tok = os.environ.get("CLOUDFLARE_AUTH_TOKEN")
        if not tok:
            raise SystemExit("CLOUDFLARE_AUTH_TOKEN absent de l'environnement")
        return {"Content-Type": "application/json", "Authorization": f"Bearer {tok}"}

    def unwrap(self, resp):
        # Workers AI enveloppe souvent la sortie dans {"result": ..., "success": true}
        return resp["result"] if isinstance(resp.get("result"), dict) else resp


def make_provider(name: str) -> DecisionProvider:
    instructions, criteria = load_decision_prompt()
    if name == "jev":
        return JevProvider(instructions, criteria)
    if name in ("clef", "clef-flash"):
        return ClefProvider(name, instructions, criteria)
    raise SystemExit(f"fournisseur inconnu : {name}")


# ── HTTP : timeout 30 s, 3 relances avec backoff sur 429 / 5xx / réseau ─────

def http_post(url: str, data: bytes, headers: dict) -> dict:
    for attempt in range(MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(url, data=data, method="POST", headers=headers)
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            retriable = e.code == 429 or e.code >= 500
            if not retriable or attempt == MAX_RETRIES:
                detail = e.read()[:300].decode("utf-8", "replace")
                raise RuntimeError(f"HTTP {e.code} {detail}") from None
            wait = float(e.headers.get("Retry-After") or 0) or 2 ** attempt + random.random()
        except (urllib.error.URLError, TimeoutError, socket.timeout) as e:  # socket.timeout ≠ TimeoutError en 3.9
            if attempt == MAX_RETRIES:
                raise RuntimeError(f"réseau : {e}") from None
            wait = 2 ** attempt + random.random()
        time.sleep(wait)


# ── Données ────────────────────────────────────────────────────────────────

def load_truth() -> dict:
    by_article = {}
    for l in supabase_get("human_classifications?select=article_id,userneed,classified_at&order=classified_at.asc"):
        by_article[l["article_id"]] = l["userneed"]  # le plus récent l'emporte
    return by_article


def load_reference(run_id: str) -> list:
    return supabase_get(f"ai_analyses?select=article_id,predicted_userneed,raw_response&test_run_id=eq.{run_id}")


def load_articles(ids: list) -> dict:
    out = {}
    for i in range(0, len(ids), 100):
        for a in supabase_get(f"articles?select=id,titre,chapo,corps&id=in.({','.join(ids[i:i + 100])})"):
            out[a["id"]] = a
    return out


# ── CSV ────────────────────────────────────────────────────────────────────

def write_csv(path: Path, preds: list, truth: dict, labels: list):
    cols = ["article_id", "truth", "prediction", "confidence", "p_max"] + [f"p_{u}" for u in labels] \
        + ["latency_ms", "input_tokens", "error"]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for p in preds:
            w.writerow([p.article_id, truth.get(p.article_id), p.userneed, p.confidence, p.p_max]
                       + [p.probabilities.get(u) for u in labels]
                       + [None if p.latency_ms is None else round(p.latency_ms), p.input_tokens, p.error])


def read_csv(path: Path) -> tuple:
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    num = lambda v: float(v) if v not in (None, "") else None  # noqa: E731
    labels = [c[2:] for c in rows[0] if c.startswith("p_") and c != "p_max"]
    preds, truth = [], {}
    for r in rows:
        truth[r["article_id"]] = r["truth"]
        preds.append(Prediction(article_id=r["article_id"], model=path.stem.split("_")[0],
                                userneed=r["prediction"] or None, confidence=num(r["confidence"]),
                                p_max=num(r["p_max"]), latency_ms=num(r["latency_ms"]),
                                input_tokens=int(num(r["input_tokens"])) if num(r["input_tokens"]) else None,
                                probabilities={u: num(r[f"p_{u}"]) for u in labels if num(r[f"p_{u}"]) is not None},
                                error=r["error"] or None))
    return preds, truth, labels


# ── Métriques ──────────────────────────────────────────────────────────────

def metrics(preds: list, truth: dict, labels: list, model: str) -> dict:
    ok_preds = [p for p in preds if not p.error and p.userneed]
    n = len(ok_preds)
    pairs = [(truth[p.article_id], p.userneed) for p in ok_preds]
    conf = {t: Counter() for t in labels}
    for t, y in pairs:
        conf[t][y] += 1
    per = {}
    for u in labels:
        tp = conf[u][u]
        npred = sum(conf[t][u] for t in labels)
        ntrue = sum(conf[u].values())
        P = tp / npred if npred else 0.0
        R = tp / ntrue if ntrue else 0.0
        per[u] = {"n": ntrue, "pred": npred, "precision": P, "recall": R,
                  "f1": 2 * P * R / (P + R) if P + R else 0.0}
    top_conf = Counter({(t, y): c for t in labels for y, c in conf[t].items() if t != y}).most_common(5)

    def bins(key, edges=None):
        if edges is None:
            edges = [(0.9, 9, "≥ 0,9"), (0.7, 0.9, "0,7–0,9"), (-1, 0.7, "< 0,7")]
        out = []
        for lo, hi, lib in edges:
            b = [t == p.userneed for p, (t, _) in zip(ok_preds, pairs)
                 if getattr(p, key) is not None and lo <= getattr(p, key) < hi]
            out.append((lib, len(b), len(b) / n if n else 0, sum(b) / len(b) if b else None))
        return out

    def terciles(key):
        # Tranches de même effectif : les distributions de Clef sont plates,
        # les seuils fixes laisseraient presque tout dans « < 0,7 ».
        vals = sorted(getattr(p, key) for p in ok_preds if getattr(p, key) is not None)
        if len(vals) < 3:
            return []
        t1, t2 = vals[len(vals) // 3], vals[2 * len(vals) // 3]
        f = lambda x: f"{x:.2f}".replace(".", ",")  # noqa: E731
        return bins(key, [(t2, 9, f"≥ {f(t2)}"), (t1, t2, f"{f(t1)}–{f(t2)}"), (-1, t1, f"< {f(t1)}")])

    seen = [v for v in per.values() if v["n"] or v["pred"]] or list(per.values())
    lat = sorted(p.latency_ms for p in preds if p.latency_ms is not None)
    toks = [p.input_tokens for p in ok_preds if p.input_tokens]
    return {
        "model": model, "n": n, "errors": len(preds) - n,
        "accuracy": sum(t == y for t, y in pairs) / n if n else 0,
        # Macro sur les classes présentes (vérité ou prédiction), comme sklearn
        "precision": statistics.mean(v["precision"] for v in seen),
        "recall": statistics.mean(v["recall"] for v in seen),
        "f1": statistics.mean(v["f1"] for v in seen),
        "per_class": per, "confusion": conf, "top_confusions": top_conf,
        "calib_confidence": bins("confidence"), "calib_pmax": bins("p_max"),
        "terc_confidence": terciles("confidence"), "terc_pmax": terciles("p_max"),
        "lat_median": statistics.median(lat) if lat else None,
        "lat_p95": lat[min(len(lat) - 1, int(round(0.95 * (len(lat) - 1))))] if lat else None,
        "tokens": sum(toks) if toks else None, "tokens_n": len(toks),
        "cost": sum(toks) / 1e6 * PRICE_PER_M_INPUT.get(model, 0) if toks else None,
    }


def pct(x):
    return "—" if x is None else f"{x * 100:.1f} %".replace(".", ",")


def print_metrics(m: dict, labels: list):
    print(f"\n══ {m['model']} — {m['n']} articles ({m['errors']} erreurs)")
    print(f"Concordance {pct(m['accuracy'])} | précision {pct(m['precision'])} | rappel {pct(m['recall'])}"
          f" | F1 macro {pct(m['f1'])}")
    print(f"\n{'User Need':22} {'n':>4} {'prédits':>8} {'précision':>10} {'rappel':>8} {'F1':>8}")
    for u in labels:
        v = m["per_class"][u]
        print(f"{u:22} {v['n']:4} {v['pred']:8} {pct(v['precision']):>10} {pct(v['recall']):>8} {pct(v['f1']):>8}")
    print("\nTop 5 confusions (vérité → prédit) :")
    for (t, y), c in m["top_confusions"]:
        print(f"  {c:3}  {t} → {y}")
    for key, lib in [("calib_confidence", "champ confidence"), ("calib_pmax", "p(option retenue)"),
                     ("terc_confidence", "champ confidence, terciles"), ("terc_pmax", "p(option retenue), terciles")]:
        if not m[key]:
            continue
        print(f"\nCalibration ({lib}) :")
        for b, nb, part, acc in m[key]:
            print(f"  {b:11} {nb:4} articles ({pct(part)})  justesse {pct(acc)}")
    if m["lat_median"] is not None:
        print(f"\nLatence : médiane {m['lat_median']:.0f} ms, p95 {m['lat_p95']:.0f} ms")
    if m["tokens"]:
        print(f"Tokens d'entrée : {m['tokens']} ({m['tokens_n']} réponses) → coût estimé {m['cost']:.4f} $")


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--provider", default=os.environ.get("DECISION_PROVIDER") or None,
                    choices=["jev", "clef", "clef-flash"])
    ap.add_argument("--run", default=REFERENCE_RUN, help="run de référence (articles + prédictions Jev)")
    ap.add_argument("--from-run", action="store_true", help="jev : relire les prédictions en base au lieu de rappeler")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--raw", type=int, default=0, help="afficher la réponse brute des N premiers articles")
    ap.add_argument("--retry-errors", type=Path, help="rejouer les articles en erreur d'un CSV et le réécrire")
    ap.add_argument("--report", nargs="+", type=Path, help="recalculer les métriques depuis des CSV")
    args = ap.parse_args()

    if args.report:
        for path in args.report:
            preds, truth, labels = read_csv(path)
            print_metrics(metrics(preds, truth, labels, preds[0].model), labels)
        return
    if args.retry_errors:
        preds, truth, labels = read_csv(args.retry_errors)
        provider = make_provider(preds[0].model)
        todo = [p.article_id for p in preds if p.error]
        fixed = {a["id"]: provider.classify(a) for a in load_articles(todo).values()}
        preds = [fixed.get(p.article_id, p) for p in preds]
        write_csv(args.retry_errors, preds, truth, labels)
        print(f"{len(todo)} article(s) rejoué(s), {sum(1 for p in fixed.values() if p.error)} encore en erreur")
        print_metrics(metrics(preds, truth, labels, preds[0].model), labels)
        return
    if not args.provider:
        ap.error("--provider (ou DECISION_PROVIDER) requis")

    labels = list(load_decision_prompt()[1])
    truth = load_truth()
    ref = load_reference(args.run)
    ids = [r["article_id"] for r in ref if r["article_id"] in truth]
    if args.limit:
        ids = ids[:args.limit]
    print(f"{len(ids)} articles du run {args.run[:8]} — répartition {dict(Counter(truth[i] for i in ids))}")

    if args.provider == "jev" and args.from_run:
        by_id = {r["article_id"]: r for r in ref}
        preds = []
        for i in ids:
            probs = {k: float(v) for k, v in json.loads(by_id[i]["raw_response"] or "{}").items() if k in labels}
            choice = by_id[i]["predicted_userneed"]
            preds.append(Prediction(article_id=i, model="jev", userneed=choice, probabilities=probs,
                                    p_max=probs.get(choice)))
    else:
        provider = make_provider(args.provider)
        articles = load_articles(ids)
        todo = [articles[i] for i in ids if i in articles]
        t0 = time.time()
        with ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as ex:
            preds = []
            for k, p in enumerate(ex.map(provider.classify, todo), 1):
                preds.append(p)
                if k <= args.raw:
                    print(f"\n── Réponse brute #{k} ({p.article_id}, vérité {truth[p.article_id]}) :")
                    print(json.dumps(p.raw, ensure_ascii=False, indent=2)[:3000] if p.raw else p.error)
                if k % 50 == 0:
                    print(f"  {k}/{len(todo)}  ({(time.time() - t0) / k:.1f} s/article en moyenne)")
        if args.limit and args.limit <= 20:
            print(f"\n{'article':38} {'vérité':20} {'prédit':20} {'conf':>5} {'pmax':>5} {'ms':>6}")
            for p in preds:
                mark = "✓" if p.userneed == truth[p.article_id] else "✗"
                f = lambda x: "—" if x is None else f"{x:.2f}"  # noqa: E731
                print(f"{p.article_id:38} {truth[p.article_id]:20} {str(p.userneed or p.error)[:20]:20} "
                      f"{f(p.confidence):>5} {f(p.p_max):>5} {p.latency_ms or 0:6.0f} {mark}")

    m = metrics(preds, truth, labels, args.provider)
    print_metrics(m, labels)

    if args.provider != "jev":
        jev = {r["article_id"]: r["predicted_userneed"] for r in ref}
        com = [p for p in preds if p.userneed and p.article_id in jev]
        b = sum(1 for p in com if p.userneed == truth[p.article_id] != jev[p.article_id])
        c = sum(1 for p in com if jev[p.article_id] == truth[p.article_id] != p.userneed)
        print(f"\nvs Jev ({len(com)} articles communs) : corrige {b}, casse {c}, net {b - c:+d}, "
              f"McNemar p = {mcnemar_p(b, c):.4f}")

    OUT_DIR.mkdir(exist_ok=True)
    out = OUT_DIR / f"{args.provider}_{len(ids)}_{time.strftime('%Y%m%d-%H%M%S')}.csv"
    write_csv(out, preds, truth, labels)
    print(f"\nDétail par article : {out.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
