/** Commande npm portable : découvre Python sur Windows, macOS et Linux. */
import {spawnSync} from 'node:child_process';
const args = ['scripts/optimize-images.py', ...process.argv.slice(2)];
const commands = process.platform === 'win32' ? [['py', '-3'], ['python'], ['python3']] : [['python3'], ['python']];
for (const [cmd, ...prefix] of commands) {
  const result = spawnSync(cmd, [...prefix, ...args], {stdio: 'inherit'});
  if (result.error?.code === 'ENOENT') continue;
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
console.error('Python 3 introuvable. Installez Python 3 et Pillow avant de lancer npm run optimize:images.');
process.exit(2);
