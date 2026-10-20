# Les histoires de Dans ma tête — site et podcasts

Site officiel **<https://histoires2dansmatete.fr>** : histoires pour enfants à lire et à écouter, bibliothèque d’histoires, fiches individuelles et administration privée. Le projet est développé avec **Node.js 22+**, sans framework, et publié par **GitHub → Cloudflare Pages + Pages Functions + D1**.

> **À retenir :** les fichiers du site ne sont pas les mêmes que les données privées. Le code et les contenus publiés vont sur GitHub ; le mot de passe et les secrets restent dans `.env.local` (localement) et Cloudflare (en production). **Ne relancez pas `admin:setup` si votre mot de passe fonctionne déjà.**

## Sommaire

1. [Installation locale](#1-installation-locale)
2. [Organisation des fichiers](#2-organisation-des-fichiers)
3. [Configurer les images](#3-configurer-les-images)
4. [Ajouter un MP3 et des liens d'écoute](#4-ajouter-un-mp3-et-des-liens-découte)
5. [Créer, publier et masquer une histoire](#5-créer-publier-et-masquer-une-histoire)
6. [Administration privée](#6-administration-privée)
7. [Tests et contrôle avant publication](#7-tests-et-contrôle-avant-publication)
8. [Mise à jour et déploiement](#8-mise-à-jour-et-déploiement)
9. [Cloudflare Pages, D1 et domaine](#9-cloudflare-pages-d1-et-domaine)
10. [Diagnostic et dépannage](#10-diagnostic-et-dépannage)

## 1. Installation locale

### Prérequis

- **Node.js 22 ou supérieur** et npm (`node -v`, `npm -v`). La version demandée est indiquée dans `.nvmrc`.
- **Git** pour l’historique et les envois sur GitHub.
- Un éditeur, par exemple VS Code.
- **Facultatif :** Python 3 et Pillow pour créer des versions WebP des illustrations.
- **Facultatif :** Cloudflare Wrangler pour la gestion des secrets et de D1 en production (`npx wrangler`).

Sur Windows, les commandes peuvent être exécutées dans **Git Bash** (votre environnement habituel) ou PowerShell. Pour obtenir une copie déjà suivie par Git :

```bash
git clone https://github.com/histoires2dansmatete/podcast.git
cd podcast
npm ci
npm run dev
```

Si le dépôt existe déjà dans `D:\Work\podcast_website`, ouvrez-le directement dans Git Bash :

```bash
cd /d/Work/podcast_website
npm ci
npm run dev
```

- Accueil : <http://localhost:5173/>
- Toutes les histoires : <http://localhost:5173/histoires.html>
- Page d’écoute : <http://localhost:5173/ecouter.html>
- Administration : <http://localhost:5173/admin/>

`npm run dev` régénère les contenus au démarrage et sert le dossier `site/` avec actualisation automatique. Arrêtez-le avec `Ctrl+C`. Après un changement du **code du serveur Node.js**, redémarrez la commande. Une nouvelle histoire ou un changement d’audio peut nécessiter `npm run generate:stories` puis `npm run generate:seo` (ou un nouveau `npm run dev`) pour régénérer les pages.

Pour contrôler les fichiers qui seront réellement publiés :

```bash
npm run build
npm run preview
```

L’aperçu du dossier `dist/` se trouve sur <http://localhost:4173/>. **N’envoyez pas `dist/` dans Git : Cloudflare le reconstruit.**

## 2. Organisation des fichiers

| Fichier ou dossier | Rôle |
| --- | --- |
| `site/` | Pages HTML, CSS, JS, icônes et ressources publiques |
| `site/assets/images/` | Illustrations originales et `optimized/` pour les WebP |
| `site/assets/images.config.json` | Correspondance entre les images et leurs usages |
| `site/assets/audio/` | MP3 locaux de petite taille |
| `site/config.js` | URLs **générales** du podcast (Spotify, Apple Podcasts, Deezer, Amazon Music) |
| `content/audio.config.json` | MP3 et liens **par histoire** |
| `content/inline-images.config.json` | Images intégrées **dans le corps d’un récit**, indépendamment de sa couverture |
| `content/wordpress-stories.json` | Les 13 histoires historiques, conservées à l’identique |
| `content/stories/<slug>.json` | Métadonnées et statut des nouvelles histoires |
| `content/stories/<slug>.html` | Texte complet des nouvelles histoires |
| `site/data/histoires.json`, `site/histoires/` | **Générés automatiquement** : ne pas éditer à la main |
| `scripts/` | Génération, outils éditoriaux, contrôles et serveur local |
| `tests/` | Fixtures XML, tests unitaires et empreintes de régression |
| `functions/` | API et protections Cloudflare Pages (authentification, publication, stats) |
| `db/schema.sql` | Schéma de la base D1 |
| `dist/` | Résultat du build, à publier sur Cloudflare |
| `.env.local` | Secrets administrateur locaux (**ne jamais partager ni committer**) |
| `.local/` | États des histoires masquées en local, sans impact sur la production |

L’export XML original sert à la vérification, mais **ne doit pas être publié**. Le projet conserve une fixture ne contenant que les 13 récits publics dans `tests/fixtures/histoires-wordpress-public.xml`.

## 3. Configurer les images

Les liens sont centralisés dans `site/assets/images.config.json`. Exemple d’entrées :

```json
{
  "globals": {
    "logo": "assets/logo.webp",
    "aboutVisual": "assets/images/about_me.png",
    "bioImage": "assets/images/about_me.png",
    "listenArt": "assets/images/about_me.png"
  },
  "stories": {
    "bas-les-masques": "assets/images/micro2-1.png"
  }
}
```

Cet exemple est **partiel** : ne supprimez pas les autres entrées du JSON. Copiez les images dans `site/assets/images/`, en respectant précisément les noms et extensions (Cloudflare est sensible à la casse). Les portraits de type 853 × 1280 sont affichés sans découpe. Si une illustration est absente, la couverture de secours s’affiche.

Pour convertir les images en WebP sans détruire les originaux :

```bash
python -m pip install -r scripts/requirements-images.txt
npm run optimize:images -- --dry-run
npm run optimize:images
npm run check:images
npm run check:images -- --strict
```

Les versions optimisées sont placées dans `site/assets/images/optimized/` et choisies automatiquement lorsqu’elles existent et apportent un gain. **Commitez également ces fichiers** si vous souhaitez qu’ils apparaissent sur Cloudflare. Le script ne peut pas récupérer les images qui n’existent que sur un autre ordinateur.

### Insérer une illustration au milieu d'une histoire

Ne modifiez pas les textes de `content/wordpress-stories.json` : ils sont vérifiés mot pour mot contre le XML. Pour insérer une image **entre deux paragraphes**, modifiez `content/inline-images.config.json` :

```json
{
  "stories": {
    "petit-ourson-deviendra-grand": [
      {
        "afterParagraph": 2,
        "src": "assets/images/04-Flash-2.jpg",
        "alt": "Le mot que les parents de Flash lui ont laissé"
      }
    ]
  }
}
```

Cette entrée est déjà présente. Elle correspond à l'illustration du mot laissé par les parents de Flash dans le WordPress d'origine, **après le 2ᵉ paragraphe**. Il vous reste à déposer l'image `04-Flash-2.jpg` dans `site/assets/images/` en respectant son nom, puis à lancer `npm run build`. Le fichier optimisé `assets/images/optimized/04-Flash-2.webp` sera automatiquement privilégié s'il existe. L'image conserve sa proportion naturelle.

La génération ignore les images absentes sans créer d'image cassée et affiche un avertissement. Ajoutez autant d'entrées que nécessaire dans la liste d'une histoire, avec un numéro de paragraphe (à partir de 1), un chemin local autorisé et une description alternative. **Les URL externes et chemins sortant du dossier images sont refusés**. Les fichiers locaux doivent aussi être envoyés sur GitHub pour apparaître sur Cloudflare.

## 4. Ajouter un MP3 et des liens d’écoute

La configuration par épisode se trouve dans **`content/audio.config.json`**. Pour une histoire existante, modifiez seulement l’entrée correspondant à son `slug` :

```json
"bas-les-masques": {
  "src": "assets/audio/bas-les-masques.mp3",
  "platforms": {
    "spotify": "",
    "apple": "",
    "deezer": "",
    "amazon": ""
  }
}
```

L’extrait n’est pas un fichier JSON complet. Le site accepte deux solutions :

**MP3 local :** placez `bas-les-masques.mp3` dans `site/assets/audio/` et utilisez `assets/audio/bas-les-masques.mp3`. La limite contrôlée par le build est **25 Mio par fichier**. Le MP3 sera copié dans `dist/` et publié avec le site. Il faut le committer dans Git.

**MP3 hébergé ailleurs :** indiquez directement une URL HTTPS d’un fichier audio (par exemple sur Cloudflare R2). Pour un MP3 volumineux, c’est préférable à GitHub/Pages. Vérifiez vous-même que l’URL est publique, renvoie le bon type MIME et fonctionne dans le lecteur du navigateur.

Le lecteur HTML5 apparaît dès que `src` n’est plus vide. Tant que `src` vaut `""`, la fiche conserve la mention « À venir ». Les quatre champs `platforms` peuvent recevoir des **URLs HTTPS d’épisodes spécifiques** (et rester vides avant publication). Les **URLs générales** des plateformes pour la page « Où écouter ? » se configurent séparément dans `site/config.js`.

Après modification :

```bash
npm run build
npm run test:audit
npm run preview
```

Testez réellement la lecture audio et les liens sur votre navigateur, puis sur le site déployé.

## 5. Créer, publier et masquer une histoire

Créez une histoire **en brouillon** :

```bash
npm run story:new -- --title "La forêt des étoiles"
```

La commande crée automatiquement les fichiers `content/stories/la-foret-des-etoiles.json` et `.html`, une couverture SVG provisoire et deux entrées dans les catalogues images/audio. Ne relancez pas la commande pour modifier une histoire déjà créée : elle refusera un identifiant en double.

Ensuite :

1. Rédigez le **récit complet** dans `content/stories/la-foret-des-etoiles.html` (paragraphes et balises typographiques simples).
2. Complétez `title`, `description`, `tags`, `date` et les autres métadonnées dans le JSON associé.
3. Ajoutez éventuellement une illustration et modifiez son chemin dans `site/assets/images.config.json` ; la couverture SVG sert de secours.
4. Associez éventuellement un MP3 dans `content/audio.config.json`.
5. Laissez `"published": false` tant que la fiche n’est pas prête. Pour publier, passez à `"published": true`.
6. Exécutez `npm test`, contrôlez `npm run preview`, puis envoyez la mise à jour sur GitHub.

Le build ajoute automatiquement une nouvelle fiche sous `/histoires/<slug>/`, son entrée au catalogue, au sitemap et au RSS. Les **brouillons restent absents** du site publié.

**Différence importante entre deux mécanismes de publication :**

- `published: false` dans le fichier JSON = **brouillon**. Il faut modifier le fichier puis redéployer pour le publier.
- Interrupteur `/admin/` = **masquer ou réactiver une histoire déjà générée**. Les visiteurs reçoivent un 404 lorsqu’elle est masquée ; le catalogue et le sitemap la masquent aussi. Sur Cloudflare, cet état est stocké en D1. En local, dans `.local/`.

**Ne modifiez pas** `site/histoires/` ni `site/data/histoires.json` à la main : ils sont recréés au prochain build. Les 13 textes historiques de `content/wordpress-stories.json` sont protégés par la comparaison XML.

## 6. Administration privée

L’interface `/admin/` sert à consulter les statistiques et à gérer la visibilité des histoires. Elle **n’est pas un éditeur des textes/MP3** ; ces derniers sont gérés dans les fichiers du projet.

**Première installation uniquement**, pour définir un mot de passe local :

```bash
npm run admin:setup
npm run dev
```

La commande écrit `.env.local` avec un **hash PBKDF2** et une clé de session. Elle doit être exécutée dans un terminal interactif. Si la connexion fonctionne déjà, **ne la relancez pas** : elle écraserait les secrets et invaliderait vos sessions.

Commandes de vérification et de réparation :

```bash
npm run admin:check-password                # vérifier votre mot de passe contre le hash local
npm run admin:diagnose                      # diagnostiquer la configuration locale
npm run admin:rehash-cloudflare             # uniquement pour migrer un ancien hash incompatible
npm run admin:verify-cloudflare -- --url https://podcast-7ck.pages.dev
```

En production, configurez les **secrets** `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` et `ANALYTICS_SALT` dans **Cloudflare Pages** ; n’inscrivez jamais les valeurs dans le dépôt. Pour synchroniser les **deux secrets admin** depuis `.env.local` avec un projet Cloudflare que vous contrôlez :

```bash
npx wrangler login
npm run admin:sync-cloudflare -- --project podcast-7ck
```

Cette commande demande une confirmation interactive et **ne synchronise pas** `ANALYTICS_SALT`. Redéployez ensuite la production. Le schéma D1 doit être présent pour la limitation des tentatives et les statistiques. L’administration utilise un cookie de session sécurisé (huit heures) et une protection contre les requêtes intersites. En local, les statistiques de production ne sont pas récupérées.

## 7. Tests et contrôle avant publication

**Commande principale :**

```bash
npm test
```

Elle exécute les contrôles suivants (aussi exécutés sur GitHub Actions pour `master` et `main`) :

| Commande | Vérification |
| --- | --- |
| `npm run test:unit` | Slugs, métadonnées, MP3, création de brouillons, HTML sûr et lecteur audio |
| `npm run check` | Pages, liens, illustrations, thèmes, XML WordPress, SEO, intégration HTTP et snapshots |
| `npm run test:regression` | Empreintes SHA-256 du CSS et de la structure des 5 pages principales ; les fichiers d’illustration issus du catalogue peuvent changer sans fausse alerte |
| `npm run test:security` | Connexion, sessions, CSRF, limites de tentatives, API privées |
| `npm run test:integration` | Serveur local, visibilité des histoires, catalogue/sitemap/RSS et middleware Cloudflare |
| `npm run test:editorial` | **Nouveau :** cycle isolé brouillon → publication d’une 14e histoire avec MP3 → retrait |
| `npm run build` | Génération complète et préparation de `dist/` |
| `npm run test:dist` | Fichiers CSS, JS, images et liens réellement générés |
| `npm run test:audit` | **Nouveau :** cohérence des pages publiques, SEO, données structurées, audio, réseaux et flux |
| `npm run test:privacy` | Gestion du consentement de mesure d’audience |
| `npm run test:performance` | Seuil CSS, chargement différé et mécanisme d’optimisation |

`npm run test:xml` compare les 13 textes, titres et thèmes historiques à la référence XML ; vous pouvez fournir explicitement un autre export en argument si nécessaire. Les deux **nouveaux tests** n’altèrent pas vos récits : le scénario éditorial se déroule dans un dossier temporaire.

Après une **modification volontaire du design**, les empreintes peuvent légitimement changer. Contrôlez visuellement la modification puis actualisez la référence :

```bash
npm run test:regression:update
npm test
```

Commitez `tests/snapshots/site-contract.json` après revue. **N’actualisez jamais le snapshot pour faire disparaître une erreur non expliquée.**

Ces tests détectent des régressions de structure, contenu, sécurité et fichiers. Ils **ne remplacent pas** une revue visuelle réelle sur mobile/ordinateur, une écoute MP3 sur navigateur et la surveillance de Cloudflare après publication.

## 8. Mise à jour et déploiement

### Mise à jour du contenu sur votre PC

Sur votre dépôt actuel (branche observée : **`master`**) :

```bash
cd /d/Work/podcast_website
git status
npm ci
npm test
npm run dev
```

Quand vous avez terminé la vérification :

```bash
git add .
git commit -m "Mise à jour des histoires et du site"
git push origin master
```

Votre branche Cloudflare **Production** doit également être `master`. Les tests GitHub Actions se déclenchent sur `master` et `main`. Vérifiez le succès de GitHub Actions puis du déploiement Pages.

### Remplacer une version du projet par une archive

Avant de remplacer des fichiers :

1. Faites une **sauvegarde ou un commit** de votre travail (`git status`, puis `git commit` si nécessaire).
2. Conservez `.git/`, `.env.local`, `.local/`, `site/assets/images/` et `site/assets/audio/`.
3. **Conservez aussi les configurations personnalisées** `site/assets/images.config.json`, `content/audio.config.json`, `site/config.js` et toutes vos histoires `content/stories/`. Comparez les versions au lieu de les écraser aveuglément.
4. Appliquez de préférence un **patch ciblé** quand il existe, puis `npm ci` et `npm test`.
5. Ne mettez pas les secrets ni les fichiers privés dans GitHub.

Pour tester le site déployé (lecture seule) :

```bash
npm run test:remote -- https://podcast-7ck.pages.dev
```

Ce contrôle interroge le déploiement, mais ne garantit pas qu’un MP3 externe fonctionne chez tous les visiteurs.

## 9. Cloudflare Pages, D1 et domaine

Créez ou maintenez un **projet Cloudflare Pages** lié au dépôt GitHub, avec :

| Paramètre | Valeur |
| --- | --- |
| Dépôt | `histoires2dansmatete/podcast` |
| Branche Production | `master` |
| Framework | None |
| Commande de build | `npm run build` |
| Dossier de sortie | `dist` |
| Racine du projet | `.` |
| Domaine public final | `https://histoires2dansmatete.fr` |
| Domaine de test Pages | `https://podcast-7ck.pages.dev` |

**N’utilisez pas un Worker « static assets only »** pour ce projet : l’administration et les statistiques utilisent les fichiers `functions/` de Pages Functions.

### D1 (première installation ou nouvelle base)

```bash
npx wrangler login
npx wrangler d1 create histoires-podcast-stats
npx wrangler d1 execute histoires-podcast-stats --remote --file=./db/schema.sql
```

Si la base existe déjà, **ne la recréez pas**. Associez-la au projet Pages sous le nom exact de binding **`ANALYTICS_DB`**. Pour faire évoluer une base, relisez les changements de schéma et sauvegardez les données avant d’exécuter SQL en production. `CREATE TABLE IF NOT EXISTS` évite la recréation de ces tables, mais **ne remplace pas** une migration de schéma future.

Les secrets et le binding doivent être configurés pour l’environnement de déploiement concerné (Production, et Preview si vous y testez l’administration). Configurez ensuite le domaine personnalisé dans Cloudflare Pages. Avant de déplacer le DNS, vérifiez la version `pages.dev` afin de ne pas interrompre l’ancien site prématurément.

### Statistiques et confidentialité

Le site recueille des statistiques **après consentement** et les enregistre dans D1 de manière agrégée. La page `confidentialite.html` présente les choix et les moyens de contacter l’éditrice via Instagram ou Facebook. Le tableau de bord permet de consulter les pages vues, sessions, interactions audio et principales provenances. Sans D1 ou avant les premières visites consenties, les chiffres de production ne peuvent pas être renseignés.

## 10. Diagnostic et dépannage

| Symptôme | Vérifications |
| --- | --- |
| Une image reste en secours | Vérifier `site/assets/images.config.json`, le nom exact et la casse du fichier, `npm run check:images`, puis `git status` pour s’assurer que le média est commité. |
| Le lecteur MP3 ne s’affiche pas | Vérifier l’entrée de `content/audio.config.json`, `src` non vide, et `npm run build`. |
| Un MP3 ne joue pas | Vérifier l’URL HTTPS, les réponses HTTP, le type MIME et le fichier réellement servi. Pour R2, tester aussi la lecture sur mobile. |
| Une histoire n’apparaît pas | Vérifier `published: true`, `npm run build`, puis l’état de l’interrupteur dans `/admin/`. |
| Le mot de passe marche en local mais pas sur Pages | Vérifier `admin:check-password`, `admin:verify-cloudflare`, la compatibilité du hash PBKDF2 et le déploiement Production actif. Ne pas divulguer ses secrets. |
| Le site Pages ne ressemble pas au local | Lancer `npm run test:dist` et `npm run test:remote -- https://podcast-7ck.pages.dev`, puis examiner les ressources 404 dans l’onglet Réseau du navigateur. |
| « Variables cannot be added to a Worker that only has static assets » | Revoir le type de projet : il faut **Cloudflare Pages** avec Pages Functions, pas un Worker statique seul. |
| Un test de snapshot échoue | Les noms des images configurées et leurs versions WebP sont déjà ignorés dans l’empreinte ; comparez le HTML/CSS modifié (`git diff -- site/index.html site/assets/style.css`) avant d’envisager `npm run test:regression:update`. Les chemins et fichiers d’images restent vérifiés séparément. |
| Un test XML échoue | Comparer le texte avec l’export de référence : les 13 récits historiques ne doivent pas être modifiés par inadvertance. |

Les autres documents historiques du dépôt (guides V12, correctifs, etc.) servent d’archives techniques. **Ce README est la documentation principale de la version actuelle**.

## Nouveautés V14 — écouter, découvrir et publier

La V14 ajoute les filtres **« Avec podcast » / « À lire »** à la bibliothèque, des messages d'accueil adaptés aux MP3 réellement publiés, un bouton de partage sur chaque récit, un lecteur audio enrichi (avance/retour de 15 s, vitesse, durée, Media Session) et des ajustements mobile/performance. Dans `/admin/`, les liens HTTPS de MP3 et de plateformes se mettent désormais à jour immédiatement via D1. Un assistant prépare un ZIP de brouillon pour l'ajout d'une histoire.

**Migration de base indispensable** pour le nouveau panneau audio : exécutez une seule fois sur la base D1 de production :

```bash
npx wrangler d1 execute histoires-podcast-stats --remote --file=./db/schema.sql
```

Adaptez `histoires-podcast-stats` au nom de votre base si nécessaire ; vérifiez qu'elle est liée à `ANALYTICS_DB` du projet `podcast-7ck`. Les commandes SQL `CREATE TABLE IF NOT EXISTS` ne réinitialisent pas vos données. **Ne relancez pas `admin:setup` et ne recréez pas vos secrets.**

Pour les étapes détaillées de migration, les MP3 R2, l'utilisation de l'administration, la création d'histoires et le dépannage, consultez [GUIDE-V14-ADMIN-ET-LECTEUR.md](GUIDE-V14-ADMIN-ET-LECTEUR.md).

- **Ajouter un MP3 immédiatement depuis `/admin/` :** téléversez le fichier *au préalable* sur un hébergeur HTTPS (R2 ou équivalent), puis remplissez son URL et les liens d'épisode. Les fichiers `.mp3` locaux continuent à passer par `content/audio.config.json` et Git.
- **Ajouter une histoire depuis `/admin/` :** le formulaire télécharge un ZIP de brouillon. Sur le PC, lancez d'abord `npm run story:new -- --title "Mon histoire"`, extrayez le ZIP pour remplacer les fichiers du récit, passez `published` à `true`, vérifiez `npm test` et poussez sur `master`. La nouvelle page n'est pas créée en direct par D1.
- **Publication des histoires existantes :** les cases Masquée/Publiée fonctionnent toujours immédiatement en D1.
- **Tests :** `npm test` exécute les vérifications unitaires, d'intégration, Cloudflare, éditoriales, SEO, confidentialité et performance.

## Configurer le carrousel de l’accueil

Modifier `content/carousel.config.json` pour choisir les couvertures et leur ordre :

```json
{
  "rotationSeconds": 4.6,
  "stories": [
    {"slug":"bas-les-masques", "label":"Bas les masques", "color":"#674871"},
    {"slug":"petit-ourson-deviendra-grand", "label":"Petit ourson", "color":"#85704d"}
  ]
}
```

- `slug` : identifiant de l’histoire publiée (présent dans `site/data/histoires.json` après `npm run generate:stories`). L’ordre dans le tableau est l’ordre de défilement.
- `label` et `color` sont facultatifs : titre court et couleur de la carte. Une couleur doit être un hexadécimal `#RRGGBB`.
- `rotationSeconds` : entre 2 et 30 secondes. Entre 1 et 12 histoires distinctes sont acceptées ; une seule carte masque les flèches.
- Les histoires en brouillon ou inconnues ne sont pas acceptées dans la configuration, afin d’éviter les erreurs silencieuses.
- **« Podcast disponible »** apparaît automatiquement si `content/audio.config.json` définit un MP3 (`src`) ou au moins un lien de plateforme valide pour l’épisode. Sinon : **« Podcast à venir »**. Ne pas modifier le statut à la main dans le HTML.
- L’administration peut encore désactiver une histoire : elle disparaîtra alors du carrousel sur le site publié (après chargement du catalogue public filtré).

Après un changement : `npm run build`, puis `npm test` et `git push origin master`.
Le générateur remplit la section entre `<!-- CAROUSEL-START -->` et `<!-- CAROUSEL-END -->` de `site/index.html`. Ne modifiez pas les cartes directement dans le HTML : elles sont régénérées à chaque build.


## V14.1 — Bibliothèque fluide et administration réorganisée

- **Bibliothèque `/histoires.html`** : les cartes ne sont plus soumises à `content-visibility: auto` pendant le défilement. Leur taille et celle des couvertures sont stabilisées, et les effets de zoom/translation au survol sont désactivés sur cette page. Les six premières images sont chargées en priorité. Cette correction vise les apparitions brutales signalées à la descente de page.
- **Administration `/admin/`** : ordre logique « Bibliothèque → Podcasts → Nouvelle histoire → Statistiques », navigation directe, liste de publication et statistiques détaillées dépliables. Les formulaires, identifiants HTML et API de la V14 restent inchangés.
- **Contrôles** : nouveaux tests de structure HTML de l'administration et garde-fous CSS/JavaScript contre les flashs ; contrôle CSS de non-régression actualisé.

Le correctif **n'altère ni les données D1 ni les secrets administrateur**. Consultez `CORRECTIF-V14-1.md` pour les vérifications et l'installation.


## V14.4.2 — Calendrier audio de Noël et badges du carrousel

La page saisonnière **`/noel/`** accueille une histoire de Noël en **25 parties audio**, déverrouillées chaque jour du 1er au 25 décembre. Elle n'est accessible que **du 25 novembre au 26 décembre inclus, heure de Paris**, grâce à une restriction côté Cloudflare Pages. Elle n'est pas incluse dans le sitemap. La configuration des 25 parties **et de la nouvelle introduction avec son MP3** est dans `content/noel.config.json` ; les MP3 ne sont pas inclus dans les archives. Après le petit correctif, lancer `npm run noel:intro:setup` (préserve les 25 MP3 déjà déclarés), puis renseigner `introduction.title`, `introduction.text` et `introduction.src` (nom local autorisé : `assets/audio/noel/introduction.mp3`, ou URL directe HTTPS). Si `src` est vide, la section affiche un message en attendant l’enregistrement. La mention du fuseau horaire a été retirée du bandeau, mais la restriction reste basée sur Europe/Paris.

Pour prévisualiser hors saison en développement local : `npm run dev`, puis `http://localhost:5173/noel/?preview=1` (Git Bash ou PowerShell ; aucun réglage d’environnement nécessaire). Le lecteur d’introduction fonctionne aussi en mode aperçu. Voir [GUIDE-NOEL-V14-4.md](GUIDE-NOEL-V14-4.md). Les deux styles de badges du carrousel sont désormais distincts selon la disponibilité du podcast.

