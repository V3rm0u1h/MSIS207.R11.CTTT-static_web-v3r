import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import SOURCE from "./DrumKit.jsx?raw";
import DrumKit, { FLASH_MS } from "./DrumKit.jsx";
import { DRUM_PADS } from "../drumPads.js";

// T-01A — semantic landmarks and list (PRD 1 sections 3 and 6, Project Rules 1, 2 and 4).
// T-01B — physical keyboard engine wired to the pads (PRD 2 sections 5–7).

/** Renders into a <main>, as index.html hosts the app. */
function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

function key(type, code, init = {}) {
    return new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...init });
}

function pressKey(code, init) {
    act(() => { window.dispatchEvent(key("keydown", code, init)); });
}

function releaseKey(code) {
    act(() => { window.dispatchEvent(key("keyup", code)); });
}

function pressedIds(container) {
    return [...container.querySelectorAll("button[aria-pressed='true']")].map((button) => button.dataset.padId);
}

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
    vi.useRealTimers();
});

describe("DrumKit — semantic foundation (T-01A)", () => {
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
        ["no pads", { pads: undefined }],
        ["an empty list", { pads: [] }],
        ["a list with a broken pad", { pads: [DRUM_PADS[0], { id: "x", name: "X" }] }],
        ["a duplicate key", { pads: [DRUM_PADS[0], { ...DRUM_PADS[1], code: "KeyW", keyLabel: "W" }] }],
        ["a non-function onHit", { pads: DRUM_PADS, onHit: "play" }]
    ])("rejects %s with a TypeError before rendering anything (Project Rule 2)", (_, props) => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            expect(() => renderInMain(<DrumKit {...props} />)).toThrow(TypeError);
        } finally {
            spy.mockRestore();
        }
    });

    test("source contains no <div>, no innerHTML and no global UI-library CSS import", () => {
        expect(SOURCE).not.toMatch(/<div[\s>]/);
        expect(SOURCE).not.toMatch(/innerHTML|dangerouslySetInnerHTML/);
        expect(SOURCE).not.toMatch(/import\s+["'][^"']*(?<!\.module)\.css["']/);
    });
});

describe("DrumKit — physical keyboard engine (T-01B)", () => {
    test("keydown activates the mapped pad (aria-pressed=true) and keyup releases it", () => {
        const { container } = renderInMain(<DrumKit pads={DRUM_PADS} />);
        pressKey("KeyW");
        expect(pressedIds(container)).toEqual(["kick"]);
        releaseKey("KeyW");
        expect(pressedIds(container)).toEqual([]);
    });

    test("supports all seven physical keys and can hold several pads at once", () => {
        const { container } = renderInMain(<DrumKit pads={DRUM_PADS} />);
        DRUM_PADS.forEach((pad) => pressKey(pad.code));
        expect(pressedIds(container)).toEqual(DRUM_PADS.map((pad) => pad.id));
        DRUM_PADS.forEach((pad) => releaseKey(pad.code));
        expect(pressedIds(container)).toEqual([]);
    });

    test("reports each keyboard hit once, with the pad and the source, and ignores auto-repeat", () => {
        const onHit = vi.fn();
        renderInMain(<DrumKit pads={DRUM_PADS} onHit={onHit} />);
        pressKey("KeyA");
        pressKey("KeyA", { repeat: true });
        pressKey("KeyA", { repeat: true });
        expect(onHit).toHaveBeenCalledTimes(1);
        expect(onHit).toHaveBeenCalledWith(DRUM_PADS[1], "keyboard");
        releaseKey("KeyA");
        pressKey("KeyA");
        expect(onHit).toHaveBeenCalledTimes(2);
    });

    test("uses the physical key, not the typed character (IME-safe)", () => {
        const { container } = renderInMain(<DrumKit pads={DRUM_PADS} />);
        pressKey("KeyW", { key: "ư" });
        expect(pressedIds(container)).toEqual(["kick"]);
        releaseKey("KeyW");
        pressKey("KeyQ", { key: "w" });
        expect(pressedIds(container)).toEqual([]);
    });

    test("ignores shortcuts while typing in a form control on the same page", () => {
        const onHit = vi.fn();
        const { container } = renderInMain(<DrumKit pads={DRUM_PADS} onHit={onHit} />);
        const input = document.body.appendChild(document.createElement("input"));
        input.focus();
        act(() => { fireEvent.keyDown(input, { code: "KeyW" }); });
        expect(pressedIds(container)).toEqual([]);
        expect(onHit).not.toHaveBeenCalled();
        // Ordinary typing is untouched: the event is not default-prevented.
        const typed = key("keydown", "KeyW");
        act(() => { input.dispatchEvent(typed); });
        expect(typed.defaultPrevented).toBe(false);
    });

    test("mouse / touch / Enter / Space clicks still work: one hit and a short flash", () => {
        vi.useFakeTimers();
        const onHit = vi.fn();
        const { container, getByRole } = renderInMain(<DrumKit pads={DRUM_PADS} onHit={onHit} />);
        const clap = getByRole("button", { name: "Clap D key, drum pad" });
        act(() => { fireEvent.click(clap); });
        expect(onHit).toHaveBeenCalledWith(DRUM_PADS[3], "pointer");
        expect(pressedIds(container)).toEqual(["clap"]);
        act(() => { vi.advanceTimersByTime(FLASH_MS); });
        expect(pressedIds(container)).toEqual([]);
    });

    test("a click flash does not release a pad that is still held on the keyboard", () => {
        vi.useFakeTimers();
        const { container, getByRole } = renderInMain(<DrumKit pads={DRUM_PADS} />);
        pressKey("KeyW");
        act(() => { fireEvent.click(getByRole("button", { name: "Kick W key, drum pad" })); });
        act(() => { vi.advanceTimersByTime(FLASH_MS); });
        expect(pressedIds(container)).toEqual(["kick"]);
        releaseKey("KeyW");
        expect(pressedIds(container)).toEqual([]);
    });

    test("handlers see current props (no stale closure): a swapped onHit receives the next hit", () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = renderInMain(<DrumKit pads={DRUM_PADS} onHit={first} />);
        pressKey("KeyJ");
        releaseKey("KeyJ");
        rerender(<DrumKit pads={DRUM_PADS} onHit={second} />);
        pressKey("KeyJ");
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });

    test("removes its window listeners on unmount and stops reacting", () => {
        const add = vi.spyOn(window, "addEventListener");
        const remove = vi.spyOn(window, "removeEventListener");
        const onHit = vi.fn();
        const { unmount } = renderInMain(<DrumKit pads={DRUM_PADS} onHit={onHit} />);
        const added = add.mock.calls.filter(([type]) => type === "keydown" || type === "keyup");
        expect(added).toHaveLength(2);
        unmount();
        const removed = remove.mock.calls.filter(([type]) => type === "keydown" || type === "keyup");
        expect(removed.map(([type, fn]) => [type, fn])).toEqual(added.map(([type, fn]) => [type, fn]));
        pressKey("KeyW");
        expect(onHit).not.toHaveBeenCalled();
        add.mockRestore();
        remove.mockRestore();
    });

    test("source never reads the deprecated keyCode", () => {
        expect(SOURCE).not.toMatch(/keyCode|\.which\b/);
    });
});
