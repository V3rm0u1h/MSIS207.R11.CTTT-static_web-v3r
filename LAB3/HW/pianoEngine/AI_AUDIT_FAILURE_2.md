# AI Failure Audit 2 — HW2: Polyphonic Voice Pool & Async FIFO Replay

Defects found in the AI-assisted work on HW2 (PRD 1 to PRD 4): the
algorithmic 88-key piano, the 8-voice PolyphonicSynth, FIFO recording with
variable-speed replay, and the abortable sequencer with React.memo render
isolation.
Source of evidence: `log_working_2.md`, the Vitest and Playwright runs
(Microsoft Edge, 375px), and the contrast checks in `src/theme.test.js`.

| # | Failure | Type | Where we met it | Status |
| --- | --- | --- | --- | --- |
| 1 | Hidden screen-reader text escaped the scrolling keyboard and widened the page | Layout / accessibility bug | PRD 1, Playwright | Fixed |
| 2 | AI-chosen focus and pressed-key colours failed WCAG 1.4.11 | Accessibility bug in the AI's own design | PRD 1 and PRD 3, contrast script | Fixed |
| 3 | Shell heredocs failed again, and a script patch silently did nothing (repeat of HW1) | Repeated tooling failure | PRD 1, PRD 3, PRD 4 | Fixed |
| 4 | The PRD's strictly sequential replay flow would play overlapping notes late | Logic flaw in the spec | PRD 3, design | Fixed (deviation documented) |
| 5 | `stop()` released the sounding notes one microtask too late | Async cancellation bug | PRD 3, Vitest | Fixed |
| 6 | Tests that checked the wrong thing: a clock-skew test and a whitespace assertion | Faulty tests | PRD 3, Vitest | Fixed |
| 7 | `new MutationObserver(...).observe(...)` stored `undefined`, so replay notes were counted twice | Faulty browser test, two attempts | PRD 3, Playwright | Fixed |
| 8 | `git checkout --` threw away uncommitted PRD 4 work | Destructive command | PRD 4, mutation check | Fixed |
| 9 | Playwright's `addInitScript(fn, arg)` passed the argument in the wrong position | API misuse | PRD 4, Playwright | Fixed |
| 10 | The AI wrote an unmount browser test that could never fail | Vacuous test | PRD 4, self-review | Removed |
| 11 | Later PRDs broke earlier tests (click API removed, new first Tab stop) | Regression from refactoring | PRD 3 and PRD 4 | Fixed |

---

## Failure 1 — Hidden Text Escaped the Scrolling Keyboard

### Description

Each key carries a visually hidden hint ("white key" / "black key") for
screen readers, using the usual `.srOnly` pattern (`position: absolute`,
1 × 1 px, clipped). The keyboard `<ol>` is about 2,000 px wide and scrolls
horizontally inside its section, so the page itself should never scroll
sideways. It did: the hidden spans had no positioned ancestor, so their
containing block was the viewport instead of the scrolling list. They sat
at their natural place far to the right, outside the list's `overflow-x:
auto` clip, and stretched the whole page. Every unit test passed, because
jsdom does no layout.

### Where we met it

PRD 1, the first Playwright run, at all three widths:

```
phone (375px): page never scrolls sideways, the keyboard does ...
Expected: <= 0
Received:    1698
```

### Solution

The key buttons became the containing block of their hidden text:

```css
.whiteKey,
.blackKey {
    /* Containing block for the .srOnly hint, so it stays inside the scrolling keyboard. */
    position: relative;
    ...
}
```

The browser test still checks, at 375, 768 and 1280 px, that the page
overflow is 0 while the keyboard's own overflow is greater than 0.

**Lesson:** `position: absolute` text inside a scroll container needs a
positioned ancestor *inside* that container. Only a real browser shows this.

---

## Failure 2 — AI-Chosen Colours Failed WCAG 1.4.11

### Description

This time no PRD supplied colours; the AI picked them and repeated the mistake
HW1 found in the PRD.

1. **PRD 1:** the first `index.html` used amber `#f59e0b` for the focus
   ring. The ring is drawn inside the key, so its neighbour is the white key
   `#f8fafc`: only **2.05:1**, under the 3:1 that a focus indicator needs.
2. **PRD 3:** pressed keys turn amber. On a pressed black key (`#b45309`)
   the violet focus ring `#8b5cf6` that replaced the amber one reaches only
   **1.19:1**, so a focused key that is also sounding would lose its
   visible focus.

