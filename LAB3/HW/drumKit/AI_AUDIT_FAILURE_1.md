# AI Failure Audit 1 — HW1: Production Studio Drum Kit

Defects found in the AI-assisted work on HW1 (PRD 1 to PRD 4): the semantic
drum pads, the keyboard engine, the audio engine with its visual telemetry,
and the WCAG 2.2 AA / Lighthouse QA pass.
Source of evidence: `log_working_1.md`, the Vitest and Playwright runs, and
`lighthouse/summary.json`.

| # | Failure | Type | Where we met it | Status |
| --- | --- | --- | --- | --- |
| 1 | AI ignored the project context: wrong folder, Project Rules not applied | Instruction / context failure | PRD 1 setup | Fixed |
| 2 | The PRD's `aria-label` broke WCAG 2.5.3 Label in Name | Accessibility bug copied from the spec | PRD 1, axe in Playwright | Fixed |
| 3 | jsdom and the browser computed different accessible names | Test-environment mismatch | PRD 1, Vitest | Fixed |
| 4 | Source-scanning tests failed on comments and on the disclaimer | False-positive tests | PRD 2 and PRD 3 | Fixed |
| 5 | The PRD's example border colour failed WCAG 1.4.11 (2.15:1) | Accessibility bug copied from the spec | PRD 4, contrast script | Fixed |
| 6 | `?raw` import of a CSS Module returned a class map (repeat of Exercise 1) | Repeated test-tooling bug | PRD 4, `theme.test.js` | Fixed |
| 7 | Lighthouse SEO 91: `robots.txt is not valid` | Build / deployment gap | PRD 4, Lighthouse | Fixed |
| 8 | Shell heredocs failed, so files were silently not written | Tooling failure | PRD 1 and PRD 3 | Fixed |

---

## Failure 1 — AI Ignored the Project Context

### Description

Twice at the start of the homework the AI went its own way instead of
following the course setup:

1. It began exploring the legacy `webappdev_hw/` drum kit as if the new
   project would live there. The user had to stop it: *"you do hw1 in
   LAB3/HW"*.
2. It then scaffolded the Vite project with the default
   `<div id="root"></div>` and started writing components without reading
   `LAB3/EXERCISE/Project_Rule.md`. The user had to stop it again:
   *"you must follow Project_Rule.md in LAB3"*.

The AI treated the rule file as belonging only to the EXERCISE folder,
although the four rules (Zero Div-Soup, Strict Typeguard, XSS-Safe
Rendering, Single-Direction Mounting) apply to every LAB3 deliverable.

### Where we met it

PRD 1, before any component existed. Both interruptions are recorded in
`log_working_1.md`.

### Solution

- The project was created in `LAB3/HW/drumKit`, and `<div id="root">` was
  changed to `<main id="root">`.
- Each rule got its own test, so a violation now fails the suite instead of
  depending on the AI remembering: no `<div>` in any source file, a
  `TypeError` on a bad pad config before rendering, an
  `<img onerror>` payload rendered as plain text, and DOM order equal to
  config order.
- The rule is saved in the AI's memory as applying to HW too.

**Lesson:** give the AI the rule file at the start of each task; do not
assume it carries rules from one folder to the next.

---

## Failure 2 — The PRD's `aria-label` Broke WCAG 2.5.3 Label in Name

### Description

PRD 1 asked for each pad to be labelled like
`aria-label="Kick drum, keyboard W"`. The AI copied that literally. The
visible text on the pad is **"Kick W"**, and an `aria-label` replaces the
visible text in the accessible name. A voice-control user who says
"click Kick W" would not match the name, which is exactly what WCAG 2.5.3
forbids. All unit tests passed, because they only checked that a label
existed.

### Where we met it

PRD 1, the Playwright + axe-core run in Edge at 375px:

```
"id": "label-content-name-mismatch", "impact": "serious",
"message": "Text inside the element is not included in the accessible name"
```

### Solution

