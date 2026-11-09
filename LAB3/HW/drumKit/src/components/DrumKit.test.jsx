import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import SOURCE from "./DrumKit.jsx?raw";
import DrumKit, { FLASH_MS } from "./DrumKit.jsx";
import { DRUM_PADS } from "../drumPads.js";
import { SILENT_LEVEL } from "../audioEngine.js";
import { HISTORY_LIMIT } from "../hitHistory.js";
import { POLL_MS, QUIET_TICKS } from "../useAudioEngine.js";

// T-01A — semantic landmarks and list (PRD 1 sections 3 and 6, Project Rules 1, 2 and 4).
// T-01B — physical keyboard engine wired to the pads (PRD 2 sections 5–7).
// T-01C — audio, hit log, live region and meter (PRD 3).

/** Renders into a <main>, as index.html hosts the app. */
function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

/** An audio engine double; `reading` is what level() reports. */
function fakeAudio({ ok = true, level = 0.85 } = {}) {
    const audio = {
        supported: true,
        reading: SILENT_LEVEL,
        unlock: vi.fn(),
        play: vi.fn(() => Promise.resolve(ok ? { ok: true, level } : { ok: false, reason: "failed", level: 0 })),
        level: vi.fn(() => audio.reading),
        dispose: vi.fn()
    };
    return audio;
}

/** Renders the kit with a fake engine, so no AudioContext is needed in jsdom. */
function renderKit(props = {}) {
    const audio = props.audio ?? fakeAudio();
    return { audio, ...renderInMain(<DrumKit pads={DRUM_PADS} audio={audio} {...props} />) };
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

const logItems = (container) => container.querySelectorAll("section[aria-labelledby='hit-log-title'] li");
const logStatus = (container) => container.querySelector("section[aria-labelledby='hit-log-title'] output");

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
    vi.useRealTimers();
});

