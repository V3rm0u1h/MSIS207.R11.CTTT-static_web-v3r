# AI Failure Mode Audit — Vietnam Mega-Sale Simulator

Project: `LAB2/HW/megasale/` (Mini-React flash-sale simulator). Report:
`LAB2/HW/megasale/report.md`.

Scope and integrity: the code and tests in this project were written by an
AI coding assistant (Claude, in Claude Code) working from the eight PRDs.
Every failure below is something that assistant actually produced in this
repository and that was then found by a failing test, a mutation check or
code review. Each one has evidence: a commit, a test name, or a quoted
draft. Candidate failures from PRD 7 that did **not** occur are listed
separately at the end, and are not attributed to the AI.

How to verify: serve `LAB2/` (`python -m http.server 8765` inside `LAB2`)
and open `http://localhost:8765/HW/megasale/source/megaSale.test.html`.
Mutation checks mean: change one line on purpose, run the suite, confirm
tests fail, restore the line.

---

## 1. Expiry that does not check whether the lock is due

**AI-generated code** (T-03, commit `15c0006`, `reservationStore.js`):

```js
/** LOCKED | CHECKING_OUT -> EXPIRED: reserved stock goes back to available. */
function expire(id) {
    assertUsable();
    const record = find(id);
    transition(record.state, E.EXPIRE);
    inventory.release(record.quantity);
    return apply(record, E.EXPIRE);
}
```

**Why it is flawed.** The function expires any LOCKED reservation the
moment it is called; it never compares the clock with `expiresAt`. A timer
that fires early, a stale callback or a mistaken UI call could expire a
valid lock and release its stock while the shopper still holds it. It
also *throws* on a repeat call instead of doing nothing. Double release is
blocked, but only because the transition table rejects
`EXPIRED --EXPIRE-->`; that makes repeated expiry checks fragile rather
than idempotent.

**Potential impact.** A shopper loses a reservation before the promised 5
minutes; the units go to someone else. Expiry callers must wrap every call
in `try/catch`.

**Correction** (T-04, commit `193b7f1`). `expire()` was removed.
`expireIfDue(id)` changes state only when the reservation is LOCKED **and**
`now >= expiresAt`. It returns `{ expired: false }` for every other call,
so repeated checks are no-ops. The expiry timer carries the reservation id
and the `expiresAt` it was armed for, and ignores anything that no longer
matches.

**Verification.**
- `locks.test.js`, "expireIfDue is idempotent: repeated calls and a late
  timer release stock only once": "Not due yet: no change", then one
  release only.
- `locks.test.js`, "validity comes from the absolute expiry: 1 ms before is
  valid, at expiresAt it is not".
- Mutation: an expiry that releases stock without checking the state →
  33 failing tests.

---

## 2. Lock expiry that trusts timers to run on time

**AI-generated code** (T-04/T-05, up to commit `ef08772`,
`mountMegaSale.js`). Locks expired only through the store's `setTimeout`,
the display countdown's `setInterval`, or the sweep at the start of
`reserve()`. There was no check when the page came back from the
background (`git show ef08772:LAB2/HW/megasale/source/mountMegaSale.js |
grep -c visibilitychange` → `0`).

**Why it is flawed.** Browsers throttle or pause timers in hidden tabs and
during device sleep. When the shopper returned after the lock had run out,
the card still said "Reserved (locked)" and the units stayed reserved
until a throttled timer eventually fired. PRD 6 FR-05 requires expiry to be
validated "when the application resumes", and the UI must not show an
obsolete state.

**Potential impact.** The shopper sees a reservation that no longer exists
and stock that is not really available. Pressing Checkout is then
rejected, which is confusing.

**Correction** (T-06, commit `4d3905c`). A `visibilitychange` handler
calls `store.sweepExpired()` when the page becomes visible, and is removed
on dispose. Checkout, cancel and reserve already validate against the
clock, so correctness never depended on the timer. Only the displayed
state did.

**Verification.** `integration.test.js`, "returning to the tab after the
lock ran out expires it at once, even if no timer has run". Run against the
T-05 code, it failed with `No active reservation left: expected null,
received LOCKED`; it passes after the fix. The same test then fires the late
timers and ticks and checks that nothing more is released.

