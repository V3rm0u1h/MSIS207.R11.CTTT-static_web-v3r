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
