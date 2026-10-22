import { mountAudioPlayer } from "./mountAudioPlayer.js";
import { AudioEngineError, AUDIO_ERROR_CODES } from "./audioEngine.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox, wait } from "../../source/testHarness.js";
import { frameScheduler, fakeResizeObserverClass } from "./audioVisualizer.test.js";

// T-01 / T-02 / T-03 / T-04 — player UI wiring in the real DOM, with a scripted engine and the real FIFO queue.

const tracks = [
    { id: "tone", title: "Tone", url: "tone.wav" },
    { id: "broken", title: "<img src=x onerror=alert(1)>", url: "broken.wav" },
    { id: "low", title: "Low tone", url: "low.wav" }
];

/**
 * Engine double: load results are scripted per URL. Signals passed to load()
 * are recorded. Set engine.resumeGate to a promise to hold play() at the
 * "context resuming" step, like a real suspended AudioContext.
 */
function scriptedEngine(results) {
    const calls = { play: 0, stop: 0, dispose: 0, load: [], signals: {}, frequencyReads: 0 };
    let playing = false;
    let onEnded = null;
    const analyser = { fftSize: 512, frequencyBinCount: 256, context: { sampleRate: 44100 } };
    let frequencyData = new Uint8Array(256);
    const disposeHooks = new Set();
    return {
        calls,
        resumeGate: null,
        finish() { playing = false; onEnded?.(); },
        async load(url, { signal } = {}) {
            calls.load.push(url);
            calls.signals[url] = signal;
            const result = results[url];
            if (result instanceof Error) throw result;
            return result;
        },
        async play(buffer, options = {}) {
            calls.play += 1;
            if (!buffer) throw new AudioEngineError(AUDIO_ERROR_CODES.NOT_READY, "No track is ready to play yet.");
            await this.resumeGate;
            if (options.isCurrent && !options.isCurrent()) return false;
            playing = true;
            onEnded = options.onEnded;
            return true;
        },
        stop() { calls.stop += 1; playing = false; },
        getAnalyser: () => analyser,
        setFftSize(size) {
            analyser.fftSize = size;
            analyser.frequencyBinCount = size / 2;
            frequencyData = new Uint8Array(size / 2);
        },
        // One reused array, like the real engine.
        getFrequencyData() {
            calls.frequencyReads += 1;
            frequencyData[10] = 180;
            return frequencyData;
        },
        onDispose(callback) {
            disposeHooks.add(callback);
            return () => disposeHooks.delete(callback);
        },
        get disposeHookCount() { return disposeHooks.size; },
        async dispose() {
            calls.dispose += 1;
            for (const hook of [...disposeHooks]) hook();
            disposeHooks.clear();
        },
        get isPlaying() { return playing; }
    };
}

/** Frames run only on frames.step(), so no real animation loop outlives a test. */
function mount(engine) {
    const root = document.createElement("section");
    sandbox().append(root);
    const frames = frameScheduler();
    const ResizeObserverClass = fakeResizeObserverClass();
    const handle = mountAudioPlayer(root, { id: "player", tracks }, {
        engine,
        visualizer: {
            requestFrame: (callback) => frames.requestFrame(callback),
            cancelFrame: (id) => frames.cancelFrame(id),
            ResizeObserverClass
        }
    });
    return { root, handle, frames, resizeObserver: ResizeObserverClass.instances[0] };
}

const buffer = { duration: 3, numberOfChannels: 1, getChannelData: () => new Float32Array(1) };
const status = (root) => root.querySelector("[role=status]");
const button = (root, selector) => root.querySelector(selector);
const settle = () => wait(0);

test("renders semantic markup with no div elements", () => {
    const { root } = mount(scriptedEngine({}));
    assertDeepEqual([...root.children].map((child) => child.tagName), ["SECTION", "P", "P", "P", "SECTION"], "Child order");
    assertEqual(root.querySelectorAll("div").length, 0, "Zero div-soup");
    assertEqual(root.querySelector("section h2").textContent, "Tracks", "Heading");
    assertEqual(root.querySelectorAll("li > button[type=button]").length, 3, "One button per track");
    assertEqual(status(root).getAttribute("aria-live"), "polite", "Live region");
    assert(button(root, "[data-action=play]").disabled, "Play disabled before load");
    assert(button(root, "[data-action=stop]").disabled, "Stop disabled before play");
});

