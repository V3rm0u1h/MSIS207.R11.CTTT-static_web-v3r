import { RESERVATION_STATE as S, RESERVATION_ERROR_CODES as CODES, ReservationError } from "./reservationMachine.js";
import { assertInventoryInvariant } from "./inventory.js";
import { createReservationStore } from "./reservationStore.js";
import { createSampleConfig, validateSaleConfig } from "./saleConfig.js";
import { manualTimer } from "./countdown.test.js";
import { test, assert, assertEqual, assertDeepEqual } from "../../source/testHarness.js";

// T-04 — expiring inventory locks.

const START = Date.UTC(2026, 10, 10, 17, 0, 0);
const LOCK_MS = 5 * 60 * 1000;

/**
 * A timer whose clearTimeout() does nothing: every callback ever scheduled can
 * still run, like a callback that was already queued when it was cleared.
 */
function leakyTimer() {
    const callbacks = [];
    return {
        setTimeout(callback, ms) { callbacks.push({ callback, ms }); return callbacks.length; },
        clearTimeout() {},
        fireAll() { for (const { callback } of callbacks.splice(0)) callback(); },
        get count() { return callbacks.length; }
    };
}

function setup({ inventory = 10, timer = manualTimer(), at = START + 1000 } = {}) {
    const { config } = validateSaleConfig({
        ...createSampleConfig(START, { startsInMs: 0, durationMs: 60 * 60 * 1000 }),
        initialInventory: inventory,
        lockDurationMs: LOCK_MS
    });
    const clock = { now: at };
    let sequence = 0;
    const gates = [];
    const releases = [];
    const store = createReservationStore({
        config,
        now: () => clock.now,
        createId: () => `lock-${++sequence}`,
        process: () => (gates.length > 0 ? gates.shift() : Promise.resolve()),
        setTimeout: timer.setTimeout,
        clearTimeout: timer.clearTimeout
    });
    // Record every release of stock and check the invariant after each change.
    let lastAvailable = store.inventory.available;
    store.subscribe((change, stock) => {
        assertInventoryInvariant(stock);
        if (stock.available > lastAvailable) releases.push(`${change.reservation.id}:${change.type}:+${stock.available - lastAvailable}`);
        lastAvailable = stock.available;
    });
    function hold() {
        let release;
        gates.push(new Promise((resolve) => { release = resolve; }));
        return () => release();
    }
    return { store, clock, timer, releases, hold, config };
}

async function rejection(fn) {
    try {
        await fn();
    } catch (error) {
        return error;
    }
    return null;
}

test("a successful reservation creates a lock: id, created and expiry timestamps, stock reserved, one timer", async () => {
    const { store, clock, timer } = setup();
    const lock = await store.reserve({ quantity: 3 });
    assertEqual(lock.id, "lock-1", "Unique id");
    assertEqual(lock.createdAt, clock.now, "Created at");
    assertEqual(lock.expiresAt, clock.now + LOCK_MS, "Absolute expiry = lock time + 5 minutes");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 7, reserved: 3, sold: 0 }, "Moved to reserved");
    assertEqual(store.pendingExpiryTimers, 1, "One expiry timer");
    assertDeepEqual(timer.timeoutDelays, [LOCK_MS], "Armed for the lock duration");
});

test("validity comes from the absolute expiry: 1 ms before is valid, at expiresAt it is not", async () => {
    const first = setup();
    const lockA = await first.store.reserve({ quantity: 1 });
    first.clock.now = lockA.expiresAt - 1;
    assertEqual(first.store.beginCheckout(lockA.id).state, S.CHECKING_OUT, "Still valid 1 ms before");

    const second = setup();
    const lockB = await second.store.reserve({ quantity: 1 });
    second.clock.now = lockB.expiresAt;
    const error = await rejection(() => second.store.beginCheckout(lockB.id));
    assertEqual(error?.code, CODES.EXPIRED, "Not eligible at the expiry time, although no timer has run");
    assertEqual(second.timer.pendingTimeouts, 0, "Its timer was cleared by the expiry");
});

