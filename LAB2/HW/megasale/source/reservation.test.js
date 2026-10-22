import {
    RESERVATION_STATE as S,
    RESERVATION_EVENT as E,
    RESERVATION_ERROR_CODES as CODES,
    ReservationError,
    TRANSITIONS,
    transition,
    canTransition,
    isActiveState,
    isTerminalState
} from "./reservationMachine.js";
import { createInventory, assertInventoryInvariant } from "./inventory.js";
import { createReservationStore } from "./reservationStore.js";
import { createSampleConfig, validateSaleConfig } from "./saleConfig.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType } from "../../source/testHarness.js";
import { manualTimer } from "./countdown.test.js";

// T-03 — reservation state machine, inventory accounting and the authoritative store.

const START = Date.UTC(2026, 10, 10, 17, 0, 0);
const LOCK_MS = 5 * 60 * 1000;

/** Run fn and return the ReservationError it throws (or rejects with). */
async function expectReservationError(fn, code) {
    let error;
    try {
        await fn();
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof ReservationError, `Expected ReservationError(${code}), received ${error}`);
    assertEqual(error.code, code, "Error code");
    assert(error.message.length > 0, "Readable message");
    return error;
}

/** A store on a fake clock; process() resolves at once unless a gate is set. */
function setup({ inventory = 10, at = START + 1000, configOverrides = {} } = {}) {
    const { config } = validateSaleConfig({
        ...createSampleConfig(START, { startsInMs: 0, durationMs: 60 * 60 * 1000 }),
        initialInventory: inventory,
        lockDurationMs: LOCK_MS,
        ...configOverrides
    });
    const clock = { now: at };
    const timer = manualTimer();
    let sequence = 0;
    const gates = [];
    const changes = [];
    const store = createReservationStore({
        config,
        now: () => clock.now,
        createId: () => `res-${++sequence}`,
        process: () => (gates.length > 0 ? gates.shift() : Promise.resolve()),
        setTimeout: timer.setTimeout,
        clearTimeout: timer.clearTimeout
    });
    store.subscribe((change, stock) => {
        // Recorded, not thrown: the store would only log a throwing listener.
        try {
            assertInventoryInvariant(stock);
        } catch (error) {
            changes.push(`INVARIANT BROKEN: ${error.message}`);
        }
        changes.push(`${change.type}:${change.reservation.id}:${change.reservation.state}`);
    });
    /** Make the next process() wait until the returned release() is called. */
    function hold() {
        let release;
        let fail;
        gates.push(new Promise((resolve, reject) => { release = resolve; fail = reject; }));
        return { release: () => release(), fail: (error) => fail(error) };
    }
    return { config, clock, store, changes, hold, timer };
}

// --- State machine ---

test("the machine defines exactly the seven reservation states", () => {
    assertDeepEqual(Object.keys(S), ["IDLE", "RESERVING", "LOCKED", "CHECKING_OUT", "PURCHASED", "EXPIRED", "CANCELLED"], "States");
    assertDeepEqual(Object.keys(TRANSITIONS), Object.keys(S), "Every state has a transition row");
    assert(Object.isFrozen(TRANSITIONS) && Object.isFrozen(TRANSITIONS.LOCKED), "Table cannot be changed");
});

test("every transition listed in the PRD is allowed", () => {
    const expected = [
        [S.IDLE, E.REQUEST, S.RESERVING],
        [S.RESERVING, E.CONFIRM, S.LOCKED],
        [S.RESERVING, E.FAIL, S.IDLE],
        [S.LOCKED, E.CHECKOUT, S.CHECKING_OUT],
        [S.LOCKED, E.EXPIRE, S.EXPIRED],
        [S.LOCKED, E.CANCEL, S.CANCELLED],
        [S.CHECKING_OUT, E.CHECKOUT_SUCCEED, S.PURCHASED],
        [S.CHECKING_OUT, E.CHECKOUT_FAIL, S.LOCKED],
        [S.CHECKING_OUT, E.EXPIRE, S.EXPIRED]
    ];
    for (const [from, event, to] of expected) assertEqual(transition(from, event), to, `${from} --${event}-->`);
    const allowed = Object.values(TRANSITIONS).reduce((count, row) => count + Object.keys(row).length, 0);
    assertEqual(allowed, expected.length, "No transitions beyond the PRD list");
});

