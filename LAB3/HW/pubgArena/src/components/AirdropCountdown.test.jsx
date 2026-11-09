import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import App from "../App.jsx";
import AirdropCountdown, { CountdownCard } from "./AirdropCountdown.jsx";
import { AIRDROP_INTERVAL_MS, PVS_GRAND_FINALS_EPOCH_MS, createSchedule, nextAirdropEpochMs } from "../data/schedule.js";

// T-03A — countdown component (PRD 1 section 7) and schedule data; Project Rules 1–4.

const T0 = Date.parse("2026-11-09T12:00:00Z");
const MIN = 60 * 1000;

const SOURCES = Object.entries(import.meta.glob(["../**/*.{js,jsx}", "!../**/*.test.{js,jsx}"], { query: "?raw", import: "default", eager: true }));
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const event = (overrides = {}) => Object.freeze({
    id: "gcoin-airdrop",
    title: "G-Coin Airdrop",
    targetEpochMs: T0 + 90 * 1000,
    upcomingStatus: "Incoming",
    liveStatus: "Airdrop landed",
    ...overrides
});

function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
});

describe("schedule data", () => {
    test("the airdrop lands on the next 5-minute boundary of the server clock", () => {
        expect(nextAirdropEpochMs(T0)).toBe(T0 + 5 * MIN);              // T0 is exactly on a boundary: strictly after
        expect(nextAirdropEpochMs(T0 + 1)).toBe(T0 + 5 * MIN);
        expect(nextAirdropEpochMs(T0 + 5 * MIN - 1)).toBe(T0 + 5 * MIN);
        expect(AIRDROP_INTERVAL_MS).toBe(5 * MIN);
        expect(() => nextAirdropEpochMs(NaN)).toThrow(TypeError);
    });

    test("the schedule holds both events with absolute targets, airdrop computed on the server clock", () => {
        const schedule = createSchedule(T0 + 4 * MIN, 2 * MIN);           // server already past the boundary
        expect(schedule.map((e) => e.title)).toEqual(["PVS Grand Finals", "G-Coin Airdrop"]);
        expect(schedule[0].targetEpochMs).toBe(PVS_GRAND_FINALS_EPOCH_MS);
        expect(new Date(PVS_GRAND_FINALS_EPOCH_MS).toISOString()).toBe("2026-12-20T12:00:00.000Z");
        expect(schedule[1].targetEpochMs).toBe(T0 + 10 * MIN);
        expect(Object.isFrozen(schedule)).toBe(true);
    });
});

describe("CountdownCard", () => {
    test("is one labelled article: title, timer, status and target, with no wrapper", () => {
        const { container } = render(<CountdownCard event={event()} />);
        expect(container.children).toHaveLength(1);
        const card = screen.getByRole("article", { name: "G-Coin Airdrop" });
        expect([...card.children].map((n) => n.tagName)).toEqual(["H3", "P", "P", "P"]);
        expect(within(card).getByRole("timer", { name: "G-Coin Airdrop countdown" }).textContent)
            .toBe("00 DAYS : 00 HOURS : 01 MIN : 30 SEC .000");
        expect(card.querySelector("time").getAttribute("datetime")).toBe("P0DT0H1M30S");
    });

    test("the timer is not a live region; the status is the only (polite) one", () => {
        render(<CountdownCard event={event()} />);
        const timer = screen.getByRole("timer");
        expect(timer.hasAttribute("aria-live")).toBe(false);              // role=timer is aria-live="off" by default
        const live = document.querySelectorAll("[aria-live]");
        expect(live).toHaveLength(1);
        expect(live[0].getAttribute("aria-live")).toBe("polite");
        expect(live[0].textContent).toBe("Incoming");
    });

    test("counts down and switches to its live status at zero, never below", () => {
        render(<CountdownCard event={event()} />);
        act(() => { vi.advanceTimersByTime(60 * 1000); });
        expect(screen.getByRole("timer").textContent).toBe("00 DAYS : 00 HOURS : 00 MIN : 30 SEC .000");
        act(() => { vi.advanceTimersByTime(30 * 1000); });
        expect(screen.getByRole("timer").textContent).toBe("00 DAYS : 00 HOURS : 00 MIN : 00 SEC .000");
        expect(screen.getByText("Airdrop landed").dataset.status).toBe("live");
        expect(screen.getByRole("article").dataset.live).toBe("true");
        act(() => { vi.advanceTimersByTime(10 * MIN); });
        expect(screen.getByRole("timer").textContent).not.toMatch(/-/);
    });

    test("applies the server offset", () => {
        render(<CountdownCard event={event()} serverOffsetMs={1500} />);
        expect(screen.getByRole("timer").textContent).toBe("00 DAYS : 00 HOURS : 01 MIN : 28 SEC .500");
    });

    test("shows its target in Vietnam time", () => {
        render(<CountdownCard event={event({ targetEpochMs: PVS_GRAND_FINALS_EPOCH_MS })} />);
        const target = screen.getByText(/Target:/).querySelector("time");
        expect(target.getAttribute("datetime")).toBe("2026-12-20T12:00:00.000Z");
        expect(target.textContent).toBe("20 Dec 2026, 19:00 (ICT)");
    });

    test("renders an HTML payload in the title as plain text (Rule 3)", () => {
        render(<CountdownCard event={event({ title: "<img src=x onerror=alert(1)>" })} />);
        expect(document.querySelector("img")).toBeNull();
        expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("<img src=x onerror=alert(1)>");
    });

    test.each([
        ["null", null],
        ["a missing title", { ...event(), title: "" }],
        ["a string target", { ...event(), targetEpochMs: "2026-12-20" }],
        ["an id with spaces", { ...event(), id: "g coin" }],
        ["no live status", { ...event(), liveStatus: undefined }]
    ])("throws a TypeError for %s (Rule 2)", (_, bad) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<CountdownCard event={bad} />)).toThrow(TypeError);
    });
});

