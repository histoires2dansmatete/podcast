# Diagnostic et déploiement Cloudflare — V11

## Quel produit Cloudflare choisir ?

**Choisissez Cloudflare Pages et non un Worker « Static assets only ».** Dans cette application, les pages sont statiques mais le dossier `functions/` contient l'authentification, les statistiques et le filtrage des histoires. Un Worker qui héberge uniquement des assets ne compile **pas** automatiquement ces Pages Functions.

Si vous voyez **« Variables cannot be added to a Worker that only has static assets »** :

1. Dans **Workers & Pages**, vérifiez le type du projet concerné : Worker ou Pages. La présence d'une adresse `*.workers.dev` indique normalement un Worker ; `*.pages.dev` correspond à Pages.
2. Si vous avez créé un **Worker statique**, créez un **nouveau projet Pages** relié au dépôt GitHub. Le code seul ne peut pas changer le type du projet existant.
3. Sélectionnez le dépôt GitHub complet, avec `functions/` à la racine. **Ne connectez pas seulement `dist/`**.
4. Configurez : **Framework `None`**, **root `.`**, **build `npm run build`**, **sortie `dist`**, **branche `main`**, Node.js **22+**.
5. Vérifiez le déploiement sur `https://VOTRE-PROJET.pages.dev/` **avant de déplacer le domaine principal** ; actuellement, `histoires2dansmatete.fr` peut encore servir votre ancien WordPress.

## Pourquoi la version distante pouvait perdre son CSS ou ses icônes

La V9 employait des chemins relatifs (`assets/style.css`, `../../assets/style.css`, etc.), fragiles sur certaines routes sans slash final. La V10 convertit **uniquement le build `dist/`** en chemins absolus depuis `/assets/...` et `/config.js` ; les pages de développement restent inchangées. Le cache du dossier `/assets/` est configuré pour **revalidation**, pour éviter qu'un navigateur garde le CSS d'une ancienne version.

Toutefois, si l'application est publiée comme Worker statique avec un mauvais répertoire d'assets, aucune correction CSS ne peut compenser les fichiers non déployés. Il faut publier le projet Pages complet et utiliser `dist` comme output.

**Illustrations originales :** le dossier `site/assets/images/` de l'archive ne contient **pas** les vraies images issues de votre PC. Sauvegardez puis réintégrez-les avant de pousser les changements. `npm run check:images` affiche chaque fichier attendu absent. Les couvertures temporaires sont utilisées en secours ; le test global des 13 récits continue de passer.

## Vérifications CLI avant GitHub

```bash
npm ci
npm run check
npm run test:security
npm run check:images
npm run build
npm run test:dist
npm run preview
```

**Dans un deuxième terminal**, vérifiez le serveur local de prévisualisation :

```bash
npm run test:remote -- http://localhost:4173
```

La partie `/admin/` peut renvoyer **503** dans cet environnement local de preview si vous n'avez pas configuré de mot de passe ; l'outil le signalera. L'administration locale fonctionnelle est accessible avec `npm run dev` et `.env.local`.

## Vérifications CLI après publication sur Pages

```bash
npm run test:remote -- https://VOTRE-PROJET.pages.dev
```

Le contrôle récupère les **réponses HTTP effectivement servies** : accueil V10, CSS `text/css`, JavaScript, SVG sociaux, logo, page Qui suis-je, fiche d'histoire, catalogue JSON et accès admin. Si un fichier renvoie du HTML à la place du CSS, cela apparaîtra immédiatement. Avec `https://histoires2dansmatete.fr`, vous pouvez constater un ancien WordPress tant que le DNS pointe encore sur lui.

Dans le navigateur, ouvrez les outils de développement (**F12 → Network / Réseau**), rechargez la page en désactivant le cache et vérifiez :
- `/assets/style.css` : code HTTP **200**, type **text/css** ;
- `/assets/icons/instagram.svg` et `/assets/icons/facebook.svg` : **200**, type SVG ;
- `/assets/logo.webp` : **200**, type image/webp ;
- `/assets/images/<votre-image>` : **200**, si vous avez bien ajouté l'originale au dépôt ;
- `/data/histoires.json` : **200**, type application/json après branchement D1.