test("every other (state, event) pair is rejected, including purchasing an expired or cancelled reservation", async () => {
    let rejected = 0;
    for (const state of Object.values(S)) {
        for (const event of Object.values(E)) {
            if (canTransition(state, event)) continue;
            await expectReservationError(() => transition(state, event), CODES.INVALID_TRANSITION);
            rejected += 1;
        }
    }
    assertEqual(rejected, 7 * 8 - 9, "All 47 invalid pairs rejected");
    for (const state of [S.EXPIRED, S.CANCELLED]) {
        assert(!canTransition(state, E.CHECKOUT) && !canTransition(state, E.CHECKOUT_SUCCEED), `${state} can never be purchased`);
    }
    assertThrowsType(() => transition("SHIPPED", E.CANCEL), /unknown state/);
    assertThrowsType(() => transition(S.LOCKED, "PAY"), /unknown event/);
});

test("active and terminal states are classified", () => {
    assertDeepEqual(Object.values(S).filter(isActiveState), [S.RESERVING, S.LOCKED, S.CHECKING_OUT], "Active");
    assertDeepEqual(Object.values(S).filter(isTerminalState), [S.PURCHASED, S.EXPIRED, S.CANCELLED], "Terminal");
    for (const state of Object.values(S).filter(isTerminalState)) {
        assertDeepEqual(Object.keys(TRANSITIONS[state]), [], `${state} has no way out`);
    }
});

// --- Inventory ---

test("inventory starts with everything available and keeps total = available + reserved + sold", () => {
    const inventory = createInventory(10);
    assertDeepEqual({ ...inventory.snapshot() }, { total: 10, available: 10, reserved: 0, sold: 0 }, "Start");
    assertDeepEqual({ ...inventory.reserve(3) }, { total: 10, available: 7, reserved: 3, sold: 0 }, "Reserve");
    assertDeepEqual({ ...inventory.commit(2) }, { total: 10, available: 7, reserved: 1, sold: 2 }, "Sell");
    assertDeepEqual({ ...inventory.release(1) }, { total: 10, available: 8, reserved: 0, sold: 2 }, "Release");
    assert(Object.isFrozen(inventory.snapshot()), "Snapshots are read-only");
});

test("inventory rejects bad quantities and overdrafts without changing any count", async () => {
    const inventory = createInventory(2);
    for (const quantity of [0, -1, 1.5, "1", Number.NaN]) {
        await expectReservationError(() => inventory.reserve(quantity), CODES.INVALID_QUANTITY);
    }
    await expectReservationError(() => inventory.reserve(3), CODES.INSUFFICIENT_STOCK);
    await expectReservationError(() => inventory.release(1), CODES.INSUFFICIENT_STOCK);
    await expectReservationError(() => inventory.commit(1), CODES.INSUFFICIENT_STOCK);
    assertDeepEqual({ ...inventory.snapshot() }, { total: 2, available: 2, reserved: 0, sold: 0 }, "Unchanged");
    assertThrowsType(() => createInventory(-1), /non-negative integer/);
    assertThrowsType(() => createInventory(2.5), /non-negative integer/);
});

test("the invariant check catches broken snapshots", () => {
    let message = "";
    try { assertInventoryInvariant({ total: 5, available: 3, reserved: 1, sold: 0 }); } catch (error) { message = error.message; }
    assert(message.includes("3 + 1 + 0"), "Sum mismatch reported");
    try { assertInventoryInvariant({ total: 0, available: -1, reserved: 1, sold: 0 }); } catch (error) { message = error.message; }
    assert(message.includes("available is -1"), "Negative bucket reported");
});

