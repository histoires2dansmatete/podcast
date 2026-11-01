# V14.4.2 — Calendrier audio de Noël (25 cases + introduction)

## Présentation

La page `/noel/` présente **une histoire de Noël en 25 parties**. Les dates d’ouverture et de fermeture sont maintenant **configurables dans `content/noel.config.json`**, avec le fuseau horaire Europe/Paris (dates incluses). Par défaut, elle ouvre du 25 novembre au 26 décembre. En dehors de cette période, Cloudflare Pages renvoie **404** pour la page et pour les MP3 locaux placés dans `assets/audio/noel/` : le blocage est exécuté dans `functions/_middleware.js`, pas seulement par JavaScript.

- Du 25 au 30 novembre : page ouverte, toutes les cases fermées.
- Du 1er au 25 décembre : ouverture progressive d'une case supplémentaire par jour.
- Le 26 décembre : les 25 cases restent ouvertes.
- En dehors de la période : la page n'est pas servie (HTTP 404), le lien d'accueil est masqué et la page n'est pas incluse dans le sitemap.

Le fuseau horaire utilise **Europe/Paris**, donc les changements d'heure sont gérés automatiquement.

## Modifier le texte d'introduction et son MP3

Si vous installez le **petit correctif**, lancez d’abord `npm run noel:intro:setup` : cette commande insère la rubrique `introduction` dans votre JSON actuel sans remplacer aucun des 25 épisodes. Elle peut être relancée sans risque.

La zone **« Avant la première porte »**, située directement sous le grand bandeau vert `christmas-hero` et avant la grille des 25 cases, est entièrement pilotée par **`content/noel.config.json`**. Il n'est pas nécessaire de modifier du HTML.

Exemple de configuration (extrait du fichier) :

```json
"introduction": {
  "title": "Avant d’ouvrir la première porte",
  "text": "Quelques mots pour présenter notre histoire…\n\nInstallez-vous confortablement pour découvrir l'aventure !",
  "src": "assets/audio/noel/introduction.mp3"
}
```

- `title` : titre de la nouvelle section.
- `text` : texte libre affiché sous le titre. **Séparez les paragraphes avec `\n\n`** ; du HTML n'est pas nécessaire et sera échappé pour la sécurité.
- `src` : lien direct vers l'introduction enregistrée. Si vous n'avez pas encore de MP3, laissez `"src": ""` : un message d'attente remplace le lecteur.

Pour un MP3 local, placez **`introduction.mp3`** dans **`site/assets/audio/noel/`**, et configurez précisément `"src": "assets/audio/noel/introduction.mp3"`. Vous pouvez aussi renseigner une URL HTTPS directe, par exemple `"https://audio.example.org/noel/introduction.mp3"` si le fichier est hébergé sur R2 public. Les MP3 locaux ne doivent pas dépasser **25 Mio** chacun. Le build échoue si un fichier local référencé manque.

L'introduction audio **n'est pas une 26ᵉ case** : elle est accessible dès `schedule.calendarStart`, pendant toute la période du calendrier. Comme les autres fichiers locaux de Noël, `introduction.mp3` est bloqué côté Cloudflare hors saison. En local, `?preview=1` permet de l'écouter à tout moment. Le lecteur ne démarre jamais automatiquement, et les lecteurs sont mis en pause lorsque l'on passe de l'introduction à une case.

La mention « Heure de Paris » a été retirée **du bandeau visible**. Le calendrier continue cependant à appliquer les dates selon `Europe/Paris` côté serveur.

## Ajouter les 25 parties audio

Ouvrir **`content/noel.config.json`**. Le fichier contient un titre général, un sous-titre, un court texte dans le bandeau (`intro`), une **zone d’introduction séparée** (`introduction`) et 25 entrées `episodes` numérotées. Modifier le champ `title` de chaque partie et son champ `src`.

Exemple d'une entrée :

```json
{ "day": 1, "title": "Le premier cadeau", "src": "assets/audio/noel/01.mp3" }
```

Placer le MP3 correspondant dans `site/assets/audio/noel/01.mp3`. Pour la case 25, utiliser `25.mp3`. Les fichiers locaux ont une limite de **25 Mio par fichier** pour Cloudflare Pages. Sinon, mettre une URL directe HTTPS vers un MP3 externe (Cloudflare R2 public, par exemple) :

```json
{ "day": 2, "title": "La mystérieuse étoile", "src": "https://votre-domaine-audio.exemple/noel/02.mp3" }
```

Les exemples de titres ci-dessus sont illustratifs ; **aucun MP3 n'est fourni dans l'archive**. Chaque case sans audio affiche un message d'attente à la place d'un lecteur vide. `npm run build` vérifie les 25 entrées et l'existence/poids des MP3 locaux référencés.

**Important :** les MP3 hébergés sur une URL HTTPS externe publique restent accessibles directement chez leur hébergeur. La restriction d'accès saisonnière protège la page Cloudflare et les chemins audio locaux nommés `01.mp3` à `25.mp3`, **pas les URLs externes**. La progression des cases dans l'interface n'est pas un système de droits numériques : des URLs déjà présentes dans la source peuvent être retrouvées par une personne technique.

