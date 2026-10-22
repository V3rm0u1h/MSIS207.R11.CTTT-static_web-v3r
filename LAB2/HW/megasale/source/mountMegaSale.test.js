import { mountMegaSale } from "./mountMegaSale.js";
import { createSampleConfig } from "./saleConfig.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox } from "../../source/testHarness.js";

// T-01 — product card, status-driven button, error view and mounting.

const START = Date.UTC(2026, 10, 10, 17, 0, 0); // 11 Nov 2026 00:00 in Asia/Ho_Chi_Minh
const config = createSampleConfig(START, { startsInMs: 0, durationMs: 60 * 60 * 1000 });

/** Mount with a controllable clock. */
function mount(props = {}, at = START) {
    const root = document.createElement("section");
    sandbox().append(root);
    const clock = { now: at };
    const handle = mountMegaSale(root, { id: "sale", config, ...props }, { now: () => clock.now });
    return { root, handle, clock };
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
    assertEqual(root.querySelector("time").getAttribute("datetime"), "2026-11-10T17:00:00.000Z", "Start as ISO");
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
