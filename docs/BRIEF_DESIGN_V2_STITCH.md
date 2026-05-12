# Brief Design V2 - Analyse IA des User Needs

## Contexte

Application web interne France Televisions permettant de tester la capacite de differents modeles IA a classifier des articles Franceinfo selon 8 categories "User Needs" (besoins utilisateur). L'app compare les predictions IA aux classifications humaines pour evaluer la qualite des modeles et des prompts.

**Stack actuel :** HTML/CSS/JS vanilla, Supabase (base de donnees), OpenRouter (API LLM), theme sombre uniquement.

**Objectif V2 :** Moderniser radicalement le design tout en conservant l'architecture fonctionnelle. Penser dashboard professionnel, data-driven, inspire de Mixpanel/Linear/Vercel.

---

## Architecture de l'application

### Navigation principale (header fixe)

5 onglets dans une barre de navigation horizontale en haut :

| Onglet | Icone | Type d'affichage | Description |
|--------|-------|-------------------|-------------|
| Articles | Journal | Page principale inline | Gestion du corpus d'articles |
| LLM | Robot | Panneau lateral droit | Configuration du modele IA |
| Prompts | Document | Panneau lateral droit | Gestion des prompts systeme |
| Tests | Liste | Panneau lateral droit | Historique et comparaison des tests |
| Aide | ? | Modale centree | Guide utilisateur complet |

