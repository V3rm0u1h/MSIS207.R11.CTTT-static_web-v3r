import { createVisualizer } from "./audioVisualizer.js";
import { createAudioEngine } from "./audioEngine.js";
import { mountAudioPlayer } from "./mountAudioPlayer.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox, wait } from "../../source/testHarness.js";

// T-04 — real-time canvas frequency visualizer.

/**
 * Manual requestAnimationFrame: frames run only when the test calls step(),
 * so the number of scheduled loops can be counted exactly.
 */
export function frameScheduler() {
    let nextId = 1;
    const pending = new Map();
    return {
        requested: 0,
        cancelled: 0,
        requestFrame(callback) {
            this.requested += 1;
            const id = nextId++;
            pending.set(id, callback);
            return id;
        },
        cancelFrame(id) {
            if (pending.delete(id)) this.cancelled += 1;
        },
        get pending() { return pending.size; },
        step(count = 1) {
            for (let index = 0; index < count; index += 1) {
                const callbacks = [...pending.values()];
                pending.clear();
                callbacks.forEach((callback) => callback(performance.now()));
            }
        }
    };
}

/** ResizeObserver double: resize(w, h) delivers an entry like the browser. */
export function fakeResizeObserverClass() {
    const instances = [];
    class FakeResizeObserver {
        constructor(callback) {
            this.callback = callback;
            this.targets = [];
            this.disconnected = false;
            instances.push(this);
        }
        observe(target) { this.targets.push(target); }
        disconnect() { this.disconnected = true; this.targets = []; }
        resize(width, height) { this.callback([{ target: this.targets[0], contentRect: { width, height } }], this); }
    }
    FakeResizeObserver.instances = instances;
    return FakeResizeObserver;
}

function canvasInSandbox() {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:200px;height:100px";
    sandbox().append(canvas);
    return canvas;
}

function setup(overrides = {}) {
    const canvas = canvasInSandbox();
    const frames = frameScheduler();
    const ResizeObserverClass = fakeResizeObserverClass();
    const data = new Uint8Array([255, 0, 128, 0]);
    const reads = [];
    let active = true;
    const visualizer = createVisualizer(canvas, {
        getFrequencyData: () => { reads.push(data); return data; },
        isActive: () => active,
        requestFrame: (callback) => frames.requestFrame(callback),
        cancelFrame: (id) => frames.cancelFrame(id),
        ResizeObserverClass,
        devicePixelRatio: 1,
        ...overrides
    });
    const observer = ResizeObserverClass.instances[0];
    observer?.resize(200, 100);
    return { canvas, frames, observer, data, reads, visualizer, setActive: (value) => { active = value; } };
}

/** RGB of one canvas pixel. */
function pixel(canvas, x, y) {
    const [r, g, b] = canvas.getContext("2d").getImageData(x, y, 1, 1).data;
    return [r, g, b];
}
const BAR = [29, 78, 216];
const BASELINE = [107, 114, 128];
const BACKGROUND = [255, 255, 255];

test("visualizer validates its canvas and options", () => {
    const canvas = document.createElement("canvas");
    const getFrequencyData = () => null;
    assertThrowsType(() => createVisualizer(null, { getFrequencyData }), /canvas/);
    assertThrowsType(() => createVisualizer({ nodeType: 1 }, { getFrequencyData }), /canvas/);
    assertThrowsType(() => createVisualizer(canvas, []), /options must be a plain object/);
    assertThrowsType(() => createVisualizer(canvas, {}), /getFrequencyData/);
    assertThrowsType(() => createVisualizer(canvas, { getFrequencyData, isActive: true }), /isActive/);
    assertThrowsType(() => createVisualizer(canvas, { getFrequencyData, devicePixelRatio: 0 }), /devicePixelRatio/);
});

test("start() runs exactly one requestAnimationFrame loop, however often it is called", () => {
    const { frames, visualizer } = setup();
    assert(visualizer.start(), "First start schedules a frame");
    assert(!visualizer.start(), "Second start is ignored");
    assert(!visualizer.start(), "Third start is ignored");
    assertEqual(frames.pending, 1, "One pending frame");
    frames.step(60);
    assertEqual(frames.pending, 1, "Still one pending frame after 60 frames");
    assertEqual(visualizer.frameCount, 60, "One data read per frame");
    assert(visualizer.isRunning, "Running");
});

