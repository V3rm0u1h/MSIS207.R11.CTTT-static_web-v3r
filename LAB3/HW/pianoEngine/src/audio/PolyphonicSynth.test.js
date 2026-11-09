import { beforeEach, describe, expect, test, vi } from "vitest";
import {
    DEFAULT_MAX_VOICES, PolyphonicSynth, RELEASE_S, SILENT_GAIN, STOP_S, VOICE_GAIN
} from "./PolyphonicSynth.js";
import { createPianoKey } from "../piano.js";

// T-02B — 8-voice polyphonic synth, FIFO stealing, click-free release (PRD 2, Project Rule 2).

/** An AudioParam double that records every automation call. */
function fakeParam(value) {
    return {
        value,
        calls: [],
        setValueAtTime(v, t) { this.calls.push(["setValueAtTime", v, t]); this.value = v; },
        cancelScheduledValues(t) { this.calls.push(["cancelScheduledValues", t]); },
        exponentialRampToValueAtTime(v, t) {
            if (v <= 0) throw new RangeError("exponential ramps need a positive target");
            this.calls.push(["exponentialRampToValueAtTime", v, t]);
        }
    };
}

/** A minimal AudioContext double: records created nodes, controllable clock and state. */
function makeFakeContextClass() {
    const instances = [];
    class FakeAudioContext {
        constructor() {
            this.state = "running";
            this.currentTime = 1;
            this.destination = { kind: "destination" };
            this.oscillators = [];
            this.gains = [];
            this.resume = vi.fn(() => { this.state = "running"; return Promise.resolve(); });
            this.close = vi.fn(() => { this.state = "closed"; return Promise.resolve(); });
            instances.push(this);
        }
        createOscillator() {
            const osc = {
                type: "sine",
                frequency: fakeParam(440),
                connections: [],
                started: [],
                stopped: [],
                onended: null,
                connect(node) { this.connections.push(node); return node; },
                disconnect: vi.fn(),
                start(t) { this.started.push(t); },
                stop(t) {
                    if (this.stopped.length > 0) throw new DOMException("already stopped", "InvalidStateError");
                    this.stopped.push(t);
                }
            };
            this.oscillators.push(osc);
            return osc;
        }
        createGain() {
            const gain = {
                gain: fakeParam(1),
                connections: [],
                connect(node) { this.connections.push(node); return node; },
                disconnect: vi.fn()
            };
            this.gains.push(gain);
            return gain;
        }
    }
    return { FakeAudioContext, instances };
}

let Fake;
let synth;
const freq = (midi) => createPianoKey(midi).freqHz;
const play = (...midis) => midis.map((midi) => synth.noteOn(midi, freq(midi)));

beforeEach(() => {
    Fake = makeFakeContextClass();
    synth = new PolyphonicSynth(undefined, { AudioContextClass: Fake.FakeAudioContext });
});

describe("construction", () => {
    test("matches the starter shape: default 8 voices, Map pool, no context yet", () => {
        expect(DEFAULT_MAX_VOICES).toBe(8);
        expect(synth.maxVoices).toBe(8);
        expect(synth.voices).toBeInstanceOf(Map);
        expect(synth.voices.size).toBe(0);
        expect(synth.ctx).toBeNull();
        expect(Fake.instances).toHaveLength(0);
    });

    test.each([["zero", 0], ["a fraction", 2.5], ["a string", "8"], ["negative", -1]])(
        "rejects maxVoices = %s with a TypeError", (_, maxVoices) => {
            expect(() => new PolyphonicSynth(maxVoices)).toThrow(TypeError);
        }
    );

    test("rejects a bad AudioContextClass or waveform", () => {
        expect(() => new PolyphonicSynth(8, { AudioContextClass: {} })).toThrow(TypeError);
        expect(() => new PolyphonicSynth(8, { waveform: "noise" })).toThrow(TypeError);
    });
});

