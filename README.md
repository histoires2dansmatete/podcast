# Les histoires de Dans ma tête — version 12

Site Web statique pour **https://histoires2dansmatete.fr**, développé en local avec Node.js 22+ et déployé depuis GitHub vers **Cloudflare Pages**. Il conserve les 13 textes intégraux importés du WordPress (avec comparaison XML à chaque build), les fiches podcasts et les contenus SEO.

## V12 — Nettoyage, images optimisées et mot de passe Cloudflare

- **Nettoyage :** un seul bloc social dans les fiches, suppression du rendu transitoire devenu inutile et correctif du nettoyage des éléments HTML des récits.
- **Performances :** CSS de production légèrement allégé, décodage asynchrone et chargement différé des images secondaires ; les images originales peuvent être converties en WebP sans perte de leur rapport largeur/hauteur.
- **Images :** `npm run optimize:images` parcourt toutes les images de `site/assets/images/` et crée les versions légères sous `site/assets/images/optimized/`, sans supprimer les originaux. Installer au préalable Pillow (`python -m pip install -r scripts/requirements-images.txt`).
- **Administration :** erreurs différenciées (mot de passe invalide vs. limitation à 15 minutes), diagnostic local `npm run admin:diagnose`, synchronisation explicite des secrets vers Pages avec `npm run admin:sync-cloudflare -- --project podcast-7ck`.

**La connexion qui réussit sur votre PC ne garantit pas que Cloudflare utilise le même hash.** Les secrets ne sont pas déployés depuis GitHub. Voir la section V12 de [DEPLOIEMENT-CLOUDFLARE.md](DEPLOIEMENT-CLOUDFLARE.md) pour synchroniser vos secrets locaux avec votre projet Pages, puis redéployer et attendre, si nécessaire, l'expiration de la limitation.

**Illustrations :** les véritables fichiers de `site/assets/images/` restent à fournir depuis votre PC ; les versions WebP ne seront créées qu'après copie de ces fichiers. Ne partagez pas `.env.local` et ne le commitez pas.

## V11 — Correction de « Origine non autorisée » sur Cloudflare Pages

Le formulaire de connexion **en production** contient maintenant un jeton anti-CSRF signé et limité à 20 minutes, comme en local. Certains navigateurs / intermédiaires suppriment l'en-tête `Origin` sur une soumission classique : la V10 rejetait alors le mot de passe **avant de le vérifier**. La V11 accepte ces cas uniquement si le jeton du formulaire est valide et si la requête n'est pas déclarée `cross-site`. Les origines externes explicites sont **toujours refusées**. `Origin` correct fonctionne normalement, sans jeton obligatoire (compatibilité).

Après mise en ligne depuis GitHub :

1. Vérifiez que Cloudflare **Pages** a publié la dernière branche `main` et que la page `/admin/` contient un champ caché `name="csrf"`. Un ancien déploiement ne l'a pas.
2. Ouvrez **https://podcast-7ck.pages.dev/admin/** (pas directement `/api/admin/login`), rechargez intégralement avec Ctrl+F5, puis saisissez le mot de passe.
3. Exécutez `npm run test:remote -- https://podcast-7ck.pages.dev` pour contrôler le build, les ressources et le formulaire de connexion (sans envoyer de mot de passe).
4. Si vous recevez **503** après ce correctif, vérifiez `ANALYTICS_DB`, `admin_login_limits`, `ADMIN_PASSWORD_HASH` et `ADMIN_SESSION_SECRET` dans l'environnement Cloudflare Pages concerné (Production ou Preview). Si vous recevez **403**, vérifiez dans les outils réseau du navigateur les en-têtes `Origin` et `Sec-Fetch-Site` ainsi que la présence du champ `csrf` (ne partagez pas sa valeur).

**Important :** un simple changement local ne corrige pas le site distant : il faut `git add`, `git commit` et `git push`, puis attendre la réussite du déploiement Pages. La V11 n'a pas été publiée automatiquement.

## Diagnostic Cloudflare

➡ **[DEPLOIEMENT-CLOUDFLARE.md](DEPLOIEMENT-CLOUDFLARE.md)** décrit la différence Pages / Worker statique, la correction des CSS et la procédure de vérification du site réel.

La V10 convertit tous les liens internes du build `dist/` en chemins absolus, vérifie leurs cibles et réduit le risque de servir une ancienne feuille CSS en cache. Commandes supplémentaires : `npm run test:dist`, `npm run check:images`, `npm run test:remote -- https://VOTRE-PROJET.pages.dev`.

## Installation CLI complète

➡ **Suivez [INSTALLATION-CLI.md](INSTALLATION-CLI.md)** pour l'installation depuis votre PC (Windows, macOS ou Linux), les tests locaux, GitHub et la liaison avec Cloudflare Pages/D1.

