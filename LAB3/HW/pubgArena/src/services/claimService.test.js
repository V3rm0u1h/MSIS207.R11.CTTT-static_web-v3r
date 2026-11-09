import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ClaimError, DEFAULT_LATENCY_MS, SERVICE_MODES, createClaimService } from "./claimService.js";
import { INITIAL_INVENTORY, assertInventory } from "../data/inventory.js";
import { formatVND } from "../utils/formatVND.js";

// T-03B — inventory data, VND formatting and the deterministic mock backend (PRD 2 sections 3 and 8).

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Runs one request to completion on the fake clock; returns { result } or { error }. */
async function request(service, itemId, claimId, options) {
    const settled = service.claimItem(itemId, claimId, options).then((result) => ({ result }), (error) => ({ error }));
    await vi.advanceTimersByTimeAsync(DEFAULT_LATENCY_MS);
    return settled;
}

describe("inventory data", () => {
    test("matches the PRD schema: VIP ticket 25 at 1,500,000 VND, G-Coin crate 100 free", () => {
        expect(INITIAL_INVENTORY).toEqual([
            { id: "pvs-vip", name: "PVS Grand Finals VIP Ticket", type: "ticket", price: 1500000, stock: 25 },
            { id: "gcoin-crate", name: "G-Coin Contraband Crate", type: "crate", price: 0, stock: 100 }
        ]);
        expect(Object.isFrozen(INITIAL_INVENTORY)).toBe(true);
        expect(() => assertInventory(INITIAL_INVENTORY)).not.toThrow();
    });

    test.each([
        ["an empty list", []],
        ["a negative stock", [{ ...INITIAL_INVENTORY[0], stock: -1 }]],
        ["a fractional price", [{ ...INITIAL_INVENTORY[0], price: 1.5 }]],
        ["an unknown type", [{ ...INITIAL_INVENTORY[0], type: "skin" }]],
        ["a blank name", [{ ...INITIAL_INVENTORY[0], name: " " }]],
        ["duplicate ids", [INITIAL_INVENTORY[0], INITIAL_INVENTORY[0]]]
    ])("assertInventory rejects %s (Rule 2)", (_, items) => {
        expect(() => assertInventory(items)).toThrow(TypeError);
    });
});

describe("formatVND", () => {
    test("formats with Intl vi-VN: dot thousands, no decimals, ₫ after a NO-BREAK space", () => {
        expect(formatVND(1500000)).toBe("1.500.000 ₫");
        expect(formatVND(0)).toBe("0 ₫");
        expect(formatVND(1234.6)).toBe("1.235 ₫");
        // The PRD's example uses a typed space, which is NOT what Intl produces:
        expect(formatVND(1500000)).not.toBe("1.500.000 ₫");
    });

    test("rejects non-numbers", () => {
        expect(() => formatVND("1500000")).toThrow(TypeError);
        expect(() => formatVND(NaN)).toThrow(TypeError);
    });
});

describe("createClaimService", () => {
    test("auto: 200 with the server's remaining stock while stock lasts", async () => {
        const service = createClaimService();
        const { result } = await request(service, "pvs-vip", "claim-1");
        expect(result).toEqual({ status: 200, itemId: "pvs-vip", claimId: "claim-1", remainingStock: 24 });
        expect(service.getServerStock("pvs-vip")).toBe(24);
        expect(service.getServerStock("gcoin-crate")).toBe(100);
    });

    test("auto: 409 Looted Out once the server's stock is gone", async () => {
        const service = createClaimService({ inventory: [{ ...INITIAL_INVENTORY[0], stock: 1 }] });
        expect((await request(service, "pvs-vip", "a")).result.remainingStock).toBe(0);
        const { error } = await request(service, "pvs-vip", "b");
        expect(error).toBeInstanceOf(ClaimError);
        expect(error).toMatchObject({ status: 409, code: "LOOTED_OUT", itemId: "pvs-vip", claimId: "b", message: "Looted Out" });
    });

    test("conflict mode: 409 without touching the server's stock", async () => {
        const service = createClaimService();
        service.setMode("pvs-vip", "conflict");
        expect((await request(service, "pvs-vip", "c")).error.status).toBe(409);
        expect(service.getServerStock("pvs-vip")).toBe(25);
    });

    test("network-error mode: status 0, the request never reached the server", async () => {
        const service = createClaimService();
        service.setMode("gcoin-crate", "network-error");
        const { error } = await request(service, "gcoin-crate", "n");
        expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
        expect(service.getServerStock("gcoin-crate")).toBe(100);
    });

    test("server-error mode: 500", async () => {
        const service = createClaimService();
        service.setMode("gcoin-crate", "server-error");
        expect((await request(service, "gcoin-crate", "s")).error).toMatchObject({ status: 500, code: "SERVER_ERROR" });
    });

    test("is deterministic: the same requests in the same modes give the same answers", async () => {
        const run = async () => {
            const service = createClaimService({ inventory: [{ ...INITIAL_INVENTORY[0], stock: 2 }] });
            const out = [];
            for (const id of ["1", "2", "3"]) {
                const { result, error } = await request(service, "pvs-vip", id);
                out.push(result ? result.remainingStock : error.status);
            }
            return out;
        };
        expect(await run()).toEqual([1, 0, 409]);
        expect(await run()).toEqual([1, 0, 409]);
    });

    test("is idempotent per claimId: a retry returns the original result and takes no second unit", async () => {
        const service = createClaimService();
        const first = (await request(service, "pvs-vip", "same")).result;
        const again = (await request(service, "pvs-vip", "same")).result;
        expect(again).toBe(first);
        expect(service.getServerStock("pvs-vip")).toBe(24);
    });

    test("waits the configured latency and can be aborted", async () => {
        const service = createClaimService({ latencyMs: 1000 });
        const done = vi.fn();
        service.claimItem("pvs-vip", "x").then(done);
        await vi.advanceTimersByTimeAsync(999);
        expect(done).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(done).toHaveBeenCalled();

        const controller = new AbortController();
        const pending = service.claimItem("pvs-vip", "y", { signal: controller.signal });
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: "AbortError" });
        expect(service.getServerStock("pvs-vip")).toBe(24);
    });

    test("takeStock simulates other players emptying the server", async () => {
        const service = createClaimService();
        service.takeStock("pvs-vip", 999);
        expect(service.getServerStock("pvs-vip")).toBe(0);
        expect((await request(service, "pvs-vip", "late")).error.status).toBe(409);
    });

    test("validates its inputs (Rule 2)", async () => {
        const service = createClaimService();
        expect(SERVICE_MODES).toEqual(["auto", "conflict", "network-error", "server-error"]);
        await expect(service.claimItem("skin", "a")).rejects.toThrow(TypeError);
        await expect(service.claimItem("pvs-vip", "")).rejects.toThrow(TypeError);
        expect(() => service.setMode("pvs-vip", "random")).toThrow(TypeError);
        expect(() => createClaimService({ latencyMs: -1 })).toThrow(TypeError);
        expect(() => createClaimService({ inventory: [] })).toThrow(TypeError);
    });
});