describe("noteOn", () => {
    test("creates the context lazily, then builds osc -> gain -> destination and starts it", () => {
        expect(synth.noteOn(69, 440)).toBe(true);
        const [ctx] = Fake.instances;
        expect(synth.ctx).toBe(ctx);
        const [osc] = ctx.oscillators;
        const [gain] = ctx.gains;
        expect(osc.frequency.calls).toEqual([["setValueAtTime", 440, 1]]);
        expect(gain.gain.calls).toEqual([["setValueAtTime", VOICE_GAIN, 1]]);
        expect(osc.connections).toEqual([gain]);
        expect(gain.connections).toEqual([ctx.destination]);
        expect(osc.started).toEqual([1]);
        expect(synth.voices.get(69)).toEqual({ osc, gain });
    });

    test("reuses one AudioContext for every note", () => {
        play(60, 64, 67, 72);
        synth.releaseAll();
        play(60);
        expect(Fake.instances).toHaveLength(1);
        expect(Fake.instances[0].oscillators).toHaveLength(5);
    });

    test("resumes a context the browser suspended", () => {
        play(60);
        const [ctx] = Fake.instances;
        ctx.state = "suspended";
        play(62);
        expect(ctx.resume).toHaveBeenCalledTimes(1);
    });

    test("a note that is already sounding creates no duplicate voice", () => {
        expect(play(60, 60, 60)).toEqual([true, false, false]);
        expect(synth.voices.size).toBe(1);
        expect(Fake.instances[0].oscillators).toHaveLength(1);
    });

    test("eight distinct notes sound together", () => {
        play(60, 62, 64, 65, 67, 69, 71, 72);
        expect(synth.activeNotes).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
        expect(Fake.instances[0].oscillators.every((osc) => osc.stopped.length === 0)).toBe(true);
    });

    test("the ninth distinct note steals the oldest voice (FIFO), deterministically", () => {
        play(60, 62, 64, 65, 67, 69, 71, 72);
        const oldest = synth.voices.get(60).osc;
        expect(synth.noteOn(74, freq(74))).toBe(true);
        expect(synth.voices.size).toBe(8);
        expect(synth.activeNotes).toEqual([62, 64, 65, 67, 69, 71, 72, 74]);
        expect(oldest.stopped).toEqual([1 + STOP_S]);
        play(76, 77);
        expect(synth.activeNotes).toEqual([65, 67, 69, 71, 72, 74, 76, 77]);
    });

    test("a re-pressed note is not refreshed: it keeps its place in the FIFO order", () => {
        play(60, 62, 64, 65, 67, 69, 71, 72);
        play(60);
        play(74);
        expect(synth.voices.has(60)).toBe(false);
    });

    test("honours a custom voice limit", () => {
        synth = new PolyphonicSynth(2, { AudioContextClass: Fake.FakeAudioContext });
        play(60, 62, 64);
        expect(synth.activeNotes).toEqual([62, 64]);
    });

    test.each([
        ["a string MIDI", "60", 261.6],
        ["a fractional MIDI", 60.5, 261.6],
        ["MIDI 128", 128, 261.6],
        ["a missing frequency", 60, undefined],
        ["a zero frequency", 60, 0],
        ["an infinite frequency", 60, Infinity],
        ["a NaN frequency", 60, NaN]
    ])("rejects %s with a TypeError and touches no audio", (_, midi, hz) => {
        expect(() => synth.noteOn(midi, hz)).toThrow(TypeError);
        expect(Fake.instances).toHaveLength(0);
    });

    test("without Web Audio support it reports false instead of throwing", () => {
        const silent = new PolyphonicSynth(8, { AudioContextClass: undefined });
        Object.defineProperty(silent, "AudioContextClass", { value: undefined });
        expect(silent.supported).toBe(false);
        expect(silent.noteOn(60, 261.6)).toBe(false);
        expect(silent.voices.size).toBe(0);
    });
});

