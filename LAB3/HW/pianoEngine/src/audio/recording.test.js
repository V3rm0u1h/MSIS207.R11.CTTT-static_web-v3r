import { beforeEach, describe, expect, test } from "vitest";
import { AudioTaskQueue } from "./AudioTaskQueue.js";
import { NoteRecorder, assertRecordedEvent, assertRecordedEvents, recordingLengthMs } from "./NoteRecorder.js";
import { createPianoKey } from "../utils/midiUtils.js";

// T-02C — FIFO queue, note recorder and recorded event schema (PRD 3, Project Rule 2).

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
