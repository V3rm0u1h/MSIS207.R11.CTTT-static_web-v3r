import { mountAudioPlayer } from "./mountAudioPlayer.js";
import { AudioEngineError, AUDIO_ERROR_CODES } from "./audioEngine.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox, wait } from "../../HW/source/testHarness.js";

// T-01 — player UI wiring in the real DOM, with a scripted engine.

const tracks = [
    { id: "tone", title: "Tone", url: "tone.wav" },
    { id: "broken", title: "<img src=x onerror=alert(1)>", url: "broken.wav" }
];

/** Engine double: load results are scripted per URL. */
function scriptedEngine(results) {
    const calls = { play: 0, stop: 0, dispose: 0 };
    let playing = false;
    let onEnded = null;
    const analyser = { fftSize: 512, frequencyBinCount: 256, context: { sampleRate: 44100 } };
    return {
        calls,
        finish() { playing = false; onEnded?.(); },
        async load(url) {
            const result = results[url];
            if (result instanceof Error) throw result;
            return result;
        },
        async play(buffer, options = {}) {
            calls.play += 1;
            if (!buffer) throw new AudioEngineError(AUDIO_ERROR_CODES.NOT_READY, "No track is ready to play yet.");
            playing = true;
            onEnded = options.onEnded;
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
    assertDeepEqual([...root.children].map((child) => child.tagName), ["SECTION", "P", "P", "P"], "Child order");
    assertEqual(root.querySelectorAll("div").length, 0, "Zero div-soup");
    assertEqual(root.querySelector("section h2").textContent, "Tracks", "Heading");
    assertEqual(root.querySelectorAll("li > button[type=button]").length, 2, "One button per track");
    assertEqual(status(root).getAttribute("aria-live"), "polite", "Live region");
    assert(button(root, "[data-action=play]").disabled, "Play disabled before load");
    assert(button(root, "[data-action=stop]").disabled, "Stop disabled before play");
});

test("track titles are rendered as text, never parsed as HTML", () => {
    const { root } = mount(scriptedEngine({}));
    const broken = button(root, "[data-track-id=broken]");
    assertEqual(broken.textContent, tracks[1].title, "Literal text");
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

test("a slower earlier load cannot overwrite the latest selection", async () => {
    let releaseFirst;
    const engine = scriptedEngine({ "broken.wav": buffer });
    const originalLoad = engine.load;
    engine.load = (url) => url === "tone.wav"
        ? new Promise((resolve) => { releaseFirst = () => resolve(buffer); })
        : originalLoad(url);
    const { root, handle } = mount(engine);
    button(root, "[data-track-id=tone]").click();
    button(root, "[data-track-id=broken]").click();
    await settle();
    releaseFirst();
    await settle();
    assertEqual(handle.currentTrack.id, "broken", "Latest track kept");
    assertEqual(button(root, "[data-track-id=tone]").getAttribute("aria-pressed"), "false", "Earlier track not pressed");
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
