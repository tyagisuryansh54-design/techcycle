/* Module 6 — Partner console: technicians / recyclers move requests through their workflow. */
window.TC = window.TC || {};
TC.modules = TC.modules || {};

TC.modules.partner = (function () {
  const { data, engine, store, ui } = TC;
  const filters = { group: 'open', type: 'all' };
  const GROUPS = {
    open: { label: 'Open', test: (r) => r.status !== engine.CANCELLED && !engine.isFinal(r) },
    done: { label: 'Completed', test: (r) => engine.isFinal(r) },
    cancelled: { label: 'Cancelled', test: (r) => r.status === engine.CANCELLED },
    all: { label: 'All', test: () => true }
  };

  function init() {
    ui.$('#ptGroups').innerHTML = Object.entries(GROUPS).map(([k, g]) =>
      `<button type="button" class="chip" data-group="${k}" aria-pressed="${k === filters.group}">${g.label} <span class="chip-n" data-n="${k}">0</span></button>`).join('');
    ui.$('#ptGroups').addEventListener('click', (e) => {
      const b = e.target.closest('[data-group]');
      if (b) { filters.group = b.dataset.group; render(); }
    });
    ui.$('#ptType').addEventListener('change', (e) => { filters.type = e.target.value; render(); });
    ui.$('#ptList').addEventListener('click', onClick);
    ui.$('#ptList').addEventListener('submit', onAdvance);
    ui.$('#ptDemo').addEventListener('click', () => {
      const n = TC.seedDemo();
      ui.toast(`Loaded ${n} demo requests (marked “demo”).`, 'info');
    });
    window.addEventListener('tc:change', () => {
      if (!ui.$('#view-partner').hidden) render();
    });
  }

  function render() {
    const all = store.requests().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    Object.keys(GROUPS).forEach((k) => {
      const n = ui.$(`#ptGroups [data-n="${k}"]`);
      if (n) n.textContent = all.filter(GROUPS[k].test).length;
    });
    ui.$$('#ptGroups [data-group]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.group === filters.group)));

    const list = all.filter(GROUPS[filters.group].test).filter((r) => filters.type === 'all' || r.type === filters.type);
    ui.$('#ptList').innerHTML = list.length ? list.map(card).join('')
      : `<div class="empty-state">${ui.icon('shield')}<p>No ${GROUPS[filters.group].label.toLowerCase()} requests. Create one from “Book &amp; track”, or load demo data.</p></div>`;
  }

  function card(r, i) {
    const dev = data.DEVICES[r.device];
    const issue = r.issueId ? dev.issues.find((x) => x.id === r.issueId) : null;
    const partner = data.CENTRES.find((c) => c.id === r.partnerId);
    const next = engine.nextStatus(r);
    const needsCost = r.type === 'repair' && next === 'Completed';
    const flow = engine.FLOWS[r.type];
    const idx = flow.indexOf(r.status);
    return `<article class="pt-card" style="--i:${i}" data-id="${r.id}">
      <header>
        <code>${r.id}</code>${r.demo ? '<span class="badge badge-demo">demo</span>' : ''}
        <span class="type-tag type-${r.type}">${r.type === 'repair' ? 'Repair' : 'Recycle'}</span>
        ${ui.statusPill(r.status)}
      </header>
      <p class="pt-main">${ui.icon(dev.icon)} <b>${ui.esc(dev.label)}</b> · ${ui.esc(data.TIERS[r.tier])}${issue ? ` · ${ui.esc(issue.label)}` : ''}</p>
      <p class="pt-sub">${ui.icon('user')} ${ui.esc(r.name)} · ${ui.icon(r.mode === 'pickup' ? 'truck' : 'store')} ${r.mode === 'pickup' ? 'Pickup' : 'Drop-off'} ${ui.fmtDate(r.date)}${r.pincode ? ` · PIN ${ui.esc(r.pincode)}` : ''}</p>
      <p class="pt-sub">${ui.icon('pin')} ${ui.esc(partner ? partner.name : r.partnerId)}${r.estimate ? ` · Est. ${ui.inr(r.estimate.min)}–${ui.inr(r.estimate.max)}` : ''}${r.finalCost != null ? ` · Final ${ui.inr(r.finalCost)}` : ''}</p>
      ${r.status !== engine.CANCELLED ? `<div class="pt-progress" aria-hidden="true">${flow.map((s, k) => `<i class="${k <= idx ? 'on' : ''}" title="${ui.esc(s)}"></i>`).join('')}</div>` : ''}
      ${next ? `<form class="pt-advance" data-advance="${r.id}" novalidate>
          ${needsCost ? `<div class="field"><label for="cost-${r.id}">Final cost (₹)</label><input id="cost-${r.id}" name="cost" class="input input-sm" type="number" min="0" max="500000" inputmode="numeric" value="${r.estimate ? Math.round((r.estimate.min + r.estimate.max) / 2) : ''}"></div>` : ''}
          <div class="field"><label for="note-${r.id}">Note (optional)</label><input id="note-${r.id}" name="note" class="input input-sm" maxlength="120" placeholder="${ui.esc(next === 'Diagnosed' ? 'e.g. Display connector damaged' : 'Add a note')}"></div>
          <button type="submit" class="btn btn-primary btn-sm">${ui.icon('arrow')} Mark “${ui.esc(next)}”</button>
        </form>` : ''}
      <div class="pt-links">
        <a href="#/book?track=${r.id}">${ui.icon('search')} View tracking</a>
        ${r.status === engine.FLOWS[r.type][0] ? `<button type="button" class="link-danger" data-decline="${r.id}">${ui.icon('x')} Decline</button>` : ''}
        ${r.status === 'Recycled' ? `<button type="button" class="link" data-cert="${r.id}">${ui.icon('doc')} Certificate</button>` : ''}
      </div>
    </article>`;
  }

  function onAdvance(e) {
    const form = e.target.closest('[data-advance]');
    if (!form) return;
    e.preventDefault();
    const req = store.getRequest(form.dataset.advance);
    if (!req) return;
    const costInput = form.querySelector('[name="cost"]');
    try {
      const updated = engine.advance(req, {
        note: form.querySelector('[name="note"]').value,
        finalCost: costInput ? costInput.value : undefined
      });
      store.saveRequest(updated);
      ui.toast(`${updated.id} → ${updated.status}`);
      if (engine.isFinal(updated)) {
        const r = form.getBoundingClientRect();
        ui.leafBurst(r.left + r.width / 2, r.top, 16);
      }
    } catch (err) {
      if (costInput) ui.setError(costInput, err.message);
      else ui.toast(err.message, 'error');
    }
  }

  function onClick(e) {
    const d = e.target.closest('[data-decline]');
    if (d) {
      const req = store.getRequest(d.dataset.decline);
      if (req && window.confirm(`Decline and cancel ${req.id}?`)) {
        const c = engine.cancel(req);
        c.history[c.history.length - 1].note = 'Declined by partner';
        store.saveRequest(c);
        ui.toast(`${req.id} declined.`, 'warn');
      }
    }
    const cert = e.target.closest('[data-cert]');
    if (cert) TC.modules.book.showCertificate(store.getRequest(cert.dataset.cert));
  }

  function onShow() {
    render();
  }

  return { init, onShow };
})();