// --- Store: reserving ---

test("reserve() goes IDLE -> RESERVING -> LOCKED and records identity and timestamps", async () => {
    const { config, store, clock, changes } = setup();
    const reservation = await store.reserve({ quantity: 2 });
    assertEqual(reservation.id, "res-1", "Unique id");
    assertEqual(reservation.productId, config.productId, "Product id");
    assertEqual(reservation.quantity, 2, "Quantity");
    assertEqual(reservation.createdAt, clock.now, "Created at");
    assertEqual(reservation.expiresAt, clock.now + LOCK_MS, "Expires after the lock duration");
    assertEqual(reservation.state, S.LOCKED, "Locked");
    assert(Object.isFrozen(reservation), "Snapshot is read-only");
    assertDeepEqual(changes, ["REQUEST:res-1:RESERVING", "CONFIRM:res-1:LOCKED"], "Went through RESERVING");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 8, reserved: 2, sold: 0 }, "Stock moved to reserved");
});

test("stock is only taken when the lock is confirmed, not while RESERVING", async () => {
    const { store, hold } = setup();
    const gate = hold();
    const pending = store.reserve({ quantity: 3 });
    assertEqual(store.activeFor().state, S.RESERVING, "Reserving");
    assertEqual(store.inventory.available, 10, "Nothing taken yet");
    gate.release();
    await pending;
    assertEqual(store.inventory.reserved, 3, "Taken on confirm");
});

test("reservations before the start or after the end are rejected without a record or stock change", async () => {
    const early = setup({ at: START - 1 });
    await expectReservationError(() => early.store.reserve({ quantity: 1 }), CODES.NOT_LIVE);
    const late = setup({ at: START + 60 * 60 * 1000 });
    await expectReservationError(() => late.store.reserve({ quantity: 1 }), CODES.SALE_ENDED);
    for (const { store, changes } of [early, late]) {
        assertEqual(store.list().length, 0, "No reservation created");
        assertEqual(changes.length, 0, "No state change");
        assertEqual(store.inventory.available, 10, "Stock unchanged");
    }
});

test("zero, negative, fractional and non-number quantities are rejected", async () => {
    const { store, changes } = setup();
    for (const quantity of [0, -2, 1.5, "2", undefined, Number.NaN]) {
        await expectReservationError(() => store.reserve({ quantity }), CODES.INVALID_QUANTITY);
    }
    assertEqual(changes.length, 0, "Nothing happened");
    assertEqual(store.inventory.available, 10, "Stock unchanged");
});

test("a reservation larger than the available stock is rejected", async () => {
    const { store } = setup({ inventory: 3 });
    const error = await expectReservationError(() => store.reserve({ quantity: 4 }), CODES.INSUFFICIENT_STOCK);
    assertEqual(error.message, "Only 3 units are available.", "Says how many are left");
    assertEqual(store.inventory.available, 3, "Unchanged");
});

test("a second reserve while one is processing or locked is rejected as a duplicate", async () => {
    const { store, hold } = setup();
    const gate = hold();
    const first = store.reserve({ quantity: 2 });
    // Double click: the same shopper asks again while the first is RESERVING.
    await expectReservationError(() => store.reserve({ quantity: 2 }), CODES.DUPLICATE);
    gate.release();
    await first;
    await expectReservationError(() => store.reserve({ quantity: 2 }), CODES.DUPLICATE);
    assertEqual(store.inventory.reserved, 2, "Reserved once, not twice");
    assertEqual(store.list().length, 1, "One reservation");
});

