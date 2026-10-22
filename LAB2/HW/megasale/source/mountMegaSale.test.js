import { mountMegaSale } from "./mountMegaSale.js";
import { createSampleConfig } from "./saleConfig.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox } from "../../source/testHarness.js";
import { manualTimer } from "./countdown.test.js";

// T-01 — product card, status-driven button, error view and mounting.
// T-02 — countdown wiring.
// T-03 — reserve form, reservation panel and stock display.

const START = Date.UTC(2026, 10, 10, 17, 0, 0); // 11 Nov 2026 00:00 in Asia/Ho_Chi_Minh
const config = createSampleConfig(START, { startsInMs: 0, durationMs: 60 * 60 * 1000 });

/**
 * Mount with a controllable clock, a manual timer (no real intervals outlive a
 * test) and instant reservation processing unless options.processReservation is given.
 */
function mount(props = {}, at = START, options = {}) {
    const root = document.createElement("section");
    sandbox().append(root);
    const clock = { now: at };
    const timer = manualTimer();
    let sequence = 0;
    const handle = mountMegaSale(root, { id: "sale", config, ...props }, {
        now: () => clock.now,
        timer: {
            setInterval: timer.setInterval,
            clearInterval: timer.clearInterval,
            setTimeout: timer.setTimeout,
            clearTimeout: timer.clearTimeout
        },
        processReservation: () => Promise.resolve(),
        processCheckout: () => Promise.resolve(),
        createId: () => `reservation-${++sequence}`,
        ...options
    });
    return { root, handle, clock, timer };
}

const action = (root) => root.querySelector("[data-action=reserve]");
const statusLabel = (root) => root.querySelector("[data-status-label]").textContent;
const facts = (root) => Object.fromEntries([...root.querySelectorAll("dt")].map((dt) => [dt.textContent, dt.nextElementSibling.textContent]));

test("renders a semantic product card with no div elements", () => {
    const { root } = mount();
    assertDeepEqual([...root.children].map((child) => child.tagName), ["ARTICLE", "P"], "Card then live region");
    assertEqual(root.querySelectorAll("div").length, 0, "Zero div-soup");
    const card = root.querySelector("article");
    assertEqual(card.getAttribute("aria-labelledby"), card.querySelector("h2").id, "Card labelled by its heading");
    assertEqual(card.querySelector("h2").textContent, config.productName, "Product name");
    assertEqual(card.querySelector("h2").getAttribute("lang"), "vi", "Vietnamese text marked");
    assertEqual(root.querySelector("[role=status]").getAttribute("aria-live"), "polite", "Live region");
    assertEqual(action(root).tagName, "BUTTON", "Native button");
    assertEqual(action(root).getAttribute("type"), "submit", "Submits the reserve form");
});

test("shows both prices with text labels, the discount and the inventory", () => {
    const { root } = mount();
    const shown = facts(root);
    assertDeepEqual(Object.keys(shown), ["Original price", "Sale price", "Available", "Reserved", "Sold", "Status", "Sale window"], "Labels");
    const original = root.querySelector("del");
    assert(original.textContent.replace(/\D/g, "") === "1290000", `Original price formatted: ${original.textContent}`);
    assert(original.textContent.includes("₫"), "Currency shown");
    assert(root.querySelector("strong").textContent.replace(/\D/g, "") === "799000", "Sale price");
    assert(shown["Sale price"].endsWith("(38% off)"), "Discount as text");
    assertEqual(root.querySelector("output[data-inventory=available]").textContent, "50", "Inventory");
    assertEqual(shown.Reserved, "0", "Nothing reserved yet");
    assertEqual(shown.Sold, "0", "Nothing sold yet");
    assertEqual(shown.Available, "50 of 50 units", "Inventory sentence");
    assertEqual(root.querySelectorAll("time[datetime]").length, 2, "Machine-readable sale window");
    assertEqual(root.querySelector("time[datetime]").getAttribute("datetime"), "2026-11-10T17:00:00.000Z", "Start as ISO");
});

