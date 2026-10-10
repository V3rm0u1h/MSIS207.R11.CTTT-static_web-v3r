import { createElement, createTextElement, TEXT_ELEMENT } from "./createElement.js";

const resultsElement = typeof document !== "undefined"
    ? document.querySelector("#test-results")
    : null;

function report(message, passed) {
    const prefix = passed ? "PASS" : "FAIL";
    console.log(`${prefix}: ${message}`);
    if (resultsElement) {
        const item = document.createElement("li");
        item.textContent = `${prefix}: ${message}`;
        item.dataset.result = passed ? "pass" : "fail";
        resultsElement.append(item);
    }
    if (!passed) throw new Error(message);
}

function deepEqual(actual, expected) {
    if (Object.is(actual, expected)) return true;
    if (typeof actual !== typeof expected || actual === null || expected === null) return false;
    if (Array.isArray(actual) || Array.isArray(expected)) {
        if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) return false;
        return actual.every((value, index) => deepEqual(value, expected[index]));
    }
    if (typeof actual !== "object") return false;
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    return deepEqual(actualKeys, expectedKeys) &&
        actualKeys.every((key) => deepEqual(actual[key], expected[key]));
}

function assert(condition, message) {
    report(message, Boolean(condition));
}

function assertThrows(callback, message, expectedError = TypeError) {
    let caught = null;
    try {
        callback();
    } catch (error) {
        caught = error;
    }
    report(message, caught instanceof expectedError);
}

function text(value) {
    return {
        type: TEXT_ELEMENT,
        props: {},
        children: [],
        value,
    };
}

function runTests() {
    if (resultsElement) resultsElement.replaceChildren();

    const main = createElement("main", {},
        createElement("section", {},
            createElement("button", {}, "Save")
        )
    );
    assert(deepEqual(main, {
        type: "main",
        props: {},
        children: [{
            type: "section",
            props: {},
            children: [{
                type: "button",
                props: {},
                children: [text("Save")],
            }],
        }],
    }), "Semantic main > section > button VNode tree is preserved");

    const withProps = createElement("button", { type: "button", disabled: true });
    assert(deepEqual(withProps, {
        type: "button",
        props: { type: "button", disabled: true },
        children: [],
    }), "Element props are preserved and children default to an empty array");

    assert(deepEqual(createElement("p", "Hello", 7), {
        type: "p",
        props: {},
        children: [text("Hello"), text("7")],
    }), "Calls without a props object normalize text children");

    const strong = createElement("strong", {}, "nested");
    const multiple = createElement("p", {}, "before", strong, "after");
    assert(multiple.children.length === 3 && multiple.children[1] === strong,
        "Multiple children preserve existing VNodes without wrapping them");

    const nested = createElement("ul", {}, [
        createElement("li", {}, "one"),
        ["two", [createElement("li", {}, "three")]],
    ]);
    assert(deepEqual(nested.children, [
        createElement("li", {}, "one"),
        text("two"),
        createElement("li", {}, "three"),
    ]), "Nested child arrays are recursively flattened");

    assert(deepEqual(createElement("p", {}, 0).children, [text("0")]),
        "Numeric zero is preserved as visible text");
    assert(deepEqual(createElement("p", {}, "").children, [text("")]),
        "Empty string is preserved as a text VNode");

    const ignored = createElement("p", {}, null, undefined, false, true, "kept");
    assert(deepEqual(ignored.children, [text("kept")]),
        "Null, undefined, and boolean children are ignored");

    const literal = "<script>alert(1)</script>";
    assert(deepEqual(createTextElement(literal), text(literal)),
        "HTML-like text remains literal text data");
    assert(deepEqual(createElement("p", {}, literal).children, [text(literal)]),
        "HTML-like child strings are never interpreted as markup");

    assertThrows(() => createElement("", {}), "Empty element type is rejected");
    assertThrows(() => createElement("main content", {}), "Invalid element type syntax is rejected");
    assertThrows(() => createElement("TEXT_ELEMENT", {}), "Reserved text-node type cannot be used as an element");
    assertThrows(() => createElement("div", new Date()), "Non-plain props objects are rejected");
    assertThrows(() => createTextElement(false), "Unsupported text-node values are rejected");
    assertThrows(() => createElement("div", {}, () => "not a child"), "Function children are rejected");
    assertThrows(() => createElement("div", {}, { type: "button", props: {}, children: "invalid" }),
        "Malformed VNode-like children are rejected");

    assert(typeof document === "undefined" || typeof document.createElement === "function",
        "Factory tests do not require the factory to create real DOM nodes");

    if (resultsElement) {
        const summary = document.querySelector("#test-summary");
        if (summary) summary.textContent = "All createElement factory tests passed.";
    }
    console.log("All createElement factory tests passed.");
}

runTests();