test("track titles are rendered as text, never parsed as HTML", () => {
    const { root } = mount(scriptedEngine({}));
    const broken = button(root, "[data-track-id=broken]");
    assertEqual(broken.firstChild.nodeValue, tracks[1].title, "Literal text");
    assertEqual(broken.querySelector("img"), null, "No injected element");
});

test("validates props before touching the root", () => {
    const root = document.createElement("section");
    root.textContent = "untouched";
    assertThrowsType(() => mountAudioPlayer(root, { tracks: [] }), /non-empty array/);
    assertThrowsType(() => mountAudioPlayer(root, { tracks: [{ id: "A B", title: "x", url: "x" }] }), /id must use/);
    assertThrowsType(() => mountAudioPlayer(root, { tracks: [tracks[0], tracks[0]] }), /duplicate/);
    assertThrowsType(() => mountAudioPlayer(root, { tracks: [{ id: "a", title: " ", url: "x" }] }), /title/);
    assertThrowsType(() => mountAudioPlayer(null, { tracks }), /mount root/);
    assertEqual(root.textContent, "untouched", "Root unchanged");
});

test("loading a track updates status, pressed state, analyser info and Play", async () => {
    const { root } = mount(scriptedEngine({ "tone.wav": buffer }));
    button(root, "[data-track-id=tone]").click();
    assertEqual(status(root).dataset.state, "loading", "Loading state shown");
    await settle();
    assertEqual(status(root).dataset.state, "ready", "Ready state");
    assert(status(root).textContent.includes("3.0 s"), "Duration shown");
    assertEqual(button(root, "[data-track-id=tone]").getAttribute("aria-pressed"), "true", "Pressed");
    assert(!button(root, "[data-action=play]").disabled, "Play enabled");
    assert(root.querySelector("[data-analyser-info]").textContent.includes("256 frequency bins"), "Analyser info");
});

test("load errors are shown in the status region", async () => {
    const error = new AudioEngineError(AUDIO_ERROR_CODES.HTTP, "Could not download the track (HTTP 404).");
    const { root } = mount(scriptedEngine({ "broken.wav": error }));
    button(root, "[data-track-id=broken]").click();
    await settle();
    assertEqual(status(root).dataset.state, "error", "Error state");
    assert(status(root).textContent.includes("HTTP 404"), "Engine message shown");
    assert(button(root, "[data-action=play]").disabled, "Play stays disabled");
});

test("Play, natural end and Stop update status and buttons", async () => {
    const engine = scriptedEngine({ "tone.wav": buffer });
    const { root } = mount(engine);
    button(root, "[data-track-id=tone]").click();
    await settle();
    button(root, "[data-action=play]").click();
    await settle();
    assertEqual(status(root).dataset.state, "playing", "Playing");
    assert(!button(root, "[data-action=stop]").disabled, "Stop enabled");
    engine.finish();
    assert(status(root).textContent.includes("finished"), "Finished message");
    assert(button(root, "[data-action=stop]").disabled, "Stop disabled after end");
    button(root, "[data-action=play]").click();
    await settle();
    button(root, "[data-action=stop]").click();
    assert(status(root).textContent.startsWith("Stopped"), "Stopped message");
    assert(engine.calls.stop >= 1, "Engine stop called");
});

/**
 * Engine whose listed URLs wait until release(url) is called. Like a real
 * download, a held load rejects with AbortError when its signal aborts.
 */