test("status and button follow the clock: upcoming, live, ended", () => {
    const { root, handle, clock } = mount({}, START - 1);
    assertEqual(statusLabel(root), "Upcoming", "Before start");
    assert(action(root).disabled, "Cannot reserve before start");
    assert(action(root).textContent.startsWith("Opens at"), "Button says when it opens");
    assertEqual(handle.status, "UPCOMING", "Handle agrees");

    clock.now = START;
    handle.refresh();
    assertEqual(statusLabel(root), "Live", "At start");
    assertEqual(root.querySelector("article").dataset.status, "LIVE", "Styling hook");
    assert(!action(root).disabled, "Reservable");
    assertEqual(action(root).textContent, "Reserve now", "Action label");

    clock.now = config.endsAt;
    handle.refresh();
    assertEqual(statusLabel(root), "Ended", "At end");
    assert(action(root).disabled, "Cannot reserve after end");
    assertEqual(action(root).textContent, "Sale ended", "Ended label");
});

test("a live sale with zero stock shows Sold out", () => {
    const { root } = mount({ config: { ...config, initialInventory: 0 } });
    assertEqual(statusLabel(root), "Live", "Still live");
    assert(action(root).disabled, "Disabled");
    assertEqual(action(root).textContent, "Sold out", "Sold-out label");
});

test("the reserve button is reachable by keyboard and announces its result", () => {
    const { root } = mount();
    action(root).focus();
    assertEqual(document.activeElement, action(root), "Focusable");
    action(root).click();
    assert(root.querySelector("[role=status]").textContent.length > 0, "Message announced");
});

test("refresh() keeps focus on the button, or moves it to the heading when the button turns disabled", () => {
    const { root, handle, clock } = mount();
    action(root).focus();
    handle.refresh();
    assertEqual(document.activeElement, action(root), "Focus kept on the new button");
    clock.now = config.endsAt;
    handle.refresh();
    assertEqual(document.activeElement, root.querySelector("h2"), "Focus moved to the heading");
});

test("an invalid configuration shows every problem instead of crashing", () => {
    const { root, handle } = mount({ config: { ...config, salePrice: 2_000_000, initialInventory: -3 } });
    assertEqual(handle.ok, false, "Handle reports failure");
    const alert = root.querySelector("section[role=alert]");
    assert(alert, "Alert section shown");
    assertEqual(alert.querySelectorAll("li").length, 2, "Both problems listed");
    assertDeepEqual([...handle.errors], [...alert.querySelectorAll("li")].map((li) => li.textContent), "Same messages");
    assertEqual(root.querySelector("article"), null, "No card with bad data");
    handle.refresh();
    assertEqual(root.querySelector("article"), null, "refresh() is harmless");
});

test("a missing configuration is reported, not thrown", () => {
    const root = document.createElement("section");
    sandbox().append(root);
    const handle = mountMegaSale(root, {});
    assertEqual(handle.ok, false, "Not ok");
    assert(root.querySelector("[role=alert]").textContent.includes("missing"), "Explains the problem");
});

test("configuration text is rendered as text, never parsed as HTML", () => {
    const productName = "<img src=x onerror=alert(1)>";
    const { root } = mount({ config: { ...config, productName } });
    assertEqual(root.querySelector("h2").textContent, productName, "Literal text");
    assertEqual(root.querySelector("img"), null, "No injected element");
});

test("validates mount arguments before touching the root", () => {
    const root = document.createElement("section");
    root.textContent = "untouched";
    assertThrowsType(() => mountMegaSale(null, { config }), /mount root/);
    assertThrowsType(() => mountMegaSale(root, null), /props/);
    assertThrowsType(() => mountMegaSale(root, { config }, []), /options/);
    assertThrowsType(() => mountMegaSale(root, { id: "Bad Id", config }), /id must use/);
    assertThrowsType(() => mountMegaSale(root, { config }, { now: 5 }), /now/);
    assertThrowsType(() => mountMegaSale(root, { config }, { timer: [] }), /timer/);
    assertEqual(root.textContent, "untouched", "Root unchanged");
});

test("two simulators on one page keep separate state", () => {
    const first = mount({ id: "first" });
    const second = mount({ id: "second", config: { ...config, initialInventory: 7 } });
    assertEqual(first.handle.inventory.available, 50, "First inventory");
    assertEqual(second.handle.inventory.available, 7, "Second inventory");
    assert(first.root.querySelector("h2").id !== second.root.querySelector("h2").id, "Unique ids");
});

test("dispose() empties the root and is safe to repeat", () => {
    const { root, handle } = mount();
    handle.dispose();
    handle.dispose();
    assertEqual(root.childNodes.length, 0, "Root cleared");
    handle.refresh();
    assertEqual(root.childNodes.length, 0, "refresh() after dispose does nothing");
});

