import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import SOURCE from "./usePubgAirdropTimer.js?raw";
import {
    TICK_MS, calcRemainingMs, formatCountdown, isoDuration, splitDuration, usePubgAirdropTimer
} from "./usePubgAirdropTimer.js";

// T-03A — zero-drift airdrop timer (PRD 1 sections 3–6 and 8, Project Rule 2).

const T0 = Date.parse("2026-11-09T12:00:00Z");
const SEC = 1000;
const MIN = 60 * SEC;
const DAY = 24 * 60 * MIN;

/** Sets document.visibilityState and fires visibilitychange, as a tab switch does. */
function setVisibility(state) {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
}

/** Moves the wall clock WITHOUT running any timer: what a throttled background tab experiences. */
function jumpClock(ms) {
    vi.setSystemTime(Date.now() + ms);
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete document.visibilityState;
});

describe("calcRemainingMs", () => {
    test("is target - (now + serverOffset), never negative", () => {
        expect(calcRemainingMs(T0 + 10 * SEC, 0, T0)).toBe(10 * SEC);
        expect(calcRemainingMs(T0 + 10 * SEC, 1500, T0)).toBe(8500);      // server 1.5 s ahead: less time left
        expect(calcRemainingMs(T0 + 10 * SEC, -1500, T0)).toBe(11500);
        expect(calcRemainingMs(T0 - 5 * SEC, 0, T0)).toBe(0);
        expect(calcRemainingMs(T0 + 10 * SEC)).toBe(10 * SEC);              // defaults: offset 0, Date.now()
    });

    test.each([["NaN", NaN], ["a string", "1700000000000"], ["Infinity", Infinity], ["undefined", undefined]])(
        "rejects a target of %s with a TypeError", (_, target) => {
            expect(() => calcRemainingMs(target, 0, T0)).toThrow(TypeError);
        }
    );

    test("rejects a non-numeric offset", () => {
        expect(() => calcRemainingMs(T0, "1500", T0)).toThrow(TypeError);
    });
});

