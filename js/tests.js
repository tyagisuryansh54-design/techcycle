/* TechCycle — automated test suite. Runs live in the browser (Design docs → Testing).
 * Uses a separate storage namespace so it never touches the user's real data. */
window.TC = window.TC || {};

TC.runTests = function () {
  const { data, engine } = TC;
  const results = [];
  const test = (name, fn) => {
    try {
      const detail = fn();
      results.push({ name, pass: true, detail: detail || '' });
    } catch (e) {
      results.push({ name, pass: false, detail: e.message });
    }
  };
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const eq = (a, b, msg) => assert(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

  // Every device × tier × issue × age combination, for property checks.
  const combos = [];
  Object.entries(data.DEVICES).forEach(([device, d]) => Object.keys(d.tiers).forEach((tier) => d.issues.forEach((issue) => {
    for (let age = 0; age <= 10; age += 0.5) combos.push({ device, tier, issueId: issue.id, ageYears: age });
  })));

  /* Decision engine */
  test('Engine: mid-range phone, cracked screen, 2 years → "Repair it"', () => {
    const r = engine.assess({ device: 'smartphone', tier: 'mid', issueId: 'screen', ageYears: 2 });
    eq(r.verdict, 'repair', 'verdict');
    return `score ${r.score}, estimate ₹${r.estimate.min}–₹${r.estimate.max}`;
  });
  test('Engine: budget phone, motherboard fault, 4 years → "Recycle"', () => {
    const r = engine.assess({ device: 'smartphone', tier: 'budget', issueId: 'board', ageYears: 4 });
    eq(r.verdict, 'recycle', 'verdict');
    return `score ${r.score}`;
  });
  test('Engine: budget charger with frayed cable → "Recycle" (safety)', () => {
    const r = engine.assess({ device: 'charger', tier: 'budget', issueId: 'frayed', ageYears: 1 });
    eq(r.verdict, 'recycle', 'verdict');
    assert(r.safety.length > 0, 'safety warning expected');
    return `score ${r.score}`;
  });
  test('Engine: software slowness → "Try the free fix first"', () => {
    eq(engine.assess({ device: 'smartphone', tier: 'mid', issueId: 'slow', ageYears: 3 }).verdict, 'diy', 'verdict');
  });
  test('Engine: older device scores lower for the same fault', () => {
    const young = engine.assess({ device: 'laptop', tier: 'mid', issueId: 'battery', ageYears: 1 }).score;
    const old = engine.assess({ device: 'laptop', tier: 'mid', issueId: 'battery', ageYears: 7 }).score;
    assert(young > old, `expected ${young} > ${old}`);
    return `1 yr: ${young}, 7 yr: ${old}`;
  });
  test(`Property: score is always 0–100 (${combos.length} combinations)`, () => {
    combos.forEach((c) => {
      const s = engine.assess(c).score;
      assert(s >= 0 && s <= 100, `score ${s} out of range for ${JSON.stringify(c)}`);
    });
  });
  test('Property: repair ≥ 50% of new price never gets "Repair it"', () => {
    let checked = 0;
    combos.forEach((c) => {
      const r = engine.assess(c);
      if (r.ratio >= data.ASSUMPTIONS.rule50) {
        checked++;
        assert(r.verdict !== 'repair', `got "repair" for ${JSON.stringify(c)}`);
      }
    });
    return `${checked} expensive-repair cases checked`;
  });
  test('Property: cost estimate has min ≤ max and respects the minimum charge', () => {
    Object.values(data.DEVICES).forEach((d) => Object.values(d.tiers).forEach((price) => d.issues.forEach((i) => {
      const e = engine.estimateCost(i, price);
      assert(e.min <= e.max, `${d.label}/${i.id}: min > max`);
      assert(e.min >= i.min, `${d.label}/${i.id}: below minimum charge`);
    })));
  });
  test('Engine: unknown device is rejected', () => {
    let threw = false;
    try { engine.assess({ device: 'toaster', tier: 'mid', issueId: 'x', ageYears: 1 }); } catch (e) { threw = true; }
    assert(threw, 'expected an error');
  });

  /* Validators */
  test('Validator: Indian mobile numbers', () => {
    ['9876543210', '+91 98765 43210', '09876543210', '919876543210'].forEach((p) => eq(engine.validate.phone(p), '', `"${p}" should be valid`));
    ['12345', '1234567890', '98765432100', 'abcdefghij'].forEach((p) => assert(engine.validate.phone(p) !== '', `"${p}" should be invalid`));
  });
  test('Validator: PIN codes', () => {
    eq(engine.validate.pincode('201310'), '', '201310');
    ['012345', '20131', '2013100', 'ABCDEF'].forEach((p) => assert(engine.validate.pincode(p) !== '', `"${p}" should be invalid`));
  });
  test('Validator: booking date window (today … +30 days)', () => {
    const now = new Date(2026, 10, 3, 12);
    eq(engine.validate.date('2026-11-03', now), '', 'today');
    eq(engine.validate.date('2026-12-03', now), '', '+30 days');
    assert(engine.validate.date('2026-11-02', now) !== '', 'past date must fail');
    assert(engine.validate.date('2026-12-04', now) !== '', '+31 days must fail');
    assert(engine.validate.date('2026-02-30', now) !== '', 'impossible date must fail');
  });
  test('Validator: names accept Hindi and English, reject digits', () => {
    eq(engine.validate.name('Aditi Mehrotra'), '', 'English');
    eq(engine.validate.name('अदिति'), '', 'Hindi');
    assert(engine.validate.name('A1') !== '', 'digits must fail');
  });

  /* Workflow */
  const sample = (type) => engine.createRequest({
    type, device: 'smartphone', tier: 'mid', issueId: 'screen', partnerId: 'p01', mode: 'pickup',
    address: 'Test address, Greater Noida', pincode: '201310', date: '2026-11-04', slot: 'morning',
    name: 'Test User', phone: '+91 98765 43210'
  }, [], new Date(2026, 10, 3, 10));

  test('Workflow: request IDs follow TC-YYMM-XXXX and are unique', () => {
    const ids = [];
    for (let i = 0; i < 300; i++) ids.push(engine.makeId(ids, new Date(2026, 10, 3)));
    ids.forEach((id) => assert(/^TC-2611-[A-HJ-NP-Z2-9]{4}$/.test(id), `bad id ${id}`));
    eq(new Set(ids).size, ids.length, 'unique ids');
    return `e.g. ${ids[0]}`;
  });
  test('Workflow: repair request walks Submitted → Completed and stops', () => {
    let r = sample('repair');
    eq(r.phone, '9876543210', 'phone normalised');
    const seen = [r.status];
    while (engine.nextStatus(r)) {
      r = engine.advance(r, { finalCost: engine.nextStatus(r) === 'Completed' ? 4500 : undefined });
      seen.push(r.status);
    }
    eq(seen.join(' → '), engine.FLOWS.repair.join(' → '), 'status order');
    eq(r.history.length, 5, 'history entries');
    let threw = false;
    try { engine.advance(r); } catch (e) { threw = true; }
    assert(threw, 'advancing a completed request must fail');
    return seen.join(' → ');
  });
  test('Workflow: completing a repair requires a final cost', () => {
    let r = sample('repair');
    r = engine.advance(engine.advance(engine.advance(r)));
    let threw = false;
    try { engine.advance(r, { finalCost: '' }); } catch (e) { threw = true; }
    assert(threw, 'missing cost must fail');
  });
  test('Workflow: only un-accepted requests can be cancelled', () => {
    const r = sample('recycle');
    eq(engine.cancel(r).status, 'Cancelled', 'cancel submitted');
    let threw = false;
    try { engine.cancel(engine.advance(r)); } catch (e) { threw = true; }
    assert(threw, 'cancelling an accepted request must fail');
  });

  /* Impact */
  test('Impact: only completed requests count', () => {
    let repaired = sample('repair');
    while (engine.nextStatus(repaired)) repaired = engine.advance(repaired, { finalCost: engine.nextStatus(repaired) === 'Completed' ? 5000 : undefined });
    const pending = sample('recycle');
    const s = engine.computeImpact([repaired, pending], []);
    eq(s.repairs, 1, 'repairs');
    eq(s.recycled, 0, 'recycled');
    eq(s.open, 1, 'open');
    eq(s.saved, 25000 - 5000, 'money saved');
    eq(s.co2, 54, 'CO₂e avoided (60 kg × 0.9)');
    return `saved ₹${s.saved}, ${s.co2} kg CO₂e`;
  });

  /* Geo */
  test('Geo: haversine distance for 1° of longitude at the equator ≈ 111.19 km', () => {
    const km = engine.haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    assert(Math.abs(km - 111.19) < 0.05, `got ${km.toFixed(3)}`);
    return `${km.toFixed(2)} km`;
  });

  /* Storage */
  test('Storage: save → read → update round-trip (isolated namespace)', () => {
    const s = TC.createStore('techcycle.test.', { silent: true });
    s.clearAll();
    const r = sample('repair');
    s.saveRequest(r);
    eq(s.getRequest(r.id.toLowerCase()).id, r.id, 'lookup is case-insensitive');
    s.saveRequest(engine.advance(r));
    eq(s.requests().length, 1, 'update replaces, not duplicates');
    eq(s.getRequest(r.id).status, 'Accepted', 'updated status');
    s.clearAll();
    eq(s.requests().length, 0, 'cleared');
    return s.isPersistent() ? 'localStorage' : 'in-memory fallback';
  });

  return results;
};