// --- T-02: countdown wiring ---

const countdownText = (root) => root.querySelector("[data-countdown]").textContent;
const countdownLine = (root) => root.querySelector(".sale-countdown").textContent;
const message = (root) => root.querySelector("[role=status]").textContent;

test("the card shows a millisecond countdown to the start in a non-live timer element", () => {
    const { root } = mount({}, START - 3_723_456);
    assertEqual(countdownText(root), "01:02:03.456", "Remaining time to start");
    assert(countdownLine(root).startsWith("Sale starts in"), "Label");
    const time = root.querySelector("[data-countdown]");
    assertEqual(time.tagName, "TIME", "Time element");
    assertEqual(time.getAttribute("role"), "timer", "Timer role");
    assertEqual(time.getAttribute("aria-live"), null, "Not announced on every tick");
});

test("ticks change only the countdown text; the card is not re-rendered", async () => {
    const { root, clock, timer } = mount({}, START - 10_000);
    const card = root.querySelector("article");
    // The callback runs as a microtask and receives the records first, so keep them.
    const seen = [];
    const observer = new MutationObserver((list) => seen.push(...list));
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    for (let index = 0; index < 20; index += 1) {
        clock.now += 50;
        timer.tick();
    }
    await Promise.resolve();
    const records = [...seen, ...observer.takeRecords()];
    observer.disconnect();
    assertEqual(root.querySelector("article"), card, "Same card element");
    assertEqual(countdownText(root), "00:00:09.000", "Text follows the clock");
    const time = root.querySelector("[data-countdown]");
    const others = records.filter((record) => record.target !== time && record.target.parentNode !== time);
    assert(records.length > 0, "Countdown text was written");
    assertDeepEqual(others.map((record) => `${record.type}:${record.target.nodeName}`), [], "Only the time element changed");
});

test("a tick without a visible change writes nothing", async () => {
    const { root, timer } = mount({}, START - 10_000);
    // The callback runs as a microtask and receives the records first, so keep them.
    const seen = [];
    const observer = new MutationObserver((list) => seen.push(...list));
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    timer.tick();
    timer.tick();
    await Promise.resolve();
    assertEqual([...seen, ...observer.takeRecords()].length, 0, "Clock did not move, DOM untouched");
    observer.disconnect();
});

test("reaching the start makes the sale live, announces it and counts down to the end", () => {
    const { root, handle, clock, timer } = mount({}, START - 100);
    clock.now = START;
    timer.tick();
    assertEqual(statusLabel(root), "Live", "Status updated at the target");
    assert(!action(root).disabled, "Reserve enabled");
    assert(message(root).startsWith("The sale is live now."), "Announced");
    assert(countdownLine(root).startsWith("Sale ends in"), "Now counting to the end");
    assertEqual(countdownText(root), "01:00:00.000", "One hour left");
    assertEqual(handle.countdown.target, config.endsAt, "Target moved to the end");
    assertEqual(timer.active, 1, "Still one interval");
});

test("reaching the end shows 00:00:00.000, ends the sale and stops the timer", () => {
    const { root, handle, clock, timer } = mount({}, config.endsAt - 10);
    clock.now = config.endsAt + 5;
    timer.tick();
    assertEqual(statusLabel(root), "Ended", "Ended");
    assertEqual(countdownText(root), "00:00:00.000", "Zero, never negative");
    assertEqual(countdownLine(root), "Sale ended 00:00:00.000", "Ended label");
    assertEqual(message(root), "The sale has ended.", "Announced");
    assertEqual(timer.active, 0, "No interval left");
    assert(!handle.countdown.isRunning, "Countdown stopped");
});

test("a callback delayed past start and end (device sleep) goes straight to Ended", () => {
    const { root, clock, timer } = mount({}, START - 5_000);
    clock.now = config.endsAt + 60_000;
    timer.tick();
    assertEqual(statusLabel(root), "Ended", "Correct status after the gap");
    assertEqual(message(root), "The sale has ended.", "Only the true state announced");
    assertEqual(timer.active, 0, "Stopped");
});

test("an ended sale mounts with zero and schedules no timer", () => {
    const { root, timer } = mount({}, config.endsAt + 1);
    assertEqual(countdownText(root), "00:00:00.000", "Zero");
    assertEqual(timer.active, 0, "No interval");
});