---

## 3. Assertions that can never fail (DOM-mutation checks)

**AI-generated test code** (audio visualizer, committed in `ded4b61`; the
same pattern was first written for the Mega-Sale countdown in T-02):

```js
const observer = new MutationObserver(() => {});
observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
frames.step(60);
await wait(0);
const records = observer.takeRecords();
assertEqual(records.length, 0, "No DOM mutation in 60 frames");
```

**Why it is flawed.** A `MutationObserver` hands its pending records to its
callback in a microtask. After `await`, the empty callback has already
received and discarded them, so `takeRecords()` always returns `[]`. The
assertion passes whether or not the DOM changed.

**Potential impact.** The tests claimed to prove "no full re-render per
tick / per frame" (PRD 2 FR-05, audio PRD 4 FR-04) while proving nothing.
A regression that re-rendered the card 20 times a second would have
shipped green.

**Correction.** Records are kept in the callback as well:

```js
const seen = [];
const observer = new MutationObserver((list) => seen.push(...list));
// ...
const records = [...seen, ...observer.takeRecords()];
```

Fixed in the Mega-Sale tests before the T-02 commit and in the audio tests
in commit `a739d94`.

**Verification.** The flaw showed itself in the T-02 test "ticks change
only the countdown text": it failed with `Countdown text was written`
because zero records were seen even though the text visibly changed. After
the fix, mutations that add DOM work fail as they should: card re-rendered
on every tick → 5 failing tests; a DOM write on every visualizer frame →
120 and 60 recorded mutations in two tests.

---

## 4. Tests that hang instead of failing

**AI-generated test code.**

(a) T-03 duplicate test (before commit `15c0006`):

```js
let error;
try { await handle.store.reserve({ quantity: 2, shopperId: "you" }); } catch (caught) { error = caught; }
```

(b) T-07 random-sequence test (draft):

```js
else if (choice < 0.45 && active) await store.checkout(active.id);
```

**Why it is flawed.** Both awaits can wait on a promise that never
settles. In (a), with the duplicate check removed, the second reservation
waited on a processing gate that nobody released. In (b), when `active`
was already CHECKING_OUT with a deferred payment, `checkout()` correctly
returned the same pending promise (deduplication), and awaiting it blocked
the loop that would have settled the payment.

**Potential impact.** The test run never finishes. A hang reports no
failure, hides every later test and looks like a broken runner rather
than a defect.

**Correction.** (a) The await is raced against one event-loop turn, so an
accepted duplicate becomes a normal assertion failure. (b) Only LOCKED
reservations are awaited; a checkout already in progress is observed, not
awaited.

**Verification.** (a) With the duplicate check removed, the run first
stopped at "timed out after 44 results". After the fix it reports 2
failing tests. (b) The unmutated suite first stopped at "timed out after
116 results"; after the fix it passes 124/124.

---

## 5. Tests that pass for the wrong reason

**AI-generated drafts** (caught in review before commit).

(a) T-05 "a reservation that does not belong to the sale is rejected":

```js
const other = setup();
const foreign = await other.store.reserve({ quantity: 1 });
assertEqual((await outcome(store.checkout(foreign.id === lock.id ? "order-x" : foreign.id))).error?.code,
    CODES.NOT_FOUND, "Another store's reservation is unknown here");
```

(b) T-06 "dispose() removes the visibility listener":

```js
const sweeps = [];
ui.handle.dispose();
returnToTab();
assertEqual(sweeps.length, 0, "Nothing ran");
```

(c) T-03 "submitting twice while processing reserves only once" dispatched
the second `submit` on a `<form>` the first submit had already removed from
the page.

**Why it is flawed.** (a) Both stores generate the id `order-1`, so the
test always looks up `"order-x"` and only checks that an unknown id is
unknown; the campaign rule it names is never exercised. (b) Nothing ever
writes to `sweeps`, so the assertion is always true. (c) Event delegation
lives on the mount root, so an event on a detached form never reaches a
handler; the test "passed" the duplicate check without the store being
asked twice.