## Prévisualiser maintenant (hors saison)

Sur Git Bash **ou PowerShell**, à la racine du projet :

```bash
npm run dev
```

Puis ouvrir **`http://localhost:5173/noel/?preview=1`**. Le paramètre `?preview=1` suffit maintenant à ouvrir les 25 cases **sur localhost uniquement** ; il ne fonctionne pas sur Cloudflare. Les MP3 locaux sont eux aussi demandés avec le paramètre de prévisualisation.

Le mode historique `CHRISTMAS_PREVIEW=1 npm run dev` reste disponible sur Git Bash mais n'est plus nécessaire. Si la page affiche toujours « Calendrier fermé », arrêter l'ancien serveur avec `Ctrl+C`, vérifier qu'aucun autre processus ne sert le port `5173`, puis redémarrer `npm run dev` avec les fichiers mis à jour. Pour arrêter, `Ctrl+C`.

## Fichiers à connaître

- `content/noel.config.json` : titre, texte/audio d’introduction et 25 URLs MP3 configurables.
- `content/noel.template.html` : modèle de page (ne pas modifier le HTML généré directement).
- `site/noel/index.html` : page créée par `npm run build` / `npm run dev`.
- `site/assets/christmas.css` : style adaptatif et couleurs de Noël.
- `site/assets/christmas.js` : ouverture des cases et lecteur.
- `functions/_lib/christmas.js` et `functions/_middleware.js` : restriction saisonnière Cloudflare.
- `scripts/server.mjs` : même restriction en local, sauf mode aperçu.

## Tests et déploiement

```bash
npm ci
npm test
npm run dev
```

Publier sur GitHub après validation : `git add . && git commit -m "V14.4 calendrier de Noel" && git push origin master`. Aucune nouvelle table D1 ni aucun secret n'est nécessaire.

**Après publication**, tester le statut **404** de `/noel/` hors saison sur `podcast-7ck.pages.dev`. Dès le 25 novembre heure de Paris, la page devrait répondre **200** ; les cases se débloquent chaque jour du 1er au 25 décembre. Le rendu visuel exact reste à vérifier sur votre téléphone et votre ordinateur.

## Design du carrousel

Les deux états du `floating-sticker` ne partagent plus la même forme :

- Podcast disponible : petit fanion prune, texte ivoire, étoile dorée à l'extérieur.
- Podcast à venir : étiquette papier crème, bordure pointillée prune, sans étoile.

Les styles s'adaptent aux trois paliers mobile/tablette/desktop et le statut change lors du défilement du carrousel.

## V14.5 — Un lien de plateforme par épisode et teaser sur l’accueil

Chaque entrée de `episodes` accepte maintenant `platformUrl` : une URL HTTPS de l’épisode sur Spotify, Apple Podcasts, Deezer ou une autre plateforme. Cette URL est **distincte** de `src`, l’adresse du MP3. Si les deux sont présents, la case déverrouillée propose le lecteur et le lien externe. L’introduction accepte également `platformUrl`.

L’accueil dispose d’un teaser illustré configurable dans `content/carousel.config.json` (`christmasTeaser`). Il s’affiche seulement pendant l’ouverture de la page Noël, avec un aperçu local `/?noel-preview=1` hors saison. Voir `GUIDE-CONFIG-V14-5.md`.

## V14.6 — Régler les dates d'affichage

Ajoutez ou modifiez la rubrique `schedule` dans `content/noel.config.json` :

```json
"schedule": {
  "teaserStart": "11-01",
  "calendarStart": "11-25",
  "firstEpisode": "12-01",
  "calendarEnd": "12-26"
}
```

- `teaserStart` : première date d'affichage de la couverture Noël dans le carrousel. Avant l'ouverture, elle annonce la date d'ouverture sans lien vers une page fermée.
- `calendarStart` : première date d'accès à la page `/noel/` et à l'introduction audio.
- `firstEpisode` : date à laquelle la case n° 1 est déverrouillée ; les 24 autres suivent à raison d'une par jour.
- `calendarEnd` : dernier jour d'accès à la page et aux MP3 locaux.

Les valeurs sont au format **`MM-JJ`** (`11-25` pour le 25 novembre) et se répètent **chaque année**. Les journées commencent et se terminent à minuit, fuseau `Europe/Paris`. Une saison peut traverser le 31 décembre (exemple : `calendarEnd: "01-20"`). Les dates impossibles, les saisons supérieures à 180 jours et une période trop courte pour les 25 épisodes sont refusées par `npm test` et `npm run build`.

Lors de la mise à jour depuis V14.5, le correctif ne remplace **pas** `noel.config.json`. Lancez `npm run site:config:setup` : la commande ajoute les quatre dates par défaut seulement si la rubrique `schedule` est absente, sans changer vos MP3 ou vos titres. Vous pouvez ensuite les personnaliser et relancer `npm run build`.

**Important :** le build publie aussi `data/noel-schedule.json`, utilisé par le contrôle d'accès Cloudflare. Ne modifiez pas ce fichier généré à la main. Déployez les changements sur GitHub pour que les dates en production soient actualisées. Les URL audio tierces restent publiquement accessibles chez leur fournisseur, même hors saison.