### Where we met it

Before the tests were written, the AI computed the ratio of every candidate
colour against every background it can touch (white key, black key, page,
pressed keys) with a small Node script, instead of trusting its own choice.

### Solution

- The focus ring became violet `#8b5cf6`: 4.05:1 on white keys, 4.19:1 on
  black keys, 4.42:1 on the page.
- The ring became two-tone. A light inner ring `#f8fafc` (4.80:1 on the
  pressed black key) covers the one case the violet outline cannot:

```css
.whiteKey:focus-visible,
.blackKey:focus-visible {
    outline: 3px solid var(--piano-focus);
    outline-offset: -3px;
    box-shadow: inset 0 0 0 5px var(--piano-focus-inner);
}
```

- `src/theme.test.js` reads the tokens from `index.html` and asserts
  every pair: 8 text pairs at 4.5:1 and 11 non-text pairs at 3:1.
- A pressed key also gets a darker bottom bar, so "sounding" is not shown
  by hue alone.

**Lesson:** colours the AI invents need the same contrast proof as colours
from a spec.

---

## Failure 3 — Shell Heredocs Failed Again, and a Patch Did Nothing (Repeat)

### Description

HW1's Failure 8 recorded that heredocs break on JSX quotes and should not
be used to write files. The AI did it again in HW2:

1. **PRD 1:** components, CSS, `App.jsx` and `index.html` in a single
   heredoc command. Nothing was written:
   ```
   /usr/bin/bash: -c: line 235: unexpected EOF while looking for matching `''
   ```
2. **PRD 4:** a Python script inside a heredoc to rewrite a test file
   failed the same way (`line 141: unexpected EOF ...`).
3. **PRD 3:** a quieter variant. A Python `str.replace` patch ran without an
   error, but its search text had the wrong number of backslashes (`\\b`),
   so it matched nothing and changed nothing. The failure appeared only
   later, as a confusing test result:
   ```
   AssertionError: expected [] to have a length of 1 but got +0
   ```

### Where we met it

PRD 1 (scaffolding), PRD 3 (`Piano.test.jsx` update) and PRD 4
(`playSequence` tests).

### Solution

- Each time, the AI checked the directory or the file afterwards
  (`ls -la src`, `grep`) before trusting the step.
- It then wrote the files one at a time with the Write / Edit tools.
- The silent no-op was fixed with a direct Edit of the exact line.

**Lesson:** an earlier audit is useless if it is not read at the start of
the next task. A replace that matches nothing does not report an error, so
check its result.

---

## Failure 4 — The PRD's Sequential Replay Flow Plays Overlapping Notes Late

### Description

PRD 3 defines `deltaMs` as the time since the *previous event*, and gives
this replay loop:

```
Dequeue → wait deltaMs / speed → noteOn → wait durationMs / speed → noteOff → next
```

The two do not fit together for a piano. If C is held from 0 to 500 ms and
E is pressed at 100 ms, the recording says E starts 100 ms after C. The
sequential loop waits for C's note-off (500 ms) before it even begins E's
100 ms delay, so E sounds at 600 ms instead of 100 ms. Every chord or
legato passage would come out stretched and in single notes, which defeats
the 8-voice pool built in PRD 2. A chained `setTimeout` per delay also lets
timer lateness add up over a long sequence.

### Where we met it

PRD 3, while designing the replay, before any code was written.

### Solution

The loop still dequeues and awaits each **onset** in recorded order, so
order is preserved exactly. Each note's **release** runs on its own delay
instead of blocking the loop. Every delay targets an absolute time from the
start of playback, so one late timer does not push the rest back:

```js
const waitUntil = (offsetMs) => abortableDelay(Math.max(0, start + offsetMs - now()), signal);
...
onsetMs += event.deltaMs / speed;
await waitUntil(onsetMs);
synth.noteOn(event.midi, event.freqHz);
releases.push(waitUntil(onsetMs + event.durationMs / speed).then(/* noteOff */));
```

Tests check that overlapping notes replay at 0, 100, 300, 350, 500 and
600 ms, and that after a timer fires 30 ms late the next note is back on
schedule at 200 ms, not 230 ms. The deviation from the PRD text is
explained in the header comment of `playSequence.js`.

**Lesson:** follow the PRD's acceptance criteria ("replay preserves the
original note order" and timing), not a conceptual diagram that would break
them.

---

## Failure 5 — `stop()` Released Notes One Microtask Too Late

### Description

The PRD 3 sequencer's `stop()` cancelled the pending timers, and the replay
loop released its sounding notes in its `finally` block. That block only
runs after the awaited promise settles, which is a microtask later. So right
after the user pressed Clear Recording during a replay, a note was still
sounding and its key still looked pressed. An audio glitch like this is
easy to miss by ear.

### Where we met it

PRD 3, the Vitest integration test "Clear Recording removes every event,
and stops a replay in progress":

```
AssertionError: expected 1 to be +0 // Object.is equality
```

`synth.voices.size` was 1 just after the click.

### Solution

The release moved into the cancel path itself, so by the time `stop()`
returns, every replay note is released. The `finally` block remains as a
safety net for real errors and is a no-op after a stop. PRD 4 kept the same
contract: Stop Sequence aborts the controller and calls `releaseAll()`
synchronously, and the test asserts that `vi.getTimerCount()` is 0 and no
voice is left immediately after the click.

**Lesson:** "cancelled" must mean silent *now*, not after the event loop
gets around to it. Assert the state right after the action, not only at the
end.

---

## Failure 6 — Tests That Checked the Wrong Thing

### Description

Two of the AI's own PRD 3 tests were wrong, not the code:

1. **Clock-skew test.** It was meant to prove that one late timer does not
   delay later notes. It changed the fake clock *after* the next timer had
   already been scheduled, so the skew could never affect it:
   ```
   AssertionError: expected 200 to be 170
   ```
   The expectation of 170 was itself wrong. The correct property is that
   the note after a late one is back on schedule.
2. **Radio labels.** The test expected `"0.5×"`, but the label contains the
   `{" "}` separator text node, so its `textContent` is `" 0.5×"`.

### Where we met it

PRD 3, `npx vitest run`.

### Solution

The skew test now delays one specific timer by 30 ms and checks the
absolute onsets: the late note at 130 ms, the next one back at 200 ms
(chained delays would give 230 ms). The label assertion trims the text.

**Lesson:** when a new test fails, first check whether the test can
actually observe what it claims to test.

---

## Failure 7 — The MutationObserver Was Never Disconnected

### Description

The browser test for 0.5× / 1.0× / 2.0× replay records when each key turns
pressed, using a MutationObserver per run. The first run passed, but the
later runs saw every note two or three times:

```
- Expected  - 0
+ Received  + 3
  [ 60, + 60, 64, + 64, + 67, 67 ]
