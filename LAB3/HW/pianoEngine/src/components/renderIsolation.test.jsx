import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { installRenderTracker } from "../test/renderTracker.js";

// T-02D — React.memo render isolation (PRD 4 sections 6–8), measured the way the React
// DevTools Profiler measures it: through React's DevTools hook, which must exist before
// react-dom loads. So the hook is installed first and React is imported dynamically.

installRenderTracker("PianoKey");
const { act, cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: App } = await import("../App.jsx");
const { default: PianoKey, PianoKeyView } = await import("./PianoKey.jsx");
const { shallowEqual } = await import("../utils/shallowEqual.js");

/** A synth double with the real voice-pool semantics (8 voices, FIFO stealing). */
function fakeSynth() {
    const voices = new Map();
    return {
        maxVoices: 8,
        voices,
        noteOn: vi.fn((midi) => {
            if (voices.has(midi)) return false;
            if (voices.size >= 8) voices.delete(voices.keys().next().value);
            voices.set(midi, {});
            return true;
        }),
        noteOff: vi.fn((midi) => voices.delete(midi)),
        releaseAll: vi.fn(() => voices.clear()),
        close: vi.fn()
    };
}

let synth;
const key = (name) => screen.getByRole("button", { name });
const down = (name) => fireEvent.pointerDown(key(name), { pointerType: "mouse", button: 0 });
const up = (name) => fireEvent.pointerUp(key(name), { pointerType: "mouse", button: 0 });

/** The PianoKey renders of every commit caused by `action`, flattened. */
function rendersDuring(action) {
    const before = globalThis.__renders.length;
    act(action);
    return globalThis.__renders.slice(before).flat();
}

beforeAll(() => {
    synth = fakeSynth();
    const main = document.body.appendChild(document.createElement("main"));
    render(<App engine={{ synth }} />, { container: main });
});

afterAll(() => {
    cleanup();
    document.body.replaceChildren();
});

beforeEach(() => {
    act(() => { synth.releaseAll(); window.dispatchEvent(new Event("blur")); });
});

describe("PianoKey is memoised with shallowEqual", () => {
    test("the default export is React.memo(PianoKey, shallowEqual)", () => {
        expect(PianoKey.$$typeof).toBe(Symbol.for("react.memo"));
        expect(PianoKey.type).toBe(PianoKeyView);
        expect(PianoKey.compare).toBe(shallowEqual);
    });

    test("the tracker sees the initial mount of all 88 keys", () => {
        const mounted = globalThis.__renders.flat();
        expect(new Set(mounted).size).toBe(88);
    });
});

describe("render isolation (DevTools-hook measurement)", () => {
    test("pressing A4 re-renders exactly one key; the other 87 skip", () => {
        expect(rendersDuring(() => down("A4 white key"))).toEqual([69]);
        expect(rendersDuring(() => up("A4 white key"))).toEqual([69]);
    });

    test("holding C4 and then pressing E4 re-renders only E4", () => {
        expect(rendersDuring(() => down("C4 white key"))).toEqual([60]);
        expect(rendersDuring(() => down("E4 white key"))).toEqual([64]);
        expect(rendersDuring(() => { up("C4 white key"); up("E4 white key"); })).toEqual([60, 64]);
    });

    test("repeats for many different notes, white and black", () => {
        for (const [name, midi] of [["A0 white key", 21], ["C#4 black key", 61], ["F#6 black key", 90], ["C8 white key", 108]]) {
            expect(rendersDuring(() => down(name))).toEqual([midi]);
            expect(rendersDuring(() => up(name))).toEqual([midi]);
        }
    });

    test("a ninth note steals the oldest voice: exactly the stolen key and the new key update", () => {
        const chord = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
        act(() => chord.forEach((note) => down(`${note} white key`)));
        expect(rendersDuring(() => down("D5 white key"))).toEqual([60, 74]);
    });

    test("no-op events (leaving a silent key, re-pressing a sounding one) render no key at all", () => {
        expect(rendersDuring(() => fireEvent.pointerLeave(key("G2 white key")))).toEqual([]);
        down("G2 white key");
        expect(rendersDuring(() => down("G2 white key"))).toEqual([]);
    });

    test("recording-control and status updates render no key", () => {
        expect(rendersDuring(() => fireEvent.click(screen.getByRole("button", { name: "Start Recording" })))).toEqual([]);
        expect(rendersDuring(() => fireEvent.click(screen.getByRole("radio", { name: "2.0×" })))).toEqual([]);
        expect(rendersDuring(() => fireEvent.click(screen.getByRole("button", { name: "Stop Recording" })))).toEqual([]);
    });
});
