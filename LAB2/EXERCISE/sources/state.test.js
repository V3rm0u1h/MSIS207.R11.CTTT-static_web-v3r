
import {
    stateStore,
    resetCursor,
    claimStateSlot,
    readStateSlot,
} from "./state.js";

function assert(condition, message) {
    if (!condition) {
        throw new Error(`TEST FAILED: ${message}`);
    }

    console.log(`PASS: ${message}`);
}

// Test 1: Different initial values occupy stable slots.
resetCursor();

assert(claimStateSlot(10).value === 10, "Initial number");
assert(claimStateSlot(false).value === false, "Initial false");
assert(claimStateSlot("").value === "", "Initial empty string");

// Test 2: An explicitly stored undefined is still initialized.
resetCursor();

claimStateSlot(undefined);
assert(
    Object.hasOwn(stateStore, 0),
    "Undefined occupies an initialized slot"
);

// Test 3: Cursor resets without clearing state.
stateStore[0] = 99;
resetCursor();

assert(stateStore[0] === 99, "Reset preserves stored values");

// Test 4: Repeated render uses the same slots.
assert(claimStateSlot("ignored").value === 99, "Slot zero is preserved");
assert(claimStateSlot("next").value === false, "Slot one is preserved");
assert(claimStateSlot("next").value === "", "Slot two is preserved");

// Test 5: Cursor resets to zero.
resetCursor();

assert(claimStateSlot("ignored").index === 0, "Cursor returns to zero");

// Test 6: Invalid reads are rejected.
let rejectedInvalidIndex = false;

try {
    readStateSlot(-1);
} catch (error) {
    rejectedInvalidIndex = error instanceof RangeError;
}

assert(rejectedInvalidIndex, "Negative index is rejected");

console.log("All state-store tests passed.");
