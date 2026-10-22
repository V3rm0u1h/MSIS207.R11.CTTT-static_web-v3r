# REPORT LAB2 — Vietnam Mega-Sale Simulator

A front-end simulation of an 11.11 flash sale, built on the Mini-React core
in `../source/` (`createElement`, `renderToDOM`, `events`, `testHarness`).
The core is imported, not copied. Code is in `source/`.

This is a simulation: inventory is consistent only inside this page's
in-memory state. It is not a payment system or a distributed inventory
service, and it cannot keep stock consistent across browsers or devices.

Serve from the `LAB2/` folder so the `../../source/` imports resolve:

```
cd LAB2
python -m http.server 8765
```

- Demo: http://localhost:8765/HW/megasale/source/megaSale.demo.html
  (scenarios: `?scenario=upcoming`, `live`, `ended`, `invalid`)
- Tests: http://localhost:8765/HW/megasale/source/megaSale.test.html

## T-01 — Mega-Sale project foundation

Commit: `feat(sale): establish mega-sale simulation foundation`

| File | Responsibility |
| --- | --- |
| `source/saleConfig.js` | Centralized campaign config: `createSampleConfig(now, options)`, `validateSaleConfig(config)` (never throws, returns every problem), `discountPercent` |
| `source/saleStatus.js` | `SALE_STATUS` (`UPCOMING`, `LIVE`, `ENDED`), labels, `getCampaignStatus(config, now)` |
| `source/productCard.js` | Pure VNode builders: `ProductCard`, `ConfigErrorView`, `primaryAction`, `createFormatters` |
| `source/mountMegaSale.js` | Mounts the card and a live region through `renderToDOM` and root event delegation; per-mount state; `refresh()` / `dispose()` |
| `source/megaSale.css` | Contrast-checked styles, single-column layout under 30rem |
| `../source/renderToDOM.js` | Adds `lang` to the attribute allow-list, so Vietnamese text can be marked `lang="vi"` (WCAG 3.1.2). Nothing else changed |

Existing architecture, inspected before writing code: the project has no
`main.js` or `index.js`. Each feature has a `mount*.js` that renders with
`renderToDOM`, wires clicks through `attachRootEventDelegation` and keeps
state in a per-mount closure (the pattern from `mountDataGrid.js` and
`mountAudioPlayer.js`). The global `useState` store in
`EXERCISE/sources` was not used, because it is shared by the whole page
(AI_AUDIT_FAILURE_1, Defect 1). The Mega-Sale follows the same structure.

![Live sale](images/t01-live.png)

Key decisions:

- **Units.** Timestamps are Unix epoch milliseconds (as `Date.now()`),
  durations are milliseconds (`lockDurationMs`), and prices are whole
  Vietnamese đồng. VND has no minor unit, so prices are integers and never
  floats.
- **Config fields.** `campaignName`, `productName`, `originalPrice`,
  `salePrice`, `initialInventory`, `startsAt`, `endsAt`, `lockDurationMs`,
  `timeZone`. The PRD's field list has no end time, but `ENDED` cannot be
  derived without one, so `endsAt` was added. `timeZone`
  (`Asia/Ho_Chi_Minh`) makes the shown times Vietnam time on any machine.
- **Sample data.** `createSampleConfig(now)` places the sale relative to
  `now` (it starts in 2 minutes and runs 30), so the simulator always has
  something to show. A fixed 11.11 date would be stuck on "Upcoming" or
  "Ended" for most of the year. The demo's scenario links shift the start
  to show each status.
- **Status is derived, never stored.** `getCampaignStatus(config, now)` is
  the single rule: `now < startsAt` → `UPCOMING`, `startsAt ≤ now < endsAt`
  → `LIVE`, otherwise `ENDED`. The card, the button and `handle.status` all
  call it. The clock is injected (`options.now`, default `Date.now`), so
  tests check exact boundaries.
- **Validation without crashing.** `validateSaleConfig` checks types and
  rules: non-empty names, positive integer prices, sale price below the
  original, inventory a non-negative safe integer (0 allowed), integer
  timestamps with `endsAt > startsAt`, a positive lock duration and a valid
  IANA time zone. It returns all problems at once. An invalid config shows a
  `<section role="alert">` listing them, and no card is built from bad
  data. Wrong argument *types* passed to `mountMegaSale` (a missing root,
  props that are not an object) still throw a `TypeError` before the root is
  touched, as in the other modules.
- **Prices told apart by text.** Each price has its own `<dt>` label
  ("Original price", "Sale price"), because screen readers do not announce
  `<del>` by default. The original price is struck through and muted; the
  sale price is a large red `<strong>`; the discount is written out
  ("(38% off)").
- **Primary button follows the status.** `UPCOMING`: "Opens at HH:mm"
  (disabled); `LIVE`: "Reserve now"; `LIVE` with 0 stock: "Sold out"
  (disabled); `ENDED`: "Sale ended" (disabled). In T-01, Reserve only
  announces in the live region that reservations are not available yet.
  The reservation FSM comes in a later milestone.
- **Focus.** `refresh()` re-renders the card. If focus was inside it,
  focus returns to the new button, or to the product heading
  (`tabindex="-1"`) when the button becomes disabled, so keyboard users
  are never dropped to `<body>`.
- **Project rules.** Semantic markup only (`article`, `h2`, `dl`/`dt`/`dd`,
  `del`, `strong`, `output`, `time`, `button`, `section role="alert"`; no
  `div`); every prop and config value is type-checked; all text goes
  through `createTextNode` / `textContent` (an `<img onerror>` product name
  renders as literal text); the tree is mounted through `renderToDOM`.

![Invalid configuration](images/t01-invalid-config.png)

Tests: `source/megaSale.test.html` — 21/21 passed (headless Edge 155).
They cover the sample config and its units, validation of every field
(including non-objects, fractional đồng, `2 ** 53` stock and an unknown time
zone), exact status boundaries (1 ms before start, at start, 1 ms before
end, at end), the semantic card, price labels and formatting, the button
in each status and when sold out, keyboard focus and focus after
`refresh()`, the error view, XSS-safe text, argument checks before the
root is touched, two independent simulators on one page, and `dispose()`.

Regression: the Data-Grid (101/101) and audio (97/97) suites still pass
after the `lang` allow-list change.

Demo check (headless Edge, 900 px and 375 px): all four scenarios render
with no console errors and no horizontal scroll. Below 30rem the facts
stack in one column and the button is full width.

Mutation checks (each made tests fail, then the code was restored):

| Mutation | Failing tests |
| --- | --- |
| Status uses `now <= startsAt` (sale opens 1 ms late) | 5 |
| Inventory check accepts any finite number | 3 |
