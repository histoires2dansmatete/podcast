/** Contrôle de l'absence d'envoi de statistiques sans accord. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const js=await readFile('site/assets/analytics.js','utf8');
const page=await readFile('site/confidentialite.html','utf8');
assert.match(js,/if \(!allowed \|\| isLocal\) return/);
assert.match(js,/readChoice\(\) === 'yes'/);
assert.match(page,/id="analytics-deny"/);
assert.match(page,/id="analytics-allow"/);
console.log('✓ Confidentialité : suivi désactivé sans consentement, choix disponible et réversible.');