test("the expiry timer expires a due lock, releases its stock and updates subscribers", async () => {
    const { store, clock, timer, releases } = setup();
    const lock = await store.reserve({ quantity: 4 });
    clock.now = lock.expiresAt;
    timer.fireTimeouts();
    assertEqual(store.get(lock.id).state, S.EXPIRED, "Expired");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 10, reserved: 0, sold: 0 }, "Released");
    assertDeepEqual(releases, ["lock-1:EXPIRE:+4"], "Released once, by the expiry");
    assertEqual(store.pendingExpiryTimers, 0, "No timer left");
});

test("a timer that fires early does not expire the lock; it re-arms for the time left", async () => {
    const { store, clock, timer } = setup();
    const lock = await store.reserve({ quantity: 1 });
    clock.now = lock.expiresAt - 1500;
    timer.fireTimeouts();
    assertEqual(store.get(lock.id).state, S.LOCKED, "Still locked");
    assertDeepEqual(timer.timeoutDelays, [1500], "Re-armed for the remaining 1.5 s");
});

test("a timer that fires late (sleeping device) still expires the lock exactly once", async () => {
    const { store, clock, timer, releases } = setup();
    const lock = await store.reserve({ quantity: 2 });
    clock.now = lock.expiresAt + 3 * 60 * 60 * 1000;
    timer.fireTimeouts();
    timer.fireTimeouts();
    assertEqual(store.get(lock.id).state, S.EXPIRED, "Expired");
    assertDeepEqual(releases, ["lock-1:EXPIRE:+2"], "One release");
});

test("expireIfDue is idempotent: repeated calls and a late timer release stock only once", async () => {
    const timer = leakyTimer();
    const { store, clock, releases } = setup({ timer });
    const lock = await store.reserve({ quantity: 3 });
    assertEqual(store.expireIfDue(lock.id).expired, false, "Not due yet: no change");
    clock.now = lock.expiresAt;
    assertEqual(store.expireIfDue(lock.id).expired, true, "First call expires");
    assertEqual(store.expireIfDue(lock.id).expired, false, "Second call does nothing");
    timer.fireAll();
    assertEqual(store.sweepExpired().length, 0, "A sweep finds nothing");
    assertEqual(store.inventory.available, 10, "Not 13: released once");
    assertDeepEqual(releases, ["lock-1:EXPIRE:+3"], "One release");
});

test("a stale expiry callback cannot touch a cancelled reservation or the newer one that replaced it", async () => {
    const timer = leakyTimer();
    const { store, clock, releases } = setup({ timer });
    const old = await store.reserve({ quantity: 2 });
    store.cancel(old.id);
    clock.now += 60_000;
    const replacement = await store.reserve({ quantity: 5 });
    // The old lock's callback runs after its expiry time, while the new lock is still valid.
    clock.now = old.expiresAt + 1;
    timer.fireAll();
    assertEqual(store.get(old.id).state, S.CANCELLED, "Old stays cancelled");
    assertEqual(store.get(replacement.id).state, S.LOCKED, "New lock untouched");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 5, reserved: 5, sold: 0 }, "Only the new lock is held");
    assertDeepEqual(releases, ["lock-1:CANCEL:+2"], "The cancel released once; nothing else");
});

test("a stale expiry callback cannot touch a purchased reservation", async () => {
    const timer = leakyTimer();
    const { store, clock } = setup({ timer });
    const lock = await store.reserve({ quantity: 2 });
    store.beginCheckout(lock.id);
    store.completeCheckout(lock.id);
    clock.now = lock.expiresAt + 10;
    timer.fireAll();
    assertEqual(store.expireIfDue(lock.id).expired, false, "Purchased cannot expire");
    assertEqual(store.get(lock.id).state, S.PURCHASED, "Still purchased");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 8, reserved: 0, sold: 2 }, "Sold stays sold");
});