Si une image renvoie **404**, vérifiez sa **casse exacte** sur GitHub : `Flocon.png` et `flocon.png` sont des fichiers distincts sous Linux/Cloudflare.

## Activer administration / suivi sur le BON projet Pages

1. Créez ou réutilisez une base **D1** :
   ```bash
   npx wrangler login
   npx wrangler d1 create histoires-podcast-stats
   npx wrangler d1 execute histoires-podcast-stats --remote --file=./db/schema.sql
   ```
2. Dans **Pages → Settings → Bindings → D1**, sélectionnez cette base, avec le nom **`ANALYTICS_DB`**.
3. Dans **Pages → Settings → Variables and Secrets**, créez les secrets **`ADMIN_PASSWORD_HASH`**, **`ADMIN_SESSION_SECRET`**, **`ANALYTICS_SALT`** (PAS sur le Worker statique). Les deux premiers proviennent de `npm run admin:setup` sur votre PC ; ne commitez jamais `.env.local`.
4. **Redéployez** Pages après avoir configuré les variables et bindings. Si vous utilisez les déploiements Preview, vérifiez séparément leurs bindings/secrets.
5. Vérifiez `/admin/` puis `npm run test:remote -- https://VOTRE-PROJET.pages.dev`.

### GitHub (mise à jour normale)

```bash
git add .
git status --short
git commit -m "V10 : correction chemins Cloudflare, cache et diagnostic"
git push origin main
```

Confirmez la présence sur GitHub de `functions/`, `site/assets/style.css`, `site/assets/icons/` et de vos illustrations `site/assets/images/`. Le build ne doit pas être configuré avec `npm run dev`, `npx wrangler deploy` ni `site` comme répertoire de sortie.

## Domaine de production

Lorsque le site sur `*.pages.dev` est entièrement validé, associez `histoires2dansmatete.fr` **au projet Pages** (Custom Domains), puis effectuez la modification DNS adaptée dans Cloudflare. Ne modifiez pas le domaine avant d'avoir vérifié toutes les routes Pages et l'administration. La configuration DNS et le basculement de l'ancien WordPress nécessitent votre accès Cloudflare.

## Erreur « Origine non autorisée » après le mot de passe

Sur `https://podcast-7ck.pages.dev`, **utilisez `/admin/`** et non l'API `/api/admin/login` (qui reçoit un formulaire POST, et n'est pas une page web à ouvrir directement). L'ancien code vérifiait `Origin` sans alternative côté Pages, contrairement au serveur local.

La V11 émet un jeton signé et temporaire dans le formulaire serveur de Pages et vérifie ce jeton lorsqu'`Origin` est absent ou `null`. Les origines tierces explicites et les navigations `Sec-Fetch-Site: cross-site` restent refusées.

Commandes à lancer **dans votre dépôt Git local** :

```bash
npm ci
npm run test:security
npm run build
npm run test:dist
git add .
git commit -m "V11 corrige la connexion admin Cloudflare Pages"
git push origin main
```

Attendez un déploiement **Successful** dans Cloudflare Pages, puis :

```bash
npm run test:remote -- https://podcast-7ck.pages.dev
```

Cette commande doit indiquer **« Administration : jeton anti-CSRF V11 présent »**. Si elle indique `503`, vérifiez votre base D1 et les secrets de l'environnement adéquat ; le contrôle anti-CSRF ne remplace pas les secrets de production.

## V12 — Le mot de passe fonctionne en local, mais pas sur Pages

Sur `https://podcast-7ck.pages.dev/admin/`, le formulaire est maintenant traité. Les messages doivent être distingués :

