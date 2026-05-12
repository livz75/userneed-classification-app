# Brief Dashboard "User Needs x Engagement" - Google Stitch

**Projet** : France Televisions / Franceinfo
**Objectif** : Obtenir les maquettes d'un dashboard de suivi de l'engagement par User Need
**Outil cible** : Google Stitch (generation de maquettes par IA)
**Date** : 01/04/2026

---

## 1. Contexte du projet

Franceinfo (site d'information de France Televisions) a mis en place un systeme de classification automatique de ses articles par "User Need" grace a l'IA. Chaque article publie par la redaction est automatiquement tague avec l'un des 8 User Needs suivants :

| User Need | Description courte | Couleur |
|-----------|-------------------|---------|
| **Update me** | Information factuelle breve sur l'actualite | Bleu #3b82f6 |
| **Explain me** | Vulgarisation, pedagogie, decryptage | Vert #10b981 |
| **Give me perspective** | Analyse, opinion, debat, plusieurs points de vue | Violet #8b5cf6 |
| **Give me a break** | Contenu leger, divertissant, insolite | Orange #f59e0b |
| **Give me concerning news** | Alerte sur un sujet impactant le quotidien | Rouge #ef4444 |
| **Inspire me** | Histoires positives, solutions, initiatives | Orange fonce #f97316 |
| **Make me feel the news** | Temoignages, immersion, emotion | Rose #ec4899 |
| **Reveal news** | Investigation, exclusivite, revelation | Cyan #06b6d4 |

Ce dashboard est la **phase finale du projet** : il permet de mesurer le ROI de cette classification en croisant les User Needs avec les metriques d'engagement fournies par l'API Chartbeat.

**L'enjeu** : Prouver que le tagging par User Need permet d'optimiser la production editoriale en identifiant quels types de contenus generent le plus d'engagement, et ou se trouvent les desequilibres entre production et performance.

---

## 2. Sources de donnees

### API Chartbeat (metriques d'engagement)
Metriques disponibles par article et agregeables par User Need :

| Metrique | Description | Unite |
|----------|-----------|-------|
| **Page Views** | Nombre total de pages vues | Nombre |
| **Unique Visitors** | Visiteurs uniques (dedupliques) | Nombre |
| **Quality Views** | Vues qualifiees (temps de lecture > seuil) | Nombre |
| **Engaged Minutes** | Minutes totales d'attention active | Minutes |
| **Avg. Engaged Time** | Temps moyen d'engagement par visite | Secondes |
| **Recirculation Rate** | % de visiteurs qui consultent un 2e article apres | % |
| **Loyal Visitors** | Visiteurs qui reviennent regulierement | Nombre |
| **Social Traffic** | Trafic provenant des reseaux sociaux | Nombre |
| **Search Traffic** | Trafic provenant de la recherche (Google, etc.) | Nombre |
| **Direct Traffic** | Trafic direct (URL, bookmarks) | Nombre |
| **Push/GNews Traffic** | Trafic depuis notifications push et Google News | Nombre |
| **Google Discover Traffic** | Trafic depuis Google Discover | Nombre |

### Base Supabase (classification IA)
- Articles tagges automatiquement par User Need
- ~200-300 articles/jour produits par la redaction
- Historique complet avec date de publication, categorie editoriale, auteur

### Matrice User Needs x Metriques (objectifs)
Chaque User Need a des metriques prioritaires et des objectifs differents :

| User Need | Metrique #1 | Metrique #2 | Metrique #3 | Avg. Time vise |
|-----------|-------------|-------------|-------------|----------------|
| Update me | Pageviews | Uniques | Push/GNews | < 0:30 |
| Explain me | Avg. Engaged Time | Quality Views | Search evergreen | > 1:00 |
| Give me perspective | Recirculation | Avg. Engaged Time | Loyal Visitors | > 0:45 |
| Give me a break | Social Traffic | Pageviews | Recirculation | 0:20-0:40 |
| Concerning news | Pageviews | Uniques | Direct Traffic | 0:30-0:45 |
| Inspire me | Social Traffic | Recirculation | Avg. Engaged Time | > 0:45 |
| Make me feel the news | Avg. Engaged Time | Quality Views | Loyal Visitors | > 1:00 |
| Reveal news | Quality Views | Avg. Engaged Time | Search Traffic | > 1:30 |

---

## 3. Description complete du dashboard

### 3.1 Layout general

Le dashboard utilise un layout a **sidebar fixe a gauche** + **contenu principal scrollable a droite**.

**Sidebar gauche (200px, fond tres fonce #0f172a)** :
- Logo Franceinfo en haut
- Navigation verticale :
  - Vue d'ensemble (icone grille)
  - Par User Need (icone tags)
  - Production vs Engagement (icone balance)
  - Top articles (icone trophee)
  - Tendances (icone graphique)
  - Alertes (icone cloche)
  - Parametres (icone engrenage)
- En bas : selecteur de periode (Aujourd'hui / 7j / 30j / Custom)

**Header (en haut du contenu principal, fond #1e293b)** :
- Titre de la page courante
- Selecteur de periode (date picker range)
- Bouton "Exporter PDF"
- Indicateur de derniere mise a jour des donnees ("Derniere synchro: il y a 5 min")

**Contenu principal (fond #0f172a, padding genereux)** :
- Cartes, graphiques et tableaux selon la page selectionnee

### 3.2 Page 1 : Vue d'ensemble

C'est la page d'accueil du dashboard. Elle donne une vision synthetique de la performance globale.

**Ligne 1 : 4 KPI cards en ligne (pleine largeur)**

```
+----------------+  +----------------+  +----------------+  +----------------+
| ARTICLES       |  | ENGAGED        |  | AVG. ENGAGED   |  | QUALITY        |
| PUBLIES        |  | MINUTES        |  | TIME           |  | VIEWS          |
|                |  |                |  |                |  |                |
|    847         |  |   2.4M         |  |   0:42         |  |   1.8M         |
|   +12% vs M-1  |  |  +8% vs M-1   |  |  +5s vs M-1    |  |  +15% vs M-1   |
+----------------+  +----------------+  +----------------+  +----------------+
```

Chaque carte :
- Fond #1e293b, coins arrondis 12px, bordure subtile #334155
- Titre en gris clair (#94a3b8), majuscules, petite taille (11px)
- Valeur principale en blanc (#f1f5f9), tres grande taille (32px), bold
- Variation vs mois precedent : vert si positif, rouge si negatif, avec fleche

**Ligne 2 : Graphique "Needs Map" (2/3 largeur) + Repartition production (1/3)**

**Needs Map (graphique a bulles / scatter)** :
- Axe X : Part de production (% des articles publies avec ce User Need)
- Axe Y : Part d'engagement (% des engaged minutes generees)
- Une bulle par User Need, taille proportionnelle au nombre d'articles
- Couleur = couleur du User Need
- Ligne diagonale pointillee = equilibre parfait (production = engagement)
- Bulles au-dessus de la diagonale = "surperformance" (produisent plus d'engagement que leur part de production)
- Bulles en dessous = "sous-performance"
- Label dans chaque bulle : nom court du User Need

Ce graphique est LE graphique central du dashboard. Il repond a la question : "Produit-on les bons contenus ?"

**Repartition production (donut chart)** :
- Donut colore par User Need
- Centre du donut : nombre total d'articles
- Legende a droite avec % par User Need
- Ordre : du plus produit au moins produit

**Ligne 3 : Tableau "Matrice User Needs x Metriques" (pleine largeur)**

Tableau a 9 colonnes :

| User Need | Articles | Page Views | Uniques | Quality Views | Engaged Min. | Avg. Time | Recirc. Rate | Trend |
|-----------|----------|-----------|---------|---------------|-------------|-----------|-------------|-------|

- Premiere colonne : badge colore avec le nom du User Need
- Colonnes metriques : valeur + mini sparkline (tendance 30 jours)
- Colonne Trend : fleche haut/bas coloree
- Tri par clic sur l'en-tete de chaque colonne
- Hover sur une ligne : fond legerement plus clair
- Clic sur une ligne : ouvre la page detail de ce User Need

**Ligne 4 : Alertes et insights (pleine largeur)**

```
+--------------------------------------------------+
|  INSIGHTS AUTOMATIQUES                            |
|                                                   |
|  [!] "Inspire me" a vu son Avg. Engaged Time     |
|      baisser de 18% cette semaine. 3 articles     |
|      sous-performent significativement.            |
|      [Voir les articles]                          |
|                                                   |
|  [*] "Explain me" surperforme : +25% de Quality   |
|      Views vs objectif. Le format "decryptage en  |
|      3 points" semble tres efficace.              |
|      [Voir le detail]                             |
+--------------------------------------------------+
```

Cartes d'insights generees automatiquement :
- Fond #1e293b, bordure gauche coloree (orange = alerte, vert = bonne nouvelle)
- Icone, texte descriptif, lien d'action
- Max 3-4 insights affiches

### 3.3 Page 2 : Detail par User Need

Quand on clique sur un User Need (depuis le tableau ou la sidebar), on arrive sur sa page dediee.

**Header de la page** :
- Badge User Need (grande taille, couleur)
- Description du User Need (1 ligne)
- Objectif d'Avg. Engaged Time : "Cible : > 1:00"
- Statut : badge vert "Objectif atteint" ou rouge "En dessous de l'objectif"

**Ligne 1 : 3 KPI cartes (les 3 metriques prioritaires de ce User Need)**

Exemple pour "Explain me" :
```
+-------------------+  +-------------------+  +-------------------+
| AVG. ENGAGED TIME |  | QUALITY VIEWS     |  | SEARCH TRAFFIC    |
|                   |  |                   |  |                   |
|     1:12          |  |    245K           |  |    89K            |
|    +8s vs cible   |  |   +12% vs M-1     |  |   +5% vs M-1     |
|  [=====>    ] OK  |  |  [========> ] OK  |  |  [======>  ] OK  |
+-------------------+  +-------------------+  +-------------------+
```

Chaque carte a une barre de progression vers l'objectif (vert si atteint, orange si proche, rouge si loin).

**Ligne 2 : Graphique temporel (pleine largeur)**

Graphique en courbes avec :
- Axe X : dates (periode selectionnee)
- Axe Y gauche : metrique principale (ex: Avg. Engaged Time)
- Axe Y droite : nombre d'articles publies (barres grises en arriere-plan)
- Ligne horizontale pointillee : objectif
- Zone verte au-dessus de l'objectif, zone rouge en dessous
- Tooltip au survol : date, valeur, nombre d'articles

**Ligne 3 : Top 10 articles (tableau)**

| # | Article | Date | Page Views | Avg. Time | Quality Views | Recirc. |
|---|---------|------|-----------|-----------|---------------|---------|
| 1 | "Comment le moustique tigre..." | 25/03 | 125K | 1:45 | 98K | 34% |
| 2 | "Les 5 choses a savoir sur..." | 24/03 | 89K | 1:32 | 72K | 28% |

- Titre cliquable (ouvre l'article)
- Ligne coloree si l'article surperforme nettement
- Colonne supplementaire : categorie editoriale (badge)

**Ligne 4 : Repartition par source de trafic (graphique en barres horizontales empilees)**

```
Search    [====================] 45%
Direct    [============]         28%
Social    [======]               15%
Push      [====]                 10%
Other     [=]                     2%
```

Permet de comprendre d'ou vient le trafic pour ce User Need.

### 3.4 Page 3 : Production vs Engagement

Page analytique avancee croisant la production editoriale et les resultats d'engagement.

**Ligne 1 : Graphique "Needs Map" (grande taille, pleine largeur)**

Meme graphique a bulles que sur la vue d'ensemble, mais en plus grand avec :
- Annotations sur chaque bulle (% production, % engagement)
- Zones colorees :
  - Haut-gauche (vert) : "Surperformance - peu produit mais tres engage"
  - Bas-droite (rouge) : "Sous-performance - beaucoup produit mais peu engage"
  - Diagonale (neutre) : "Equilibre"
- Legende complete en dessous

**Ligne 2 : Comparaison production vs engagement (barres cote a cote)**

Pour chaque User Need, 2 barres :
- Barre gauche (grise) : % de la production
- Barre droite (coloree) : % de l'engagement (engaged minutes)

```
Update me      [==================] 42%   [============] 28%
Explain me     [========] 18%              [==============] 31%
Perspective    [======] 12%                [=========] 18%
Break          [=======] 14%               [=====] 8%
Concerning     [====] 8%                   [=====] 9%
Inspire me     [==] 3%                     [==] 3%
Feel the news  [=] 2%                      [==] 3%
Reveal news    [=] 1%                      [=] 0.5%
```

**Ligne 3 : Recommandations (cartes)**

```
+--------------------------------------------------+
|  RECOMMANDATIONS                                  |
|                                                   |
|  1. AUGMENTER "Explain me" (+30% de production)   |
|     ROI estime : +18% de Quality Views globales   |
|     Ratio actuel : 18% prod / 31% engagement      |
|                                                   |
|  2. REDUIRE "Update me" (-15% de production)      |
|     Chaque article Update me genere 2.3x moins    |
|     d'engaged minutes qu'un Explain me            |
|                                                   |
|  3. EXPLORER "Make me feel the news"              |
|     Seulement 2% de la production mais Avg.       |
|     Engaged Time de 1:28 (meilleur de tous)       |
+--------------------------------------------------+
```

### 3.5 Page 4 : Top articles

Page dediee au classement des articles les plus performants.

**Filtres en haut** :
- Par User Need (multi-select avec badges colores)
- Par categorie editoriale (Politique, Monde, Economie, etc.)
- Par periode
- Par metrique de tri (dropdown : Page Views / Engaged Time / Quality Views / Recirculation)

**Tableau principal (pleine largeur)** :

| # | User Need | Article | Categorie | Date | PV | Avg. Time | QV | Recirc. |
|---|-----------|---------|-----------|------|----|-----------|-----|---------|

- Badges colores pour User Need et Categorie
- Tri par clic sur chaque colonne
- Pagination (50 articles par page)
- Hover : bandeau gris clair

**Panneau lateral droit (optionnel, 350px)** :
Quand on clique sur un article, un panneau lateral s'ouvre avec :
- Titre complet + lien vers l'article
- Chapo
- User Need attribue (badge)
- Toutes les metriques Chartbeat detaillees
- Mini-graphique : evolution des vues sur 7 jours depuis publication
- Source de trafic (pie chart)
- Comparaison avec la moyenne du User Need

### 3.6 Page 5 : Tendances

Page dediee a l'evolution temporelle des performances.

**Ligne 1 : Selecteur de metrique + graphique multi-courbes**

- Dropdown pour choisir la metrique a afficher (Avg. Engaged Time, Page Views, Quality Views, etc.)
- Graphique avec une courbe par User Need (8 courbes, chacune dans sa couleur)
- Legende interactive : clic sur un User Need dans la legende pour le masquer/afficher
- Periode : semaine par semaine ou mois par mois

**Ligne 2 : Heatmap mensuelle (calendrier)**

```
        Lun  Mar  Mer  Jeu  Ven  Sam  Dim
Sem 1   [3]  [5]  [4]  [7]  [6]  [2]  [1]
Sem 2   [4]  [6]  [8]  [5]  [7]  [3]  [2]
...
```

Chaque cellule coloree selon l'intensite de la metrique selectionnee.
Permet de voir les patterns jour par jour (plus d'engagement le week-end ? le mardi ?).

**Ligne 3 : Chainages de User Needs (visualisation en flux)**

Visualisation de type Sankey ou alluvial :
- A gauche : le premier article lu par le visiteur (par User Need)
- Au milieu : le 2e article lu (recirculation)
- A droite : le 3e article lu

Permet de voir les enchainements : "Les lecteurs d'un Update me lisent ensuite un Explain me dans 34% des cas."

### 3.7 Page 6 : Alertes

Page de configuration et historique des alertes.

**Alertes actives** :
- "Notifier si Avg. Engaged Time de [User Need] baisse de plus de [X%] sur [periode]"
- "Notifier si la production de [User Need] est < [X articles] par jour"
- "Notifier si la recirculation de [User Need] passe sous [X%]"

**Historique des alertes** :
- Liste chronologique des alertes declenchees
- Chaque alerte : date, User Need, metrique, valeur, seuil, statut (vue/non vue)

---

## 4. Specifications visuelles pour Google Stitch

### Style general
- **Theme** : Dark mode exclusivement
- **Fond principal** : #0f172a (bleu tres fonce, presque noir)
- **Fond des cartes** : #1e293b (gris-bleu fonce)
- **Bordures des cartes** : #334155 (gris moyen), 1px, coins arrondis 12px
- **Texte principal** : #f1f5f9 (blanc casse)
- **Texte secondaire** : #94a3b8 (gris clair)
- **Texte tertiaire** : #64748b (gris moyen)
- **Accent principal** : #8b5cf6 (violet)
- **Succes** : #10b981 (vert emeraude)
- **Danger** : #ef4444 (rouge)
- **Warning** : #f59e0b (ambre)

### Typographie
- **Police** : Inter (Google Fonts) ou systeme (-apple-system, BlinkMacSystemFont)
- **Titres de page** : 24px, bold, blanc
- **Titres de section** : 16px, semibold, blanc
- **Labels** : 11px, uppercase, letter-spacing 0.05em, gris clair
- **Valeurs KPI** : 32px, bold, blanc
- **Corps de texte** : 14px, regular, gris clair
- **Metriques dans les tableaux** : 13px, medium, blanc

### Composants cles
- **Cartes KPI** : fond #1e293b, padding 20px, min-height 100px, shadow subtile
- **Badges User Need** : coins tres arrondis (16px), padding 4px 12px, fond = couleur du User Need avec opacite 20%, texte = couleur du User Need
- **Graphiques** : fond transparent, grille en rgba(255,255,255,0.06), labels en #64748b
- **Tableaux** : header sticky fond #1e293b, hover ligne en rgba(255,255,255,0.03), separateurs en #1e293b
- **Sidebar** : fond #0f172a, items 40px de haut, hover fond rgba(139,92,246,0.1), actif fond rgba(139,92,246,0.15) avec bordure gauche violette 3px
- **Sparklines** : 60px de large, 20px de haut, trait fin (1.5px), couleur du User Need

### Responsive
- Desktop uniquement (1440px+)
- Sidebar repliable en icones pour ecrans 1024-1439px

---

## 5. Mega prompt pour Google Stitch

Coller le texte ci-dessous dans Google Stitch pour generer les maquettes :

---

```
Design a professional dark-mode analytics dashboard for a French news media company (Franceinfo / France Televisions). This dashboard measures the engagement ROI of editorial content classified by "User Needs" — a taxonomy of 8 reader intent categories.

OVERALL LAYOUT:
- Fixed left sidebar (200px wide, background #0f172a) with navigation icons + labels: "Vue d'ensemble", "Par User Need", "Production vs Engagement", "Top articles", "Tendances", "Alertes", "Parametres". At the top: Franceinfo logo. At the bottom: a period selector (Aujourd'hui / 7j / 30j / Custom).
- Main content area (background #0f172a) with generous padding (24px) and scrollable content.
- Top header bar (background #1e293b, 56px height) with: page title on the left, date range picker in the center, "Export PDF" button and last sync indicator on the right.

DESIGN SYSTEM:
- Font: Inter. KPI values: 32px bold white. Section titles: 16px semibold white. Labels: 11px uppercase gray (#94a3b8) with letter-spacing. Body: 14px gray.
- Cards: background #1e293b, border 1px #334155, border-radius 12px, padding 20px, subtle shadow.
- 8 User Need categories, each with a distinct color: Update me (#3b82f6 blue), Explain me (#10b981 green), Give me perspective (#8b5cf6 purple), Give me a break (#f59e0b amber), Concerning news (#ef4444 red), Inspire me (#f97316 orange), Make me feel the news (#ec4899 pink), Reveal news (#06b6d4 cyan).
- User Need badges: pill-shaped, background = user need color at 20% opacity, text = user need color, font-size 12px semibold.
- Charts: transparent background, grid lines rgba(255,255,255,0.06), axis labels #64748b, data in user need colors.
- Tables: sticky header background #1e293b, row hover rgba(255,255,255,0.03), 13px font, medium weight for numbers.
- Positive variations in green (#10b981) with up arrow, negative in red (#ef4444) with down arrow.

PAGE 1 — "VUE D'ENSEMBLE" (Overview):

Row 1: Four KPI summary cards in a horizontal row spanning full width.
- Card 1: "ARTICLES PUBLIES" — large number "847", subtitle "+12% vs M-1" in green.
- Card 2: "ENGAGED MINUTES" — large number "2.4M", subtitle "+8% vs M-1" in green.
- Card 3: "AVG. ENGAGED TIME" — large number "0:42", subtitle "+5s vs M-1" in green.
- Card 4: "QUALITY VIEWS" — large number "1.8M", subtitle "+15% vs M-1" in green.

Row 2: Two cards side by side.
- Left card (65% width): "NEEDS MAP" — A scatter/bubble chart. X-axis = "Part de production (%)" from 0 to 50%. Y-axis = "Part d'engagement (%)" from 0 to 50%. A dashed diagonal line from origin represents perfect balance. 8 bubbles (one per User Need), each in its color, with the User Need short name inside. Bubble size = number of articles. Bubbles above the diagonal = overperforming (good). Bubbles below = underperforming. This is THE central chart of the entire dashboard.
- Right card (35% width): "REPARTITION PRODUCTION" — A donut chart showing the % of articles per User Need. Center of donut shows total articles count. Legend on the right with User Need names, colors, and percentages.

Row 3: Full-width table titled "MATRICE USER NEEDS x METRIQUES".
- Columns: User Need (badge), Articles (number), Page Views, Uniques, Quality Views, Engaged Min., Avg. Time, Recirc. Rate, Trend (arrow).
- 8 rows, one per User Need. Each User Need cell has a colored badge.
- Each metric cell shows the value + a tiny sparkline (60px wide, showing 30-day trend).
- Sortable by clicking column headers. Hover highlights the row.

Row 4: Full-width card titled "INSIGHTS AUTOMATIQUES".
- 2-3 insight cards stacked vertically.
- Each insight has a colored left border (orange for warnings, green for positive), an icon, a descriptive text paragraph, and a "Voir le detail" link.
- Example insight: "'Inspire me' saw Avg. Engaged Time drop 18% this week. 3 articles are significantly underperforming."

PAGE 2 — "PAR USER NEED" (User Need detail page):

Show the detail page for "Explain me" (green theme).

Header: Large green badge "EXPLAIN ME", description text, target "Cible Avg. Time: > 1:00", green status badge "Objectif atteint".

Row 1: Three KPI cards (the 3 priority metrics for this User Need).
- Card 1: "AVG. ENGAGED TIME" — value "1:12", "+8s vs cible", progress bar (green, 80% filled).
- Card 2: "QUALITY VIEWS" — value "245K", "+12% vs M-1", progress bar (green, 90% filled).
- Card 3: "SEARCH TRAFFIC" — value "89K", "+5% vs M-1", progress bar (green, 75% filled).

Row 2: Full-width line chart titled "EVOLUTION — AVG. ENGAGED TIME".
- X-axis: dates over 30 days. Y-axis left: Avg. Engaged Time (seconds). Y-axis right: number of articles (gray bar chart in background).
- Green line for Avg. Engaged Time. Horizontal dashed line at 1:00 = target. Green zone above, red zone below.
- Tooltip showing date, value, article count on hover.

Row 3: Table titled "TOP 10 ARTICLES — EXPLAIN ME".
- Columns: #, Article title, Date, Page Views, Avg. Time, Quality Views, Recirc. Rate.
- 10 rows of sample article data. Titles are clickable links. Category badges (Politique, Monde, etc.) in small gray pills.

Row 4: Horizontal stacked bar chart titled "SOURCES DE TRAFIC".
- Bars: Search 45%, Direct 28%, Social 15%, Push 10%, Other 2%. Different shades of green.

PAGE 3 — "PRODUCTION VS ENGAGEMENT":

Row 1: Large bubble chart "NEEDS MAP" (same as overview but larger, with percentage annotations on each bubble and colored quadrant zones: top-left green = "Surperformance", bottom-right red = "Sous-performance").

Row 2: Side-by-side bar chart for each User Need.
- For each of the 8 User Needs: a gray bar (% production) and a colored bar (% engagement) next to each other.
- Horizontal layout, User Need labels on the left.
- Visual gap between production and engagement bars highlights mismatches.

Row 3: Recommendation cards (3 cards in a row).
- Card 1: "AUGMENTER Explain me" with green accent. ROI estimate and current ratio.
- Card 2: "REDUIRE Update me" with orange accent. Comparative metric.
- Card 3: "EXPLORER Make me feel the news" with pink accent. Opportunity insight.

PAGE 4 — "TOP ARTICLES":

Filters bar at top: Multi-select User Need badges, category dropdown, date range, metric sort dropdown.

Full-width table with columns: #, User Need (badge), Article title, Categorie (badge), Date, Page Views, Avg. Time, Quality Views, Recirc. Rate.
- 20 sample rows with realistic French article titles.
- Pagination at bottom.

Optional: When clicking an article row, a 350px right panel slides in showing full article detail: title, description, User Need badge, all Chartbeat metrics, mini line chart (7-day views), pie chart (traffic sources), and comparison with User Need average.

PAGE 5 — "TENDANCES" (Trends):

Row 1: Dropdown selector for metric + multi-line chart.
- 8 colored lines (one per User Need) showing the selected metric over time (weekly view, 12 weeks).
- Interactive legend: click a User Need to toggle its visibility.

Row 2: Monthly heatmap calendar.
- Grid layout (7 columns for days, rows for weeks). Each cell colored by intensity of the selected metric. Color scale from dark (low) to bright (high).

Row 3: Sankey/alluvial diagram titled "CHAINAGES DE USER NEEDS".
- Left column: User Need of 1st article read. Middle: 2nd article. Right: 3rd article.
- Flows colored by source User Need. Shows how readers navigate from one type of content to another.
- Example: thick flow from "Update me" to "Explain me" (34% of recirculations).

GENERAL NOTES:
- All pages should look cohesive, professional, and data-rich but not cluttered.
- Inspiration: Linear app, Vercel dashboard, Mixpanel, Amplitude.
- The feel should be: authoritative, calm, insightful — like a Bloomberg terminal for editorial analytics.
- No mobile version needed. Desktop-first (1440px+).
- All text is in French.
- Use realistic sample data throughout (French article titles about current affairs).
```

---

## 6. Resume

Ce dashboard est la **piece maitresse du projet User Needs** : il transforme le tagging IA en insights actionnables pour la redaction. En croisant la classification automatique avec les metriques Chartbeat, il repond aux 3 questions fondamentales :

1. **Produit-on les bons contenus ?** (Needs Map : production vs engagement)
2. **Chaque User Need atteint-il ses objectifs ?** (KPIs par User Need avec cibles)
3. **Comment optimiser la production editoriale ?** (Recommandations automatiques)

Le prompt ci-dessus, passe a Google Stitch, doit generer 5 pages de maquettes haute fidelite en dark mode, avec des donnees realistes, pret a servir de base pour le developpement.