## Corrections de la version 10

- **Copyright du footer :** le texte est désormais regroupé dans un paragraphe unique, sans étirement sur toute la largeur, sur toutes les pages (y compris « Qui suis-je ? » et Confidentialité).
- **Footer :** dédoublonnage des anciens `footer-social-area` et génération idempotente : même après plusieurs `npm run build`, **une seule** zone sociale par page.
- **Connexion locale :** un jeton anti-CSRF signé est intégré au formulaire local pour les navigateurs qui omettent l’en-tête `Origin`. Les origines externes demeurent bloquées ; en cas de refus, le terminal affiche un diagnostic sûr. La requête garde l'hôte utilisé par le navigateur (`localhost:5173` ou `127.0.0.1:5173`), ce qui corrige l'erreur « Origine non autorisée » sans désactiver le contrôle anti-CSRF.
- **Illustrations portrait (853 × 1280) :** l'illustration « Où écouter ? » et celle du bloc `about-visual` respectent leur format vertical (`height: auto`, `object-fit: contain`) sans couper le bas.
- **Apple Podcasts :** remplacement du pictogramme précédent par un SVG dédié montrant le symbole Podcasts, sans second carré coloré à l'intérieur de la vignette.
- **SEO :** nettoyage des lignes vides au moment de régénérer les métadonnées, afin d'obtenir un build stable lors d'exécutions successives.

Ces corrections s'appliquent aux fichiers sources `scripts/`, aux pages dans `site/` et aux ressources `site/assets/` : ne remplacez pas uniquement le CSS.

## Démarrage local et administration avec mot de passe

```bash
npm ci
npm run admin:setup
npm run dev
```

- Site : **http://localhost:5173/**
- Administration : **http://localhost:5173/admin/**
- Catalogue : **http://localhost:5173/histoires.html**

`npm run admin:setup` demande un mot de passe de **12 caractères minimum**. Il prépare `.env.local` contenant **un hash PBKDF2-SHA256 du mot de passe** et **une clé de signature de session aléatoire**. Le mot de passe en clair n'est jamais enregistré. Exécutez cette commande dans un terminal interactif pour masquer la saisie.

**Ne commitez et ne partagez jamais `.env.local`** (il est exclu par `.gitignore`). Si vous exécutez `npm run dev` sans ce fichier ni variables d'environnement, l'administration renvoie HTTP 503, et non un écran ouvert par défaut. L'administration locale ne contient pas de données d'audience de production : les compteurs sont à zéro, avec la mention « mode local ». Vous pouvez publier/masquer les histoires **sur votre ordinateur** ; ces états sont stockés dans `.local/story-states.json` sans modifier les états de la production.

Pour tester le build :

```bash
npm run check           # contrôle fichiers + XML + intégration HTTP
npm run test:security   # tests authentification, limitation, session et API
npm run test:layout     # vérifie l’absence de doublons dans le footer
npm run build           # génère dist/
npm run preview         # teste dist/ sur http://localhost:4173
```

## Configuration des illustrations

**Tout se configure dans `site/assets/images.config.json`.** Les quatre images globales possèdent chacune leur clé :

| Clé | Emplacement | Fichier configuré par défaut |
|---|---|---|
| `globals.logo` | Logo du header et du footer | `assets/logo.webp` |
| `globals.aboutVisual` | Visuel « À propos » de la page d'accueil | `assets/images/about_me.png` |
| `globals.bioImage` | Visuel de la page « Qui suis-je ? » | `assets/images/about_me.png` |
| `globals.listenArt` | Illustration de la page « Où écouter ? » | `assets/images/about_me.png` |
| `stories.<slug>` | Couverture de l'histoire, catalogue, carrousel et SEO | `assets/images/<fichier original>` |

Le nom **`about_me.png`** est celui de l'illustration « About Me » référencée par l'export WordPress. Copiez vos images d'origine sous `site/assets/images/` en respectant la casse et l'extension. Si un fichier configuré manque, une image de secours **locale** s'affiche (`assets/logo.webp` pour les images globales, SVG par histoire pour les couvertures). Aucune image n'est récupérée sur l'ancien WordPress.

**Remarque sur l'archive** : les véritables illustrations du répertoire `site/assets/images/` n'étaient pas jointes à la version V6 disponible dans cette conversation ; elles ne sont donc pas incluses dans cette archive. Conservez ou recopiez votre dossier `site/assets/images/` personnel lors de la mise à jour du projet.

Après modification du catalogue : `npm run dev` ou `npm run build` met à jour les pages ; le contrôle `npm run check` vérifie la résolution des images des blocs principaux.

## Header, footer et réseaux sociaux

