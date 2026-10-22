import { mountMegaSale } from "./mountMegaSale.js";
import { createSampleConfig } from "./saleConfig.js";
import { assertInventoryInvariant } from "./inventory.js";
import { RESERVATION_ERROR_CODES as CODES } from "./reservationMachine.js";
import { manualTimer } from "./countdown.test.js";
import { test, assert, assertEqual, assertDeepEqual, sandbox, wait } from "../../source/testHarness.js";

// T-08 — the PRD 8 end-to-end sale workflow, once on a fake clock (every step exact) and once on real timers.

const TIME_PATTERN = /^\d{2,}:\d{2}:\d{2}\.\d{3}$/;
const settle = () => new Promise((resolve) => { setTimeout(resolve, 0); });

/** Reads and actions on a mounted simulator, as a user would see and use it. */
function driver(root, handle) {
    const field = () => root.querySelector("input[name=quantity]");
    return {
        status: () => root.querySelector("[data-status-label]").textContent,
        countdown: () => root.querySelector("[data-countdown]").textContent,
        lockCountdown: () => root.querySelector("[data-lock-countdown]")?.textContent ?? null,
        message: () => root.querySelector("[role=status]").textContent,
        stock: () => Object.fromEntries(["available", "reserved", "sold"].map((bucket) => [bucket, Number(root.querySelector(`[data-inventory=${bucket}]`).textContent)])),
        reserveButton: () => root.querySelector("[data-action=reserve]"),
        async reserve(quantity) {
            field().value = String(quantity);
            field().dispatchEvent(new Event("input", { bubbles: true }));
            root.querySelector("[data-action=reserve]").click();
            await settle();
        },
        async checkout() {
            root.querySelector("[data-action=checkout]").click();
            await settle();
        },
        books() {
            const stock = handle.store.inventory;
            assertInventoryInvariant(stock);
            assertDeepEqual(this.stock(), { available: stock.available, reserved: stock.reserved, sold: stock.sold }, "Card shows the store's numbers");
            return stock;
        }
    };
}

test("end to end on a fake clock: upcoming → live → reserve → purchase → abandoned lock expires → sale ends", async () => {
    const START = Date.UTC(2026, 10, 10, 17, 0, 0);
    const LOCK_MS = 5 * 60 * 1000;
    const config = { ...createSampleConfig(START, { startsInMs: 0, durationMs: 30 * 60 * 1000 }), initialInventory: 10, lockDurationMs: LOCK_MS };
    const root = document.createElement("section");
    sandbox().append(root);
    const clock = { now: START - 90_500 };
    const timer = manualTimer();
    let sequence = 0;
    const handle = mountMegaSale(root, { id: "e2e", config }, {
        now: () => clock.now,
        timer: { setInterval: timer.setInterval, clearInterval: timer.clearInterval, setTimeout: timer.setTimeout, clearTimeout: timer.clearTimeout },
        processReservation: () => Promise.resolve(),
        processCheckout: () => Promise.resolve(),
        createId: () => `e2e-${++sequence}`
    });
    const ui = driver(root, handle);

    // 1-2. Loads upcoming; the countdown has millisecond precision.
    assertEqual(ui.status(), "Upcoming", "1. Upcoming sale");
    assertEqual(ui.countdown(), "00:01:30.500", "2. Millisecond countdown to the start");
    assert(ui.reserveButton().disabled, "No reservations yet");

    // 3. Live at the configured start.
    clock.now = START;
    timer.tick();
    assertEqual(ui.status(), "Live", "3. Live at the start time");

    // 4-6. Reserve; the lock gets an absolute expiry and its countdown shows the lock duration.
    await ui.reserve(3);
    const lock = handle.store.activeFor();
    assertEqual(lock.expiresAt, START + LOCK_MS, "5. Expiry timestamp");
    assertEqual(ui.lockCountdown(), "00:05:00.000", "6. Lock countdown");
    clock.now += 61_000;
    timer.tick();
    assertEqual(ui.lockCountdown(), "00:03:59.000", "6. Lock countdown follows the clock");
    assertDeepEqual({ ...ui.books() }, { total: 10, available: 7, reserved: 3, sold: 0 }, "4. Stock reserved");

    // 7. A valid checkout becomes a purchase.
    await ui.checkout();
    assert(ui.message().startsWith("Purchase confirmed: 3 units"), "7. Purchase confirmed");
    assertDeepEqual({ ...ui.books() }, { total: 10, available: 7, reserved: 0, sold: 3 }, "7. Sold");

    // 8. An abandoned reservation expires and releases its stock.
    await ui.reserve(2);
    const abandoned = handle.store.activeFor();
    clock.now = abandoned.expiresAt;
    timer.fireTimeouts();
    assert(ui.message().startsWith("Your reservation expired."), "8. Expiry announced");
    assertDeepEqual({ ...ui.books() }, { total: 10, available: 7, reserved: 0, sold: 3 }, "8. Released");

    // 9. The expired reservation cannot be purchased.
    let error = null;
    try { await handle.store.checkout(abandoned.id); } catch (caught) { error = caught; }
    assertEqual(error?.code, CODES.EXPIRED, "9. Expired reservation refused");

    // 10. The campaign ends; new reservations are rejected.
    clock.now = config.endsAt;
    timer.tick();
    assertEqual(ui.status(), "Ended", "10. Ended");
    assertEqual(ui.countdown(), "00:00:00.000", "10. Countdown at zero");
    assert(ui.reserveButton().disabled, "10. Reserve disabled");
    error = null;
    try { await handle.store.reserve({ quantity: 1 }); } catch (caught) { error = caught; }
    assertEqual(error?.code, CODES.SALE_ENDED, "10. Store refuses too");

    // 11. Consistent throughout, and nothing left running.
    assertDeepEqual({ ...ui.books() }, { total: 10, available: 7, reserved: 0, sold: 3 }, "11. Final books");
    assertEqual(timer.active, 0, "No interval left after the end");
    assertEqual(timer.pendingTimeouts, 0, "No expiry timer left");
    handle.dispose();
});

