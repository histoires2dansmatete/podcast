(() => {
  'use strict';
  const nav = document.getElementById('primary-nav');
  const toggle = document.querySelector('.menu-toggle');
  if (toggle && nav) {
    const closeMenu = () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
      nav.classList.remove('is-open');
    };
    toggle.addEventListener('click', () => {
      const opened = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!opened));
      toggle.setAttribute('aria-label', opened ? 'Ouvrir le menu' : 'Fermer le menu');
      nav.classList.toggle('is-open', !opened);
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
  }

  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('.story-card'));
  const empty = document.getElementById('filter-empty');
  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    let displayed = 0;
    cards.forEach(card => {
      const matched = filter === 'toutes' || (card.dataset.categories || '').split(' ').includes(filter);
      card.hidden = !matched;
      if (matched) displayed++;
    });
    if (empty) empty.hidden = displayed !== 0;
  }));

  // Un lien n'est activé QUE si l'adresse exacte a été ajoutée dans config.js.
  const platforms = window.PODCAST_CONFIG?.platforms || {};
  let available = 0;
  document.querySelectorAll('[data-platform]').forEach(link => {
    const url = platforms[link.dataset.platform];
    if (typeof url !== 'string' || !/^https:\/\/[^\s]+$/i.test(url)) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return;
      link.href = parsed.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.removeAttribute('aria-disabled');
      link.classList.add('is-available');
      const status = link.querySelector('.platform-status');
      if (status) status.textContent = 'Écouter ↗';
      available++;
    } catch (_) { /* URL manquante ou incorrecte : plateforme laissée en attente */ }
  });
  const disclaimer = document.getElementById('platform-disclaimer');
  if (available > 0 && disclaimer) {
    disclaimer.textContent = available === 4
      ? 'Le podcast est disponible ! Choisissez votre application préférée pour l’écouter.'
      : 'Le podcast est disponible sur les plateformes indiquées « Écouter ». Les autres liens seront ajoutés prochainement.';
    const pill = document.querySelector('.listen-pill');
    if (pill) pill.innerHTML = '<span class="pulse-dot"></span> Le podcast est disponible !';
  }

  document.querySelectorAll('img[data-fallback]').forEach(img => {
    img.addEventListener('error', function fallback() {
      this.removeEventListener('error', fallback);
      this.src = this.dataset.fallback;
    }, { once: true });
  });
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
