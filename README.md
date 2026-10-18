# Les histoires de « Dans ma tête » — Site podcast V3

Un site statique **sans framework** pour Cloudflare Pages, avec développement local et déploiement automatique par GitHub. Cette version conserve les couleurs crème/prune, le logo, le favicon et le carrousel animé, **sans la grande bannière**.

## Ce qui est publié

- Accueil (`site/index.html`) avec carrousel des couvertures.
- Catalogue (`site/histoires.html`) : filtre, recherche et liens vers **les fiches sur ce site**.
- Page **Où écouter ?** (`site/ecouter.html`) : Spotify, Apple Podcasts, Deezer, Amazon Music, FAQ et parcours d'écoute.
- Une page de podcast par histoire, générée dans `site/histoires/<slug>/index.html` par `npm run generate:stories`. Les fiches comprennent une couverture, un résumé, la durée, les plateformes, un **lecteur HTML5 qui apparaît lorsqu'un fichier audio réel est fourni**, le récit et des suggestions de lecture.
- Page « Qui suis-je ? », mentions de confidentialité, logo et favicon.

### Important : statut des textes

La version livrée contient **10 fiches de récits déjà identifiés**. Dans cette archive, les textes longs de WordPress **ne sont pas encore embarqués** : l'accès automatique aux articles était indisponible pendant la création du projet. Les fiches proposent temporairement un lien vers **l'intégralité de l'histoire sur le blog original**, sans prétendre afficher le texte complet. Le blog indique **13 histoires**, donc 3 autres restent à importer.

Pour mettre réellement **tous les textes complets en ligne directement sur ces nouvelles fiches**, procédez à l'un des imports ci-dessous. Une fois l'import effectué, les contenus sont stockés dans `site/data/histoires.json` (champ `bodyHtml`) : committez **ce fichier JSON** sur GitHub. À partir de là, Cloudflare publie tout sans dépendre du blog pendant les visites.

## Installation et développement local

Node.js **22+** et Git sont nécessaires. Depuis la racine du projet :

```bash
npm ci
npm run dev
```

Ouvrir **http://localhost:5173**. L'accueil, `/ecouter.html`, `/histoires.html` et les fiches `/histoires/<slug>/` s'affichent directement ; les pages sont générées avant le lancement du serveur. Toute modification CSS, HTML ou JS déclenche le rechargement automatique.

```bash
npm run generate:stories    # régénérer les fiches après édition du JSON
npm run check               # génération et vérification des liens
npm run build               # construire dist/ pour Cloudflare
npm run preview             # http://localhost:4173 (résultat exact du build)
```

**Modifier les sources dans `site/` et les données dans `site/data/histoires.json`, pas dans `dist/` ni dans `site/histoires/`**. Ces deux derniers dossiers sont régénérés.

## Importer les textes complets de WordPress

### Option A — Depuis le blog directement

```bash
npm run sync:blog
npm run build
```

Cette commande essaie l'API WordPress, les archives HTML (y compris la page suivante) et chaque article individuellement. La disponibilité dépend des protections et du HTML WordPress. **Relisez le journal d'import**, notamment le nombre d'histoires trouvées et de textes récupérés. Les articles incomplets affichent toujours un lien de lecture vers l'ancien blog plutôt qu'un texte tronqué.

Vous pouvez aussi utiliser **`npm run build:sync`** comme commande de build Cloudflare Pages pour lancer la synchronisation pendant chaque déploiement. Toutefois, ce mode dépend de la connexion au blog à chaque build. La méthode XML ci-dessous est plus stable.

### Option B — Export officiel WordPress (recommandée pour récupérer les 13 histoires)

1. Dans l'administration de https://histoires2dansmatete.fr, ouvrir **Outils → Exporter**.
2. Choisir **Articles** puis télécharger le fichier WordPress `.xml`.
3. Déposer le fichier exporté **en dehors du dépôt Git** (il peut contenir des données personnelles).
4. Lancer :

