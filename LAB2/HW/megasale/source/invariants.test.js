import { RESERVATION_STATE as S, RESERVATION_ERROR_CODES as CODES, ReservationError, isActiveState } from "./reservationMachine.js";
import { assertInventoryInvariant } from "./inventory.js";
import { createReservationStore } from "./reservationStore.js";
import { createSampleConfig, validateSaleConfig } from "./saleConfig.js";
import { manualTimer } from "./countdown.test.js";
import { test, assert, assertEqual, assertDeepEqual } from "../../source/testHarness.js";

// T-07 — inventory invariants under random operation sequences, and the PRD 7 race scenarios.

const START = Date.UTC(2026, 10, 10, 17, 0, 0);
const HOUR = 60 * 60 * 1000;
const LOCK_MS = 5 * 60 * 1000;

/** Small deterministic PRNG (mulberry32) so a failing sequence can be replayed from its seed. */
function random(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function setup({ inventory = 6, at = START + 1000 } = {}) {
    const { config } = validateSaleConfig({
        ...createSampleConfig(START, { startsInMs: 0, durationMs: HOUR }),
        initialInventory: inventory,
        lockDurationMs: LOCK_MS
    });
    const clock = { now: at };
    const timer = manualTimer();
    const payments = [];
    let sequence = 0;
    const store = createReservationStore({
        config,
        now: () => clock.now,
        createId: () => `r${++sequence}`,
        process: () => Promise.resolve(),
        processCheckout: () => (payments.length > 0 ? payments.shift() : Promise.resolve()),
        setTimeout: timer.setTimeout,
        clearTimeout: timer.clearTimeout
    });
    return { config, clock, timer, store, payments };
}

/**
 * The books must balance, and they must agree with the reservations:
 * reserved = units of LOCKED + CHECKING_OUT, sold = units of PURCHASED.
 */
function checkBooks(store, label) {
    const stock = store.inventory;
    assertInventoryInvariant(stock);
    const reservations = store.list();
    const held = reservations.filter((r) => r.state === S.LOCKED || r.state === S.CHECKING_OUT).reduce((sum, r) => sum + r.quantity, 0);
    const sold = reservations.filter((r) => r.state === S.PURCHASED).reduce((sum, r) => sum + r.quantity, 0);
    assertEqual(stock.reserved, held, `${label}: reserved matches held locks`);
    assertEqual(stock.sold, sold, `${label}: sold matches purchases`);
    const activePerShopper = new Map();
    for (const r of reservations.filter((item) => isActiveState(item.state))) {
        activePerShopper.set(r.shopperId, (activePerShopper.get(r.shopperId) ?? 0) + 1);
    }
    assert([...activePerShopper.values()].every((count) => count <= 1), `${label}: at most one active reservation per shopper`);
}

test("random operation sequences keep total = available + reserved + sold and match the reservations (20 seeds × 60 steps)", async () => {
    const seen = new Set();
    for (let seed = 1; seed <= 20; seed += 1) {
        const next = random(seed);
        const { store, clock, timer, payments } = setup({ inventory: 1 + Math.floor(next() * 8) });
        store.subscribe((change) => seen.add(change.type));
        const shoppers = ["a", "b", "c", "d"];
        const pick = (items) => items[Math.floor(next() * items.length)];
        // Payments that stay pending across steps, so locks can expire and other
        // operations can run while a checkout is in progress.
        const openPayments = [];
        const unexpected = [];
        const watch = (promise, label) => promise.catch((error) => {
            if (!(error instanceof ReservationError)) unexpected.push(`${label}: ${error.message}`);
        });
        for (let step = 0; step < 60; step += 1) {
            const shopperId = pick(shoppers);
            const active = store.activeFor(shopperId);
            const choice = next();
            const label = `seed ${seed}, step ${step}`;
            try {
                if (choice < 0.25) await store.reserve({ quantity: 1 + Math.floor(next() * 3), shopperId });
                else if (choice < 0.35 && active) store.cancel(active.id);
                else if (choice < 0.45 && active) {
                    // A LOCKED reservation pays at once. One already checking out gets the
                    // pending promise back (deduplicated), so it is watched, not awaited.
                    if (active.state === S.LOCKED) await store.checkout(active.id);
                    else watch(store.checkout(active.id), label);
                }
                else if (choice < 0.55 && active && active.state === S.LOCKED) {
                    let settlePayment;
                    payments.push(new Promise((resolve, reject) => { settlePayment = { resolve, reject }; }));
                    watch(store.checkout(active.id), label);
                    openPayments.push(settlePayment);
                } else if (choice < 0.65 && openPayments.length > 0) {
                    const payment = openPayments.splice(Math.floor(next() * openPayments.length), 1)[0];
                    if (next() < 0.7) payment.resolve(); else payment.reject(new Error("declined"));
                    await Promise.resolve();
                    await Promise.resolve();
                } else if (choice < 0.72 && active) store.expireIfDue(active.id);
                else if (choice < 0.82) timer.fireTimeouts();
                else if (choice < 0.9) store.sweepExpired();
                else clock.now += Math.floor(next() * LOCK_MS * 1.5); // time passes, sometimes past locks
            } catch (error) {
                assert(error instanceof ReservationError, `${label}: only business rejections expected, got ${error.message}`);
            }
            checkBooks(store, label);
            // A random time step between operations, so locks expire at random points.
            clock.now += Math.floor(next() * 20_000);
        }
        // Finish what is still open, then check once more.
        for (const payment of openPayments.splice(0)) payment.resolve();
        await new Promise((resolve) => { setTimeout(resolve, 0); });
        checkBooks(store, `seed ${seed}, end`);
        assertEqual(unexpected.length, 0, `seed ${seed}: ${unexpected.join("; ")}`);
    }
    // Not vacuous: the sequences really went through every stock-moving transition.
    for (const type of ["CONFIRM", "CANCEL", "EXPIRE", "CHECKOUT_SUCCEED"]) assert(seen.has(type), `Sequences exercised ${type}`);
});

test("every operation type leaves the books balanced: reserve, insufficient stock, cancel, expiry, purchase, failed payment", async () => {
    const { store, clock, payments } = setup({ inventory: 5 });
    const steps = [];
    const record = (label) => { checkBooks(store, label); steps.push(`${label}:${JSON.stringify({ ...store.inventory })}`); };
    const a = await store.reserve({ quantity: 2, shopperId: "a" }); record("reserve");
    try { await store.reserve({ quantity: 4, shopperId: "b" }); } catch (error) { assertEqual(error.code, CODES.INSUFFICIENT_STOCK, "Rejected"); }
    record("insufficient");
    store.cancel(a.id); record("cancel");
    const b = await store.reserve({ quantity: 3, shopperId: "b" });
    clock.now = b.expiresAt;
    store.expireIfDue(b.id); record("expiry");
    const c = await store.reserve({ quantity: 1, shopperId: "c" });
    payments.push(Promise.reject(new Error("declined")));
    try { await store.checkout(c.id); } catch (error) { assertEqual(error.code, CODES.CHECKOUT_FAILED, "Failed payment"); }
    record("failed-payment");
    await store.checkout(c.id); record("purchase");
    assertDeepEqual(steps, [
        'reserve:{"total":5,"available":3,"reserved":2,"sold":0}',
        'insufficient:{"total":5,"available":3,"reserved":2,"sold":0}',
        'cancel:{"total":5,"available":5,"reserved":0,"sold":0}',
        'expiry:{"total":5,"available":5,"reserved":0,"sold":0}',
        'failed-payment:{"total":5,"available":4,"reserved":1,"sold":0}',
        'purchase:{"total":5,"available":4,"reserved":0,"sold":1}'
    ], "Exact stock after each operation");
});

test("race: two shoppers compete for the final unit; exactly one gets it", async () => {
    const { store } = setup({ inventory: 1 });
    const results = await Promise.allSettled([
        store.reserve({ quantity: 1, shopperId: "first" }),
        store.reserve({ quantity: 1, shopperId: "second" })
    ]);
    assertDeepEqual(results.map((r) => r.status), ["fulfilled", "rejected"], "One winner");
    assertEqual(results[1].reason.code, CODES.INSUFFICIENT_STOCK, "Loser told it is gone");
    assertEqual(store.list().filter((r) => r.state === S.IDLE).length, 1, "Loser failed back to IDLE");
    checkBooks(store, "final unit");
    assertEqual(store.inventory.available, 0, "Not oversold");
});

test("race: the expiry timer fires during a payment; the payment outcome decides, stock moves once", async () => {
    const { store, clock, timer, payments } = setup();
    const lock = await store.reserve({ quantity: 2 });
    let pay;
    payments.push(new Promise((resolve) => { pay = resolve; }));
    const attempt = store.checkout(lock.id);
    clock.now = lock.expiresAt - 1;
    timer.fireTimeouts(); // nothing armed while CHECKING_OUT
    assertEqual(store.get(lock.id).state, S.CHECKING_OUT, "Untouched by timers");
    pay();
    assertEqual((await attempt).state, S.PURCHASED, "Paid before expiry: purchased");
    checkBooks(store, "after payment");
});

test("race: expiry and cancel in the same moment release the units once", async () => {
    const { store, clock, timer } = setup();
    const lock = await store.reserve({ quantity: 3 });
    clock.now = lock.expiresAt;
    let cancelError = null;
    try { store.cancel(lock.id); } catch (error) { cancelError = error; }
    timer.fireTimeouts();
    store.expireIfDue(lock.id);
    store.sweepExpired();
    assertEqual(cancelError?.code, CODES.EXPIRED, "Cancel at the expiry time reports the expiry");
    assertEqual(store.inventory.available, 6, "Released once (not 9)");
    checkBooks(store, "expiry + cancel");
});

test("race: repeated checkout submissions during and after a payment sell once", async () => {
    const { store, payments } = setup();
    const lock = await store.reserve({ quantity: 2 });
    let pay;
    payments.push(new Promise((resolve) => { pay = resolve; }));
    const attempts = [store.checkout(lock.id), store.checkout(lock.id), store.checkout(lock.id)];
    pay();
    await Promise.all(attempts);
    const later = await Promise.allSettled([store.checkout(lock.id), store.checkout(lock.id)]);
    assert(later.every((r) => r.status === "rejected" && r.reason.code === CODES.ALREADY_PURCHASED), "Later submissions refused");
    assertEqual(store.inventory.sold, 2, "Sold once");
    checkBooks(store, "repeated checkout");
});

test("a purchased reservation cannot be finalized again through the low-level calls either", async () => {
    const { store } = setup();
    const lock = await store.reserve({ quantity: 1 });
    await store.checkout(lock.id);
    let error = null;
    try { store.completeCheckout(lock.id); } catch (caught) { error = caught; }
    assertEqual(error?.code, CODES.INVALID_TRANSITION, "PURCHASED has no way out");
    assertEqual(store.inventory.sold, 1, "Still one sold");
});

test("race: a stale expiry callback after the reservation was replaced leaves the new one alone", async () => {
    const { config, clock } = setup();
    const callbacks = [];
    // Capture the old lock's timer callback before it is cleared, then run it late.
    const leaky = createReservationStore({
        config,
        now: () => clock.now,
        createId: (() => { let n = 0; return () => `s${++n}`; })(),
        process: () => Promise.resolve(),
        setTimeout: (callback) => { callbacks.push(callback); return callbacks.length; },
        clearTimeout: () => {}
    });
    const old = await leaky.reserve({ quantity: 2 });
    leaky.cancel(old.id);
    const replacement = await leaky.reserve({ quantity: 2 });
    clock.now = old.expiresAt + 1;
    callbacks[0]();
    assertEqual(leaky.get(replacement.id).state, S.LOCKED, "Replacement untouched");
    assertEqual(leaky.inventory.reserved, 2, "Its units still reserved");
    checkBooks(leaky, "stale callback");
});