test("end to end on real timers: the sale opens, a lock expires by itself and the sale closes", async () => {
    const now = Date.now();
    const config = { ...createSampleConfig(now, { startsInMs: 600, durationMs: 3500 }), initialInventory: 4, lockDurationMs: 1200 };
    const root = document.createElement("section");
    sandbox().append(root);
    const handle = mountMegaSale(root, { id: "e2e-real", config }, {
        processReservation: () => Promise.resolve(),
        processCheckout: () => Promise.resolve()
    });
    const ui = driver(root, handle);
    /** Poll the page until predicate() holds, like a user watching it. */
    async function until(predicate, label, timeoutMs = 3000) {
        const deadline = Date.now() + timeoutMs;
        while (!predicate()) {
            if (Date.now() > deadline) throw new Error(`Timed out waiting for: ${label}`);
            await wait(20);
        }
    }
    try {
        assertEqual(ui.status(), "Upcoming", "Upcoming");
        assert(TIME_PATTERN.test(ui.countdown()), `Millisecond format: ${ui.countdown()}`);
        await until(() => ui.status() === "Live", "the sale to open");
        assert(config.startsAt <= Date.now(), "Opened at or after the start time, never early");

        await ui.reserve(1);
        await ui.checkout();
        assertEqual(ui.books().sold, 1, "Purchased on real timers");

        await ui.reserve(2);
        const abandoned = handle.store.activeFor();
        assert(TIME_PATTERN.test(ui.lockCountdown()), "Lock countdown shown");
        await until(() => handle.store.get(abandoned.id).state === "EXPIRED", "the lock to expire by itself");
        assert(Date.now() >= abandoned.expiresAt, "Expired at or after expiresAt, never early");
        assertDeepEqual({ ...ui.books() }, { total: 4, available: 3, reserved: 0, sold: 1 }, "Released by the real timer");

        await until(() => ui.status() === "Ended", "the sale to close");
        assertEqual(ui.countdown(), "00:00:00.000", "Zero at the end");
        assert(ui.reserveButton().disabled, "No new reservations");
    } finally {
        handle.dispose();
    }
});