test("each frame reads frequency data into the caller's reused array", () => {
    const { frames, reads, data, visualizer } = setup();
    visualizer.start();
    frames.step(10);
    assertEqual(reads.length, 10, "Read once per frame");
    assert(reads.every((array) => array === data), "Same Uint8Array every frame");
});

test("bars are drawn from the frequency data above a baseline", () => {
    const { canvas, frames, visualizer } = setup();
    visualizer.start();
    frames.step();
    // 4 bins over 200 px: 50 px slots. Bin 0 = 255 (full height), bin 1 = 0, bin 2 = 128 (about half).
    assertDeepEqual(pixel(canvas, 25, 5), BAR, "Full bar reaches the top");
    assertDeepEqual(pixel(canvas, 75, 50), BACKGROUND, "Silent bin draws no bar");
    assertDeepEqual(pixel(canvas, 125, 70), BAR, "Half bar below the middle");
    assertDeepEqual(pixel(canvas, 125, 30), BACKGROUND, "Half bar stops near the middle");
    assertDeepEqual(pixel(canvas, 75, 99), BASELINE, "Baseline along the bottom");
});

test("more bins than pixels share whole-pixel bars that keep each group's peak", () => {
    const data = new Uint8Array(256);
    data[200] = 255;
    const { canvas, frames, visualizer } = setup({ getFrequencyData: () => data });
    visualizer.start();
    frames.step();
    // 200 px / 3 px slots = 66 bars of ~3.9 bins; bin 200 falls in bar 51 (x 154..157).
    assertDeepEqual(pixel(canvas, 155, 5), BAR, "Peak bin drawn at full height with a crisp colour");
    assertDeepEqual(pixel(canvas, 20, 50), BACKGROUND, "Silent groups draw nothing");
});

test("frames draw on the canvas without any DOM mutation", async () => {
    const { canvas, frames, visualizer } = setup();
    const observer = new MutationObserver(() => {});
    observer.observe(sandbox(), { subtree: true, childList: true, attributes: true, characterData: true });
    visualizer.start();
    frames.step(120);
    await wait(0);
    const records = observer.takeRecords();
    observer.disconnect();
    assertEqual(records.length, 0, "No DOM changes during 120 frames");
    assertEqual(sandbox().querySelectorAll("*").length, 1, "Still only the canvas");
    assertDeepEqual(pixel(canvas, 25, 5), BAR, "Yet the canvas was drawn");
});

test("stop() cancels the pending frame and leaves a flat baseline", () => {
    const { canvas, frames, visualizer } = setup();
    visualizer.start();
    frames.step(3);
    visualizer.stop();
    visualizer.stop();
    assertEqual(frames.pending, 0, "No frame left");
    assertEqual(frames.cancelled, 1, "Frame cancelled once");
    assert(!visualizer.isRunning, "Not running");
    assertDeepEqual(pixel(canvas, 25, 5), BACKGROUND, "Bars cleared");
    assertDeepEqual(pixel(canvas, 25, 99), BASELINE, "Baseline drawn");
    assert(visualizer.start(), "Can start again after stop");
    assertEqual(frames.pending, 1, "One loop again");
});

test("the loop ends itself with a baseline frame when playback is no longer active", () => {
    const { canvas, frames, visualizer, setActive } = setup();
    visualizer.start();
    frames.step(2);
    setActive(false);
    frames.step();
    assertEqual(frames.pending, 0, "No further frames scheduled");
    assert(!visualizer.isRunning, "Loop ended");
    assertEqual(visualizer.frameCount, 2, "No data read once inactive");
    assertDeepEqual(pixel(canvas, 25, 5), BACKGROUND, "Final frame is flat");
});