Le nouveau header présente deux icônes rondes **Instagram** et **Facebook** avant le menu mobile. Le footer présente un espace « Restons en contact » dédié avec les deux logos et les noms des plateformes. Les liens sont aussi présents dans la page « Qui suis-je ? », « Où écouter ? » et « Confidentialité ».

- Instagram : https://www.instagram.com/les_histoires_2_dans_ma_tete/
- Facebook : https://www.facebook.com/profile.php?id=61587115217827
- Icônes SVG locales : `site/assets/icons/`
- Le générateur commun `scripts/layout.mjs` assure le même rendu sur les **13 fiches histoires**.

## GitHub → Cloudflare Pages

1. Poussez les fichiers du projet sur votre dépôt GitHub, sans `.env.local`, `dist/`, `.local/` ni votre export XML d'origine.
2. Créez un projet **Cloudflare Pages** avec l'intégration GitHub. **Framework** : None ; **Build command** : `npm run build` ; **Output directory** : `dist` ; **Root** : `.` ; branche de production : `main`.
3. Créez votre base **Cloudflare D1**. Exécutez ou réexécutez **`db/schema.sql`** (tables `visits`, `story_states`, `admin_login_limits`). Associez-la à Pages Functions avec un binding D1 nommé exactement `ANALYTICS_DB`.
4. Dans **Pages → Settings → Variables and Secrets** (Production ET Preview si nécessaire), créez **deux secrets chiffrés** :
   - `ADMIN_PASSWORD_HASH` : copiez la valeur générée dans `.env.local` ;
   - `ADMIN_SESSION_SECRET` : copiez la deuxième valeur générée dans `.env.local`.
   **Ne les mettez jamais dans Git ni dans une variable JavaScript publique.**
5. Maintenez `ANALYTICS_SALT` comme secret Cloudflare pour le système de statistiques déjà présent. Déployez le projet, puis vérifiez `https://histoires2dansmatete.fr/admin/` et les APIs.
6. Configurez `histoires2dansmatete.fr` comme domaine personnalisé de Pages. Planifiez la migration DNS de l'ancien hébergement.

**Cloudflare Access n'est plus nécessaire** : la page et les API d'administration exigent désormais **une session authentifiée par mot de passe, côté serveur**. Les variables `ACCESS_TEAM_DOMAIN` et `ACCESS_AUD` ne sont plus utilisées. Le cookie d'administration est `HttpOnly`, `SameSite=Strict`, `Secure` sous HTTPS, signé HMAC-SHA256 et expire au bout de 8 heures. L'API d'administration refuse toute requête sans session ; ses modifications exigent une requête de même origine.

**Protection contre les tentatives répétées :** après cinq mots de passe invalides sur une même adresse source, la connexion est temporairement refusée pendant quinze minutes ; l'application ne stocke dans D1 qu'un identifiant HMAC du client, pas son IP en clair. Une base D1 absente met la connexion de production en échec. Pour une défense supplémentaire, vous pouvez activer une règle **Cloudflare WAF de limitation de débit** sur `/api/admin/login`.

**Changer le mot de passe** : relancez `npm run admin:setup`, puis remplacez `ADMIN_PASSWORD_HASH` et `ADMIN_SESSION_SECRET` dans les secrets de Cloudflare et redéployez. Toutes les sessions existantes seront invalidées après changement de la clé.

## Stories, SEO, monitoring

- **13 histoires** publiées sous `/histoires/<slug>/`, avec texte complet, résumé, illustrations et lecteurs audio prêts à configurer.
- Activation/désactivation des histoires via `/admin/`, contrôlée côté serveur sur Cloudflare (D1) et en local (JSON privé). Les histoires désactivées sont exclues des listes, flux RSS et sitemap et renvoient 404.
- **SEO** : URL canoniques `https://histoires2dansmatete.fr`, 17 entrées sitemap, descriptions par histoire, données structurées JSON-LD, Open Graph, redirections 301 historiques.
- **XML** : `tests/fixtures/histoires-wordpress-public.xml` ne contient que les 13 récits publics. `npm run test:xml` compare les titres, thèmes, slugs, textes et HTML générés avec cette référence ; un XML plus récent peut être testé avec `npm run test:xml -- /chemin/export.xml`.
- **Statistiques** : visites et interactions sur consentement, sans suivi nominatif. Les statistiques de production apparaissent après la mise en place de D1 et les premières visites consenties. Pour un suivi plus large, utilisez aussi Cloudflare Web Analytics (configuration distincte).

Les fichiers `functions/` à la racine du dépôt sont indispensables pour l'administration et les états des histoires : le déploiement doit se faire **via l'intégration GitHub**, pas uniquement en publiant un ZIP du dossier `dist/`.