test("another shopper can reserve alongside, and every id is unique", async () => {
    const { store } = setup();
    const mine = await store.reserve({ quantity: 2 });
    const theirs = await store.reserve({ quantity: 3, shopperId: "shopper-2" });
    assert(mine.id !== theirs.id, "Different ids");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 5, reserved: 5, sold: 0 }, "Both held");
});

test("if stock runs out while RESERVING, the reservation fails back to IDLE and takes nothing", async () => {
    const { store, hold, changes } = setup({ inventory: 3 });
    const gate = hold();
    const slow = store.reserve({ quantity: 2 });
    await store.reserve({ quantity: 2, shopperId: "fast-shopper" });
    gate.release();
    await expectReservationError(() => slow, CODES.INSUFFICIENT_STOCK);
    assertEqual(store.get("res-1").state, S.IDLE, "Failed back to IDLE");
    assertEqual(store.get("res-1").failure, CODES.INSUFFICIENT_STOCK, "Reason kept");
    assertDeepEqual({ ...store.inventory }, { total: 3, available: 1, reserved: 2, sold: 0 }, "Only the fast shopper's units held");
    assert(changes.includes("FAIL:res-1:IDLE"), "FAIL transition recorded");
    const retry = await store.reserve({ quantity: 1 });
    assertEqual(retry.state, S.LOCKED, "A failed reservation does not block a new one");
});

test("if the sale ends while RESERVING, the reservation fails and takes nothing", async () => {
    const { store, hold, clock, config } = setup();
    const gate = hold();
    const pending = store.reserve({ quantity: 1 });
    clock.now = config.endsAt;
    gate.release();
    await expectReservationError(() => pending, CODES.SALE_ENDED);
    assertEqual(store.inventory.available, 10, "Stock unchanged");
});

test("a processing failure becomes a clear error and leaves stock unchanged", async () => {
    const { store, hold } = setup();
    const gate = hold();
    const pending = store.reserve({ quantity: 1 });
    gate.fail(new Error("network down"));
    const error = await expectReservationError(() => pending, CODES.PROCESSING_FAILED);
    assertEqual(error.cause.message, "network down", "Original error kept as cause");
    assertEqual(store.get("res-1").state, S.IDLE, "Back to IDLE");
    assertEqual(store.inventory.available, 10, "Unchanged");
});

// --- Store: after the lock ---

test("only a valid LOCKED reservation can start checkout", async () => {
    const { store } = setup();
    await expectReservationError(() => store.beginCheckout("missing"), CODES.NOT_FOUND);
    const reservation = await store.reserve({ quantity: 1 });
    assertEqual(store.beginCheckout(reservation.id).state, S.CHECKING_OUT, "Locked -> checking out");
    await expectReservationError(() => store.beginCheckout(reservation.id), CODES.INVALID_TRANSITION);
});

test("checkout on a lock whose time is up expires it, releases the stock and is rejected", async () => {
    const { store, clock } = setup();
    const reservation = await store.reserve({ quantity: 4 });
    clock.now = reservation.expiresAt;
    await expectReservationError(() => store.beginCheckout(reservation.id), CODES.EXPIRED);
    assertEqual(store.get(reservation.id).state, S.EXPIRED, "Expired");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 10, reserved: 0, sold: 0 }, "Stock released");
    await expectReservationError(() => store.beginCheckout(reservation.id), CODES.INVALID_TRANSITION);
    await expectReservationError(() => store.completeCheckout(reservation.id), CODES.INVALID_TRANSITION);
});

test("a purchase moves reserved stock to sold; a failed checkout returns to LOCKED", async () => {
    const { store } = setup();
    const reservation = await store.reserve({ quantity: 2 });
    store.beginCheckout(reservation.id);
    assertEqual(store.failCheckout(reservation.id).state, S.LOCKED, "Back to locked");
    assertEqual(store.inventory.reserved, 2, "Still held");
    store.beginCheckout(reservation.id);
    assertEqual(store.completeCheckout(reservation.id).state, S.PURCHASED, "Purchased");
    assertDeepEqual({ ...store.inventory }, { total: 10, available: 8, reserved: 0, sold: 2 }, "Sold");
    assertEqual(store.activeFor(), null, "No active reservation after purchase");
});

