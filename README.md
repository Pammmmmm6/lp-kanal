# Kanal — landing page

Landing page statique pour Kanal (marketing WhatsApp). Aucune dépendance ni build : HTML, CSS et JS vanilla.

```
index.html          structure et contenu
css/style.css       design system (tokens clair/sombre), sections, animations
js/main.js          interactions et animations
assets/             favicon, vidéo de démo (à ajouter : assets/demo.mp4)
```

## Lancer en local

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Interactions

- Mockup d'app animé : conversations jouées en boucle (indicateur de saisie, frappe dans le champ), fils cliquables, recherche.
- Mascotte Kanal : les yeux suivent le curseur, clignent, et la grande mascotte en bas de page remonte au scroll.
- Cartes fonctionnalités : compteurs, barres, flow d'automatisation animé, déclenchés à l'entrée dans l'écran.
- Puces « Un flow pour chaque moment » avec aperçu WhatsApp, rotation auto.
- Tarifs : bascule mensuel/annuel (-20 %) et paliers de volume par offre.
- FAQ en accordéon animé, menus déroulants, menu mobile, thème clair/sombre mémorisé.
- `prefers-reduced-motion` respecté.

## À compléter

Les prix, chiffres, noms de marques du bandeau et liens sont des exemples à remplacer par les vrais.
