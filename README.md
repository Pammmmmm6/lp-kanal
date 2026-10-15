# Landing page — gabarit

Landing page statique (HTML, CSS, JS vanilla, sans build) qui reprend la structure, la palette, la typographie et les animations d'une page produit « agents IA » minimaliste. Marque, textes et mascotte sont des contenus de remplacement originaux (« Kanal ») à adapter au projet.

```
index.html          structure et contenu
css/style.css       tokens (clair/sombre), sections, animations
js/main.js          interactions et données (agents, rôles, offres)
assets/mark.svg     favicon / mascotte
assets/demo.mp4     vidéo de démo (à ajouter)
```

## Lancer en local

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

## Palette

| Rôle | Valeur |
| --- | --- |
| Fond | `#ffffff` |
| Texte | `#0a0a0a` / `#141414` |
| Texte secondaire | `#7d8187` |
| Cartes | `#f9f8f6` |
| Boutons secondaires | `#edecea` |
| Bordures | `#d5d9e2` |
| Accents | teal `#0093a3`, violet `#5a3fa0`, pervenche `#6c6ccb`, rouge `#dd2229`, ambre `#b77400` |

Police : Geist (Google Fonts), en remplacement libre de la police propriétaire d'origine.

## Interactions

- Mockup d'app : agents cliquables, conversations jouées en boucle (saisie dans le champ, indicateur « en train d'écrire », statut En cours → Terminé), recherche.
- Mascotte : yeux qui suivent le curseur, clignement, mascotte en contour qui remonte au scroll en bas de page.
- Cartes : curseur animé qui coche les lignes, barres qui montent, notes et relais qui apparaissent à l'entrée dans l'écran.
- Puces de rôles avec rotation automatique, offres à paliers, FAQ en accordéon animé, menus déroulants, menu mobile, thème clair/sombre mémorisé, lightbox vidéo.
- `prefers-reduced-motion` respecté.

## À remplacer

Nom de marque, textes, prix et liens sont des exemples. Les données du mockup, des rôles et des offres sont en tête de leurs blocs dans `js/main.js`.
