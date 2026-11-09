# AI Failure Audit — HW 3

## Project
KRAFTON x PUBG Vietnam Championship & Airdrop Arena

`LAB3/HW/pubgArena` (Vite + React 19, Vitest, Playwright + axe-core in Microsoft Edge).

All code in this homework was written with an AI assistant. The cases below are
**real defects in that AI-generated code or tests**. Each one was found during
this work, and each was recorded at the time it happened, together with the
command output that exposed it. Problems that came from the PRD text itself are
kept apart, in "Specification issues", so they are not counted as AI failures.

How the evidence was produced:

- **Unit tests:** `npx vitest run` in jsdom, 189 tests at the end.
- **Browser tests:** `npx playwright test` in Microsoft Edge, 27 tests, run with
  `--repeat-each` to catch flakes.
- **Mutation checks:** after a fix, the AI deliberately broke the code again and
  confirmed that the tests fail. A test that still passes against broken code
  is a vacuous test, and Case 02 shows two of them.

| # | Failure | Area | Found by | Status |
| --- | --- | --- | --- | --- |
| 01 | Fake clock assumed to be frozen: flaky countdown tests, then axe timeouts | Timer verification | `--repeat-each=8` in Edge | Fixed |
| 02 | Two "stale response" tests that could never fail | Optimistic rollback | Mutation check | Removed, guard documented |
| 03 | Virtual list used padding as the spacer, so the list never scrolled | Virtual scroller | Edge geometry test | Fixed |
| 04 | Kill-feed rows read "Player BTE" (two words merged) | Accessibility | Unit row-text test | Fixed |
| 05 | New content broke earlier browser tests (substring names, live-region count) | Test robustness | Full Edge run | Fixed |
| 06 | Rule 1 violation and dead code in generated components | Project Rules | Code review | Fixed |
| 07 | Wrong assumptions inside new tests and layout (6 small cases) | Tests / layout | Test runs | Fixed |

---

## 1. Failure Case 01 — Timer Drift (verification of the drift-free timer)

### AI-generated mistake

The hook itself never drifted. It always computes
`max(0, target − (Date.now() + serverOffsetMs))`, and a mutation check showed
that the forbidden decrementing version fails 10 hook tests. The AI's mistake
was in **how it verified the timer in the browser**. It assumed Playwright's
`page.clock.install({ time })` freezes time:

```js
// e2e/countdown.spec.js (before)
test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: T0 });
    await page.goto("/");
});

test("both countdowns start from their absolute targets ...", async ({ page }) => {
    await expect(timer(page, "PVS Grand Finals")).toHaveText("40 DAYS : 23 HOURS : 59 MIN : 58 SEC");
});
```

### Why it was incorrect

`install()` only sets the starting time; after that the fake clock keeps
running in real time. If the page takes a few seconds to load, the countdown
correctly shows a few seconds less, and the hard-coded expectation fails. The
test was checking the speed of the test machine, not the timer.

The first fix, pausing the clock, created a second bug. axe-core schedules its
own work with `setTimeout`, so a paused fake clock freezes axe too.

### How I detected it

All six tests passed once. A full run then failed once and passed on the next
try, so the run was repeated under load:

```
npx playwright test --repeat-each=8
  ✘ ... both countdowns start from their absolute targets and the simulated server offset   (8 of 8 runs)
    Expected: "40 DAYS : 23 HOURS : 59 MIN : 58 SEC"
    Received: "40 DAYS : 23 HOURS : 59 MIN : 50 SEC"
```

After pausing the clock, the axe tests timed out:

```
  ✘ ... phone (375px): no horizontal overflow, axe WCAG 2.2 AA clean (30.1s)    (8 of 8 runs)
  ✘ ... desktop (1280px): no horizontal overflow, axe WCAG 2.2 AA clean (30.1s)  (every run in the captured output)
```

### Corrective action

```js
// e2e/countdown.spec.js (after)
// install() alone only sets the start time: the fake clock keeps running in real time,
// so a slow page load shifted the expected digits (a flake found with --repeat-each).
// Pausing at T0 makes every test start at exactly T0; time moves only when a test says so.
await page.clock.install({ time: T0 - 10 * SEC });
await page.clock.pauseAt(T0);
await page.goto("/");

// in the axe tests only:
// axe-core schedules its own work with setTimeout, which the paused fake clock would
// freeze (the run timed out at 30 s); let time flow normally for this test.
await page.clock.resume();
```

