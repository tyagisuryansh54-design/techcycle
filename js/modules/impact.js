/* Module 5 — Impact dashboard. Only completed requests count towards impact. */
window.TC = window.TC || {};
TC.modules = TC.modules || {};

TC.modules.impact = (function () {
  const { data, engine, store, ui } = TC;

  function init() {
    ui.$('#impDemo').addEventListener('click', () => {
      const n = TC.seedDemo();
      ui.toast(`Loaded ${n} demo requests (marked “demo”).`, 'info');
    });
    ui.$('#impClearDemo').addEventListener('click', () => {
      store.removeDemo();
      ui.toast('Demo data removed.', 'warn');
    });
    ui.$('#impReset').addEventListener('click', () => {
      if (window.confirm('Delete ALL requests, checks and listings saved in this browser?')) {
        store.clearAll();
        ui.toast('All local data cleared.', 'warn');
      }
    });
    window.addEventListener('tc:change', () => {
      if (!ui.$('#view-impact').hidden) render();
    });
  }

  function kpi(label, value, opts, iconName, cls = '') {
    return `<article class="kpi ${cls}">
      <span class="kpi-ic">${ui.icon(iconName)}</span>
      <b data-kpi='${JSON.stringify({ value, ...opts })}'>0</b>
      <span>${label}</span>
    </article>`;
  }

  function render() {
    const requests = store.requests();
    const s = engine.computeImpact(requests, store.diagnoses());
    const hasDemo = requests.some((r) => r.demo);
    ui.$('#impDemoNote').hidden = !hasDemo;

    ui.$('#impKpis').innerHTML = [
      kpi('Device checks run', s.checks, {}, 'search'),
      kpi('Repairs completed', s.repairs, {}, 'wrench'),
      kpi('Devices recycled', s.recycled, {}, 'cycle'),
      kpi('E-waste diverted', s.kg, { decimals: 2, suffix: ' kg' }, 'box', 'good'),
      kpi('CO₂e avoided (est.)', s.co2, { decimals: 1, suffix: ' kg' }, 'leaf', 'good'),
      kpi('Money saved (est.)', s.saved, { prefix: '₹' }, 'tag', 'good')
    ].join('');
    ui.$$('#impKpis [data-kpi]').forEach((el) => {
      const o = JSON.parse(el.dataset.kpi);
      ui.countUp(el, o.value, { decimals: o.decimals || 0, prefix: o.prefix || '', suffix: o.suffix || '', duration: 1300 });
    });

    renderBars(s);
    renderDonut(s);
    renderPipeline(s);
    ui.$('#impEmpty').hidden = requests.length > 0 || s.checks > 0;
  }

  function renderBars(s) {
    const rows = Object.entries(data.DEVICES).map(([k, d]) => ({ k, label: d.label, ...s.byDevice[k] }));
    const max = Math.max(1, ...rows.map((r) => r.repair + r.recycle));
    ui.$('#impBars').innerHTML = rows.map((r, i) => `
      <div class="hbar" style="--i:${i}">
        <span class="hbar-label">${ui.icon(data.DEVICES[r.k].icon)} ${ui.esc(r.label)}</span>
        <div class="hbar-track">
          <i class="seg-repair" style="--w:${(r.repair / max) * 100}%" title="${r.repair} repaired"></i><i class="seg-recycle" style="--w:${(r.recycle / max) * 100}%" title="${r.recycle} recycled"></i>
        </div>
        <span class="hbar-val">${r.repair + r.recycle}</span>
      </div>`).join('');
    requestAnimationFrame(() => ui.$$('#impBars .hbar-track i').forEach((i) => i.classList.add('go')));
  }

  function renderDonut(s) {
    const parts = [
      { label: 'Repaired', value: s.repairs, cls: 'd-repair' },
      { label: 'Recycled', value: s.recycled, cls: 'd-recycle' },
      { label: 'In progress', value: s.open, cls: 'd-open' },
      { label: 'Cancelled', value: s.cancelled, cls: 'd-cancel' }
    ];
    const total = parts.reduce((a, p) => a + p.value, 0);
    const C = 2 * Math.PI * 52;
    let offset = 0;
    const arcs = total ? parts.filter((p) => p.value).map((p) => {
      const len = (p.value / total) * C;
      const gap = parts.filter((x) => x.value).length > 1 ? 2 : 0;
      const arc = `<circle class="donut-arc ${p.cls}" cx="70" cy="70" r="52" style="--len:${Math.max(0, len - gap)};--off:${-offset};--C:${C}"></circle>`;
      offset += len;
      return arc;
    }).join('') : '';
    ui.$('#impDonut').innerHTML = `
      <svg viewBox="0 0 140 140" class="donut" role="img" aria-label="Request outcomes: ${parts.map((p) => `${p.label} ${p.value}`).join(', ')}">
        <circle class="donut-track" cx="70" cy="70" r="52"></circle>${arcs}
        <text x="70" y="68" class="donut-num">${total}</text><text x="70" y="86" class="donut-lbl">requests</text>
      </svg>
      <ul class="legend">${parts.map((p) => `<li><span class="sw ${p.cls}"></span>${p.label}<b>${p.value}</b></li>`).join('')}</ul>`;
    requestAnimationFrame(() => ui.$$('#impDonut .donut-arc').forEach((a) => a.classList.add('go')));
  }

  function renderPipeline(s) {
    const order = ['Submitted', 'Accepted', 'Diagnosed', 'Collected', 'In repair', 'At recycler', 'Completed', 'Recycled', 'Cancelled'];
    ui.$('#impPipeline').innerHTML = order.map((st) => `<li>${ui.statusPill(st)}<b>${s.byStatus[st] || 0}</b></li>`).join('');
  }

  function onShow() {
    render();
  }

  return { init, onShow };
})();
