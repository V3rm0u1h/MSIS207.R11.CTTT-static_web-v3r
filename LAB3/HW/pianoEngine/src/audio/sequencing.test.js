import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AudioTaskQueue } from "./AudioTaskQueue.js";
import { NoteRecorder, assertRecordedEvent, assertRecordedEvents, recordingLengthMs } from "./NoteRecorder.js";
import { PLAYBACK_SPEEDS, SequencePlayer } from "./SequencePlayer.js";
import { createPianoKey } from "../piano.js";

// T-02C — FIFO queue, note recorder and asynchronous variable-speed replay (PRD 3, Project Rule 2).

const hz = (midi) => createPianoKey(midi).freqHz;
const ev = (midi, deltaMs, durationMs) => Object.freeze({ midi, freqHz: hz(midi), durationMs, deltaMs });

describe("AudioTaskQueue", () => {
    test("dequeues in exactly the order tasks were enqueued (FIFO)", () => {
        const queue = new AudioTaskQueue();
        ["a", "b", "c"].forEach((task) => queue.enqueue(task));
        expect(queue.size).toBe(3);
        expect(queue.peek()).toBe("a");
        expect([queue.dequeue(), queue.dequeue()]).toEqual(["a", "b"]);
        queue.enqueue("d");
        expect([queue.dequeue(), queue.dequeue(), queue.dequeue()]).toEqual(["c", "d", null]);
        expect(queue.size).toBe(0);
        expect(queue.peek()).toBeNull();
    });

    test("can be seeded from an iterable, cleared, and copied without being consumed", () => {
        const queue = new AudioTaskQueue([1, 2, 3]);
        expect(queue.toArray()).toEqual([1, 2, 3]);
        expect(queue.size).toBe(3);
        queue.clear();
        expect(queue.size).toBe(0);
        expect(queue.dequeue()).toBeNull();
    });

    test("stays FIFO across head-index compaction with many tasks", () => {
        const queue = new AudioTaskQueue();
        const out = [];
        for (let i = 0; i < 1000; i += 1) {
            queue.enqueue(i);
            if (i % 3 === 0) out.push(queue.dequeue());
        }
        for (let task = queue.dequeue(); task !== null; task = queue.dequeue()) out.push(task);
        expect(out).toEqual(Array.from({ length: 1000 }, (_, i) => i));
    });

    test("rejects null / undefined tasks and non-iterable seeds", () => {
        const queue = new AudioTaskQueue();
        expect(() => queue.enqueue(null)).toThrow(TypeError);
        expect(() => queue.enqueue(undefined)).toThrow(TypeError);
        expect(() => new AudioTaskQueue(42)).toThrow(TypeError);
        expect(() => new AudioTaskQueue(null)).toThrow(TypeError);
    });
});

describe("recorded event schema", () => {
    test("accepts { midi, freqHz, durationMs, deltaMs }", () => {
        expect(() => assertRecordedEvent({ midi: 69, freqHz: 440, durationMs: 300, deltaMs: 150 })).not.toThrow();
    });

    test.each([
        ["null", null],
        ["a missing duration", { midi: 69, freqHz: 440, deltaMs: 0 }],
        ["a missing delta", { midi: 69, freqHz: 440, durationMs: 0 }],
        ["a frequency that does not match the MIDI", { midi: 69, freqHz: 441, durationMs: 1, deltaMs: 0 }],
        ["a negative delta", { midi: 69, freqHz: 440, durationMs: 1, deltaMs: -1 }],
        ["a string duration", { midi: 69, freqHz: 440, durationMs: "300", deltaMs: 0 }],
        ["an infinite duration", { midi: 69, freqHz: 440, durationMs: Infinity, deltaMs: 0 }]
    ])("rejects %s", (_, event) => {
        expect(() => assertRecordedEvent(event)).toThrow(TypeError);
    });

    test("a recording must be an array; its length is the latest note-off", () => {
        expect(() => assertRecordedEvents("notes")).toThrow(TypeError);
        expect(recordingLengthMs([])).toBe(0);
        // A (0–500) overlaps B (100–300): the recording ends with A at 500 ms.
        expect(recordingLengthMs([ev(60, 0, 500), ev(64, 100, 200)])).toBe(500);
    });
});

