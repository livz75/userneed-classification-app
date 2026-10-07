# Benchmark Cloudflare Clef / Clef-flash contre Jev 1.13

**Date** : 7 octobre 2026. **Banc** : `bench/decision_bench.py` (commit `885227c`).
**Corpus** : les 488 articles franceinfo publiés et annotés du run Jev de référence `3f4eb129`.
**Vérité terrain** : le dernier label humain de chaque article (`human_classifications`).

## En bref

- **Jev reste nettement devant.** Son F1 macro est de **82,1 %**, contre 68,1 % pour Clef et 62,5 % pour Clef-flash. Les deux écarts sont très significatifs (McNemar, p < 0,0001).
- **Clef fait même moins bien que le LLM classique** sur ce corpus : 68,1 % de F1 macro, contre 75,6 % pour Claude Opus 4.8.
- **Clef ne complète pas Jev.**
  - Sur les 162 articles où Jev est le moins sûr de lui, Jev en classe juste 94 et Clef seulement 68.
  - Une cascade « Jev, puis Clef quand Jev hésite » n'améliorerait donc rien.
- **La confiance de Clef trie bien, mais elle ne se lit pas comme un pourcentage.**
  - Elle reste toujours sous 0,7, alors que les articles du tiers le plus confiant sont justes à 90 %.
  - On ne peut donc pas l'afficher telle quelle dans PIC.
- **Clef est un peu plus rapide, et Clef-flash est bon marché.** La latence médiane est de 0,8 s pour Clef et de 0,5 s pour Clef-flash, et les 488 articles coûtent 0,38 $ et 0,14 $. Avec un tel écart de qualité, ces avantages ne pèsent pas.

## Protocole

Les trois modèles reçoivent **exactement la même requête**. Pour Jev, un test vérifie que le corps de requête est identique octet par octet à celui de l'app (`server.py`).

| Élément | Valeur |
|---|---|
| `state` | `{titre, chapo, corps}` ; les champs vides valent `''` et le texte n'est pas tronqué, comme dans l'app |
| `instructions` | « Quel est le besoin principal (userneed) auquel cet article répond pour le lecteur de franceinfo ? » |
| `criteria` | les 9 définitions V5 (`USERNEED_CRITERIA` dans `script.js`), dans le même ordre. L'ordre compte, car Clef départage les égalités selon l'ordre des options |
| Question | une seule question, de type `choice` et nommée `userneed` |
| Jev | prédictions déjà enregistrées pour le run `3f4eb129` (non rappelé) |
| Clef / Clef-flash | Workers AI `@cf/cloudflare/clef` et `@cf/cloudflare/clef-flash` ; 488 réponses sur 488, sans aucune erreur définitive |

Répartition du corpus : UPDATE ME 63, VERIFY 59, INSPIRE ME 54, FEEL 54, EXPLAIN ME 53, DIVERT ME 53, SUMMARIZE 52, GIVE ME PERSPECTIVE 52, GUIDE ME 48.

## 1. Tableau comparatif

| Métrique | Jev 1.13 | Clef | Clef-flash |
|---|---|---|---|
| Concordance (accuracy) | **82,4 %** | 68,2 % | 64,1 % |
| Précision macro | **83,2 %** | 77,6 % | 72,8 % |
| Rappel macro | **82,2 %** | 67,9 % | 64,2 % |
| **F1 macro** | **82,1 %** | 68,1 % | 62,5 % |
| Articles corrigés / cassés par rapport à Jev | — | 24 / 93 | 30 / 118 |
| McNemar contre Jev | — | p < 0,0001 | p < 0,0001 |
| Latence médiane / p95 | non mesurée¹ | 806 / 1 429 ms | 484 / 1 109 ms |
| Tokens d'entrée (488 articles) | ≈ 1,57 M² | 1 571 728 | 1 569 188 |
| Coût estimé (488 articles) | ≈ 0,07 $² | 0,38 $ | 0,14 $ |

¹ Le run Jev a été lancé depuis l'app, qui ne mesure pas la latence.
² Estimation à partir du nombre de tokens de Clef, au tarif Jev de 0,042 $ par million de tokens. Les deux tokenizers diffèrent.

Sur les 488 articles, les trois modèles ont raison ensemble sur 259 articles et ont tort ensemble sur 48. Clef et Jev donnent la même réponse sur 346 articles (71 %).

### F1 par User Need

