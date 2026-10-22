# AI Failure Audit — Mini-React Audio Engine

Defects found in the AI-generated plan (the four audio PRDs, T-01 to T-04)
and in the code and tests produced from it while building the audio engine,
FIFO queue, cleanup layer and canvas visualizer in `audio/`.

## Defect 1 — Folder Move Broke Every Core Import

### Defect Description

Commit `b30e539` moved the audio work from `LAB2/AUDIO/` to
`LAB2/HW/audio/` but left the imports of the Mini-React core unchanged:

import { createElement } from "../../HW/source/createElement.js";

From `LAB2/AUDIO/source/` that path pointed to `LAB2/HW/source/`. From the
new `LAB2/HW/audio/source/` it points to `LAB2/HW/HW/source/`, which does
not exist. The demo and the test page both stopped loading, but the
commit went in as a T-03 "fix", and no test run after the move would have
reported anything except "Running tests…".

### Diagnostic Method

The first headless run of the test page during T-04 never finished. The
local server log showed the failing request:

"GET /HW/HW/source/testHarness.js HTTP/1.1" 404 -

A search for `../../HW/source/` found the same stale path in six files
(`mountAudioPlayer.js`, three test modules, `audio.test.html`) and in the
report's serving instructions, which still named `AUDIO/source/`.

### Refactored Solution

All imports now use `../../source/`, which resolves to the shared core in
`LAB2/HW/source/`. The report's paths were corrected:

- Demo: http://localhost:8765/HW/audio/source/audio.demo.html
- Tests: http://localhost:8765/HW/audio/source/audio.test.html

The fix shipped in the T-04 commit (`ded4b61`), and its message says so.
Lesson: after moving files, rerun the suite before committing.

---

## Defect 2 — "One Active Job" Contradicted by Cancellation

### Defect Description

PRD 2 (T-02) required one active job, so that downloads and decodes never
overlap. PRD 3 (T-03) required that cancelling a track takes effect at
once. These conflict, because `decodeAudioData()` takes no `AbortSignal`
and cannot be stopped once started.

The queue frees the active slot as soon as a running job is cancelled, so
the next job starts while the cancelled decode may still be running. The
queue's header comment still claimed "downloads and decodes never run in
parallel".

### Diagnostic Method

The T-03 cancellation path in `audioQueue.js` was traced against the T-02
guarantee. `cancel()` aborts the job's signal and releases the slot.
`engine.load()` can abort the `fetch()` but has to let a decode that is
already running finish. The two PRDs were never reconciled. The comment at
the top of the file and the T-03 notes below it described different
behaviour.

### Refactored Solution

The trade-off was kept on purpose, so that cancelling never waits for a
decode, and it is now stated consistently:

- `engine.load()` drops a decode that finishes after its signal fired and
  rejects with `aborted` ("its decode had already started and its result
  was discarded"). It never claims that the decode was stopped.
- The queue ignores whatever a cancelled `run()` returns later (the job is
  no longer `RUNNING`), so a stale buffer can never be cached or played.
- The header comment in `audioQueue.js` now names the exception: a
  cancelled job's decode may still finish in the background.
- The report's T-03 section records the brief overlap as a known trade-off.

---

## Defect 3 — Sub-Pixel Bars Were Drawn as a Blur

### Defect Description

The first T-04 visualizer drew one bar per frequency bin:

context2d.fillRect(bin * slot, usable - barHeight, slot - gap, barHeight);

At FFT 512 that is 256 bins. On a 200 px canvas each bar is 0.78 px wide,
so the canvas anti-aliased every bar into a blend of the bar and the
background colours. On screen the spectrum looked smeared. On the canvas,
no pixel had the bar colour at all.

### Diagnostic Method

The real-playback integration test, which checks the canvas for pixels in
the bar colour, failed while every unit test passed:

FAIL: real engine: playing the WAV draws live bars, stopping ends the loop — Bars drawn on the canvas

The unit tests used 4 bins over 200 px (50 px bars), so they never hit the
sub-pixel case. The 256-bin case only showed up with real audio data.

### Refactored Solution

`drawBars()` caps the number of bars so that each slot is at least 3 CSS px
wide (times `devicePixelRatio`). Neighbouring bins share a bar that shows
their peak value, and bar edges are rounded to whole pixels:

const bars = Math.min(bins, Math.floor(width / (MIN_BAR_SLOT * devicePixelRatio)));

No allocation was added; the peak is found with a plain loop. A new unit
test ("more bins than pixels share whole-pixel bars that keep each group's
peak") draws 256 bins on 200 px and checks for an exact bar-coloured pixel.
The suite went from 95/96 to 97/97.

---

## Defect 4 — "One Loop" Assertion Could Never Fail

### Defect Description

The two real-browser visualizer tests checked for duplicate animation loops
like this:

assert(requested - requestedBefore <= framesDuring + 1, "A single loop: one frame request per frame");

Both counters come from the visualizer itself. With two loops running,
each loop requests one frame per frame it draws, so both numbers double
and the check still passes. The test named "every track switch and replay
keeps at most one loop" could not detect stacked loops, which is exactly
the T-04 acceptance criterion it claimed to cover.

### Diagnostic Method

A mutation check removed the guard in `start()` that ignores a call while a
frame is pending, so every Play added a loop. Only 3 tests failed. The
real-player integration test still passed, although the player was then
running four loops at once. Reading its assertion showed that it compared
the visualizer's counters with each other.

### Refactored Solution

Both integration tests now compare the visualizer with an independent
reference, a separate `requestAnimationFrame` counter that measures the
browser's own frame rate over the same 300 ms window:

assert(framesDuring <= browserFrames + 1, ...);

A single loop can draw at most once per browser frame. With the same
mutation, both tests now fail with clear numbers:

FAIL: real engine ... — One loop: 36 visualizer frames in 18 browser frames
FAIL: real player ... — A single loop: 76 visualizer frames in 19 browser frames

The mutation now fails 4 tests instead of 3, and the unmutated suite still
passes 97/97.

---

## Defect 5 — Headless Test Runs Gave False Results

### Defect Description

The project's test pages report results only in the DOM, so they were run
in headless Edge. Two of the obvious ways of doing that gave wrong answers:

- `--dump-dom --virtual-time-budget=60000` froze at the first test that
  decodes a real WAV file. Virtual time does not wait for the real audio
  thread, so the page was saved with only 13 results and the text
  "Running tests…". This looked like a hang in the code.
- The first CDP runner attached to the first `page` target it found. Edge
  sometimes opens `edge://sync-confirmation-dialog/` first, so the runner
  reported "timed out after 0 results". During the mutation checks this
  looked as though one mutation made the whole suite hang.

### Diagnostic Method

The virtual-time stall was found by listing the last results in the
dumped DOM. It always stopped right after the last fake-context test and
before `real AudioContext decodes the sample WAV file`.

For the CDP runner, the same mutation was run three times with the same
"0 results" outcome. The runner was then changed to print the attached
page's state on timeout. It printed:

STATE: complete edge://sync-confirmation-dialog/ undefined items=0

The mutation itself was fine: on a correct target it failed 1 test, as
designed.

### Refactored Solution

Tests are run through a CDP script that opens the test page in real time,
attaches only to a target whose URL starts with `http`, and polls
`#test-summary` until it has a `data-result`. Edge is launched with
`--autoplay-policy=no-user-gesture-required`, because the two real-playback
tests need a running `AudioContext`. Those tests fail with an explicit
message ("needs autoplay allowed … click the page and reload") instead of
passing silently. Final results: audio 97/97, Data-Grid 101/101.

---

## Defect 6 — Commit History Does Not Match the Required Sequence

### Defect Description

The final checklist requires four commits in order, one per milestone. The
history has six:

ded4b61 feat(audio): implement performant real-time frequency visualizer
b30e539 fix(audio): prevent resource leaks and cancel stale requests
af3953d fix(audio): prevent resource leaks and cancel stale requests
1cbc557 feat(audio): implement FIFO loading and decoding queue
ed2fe0d feat(audio): implement FIFO loading and decoding queue
6a31042 feat(audio): implement Web Audio engine and analyser

T-02 and T-03 were each committed twice under the same message. The second
T-03 commit (`b30e539`) contains only the folder move that caused Defect 1,
yet its message describes resource-leak fixes.

### Diagnostic Method

`git log --oneline` was checked against section 5.3 of the PRD (Recommended
Commit Sequence). `git show --stat` on each duplicate showed what it
actually contains.

### Refactored Solution

Open. The order T-01 → T-04 is correct, but the history was not rewritten
without the author's approval. To meet the checklist, squash each pair into
one commit (`ed2fe0d` + `1cbc557`, `af3953d` + `b30e539`) with an
interactive rebase before submission. Otherwise, the report should state
that the second commit of each pair is a follow-up.
