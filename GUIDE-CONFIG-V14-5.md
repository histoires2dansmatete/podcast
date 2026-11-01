# V14.5 — Configuration des plateformes, visibilité et Noël

## Installation depuis le correctif

1. Sauvegardez vos fichiers personnels (`.env.local`, `site/assets/images/`, `site/assets/audio/`, `content/*.json`).
2. Décompressez le correctif à la racine du dépôt **sans remplacer vos fichiers JSON existants** (ils ne sont pas inclus dans le petit ZIP).
3. Depuis la racine :

```bash
npm run site:config:setup
npm test
npm run dev
```

La commande `site:config:setup` est **idempotente** et ne remplace aucun lien, titre, MP3 ou choix existant. Elle reprend aussi les anciens liens de `site/config.js` s'ils n'ont jamais été transférés dans le nouveau JSON. Exécutez-la avant `npm test` et avant `npm run build`.

## 1. Liens généraux du podcast

`content/platforms.config.json` :

```json
{
  "platforms": {
    "spotify": "https://open.spotify.com/show/VOTRE_EMISSION",
    "apple": "",
    "deezer": "",
    "amazon": ""
  }
}
```

La même configuration pilote **l'accueil** et **Où écouter ?**. Une chaîne vide affiche « À venir » ; seule une URL HTTPS valide active un lien, avec ouverture sécurisée. Ces liens concernent **l'émission**, à distinguer des liens individuels de `content/audio.config.json` (ou de l'administration) qui restent inchangés.

Ne modifiez plus `site/config.js` : il est régénéré automatiquement à partir du JSON lors de `npm run dev`, `npm test` ou `npm run build`.

## 2. Histoires visibles ou masquées

`content/visibility.config.json` contient les slugs et un booléen :

```json
{
  "stories": {
    "bas-les-masques": true,
    "petit-ourson-deviendra-grand": false
  }
}
```

- `true` : visible par défaut ; `false` : masquée par défaut.
- Un slug absent du JSON est visible par défaut (utile pour de nouvelles histoires) ; un slug inconnu ou une valeur non booléenne sont refusés.
- Lorsqu'un administrateur change le statut via `/admin/`, **l'enregistrement dans D1 (ou `.local/` en développement) a priorité** sur ce défaut, y compris lorsqu'il réactive une histoire marquée `false` dans le JSON.
- En l'absence d'enregistrement administrateur pour cette histoire, la valeur du JSON s'applique.
- Le catalogue public, le sitemap, le flux RSS et l'accès direct à la fiche respectent le statut effectif. L'accueil synchronise aussi ses couvertures avec la liste publique.

**Attention à la mise à jour :** un choix déjà enregistré dans D1 reste prioritaire. Si vous voulez qu'une nouvelle valeur JSON prenne effet sur une histoire déjà modifiée via l'administration, modifiez-la à nouveau dans `/admin/` ou supprimez **uniquement sa ligne** dans la table `story_states` (intervention avancée, après sauvegarde). Un changement du JSON requiert un `git push` et un nouveau déploiement Cloudflare ; une modification via l'administration s'applique immédiatement.

Cette visibilité est une règle de publication côté serveur, **pas** un mécanisme de confidentialité des fichiers déjà diffusés à des tiers.

## 3. Teaser de Noël dans le carrousel d'accueil

`content/carousel.config.json` conserve votre liste d'histoires et ajoute :

```json
"christmasTeaser": {
  "enabled": true,
  "position": 2,
  "image": "assets/images/noel-teaser.svg",
  "label": "Le calendrier de Noël",
  "color": "#285047"
}
```

- `position` commence à 1 : `2` place le teaser après la première histoire.
- L'illustration SVG de Noël est fournie. Vous pouvez la remplacer par une image locale dans `site/assets/images/`, puis modifier `image`.
- Le teaser apparaît **du 1er novembre au 26 décembre** : avant le 25 novembre il annonce l'ouverture sans lien cliquable vers la page fermée. Du 25 novembre au 26 décembre, le lien vers `/noel/` devient actif. Sur votre ordinateur, `?noel-preview=1` sur l'accueil permet de tester le teaser et d'ouvrir `/noel/?preview=1` hors saison.
- Aucun MP3 ni lien de Noël n'est inventé : le calendrier utilise sa propre configuration.

## 4. Lien vers la plateforme pour chaque case de Noël

Dans `content/noel.config.json`, chaque épisode a deux propriétés indépendantes :

```json
{
  "day": 1,
  "title": "Partie 01",
  "src": "assets/audio/noel/01.mp3",
  "platformUrl": "https://open.spotify.com/episode/VOTRE_EPISODE"
}
```

- `src` : MP3 local ou URL HTTPS du fichier audio, comme auparavant ; peut être vide.
- `platformUrl` : lien HTTPS direct vers cette **partie précise** sur la plateforme ; peut être vide.
- Le lecteur et le lien peuvent s'afficher tous les deux. Lorsqu'un MP3 manque mais qu'un lien externe est renseigné, le lien reste utilisable.
- Le lien n'est révélé dans l'interface **qu'après l'ouverture de la case** (déblocage du 1er au 25 décembre, puis accès jusqu'au 26 décembre).
- L'introduction accepte également `platformUrl`.
- Les URL tierces restent publiques auprès de leur fournisseur et ne sont pas protégées contre un accès direct par les dates du calendrier.

La commande `npm run site:config:setup` ajoute seulement les propriétés `platformUrl` manquantes sans modifier les 25 titres et MP3 existants.

## 5. Vérifications

```bash
npm test
npm run build
npm run dev
```

Test Noël hors saison : `http://localhost:5173/noel/?preview=1` ; test teaser sur l'accueil : `http://localhost:5173/?noel-preview=1`.

Publication : `git add . && git commit -m "V14.5 configuration editoriale" && git push origin master`.

Les secrets administrateur, la base D1 et les médias personnels n'ont pas besoin d'être modifiés. Aucune nouvelle table D1 n'est nécessaire : la table `story_states` existante suffit.
