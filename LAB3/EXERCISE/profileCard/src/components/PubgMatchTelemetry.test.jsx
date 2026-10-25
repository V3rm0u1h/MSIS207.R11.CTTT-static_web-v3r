import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import SOURCE from "./PubgMatchTelemetry.jsx?raw";
import styles from "./PubgMatchTelemetry.module.css";
import PubgMatchTelemetry, { SQUADS, STATUS } from "./PubgMatchTelemetry.jsx";
import { PACKET_TIMEOUT_MESSAGE, SIMULATED_LATENCY_MS, requestTelemetry } from "../pubgTelemetry.js";

// Read from disk: with CSS Modules on, a ?raw import of a .css file is not plain text.
const CSS = readFileSync(join(process.cwd(), "src/components/PubgMatchTelemetry.module.css"), "utf8");

// Pass-through spy: the real simulated feed runs unless a test overrides one call.
vi.mock("../pubgTelemetry.js", async (importOriginal) => {
    const original = await importOriginal();
    return { ...original, requestTelemetry: vi.fn(original.requestTelemetry) };
});

// T-03A — Telemetry architecture: squad data & four-state machine.
// T-03B — Async pipeline: packet loss, AbortController cancellation, retry.
// T-03C — Loading skeleton & success dashboard.
// T-03D — Accessible error alert, retry & mutually exclusive panels.

const squadSelect = () => screen.getByLabelText("Squad");
const requestButton = () => screen.getByRole("button", { name: "Request telemetry" });
const statusOutput = () => screen.getByRole("status");
const dashboard = () => screen.getByRole("article");
const shownSquad = () => within(dashboard()).getByRole("heading", { level: 2 }).textContent;
const skeleton = (container) => container.querySelector(`.${styles.skeleton}`);

/** Math.random() returns 0.5 (success) or 0.1 (packet loss) from now on. */
const succeed = () => vi.spyOn(Math, "random").mockReturnValue(0.5);
const loseNextPackets = () => vi.spyOn(Math, "random").mockReturnValue(0.1);

async function finishRequest() {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    requestTelemetry.mockClear();
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("PubgMatchTelemetry — architecture (T-03A)", () => {
    test("STATUS has exactly the four states IDLE, LOADING, SUCCESS and ERROR", () => {
        expect(Object.values(STATUS)).toEqual(["IDLE", "LOADING", "SUCCESS", "ERROR"]);
        expect(Object.isFrozen(STATUS)).toBe(true);
    });

    test("offers the three Vietnamese squads, with TE marked as PGC World Champions", () => {
        render(<PubgMatchTelemetry />);
        const options = Array.from(squadSelect().options);
        expect(options.map((option) => option.value)).toEqual(["CES", "TE", "GE"]);
        expect(options.map((option) => option.textContent)).toEqual([
            "Cerberus Esports (CES)",
            "The Expendables (TE) — PGC World Champions",
            "Genius Esports (GE)"
        ]);
        expect(SQUADS.every(Object.isFrozen)).toBe(true);
    });

    test("starts in IDLE on CES with no request, telemetry or error", () => {
        const random = succeed();
        render(<PubgMatchTelemetry />);
        expect(squadSelect().value).toBe("CES");
        expect(statusOutput().dataset.status).toBe(STATUS.IDLE);
        expect(statusOutput().textContent).toContain("Cerberus Esports");
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.queryByRole("term")).toBeNull();
        expect(vi.getTimerCount()).toBe(0);
        expect(random).not.toHaveBeenCalled();
    });

    test("every squad can be selected", () => {
        render(<PubgMatchTelemetry />);
        for (const squad of SQUADS) {
            fireEvent.change(squadSelect(), { target: { value: squad.id } });
            expect(squadSelect().value).toBe(squad.id);
            expect(statusOutput().textContent).toContain(squad.name);
        }
    });

    test("status output is a polite live region", () => {
        render(<PubgMatchTelemetry />);
        expect(statusOutput().tagName).toBe("OUTPUT");
        expect(statusOutput().getAttribute("aria-live")).toBe("polite");
    });

    test("uses semantic landmarks and never innerHTML (Project Rules 1 & 3)", () => {
        render(<PubgMatchTelemetry />);
        expect(screen.getByRole("region", { name: "PUBG Match Telemetry Radar" }).tagName).toBe("SECTION");
        expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
        expect(SOURCE).not.toMatch(/<div|dangerouslySetInnerHTML|innerHTML/);
    });
});

