import { resetCursor } from "./state.js";
import { setRenderCallback, useState } from "./useState.js";
import {
    attachRootEventDelegation,
    registerDelegatedHandler,
} from "./events.js";

const results = document.querySelector("#results");
const summary = document.querySelector("#summary");
const fixture = document.querySelector("#test-root");
let passed = 0;
let failed = 0;

function report(name, error = null) {
    const item = document.createElement("li");
    item.className = error ? "fail" : "pass";
    item.textContent = `${error ? "FAIL" : "PASS"} — ${name}${error ? `: ${error.message}` : ""}`;
    results.append(item);
    if (error) failed += 1;
    else passed += 1;
}

function test(name, callback) {
    try {
        callback();
        report(name);
    } catch (error) {
        report(name, error instanceof Error ? error : new Error(String(error)));
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function createRoot() {
    const root = document.createElement("div");
    fixture.append(root);
    return root;
}

function click(element) {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
}

test("rejects an invalid root", () => {
    let didThrow = false;
    try { attachRootEventDelegation(null); } catch (error) { didThrow = error instanceof TypeError; }
    assert(didThrow, "invalid root should throw TypeError");
});

test("registers one root listener when initialized repeatedly", () => {
    const root = createRoot();
    let registrations = 0;
    const original = root.addEventListener.bind(root);
    root.addEventListener = (type, callback, options) => {
        if (type === "click") registrations += 1;
        return original(type, callback, options);
    };
    attachRootEventDelegation(root, ["click"]);
    attachRootEventDelegation(root, ["click"]);
    assert(registrations === 1, `expected 1 listener registration, got ${registrations}`);
});

test("dispatches to the matching callback for multiple children", () => {
    const root = createRoot();
    attachRootEventDelegation(root);
    let firstCalls = 0;
    let secondCalls = 0;
    const first = document.createElement("button");
    const second = document.createElement("button");
    root.append(first, second);
    registerDelegatedHandler(first, "click", () => firstCalls += 1);
    registerDelegatedHandler(second, "click", () => secondCalls += 1);
    click(first);
    assert(firstCalls === 1 && secondCalls === 0, "first button should call only its handler");
    click(second);
    assert(firstCalls === 1 && secondCalls === 1, "second button should call only its handler");
});

test("resolves a nested target to its interactive ancestor once", () => {
    const root = createRoot();
    attachRootEventDelegation(root);
    let calls = 0;
    const button = document.createElement("button");
    const span = document.createElement("span");
    span.textContent = "Nested label";
    button.append(span);
    root.append(button);
    registerDelegatedHandler(button, "click", () => calls += 1);
    click(span);
    assert(calls === 1, `expected one callback, got ${calls}`);
});

test("delegated children do not need individual native listeners", () => {
    const root = createRoot();
    attachRootEventDelegation(root);
    const button = document.createElement("button");
    let childListenerCalls = 0;
    button.addEventListener = () => childListenerCalls += 1;
    root.append(button);
    let calls = 0;
    registerDelegatedHandler(button, "click", () => calls += 1);
    click(button);
    assert(calls === 1, "root should dispatch the registered handler");
    assert(childListenerCalls === 0, "no native listener should be attached to the child");
});

test("new descendants work after the old descendants are replaced", () => {
    const root = createRoot();
    attachRootEventDelegation(root);
    const oldButton = document.createElement("button");
    registerDelegatedHandler(oldButton, "click", () => { throw new Error("removed handler fired"); });
    root.append(oldButton);
    const newButton = document.createElement("button");
    let calls = 0;
    registerDelegatedHandler(newButton, "click", () => calls += 1);
    root.replaceChildren(newButton);
    click(newButton);
    assert(calls === 1, "new child should work with the existing root listener");
});

test("delegates form submit events through the root", () => {
    const root = createRoot();
    attachRootEventDelegation(root, ["click", "submit"]);
    const form = document.createElement("form");
    root.append(form);
    let calls = 0;
    registerDelegatedHandler(form, "submit", (event) => {
        calls += 1;
        event.preventDefault();
    });
    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    assert(calls === 1, `expected one submit callback, got ${calls}`);
    assert(event.defaultPrevented, "form callback should be able to prevent its own default submission");
});

test("ignores elements without registered callbacks", () => {
    const root = createRoot();
    attachRootEventDelegation(root);
    const button = document.createElement("button");
    root.append(button);
    click(button);
    assert(true, "unregistered click should not throw");
});

test("delegated callbacks can update useState and request rendering", () => {
    const root = createRoot();
    attachRootEventDelegation(root);
    resetCursor();
    const [count, setCount] = useState(0);
    assert(count === 0, "initial state should be zero");
    let renderRequests = 0;
    setRenderCallback(() => renderRequests += 1);
    const button = document.createElement("button");
    root.append(button);
    registerDelegatedHandler(button, "click", () => setCount((previous) => previous + 1));
    click(button);
    resetCursor();
    const [updatedCount] = useState(0);
    assert(updatedCount === 1, `expected state 1, got ${updatedCount}`);
    assert(renderRequests === 1, `expected one render request, got ${renderRequests}`);
    setRenderCallback(null);
});

summary.textContent = `${passed} passed · ${failed} failed`;
summary.style.fontWeight = "700";
summary.style.color = failed ? "#b4233b" : "#167b62";
