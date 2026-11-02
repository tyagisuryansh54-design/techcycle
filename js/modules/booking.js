/* Module 3 — Booking (repair / recycling) and request tracking. */
window.TC = window.TC || {};
TC.modules = TC.modules || {};

TC.modules.book = (function () {
  const { data, engine, store, ui } = TC;
  const state = { type: 'repair', mode: 'pickup' };
  const PARTNER_TYPES_FOR = { repair: ['repair', 'refurb'], recycle: ['recycler', 'collection'] };

  /* ---------- New request ---------- */

  function init() {
    ui.$('#bkDevice').innerHTML = Object.entries(data.DEVICES).map(([k, d]) => `<option value="${k}">${d.label}</option>`).join('');
    ui.$('#bkTier').innerHTML = Object.entries(data.TIERS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('');
    ui.$('#bkTier').value = 'mid';
    ui.$('#bkSlot').innerHTML = Object.entries(data.SLOTS).map(([k, s]) => `<option value="${k}">${s}</option>`).join('');
    resetDate();

    ui.$('#bkType').addEventListener('click', (e) => {
      const b = e.target.closest('[data-type]');
      if (b) { state.type = b.dataset.type; refresh(); }
    });
    ui.$('#bkMode').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (b) { state.mode = b.dataset.mode; refresh(); }
    });
    ui.$('#bkDevice').addEventListener('change', () => { fillIssues(); refresh(); });
    ['#bkTier', '#bkIssue', '#bkPartner'].forEach((s) => ui.$(s).addEventListener('change', refresh));
    ui.$('#bkForm').addEventListener('submit', onSubmit);
    ui.$$('#bkForm input, #bkForm textarea, #bkForm select').forEach((el) => {
      el.addEventListener('blur', () => { if (el.getAttribute('aria-invalid') === 'true') validateField(el); });
    });
    ui.$('#bkWipeAll').addEventListener('change', (e) => {
      ui.$$('#bkWipe .wipe-item').forEach((c) => { c.checked = e.target.checked; });
    });

    ui.$('#tabNew').addEventListener('click', () => switchTab('new'));
    ui.$('#tabTrack').addEventListener('click', () => switchTab('track'));
    ui.$('#bkDone').addEventListener('click', onDoneClick);

    ui.$('#trkForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = ui.$('#trkId').value.trim().toUpperCase();
      if (!id) { ui.setError(ui.$('#trkId'), 'Enter a request ID such as TC-2611-AB12.'); return; }
      showTracking(id, true);
    });
    ui.$('#trkMine').addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]');
      if (b) showTracking(b.dataset.open, true);
    });
    ui.$('#trkResult').addEventListener('click', onTrackClick);

    fillIssues();
    refresh();
    window.addEventListener('tc:change', (e) => {
      if (!['requests', '*'].includes(e.detail.key)) return;
      renderMine();
      const open = ui.$('#trkResult').dataset.id;
      if (open) showTracking(open, false);
    });
  }

  function resetDate() {
    const today = new Date();
    const d = ui.$('#bkDate');
    d.min = engine.toDateInput(today);
    d.max = engine.toDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30));
    d.value = engine.toDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  }

  function fillIssues() {
    const dev = data.DEVICES[ui.$('#bkDevice').value];
    const prev = ui.$('#bkIssue').value;
    ui.$('#bkIssue').innerHTML = dev.issues.map((i) => `<option value="${i.id}">${ui.esc(i.label)}</option>`).join('');
    if (dev.issues.some((i) => i.id === prev)) ui.$('#bkIssue').value = prev;
  }

  function partnersFor(type, device, mode) {
    return data.CENTRES
      .filter((c) => PARTNER_TYPES_FOR[type].includes(c.type) && c.devices.includes(device) && (mode !== 'pickup' || c.pickup))
      .map((c) => ({ ...c, km: engine.haversineKm(data.REFERENCE_POINT, c) }))
      .sort((a, b) => a.km - b.km);
  }

  function refresh() {
    ui.$$('#bkType [data-type]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.type === state.type)));
    ui.$$('#bkMode [data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === state.mode)));
    const isRepair = state.type === 'repair';
    ui.$('#bkIssueField').hidden = !isRepair;
    ui.$('#bkWipe').hidden = isRepair;
    ui.$('#bkAddrFields').hidden = state.mode !== 'pickup';
    ui.$('#bkSubmit').innerHTML = `${ui.icon(isRepair ? 'wrench' : 'cycle')} ${isRepair ? 'Book repair' : 'Book recycling'}`;

    const sel = ui.$('#bkPartner');
    const prev = sel.value;
    const list = partnersFor(state.type, ui.$('#bkDevice').value, state.mode);
    sel.innerHTML = list.length
      ? list.map((c) => `<option value="${c.id}">${ui.esc(c.name)} · ${ui.esc(c.area)} (${ui.num(c.km, 1)} km)</option>`).join('')
      : '<option value="">No partner offers this combination — try drop-off or another device</option>';
    if (list.some((c) => c.id === prev)) sel.value = prev;
    renderSummary();
  }

  function renderSummary() {
    const device = ui.$('#bkDevice').value;
    const tier = ui.$('#bkTier').value;
    const dev = data.DEVICES[device];
    const partner = data.CENTRES.find((c) => c.id === ui.$('#bkPartner').value);
    let estimate = '';
    if (state.type === 'repair') {
      const issue = dev.issues.find((i) => i.id === ui.$('#bkIssue').value);
      const est = engine.estimateCost(issue, dev.tiers[tier]);
      estimate = `<div class="sum-est"><span>Estimated cost</span><b>${ui.inr(est.min)} – ${ui.inr(est.max)}</b><small>Indicative only. The partner confirms the final quote after diagnosis.</small></div>`;
    } else {
      estimate = `<div class="sum-est good"><span>Kept out of landfill</span><b>~${ui.num(dev.weightKg * 1000)} g</b><small>Free for individuals in this prototype. You receive a disposal certificate once recycled.</small></div>`;
    }
    const steps = engine.FLOWS[state.type];
    ui.$('#bkSummary').innerHTML = `
      <div class="sum-device">${ui.icon(dev.icon)}<div><b>${ui.esc(dev.label)}</b><span>${state.type === 'repair' ? 'Repair' : 'Recycling'} · ${state.mode === 'pickup' ? 'Doorstep pickup' : 'Drop-off'}</span></div></div>
      ${estimate}
      ${partner ? `<p class="sum-partner">${ui.icon('pin')} ${ui.esc(partner.name)}<br><small>${ui.esc(partner.area)} · ${ui.esc(partner.hours)}</small></p>` : ''}
      <h4>What happens next</h4>
      <ol class="mini-steps">${steps.map((s) => `<li>${ui.esc(s)}</li>`).join('')}</ol>`;
  }

  function validateField(el) {
    const v = el.value;
    let msg = '';
    switch (el.id) {
      case 'bkName': msg = engine.validate.name(v); break;
      case 'bkPhone': msg = engine.validate.phone(v); break;
      case 'bkAddress': msg = engine.validate.address(v); break;
      case 'bkPin': msg = engine.validate.pincode(v); break;
      case 'bkDate': msg = engine.validate.date(v); break;
      case 'bkPartner': msg = v ? '' : 'Choose a partner (try switching to drop-off).'; break;
      default: msg = '';
    }
    return ui.setError(el, msg);
  }

  function onSubmit(e) {
    e.preventDefault();
    const fields = ['#bkPartner', '#bkDate', '#bkName', '#bkPhone'];
    if (state.mode === 'pickup') fields.push('#bkAddress', '#bkPin');
    let ok = true;
    let firstBad = null;
    fields.forEach((s) => {
      const el = ui.$(s);
      if (!validateField(el)) { ok = false; firstBad = firstBad || el; }
    });
    if (state.type === 'recycle') {
      const c = ui.$('#bkWipeConfirm');
      const good = c.checked;
      ui.setError(c, good ? '' : 'Please confirm you have backed up and wiped your data.');
      if (!good) { ok = false; firstBad = firstBad || c; }
    }
    if (!ok) {
      firstBad.focus();
      ui.toast('Please fix the highlighted fields.', 'error');
      return;
    }

    const req = engine.createRequest({
      type: state.type,
      device: ui.$('#bkDevice').value,
      tier: ui.$('#bkTier').value,
      issueId: ui.$('#bkIssue').value,
      partnerId: ui.$('#bkPartner').value,
      mode: state.mode,
      address: ui.$('#bkAddress').value,
      pincode: ui.$('#bkPin').value,
      date: ui.$('#bkDate').value,
      slot: ui.$('#bkSlot').value,
      name: ui.$('#bkName').value,
      phone: ui.$('#bkPhone').value
    }, store.requests().map((r) => r.id));
    store.saveRequest(req);
    showDone(req);
  }

  function showDone(req) {
    const partner = data.CENTRES.find((c) => c.id === req.partnerId);
    ui.$('#bkGrid').hidden = true;
    const done = ui.$('#bkDone');
    done.hidden = false;
    done.innerHTML = `
      <div class="done-card card">
        <div class="done-check">${ui.icon('check')}</div>
        <h3>${req.type === 'repair' ? 'Repair booked!' : 'Recycling booked!'}</h3>
        <p>Your request ID</p>
        <div class="req-id"><code>${req.id}</code><button type="button" class="icon-btn" data-copy="${req.id}" aria-label="Copy request ID">${ui.icon('copy')}</button></div>
        <p class="muted">${ui.esc(partner ? partner.name : '')} · ${ui.fmtDate(req.date)} · ${ui.esc(data.SLOTS[req.slot])}</p>
        <p class="fine">Prototype: the request is saved in this browser. Open the Partner console to move it through each stage.</p>
        <div class="cta-row center">
          <button type="button" class="btn btn-primary" data-track="${req.id}">${ui.icon('search')} Track this request</button>
          <button type="button" class="btn btn-ghost" data-again>${ui.icon('plus')} New request</button>
        </div>
      </div>`;
    const r = ui.$('.done-check', done).getBoundingClientRect();
    ui.leafBurst(r.left + r.width / 2, r.top + r.height / 2, 22);
    ui.toast(`Request ${req.id} created.`);
    done.scrollIntoView({ behavior: ui.reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }

  function onDoneClick(e) {
    const copy = e.target.closest('[data-copy]');
    if (copy) copyId(copy.dataset.copy);
    const track = e.target.closest('[data-track]');
    if (track) location.hash = `#/book?track=${track.dataset.track}`;
    if (e.target.closest('[data-again]')) resetForm();
  }

  function copyId(id) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id).then(() => ui.toast('Request ID copied.'), () => ui.toast(`Request ID: ${id}`, 'info'));
    } else ui.toast(`Request ID: ${id}`, 'info');
  }

  function resetForm() {
    ui.$('#bkForm').reset();
    ui.$$('#bkForm [aria-invalid="true"]').forEach((el) => ui.setError(el, ''));
    ui.$('#bkTier').value = 'mid';
    resetDate();
    fillIssues();
    ui.$('#bkDone').hidden = true;
    ui.$('#bkGrid').hidden = false;
    refresh();
  }

  /* ---------- Tracking ---------- */

  function switchTab(which) {
    const isNew = which === 'new';
    ui.$('#tabNew').setAttribute('aria-selected', String(isNew));
    ui.$('#tabTrack').setAttribute('aria-selected', String(!isNew));
    ui.$('#panelNew').hidden = !isNew;
    ui.$('#panelTrack').hidden = isNew;
    if (!isNew) renderMine();
  }

  function renderMine() {
    const all = store.requests().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    ui.$('#trkMine').innerHTML = all.length ? all.map((r) => {
      const d = data.DEVICES[r.device];
      return `<li><button type="button" data-open="${r.id}">
        <code>${r.id}</code>
        <span>${ui.esc(d.label)} · ${r.type === 'repair' ? 'Repair' : 'Recycling'} ${r.demo ? '<span class="badge badge-demo">demo</span>' : ''}</span>
        ${ui.statusPill(r.status)}</button></li>`;
    }).join('') : '<li class="muted">No requests yet in this browser.</li>';
  }

  function showTracking(id, scroll) {
    const req = store.getRequest(id);
    const out = ui.$('#trkResult');
    if (!req) {
      out.dataset.id = '';
      out.innerHTML = `<div class="empty-state">${ui.icon('search')}<p>No request found with ID <code>${ui.esc(id)}</code> in this browser.</p></div>`;
      return;
    }
    ui.setError(ui.$('#trkId'), '');
    ui.$('#trkId').value = req.id;
    out.dataset.id = req.id;

    const flow = engine.FLOWS[req.type];
    const cancelled = req.status === engine.CANCELLED;
    const idx = cancelled ? -1 : flow.indexOf(req.status);
    const dev = data.DEVICES[req.device];
    const issue = req.issueId ? dev.issues.find((i) => i.id === req.issueId) : null;
    const partner = data.CENTRES.find((c) => c.id === req.partnerId);
    const impact = engine.impactOf(req);

    const steps = flow.map((s, i) => {
      const h = req.history.find((x) => x.status === s);
      let st = 'todo';
      if (cancelled) st = h ? 'done' : 'off';
      else if (i < idx || (i === idx && i === flow.length - 1)) st = 'done';
      else if (i === idx) st = 'current';
      return `<li class="tl-step ${st}" style="--i:${i}">
        <span class="tl-dot">${st === 'done' ? ui.icon('check') : ''}</span>
        <div><b>${ui.esc(s)}</b><small>${h ? ui.fmtDateTime(h.at) : 'Pending'}</small></div>
      </li>`;
    }).join('');
    const progress = cancelled ? 0 : idx / (flow.length - 1);

    out.innerHTML = `
      <article class="card track-card">
        <header class="track-head">
          <div><span class="eyebrow">${req.type === 'repair' ? 'Repair request' : 'Recycling request'}</span>
            <h3><code>${req.id}</code> ${req.demo ? '<span class="badge badge-demo">demo</span>' : ''}</h3></div>
          ${ui.statusPill(req.status)}
        </header>
        ${cancelled ? `<div class="note note-danger">${ui.icon('x')}<p>This request was cancelled.</p></div>` : ''}
        <ol class="timeline" style="--p:${progress}">${steps}</ol>
        <dl class="track-meta">
          <div><dt>Device</dt><dd>${ui.icon(dev.icon)} ${ui.esc(dev.label)} · ${ui.esc(data.TIERS[req.tier])}</dd></div>
          ${issue ? `<div><dt>Issue</dt><dd>${ui.esc(issue.label)}</dd></div>` : ''}
          <div><dt>Partner</dt><dd>${ui.esc(partner ? partner.name : req.partnerId)}</dd></div>
          <div><dt>${req.mode === 'pickup' ? 'Pickup' : 'Drop-off'}</dt><dd>${ui.fmtDate(req.date)} · ${ui.esc(data.SLOTS[req.slot] || '')}</dd></div>
          ${req.estimate ? `<div><dt>Estimate</dt><dd>${ui.inr(req.estimate.min)} – ${ui.inr(req.estimate.max)}</dd></div>` : ''}
          ${req.finalCost != null ? `<div><dt>Final cost</dt><dd>${ui.inr(req.finalCost)}</dd></div>` : ''}
        </dl>
        ${impact ? `<div class="impact-strip">${ui.icon('leaf')}<p>${impact.kind === 'repair'
          ? `This repair kept ~${ui.num(impact.kg * 1000)} g of electronics in use, avoided ~${ui.num(impact.co2, 1)} kg CO₂e and saved ~${ui.inr(impact.saved)}.`
          : `~${ui.num(impact.kg * 1000)} g of e-waste went to formal recycling instead of landfill.`}</p></div>` : ''}
        <details class="history-log"><summary>Activity log (${req.history.length})</summary>
          <ul>${req.history.slice().reverse().map((h) => `<li><b>${ui.esc(h.status)}</b> · ${ui.fmtDateTime(h.at)}${h.note ? ` — ${ui.esc(h.note)}` : ''}</li>`).join('')}</ul>
        </details>
        <div class="cta-row">
          ${req.status === engine.FLOWS[req.type][0] ? `<button type="button" class="btn btn-danger btn-sm" data-cancel="${req.id}">${ui.icon('x')} Cancel request</button>` : ''}
          ${req.status === 'Recycled' ? `<button type="button" class="btn btn-primary btn-sm" data-cert="${req.id}">${ui.icon('doc')} View disposal certificate</button>` : ''}
          ${!cancelled && !engine.isFinal(req) ? `<a class="btn btn-ghost btn-sm" href="#/partner">${ui.icon('shield')} Update in partner console</a>` : ''}
          <button type="button" class="btn btn-ghost btn-sm" data-copy="${req.id}">${ui.icon('copy')} Copy ID</button>
        </div>
      </article>`;
    requestAnimationFrame(() => {
      const tl = ui.$('.timeline', out);
      if (tl) tl.classList.add('go');
    });
    if (scroll) out.scrollIntoView({ behavior: ui.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function onTrackClick(e) {
    const c = e.target.closest('[data-cancel]');
    if (c) {
      const req = store.getRequest(c.dataset.cancel);
      if (req && window.confirm(`Cancel request ${req.id}?`)) {
        store.saveRequest(engine.cancel(req));
        ui.toast(`Request ${req.id} cancelled.`, 'warn');
      }
    }
    const cert = e.target.closest('[data-cert]');
    if (cert) showCertificate(store.getRequest(cert.dataset.cert));
    const copy = e.target.closest('[data-copy]');
    if (copy) copyId(copy.dataset.copy);
  }

  function showCertificate(req) {
    if (!req) return;
    const dev = data.DEVICES[req.device];
    const partner = data.CENTRES.find((c) => c.id === req.partnerId);
    const done = req.history.find((h) => h.status === 'Recycled');
    const m = ui.modal({
      title: 'Disposal certificate',
      wide: true,
      html: `
        <div class="certificate" id="certificate">
          <div class="cert-seal">${ui.icon('leaf')}</div>
          <p class="cert-kicker">TechCycle · Reboot-Earth</p>
          <h2>Certificate of Responsible E-Waste Disposal</h2>
          <p>This certifies that <b>${ui.esc(req.name)}</b> handed over a <b>${ui.esc(dev.label.toLowerCase())}</b>
            (request <code>${req.id}</code>) for recycling through <b>${ui.esc(partner ? partner.name : '')}</b>,
            completed on <b>${ui.fmtDate(done ? done.at : req.createdAt)}</b>.</p>
          <p class="cert-impact">≈ ${ui.num(dev.weightKg * 1000)} g of electronics diverted to formal recycling</p>
          <p class="cert-foot">Prototype certificate generated for demonstration (Milestone 2). Not a legal document.</p>
        </div>
        <div class="cta-row center no-print"><button type="button" class="btn btn-primary" data-print>${ui.icon('print')} Print / save as PDF</button></div>`
    });
    ui.$('[data-print]', m.el).addEventListener('click', () => {
      document.body.classList.add('print-cert');
      window.print();
      setTimeout(() => document.body.classList.remove('print-cert'), 500);
    });
  }

  /* ---------- Route entry ---------- */

  function onShow(params) {
    if (params.track) {
      switchTab('track');
      showTracking(params.track, false);
      return;
    }
    if (!ui.$('#panelTrack').hidden && !Object.keys(params).length) { renderMine(); return; }
    switchTab('new');
    if (!ui.$('#bkDone').hidden && Object.keys(params).length) resetForm();
    if (params.type && PARTNER_TYPES_FOR[params.type]) state.type = params.type;
    const partner = params.partner ? data.CENTRES.find((c) => c.id === params.partner) : null;
    if (partner) {
      state.type = ['repair', 'refurb'].includes(partner.type) ? 'repair' : 'recycle';
      if (!partner.pickup) state.mode = 'dropoff';
    }
    if (params.device && data.DEVICES[params.device]) ui.$('#bkDevice').value = params.device;
    else if (partner && !partner.devices.includes(ui.$('#bkDevice').value)) ui.$('#bkDevice').value = partner.devices[0];
    if (params.tier && data.TIERS[params.tier]) ui.$('#bkTier').value = params.tier;
    fillIssues();
    if (params.issue) ui.$('#bkIssue').value = params.issue;
    refresh();
    if (partner && partnersFor(state.type, ui.$('#bkDevice').value, state.mode).some((c) => c.id === partner.id)) {
      ui.$('#bkPartner').value = partner.id;
      renderSummary();
    }
  }

  return { init, onShow, showCertificate };
})();