describe("formatting", () => {
    const ms = 2 * DAY + 14 * 60 * MIN + 32 * MIN + 8 * SEC + 345;

    test("splits into days, hours, minutes, seconds and milliseconds", () => {
        expect(splitDuration(ms)).toEqual({ days: 2, hours: 14, minutes: 32, seconds: 8, milliseconds: 345 });
    });

    test("formats like the PRD example", () => {
        expect(formatCountdown(ms)).toBe("02 DAYS : 14 HOURS : 32 MIN : 08 SEC");
        expect(formatCountdown(0)).toBe("00 DAYS : 00 HOURS : 00 MIN : 00 SEC");
        expect(formatCountdown(123 * DAY)).toBe("123 DAYS : 00 HOURS : 00 MIN : 00 SEC");
        expect(isoDuration(ms)).toBe("P2DT14H32M8S");
    });

    test("never shows a negative value", () => {
        expect(splitDuration(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
        expect(formatCountdown(-1)).toBe("00 DAYS : 00 HOURS : 00 MIN : 00 SEC");
    });
});

describe("usePubgAirdropTimer", () => {
    test("starts from the absolute target and the server offset", () => {
        const { result } = renderHook(() => usePubgAirdropTimer(T0 + 10 * MIN, 1500));
        expect(result.current).toEqual({ remainingMs: 10 * MIN - 1500, isLive: false });
    });

    test("the offset is optional and defaults to 0", () => {
        const { result } = renderHook(() => usePubgAirdropTimer(T0 + MIN));
        expect(result.current.remainingMs).toBe(MIN);
    });

    test("refreshes every 200 ms from the clock", () => {
        const { result } = renderHook(() => usePubgAirdropTimer(T0 + MIN));
        act(() => { vi.advanceTimersByTime(TICK_MS); });
        expect(result.current.remainingMs).toBe(MIN - 200);
        act(() => { vi.advanceTimersByTime(5 * TICK_MS); });
        expect(result.current.remainingMs).toBe(MIN - 1200);
    });

    test("no decrement: one late tick after a long stall shows the true remaining time", () => {
        const { result } = renderHook(() => usePubgAirdropTimer(T0 + 10 * MIN));
        jumpClock(3 * MIN);                                      // no tick ran for 3 minutes
        act(() => { vi.advanceTimersByTime(TICK_MS); });         // the next (single) tick
        // A counter decremented once per tick would show 10 min − 200 ms here.
        expect(result.current.remainingMs).toBe(7 * MIN - TICK_MS);
    });

    test("returning to the tab resyncs immediately, without waiting for the interval", () => {
        const { result } = renderHook(() => usePubgAirdropTimer(T0 + 10 * MIN));
        setVisibility("hidden");
        jumpClock(4 * MIN + 37);                                 // throttled: no interval callback ran
        expect(result.current.remainingMs).toBe(10 * MIN);       // still the stale value
        setVisibility("visible");
        expect(result.current.remainingMs).toBe(6 * MIN - 37);   // corrected at once, 0 ms later
    });

    test("becoming hidden does not resync (nothing is shown)", () => {
        const { result } = renderHook(() => usePubgAirdropTimer(T0 + 10 * MIN));
        jumpClock(MIN);
        setVisibility("hidden");
        expect(result.current.remainingMs).toBe(10 * MIN);
    });

    test("never goes negative; isLive turns true at zero and the interval stops", () => {
        const { result } = renderHook(() => usePubgAirdropTimer(T0 + 450));
        act(() => { vi.advanceTimersByTime(400); });
        expect(result.current).toEqual({ remainingMs: 50, isLive: false });
        act(() => { vi.advanceTimersByTime(200); });
        expect(result.current).toEqual({ remainingMs: 0, isLive: true });
        expect(vi.getTimerCount()).toBe(0);
        jumpClock(DAY);
        setVisibility("visible");
        expect(result.current).toEqual({ remainingMs: 0, isLive: true });
    });

    test("a target already in the past is live from the first render", () => {
        const { result } = renderHook(() => usePubgAirdropTimer(T0 - DAY));
        expect(result.current).toEqual({ remainingMs: 0, isLive: true });
    });

    test("cleans up its interval and visibility listener on unmount", () => {
        const add = vi.spyOn(document, "addEventListener");
        const remove = vi.spyOn(document, "removeEventListener");
        const { unmount } = renderHook(() => usePubgAirdropTimer(T0 + 10 * MIN));
        expect(vi.getTimerCount()).toBe(1);
        const listener = add.mock.calls.find(([type]) => type === "visibilitychange")[1];
        unmount();
        expect(vi.getTimerCount()).toBe(0);
        expect(remove).toHaveBeenCalledWith("visibilitychange", listener);
    });

    test("a new target or offset restarts the timer with exactly one interval", () => {
        const { result, rerender } = renderHook(({ target, offset }) => usePubgAirdropTimer(target, offset), {
            initialProps: { target: T0 + 10 * MIN, offset: 0 }
        });
        rerender({ target: T0 + 20 * MIN, offset: 0 });
        expect(result.current.remainingMs).toBe(20 * MIN);
        rerender({ target: T0 + 20 * MIN, offset: 2000 });
        expect(result.current.remainingMs).toBe(20 * MIN - 2000);
        expect(vi.getTimerCount()).toBe(1);
    });

    test("a reached countdown restarts when given a new target", () => {
        const { result, rerender } = renderHook(({ target }) => usePubgAirdropTimer(target), { initialProps: { target: T0 } });
        expect(result.current.isLive).toBe(true);
        rerender({ target: T0 + 5 * MIN });
        expect(result.current).toEqual({ remainingMs: 5 * MIN, isLive: false });
        expect(vi.getTimerCount()).toBe(1);
    });

    test("several countdowns run independently", () => {
        const a = renderHook(() => usePubgAirdropTimer(T0 + MIN));
        const b = renderHook(() => usePubgAirdropTimer(T0 + DAY, 1500));
        expect(vi.getTimerCount()).toBe(2);
        act(() => { vi.advanceTimersByTime(MIN); });
        expect(a.result.current.isLive).toBe(true);
        expect(b.result.current).toEqual({ remainingMs: DAY - MIN - 1500, isLive: false });
        a.unmount();
        expect(vi.getTimerCount()).toBe(1);                      // b keeps running
        act(() => { vi.advanceTimersByTime(TICK_MS); });
        expect(b.result.current.remainingMs).toBe(DAY - MIN - 1500 - TICK_MS);
    });

    test("rejects invalid arguments with a TypeError (Rule 2)", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderHook(() => usePubgAirdropTimer("soon"))).toThrow(TypeError);
        expect(() => renderHook(() => usePubgAirdropTimer(T0, NaN))).toThrow(TypeError);
    });

    test("source never decrements a counter", () => {
        const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
        expect(code).not.toMatch(/-\s*1\b|-=|--/);
        expect(code).toMatch(/Date\.now\(\)/);
    });
});
