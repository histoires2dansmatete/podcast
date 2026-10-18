# Installer, tester et publier « Les histoires de Dans ma tête » — guide CLI V9

Ce document couvre **Windows (PowerShell)**, **macOS/Linux (terminal)**, le développement local, la mise en place de GitHub et les derniers réglages Cloudflare Pages.

Adresse de production prévue : **https://histoires2dansmatete.fr**. Le projet est volontairement statique pour les pages publiques ; les API et le tableau de bord privé utilisent **Cloudflare Pages Functions** et **D1** en production.

## 0. Préparation du poste

Il faut : **Node.js 22 ou plus**, **Git**, un compte **GitHub** et un compte **Cloudflare**. Le programme `gh` (GitHub CLI) est recommandé pour créer et publier un dépôt depuis le terminal.

### Windows — PowerShell

Ouvrez Windows Terminal / PowerShell et installez les outils si nécessaire :

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install GitHub.cli
```

Fermez et rouvrez le terminal, puis vérifiez :

```powershell
node --version
git --version
gh --version
npm --version
```

> Si `winget` est indisponible, installez les outils depuis nodejs.org, git-scm.com et cli.github.com.

### macOS / Linux

Installez Node.js 22+, Git et GitHub CLI avec le gestionnaire de paquets de votre système ou leurs sites officiels, puis vérifiez :

```bash
node --version
git --version
gh --version
npm --version
```

Si vous avez déjà Node installé dans une version ancienne, mettez-le à jour avant de lancer `npm ci`.

## 1. Décompresser le projet

Téléchargez l'archive `histoires-podcast-v9-github-cloudflare.zip`.

**Windows / PowerShell :**

```powershell
New-Item -ItemType Directory -Force "$HOME\Documents\histoires-podcast" | Out-Null
Expand-Archive -Path "$HOME\Downloads\histoires-podcast-v9-github-cloudflare.zip" -DestinationPath "$HOME\Documents\histoires-podcast" -Force
Set-Location "$HOME\Documents\histoires-podcast"
```

**macOS / Linux :**

```bash
mkdir -p ~/projets/histoires-podcast
cd ~/projets/histoires-podcast
unzip ~/Downloads/histoires-podcast-v9-github-cloudflare.zip
```

Le bon dossier contient notamment `package.json`, `site/`, `scripts/`, `functions/`, `db/` et `README.md`. Si vous **mettez à jour un dépôt déjà cloné**, décompressez la V9 dans ce dépôt sans effacer `.git/`, `.env.local`, `.local/` et votre dossier `site/assets/images/` ; conservez les secrets locaux.

## 2. Installer et démarrer en local

```bash
npm ci
npm run admin:setup
npm run dev
```

`npm run admin:setup` demande un **mot de passe d'au moins 12 caractères**, crée `.env.local` avec son empreinte cryptographique et une clé de session. La saisie est masquée dans un vrai terminal interactif. **Si un fichier `.env.local` valide existe déjà, ne relancez pas cette commande sans raison**, car elle réinitialise le mot de passe et invalide les sessions existantes.

Adresses dans le navigateur :

- Site : **http://localhost:5173/**
- « Qui suis-je ? » : **http://localhost:5173/qui-suis-je.html**
- Administration : **http://localhost:5173/admin/**
- Histoires : **http://localhost:5173/histoires.html**

La page `/api/admin/login` est **une API qui attend un POST de formulaire** ; ne l'ouvrez pas directement dans la barre d'adresse. Ouvrez `/admin/`, saisissez le mot de passe, puis cliquez sur « Se connecter ».

Pour arrêter le serveur : **Ctrl+C**. Après mise à jour du code serveur, **arrêtez et redémarrez impérativement le serveur** ; un simple rafraîchissement ne suffit pas.

### Si vous voyez encore « Origine non autorisée »

1. Assurez-vous que vous exécutez bien la **V9** : `node -p "require('./package.json').version"` doit retourner `9.0.0`.
2. Arrêtez toutes les anciennes instances `npm run dev` avec **Ctrl+C** puis relancez depuis le dossier V9.
3. Accédez uniquement à **http://localhost:5173/admin/** ; ne mélangez pas les onglets `localhost` et `127.0.0.1` pour une même session.
4. Rechargez `/admin/` pour recevoir un nouveau **jeton de formulaire signé** ; réessayez dans une fenêtre privée si une extension perturbe la soumission.
5. Consultez le terminal : les refus affichent la valeur de `Origin` et `Sec-Fetch-Site` **sans journaliser votre mot de passe**.

La V9 accepte les formulaires locaux valides avec jeton signé même lorsque le navigateur omet `Origin` ; elle refuse toujours les origines externes.

## 3. Vérifier le site et tester la version de production

Dans **un nouveau terminal** positionné à la racine du projet :

```bash
npm run check
npm run test:security
npm run test:layout
npm run test:xml
npm run build
npm run preview
```

- `npm run check` : vérifie navigation, contenu, images, 13 textes et test HTTP (incluant la connexion locale).
- `npm run test:security` : contrôle les mots de passe, sessions, CSRF et API privées.
- `npm run test:layout` : contrôle les footers, les icônes et les proportions d'images.
- `npm run test:xml` : compare chaque histoire avec la référence XML embarquée.
- `npm run build` : construit les pages qui seront publiées dans `dist/`.
- `npm run preview` : ouvre le rendu de production sur **http://localhost:4173/**.

Si vous souhaitez comparer explicitement **votre export WordPress original** (à conserver hors Git), passez son chemin au test :

```bash
node scripts/test-wordpress.mjs "/chemin/vers/mon-export.WordPress.xml"
```

Sous Windows, utilisez par exemple :

```powershell
node scripts/test-wordpress.mjs "$HOME\Downloads\mon-export.WordPress.xml"
```

## 4. Illustrations

Copiez vos images originales dans `site/assets/images/` et vérifiez leurs noms dans `site/assets/images.config.json`. En l'absence d'une illustration, la version livrée affiche une image locale de secours. Pour vous assurer que Git enverra les images, vérifiez `git status` avant le commit. **Ne remplacez pas vos propres images par celles du ZIP si elles n'y figurent pas.**

## 5. Créer un dépôt GitHub depuis le terminal

Configurez Git (une seule fois sur votre poste) :

```bash
git config --global user.name "Votre nom ou pseudo"
git config --global user.email "votre-email-github@example.com"
gh auth login
```

Acceptez l'authentification GitHub dans le navigateur si demandée. Depuis le dossier du projet **qui ne possède pas encore de dépôt `.git`** :

```bash
git init -b main
git add .
git status --short
git commit -m "Site podcasts V9 : admin locale et footer corrigés"
gh repo create histoires-dans-ma-tete --private --source=. --remote=origin --push
```

La commande crée un dépôt **privé** sur votre compte GitHub et pousse `main`. Si le dépôt existe déjà, **ne relancez pas `git init` et ne créez pas un second dépôt** : vérifiez `git remote -v` puis utilisez simplement `git add .`, `git commit -m "..."`, `git push origin main`.

Avant toute publication, confirmez que `.env.local`, `.local/`, `dist/`, `node_modules/` et le XML WordPress original sont ignorés par Git. Les vrais visuels de `site/assets/images/` peuvent être commités.

## 6. Relier le dépôt GitHub à Cloudflare Pages (une seule fois)

Cette autorisation **GitHub → Cloudflare** se fait dans l'interface Web : la connexion OAuth initiale ne découle pas du seul `git push`.

1. Ouvrez [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Import an existing Git repository**.
2. Autorisez GitHub et sélectionnez `histoires-dans-ma-tete`.
3. Configurez le projet avec les valeurs suivantes :

| Paramètre | Valeur |
|---|---|
| Branche de production | `main` |
| Framework | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `.` (racine du dépôt) |
| Variable de build Node (si nécessaire) | `NODE_VERSION=22` |

**Attention** : les Functions sont dans `functions/` à la racine et requièrent l'intégration complète du dépôt ; ne publiez pas le seul dossier `dist/` par simple upload si vous voulez l'administration.

Cloudflare générera une URL provisoire `*.pages.dev`. Chaque prochain `git push` sur `main` reconstruira automatiquement le site. Évitez de modifier le DNS du domaine définitif avant validation du projet de préproduction.

## 7. Installer Cloudflare Wrangler CLI et préparer la base D1

Depuis le répertoire du projet :

```bash
npx wrangler login
npx wrangler d1 create histoires-podcast-stats
npx wrangler d1 execute histoires-podcast-stats --remote --file=./db/schema.sql
```

`npx wrangler login` ouvre le navigateur pour autoriser l'accès à votre compte Cloudflare. La commande D1 crée la base **une seule fois**. Si elle existe déjà, **ne la recréez pas** : réutilisez son nom et exécutez seulement le schéma idempotent si besoin. Vous pouvez ajouter `--jurisdiction eu` à `d1 create` pour demander une résidence UE, si adaptée à votre compte Cloudflare.

**Liaison indispensable :** Cloudflare → projet Pages → **Settings → Bindings → Add → D1 database**, nom du binding exactement **`ANALYTICS_DB`**, base `histoires-podcast-stats`, puis **redéployez**. La liaison peut aussi être déclarée dans la configuration Wrangler d'un projet, mais ce projet s'appuie sur l'intégration GitHub configurée dans le Dashboard.

## 8. Configurer les secrets du projet Pages

Le fichier `.env.local` a créé deux secrets :

- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Depuis un terminal connecté à Cloudflare, pour chacun :

```bash
npx wrangler pages secret put ADMIN_PASSWORD_HASH --project-name histoires-dans-ma-tete
npx wrangler pages secret put ADMIN_SESSION_SECRET --project-name histoires-dans-ma-tete
npx wrangler pages secret put ANALYTICS_SALT --project-name histoires-dans-ma-tete
```

Quand Wrangler demande la valeur : collez **la valeur après `=`** trouvée dans `.env.local` pour les deux premiers secrets. Pour le troisième, générez une valeur aléatoire **différente** avec :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Copiez la sortie dans l'invite de saisie du troisième secret. **Ne collez jamais les secrets dans GitHub, une conversation publique ni un fichier du répertoire `site/`.**

Confirmez les noms des secrets :

```bash
npx wrangler pages secret list --project-name histoires-dans-ma-tete
```

Si vous avez choisi un **autre nom de projet Pages**, remplacez `histoires-dans-ma-tete` dans les commandes ci-dessus par ce nom exact. Configurez également les secrets et la liaison D1 pour l'environnement *Preview* si vous souhaitez tester l'administration sur les prévisualisations. **Redéployez** après avoir ajouté les bindings et secrets.

## 9. Rattacher le domaine définitif

Dans Cloudflare → projet Pages → **Custom domains** → **Set up a domain** → `histoires2dansmatete.fr`. Pour le domaine racine, Cloudflare doit également gérer la zone DNS correspondante. Suivez ses indications pour les serveurs de noms et les éventuels enregistrements existants.

**Avant de changer les DNS**, vérifiez l'URL de test `*.pages.dev`, les pages complètes, les images, `/admin/`, les stats et les redirections des anciennes URLs. Si le domaine pointe encore sur l'ancien site, prévoyez la bascule avec précaution pour éviter une interruption de service. Les certificats HTTPS sont gérés par Cloudflare.

## 10. Travailler au quotidien

```bash
npm run dev
# modifier les pages, CSS, contenu et images...
npm run check
npm run test:security
npm run build
git add .
git commit -m "Mise à jour des histoires"
git push origin main
```

Cloudflare Pages détecte automatiquement ce push GitHub et publie la nouvelle version lorsque son build est terminé.

## 11. Rappel sécurité et dépannage

- **Pas de mot de passe en clair en production** : uniquement son hash, une clé de session et le sel d'analyse côté serveur.
- **Pas de mot de passe dans Git** : `.env.local` est exclu par `.gitignore`.
- **Administration locale** : données de test dans `.local/story-states.json`, séparées de la base D1 de production.
- **Modifier le mot de passe** : `npm run admin:setup` puis mise à jour des deux secrets sur Cloudflare et redéploiement (les sessions antérieures seront invalidées).
- **Statistiques vides** : vérifiez le consentement, la liaison `ANALYTICS_DB`, `ANALYTICS_SALT` et l'arrivée de véritables visites.
- **Login local refusé** : vérifiez d'abord la version V9 et l'ancien serveur encore actif ; le terminal affiche des diagnostics d'origine sans jamais imprimer le mot de passe.
- **Images manquantes** : vérifiez l'orthographe exacte (majuscules comprises) des noms du catalogue et la présence effective de `site/assets/images/` dans Git.

Documentation officielle : [Pages et GitHub](https://developers.cloudflare.com/pages/configuration/git-integration/) · [Cloudflare D1](https://developers.cloudflare.com/d1/wrangler-commands/) · [Bindings Pages](https://developers.cloudflare.com/pages/functions/bindings/) · [Domaines Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [Wrangler Pages](https://developers.cloudflare.com/workers/wrangler/commands/pages/).