function heldEngine(results, heldUrls = ["tone.wav"]) {
    const releases = {};
    const engine = scriptedEngine(results);
    const originalLoad = engine.load.bind(engine);
    engine.load = (url, options = {}) => {
        if (!heldUrls.includes(url)) return originalLoad(url, options);
        engine.calls.load.push(url);
        engine.calls.signals[url] = options.signal;
        return new Promise((resolve, reject) => {
            releases[url] = () => resolve(buffer);
            options.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
    };
    return { engine, release: (url = "tone.wav") => releases[url]() };
}
const trackLabel = (root, id) => root.querySelector(`[data-track-id=${id}] [data-track-state]`);
const queueSummary = (root) => root.querySelector("[data-queue-summary]").textContent;

test("Load all queues tracks and loads them one at a time in order", async () => {
    const { engine, release } = heldEngine({ "broken.wav": buffer, "low.wav": buffer });
    const { root } = mount(engine);
    button(root, "[data-action=load-all]").click();
    assertDeepEqual(engine.calls.load, ["tone.wav"], "Later loads wait for the first");
    assertEqual(trackLabel(root, "tone").dataset.trackState, "loading", "First is loading");
    assertEqual(trackLabel(root, "broken").textContent, " — waiting (#2)", "Second shows its place");
    assertEqual(queueSummary(root), "Queue: 2 waiting, 1 loading (“Tone”) · 0 loaded, 0 failed, 0 cancelled.", "Summary");
    // Choosing a track queued by "Load all" reports its place and cancels nothing.
    button(root, "[data-track-id=low]").click();
    assert(status(root).textContent.includes("position 3"), "Selected track's place announced");

    release();
    await settle();
    assertDeepEqual(engine.calls.load, ["tone.wav", "broken.wav", "low.wav"], "FIFO order");
    assertEqual(status(root).dataset.state, "ready", "Selected track ready");
    assert(queueSummary(root).includes("3 loaded"), "Outcomes counted");
});

test("rapid switching cancels the stale load; a late result cannot replace the current track", async () => {
    const { engine, release } = heldEngine({ "low.wav": buffer }, ["tone.wav", "broken.wav"]);
    const { root, handle } = mount(engine);
    button(root, "[data-track-id=tone]").click();     // A starts downloading
    button(root, "[data-track-id=broken]").click();   // switch to B
    assert(engine.calls.signals["tone.wav"].aborted, "A's download aborted");
    assert(!engine.calls.signals["broken.wav"].aborted, "B's download untouched");
    assertDeepEqual(engine.calls.load, ["tone.wav", "broken.wav"], "B started without waiting for A");
    button(root, "[data-track-id=low]").click();      // switch again to C
    assert(engine.calls.signals["broken.wav"].aborted, "B's download aborted too");
    await settle();
    assertEqual(handle.currentTrack.id, "low", "Latest choice kept");
    assertEqual(status(root).dataset.state, "ready", "C is ready");
    assertEqual(trackLabel(root, "tone").dataset.trackState, "idle", "A back to not loaded");
    assert(queueSummary(root).includes("1 loaded, 0 failed, 2 cancelled"), "Cancellations are not failures");
    assertEqual(root.querySelector("[data-state=error]"), null, "No error message shown");
    // A late resolution of A (a decode that could not be aborted) changes nothing.
    release("tone.wav");
    await settle();
    assertEqual(trackLabel(root, "tone").dataset.trackState, "idle", "Stale result not cached");
    assert(status(root).textContent.includes("Low tone"), "Status still about the current track");
});

test("Play started before a track switch does not start once the context resumes", async () => {
    const engine = scriptedEngine({ "tone.wav": buffer, "low.wav": buffer });
    const { root } = mount(engine);
    button(root, "[data-action=load-all]").click();
    await settle();
    button(root, "[data-track-id=tone]").click();
    let resume;
    engine.resumeGate = new Promise((resolve) => { resume = resolve; });
    button(root, "[data-action=play]").click();       // context still resuming
    button(root, "[data-track-id=low]").click();      // user moves on
    resume();
    await settle();
    assertEqual(engine.isPlaying, false, "Old track never started");
    assert(status(root).textContent.includes("Low tone"), "Status still about the current track");
    assert(button(root, "[data-action=stop]").disabled, "Nothing to stop");
});

test("a failed load does not block the next queued track", async () => {
    const error = new AudioEngineError(AUDIO_ERROR_CODES.DECODE, "The file is not a supported or valid audio format.");
    const { root } = mount(scriptedEngine({ "tone.wav": buffer, "broken.wav": error, "low.wav": buffer }));
    button(root, "[data-action=load-all]").click();
    await settle();
    assertEqual(trackLabel(root, "broken").dataset.trackState, "error", "Failure shown on the track");
    assertEqual(trackLabel(root, "low").dataset.trackState, "ready", "Next track loaded");
    assert(queueSummary(root).includes("2 loaded, 1 failed"), "Outcomes counted");
});

test("Load all queues every unloaded track once; reselecting a loaded track reuses its buffer", async () => {
    const engine = scriptedEngine({ "tone.wav": buffer, "broken.wav": buffer, "low.wav": buffer });
    const { root } = mount(engine);
    button(root, "[data-action=load-all]").click();
    button(root, "[data-action=load-all]").click();
    await settle();
    assertDeepEqual(engine.calls.load, ["tone.wav", "broken.wav", "low.wav"], "Each track loaded once, in order");
    button(root, "[data-track-id=low]").click();
    assertEqual(engine.calls.load.length, 3, "No reload for a cached track");
    assertEqual(status(root).dataset.state, "ready", "Ready immediately");
    assert(!button(root, "[data-action=play]").disabled, "Play enabled");
});

test("Cancel loads aborts the running download and waiting loads without an error; the queue stays usable", async () => {
    const { engine } = heldEngine({ "broken.wav": buffer, "low.wav": buffer });
    const { root } = mount(engine);
    button(root, "[data-track-id=tone]").click();
    button(root, "[data-action=load-all]").click();
    const cancel = button(root, "[data-action=cancel]");
    assert(!cancel.disabled, "Cancel enabled while loading");
    cancel.click();
    assert(engine.calls.signals["tone.wav"].aborted, "Running download aborted");
    assertEqual(status(root).textContent, "Cancelled 3 loads.", "Cancel announced");
    assertEqual(status(root).dataset.state, "idle", "Not an error");
    assert(cancel.disabled, "Nothing left to cancel");
    await settle();
    assertDeepEqual(engine.calls.load, ["tone.wav"], "Waiting loads never ran");
    assertEqual(root.querySelector("[data-track-state=error]"), null, "No track marked failed");
    assert(queueSummary(root).includes("0 loaded, 0 failed, 3 cancelled"), "Cancelled counted");

    button(root, "[data-track-id=low]").click();
    await settle();
    assertEqual(trackLabel(root, "low").dataset.trackState, "ready", "Queue still works");
});

test("choosing a failed track again retries it", async () => {
    const results = { "broken.wav": new AudioEngineError(AUDIO_ERROR_CODES.NETWORK, "Could not download the track.") };
    const engine = scriptedEngine(results);
    const { root } = mount(engine);
    button(root, "[data-track-id=broken]").click();
    await settle();
    assertEqual(status(root).dataset.state, "error", "First attempt failed");
    results["broken.wav"] = buffer;
    button(root, "[data-track-id=broken]").click();
    await settle();
    assertEqual(engine.calls.load.length, 2, "Retried");
    assertEqual(status(root).dataset.state, "ready", "Second attempt succeeded");
});

test("Read spectrum reports the loudest bin", async () => {
    const { root } = mount(scriptedEngine({ "tone.wav": buffer }));
    button(root, "[data-track-id=tone]").click();
    await settle();
    button(root, "[data-action=sample]").click();
    assert(/Loudest bin 10 \(about 861 Hz, level 180\/255\)/.test(root.querySelector("[data-analyser-info]").textContent), "Peak described");
});

test("dispose() clears the root and disposes the engine once", async () => {
    const engine = scriptedEngine({});
    const { root, handle } = mount(engine);
    await handle.dispose();
    await handle.dispose();
    assertEqual(root.childNodes.length, 0, "Root cleared");
    assertEqual(engine.calls.dispose, 1, "Engine disposed once");
});

test("dispose() with loads pending aborts them, shows no error and runs no late updates", async () => {
    const { engine, release } = heldEngine({ "broken.wav": buffer });
    const { root, handle } = mount(engine);
    button(root, "[data-action=load-all]").click();
    const queue = handle.queue;
    await handle.dispose();
    assert(engine.calls.signals["tone.wav"].aborted, "Running download aborted");
    assertEqual(queue.getQueueStatus().cancelled, 3, "Every load cancelled");
    release();
    await settle();
    assertDeepEqual(engine.calls.load, ["tone.wav"], "No pending job started during shutdown");
    assertEqual(root.childNodes.length, 0, "Nothing written back into the root");
    assertThrowsType(() => queue.enqueue({ label: "late", run: () => 1 }), /disposed/);
});

// --- T-04: visualizer wiring ---

const visualizerStatus = (root) => root.querySelector("[data-visualizer-status]");

async function playTone(engine) {
    const mounted = mount(engine);
    button(mounted.root, "[data-track-id=tone]").click();
    await settle();
    button(mounted.root, "[data-action=play]").click();
    await settle();
    return mounted;
}

test("visualizer section has a heading, a labelled canvas with fallback text and a status line", () => {
    const { root } = mount(scriptedEngine({}));
    const section = root.lastElementChild;
    assertEqual(section.querySelector("h2").textContent, "Frequency spectrum", "Heading");
    assertEqual(section.getAttribute("aria-labelledby"), section.querySelector("h2").id, "Section labelled by heading");
    const canvas = section.querySelector("canvas");
    assertEqual(canvas.getAttribute("role"), "img", "Canvas exposed as an image");
    assert(canvas.getAttribute("aria-label").length > 0, "Canvas has an accessible name");
    assert(canvas.textContent.includes("cannot draw"), "Fallback text inside canvas");
    assert(visualizerStatus(root).textContent.includes("stopped"), "Idle status");
    assertEqual(section.querySelectorAll("div").length, 0, "No div elements");
});

test("Play starts one animation loop; frames read data without touching the DOM", async () => {
    const engine = scriptedEngine({ "tone.wav": buffer });
    const { root, frames, handle } = await playTone(engine);
    assert(handle.visualizer.isRunning, "Loop running");
    assertEqual(frames.pending, 1, "One frame pending");
    assert(visualizerStatus(root).textContent.includes("running"), "Status says running");
    const observer = new MutationObserver(() => {});
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    frames.step(60);
    await wait(0);
    const records = observer.takeRecords();
    observer.disconnect();
    assertEqual(records.length, 0, "No DOM mutation in 60 frames");
    assertEqual(engine.calls.frequencyReads, 60, "Data read every frame");
    assertEqual(frames.pending, 1, "Still one loop");
});

test("replaying and switching tracks never stack animation loops", async () => {
    const engine = scriptedEngine({ "tone.wav": buffer, "low.wav": buffer });
    const { root, frames, handle } = mount(engine);
    button(root, "[data-action=load-all]").click();
    await settle();
    for (const id of ["tone", "low", "tone", "low"]) {
        button(root, `[data-track-id=${id}]`).click();
        button(root, "[data-action=play]").click();
        button(root, "[data-action=play]").click();
        await settle();
        assertEqual(frames.pending, 1, `One loop after playing ${id} twice`);
        frames.step(2);
    }
    button(root, "[data-track-id=tone]").click();
    assertEqual(frames.pending, 0, "Switching tracks stops the loop");
    assert(!handle.visualizer.isRunning, "Not running until Play");
});

test("Stop and a natural end stop the loop and update only the visualizer text", async () => {
    const engine = scriptedEngine({ "tone.wav": buffer });
    const { root, frames, handle } = await playTone(engine);
    button(root, "[data-action=stop]").click();
    assertEqual(frames.pending, 0, "Stop cancels the frame");
    assert(visualizerStatus(root).textContent.includes("stopped"), "Status says stopped");
    button(root, "[data-action=play]").click();
    await settle();
    assertEqual(frames.pending, 1, "Play restarts it");
    engine.finish();
    assertEqual(frames.pending, 0, "Natural end cancels the frame");
    assert(!handle.visualizer.isRunning, "Not running");
});

test("FFT button switches the analyser between 512 and 256", async () => {
    const engine = scriptedEngine({ "tone.wav": buffer });
    const { root } = await playTone(engine);
    const fft = button(root, "[data-action=fft]");
    assert(!fft.disabled, "Enabled once a track loaded");
    fft.click();
    assertEqual(engine.getAnalyser().fftSize, 256, "Switched to 256");
    assertEqual(fft.textContent, "Use FFT 512", "Label offers the other size");
    assert(root.querySelector("[data-analyser-info]").textContent.includes("128 frequency bins"), "Info updated");
    fft.click();
    assertEqual(engine.getAnalyser().fftSize, 512, "Back to 512");
});

test("player dispose() cancels the frame, disconnects the resize observer and unregisters its engine hook", async () => {
    const engine = scriptedEngine({ "tone.wav": buffer });
    const { frames, handle, resizeObserver } = await playTone(engine);
    assertEqual(engine.disposeHookCount, 1, "Visualizer registered with the engine");
    await handle.dispose();
    assertEqual(frames.pending, 0, "No frame left");
    assert(resizeObserver.disconnected, "Resize observer disconnected");
    assert(handle.visualizer.isDisposed, "Visualizer disposed");
    assertEqual(engine.disposeHookCount, 0, "Engine hook removed");
});

test("disposing the engine directly also stops the visualizer", async () => {
    const engine = scriptedEngine({ "tone.wav": buffer });
    const { frames, handle } = await playTone(engine);
    await engine.dispose();
    assertEqual(frames.pending, 0, "No frame left");
    assert(handle.visualizer.isDisposed, "Visualizer disposed through the engine hook");
});
