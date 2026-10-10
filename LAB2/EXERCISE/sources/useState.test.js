
import {
    stateStore,
    resetCursor,
} from "./state.js";

import {
    useState,
    setRenderCallback,
} from "./useState.js";

function assert(condition, message) {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }

    console.log(`PASS: ${message}`);
}

// Test 1: Initialize multiple slots with falsy values.
resetCursor();

const [zero] = useState(0);
const [flag] = useState(false);
const [empty] = useState("");
const [nothing] = useState(null);

assert(zero === 0, "Initial value 0");
assert(flag === false, "Initial value false");
assert(empty === "", "Initial empty string");
assert(nothing === null, "Initial value null");

// Test 2: Preserve state across renders.
resetCursor();

const [count, setCount] = useState(0);
assert(count === 0, "Initial count is preserved");

// Test 3: Update a slot and retrieve its new value.
setCount(5);

resetCursor();

const [updatedCount] = useState(100);
assert(updatedCount === 5, "Updated state survives rerender");

// Test 4: Setters remain bound to their original slots.
resetCursor();

const [, setFirst] = useState(0);
const [, setSecond] = useState(false);

setFirst(20);
setSecond(true);

resetCursor();

const [first] = useState(0);
const [second] = useState(false);

assert(first === 20, "First slot updates independently");
assert(second === true, "Second slot updates independently");

// Test 5: Functional updates use the latest value.
setFirst(previous => previous + 1);
setFirst(previous => previous + 1);

resetCursor();

const [latestFirst] = useState(0);
assert(latestFirst === 22, "Functional updates use latest state");

// Test 6: Captured setter works after cursor reset.
resetCursor();

const [, stableSetter] = useState("original");

resetCursor();
useState("original");
useState("another slot");

stableSetter("updated by captured setter");

assert(
    stateStore[0] === "updated by captured setter",
    "Setter targets its original slot"
);

// Test 7: Request a render after a successful update.
let renderRequests = 0;

setRenderCallback(() => {
    renderRequests += 1;
});

stableSetter("trigger render");

assert(renderRequests === 1, "Render callback is invoked");

// Test 8: Identical values do not trigger unnecessary renders.
stableSetter("trigger render");

assert(
    renderRequests === 1,
    "Identical state does not request another render"
);

// Test 9: A throwing updater leaves the value unchanged.
const beforeError = stateStore[0];
let updaterFailed = false;

try {
    stableSetter(() => {
        throw new Error("Expected test error");
    });
} catch {
    updaterFailed = true;
}

assert(updaterFailed, "Updater error propagates");
assert(
    stateStore[0] === beforeError,
    "Failed updater does not change state"
);
assert(
    renderRequests === 1,
    "Failed updater does not request a render"
);

// Clean up the callback after testing.
setRenderCallback(null);

console.log("All useState tests passed.");
