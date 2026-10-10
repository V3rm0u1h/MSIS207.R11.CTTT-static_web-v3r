import {
    ASYNC_DATA_STATES,
    DEFAULT_ERROR_MESSAGE,
    assertValidAsyncDataState,
    createAsyncDataController,
    mountAsyncDataComponent,
    validateAsyncData,
} from "./asyncDataComponent.js";

// Minimal DOM test double; the demo.html exercises the same code in a real browser.
class TestNode {
    constructor(nodeType, nodeName, text = "") {
        this.nodeType = nodeType;
        this.nodeName = nodeName;
        this.tagName = nodeType === 1 ? nodeName : undefined;
        this._text = text;
        this.parentNode = null;
        this.childNodes = [];
        this.attributes = new Map();
        this.listeners = new Map();
        this.value = "";
        this.disabled = false;
        this.hidden = false;
        this.required = false;
        this.checked = false;
        this.selected = false;
        this.multiple = false;
        this.readOnly = false;
    }
    appendChild(child) {
        if (child.parentNode) throw new Error("Test DOM: node already has a parent");
        child.parentNode = this;
        this.childNodes.push(child);
        return child;
    }
    replaceChildren(...children) {
        this.childNodes.forEach((child) => { child.parentNode = null; });
        this.childNodes = [];
        children.forEach((child) => this.appendChild(child));
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(type, callback) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(callback);
    }
    contains(node) { return node === this || this.childNodes.some((child) => child.contains(node)); }
    get className() { return this.getAttribute("class") ?? ""; }
    get textContent() {
        return this.nodeType === 3 ? this._text : this.childNodes.map((child) => child.textContent).join("");
    }
    set textContent(value) {
        if (this.nodeType === 3) this._text = String(value);
        else this.replaceChildren(globalThis.document.createTextNode(String(value)));
    }
}

globalThis.document = {
    createdElements: [],
    createdTextNodes: [],
    createElement(type) {
        const node = new TestNode(1, type.toUpperCase());
        this.createdElements.push(node);
        return node;
    },
    createTextNode(value) {
        const node = new TestNode(3, "#text", String(value));
        this.createdTextNodes.push(node);
        return node;
    },
};

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }
function assert(condition, message = "Assertion failed") { if (!condition) throw new Error(message); }
function equal(actual, expected, message = `Expected ${String(expected)}, received ${String(actual)}`) {
    if (actual !== expected) throw new Error(message);
}
function throws(callback, pattern) {
    let caught;
    try { callback(); } catch (error) { caught = error; }
    assert(caught instanceof Error, "Expected operation to throw");
    if (pattern) assert(pattern.test(caught.message), `Unexpected error message: ${caught.message}`);
}
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}
async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}
function dispatchClick(root, target) {
    const listeners = root.listeners.get("click") ?? [];
    for (const listener of listeners) listener({ target, composedPath: () => [target, root.childNodes[0], root] });
}

const validPayload = (title = "Fresh data") => ({ items: [{ title, description: "A safe description" }] });

test("validates the documented response contract and accepts an empty list", () => {
    equal(validateAsyncData({ items: [] }).items.length, 0);
    equal(validateAsyncData(validPayload()).items[0].title, "Fresh data");
    throws(() => validateAsyncData({}), /items array/);
    throws(() => validateAsyncData({ items: [{ title: "" }] }), /non-empty string title/);
    throws(() => validateAsyncData({ items: [{ title: "Good", description: 42 }] }), /description must be a string/);
});

test("follows IDLE -> LOADING -> SUCCESS and rejects invalid state names", async () => {
    const controller = createAsyncDataController(async () => validPayload());
    equal(controller.getSnapshot().state, ASYNC_DATA_STATES.IDLE);
    throws(() => assertValidAsyncDataState("MYSTERY"), /invalid async data state/);
    equal(assertValidAsyncDataState(ASYNC_DATA_STATES.IDLE), ASYNC_DATA_STATES.IDLE);
    equal(await controller.load(), true);
    equal(controller.getSnapshot().state, ASYNC_DATA_STATES.SUCCESS);
    equal(controller.getSnapshot().data.items[0].title, "Fresh data");
    controller.dispose();
});

test("moves failed requests to ERROR and retries with a fresh request", async () => {
    let calls = 0;
    const controller = createAsyncDataController(async () => {
        calls += 1;
        if (calls === 1) throw new Error("private server stack details");
        return validPayload("Recovered");
    });
    equal(await controller.load(), false);
    equal(controller.getSnapshot().state, ASYNC_DATA_STATES.ERROR);
    equal(controller.getSnapshot().error, DEFAULT_ERROR_MESSAGE);
    assert(!controller.getSnapshot().error.includes("private server"));
    equal(await controller.retry(), true);
    equal(calls, 2);
    equal(controller.getSnapshot().state, ASYNC_DATA_STATES.SUCCESS);
    equal(controller.getSnapshot().data.items[0].title, "Recovered");
    controller.dispose();
});

