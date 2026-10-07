"""Le fournisseur `jev` du banc doit envoyer exactement la requête de server.py.

    python3 -m unittest bench/test_decision_bench.py
"""
import io
import json
import sys
import types
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))

import decision_bench as db  # noqa: E402
import server  # noqa: E402

ARTICLE = {"id": "a1", "titre": "Titre é", "chapo": None, "corps": "Corps\n« guillemets »"}
JEV_ANSWER = {"answers": {"userneed": {"choice": "VERIFY", "confidence": 0.8,
                                       "probabilities": {"VERIFY": 0.9, "FEEL": 0.1}}}}


def capture(fn):
    """Exécute fn en interceptant urlopen ; renvoie la Request envoyée."""
    sent = []

    def fake(req, timeout=None):
        sent.append(req)
        return io.BytesIO(json.dumps(JEV_ANSWER).encode())

    with mock.patch("urllib.request.urlopen", fake):
        fn()
    return sent[0]


class JevIdentique(unittest.TestCase):
    def setUp(self):
        self.provider = db.make_provider("jev")

    def test_corps_identique_a_server_py(self):
        # Ce que le front envoie (script.js : champs vides → '')
        state = {"titre": ARTICLE["titre"], "chapo": "", "corps": ARTICLE["corps"]}
        ref = capture(lambda: server.ProxyHTTPRequestHandler._call_openrouter_decisions(
            types.SimpleNamespace(_DECISION_RANKS=server.ProxyHTTPRequestHandler._DECISION_RANKS), "KEY", "typesafe/jev-1.13", state, self.provider.instructions, self.provider.criteria))
        new = capture(lambda: self.provider.classify(ARTICLE))
        self.assertEqual(new.data, ref.data)
        self.assertEqual(new.full_url, ref.full_url)
        for h in ("Content-type", "Http-referer", "X-title"):
            self.assertEqual(new.get_header(h), ref.get_header(h))

    def test_ordre_des_options_conserve(self):
        body = self.provider.build_body({})
        self.assertEqual(list(body["questions"]["userneed"]["criteria"]), list(self.provider.criteria))

    def test_clef_meme_question_que_jev(self):
        clef = db.ClefProvider("clef-flash", self.provider.instructions, self.provider.criteria)
        self.assertEqual(clef.build_body({})["questions"], self.provider.build_body({})["questions"])

    def test_clef_deballe_result(self):
        clef = db.ClefProvider("clef", self.provider.instructions, self.provider.criteria)
        self.assertEqual(clef.unwrap({"result": JEV_ANSWER, "success": True}), JEV_ANSWER)
        self.assertEqual(clef.unwrap(JEV_ANSWER), JEV_ANSWER)

    def test_lecture_reponse(self):
        with mock.patch("urllib.request.urlopen", lambda req, timeout=None: io.BytesIO(json.dumps(JEV_ANSWER).encode())):
            p = self.provider.classify(ARTICLE)
        self.assertEqual((p.userneed, p.confidence, p.p_max), ("VERIFY", 0.8, 0.9))


if __name__ == "__main__":
    unittest.main()
