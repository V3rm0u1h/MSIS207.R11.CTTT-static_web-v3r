# AI Failure Audit 3 — Exercise 3: PUBG Match Telemetry Radar

Defects found in the AI-assisted work on Exercise 3 (T-03A to T-03D): the
four-state machine, the abortable simulated feed, the Blue-Zone skeleton
and the error / retry flow. Some defects are in the AI's own code or tests;
others are in the PRDs, where following the text literally would have
produced a bug.

| # | Defect | Type | Status |
| --- | --- | --- | --- |
| 1 | A test that could never fail (regex corrupted into a backspace character) | False-green test | Fixed |
| 2 | Mock call history carried over between tests | Weak assertion | Fixed |
| 3 | Tests that could not run: spying on an ES module export and CSS `?raw` import | Broken test tooling | Fixed |
| 4 | `<p>` placed inside `<dl>` (invalid HTML) | Semantic markup bug | Fixed |
| 5 | PRD contradictions: heading level, fixed id, button label, Stage A vs B | Flawed specification | Resolved, documented |

---

## Defect 1 — A Test That Could Never Fail

### Defect Description

T-03D requires "no `window.alert()` calls". The AI added a source scan:

```js
expect(SOURCE).not.toMatch(/\balert\s*\(/);
```

The test file was edited with a Python script, and the AI wrote the regex
inside a normal (non-raw) Python string. Python turned `\b` into the
**backspace character** (`\x08`). The regex then searched for
"backspace + alert(", which can never appear in source code, so the test
**always passed** whether or not `alert()` was used.

This is the most dangerous kind of defect: a green test that checks
nothing.

### Diagnostic Method

Python printed a `SyntaxWarning: invalid escape sequence` during the edit.
Then `grep -n 'balert'` on the test file found nothing, and searching for
the byte `\x08` found it.

### Refactored Solution

The line was rewritten with a raw string, and the file was checked to
contain no `\x08` bytes:

```
grep -c $'\x08' PubgMatchTelemetry.test.jsx   →  0
```

As a second check, the end-to-end test listens for real browser dialogs
(`page.on("dialog", …)`) and asserts there are none during the whole flow.

---

## Defect 2 — Mock Call History Carried Over Between Tests

### Defect Description

`requestTelemetry` is a pass-through `vi.fn` mock. The rapid-switching test
checked that "every signal except the last is aborted" by reading
`requestTelemetry.mock.calls`. `vi.restoreAllMocks()` does not clear this
call list, so the list still held calls from earlier tests. Those requests
were aborted when their components unmounted, so the assertion passed, but
partly for the wrong reason.

### Diagnostic Method

The setup and teardown code was reviewed: nothing ever called `mockClear()`
on the module mock, while the test assumed it saw only its own calls.

### Refactored Solution

```js
beforeEach(() => {
    vi.useFakeTimers();
    requestTelemetry.mockClear();
});
```

The Reconnect test also clears the list right before clicking, so it counts
only the retry's call. It asserts exactly one new request, for the same
squad, with a fresh `AbortSignal` that has not been aborted.

---

## Defect 3 — Tests That Could Not Run

### Defect Description

Two test approaches the AI chose cannot work with this toolchain:

1. **Spying on an ES module export.** The stale-response test used
   `vi.spyOn(feedModule, "requestTelemetry")`. In ESM, exports are read-only
   bindings, and Vitest refuses to spy on them.
2. **`?raw` import of a CSS Module.** The Stage C CSS tests used
   `import CSS from "./PubgMatchTelemetry.module.css?raw"` and failed with
   `TypeError: default.match is not a function`.

The second one is **the same mistake as Audit 1, Defect 4**, repeated in a
later exercise. The fix was already in `DeveloperCard.styles.test.jsx`, and
the AI did not reuse it.

### Diagnostic Method