```

The first fix added `window.__observer?.disconnect()` before each run. It
changed nothing, because the observer had been stored like this:

```js
window.__observer = new MutationObserver(callback).observe(list, options);  // observe() returns undefined
```

So there was never anything to disconnect. The AI found it only after it
stopped guessing and logged each run's onsets with timestamps, which showed
the older observers still reporting.

### Where we met it

PRD 3, `npx playwright test --repeat-each=3`, failing 3 out of 3.

### Solution

```js
window.__observer = new MutationObserver((records) => { ... });
window.__observer.observe(document.querySelector("ol"), { subtree: true, attributeFilter: ["aria-pressed"], attributeOldValue: true });
```

Notes are also counted only on a `false` → `true` change (`oldValue`),
not by reading the current attribute later.

**Lesson:** when a fix does not change the symptom, the diagnosis was
wrong. Measure before attempting a second fix.

---

## Failure 8 — `git checkout --` Threw Away Uncommitted Work

### Description

To prove that the render-isolation tests can actually fail, the AI
temporarily broke `PianoKey.jsx` (`memo(PianoKey, () => false)`). The tests
failed as expected. To restore the file it ran:

```
git checkout -- src/components/PianoKey.jsx
```

This did not restore the PRD 4 version. It restored the last **commit**
(PRD 3), erasing the uncommitted memo / `shallowEqual` / `isActive` rewrite
of that file. The AI noticed only because its own command printed the
restored file's first line:

```
31:export default function PianoKey({ pianoKey, pressed = false, onNoteOn, onNoteOff, ...
```

### Where we met it

PRD 4, during the mutation check of the render-isolation tests.

### Solution

The PRD 4 version was rewritten in full. `git status` confirmed that no
other file had been touched, and the full unit and browser suites were run
again before the commit. The rule "never restore a file with
`git checkout --` in the middle of a PRD" is saved in the AI's memory.

**Lesson:** to undo a temporary edit, keep a copy and restore that copy, or
reverse the exact edit. Git only knows the last commit, not your last good
state.

---

## Failure 9 — Playwright's `addInitScript(fn, arg)` Got the Arguments Backwards

### Description

PRD 4 asks for a React DevTools Profiler check that pressing one key
re-renders only that key. The AI automated it with a small tracker that
installs React's DevTools hook. It was written as
`installRenderTracker(target, componentName)` and passed to
`page.addInitScript(installRenderTracker, "PianoKey")`. Playwright calls
`fn(arg)`, so `target` was the string `"PianoKey"` and the hook was never
installed in the page:

```
page.evaluate: TypeError: Cannot read properties of undefined (reading 'flat')
```

### Where we met it

PRD 4, both "Profiler check" browser tests in Edge (the jsdom version had
passed).

### Solution

The signature became `installRenderTracker(componentName, target = globalThis)`,
so the same function works in Vitest and in `addInitScript`. Both browser
tests also assert first that the tracker saw all 88 keys mount, so an
uninstalled hook fails loudly instead of trivially passing.

---

## Failure 10 — A Browser Test That Could Never Fail

### Description

PRD 4 requires cleanup on unmount. The React root cannot be reached from a
Playwright test, so the AI wrote this "unmount" browser test anyway:

```js
const result = await page.evaluate(async () => { ... return typeof createRoot; });
expect(["function", "undefined"]).toContain(result);
await page.goto("about:blank");
```

It accepts every possible outcome and never unmounts anything, so it would
have reported "unmount cleanup works" whatever the code did.

### Where we met it

PRD 4, while reviewing the new spec file before running it.

### Solution

The test was deleted, and the spec file says where the real check lives.
Unmount cleanup is verified in `src/components/Piano.test.jsx`, which
unmounts the app during a replay and asserts:

- no timers are left
- `releaseAll()` was called and no voice remains
- `synth.close()` was called once
- the `blur` listener was removed
- no note starts afterwards.

**Lesson:** a test that cannot fail is worse than no test, because it
reports coverage that does not exist. The same reasoning led the AI to
break the memo deliberately (Failure 8): six of the eight render-isolation
tests then failed, which proves they measure something real.

---

## Failure 11 — Later PRDs Broke Earlier Tests

### Description

1. **PRD 3** replaced the key's `onClick` / `onKeyPress` with press and
   release events, so that note durations can be recorded. Four PRD 1 tests
   still used the old API:
   ```
   AssertionError: expected "vi.fn()" to be called with arguments: [ { midi: 69, note: 'A', … } ]
   ```
2. **PRD 4** added the Voices panel above the keyboard, so the first Tab
   stop became "Release All Notes" instead of the A0 key:
   ```
   - "midi": "21",
   + "midi": undefined,
   ```

### Where we met it

PRD 3 and PRD 4, on the first full test run after each change.

### Solution

The old tests were rewritten for the new behaviour, not deleted:

- press and release by mouse and touch, a right-click that does not play,
  Enter or Space held with auto-repeat ignored, and release on blur;
- the focus test now steps through "Release All Notes" and then checks the
  ring on A0.

**Lesson:** run the whole suite, not only the new tests, after every
change to a shared component.

---

## Summary

- **From the PRD:** one failure (4) came from the spec itself, a replay
  diagram that contradicts its own timing criteria.
- **Repeated from HW1:** two failures (2 and 3) repeated mistakes already
  written down in HW1's audit.
- **Wrong tests:** four (6, 7, 9, 10) were tests that were wrong or could
  not fail. That is why the render-isolation tests were checked by breaking
  the code on purpose.
- **Most serious:** the destructive `git checkout` (8) and the late release
  in `stop()` (5). Both were caught only because the AI read command output
  carefully and asserted state immediately after each action.
- **Final state:** 228 unit tests and 20 browser tests in Microsoft Edge
  pass, and the timing-sensitive specs passed three runs in a row. axe
  reports 0 WCAG 2.2 AA violations at 375, 768 and 1280 px, and pressing one
  key re-renders exactly one of the 88 memoised `PianoKey` components.
- **Not done:** the manual React DevTools Profiler run from PRD 4
  section 8 was replaced by the automated hook-based check, and has not been
  performed by hand.