test("checkout that outlives the lock ends EXPIRED, never PURCHASED", async () => {
    const { store, clock } = setup();
    const reservation = await store.reserve({ quantity: 1 });
    store.beginCheckout(reservation.id);
    clock.now = reservation.expiresAt + 1;
    await expectReservationError(() => store.completeCheckout(reservation.id), CODES.EXPIRED);
    assertEqual(store.get(reservation.id).state, S.EXPIRED, "Expired");
    assertEqual(store.inventory.sold, 0, "Nothing sold");
    assertEqual(store.inventory.available, 10, "Released");
});

test("cancel and expire release the stock; cancelled or expired reservations cannot be purchased", async () => {
    const { store, clock } = setup();
    const first = await store.reserve({ quantity: 3 });
    assertEqual(store.cancel(first.id).state, S.CANCELLED, "Cancelled");
    assertEqual(store.inventory.available, 10, "Released on cancel");
    await expectReservationError(() => store.cancel(first.id), CODES.INVALID_TRANSITION);
    await expectReservationError(() => store.beginCheckout(first.id), CODES.INVALID_TRANSITION);

    const second = await store.reserve({ quantity: 2 });
    clock.now = second.expiresAt;
    assertEqual(store.expireIfDue(second.id).reservation.state, S.EXPIRED, "Expired");
    assertEqual(store.inventory.available, 10, "Released on expiry");
    await expectReservationError(() => store.completeCheckout(second.id), CODES.INVALID_TRANSITION);
});

test("the invariant holds and counts stay non-negative across a long mixed sequence", async () => {
    const { store, clock } = setup({ inventory: 7 });
    const shoppers = ["a", "b", "c", "d", "e"];
    for (let round = 0; round < 6; round += 1) {
        for (const shopperId of shoppers) {
            const active = store.activeFor(shopperId);
            try {
                if (!active) await store.reserve({ quantity: 1 + ((round + shopperId.charCodeAt(0)) % 3), shopperId });
                else if (round % 3 === 0) store.cancel(active.id);
                else if (round % 3 === 1) store.beginCheckout(active.id);
                else if (active.state === S.CHECKING_OUT) store.completeCheckout(active.id);
                else store.expireIfDue(active.id);
            } catch (error) {
                assert(error instanceof ReservationError, `Only expected rejections: ${error.message}`);
            }
            const stock = store.inventory;
            assertInventoryInvariant(stock);
        }
        // Big steps so some locks run out between rounds.
        clock.now += LOCK_MS / 2;
    }
    const held = store.list().filter((reservation) => isActiveState(reservation.state) && reservation.state !== S.RESERVING)
        .reduce((sum, reservation) => sum + reservation.quantity, 0);
    const sold = store.list().filter((reservation) => reservation.state === S.PURCHASED)
        .reduce((sum, reservation) => sum + reservation.quantity, 0);
    assertEqual(store.inventory.reserved, held, "Reserved equals the units held by active locks");
    assertEqual(store.inventory.sold, sold, "Sold equals the units of purchased reservations");
});

test("the store validates its options and requests", async () => {
    const { config } = setup();
    assertThrowsType(() => createReservationStore(null), /plain object/);
    assertThrowsType(() => createReservationStore({ config: { ...config } }), /validated/);
    assertThrowsType(() => createReservationStore({ config, process: 1 }), /process/);
    assertThrowsType(() => createReservationStore({ config, setTimeout: null }), /setTimeout/);
    const { store } = setup();
    let error;
    try { await store.reserve({ quantity: 1, shopperId: "Not Valid" }); } catch (caught) { error = caught; }
    assert(error instanceof TypeError, "Bad shopper id is a TypeError");
});