En plus des onglets, des **boutons d'action contextuels** apparaissent selon l'etat :
- Etat repos : bouton "Analyse IA" (lance l'analyse batch)
- Analyse en cours : boutons "Pause" et "Stop"
- En pause : bouton "Reprendre"
- Terminee : bouton "Reset"

---

## Section 1 : ARTICLES (page principale)

### 1.1 Barre d'outils superieure

Disposition en ligne horizontale :

```
[ Recherche par titre (input texte) ] [ Ajouter un article (input URL) ] [ + Ajouter (bouton) ]
```

- **Recherche** : filtrage en temps reel par mot-cle dans le titre
- **Ajout** : coller une URL Franceinfo, l'article est scrape et ajoute automatiquement

### 1.2 Filtres

Ligne sous la barre d'outils :

```
Filtrer : [ Tous ] [ Classifies ] [ Non classifies ]     329 classifies  [ Actualiser ]
```

- 3 boutons toggle (un seul actif a la fois)
- Compteur d'articles classifies a droite
- Bouton actualiser pour recharger depuis Supabase

### 1.3 Graphique de repartition du corpus (toggle)

Bouton "Repartition" qui affiche/masque un graphique a barres horizontales :
- 8 barres (une par User Need), remplissage en degrade
- Ligne pointillee "ideal" montrant la repartition equilibree
- Indicateur colore (vert/orange/rouge) selon l'equilibre
- Compteur par categorie

### 1.4 Liste d'articles (zone scrollable)

Chaque article est une **carte** contenant :

```
+------------------------------------------------------------------+
| #7895261  [POLITIQUE]                              22 mots       |
| Titre de l'article (lien cliquable)                              |
| Description/chapo sur 2 lignes max...                            |
|                                                                  |
| Publie le 26 mars 2026 a 11:02        [ -- Classifier -- v ]    |
+------------------------------------------------------------------+
```

Elements de chaque carte :
- **Badge ID** : numero externe de l'article (gris)
- **Badge categorie** : rubrique editoriale avec couleur (Politique=bleu, Monde=violet, Economie=vert, Culture=rose, Sport=orange, Sante=rouge, Faits-divers=jaune, etc.)
- **Badge type media** : article ou video (petit badge secondaire)
- **Titre** : cliquable, ouvre l'article sur franceinfo.fr
- **Chapo** : description tronquee a 2 lignes
- **Date de publication** : en bas a gauche
- **Nombre de mots** : en haut a droite
- **Dropdown de classification** : menu deroulant avec les 8 User Needs + option "Declassifier"

Quand un article est classifie, la carte affiche un **badge vert** avec le User Need choisi et un bouton X pour declassifier.

---

## Section 2 : ANALYSE IA (resultats inline, sous les articles)

Quand l'utilisateur lance une analyse, la page Articles se transforme pour afficher les resultats.

### 2.1 Barre de progression

```
[================>                    ]
Analyse en cours... 86/330 articles - 11min 12s - 7.7 art/min
Fin estimee dans 31min 46s
```

- Barre de progression animee (degrade violet vers bleu)
- Statistiques en temps reel : articles traites, duree, vitesse, ETA

### 2.2 Cartes de statistiques resumees (3 cartes en ligne)

```
+------------------+  +------------------+  +------------------+
|      TOTAL       |  |   CONCORDANTS    |  | NON-CONCORDANTS  |
|     86/330       |  |       48         |  |       38         |
|                  |  |     55.8%        |  |     44.2%        |
+------------------+  +------------------+  +------------------+
```

- Carte Total : fond neutre
- Carte Concordants : bordure/accent vert
- Carte Non-concordants : bordure/accent rouge

### 2.3 Matrice de confusion (8x8)

Grille interactive de 64 cellules :
- **Axe Y** : classification humaine (attendue)
- **Axe X** : prediction IA
- **Diagonale** : cellules vertes (concordance)
- **Hors diagonale** : cellules rouge/orange/jaune (erreurs)
- **Interactivite** : clic sur une cellule filtre le tableau de resultats pour montrer uniquement cette transition
- **Animation** : bordure pulsante sur la cellule selectionnee

Labels abreges sur les axes : "Update me", "Explain me", "Perspective", "Break", "Concerning", "Inspire", "Feel", "Reveal"

### 2.4 Filtres de resultats

Ligne de filtres au-dessus du tableau :

```
Confiance : [ Tous ] [ Haute ] [ Moyenne ] [ Basse ]
Concordance : [ Tous ] [ Concordants ] [ Non-concordants ]
```

### 2.5 Tableau de resultats detailles

Tableau a 6 colonnes, triable par clic sur l'en-tete :

| # | Article | Attendu | Predit | Justification | Confiance |
|---|---------|---------|--------|---------------|-----------|
| 1 | Titre (lien) | Badge User Need | Badge User Need | Icone bulle (ouvre modale) | Badge HAUTE/MOYENNE/BASSE |

- Lignes colorees selon concordance (vert clair si match, rouge clair sinon)
- Titre cliquable vers l'article original
- Badges colores pour chaque User Need
- Icone justification (bulle) ouvre une **modale** avec l'explication IA
- Badge confiance cliquable, ouvre une **modale** avec le detail des 3 predictions et leurs scores

### 2.6 Modale de justification

```
+---------------------------------------------------+
| Justification IA                              [X] |
|                                                   |
| Attendu : [Update me]  Predit : [Explain me]     |
| Statut : [Non-concordant] (badge rouge)           |
|                                                   |
| "L'article propose une analyse detaillee des      |
| mecanismes economiques en jeu, ce qui correspond  |
| davantage a un besoin d'explication..."            |
+---------------------------------------------------+
```

### 2.7 Modale de confiance

```
+---------------------------------------------------+
| Detail de confiance                           [X] |
|                                                   |
| 1. Explain me .......... 72/100                   |
| 2. Update me ........... 45/100                   |
| 3. Give me perspective . 38/100                   |
|                                                   |
| Delta : 27  |  ICP : 19.4  |  Niveau : HAUTE     |
+---------------------------------------------------+
```

### 2.8 Bouton "Adapter le prompt"

Bouton contextuel qui envoie les resultats actuels a l'IA pour obtenir des suggestions d'amelioration du prompt. L'IA repond avec un prompt optimise qui peut etre applique automatiquement.

---

## Section 3 : PANNEAU LLM (panneau lateral droit)

Panneau glissant depuis la droite, largeur ~50% de l'ecran.

### 3.1 Tableau de selection du modele

Tableau interactif avec ~24 modeles IA :

| Modele | Fournisseur | Qualite | Francais | Vitesse | Cout/50 art. |
|--------|-------------|---------|----------|---------|-------------|
| Claude 3.5 Haiku | Anthropic | 4/5 etoiles | Bon | Rapide | ~0.15$ |
| GPT-4o mini | OpenAI | 4/5 etoiles | Excellent | Moyen | ~0.20$ |
| Gemini Flash | Google | 3/5 etoiles | Bon | Tres rapide | ~0.05$ |

- Clic sur une ligne = selection du modele
- Badge "Recommande" (vert) sur certains modeles
- Couleurs par fournisseur : Anthropic=violet, OpenAI=vert, Google=bleu, Mistral=orange, Meta=rouge
- Indicateurs visuels : etoiles pour qualite, eclairs pour vitesse

### 3.2 Configuration API

- Champ de saisie pour la cle API OpenRouter (masque)
- Boutons Sauvegarder / Reinitialiser
- Lien vers openrouter.ai pour obtenir une cle

---

## Section 4 : PANNEAU PROMPTS (panneau lateral droit)

### 4.1 Liste des prompts

Chaque prompt est une carte :

```
+--------------------------------------------------+
| Mon prompt personnalise           [ACTIF] (vert) |
| Description courte du prompt...                   |
|                                                   |
| [Voir] [Dupliquer] [Modifier] [Supprimer] [Activer] |
+--------------------------------------------------+
```

- Badge "ACTIF" en vert sur le prompt selectionne
- Badge "PAR DEFAUT" sur le prompt systeme (non-supprimable)
- 5 boutons d'action par prompt

### 4.2 Boutons globaux

- "Creer un prompt" : ouvre une modale d'edition
- "Exporter" : telecharge tous les prompts en JSON
- "Importer" : charge des prompts depuis un fichier JSON

### 4.3 Modale d'edition de prompt

```
+---------------------------------------------------+
| Editer le prompt                              [X] |
|                                                   |
| Nom : [___________________________________]      |
| Description : [________________________________]  |
|                                                   |
| Contenu du prompt :                               |
| +-----------------------------------------------+ |
| | Tu es un classificateur d'articles...         | |
| | Les 8 categories sont :                       | |
| | ...                                           | |
| | (textarea monospace, 25 lignes)               | |
| +-----------------------------------------------+ |
|                                                   |
|                    [ Annuler ] [ Sauvegarder ]    |
+---------------------------------------------------+
```

---

## Section 5 : PANNEAU TESTS (panneau lateral droit)

### 5.1 Sous-onglets

```
[ Historique ] [ Classement ]
```

### 5.2 Historique

Liste des tests effectues, chacun dans une carte :

```
+--------------------------------------------------+
| Test du 25/03/2026 a 14:30                       |
| [Completed] (badge vert)                         |
| Modele : [Claude 3.5 Haiku] (badge violet)       |
| 330 articles - Concordance : 55.8%               |
|                                                   |
| [ ] Selectionner    [Voir] [Supprimer]           |
+--------------------------------------------------+
```

- Checkbox de selection pour comparaison (max 2)
- Bouton "Comparer" : affiche un tableau comparatif cote a cote avec analyse IA

### 5.3 Classement

#### Scatter plot
- Axe X : Concordance (%)
- Axe Y : F1 Macro
- Points colores par fournisseur de modele
- Zone verte (haut-droite) = meilleurs performers
- Legende sous le graphique
- Filtres par fournisseur (boutons toggle)

#### Tableau de classement
Tableau triable avec colonnes :

| Rang | Test | Modele | Prompt | Concordance | F1 Macro | Precision | Rappel |
|------|------|--------|--------|-------------|----------|-----------|--------|

- Medaille pour le meilleur run
- Metriques colorees (vert=meilleur, rouge=pire)
- Mini barres de progression dans les cellules

---

## Section 6 : MODALE AIDE

Grande modale centree avec scroll interne, contenant ~10 sections :

1. Presentation generale
2. Les 8 User Needs (tableau avec definitions)
3. Comment classifier un article
4. Comment lancer une analyse IA
5. Lire les resultats (matrice, tableau)
6. Gerer les prompts
7. Configurer le LLM
8. Comparer les tests
9. FAQ
10. Raccourcis et astuces

---

## Palette de couleurs actuelle

### Fond
- Background principal : #2c3e58 (bleu-gris fonce)
- Background cartes : #354b6a (bleu-gris moyen)
- Background sombre : #1f2d42 (bleu tres fonce)

### Texte
- Texte principal : #eaeaea (blanc casse)
- Texte secondaire : #b0b8c8 (gris-bleu clair)

### Accents
- Action principale : #8b5cf6 (violet)
- Action secondaire : #3b82f6 (bleu)
- Succes/Concordance : #10b981 (vert emeraude)
- Erreur/Non-concordance : #ef4444 (rouge)
- Avertissement : #f59e0b (orange/ambre)

### Couleurs par User Need
| User Need | Couleur |
|-----------|---------|
| Update me | #3b82f6 (bleu) |
| Explain me | #10b981 (vert) |
| Give me perspective | #8b5cf6 (violet) |
| Give me a break | #f59e0b (orange) |
| Give me concerning news | #ef4444 (rouge) |
| Inspire me | #f97316 (orange fonce) |
| Make me feel the news | #ec4899 (rose) |
| Reveal news | #06b6d4 (cyan) |

### Couleurs par fournisseur LLM
| Fournisseur | Couleur |
|-------------|---------|
| Anthropic | Violet |
| OpenAI | Vert |
| Google | Bleu |
| Mistral | Orange |
| Meta | Rouge |

---

## Typographie

- Police : Poppins (Google Fonts)
- Graisses : 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold), 800 (extra-bold)
- Taille de base : 0.9rem
- Code/API keys : monospace

