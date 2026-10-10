import { createElement, createTextElement, TEXT_ELEMENT } from "./createElement.js";
import { renderToDOM, mountVNode } from "./renderToDOM.js";
import { attachRootEventDelegation } from "./events.js";

// Tiny DOM test double: enough DOM behavior to test rendering in Node without
// adding a dependency. The browser demo uses the real DOM implementation.
class TestNode {
    constructor(nodeType, nodeName, text = "") {
        this.nodeType = nodeType;
        this.nodeName = nodeName;
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
        for (const child of children) this.appendChild(child);
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(type, callback) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(callback);
    }
    contains(node) {
        if (node === this) return true;
        return this.childNodes.some((child) => child.contains(node));
    }
    get className() { return this.getAttribute("class") ?? ""; }
    get textContent() {
        if (this.nodeType === 3) return this._text;
        return this.childNodes.map((child) => child.textContent).join("");
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
        node.tagName = type.toUpperCase();
        this.createdElements.push(node);
        return node;
    },
    createTextNode(value) {
        const node = new TestNode(3, "#text", String(value));
        this.createdTextNodes.push(node);
        return node;
    }
};

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }
function assert(condition, message) { if (!condition) throw new Error(message || "Assertion failed"); }
function assertEqual(actual, expected, message) {
    if (actual !== expected) throw new Error(message || `Expected ${String(expected)}, received ${String(actual)}`);
}
function assertThrows(callback, pattern) {
    let error;
    try { callback(); } catch (caught) { error = caught; }
    assert(error instanceof Error, "Expected the operation to throw an error");
    if (pattern) assert(pattern.test(error.message), `Unexpected error message: ${error.message}`);
}

 test("renders a nested semantic hierarchy in order", () => {
    const vnode = createElement("main", { id: "page" },
        createElement("section", null,
            createElement("button", { type: "button" }, "Save")
        )
    );
    const dom = renderToDOM(vnode);
    assertEqual(dom.tagName, "MAIN");
    assertEqual(dom.childNodes[0].tagName, "SECTION");
    assertEqual(dom.childNodes[0].childNodes[0].tagName, "BUTTON");
    assertEqual(dom.childNodes[0].childNodes[0].textContent, "Save");
    assertEqual(dom.getAttribute("id"), "page");
    assertEqual(dom.childNodes.length, 1, "No wrapper or duplicate node should be added");
});

test("creates actual text nodes and preserves HTML-like text literally", () => {
    const hostileText = "<script>alert(1)</script>";
    const dom = renderToDOM(createElement("p", null, hostileText));
    assertEqual(dom.childNodes.length, 1);
    assertEqual(dom.childNodes[0].nodeType, 3);
    assertEqual(dom.childNodes[0].textContent, hostileText);
    assertEqual(document.createdElements.filter((node) => node.tagName === "SCRIPT").length, 0);
});

test("renders empty strings, zero, and special characters", () => {
    const dom = renderToDOM(createElement("p", null, "", 0, " & < > \" ' "));
    assertEqual(dom.childNodes.length, 3);
    assertEqual(dom.textContent, "0 & < > \" ' ");
});

test("applies className, supported attributes, ARIA and data props", () => {
    const dom = renderToDOM(createElement("button", {
        className: "primary action", id: "save", title: "Save changes", type: "button",
        disabled: true, "aria-label": "Save", "data-testid": "save-button"
    }, "Save"));
    assertEqual(dom.getAttribute("class"), "primary action");
    assertEqual(dom.getAttribute("id"), "save");
    assertEqual(dom.getAttribute("title"), "Save changes");
    assertEqual(dom.getAttribute("type"), "button");
    assertEqual(dom.getAttribute("disabled"), "");
    assertEqual(dom.disabled, true);
    assertEqual(dom.getAttribute("aria-label"), "Save");
    assertEqual(dom.getAttribute("data-testid"), "save-button");
});

test("false boolean props remove the attribute", () => {
    const dom = renderToDOM(createElement("button", { disabled: false }, "Go"));
    assertEqual(dom.getAttribute("disabled"), null);
    assertEqual(dom.disabled, false);
});

test("does not mutate the original VNode tree", () => {
    const child = createTextElement("unchanged");
    const vnode = createElement("p", { id: "immutable" }, child);
    const originalChildren = vnode.children;
    renderToDOM(vnode);
    assert(vnode.children === originalChildren);
    assert(vnode.children[0] === child);
    assertEqual(child.value, "unchanged");
});

test("rejects malformed VNodes and unsupported tags", () => {
    assertThrows(() => renderToDOM(null), /invalid VNode/);
    assertThrows(() => renderToDOM({ type: "p", props: {}, children: "no-array" }), /invalid VNode shape/);
    assertThrows(() => renderToDOM({ type: "bad tag", props: {}, children: [] }), /unsupported element type/);
    assertThrows(() => renderToDOM({ type: TEXT_ELEMENT, props: {}, children: [], value: 4 }), /invalid text VNode/);
    assertThrows(() => renderToDOM({ type: "p", props: {}, children: [{}] }), /invalid VNode/);
});

test("rejects cyclic VNode trees", () => {
    const vnode = { type: "section", props: {}, children: [] };
    vnode.children.push(vnode);
    assertThrows(() => renderToDOM(vnode), /cyclic VNode tree/);
});

test("rejects unsupported and reserved props rather than copying them", () => {
    assertThrows(() => renderToDOM(createElement("p", { mysteryProp: "x" })), /unsupported prop/);
    assertThrows(() => renderToDOM(createElement("p", { innerHTML: "unsafe" })), /reserved prop/);
    assertThrows(() => renderToDOM(createElement("p", { onMouseOver: () => {} })), /unsupported event prop/);
});

test("rejects unsafe URL schemes, including whitespace-obfuscated schemes", () => {
    assertThrows(() => renderToDOM(createElement("a", { href: "javascript:alert(1)" }, "Click")), /unsafe URL/);
    assertThrows(() => renderToDOM(createElement("a", { href: "java\nscript:alert(1)" }, "Click")), /unsafe URL/);
    assertThrows(() => renderToDOM(createElement("img", { src: "data:text/html,unsafe" })), /unsafe URL/);
});

test("registers click handlers for root delegation without child listeners", () => {
    let clicked = 0;
    const root = document.createElement("div");
    const button = renderToDOM(createElement("button", { onClick: () => { clicked += 1; } }, "Click"));
    root.appendChild(button);
    attachRootEventDelegation(root, ["click"]);
    assertEqual(button.listeners.size, 0, "Renderer must not attach native listeners to child nodes");
    const rootListener = root.listeners.get("click")[0];
    rootListener({ target: button, composedPath: () => [button, root] });
    assertEqual(clicked, 1);
});

test("mountVNode mounts the returned root exactly once", () => {
    const root = document.createElement("main");
    const vnode = createElement("section", { id: "mounted" }, "Hello");
    const rendered = mountVNode(root, vnode);
    assertEqual(root.childNodes.length, 1);
    assert(root.childNodes[0] === rendered);
    assertEqual(rendered.tagName, "SECTION");
    assertEqual(rendered.textContent, "Hello");
});

let failures = 0;
for (const { name, callback } of tests) {
    try {
        callback();
        console.log(`PASS ${name}`);
    } catch (error) {
        failures += 1;
        console.error(`FAIL ${name}\n  ${error.stack || error.message}`);
    }
}
console.log(`\n${tests.length - failures}/${tests.length} renderer tests passed.`);
if (failures > 0) throw new Error(`${failures} renderer test(s) failed.`);