| User Need | n | Jev | Clef | Clef-flash |
|---|---|---|---|---|
| UPDATE ME | 63 | **85,9 %** | 77,4 % | 50,5 % |
| EXPLAIN ME | 53 | **63,9 %** | 50,9 % | 51,7 % |
| GIVE ME PERSPECTIVE | 52 | **77,0 %** | 68,9 % | 64,8 % |
| SUMMARIZE | 52 | **89,1 %** | 84,7 % | 67,6 % |
| VERIFY | 59 | **90,4 %** | 76,3 % | 81,9 % |
| FEEL | 54 | **81,9 %** | 71,1 % | 67,9 % |
| GUIDE ME | 48 | **84,0 %** | 50,0 % | 32,1 % |
| INSPIRE ME | 54 | **84,8 %** | 59,7 % | 65,1 % |
| DIVERT ME | 53 | 81,7 % | 73,5 % | **81,7 %** |

### Les 5 confusions les plus fréquentes (vérité → prédiction)

| Rang | Jev | Clef | Clef-flash |
|---|---|---|---|
| 1 | EXPLAIN ME → GIVE ME PERSPECTIVE (10) | GUIDE ME → EXPLAIN ME (24) | UPDATE ME → SUMMARIZE (30) |
| 2 | EXPLAIN ME → SUMMARIZE (9) | INSPIRE ME → FEEL (19) | GUIDE ME → EXPLAIN ME (28) |
| 3 | DIVERT ME → UPDATE ME (7) | DIVERT ME → EXPLAIN ME (11) | INSPIRE ME → FEEL (15) |
| 4 | INSPIRE ME → FEEL (5) | VERIFY → GIVE ME PERSPECTIVE (10) | GIVE ME PERSPECTIVE → EXPLAIN ME (12) |
| 5 | GUIDE ME → EXPLAIN ME (4) | GIVE ME PERSPECTIVE → EXPLAIN ME (9) | EXPLAIN ME → SUMMARIZE (8) |

La paire UPDATE ME / EXPLAIN ME, que l'on savait problématique, l'est peu sur ce corpus :
- Jev : 1 erreur dans chaque sens ;
- Clef : 6 dans un sens, 1 dans l'autre ;
- Clef-flash : 3 dans un sens, aucune dans l'autre.

### Matrices de confusion

Les matrices 9×9 complètes se recalculent depuis les CSV par article :

```
python3 bench/decision_bench.py --report bench/results/jev_488_20261007-201456.csv \
  bench/results/clef_488_20261007-203050.csv bench/results/clef-flash_488_20261007-203015.csv
```

## 2. Points forts et points faibles par User Need

**Jev 1.13** a le meilleur F1 partout, sauf sur DIVERT ME, où il est à égalité avec Clef-flash.
- Points forts : VERIFY (90 %), SUMMARIZE (89 %) et UPDATE ME (86 %).
- Point faible : EXPLAIN ME (64 %), qu'il disperse vers GIVE ME PERSPECTIVE et SUMMARIZE.
- GIVE ME PERSPECTIVE est son option par défaut : 70 prédictions pour 52 articles.

**Clef**
- Points forts :
  - SUMMARIZE (85 %, avec 90 % de rappel) ;
  - VERIFY, avec la meilleure précision des trois (97 %), mais il ne retrouve que 63 % des articles VERIFY ;
  - GUIDE ME et INSPIRE ME : 100 % de précision.
- Points faibles :
  - **EXPLAIN ME est son option par défaut** : il le choisit 112 fois pour 53 articles réels, soit 37,5 % de précision ;
  - il y range des articles GUIDE ME (24), DIVERT ME (11) et GIVE ME PERSPECTIVE (9) ;
  - GUIDE ME et INSPIRE ME ne sont retrouvés qu'à 33 % et 43 % : Clef ne les choisit que lorsqu'ils sont évidents ;
  - INSPIRE ME est confondu avec FEEL (19 cas).

**Clef-flash**
- Points forts :
  - DIVERT ME (82 %, avec 92 % de rappel) ;
  - VERIFY (82 %) ;
  - SUMMARIZE, avec 96 % de rappel.
- Points faibles :
  - **UPDATE ME s'effondre (F1 de 50 %) : 30 brèves d'actualité sont rangées en SUMMARIZE**, qui reçoit 96 prédictions pour 52 articles ;
  - GUIDE ME est presque introuvable : 9 prédictions seulement, soit 19 % de rappel.

## 3. La confiance de Clef peut-elle être affichée dans PIC ?

**Pas telle quelle.** En revanche, elle peut servir à trier les articles.

Les seuils prévus (≥ 0,9 / 0,7–0,9 / < 0,7) ne séparent rien : les distributions de Clef sont très plates.

| Clef : justesse par tranche de confiance | Champ `confidence` | Probabilité de l'option choisie |
|---|---|---|
| ≥ 0,9 | 0 article | 0 article |
| 0,7–0,9 | 0 article | 32 articles : 96,9 % justes |
| < 0,7 | 488 articles : 68,2 % justes | 456 articles : 66,2 % justes |

