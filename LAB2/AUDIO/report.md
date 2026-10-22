# REPORT LAB2 — Mini-React Audio Engine

Audio engine and visualizer built on the Mini-React core in `../HW/source/`
(`createElement`, `renderToDOM`, `events`, `testHarness`). The core is
imported, not copied. Code is in `source/`.

Serve from the `LAB2/` folder so the `../../HW/source/` imports resolve:

```
cd LAB2
python -m http.server 8765
```

- Demo: http://localhost:8765/AUDIO/source/audio.demo.html
- Tests: http://localhost:8765/AUDIO/source/audio.test.html

## T-01 — Web Audio engine foundation

Commit: `feat(audio): implement Web Audio engine and analyser`

| File | Responsibility |
| --- | --- |
| `source/audioEngine.js` | Shared `AudioContext`, `AudioBufferSourceNode → AnalyserNode → destination` graph, fetch + `decodeAudioData`, `play` / `stop` / `getAnalyser` / `getFrequencyData` / `setFftSize` / `dispose`, `AudioEngineError` codes |
| `source/mountAudioPlayer.js` | Player UI (track list, live status, Play/Stop, spectrum reading) rendered with Mini-React and wired through root event delegation |
| `source/audio.css` | Contrast-checked player styles |
| `source/assets/tone-a440.wav` | 3 s test tone (440 Hz + 1320 Hz) |
| `source/assets/corrupted.wav` | Plain text with a `.wav` name, for decode-error testing |

Key decisions:

- The `AudioContext` is created lazily on first load and reused for every
  track. `play()` calls `resume()` first, so a context suspended by the
  autoplay policy starts on the user's click.
- `fftSize` is 512 by default (256 frequency bins); 256 (128 bins) is
  supported through `setFftSize(256)`. Other sizes throw a `TypeError`.
- Every `play()` creates a new `AudioBufferSourceNode`; `stop()` clears its
  `onended` handler and disconnects it.
- `getFrequencyData()` fills one reused `Uint8Array`, so the T-04 animation
  loop will not allocate per frame.
- Failures throw an `AudioEngineError` whose `code` is `invalid-url`,
  `network`, `http`, `decode`, `not-ready`, `suspended`, `unsupported` or
  `disposed`. The UI shows the message in a `role="status"` live region.
- Project rules: semantic markup only (`section`, `h2`, `ul`, `button`, `p`,
  no `div`); every prop and option is type-checked; all text goes through
  `createTextNode` / `textContent`; the UI tree is mounted once through
  `renderToDOM`.

Tests at T-01: 34/34 passed (headless Edge 155). They cover the audio
graph with a fake context, plus a real `AudioContext` decoding the WAV and
rejecting the missing and corrupted files.

## T-02 — FIFO loading and decoding queue

Commit: `feat(audio): implement FIFO loading and decoding queue`

| File | Responsibility |
| --- | --- |
| `source/audioQueue.js` | DOM-free FIFO scheduler: `enqueue`, `processNext`, `clearPending`, `getQueueStatus`, `subscribe`, `dispose` |
| `source/mountAudioPlayer.js` | Every track load now goes through the queue; per-track state, queue summary, "Load all tracks" and "Cancel waiting loads" |
| `source/assets/tone-a220.wav` | Second valid tone (220 Hz + 330 Hz) so several real loads can be queued |

Key decisions:

- **One active job** (`MAX_ACTIVE_JOBS = 1`). Jobs start in the order
  `enqueue` accepted them, and with one worker they also finish in that
  order. If more workers are added later, FIFO will mean start order only.
- **One job = whole lifecycle.** A job's `run` is `engine.load(url)` from
  T-01 (validate URL → fetch → status check → `arrayBuffer` →
  `decodeAudioData`). Downloads and decodes are never launched outside the
  queue. The engine itself is unchanged and still usable on its own.
- **Job states:** `QUEUED → RUNNING → SUCCESS | ERROR`, and
  `QUEUED → CANCELLED` via `clearPending()`. A job leaves the pending list
  exactly once, so it can only run once. Terminal jobs leave the queue at
  once; only counters and a capped history (20) are kept.
- **Failures never block.** A rejected or synchronously throwing `run`
  becomes `ERROR` with the original error kept on the job; the slot is
  released before the next job starts.
- **No lost errors.** `enqueue` returns `{ id, done }`; `done` resolves to
  the job's final snapshot and never rejects, so failures are reported
  through `status` / `error` instead of unhandled rejections.
- **Occasional UI updates.** The UI subscribes once and updates the queue
  summary text and track labels in place on each queue change (enqueued,
  started, succeeded, failed, cleared); nothing is re-rendered.
- Decoded buffers are cached per track, so choosing a loaded track again
  does not download it again. Choosing a failed track retries it.
