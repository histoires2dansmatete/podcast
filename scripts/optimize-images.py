#!/usr/bin/env python3
"""Create smaller WebP variants of EVERY raster image in site/assets/images/.

Original files are NEVER deleted/overwritten. SVG/GIF (especially animation) are preserved.
The web project automatically prefers images/optimized/<relative-name>.webp when available.
Install once: python -m pip install -r scripts/requirements-images.txt
Use: npm run optimize:images -- --quality 82 --max-size 1600 [--dry-run] [--force]
"""
import argparse
from pathlib import Path
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Pillow n'est pas installé : python -m pip install -r scripts/requirements-images.txt", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
SUPPORTED = {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.bmp'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--quality', type=int, default=82)
    parser.add_argument('--max-size', type=int, default=1600, help='Plus grand côté en pixels')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--force', action='store_true')
    # Mainly for integration testing, no need to pass these for a real project.
    parser.add_argument('--source', type=Path, default=ROOT / 'site/assets/images', help=argparse.SUPPRESS)
    parser.add_argument('--target', type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if not (1 <= args.quality <= 100 and args.max_size >= 200):
        parser.error('quality doit être entre 1 et 100 et max-size >= 200')

    source_root = args.source.resolve()
    output_root = (args.target or source_root / 'optimized').resolve()
    if not source_root.is_dir():
        print('Aucun dossier d’images trouvé :', source_root)
        return 0
    source_files = sorted(p for p in source_root.rglob('*')
                          if p.is_file() and p.suffix.lower() in SUPPORTED
                          and output_root not in p.parents)
    if not source_files:
        print('Aucun JPG, PNG, WebP, AVIF, TIFF ou BMP à optimiser. Les SVG et GIF sont préservés.')
        return 0

    saved = 0
    saved_original = 0
    created = skipped = errors = 0
    for source in source_files:
        rel = source.relative_to(source_root)
        target = output_root / rel.with_suffix('.webp')
        try:
            if not args.force and target.is_file() and target.stat().st_mtime_ns >= source.stat().st_mtime_ns:
                skipped += 1
                continue
            if args.dry_run:
                print('Simulation :', rel, '->', target.relative_to(output_root))
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(source) as original:
                if getattr(original, 'is_animated', False):
                    skipped += 1
                    print('Animation non modifiée :', rel)
                    continue
                img = ImageOps.exif_transpose(original)
                if img.mode not in ('RGB', 'RGBA'):
                    if img.mode in ('P', 'LA') and ('transparency' in img.info or 'A' in img.getbands()):
                        img = img.convert('RGBA')
                    else:
                        img = img.convert('RGB')
                img.thumbnail((args.max_size, args.max_size), Image.Resampling.LANCZOS, reducing_gap=3.0)
                img.save(target, 'WEBP', quality=args.quality, method=6)
            old_size = source.stat().st_size
            new_size = target.stat().st_size
            # Don't switch to a larger variant; fallback to original through the JSON catalogue.
            if new_size >= old_size:
                target.unlink()
                skipped += 1
                print(f'Original déjà plus léger : {rel} ({old_size / 1024:.0f} Ko)')
                continue
            created += 1
            saved_original += old_size
            saved += old_size - new_size
            print(f'✓ {rel}: {old_size / 1024:.0f} Ko → {new_size / 1024:.0f} Ko (−{(old_size-new_size)/old_size:.0%})')
        except Exception as error:
            errors += 1
            print(f'✗ {rel}: {error}', file=sys.stderr)
    print(f'Images WebP créées : {created} ; ignorées ou déjà à jour : {skipped} ; erreurs : {errors}.')
    if saved_original:
        print(f'Gain pour ces fichiers : {saved / (1024*1024):.2f} Mo ({saved / saved_original:.1%}).')
    print('Conservez les originaux et ajoutez les fichiers optimized/ à Git avant le push Cloudflare.')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