describe("PubgMatchTelemetry — async pipeline (T-03B)", () => {
    test("the fetch effect creates an AbortController per run and aborts it on cleanup", () => {
        expect(SOURCE).toMatch(/useEffect\(\(\) => \{[\s\S]*const controller = new AbortController\(\);[\s\S]*return \(\) => controller\.abort\(\);\s*\}, \[squad, retryTick\]\);/);
    });

    test("request goes LOADING → SUCCESS and shows labelled, simulated telemetry", async () => {
        succeed();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        expect(statusOutput().dataset.status).toBe(STATUS.LOADING);
        expect(requestButton().disabled).toBe(true);

        await finishRequest();
        expect(statusOutput().dataset.status).toBe(STATUS.SUCCESS);
        expect(shownSquad()).toBe("Cerberus Esports");
        expect(screen.getByText("Miramar")).toBeTruthy();
        expect(screen.getByText("Phase 5 · Holding")).toBeTruthy();
        expect(screen.getByText(/Simulated telemetry .* not official live PVS match data/)).toBeTruthy();
        expect(requestButton().disabled).toBe(false);
    });

    test("packet loss shows the timeout in an alert with a Reconnect button", async () => {
        loseNextPackets();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        await finishRequest();

        expect(statusOutput().dataset.status).toBe(STATUS.ERROR);
        expect(screen.getByRole("alert").textContent).toContain(PACKET_TIMEOUT_MESSAGE);
        expect(screen.queryByRole("term")).toBeNull();
    });

    test("Retry starts a fresh request that can succeed", async () => {
        const random = loseNextPackets();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        await finishRequest();
        expect(statusOutput().dataset.status).toBe(STATUS.ERROR);

        random.mockReturnValue(0.5);
        fireEvent.click(screen.getByRole("button", { name: "Reconnect Telemetry" }));
        expect(statusOutput().dataset.status).toBe(STATUS.LOADING);
        expect(screen.queryByRole("alert")).toBeNull();
        expect(vi.getTimerCount()).toBe(1);

        await finishRequest();
        expect(statusOutput().dataset.status).toBe(STATUS.SUCCESS);
    });

    test("switching squad mid-request aborts it: no error banner, no stale data, no leftover timer", async () => {
        succeed();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        fireEvent.change(squadSelect(), { target: { value: "TE" } });
        fireEvent.change(squadSelect(), { target: { value: "GE" } });

        // Only the latest (GE) request is still pending.
        expect(vi.getTimerCount()).toBe(1);
        expect(statusOutput().dataset.status).toBe(STATUS.LOADING);
        expect(screen.queryByRole("alert")).toBeNull();

        await finishRequest();
        expect(statusOutput().dataset.status).toBe(STATUS.SUCCESS);
        expect(shownSquad()).toBe("Genius Esports");
        expect(screen.queryByRole("alert")).toBeNull();
    });

    test("after a success, switching squad clears the old telemetry and fetches the new squad", async () => {
        succeed();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        await finishRequest();
        expect(shownSquad()).toBe("Cerberus Esports");

        fireEvent.change(squadSelect(), { target: { value: "TE" } });
        expect(statusOutput().dataset.status).toBe(STATUS.LOADING);
        expect(screen.queryByRole("term")).toBeNull();

        await finishRequest();
        expect(shownSquad()).toBe("The Expendables");
    });

    test("a response that resolves after its request was superseded is ignored", async () => {
        // The first call ignores its signal and resolves only when we release it, after the switch.
        let releaseStale;
        requestTelemetry.mockImplementationOnce(() => new Promise((resolve) => {
            releaseStale = () => resolve(feedRecord("CES", "Cerberus Esports"));
        }));
        succeed();

        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        fireEvent.change(squadSelect(), { target: { value: "TE" } });
        await finishRequest();
        expect(shownSquad()).toBe("The Expendables");

        await act(async () => {
            releaseStale();
        });
        expect(shownSquad()).toBe("The Expendables");
    });

    test("under StrictMode's dev double effect run, only one request survives and the UI is correct", async () => {
        succeed();
        render(
            <StrictMode>
                <PubgMatchTelemetry />
            </StrictMode>
        );
        fireEvent.click(requestButton());
        expect(vi.getTimerCount()).toBe(1);

        await finishRequest();
        expect(statusOutput().dataset.status).toBe(STATUS.SUCCESS);
        expect(screen.queryByRole("alert")).toBeNull();
    });
});

