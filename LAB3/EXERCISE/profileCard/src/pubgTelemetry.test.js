import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    MAPS, PACKET_LOSS_RATE, PACKET_TIMEOUT_MESSAGE, SIMULATED_LATENCY_MS, SQUADS, requestTelemetry
} from "./pubgTelemetry.js";

// T-03B — simulated feed: packet loss & abort-aware delay.

const constant = (value) => () => value;

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("requestTelemetry", () => {
    test("packet loss rate is 35%", () => {
        expect(PACKET_LOSS_RATE).toBe(0.35);
    });

    test("resolves after the simulated latency with a frozen, simulated record", async () => {
        const promise = requestTelemetry("TE", new AbortController().signal, { random: constant(0.5) });
        await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);
        const data = await promise;
        expect(data).toEqual({
            simulated: true,
            squadId: "TE",
            squadName: "The Expendables",
            map: "Miramar",
            alivePlayers: 2,
            kills: 8,
            placement: 9,
            blueZonePhase: 5,
            blueZoneShrinking: false
        });
        expect(Object.isFrozen(data)).toBe(true);
    });

    test("only generates Erangel or Miramar", async () => {
        for (const value of [0, 0.49, 0.5, 0.99]) {
            const promise = requestTelemetry("CES", new AbortController().signal, { random: constant(value), latencyMs: 0 });
            // value < 0.35 is packet loss; only check the successful draws.
            if (value < PACKET_LOSS_RATE) {
                promise.catch(() => {});
                continue;
            }
            await vi.advanceTimersByTimeAsync(0);
            expect(MAPS).toContain((await promise).map);
        }
    });

    test("a draw below 0.35 is a packet timeout; 0.35 and above succeeds", async () => {
        const lost = requestTelemetry("CES", new AbortController().signal, { random: constant(0.3499) });
        const kept = requestTelemetry("CES", new AbortController().signal, { random: constant(0.35) });
        const lostResult = expect(lost).rejects.toThrow(PACKET_TIMEOUT_MESSAGE);
        await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);
        await lostResult;
        await expect(kept).resolves.toMatchObject({ squadId: "CES" });
    });

    test("packet loss is decided after the delay, not when the request starts", async () => {
        const random = vi.fn(constant(0.1));
        const promise = requestTelemetry("CES", new AbortController().signal, { random });
        promise.catch(() => {});
        expect(random).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);
        expect(random).toHaveBeenCalledTimes(1);
    });

    test("aborting rejects with AbortError and clears the pending timer", async () => {
        const controller = new AbortController();
        const random = vi.fn(constant(0.5));
        const promise = requestTelemetry("GE", controller.signal, { random });
        expect(vi.getTimerCount()).toBe(1);
        controller.abort();
        await expect(promise).rejects.toMatchObject({ name: "AbortError" });
        expect(vi.getTimerCount()).toBe(0);
        expect(random).not.toHaveBeenCalled();
    });

    test("an already-aborted signal rejects straight away", async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(requestTelemetry("GE", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
        expect(vi.getTimerCount()).toBe(0);
    });

    test("rejects unknown squads and missing signals (type guards)", async () => {
        await expect(requestTelemetry("XYZ", new AbortController().signal)).rejects.toThrow(TypeError);
        await expect(requestTelemetry("CES")).rejects.toThrow(TypeError);
    });

    test("covers all three squads", () => {
        expect(SQUADS.map((squad) => squad.id)).toEqual(["CES", "TE", "GE"]);
    });
});
