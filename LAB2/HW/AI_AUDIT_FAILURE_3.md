# AI Failure Audit — Vietnam Mega-Sale Flash Sale Simulator

Defects found in the plan (the eight Mega-Sale PRDs, T-01 to T-08) and in
the code and tests the AI assistant produced from it while building the
countdown, reservation state machine, expiring locks and checkout in
`megasale/`.

Every defect below actually happened in this repository and is backed by a
commit, a failing test or a quoted draft. The full evidence-backed audit
required by PRD 7 is `AI_FAILURE_AUDIT.md` at the repository root; this
file follows the format of `AI_AUDIT_FAILURE_1.md` and `_2.md`.

Tests: serve `LAB2/` (`python -m http.server 8765`) and open
`http://localhost:8765/HW/megasale/source/megaSale.test.html` (126 tests).
A "mutation check" means one line was changed on purpose, the suite was run
to confirm tests fail, and the line was restored.

## Defect 1 — The Plan Had No Way to Derive "Ended"

### Defect Description

PRD 1 FR-01 listed the campaign fields: name, product, original price, sale
price, initial inventory, **start** timestamp and lock duration. FR-03 then
required three statuses, UPCOMING, LIVE and ENDED, "derived from the
configured schedule". With only a start time, nothing in the configuration
says when the sale is over, so ENDED cannot be derived.

PRD 3 FR-02 later required every reservation to record a "product
identifier", which was also missing from the PRD 1 configuration.

### Diagnostic Method

The PRD 1 field list was checked against the status rules in FR-03 before
writing `saleStatus.js`, and the PRD 3 reservation metadata was checked
against the configuration when the reservation record was designed.

### Refactored Solution

`saleConfig.js` gained `endsAt` in T-01 (validated as epoch milliseconds
after `startsAt`) and `productId` in T-03 (lowercase letters, digits and
hyphens). The status rule is:

    now <  startsAt            -> UPCOMING
    startsAt <= now < endsAt   -> LIVE
    now >= endsAt              -> ENDED

Both additions are recorded in `megasale/report.md` (T-01 and T-03) as
deviations from the PRD field list.

---

## Defect 2 — Expiry That Did Not Check Whether the Lock Was Due

### Defect Description

The T-03 store (commit `15c0006`) expired a reservation whenever it was
asked to:

    function expire(id) {
        assertUsable();
        const record = find(id);
        transition(record.state, E.EXPIRE);
        inventory.release(record.quantity);
        return apply(record, E.EXPIRE);
    }

It never compared the clock with `expiresAt`. An early timer, a stale
callback or a wrong UI call could expire a valid lock and give its stock to
someone else while the shopper still held it. A repeated call threw an
error instead of doing nothing. Stock was not released twice, but only
because the transition table rejects `EXPIRED --EXPIRE-->`.

### Diagnostic Method

PRD 4 FR-02 and FR-03 require validity to come from the absolute expiry
timestamp and expiry to be idempotent. Reviewing `reservationStore.js`
against those rules while designing the T-04 expiry timer showed that
`expire()` met neither.

### Refactored Solution

In T-04 (commit `193b7f1`), `expire()` was replaced by `expireIfDue(id)`.
It changes state only when the reservation is LOCKED **and**
`now >= expiresAt`, and returns `{ expired: false }` for every other call,
so repeated checks are harmless. The expiry timer carries the reservation id
and the `expiresAt` it was armed for, and ignores anything that no longer
matches.