**Potential impact.** Requirements look covered when they are not: the
campaign eligibility rule, listener cleanup and duplicate protection.

**Correction.** (a) The test was deleted. The report states that the
campaign-rule check is defensive and cannot be reached through the public
API. (b) The test now spies on `document.addEventListener` /
`removeEventListener` and checks the *same* listener is removed. (c) The
test checks both protection layers explicitly: the form is gone while
RESERVING, and a direct second `store.reserve()` is rejected as
`duplicate-reservation`.

**Verification.** Code inspection of the drafts above. The replacement
tests fail under mutation: with the duplicate check removed, 2 tests fail.
The listener test fails if `dispose()` does not remove the listener; it
checks `removed[0] === added[0]`.

---

## 6. UI states that are technically correct but misleading

**AI-generated code** (T-02 to T-05, up to commit `ef08772`):

```js
setMessage(renderedStatus === SALE_STATUS.LIVE
    ? `The sale is live now. ...`
    : "The sale has ended.");
```

Disabled buttons also had no explanation: the Reserve button showed
"Opens at 00:05", "Sold out" or "Sale ended" with nothing linked to it, and
Checkout and Cancel were disabled during RESERVING and CHECKING_OUT with no
reason given.

**Why it is flawed.** When the sale ends while a shopper holds a lock,
the reservation stays valid until its own expiry and can still be
purchased (PRD 6 FR-01). "The sale has ended." tells the shopper the
opposite. Disabled controls without a reason break PRD 6 FR-06 ("disable
unavailable actions and explain why").

**Potential impact.** Shoppers abandon reservations they could still buy.
Screen-reader users meet dimmed buttons with no explanation.

**Correction** (T-06, commit `4d3905c`). The end announcement says "The
sale has ended. Your reservation of 2 units is still held until …; you can
still check out." Every disabled action has a visible reason
(`<p class="sale-reason">`) linked with `aria-describedby`.

**Verification.** Four `integration.test.js` tests failed against the T-05
code and pass after the fix:
- "the sale ending during an active lock keeps the reservation and says so"
- "before the start: … reservations unavailable with a reason"
- "after the end, … refuses new reservations and explains why"
- "disabled Checkout and Cancel explain why …"

---

## Reviewed candidates that did not occur

PRD 7 FR-06 lists these as review candidates. They were checked and **not**
found in the AI-generated implementation, so they are not counted above.
Mutation checks show the test suite would catch them if they were
introduced.

| Candidate | Finding | Evidence |
| --- | --- | --- |
| A — Drift-prone countdown (`remaining -= 50` per tick) | Not produced. `countdown.js` has computed `Math.max(0, target - now())` on every update since T-02 (`63ca5a2`). | Mutation "remaining time from `firstTick + updates × 50 ms`" → 8 failing tests, including "a delayed callback … shows the true remaining time" |
| C — Checkout without expiration validation | Not produced. `beginCheckout` has checked `expiresAt` since T-03 (`15c0006`), and `completeCheckout` re-checks it since T-04. | Mutations "beginCheckout trusts LOCKED" → 2 failing tests; "completeCheckout does not re-check the expiry" → 3 |
| Independent UI inventory counters | Not produced: the card always read `store.inventory`. A related weakness was fixed in T-06: the purchase confirmation kept a snapshot copy, and is now read from the store by id. | `integration.test.js`, "the purchase confirmation always reflects the store's record" |
| Duplicate checkout submissions | Not produced: `checkout(id)` deduplicates by reservation id (T-05). | Mutation "no deduplication" → 1 failing test; "checkout button stays enabled" → 1 failing test, while the store still sold once |
| Client-side lock treated as a distributed lock | Not claimed: every report section and the store's header comment state that this is in-process consistency for one page only. | `reservationStore.js` header; `report.md` T-03 / T-04 "Scope" and "Limitation" |
| Timers or listeners not cleaned up | Not produced for the store timers, countdown intervals or the visibility listener. | `locks.test.js` "dispose() clears every expiry timer"; `countdown.test.js` lifecycle tests; `integration.test.js` listener test |
