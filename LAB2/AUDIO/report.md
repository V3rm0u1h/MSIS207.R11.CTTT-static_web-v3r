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

Tests: `source/audio.test.html` — 34/34 passed (headless Edge 155). They
cover the audio graph with a fake context, plus a real `AudioContext`
decoding the WAV and rejecting the missing and corrupted files.
