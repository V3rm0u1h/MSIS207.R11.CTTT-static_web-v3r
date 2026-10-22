import { mountMegaSale } from "./mountMegaSale.js";
import { createSampleConfig } from "./saleConfig.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox } from "../../source/testHarness.js";
import { manualTimer } from "./countdown.test.js";

// T-01 — product card, status-driven button, error view and mounting.
// T-02 — countdown wiring.

const START = Date.UTC(2026, 10, 10, 17, 0, 0); // 11 Nov 2026 00:00 in Asia/Ho_Chi_Minh
const config = createSampleConfig(START, { startsInMs: 0, durationMs: 60 * 60 * 1000 });

/** Mount with a controllable clock and a manual timer (no real intervals outlive a test). */
function mount(props = {}, at = START) {
    const root = document.createElement("section");
    sandbox().append(root);
    const clock = { now: at };
    const timer = manualTimer();
    const handle = mountMegaSale(root, { id: "sale", config, ...props }, {
        now: () => clock.now,
        timer: { setInterval: timer.setInterval, clearInterval: timer.clearInterval }
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
    assertEqual(action(root).getAttribute("type"), "button", "Native button");
});

test("shows both prices with text labels, the discount and the inventory", () => {
    const { root } = mount();
    const shown = facts(root);
    assertDeepEqual(Object.keys(shown), ["Original price", "Sale price", "Available", "Status", "Sale window"], "Labels");
    const original = root.querySelector("del");
    assert(original.textContent.replace(/\D/g, "") === "1290000", `Original price formatted: ${original.textContent}`);
    assert(original.textContent.includes("₫"), "Currency shown");
    assert(root.querySelector("strong").textContent.replace(/\D/g, "") === "799000", "Sale price");
    assert(shown["Sale price"].endsWith("(38% off)"), "Discount as text");
    assertEqual(root.querySelector("output[data-inventory]").textContent, "50", "Inventory");
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
    assertEqual(first.handle.inventory, 50, "First inventory");
    assertEqual(second.handle.inventory, 7, "Second inventory");
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
    assertEqual(timer.active, 1, "One interval while mounted");
    handle.dispose();
    assertEqual(timer.active, 0, "Cleared");
});
