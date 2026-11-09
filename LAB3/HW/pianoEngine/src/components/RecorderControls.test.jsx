import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import SOURCE from "./RecorderControls.jsx?raw";
import HOOK_SOURCE from "../usePianoEngine.js?raw";
import RecorderControls from "./RecorderControls.jsx";
import App from "../App.jsx";
import { createPianoKey } from "../piano.js";

// T-02C — recording controls, speed selector, recorded-note table, and the whole
// record → replay flow through the App (PRD 3 sections 4–7, Project Rules 1–4).

const hz = (midi) => createPianoKey(midi).freqHz;
const ev = (midi, deltaMs, durationMs) => Object.freeze({ midi, freqHz: hz(midi), durationMs, deltaMs });
const noop = () => {};
const HANDLERS = { onStart: noop, onStop: noop, onClear: noop, onPlay: noop, onSpeedChange: noop };

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

const action = (name) => screen.getByRole("button", { name });
const available = (name) => action(name).getAttribute("aria-disabled") === "false";

describe("RecorderControls", () => {
    test("renders the four controls, in order, inside a labelled menu", () => {
        renderInMain(<RecorderControls mode="idle" events={[]} speed={1} status="Ready." {...HANDLERS} />);
        const menu = screen.getByRole("list", { name: "Recording controls" });
        expect(menu.tagName).toBe("MENU");
        expect(within(menu).getAllByRole("button").map((b) => b.textContent)).toEqual([
            "Start Recording", "Stop Recording", "Clear Recording", "Play Sequence"
        ]);
        expect(screen.getByRole("region", { name: "Recorder" })).toBeTruthy();
    });

    test.each([
        ["idle, nothing recorded", "idle", [], { start: true, stop: false, clear: false, play: false }],
        ["idle with a recording", "idle", [ev(60, 0, 100)], { start: true, stop: false, clear: true, play: true }],
        ["recording", "recording", [], { start: false, stop: true, clear: false, play: false }],
        ["playing", "playing", [ev(60, 0, 100)], { start: false, stop: false, clear: true, play: false }]
    ])("availability when %s", (_, mode, events, expected) => {
        renderInMain(<RecorderControls mode={mode} events={events} speed={1} status="" {...HANDLERS} />);
        expect({
            start: available("Start Recording"), stop: available("Stop Recording"),
            clear: available("Clear Recording"), play: available("Play Sequence")
        }).toEqual(expected);
    });

    test("an unavailable control stays focusable but ignores activation", () => {
        const onPlay = vi.fn();
        renderInMain(<RecorderControls mode="idle" events={[]} speed={1} status="" {...HANDLERS} onPlay={onPlay} />);
        const play = action("Play Sequence");
        expect(play.disabled).toBe(false);
        play.focus();
        expect(document.activeElement).toBe(play);
        fireEvent.click(play);
        expect(onPlay).not.toHaveBeenCalled();
    });

    test("offers 0.5×, 1.0× and 2.0× as one radio group and reports changes", () => {
        const onSpeedChange = vi.fn();
        renderInMain(<RecorderControls mode="idle" events={[]} speed={1} status="" {...HANDLERS} onSpeedChange={onSpeedChange} />);
        const group = screen.getByRole("group", { name: "Playback speed" });
        const radios = within(group).getAllByRole("radio");
        expect(radios.map((r) => r.labels[0].textContent.trim())).toEqual(["0.5×", "1.0×", "2.0×"]);
        expect(screen.getByRole("radio", { name: "1.0×" }).checked).toBe(true);
        fireEvent.click(screen.getByRole("radio", { name: "2.0×" }));
        expect(onSpeedChange).toHaveBeenCalledWith(2);
    });

    test("lists every recorded event, with all four fields, in recorded order", () => {
        renderInMain(<RecorderControls mode="idle" events={[ev(69, 0, 300), ev(72, 450, 100)]} speed={1} status="" {...HANDLERS} />);
        const table = screen.getByRole("table", { name: /Recorded notes: 2/ });
        expect(table.caption.textContent).toBe("Recorded notes: 2, 0.55 s at 1.0×");
        const rows = within(table).getAllByRole("row").slice(1).map((row) => [...row.cells].map((cell) => cell.textContent));
        expect(rows).toEqual([
            ["1", "A4", "69", "440.00 Hz", "0 ms", "0 ms", "300 ms"],
            ["2", "C5", "72", "523.25 Hz", "450 ms", "450 ms", "100 ms"]
        ]);
        const frame = table.closest("figure");
        expect(frame.tabIndex).toBe(0);
        expect(frame.getAttribute("aria-labelledby")).toBe(table.caption.id);
    });

    test("status is a polite live region", () => {
        renderInMain(<RecorderControls mode="idle" events={[]} speed={1} status="Recording cleared." {...HANDLERS} />);
        const status = screen.getByRole("status");
        expect(status.tagName).toBe("OUTPUT");
        expect(status.getAttribute("aria-live")).toBe("polite");
        expect(status.textContent).toBe("Recording cleared.");
    });

    test.each([
        ["an unknown mode", { mode: "paused" }],
        ["events that are not recorded events", { events: [{ midi: 60 }] }],
        ["an unsupported speed", { speed: 3 }],
        ["a missing handler", { onPlay: undefined }],
        ["a non-string status", { status: 3 }]
    ])("throws a TypeError for %s (Rule 2)", (_, override) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const props = { mode: "idle", events: [], speed: 1, status: "", ...HANDLERS, ...override };
        expect(() => renderInMain(<RecorderControls {...props} />)).toThrow(TypeError);
    });

    test("source uses no <div> and no innerHTML (Rules 1 and 3)", () => {
        [SOURCE, HOOK_SOURCE].forEach((source) => {
            const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
            expect(code).not.toMatch(/<div\b|innerHTML|dangerouslySetInnerHTML/);
        });
    });
});

