import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../site/assets/analytics.js', import.meta.url), 'utf8');
const consentKey = 'dmt_analytics_optin_v1';

function run({stored = null, path = '/histoires.html', hostname = 'histoires2dansmatete.fr'} = {}) {
  const memory = new Map(stored ? [[consentKey, stored]] : []);
  const requests = [];
  const elements = new Map();
  const appended = [];
  const listeners = new Map();
  function element() {
    const listeners = new Map();
    const attrs = {};
    let cachedButtons;
    return {
      dataset: {}, innerHTML: '', textContent: '', removed: false,
      addEventListener: (type, fn) => listeners.set(type, fn),
      click() { listeners.get('click')?.(); },
      setAttribute(key, value) { attrs[key] = value; },
      getAttribute(key) { return attrs[key]; },
      remove() { this.removed = true; },
      querySelectorAll(selector) {
        if (selector !== '[data-analytics-choice]') return [];
        return cachedButtons ??= ['no', 'yes'].map(choice => {
          const button = element();
          button.dataset.analyticsChoice = choice;
          return button;
        });
      }
    };
  }
  if (path === '/confidentialite.html') {
    for (const id of ['analytics-consent-status', 'analytics-allow', 'analytics-deny']) elements.set(id, element());
  }
  const doc = {
    body: {appendChild(node) { appended.push(node); elements.set(node.id, node); }},
    createElement: () => element(),
    getElementById: id => elements.get(id) || null,
    querySelector: () => null,
    addEventListener: (name, fn) => listeners.set(`document:${name}`, fn),
    referrer: ''
  };
  const windowListeners = new Map();
  const window = {addEventListener: (event, fn) => windowListeners.set(event, fn)};
  vm.runInNewContext(source, {
    window, document: doc, location: {pathname: path, hostname},
    localStorage: {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value)},
    sessionStorage: {getItem: () => null, setItem() {}},
    crypto: {randomUUID: () => 'session-unit-test'},
    navigator: {userAgent: 'Test Browser'},
    URL, HTMLAudioElement: class HTMLAudioElement {},
    fetch: async (url, options) => { requests.push({url, options}); return {ok: true}; }
  }, {filename: 'analytics.js'});
  return {memory, requests, elements, appended, listeners, windowListeners, analytics: window.DMT_ANALYTICS};
}

test('Aucun choix : bandeau visible et aucun événement envoyé', () => {
  const ctx = run();
  assert.equal(ctx.appended.length, 1);
  assert.equal(ctx.appended[0].id, 'analytics-choice-banner');
  assert.match(ctx.appended[0].innerHTML, /Souhaitez-vous autoriser/);
  assert.match(ctx.appended[0].innerHTML, /href="\/confidentialite\.html"/);
  assert.equal(ctx.requests.length, 0);
  assert.equal(ctx.memory.size, 0);
});

test('Refus : conserve la décision, ferme le bandeau et n’envoie rien', () => {
  const ctx = run();
  const [deny] = ctx.appended[0].querySelectorAll('[data-analytics-choice]');
  deny.click();
  assert.equal(ctx.memory.get(consentKey), 'no');
  assert.equal(ctx.appended[0].removed, true);
  assert.equal(ctx.requests.length, 0);
  const revisit = run({stored: 'no'});
  assert.equal(revisit.appended.length, 0);
  assert.equal(revisit.requests.length, 0);
});

test('Acceptation : conserve la décision, ferme le bandeau et démarre le suivi une seule fois', () => {
  const ctx = run();
  const [, allow] = ctx.appended[0].querySelectorAll('[data-analytics-choice]');
  allow.click();
  assert.equal(ctx.memory.get(consentKey), 'yes');
  assert.equal(ctx.appended[0].removed, true);
  assert.equal(ctx.requests.length, 1);
  assert.equal(ctx.requests[0].url, '/api/track');
  assert.equal(JSON.parse(ctx.requests[0].options.body).consent, true);
  const revisit = run({stored: 'yes'});
  assert.equal(revisit.appended.length, 0);
  assert.equal(revisit.requests.length, 1);
});

test('Confidentialité : boutons existants, pas de bandeau doublon, révocation synchronisée', () => {
  const ctx = run({stored: 'yes', path: '/confidentialite.html'});
  assert.equal(ctx.appended.length, 0);
  const deny = ctx.elements.get('analytics-deny');
  deny.click();
  assert.equal(ctx.analytics.status(), 'no');
  assert.equal(ctx.memory.get(consentKey), 'no');
  assert.equal(ctx.requests.length, 1); // vue initiale sous consentement, pas de suivi après refus
  assert.match(ctx.elements.get('analytics-consent-status').textContent, /refusées/);
});

test('Changement dans un autre onglet : le bandeau et le suivi se synchronisent', () => {
  const ctx = run();
  ctx.memory.set(consentKey, 'yes');
  ctx.windowListeners.get('storage')({key: consentKey});
  assert.equal(ctx.appended[0].removed, true);
  assert.equal(ctx.requests.length, 1);
  ctx.memory.delete(consentKey);
  ctx.windowListeners.get('storage')({key: consentKey});
  assert.equal(ctx.appended.length, 2);
  assert.equal(ctx.requests.length, 1);
});

test('Administration exclue et environnement local sans envoi statistique', () => {
  assert.equal(run({path: '/admin/'}).analytics, undefined);
  const ctx = run({hostname: 'localhost'});
  assert.equal(ctx.appended.length, 1);
  ctx.analytics.accept();
  assert.equal(ctx.requests.length, 0);
});
