/* Module 2 — Partner locator (map + distance-sorted list). */
window.TC = window.TC || {};
TC.modules = TC.modules || {};

TC.modules.services = (function () {
  const { data, engine, ui } = TC;
  const filters = { type: 'all', device: 'all', pickup: false };
  let origin = { ...data.REFERENCE_POINT };
  let map = null;
  let originMarker = null;
  const markers = {};

  function init() {
    ui.$('#svcTypes').innerHTML = [['all', 'All']].concat(Object.entries(data.PARTNER_TYPES).map(([k, t]) => [k, `${t.label}s`]))
      .map(([k, label]) => `<button type="button" class="chip" data-type="${k}" aria-pressed="${k === 'all'}">
        ${k === 'all' ? '' : `<span class="dot" style="background:${data.PARTNER_TYPES[k].color}"></span>`}${label}</button>`).join('');
    ui.$('#svcTypes').addEventListener('click', (e) => {
      const b = e.target.closest('[data-type]');
      if (!b) return;
      filters.type = b.dataset.type;
      render();
    });

    ui.$('#svcDevice').innerHTML = '<option value="all">All devices</option>'
      + Object.entries(data.DEVICES).map(([k, d]) => `<option value="${k}">${d.label}</option>`).join('');
    ui.$('#svcDevice').addEventListener('change', (e) => { filters.device = e.target.value; render(); });
    ui.$('#svcPickup').addEventListener('change', (e) => { filters.pickup = e.target.checked; render(); });
    ui.$('#svcLocate').addEventListener('click', locate);

    ui.$('#svcList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-focus]');
      if (b) focusPartner(b.dataset.focus);
    });
  }

  function ensureMap() {
    if (map) return;
    const el = ui.$('#svcMap');
    if (!window.L) {
      el.innerHTML = `<div class="map-fallback">${ui.icon('globe')}<p>The map could not load (you may be offline). Distances and the list below still work.</p></div>`;
      return;
    }
    map = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView([origin.lat, origin.lng], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    data.CENTRES.forEach((c) => {
      const color = data.PARTNER_TYPES[c.type].color;
      markers[c.id] = L.circleMarker([c.lat, c.lng], { radius: 9, color: '#0b1a14', weight: 2, fillColor: color, fillOpacity: 0.95 })
        .bindPopup(`<b>${ui.esc(c.name)}</b><br>${ui.esc(data.PARTNER_TYPES[c.type].label)} · ${ui.esc(c.area)}<br><small>Sample listing</small>`);
    });
    originMarker = L.marker([origin.lat, origin.lng], {
      icon: L.divIcon({ className: 'me-marker', html: '<span></span>', iconSize: [18, 18] }),
      keyboard: false
    }).bindTooltip(origin.label).addTo(map);
  }

  function visibleCentres() {
    return data.CENTRES
      .filter((c) => filters.type === 'all' || c.type === filters.type)
      .filter((c) => filters.device === 'all' || c.devices.includes(filters.device))
      .filter((c) => !filters.pickup || c.pickup)
      .map((c) => ({ ...c, km: engine.haversineKm(origin, c) }))
      .sort((a, b) => a.km - b.km);
  }

  function render() {
    ui.$$('#svcTypes [data-type]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === filters.type)));
    ui.$('#svcDevice').value = filters.device;
    ui.$('#svcPickup').checked = filters.pickup;
    ui.$('#svcOrigin').textContent = origin.label;

    const list = visibleCentres();
    ui.$('#svcCount').textContent = `${list.length} partner${list.length === 1 ? '' : 's'} found`;
    ui.$('#svcList').innerHTML = list.length ? list.map((c, i) => {
      const t = data.PARTNER_TYPES[c.type];
      const bookType = ['repair', 'refurb'].includes(c.type) ? 'repair' : 'recycle';
      const devParam = filters.device !== 'all' ? `&device=${filters.device}` : '';
      return `<article class="svc-card" style="--i:${i}">
        <header>
          <span class="type-badge" style="--c:${t.color}">${ui.esc(t.label)}</span>
          <span class="km">${ui.num(c.km, 1)} km</span>
        </header>
        <h4>${ui.esc(c.name)} <span class="badge badge-sample">sample</span></h4>
        <p class="area">${ui.icon('pin')} ${ui.esc(c.area)}</p>
        <ul class="svc-tags">${c.services.map((s) => `<li>${ui.esc(s)}</li>`).join('')}</ul>
        <div class="svc-meta">
          <span>${ui.icon('clock')} ${ui.esc(c.hours)}</span>
          <span>${c.pickup ? `${ui.icon('truck')} Pickup` : `${ui.icon('store')} Drop-off only`}</span>
          <span class="dev-icons" title="Accepts: ${c.devices.map((d) => data.DEVICES[d].label).join(', ')}">${c.devices.map((d) => ui.icon(data.DEVICES[d].icon)).join('')}</span>
        </div>
        <div class="svc-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-focus="${c.id}">${ui.icon('pin')} Show on map</button>
          <a class="btn btn-primary btn-sm" href="#/book?type=${bookType}&partner=${c.id}${devParam}">${ui.icon(bookType === 'repair' ? 'wrench' : 'cycle')} ${bookType === 'repair' ? 'Book repair' : 'Book recycling'}</a>
        </div>
      </article>`;
    }).join('') : `<div class="empty-state">${ui.icon('search')}<p>No partner matches these filters. Try another device or turn off “Pickup available”.</p></div>`;

    if (map) {
      const ids = new Set(list.map((c) => c.id));
      Object.entries(markers).forEach(([id, m]) => {
        if (ids.has(id)) m.addTo(map);
        else m.remove();
      });
      originMarker.setLatLng([origin.lat, origin.lng]).setTooltipContent(origin.label);
      const pts = list.map((c) => [c.lat, c.lng]).concat([[origin.lat, origin.lng]]);
      if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36], maxZoom: 13 });
    }
  }

  function focusPartner(id) {
    const c = data.CENTRES.find((x) => x.id === id);
    if (!c) return;
    if (map) {
      if (ui.reduceMotion) map.setView([c.lat, c.lng], 14);
      else map.flyTo([c.lat, c.lng], 14, { duration: 0.8 });
      markers[id].openPopup();
      if (window.innerWidth < 900) ui.$('#svcMap').scrollIntoView({ behavior: ui.reduceMotion ? 'auto' : 'smooth', block: 'center' });
    } else {
      ui.toast(`${c.name}: ${c.area}`, 'info');
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      ui.toast('Location is not available in this browser.', 'warn');
      return;
    }
    const btn = ui.$('#svcLocate');
    btn.disabled = true;
    btn.classList.add('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        origin = { label: 'Your location', lat: pos.coords.latitude, lng: pos.coords.longitude };
        btn.disabled = false;
        btn.classList.remove('loading');
        ui.toast('Sorted by distance from your location.');
        render();
      },
      () => {
        btn.disabled = false;
        btn.classList.remove('loading');
        ui.toast('Could not get your location, so distances use Bennett University.', 'warn');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  function onShow(params) {
    if (params.type && (params.type === 'all' || data.PARTNER_TYPES[params.type])) filters.type = params.type;
    if (params.device && data.DEVICES[params.device]) filters.device = params.device;
    ensureMap();
    render();
    if (map) setTimeout(() => { map.invalidateSize(); render(); }, 60);
  }

  return { init, onShow };
})();