The Vitest output for problem 2 (3 failed tests, `default.match is not a
function`). For problem 1, the ESM spying limit was spotted before the run,
and the test was rewritten.

### Refactored Solution

```js
// Pass-through spy: the real simulated feed runs unless a test overrides one call.
vi.mock("../pubgTelemetry.js", async (importOriginal) => {
    const original = await importOriginal();
    return { ...original, requestTelemetry: vi.fn(original.requestTelemetry) };
});

// Read from disk: with CSS Modules on, a ?raw import of a .css file is not plain text.
const CSS = readFileSync(join(process.cwd(), "src/components/PubgMatchTelemetry.module.css"), "utf8");
```

**Process fix:** before writing a new kind of test, check how the existing
tests in the project already solve it.

---

## Defect 4 — `<p>` Placed Inside `<dl>`

### Defect Description

The first Stage A draft grouped each telemetry pair like this:

```jsx
<dl>
    <p key={key}><dt>{key}</dt><dd>{value}</dd></p>
</dl>
```

In HTML, `<dl>` may contain only `<dt>`, `<dd>` and `<div>` groups, so `<p>`
is invalid. Browsers may move the elements around, and screen readers can
lose the term/definition pairs. The draft also added a
`data-retry-tick={retryTick}` attribute with no purpose, only to make the
not-yet-used variable "used".

### Diagnostic Method

The generated JSX was reviewed against the HTML content model of `<dl>`
before the first test run.

### Refactored Solution

The pairs are written as direct children of `<dl>` (first with a keyless
`Fragment`, and in the final dashboard as fixed `<dt>/<dd>` pairs). The
two-column layout comes from CSS grid on the `<dl>`, so there is no wrapper
`<div>` (Project Rule 1). The fake attribute was removed. `retryTick` is
explained in a comment and is used as an effect dependency from Stage B on.

---

## Defect 5 — Contradictions in the PRDs

### Defect Description

Following the PRDs word for word would have produced several bugs:

| PRD text | Problem |
| --- | --- |
| T-03D: error title `<h3 id="telemetry-error-title">` | The page goes `<h1>` → `<h3>`, skipping a level. axe `heading-order` flags it. |
| T-03D: fixed `id="telemetry-error-title"` | Two components on one page would repeat the id and break `aria-labelledby` (same as Audit 1's limitation). |
| T-03D: "Reconnect Satellite (Retry)" vs "Reconnect Telemetry" | The PRD names two different labels for the same button. |
| T-03A: switching squad clears the old data | T-03B then requires switching squad to **abort the previous request**, so switching must start a new fetch, not just reset to IDLE. |
| T-03A: "request telemetry" button | Stage A has no fetching yet, so the button leaves the UI stuck in `LOADING` until Stage B. |

### Diagnostic Method

Each PRD was checked against the earlier stages and against the project's
own accessibility tests (axe in the Playwright suite).

### Refactored Solution

- Heading: `<h2>` instead of `<h3>`. axe now reports 0 violations in the
  IDLE, ERROR and SUCCESS states.
- Id: `useId()` instead of a fixed string.
- Label: the PRD's reference-contract wording, **Reconnect Telemetry**. The
  choice is documented so it can be changed in one place.
- Stage A vs B: the radar stays IDLE until the first request. After that,
  changing squad starts a new request, and the old request is aborted.
- The temporary stuck-in-`LOADING` state of Stage A was reported to the user
  at hand-off, not hidden.

Each deviation was explained to the user with the reason.

---

## Verification After the Fixes

- `npm test`: 134 / 134 unit tests pass.
- `npm run test:e2e`: 21 / 21 Playwright checks pass in Edge at 375px.
  They include the T-03D manual QA checklist: abort counted on CES → TE,
  rapid switching across all three squads with no false error, forced
  packet timeout, Reconnect, no dialogs, and axe with 0 violations.
- Screenshots: `profileCard/images/t03d-375-{idle,loading,error,success}.png`.
