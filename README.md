# SMW COSMOS Recipe: client demo prototype (v0.2)

React + Bootstrap Icons frontend prototype based on the COSMOS Recipe Revision 2 brief.
Run: `npm install`, then `npm run dev`. Calculation tests: `npm test`.

This is a standalone client-demo UI. It has no backend, database or login, and all state resets on reload.
The production Recipe module must be built inside COSMOS using its existing masters, Work Orders,
Job Queue, Documents, permissions, audit log and export framework.

## What the prototype demonstrates
- Recipe list and detail for one demo recipe (Max Estate Tower-4 Hydraulic BCS, qty per single cage)
- Versioning: Final versions are locked; every edit goes through one update function that rejects
  writes to Final versions and logs a "Locked edit rejected" audit event
- Create new version (copies latest Final into a Draft, change summary required), edit, finalize
- Finalize validation: blocks unconfirmed quantities, broken component links, empty routing
- Stock forms: Profile, Tube, Bar (6000 mm default, bar cutting); Sheet / Plate and Bought-out skip bar cutting
- Saw kerf is a factory setting that starts NOT configured; figures are flagged as nominal until set
- Cutting view drawn to scale per bar
- Work Order requirement: pieces multiplied first, then bars, with the per-cage rounding comparison
- Demo work orders keep the exact recipe version they were created against
- Routing with In-House, Overload Outsourced and External; sequence preserved into the Job Queue view
- CSV export (opens in Excel) built from the same calculation module as the UI
- Open factory questions listed instead of guessed

`src/calc.js` holds all calculations. `src/calc.test.js` covers kerf, exact division, form rules,
Work Order bar maths and finalize validation.

## Deliberately not seeded
M20 nuts and washers (quantity not stated separately in the PDF), Grade 8.9 bolts, CP2, centre bushes,
cross bracing, Working Deck and Special Types. See the Open questions tab.
