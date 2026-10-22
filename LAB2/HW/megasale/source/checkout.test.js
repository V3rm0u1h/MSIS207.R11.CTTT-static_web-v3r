import { RESERVATION_STATE as S, RESERVATION_ERROR_CODES as CODES } from "./reservationMachine.js";
import { assertInventoryInvariant } from "./inventory.js";
import { createReservationStore } from "./reservationStore.js";
import { createSampleConfig, validateSaleConfig } from "./saleConfig.js";
import { manualTimer } from "./countdown.test.js";
import { test, assert, assertEqual, assertDeepEqual } from "../../source/testHarness.js";

// T-05 — checkout workflow and reservation finalization.

const START = Date.UTC(2026, 10, 10, 17, 0, 0);
const HOUR = 60 * 60 * 1000;
const LOCK_MS = 5 * 60 * 1000;

/** A store whose payments wait on payments[] gates (or succeed at once when none are queued). */
function setup({ inventory = 10, at = START + 1000 } = {}) {
    const { config } = validateSaleConfig({
        ...createSampleConfig(START, { startsInMs: 0, durationMs: HOUR }),
        initialInventory: inventory,
        lockDurationMs: LOCK_MS
    });
    const clock = { now: at };
    const timer = manualTimer();
    const payments = [];
    let paymentCalls = 0;
    let sequence = 0;
    const events = [];
    const store = createReservationStore({
        config,
        now: () => clock.now,
        createId: () => `order-${++sequence}`,
        process: () => Promise.resolve(),
        processCheckout: () => {
            paymentCalls += 1;
            return payments.length > 0 ? payments.shift() : Promise.resolve();
        },
        setTimeout: timer.setTimeout,
        clearTimeout: timer.clearTimeout
    });
    store.subscribe((change, stock) => {
        assertInventoryInvariant(stock);
        events.push(`${change.type}:${change.reservation.state}`);
    });
    /** Queue a payment the test settles: returns { pay, decline }. */
    function pendingPayment() {
        let pay;
        let decline;
        payments.push(new Promise((resolve, reject) => { pay = resolve; decline = reject; }));
        return { pay: () => pay(), decline: (reason = new Error("card declined")) => decline(reason) };
    }
    return { config, clock, timer, store, events, pendingPayment, get paymentCalls() { return paymentCalls; } };
}

async function outcome(promise) {
    try {
        return { value: await promise };
    } catch (error) {
        return { error };
    }
}

const flush = () => new Promise((resolve) => { setTimeout(resolve, 0); });

test("a valid checkout goes LOCKED -> CHECKING_OUT -> PURCHASED and moves reserved units to sold", async () => {
    const { store, events, clock } = setup();
    const lock = await store.reserve({ quantity: 3 });
    events.length = 0;
    const purchase = await store.checkout(lock.id);
    assertEqual(purchase.state, S.PURCHASED, "Purchased");
    assertEqual(purchase.purchasedAt, clock.now, "Purchase time recorded");
    assertDeepEqual(events, ["CHECKOUT:CHECKING_OUT", "CHECKOUT_SUCCEED:PURCHASED"], "Went through CHECKING_OUT");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 7, reserved: 0, sold: 3 }, "Sold");
    assertEqual(store.activeFor(), null, "Nothing active");
    assertEqual(store.pendingExpiryTimers, 0, "No expiry timer left");
});

test("eligibility: unknown, cancelled, expired and already-purchased reservations are rejected without a stock change", async () => {
    const { store, clock } = setup();
    assertEqual((await outcome(store.checkout("nope"))).error?.code, CODES.NOT_FOUND, "Unknown id");

    const cancelled = await store.reserve({ quantity: 1, shopperId: "a" });
    store.cancel(cancelled.id);
    assertEqual((await outcome(store.checkout(cancelled.id))).error?.code, CODES.INVALID_TRANSITION, "Cancelled");

    const purchased = await store.reserve({ quantity: 1, shopperId: "b" });
    await store.checkout(purchased.id);
    assertEqual((await outcome(store.checkout(purchased.id))).error?.code, CODES.ALREADY_PURCHASED, "Purchased once only");

    const expiring = await store.reserve({ quantity: 2, shopperId: "c" });
    clock.now = expiring.expiresAt;
    assertEqual((await outcome(store.checkout(expiring.id))).error?.code, CODES.EXPIRED, "At expiresAt: expired");
    assertEqual(store.get(expiring.id).state, S.EXPIRED, "Expired by the check");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 9, reserved: 0, sold: 1 }, "Only the one purchase counted");
});

