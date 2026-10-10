
/**
 * PRD 1 — Mini-React State Store & Cursor Reset Engine
 *
 * Responsibilities:
 * - Keep state values in stable array positions.
 * - Track the next state slot.
 * - Reset the cursor without clearing stored values.
 * - Initialize each slot only once.
 *
 * Out of scope:
 * - State setters and rerender scheduling.
 * - Event delegation.
 * - Task Manager application logic.
 */

// The state store is created once when this module is evaluated.
export const stateStore = [];

// Tracks the next state slot used during a render.
export let stateCursor = 0;

/**
 * Reset the cursor before rendering a component.
 *
 * Important: this must never clear stateStore.
 */
export function resetCursor() {
    stateCursor = 0;
}

/**
 * Reserve the next state slot.
 *
 * Initialize the slot only if it has never been initialized.
 * Returns the slot index and its current value.
 *
 * This is a low-level state-store primitive, not a complete useState.
 */
export function claimStateSlot(initialValue) {
    if (!Number.isSafeInteger(stateCursor) || stateCursor < 0) {
        throw new RangeError(
            "Mini-React: stateCursor must be a non-negative safe integer."
        );
    }

    const slotIndex = stateCursor;

    // Increment only after validating the cursor.
    stateCursor += 1;

    // An existing slot may legitimately contain undefined, false, 0, or "".
    // Check whether the array owns the slot instead of checking truthiness.
    if (!Object.hasOwn(stateStore, slotIndex)) {
        stateStore[slotIndex] = initialValue;
    }

    return {
        index: slotIndex,
        value: stateStore[slotIndex],
    };
}

/**
 * Read a previously initialized slot.
 */
export function readStateSlot(index) {
    if (!Number.isSafeInteger(index) || index < 0) {
        throw new RangeError(
            "Mini-React: state slot index must be a non-negative safe integer."
        );
    }

    if (!Object.hasOwn(stateStore, index)) {
        throw new Error(
            `Mini-React: state slot ${index} has not been initialized.`
        );
    }

    return stateStore[index];
}
