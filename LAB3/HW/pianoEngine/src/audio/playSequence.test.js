import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AudioTaskQueue } from "./AudioTaskQueue.js";
import { PLAYBACK_SPEEDS, playSequence } from "./playSequence.js";
import { createPianoKey } from "../utils/midiUtils.js";

// T-02C — asynchronous FIFO replay at 0.5× / 1.0× / 2.0× (PRD 3 sections 5–7).
// T-02D — every replay is cancelled through an AbortController signal (PRD 4 sections 2–4).

const hz = (midi) => createPianoKey(midi).freqHz;
const ev = (midi, deltaMs, durationMs) => Object.freeze({ midi, freqHz: hz(midi), durationMs, deltaMs });
const MELODY = Object.freeze([ev(60, 0, 300), ev(62, 400, 200), ev(64, 400, 400)]);

let log;
let synth;

beforeEach(() => {
    vi.useFakeTimers();
    log = [];
    synth = {
        noteOn: vi.fn((midi) => log.push([Date.now(), "on", midi])),
        noteOff: vi.fn((midi) => log.push([Date.now(), "off", midi]))
    };
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

/** Starts a replay of `events` from a fresh queue, with its own controller. */
function start(events, speed = 1, controller = new AbortController()) {
    const queue = new AudioTaskQueue(events);
    const done = playSequence({ queue, synth, speed, signal: controller.signal, now: () => Date.now() });
    return { done, controller, queue };
}

/** Plays to completion on the fake clock; log times are relative to the start. */
async function playAll(events, speed) {
    const begin = Date.now();
    const { done } = start(events, speed);
    await vi.runAllTimersAsync();
    const result = await done;
    return { result, timeline: log.map(([t, kind, midi]) => [t - begin, kind, midi]) };
}

/** Makes the n-th setTimeout call (0-based) run `after` right after its callback, or fire late. */
function patchTimer(n, { after, lateBy = 0 }) {
    const realSetTimeout = globalThis.setTimeout;
    let calls = 0;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn, ms) => {
        const index = calls;
        calls += 1;
        return realSetTimeout(() => {
            fn();
            if (index === n && after) after();
        }, index === n ? ms + lateBy : ms);
    });
}

describe("playSequence: order and speed", () => {
    test("1.0×: replays the original order and timing", async () => {
        const { result, timeline } = await playAll(MELODY, 1);
        expect(result).toEqual({ completed: true, played: 3 });
        expect(timeline).toEqual([
            [0, "on", 60], [300, "off", 60],
            [400, "on", 62], [600, "off", 62],
            [800, "on", 64], [1200, "off", 64]
        ]);
    });

    test("0.5×: every delay and duration doubles", async () => {
        const { timeline } = await playAll(MELODY, 0.5);
        expect(timeline).toEqual([
            [0, "on", 60], [600, "off", 60],
            [800, "on", 62], [1200, "off", 62],
            [1600, "on", 64], [2400, "off", 64]
        ]);
    });

    test("2.0×: every delay and duration halves", async () => {
        const { timeline } = await playAll(MELODY, 2);
        expect(timeline).toEqual([
            [0, "on", 60], [150, "off", 60],
            [200, "on", 62], [300, "off", 62],
            [400, "on", 64], [600, "off", 64]
        ]);
    });

    test("overlapping notes sound together, onsets in recorded order", async () => {
        const { timeline } = await playAll([ev(60, 0, 500), ev(64, 100, 200), ev(67, 250, 250)], 1);
        expect(timeline).toEqual([
            [0, "on", 60], [100, "on", 64], [300, "off", 64], [350, "on", 67], [500, "off", 60], [600, "off", 67]
        ]);
    });

    test("is asynchronous and drains the FIFO queue one event at a time", async () => {
        const { done, queue } = start(MELODY);
        expect(done).toBeInstanceOf(Promise);
        expect(queue.size).toBe(2);                      // first event dequeued, awaiting its onset
        await vi.advanceTimersByTimeAsync(0);
        expect(synth.noteOn).toHaveBeenCalledTimes(1);
        expect(queue.size).toBe(1);
        await vi.advanceTimersByTimeAsync(400);
        expect(synth.noteOn).toHaveBeenCalledTimes(2);
        await vi.runAllTimersAsync();
        await done;
        expect(queue.size).toBe(0);
    });

    test("a recording replays many times from fresh queues and is never mutated", async () => {
        const recording = [ev(60, 0, 100), ev(62, 50, 100)];
        const snapshot = structuredClone(recording);
        await playAll(recording, 1);
        await playAll(recording, 2);
        await playAll(recording, 0.5);
        expect(recording).toEqual(snapshot);
        expect(synth.noteOn.mock.calls.map(([midi]) => midi)).toEqual([60, 62, 60, 62, 60, 62]);
    });

    test("schedules against absolute times, so one late timer does not delay later notes", async () => {
        // Timer calls: #0 onset 60, #1 release 60, #2 onset 62 (fires 30 ms late), …
        patchTimer(2, { lateBy: 30 });
        const begin = Date.now();
        const { done } = start([ev(60, 0, 50), ev(62, 100, 50), ev(64, 100, 50)]);
        await vi.runAllTimersAsync();
        await done;
        const onsetOf = (midi) => log.find(([, kind, m]) => kind === "on" && m === midi)[0] - begin;
        expect(onsetOf(62)).toBe(130);
        expect(onsetOf(64)).toBe(200);                   // back on schedule; chained delays would give 230
    });

    test("a re-struck note whose release is still pending is released and struck again", async () => {
        const { timeline } = await playAll([ev(60, 0, 300), ev(60, 100, 100)], 1);
        expect(timeline).toEqual([[0, "on", 60], [100, "off", 60], [100, "on", 60], [200, "off", 60]]);
    });

    test("an empty queue completes at once", async () => {
        await expect(start([]).done).resolves.toEqual({ completed: true, played: 0 });
    });

    test("accepts exactly the three speeds and validates every argument", async () => {
        expect(PLAYBACK_SPEEDS).toEqual([0.5, 1, 2]);
        const signal = new AbortController().signal;
        const queue = new AudioTaskQueue();
        await expect(playSequence({ queue, synth, speed: 1.5, signal })).rejects.toThrow(TypeError);
        await expect(playSequence({ queue: [], synth, signal })).rejects.toThrow(TypeError);
        await expect(playSequence({ queue, synth: { noteOn() {} }, signal })).rejects.toThrow(TypeError);
        await expect(playSequence({ queue, synth })).rejects.toThrow(TypeError);
        await expect(playSequence()).rejects.toThrow(TypeError);
        await expect(start([{ midi: 60 }]).done).rejects.toThrow(TypeError);   // a real error, not a cancel
    });
});