Result: `48 passed` (6 tests × 8 repeats). The background-tab test was then
checked against broken code. With the `visibilitychange` handler disabled, it
fails exactly where it should:

```
✘ background tab: timers frozen for 3 minutes, display corrected the instant the tab is visible
  Expected: "00 DAYS : 00 HOURS : 01 MIN : 56 SEC"
  Received: "00 DAYS : 00 HOURS : 04 MIN : 56 SEC"
```

### Prevention

- **Freeze time explicitly:** every timer test starts from `pauseAt(T0)` and
  moves time only through `runFor`, `fastForward` or `setSystemTime`.
- **Repeat before trusting:** a new browser test is run with `--repeat-each`
  before it is relied on.
- **Mutation check:** the code under test is deliberately broken once, to make
  sure the test can fail at all.

---

## 2. Failure Case 02 — Optimistic Rollback

### AI-generated mistake

The rollback logic follows the PRD's warning: one transaction per claim, and
rollback is a +1 on that item only, applied at most once. The AI then wrote
**two tests that were supposed to prove the "stale response" guard works. Both
could never fail.**

Attempt 1 delivered a "late" second response by rejecting the same promise
again:

```js
// src/hooks/useOptimisticClaim.test.js (before, attempt 1)
test("a late response for an already-settled claim changes nothing", async () => {
    claim("pvs-vip");
    const call = backend.calls[0];
    await settle(() => backend.fail(call, 409));
    await settle(() => backend.fail(call, 409));      // "duplicate delivery"
    await settle(() => backend.ok(call, 10));
    expect(stock("pvs-vip")).toBe(25);
});
```

Attempt 2 answered after the component had unmounted:

```js
// (before, attempt 2)
unmount();
await act(async () => { answers[0](); });
expect(result.current.inventory).toBe(before);
```

A third, smaller mistake was caught on review before any test ran. The first
`retry()` read the failed claim through a state-updater function. React may run
that function lazily, during the next render, so `failed` could still be `null`
when it was checked:

```js
// (before)
let failed = null;
setClaims((current) => { failed = current[itemId]; return current; });
if (failed?.status !== CLAIM_STATUS.ERROR) return null;
```

### Why it was incorrect

- **Attempt 1:** a JavaScript promise settles only once. The second
  `reject()` and the `resolve()` are ignored by the promise itself, so the
  "late response" never reaches the hook.
- **Attempt 2:** React drops every state update aimed at an unmounted
  component, so the assertion holds whether the guard runs or not.
- **Both:** they reported coverage for a guard they did not exercise at all.

### How I detected it

The AI ran a mutation check: it deleted the guard and re-ran the tests.

```
== (c) unguarded rollback
      Tests  20 passed (20)          ← attempt 1 still green with the guard broken

== mutation: no stale guard on success
      Tests  20 passed (20)          ← attempt 2 still green with the guard broken
```

The same kind of check on the parts that *are* observable did catch the bugs:

```
== (a) snapshot rollback (restore the whole inventory instead of +1 on one item)
     × a 409 on the VIP ticket restores only the ticket, never the crate
     × responses arriving in the opposite order settle each item independently
     × a crate claim made after the ticket was deducted survives the ticket's rollback
== (b) no useRef lock
     × duplicate clicks while PENDING send no second request (the useRef lock)
     × five clicks in the same tick still make one claim
```

### Corrective action

- **Vacuous tests removed:** both were deleted instead of being kept as false
  coverage. The test file now explains why there is no stale-response test, and
  the hook's header documents the guard as defensive. With one settlement per
  request and one claim per item at a time, nothing outside the hook can
  provoke a stale answer.
- **Claim state in a ref:** `retry()` now reads the claim state from a ref,
  updated together with the state, so it is always current:

```js
// (after)
const setClaim = useCallback((itemId, claim) => {
    claimsRef.current = Object.freeze({ ...claimsRef.current, [itemId]: Object.freeze(claim) });
    setClaims(claimsRef.current);
}, []);
...
const failed = claimsRef.current[itemId];
if (failed.status !== CLAIM_STATUS.ERROR) return null;
```