test("cancelling releases the stock exactly once and blocks checkout", async () => {
    const { store, releases } = setup();
    const lock = await store.reserve({ quantity: 3 });
    store.cancel(lock.id);
    assertEqual((await rejection(() => store.cancel(lock.id)))?.code, CODES.INVALID_TRANSITION, "Second cancel rejected");
    assertEqual((await rejection(() => store.beginCheckout(lock.id)))?.code, CODES.INVALID_TRANSITION, "No checkout after cancel");
    assertEqual(store.expireIfDue(lock.id).expired, false, "Cancelled cannot expire");
    assertDeepEqual(releases, ["lock-1:CANCEL:+3"], "One release");
    assertEqual(store.pendingExpiryTimers, 0, "Timer cleared");
});

test("cancelling at the expiry time expires instead, and still releases once", async () => {
    const { store, clock, releases } = setup();
    const lock = await store.reserve({ quantity: 2 });
    clock.now = lock.expiresAt;
    assertEqual((await rejection(() => store.cancel(lock.id)))?.code, CODES.EXPIRED, "Reported as expired");
    assertEqual(store.get(lock.id).state, S.EXPIRED, "Expired, not cancelled");
    assertDeepEqual(releases, ["lock-1:EXPIRE:+2"], "One release");
});

test("stock of a lock that is due but whose timer was delayed is free for the next reservation", async () => {
    const { store, clock } = setup({ inventory: 2 });
    const first = await store.reserve({ quantity: 2, shopperId: "first" });
    clock.now = first.expiresAt + 1;
    // No timer has run (throttled tab), yet the next shopper is not told "sold out".
    const second = await store.reserve({ quantity: 2, shopperId: "second" });
    assertEqual(store.get(first.id).state, S.EXPIRED, "First lock expired by the sweep");
    assertEqual(second.state, S.LOCKED, "Second shopper got the stock");
    assertDeepEqual({ ...store.inventory }, { total: 2, available: 0, reserved: 2, sold: 0 }, "Consistent");
});

test("competing reservations for the last units never reserve more than is available", async () => {
    const { store, hold } = setup({ inventory: 3 });
    const releaseAll = [hold(), hold(), hold()];
    const attempts = ["a", "b", "c"].map((shopperId) => store.reserve({ quantity: 2, shopperId }).then(
        (lock) => lock.state,
        (error) => (error instanceof ReservationError ? error.code : "unexpected")
    ));
    releaseAll.forEach((release) => release());
    const outcomes = await Promise.all(attempts);
    assertDeepEqual(outcomes, [S.LOCKED, CODES.INSUFFICIENT_STOCK, CODES.INSUFFICIENT_STOCK], "One winner");
    assertDeepEqual({ ...store.inventory }, { total: 3, available: 1, reserved: 2, sold: 0 }, "No oversell");
});

test("checkout disarms the timer and a failed checkout re-arms it for the same expiry", async () => {
    const { store, clock, timer } = setup();
    const lock = await store.reserve({ quantity: 1 });
    store.beginCheckout(lock.id);
    assertEqual(store.pendingExpiryTimers, 0, "No timer while checking out");
    clock.now += 60_000;
    store.failCheckout(lock.id);
    assertEqual(store.pendingExpiryTimers, 1, "Re-armed after returning to LOCKED");
    assertDeepEqual(timer.timeoutDelays, [LOCK_MS - 60_000], "For the original expiry, not a fresh 5 minutes");
});

test("dispose() clears every expiry timer", async () => {
    const { store, timer } = setup();
    await store.reserve({ quantity: 1, shopperId: "a" });
    await store.reserve({ quantity: 1, shopperId: "b" });
    assertEqual(timer.pendingTimeouts, 2, "Two timers");
    store.dispose();
    assertEqual(timer.pendingTimeouts, 0, "Cleared");
});
