/* TechCycle — app bootstrap: boot animation, hash router, navigation. */
(function () {
  const { ui } = TC;
  const ROUTES = {
    home: 'Home',
    diagnose: 'Check my device',
    services: 'Find services',
    book: 'Book & track',
    market: 'Parts market',
    impact: 'Impact',
    partner: 'Partner console'
  };

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    return {
      route: ROUTES[path] ? path : 'home',
      params: Object.fromEntries(new URLSearchParams(query || ''))
    };
  }

  function render() {
    const { route, params } = parseHash();
    ui.$$('.view').forEach((v) => {
      const on = v.dataset.route === route;
      if (on && v.hidden) {
        v.hidden = false;
        v.classList.remove('view-enter');
        void v.offsetWidth;
        v.classList.add('view-enter');
        window.scrollTo(0, 0);
      } else if (!on) v.hidden = true;
    });
    ui.$$('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === route;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = route === 'home' ? 'TechCycle — E-Waste Repair & Reuse Platform' : `${ROUTES[route]} · TechCycle`;
    setMenu(false);
    const mod = TC.modules[route];
    if (mod && mod.onShow) mod.onShow(params);
    ui.observeReveal(ui.$(`#view-${route}`));
  }

  function setMenu(open) {
    document.body.classList.toggle('nav-open', open);
    const b = ui.$('#menuBtn');
    if (b) {
      b.setAttribute('aria-expanded', String(open));
      b.innerHTML = ui.icon(open ? 'x' : 'menu');
    }
  }

  /* Boot sequence: a short "rebooting" terminal that powers the globe on. Plays once per session. */
  function boot(done) {
    const el = ui.$('#boot');
    let seen = false;
    try { seen = sessionStorage.getItem('techcycle.booted') === '1'; } catch (e) { /* ignore */ }
    if (!el || seen || ui.reduceMotion) {
      if (el) el.remove();
      done();
      return;
    }
    const lines = [
      '> powering on TechCycle (Milestone 2 build)',
      '> loading device catalogue ............ ok',
      '> mapping repair & recycling partners .. ok',
      '> calibrating repair-or-replace engine . ok',
      '> 62 Mt of e-waste in 2022. Let’s reduce that.',
      '> system ready ✓'
    ];
    const log = ui.$('#bootLog');
    const bar = ui.$('.boot-bar i');
    let i = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem('techcycle.booted', '1'); } catch (e) { /* ignore */ }
      el.classList.add('boot-out');
      setTimeout(() => el.remove(), 700);
      done();
    };
    const timer = setInterval(() => {
      if (i < lines.length) {
        log.textContent += (i ? '\n' : '') + lines[i];
        i++;
        bar.style.setProperty('--p', String(i / lines.length));
      } else {
        clearInterval(timer);
        setTimeout(finish, 350);
      }
    }, 260);
    el.addEventListener('click', finish);
    document.addEventListener('keydown', finish, { once: true });
  }

  /* Hero word rotator. */
  function rotateWords() {
    const el = ui.$('#heroWord');
    if (!el) return;
    const words = ['phone', 'laptop', 'earphones', 'charger', 'tablet'];
    let i = 0;
    setInterval(() => {
      if (ui.reduceMotion || document.hidden) return;
      el.classList.add('swap-out');
      setTimeout(() => {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove('swap-out');
        el.classList.add('swap-in');
        setTimeout(() => el.classList.remove('swap-in'), 400);
      }, 260);
    }, 2400);
  }

  function start() {
    ui.hydrateIcons();
    ui.initTheme();
    ui.initMotion();
    Object.values(TC.modules).forEach((m) => m.init && m.init());
    ui.$('#menuBtn').addEventListener('click', () => setMenu(!document.body.classList.contains('nav-open')));
    window.addEventListener('hashchange', render);
    render();
    rotateWords();
    boot(() => document.body.classList.add('powered'));
    if (!TC.store.isPersistent()) ui.toast('Browser storage is blocked, so data will reset when you close this tab.', 'warn');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