The behaviour that does matter is tested and protected by the mutation checks
above:

- 409 restores only its own item.
- Duplicate clicks send one request.
- A network error is never shown as a success.
- Retry re-sends the same `claimId`, which the mock server treats idempotently.

### Prevention

- **Prove a test can fail:** a test is not accepted until the code it protects
  has been broken once and the test went red.
- **Check the scenario is reachable:** before writing a "late / duplicate
  response" test, check that the scenario can happen at all. Promises settle
  once, and unmounted components ignore updates.
- **Synchronous state:** values that a click handler must read synchronously
  live in a ref, never in a state-updater callback.

---

## 3. Failure Case 03 — Virtual Scroller

### AI-generated mistake

No virtual scroller exists in this repository's Lab 2 work (see Specification
issues), so the AI wrote a new one. To avoid a spacer `<div>` (Project Rule 1),
it put the height of the unrendered rows into the **padding of the scrolling
`<ol>`** itself. It also wrote a comment claiming that `box-sizing: border-box`
makes this work:

```jsx
// src/components/VirtualList.jsx (before)
<ol
    className={styles.virtualList}
    style={{ height: viewportHeight, paddingTop: range.paddingTop, paddingBottom: range.paddingBottom }}
    onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
>
```

```css
/* Championship.module.css (before) */
/* The <ol> is the scroll container. border-box is essential: the padding
 * stands in for the rows that are not rendered ... */
.virtualList { box-sizing: border-box; overflow-y: auto; ... }
```

### Why it was incorrect

CSS never lets padding plus border exceed the box. Even with `border-box`, when
the padding (63,000 px for 1,000 rows of 64 px) is larger than `height`
(384 px), the content area cannot go negative, so the box grows to contain the
padding. The `<ol>` became about 63,000 px tall and never scrolled. A visitor
would have seen a list that does not scroll, and the page would have been 63,000
px long.

**All 189 unit tests passed**, because jsdom does no layout. They only checked
the inline style values, which were "correct".

### How I detected it

An Edge test measures the real geometry, not the style attributes:

```
✘ the 1,000-event feed scrolls through its full height while rendering at most 17 rows
    Expected: 382          ← clientHeight: 384 px viewport minus the 2 px border
    Received: 63296
✘ keyboard: the feed is focusable and End reaches event 1,000
    Expected: "1000"
    Received: "22"         ← End stopped at the last rendered row: the list was not scrolling
```

### Corrective action

The `<ol>` keeps a fixed height. The unrendered rows are now stood in for by its
empty `::before` / `::after` pseudo-elements. Their heights come from CSS
variables, so they are real content inside the scroll container. There is still
no extra element:

```jsx
// src/components/VirtualList.jsx (after)
style={{
    height: viewportHeight,
    "--virtual-before": `${range.spacerBefore}px`,
    "--virtual-after": `${range.spacerAfter}px`
}}
```

```css
/* Championship.module.css (after) */
.virtualList { box-sizing: border-box; padding: 0; overflow-y: auto; ... }
.virtualList::before,
.virtualList::after { content: ""; display: block; }
.virtualList::before { height: var(--virtual-before, 0px); }
.virtualList::after { height: var(--virtual-after, 0px); }
```

After the fix, Edge measures `scrollHeight === 64000` for 1,000 × 64 px rows.
Wheel and keyboard scrolling reach event 1,000, with at most 17 `<li>` in the
DOM (6 visible + 1 partial + 2 × 5 overscan).

Mutation checks prove the tests now guard each part of the scroller:

```
== mutation: no ::after spacer (Edge)       Expected: 64000   Received: 704
== (a) no spacer (unit)                     3 failed
== (b) overscan ignored (unit)              7 failed
== (c) index keys instead of event ids      1 failed (same DOM node no longer reused after scrolling)
```

### Prevention

- **Measure layout in a real browser:** anything that depends on layout
  (heights, scrolling, overflow) is measured in a real browser
  (`scrollHeight`, `clientHeight`, visible rows), never only through style
  values in jsdom.
