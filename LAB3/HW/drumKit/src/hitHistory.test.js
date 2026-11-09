import { describe, expect, test } from "vitest";
import { HISTORY_LIMIT, appendHit, createHit, formatClock, setHitLevel } from "./hitHistory.js";
import { DRUM_PADS } from "./drumPads.js";

// T-01C — hit history (PRD 3 section 3).

const KICK = DRUM_PADS[0];

describe("createHit", () => {
    test("records instrument, key, sequence, timestamp and a pending level, with a unique id", () => {
        const hit = createHit(KICK, { sequence: 1, timestamp: 1_700_000_000_000 });
        expect(hit).toEqual({
            id: expect.any(String),
            padId: "kick",
            instrument: "Kick",
            key: "W",
            sequence: 1,
            timestamp: 1_700_000_000_000,
            level: null
        });
        expect(hit.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(createHit(KICK, { sequence: 2 }).id).not.toBe(hit.id);
        expect(Object.isFrozen(hit)).toBe(true);
    });

    test("defaults the timestamp to now", () => {
        const before = Date.now();
        const hit = createHit(KICK, { sequence: 1 });
        expect(hit.timestamp).toBeGreaterThanOrEqual(before);
        expect(hit.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test.each([
        ["a bad pad", [{ id: "x" }, { sequence: 1 }]],
        ["no sequence", [KICK, {}]],
        ["a negative sequence", [KICK, { sequence: -1 }]],
        ["a level above 1", [KICK, { sequence: 1, level: 1.5 }]],
        ["a string level", [KICK, { sequence: 1, level: "0.5" }]],
        ["an empty id", [KICK, { sequence: 1, id: "" }]],
        ["a non-integer timestamp", [KICK, { sequence: 1, timestamp: "now" }]]
    ])("rejects %s with a TypeError (Project Rule 2)", (_, args) => {
        expect(() => createHit(...args)).toThrow(TypeError);
    });
});

describe("appendHit", () => {
    test("puts the newest hit first and never exceeds the limit", () => {
        let history = [];
        for (let n = 1; n <= HISTORY_LIMIT + 5; n += 1) {
            history = appendHit(history, createHit(KICK, { sequence: n }));
        }
        expect(history).toHaveLength(HISTORY_LIMIT);
        expect(history[0].sequence).toBe(HISTORY_LIMIT + 5);
        expect(history.at(-1).sequence).toBe(6);
    });

    test("honours a custom limit and does not mutate the previous array", () => {
        const first = appendHit([], createHit(KICK, { sequence: 1 }), 2);
        const second = appendHit(first, createHit(KICK, { sequence: 2 }), 2);
        const third = appendHit(second, createHit(KICK, { sequence: 3 }), 2);
        expect(first).toHaveLength(1);
        expect(second).toHaveLength(2);
        expect(third.map((hit) => hit.sequence)).toEqual([3, 2]);
    });

    test("rejects a non-array history, a non-hit, or a bad limit", () => {
        const hit = createHit(KICK, { sequence: 1 });
        expect(() => appendHit(null, hit)).toThrow(TypeError);
        expect(() => appendHit([], { instrument: "Kick" })).toThrow(TypeError);
        expect(() => appendHit([], hit, 0)).toThrow(TypeError);
    });
});

describe("setHitLevel", () => {
    test("fills in the level of one entry without touching the others", () => {
        const a = createHit(KICK, { sequence: 1 });
        const b = createHit(DRUM_PADS[1], { sequence: 2 });
        const history = [b, a];
        const next = setHitLevel(history, a.id, 0.85);
        expect(next).not.toBe(history);
        expect(next[1]).toMatchObject({ id: a.id, level: 0.85 });
        expect(next[0]).toBe(b);
        expect(history[1].level).toBeNull();
    });

    test("returns the same array when the entry has already been trimmed away", () => {
        const history = [createHit(KICK, { sequence: 1 })];
        expect(setHitLevel(history, "gone", 0.5)).toBe(history);
    });

    test("rejects an out-of-range level", () => {
        expect(() => setHitLevel([], "x", 2)).toThrow(TypeError);
    });
});

describe("formatClock", () => {
    test("formats local time with milliseconds", () => {
        const date = new Date(2026, 10, 9, 14, 3, 27, 481);
        expect(formatClock(date.getTime())).toBe("14:03:27.481");
        const early = new Date(2026, 0, 1, 0, 0, 0, 7);
        expect(formatClock(early.getTime())).toBe("00:00:00.007");
        expect(() => formatClock("x")).toThrow(TypeError);
    });
});
