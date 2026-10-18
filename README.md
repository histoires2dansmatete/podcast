# Les histoires de Dans ma tête — V4

Site de lecture et futur podcast pour enfants, construit en **HTML/CSS/JavaScript et Node.js 22+** pour **GitHub → Cloudflare Pages**. Conserve la charte crème/prune, le logo, le carrousel animé et l'accueil sans bannière. L'export WordPress du 18/10/2026 a été utilisé **hors dépôt** pour embarquer **les 13 histoires publiées en intégralité** dans `site/data/histoires.json` ; le brouillon non publié a été exclu.

## 1. Installation, développement et publication

```bash
npm ci
npm run dev       # http://localhost:5173, rechargement automatique
npm run check     # contrôle du contenu, des liens et du référencement
npm run build     # génère dist/ ; dossier à publier dans Cloudflare Pages
npm run preview   # http://localhost:4173, prévisualise dist/
```

Sur GitHub, Cloudflare Pages doit être connecté au dépôt (`main`), **Framework: None**, **Build command: `npm run build`**, **Build output directory: `dist`**. Le dossier `functions/` reste **à la racine du dépôt**, il est automatiquement pris en charge par le déploiement Git de Pages (et ne doit pas être copié dans `dist/`).

Les fichiers dans `site/histoires/` et `dist/` sont **régénérés** ; ne les éditez pas à la main. Modifiez `site/data/histoires.json` pour les fiches et `site/config.js` pour les plateformes. Les textes de l'export XML sont déjà présents : vous n'avez **pas besoin d'importer à nouveau le XML**. Le fichier XML original **n'est volontairement pas livré dans l'archive ni destiné à GitHub** car il contient des informations relatives à l'ancien WordPress.

### Images WordPress

**Les 13 récits et les références de leurs images sont intégrés.** Les couvertures et l'illustration dans « Petit ourson deviendra grand » sont actuellement chargées depuis `histoires2dansmatete.fr` : le fichier XML fournit leurs URLs mais pas leurs octets. Ces images exigent que l'ancien site reste accessible. Pour être totalement autonome, téléchargez les images depuis votre WordPress et remplacez les URLs par des chemins locaux sous `site/assets/`. Le logo et les favicons sont déjà locaux.

## 2. SEO : domaine, pages et stratégie

Le projet génère automatiquement :

- **13 pages d'histoires indexables** avec textes intégraux, titres différenciés, descriptions, images Open Graph, canonical et données structurées `Article` / `BreadcrumbList`.
- 4 pages principales (accueil, catalogue, « Où écouter ? », « Qui suis-je ? ») dotées de métadonnées spécifiques et données structurées `WebSite` / `WebPage`.
- `sitemap.xml`, `robots.txt`, `histoires.xml` (flux RSS du catalogue), liens internes, textes alternatifs et en-têtes de sécurité.
- `PodcastEpisode` uniquement lorsque **l'URL d'un épisode audio existe**. Les futurs podcasts ne sont pas faussement annoncés comme déjà publiés.
- 404, confidentialité et administration **hors de l'index**.

**À définir absolument avant lancement :** le site prend par défaut `https://podcast.histoires2dansmatete.fr` comme **hypothèse de domaine**, il n'est ni créé ni connecté. Si votre domaine final est différent, définissez dans Cloudflare Pages **Settings → Environment variables → Build variables** la variable `SITE_URL=https://votre-domaine.fr` ; testez ensuite `SITE_URL=https://votre-domaine.fr npm run build`. Les URLs absolues canonicals, sitemap, RSS et données structurées en dépendent. **Ne mettez pas en production en conservant un domaine hypothétique.**