describe("NoteRecorder", () => {
    let clock;
    let recorder;
    const at = (ms) => { clock = 1000 + ms; };

    beforeEach(() => {
        clock = 1000;
        recorder = new NoteRecorder({ now: () => clock });
    });

    test("captures note-on / note-off as { midi, freqHz, durationMs, deltaMs }", () => {
        recorder.start();
        at(150); recorder.noteOn(69, 440);
        at(450); recorder.noteOff(69);
        at(600); recorder.noteOn(72, hz(72));
        at(700); recorder.noteOff(72);
        const events = recorder.stop();
        expect(events).toEqual([
            { midi: 69, freqHz: 440, durationMs: 300, deltaMs: 0 },
            { midi: 72, freqHz: hz(72), durationMs: 100, deltaMs: 450 }
        ]);
        events.forEach((event) => expect(Object.keys(event)).toEqual(["midi", "freqHz", "durationMs", "deltaMs"]));
    });

    test("orders overlapping notes by onset; delta is onset to onset, duration per note", () => {
        recorder.start();
        at(0); recorder.noteOn(60, hz(60));        // C held 0–500
        at(100); recorder.noteOn(64, hz(64));      // E 100–300
        at(300); recorder.noteOff(64);
        at(350); recorder.noteOn(67, hz(67));      // G 350–600
        at(500); recorder.noteOff(60);
        at(600); recorder.noteOff(67);
        expect(recorder.stop().map(({ midi, deltaMs, durationMs }) => [midi, deltaMs, durationMs])).toEqual([
            [60, 0, 500], [64, 100, 200], [67, 250, 250]
        ]);
    });

    test("rounds to whole ms against the start, so deltas never drift", () => {
        recorder.start();
        [0.4, 10.4, 20.4, 30.4].forEach((t) => { at(t); recorder.noteOn(60 + Math.round(t), hz(60 + Math.round(t))); });
        at(40); [60, 70, 80, 90].forEach((m) => recorder.noteOff(m));
        const events = recorder.stop();
        expect(events.map((e) => e.deltaMs)).toEqual([0, 10, 10, 10]);
        expect(events.reduce((sum, e) => sum + e.deltaMs, 0)).toBe(30);
        events.forEach((e) => expect(Number.isInteger(e.durationMs)).toBe(true));
    });

    test("ignores notes while not recording, re-presses of a held note and unmatched note-offs", () => {
        expect(recorder.noteOn(60, hz(60))).toBe(false);
        recorder.start();
        expect(recorder.noteOff(60)).toBe(false);   // pressed before the take began
        expect(recorder.noteOn(62, hz(62))).toBe(true);
        expect(recorder.noteOn(62, hz(62))).toBe(false);
        expect(recorder.size).toBe(1);
        recorder.stop();
        expect(recorder.noteOn(64, hz(64))).toBe(false);
        expect(recorder.events).toHaveLength(1);
    });

    test("a note still held at Stop Recording is closed at the stop time", () => {
        recorder.start();
        at(100); recorder.noteOn(60, hz(60));
        at(900);
        expect(recorder.stop()).toEqual([{ midi: 60, freqHz: hz(60), durationMs: 800, deltaMs: 0 }]);
        expect(recorder.recording).toBe(false);
    });

    test("the recording is frozen; a new take replaces it; clear empties it", () => {
        recorder.start();
        recorder.noteOn(60, hz(60));
        recorder.noteOff(60);
        const first = recorder.stop();
        expect(Object.isFrozen(first)).toBe(true);
        expect(Object.isFrozen(first[0])).toBe(true);
        expect(recorder.stop()).toBe(first);       // stopping twice is harmless
        recorder.start();
        expect(recorder.events).toEqual([]);
        recorder.noteOn(62, hz(62));
        recorder.clear();
        expect(recorder.recording).toBe(false);
        expect(recorder.events).toEqual([]);
        expect(recorder.size).toBe(0);
        expect(first).toHaveLength(1);             // the old take object is untouched
    });

    test("type-checks its clock and the notes it records", () => {
        expect(() => new NoteRecorder({ now: 5 })).toThrow(TypeError);
        const broken = new NoteRecorder({ now: () => NaN });
        expect(() => broken.start()).toThrow(TypeError);
        recorder.start();
        expect(() => recorder.noteOn(69, 300)).toThrow(TypeError);
        expect(() => recorder.noteOn("69", 440)).toThrow(TypeError);
    });
});