test("dispose() clears the countdown interval", () => {
    const { handle, timer } = mount({}, START - 10_000);
    assertEqual(timer.active, 1, "One interval while mounted (the lock countdown is idle)");
    handle.dispose();
    assertEqual(timer.active, 0, "Cleared");
});

// --- T-03: reservations in the UI ---

const quantityField = (root) => root.querySelector("input[name=quantity]");
const stock = (root, bucket) => root.querySelector(`[data-inventory=${bucket}]`).textContent;
const settle = () => new Promise((resolve) => { setTimeout(resolve, 0); });

/** Type into the quantity field the way a user would (fires input). */
function typeQuantity(root, value) {
    const field = quantityField(root);
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
}

test("a live sale shows a labelled quantity field and a Reserve submit button", () => {
    const { root } = mount();
    const form = root.querySelector("form[data-action=reserve-form]");
    assert(form, "Reserve form");
    const field = quantityField(root);
    assertEqual(root.querySelector(`label[for="${field.id}"]`).textContent, "Quantity", "Field has a visible label");
    assertEqual(field.type, "number", "Number field");
    assertEqual(field.min, "1", "Min 1");
    assertEqual(field.max, "50", "Max is the available stock");
    assertEqual(form.querySelector("button[type=submit]").textContent, "Reserve now", "Submit button");
    assertEqual(root.querySelectorAll("div").length, 0, "Still no div elements");
});

test("reserving shows the locked reservation, moves stock to reserved and announces the lock end", async () => {
    const { root, handle } = mount();
    typeQuantity(root, "2");
    action(root).focus();
    action(root).click();
    assert(message(root).startsWith("Reserving 2 units"), "Processing announced at once");
    await settle();
    const panel = root.querySelector("section.sale-reservation");
    assert(panel, "Reservation panel");
    assertEqual(panel.querySelector("[data-reservation-state]").dataset.reservationState, "LOCKED", "Locked");
    assertEqual(panel.dataset.reservationId, "reservation-1", "Reservation id");
    assertEqual(stock(root, "available"), "48", "Available");
    assertEqual(stock(root, "reserved"), "2", "Reserved");
    assertEqual(stock(root, "sold"), "0", "Sold");
    assert(message(root).startsWith("Reserved 2 units until"), "Lock end announced");
    assertEqual(root.querySelector("form"), null, "Form replaced by the reservation");
    assertEqual(document.activeElement, root.querySelector("[data-action=checkout]"), "Focus moved to Checkout, the next step");
    assertEqual(handle.store.activeFor().expiresAt, START + config.lockDurationMs, "Lock end from the config");
});

test("the panel shows RESERVING while the request is processed", async () => {
    let release;
    const { root } = mount({}, START, { processReservation: () => new Promise((resolve) => { release = resolve; }) });
    action(root).click();
    await settle();
    assertEqual(root.querySelector("[data-reservation-state]").dataset.reservationState, "RESERVING", "Reserving");
    assert(root.querySelector("[data-action=cancel]").disabled, "Cannot cancel while reserving");
    assertEqual(stock(root, "available"), "50", "No stock taken yet");
    release();
    await settle();
    assertEqual(root.querySelector("[data-reservation-state]").dataset.reservationState, "LOCKED", "Then locked");
});

test("invalid quantities are rejected with a message and no stock change", async () => {
    const { root } = mount({ config: { ...config, initialInventory: 3 } });
    for (const [typed, expected] of [["0", "whole number of 1 or more"], ["", "whole number of 1 or more"], ["1.5", "whole number of 1 or more"], ["4", "Only 3 units are available."]]) {
        typeQuantity(root, typed);
        root.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await settle();
        assert(message(root).startsWith("Could not reserve:") && message(root).includes(expected), `"${typed}": ${message(root)}`);
        assertEqual(stock(root, "available"), "3", "Stock unchanged");
        assertEqual(root.querySelector("section.sale-reservation"), null, "No reservation");
    }
});

test("submitting twice while processing reserves only once", async () => {
    let release;
    const { root, handle } = mount({}, START, { processReservation: () => new Promise((resolve) => { release = resolve; }) });
    typeQuantity(root, "2");
    root.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    // Layer 1: the form is replaced by the RESERVING panel at once, so a second click has nothing to submit.
    assertEqual(root.querySelector("form"), null, "No form while reserving");
    // Layer 2: the store itself rejects a second request from the same shopper.
    // Raced against a tick: if the duplicate were accepted it would wait on processing forever.
    const error = await Promise.race([
        handle.store.reserve({ quantity: 2, shopperId: "you" }).then(() => null, (caught) => caught),
        settle().then(() => null)
    ]);
    assertEqual(error?.code, "duplicate-reservation", "Store rejects the duplicate");
    release();
    await settle();
    assertEqual(handle.inventory.reserved, 2, "Reserved once");
    assertEqual(handle.store.list().length, 1, "One reservation");
});

