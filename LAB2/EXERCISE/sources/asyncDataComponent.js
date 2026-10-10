/**
 * Mini-React — Resilient Async Data Component
 *
 * Data-source contract:
 *   fetchData({ signal, requestId }) => Promise<{ items: Array<{ title: string, description?: string }> }>
 *
 * The controller owns asynchronous state transitions; the mounted component
 * owns VNode construction and delegates events through the existing event
 * system. No HTML strings are parsed.
 */

import { createElement } from "./createElement.js";
import { renderToDOM } from "./renderToDOM.js";
import {
    attachRootEventDelegation,
    unregisterDelegatedHandler,
} from "./events.js";

export const ASYNC_DATA_STATES = Object.freeze({
    IDLE: "IDLE",
    LOADING: "LOADING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
});

const VALID_STATES = new Set(Object.values(ASYNC_DATA_STATES));

export function assertValidAsyncDataState(state) {
    if (!VALID_STATES.has(state)) {
        throw new TypeError(`Mini-React: invalid async data state "${String(state)}".`);
    }
    return state;
}
const TRANSITIONS = Object.freeze({
    IDLE: new Set(["LOADING"]),
    LOADING: new Set(["LOADING", "SUCCESS", "ERROR"]),
    SUCCESS: new Set(["LOADING"]),
    ERROR: new Set(["LOADING"]),
});

export const DEFAULT_ERROR_MESSAGE = "We couldn't load the data. Check your connection and try again.";

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/** Validate and normalize the documented fetchData response contract. */
export function validateAsyncData(payload) {
    if (!isPlainObject(payload) || !Array.isArray(payload.items)) {
        throw new TypeError("Data source must return an object with an items array.");
    }

    const items = payload.items.map((item, index) => {
        if (!isPlainObject(item) || typeof item.title !== "string" || item.title.trim() === "") {
            throw new TypeError(`Data item ${index} must have a non-empty string title.`);
        }
        if (item.description !== undefined && typeof item.description !== "string") {
            throw new TypeError(`Data item ${index} description must be a string when provided.`);
        }
        return {
            title: item.title,
            description: item.description ?? "",
        };
    });

    return { items };
}

/**
 * Testable async state machine, independent of the DOM.
 * Every state change passes through transition().
 */
export function createAsyncDataController(fetchData, options = {}) {
    if (typeof fetchData !== "function") {
        throw new TypeError("Mini-React: fetchData must be a function.");
    }
    const validateData = options.validateData ?? validateAsyncData;
    if (typeof validateData !== "function") {
        throw new TypeError("Mini-React: validateData must be a function.");
    }

    let state = ASYNC_DATA_STATES.IDLE;
    let data = null;
    let error = null;
    let requestId = 0;
    let activeAbortController = null;
    let disposed = false;
    const subscribers = new Set();

    function snapshot() {
        return Object.freeze({ state, data, error, requestId });
    }

    function notify() {
        const current = snapshot();
        for (const subscriber of [...subscribers]) subscriber(current);
    }

    function transition(nextState, patch = {}) {
        assertValidAsyncDataState(nextState);
        if (!TRANSITIONS[state].has(nextState)) {
            throw new Error(`Mini-React: invalid async data transition ${state} -> ${nextState}.`);
        }
        state = nextState;
        if (Object.hasOwn(patch, "data")) data = patch.data;
        if (Object.hasOwn(patch, "error")) error = patch.error;
        notify();
    }

    async function load() {
        if (disposed) return false;

        // Increment identity before aborting: even an abort-ignoring source is stale now.
        const thisRequestId = ++requestId;
        if (activeAbortController) activeAbortController.abort();
        const abortController = typeof AbortController === "function" ? new AbortController() : null;
        activeAbortController = abortController;

        // Never display old success/error content as the current request result.
        transition(ASYNC_DATA_STATES.LOADING, { data: null, error: null });

        try {
            const rawData = await fetchData({
                signal: abortController?.signal,
                requestId: thisRequestId,
            });
            if (disposed || thisRequestId !== requestId) return false;
            const validatedData = validateData(rawData);
            if (disposed || thisRequestId !== requestId) return false;
            activeAbortController = null;
            transition(ASYNC_DATA_STATES.SUCCESS, { data: validatedData, error: null });
            return true;
        } catch (_error) {
            if (disposed || thisRequestId !== requestId) return false;
            activeAbortController = null;
            transition(ASYNC_DATA_STATES.ERROR, {
                data: null,
                // Do not expose arbitrary transport errors, stacks, or response data.
                error: DEFAULT_ERROR_MESSAGE,
            });
            return false;
        }
    }

    function subscribe(subscriber) {
        if (typeof subscriber !== "function") {
            throw new TypeError("Mini-React: subscriber must be a function.");
        }
        if (disposed) return () => {};
        subscribers.add(subscriber);
        subscriber(snapshot());
        return () => subscribers.delete(subscriber);
    }

    function dispose() {
        if (disposed) return;
        disposed = true;
        requestId += 1;
        if (activeAbortController) activeAbortController.abort();
        activeAbortController = null;
        subscribers.clear();
    }

    return Object.freeze({
        load,
        retry: load,
        refresh: load,
        subscribe,
        getSnapshot: snapshot,
        dispose,
    });
}

