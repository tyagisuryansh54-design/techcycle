/* TechCycle — domain logic (pure functions, no DOM).
 * 1. Repair-or-replace scoring engine
 * 2. Input validators
 * 3. Request workflow (status state machine)
 * 4. Impact calculator
 * 5. Geo distance */
window.TC = window.TC || {};

TC.engine = (function () {
  const { DEVICES, ASSUMPTIONS } = TC.data;

  const WEIGHTS = { cost: 0.55, age: 0.25, success: 0.2 };
  const THRESHOLDS = { repair: 60, consider: 40 };
  const FLOWS = {
    repair: ['Submitted', 'Accepted', 'Diagnosed', 'In repair', 'Completed'],
    recycle: ['Submitted', 'Accepted', 'Collected', 'At recycler', 'Recycled']
  };
  const CANCELLED = 'Cancelled';

  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const roundTo = (n, step) => Math.round(n / step) * step;
  const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

  /* ---------- 1. Repair-or-replace engine ---------- */

  function estimateCost(issue, newPrice) {
    const step = newPrice >= 20000 ? 100 : 50;
    const min = Math.max(issue.min, roundTo(issue.lo * newPrice, step));
    const max = Math.max(min, roundTo(Math.max(issue.hi * newPrice, issue.min * 1.4), step));
    return { min, max, mid: Math.round((min + max) / 2) };
  }

  function co2AvoidedKg(device) {
    return round(device.embodiedKg * (1 - ASSUMPTIONS.partsShare), 1);
  }

  function reasonsFor(ratio, age, life, success) {
    const pct = Math.round(ratio * 100);
    const out = [];
    if (ratio < 0.2) out.push(`Repair is cheap: about ${pct}% of a new device's price.`);
    else if (ratio < ASSUMPTIONS.rule50) out.push(`Repair costs about ${pct}% of a new device, under the 50% rule of thumb.`);
    else out.push(`Repair would cost about ${pct}% of a new device, above the 50% rule of thumb.`);

    const ageText = age === 0 ? 'under 6 months' : age < 1 ? `${Math.round(age * 12)} months` : `${age} year${age === 1 ? '' : 's'}`;
    if (age / life < 0.5) out.push(`At ${ageText} old it has plenty of useful life left (typical life ~${life} years).`);
    else if (age / life < 1) out.push(`At ${ageText} old it is in the second half of a typical ~${life}-year life.`);
    else out.push(`At ${ageText} old it has passed a typical ~${life}-year life, so parts and updates may be limited.`);

    if (success >= 0.85) out.push('This fault is usually fixed reliably.');
    else if (success >= 0.6) out.push('Repairs for this fault succeed most of the time, but not always.');
    else out.push('This fault is often hard to repair, so get a diagnosis before paying.');
    return out;
  }

  function assess({ device, tier, issueId, ageYears }) {
    const d = DEVICES[device];
    if (!d) throw new Error(`Unknown device: ${device}`);
    const issue = d.issues.find((i) => i.id === issueId);
    if (!issue) throw new Error(`Unknown issue: ${issueId}`);
    const newPrice = d.tiers[tier];
    if (!newPrice) throw new Error(`Unknown tier: ${tier}`);

    const age = Math.max(0, Number(ageYears) || 0);
    const estimate = estimateCost(issue, newPrice);
    const ratio = estimate.mid / newPrice;
    const factors = {
      cost: clamp01(1 - ratio / ASSUMPTIONS.rule50),
      age: clamp01(1 - age / d.lifeYears),
      success: issue.success
    };
    const score = Math.round(
      100 * (WEIGHTS.cost * factors.cost + WEIGHTS.age * factors.age + WEIGHTS.success * factors.success)
    );

    let verdict;
    if (issue.diy) verdict = 'diy';
    else if (score >= THRESHOLDS.repair) verdict = 'repair';
    else if (score >= THRESHOLDS.consider) verdict = 'consider';
    else verdict = 'recycle';
    const keepsDevice = verdict !== 'recycle';

    return {
      device, tier, issueId, ageYears: age,
      deviceLabel: d.label, issueLabel: issue.label,
      newPrice, estimate, ratio, factors, score, verdict,
      savings: keepsDevice ? Math.max(0, newPrice - estimate.mid) : 0,
      co2AvoidedKg: keepsDevice ? co2AvoidedKg(d) : 0,
      weightKg: d.weightKg,
      reasons: reasonsFor(ratio, age, d.lifeYears, issue.success),
      safety: issue.safety || '',
      tip: issue.tip || ''
    };
  }

  /* ---------- 2. Validators (return '' when valid, otherwise a message) ---------- */

  function normalizePhone(v) {
    let s = String(v ?? '').replace(/[\s()-]/g, '');
    if (s.startsWith('+91')) s = s.slice(3);
    else if (s.length === 12 && s.startsWith('91')) s = s.slice(2);
    else if (s.length === 11 && s.startsWith('0')) s = s.slice(1);
    return s;
  }

  function parseLocalDate(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ''));
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.getMonth() === Number(m[2]) - 1 ? d : null;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function toDateInput(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const validate = {
    name: (v) => (/^\p{L}[\p{L}\p{M} .'-]{1,59}$/u.test(String(v ?? '').trim()) ? '' : 'Enter your name (letters only, 2–60 characters).'),
    phone: (v) => (/^[6-9]\d{9}$/.test(normalizePhone(v)) ? '' : 'Enter a valid 10-digit Indian mobile number.'),
    pincode: (v) => (/^[1-9]\d{5}$/.test(String(v ?? '').trim()) ? '' : 'Enter a valid 6-digit PIN code.'),
    address: (v) => (String(v ?? '').trim().length >= 10 ? '' : 'Enter the full pickup address (at least 10 characters).'),
    date(v, now = new Date()) {
      const d = parseLocalDate(v);
      if (!d) return 'Choose a date.';
      const today = startOfDay(now);
      const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
      if (d < today) return 'The date cannot be in the past.';
      if (d > last) return 'Choose a date within the next 30 days.';
      return '';
    },
    price(v) {
      const n = Number(v);
      return String(v ?? '').trim() !== '' && Number.isFinite(n) && n >= 1 && n <= 500000
        ? '' : 'Enter a price between ₹1 and ₹5,00,000.';
    },
    title: (v) => (String(v ?? '').trim().length >= 4 && String(v).trim().length <= 80 ? '' : 'Enter a title of 4–80 characters.')
  };

  /* ---------- 3. Request workflow ---------- */

  const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function makeId(existingIds = [], now = new Date(), rand = Math.random) {
    const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0');
    for (let tries = 0; tries < 100; tries++) {
      let suffix = '';
      for (let i = 0; i < 4; i++) suffix += ID_ALPHABET[Math.floor(rand() * ID_ALPHABET.length)];
      const id = `TC-${yymm}-${suffix}`;
      if (!existingIds.includes(id)) return id;
    }
    throw new Error('Could not generate a unique request ID.');
  }

  function createRequest(input, existingIds = [], now = new Date()) {
    const at = now.toISOString();
    const req = {
      id: makeId(existingIds, now),
      type: input.type,
      device: input.device,
      tier: input.tier,
      partnerId: input.partnerId,
      mode: input.mode,
      date: input.date,
      slot: input.slot,
      name: String(input.name).trim(),
      phone: normalizePhone(input.phone),
      address: input.mode === 'pickup' ? String(input.address).trim() : '',
      pincode: input.mode === 'pickup' ? String(input.pincode).trim() : '',
      status: FLOWS[input.type][0],
      createdAt: at,
      history: [{ status: FLOWS[input.type][0], at, note: 'Request created' }]
    };
    if (input.type === 'repair') {
      const d = DEVICES[input.device];
      const issue = d.issues.find((i) => i.id === input.issueId);
      req.issueId = input.issueId;
      const est = estimateCost(issue, d.tiers[input.tier]);
      req.estimate = { min: est.min, max: est.max };
    }
    if (input.demo) req.demo = true;
    return req;
  }

  const DEFAULT_NOTES = {
    Accepted: 'Partner accepted the request',
    Diagnosed: 'Device inspected and quote confirmed',
    'In repair': 'Repair in progress',
    Completed: 'Repair completed and device returned',
    Collected: 'Device collected for recycling',
    'At recycler': 'Handed to an authorised recycler',
    Recycled: 'Materials recovered; disposal certificate issued'
  };

  function nextStatus(req) {
    if (!req || req.status === CANCELLED) return null;
    const flow = FLOWS[req.type];
    const i = flow ? flow.indexOf(req.status) : -1;
    return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
  }

  function advance(req, { note = '', finalCost, now = new Date() } = {}) {
    const next = nextStatus(req);
    if (!next) throw new Error('This request cannot move any further.');
    const updated = {
      ...req,
      status: next,
      history: [...req.history, { status: next, at: now.toISOString(), note: note.trim() || DEFAULT_NOTES[next] || '' }]
    };
    if (req.type === 'repair' && next === 'Completed') {
      const cost = Number(finalCost);
      if (finalCost === undefined || finalCost === null || String(finalCost).trim() === '' || !Number.isFinite(cost) || cost < 0 || cost > 500000) {
        throw new Error('Enter the final repair cost (₹0 – ₹5,00,000).');
      }
      updated.finalCost = Math.round(cost);
    }
    return updated;
  }

  function cancel(req, now = new Date()) {
    if (req.status !== FLOWS[req.type][0]) throw new Error('Only requests that have not been accepted yet can be cancelled.');
    return {
      ...req,
      status: CANCELLED,
      history: [...req.history, { status: CANCELLED, at: now.toISOString(), note: 'Cancelled by user' }]
    };
  }

  const isFinal = (req) => req.status === FLOWS[req.type][FLOWS[req.type].length - 1];

  /* ---------- 4. Impact calculator ---------- */

  function impactOf(req) {
    const d = DEVICES[req.device];
    if (!d) return null;
    if (req.type === 'repair' && req.status === 'Completed') {
      const newPrice = d.tiers[req.tier] || 0;
      const cost = req.finalCost ?? (req.estimate ? Math.round((req.estimate.min + req.estimate.max) / 2) : 0);
      return { kind: 'repair', kg: d.weightKg, co2: co2AvoidedKg(d), saved: Math.max(0, newPrice - cost) };
    }
    if (req.type === 'recycle' && req.status === 'Recycled') {
      return { kind: 'recycle', kg: d.weightKg, co2: 0, saved: 0 };
    }
    return null;
  }

  function computeImpact(requests = [], diagnoses = []) {
    const out = {
      checks: diagnoses.length, repairs: 0, recycled: 0, open: 0, cancelled: 0,
      kg: 0, co2: 0, saved: 0, byDevice: {}, byStatus: {}
    };
    Object.keys(DEVICES).forEach((k) => { out.byDevice[k] = { repair: 0, recycle: 0 }; });
    requests.forEach((r) => {
      out.byStatus[r.status] = (out.byStatus[r.status] || 0) + 1;
      const imp = impactOf(r);
      if (imp) {
        if (imp.kind === 'repair') out.repairs++;
        else out.recycled++;
        out.kg += imp.kg;
        out.co2 += imp.co2;
        out.saved += imp.saved;
        if (out.byDevice[r.device]) out.byDevice[r.device][imp.kind]++;
      } else if (r.status === CANCELLED) out.cancelled++;
      else out.open++;
    });
    out.kg = round(out.kg, 2);
    out.co2 = round(out.co2, 1);
    return out;
  }

  /* ---------- 5. Geo ---------- */

  function haversineKm(a, b) {
    const R = 6371;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  return {
    WEIGHTS, THRESHOLDS, FLOWS, CANCELLED,
    estimateCost, assess, co2AvoidedKg,
    validate, normalizePhone, parseLocalDate, toDateInput,
    makeId, createRequest, nextStatus, advance, cancel, isFinal,
    impactOf, computeImpact, haversineKm
  };
})();
