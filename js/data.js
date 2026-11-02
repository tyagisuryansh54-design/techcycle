/* TechCycle — reference data.
 * Everything here is PROTOTYPE DATA:
 *   - device prices, repair-cost shares and carbon footprints are indicative assumptions,
 *   - partner locations and marketplace listings are clearly-labelled SAMPLE records.
 * They are kept in one file so they can be replaced with verified data in Milestone 3. */
window.TC = window.TC || {};

TC.data = (function () {
  // Distances are measured from here unless the user shares their location.
  const REFERENCE_POINT = { label: 'Bennett University (approx.)', lat: 28.4501, lng: 77.584 };

  const TIERS = { budget: 'Budget', mid: 'Mid-range', premium: 'Premium' };

  /* Per issue:
   *   lo / hi  — typical repair cost as a share of a new device's price
   *   min      — minimum realistic charge in INR (labour + part)
   *   success  — how often this fault is fixed reliably (0–1)
   *   diy      — a safe, free fix should be tried first
   *   tip / safety — guidance shown with the result */
  const DEVICES = {
    smartphone: {
      label: 'Smartphone', icon: 'phone', weightKg: 0.19, embodiedKg: 60, lifeYears: 5,
      tiers: { budget: 10000, mid: 25000, premium: 70000 },
      issues: [
        { id: 'screen', label: 'Cracked or broken screen', lo: 0.12, hi: 0.3, min: 1200, success: 0.95 },
        { id: 'battery', label: 'Battery drains fast or is swollen', lo: 0.04, hi: 0.1, min: 700, success: 0.95,
          safety: 'A swollen battery is a fire risk. Stop charging it and get the battery replaced soon.' },
        { id: 'port', label: 'Charging port loose / not charging', lo: 0.02, hi: 0.06, min: 300, success: 0.9,
          tip: 'Try a different cable and gently clear lint from the port with a wooden toothpick first.' },
        { id: 'audio', label: 'Speaker or microphone problem', lo: 0.02, hi: 0.06, min: 300, success: 0.9 },
        { id: 'camera', label: 'Camera not working or blurry', lo: 0.06, hi: 0.18, min: 800, success: 0.9 },
        { id: 'water', label: 'Water or liquid damage', lo: 0.1, hi: 0.35, min: 1000, success: 0.6,
          safety: 'Switch it off now and do not charge it until a technician has inspected it.' },
        { id: 'slow', label: 'Slow, hanging or storage full', lo: 0, hi: 0.02, min: 0, success: 0.9, diy: true,
          tip: 'Free up storage, update the OS and remove unused apps. Factory-reset only after a full backup.' },
        { id: 'board', label: 'Will not turn on (motherboard fault)', lo: 0.3, hi: 0.6, min: 2500, success: 0.5 }
      ]
    },
    laptop: {
      label: 'Laptop', icon: 'laptop', weightKg: 1.8, embodiedKg: 250, lifeYears: 6,
      tiers: { budget: 35000, mid: 65000, premium: 120000 },
      issues: [
        { id: 'slow', label: 'Slow performance (SSD / RAM upgrade)', lo: 0.03, hi: 0.08, min: 1500, success: 0.95,
          tip: 'An SSD and RAM upgrade often makes a 4–6 year old laptop feel new again.' },
        { id: 'battery', label: 'Battery backup very low', lo: 0.05, hi: 0.12, min: 2000, success: 0.95 },
        { id: 'screen', label: 'Broken or flickering display', lo: 0.1, hi: 0.25, min: 3500, success: 0.9 },
        { id: 'keyboard', label: 'Keyboard or touchpad not working', lo: 0.03, hi: 0.08, min: 1200, success: 0.9 },
        { id: 'heat', label: 'Overheating or loud fan', lo: 0.01, hi: 0.03, min: 500, success: 0.9,
          tip: 'Dust cleaning and fresh thermal paste usually fix this.' },
        { id: 'hinge', label: 'Broken hinge or body panel', lo: 0.03, hi: 0.08, min: 1200, success: 0.85 },
        { id: 'water', label: 'Liquid spill', lo: 0.1, hi: 0.35, min: 2500, success: 0.55,
          safety: 'Unplug it, remove power and do not switch it on again until it has been inspected.' },
        { id: 'board', label: 'No power / no display (motherboard)', lo: 0.25, hi: 0.55, min: 6000, success: 0.55 }
      ]
    },
    tablet: {
      label: 'Tablet', icon: 'tablet', weightKg: 0.5, embodiedKg: 100, lifeYears: 5,
      tiers: { budget: 15000, mid: 35000, premium: 80000 },
      issues: [
        { id: 'screen', label: 'Cracked or broken screen', lo: 0.15, hi: 0.35, min: 2000, success: 0.9 },
        { id: 'battery', label: 'Battery drains fast', lo: 0.05, hi: 0.12, min: 1200, success: 0.9 },
        { id: 'port', label: 'Charging port not working', lo: 0.02, hi: 0.06, min: 400, success: 0.9 },
        { id: 'slow', label: 'Slow or storage full', lo: 0, hi: 0.02, min: 0, success: 0.9, diy: true,
          tip: 'Clear storage, update the OS and remove unused apps before paying for any repair.' },
        { id: 'board', label: 'Will not turn on (motherboard fault)', lo: 0.3, hi: 0.6, min: 3000, success: 0.5 }
      ]
    },
    earphones: {
      label: 'Earphones', icon: 'earphones', weightKg: 0.06, embodiedKg: 6, lifeYears: 3,
      tiers: { budget: 1500, mid: 5000, premium: 20000 },
      issues: [
        { id: 'oneside', label: 'One side not working', lo: 0.15, hi: 0.4, min: 300, success: 0.7 },
        { id: 'cable', label: 'Damaged wire or jack (wired)', lo: 0.08, hi: 0.25, min: 150, success: 0.85 },
        { id: 'battery', label: 'Battery dies quickly (wireless)', lo: 0.3, hi: 0.6, min: 500, success: 0.5 },
        { id: 'case', label: 'Charging case not working', lo: 0.2, hi: 0.45, min: 400, success: 0.65 },
        { id: 'pairing', label: 'Bluetooth pairing or dropouts', lo: 0, hi: 0.03, min: 0, success: 0.9, diy: true,
          tip: 'Reset the earbuds (see the manual), forget and re-pair them, and update your phone.' }
      ]
    },
    charger: {
      label: 'Charger / cable', icon: 'charger', weightKg: 0.12, embodiedKg: 2, lifeYears: 5,
      tiers: { budget: 400, mid: 1200, premium: 3000 },
      issues: [
        { id: 'frayed', label: 'Frayed or exposed cable', lo: 0.4, hi: 0.8, min: 150, success: 0.5,
          safety: 'Exposed wires can overheat or shock. Stop using it and hand it in for recycling.' },
        { id: 'dead', label: 'Adapter not charging at all', lo: 0.4, hi: 0.8, min: 200, success: 0.4 },
        { id: 'loose', label: 'Loose connector / charges on and off', lo: 0.15, hi: 0.4, min: 100, success: 0.75 }
      ]
    }
  };

  const PARTNER_TYPES = {
    repair: { label: 'Repair shop', color: '#16a34a' },
    refurb: { label: 'Refurbisher', color: '#0d9488' },
    collection: { label: 'Collection point', color: '#d97706' },
    recycler: { label: 'Recycler', color: '#c2410c' }
  };

  const ALL = Object.keys(DEVICES);

  // SAMPLE partners — names are placeholders and coordinates are approximate locality centres.
  const CENTRES = [
    { id: 'p01', name: 'Partner Repair Hub 01', area: 'Pari Chowk, Greater Noida', type: 'repair',
      devices: ['smartphone', 'tablet', 'earphones', 'charger'], pickup: true, hours: '10:00–20:00',
      services: ['Screen & battery replacement', 'Charging-port repair', 'Doorstep pickup'], lat: 28.4663, lng: 77.5122 },
    { id: 'p02', name: 'Partner Laptop Clinic 02', area: 'Alpha 1, Greater Noida', type: 'repair',
      devices: ['laptop', 'tablet', 'charger'], pickup: true, hours: '10:30–19:30',
      services: ['SSD / RAM upgrades', 'Display & keyboard', 'Motherboard diagnosis'], lat: 28.473, lng: 77.5135 },
    { id: 'p03', name: 'Campus Collection Point 03', area: 'Tech Zone II, near Bennett University', type: 'collection',
      devices: ALL, pickup: false, hours: '09:00–18:00',
      services: ['E-waste drop box', 'Battery & cable bin'], lat: 28.4545, lng: 77.579 },
    { id: 'p04', name: 'Refurb Partner 04', area: 'Jagat Farm, Gamma 1', type: 'refurb',
      devices: ['smartphone', 'laptop', 'tablet'], pickup: true, hours: '11:00–20:00',
      services: ['Buy-back for parts', 'Certified refurbishment', 'Parts harvesting'], lat: 28.487, lng: 77.504 },
    { id: 'p05', name: 'Recycling Partner 05', area: 'Kasna industrial area', type: 'recycler',
      devices: ALL, pickup: true, hours: '09:30–17:30',
      services: ['Bulk pickup', 'Data destruction', 'Disposal certificate'], lat: 28.431, lng: 77.531 },
    { id: 'p06', name: 'Partner Repair Hub 06', area: 'Gaur City, Greater Noida West', type: 'repair',
      devices: ['smartphone', 'earphones', 'charger', 'tablet'], pickup: true, hours: '10:00–21:00',
      services: ['Phone repairs', 'Earphone soldering', 'Cable replacement'], lat: 28.607, lng: 77.426 },
    { id: 'p07', name: 'Partner Repair Hub 07', area: 'Sector 18, Noida', type: 'repair',
      devices: ['smartphone', 'laptop', 'tablet', 'earphones'], pickup: false, hours: '11:00–21:00',
      services: ['Walk-in repairs', 'Same-day screen replacement'], lat: 28.57, lng: 77.324 },
    { id: 'p08', name: 'Collection Point 08', area: 'Knowledge Park II, Greater Noida', type: 'collection',
      devices: ALL, pickup: false, hours: '09:00–19:00',
      services: ['E-waste drop box', 'Monthly collection drive'], lat: 28.46, lng: 77.496 },
    { id: 'p09', name: 'Refurb Partner 09', area: 'Sector 62, Noida', type: 'refurb',
      devices: ['laptop', 'smartphone'], pickup: true, hours: '10:00–19:00',
      services: ['Laptop refurbishment', 'Buy-back'], lat: 28.6208, lng: 77.3633 }
  ];

  // SAMPLE marketplace listings (shown with a "Sample" badge).
  const LISTINGS = [
    { id: 's01', title: 'Refurbished smartphone · 6 GB / 128 GB', category: 'refurbished', device: 'smartphone',
      condition: 'Grade A', price: 8999, seller: 'Refurb Partner 04', note: 'Battery health above 90% (seller-reported).' },
    { id: 's02', title: 'Refurbished laptop · Core i5 (8th gen), 8 GB / 256 GB SSD', category: 'refurbished', device: 'laptop',
      condition: 'Grade B', price: 18499, seller: 'Refurb Partner 09', note: 'Minor scuffs on lid.' },
    { id: 's03', title: 'Refurbished 10-inch tablet · 4 GB / 64 GB', category: 'refurbished', device: 'tablet',
      condition: 'Grade B', price: 7499, seller: 'Refurb Partner 04', note: 'Comes with charger.' },
    { id: 's04', title: 'Phone display assembly (pulled, tested)', category: 'part', device: 'smartphone',
      condition: 'Tested working', price: 1499, seller: 'Partner Repair Hub 01', note: 'Model compatibility checked at pickup.' },
    { id: 's05', title: '256 GB SATA SSD (health 95%)', category: 'part', device: 'laptop',
      condition: 'Tested working', price: 1199, seller: 'Partner Laptop Clinic 02', note: 'Securely wiped.' },
    { id: 's06', title: '8 GB DDR4 laptop RAM', category: 'part', device: 'laptop',
      condition: 'Tested working', price: 999, seller: 'Partner Laptop Clinic 02', note: '' },
    { id: 's07', title: 'Earbud charging case (no buds)', category: 'part', device: 'earphones',
      condition: 'Good', price: 399, seller: 'Partner Repair Hub 06', note: 'Check model before reserving.' },
    { id: 's08', title: '65 W laptop charger (tested)', category: 'accessory', device: 'charger',
      condition: 'Like new', price: 649, seller: 'Student listing', note: '' },
    { id: 's09', title: 'USB-C to USB-C cable, 1 m (tested)', category: 'accessory', device: 'charger',
      condition: 'Good', price: 99, seller: 'Student listing', note: '' }
  ];

  const LISTING_CATEGORIES = { refurbished: 'Refurbished device', part: 'Spare part', accessory: 'Accessory' };

  const ASSUMPTIONS = {
    partsShare: 0.1, // share of a new device's footprint attributed to replacement parts
    rule50: 0.5 // "50% rule": repair costing half of a new device or more is not worth it
  };

  const SLOTS = { morning: 'Morning (9–12)', afternoon: 'Afternoon (12–4)', evening: 'Evening (4–8)' };

  const TEAM = [
    { name: 'Suryansh Tyagi', id: 'S26CSEU2653' },
    { name: 'Aditi Mehrotra', id: 'S26CSEU2280' },
    { name: 'Arnav Sharma', id: 'S26CSEU2317' },
    { name: 'Abdul Aziz', id: 'S26CSEU2478' },
    { name: 'Shraddha Singh', id: 'S26CSEU2645' }
  ];

  return { REFERENCE_POINT, TIERS, DEVICES, PARTNER_TYPES, CENTRES, LISTINGS, LISTING_CATEGORIES, ASSUMPTIONS, SLOTS, TEAM };
})();