function skeletonLine(className, label) {
    return createElement("span", {
        className: `async-data__skeleton-line ${className}`,
        "aria-hidden": "true",
        "data-skeleton-part": label,
    });
}

function createSkeleton() {
    return createElement("section", {
        className: "async-data async-data--loading",
        "aria-labelledby": "async-data-heading",
        "aria-busy": "true",
    },
        createElement("h2", { id: "async-data-heading", className: "async-data__heading" }, "Latest updates"),
        createElement("p", { role: "status", "aria-live": "polite", className: "async-data__status" }, "Loading latest updates"),
        createElement("ul", { className: "async-data__skeleton-list", "aria-hidden": "true" },
            createElement("li", { className: "async-data__skeleton-card" },
                skeletonLine("async-data__skeleton-line--title", "title"),
                skeletonLine("async-data__skeleton-line--body", "description"),
                skeletonLine("async-data__skeleton-line--short", "metadata")),
            createElement("li", { className: "async-data__skeleton-card" },
                skeletonLine("async-data__skeleton-line--title", "title"),
                skeletonLine("async-data__skeleton-line--body", "description"),
                skeletonLine("async-data__skeleton-line--short", "metadata"))));
}

function createIdleView() {
    return createElement("section", { className: "async-data", "aria-labelledby": "async-data-heading" },
        createElement("h2", { id: "async-data-heading", className: "async-data__heading" }, "Latest updates"),
        createElement("p", { className: "async-data__status" }, "Ready to load the latest updates."));
}

function createSuccessView(data) {
    const heading = createElement("h2", { id: "async-data-heading", className: "async-data__heading" }, "Latest updates");
    if (data.items.length === 0) {
        return createElement("section", { className: "async-data async-data--success", "aria-labelledby": "async-data-heading", "aria-busy": "false" },
            heading,
            createElement("p", { role: "status", className: "async-data__empty" }, "No updates are available right now."));
    }
    return createElement("section", { className: "async-data async-data--success", "aria-labelledby": "async-data-heading", "aria-busy": "false" },
        heading,
        createElement("p", { role: "status", className: "async-data__status" }, `${data.items.length} update${data.items.length === 1 ? "" : "s"} loaded`),
        createElement("ul", { className: "async-data__list" },
            ...data.items.map((item) => createElement("li", { className: "async-data__card" },
                createElement("article", null,
                    createElement("h3", { className: "async-data__item-title" }, item.title),
                    ...(item.description ? [createElement("p", { className: "async-data__item-description" }, item.description)] : []))))));
}

function createErrorView(message, onRetry) {
    return createElement("section", { className: "async-data async-data--error", "aria-labelledby": "async-data-heading", "aria-busy": "false" },
        createElement("h2", { id: "async-data-heading", className: "async-data__heading" }, "Latest updates"),
        createElement("p", { role: "alert", className: "async-data__error-message" }, message),
        createElement("button", { type: "button", className: "async-data__retry", onClick: onRetry }, "Retry Connection"));
}

function viewForSnapshot(current, onRetry) {
    switch (current.state) {
        case ASYNC_DATA_STATES.IDLE: return createIdleView();
        case ASYNC_DATA_STATES.LOADING: return createSkeleton();
        case ASYNC_DATA_STATES.SUCCESS: return createSuccessView(current.data);
        case ASYNC_DATA_STATES.ERROR: return createErrorView(current.error, onRetry);
        default: throw new Error(`Mini-React: cannot render unknown async data state "${String(current.state)}".`);
    }
}

/** Mount the async data component into a stable root using the existing renderer. */
export function mountAsyncDataComponent(root, fetchData, options = {}) {
    if (!root || root.nodeType !== 1 || typeof root.replaceChildren !== "function") {
        throw new TypeError("Mini-React: async data mount root must be a valid DOM element.");
    }

    const controller = createAsyncDataController(fetchData, options);
    attachRootEventDelegation(root, ["click"]);
    let currentRetryButton = null;
    let mounted = true;

    const unsubscribe = controller.subscribe((current) => {
        if (!mounted) return;
        if (currentRetryButton) {
            unregisterDelegatedHandler(currentRetryButton, "click");
            currentRetryButton = null;
        }
        const vnode = viewForSnapshot(current, () => {
            if (mounted && controller.getSnapshot().state === ASYNC_DATA_STATES.ERROR) {
                void controller.retry();
            }
        });
        const rendered = renderToDOM(vnode);
        root.replaceChildren(rendered);
        if (current.state === ASYNC_DATA_STATES.ERROR) {
            // renderToDOM registers the callback in the project's WeakMap-based delegation system.
            currentRetryButton = rendered.childNodes?.[2] ?? rendered.querySelector?.("button") ?? null;
        }
    });

    // Subscription paints IDLE first; load immediately transitions to LOADING.
    void controller.load();

    return Object.freeze({
        controller,
        refresh: () => controller.refresh(),
        dispose() {
            if (!mounted) return;
            mounted = false;
            unsubscribe();
            if (currentRetryButton) unregisterDelegatedHandler(currentRetryButton, "click");
            currentRetryButton = null;
            controller.dispose();
            root.replaceChildren();
        },
    });
}
