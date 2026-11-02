# TechCycle: E-Waste Repair & Reuse Platform

**Team Reboot-Earth** · 2026CSAE102 Technology and Sustainability · Bennett University
**Milestone 2:** Project Design, Development & Demonstration (working prototype)

TechCycle helps people keep electronics in use for longer. It tells them whether a broken device is worth repairing, connects them to repair shops, refurbishers and authorised recyclers, and tracks the e-waste they keep out of landfill.

Primary SDG: **SDG 12** (Responsible Consumption & Production), plus SDG 11 and SDG 13.

## Team

| Member | Student ID |
|---|---|
| Suryansh Tyagi | S26CSEU2653 |
| Aditi Mehrotra | S26CSEU2280 |
| Arnav Sharma | S26CSEU2317 |
| Abdul Aziz | S26CSEU2478 |
| Shraddha Singh | S26CSEU2645 |

## Modules (all working in this build)

| # | Module | File | What it does |
|---|---|---|---|
| 1 | Repair-or-replace advisor | `js/modules/diagnose.js` | Scores repairability 0–100 and estimates repair cost (₹), savings and CO₂e avoided, with the reasoning shown |
| 2 | Partner locator | `js/modules/services.js` | Map (Leaflet + OpenStreetMap) of repair shops, refurbishers, collection points and recyclers, sorted by distance |
| 3 | Booking & tracking | `js/modules/booking.js` | Validated pickup / drop-off booking, request IDs (`TC-YYMM-XXXX`), live status timeline, disposal certificate |
| 4 | Parts marketplace | `js/modules/marketplace.js` | Search, filter, reserve and list spare parts and refurbished devices |
| 5 | Impact dashboard | `js/modules/impact.js` | E-waste diverted, CO₂e avoided and money saved, counted from completed requests only |
| 6 | Partner console | `js/modules/partner.js` | Technicians and recyclers move requests through each stage |

Shared logic lives in `js/engine.js` (decision engine, validators, request workflow, impact maths, distance) and `js/store.js` (storage). Design documentation, with architecture, workflow, DFD, data model, state machine, BMC and a **live test suite**, is in `design.html`.

## How to run

**Option 1: just open it.** Double-click `index.html`. It runs in any modern browser, with no install or build step. The map needs an internet connection.

**Option 2: local server (recommended for demos).**

```bash
python -m http.server 3210
```

Then open <http://localhost:3210>.

**Option 3: deploy free on GitHub Pages.** Push this folder to a GitHub repository, then go to *Settings → Pages → Deploy from branch → main / root*. The site is served at `https://<username>.github.io/<repo>/`.

### Demo tips
- **Impact → Load demo data** creates sample requests at every stage (marked “demo”). **Remove demo data** clears them again.
- **Design docs → Testing** runs the automated test suite against the real code.
- The ✦ button in the header turns animations on or off. It follows the system's “reduce motion” setting by default.
- **Design docs → Save as PDF** produces a clean printable version of the design document.

## Project structure

```
techcycle/
├── index.html            app shell + all six module views
├── design.html           Milestone 2 design documentation (diagrams, BMC, tests)
├── css/
│   ├── styles.css        theme tokens, layout, components, animations
│   └── design.css        design-docs page and diagram styles
├── js/
│   ├── data.js           device catalogue, sample partners & listings, assumptions
│   ├── engine.js         decision engine, validators, workflow, impact, geo
│   ├── store.js          persistence (localStorage, swappable for an API)
│   ├── demo.js           demo-data loader
│   ├── ui.js             icons, toasts, modal, animations, theme & motion toggles
│   ├── app.js            boot animation + hash router
│   ├── tests.js          automated test suite
│   ├── design.js         design-docs page logic
│   └── modules/          one file per module
└── docs/
    └── DEMO_SCRIPT.md    shot list for the 90–150 s Milestone 2 video
```

## Honesty notes (please keep these)
- **Partner locations and marketplace listings are sample data**, labelled “sample” in the UI. Verified partners and CPCB-authorised recyclers will replace them in Milestone 3.
- **Costs and CO₂e figures are indicative estimates** based on the assumptions in `js/data.js` and the Design docs (Section 9). They are not quotes.
- Statistics on the home page are cited: Global E-waste Monitor 2024 (UNITAR & ITU), and the Government of India's reply in the Rajya Sabha on 16 Dec 2024 (via Down To Earth).
- In this prototype all data stays in the browser (localStorage). Nothing is sent to a server.

## Contribution log
Keep this updated with real work. The guidelines assess each member's contribution.

| Date | Member | Contribution | Evidence (commit / file / doc) |
|---|---|---|---|
| | | | |

## Roadmap to Milestone 3 (3 Nov – 1 Dec 2026)
1. Survey repair shops and collection points near campus; calibrate repair-cost assumptions with real quotes.
2. Backend API + database; partner login; verified partner data.
3. Campus pilot with student users; usability fixes; status notifications.
4. Final report, presentation, LinkedIn post, 3–5 min YouTube video, viva.
