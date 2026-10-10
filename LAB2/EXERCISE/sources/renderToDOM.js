/**
 * Mini-React Core — PRD 2: renderToDOM
 *
 * Converts a validated PRD 1 VNode tree into real DOM nodes. Text is always
 * created with document.createTextNode(); HTML strings are never parsed.
 */

import { TEXT_ELEMENT } from "./createElement.js";
import { registerDelegatedHandler } from "./events.js";

const HTML_TAG_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;
const SUPPORTED_ATTRIBUTES = new Set([
    "id", "title", "type", "name", "value", "placeholder", "role",
    "href", "target", "rel", "for", "tabindex", "hidden", "required",
    "checked", "selected", "multiple", "readOnly", "autocomplete",
    "maxlength", "minlength", "min", "max", "step", "rows", "cols",
    "alt", "src", "width", "height", "method", "action", "enctype",
    "accept", "pattern", "spellcheck", "contenteditable", "draggable"
]);
const BOOLEAN_ATTRIBUTES = new Set([
    "disabled", "hidden", "required", "checked", "selected", "multiple",
    "readOnly", "spellcheck", "contenteditable", "draggable"
]);
const EVENT_PROP_TO_TYPE = Object.freeze({
    onClick: "click",
    onSubmit: "submit"
});
const RESERVED_PROPS = new Set([
    "children", "key", "ref", "dangerouslySetInnerHTML", "innerHTML", "outerHTML"
]);

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function validateVNode(vnode, path = "root", ancestors = new Set()) {
    if (!isPlainObject(vnode)) {
        throw new TypeError(`Mini-React: invalid VNode at ${path}; expected a plain object.`);
    }
    if (ancestors.has(vnode)) {
        throw new TypeError(`Mini-React: cyclic VNode tree detected at ${path}.`);
    }
    if (typeof vnode.type !== "string") {
        throw new TypeError(`Mini-React: invalid VNode type at ${path}; expected a string.`);
    }
    if (!isPlainObject(vnode.props) || !Array.isArray(vnode.children)) {
        throw new TypeError(`Mini-React: invalid VNode shape at ${path}; props must be a plain object and children must be an array.`);
    }

    if (vnode.type === TEXT_ELEMENT) {
        if (typeof vnode.value !== "string" || vnode.children.length !== 0) {
            throw new TypeError(`Mini-React: invalid text VNode at ${path}; expected a string value and no children.`);
        }
        if (Object.keys(vnode.props).length > 0) {
            throw new TypeError(`Mini-React: text VNode props must be empty at ${path}.`);
        }
        return;
    }

    if (!HTML_TAG_NAME_PATTERN.test(vnode.type) || vnode.type.toUpperCase() === TEXT_ELEMENT) {
        throw new TypeError(`Mini-React: unsupported element type "${vnode.type}" at ${path}.`);
    }

    ancestors.add(vnode);
    vnode.children.forEach((child, index) => validateVNode(child, `${path}.children[${index}]`, ancestors));
    ancestors.delete(vnode);
}

function isSafeHref(value) {
    // Strip ASCII whitespace/control characters that browsers may ignore while
    // parsing a URL scheme, then reject active or data URL schemes.
    const normalized = String(value).replace(/[\u0000-\u0020\u007f]+/g, "").toLowerCase();
    return !normalized.startsWith("javascript:") && !normalized.startsWith("vbscript:") && !normalized.startsWith("data:");
}

function setBooleanAttribute(element, name, value) {
    if (typeof value !== "boolean") {
        throw new TypeError(`Mini-React: boolean prop "${name}" must be true or false.`);
    }
    if (value) {
        element.setAttribute(name.toLowerCase(), "");
    } else {
        element.removeAttribute(name.toLowerCase());
    }
    if (name === "disabled" || name === "hidden" || name === "required" || name === "checked" || name === "selected" || name === "multiple" || name === "readOnly") {
        element[name === "readOnly" ? "readOnly" : name] = value;
    }
}

function applyProps(element, props, path) {
    for (const [name, value] of Object.entries(props)) {
        if (RESERVED_PROPS.has(name)) {
            throw new TypeError(`Mini-React: reserved prop "${name}" is not supported at ${path}.`);
        }

        if (name === "className") {
            if (typeof value !== "string") throw new TypeError(`Mini-React: prop "className" must be a string at ${path}.`);
            element.setAttribute("class", value);
            continue;
        }

        if (Object.prototype.hasOwnProperty.call(EVENT_PROP_TO_TYPE, name)) {
            if (typeof value !== "function") {
                throw new TypeError(`Mini-React: event prop "${name}" must be a function at ${path}.`);
            }
            registerDelegatedHandler(element, EVENT_PROP_TO_TYPE[name], value);
            continue;
        }

        if (/^on/i.test(name)) {
            throw new TypeError(`Mini-React: unsupported event prop "${name}" at ${path}; only onClick and onSubmit are supported.`);
        }

        if (/^aria-[a-z0-9-]+$/.test(name) || /^data-[a-z0-9-]+$/.test(name)) {
            if (value === null || value === undefined) continue;
            if (typeof value === "object" || typeof value === "function" || typeof value === "symbol") {
                throw new TypeError(`Mini-React: prop "${name}" must be a primitive value at ${path}.`);
            }
            element.setAttribute(name, String(value));
            continue;
        }

        if (BOOLEAN_ATTRIBUTES.has(name)) {
            setBooleanAttribute(element, name, value);
            continue;
        }

        if (!SUPPORTED_ATTRIBUTES.has(name)) {
            throw new TypeError(`Mini-React: unsupported prop "${name}" at ${path}.`);
        }
        if (value === null || value === undefined) continue;
        if (typeof value === "object" || typeof value === "function" || typeof value === "symbol") {
            throw new TypeError(`Mini-React: prop "${name}" must be a primitive value at ${path}.`);
        }
        if ((name === "href" || name === "src") && !isSafeHref(value)) {
            throw new TypeError(`Mini-React: unsafe URL supplied to prop "${name}" at ${path}.`);
        }
        element.setAttribute(name === "readOnly" ? "readonly" : name, String(value));
        if (name === "value" && "value" in element) element.value = String(value);
    }
}

/** Render a valid VNode tree to a detached root DOM node. */
export function renderToDOM(vnode) {
    validateVNode(vnode);

    function renderValidatedNode(node, path) {
        if (node.type === TEXT_ELEMENT) {
            return document.createTextNode(node.value);
        }

        const element = document.createElement(node.type);
        applyProps(element, node.props, path);
        node.children.forEach((child, index) => {
            element.appendChild(renderValidatedNode(child, `${path}.children[${index}]`));
        });
        return element;
    }

    return renderValidatedNode(vnode, "root");
}

/** Mount one rendered subtree into a designated root, replacing its children once. */
export function mountVNode(root, vnode) {
    if (!root || root.nodeType !== 1 || typeof root.replaceChildren !== "function") {
        throw new TypeError("Mini-React: mount root must be a valid DOM element.");
    }
    const renderedRoot = renderToDOM(vnode);
    root.replaceChildren(renderedRoot);
    return renderedRoot;
}
