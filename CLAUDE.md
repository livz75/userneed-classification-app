# Contexte du projet

POC (Proof of Concept) d'une app de **qualification des user needs** sur des articles France Info. Stack :

- **Front** : `index.html` + `style.css` + `script.js` (monolithique, ~5K lignes) + modules dans `js/`
- **Modules JS** : `js/article-manager.js`, `js/classification-manager.js`, `js/supabase-client.js`, `js/test-run-manager.js`
- **Backend** : `server.py` (Flask, deploy Render) + `fetch_articles.py` (cron qui alimente Supabase)
- **Données** : Supabase — schéma dans `supabase-schema.sql` et migrations `supabase-migration-*.sql`
- **Doc handoff** : `handoff design-to-code.html` — playbook PO pour la transition POC → app finale

## Workflow handoff design-to-code

Le PO (Livio) prépare un dossier pour transmettre ce POC à un dev qui implémentera la version finale d'après un design refait. Le livrable central est une **matrice de correspondance** (voir `handoff design-to-code.html` §II), avec 4 verdicts possibles par composant : **REUSE**, **ADAPT**, **REWRITE**, **NEW**.

### Quand Livio envoie une paire de captures (POC + design final)

Pour **chaque composant visible**, fournir une fiche au format ci-dessous, prête à coller dans la matrice. Si plusieurs composants distincts apparaissent sur les captures (sidebar + tableau + modal par ex.), produire **N fiches séparées**, pas une seule.

```
─────────────────────────────────────────────
COMPOSANT : [nom court]
─────────────────────────────────────────────

▸ INVENTAIRE CODE POC
  HTML       index.html:Lstart-Lend
  CSS        style.css:Lstart-Lend  (sélecteurs principaux)
  JS         script.js:Lstart-Lend  (fonctions/handlers)
  Module     js/<file>.js:Lstart-Lend  (méthodes)
  Backend    server.py:Lstart-Lend  (endpoint)
  Data       table Supabase + colonnes utilisées

▸ DIVERGENCES (POC → Design) — passer les 6 familles
  Visuelle          [écart ou "identique"]
  Structurelle      [écart ou "identique"]
  Comportementale   [écart ou "identique"]
  Données           [écart ou "identique"]
  Métier            [écart ou "identique"]
  Non-fonctionnelle [A11y, perf, RGPD…]

▸ VERDICT PROPOSÉ : REUSE | ADAPT | REWRITE | NEW
  Pourquoi : [justification courte, ancrée sur les 6 familles]
  Effort estimé : [~X% d'un from-scratch]

▸ POINTS D'ATTENTION POUR LE DEV
  - [couplages cachés, state global, dépendances non évidentes]
```

### Règles complémentaires

- **Commit hash** : ajouter `@<short-hash>` à côté de chaque chemin de fichier (cf. `git rev-parse --short HEAD`), comme préconisé §2.1 du doc handoff.
- **Verdict limite** : si hésitation entre 2 verdicts (typiquement ADAPT vs REWRITE), le signaler explicitement avec pour/contre — Livio tranche. C'est la "question rituelle" §3.2.
- **Granularité** : 1 composant fonctionnel = 1 fiche. Ni "chaque bouton" (trop fin), ni "le module entier" (trop large). Heuristique : si un seul verdict couvre proprement le morceau, c'est la bonne taille.
- **6 familles toujours passées en revue** : ne pas se contenter de la divergence visuelle qui saute aux yeux. Lister explicitement chaque famille même si "identique" — c'est la garantie qu'on n'a rien oublié.

## Profil utilisateur

Livio Ricci, PO chez France Télévisions. Préfère :
- Français pour les échanges
- Réponses concises et structurées
- Validation explicite avant actions à risque (commit, push, suppression)
