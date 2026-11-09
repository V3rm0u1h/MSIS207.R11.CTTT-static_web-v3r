import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../App.jsx";
import PianoControls from "./PianoControls.jsx";
import RecordingControls from "./RecordingControls.jsx";
import SequencerControls from "./SequencerControls.jsx";
import { createPianoKey } from "../utils/midiUtils.js";

// T-02C — recording, speeds and replay through the UI (PRD 3 sections 4–7).
// T-02D — component architecture, Stop Sequence with AbortController, no false error on
// abort, unmount cleanup (PRD 4 sections 4, 5 and 9). Project Rules 1–4.

const hz = (midi) => createPianoKey(midi).freqHz;
const ev = (midi, deltaMs, durationMs) => Object.freeze({ midi, freqHz: hz(midi), durationMs, deltaMs });
const noop = () => {};

function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
});

const button = (name) => screen.getByRole("button", { name, exact: true });
const available = (name) => button(name).getAttribute("aria-disabled") === "false";
const statusOf = (region) => within(screen.getByRole("region", { name: region })).getByRole("status").textContent;

describe("RecordingControls", () => {
    const base = { isRecording: false, isPlaying: false, events: [], status: "", onStart: noop, onStop: noop, onClear: noop };

    test("renders Start / Stop / Clear Recording in a labelled menu", () => {
        renderInMain(<RecordingControls {...base} />);
        const menu = screen.getByRole("list", { name: "Recording controls" });
        expect(menu.tagName).toBe("MENU");
        expect(within(menu).getAllByRole("button").map((b) => b.textContent)).toEqual(["Start Recording", "Stop Recording", "Clear Recording"]);
    });

    test.each([
        ["idle, nothing recorded", {}, { start: true, stop: false, clear: false }],
        ["idle with a recording", { events: [ev(60, 0, 100)] }, { start: true, stop: false, clear: true }],
        ["recording", { isRecording: true }, { start: false, stop: true, clear: false }],
        ["playing", { isPlaying: true, events: [ev(60, 0, 100)] }, { start: false, stop: false, clear: true }]
    ])("availability when %s", (_, props, expected) => {
        renderInMain(<RecordingControls {...base} {...props} />);
        expect({ start: available("Start Recording"), stop: available("Stop Recording"), clear: available("Clear Recording") }).toEqual(expected);
    });

    test("an unavailable control stays focusable but ignores activation", () => {
        const onStop = vi.fn();
        renderInMain(<RecordingControls {...base} onStop={onStop} />);
        const stop = button("Stop Recording");
        expect(stop.disabled).toBe(false);
        stop.focus();
        expect(document.activeElement).toBe(stop);
        fireEvent.click(stop);
        expect(onStop).not.toHaveBeenCalled();
    });

    test("lists every recorded event with all four fields, in recorded order", () => {
        renderInMain(<RecordingControls {...base} events={[ev(69, 0, 300), ev(72, 450, 100)]} />);
        const table = screen.getByRole("table", { name: /Recorded notes: 2/ });
        expect(table.caption.textContent).toBe("Recorded notes: 2, 0.55 s at 1.0×");
        const rows = within(table).getAllByRole("row").slice(1).map((row) => [...row.cells].map((cell) => cell.textContent));
        expect(rows).toEqual([
            ["1", "A4", "69", "440.00 Hz", "0 ms", "0 ms", "300 ms"],
            ["2", "C5", "72", "523.25 Hz", "450 ms", "450 ms", "100 ms"]
        ]);
        expect(table.closest("figure").tabIndex).toBe(0);
    });

    test.each([
        ["a non-boolean isRecording", { isRecording: "no" }],
        ["corrupt events", { events: [{ midi: 60 }] }],
        ["a missing handler", { onClear: undefined }],
        ["a negative count", { capturedCount: -1 }]
    ])("throws a TypeError for %s (Rule 2)", (_, override) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderInMain(<RecordingControls {...base} {...override} />)).toThrow(TypeError);
    });
});

