/* TechCycle — shared UI helpers: icons, formatting, toasts, modal, animations, theme. */
window.TC = window.TC || {};

TC.ui = (function () {
  // Set before first paint by the inline script in <head>; the header toggle can change it.
  const isReduced = () => document.documentElement.dataset.motion === 'reduced';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const inr = (n) => inrFmt.format(Math.round(n));
  const num = (n, d = 0) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

  function fmtDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  }
  function fmtDate(isoOrInput) {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrInput) ? TC.engine.parseLocalDate(isoOrInput) : new Date(isoOrInput);
    return d ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
  }
  function timeAgo(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
  }

  /* ---------- Icons (inline SVG, stroke-based) ---------- */
  const ICONS = {
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
    laptop: '<rect x="4" y="5" width="16" height="10.5" rx="1.5"/><path d="M2 19h20"/>',
    tablet: '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><path d="M11 18.5h2"/>',
    earphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.5"/>',
    charger: '<path d="M9 2v4M15 2v4"/><rect x="6" y="6" width="12" height="7" rx="2"/><path d="M12 13v3a3 3 0 0 0 3 3h2a3 3 0 0 1 3 3"/>',
    wrench: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L3.5 17.5l3 3 5.7-5.7a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    cycle: '<path d="M20 12a8 8 0 0 1-13.7 5.7"/><path d="M4 12A8 8 0 0 1 17.7 6.3"/><path d="M18 2.5v4h-4"/><path d="M6 21.5v-4h4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    leaf: '<path d="M4 20c1-9 6-15 16-16-.5 10-6.5 15.5-16 16z"/><path d="M4 20c4-5 7-8 11-11"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    chart: '<path d="M3 20h18"/><rect x="5" y="11" width="3" height="7"/><rect x="10.5" y="6" width="3" height="12"/><rect x="16" y="13" width="3" height="5"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    power: '<path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    truck: '<path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
    store: '<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6"/><path d="M9.5 20v-5h5v5"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    locate: '<circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="2"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'
  };

  function icon(name, cls = '') {
    return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
  }

  function hydrateIcons(root = document) {
    $$('i[data-icon]', root).forEach((el) => {
      el.outerHTML = icon(el.dataset.icon, el.className);
    });
  }

  /* ---------- Toasts ---------- */
  function toast(message, kind = 'ok') {
    const host = $('#toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    const ic = { ok: 'check', warn: 'alert', error: 'x', info: 'bulb' }[kind] || 'check';
    el.innerHTML = `${icon(ic)}<span>${esc(message)}</span>`;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 600);
    }, 3200);
  }

  /* ---------- Modal ---------- */
  function modal({ title, html, wide = false, onClose } = {}) {
    const root = $('#modalRoot');
    const lastFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <header class="modal-head"><h3 id="modalTitle">${esc(title)}</h3>
          <button class="icon-btn" data-close aria-label="Close dialog">${icon('x')}</button></header>
        <div class="modal-body">${html}</div>
      </div>`;
    root.appendChild(wrap);
    document.body.classList.add('modal-open');

    const close = () => {
      wrap.classList.add('closing');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => {
        wrap.remove();
        document.body.classList.remove('modal-open');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        if (onClose) onClose();
      }, isReduced() ? 0 : 180);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = $$('button, [href], input, select, textarea', wrap).filter((n) => !n.disabled && n.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) close();
    });
    const first = $('input, select, textarea, button:not([data-close])', wrap) || $('[data-close]', wrap);
    setTimeout(() => first && first.focus(), 30);
    return { el: wrap, close };
  }

  /* ---------- Animations ---------- */
  function countUp(el, to, { decimals = 0, duration = 1200, prefix = '', suffix = '', format } = {}) {
    const fmt = format || ((v) => prefix + num(v, decimals) + suffix);
    if (isReduced()) { el.textContent = fmt(to); return; }
    const from = 0;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function frame(t) {
      const p = Math.min(1, (t - t0) / duration);
      el.textContent = fmt(from + (to - from) * ease(p));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  let revealObserver = null;
  function observeReveal(root = document) {
    const items = $$('.reveal:not(.in), [data-count]:not([data-counted])', root);
    if (!('IntersectionObserver' in window) || isReduced()) {
      items.forEach(activate);
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            activate(en.target);
            revealObserver.unobserve(en.target);
          }
        });
      }, { threshold: 0.15 });
    }
    items.forEach((el) => revealObserver.observe(el));
  }
  function activate(el) {
    if (el.classList.contains('reveal')) el.classList.add('in');
    if (el.hasAttribute('data-count') && !el.hasAttribute('data-counted')) {
      el.setAttribute('data-counted', '');
      countUp(el, parseFloat(el.dataset.count), {
        decimals: Number(el.dataset.decimals || 0),
        prefix: el.dataset.prefix || '',
        suffix: el.dataset.suffix || '',
        duration: 1600
      });
    }
  }

  // Burst of leaves from a point — used to celebrate a completed booking.
  function leafBurst(x, y, count = 18) {
    if (isReduced()) return;
    const colors = ['#3ee08f', '#22b8cf', '#a3e635', '#ffb547'];
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'leaf-bit';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = 70 + Math.random() * 110;
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      s.style.setProperty('--dy', `${Math.sin(angle) * dist - 40}px`);
      s.style.setProperty('--rot', `${Math.random() * 540 - 270}deg`);
      s.style.background = colors[i % colors.length];
      document.body.appendChild(s);
      s.addEventListener('animationend', () => s.remove(), { once: true });
    }
  }

  /* ---------- Theme ---------- */
  const THEME_KEY = 'techcycle.v1.theme';
  function currentTheme() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }
  function applyThemeIcon() {
    const btn = $('#themeBtn');
    if (btn) {
      btn.innerHTML = icon(currentTheme() === 'dark' ? 'sun' : 'moon');
      btn.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }
  function initTheme() {
    applyThemeIcon();
    const btn = $('#themeBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem(THEME_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
        applyThemeIcon();
        window.dispatchEvent(new CustomEvent('tc:theme', { detail: next }));
      });
    }
  }

  /* ---------- Motion toggle ---------- */
  const MOTION_KEY = 'techcycle.v1.motion';
  function applyMotionButton() {
    const btn = $('#motionBtn');
    if (!btn) return;
    const on = !isReduced();
    btn.innerHTML = icon('sparkle');
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Turn animations off' : 'Turn animations on');
    btn.title = on ? 'Animations: on' : 'Animations: off';
  }
  function initMotion() {
    applyMotionButton();
    const btn = $('#motionBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = isReduced() ? 'full' : 'reduced';
      document.documentElement.dataset.motion = next;
      try { localStorage.setItem(MOTION_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
      applyMotionButton();
      // Content waiting to be revealed must not stay hidden when motion is switched off.
      if (next === 'reduced') $$('.reveal:not(.in), [data-count]:not([data-counted])').forEach(activate);
      toast(next === 'full' ? 'Animations on.' : 'Animations off.', 'info');
    });
  }

  /* ---------- Form helpers ---------- */
  function setError(input, message) {
    const field = input.closest('.field') || input.parentElement;
    let err = field.querySelector('.err');
    if (!err) {
      err = document.createElement('small');
      err.className = 'err';
      err.id = `${input.id}-err`;
      field.appendChild(err);
    }
    err.textContent = message || '';
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) input.setAttribute('aria-describedby', err.id);
    else input.removeAttribute('aria-describedby');
    field.classList.toggle('has-error', !!message);
    if (message) {
      field.classList.remove('shake');
      void field.offsetWidth;
      field.classList.add('shake');
    }
    return !message;
  }

  const STATUS_CLASS = {
    Submitted: 'st-sub', Accepted: 'st-acc', Diagnosed: 'st-mid', Collected: 'st-mid',
    'In repair': 'st-work', 'At recycler': 'st-work', Completed: 'st-done', Recycled: 'st-done', Cancelled: 'st-cancel'
  };
  const statusPill = (status) => `<span class="status ${STATUS_CLASS[status] || ''}">${esc(status)}</span>`;

  return {
    get reduceMotion() { return isReduced(); },
    $, $$, esc, inr, num, fmtDateTime, fmtDate, timeAgo,
    icon, hydrateIcons, toast, modal, countUp, observeReveal, leafBurst, initTheme, initMotion, setError, statusPill
  };
})();
