# Second Brain — Loïc

Un cockpit personnel pour piloter projets, idées et décisions sans transformer le tout en cimetière de notes.

## Ce que fait l'app

- Vue d'ensemble avec focus principal et signal de surcharge
- Portefeuille de projets filtrable
- Incubateur pour capturer les idées sans les lancer
- Vue Focus P1/P2 et prochaines actions
- Archives avec raison des abandons
- Recherche instantanée (`/`)
- Création, édition et suppression d'éléments
- Import / export JSON
- Responsive mobile
- Zéro dépendance applicative, zéro base externe

## Lancer

Node.js 20+ suffit :

```bash
npm start
```

Puis ouvrir **http://localhost:4173**.

Dans ce mode, chaque modification est écrite dans `data/brain.json`.

## Mode statique

Les fichiers peuvent aussi être servis par GitHub Pages, Netlify ou n'importe quel serveur statique. Dans ce cas, les modifications sont conservées dans le navigateur (localStorage) et peuvent être exportées/importées en JSON.

## Modèle de données

La source initiale est `data/brain.json`. Chaque élément contient notamment :

- `type` : project / idea
- `status` : active, production, validation, paused, idea, archived, published
- `priority` : 1 à 4
- `progress` : 0 à 100
- `energy` : low / medium / high
- `description`
- `next` : prochaine action
- `link`
- `tags`
- `note` : contexte ou raison de décision

## Philosophie

**Finir > multiplier.** Une nouvelle production devrait remplacer explicitement un projet actif, pas simplement s'ajouter à la pile.