test("missing analyser data draws a baseline; a throwing source stops the loop", () => {
    const { canvas, frames, visualizer } = setup({ getFrequencyData: () => null });
    visualizer.start();
    frames.step(3);
    assertEqual(frames.pending, 1, "Keeps running without data");
    assertDeepEqual(pixel(canvas, 25, 99), BASELINE, "Baseline shown");

    const originalError = console.error;
    console.error = () => {};
    try {
        const failing = setup({ getFrequencyData: () => { throw new Error("analyser gone"); } });
        failing.visualizer.start();
        failing.frames.step();
        assertEqual(failing.frames.pending, 0, "Failing loop stopped instead of throwing every frame");
        assert(!failing.visualizer.isRunning, "Not running");
    } finally {
        console.error = originalError;
    }
});

test("the backing store follows the element size and device pixel ratio", () => {
    const { canvas, observer, visualizer } = setup({ devicePixelRatio: 2 });
    assertDeepEqual(visualizer.size, { width: 400, height: 200 }, "200x100 CSS px at 2x");
    observer.resize(320, 80);
    assertEqual(canvas.width, 640, "Width follows container");
    assertEqual(canvas.height, 160, "Height follows container");
    assertDeepEqual(pixel(canvas, 10, 159), BASELINE, "Repainted after resize while stopped");
});

test("a real ResizeObserver resizes the canvas when its container changes", async () => {
    const canvas = canvasInSandbox();
    canvas.style.width = "100%";
    sandbox().style.width = "300px";
    try {
        const visualizer = createVisualizer(canvas, { getFrequencyData: () => null, devicePixelRatio: 1 });
        await wait(50);
        assertEqual(canvas.width, 300, "Matches the 300 px container");
        sandbox().style.width = "180px";
        await wait(50);
        assertEqual(canvas.width, 180, "Follows the container down");
        visualizer.dispose();
    } finally {
        sandbox().style.width = "";
    }
});

test("dispose() cancels the frame, disconnects the observer and blocks restarts", () => {
    const { frames, observer, visualizer } = setup();
    visualizer.start();
    visualizer.dispose();
    visualizer.dispose();
    assertEqual(frames.pending, 0, "Frame cancelled");
    assert(observer.disconnected, "Resize observer disconnected");
    assert(visualizer.isDisposed, "Disposed");
    assert(!visualizer.start(), "start() refused after dispose");
    assertEqual(frames.pending, 0, "Still nothing scheduled");
});

test("without ResizeObserver the window resize listener is removed on dispose", () => {
    const added = [];
    const removed = [];
    const originalAdd = window.addEventListener;
    const originalRemove = window.removeEventListener;
    window.addEventListener = function (type, listener, ...rest) { if (type === "resize") added.push(listener); return originalAdd.call(this, type, listener, ...rest); };
    window.removeEventListener = function (type, listener, ...rest) { if (type === "resize") removed.push(listener); return originalRemove.call(this, type, listener, ...rest); };
    try {
        const { visualizer } = setup({ ResizeObserverClass: null });
        assertEqual(added.length, 1, "One resize listener");
        visualizer.dispose();
        assertDeepEqual(removed, added, "The same listener removed");
    } finally {
        window.addEventListener = originalAdd;
        window.removeEventListener = originalRemove;
    }
});

test("a canvas without a 2D context runs without drawing and reports canDraw false", () => {
    const frames = frameScheduler();
    const fakeCanvas = { nodeType: 1, width: 300, height: 150, clientWidth: 0, clientHeight: 0, getContext: () => null };
    const visualizer = createVisualizer(fakeCanvas, {
        getFrequencyData: () => new Uint8Array(4),
        requestFrame: (callback) => frames.requestFrame(callback),
        cancelFrame: (id) => frames.cancelFrame(id),
        ResizeObserverClass: fakeResizeObserverClass()
    });
    assert(!visualizer.canDraw, "Reports no drawing support");
    visualizer.start();
    frames.step(2);
    visualizer.dispose();
    assertEqual(frames.pending, 0, "Cleaned up");
});

// --- Integration: real engine, real AudioContext, real requestAnimationFrame ---

/**
 * Count the browser's own animation frames for ms milliseconds. One loop
 * draws at most once per browser frame, so two stacked loops show up as
 * about twice as many visualizer frames as browser frames.
 */
