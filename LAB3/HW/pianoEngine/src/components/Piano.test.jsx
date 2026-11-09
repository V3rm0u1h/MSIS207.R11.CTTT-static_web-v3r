import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import PIANO_SOURCE from "./Piano.jsx?raw";
import KEY_SOURCE from "./PianoKey.jsx?raw";
import APP_SOURCE from "../App.jsx?raw";
import Piano from "./Piano.jsx";
import PianoKey from "./PianoKey.jsx";
import App from "../App.jsx";
import { PIANO_KEYS, createPianoKey, generatePianoKeys } from "../piano.js";

// T-02A — semantic rendering of the generated keyboard (PRD 1 sections 5–7, Project Rules 1–4).

function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
});

const SOURCES = [["Piano.jsx", PIANO_SOURCE], ["PianoKey.jsx", KEY_SOURCE], ["App.jsx", APP_SOURCE]];
const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("Piano", () => {
    test("renders one section > ol with 88 list items, each holding exactly one button", () => {
        const { container } = renderInMain(<Piano pianoKeys={PIANO_KEYS} />);
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
        const { container } = renderInMain(<Piano pianoKeys={PIANO_KEYS} />);
        expect(container.querySelectorAll("button[data-note-type='white']")).toHaveLength(52);
        expect(container.querySelectorAll("button[data-note-type='black']")).toHaveLength(36);
    });

    test("DOM order equals data order: MIDI 21 … 108, no orphan nodes (Rule 4)", () => {
        const { container } = renderInMain(<Piano pianoKeys={PIANO_KEYS} />);
        const midis = [...container.querySelectorAll("ol > li > button")].map((b) => Number(b.dataset.midi));
        expect(midis).toEqual(PIANO_KEYS.map((key) => key.midi));
        expect(container.querySelector("section").parentElement).toBe(container);
    });

    test("every key has a unique accessible name containing its visible label", () => {
        renderInMain(<Piano pianoKeys={PIANO_KEYS} />);
        expect(screen.getByRole("button", { name: "A0 white key" })).toHaveProperty("dataset.midi", "21");
        expect(screen.getByRole("button", { name: "A4 white key" })).toHaveProperty("dataset.freqHz", "440.00");
        expect(screen.getByRole("button", { name: "C#4 black key" })).toHaveProperty("dataset.midi", "61");
        expect(screen.getByRole("button", { name: "C8 white key" })).toHaveProperty("dataset.midi", "108");
        const names = screen.getAllByRole("button").map((button) => button.textContent);
        expect(new Set(names).size).toBe(88);
    });

    test("places keys in the grid from the MIDI data", () => {
        const { container } = renderInMain(<Piano pianoKeys={PIANO_KEYS} />);
        const items = container.querySelectorAll("ol > li");
        expect(items[0].style.gridColumn).toBe("1 / span 6");   // A0
        expect(items[1].style.gridColumn).toBe("5 / span 4");   // A#0, centred on line 7
        expect(items[2].style.gridColumn).toBe("7 / span 6");   // B0
        expect(items[87].style.gridColumn).toBe("307 / span 6"); // C8
        expect(container.querySelector("ol").style.getPropertyValue("--piano-columns")).toBe("312");
    });

    test("summarises the range", () => {
        renderInMain(<Piano pianoKeys={PIANO_KEYS} />);
        expect(screen.getByText("A0 (MIDI 21) to C8 (MIDI 108): 52 white and 36 black keys")).toBeTruthy();
    });

    test("renders any generated range, e.g. one octave", () => {
        renderInMain(<Piano pianoKeys={generatePianoKeys({ startMidi: 60, endMidi: 72, totalKeys: 13 })} />);
        expect(screen.getByRole("region", { name: "13-key piano" })).toBeTruthy();
        expect(screen.getAllByRole("button")).toHaveLength(13);
    });

    test("forwards a click on a key to onKeyPress with that key's metadata", () => {
        const onKeyPress = vi.fn();
        renderInMain(<Piano pianoKeys={PIANO_KEYS} onKeyPress={onKeyPress} />);
        fireEvent.click(screen.getByRole("button", { name: "A4 white key" }));
        expect(onKeyPress).toHaveBeenCalledWith(PIANO_KEYS[48]);
        expect(PIANO_KEYS[48]).toMatchObject({ midi: 69, freqHz: 440 });
    });

    test.each([
        ["no keys", { pianoKeys: undefined }],
        ["an empty list", { pianoKeys: [] }],
        ["a forged key", { pianoKeys: [{ ...createPianoKey(60), note: "D" }] }],
        ["a non-function onKeyPress", { pianoKeys: PIANO_KEYS, onKeyPress: "play" }]
    ])("throws a TypeError for %s (Rule 2)", (_, props) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderInMain(<Piano {...props} />)).toThrow(TypeError);
    });
});

describe("PianoKey", () => {
    test("is a single native button with no wrapper (Rules 1 and 4)", () => {
        const { container } = render(<PianoKey pianoKey={createPianoKey(61)} />);
        expect(container.children).toHaveLength(1);
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
    test.each(SOURCES)("%s uses no <div> (Rule 1) and no innerHTML (Rule 3)", (_, source) => {
        expect(code(source)).not.toMatch(/<div\b/);
        expect(code(source)).not.toMatch(/innerHTML|dangerouslySetInnerHTML/);
    });

    test("the 88 keys are generated with .map, not written out", () => {
        expect(code(PIANO_SOURCE)).toMatch(/pianoKeys\.map\(/);
        expect((code(PIANO_SOURCE).match(/<PianoKey\b/g) ?? [])).toHaveLength(1);
    });
});

describe("App", () => {
    test("renders a header and the 88-key piano, with no wrapper element", () => {
        const { container } = renderInMain(<App />);
        expect([...container.children].map((node) => node.tagName)).toEqual(["HEADER", "SECTION"]);
        expect(screen.getByRole("heading", { level: 1, name: "Polyphonic Piano Engine" })).toBeTruthy();
        expect(screen.getAllByRole("button")).toHaveLength(88);
    });
});
