import { mountAudioPlayer } from "./mountAudioPlayer.js";
import { AudioEngineError, AUDIO_ERROR_CODES } from "./audioEngine.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox, wait } from "../../HW/source/testHarness.js";

// T-01 / T-02 / T-03 — player UI wiring in the real DOM, with a scripted engine and the real FIFO queue.

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
    const calls = { play: 0, stop: 0, dispose: 0, load: [], signals: {} };
    let playing = false;
    let onEnded = null;
    const analyser = { fftSize: 512, frequencyBinCount: 256, context: { sampleRate: 44100 } };
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
        getFrequencyData() {
            const data = new Uint8Array(256);
            data[10] = 180;
            return data;
        },
        async dispose() { calls.dispose += 1; },
        get isPlaying() { return playing; }
    };
}

function mount(engine) {
    const root = document.createElement("section");
    sandbox().append(root);
    const handle = mountAudioPlayer(root, { id: "player", tracks }, { engine });
    return { root, handle };
}

const buffer = { duration: 3, numberOfChannels: 1, getChannelData: () => new Float32Array(1) };
const status = (root) => root.querySelector("[role=status]");
const button = (root, selector) => root.querySelector(selector);
const settle = () => wait(0);

test("renders semantic markup with no div elements", () => {
    const { root } = mount(scriptedEngine({}));
    assertDeepEqual([...root.children].map((child) => child.tagName), ["SECTION", "P", "P", "P", "P"], "Child order");
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
