# Les histoires de Dans ma tête — V6

**Nouveautés V6 :** images configurables centralement, logos vectoriels locaux des réseaux et plateformes, confidentialité avec contact Instagram et Facebook.

## Configurer les 13 images

1. Copiez vos images originales dans `site/assets/images/`.
2. Ouvrez `site/assets/images.config.json`. Chaque histoire y possède une entrée avec le **nom du fichier original WordPress** et une URL locale `assets/images/NomDuFichier.png`. Adaptez le nom si votre image a été renommée.
3. Lancez `npm run dev` (ou `npm run build`). Le générateur vérifie que les fichiers existent : **si présents, ils s'affichent** dans les pages histoires, le catalogue, le carrousel de l'accueil et les balises de partage ; sinon, une couverture SVG intégrée est utilisée.
4. Les images ne sont pas comprises dans cette archive si elles n'étaient pas dans la V5 transmise. Aucune image n'est chargée depuis l'ancien WordPress.

## Liens sociaux et logos des plateformes

- Instagram : https://www.instagram.com/les_histoires_2_dans_ma_tete/
- Facebook : https://www.facebook.com/profile.php?id=61587115217827
- Icônes vectorielles locales dans `site/assets/icons/` ; attribution dans `site/assets/icons/ATTRIBUTION.md`.
- Les plateformes audio sont encore désactivées tant que leurs URLs ne sont pas renseignées dans `site/config.js`.
- La confidentialité renvoie vers Instagram et Facebook pour contacter l’éditrice.

## Développement et Cloudflare

```bash
npm ci
npm run dev
npm run check
npm run test:security
npm run build
```

Déployer `dist/` via GitHub → Cloudflare Pages (build `npm run build`). La configuration D1 et la protection Cloudflare Access de `/admin/` restent requises en production.

---

# Les histoires de Dans ma tête — V5

Un site statique pour Cloudflare Pages, avec **13 récits intégralement importés**, catalogue filtrable, pages de podcast et administration privée pour les statistiques et les publications.

**Domaine public : https://histoires2dansmatete.fr** (à rattacher au projet Cloudflare Pages lors de la mise en production).

## Démarrer en local

Prérequis : Node.js **22+** et Git.

```bash
npm ci
npm run dev
```

- **Site :** http://localhost:5173/
- **Administration de test :** http://localhost:5173/admin/
- **Histoires :** http://localhost:5173/histoires.html

L'administration locale est accessible **uniquement via le serveur lié à 127.0.0.1**, sans compte Cloudflare et avec des statistiques à zéro indiquées comme données de test. Les interrupteurs d'activation/désactivation **fonctionnent** : l'état est sauvegardé dans `.local/story-states.json` (non versionné). Il n'affecte **jamais** votre production. Le serveur vérifie le Host et l'Origin lors des modifications. N'exposez pas le serveur de développement sur Internet.

Commandes :

| Commande | Résultat |
|---|---|
| `npm run dev` | Serveur 5173, actualisation automatique |
| `npm run preview` | Aperçu du dossier `dist/` sur 4173, administration locale de test également disponible |
| `npm run build` | Contrôles puis génération de `dist/` |
| `npm run check` | Liens, SEO, XML, protections et parcours HTTP local |
| `npm run test:xml` | Comparaison avec XML public fourni dans `tests/fixtures/` |
| `npm run test:xml -- /chemin/export-wordpress.xml` | Test contre un export WordPress complet de référence |
| `npm run test:integration` | Simulation Cloudflare + administration locale HTTP |
| `npm run test:security` | Contrôle des JWT Access et des écritures d'administration |

## Catalogue & XML

Le dossier `tests/fixtures/histoires-wordpress-public.xml` contient **uniquement les 13 articles publiés**, sans informations de compte, e-mails privés, brouillons ou fichiers attachés. Ce fichier dérive de l'export du 18 octobre 2026. `scripts/test-wordpress.mjs` vérifie, pour chaque histoire : slug, titre, thèmes WordPress, **texte intégral normalisé** et texte de la **page HTML générée**. Une erreur fait échouer le build et la CI GitHub.

L'export complet d'origine n'est pas inclus dans Git. Vous pouvez tester une nouvelle version du XML avec `npm run test:xml -- /chemin/export.xml`. Si vous modifiez une histoire, mettez à jour la référence après validation explicite du contenu. `npm run import:wordpress -- fichier.xml` reste disponible pour les imports, mais les images de l'export WordPress ne sont **pas intégrées dans le XML**.

Les 13 couvertures actuellement présentes dans `site/assets/stories/` sont des **couvertures SVG temporaires créées localement**. Les véritables illustrations du blog ne pouvaient pas être téléchargées ici ; toutes les dépendances aux images WP ont été retirées. Vous pourrez remplacer les SVG par des images optimisées (en mettant à jour les chemins dans `site/data/histoires.json` et la validation) lorsque vous récupérerez les fichiers médias.

Les filtres de thèmes utilisent `tags[]`, **chaque thème séparément**, pas la chaîne composite `theme`.

## Activer ou désactiver une histoire

En local, ouvrez `/admin/` et basculez le statut. Le serveur protège alors directement le contenu : une histoire masquée renvoie **404** pour sa page publique et pour `index.html`, elle est absente du JSON de catalogue, du sitemap et du flux RSS. Les cartes du carrousel d'accueil sont aussi retirées par JavaScript.