describe("PubgMatchTelemetry — loading experience (T-03C)", () => {
    test("a decorative skeleton shows only while LOADING, and never alongside the old squad's data", async () => {
        succeed();
        const { container } = render(<PubgMatchTelemetry />);
        expect(skeleton(container)).toBeNull();

        fireEvent.click(requestButton());
        expect(skeleton(container)).not.toBeNull();
        expect(skeleton(container).getAttribute("aria-hidden")).toBe("true");
        expect(skeleton(container).querySelectorAll(`.${styles.bone}`).length).toBe(10);

        await finishRequest();
        expect(skeleton(container)).toBeNull();
        expect(shownSquad()).toBe("Cerberus Esports");

        fireEvent.change(squadSelect(), { target: { value: "TE" } });
        expect(skeleton(container)).not.toBeNull();
        expect(screen.queryByRole("article")).toBeNull();
        expect(screen.queryByText("Cerberus Esports", { selector: "h2" })).toBeNull();
    });

    test("skeleton CSS: ~220px, blue-zone gradient, pulsing, and still under reduced motion", () => {
        const rule = CSS.match(/\.skeleton \{([^}]*)\}/)[1];
        expect(rule).toMatch(/min-height: 220px;/);
        expect(rule).toMatch(/linear-gradient\(110deg, #101b35 25%, #1d4ed8 45%, #101b35 65%\)/);
        expect(rule).toMatch(/animation: blueZonePulse 1\.5s ease-in-out infinite;/);
        expect(CSS).toMatch(/@keyframes blueZonePulse/);
        expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.skeleton \{\s*animation: none;/);
    });

    test("the dashboard keeps the skeleton's height so the layout does not jump", () => {
        const rule = CSS.match(/\.dashboard \{([^}]*)\}/)[1];
        expect(rule).toMatch(/min-height: 220px;/);
    });

    test("SUCCESS renders an article dashboard: header with squad & map, stats, simulated notice", async () => {
        succeed();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        await finishRequest();

        const article = screen.getByRole("article", { name: "Cerberus Esports" });
        const header = article.querySelector("header");
        expect(within(header).getByRole("heading", { level: 2 }).textContent).toBe("Cerberus Esports");
        expect(header.textContent).toContain("Map: Miramar");
        expect(within(header).getByText("Simulated")).toBeTruthy();

        const terms = within(article).getAllByRole("term").map((term) => term.textContent);
        const values = within(article).getAllByRole("definition").map((value) => value.textContent.trim());
        expect(terms).toEqual(["Alive players", "Eliminations", "Placement", "Zone status"]);
        expect(values).toEqual(["2 / 4", "8", "#9", "Phase 5 · Holding"]);

        expect(article.querySelector("footer").textContent).toMatch(/not official live PVS match data/);
    });

    test("the stats grid stacks on narrow screens and pairs up on wider ones", () => {
        expect(CSS).toMatch(/\.stats \{[^}]*grid-template-columns: max-content 1fr;/);
        expect(CSS).toMatch(/@media \(min-width: 36rem\) \{\s*\.stats \{\s*grid-template-columns: repeat\(2, max-content 1fr\);/);
    });
});

describe("PubgMatchTelemetry — error recovery (T-03D)", () => {
    const reconnectButton = () => screen.getByRole("button", { name: "Reconnect Telemetry" });

    /** Which of the four panels are on screen right now. */
    function visiblePanels(container) {
        return {
            prompt: screen.queryByText(/to connect the radar/) !== null,
            skeleton: skeleton(container) !== null,
            dashboard: screen.queryByRole("article") !== null,
            alert: screen.queryByRole("alert") !== null
        };
    }
    const only = (panel) => ({ prompt: false, skeleton: false, dashboard: false, alert: false, [panel]: true });

    test("exactly one panel per state: IDLE prompt, LOADING skeleton, ERROR alert, SUCCESS dashboard", async () => {
        const random = loseNextPackets();
        const { container } = render(<PubgMatchTelemetry />);
        expect(visiblePanels(container)).toEqual(only("prompt"));

        fireEvent.click(requestButton());
        expect(visiblePanels(container)).toEqual(only("skeleton"));

        await finishRequest();
        expect(visiblePanels(container)).toEqual(only("alert"));

        random.mockReturnValue(0.5);
        fireEvent.click(reconnectButton());
        expect(visiblePanels(container)).toEqual(only("skeleton"));

        await finishRequest();
        expect(visiblePanels(container)).toEqual(only("dashboard"));
    });

    test("the error is an inline <section role=alert> named by its heading, with the packet message", async () => {
        loseNextPackets();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        await finishRequest();

        const alert = screen.getByRole("alert", { name: "Satellite Connection Lost" });
        expect(alert.tagName).toBe("SECTION");
        expect(within(alert).getByRole("heading", { level: 2 }).textContent).toBe("Satellite Connection Lost");
        expect(within(alert).getByText(PACKET_TIMEOUT_MESSAGE).tagName).toBe("P");
        expect(within(alert).getByRole("button", { name: "Reconnect Telemetry" }).type).toBe("button");
    });

    test("never calls window.alert", async () => {
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        loseNextPackets();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        await finishRequest();
        fireEvent.click(reconnectButton());
        await finishRequest();

        expect(alertSpy).not.toHaveBeenCalled();
        expect(SOURCE).not.toMatch(/\balert\s*\(/);
    });

    test("Reconnect clears the error, shows the skeleton and starts a fresh request for the same squad", async () => {
        loseNextPackets();
        const { container } = render(<PubgMatchTelemetry />);
        fireEvent.change(squadSelect(), { target: { value: "TE" } });
        fireEvent.click(requestButton());
        await finishRequest();
        requestTelemetry.mockClear(); // only count the retry's call

        fireEvent.click(reconnectButton());
        expect(statusOutput().dataset.status).toBe(STATUS.LOADING);
        expect(screen.queryByText(PACKET_TIMEOUT_MESSAGE)).toBeNull();
        expect(skeleton(container)).not.toBeNull();
        expect(requestTelemetry).toHaveBeenCalledTimes(1);
        expect(requestTelemetry.mock.calls[0][0]).toBe("TE");
        expect(requestTelemetry.mock.calls[0][1]).toBeInstanceOf(AbortSignal);
        expect(requestTelemetry.mock.calls[0][1].aborted).toBe(false);
    });

    test("retry is not forced to succeed: packet loss can strike again", async () => {
        loseNextPackets();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        await finishRequest();

        fireEvent.click(reconnectButton());
        await finishRequest();
        expect(statusOutput().dataset.status).toBe(STATUS.ERROR);
        expect(screen.getByRole("alert").textContent).toContain(PACKET_TIMEOUT_MESSAGE);
    });

    test("rapid switching across all three squads: every old request is aborted, no false error, latest squad wins", async () => {
        succeed();
        render(<PubgMatchTelemetry />);
        fireEvent.click(requestButton());
        for (const id of ["TE", "GE", "CES", "TE", "GE"]) {
            fireEvent.change(squadSelect(), { target: { value: id } });
        }
        const signals = requestTelemetry.mock.calls.map((call) => call[1]);
        expect(signals.slice(0, -1).every((signal) => signal.aborted)).toBe(true);
        expect(signals.at(-1).aborted).toBe(false);
        expect(screen.queryByRole("alert")).toBeNull();

        await finishRequest();
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.getAllByRole("article")).toHaveLength(1);
        expect(shownSquad()).toBe("Genius Esports");
    });
});

function feedRecord(squadId, squadName) {
    return {
        simulated: true, squadId, squadName, map: "Erangel",
        alivePlayers: 4, kills: 0, placement: 1, blueZonePhase: 1, blueZoneShrinking: true
    };
}