---

## Composants transversaux

### Notifications toast
- Position : coin superieur droit
- Animation : slide-in depuis la droite
- Types : succes (bordure gauche verte), erreur (bordure gauche rouge)
- Duree : 4-5 secondes, auto-dismiss

### Badges
- Badges arrondis (border-radius complet)
- Tailles : petit (categories), moyen (statuts), grand (metriques)
- Styles : plein, outline, gradient

### Boutons
- Primaire : fond violet, texte blanc, coins arrondis
- Secondaire : fond transparent, bordure subtile
- Danger : fond rouge
- Tailles : small, medium, large
- Hover : elevation/ombre accrue

### Panneaux lateraux
- Glissent depuis la droite
- Largeur : ~50% de l'ecran
- Fond avec backdrop-filter blur sur l'overlay
- Bouton fermer (X) en haut a droite
- Scroll interne

### Modales
- Centrees verticalement et horizontalement
- Overlay sombre avec blur
- Animation d'apparition (scale + fade)
- Bouton fermer (X)
- Footer avec boutons d'action

---

## Points d'amelioration souhaites pour la V2

1. **Design system plus coherent** : spacing, typographie, composants uniformes
2. **Animations et micro-interactions** : transitions fluides, feedback visuel
3. **Meilleure hierarchie visuelle** : separation claire des zones d'action vs consultation
4. **Responsive** : adaptation mobile/tablette (actuellement desktop-first)
5. **Data visualization** : graphiques plus riches et interactifs
6. **Navigation** : sidebar fixe au lieu d'onglets en header?
7. **Dashboard feel** : inspiration Mixpanel, Linear, Vercel Dashboard
8. **Light/dark mode** : option de theme clair
9. **Accessibilite** : contrastes, tailles, focus states
10. **Onboarding** : guide interactif pour les nouveaux utilisateurs
