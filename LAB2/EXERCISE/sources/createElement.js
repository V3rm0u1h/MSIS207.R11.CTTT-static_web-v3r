/**
 * Mini-React Core — PRD 1: createElement Factory
 *
 * This module creates plain Virtual DOM nodes (VNodes). It does not create,
 * mount, or update real DOM elements.
 */

export const TEXT_ELEMENT = "TEXT_ELEMENT";

const HTML_TAG_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function validateElementType(type) {
    if (
        typeof type !== "string" ||
        type.trim() === "" ||
        !HTML_TAG_NAME_PATTERN.test(type) ||
        type.toUpperCase() === TEXT_ELEMENT
    ) {
        throw new TypeError(
            `Mini-React: element type must be a valid HTML tag name; received ${String(type)}.`
        );
    }
}

/**
 * Convert a primitive text child into a text VNode.
 * Strings are kept as literal text data; no HTML parsing occurs here.
 */
export function createTextElement(value) {
    if (typeof value !== "string" && typeof value !== "number") {
        throw new TypeError(
            "Mini-React: text children must be strings or numbers."
        );
    }

    return {
        type: TEXT_ELEMENT,
        props: {},
        children: [],
        value: String(value),
    };
}

function isVNode(value) {
    if (!isPlainObject(value)) return false;
    if (typeof value.type !== "string" || !isPlainObject(value.props) || !Array.isArray(value.children)) {
        return false;
    }

    if (value.type === TEXT_ELEMENT) {
        return typeof value.value === "string" && value.children.length === 0;
    }

    return HTML_TAG_NAME_PATTERN.test(value.type) && value.type.toUpperCase() !== TEXT_ELEMENT;
}

function looksLikeVNode(value) {
    return isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, "type");
}

function normalizeChild(child, output) {
    if (child === null || child === undefined || typeof child === "boolean") {
        return;
    }

    if (Array.isArray(child)) {
        for (const nestedChild of child) {
            normalizeChild(nestedChild, output);
        }
        return;
    }

    if (typeof child === "string" || typeof child === "number") {
        output.push(createTextElement(child));
        return;
    }

    if (isVNode(child)) {
        // Preserve the exact VNode object rather than wrapping or cloning it.
        output.push(child);
        return;
    }

    if (looksLikeVNode(child)) {
        throw new TypeError("Mini-React: child resembles a VNode but does not satisfy the VNode contract.");
    }

    throw new TypeError(
        `Mini-React: unsupported child type "${typeof child}". Children must be VNodes, strings, numbers, arrays, null, undefined, or booleans.`
    );
}

function isChildOverload(value) {
    return (
        Array.isArray(value) ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        isVNode(value)
    );
}

/**
 * Create an element VNode.
 *
 * Supported forms:
 *   createElement("main", { id: "app" }, child)
 *   createElement("p", "Text without an explicit props object")
 *   createElement("section", null, child)
 */
export function createElement(type, props, ...children) {
    validateElementType(type);

    let resolvedProps;
    let suppliedChildren;

    if (props === undefined || props === null) {
        resolvedProps = {};
        suppliedChildren = children;
    } else if (isPlainObject(props)) {
        resolvedProps = { ...props };
        suppliedChildren = children;
    } else if (isChildOverload(props)) {
        // A non-object second argument is the first child when props are omitted.
        resolvedProps = {};
        suppliedChildren = [props, ...children];
    } else {
        throw new TypeError("Mini-React: props must be a plain object when provided.");
    }

    const normalizedChildren = [];
    for (const child of suppliedChildren) {
        normalizeChild(child, normalizedChildren);
    }

    return {
        type,
        props: resolvedProps,
        children: normalizedChildren,
    };
}
