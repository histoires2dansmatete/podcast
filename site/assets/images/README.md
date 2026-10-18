# Images originales et variantes optimisées

Copiez ici vos illustrations réelles (noms indiqués dans `../images.config.json`).

Optimisez-les en local :

```bash
python -m pip install -r scripts/requirements-images.txt
npm run optimize:images
```

Le script conserve les originaux et produit `optimized/<nom>.webp` en conservant les sous-dossiers. Si le WebP est plus volumineux, il n'est pas conservé. Le générateur préfère automatiquement les variantes optimisées lorsqu'elles existent.

Ajoutez les originaux et `optimized/` à Git avant de déployer sur Cloudflare. Ces images ne figurent pas dans l'archive de travail, car elles n'ont pas été fournies comme dossier au projet accessible ici.