test("a late success from an older request cannot overwrite the latest request", async () => {
    const requests = [];
    const controller = createAsyncDataController(() => {
        const pending = deferred();
        requests.push(pending);
        return pending.promise;
    });
    const requestA = controller.load();
    const requestB = controller.refresh();
    requests[1].resolve(validPayload("Request B"));
    await requestB;
    requests[0].resolve(validPayload("Request A"));
    await requestA;
    equal(controller.getSnapshot().state, ASYNC_DATA_STATES.SUCCESS);
    equal(controller.getSnapshot().data.items[0].title, "Request B");
    controller.dispose();
});

test("a stale rejection cannot replace a newer successful state", async () => {
    const requests = [];
    const controller = createAsyncDataController(() => {
        const pending = deferred();
        requests.push(pending);
        return pending.promise;
    });
    const requestA = controller.load();
    const requestB = controller.load();
    requests[1].resolve(validPayload("Winner"));
    await requestB;
    requests[0].reject(new Error("stale failure"));
    await requestA;
    equal(controller.getSnapshot().state, ASYNC_DATA_STATES.SUCCESS);
    equal(controller.getSnapshot().data.items[0].title, "Winner");
    controller.dispose();
});

test("empty valid data reaches SUCCESS and is distinguishable from invalid data", async () => {
    const controller = createAsyncDataController(async () => ({ items: [] }));
    await controller.load();
    equal(controller.getSnapshot().state, ASYNC_DATA_STATES.SUCCESS);
    equal(controller.getSnapshot().data.items.length, 0);
    controller.dispose();
});

test("loading skeleton is accessible and HTML-like server text remains a text node", async () => {
    const pending = deferred();
    const root = document.createElement("main");
    const instance = mountAsyncDataComponent(root, () => pending.promise);
    equal(root.childNodes.length, 1);
    equal(root.childNodes[0].tagName, "SECTION");
    equal(root.childNodes[0].getAttribute("aria-busy"), "true");
    assert(root.textContent.includes("Loading latest updates"));
    assert(root.childNodes[0].textContent.includes("Loading latest updates"));

    const hostile = "<script>alert(1)</script>";
    pending.resolve({ items: [{ title: hostile, description: "Literal only" }] });
    await flushPromises();
    equal(root.childNodes[0].getAttribute("aria-busy"), "false");
    assert(root.textContent.includes(hostile));
    equal(document.createdElements.filter((node) => node.tagName === "SCRIPT").length, 0);
    assert(document.createdTextNodes.some((node) => node.textContent === hostile));
    instance.dispose();
});

test("error view has an accessible retry button and retry starts a new request", async () => {
    let calls = 0;
    const root = document.createElement("main");
    const instance = mountAsyncDataComponent(root, async () => {
        calls += 1;
        if (calls === 1) throw new Error("offline");
        return validPayload("Back online");
    });
    await flushPromises();
    equal(root.childNodes[0].tagName, "SECTION");
    assert(root.textContent.includes(DEFAULT_ERROR_MESSAGE));
    const button = root.childNodes[0].childNodes[2];
    equal(button.tagName, "BUTTON");
    equal(button.textContent, "Retry Connection");
    equal(button.getAttribute("type"), "button");
    dispatchClick(root, button);
    await flushPromises();
    equal(calls, 2);
    equal(root.childNodes[0].getAttribute("aria-busy"), "false");
    assert(root.textContent.includes("Back online"));
    instance.dispose();
});

test("disposed component ignores late results and clears its mounted subtree", async () => {
    const pending = deferred();
    const root = document.createElement("main");
    const instance = mountAsyncDataComponent(root, () => pending.promise);
    instance.dispose();
    pending.resolve(validPayload("Must not appear"));
    await flushPromises();
    equal(root.childNodes.length, 0);
    equal(instance.controller.getSnapshot().state, ASYNC_DATA_STATES.LOADING);
});

test("multiple overlapping requests use monotonically increasing request IDs", async () => {
    const requests = [];
    const controller = createAsyncDataController(({ requestId }) => {
        const pending = deferred();
        requests.push({ pending, requestId });
        return pending.promise;
    });
    const first = controller.load();
    const second = controller.load();
    assert(requests[1].requestId > requests[0].requestId);
    requests[1].pending.resolve(validPayload("Second"));
    await second;
    requests[0].pending.resolve(validPayload("First"));
    await first;
    equal(controller.getSnapshot().data.items[0].title, "Second");
    controller.dispose();
});

let failures = 0;
for (const { name, callback } of tests) {
    try {
        await callback();
        console.log(`PASS ${name}`);
    } catch (error) {
        failures += 1;
        console.error(`FAIL ${name}\n  ${error.stack || error.message}`);
    }
}
console.log(`\n${tests.length - failures}/${tests.length} async data component tests passed.`);
if (failures > 0) throw new Error(`${failures} async data component test(s) failed.`);
