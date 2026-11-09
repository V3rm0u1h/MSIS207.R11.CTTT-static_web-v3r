import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, within } from "@testing-library/react";
import SOURCE from "./DrumKit.jsx?raw";
import DrumKit from "./DrumKit.jsx";
import { DRUM_PADS } from "../drumPads.js";

// T-01A — semantic drum kit landmarks and list (PRD sections 3 and 6, Project Rules 1, 2 and 4).

/** Renders into a <main>, as index.html hosts the app. */
function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
});

describe("DrumKit", () => {
    test("renders seven drum pads, one per configured instrument, in configuration order", () => {
        const { getAllByRole } = renderInMain(<DrumKit pads={DRUM_PADS} />);
        const buttons = getAllByRole("button");
        expect(buttons).toHaveLength(7);
        expect(buttons.map((button) => button.dataset.padId)).toEqual(DRUM_PADS.map((pad) => pad.id));
        expect(buttons.map((button) => button.querySelector("kbd").textContent)).toEqual(
            DRUM_PADS.map((pad) => pad.keyLabel)
        );
    });

    test("gives every pad a meaningful accessible name and aria-pressed", () => {
        const { getByRole, getAllByRole } = renderInMain(<DrumKit pads={DRUM_PADS} />);
        DRUM_PADS.forEach((pad) => {
            expect(getByRole("button", { name: `${pad.name} ${pad.keyLabel} key, drum pad` })).toBeTruthy();
        });
        getAllByRole("button").forEach((button) => {
            expect(button.getAttribute("type")).toBe("button");
            expect(button.getAttribute("aria-pressed")).toBe("false");
        });
    });

    test("exposes semantic landmarks: a banner with h1 + p and a labelled region with an h2", () => {
        const { container, getByRole } = renderInMain(<DrumKit pads={DRUM_PADS} />);
        const header = container.querySelector("header");
        expect(header).not.toBeNull();
        expect(within(header).getByRole("heading", { level: 1 }).textContent).toBe("Production Studio");
        expect(header.querySelector("p").textContent).toBe("Interactive Drum Kit");

        const region = getByRole("region", { name: "Drum Pads" });
        expect(region.tagName).toBe("SECTION");
        expect(region.getAttribute("aria-labelledby")).toBe("drum-kit-title");
        expect(within(region).getByRole("heading", { level: 2 }).id).toBe("drum-kit-title");
    });

    test("mounts <main> > header + section > ul > 7 li with no extra wrapper and no <div> (Rules 1 and 4)", () => {
        const { container } = renderInMain(<DrumKit pads={DRUM_PADS} />);
        expect([...container.children].map((node) => node.tagName)).toEqual(["HEADER", "SECTION"]);
        const section = container.children[1];
        expect([...section.children].map((node) => node.tagName)).toEqual(["H2", "UL"]);
        const list = section.querySelector("ul");
        expect(list.children).toHaveLength(7);
        [...list.children].forEach((item) => {
            expect(item.tagName).toBe("LI");
            expect(item.parentElement).toBe(list);
            expect(item.children).toHaveLength(1);
            expect(item.firstElementChild.tagName).toBe("BUTTON");
        });
        expect(container.querySelectorAll("div")).toHaveLength(0);
        expect(container.querySelectorAll("li")).toHaveLength(7);
    });

    test("logs no React warning (the list is keyed by pad.id)", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            renderInMain(<DrumKit pads={DRUM_PADS} />);
            expect(spy.mock.calls).toEqual([]);
        } finally {
            spy.mockRestore();
        }
    });

    test("renders any valid pad list without code changes", () => {
        const pads = [
            { id: "rim", name: "Rimshot", code: "KeyQ", keyLabel: "Q", sound: "/sounds/rim.wav" },
            { id: "cowbell", name: "Cowbell", code: "KeyE", keyLabel: "E", sound: "/sounds/cowbell.wav" }
        ];
        const { getAllByRole } = renderInMain(<DrumKit pads={pads} />);
        expect(getAllByRole("button").map((button) => button.textContent)).toEqual(["Rimshot Q key, drum pad", "Cowbell E key, drum pad"]);
    });

    test.each([
        ["no pads", undefined],
        ["an empty list", []],
        ["a list with a broken pad", [DRUM_PADS[0], { id: "x", name: "X" }]],
        ["a duplicate key", [DRUM_PADS[0], { ...DRUM_PADS[1], code: "KeyW", keyLabel: "W" }]]
    ])("rejects %s with a TypeError before rendering anything (Project Rule 2)", (_, pads) => {
        expect(() => DrumKit({ pads })).toThrow(TypeError);
    });

    test("source contains no <div>, no innerHTML and no global UI-library CSS import", () => {
        expect(SOURCE).not.toMatch(/<div[\s>]/);
        expect(SOURCE).not.toMatch(/innerHTML|dangerouslySetInnerHTML/);
        expect(SOURCE).not.toMatch(/import\s+["'][^"']*(?<!\.module)\.css["']/);
    });
});