describe("playSequence: AbortController cancellation", () => {
    test("abort mid-replay clears pending delays at once and schedules nothing more", async () => {
        const { done, controller, queue } = start(MELODY);
        await vi.advanceTimersByTimeAsync(450);          // 62 sounding, 64 waiting until 800 ms
        expect(vi.getTimerCount()).toBe(2);              // 62's release + 64's onset
        controller.abort();
        expect(vi.getTimerCount()).toBe(0);              // both cleared synchronously by the abort
        await expect(done).resolves.toEqual({ completed: false, played: 2 });
        await vi.runAllTimersAsync();
        expect(synth.noteOn.mock.calls.map(([midi]) => midi)).toEqual([60, 62]);
        expect(queue.size).toBe(0);                      // 64 had been dequeued but was never played
    });

    test("cancellation resolves instead of rejecting: no AbortError reaches the caller", async () => {
        const { done, controller } = start(MELODY);
        await vi.advanceTimersByTimeAsync(10);
        controller.abort();
        await expect(done).resolves.toMatchObject({ completed: false });
    });

    test("notes the replay left sounding are released on abort", async () => {
        const { done, controller } = start([ev(60, 0, 1000), ev(64, 0, 1000)]);
        await vi.advanceTimersByTimeAsync(10);
        controller.abort();
        await done;
        expect(synth.noteOff.mock.calls.map(([midi]) => midi).sort()).toEqual([60, 64]);
    });

    test("an already-aborted signal plays nothing and sets no timer", async () => {
        const controller = new AbortController();
        controller.abort();
        const { done } = start(MELODY, 1, controller);
        await expect(done).resolves.toEqual({ completed: false, played: 0 });
        expect(synth.noteOn).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    test("the signal is re-checked after each wait: a timer that already fired cannot start a note", async () => {
        const controller = new AbortController();
        // Timer #2 is the onset of 62. It fires, then the abort lands in the same tick, before
        // the playback loop resumes; the loop must notice and not call noteOn.
        patchTimer(2, { after: () => controller.abort() });
        const { done } = start([ev(60, 0, 1000), ev(62, 100, 100)], 1, controller);
        await vi.runAllTimersAsync();
        await expect(done).resolves.toEqual({ completed: false, played: 1 });
        expect(synth.noteOn.mock.calls.map(([midi]) => midi)).toEqual([60]);
    });

    test("abort while only a release is pending ends early and reports not completed", async () => {
        const { done, controller } = start([ev(60, 0, 5000)]);
        await vi.advanceTimersByTimeAsync(10);
        controller.abort();
        await expect(done).resolves.toEqual({ completed: false, played: 1 });
        expect(synth.noteOff).toHaveBeenCalledWith(60);
        expect(vi.getTimerCount()).toBe(0);
    });
});