- **Comments are claims to verify:** a code comment that explains why a CSS
  trick works is treated as a claim to verify, not as evidence.

---

## 4. Failure Case 04 — Kill-feed rows read "Player BTE"

### AI-generated mistake

```jsx
// src/components/KillFeed.jsx (before)
<span className={styles.killLine}><strong>{event.killer}</strong> eliminated <strong>{event.victim}</strong></span>
<span className={styles.killMeta}><abbr>{event.squad}</abbr> · with {event.weapon}, <time>…</time></span>
```

### Why it was incorrect

The two spans are grid items on separate lines, so they look fine on screen. But
with no whitespace between them, the text, and what a screen reader reads, runs
together: "eliminated Player **BTE**". HW1 had the same class of bug (Failure 3),
which the AI did not remember.

### How I detected it

```
✘ KillFeed > each row shows killer, victim, squad tag, weapon and timestamp
  Expected: "Player A eliminated Player B TE · with M416, 19:00:00"
  Received: "Player A eliminated Player BTE · with M416, 19:00:00"
```

### Corrective action

```jsx
// (after)
</span>
{/* Separate text node: without it the row reads "Player BTE" (found by the row-text test). */}
{" "}
<span className={styles.killMeta}>
```

Inside the grid, a whitespace-only text node renders nothing, so the layout did
not change.

### Prevention

Every row and card has a test that compares its full text content, which is
close to what a screen reader announces.

---

## 5. Failure Case 05 — New features broke earlier browser tests

### AI-generated mistake

The PRD 1 browser tests located elements loosely:

```js
const card = (page, title) => page.getByRole("article", { name: title });       // substring match
const live = page.locator("[aria-live]:not([aria-live='off'])");                  // whole page
await expect(live).toHaveCount(2);
```

### Why it was incorrect

Playwright matches accessible names as substrings by default. Once PRD 2 added a
card named "PVS Grand Finals **VIP Ticket**", the name "PVS Grand Finals"
matched two articles. The claim cards also added two status regions to the page.

### How I detected it

```
Error: strict mode violation: getByRole('article', { name: 'PVS Grand Finals' }) resolved to 2 elements
Error: expect(locator).toHaveCount(expected) failed   Expected: 2   Received: 4
```

### Corrective action

Names are matched with `exact: true`, and the live-region count is limited to
the Countdowns section:

```js
const card = (page, title) => page.getByRole("article", { name: title, exact: true });
const live = page.getByRole("region", { name: "Countdowns" }).locator("[aria-live]:not([aria-live='off'])");
```

### Prevention

- **The whole suite runs after every feature:** later commits are not accepted
  on their new tests alone.
- **Locators are exact and scoped:** each locator is limited to the section it
  is about.

---

## 6. Failure Case 06 — Project Rule 1 violation and dead code

### AI-generated mistake

- **A list used only for layout:** to place the leaderboard and kill feed side
  by side, the AI wrapped them in a list that carried no meaning, which
  violates the spirit of Project Rule 1 (Zero Div-Soup):
  ```jsx
  <ul className={championship.panels} aria-label="Championship panels" role="list">
      <li><Leaderboard /></li>
      <li><KillFeed /></li>
  </ul>
  ```
- **Dead code:** the first `AirdropCountdown` exported an unused `padTwo`
  helper and accepted an unused `styles` prop. `virtualListUtils.js` had an
  unused `scrollTopForIndex` function.

### Why it was incorrect

A list tells screen-reader users "list, 2 items", which is false. The only aim
was a CSS grid. Dead code adds API surface that nothing tests.

### How I detected it

Code review of the generated files before the tests were written. There is no
test output: these were caught by reading, not by a failing run.

### Corrective action

The section itself became the grid, with the heading spanning both columns:

```jsx
<section className={championship.championship} aria-labelledby="championship-title">
    <h2 id="championship-title" className={championship.sectionTitle}>PUBG Vietnam Championship</h2>
    <Leaderboard squads={PUBG_SQUADS} />
    <KillFeed events={feed} squads={PUBG_SQUADS} />
</section>
```

The unused exports and props were deleted.

### Prevention

- **Rule tests:** an automated test scans every source file for `<div>` and
  `innerHTML` (Rules 1 and 3).
