import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import KEYBOARD_SOURCE from "./PianoKeyboard.jsx?raw";
import PianoKeyboard from "./PianoKeyboard.jsx";
import PianoKey from "./PianoKey.jsx";
import { PIANO_KEYS, createPianoKey, generatePianoKeys } from "../utils/midiUtils.js";

// T-02A — semantic rendering of the generated keyboard (PRD 1 sections 5–7, Project Rules 1–4).
// T-02C/D — press / release reporting and isActive on memoised keys.

function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
});

// Every app source file (components, hooks, audio, utils, data), checked for Rules 1 and 3.
const SOURCES = Object.entries(import.meta.glob(["../**/*.{js,jsx}", "!../**/*.test.{js,jsx}", "!../test/**"], { query: "?raw", import: "default", eager: true }));
const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("PianoKeyboard", () => {
    test("renders one section > ol with 88 list items, each holding exactly one button", () => {
        const { container } = renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} />);
        const section = screen.getByRole("region", { name: "88-key piano" });
        const list = within(section).getByRole("list");
        expect(list.tagName).toBe("OL");
        const items = within(list).getAllByRole("listitem");
        expect(items).toHaveLength(88);
        items.forEach((item) => {
            expect(item.children).toHaveLength(1);
            expect(item.firstElementChild.tagName).toBe("BUTTON");
        });
        expect(container.querySelectorAll("button")).toHaveLength(88);
    });

    test("renders 52 white and 36 black keys", () => {
        const { container } = renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} />);
        expect(container.querySelectorAll("button[data-note-type='white']")).toHaveLength(52);
        expect(container.querySelectorAll("button[data-note-type='black']")).toHaveLength(36);
    });

    test("DOM order equals data order: MIDI 21 … 108, no orphan nodes (Rule 4)", () => {
        const { container } = renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} />);
        const midis = [...container.querySelectorAll("ol > li > button")].map((b) => Number(b.dataset.midi));
        expect(midis).toEqual(PIANO_KEYS.map((key) => key.midi));
        expect(container.querySelector("section").parentElement).toBe(container);
    });

    test("every key has a unique accessible name containing its visible label", () => {
        renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} />);
        expect(screen.getByRole("button", { name: "A0 white key" })).toHaveProperty("dataset.midi", "21");
        expect(screen.getByRole("button", { name: "A4 white key" })).toHaveProperty("dataset.freqHz", "440.00");
        expect(screen.getByRole("button", { name: "C#4 black key" })).toHaveProperty("dataset.midi", "61");
        expect(screen.getByRole("button", { name: "C8 white key" })).toHaveProperty("dataset.midi", "108");
        const names = screen.getAllByRole("button").map((button) => button.textContent);
        expect(new Set(names).size).toBe(88);
    });

    test("places keys in the grid from the MIDI data", () => {
        const { container } = renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} />);
        const items = container.querySelectorAll("ol > li");
        expect(items[0].style.gridColumn).toBe("1 / span 6");   // A0
        expect(items[1].style.gridColumn).toBe("5 / span 4");   // A#0, centred on line 7
        expect(items[2].style.gridColumn).toBe("7 / span 6");   // B0
        expect(items[87].style.gridColumn).toBe("307 / span 6"); // C8
        expect(container.querySelector("ol").style.getPropertyValue("--piano-columns")).toBe("312");
    });

    test("summarises the range", () => {
        renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} />);
        expect(screen.getByText("A0 (MIDI 21) to C8 (MIDI 108): 52 white and 36 black keys")).toBeTruthy();
    });

    test("renders any generated range, e.g. one octave", () => {
        renderInMain(<PianoKeyboard pianoKeys={generatePianoKeys({ startMidi: 60, endMidi: 72, totalKeys: 13 })} />);
        expect(screen.getByRole("region", { name: "13-key piano" })).toBeTruthy();
        expect(screen.getAllByRole("button")).toHaveLength(13);
    });

    test("pointer down / up on a key reports note-on / note-off with that key's metadata", () => {
        const onNoteOn = vi.fn();
        const onNoteOff = vi.fn();
        renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} onNoteOn={onNoteOn} onNoteOff={onNoteOff} />);
        const a4 = screen.getByRole("button", { name: "A4 white key" });
        fireEvent.pointerDown(a4, { pointerType: "mouse", button: 0 });
        expect(onNoteOn).toHaveBeenCalledWith(PIANO_KEYS[48]);
        expect(PIANO_KEYS[48]).toMatchObject({ midi: 69, freqHz: 440 });
        fireEvent.pointerUp(a4, { pointerType: "mouse", button: 0 });
        expect(onNoteOff).toHaveBeenCalledWith(PIANO_KEYS[48]);
    });

    test("a right-click does not play; leaving or cancelling a press ends the note", () => {
        const onNoteOn = vi.fn();
        const onNoteOff = vi.fn();
        renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} onNoteOn={onNoteOn} onNoteOff={onNoteOff} />);
        const c4 = screen.getByRole("button", { name: "C4 white key" });
        fireEvent.pointerDown(c4, { pointerType: "mouse", button: 2 });
        expect(onNoteOn).not.toHaveBeenCalled();
        fireEvent.pointerDown(c4, { pointerType: "touch", button: 0 });
        fireEvent.pointerCancel(c4);
        fireEvent.pointerLeave(c4);
        expect(onNoteOn).toHaveBeenCalledTimes(1);
        expect(onNoteOff).toHaveBeenCalledTimes(2);
    });

    test("Enter or Space held on a focused key plays it; auto-repeat is ignored; blur releases", () => {
        const onNoteOn = vi.fn();
        const onNoteOff = vi.fn();
        renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} onNoteOn={onNoteOn} onNoteOff={onNoteOff} />);
        const key = screen.getByRole("button", { name: "C#4 black key" });
        fireEvent.keyDown(key, { key: " " });
        fireEvent.keyDown(key, { key: " ", repeat: true });
        fireEvent.keyUp(key, { key: " " });
        fireEvent.keyDown(key, { key: "Enter" });
        fireEvent.blur(key);
        fireEvent.keyDown(key, { key: "a" });
        expect(onNoteOn).toHaveBeenCalledTimes(2);
        expect(onNoteOff).toHaveBeenCalledTimes(2);
        expect(onNoteOn).toHaveBeenLastCalledWith(PIANO_KEYS[40]);
    });

    test("activeNotes marks exactly the sounding keys as pressed", () => {
        const { container } = renderInMain(<PianoKeyboard pianoKeys={PIANO_KEYS} activeNotes={new Set([60, 64, 67])} />);
        const pressed = [...container.querySelectorAll("button[aria-pressed='true']")].map((b) => Number(b.dataset.midi));
        expect(pressed).toEqual([60, 64, 67]);
        expect(container.querySelectorAll("button[aria-pressed='false']")).toHaveLength(85);
    });

    test.each([
        ["no keys", { pianoKeys: undefined }],
        ["an empty list", { pianoKeys: [] }],
        ["a forged key", { pianoKeys: [{ ...createPianoKey(60), note: "D" }] }],
        ["a non-function onNoteOn", { pianoKeys: PIANO_KEYS, onNoteOn: "play" }],
        ["a non-function onNoteOff", { pianoKeys: PIANO_KEYS, onNoteOff: 1 }],
        ["activeNotes given as an array", { pianoKeys: PIANO_KEYS, activeNotes: [60] }]
    ])("throws a TypeError for %s (Rule 2)", (_, props) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderInMain(<PianoKeyboard {...props} />)).toThrow(TypeError);
    });
});