describe("SequencerControls", () => {
    const base = { canPlay: true, isPlaying: false, speed: 1, status: "", onPlay: noop, onStop: noop, onSpeedChange: noop };

    test("offers 0.5×, 1.0× and 2.0× as one radio group and reports changes", () => {
        const onSpeedChange = vi.fn();
        renderInMain(<SequencerControls {...base} onSpeedChange={onSpeedChange} />);
        const radios = within(screen.getByRole("group", { name: "Playback speed" })).getAllByRole("radio");
        expect(radios.map((r) => r.labels[0].textContent.trim())).toEqual(["0.5×", "1.0×", "2.0×"]);
        expect(screen.getByRole("radio", { name: "1.0×" }).checked).toBe(true);
        fireEvent.click(screen.getByRole("radio", { name: "0.5×" }));
        expect(onSpeedChange).toHaveBeenCalledWith(0.5);
    });

    test("Play is available when it can play; Stop Sequence only while playing", () => {
        const { rerender } = renderInMain(<SequencerControls {...base} />);
        expect([available("Play Sequence"), available("Stop Sequence")]).toEqual([true, false]);
        rerender(<SequencerControls {...base} isPlaying />);
        expect([available("Play Sequence"), available("Stop Sequence")]).toEqual([false, true]);
        rerender(<SequencerControls {...base} canPlay={false} />);
        expect([available("Play Sequence"), available("Stop Sequence")]).toEqual([false, false]);
    });

    test("its status is a polite live region", () => {
        renderInMain(<SequencerControls {...base} status="Playback stopped." />);
        const status = screen.getByRole("status");
        expect(status.tagName).toBe("OUTPUT");
        expect(status.getAttribute("aria-live")).toBe("polite");
        expect(status.textContent).toBe("Playback stopped.");
    });

    test.each([["an unsupported speed", { speed: 3 }], ["a missing onStop", { onStop: undefined }], ["a non-boolean canPlay", { canPlay: 1 }]])(
        "throws a TypeError for %s (Rule 2)", (_, override) => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            expect(() => renderInMain(<SequencerControls {...base} {...override} />)).toThrow(TypeError);
        }
    );
});

describe("PianoControls", () => {
    test("shows the voice pool, oldest note first, as a non-live readout", () => {
        renderInMain(<PianoControls activeNotes={new Set([64, 60])} maxVoices={8} onReleaseAll={noop} />);
        const readout = within(screen.getByRole("region", { name: "Voices" })).getByRole("status");
        expect(readout.textContent).toBe("2 of 8 voices: E4, C4");
        expect(readout.getAttribute("aria-live")).toBe("off");
    });

    test("Release All Notes is available only while something sounds", () => {
        const onReleaseAll = vi.fn();
        const { rerender } = renderInMain(<PianoControls activeNotes={new Set()} maxVoices={8} onReleaseAll={onReleaseAll} />);
        expect(screen.getByRole("status").textContent).toBe("0 of 8 voices");
        fireEvent.click(button("Release All Notes"));
        expect(onReleaseAll).not.toHaveBeenCalled();
        rerender(<PianoControls activeNotes={new Set([60])} maxVoices={8} onReleaseAll={onReleaseAll} />);
        fireEvent.click(button("Release All Notes"));
        expect(onReleaseAll).toHaveBeenCalledTimes(1);
    });

    test("throws a TypeError for bad props (Rule 2)", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderInMain(<PianoControls activeNotes={[60]} maxVoices={8} onReleaseAll={noop} />)).toThrow(TypeError);
        expect(() => renderInMain(<PianoControls activeNotes={new Set()} maxVoices={0} onReleaseAll={noop} />)).toThrow(TypeError);
    });
});

/** A synth double with the real voice-pool semantics that matter to the UI. */
function fakeSynth() {
    const voices = new Map();
    return {
        maxVoices: 8,
        voices,
        noteOn: vi.fn((midi) => { if (voices.has(midi)) return false; voices.set(midi, {}); return true; }),
        noteOff: vi.fn((midi) => voices.delete(midi)),
        releaseAll: vi.fn(() => voices.clear()),
        close: vi.fn(() => Promise.resolve())
    };
}