The `aria-label` was removed and the name is computed from the content.
A visually hidden hint adds the context, and `aria-keyshortcuts` exposes
the key:

```jsx
<button type="button" aria-pressed={pressed} aria-keyshortcuts={pad.keyLabel}>
    <span className={nameClassName}>{pad.name}</span>
    {" "}
    <kbd className={keyClassName}>{pad.keyLabel}</kbd>
    {" "}
    <span className={hintClassName}>key, drum pad</span>
</button>
```

The name is now "Kick W key, drum pad", which contains the visible
"Kick W" in order. axe reports 0 violations.

**Lesson:** a PRD can contain an accessibility bug. Verify the spec with a
real audit instead of trusting it.

---

## Failure 3 — jsdom and the Browser Computed Different Names

### Description

After Failure 2 was fixed, all browser tests passed but two Vitest tests
failed:

```
FAIL  src/components/DrumKit.test.jsx > DrumKit > gives every pad a meaningful accessible name
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name ...
```

The first version put the separating space **inside** the hidden span
(`<span> key, drum pad</span>`). Browsers keep that leading space; jsdom
trimmed it, so jsdom computed "Kick Wkey, drum pad". The same markup had two
different names in two environments.

### Where we met it

PRD 1, `npx vitest run`, right after the axe fix passed in Playwright.

### Solution

Each space became its own text node (`{" "}` between `<span>`, `<kbd>` and
`<span>`, see the code above), so both environments build the same name.
Inside the pad's CSS grid a whitespace-only node renders nothing, so the
layout did not change. The DOM-structure test was updated to expect
`["SPAN", "KBD", "SPAN"]`.

**Lesson:** a passing browser test does not prove the unit test is right,
and the reverse; when the two disagree, find out which name each one
computes.

---

## Failure 4 — Source-Scanning Tests Failed on Comments and the Disclaimer

### Description

Some rules were checked by scanning the source text with a regex. The AI
wrote the regexes too broadly, and they matched documentation, not code:

1. **PRD 2:** the keyboard engine must use `event.code`, never
   `event.key`. The test failed because `keyboard.js` mentions `event.key`
   in a comment that explains why it is not used.
2. **PRD 3:** the meter must never label its reading as dB SPL (it is a
   relative dBFS value). The regex matched the on-screen disclaimer
   *"not calibrated dB SPL"* and then the header comment of
   `AudioMeter.jsx`. The first fix only removed the disclaimer, so the test
   failed a second time (`1 failed | 152 passed`).

### Where we met it

PRD 2 (`keyboard.test.js`) and PRD 3 (`AudioMeter.test.jsx`), in Vitest.

### Solution

Comments are stripped before matching, and the only allowed mention of SPL
is removed before checking:

```js
/** The code without its comments, so documentation may still name the forbidden APIs. */
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

expect(code.replace(/not calibrated dB SPL/g, "")).not.toMatch(/SPL/);
```

A separate test checks that the disclaimer is shown, so the rule still
catches a real "dB SPL" label.

**Lesson:** a text-search test must be tested against the comments and the
copy of the same file. When the same kind of bug appears twice, fix it the
same way in both places.

---

## Failure 5 — The PRD's Example Border Colour Failed WCAG 1.4.11

### Description

PRD 4 suggested design tokens, including the pad border `#475569`. The pad
border is the only edge that shows where a pad is, so it is a non-text
element that needs 3:1 contrast (WCAG 1.4.11). On the dark surface the
suggested colour reached only **2.15:1**.

### Where we met it

PRD 4. Before using the tokens, the AI computed the real contrast ratio of
every token pair with a small script instead of assuming the PRD values
were safe. The border line was the only one under its threshold.

### Solution

The border token was changed and the reason documented in `index.html`:

```css
/* #475569 from the PRD gives 2.15:1 and fails 1.4.11;
 * replaced by #64748b (3.43:1 on surface, 3.93:1 on background). */
--studio-border: #64748b;
```