- **« Mot de passe incorrect »** (renvoi à `/admin/?erreur=1`) : le mot de passe fourni **ne correspond pas au hash chargé par l'instance Cloudflare**. Ce hash peut être différent de celui de votre PC. Ne relancez pas `admin:setup` si votre mot de passe local vous convient.
- **HTTP 429 « Trop de tentatives »** : la base D1 bloque temporairement les essais depuis cette adresse pendant **15 minutes**. N'essayez pas à répétition ; attendez la fin du délai avant un nouveau test.
- **HTTP 503** : vérifier les secrets et le binding `ANALYTICS_DB`, et la table `admin_login_limits` dans D1.

### Copier les mêmes secrets que ceux de votre ordinateur

Depuis votre **vrai dossier Git local**, contenant le `.env.local` qui permet déjà de vous connecter :

```bash
npm ci
npm run admin:diagnose
npx wrangler login
npm run admin:sync-cloudflare -- --project podcast-7ck
```

La dernière commande vous demande explicitement de confirmer le nom `podcast-7ck` et téléverse **uniquement** `ADMIN_PASSWORD_HASH` et `ADMIN_SESSION_SECRET` via `wrangler pages secret bulk`. Elle ne transmet jamais le mot de passe en clair et n'écrit pas vos secrets dans GitHub ou un fichier temporaire. Elle nécessite l'accès à votre compte Cloudflare et une connexion réseau.

**Attention :** elle remplace la clé de session côté Cloudflare et invalide les sessions existantes. Vérifiez le nom du projet et l'environnement **Production** dans Cloudflare Pages. Les secrets de **Preview** peuvent être différents. `ANALYTICS_SALT` et le binding D1 ne sont pas remplacés par la commande.

Déclenchez ensuite un nouveau déploiement réussi de `main` sur Cloudflare Pages (par exemple `git commit` + `git push` après votre mise à jour). Attendez si besoin 15 minutes que les tentatives précédentes expirent. Rechargez `/admin/` puis saisissez exactement le mot de passe utilisé en local.

Dans **Cloudflare → Workers & Pages → podcast-7ck → Settings → Variables and Secrets**, vous pouvez contrôler que les deux **noms** existent pour l'environnement de production, mais leur valeur reste masquée : c'est normal. Ne communiquez jamais votre fichier `.env.local`, le hash, les cookies de session ni un mot de passe ici.

### Ne pas utiliser « admin:setup » pour réparer sans comprendre

`npm run admin:setup` crée un *nouveau* sel et une *nouvelle* clé même si le mot de passe saisi est identique. Le hash PBKDF2 sera donc différent. Si vous le relancez, vous devrez ensuite synchroniser les nouvelles valeurs avec Cloudflare.

## V12 — Images et performance

1. Conservez et ajoutez vos originaux dans `site/assets/images/`.
2. Installez Python 3 et Pillow : `python -m pip install -r scripts/requirements-images.txt` (Windows : `py -3 -m pip install -r scripts/requirements-images.txt`).
3. Prévisualisez les optimisations : `npm run optimize:images -- --dry-run`.
4. Créez les variantes : `npm run optimize:images`. Le script traite toutes les sous-arborescences, conserve les noms et les proportions, respecte la rotation EXIF, préserve la transparence et garde les originaux.
5. Exécutez `npm run build && npm run test:performance` puis ajoutez **aussi** `site/assets/images/optimized/` à Git avant de pousser.

Le générateur utilise automatiquement les WebP plus légers lorsqu'ils existent ; si l'un est absent, il utilise l'original ou sa couverture de secours. Les animations GIF et les SVG ne sont pas modifiés. Pour changer les paramètres d'optimisation, relancez `npm run optimize:images -- --force --quality 80 --max-size 1400`.

Le build ajoute `decoding="async"` et `loading="lazy"` aux images non prioritaires, et allège les CSS dans `dist/`. Ces changements n'affectent pas les sources HTML ou CSS, et sont vérifiés en CI. La réduction réelle dépend de vos images originales ; l'archive n'inclut pas ces originaux.