/** A synth double with the real voice-pool semantics that matter to the UI. */
function fakeSynth() {
    const voices = new Map();
    return {
        voices,
        noteOn: vi.fn((midi) => { if (voices.has(midi)) return false; voices.set(midi, {}); return true; }),
        noteOff: vi.fn((midi) => voices.delete(midi)),
        releaseAll: vi.fn(() => voices.clear()),
        close: vi.fn()
    };
}

describe("App: record and replay", () => {
    let synth;

    beforeEach(() => {
        vi.useFakeTimers();
        synth = fakeSynth();
        renderInMain(<App engine={{ synth, now: () => Date.now(), clock: { now: () => Date.now() } }} />);
    });

    const key = (name) => screen.getByRole("button", { name });
    const status = () => screen.getByRole("status").textContent;

    function hold(name, ms) {
        fireEvent.pointerDown(key(name), { pointerType: "mouse", button: 0 });
        act(() => { vi.advanceTimersByTime(ms); });
        fireEvent.pointerUp(key(name), { pointerType: "mouse", button: 0 });
    }

    function rest(ms) {
        act(() => { vi.advanceTimersByTime(ms); });
    }

    function recordMelody() {
        fireEvent.click(action("Start Recording"));
        hold("C4 white key", 200);
        rest(100);
        hold("E4 white key", 150);
        rest(50);
        hold("G4 white key", 300);
        fireEvent.click(action("Stop Recording"));
    }

    const midiCalls = () => synth.noteOn.mock.calls.map(([midi]) => midi);

    test("live keys sound and light up while held, recorded or not", () => {
        fireEvent.pointerDown(key("A4 white key"), { pointerType: "mouse", button: 0 });
        expect(synth.noteOn).toHaveBeenCalledWith(69, 440);
        expect(key("A4 white key").getAttribute("aria-pressed")).toBe("true");
        fireEvent.pointerUp(key("A4 white key"), { pointerType: "mouse", button: 0 });
        expect(synth.noteOff).toHaveBeenCalledWith(69);
        expect(key("A4 white key").getAttribute("aria-pressed")).toBe("false");
        expect(screen.getByText("No notes recorded yet.")).toBeTruthy();
    });

    test("Start / Stop Recording captures each note's duration and onset delta", () => {
        fireEvent.click(action("Start Recording"));
        expect(status()).toMatch(/^Recording/);
        expect(available("Start Recording")).toBe(false);
        hold("C4 white key", 200);
        expect(screen.getByText("Notes captured: 1")).toBeTruthy();
        rest(100);
        hold("E4 white key", 150);
        rest(50);
        hold("G4 white key", 300);
        fireEvent.click(action("Stop Recording"));
        expect(status()).toBe("Recording stopped: 3 notes recorded.");

        const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1)
            .map((row) => [...row.cells].slice(1).map((cell) => cell.textContent));
        expect(rows).toEqual([
            ["C4", "60", "261.63 Hz", "0 ms", "0 ms", "200 ms"],
            ["E4", "64", "329.63 Hz", "300 ms", "300 ms", "150 ms"],
            ["G4", "67", "392.00 Hz", "500 ms", "200 ms", "300 ms"]
        ]);
    });

    test("notes played after Stop Recording are not recorded", () => {
        recordMelody();
        hold("B4 white key", 100);
        expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
    });

    test.each([
        ["0.5×", 0.5, [0, 600, 1000], 1600],
        ["1.0×", 1, [0, 300, 500], 800],
        ["2.0×", 2, [0, 150, 250], 400]
    ])("Play Sequence at %s replays the notes in order, scaled in time", async (label, speed, onsets, end) => {
        recordMelody();
        synth.noteOn.mockClear();
        fireEvent.click(screen.getByRole("radio", { name: label }));
        const start = Date.now();
        const times = [];
        synth.noteOn.mockImplementation((midi) => { times.push(Date.now() - start); synth.voices.set(midi, {}); return true; });

        fireEvent.click(action("Play Sequence"));
        expect(status()).toBe(`Playing 3 notes at ${speed.toFixed(1)}×.`);
        expect(available("Play Sequence")).toBe(false);
        expect(available("Start Recording")).toBe(false);
        await act(async () => { await vi.advanceTimersByTimeAsync(end - 1); });
        expect(midiCalls()).toEqual([60, 64, 67]);
        expect(times).toEqual(onsets);
        expect(key("G4 white key").getAttribute("aria-pressed")).toBe("true");   // replay lights the keys
        await act(async () => { await vi.advanceTimersByTimeAsync(1); });
        expect(key("G4 white key").getAttribute("aria-pressed")).toBe("false");
        expect(status()).toBe("Playback finished.");
        expect(available("Play Sequence")).toBe(true);
    });

    test("a recording replays again and again, unchanged", async () => {
        recordMelody();
        const before = within(screen.getByRole("table")).getAllByRole("row").map((row) => row.textContent);
        synth.noteOn.mockClear();
        for (let i = 0; i < 3; i += 1) {
            fireEvent.click(action("Play Sequence"));
            await act(async () => { await vi.runAllTimersAsync(); });
        }
        expect(midiCalls()).toEqual([60, 64, 67, 60, 64, 67, 60, 64, 67]);
        expect(within(screen.getByRole("table")).getAllByRole("row").map((row) => row.textContent)).toEqual(before);
    });

    test("pressing Play Sequence repeatedly does not start competing replays", async () => {
        recordMelody();
        synth.noteOn.mockClear();
        fireEvent.click(action("Play Sequence"));
        fireEvent.click(action("Play Sequence"));
        fireEvent.click(action("Play Sequence"));
        await act(async () => { await vi.runAllTimersAsync(); });
        expect(midiCalls()).toEqual([60, 64, 67]);
    });

    test("Clear Recording removes every event, and stops a replay in progress", async () => {
        recordMelody();
        fireEvent.click(action("Play Sequence"));
        await act(async () => { await vi.advanceTimersByTimeAsync(350); });
        fireEvent.click(action("Clear Recording"));
        expect(synth.voices.size).toBe(0);
        expect(status()).toBe("Recording cleared.");
        expect(screen.getByText("No notes recorded yet.")).toBeTruthy();
        await act(async () => { await vi.runAllTimersAsync(); });
        expect(midiCalls().slice(3)).toEqual([60, 64]);           // G4 never played
        expect(available("Play Sequence")).toBe(false);
    });

    test("a new take replaces the previous recording", () => {
        recordMelody();
        fireEvent.click(action("Start Recording"));
        hold("D4 white key", 100);
        fireEvent.click(action("Stop Recording"));
        const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
        expect(rows.map((row) => row.cells[1].textContent)).toEqual(["D4"]);
    });

    test("the window losing focus releases every sounding note", () => {
        fireEvent.pointerDown(key("C4 white key"), { pointerType: "mouse", button: 0 });
        fireEvent.pointerDown(key("E4 white key"), { pointerType: "touch", button: 0 });
        act(() => { window.dispatchEvent(new Event("blur")); });
        expect(synth.releaseAll).toHaveBeenCalled();
        expect(document.querySelectorAll("button[aria-pressed='true']")).toHaveLength(0);
    });
});
