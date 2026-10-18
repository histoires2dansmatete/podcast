/** Statistiques facultatives : consentement uniquement sur la page Confidentialité. */
(() => {
  'use strict';

  const consentKey = 'dmt_analytics_optin_v1'; // Conserve les choix des versions précédentes.
  const isAdmin = /^\/(?:admin|api)(?:\/|$)/.test(location.pathname);
  const isLocal = /^(?:localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (isAdmin) return;

  const readChoice = () => {
    try { return localStorage.getItem(consentKey); } catch { return null; }
  };
  const saveChoice = value => {
    try { localStorage.setItem(consentKey, value); } catch { /* stockage refusé */ }
  };
  let allowed = readChoice() === 'yes';
  let sessionId;

  const getSession = () => {
    if (sessionId) return sessionId;
    try {
      sessionId = sessionStorage.getItem('dmt_session_v1');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('dmt_session_v1', sessionId);
      }
    } catch { sessionId = crypto.randomUUID(); }
    return sessionId;
  };
  const deviceType = () => /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const browserType = () => {
    const ua = navigator.userAgent || '';
    return /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'other';
  };
  const originOfReferrer = () => {
    try { return new URL(document.referrer).origin; } catch { return ''; }
  };
  function track(event = 'pageview') {
    if (!allowed || isLocal) return; // L'administration et le développement local ne produisent aucune statistique.
    const payload = {
      consent: true,
      session: getSession(),
      page: location.pathname === '/' ? '/' : location.pathname,
      event,
      referrer: originOfReferrer(),
      device: deviceType(),
      browser: browserType()
    };
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'omit'
    }).catch(() => {});
  }

  const status = document.getElementById('analytics-consent-status');
  const allowButton = document.getElementById('analytics-allow');
  const denyButton = document.getElementById('analytics-deny');
  function updateStatus() {
    if (!status) return;
    const choice = readChoice();
    status.textContent = choice === 'yes' ? 'Statistiques activées. Vous pouvez retirer votre accord à tout moment.'
      : choice === 'no' ? 'Statistiques refusées. Aucune mesure d’audience n’est envoyée.'
      : 'Aucun choix enregistré. Les statistiques sont désactivées par défaut.';
    allowButton?.setAttribute('aria-pressed', String(choice === 'yes'));
    denyButton?.setAttribute('aria-pressed', String(choice === 'no'));
  }
  function choose(value) {
    allowed = value === 'yes';
    saveChoice(value);
    updateStatus();
    if (allowed) track();
  }
  // Aucun bandeau ni boîte de dialogue ailleurs : ce choix ne se fait que dans Confidentialité.
  window.DMT_ANALYTICS = {
    track,
    withdraw: () => choose('no'),
    accept: () => choose('yes'),
    status: readChoice
  };
  allowButton?.addEventListener('click', () => choose('yes'));
  denyButton?.addEventListener('click', () => choose('no'));
  updateStatus();
  if (allowed) track();

  document.addEventListener('click', event => {
    if (!allowed) return;
    const link = event.target.closest?.('a');
    if (link && (link.matches('[data-platform]') || /spotify\.com|podcasts\.apple\.com|deezer\.com|music\.amazon\./i.test(link.href))) track('platform_click');
  });
  const readingEnd = document.querySelector('.reading-end');
  if (readingEnd && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        track('story_end');
      }
    }, { threshold: 0.7 });
    observer.observe(readingEnd);
  }
  window.addEventListener('play', event => {
    if (event.target instanceof HTMLAudioElement) track('audio_play');
  }, true);
})();