describe("PianoKey", () => {
    test("is a single native button with no wrapper (Rules 1 and 4)", () => {
        const { container } = render(<PianoKey pianoKey={createPianoKey(61)} />);
        expect(container.children).toHaveLength(1);
        expect(container.firstElementChild.getAttribute("aria-pressed")).toBe("false");
        const button = container.firstElementChild;
        expect(button.tagName).toBe("BUTTON");
        expect(button.type).toBe("button");
        expect(button.textContent).toBe("C#4 black key");
    });

    test("rejects an HTML payload before rendering and never parses text as HTML (Rule 3)", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const payload = { ...createPianoKey(69), note: "<img src=x onerror=alert(1)>" };
        expect(() => render(<PianoKey pianoKey={payload} />)).toThrow(TypeError);
        expect(document.querySelector("img")).toBeNull();
    });
});

describe("Project Rules in source", () => {
    test("covers every source file", () => {
        expect(SOURCES.length).toBeGreaterThanOrEqual(15);
    });

    test.each(SOURCES)("%s uses no <div> (Rule 1) and no innerHTML (Rule 3)", (_, source) => {
        expect(code(source)).not.toMatch(/<div\b/);
        expect(code(source)).not.toMatch(/innerHTML|dangerouslySetInnerHTML/);
    });

    test("the 88 keys are generated with .map, not written out", () => {
        expect(code(KEYBOARD_SOURCE)).toMatch(/pianoKeys\.map\(/);
        expect((code(KEYBOARD_SOURCE).match(/<(Memo)?PianoKey\b/g) ?? [])).toHaveLength(1);
    });
});
