import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, within } from "@testing-library/react";
import SOURCE from "./HitHistory.jsx?raw";
import HitHistory, { announcement } from "./HitHistory.jsx";
import { HISTORY_LIMIT, appendHit, createHit } from "../hitHistory.js";
import { DRUM_PADS } from "../drumPads.js";

// T-01C — visual hit log and live announcement (PRD 3 sections 3 and 4).

const T0 = new Date(2026, 10, 9, 14, 3, 27, 481).getTime();

function history(count, level = 0.85) {
    let hits = [];
    for (let n = 1; n <= count; n += 1) {
        hits = appendHit(hits, createHit(DRUM_PADS[(n - 1) % DRUM_PADS.length], { sequence: n, timestamp: T0 + n, level }), 1000);
    }
    return hits;
}

function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
});

describe("HitHistory", () => {
    test("empty state: labelled region, polite atomic live region saying no hits, no list", () => {
        const { getByRole, container } = renderInMain(<HitHistory hits={[]} />);
        expect(getByRole("region", { name: "Hit Log" }).tagName).toBe("SECTION");
        const output = container.querySelector("output");
        expect(output.getAttribute("aria-live")).toBe("polite");
        expect(output.getAttribute("aria-atomic")).toBe("true");
        expect(output.textContent).toBe("No drum hits yet");
        expect(container.querySelector("ol")).toBeNull();
    });

    test("announces only the latest hit, with its number so repeats are distinguishable", () => {
        const hits = history(3);
        const { container } = renderInMain(<HitHistory hits={hits} />);
        const output = container.querySelector("output");
        expect(output.textContent).toBe("Hi-Hat triggered, hit 3");
        expect(output.textContent).not.toMatch(/Kick|Snare/);
        expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
        expect(announcement(undefined)).toBe("No drum hits yet");
    });

    test("lists each hit with number, instrument, <kbd> key, <time> and an intensity <meter>", () => {
        const { container, getByRole } = renderInMain(<HitHistory hits={history(2)} />);
        const list = getByRole("list", { name: "Last 2 hits, newest first" });
        expect(list.tagName).toBe("OL");
        const [newest, oldest] = list.children;
        expect(newest.tagName).toBe("LI");
        expect([...newest.children].map((node) => node.tagName)).toEqual(["SPAN", "SPAN", "KBD", "TIME", "METER"]);
        expect(newest.children[0].textContent).toBe("#2");
        expect(newest.children[1].textContent).toBe("Snare");
        expect(newest.children[2].textContent).toBe("A");
        expect(newest.children[3].textContent).toBe("14:03:27.483");
        expect(newest.children[3].getAttribute("dateTime")).toBe(new Date(T0 + 2).toISOString());
        const meter = within(newest).getByRole("meter", { name: "Intensity 85%" });
        expect(meter.getAttribute("value")).toBe("0.85");
        expect(meter.textContent).toBe("85%");
        expect(oldest.children[0].textContent).toBe("#1");
        expect(container.querySelectorAll("div")).toHaveLength(0);
    });

    test("shows a pending intensity while the sample is still loading", () => {
        const { getByRole } = renderInMain(<HitHistory hits={history(1, null)} />);
        const meter = getByRole("meter", { name: "Intensity pending" });
        expect(meter.getAttribute("value")).toBe("0");
        expect(meter.textContent).toBe("…");
    });

    test(`shows at most ${HISTORY_LIMIT} entries by default, newest first`, () => {
        const { container } = renderInMain(<HitHistory hits={history(HISTORY_LIMIT + 9)} />);
        const items = container.querySelectorAll("li");
        expect(items).toHaveLength(HISTORY_LIMIT);
        expect(items[0].firstElementChild.textContent).toBe(`#${HISTORY_LIMIT + 9}`);
    });

    test("honours a custom limit", () => {
        const { container } = renderInMain(<HitHistory hits={history(10)} limit={3} />);
        expect(container.querySelectorAll("li")).toHaveLength(3);
    });

    test("renders hit text as text, never as HTML (Project Rule 3)", () => {
        const payload = "<img src=x onerror=\"window.__hitLogXss = true\">";
        const hits = [createHit({ ...DRUM_PADS[0], name: payload }, { sequence: 1, timestamp: T0 })];
        const { container } = renderInMain(<HitHistory hits={hits} />);
        expect(container.querySelectorAll("img")).toHaveLength(0);
        expect(container.querySelector("output").textContent).toBe(`${payload} triggered, hit 1`);
        expect(window.__hitLogXss).toBeUndefined();
    });

    test.each([
        ["no hits", {}],
        ["a non-array", { hits: {} }],
        ["a malformed hit", { hits: [{ id: "x", instrument: "Kick" }] }],
        ["a hit with a bad level", { hits: [{ ...history(1)[0], level: 7 }] }],
        ["a zero limit", { hits: [], limit: 0 }]
    ])("rejects %s with a TypeError (Project Rule 2)", (_, props) => {
        expect(() => HitHistory(props)).toThrow(TypeError);
    });

    test("source contains no <div> and no innerHTML", () => {
        expect(SOURCE).not.toMatch(/<div[\s>]/);
        expect(SOURCE).not.toMatch(/innerHTML/);
    });
});