```bash
npm run import:wordpress -- /chemin/vers/export-wordpress.xml
npm run build
```

Le script importe les articles WordPress publiés, conserve vos métadonnées personnalisées lorsque présentes et remplit le champ `bodyHtml`. **Vérifiez que le résultat annonce 13 histoires et que les textes sont complets.** Ensuite :

```bash
git add site/data/histoires.json
git commit -m "Import intégral des histoires du blog"
git push
```

Cloudflare reconstruira les pages avec l'intégralité des textes. **N'ajoutez jamais l'export WordPress XML lui-même dans Git.**

## Ajouter un épisode audio

À chaque histoire de `site/data/histoires.json`, ajouter un champ `audioUrl` (lien HTTPS direct vers un MP3 public), et éventuellement `platforms` avec les liens de cet épisode sur chaque service :

```json
{
  "slug": "bas-les-masques",
  "title": "Bas les masques",
  "audioUrl": "https://votre-hebergeur-audio.example/bas-les-masques.mp3",
  "platforms": {
    "spotify": "https://open.spotify.com/episode/VOTRE_ID",
    "apple": "",
    "deezer": "",
    "amazon": ""
  }
}
```

Cette entrée est un **exemple** : ne la collez pas en remplacement du JSON complet. Vous pouvez aussi placer le MP3 sous `site/assets/audio/bas-les-masques.mp3` et utiliser `"audioUrl": "assets/audio/bas-les-masques.mp3"`. Attention : si les fichiers audio sont volumineux, préférez l'hébergement audio chez votre diffuseur plutôt que dans le dépôt GitHub.

Si `audioUrl` est vide ou absent, la fiche affiche **« Bientôt dans vos oreilles »**, sans inventer un épisode ni présenter un lecteur inutilisable. Quand l'URL est renseignée, le navigateur affiche un véritable lecteur **HTML5** accessible. Les liens de plateformes sur une fiche sont ceux de l'épisode s'ils sont renseignés, sinon ceux de l'émission si disponibles dans `site/config.js`. La page **Où écouter ?** récupère les liens globaux dans `site/config.js`.

Après modification :

```bash
npm run build
npm run preview
```

## Github → Cloudflare Pages

Dans Cloudflare **Workers & Pages → Pages → Connect to Git**, sélectionner le dépôt GitHub et configurer :

| Champ | Valeur |
| --- | --- |
| Branch | `main` |
| Framework | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Racine du dépôt |
| Node | 22+ |

Si vous souhaitez une synchronisation de WordPress pendant chaque build : `npm run build:sync` à la place, en acceptant la dépendance au blog d'origine. Recommandation : **importez les textes une seule fois**, committez `site/data/histoires.json`, puis gardez `npm run build` pour des déploiements fiables.

Après connexion initiale :

```bash
git add .
git commit -m "V3 : page où écouter et fiches de podcasts publiques"
git push
```

Cloudflare Pages publie chaque push sur `main`, avec des aperçus de branches/PR selon sa configuration. Le workflow `.github/workflows/verification.yml` exécute les vérifications. Aucun jeton Cloudflare n'est nécessaire côté GitHub.

## Fichiers clés

| Fichier | Description |
| --- | --- |
| `site/index.html` | Accueil sans bannière |
| `site/ecouter.html` | Page complète d'écoute |
| `site/histoires.html` | Bibliothèque |
| `site/data/histoires.json` | Les histoires et leurs textes, audio et liens par épisode |
| `site/config.js` | Liens des plateformes au niveau de l'émission |
| `site/assets/style.css` | Design responsive |
| `scripts/generate.mjs` | Une page HTML par histoire |
| `scripts/sync-blog.mjs` | Synchronisation automatique du blog |
| `scripts/import-wordpress.mjs` | Import XML fiable |
| `scripts/check.mjs` | Contrôle des fichiers et liens avant build |

© Les histoires de « Dans ma tête » — droits de l'autrice réservés.
