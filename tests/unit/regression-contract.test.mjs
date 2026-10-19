import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRegressionContent as norm} from '../../scripts/regression-contract.mjs';

const path = 'site/index.html';
const html = '<html><head><title>Titre A</title><!-- SEO-START --><meta name="description" content="Une histoire"><!-- SEO-END --></head><body><main><img class="cover-image" alt="Couverture" src="assets/logo.webp"><a href="histoires.html">Histoires</a><img src="assets/icons/instagram.svg" alt="Instagram"></main></body></html>';

test('Une illustration personnalisée/optimisée ne modifie pas la référence de mise en page',()=>{
  const personalized=html.replace('assets/logo.webp','assets/images/optimized/Minipeton_roller.webp');
  assert.equal(norm(path,html),norm(path,personalized));
});

test('Le contenu SEO généré ne fausse pas les empreintes de mise en page',()=>{
  const seo=html.replace('Titre A','Titre B').replace('Une histoire','Autre description');
  assert.equal(norm(path,html),norm(path,seo));
});

test('Les modifications de structure, classes, liens et texte sont détectées',()=>{
  for(const variant of [html.replace('cover-image','cover-picture'),html.replace('histoires.html','ecouter.html'),html.replace('>Histoires<','>Découvrir<'),html.replace('<main>','<main class="changed">')]){
    assert.notEqual(norm(path,html),norm(path,variant));
  }
});

test('Les icônes sociales et les chemins non autorisés ne sont pas neutralisés',()=>{
  assert.notEqual(norm(path,html),norm(path,html.replace('assets/icons/instagram.svg','assets/icons/facebook.svg')));
  assert.notEqual(norm(path,html),norm(path,html.replace('assets/logo.webp','https://example.com/external.png')));
  assert.notEqual(norm(path,html),norm(path,html.replace('assets/logo.webp','assets/images/../../private.png')));
});

test('Le CSS est comparé strictement et les retours chariot normalisés',()=>{
  assert.notEqual(norm('site/assets/style.css','h1{color:red}'),norm('site/assets/style.css','h1{color:blue}'));
  assert.equal(norm(path,html+'\r\n'),norm(path,html+'\n'));
});
