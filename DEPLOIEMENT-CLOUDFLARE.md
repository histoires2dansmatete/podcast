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
