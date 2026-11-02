/* TechCycle — design-docs page: live engine tables, worked example, test runner, contents highlighting. */
(function () {
  const { data, engine, ui } = TC;
  const VERDICT_LABELS = { repair: 'Repair it', consider: 'Worth a repair quote', recycle: 'Recycle responsibly', diy: 'Try the free fix first' };

  function renderWorkedExample() {
    const input = { device: 'smartphone', tier: 'mid', issueId: 'screen', ageYears: 2 };
    const r = engine.assess(input);
    const d = data.DEVICES[input.device];
    const W = engine.WEIGHTS;
    ui.$('#workedExample').innerHTML = `
      <p><b>Input:</b> mid-range smartphone (new ≈ ${ui.inr(r.newPrice)}), 2 years old, cracked screen.</p>
      <p class="calc">Estimated repair = ${ui.inr(r.estimate.min)} – ${ui.inr(r.estimate.max)} → midpoint ${ui.inr(r.estimate.mid)} (${(r.ratio * 100).toFixed(1)}% of new)</p>
      <p class="calc">C = 1 − ${r.ratio.toFixed(3)} ÷ 0.5 = ${r.factors.cost.toFixed(3)}</p>
      <p class="calc">A = 1 − 2 ÷ ${d.lifeYears} = ${r.factors.age.toFixed(3)}</p>
      <p class="calc">S = ${r.factors.success.toFixed(2)}</p>
      <p class="calc">score = 100 × (${W.cost} × ${r.factors.cost.toFixed(3)} + ${W.age} × ${r.factors.age.toFixed(3)} + ${W.success} × ${r.factors.success.toFixed(2)}) = <b>${r.score}</b></p>
      <p><b>Verdict:</b> <span class="pill pill-${r.verdict}">${VERDICT_LABELS[r.verdict]}</span>. Estimated saving ≈ ${ui.inr(r.savings)}, CO₂e avoided ≈ ${ui.num(r.co2AvoidedKg, 1)} kg.</p>`;
  }

  function renderDeviceTable() {
    const rows = Object.values(data.DEVICES).map((d) => `<tr>
      <td><b>${ui.esc(d.label)}</b></td>
      <td>${ui.inr(d.tiers.budget)} / ${ui.inr(d.tiers.mid)} / ${ui.inr(d.tiers.premium)}</td>
      <td>${d.lifeYears} yrs</td><td>${ui.num(d.weightKg * 1000)} g</td><td>${d.embodiedKg} kg</td><td>${d.issues.length}</td></tr>`).join('');
    const details = Object.values(data.DEVICES).map((d) => `
      <details class="device-details"><summary>${ui.esc(d.label)}: fault table</summary>
        <table class="doc-table"><thead><tr><th>Fault</th><th>Cost share of new</th><th>Min. charge</th><th>Fix success</th><th>Notes</th></tr></thead><tbody>
        ${d.issues.map((i) => `<tr><td>${ui.esc(i.label)}</td><td>${Math.round(i.lo * 100)}–${Math.round(i.hi * 100)}%</td><td>${ui.inr(i.min)}</td><td>${Math.round(i.success * 100)}%</td>
          <td>${[i.diy ? 'free fix first' : '', i.safety ? 'safety warning' : '', i.tip ? 'tip' : ''].filter(Boolean).join(', ') || '—'}</td></tr>`).join('')}
        </tbody></table></details>`).join('');
    ui.$('#deviceTable').innerHTML = `
      <table class="doc-table"><thead><tr><th>Device</th><th>New price (budget / mid / premium)</th><th>Typical life</th><th>Weight</th><th>Footprint (CO₂e)</th><th>Faults</th></tr></thead>
      <tbody>${rows}</tbody></table>${details}`;
  }

  function runTests() {
    const results = TC.runTests();
    const passed = results.filter((r) => r.pass).length;
    const sum = ui.$('#testSummary');
    sum.textContent = `${passed} / ${results.length} tests passed · ${new Date().toLocaleTimeString('en-IN')}`;
    sum.className = `test-summary ${passed === results.length ? 'pass' : 'fail'}`;
    ui.$('#testResults').innerHTML = results.map((r, i) => `
      <li class="${r.pass ? 'ok' : 'bad'}" style="--i:${i}">
        <span class="res">${ui.icon(r.pass ? 'check' : 'x')}</span>
        <div><b>${ui.esc(r.name)}</b>${r.detail ? `<small>${ui.esc(r.detail)}</small>` : ''}</div>
      </li>`).join('');
  }

  // Highlight the contents entry of the last section whose top has scrolled past 35% of the viewport.
  function scrollSpy() {
    const links = ui.$$('.toc a');
    const sections = ui.$$('.doc section[id]');
    let ticking = false;
    const update = () => {
      ticking = false;
      let current = sections[0];
      sections.forEach((s) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.35) current = s; });
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${current.id}`));
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('load', update); // after the browser jumps to a #section anchor
    update();
  }

  function start() {
    ui.hydrateIcons();
    ui.initTheme();
    ui.initMotion();
    ui.observeReveal();
    renderWorkedExample();
    renderDeviceTable();
    runTests();
    scrollSpy();
    ui.$('#runTests').addEventListener('click', runTests);
    ui.$('#printBtn').addEventListener('click', () => window.print());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
