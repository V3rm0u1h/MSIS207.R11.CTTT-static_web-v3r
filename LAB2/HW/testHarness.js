/**
 * Minimal in-browser test harness shared by the Data-Grid suites.
 * Tests may be async; results are listed on the page and in the console.
 */

const tests = [];

export function test(name, callback) { tests.push({ name, callback }); }
export function assert(condition, message) { if (!condition) throw new Error(message || "Assertion failed"); }
export function assertEqual(actual, expected, message) {
    if (actual !== expected) throw new Error(`${message || "Values differ"}: expected ${String(expected)}, received ${String(actual)}`);
}
export function assertDeepEqual(actual, expected, message) {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) throw new Error(`${message || "Values differ"}: expected ${right}, received ${left}`);
}
export function assertThrowsType(callback, pattern) {
    let error;
    try { callback(); } catch (caught) { error = caught; }
    assert(error instanceof TypeError, "Expected a TypeError to be thrown");
    if (pattern) assert(pattern.test(error.message), `Unexpected error message: ${error.message}`);
}
export const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** A visible scratch area: focus() only works on rendered elements. */
export function sandbox() { return document.querySelector("#test-sandbox"); }

export async function runTests(label) {
    const resultsElement = document.querySelector("#test-results");
    const summaryElement = document.querySelector("#test-summary");
    let failures = 0;

    for (const { name, callback } of tests) {
        let detail = "";
        try {
            await callback();
        } catch (error) {
            failures += 1;
            detail = ` — ${error.message}`;
        }
        sandbox().replaceChildren();
        const item = document.createElement("li");
        item.dataset.result = detail ? "fail" : "pass";
        item.textContent = `${detail ? "FAIL" : "PASS"}: ${name}${detail}`;
        resultsElement.append(item);
        (detail ? console.error : console.log)(item.textContent);
    }

    summaryElement.textContent = `${tests.length - failures}/${tests.length} ${label} tests passed.`;
    summaryElement.dataset.result = failures === 0 ? "pass" : "fail";
}