- **Review for meaning:** generated markup is also reviewed for meaning, not
  just for tag names.

---

## 7. Failure Case 07 — Wrong assumptions inside new tests and layout

Six smaller AI mistakes, each found by a failing run:

| Assumption | Evidence | Fix |
| --- | --- | --- |
| `useId()` returns `:r1:` | `expected '_r_1_-search' to match /^«?:?r/` (React 19.3 format) | Assert the `label[for]` wiring, not the id format |
| Expected virtual window one row too long | Received 10 rows, expected 11: `ceil(450/50) = 9` exactly, so row 9 starts at the bottom edge | Corrected the expected list; the implementation was right |
| `getByText("0 ₫")` finds the price | `Unable to find an element with the text: 0 ₫` | Read the `[data-field='price']` cell directly |
| `vi.spyOn(service, "claimItem")` works | `TypeError: Cannot redefine property: claimItem` (the service object is frozen) | Count calls with the service's `requestCount` |
| Playwright clicks an `aria-disabled` button | `locator.click: Test timeout of 30000ms exceeded ... element is not enabled` | `click({ force: true })` to imitate a user pressing a pending button |
| Leaderboard table fits at 1024 px | Edge layout test at 1024 px: `tableScrolls` Expected `false`, Received `true` (`min-width: 34rem` > the 3fr column) | `min-width: 30rem`, wrapping column headers |

---

## Specification issues (from the PRD, not AI failures)

These were found while implementing. They are listed so the deviations in the
code are explained, not to count them as AI mistakes.

1. **Timer name:** "Lab 2 HW 3's `createAntiDriftTimer`" does not exist. Lab 2
   HW 3 is the mega-sale simulator, and its drift-free timer is `createCountdown`
   in `LAB2/HW/megasale/source/countdown.js`. The hook was evolved from that file.
2. **Virtual Scroller:** "Reuse Lab 2's Virtual Scroller" is not possible,
   because there is no virtual scroller anywhere in the repository. The Lab 2
   data grid paginates. The new `VirtualList` follows the Lab 2 data-grid
   architecture instead: a pure, validated model (`virtualListUtils.js`, like
   `gridModel.js`) and a thin view. Lab 2's `normalizeSearchText` was ported for
   diacritic-insensitive squad search.
3. **Price format:** the PRD's example `1.500.000 ₫` contains a typed space, but
   `Intl.NumberFormat("vi-VN")` puts a no-break space (U+00A0) before `₫`. The
   AI checked the real output before writing tests, so no test was written
   against the wrong literal; the tests compare against ` `.
4. **Reference hook:** the PRD's reference hook keeps its 200 ms interval
   running after reaching zero, and does not validate its inputs (a `NaN`
   target would show `NaN`). The implementation stops ticking at zero and throws
   a `TypeError` for invalid arguments.
5. **Rollback snippet:** the PRD's snippet (`stock + 1` in `catch`) is not tied
   to a claim, so it could undo a unit twice. The PRD itself flags this as
   conceptual. It was implemented with one transaction per `claimId`.
6. **Server offset:** the course provides no time server, so `serverOffsetMs`
   is a fixed simulated value (+1.5 s), and the UI labels it "(simulated)".

---

## Conclusion

- **Most serious defects were invisible to the first test layer.**
  - The virtual list passed all 189 unit tests while not scrolling at all.
  - The countdown tests passed until they were repeated under load.
  - Two rollback tests passed whether the guard existed or not.
- **What caught each one:**
  - Measuring real layout in Edge.
  - Repeating browser runs (`--repeat-each`).
  - Breaking the code on purpose (mutation checks) to prove a test can fail.
- **Two habits came out of this work:**
  - A test is trusted only after it has been seen failing against broken code.
  - Layout behaviour is verified only in a real browser.
- **Final state:**
  - **Tests:** 189 unit tests pass, and 27 Edge tests pass 3 runs in a row
    (81/81).
  - **Accessibility:** axe-core reports 0 WCAG 2.2 AA violations on the whole
    page at 375, 768, 1024 and 1440 px.
  - **Scenarios:** the 12-scenario workflow from PRD 4 passes end to end in a
    single browser session.
