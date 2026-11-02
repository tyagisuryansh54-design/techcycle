/* TechCycle — persistence layer.
 * Prototype storage is the browser's localStorage (data never leaves the device).
 * Falls back to in-memory storage if localStorage is blocked (private mode, file restrictions).
 * In Milestone 3 this module is the single place to swap in REST API calls. */
window.TC = window.TC || {};

TC.createStore = function (prefix, { silent = false } = {}) {
  const memory = {};
  let useMemory = false;
  try {
    const probe = `${prefix}__probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch (e) {
    useMemory = true;
  }

  function read(key, fallback) {
    try {
      const raw = useMemory ? memory[key] : localStorage.getItem(prefix + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    const raw = JSON.stringify(value);
    if (!useMemory) {
      try {
        localStorage.setItem(prefix + key, raw);
      } catch (e) {
        useMemory = true;
      }
    }
    if (useMemory) memory[key] = raw;
    if (!silent) window.dispatchEvent(new CustomEvent('tc:change', { detail: { key } }));
  }

  function remove(key) {
    delete memory[key];
    try { localStorage.removeItem(prefix + key); } catch (e) { /* ignore */ }
  }

  const requests = () => read('requests', []);
  const diagnoses = () => read('diagnoses', []);
  const userListings = () => read('listings', []);
  const reserved = () => read('reserved', []);

  return {
    isPersistent: () => !useMemory,
    read,
    write,

    requests,
    getRequest(id) {
      const key = String(id ?? '').trim().toUpperCase();
      return requests().find((r) => r.id === key) || null;
    },
    saveRequest(req) {
      const all = requests();
      const i = all.findIndex((r) => r.id === req.id);
      if (i >= 0) all[i] = req;
      else all.unshift(req);
      write('requests', all);
      return req;
    },

    diagnoses,
    addDiagnosis(d) {
      write('diagnoses', [d, ...diagnoses()].slice(0, 200));
    },

    userListings,
    addListing(listing) {
      write('listings', [listing, ...userListings()]);
      return listing;
    },
    reserved,
    toggleReserved(id) {
      const set = new Set(reserved());
      if (set.has(id)) set.delete(id);
      else set.add(id);
      write('reserved', [...set]);
      return set.has(id);
    },

    removeDemo() {
      write('requests', requests().filter((r) => !r.demo));
      write('diagnoses', diagnoses().filter((d) => !d.demo));
    },
    clearAll() {
      ['requests', 'diagnoses', 'listings', 'reserved'].forEach(remove);
      if (!silent) window.dispatchEvent(new CustomEvent('tc:change', { detail: { key: '*' } }));
    }
  };
};

TC.store = TC.createStore('techcycle.v1.');