Verified by `locks.test.js` "expireIfDue is idempotent…" ("Not due yet: no
change", then exactly one release) and "validity comes from the absolute
expiry: 1 ms before is valid, at expiresAt it is not". A mutation that
releases stock without checking the state fails 33 tests.

---

## Defect 3 — Lock Expiry Trusted Timers to Run on Time

### Defect Description

Up to T-05 (commit `ef08772`), locks expired only through the store's
`setTimeout`, the display countdown's `setInterval` and the sweep at the
start of `reserve()`. Nothing checked the locks when the page came back
from the background:

    git show ef08772:LAB2/HW/megasale/source/mountMegaSale.js | grep -c visibilitychange
    0

Browsers throttle timers in hidden tabs and pause them during sleep. A
shopper who returned after their lock had run out still saw "Reserved
(locked)", and the units stayed reserved until a throttled timer
eventually fired. PRD 6 FR-05 requires expiry to be validated when the
application resumes.

### Diagnostic Method

`integration.test.js` was written first in T-06 and run against the T-05
code. The test "returning to the tab after the lock ran out expires it at
once, even if no timer has run" advances the fake clock past the lock,
fires no timer or tick, and dispatches `visibilitychange`. It failed:

    FAIL: … — No active reservation left: expected null, received LOCKED

### Refactored Solution

T-06 (commit `4d3905c`) added a `visibilitychange` handler that calls
`store.sweepExpired()` when the page becomes visible, and is removed on
dispose. Checkout, cancel and reserve already validated against the clock,
so correctness never depended on the timer; only the displayed state did.
The test passes, and it then fires the late timers and ticks to confirm
nothing more is released.

---

## Defect 4 — Assertions That Could Never Fail

### Defect Description

The "no DOM work per tick / per frame" checks were written like this
(committed in the audio tests in `ded4b61`; the same pattern was first
drafted for the Mega-Sale countdown in T-02):

    const observer = new MutationObserver(() => {});
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    frames.step(60);
    await wait(0);
    const records = observer.takeRecords();
    assertEqual(records.length, 0, "No DOM mutation in 60 frames");

A `MutationObserver` hands pending records to its callback in a
microtask. After the `await`, the empty callback has already received and
discarded them, so `takeRecords()` always returns `[]`. The test passes
whether or not the DOM changed: it could not catch a card re-rendered 20
times a second.

### Diagnostic Method

The T-02 test "ticks change only the countdown text" also asserts that
*some* records exist. It failed with `Countdown text was written` even
though the countdown text visibly changed: zero records came back when
there had to be some.

### Refactored Solution

The tests keep the records the callback receives:

    const seen = [];
    const observer = new MutationObserver((list) => seen.push(...list));
    const records = [...seen, ...observer.takeRecords()];

This was fixed in the Mega-Sale tests before the T-02 commit, and in the
audio tests in commit `a739d94`. Mutation checks now fail as they should:
re-rendering the card on every tick fails 5 tests; a DOM write on every
visualizer frame records 120 and 60 mutations.

---

## Defect 5 — Tests That Hung Instead of Failing

### Defect Description

Two tests awaited promises that could never settle.

(a) The T-03 duplicate-reservation test:

    let error;
    try { await handle.store.reserve({ quantity: 2, shopperId: "you" }); } catch (caught) { error = caught; }

With the duplicate check removed (a mutation check), the second
reservation waited on a processing gate nobody released.

(b) The first T-07 random-sequence test:

    else if (choice < 0.45 && active) await store.checkout(active.id);

When `active` was already CHECKING_OUT with a pending payment,
`checkout()` correctly returned the same pending promise (deduplication by
reservation id), and awaiting it blocked the loop that would have settled
the payment.

A hung test reports no failure, hides every later test and looks like a
broken runner rather than a defect.

### Diagnostic Method

The headless runner reported `timed out after 44 results` (a) and
`timed out after 116 results` (b). The last passing test name located the
hanging test, and reading its awaits showed the unsettled promise.

### Refactored Solution

(a) The await is raced against one event-loop turn, so an accepted
duplicate becomes an ordinary assertion failure (2 failing tests under the
mutation). (b) Only LOCKED reservations are awaited; a checkout already in
progress is observed through `.catch()` instead. The suite passes 124/124,
and later 126/126.

---

## Defect 6 — Tests That Passed for the Wrong Reason

### Defect Description

Three tests looked like coverage but checked nothing:

- **T-05 draft** "a reservation that does not belong to the sale is
  rejected". Both test stores generated the id `order-1`, so the test
  always looked up `"order-x"` and only proved that an unknown id is
  unknown. The campaign rule it named was never exercised.
- **T-06 draft** "dispose() removes the visibility listener". It asserted
  `sweeps.length === 0`, but nothing ever wrote to `sweeps`.
- **T-03** "submitting twice while processing reserves only once". It
  dispatched the second `submit` on a `<form>` that the first submit had
  already replaced with the "Reserving…" panel. Event delegation lives on
  the mount root, so the event never reached a handler, and the store was
  never asked twice.

### Diagnostic Method

Code review of each test before committing: tracing which ids the stores
create, whether the asserted array is ever written, and whether the target
element is still inside the delegation root.

### Refactored Solution

- The foreign-sale test was deleted. The report says the campaign-rule
  check is defensive and cannot be reached through the public API.
- The listener test now spies on `document.addEventListener` /
  `removeEventListener` and checks that the *same* listener is removed.
- The double-submit test checks both protection layers: the form is gone
  while RESERVING, and a direct second `store.reserve()` is rejected with
  `duplicate-reservation`.

---

## Defect 7 — Correct State, Misleading UI

### Defect Description

Up to T-05, the sale-end announcement was:

    setMessage(renderedStatus === SALE_STATUS.LIVE
        ? `The sale is live now. ...`
        : "The sale has ended.");

When the sale ends while a shopper holds a lock, the reservation stays
valid until its own expiry and can still be bought (PRD 6 FR-01). "The sale
has ended." tells the shopper the opposite.

Disabled controls also had no explanation. The Reserve button showed
"Opens at 00:05", "Sold out" or "Sale ended" with nothing linked to it, and
Checkout and Cancel were disabled during RESERVING and CHECKING_OUT with no
reason. This breaks PRD 6 FR-06 ("disable unavailable actions and explain
why").

### Diagnostic Method

Four T-06 integration tests failed against the T-05 code:

- "the sale ending during an active lock keeps the reservation and says so"
- "before the start: … reservations unavailable with a reason"
- "after the end, … refuses new reservations and explains why"
- "disabled Checkout and Cancel explain why …"

### Refactored Solution

In T-06 (commit `4d3905c`), the end announcement now reads "The sale has
ended. Your reservation of 2 units is still held until …; you can still
check out." Every disabled action has a visible reason
(`<p class="sale-reason">`) linked with `aria-describedby`, for example
"Reservations open when the sale starts at 00:05:01." or "Your payment is
being processed. You cannot cancel during payment; if it fails, your
reservation stays held." All four tests pass.

---

## Reviewed but Not Found

PRD 7 listed candidate failures to review. These did **not** occur in this
project, so they are not attributed to the AI. Mutation checks show the
tests would catch them if they were introduced:

- **Drift-prone countdown** (subtracting a fixed amount per tick).
  `countdown.js` has computed `Math.max(0, target - now())` since T-02.
  Computing remaining time from an interval counter instead fails 8 tests.
- **Checkout without an expiration check.** `beginCheckout` has checked
  `expiresAt` since T-03, and `completeCheckout` re-checks it since T-04.
  Removing either check fails 2 and 3 tests.
- **Duplicate checkout submissions.** `checkout(id)` deduplicates by
  reservation id. Removing that fails 1 test. Leaving the button enabled
  during payment fails 1 test, and the store still sells only once.