`src/theme.test.js` now reads the tokens from `index.html` and computes
the ratios itself, so a future colour change that breaks contrast fails the
test.

---

## Failure 6 — `?raw` Import of a CSS Module Returned a Class Map (Repeat)

### Description

`theme.test.js` needed the stylesheet as text, and the AI wrote:

```js
import STYLES from "./components/DrumKit.module.css?raw";
```

With CSS Modules turned on in the Vitest config, this import returns a
class-name object, not text, so the focus-ring and target-size test failed.
This is **the same bug as Defect 4 of Exercise 1** (`EXERCISE/AI_AUDIT_FAILURE_1.md`):
the AI did not reuse a lesson already written down in the same repository.

A second brittle assertion appeared in the same PRD: the reduced-motion
browser test expected the string `"0.01ms"`, but Chromium serialises that
duration as `"1e-05s"`.

### Where we met it

PRD 4, `npx vitest run` (theme test) and `npx playwright test`
(reduced-motion test).

### Solution

```js
// Read as text: the Vitest CSS-Modules setting turns `?raw` imports of *.module.css into class maps.
const STYLES = readFileSync(new URL("./components/DrumKit.module.css", import.meta.url), "utf8");

// Chromium serialises 0.01ms as "1e-05s"; compare numerically in milliseconds.
const toMs = (value) => (value.trim().endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000);
expect(toMs(active.animation)).toBeLessThanOrEqual(0.01);
```

**Lesson:** read the earlier audits before starting a new task; compare
CSS values as numbers, not strings.

---

## Failure 7 — Lighthouse SEO 91: `robots.txt is not valid`

### Description

The PRD required Lighthouse 100 in every category. The first run gave
Performance, Accessibility and Best Practices 100, but **SEO 91**:

```json
{ "id": "robots-txt", "title": "robots.txt is not valid", "score": 0 }
```

The project had no `robots.txt`. `vite preview` has an SPA fallback, so a
request for `/robots.txt` returned `index.html`, and Lighthouse tried to
read HTML as robots rules.

### Where we met it

PRD 4, `npm run lighthouse` (`scripts/lighthouse.mjs`, mobile profile)
against the production build.

### Solution

A valid file was added at `public/robots.txt`, which Vite copies into
`dist/`:

```
User-agent: *
Allow: /
```

The next run reported 100 / 100 / 100 / 100, saved in
`lighthouse/summary.json`.

---

## Failure 8 — Shell Heredocs Failed, Files Silently Not Written

### Description

To save time, the AI tried to write several source files in one Bash command
with heredocs (PRD 1), and later to patch a test file with a Python script
inside a heredoc (PRD 3). Quotes and backticks in the JSX broke the shell
parsing both times:

```
/usr/bin/bash: -c: line 174: unexpected EOF while looking for matching `''
```

Nothing was written, while the next command in the chain (`npm install`)
still ran, so the project looked set up but had no source files.

### Where we met it

PRD 1 (scaffolding) and PRD 3 (`DrumKit.test.jsx` update).

### Solution

Files are written with the dedicated Write / Edit tools, one file at a
time, and the result is checked (`ls -R src`, then the test run) before
moving on. The AI did not repeat the multi-file heredoc after the second
failure.

**Lesson:** a failed command in a chain does not stop the commands after
it; check that the files exist before trusting the next step. This is the
same family of mistake as Defect 3 of Exercise 1 (`cd` failed but
`npm install` still ran).

---

## Summary

Two failures (2 and 5) came from the PRD itself; the AI copied them until a
real check, axe-core or a computed contrast ratio, proved them wrong. Two
(6 and 8) repeated mistakes already recorded in the Exercise audits. The
fixes that lasted were the ones turned into tests: every rule, contrast
pair and accessibility check above now fails the suite if it regresses.
Final state: 153 unit tests and 18 browser tests pass, axe reports
0 violations, and Lighthouse scores 100 in all four categories.