describe("DrumKit — semantic foundation (T-01A)", () => {
    test("renders seven drum pads, one per configured instrument, in configuration order", () => {
        const { getAllByRole } = renderKit();
        const buttons = getAllByRole("button");
        expect(buttons).toHaveLength(7);
        expect(buttons.map((button) => button.dataset.padId)).toEqual(DRUM_PADS.map((pad) => pad.id));
        expect(buttons.map((button) => button.querySelector("kbd").textContent)).toEqual(
            DRUM_PADS.map((pad) => pad.keyLabel)
        );
    });

    test("gives every pad a meaningful accessible name and aria-pressed", () => {
        const { getByRole, getAllByRole } = renderKit();
        DRUM_PADS.forEach((pad) => {
            expect(getByRole("button", { name: `${pad.name} ${pad.keyLabel} key, drum pad` })).toBeTruthy();
        });
        getAllByRole("button").forEach((button) => {
            expect(button.getAttribute("type")).toBe("button");
            expect(button.getAttribute("aria-pressed")).toBe("false");
        });
    });

    test("exposes semantic landmarks: a banner with h1 + p and a labelled region with an h2", () => {
        const { container, getByRole } = renderKit();
        const header = container.querySelector("header");
        expect(header).not.toBeNull();
        expect(within(header).getByRole("heading", { level: 1 }).textContent).toBe("Production Studio");
        expect(header.querySelector("p").textContent).toBe("Interactive Drum Kit");

        const region = getByRole("region", { name: "Drum Pads" });
        expect(region.tagName).toBe("SECTION");
        expect(region.getAttribute("aria-labelledby")).toBe("drum-kit-title");
        expect(within(region).getByRole("heading", { level: 2 }).id).toBe("drum-kit-title");
    });

    test("mounts <main> > header + 3 sections, pads as ul > 7 li, no extra wrapper and no <div> (Rules 1 and 4)", () => {
        const { container } = renderKit();
        expect([...container.children].map((node) => node.tagName)).toEqual(["HEADER", "SECTION", "SECTION", "SECTION"]);
        expect([...container.querySelectorAll("section")].map((node) => node.getAttribute("aria-labelledby")))
            .toEqual(["drum-kit-title", "meter-title", "hit-log-title"]);
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
        expect(container.querySelectorAll("ul li")).toHaveLength(7);
    });

    test("logs no React warning (the list is keyed by pad.id)", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            renderKit();
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
        const { getAllByRole } = renderInMain(<DrumKit pads={pads} audio={fakeAudio()} />);
        expect(getAllByRole("button").map((button) => button.textContent)).toEqual(["Rimshot Q key, drum pad", "Cowbell E key, drum pad"]);
    });

    test.each([
        ["no pads", { pads: undefined }],
        ["an empty list", { pads: [] }],
        ["a list with a broken pad", { pads: [DRUM_PADS[0], { id: "x", name: "X" }] }],
        ["a duplicate key", { pads: [DRUM_PADS[0], { ...DRUM_PADS[1], code: "KeyW", keyLabel: "W" }] }],
        ["a non-function onHit", { pads: DRUM_PADS, onHit: "play" }],
        ["a zero history limit", { pads: DRUM_PADS, historyLimit: 0 }],
        ["an object that is not an audio engine", { pads: DRUM_PADS, audio: { play: true } }]
    ])("rejects %s with a TypeError before rendering anything (Project Rule 2)", (_, props) => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            expect(() => renderInMain(<DrumKit audio={fakeAudio()} {...props} />)).toThrow(TypeError);
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
        const { container } = renderKit();
        pressKey("KeyW");
        expect(pressedIds(container)).toEqual(["kick"]);
        releaseKey("KeyW");
        expect(pressedIds(container)).toEqual([]);
    });

    test("supports all seven physical keys and can hold several pads at once", () => {
        const { container } = renderKit();
        DRUM_PADS.forEach((pad) => pressKey(pad.code));
        expect(pressedIds(container)).toEqual(DRUM_PADS.map((pad) => pad.id));
        DRUM_PADS.forEach((pad) => releaseKey(pad.code));
        expect(pressedIds(container)).toEqual([]);
    });

    test("reports each keyboard hit once, with the pad, the source and the log entry, and ignores auto-repeat", () => {
        const onHit = vi.fn();
        renderKit({ onHit });
        pressKey("KeyA");
        pressKey("KeyA", { repeat: true });
        pressKey("KeyA", { repeat: true });
        expect(onHit).toHaveBeenCalledTimes(1);
        expect(onHit).toHaveBeenCalledWith(DRUM_PADS[1], "keyboard", expect.objectContaining({ instrument: "Snare", sequence: 1 }));
        releaseKey("KeyA");
        pressKey("KeyA");
        expect(onHit).toHaveBeenCalledTimes(2);
    });

    test("uses the physical key, not the typed character (IME-safe)", () => {
        const { container } = renderKit();
        pressKey("KeyW", { key: "ư" });
        expect(pressedIds(container)).toEqual(["kick"]);
        releaseKey("KeyW");
        pressKey("KeyQ", { key: "w" });
        expect(pressedIds(container)).toEqual([]);
    });

    test("ignores shortcuts while typing in a form control on the same page", () => {
        const onHit = vi.fn();
        const { container } = renderKit({ onHit });
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
        const { container, getByRole } = renderKit({ onHit });
        const clap = getByRole("button", { name: "Clap D key, drum pad" });
        act(() => { fireEvent.click(clap); });
        expect(onHit).toHaveBeenCalledWith(DRUM_PADS[3], "pointer", expect.objectContaining({ instrument: "Clap" }));
        expect(pressedIds(container)).toEqual(["clap"]);
        act(() => { vi.advanceTimersByTime(FLASH_MS); });
        expect(pressedIds(container)).toEqual([]);
    });

    test("a click flash does not release a pad that is still held on the keyboard", () => {
        vi.useFakeTimers();
        const { container, getByRole } = renderKit();
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
        const { rerender, audio } = renderKit({ onHit: first });
        pressKey("KeyJ");
        releaseKey("KeyJ");
        rerender(<DrumKit pads={DRUM_PADS} audio={audio} onHit={second} />);
        pressKey("KeyJ");
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });

    test("removes its window listeners on unmount and stops reacting", () => {
        const add = vi.spyOn(window, "addEventListener");
        const remove = vi.spyOn(window, "removeEventListener");
        const onHit = vi.fn();
        const { unmount } = renderKit({ onHit });
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

describe("DrumKit — audio, hit log and meter (T-01C)", () => {
    const flush = () => act(async () => { await Promise.resolve(); });

    test("every pad plays its own sound through the engine, from keyboard and pointer alike", () => {
        const { audio, getByRole } = renderKit();
        DRUM_PADS.forEach((pad) => { pressKey(pad.code); releaseKey(pad.code); });
        act(() => { fireEvent.click(getByRole("button", { name: "Tom J key, drum pad" })); });
        expect(audio.play.mock.calls.map(([id]) => id)).toEqual([...DRUM_PADS.map((pad) => pad.id), "tom"]);
        expect(audio.unlock).toHaveBeenCalledTimes(1);
    });

    test("records each hit in the log at once, announces only the latest, and fills in the intensity", async () => {
        const { container } = renderKit();
        pressKey("KeyW");
        releaseKey("KeyW");
        pressKey("KeyA");
        releaseKey("KeyA");
        expect(logStatus(container).textContent).toBe("Snare triggered, hit 2");
        const items = logItems(container);
        expect(items).toHaveLength(2);
        expect(items[0].children[1].textContent).toBe("Snare");
        expect(items[0].children[2].textContent).toBe("A");
        expect(items[1].children[1].textContent).toBe("Kick");
        expect(items[0].querySelector("meter").getAttribute("aria-label")).toBe("Intensity pending");
        await flush();
        expect(logItems(container)[0].querySelector("meter").getAttribute("aria-label")).toBe("Intensity 85%");
    });

    test(`keeps at most ${HISTORY_LIMIT} entries by default and honours historyLimit`, () => {
        const { container, unmount } = renderKit();
        for (let n = 0; n < HISTORY_LIMIT + 8; n += 1) { pressKey("KeyS"); releaseKey("KeyS"); }
        expect(logItems(container)).toHaveLength(HISTORY_LIMIT);
        expect(logStatus(container).textContent).toBe(`Hi-Hat triggered, hit ${HISTORY_LIMIT + 8}`);
        unmount();
        const small = renderKit({ historyLimit: 3 });
        for (let n = 0; n < 5; n += 1) { pressKey("KeyD"); releaseKey("KeyD"); }
        expect(logItems(small.container)).toHaveLength(3);
    });

    test("a failed or unsupported audio asset does not crash: the hit is still logged, intensity stays pending", async () => {
        const { container, audio } = renderKit({ audio: fakeAudio({ ok: false }) });
        pressKey("KeyK");
        releaseKey("KeyK");
        await flush();
        expect(audio.play).toHaveBeenCalledWith("cymbal");
        expect(logStatus(container).textContent).toBe("Cymbal triggered, hit 1");
        expect(logItems(container)[0].querySelector("meter").getAttribute("aria-label")).toBe("Intensity pending");
        expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(7);
    });

    test("the meter is inactive until a hit, follows the engine while sound plays, then returns to inactive", async () => {
        vi.useFakeTimers();
        const audio = fakeAudio();
        const { getByRole, container } = renderKit({ audio });
        const region = getByRole("region", { name: "Audio Level" });
        const meter = getByRole("meter", { name: "Relative audio signal level" });
        expect(region.dataset.state).toBe("inactive");
        expect(audio.level).not.toHaveBeenCalled();

        audio.reading = { rms: 0.5, dbfs: -6.02, percent: 90, active: true };
        pressKey("KeyW");
        releaseKey("KeyW");
        await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS); });
        expect(region.dataset.state).toBe("active");
        expect(meter.getAttribute("value")).toBe("90");
        expect(container.querySelector("section[aria-labelledby='meter-title'] output").textContent).toBe("-6.0 dBFS");

        audio.reading = SILENT_LEVEL;
        await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS * QUIET_TICKS); });
        expect(region.dataset.state).toBe("inactive");
        expect(meter.getAttribute("value")).toBe("0");
        const polls = audio.level.mock.calls.length;
        await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS * 10); });
        expect(audio.level.mock.calls.length).toBe(polls); // polling stopped while idle
    });

    test("exactly one spoken live region on the page, and it is polite", () => {
        const { container } = renderKit();
        const live = container.querySelectorAll("[aria-live]:not([aria-live='off'])");
        expect(live).toHaveLength(1);
        expect(live[0].getAttribute("aria-live")).toBe("polite");
    });

    test("a provided engine is left for its owner to dispose", () => {
        const audio = fakeAudio();
        const { unmount } = renderKit({ audio });
        unmount();
        expect(audio.dispose).not.toHaveBeenCalled();
    });
});
