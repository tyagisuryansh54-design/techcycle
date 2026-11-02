/* Module 4 — Reusable parts & refurbished devices marketplace. */
window.TC = window.TC || {};
TC.modules = TC.modules || {};

TC.modules.market = (function () {
  const { data, engine, store, ui } = TC;
  const filters = { q: '', category: 'all', device: 'all', sort: 'new' };

  function allListings() {
    const reserved = new Set(store.reserved());
    const own = store.userListings().map((l) => ({ ...l, own: true }));
    const sample = data.LISTINGS.map((l, i) => ({ ...l, sample: true, createdAt: new Date(Date.UTC(2026, 9, 20 - i)).toISOString() }));
    return own.concat(sample).map((l) => ({ ...l, reserved: reserved.has(l.id) }));
  }

  function init() {
    const PLURAL = { refurbished: 'Refurbished devices', part: 'Spare parts', accessory: 'Accessories' };
    ui.$('#mkCats').innerHTML = [['all', 'All']].concat(Object.keys(data.LISTING_CATEGORIES).map((k) => [k, PLURAL[k]]))
      .map(([k, label]) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="${k === 'all'}">${label}</button>`).join('');
    ui.$('#mkCats').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (b) { filters.category = b.dataset.cat; render(); }
    });
    ui.$('#mkDevice').innerHTML = '<option value="all">All devices</option>'
      + Object.entries(data.DEVICES).map(([k, d]) => `<option value="${k}">${d.label}</option>`).join('');
    ui.$('#mkDevice').addEventListener('change', (e) => { filters.device = e.target.value; render(); });
    ui.$('#mkSort').addEventListener('change', (e) => { filters.sort = e.target.value; render(); });
    let t;
    ui.$('#mkSearch').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { filters.q = e.target.value.trim().toLowerCase(); render(); }, 120);
    });
    ui.$('#mkAdd').addEventListener('click', openForm);
    ui.$('#mkGrid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-reserve]');
      if (!b) return;
      const on = store.toggleReserved(b.dataset.reserve);
      ui.toast(on ? 'Reserved. The seller would contact you to arrange pickup (prototype).' : 'Reservation cancelled.', on ? 'ok' : 'warn');
    });
    window.addEventListener('tc:change', (e) => {
      if (['listings', 'reserved', '*'].includes(e.detail.key)) render();
    });
  }

  function render() {
    ui.$$('#mkCats [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === filters.category)));
    let list = allListings()
      .filter((l) => filters.category === 'all' || l.category === filters.category)
      .filter((l) => filters.device === 'all' || l.device === filters.device)
      .filter((l) => !filters.q || `${l.title} ${l.seller} ${l.condition}`.toLowerCase().includes(filters.q));
    if (filters.sort === 'low') list.sort((a, b) => a.price - b.price);
    else if (filters.sort === 'high') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    ui.$('#mkCount').textContent = `${list.length} listing${list.length === 1 ? '' : 's'}`;
    ui.$('#mkGrid').innerHTML = list.length ? list.map((l, i) => {
      const dev = data.DEVICES[l.device];
      const co2 = l.category === 'refurbished' ? engine.co2AvoidedKg(dev) : 0;
      return `<article class="mk-card ${l.reserved ? 'is-reserved' : ''}" style="--i:${i}">
        <div class="mk-art cat-${l.category}">${ui.icon(dev.icon)}<span class="mk-cat">${ui.esc(data.LISTING_CATEGORIES[l.category])}</span></div>
        <div class="mk-body">
          <h4>${ui.esc(l.title)}</h4>
          <p class="mk-cond">${ui.esc(l.condition)} · ${ui.esc(l.seller)}
            ${l.sample ? '<span class="badge badge-sample">sample</span>' : ''}${l.own ? '<span class="badge badge-own">your listing</span>' : ''}</p>
          ${l.note ? `<p class="mk-note">${ui.esc(l.note)}</p>` : ''}
          ${co2 ? `<p class="mk-eco">${ui.icon('leaf')} Buying this instead of new avoids ~${ui.num(co2)} kg CO₂e (est.)</p>` : ''}
          <div class="mk-foot">
            <b class="price">${ui.inr(l.price)}</b>
            <button type="button" class="btn btn-sm ${l.reserved ? 'btn-ghost' : 'btn-primary'}" data-reserve="${l.id}" aria-pressed="${l.reserved}">
              ${l.reserved ? `${ui.icon('check')} Reserved` : `${ui.icon('tag')} Reserve`}</button>
          </div>
        </div>
      </article>`;
    }).join('') : `<div class="empty-state">${ui.icon('search')}<p>No listings match. Try clearing the search or filters.</p></div>`;
  }

  function openForm() {
    const m = ui.modal({
      title: 'List a part or device',
      html: `
        <form id="mkForm" class="form" novalidate>
          <div class="field"><label for="mkTitle">Title</label>
            <input id="mkTitle" class="input" maxlength="80" placeholder="e.g. 128 GB SSD (tested)" autocomplete="off"></div>
          <div class="field-row">
            <div class="field"><label for="mkCat">Category</label><select id="mkCat" class="input">
              ${Object.entries(data.LISTING_CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
            <div class="field"><label for="mkDev">Device type</label><select id="mkDev" class="input">
              ${Object.entries(data.DEVICES).map(([k, d]) => `<option value="${k}">${d.label}</option>`).join('')}</select></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="mkCond">Condition</label><select id="mkCond" class="input">
              ${['Like new', 'Grade A', 'Grade B', 'Tested working', 'Good', 'For parts only'].map((c) => `<option>${c}</option>`).join('')}</select></div>
            <div class="field"><label for="mkPrice">Price (₹)</label><input id="mkPrice" class="input" type="number" min="1" max="500000" inputmode="numeric" placeholder="e.g. 799"></div>
          </div>
          <div class="field"><label for="mkSeller">Your name or shop</label><input id="mkSeller" class="input" maxlength="60" autocomplete="name"></div>
          <p class="fine">Only list items you own. Wipe personal data from storage parts before listing.</p>
          <div class="cta-row"><button type="submit" class="btn btn-primary">${ui.icon('plus')} Publish listing</button>
            <button type="button" class="btn btn-ghost" data-close>Cancel</button></div>
        </form>`
    });
    ui.$('#mkForm', m.el).addEventListener('submit', (e) => {
      e.preventDefault();
      const title = ui.$('#mkTitle', m.el);
      const price = ui.$('#mkPrice', m.el);
      const seller = ui.$('#mkSeller', m.el);
      const ok = [
        ui.setError(title, engine.validate.title(title.value)),
        ui.setError(price, engine.validate.price(price.value)),
        ui.setError(seller, seller.value.trim().length >= 2 ? '' : 'Enter a name or shop name (2–60 characters).')
      ].every(Boolean);
      if (!ok) return;
      // Show the new listing at the top: reset filters before the store change triggers a re-render.
      filters.category = 'all';
      filters.device = 'all';
      filters.q = '';
      filters.sort = 'new';
      ui.$('#mkSort').value = 'new';
      ui.$('#mkDevice').value = 'all';
      ui.$('#mkSearch').value = '';
      store.addListing({
        id: `u-${Date.now().toString(36)}`,
        title: title.value.trim(),
        category: ui.$('#mkCat', m.el).value,
        device: ui.$('#mkDev', m.el).value,
        condition: ui.$('#mkCond', m.el).value,
        price: Math.round(Number(price.value)),
        seller: seller.value.trim(),
        note: '',
        createdAt: new Date().toISOString()
      });
      m.close();
      ui.toast('Listing published.');
    });
  }

  function onShow() {
    render();
  }

  return { init, onShow };
})();