En production, c'est **Cloudflare D1** qui conserve les états. Une histoire est publiée par défaut en l'absence d'enregistrement, et désactivée dès que son état `enabled=0` est enregistré. Le middleware Cloudflare vérifie cet état à chaque accès public. Si D1 n'est pas configurée ou tombe en panne, les routes de lecture, du catalogue et du sitemap **échouent volontairement avec HTTP 503** : les textes désactivés ne sont jamais réexposés par accident. Cela rend la **configuration D1 obligatoire** avant la mise en production.

Attention : comme pour tout site publié, un texte précédemment public peut encore exister dans des caches de moteurs de recherche ou avoir été enregistré par des visiteurs. La désactivation n'efface pas ces copies.

## Cloudflare Pages + GitHub

1. Créez un dépôt GitHub et poussez les **fichiers du projet** ; GitHub Actions exécutera les tests (`.github/workflows/verification.yml`).
2. Dans Cloudflare **Workers & Pages → Pages**, reliez le dépôt GitHub, branche `main`, framework **None**, commande de build `npm run build`, sortie `dist`, racine du projet `.`.
3. Créez une base **Cloudflare D1** puis exécutez `db/schema.sql` dans la console D1 (ou avec `wrangler d1 execute`). Si la base V4 existe déjà, réexécutez le script : les créations de table sont idempotentes.
4. Dans **Pages → Settings → Functions → D1 database bindings**, liez cette base au nom exact **`ANALYTICS_DB`**. Ne confondez pas le nom de la base et le nom du *binding*.
5. Configurez `ANALYTICS_SALT` avec une chaîne secrète aléatoire et longue dans les variables/secrets Cloudflare pour les sessions d'analytics consenties.
6. Dans **Cloudflare Zero Trust → Access**, protégez les chemins **`https://histoires2dansmatete.fr/admin/*`**, **`https://histoires2dansmatete.fr/admin`** et **`https://histoires2dansmatete.fr/api/admin/*`** par une application Access Self-hosted, uniquement pour vos utilisateurs autorisés. Les fonctions serveur **vérifient en plus cryptographiquement** le JWT Access.
7. Paramétrez dans Pages les variables **`ACCESS_TEAM_DOMAIN`** (ex. `votre-equipe.cloudflareaccess.com`) et **`ACCESS_AUD`** (AUD tag exact de l'application Access). Sans ces variables, les endpoints d'administration refusent l'accès (503) ; ils ne se mettent **jamais** en mode local sur Cloudflare.
8. Ajoutez **`histoires2dansmatete.fr`** comme domaine personnalisé du nouveau projet. Attention : le domaine pointe actuellement vers votre ancien site ; **planifiez la bascule DNS et la fin du service WordPress** pour éviter une coupure.
9. Testez : `/admin/`, désactivation d'une histoire, vérification d'une 404, catalogue, sitemap, réactivation. Surveillez les déploiements Functions et les erreurs D1.

**Important :** `dist/` est la sortie de compilation, pas le répertoire racine du dépôt. Les fonctions Cloudflare se trouvent dans `functions/` à la racine et sont détectées pendant le build Pages depuis GitHub. Ne publiez pas simplement `dist/` par *Direct Upload* si vous voulez les API et l'administration.

## SEO / migration du domaine

- Toutes les URLs canoniques, le sitemap et les données structurées pointent vers `https://histoires2dansmatete.fr`.
- `site/_redirects` redirige les 13 anciennes URLs de billets WordPress vers `/histoires/{slug}/` en **301** (redirections invisibles, pour préserver les liens externes et le SEO).
- Les histoires désactivées sont exclues du sitemap et des flux en temps réel et renvoient 404.
- Après bascule DNS, validez le sitemap `https://histoires2dansmatete.fr/sitemap.xml` dans **Google Search Console** et contrôlez les redirections des anciennes URLs.
- Les images actuelles sont des SVG provisoires : remplacez-les par les visuels originaux avant une communication officielle si vous souhaitez préserver les illustrations d'origine.
- Il faut aussi compléter la page de confidentialité et les mentions légales selon les obligations applicables et votre paramétrage de collecte.

## Ajouter des podcasts

Renseignez les véritables URL de plateformes dans `site/config.js` et les URL de fichiers audio dans les champs `audioUrl` de `site/data/histoires.json` (HTTPS ou `assets/audio/nom.mp3`). Les liens non configurés restent annoncés « À venir ».

## Sécurité et mesures d'audience

La mesure d'audience requiert un consentement volontaire, les statistiques ne représentent donc **que les visiteurs ayant accepté la collecte**, sans identités réelles. La page d'administration de production est servie uniquement par une Function après validation d'un JWT Cloudflare Access signé. Les modifications d'état exigent un POST même origine et sont protégées côté serveur. Les stats locales affichent zéro, **pas des chiffres fictifs**. 

Les assets en dehors du site (`tests/`, export brut, `.local/`, Functions et secrets) ne sont pas copiés dans le répertoire public `dist/` ; les fichiers `site/data/histoires.json` et pages générées sont toujours déployés, mais leur accès public passe obligatoirement par le middleware D1 pour pouvoir masquer les histoires.
