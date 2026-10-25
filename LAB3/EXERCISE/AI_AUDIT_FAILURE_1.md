# AI Failure Audit 1 — Exercise 1: Semantic Engineer & Pro-Gamer Profile Card

Defects found in the AI-assisted work on Exercise 1 (T-01A to T-01D):
`SkillBadge`, `DeveloperCard`, the CSS Module and the 375px QA run.
Source of evidence: `log_working_hw1_lab3.md`, `profileCard/report.md`
and the test runs.

| # | Defect | Type | Status |
| --- | --- | --- | --- |
| 1 | Long skill name overflowed the 375px screen by 128px | Layout bug in generated CSS | Fixed |
| 2 | Contrast failure caused by the overflowing badge | Accessibility bug (knock-on of 1) | Fixed |
| 3 | `npm install` ran in the repository root | Wrong working directory | Fixed |
| 4 | CSS test imported a CSS Module with `?raw`, then mis-parsed `@container` | Broken test tooling | Fixed |
| 5 | Browser console check failed on an expected error | False-positive test | Fixed |

---

## Defect 1 — Long Skill Name Overflowed the 375px Screen

### Defect Description

The generated `SkillBadge` style made each badge an `inline-flex` pill with
no width limit. With `?profile=long`, the 47-letter unbroken skill name
pushed the badge, the card and the whole page wider than the phone screen:

```
document.documentElement.scrollWidth - clientWidth = 128   // expected 0
```

All 72 unit tests passed. jsdom does not lay out pages, so no unit test
could see the overflow.

### Diagnostic Method

The T-01D Playwright suite was run in Microsoft Edge at a 375 x 812 viewport
in four scenarios. It measures `scrollWidth - clientWidth` and lists every
element inside `<article>` whose box sticks out of the card. The first run
failed 5 of 18 checks; the overflow check named the skill badge.

### Refactored Solution

In `DeveloperCard.module.css`:

```css
/* A badge may not be wider than the list; long names wrap inside it. */
.badge {
    display: inline-flex;
    flex-wrap: wrap;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
}

.skillName,
.skillLevel {
    min-width: 0;
    overflow-wrap: anywhere;
}
```

Badges can no longer be wider than the card, and long words break inside
them. The overflow check now passes in all four scenarios, and the long
profile is kept as a permanent test scenario.

---

## Defect 2 — Colour Contrast Failure Caused by the Overflow

### Defect Description

axe-core reported a WCAG AA `color-contrast` violation on the badge's green
level text. The colour tokens themselves passed (unit-tested at ≥ 4.5:1 on
the card background). The overflowing badge had moved the text **outside
the card**, onto the light page background, where the green no longer had
enough contrast.

### Diagnostic Method

The axe audit in `e2e/profileCard.spec.js` failed only in the `long profile`
scenarios. The failing node was the same badge found in Defect 1, and its
bounding box was outside the card. The colour was right; its position was
wrong.

### Refactored Solution

No colour change was needed: fixing Defect 1 kept the text on the card
background, and axe now reports 0 violations in all four scenarios.

**Lesson:** a contrast check that only tests colour pairs is not enough;
the real-browser audit catches text that ends up on the wrong background.

---

## Defect 3 — `npm install` Ran in the Repository Root

### Defect Description

While setting up Vite, the AI chained `cd <project> && npm install`. The
`cd` failed, and the commands still ran in the repository root. This created
a stray `package.json`, `package-lock.json`, `.gitignore` and
`node_modules/` in the root of the course repository, outside the exercise
folder.

### Diagnostic Method

Running `pwd`, `ls -la` and `git status --short` afterwards showed the new
files at the root, where none had existed before.

### Refactored Solution

- The stray files were moved into `LAB3/EXERCISE/profileCard/`, and the
  root was checked again with `git status` to make sure it was unchanged.
- From then on, every command used an absolute path, and its working
  directory was checked before anything that writes files.

---

## Defect 4 — CSS Test Read the CSS Module Wrongly

### Defect Description

The T-01C styling tests needed the stylesheet as text, to check tokens and
selectors. Two errors came one after the other:

1. The test used `import CSS from "./DeveloperCard.module.css?raw"`.
   Because `vite.config.js` turns CSS Modules on for tests, the import
   returned a class-name object, not text:

   ```
   TypeError: default.replace is not a function
   ```

2. After that was fixed, the selector parser `/([^{}@]+)\{/g` read the
   header of `@container (max-width: 340px) {` as a selector. The test
   "every rule targets a module class" then failed, although the CSS
   was correct.

### Diagnostic Method

The Vitest error pointed at the import. Logging the parsed selector list
showed `(max-width: 340px)` among the "selectors".

### Refactored Solution

```js
// Read from disk: with CSS Modules on, a ?raw import of a .css file is not plain text.
const CSS = readFileSync(join(process.cwd(), "src/components/DeveloperCard.module.css"), "utf8");

// Drop at-rule headers such as "@container (...) {": they are not selectors.
const selectors = [...STYLESHEET.replace(/@[^{]+\{/g, "").matchAll(/([^{}]+)\{/g)];
```

To prove the colour test can still fail, a forbidden `color: #d0f0c0` was
added for a moment: the test failed, and the line was removed.

---

## Defect 5 — Browser Console Check Failed on an Expected Error

### Defect Description

The QA rule "no console errors" failed in the broken-avatar scenarios. The
browser itself always logs `Failed to load resource` when an image request
fails, and in `?avatar=broken` that failure is the point of the test. The
app cannot prevent this message. Making the rule looser for every error
would have hidden real problems.

### Diagnostic Method

The collected console message was compared with the request URL: it came
from `https://example.invalid/…`, the URL that is broken on purpose.

### Refactored Solution

The check allows **exactly one** message: `Failed to load resource` coming
from the deliberately broken URL. Every other error, warning or page error
still fails the test:

```js
const expectedFailure = message.text().startsWith("Failed to load resource")
    && message.location().url.startsWith(BROKEN_PATTERN.replace("**", ""));
if (!expectedFailure) problems.push(`${message.type()}: ${message.text()}`);
```

After the fixes for Defects 1, 2 and 5, the suite passed 18/18.

---

## Known Limitation (not fixed)

The reference contract fixes the heading id to `dev-heading`. Two cards on
one page would repeat the id and break `aria-labelledby`. The fix would be
an id from React `useId()`, as used later in Exercises 2 and 3. It was not
applied, so that the code still matches the contract.
