/**
 * Mini-React root event delegation.
 * Supported native events: click, submit.
 * Child elements hold trusted callback references in a WeakMap; native
 * listeners are attached to the stable root only.
 */

const SUPPORTED_EVENT_TYPES = new Set(["click", "submit"]);
const handlerRegistry = new WeakMap();
const rootRegistrations = new WeakMap();

function isElement(value) {
    return value !== null &&
        typeof value === "object" &&
        value.nodeType === 1 &&
        typeof value.getAttribute === "function";
}

function validateEventType(eventType) {
    if (typeof eventType !== "string" || !SUPPORTED_EVENT_TYPES.has(eventType)) {
        throw new TypeError(
            `Mini-React: unsupported delegated event type "${String(eventType)}".`
        );
    }
}

export function registerDelegatedHandler(element, eventType, callback) {
    if (!isElement(element)) {
        throw new TypeError("Mini-React: event handler target must be a DOM element.");
    }
    validateEventType(eventType);
    if (typeof callback !== "function") {
        throw new TypeError("Mini-React: delegated event handler must be a function.");
    }

    let handlers = handlerRegistry.get(element);
    if (!handlers) {
        handlers = new Map();
        handlerRegistry.set(element, handlers);
    }
    handlers.set(eventType, callback);
}

export function unregisterDelegatedHandler(element, eventType) {
    if (!isElement(element)) return;
    validateEventType(eventType);
    const handlers = handlerRegistry.get(element);
    if (!handlers) return;
    handlers.delete(eventType);
    if (handlers.size === 0) handlerRegistry.delete(element);
}

function buildFallbackPath(target, root) {
    const path = [];
    let current = target;
    while (current) {
        path.push(current);
        if (current === root) break;
        current = current.parentNode;
    }
    return path;
}

function findHandlerTarget(event, root, eventType) {
    const path = typeof event.composedPath === "function"
        ? event.composedPath()
        : buildFallbackPath(event.target, root);

    for (const node of path) {
        if (node === root) break;
        if (!isElement(node) || !root.contains(node)) continue;
        const callback = handlerRegistry.get(node)?.get(eventType);
        if (callback) return { element: node, callback };
    }
    return null;
}

function dispatchDelegatedEvent(event, root, eventType) {
    const match = findHandlerTarget(event, root, eventType);
    if (!match) return;
    match.callback.call(match.element, event);
}

export function attachRootEventDelegation(root, eventTypes = ["click", "submit"]) {
    if (!isElement(root) || typeof root.addEventListener !== "function" ||
        typeof root.contains !== "function") {
        throw new TypeError("Mini-React: root must be a valid DOM element.");
    }
    if (!Array.isArray(eventTypes)) {
        throw new TypeError("Mini-React: eventTypes must be an array.");
    }

    let registeredTypes = rootRegistrations.get(root);
    if (!registeredTypes) {
        registeredTypes = new Set();
        rootRegistrations.set(root, registeredTypes);
    }

    for (const eventType of eventTypes) {
        validateEventType(eventType);
        if (registeredTypes.has(eventType)) continue;
        root.addEventListener(eventType, (event) => {
            dispatchDelegatedEvent(event, root, eventType);
        });
        registeredTypes.add(eventType);
    }
}

export const supportedDelegatedEvents = Object.freeze(["click", "submit"]);
