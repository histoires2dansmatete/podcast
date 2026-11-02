/** Statistiques facultatives : choix global sur les pages publiques, révocable dans Confidentialité. */
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
  let currentChoice = readChoice();
  let allowed = currentChoice === 'yes';
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

  // Un seul bandeau non modal, créé lorsque le visiteur n'a pas encore choisi.
  // La page Confidentialité garde ses boutons de gestion : pas de doublon sur cette page.
  const isPrivacyPage = /\/confidentialite\.html$/.test(location.pathname);
  let banner;
  function updateBanner() {
    if (currentChoice === 'yes' || currentChoice === 'no' || isPrivacyPage) {
      banner?.remove();
      banner = null;
      return;
    }
    if (banner || !document.body) return;
    banner = document.createElement('aside');
    banner.id = 'analytics-choice-banner';
    banner.className = 'analytics-choice-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Choix des statistiques d’audience');
    banner.innerHTML = `
      <div class="analytics-choice-copy">
        <span class="analytics-choice-eyebrow">✦ &nbsp; Votre confidentialité</span>
        <h2>Souhaitez-vous autoriser les statistiques ?</h2>
        <p>Des mesures d’audience limitées nous aident à améliorer les histoires. Elles restent désactivées sans votre accord. <a href="/confidentialite.html">En savoir plus</a></p>
      </div>
      <div class="analytics-choice-actions">
        <button type="button" class="analytics-choice-action" data-analytics-choice="no">Refuser</button>
        <button type="button" class="analytics-choice-action" data-analytics-choice="yes">Accepter</button>
      </div>`;
    banner.querySelectorAll('[data-analytics-choice]').forEach(button => {
      button.addEventListener('click', () => choose(button.dataset.analyticsChoice));
    });
    document.body.appendChild(banner);
  }

  const status = document.getElementById('analytics-consent-status');
  const allowButton = document.getElementById('analytics-allow');
  const denyButton = document.getElementById('analytics-deny');
  function updateStatus() {
    if (!status) return;
    const choice = currentChoice;
    status.textContent = choice === 'yes' ? 'Statistiques activées. Vous pouvez retirer votre accord à tout moment.'
      : choice === 'no' ? 'Statistiques refusées. Aucune mesure d’audience n’est envoyée.'
      : 'Aucun choix enregistré. Les statistiques sont désactivées par défaut.';
    allowButton?.setAttribute('aria-pressed', String(choice === 'yes'));
    denyButton?.setAttribute('aria-pressed', String(choice === 'no'));
  }
  function choose(value) {
    if (value !== 'yes' && value !== 'no') return;
    currentChoice = value;
    allowed = value === 'yes';
    saveChoice(value);
    updateStatus();
    updateBanner();
    if (allowed) track();
  }
  window.DMT_ANALYTICS = {
    track,
    withdraw: () => choose('no'),
    accept: () => choose('yes'),
    status: () => currentChoice
  };
  allowButton?.addEventListener('click', () => choose('yes'));
  denyButton?.addEventListener('click', () => choose('no'));
  updateStatus();
  updateBanner();
  // Un choix changé dans un autre onglet doit être respecté immédiatement.
  window.addEventListener('storage', event => {
    if (event.key !== consentKey && event.key !== null) return;
    const previous = currentChoice;
    currentChoice = readChoice();
    allowed = currentChoice === 'yes';
    updateStatus();
    updateBanner();
    if (allowed && previous !== 'yes') track();
  });
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