test("the submit event's default (page reload) is prevented", () => {
    const { root } = mount();
    const event = new Event("submit", { bubbles: true, cancelable: true });
    root.querySelector("form").dispatchEvent(event);
    assert(event.defaultPrevented, "No navigation");
});

test("cancelling returns the stock and brings the form back", async () => {
    const { root, handle } = mount();
    typeQuantity(root, "3");
    action(root).click();
    await settle();
    root.querySelector("[data-action=cancel]").click();
    assertEqual(stock(root, "available"), "50", "Stock back");
    assertEqual(stock(root, "reserved"), "0", "Nothing reserved");
    assert(message(root).startsWith("Reservation cancelled. 3 units"), "Announced");
    assert(root.querySelector("form"), "Form is back");
    assertEqual(handle.store.list()[0].state, "CANCELLED", "Reservation cancelled in the store");
});

test("the typed quantity survives a re-render", () => {
    const { root, handle } = mount();
    typeQuantity(root, "4");
    quantityField(root).focus();
    handle.refresh();
    assertEqual(quantityField(root).value, "4", "Value kept");
    assertEqual(document.activeElement, quantityField(root), "Focus kept on the field");
});

test("an active reservation stays visible when stock reaches zero", async () => {
    const { root } = mount({ config: { ...config, initialInventory: 2 } });
    typeQuantity(root, "2");
    action(root).click();
    await settle();
    assertEqual(stock(root, "available"), "0", "Sold out for others");
    assert(root.querySelector("section.sale-reservation"), "Your reservation is still shown");
});

// --- T-04: lock countdown and expiry in the UI ---

const lockText = (root) => root.querySelector("[data-lock-countdown]")?.textContent ?? null;

async function reserveUnits(root, value) {
    typeQuantity(root, value);
    action(root).click();
    await settle();
}

test("the reservation panel shows the time left on the lock in a non-live timer", async () => {
    const { root, clock, timer } = mount();
    await reserveUnits(root, "2");
    assertEqual(lockText(root), "00:05:00.000", "Full lock duration");
    const time = root.querySelector("[data-lock-countdown]");
    assertEqual(time.getAttribute("role"), "timer", "Timer role");
    assertEqual(time.getAttribute("aria-live"), null, "Not announced every tick");
    clock.now += 61_250;
    timer.tick();
    assertEqual(lockText(root), "00:03:58.750", "Recomputed from the clock");
});

test("when the store's expiry timer fires, the panel goes, stock returns and the expiry is announced", async () => {
    const { root, clock, timer, handle } = mount();
    await reserveUnits(root, "2");
    clock.now = handle.store.activeFor().expiresAt;
    timer.fireTimeouts();
    assertEqual(root.querySelector("section.sale-reservation"), null, "Panel removed");
    assertEqual(stock(root, "available"), "50", "Stock back");
    assertEqual(stock(root, "reserved"), "0", "Nothing reserved");
    assertEqual(message(root), "Your reservation expired. 2 units went back to available stock.", "Announced");
    assert(root.querySelector("form"), "Can reserve again");
});

test("if the expiry timer is delayed, the lock countdown reaching zero expires that reservation", async () => {
    const { root, clock, timer, handle } = mount();
    await reserveUnits(root, "1");
    const { id, expiresAt } = handle.store.activeFor();
    clock.now = expiresAt + 5;
    timer.tick(); // the display countdown runs; the store's timeout has not fired
    assertEqual(handle.store.get(id).state, "EXPIRED", "Expired from the countdown");
    assertEqual(stock(root, "available"), "50", "Released");
    timer.fireTimeouts();
    assertEqual(handle.inventory.available, 50, "The late store timer releases nothing more");
});

test("the lock countdown stops when the reservation is cancelled", async () => {
    const { root, timer } = mount();
    await reserveUnits(root, "1");
    assertEqual(timer.active, 2, "Sale countdown and lock countdown");
    root.querySelector("[data-action=cancel]").click();
    assertEqual(timer.active, 1, "Only the sale countdown remains");
    assertEqual(timer.pendingTimeouts, 0, "Store expiry timer cleared");
});