test("checkout of a lock made during the sale still works after the sale ends, until the lock expires", async () => {
    const { store, clock, config } = setup({ at: START + HOUR - 1000 });
    const lock = await store.reserve({ quantity: 1 });
    clock.now = config.endsAt + 1000;
    const purchase = await store.checkout(lock.id);
    assertEqual(purchase.state, S.PURCHASED, "Campaign end does not void a valid lock");
});

test("repeated submissions while checking out return the same result and sell the units once", async () => {
    const setupResult = setup();
    const { store } = setupResult;
    const lock = await store.reserve({ quantity: 2 });
    const payment = setupResult.pendingPayment();
    const first = store.checkout(lock.id);
    const second = store.checkout(lock.id);
    const third = store.checkout(lock.id);
    assert(first === second && second === third, "Same promise: deduplicated by reservation id");
    assertEqual(setupResult.paymentCalls, 1, "One payment");
    payment.pay();
    const results = await Promise.all([first, second, third]);
    assert(results.every((result) => result.state === S.PURCHASED), "All see the purchase");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 8, reserved: 0, sold: 2 }, "Sold once");
    assertEqual((await outcome(store.checkout(lock.id))).error?.code, CODES.ALREADY_PURCHASED, "A later submission is refused");
});

test("a failed payment returns to LOCKED, keeps the stock reserved and allows another attempt", async () => {
    const setupResult = setup();
    const { store, timer } = setupResult;
    const lock = await store.reserve({ quantity: 2 });
    const payment = setupResult.pendingPayment();
    const attempt = store.checkout(lock.id);
    assertEqual(store.get(lock.id).state, S.CHECKING_OUT, "Checking out");
    payment.decline();
    const { error } = await outcome(attempt);
    assertEqual(error?.code, CODES.CHECKOUT_FAILED, "Clear failure");
    assertEqual(error.cause.message, "card declined", "Cause kept");
    assertEqual(store.get(lock.id).state, S.LOCKED, "Back to LOCKED");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 8, reserved: 2, sold: 0 }, "Still reserved, not sold");
    assertEqual(timer.pendingTimeouts, 1, "Expiry timer re-armed");
    const retry = await store.checkout(lock.id);
    assertEqual(retry.state, S.PURCHASED, "Second attempt succeeds");
});

test("a lock that expires during the payment ends EXPIRED, releases once and is not purchased", async () => {
    const setupResult = setup();
    const { store, clock } = setupResult;
    const lock = await store.reserve({ quantity: 3 });
    const payment = setupResult.pendingPayment();
    const attempt = store.checkout(lock.id);
    clock.now = lock.expiresAt + 1;
    payment.pay();
    assertEqual((await outcome(attempt)).error?.code, CODES.EXPIRED, "Rejected as expired");
    assertEqual(store.get(lock.id).state, S.EXPIRED, "Expired");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 10, reserved: 0, sold: 0 }, "Released, nothing sold");
});

test("a failed payment after the lock ran out ends EXPIRED, not LOCKED", async () => {
    const setupResult = setup();
    const { store, clock } = setupResult;
    const lock = await store.reserve({ quantity: 1 });
    const payment = setupResult.pendingPayment();
    const attempt = store.checkout(lock.id);
    clock.now = lock.expiresAt;
    payment.decline();
    assertEqual((await outcome(attempt)).error?.code, CODES.EXPIRED, "Reported as expired");
    assertEqual(store.get(lock.id).state, S.EXPIRED, "Not back to LOCKED");
    assertEqual(store.inventory.available, 10, "Released once");
});

test("cancelling is impossible while checking out; the outcome decides the stock", async () => {
    const setupResult = setup();
    const { store } = setupResult;
    const lock = await store.reserve({ quantity: 1 });
    const payment = setupResult.pendingPayment();
    const attempt = store.checkout(lock.id);
    assertEqual((await outcome(Promise.resolve().then(() => store.cancel(lock.id)))).error?.code, CODES.INVALID_TRANSITION, "No cancel mid-payment");
    payment.pay();
    await attempt;
    assertEqual(store.inventory.sold, 1, "Purchased");
});

test("after a purchase, the units stay sold through sweeps and late timers", async () => {
    const { store, clock, timer } = setup();
    const lock = await store.reserve({ quantity: 2 });
    await store.checkout(lock.id);
    clock.now = lock.expiresAt + HOUR;
    timer.fireTimeouts();
    store.sweepExpired();
    assertEqual(store.expireIfDue(lock.id).expired, false, "A purchase never expires");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 8, reserved: 0, sold: 2 }, "Unchanged");
    await flush();
});