**Migration depuis le blog :** puisque les textes complets resteront publiés sur WordPress, une situation de **contenus dupliqués** peut survenir. Dans un premier temps, reliez les sites entre eux. Une fois que vous aurez choisi quel site est la source canonique pour la lecture, mettez en place des **redirections 301 article par article** depuis les anciennes URLs (ou configurez les `rel=canonical` depuis WordPress vers le nouveau site). Ne redirigez pas aveuglément tout le blog pendant la phase de transition. Configurez et validez [Google Search Console](https://search.google.com/search-console/about) et [Bing Webmaster Tools](https://www.bing.com/webmasters/), puis soumettez `https://VOTRE-DOMAINE/sitemap.xml`. Surveillez l'indexation, les 404 et les requêtes réelles. Les positions Google et le trafic ne peuvent être garantis par du code seul.

## 3. Tableau de bord privé `/admin/`

**Architecture :** Cloudflare Pages Functions + base SQL Cloudflare D1 + **Cloudflare Access**. La page **n'est pas un fichier statique public** : `/admin/` est rendue côté serveur seulement après **vérification cryptographique de la signature JWT Access**, de son émetteur, de sa date d'expiration et de son audience. L'API `/api/admin/stats` applique la même vérification. Aucune clé Cloudflare n'est placée dans le front-end.

### Étape A — créer la base Cloudflare D1

Dans [Cloudflare](https://dash.cloudflare.com/), menu **Workers & Pages → D1** (ou **Storage & databases → D1**), créez une base nommée `histoires-podcast-analytics`.

Installez/ouvrez le CLI Wrangler et connectez votre compte, puis initialisez la base :

```bash
npx wrangler login
npx wrangler d1 execute histoires-podcast-analytics --remote --file=./db/schema.sql
```

**Attention :** `--remote` écrit bien dans la base Cloudflare de votre compte. Vérifiez sa création avant l'exécution. Dans le projet Pages : **Settings → Bindings → Add → D1 database**, choisissez cette base avec **Variable name exactement `ANALYTICS_DB`**. Faites également cette liaison pour l'environnement de prévisualisation si nécessaire. **Redéployez** après la liaison.

### Étape B — sécuriser via Cloudflare Access

1. Ouvrez **Cloudflare Zero Trust → Access → Applications → Add application → Self-hosted**.
2. Créez **une application** avec **les deux chemins** de votre domaine personnalisé : `podcast.votre-domaine.fr/admin*` et `podcast.votre-domaine.fr/api/admin/*` (même application, **même AUD**).
3. Politique **Allow** pour **votre e-mail personnel uniquement** (pas de règle Bypass). Configurez une authentification par e-mail OTP ou fournisseur d'identité. N'utilisez pas une politique autorisant tout le monde.
4. Dans la configuration de cette application Access, récupérez l'**Application Audience (AUD) tag**. Relevez aussi le domaine de votre équipe, de la forme `mon-equipe.cloudflareaccess.com`.
5. Dans **Pages → Settings → Environment variables** ajoutez :
   - `ACCESS_AUD` = AUD de **cette** application.
   - `ACCESS_TEAM_DOMAIN` = `mon-equipe.cloudflareaccess.com` (sans chemin).
   - `ANALYTICS_SALT` = une valeur aléatoire privée longue (p. ex. produite par `openssl rand -hex 32`), **Secret**, à ne pas versionner.
6. Redéployez et visitez `https://VOTRE-DOMAINE/admin/`. L'accès nécessite une authentification valide Cloudflare Access. Testez `/api/admin/stats` **en navigation privée sans connexion** : il doit refuser l'accès. Ne considérez pas l'interface comme privée avant cette vérification.

**Sécurité par défaut :** tant que `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` et un JWT valide ne sont pas présents, l'accès est refusé, **même si vous êtes connecté à Cloudflare dans un autre onglet**. Les chemins `/admin/` et `/api/admin/stats` doivent être déclarés dans la politique Access sur **tous les noms de domaine qui exposent le site**, ou bloquez l'alias `pages.dev`/les déploiements de prévisualisation si vous voulez limiter l'accès. Les JWT étant vérifiés côté serveur, les données restent protégées même si l'alias est atteint sans Access.

### Étape C — activer les statistiques

L'API `/api/track` ne collecte **rien** si la base `ANALYTICS_DB` ou la variable `ANALYTICS_SALT` manque. Les visiteurs voient une demande **Accepter / Refuser**. En cas de refus, aucun événement n'est envoyé vers l'API analytics maison. Si accord :

- Pages vues, sessions **anonymisées** par jour, top pages, évolution sur 7/30/90 jours.
- Référents (uniquement le nom de domaine, sans URL complète), pays approximatifs (fournis par Cloudflare), types d'appareils et familles de navigateurs.
- Démarrages de lecture audio, clics vers les plateformes, arrivées affichées en fin de récit.
- Aucun IP, nom, e-mail, identifiant nominatif, URL complète de provenance, ni user-agent complet n'est enregistré.
- Identifiant de session aléatoire en `sessionStorage`, **haché et salé côté serveur en empreinte différente chaque jour**. Les chiffres indiquent des **sessions observées**, **pas des personnes uniques**. La base conserve 90 jours au plus à partir des prochains appels de nettoyage, effectués lors des visites : s'il n'y a plus aucun trafic, le nettoyage attend la prochaine visite ; un contrôle périodique externe est recommandé en exploitation.
- Le suivi est désactivé dans `localhost` et la page d'administration.

La page `/confidentialite.html` présente ce fonctionnement et permet de modifier son choix. **Faites valider la politique de confidentialité et les mentions légales avant publication**. Les services tiers (Google Fonts, illustrations hébergées sur WordPress, Cloudflare lui-même) ont leurs propres traitements. Les données du dashboard ne contiennent pas de « qui » au sens de noms ou d'identités personnelles, ce qui n'est ni nécessaire ni adapté à un site destiné notamment aux enfants.

### Statistiques avancées complémentaires

Dans Cloudflare Pages, **Metrics → Web Analytics → Enable**, puis ouvrez Web Analytics dans le tableau de bord Cloudflare. Vous obtiendrez une mesure complémentaire des performances et des visites, qui **n'est pas automatiquement fusionnée** avec la base D1 et peut utiliser une méthode de comptage différente. Vérifiez les obligations d'information applicables selon votre configuration. Pour les **recherches Google, CTR et requêtes exactes**, utilisez **Search Console** : les requêtes organiques ne sont pas déductibles du seul référent HTTP.

**Développement local :** `npm run dev` sert uniquement les pages statiques pour travailler vite. Les fonctions protégées `/admin/` et `/api/*` ne s'exécutent pas sous ce serveur Node. Pour tester les Functions et D1 dans le runtime Cloudflare, utilisez le CLI Wrangler avec une **base D1 locale** et les variables de développement adaptées : [Pages D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/). L'administration ne pourra pas être testée comme authentifiée localement sans JWT Access valide ; c'est volontaire et il n'existe **aucun mode admin ouvert par défaut**.

## 4. Ajouter la voix aux histoires

Dans `site/data/histoires.json`, ajoutez à chaque histoire une URL directe sécurisée `audioUrl` vers un MP3 réellement hébergé, et des liens d'épisodes `platforms.spotify`, `platforms.apple`, `platforms.deezer`, `platforms.amazon` si disponibles. Les liens généraux de l'émission se configurent dans `site/config.js`. Sans MP3, le lecteur indique « En préparation », sans lecture fictive.

```bash
npm run build
# git add site/data/histoires.json site/config.js ...
# git commit -m "Mise à jour des histoires et épisodes"
# git push
```

**À ne jamais committer** : l'export XML brut, des secrets/jetons, des valeurs `.env`/`.dev.vars`, des identifiants de suivi de personnes.

## 5. Vérifications avant ouverture au public

- [ ] Vérifier le nom de domaine définitif et `SITE_URL` ; configurer son DNS Cloudflare.
- [ ] Tester les 13 pages : textes complets, images disponibles, page « Où écouter ? ».
- [ ] Créer D1, exécuter `db/schema.sql`, ajouter le binding `ANALYTICS_DB`.
- [ ] Configurer Cloudflare Access (deux chemins, un AUD, e-mail autorisé seulement), `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN` et `ANALYTICS_SALT`.
- [ ] Tester qu'une navigation privée non authentifiée n'accède ni au dashboard ni aux statistiques.
- [ ] Accepter le suivi sur un navigateur de test, visiter plusieurs pages puis vérifier que les chiffres arrivent au tableau de bord (sans promettre un temps réel instantané sur toutes les statistiques).
- [ ] Mettre à jour les informations juridiques et les coordonnées de l'éditrice.
- [ ] Vérifier canonicals/301 de l'ancien WordPress, Search Console et `sitemap.xml`.
- [ ] Vérifier la protection de tous les hôtes accessibles, y compris `pages.dev` et previews.
