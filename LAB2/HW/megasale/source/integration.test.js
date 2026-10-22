import { mountMegaSale } from "./mountMegaSale.js";
import { createSampleConfig } from "./saleConfig.js";
import { assertInventoryInvariant } from "./inventory.js";
import { manualTimer } from "./countdown.test.js";
import { test, assert, assertEqual, sandbox } from "../../source/testHarness.js";

// T-06 — sale UI integration and race-condition hardening (whole simulator, fake clock and timers).

const START = Date.UTC(2026, 10, 10, 17, 0, 0);
const HOUR = 60 * 60 * 1000;
const LOCK_MS = 5 * 60 * 1000;

function mount({ at = START + 1000, inventory = 5, payments = "instant" } = {}) {
    const root = document.createElement("section");
    sandbox().append(root);
    const clock = { now: at };
    const timer = manualTimer();
    const pending = [];
    let sequence = 0;
    const config = { ...createSampleConfig(START, { startsInMs: 0, durationMs: HOUR }), initialInventory: inventory, lockDurationMs: LOCK_MS };
    const handle = mountMegaSale(root, { id: "int", config }, {
        now: () => clock.now,
        timer: { setInterval: timer.setInterval, clearInterval: timer.clearInterval, setTimeout: timer.setTimeout, clearTimeout: timer.clearTimeout },
        processReservation: () => Promise.resolve(),
        processCheckout: payments === "instant"
            ? () => Promise.resolve()
            : () => new Promise((resolve, reject) => { pending.push({ resolve, reject }); }),
        createId: () => `int-${++sequence}`
    });
    // Every store change must keep the books balanced.
    const broken = [];
    handle.store.subscribe((change, stock) => {
        try { assertInventoryInvariant(stock); } catch (error) { broken.push(error.message); }
    });
    const ui = {
        root,
        clock,
        timer,
        handle,
        broken,
        pay: () => pending.shift().resolve(),
        message: () => root.querySelector("[role=status]").textContent,
        stock: (bucket) => Number(root.querySelector(`[data-inventory=${bucket}]`).textContent),
        state: () => root.querySelector("[data-reservation-state]")?.dataset.reservationState ?? null,
        button: (action) => root.querySelector(`[data-action=${action}]`),
        async reserve(quantity = "1") {
            const field = root.querySelector("input[name=quantity]");
            field.value = quantity;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            root.querySelector("[data-action=reserve]").click();
            await settle();
        }
    };
    return ui;
}

const settle = () => new Promise((resolve) => { setTimeout(resolve, 0); });

/** Pretend the tab was hidden and comes back: browsers fire visibilitychange on document. */
function returnToTab() {
    document.dispatchEvent(new Event("visibilitychange"));
}

/** The text that explains a disabled control, through aria-describedby. */
function reasonFor(root, element) {
    const id = element.getAttribute("aria-describedby");
    return id ? root.querySelector(`#${id}`)?.textContent ?? "" : "";
}

test("before the start: countdown, upcoming message, reservations unavailable with a reason", () => {
    const ui = mount({ at: START - 90_000 });
    assertEqual(ui.root.querySelector("[data-countdown]").textContent, "00:01:30.000", "Countdown to the start");
    const reserve = ui.button("reserve");
    assert(reserve.disabled, "Cannot reserve yet");
    assert(reasonFor(ui.root, reserve).includes("when the sale starts"), `Reason given: "${reasonFor(ui.root, reserve)}"`);
});

test("the sale ending during an active lock keeps the reservation and says so", async () => {
    const ui = mount({ at: START + HOUR - 60_000 });
    await ui.reserve("2");
    ui.clock.now = START + HOUR;
    ui.timer.tick();
    assertEqual(ui.root.querySelector("[data-status-label]").textContent, "Ended", "Sale ended");
    assertEqual(ui.state(), "LOCKED", "Reservation kept");
    assertEqual(ui.stock("reserved"), 2, "Stock still reserved, not erased");
    assert(ui.message().includes("still held"), `Announcement mentions the held reservation: "${ui.message()}"`);
    ui.button("checkout").click();
    await settle();
    assertEqual(ui.stock("sold"), 2, "Checkout still allowed until the lock expires");
});

test("after the end, a sale with no active lock refuses new reservations and explains why", () => {
    const ui = mount({ at: START + HOUR + 1 });
    const reserve = ui.button("reserve");
    assert(reserve.disabled, "Disabled");
    assert(reasonFor(ui.root, reserve).includes("ended"), `Reason given: "${reasonFor(ui.root, reserve)}"`);
});

