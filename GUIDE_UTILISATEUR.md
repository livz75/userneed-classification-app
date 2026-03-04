# Guide utilisateur — Application de qualification des User Needs

**Mise à jour :** 04 Mars 2026

---

## À quoi sert cette application ?

Cette application permet de **tester si une intelligence artificielle est capable de classer des articles franceinfo** selon les 8 "User Needs" — c'est-à-dire le besoin auquel répond un article pour le lecteur.

Pour cela, vous classifiez vous-même des articles, puis vous lancez une analyse IA et comparez vos résultats avec ceux de l'IA.

---

## Les 8 User Needs

| User Need | Ce que ça signifie |
|---|---|
| **UPDATE ME** | L'article tient informé sur une actu en cours |
| **EXPLAIN ME** | L'article explique un sujet ou un contexte |
| **GIVE ME PERSPECTIVE** | L'article offre une analyse ou une mise en recul |
| **GIVE ME A BREAK** | L'article est léger ou divertissant |
| **GIVE ME CONCERNING NEWS** | L'article alerte sur quelque chose de préoccupant |
| **INSPIRE ME** | L'article raconte une histoire positive |
| **MAKE ME FEEL THE NEWS** | L'article est émotionnel, immersif, un témoignage |
| **REVEAL NEWS** | L'article révèle une enquête ou une info exclusive |

---

## Comment utiliser l'application

L'application se déroule en 4 étapes.

---

### Étape 1 — Classifier des articles

La liste des articles franceinfo s'affiche directement sur la page d'accueil, filtrée par défaut sur les **articles non classifiés**.

1. Pour chaque article, lisez le titre et le chapô
2. Choisissez le User Need qui correspond le mieux dans le menu déroulant
3. Répétez pour autant d'articles que vous le souhaitez — plus vous en classifiez, plus les résultats seront fiables

Vous pouvez basculer entre **Tous**, **Classifiés** et **Non classifiés** via les boutons de filtre.

> **Astuce :** Cliquez sur le titre d'un article pour l'ouvrir dans un nouvel onglet et lire son contenu complet avant de le classifier.

---

### Étape 2 — Lancer une analyse IA

1. Sélectionnez un modèle d'IA via le bouton **"LLM"** dans le menu
2. Vérifiez ou modifiez le prompt via le bouton **"PROMPTS"**
3. Cliquez sur **"Analyse IA"** pour démarrer

L'IA analyse chaque article classifié et prédit un User Need. Les résultats s'affichent au fur et à mesure.

> **Note :** L'analyse prend une dizaine de minutes selon le nombre d'articles et le modèle choisi.

---

### Étape 3 — Consulter les résultats

Les résultats apparaissent automatiquement à la fin de l'analyse :

- **Le taux de concordance global** : % d'articles où l'IA a prédit le même User Need que vous
- **La matrice de confusion** : tableau 8×8 montrant les accords (diagonale) et désaccords entre IA et humain
- **Les statistiques de confiance** : indicateur de certitude de l'IA pour chaque article

Vous pouvez **filtrer** par niveau de confiance (Haute / Moyenne / Basse) ou cliquer sur une case de la matrice pour isoler un type de désaccord.

---

### Étape 4 — Comparer plusieurs analyses

Via le bouton **"Tests"**, accédez à l'historique de vos analyses et comparez deux Test Runs côte à côte — utile pour évaluer l'impact d'un changement de modèle ou de prompt.

---

## Questions fréquentes

**Combien d'articles dois-je classifier pour avoir des résultats fiables ?**
Une cinquantaine d'articles est un bon point de départ. L'idéal est d'avoir au moins 5 à 10 exemples par User Need.

**Puis-je modifier une classification que j'ai déjà faite ?**
Oui, retrouvez l'article dans la liste (filtre "Classifiés") et modifiez le menu déroulant.

**Que signifie le score de confiance ?**
L'IA donne trois prédictions par ordre de certitude (principale, secondaire, tertiaire) avec un score sur 100. Un score élevé sur la prédiction principale et un grand écart avec la secondaire indiquent que l'IA est confiante.

**Les articles se mettent-ils à jour automatiquement ?**
Oui, de nouveaux articles franceinfo sont importés toutes les 30 minutes.