describe("AirdropCountdown", () => {
    const schedule = createSchedule(T0, 0);

    test("lists both countdowns in schedule order inside one labelled section", () => {
        renderInMain(<AirdropCountdown events={schedule} />);
        const section = screen.getByRole("region", { name: "Countdowns" });
        const items = within(section).getAllByRole("listitem");
        expect(items.map((li) => li.firstElementChild.dataset.countdown)).toEqual(["pvs-grand-finals", "gcoin-airdrop"]);
        expect(within(section).getAllByRole("timer").map((t) => t.getAttribute("aria-label")))
            .toEqual(["PVS Grand Finals countdown", "G-Coin Airdrop countdown"]);
    });

    test("the two countdowns run independently, each with its own interval", () => {
        renderInMain(<AirdropCountdown events={schedule} />);
        expect(vi.getTimerCount()).toBe(2);
        act(() => { vi.advanceTimersByTime(5 * MIN); });
        const [finals, airdrop] = screen.getAllByRole("article");
        expect(airdrop.dataset.live).toBe("true");
        expect(finals.dataset.live).toBe("false");
        expect(vi.getTimerCount()).toBe(1);                               // the landed airdrop stopped ticking
    });

    test("shows the simulated server offset", () => {
        renderInMain(<AirdropCountdown events={schedule} serverOffsetMs={1500} />);
        expect(screen.getByText("Server clock offset: +1.500 s (simulated)")).toBeTruthy();
    });

    test.each([
        ["no events", []],
        ["duplicate ids", [event(), event()]],
        ["a non-array", event()]
    ])("throws a TypeError for %s (Rule 2)", (_, events) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderInMain(<AirdropCountdown events={events} />)).toThrow(TypeError);
    });
});

describe("App", () => {
    test("renders header, the three sections and footer with no wrapper; both timers are present", () => {
        const { container } = renderInMain(<App />);
        expect([...container.children].map((n) => n.tagName)).toEqual(["HEADER", "SECTION", "SECTION", "SECTION", "FOOTER"]);
        expect(screen.getByRole("heading", { level: 1, name: "Airdrop Arena" })).toBeTruthy();
        expect(screen.getAllByRole("timer")).toHaveLength(2);
    });

    test("unmounting stops every countdown", () => {
        const { unmount } = renderInMain(<App />);
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
});

describe("Project Rules in source", () => {
    test("covers the app sources", () => {
        expect(SOURCES.length).toBeGreaterThanOrEqual(5);
    });

    test.each(SOURCES)("%s uses no <div> (Rule 1) and no innerHTML (Rule 3)", (_, source) => {
        expect(stripComments(source)).not.toMatch(/<div\b|innerHTML|dangerouslySetInnerHTML/);
    });
});