async function countBrowserFrames(ms) {
    let ticks = 0;
    let counting = true;
    const tick = () => {
        if (!counting) return;
        ticks += 1;
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await wait(ms);
    counting = false;
    return ticks;
}

test("real engine: playing the WAV draws live bars, stopping ends the loop", async () => {
    const engine = createAudioEngine();
    const state = await engine.resume();
    assert(state === "running", `AudioContext is "${state}": this test needs autoplay allowed (headless flag --autoplay-policy=no-user-gesture-required, or click the page and reload)`);
    const canvas = canvasInSandbox();
    const visualizer = createVisualizer(canvas, {
        getFrequencyData: () => engine.getFrequencyData(),
        isActive: () => engine.isPlaying,
        devicePixelRatio: 1
    });
    engine.onDispose(() => visualizer.dispose());
    try {
        const buffer = await engine.load("assets/tone-a440.wav");
        await engine.play(buffer);
        visualizer.start();
        visualizer.start();
        await wait(100);
        const framesBefore = visualizer.frameCount;
        const browserFrames = await countBrowserFrames(300);
        const framesDuring = visualizer.frameCount - framesBefore;
        assert(framesDuring > 5, `Frames ran (${framesDuring})`);
        assert(framesDuring <= browserFrames + 1, `One loop: ${framesDuring} visualizer frames in ${browserFrames} browser frames`);
        assert(engine.getFrequencyData().some((value) => value > 0), "Analyser hears the tone");
        const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height - 2);
        let barPixels = 0;
        for (let index = 0; index < data.length; index += 4) {
            if (data[index] === BAR[0] && data[index + 1] === BAR[1] && data[index + 2] === BAR[2]) barPixels += 1;
        }
        assert(barPixels > 0, "Bars drawn on the canvas");

        engine.stop();
        const framesAtStop = visualizer.frameCount;
        await wait(100);
        assert(!visualizer.isRunning, "Loop ended after stop");
        assertEqual(visualizer.frameCount, framesAtStop, "No frames after stop");
    } finally {
        await engine.dispose();
    }
    assert(visualizer.isDisposed, "Engine dispose hook disposed the visualizer");
});

test("real player: every track switch and replay keeps at most one loop", async () => {
    const root = document.createElement("section");
    sandbox().append(root);
    let cancelled = 0;
    const player = mountAudioPlayer(root, {
        id: "viz-player",
        tracks: [
            { id: "a440", title: "A440", url: "assets/tone-a440.wav" },
            { id: "a220", title: "A220", url: "assets/tone-a220.wav" }
        ]
    }, {
        visualizer: {
            cancelFrame: (id) => { cancelled += 1; cancelAnimationFrame(id); }
        }
    });
    const click = (selector) => root.querySelector(selector).click();
    try {
        click("[data-action=load-all]");
        for (let tries = 0; tries < 100 && player.queue.getQueueStatus().success < 2; tries += 1) await wait(20);
        assertEqual(player.queue.getQueueStatus().success, 2, "Both tracks decoded");
        for (const id of ["a440", "a220", "a440"]) {
            click(`[data-track-id=${id}]`);
            click("[data-action=play]");
            click("[data-action=play]");
            await wait(150);
            assert(player.visualizer.isRunning, `Running for ${id}`);
        }
        const framesBefore = player.visualizer.frameCount;
        const browserFrames = await countBrowserFrames(300);
        const framesDuring = player.visualizer.frameCount - framesBefore;
        assert(framesDuring > 0, "Frames advance");
        assert(framesDuring <= browserFrames + 1, `A single loop: ${framesDuring} visualizer frames in ${browserFrames} browser frames`);
        click("[data-action=stop]");
        assert(!player.visualizer.isRunning, "Stopped with playback");
        assertEqual(root.querySelector("[data-visualizer-status]").dataset.state, "ready", "Visualizer status updated");
    } finally {
        await player.dispose();
    }
    assert(player.visualizer.isDisposed, "Disposed with the player");
    assert(cancelled >= 1, "Frames were cancelled on stop/switch");
});
