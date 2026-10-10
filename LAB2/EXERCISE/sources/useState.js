
/**
 * PRD 2 — Mini-React Reactive useState Dispatcher
 *
 * Dependencies:
 * - state.js from PRD 1
 *
 * Responsibilities:
 * - Retrieve persistent hook state.
 * - Create stable, closure-based setters.
 * - Support direct and functional updates.
 * - Request rendering through an explicit callback.
 */

import { claimStateSlot } from "./state.js";

// A render callback must be explicitly registered by the application.
// It is not a second state store or a rendering implementation.
let renderCallback = null;

/**
 * Register the application's render request callback.
 *
 * Example:
 * setRenderCallback(() => renderApp());
 *
 * Pass null to disconnect the callback.
 */
export function setRenderCallback(callback) {
    if (callback !== null && typeof callback !== "function") {
        throw new TypeError(
            "Mini-React: render callback must be a function or null."
        );
    }

    renderCallback = callback;
}

/**
 * Request a render when a callback has been registered.
 *
 * Without a registered callback, state updates still work,
 * allowing the dispatcher to be tested independently.
 */
function requestRender() {
    if (renderCallback !== null) {
        renderCallback();
    }
}

/**
 * Custom useState dispatcher.
 *
 * @param {*} initialValue Initial value for this hook slot.
 * @returns {[*, Function]} Current value and its setter.
 */
export function useState(initialValue) {
    const { index, value } = claimStateSlot(initialValue);

    // Capture this hook's index, not the mutable global cursor.
    function setState(nextValue) {
        const previousValue = getCurrentValue(index);

        // Calculate before committing so a throwing updater
        // cannot partially update the store.
        const resolvedValue =
            typeof nextValue === "function"
                ? nextValue(previousValue)
                : nextValue;

        // Avoid unnecessary renders when the value is unchanged.
        if (Object.is(previousValue, resolvedValue)) {
            return;
        }

        writeStateValue(index, resolvedValue);
        requestRender();
    }

    return [value, setState];
}

// Use the existing store from PRD 1.
import { readStateSlot, stateStore } from "./state.js";

/**
 * Read the latest value when a setter is called.
 * Do not use a value captured during an earlier render.
 */
function getCurrentValue(index) {
    return readStateSlot(index);
}

/**
 * Write the new value into the existing state store.
 */
function writeStateValue(index, value) {
    stateStore[index] = value;
}