// --- T-05: checkout in the UI ---

const checkoutButton = (root) => root.querySelector("[data-action=checkout]");

/** Mount with payments the test settles: payments.pay() / payments.decline(). */
function mountWithPayments() {
    const queue = [];
    const mounted = mount({}, START, {
        processCheckout: () => new Promise((resolve, reject) => { queue.push({ resolve, reject }); })
    });
    return {
        ...mounted,
        payments: {
            pay: () => queue.shift().resolve(),
            decline: () => queue.shift().reject(new Error("card declined")),
            get waiting() { return queue.length; }
        }
    };
}

test("checkout shows progress, disables its button, then confirms the purchase", async () => {
    const { root, payments } = mountWithPayments();
    await reserveUnits(root, "2");
    checkoutButton(root).click();
    assert(message(root).startsWith("Processing payment for 2 units"), "In progress announced");
    assertEqual(root.querySelector("[data-reservation-state]").dataset.reservationState, "CHECKING_OUT", "State shown");
    assert(checkoutButton(root).disabled, "Checkout disabled while processing");
    assertEqual(checkoutButton(root).textContent, "Processing payment…", "Button explains");
    assert(root.querySelector("[data-action=cancel]").disabled, "Cancel disabled while processing");
    payments.pay();
    await settle();
    const confirmation = root.querySelector("section.sale-confirmation");
    assert(confirmation, "Confirmation shown");
    assertEqual(confirmation.querySelector("h3").textContent, "Purchase confirmed", "Heading");
    assertEqual(stock(root, "sold"), "2", "Sold");
    assertEqual(stock(root, "reserved"), "0", "Nothing reserved");
    assert(/^Purchase confirmed: 2 units for 1\.598\.000/.test(message(root)), `Announced: ${message(root)}`);
    assertEqual(root.querySelector("section.sale-reservation"), null, "Reservation panel gone");
});

test("rapid checkout clicks pay and sell once", async () => {
    const { root, payments, handle } = mountWithPayments();
    await reserveUnits(root, "1");
    const button = checkoutButton(root);
    button.click();
    button.click(); // the old button is no longer in the page
    checkoutButton(root).click(); // the new one is disabled
    assertEqual(payments.waiting, 1, "One payment started");
    payments.pay();
    await settle();
    assertEqual(handle.inventory.sold, 1, "Sold once");
});

test("a failed payment keeps the reservation, explains, and allows a retry", async () => {
    const { root, payments } = mountWithPayments();
    await reserveUnits(root, "2");
    checkoutButton(root).click();
    payments.decline();
    await settle();
    assert(message(root).startsWith("Checkout failed: The payment did not go through."), `Explained: ${message(root)}`);
    assertEqual(root.querySelector("[data-reservation-state]").dataset.reservationState, "LOCKED", "Still locked");
    assertEqual(stock(root, "reserved"), "2", "Still reserved");
    assertEqual(root.querySelector("section.sale-confirmation"), null, "No purchase shown");
    assert(!checkoutButton(root).disabled, "Retry possible");
    checkoutButton(root).click();
    payments.pay();
    await settle();
    assertEqual(stock(root, "sold"), "2", "Retry succeeded");
});

test("a checkout that outlives the lock reports the expiry and shows no purchase", async () => {
    const { root, payments, clock, handle } = mountWithPayments();
    await reserveUnits(root, "3");
    const { expiresAt } = handle.store.activeFor();
    checkoutButton(root).click();
    clock.now = expiresAt;
    payments.pay();
    await settle();
    assert(message(root).startsWith("Checkout failed: Your reservation expired"), `Explained: ${message(root)}`);
    assertEqual(root.querySelector("section.sale-confirmation"), null, "No purchase");
    assertEqual(stock(root, "available"), "50", "Stock released");
    assertEqual(stock(root, "sold"), "0", "Nothing sold");
});

test("the confirmation stays until the next reservation starts", async () => {
    const { root } = mount();
    await reserveUnits(root, "1");
    checkoutButton(root).click();
    await settle();
    assert(root.querySelector("section.sale-confirmation"), "Shown after purchase");
    assert(root.querySelector("form"), "Can buy again");
    await reserveUnits(root, "1");
    assertEqual(root.querySelector("section.sale-confirmation"), null, "Cleared by the new reservation");
});
