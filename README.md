# Les histoires de « Dans ma tête » — Site du podcast

Projet prêt pour le développement en local, GitHub et **Cloudflare Pages avec déploiement automatique depuis GitHub**.

Le design, les textes et les histoires du site livré précédemment sont conservés. Ce projet reste du **HTML / CSS / JavaScript simples** : il n'y a pas de framework, de base de données ou de serveur à payer. Node.js fournit le serveur de développement, les vérifications et la construction du dossier à publier.

- Blog d'origine : https://histoires2dansmatete.fr/
- Site vitrine : les liens directs Spotify, Apple Podcasts, Deezer et Amazon Music s'activent lorsqu'ils sont renseignés.
- Hébergement cible : Cloudflare Pages (projet **connecté à GitHub**, et non Direct Upload).

## 1. Développer le site sur son ordinateur

**Prérequis :** installer [Node.js](https://nodejs.org/) **version 22 ou supérieure** et [Git](https://git-scm.com/). Un éditeur comme [Visual Studio Code](https://code.visualstudio.com/) est conseillé.

1. Décompresser l'archive ZIP du projet.
2. Ouvrir un terminal dans le dossier qui contient `package.json`.
3. Taper :

```bash
npm ci
npm run dev
```

4. Ouvrir **http://localhost:5173/** dans le navigateur.
5. Modifier un fichier dans `site/`, puis l'enregistrer : le navigateur **se recharge automatiquement**.
6. Pour arrêter le serveur : **Ctrl + C** dans le terminal.

`npm ci` est inclus pour conserver un processus compatible avec GitHub Actions et Cloudflare, même si la version actuelle n'utilise **aucune dépendance npm**.

### Vérifier la version publiée en local

```bash
npm run check        # Vérifie les fichiers, les liens locaux et la configuration
npm run build        # Construit le dossier dist/ (c'est le site publié)
npm run preview      # Prévisualise dist/ sur http://localhost:4173/
```

**Important :** modifier les fichiers dans `site/`, **pas dans `dist/`**. Le dossier `dist/` est régénéré automatiquement et exclu de Git.

## 2. Mettre les sources sur GitHub (une seule fois)

Sur [github.com/new](https://github.com/new), créer un **nouveau dépôt vide** par exemple `histoires-dans-ma-tete-podcast` (privé ou public). Ne pas sélectionner « Add a README », « .gitignore » ou licence, car le projet contient déjà ses fichiers.

Ouvrir un terminal dans le dossier du projet et exécuter :

```bash
git init
git branch -M main
git add .
git commit -m "Initialisation du site du podcast"
git remote add origin https://github.com/VOTRE_PSEUDO/histoires-dans-ma-tete-podcast.git
git push -u origin main
```

Remplacer **`VOTRE_PSEUDO`** par votre identifiant GitHub et adapter le nom du dépôt si besoin. GitHub pourra vous demander de vous authentifier avec son navigateur, Git Credential Manager, GitHub Desktop ou une clé SSH (les mots de passe GitHub ne s'utilisent pas en HTTPS Git).

Si Git demande votre identité lors du premier commit :

```bash
git config --global user.name "Votre nom"
git config --global user.email "votre-adresse@example.com"
```

Le dossier `.github/workflows/verification.yml` effectue automatiquement une vérification sur chaque push et pull request. **Il ne déploie pas le site** : Cloudflare Pages s'en charge directement via l'intégration GitHub. Aucun secret ou jeton Cloudflare n'est à placer dans GitHub.

## 3. Connecter GitHub à Cloudflare Pages (une seule fois)

Sur https://dash.cloudflare.com/ :

1. Aller dans **Workers & Pages** → **Créer** → **Pages** (les libellés peuvent légèrement changer).
2. Choisir **Importer un dépôt Git / Connect to Git**, puis autoriser l'application GitHub de Cloudflare à accéder au dépôt.
3. Sélectionner le dépôt `histoires-dans-ma-tete-podcast`.
4. Renseigner les paramètres suivants :

| Paramètre Cloudflare Pages | Valeur |
| --- | --- |
| Branche de production | `main` |
| Framework | `None` / `Aucun` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (racine du dépôt) |
| Variable d'environnement facultative | `NODE_VERSION` = `22` |

5. Cliquer sur **Save and Deploy / Enregistrer et déployer**. Cloudflare utilisera `npm run build` et publiera les fichiers de `dist/` à une adresse `https://NOM-DU-PROJET.pages.dev`.
6. Pour votre propre domaine, ouvrir le projet Pages → **Custom domains / Domaines personnalisés** et suivre l'assistant de configuration DNS.

**Si un projet Cloudflare Pages a déjà été créé en « Direct Upload »** : Cloudflare ne permet pas de le convertir directement en projet connecté à Git. Créer un **nouveau projet Pages avec intégration GitHub**, puis y associer le domaine voulu (en déconnectant ce domaine de l'ancien projet si nécessaire). Un projet déjà connecté à Git peut être conservé et reconfiguré.

### Déploiements après la première installation

Pour chaque modification :

```bash
npm run check
git add .
git commit -m "Mise à jour du site"
git push
```

**Push sur `main` → construction et déploiement automatique par Cloudflare Pages.** Pour essayer des changements sans modifier la production, travailler sur une autre branche et ouvrir une pull request : Cloudflare peut fournir une URL de prévisualisation.

Vous pouvez suivre l'état des déploiements sur **Cloudflare → Workers & Pages → votre projet → Deployments**, ainsi que l'état des vérifications dans l'onglet **Actions** de GitHub.

## 4. Où modifier le contenu ?

```text
histoires-podcast-github-cloudflare/
├── site/                           ← tous les fichiers publics du site
│   ├── index.html                  ← accueil, textes, histoires, plateformes
│   ├── config.js                   ← URL des podcasts (à modifier en priorité)
│   ├── confidentialite.html
│   ├── 404.html
│   ├── _headers                    ← sécurité HTTP sur Cloudflare Pages
│   ├── robots.txt
│   └── assets/
│       ├── style.css               ← couleurs, typographies, mise en page
│       ├── main.js                 ← menu, filtres, plateformes
│       ├── cameleon.svg
│       └── favicon.svg
├── scripts/
│   ├── server.mjs                  ← serveur local, actualisation auto
│   ├── check.mjs                   ← contrôles de cohérence
│   └── build.mjs                   ← copie site/ vers dist/
├── .github/workflows/
│   └── verification.yml            ← tests GitHub, pas de double déploiement
├── package.json                    ← commandes npm
├── package-lock.json
├── .nvmrc                          ← Node.js 22
├── .gitignore
└── README.md
```

### Ajouter les liens de vos podcasts

Ouvrir **`site/config.js`**, puis remplacer les champs vides par les **liens directs réels** de votre émission :

```js
window.PODCAST_CONFIG = {
  platforms: {
    spotify: "https://open.spotify.com/show/VOTRE_IDENTIFIANT",
    apple: "https://podcasts.apple.com/fr/podcast/...",
    deezer: "https://www.deezer.com/fr/show/...",
    amazon: "https://music.amazon.fr/podcasts/..."
  }
};
```

**Les URL ci-dessus sont des exemples : n'ajoutez pas d'URL fictives sur votre site public.** Tant que l'URL d'une plateforme reste vide (`""`), elle affiche « À venir ». Lorsque vous ajoutez un lien valide, le bouton correspondant devient cliquable. Ensuite, exécuter `git add .`, `git commit` et `git push` : Cloudflare republiera la modification.

### Mettre à jour les histoires ou la charte graphique

- Histoires, titres, descriptions, liens du blog : `site/index.html` (section `id="histoires"`).
- Couleurs et typographies : début de `site/assets/style.css` (variables CSS).
- Les illustrations et le portrait sont actuellement servis par le WordPress **https://histoires2dansmatete.fr/**. Il est préférable, à terme, de copier vos propres images dans `site/assets/images/` pour être indépendant du blog existant.
- Les durées indiquées dans les cartes sont des **durées de lecture**, et non des durées d'épisodes audio vérifiées.

## 5. Points à vérifier avant de partager l'adresse au public

- Compléter les mentions légales et vérifier le contenu de `site/confidentialite.html`.
- Vérifier les droits d'utilisation et l'affichage des images WordPress depuis le domaine Cloudflare.
- Ajouter les URL des plateformes seulement après publication réelle de vos podcasts.
- Vérifier votre nom de domaine et les informations pour le référencement.
- Si nécessaire, personnaliser davantage les couleurs et les typographies pour se rapprocher du blog d'origine.

## Aide en cas de problème

- **« npm: command not found »** : installer Node.js, puis rouvrir le terminal.
- **Le port 5173 est déjà occupé** : arrêter l'autre serveur ou lancer `PORT=5174 npm run dev` (macOS/Linux). Sous PowerShell : `$env:PORT=5174; npm run dev`.
- **La page locale n'a pas changé** : sauvegarder le fichier, puis rafraîchir le navigateur. Le rechargement automatique dépend de la surveillance des fichiers sur votre ordinateur.
- **Cloudflare indique « build failed »** : vérifier que les paramètres sont `npm run build` / `dist` et lire le journal de déploiement. Exécuter la même commande sur votre ordinateur pour reproduire l'erreur.
- **GitHub refuse le push** : vérifier que le dépôt distant existe et que l'authentification GitHub est configurée.

Documentation officielle : [Git Integration Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/git-integration/) · [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).