test("returning to the tab after the lock ran out expires it at once, even if no timer has run", async () => {
    const ui = mount();
    await ui.reserve("2");
    ui.clock.now += LOCK_MS + 30_000; // the tab was in the background; no timer or tick ran
    returnToTab();
    assertEqual(ui.state(), null, "No active reservation left");
    assertEqual(ui.stock("available"), 5, "Stock back");
    assert(ui.message().startsWith("Your reservation expired."), "Announced");
    ui.timer.fireTimeouts();
    ui.timer.tick();
    assertEqual(ui.stock("available"), 5, "Late timers change nothing");
    assertEqual(ui.broken.length, 0, "Invariant held");
});

test("disabled Checkout and Cancel explain why while a reservation or payment is in progress", async () => {
    const ui = mount({ payments: "manual" });
    await ui.reserve("1");
    ui.button("checkout").click();
    const cancel = ui.button("cancel");
    assert(cancel.disabled, "Cancel disabled during payment");
    assert(reasonFor(ui.root, cancel).length > 0, "Cancel explains why");
    assert(reasonFor(ui.root, ui.button("checkout")).length > 0, "Checkout explains why");
    ui.pay();
    await settle();
});

test("rapid reservation clicks create one reservation", async () => {
    const ui = mount();
    const field = ui.root.querySelector("input[name=quantity]");
    field.value = "2";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    const submit = ui.button("reserve");
    for (let index = 0; index < 5; index += 1) submit.click();
    await settle();
    assertEqual(ui.handle.store.list().length, 1, "One reservation");
    assertEqual(ui.stock("reserved"), 2, "Reserved once");
});

test("checkout 1 ms before the expiry succeeds; at the expiry it fails even though no timer ran", async () => {
    const early = mount();
    await early.reserve("1");
    early.clock.now = early.handle.store.activeFor().expiresAt - 1;
    early.button("checkout").click();
    await settle();
    assertEqual(early.stock("sold"), 1, "Bought just in time");

    const late = mount();
    await late.reserve("1");
    late.clock.now = late.handle.store.activeFor().expiresAt;
    late.button("checkout").click();
    await settle();
    assertEqual(late.stock("sold"), 0, "Not sold at the expiry time");
    assertEqual(late.stock("available"), 5, "Released once");
    assert(late.message().includes("expired"), "Explained");
});

test("cancel just before the expiry releases once; the expiry timer that follows changes nothing", async () => {
    const ui = mount();
    await ui.reserve("3");
    ui.clock.now = ui.handle.store.activeFor().expiresAt - 1;
    ui.button("cancel").click();
    ui.clock.now += 10;
    ui.timer.fireTimeouts();
    ui.timer.tick();
    assertEqual(ui.stock("available"), 5, "Released once");
    assert(ui.message().startsWith("Reservation cancelled."), "Cancel announced, not an expiry");
    assertEqual(ui.broken.length, 0, "Invariant held");
});

test("a replaced reservation is never affected by the old lock's countdown", async () => {
    const ui = mount();
    await ui.reserve("1");
    const first = ui.handle.store.activeFor();
    ui.button("cancel").click();
    ui.clock.now += 2 * 60_000;
    await ui.reserve("1");
    const second = ui.handle.store.activeFor();
    assert(first.id !== second.id, "New identity");
    ui.clock.now = first.expiresAt + 1; // the old lock's time is up, the new one still has 2 minutes
    ui.timer.tick();
    ui.timer.fireTimeouts();
    assertEqual(ui.state(), "LOCKED", "New lock untouched");
    assertEqual(ui.root.querySelector("section.sale-reservation").dataset.reservationId, second.id, "Panel shows the new reservation");
});

test("the purchase confirmation always reflects the store's record", async () => {
    const ui = mount();
    await ui.reserve("2");
    ui.button("checkout").click();
    await settle();
    const confirmation = ui.root.querySelector("section.sale-confirmation");
    const record = ui.handle.store.get(confirmation.dataset.purchaseId);
    assertEqual(record.state, "PURCHASED", "Confirmation refers to a purchased record");
});

test("dispose() removes the visibility listener it added", () => {
    const added = [];
    const removed = [];
    const originalAdd = document.addEventListener;
    const originalRemove = document.removeEventListener;
    document.addEventListener = function (type, listener, ...rest) { if (type === "visibilitychange") added.push(listener); return originalAdd.call(this, type, listener, ...rest); };
    document.removeEventListener = function (type, listener, ...rest) { if (type === "visibilitychange") removed.push(listener); return originalRemove.call(this, type, listener, ...rest); };
    try {
        const ui = mount();
        assertEqual(added.length, 1, "One listener while mounted");
        ui.handle.dispose();
        assertEqual(removed.length, 1, "Removed on dispose");
        assertEqual(removed[0], added[0], "The same listener");
    } finally {
        document.addEventListener = originalAdd;
        document.removeEventListener = originalRemove;
    }
});