describe("noteOff", () => {
    test("ramps the gain exponentially to 0.0001 over 40 ms, then stops the oscillator at 45 ms", () => {
        play(69);
        const { osc, gain } = synth.voices.get(69);
        const ctx = Fake.instances[0];
        ctx.currentTime = 2;
        gain.gain.calls.length = 0;

        expect(synth.noteOff(69)).toBe(true);
        expect(gain.gain.calls).toEqual([
            ["cancelScheduledValues", 2],
            ["setValueAtTime", VOICE_GAIN, 2],
            ["exponentialRampToValueAtTime", SILENT_GAIN, 2 + RELEASE_S]
        ]);
        expect(osc.stopped).toEqual([2 + STOP_S]);
        expect(STOP_S).toBeGreaterThan(RELEASE_S);   // ramp finishes before the stop
    });

    test("holds a near-zero gain above zero so the exponential ramp is valid", () => {
        play(69);
        const { gain } = synth.voices.get(69);
        gain.gain.value = 0;
        expect(() => synth.noteOff(69)).not.toThrow();
        expect(gain.gain.calls).toContainEqual(["setValueAtTime", SILENT_GAIN, 1]);
    });

    test("removes the voice from the Map immediately, freeing its slot", () => {
        play(60, 62, 64, 65, 67, 69, 71, 72);
        synth.noteOff(65);
        expect(synth.voices.has(65)).toBe(false);
        expect(synth.voices.size).toBe(7);
        const startedBefore = Fake.instances[0].oscillators.filter((osc) => osc.stopped.length).length;
        play(74);
        expect(Fake.instances[0].oscillators.filter((osc) => osc.stopped.length).length).toBe(startedBefore);
        expect(synth.activeNotes).toEqual([60, 62, 64, 67, 69, 71, 72, 74]);
    });

    test("repeated or unknown note-offs are harmless no-ops", () => {
        expect(synth.noteOff(60)).toBe(false);          // nothing playing, no context created
        expect(Fake.instances).toHaveLength(0);
        play(60);
        expect(synth.noteOff(60)).toBe(true);
        expect(synth.noteOff(60)).toBe(false);
        expect(Fake.instances[0].oscillators[0].stopped).toHaveLength(1);
    });

    test("the same note can be played again right after its release, as a fresh voice", () => {
        play(60);
        synth.noteOff(60);
        expect(play(60)).toEqual([true]);
        expect(Fake.instances[0].oscillators).toHaveLength(2);
    });

    test("an oscillator that already stopped does not throw", () => {
        play(60);
        const { osc } = synth.voices.get(60);
        osc.stop(1);
        expect(() => synth.noteOff(60)).not.toThrow();
        expect(synth.voices.size).toBe(0);
    });

    test("when the oscillator ends, both nodes are disconnected from the graph", () => {
        play(60);
        const { osc, gain } = synth.voices.get(60);
        synth.noteOff(60);
        osc.onended();
        expect(osc.disconnect).toHaveBeenCalledTimes(1);
        expect(gain.disconnect).toHaveBeenCalledTimes(1);
        expect(osc.onended).toBeNull();
    });

    test("rejects a non-MIDI argument with a TypeError", () => {
        expect(() => synth.noteOff("60")).toThrow(TypeError);
    });
});

describe("releaseAll and close", () => {
    test("releaseAll ramps down and stops every voice and empties the pool", () => {
        play(60, 64, 67);
        const voices = [...synth.voices.values()];
        synth.releaseAll();
        expect(synth.voices.size).toBe(0);
        voices.forEach(({ osc, gain }) => {
            expect(osc.stopped).toEqual([1 + STOP_S]);
            expect(gain.gain.calls.at(-1)).toEqual(["exponentialRampToValueAtTime", SILENT_GAIN, 1 + RELEASE_S]);
        });
        expect(() => synth.releaseAll()).not.toThrow();
    });

    test("close releases everything and closes the context; the next note opens a new one", async () => {
        play(60, 64);
        const [ctx] = Fake.instances;
        await synth.close();
        expect(synth.voices.size).toBe(0);
        expect(ctx.close).toHaveBeenCalledTimes(1);
        expect(synth.ctx).toBeNull();
        play(60);
        expect(Fake.instances).toHaveLength(2);
        await expect(synth.close()).resolves.toBeUndefined();
        await expect(new PolyphonicSynth(8, { AudioContextClass: Fake.FakeAudioContext }).close()).resolves.toBeUndefined();
    });

    test("a context closed elsewhere is replaced and its stale voices dropped", () => {
        play(60, 64);
        Fake.instances[0].state = "closed";
        play(67);
        expect(Fake.instances).toHaveLength(2);
        expect(synth.activeNotes).toEqual([67]);
    });
});