describe("Piano (App): architecture, recording, replay and Stop Sequence", () => {
    let synth;
    let unmount;

    beforeEach(() => {
        vi.useFakeTimers();
        synth = fakeSynth();
        ({ unmount } = renderInMain(<App engine={{ synth, now: () => Date.now() }} />));
    });

    const key = (name) => screen.getByRole("button", { name });

    function hold(name, ms) {
        fireEvent.pointerDown(key(name), { pointerType: "mouse", button: 0 });
        act(() => { vi.advanceTimersByTime(ms); });
        fireEvent.pointerUp(key(name), { pointerType: "mouse", button: 0 });
    }

    function rest(ms) {
        act(() => { vi.advanceTimersByTime(ms); });
    }

    function recordMelody() {
        fireEvent.click(button("Start Recording"));
        hold("C4 white key", 200);
        rest(100);
        hold("E4 white key", 150);
        rest(50);
        hold("G4 white key", 300);
        fireEvent.click(button("Stop Recording"));
    }

    const played = () => synth.noteOn.mock.calls.map(([midi]) => midi);
    const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

    test("renders header, PianoControls, PianoKeyboard, RecordingControls, SequencerControls, with no wrapper", () => {
        const main = document.querySelector("main");
        expect([...main.children].map((node) => node.tagName)).toEqual(["HEADER", "SECTION", "SECTION", "SECTION", "SECTION"]);
        expect([...main.querySelectorAll(":scope > section")].map((s) => s.getAttribute("aria-label") ?? s.querySelector("h2").textContent))
            .toEqual(["Voices", "88-key piano", "Recording", "Sequencer"]);
        expect(main.querySelectorAll("ol > li > button")).toHaveLength(88);
    });

    test("live keys sound, light up and show in the voice readout", () => {
        fireEvent.pointerDown(key("A4 white key"), { pointerType: "mouse", button: 0 });
        fireEvent.pointerDown(key("C5 white key"), { pointerType: "touch", button: 0 });
        expect(synth.noteOn).toHaveBeenCalledWith(69, 440);
        expect(key("A4 white key").getAttribute("aria-pressed")).toBe("true");
        expect(statusOf("Voices")).toBe("2 of 8 voices: A4, C5");
        fireEvent.click(button("Release All Notes"));
        expect(synth.releaseAll).toHaveBeenCalled();
        expect(document.querySelectorAll("ol button[aria-pressed='true']")).toHaveLength(0);
    });

    test("records each note's duration and onset delta", () => {
        recordMelody();
        expect(statusOf("Recording")).toBe("Recording stopped: 3 notes recorded.");
        const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1)
            .map((row) => [...row.cells].slice(1).map((cell) => cell.textContent));
        expect(rows).toEqual([
            ["C4", "60", "261.63 Hz", "0 ms", "0 ms", "200 ms"],
            ["E4", "64", "329.63 Hz", "300 ms", "300 ms", "150 ms"],
            ["G4", "67", "392.00 Hz", "500 ms", "200 ms", "300 ms"]
        ]);
    });

    test.each([["0.5×", 0.5, [0, 600, 1000], 1600], ["1.0×", 1, [0, 300, 500], 800], ["2.0×", 2, [0, 150, 250], 400]])(
        "Play Sequence at %s replays in order, scaled in time", async (label, speed, onsets, end) => {
            recordMelody();
            synth.noteOn.mockClear();
            fireEvent.click(screen.getByRole("radio", { name: label }));
            const start = Date.now();
            const times = [];
            synth.noteOn.mockImplementation((midi) => { times.push(Date.now() - start); synth.voices.set(midi, {}); return true; });
            fireEvent.click(button("Play Sequence"));
            expect(statusOf("Sequencer")).toBe(`Playing 3 notes at ${speed.toFixed(1)}×.`);
            expect(available("Start Recording")).toBe(false);
            await advance(end - 1);
            expect(played()).toEqual([60, 64, 67]);
            expect(times).toEqual(onsets);
            expect(key("G4 white key").getAttribute("aria-pressed")).toBe("true");
            await advance(1);
            expect(statusOf("Sequencer")).toBe("Playback finished.");
            expect(available("Play Sequence")).toBe(true);
        }
    );

    test("Stop Sequence aborts at once: pending notes never play, voices released, state reset", async () => {
        recordMelody();
        synth.noteOn.mockClear();
        const abort = vi.spyOn(AbortController.prototype, "abort");
        fireEvent.click(button("Play Sequence"));
        await advance(350);                                   // E4 sounding, G4 pending
        expect(vi.getTimerCount()).toBeGreaterThan(0);
        fireEvent.click(button("Stop Sequence"));
        expect(abort).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);                   // every pending delay cleared synchronously
        expect(synth.releaseAll).toHaveBeenCalled();
        expect(synth.voices.size).toBe(0);
        expect(document.querySelectorAll("ol button[aria-pressed='true']")).toHaveLength(0);
        expect(statusOf("Sequencer")).toBe("Playback stopped.");
        expect([available("Play Sequence"), available("Stop Sequence")]).toEqual([true, false]);
        await advance(5000);
        expect(played()).toEqual([60, 64]);                   // G4 never scheduled
    });

    test("a stop is not an error: no 'failed' message, now or after the replay settles", async () => {
        recordMelody();
        const consoleError = vi.spyOn(console, "error");
        fireEvent.click(button("Play Sequence"));
        await advance(100);
        fireEvent.click(button("Stop Sequence"));
        await advance(2000);
        expect(statusOf("Sequencer")).toBe("Playback stopped.");
        expect(document.body.textContent).not.toMatch(/fail|error/i);
        expect(consoleError).not.toHaveBeenCalled();
    });

    test("after a stop, a new sequence starts immediately and runs to the end", async () => {
        recordMelody();
        fireEvent.click(button("Play Sequence"));
        await advance(100);
        fireEvent.click(button("Stop Sequence"));
        synth.noteOn.mockClear();
        fireEvent.click(button("Play Sequence"));
        expect(statusOf("Sequencer")).toMatch(/^Playing/);
        await advance(800);
        expect(played()).toEqual([60, 64, 67]);
        expect(statusOf("Sequencer")).toBe("Playback finished.");   // the old, stopped run did not overwrite it
    });

    test("every Play Sequence gets its own AbortController; repeated clicks start one replay", async () => {
        recordMelody();
        synth.noteOn.mockClear();
        const signals = new Set();
        const original = AbortController.prototype.abort;
        vi.spyOn(AbortController.prototype, "abort").mockImplementation(function abort(...args) {
            signals.add(this.signal);
            return original.apply(this, args);
        });
        fireEvent.click(button("Play Sequence"));
        fireEvent.click(button("Play Sequence"));
        await advance(10);
        fireEvent.click(button("Stop Sequence"));
        fireEvent.click(button("Play Sequence"));
        await advance(10);
        fireEvent.click(button("Stop Sequence"));
        expect(signals.size).toBe(2);
        expect(played()).toEqual([60, 60]);
    });

    test("Clear Recording during playback stops the sequence and removes every event", async () => {
        recordMelody();
        fireEvent.click(button("Play Sequence"));
        await advance(350);
        fireEvent.click(button("Clear Recording"));
        expect(synth.voices.size).toBe(0);
        expect(statusOf("Recording")).toBe("Recording cleared.");
        expect(statusOf("Sequencer")).toBe("Playback stopped.");
        expect(screen.getByText("No notes recorded yet.")).toBeTruthy();
        expect(available("Play Sequence")).toBe(false);
    });

    test("unmount aborts the sequence, clears its timers, releases voices, closes audio and removes listeners", async () => {
        recordMelody();
        const removed = vi.spyOn(window, "removeEventListener");
        fireEvent.click(button("Play Sequence"));
        await advance(350);
        synth.noteOn.mockClear();
        unmount();
        expect(vi.getTimerCount()).toBe(0);
        expect(synth.releaseAll).toHaveBeenCalled();
        expect(synth.voices.size).toBe(0);
        expect(synth.close).toHaveBeenCalledTimes(1);
        expect(removed).toHaveBeenCalledWith("blur", expect.any(Function));
        await act(async () => { await vi.runAllTimersAsync(); });
        expect(synth.noteOn).not.toHaveBeenCalled();
    });
});