- Aborting the *running* job is left to T-03 (AbortController).

Tests: `source/audio.test.html` — 50/50 passed (headless Edge 155). The
queue tests use deferred jobs with controlled completion to check start
order, that at most one job is ever active, that failures and synchronous
throws do not block the queue, cancellation, history capping and
notifications. One integration test queues four real loads (valid, 404,
corrupted, valid) and checks the outcomes arrive in submission order. A
mutation check (removing the single-slot guard) made 5 queue tests fail.

## T-03 — Resource cleanup and request cancellation

Commit: `fix(audio): prevent resource leaks and cancel stale requests`

| File | Change |
| --- | --- |
| `source/audioEngine.js` | `load(url, { signal })`, active-source registry, `play(..., { isCurrent })`, shared-context ownership, `onDispose()` hooks, full `dispose()`, `aborted` error code and `isAbortError()` |
| `source/audioQueue.js` | One `AbortController` per job (`run({ signal })`), `cancel(idOrKey)`, `cancelAll()`; stale outcomes ignored; history no longer keeps results |
| `source/mountAudioPlayer.js` | Switching tracks cancels the previous choice's load; selection generation guards Play; "Cancel loads" aborts running and waiting loads; cancellation is never shown as an error |

Key decisions:

- **Source nodes.** Playing nodes live in an `activeSources` set. A node
  leaves it exactly once (stop, replacement, natural `ended`, dispose):
  its `onended` is cleared, it is stopped if still running (an
  `InvalidStateError` from an already-stopped node is ignored) and
  disconnected. A late `ended` event from a replaced node does nothing.
  `stop()` and `dispose()` are safe to repeat.
- **Abort per request.** The queue gives every job its own
  `AbortController`. `engine.load()` makes another controller per load,
  linked to the job's signal, and passes it to `fetch()`. The engine can
  abort its own loads on dispose without aborting the caller's signal, and
  cancelling one track never touches another. The link listener is removed
  when the load ends.
- **Decode cannot be aborted.** `decodeAudioData()` takes no signal. If
  the signal fires while it runs, the decode is left to finish, its buffer
  is dropped, and the load rejects with `aborted` and the message "its
  decode had already started and its result was discarded". It never
  claims the decode was stopped.
- **Cancelling a running job frees the slot at once,** so the next job
  starts without waiting for a decode that cannot be aborted. Whatever the
  cancelled `run()` resolves or rejects with later is ignored (job status
  is no longer `RUNNING`). Trade-off: such a decode may overlap the next
  job's download for a moment; its result is never used.
- **Stale results.** A settled load only changes the status line if its
  track is still selected. Choosing another track cancels the load the
  previous choice started (loads from "Load all" are kept, since the user
  asked for all of them). Play captures the selection generation and
  passes `isCurrent` to `engine.play()`, which checks it after the context
  resumes and right before the source starts.
- **Cancellation is not failure.** Cancelled jobs are `CANCELLED`, never
  `ERROR`, even if `run()` rejects with an `AbortError`. The UI shows
  "Cancelled N loads." in the normal (not error) style and never marks a
  cancelled track as failed. `done` promises never reject, so there are no
  unhandled rejections.
- **Disposal.** Player `dispose()`: unsubscribe → `queue.dispose()`
  (cancel waiting jobs, abort the running one, refuse new jobs) → drop
  buffers → empty the root → `engine.dispose()` (abort loads, run
  `onDispose` hooks such as the T-04 animation frame, stop sources,
  disconnect the analyser, close the context). The queue's history keeps
  outcomes but not results, so decoded `AudioBuffer`s can be freed.
- **Shared context.** `createAudioEngine({ context })` borrows a context:
  the engine disconnects its own analyser and sources but never closes the
  borrowed context.
- **Event listeners.** The player's only native listener is the root
  click delegation from `HW/source/events.js`. That module has no detach
  and registers each root once, so remounting never stacks listeners; the
  per-element handlers live in a `WeakMap` and go away with the removed
  elements.

Tests: `source/audio.test.html` — 74/74 passed (3 runs, headless Edge 155).
New tests cover abort during download, abort while decoding, an
already-aborted signal, the source registry with a late `ended` event,
repeated stop, `isCurrent` dropping a stale Play, dispose while resuming,
shared-context ownership, dispose hooks, per-job signals, cancelling
running and queued jobs, `cancelAll`, rapid track switching in the UI,
Cancel loads, and player disposal with loads pending. One integration test
cancels a real in-flight download and checks the next real load still
decodes.

Mutation checks (each made tests fail, then the code was restored):

| Mutation | Failing tests |
| --- | --- |
| Queue accepts a cancelled job's late result | 3 |
| UI stops passing `isCurrent` to `play()` | 1 |
| UI stops cancelling the previous selection's load | 1 |