Avec des tranches de même effectif (terciles), la confiance trie bien les articles :

| Tercile | Clef (`confidence`) | Clef-flash (`confidence`) | Jev (probabilité de l'option choisie) |
|---|---|---|---|
| Haut | ≥ 0,27 : **90,2 %** justes | ≥ 0,25 : **89,0 %** | ≥ 0,99 : **94,4 %** |
| Milieu | 0,15–0,27 : 69,7 % | 0,14–0,25 : 57,4 % | 0,86–0,99 : 94,6 % |
| Bas | < 0,15 : 44,4 % | < 0,14 : 46,3 % | < 0,86 : 58,0 % |

Ce que ça signifie :
1. Comme Cloudflare le documente, le champ `confidence` mesure la **concentration** des probabilités. Ce n'est pas une probabilité d'avoir raison.
   - Une valeur de 0,27 correspond en réalité à environ 90 % de chances d'avoir raison.
   - L'afficher comme « confiance 27 % » induirait le lecteur en erreur.
2. Elle reste **un bon outil de tri**. Le tiers le plus confiant est juste à 90 %, le tiers le moins confiant à 44 %. Elle pourrait donc décider quels articles envoyer en relecture humaine.
3. Pour l'afficher, il faudrait d'abord la **recalibrer**, par exemple avec une régression isotonique apprise sur un jeu annoté. Sinon, on affiche des niveaux plutôt qu'un chiffre (« sûr / à vérifier / incertain »).
4. Jev reste meilleur sur ce point aussi.
   - Ses deux terciles supérieurs (67 % des articles) sont justes à environ 94 %.
   - Sa probabilité, déjà proche de la justesse réelle, se lit directement.
   - Réserve : son champ `confidence` n'a pas été enregistré par l'app, donc la comparaison porte sur la probabilité de l'option choisie.

## 4. Limites du test

- **Les définitions V5 ont été affinées sur ce même corpus de 488 articles.**
  - Les chiffres de Jev sont donc probablement optimistes, et ces définitions ont été mises au point pour Jev, pas pour Clef.
  - Il faut confirmer le classement sur un jeu de test indépendant.
  - Des définitions réécrites pour Clef pourraient réduire l'écart, mais ce test ne le mesure pas.
- **Les benchmarks publiés par Cloudflare ne sont pas indépendants et ont été réalisés en anglais.** Ici, le corpus, la question et les définitions sont en français, ce qui peut désavantager Clef.
- **Un seul run par modèle.** Pour ces modèles déterministes, la variance d'un run à l'autre n'a pas été mesurée.
- **La vérité terrain vient d'un seul annotateur par article** : on garde le label le plus récent, et 9 articles avaient des labels en double. Il n'existe pas de mesure d'accord entre annotateurs pour situer le plafond atteignable.
- **La latence de Jev n'a pas été mesurée**, et son coût est estimé : la comparaison des coûts est donc indicative.
- **Seule l'API hébergée par Cloudflare a été testée.** L'auto-hébergement des poids (Apache 2.0), voire leur fine-tuning, reste à évaluer. Attention : le chargeur local utilise par défaut `max_length=16384`, et nos requêtes font environ 3 200 tokens en moyenne, définitions comprises. Cette limite n'est donc pas un problème ici.
- Seuls des articles déjà publiés ont été envoyés à Cloudflare.

## Recommandation

- Garder **Jev 1.13** comme modèle de décision de référence.
- Ne pas retenir Clef, ni Clef-flash, en zero-shot avec ces définitions.

Deux pistes pour aller plus loin, si on le souhaite :
1. Rejouer Clef avec des définitions retravaillées sur ses confusions (EXPLAIN ME trop large, GUIDE ME et INSPIRE ME trop restrictifs), **en les évaluant sur un jeu indépendant**.
2. Évaluer un fine-tuning des poids open source, auto-hébergés ou déployés via l'*API IA offre d'infos*.

## Reproduire

```
set -a; source .env; set +a
python3 -m unittest bench/test_decision_bench.py
python3 bench/decision_bench.py --provider jev --from-run
python3 bench/decision_bench.py --provider clef --concurrency 4
python3 bench/decision_bench.py --provider clef-flash --concurrency 4
```

Fichiers par article (une ligne par article : vérité, prédiction, confiance, les 9 probabilités, latence, erreur) :
- `bench/results/jev_488_20261007-201456.csv`
- `bench/results/clef_488_20261007-203050.csv`
- `bench/results/clef-flash_488_20261007-203015.csv`
