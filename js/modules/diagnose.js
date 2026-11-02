/* Module 1 — Repair-or-replace advisor. */
window.TC = window.TC || {};
TC.modules = TC.modules || {};

TC.modules.diagnose = (function () {
  const { data, engine, store, ui } = TC;
  const state = { device: 'smartphone', tier: 'mid', age: 2, issue: '' };
  const GAUGE_LEN = 251.33; // length of the semicircle arc (π × 80)

  const VERDICTS = {
    repair: { title: 'Repair it', icon: 'wrench', sub: 'Repairing is the smart and sustainable choice for this device.' },
    consider: { title: 'Worth a repair quote', icon: 'search', sub: 'It is borderline. Get a diagnosis and compare the quote with the estimate below.' },
    recycle: { title: 'Recycle responsibly', icon: 'cycle', sub: 'Repair is not economical here. Sell it for parts to a refurbisher or hand it to an authorised recycler.' },
    diy: { title: 'Try the free fix first', icon: 'bulb', sub: 'This is often fixable at home in a few minutes, with no parts needed.' }
  };

  const fmtAge = (a) => (a === 0 ? 'Under 6 months' : a < 1 ? `${a * 12} months` : `${a} year${a === 1 ? '' : 's'}`);

  function init() {
    const tiles = ui.$('#dxDevices');
    tiles.innerHTML = Object.entries(data.DEVICES).map(([key, d]) => `
      <button type="button" class="tile" role="radio" aria-checked="false" data-device="${key}">
        ${ui.icon(d.icon)}<span>${d.label}</span>
      </button>`).join('');
    tiles.addEventListener('click', (e) => {
      const b = e.target.closest('[data-device]');
      if (b) setDevice(b.dataset.device);
    });

    const tier = ui.$('#dxTier');
    tier.innerHTML = Object.entries(data.TIERS).map(([key, label]) =>
      `<button type="button" role="radio" aria-checked="false" data-tier="${key}">${label}</button>`).join('');
    tier.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tier]');
      if (b) setTier(b.dataset.tier);
    });

    const age = ui.$('#dxAge');
    age.addEventListener('input', () => {
      state.age = Number(age.value);
      ui.$('#dxAgeOut').textContent = fmtAge(state.age);
    });
    ui.$('#dxIssue').addEventListener('change', (e) => { state.issue = e.target.value; });
    ui.$('#dxForm').addEventListener('submit', (e) => {
      e.preventDefault();
      run();
    });
    ui.$('#dxHistory').addEventListener('click', (e) => {
      const li = e.target.closest('[data-replay]');
      if (!li) return;
      const d = store.diagnoses().find((x) => x.id === li.dataset.replay);
      if (!d) return;
      setDevice(d.device);
      setTier(d.tier);
      state.age = d.ageYears;
      ui.$('#dxAge').value = d.ageYears;
      ui.$('#dxAgeOut').textContent = fmtAge(d.ageYears);
      state.issue = d.issueId;
      ui.$('#dxIssue').value = d.issueId;
      run();
    });
    ui.$('#dxHistory').addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-replay]')) {
        e.preventDefault();
        e.target.closest('[data-replay]').click();
      }
    });

    setDevice('smartphone');
    setTier('mid');
    renderHistory();
    window.addEventListener('tc:change', (e) => {
      if (['diagnoses', '*'].includes(e.detail.key)) renderHistory();
    });
  }

  function setDevice(key) {
    state.device = key;
    ui.$$('#dxDevices [data-device]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.device === key)));
    const issues = data.DEVICES[key].issues;
    ui.$('#dxIssue').innerHTML = issues.map((i) => `<option value="${i.id}">${ui.esc(i.label)}</option>`).join('');
    state.issue = issues[0].id;
    updateTierHint();
  }

  function setTier(key) {
    state.tier = key;
    ui.$$('#dxTier [data-tier]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tier === key)));
    updateTierHint();
  }

  function updateTierHint() {
    const price = data.DEVICES[state.device].tiers[state.tier];
    ui.$('#dxTierHint').textContent = `Typical new price in this segment: ${ui.inr(price)} (assumed).`;
  }

  function run() {
    const result = engine.assess({ device: state.device, tier: state.tier, issueId: state.issue, ageYears: state.age });
    store.addDiagnosis({
      id: `D-${Date.now().toString(36)}`, device: result.device, tier: result.tier, issueId: result.issueId,
      ageYears: result.ageYears, score: result.score, verdict: result.verdict, createdAt: new Date().toISOString()
    });

    const panel = ui.$('#dxResult');
    panel.innerHTML = `
      <div class="scanning">
        <div class="scan-device">${ui.icon(data.DEVICES[state.device].icon)}<span class="scan-line"></span></div>
        <p>Analysing ${ui.esc(result.deviceLabel.toLowerCase())}…</p>
      </div>`;
    setTimeout(() => renderResult(result), ui.reduceMotion ? 0 : 750);
    if (window.innerWidth < 900) panel.scrollIntoView({ behavior: ui.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function metric(label, value, cls = '') {
    return `<div class="metric ${cls}"><span>${label}</span><b>${value}</b></div>`;
  }

  function renderResult(r) {
    const v = VERDICTS[r.verdict];
    const keeps = r.verdict !== 'recycle';
    const q = new URLSearchParams({ device: r.device, tier: r.tier, issue: r.issueId });

    const metrics = keeps
      ? metric('Estimated repair', `${ui.inr(r.estimate.min)} – ${ui.inr(r.estimate.max)}`)
        + metric('New device (approx.)', ui.inr(r.newPrice))
        + metric('You could save', `~${ui.inr(r.savings)}`, 'good')
        + metric('CO₂e avoided', `~${ui.num(r.co2AvoidedKg, 1)} kg`, 'good')
        + metric('E-waste avoided', `${ui.num(r.weightKg * 1000)} g`, 'good')
      : metric('Estimated repair', `${ui.inr(r.estimate.min)} – ${ui.inr(r.estimate.max)}`)
        + metric('New device (approx.)', ui.inr(r.newPrice))
        + metric('Repair vs new', `${Math.round(r.ratio * 100)}%`, 'bad')
        + metric('To formal recycling', `${ui.num(r.weightKg * 1000)} g`, 'good');

    const factor = (key, label, weight) => `
      <div class="factor">
        <div class="factor-top"><span>${label} <small>(weight ${Math.round(weight * 100)}%)</small></span><b>${Math.round(r.factors[key] * 100)}</b></div>
        <div class="bar"><i style="--w:${(r.factors[key] * 100).toFixed(1)}%"></i></div>
      </div>`;

    const notes = [
      r.safety ? `<div class="note note-danger">${ui.icon('alert')}<p><b>Safety:</b> ${ui.esc(r.safety)}</p></div>` : '',
      r.tip ? `<div class="note note-info">${ui.icon('bulb')}<p><b>Tip:</b> ${ui.esc(r.tip)}</p></div>` : ''
    ].join('');

    const ctas = keeps
      ? `<a class="btn btn-primary" href="#/book?type=repair&${q}">${ui.icon('wrench')} ${r.verdict === 'diy' ? 'Still broken? Book a repair' : 'Book this repair'}</a>
         <a class="btn btn-ghost" href="#/services?type=repair&device=${r.device}">${ui.icon('pin')} Find a repair shop</a>`
      : `<a class="btn btn-primary" href="#/book?type=recycle&device=${r.device}&tier=${r.tier}">${ui.icon('truck')} Schedule recycling</a>
         <a class="btn btn-ghost" href="#/services?type=refurb&device=${r.device}">${ui.icon('store')} Find a refurbisher</a>`;

    ui.$('#dxResult').innerHTML = `
      <div class="result verdict-${r.verdict}">
        <div class="gauge-wrap">
          <svg class="gauge" viewBox="0 0 200 112" role="img" aria-label="Repairability score ${r.score} out of 100">
            <path class="gauge-track" d="M20 100 A80 80 0 0 1 180 100"/>
            <path class="gauge-val" d="M20 100 A80 80 0 0 1 180 100" style="stroke-dasharray:${GAUGE_LEN};stroke-dashoffset:${GAUGE_LEN}"/>
          </svg>
          <div class="gauge-num"><b data-score>0</b><small>/ 100 repairability</small></div>
        </div>
        <div class="verdict-badge">${ui.icon(v.icon)} ${v.title}</div>
        <p class="verdict-sub">${v.sub}</p>
        <p class="verdict-for">${ui.esc(r.deviceLabel)} · ${ui.esc(data.TIERS[r.tier])} · ${fmtAge(r.ageYears).toLowerCase()} old · ${ui.esc(r.issueLabel.toLowerCase())}</p>
        <div class="metrics">${metrics}</div>
        ${notes}
        <h4 class="why">Why this verdict?</h4>
        <div class="factors">
          ${factor('cost', 'Repair cost vs new', engine.WEIGHTS.cost)}
          ${factor('age', 'Remaining device life', engine.WEIGHTS.age)}
          ${factor('success', 'Fix success rate', engine.WEIGHTS.success)}
        </div>
        <ul class="reasons">${r.reasons.map((x) => `<li>${ui.esc(x)}</li>`).join('')}</ul>
        <div class="cta-row">${ctas}</div>
        <p class="fine">Indicative estimate from prototype assumptions, not a quote. <a href="design.html#engine">How the score works</a>.</p>
      </div>`;

    requestAnimationFrame(() => {
      const val = ui.$('#dxResult .gauge-val');
      if (val) val.style.strokeDashoffset = String(GAUGE_LEN * (1 - r.score / 100));
      ui.$$('#dxResult .bar i').forEach((i) => i.classList.add('go'));
      ui.countUp(ui.$('#dxResult [data-score]'), r.score, { duration: 1100 });
    });
  }

  function renderHistory() {
    const list = store.diagnoses().slice(0, 6);
    const el = ui.$('#dxHistory');
    if (!list.length) {
      el.innerHTML = '<li class="muted">No checks yet. Your recent device checks will appear here.</li>';
      return;
    }
    el.innerHTML = list.map((d) => {
      const dev = data.DEVICES[d.device];
      const issue = dev ? dev.issues.find((i) => i.id === d.issueId) : null;
      return `<li data-replay="${ui.esc(d.id)}" tabindex="0" role="button" aria-label="Re-run check">
        <span class="h-ic">${ui.icon(dev ? dev.icon : 'box')}</span>
        <span class="h-main"><b>${ui.esc(dev ? dev.label : d.device)}</b> · ${ui.esc(issue ? issue.label : '')}
          ${d.demo ? '<span class="badge badge-demo">demo</span>' : ''}</span>
        <span class="pill pill-${d.verdict}">${VERDICTS[d.verdict].title}</span>
        <span class="h-score">${d.score}</span>
        <span class="h-time">${ui.timeAgo(d.createdAt)}</span>
      </li>`;
    }).join('');
  }

  function onShow() {
    renderHistory();
  }

  return { init, onShow, VERDICTS };
})();