describe("SequencePlayer", () => {
    let log;
    let instrument;
    let player;

    beforeEach(() => {
        vi.useFakeTimers();
        log = [];
        instrument = {
            noteOn: vi.fn((midi) => log.push([Date.now(), "on", midi])),
            noteOff: vi.fn((midi) => log.push([Date.now(), "off", midi]))
        };
        player = new SequencePlayer(instrument, { now: () => Date.now() });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    /** Plays to completion on the fake clock; log times are relative to the start. */
    async function playAll(events, speed) {
        const start = Date.now();
        const done = player.play(events, speed);
        await vi.runAllTimersAsync();
        const result = await done;
        return { result, timeline: log.map(([t, kind, midi]) => [t - start, kind, midi]) };
    }

    const MELODY = Object.freeze([ev(60, 0, 300), ev(62, 400, 200), ev(64, 400, 400)]);

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

    test("overlapping notes (a chord under a held note) sound together, onsets in recorded order", async () => {
        const chord = [ev(60, 0, 500), ev(64, 100, 200), ev(67, 250, 250)];
        const { timeline } = await playAll(chord, 1);
        expect(timeline).toEqual([
            [0, "on", 60], [100, "on", 64], [300, "off", 64], [350, "on", 67], [500, "off", 60], [600, "off", 67]
        ]);
    });

    test("is asynchronous: play() returns a promise and nothing after the first note runs synchronously", async () => {
        const done = player.play(MELODY, 1);
        expect(done).toBeInstanceOf(Promise);
        expect(player.playing).toBe(true);
        await vi.advanceTimersByTimeAsync(0);
        expect(instrument.noteOn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(399);
        expect(instrument.noteOn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(instrument.noteOn).toHaveBeenCalledTimes(2);
        await vi.runAllTimersAsync();
        await done;
        expect(player.playing).toBe(false);
    });

    test("never starts a competing loop: a second play() returns the running replay", async () => {
        const first = player.play(MELODY, 1);
        const second = player.play(MELODY, 2);
        expect(second).toBe(first);
        await vi.runAllTimersAsync();
        await first;
        expect(instrument.noteOn).toHaveBeenCalledTimes(3);
    });

    test("a recording can be replayed many times and is never mutated", async () => {
        const recording = [ev(60, 0, 100), ev(62, 50, 100)];
        const snapshot = structuredClone(recording);
        await playAll(recording, 1);
        await playAll(recording, 2);
        await playAll(recording, 0.5);
        expect(recording).toEqual(snapshot);
        expect(instrument.noteOn).toHaveBeenCalledTimes(6);
        expect(instrument.noteOn.mock.calls.map(([midi]) => midi)).toEqual([60, 62, 60, 62, 60, 62]);
    });

    test("schedules against absolute times, so a late timer does not delay later notes", async () => {
        // Timer calls: #0 onset 60, #1 release 60, #2 onset 62 — that one fires 30 ms late.
        let calls = 0;
        const lateTimer = (fn, ms) => setTimeout(fn, calls++ === 2 ? ms + 30 : ms);
        player = new SequencePlayer(instrument, { now: () => Date.now(), setTimer: lateTimer });
        const start = Date.now();
        const done = player.play([ev(60, 0, 50), ev(62, 100, 50), ev(64, 100, 50)], 1);
        await vi.runAllTimersAsync();
        await done;
        const onsetOf = (midi) => log.find(([, kind, m]) => kind === "on" && m === midi)[0] - start;
        expect(onsetOf(62)).toBe(130);                    // the late one
        expect(onsetOf(64)).toBe(200);                    // back on schedule; chained delays would give 230
    });

    test("a re-struck note whose release is still pending is released and struck again", async () => {
        const { timeline } = await playAll([ev(60, 0, 300), ev(60, 100, 100)], 1);
        expect(timeline).toEqual([[0, "on", 60], [100, "off", 60], [100, "on", 60], [200, "off", 60]]);
    });

    test("stop() cancels pending notes and releases the ones sounding", async () => {
        const done = player.play(MELODY, 1);
        await vi.advanceTimersByTimeAsync(450);            // 62 is sounding, 64 not yet started
        player.stop();
        expect(instrument.noteOff.mock.calls.map(([midi]) => midi)).toEqual([60, 62]);   // released synchronously
        await expect(done).resolves.toEqual({ completed: false, played: 2 });
        await vi.runAllTimersAsync();
        expect(instrument.noteOn.mock.calls.map(([midi]) => midi)).toEqual([60, 62]);
        expect(instrument.noteOff.mock.calls.map(([midi]) => midi)).toEqual([60, 62]);
        expect(player.playing).toBe(false);
        expect(() => player.stop()).not.toThrow();
    });

    test("an empty recording completes at once", async () => {
        await expect(player.play([], 1)).resolves.toEqual({ completed: true, played: 0 });
    });

    test("accepts exactly the three speeds and validates its inputs", () => {
        expect(PLAYBACK_SPEEDS).toEqual([0.5, 1, 2]);
        expect(() => player.play(MELODY, 1.5)).toThrow(TypeError);
        expect(() => player.play(MELODY, "2")).toThrow(TypeError);
        expect(() => player.play([{ midi: 60 }], 1)).toThrow(TypeError);
        expect(() => new SequencePlayer({ noteOn() {} })).toThrow(TypeError);
        expect(() => new SequencePlayer(instrument, { now: 0 })).toThrow(TypeError);
        expect(player.playing).toBe(false);
    });
});
