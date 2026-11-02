/* TechCycle — demo data loader.
 * Creates clearly-flagged sample requests (demo: true) so the full workflow and dashboard
 * can be demonstrated. Demo records can be removed at any time without touching real ones. */
window.TC = window.TC || {};

TC.seedDemo = function (store = TC.store) {
  const { engine } = TC;
  store.removeDemo();

  const DAY = 86400000;
  const now = Date.now();
  const at = (daysAgo, hour = 11) => {
    const d = new Date(now - daysAgo * DAY);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const base = { name: 'Demo User', phone: '9876543210', slot: 'afternoon', demo: true };

  const plans = [
    { input: { type: 'repair', device: 'smartphone', tier: 'mid', issueId: 'screen', partnerId: 'p01', mode: 'pickup', address: 'Demo hostel block, Bennett University', pincode: '201310' }, created: 12, steps: 4, finalCost: 4800 },
    { input: { type: 'repair', device: 'laptop', tier: 'mid', issueId: 'slow', partnerId: 'p02', mode: 'dropoff' }, created: 9, steps: 4, finalCost: 3200 },
    { input: { type: 'recycle', device: 'charger', tier: 'budget', partnerId: 'p03', mode: 'dropoff' }, created: 8, steps: 4 },
    { input: { type: 'recycle', device: 'earphones', tier: 'budget', partnerId: 'p05', mode: 'pickup', address: 'Demo hostel block, Bennett University', pincode: '201310' }, created: 5, steps: 3 },
    { input: { type: 'repair', device: 'tablet', tier: 'budget', issueId: 'battery', partnerId: 'p01', mode: 'pickup', address: 'Demo hostel block, Bennett University', pincode: '201310' }, created: 3, steps: 3 },
    { input: { type: 'recycle', device: 'smartphone', tier: 'budget', partnerId: 'p05', mode: 'pickup', address: 'Demo faculty housing, Greater Noida', pincode: '201310' }, created: 2, steps: 1 },
    { input: { type: 'repair', device: 'smartphone', tier: 'budget', issueId: 'port', partnerId: 'p06', mode: 'dropoff' }, created: 1, steps: 0 }
  ];

  const ids = store.requests().map((r) => r.id);
  const created = [];
  plans.forEach((p) => {
    const t0 = at(p.created, 10);
    const preferred = engine.toDateInput(new Date(t0.getTime() + DAY));
    let req = engine.createRequest({ ...base, ...p.input, date: preferred }, ids, t0);
    ids.push(req.id);
    for (let s = 1; s <= p.steps; s++) {
      const isLast = s === p.steps && p.finalCost != null;
      req = engine.advance(req, { now: new Date(t0.getTime() + s * 0.6 * DAY), finalCost: isLast ? p.finalCost : undefined });
    }
    created.push(req);
  });

  const checks = [['smartphone', 'mid', 'screen', 2], ['laptop', 'mid', 'slow', 4], ['earphones', 'budget', 'battery', 1.5]].map(
    ([device, tier, issueId, ageYears], i) => {
      const r = engine.assess({ device, tier, issueId, ageYears });
      return {
        id: `D-demo-${i}`, device, tier, issueId, ageYears, score: r.score, verdict: r.verdict,
        createdAt: at(14 - i).toISOString(), demo: true
      };
    }
  );
  // One write per collection, so listeners re-render once.
  store.write('diagnoses', store.diagnoses().concat(checks));
  store.write('requests', created.reverse().concat(store.requests()));
  return created.length;
};
