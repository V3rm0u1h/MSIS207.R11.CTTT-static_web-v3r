import { afterEach, describe, expect, test, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { CLAIM_STATUS, useOptimisticClaim } from "./useOptimisticClaim.js";
import { ClaimError } from "../services/claimService.js";
import { INITIAL_INVENTORY } from "../data/inventory.js";

// T-03B — optimistic claim transactions (PRD 2 sections 4–7), tested on their own, before
// any UI, with a backend whose every response the test resolves by hand.

/** A claimItem double: each call returns a promise the test settles explicitly. */
function controllableBackend() {
    const calls = [];
    const claimItem = vi.fn((itemId, claimId, { signal } = {}) => new Promise((resolve, reject) => {
        const call = { itemId, claimId, signal, resolve, reject };
        calls.push(call);
        signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    const ok = (call, remainingStock) => call.resolve({ status: 200, itemId: call.itemId, claimId: call.claimId, remainingStock });
    const fail = (call, status, message = "x") => call.reject(new ClaimError(message, { status, code: "TEST", itemId: call.itemId, claimId: call.claimId }));
    return { calls, claimItem, ok, fail };
}

function setup(inventory = INITIAL_INVENTORY) {
    const backend = controllableBackend();
    let n = 0;
    const generateClaimId = vi.fn(() => `claim-${++n}`);
    const hook = renderHook(() => useOptimisticClaim({ initialInventory: inventory, claimItem: backend.claimItem, generateClaimId }));
    const stock = (id) => hook.result.current.inventory.find((item) => item.id === id).stock;
    const status = (id) => hook.result.current.claims[id].status;
    const claim = (id) => {
        let claimId;
        act(() => { claimId = hook.result.current.claim(id); });
        return claimId;
    };
    const settle = async (fn) => { await act(async () => { fn(); }); };
    return { backend, hook, stock, status, claim, settle, generateClaimId };
}

afterEach(() => vi.restoreAllMocks());

describe("useOptimisticClaim", () => {
    test("starts IDLE with the initial inventory", () => {
        const { stock, status } = setup();
        expect(stock("pvs-vip")).toBe(25);
        expect(stock("gcoin-crate")).toBe(100);
        expect(status("pvs-vip")).toBe(CLAIM_STATUS.IDLE);
    });

    test("deducts stock at once, before the server answers; PENDING meanwhile", () => {
        const { backend, stock, status, claim } = setup();
        const claimId = claim("pvs-vip");
        expect(claimId).toBe("claim-1");
        expect(stock("pvs-vip")).toBe(24);
        expect(status("pvs-vip")).toBe(CLAIM_STATUS.PENDING);
        expect(backend.calls).toHaveLength(1);
        expect(backend.calls[0]).toMatchObject({ itemId: "pvs-vip", claimId: "claim-1" });
    });

    test("HTTP 200: SUCCESS, stock reconciled to the server's remainingStock", async () => {
        const { backend, stock, status, claim, settle } = setup();
        claim("pvs-vip");
        await settle(() => backend.ok(backend.calls[0], 20));             // other players bought meanwhile
        expect(status("pvs-vip")).toBe(CLAIM_STATUS.SUCCESS);
        expect(stock("pvs-vip")).toBe(20);
    });

    test("HTTP 409: CONFLICT \"Looted Out!\" and the unit is given back", async () => {
        const { backend, hook, stock, status, claim, settle } = setup();
        claim("pvs-vip");
        await settle(() => backend.fail(backend.calls[0], 409, "Looted Out"));
        expect(status("pvs-vip")).toBe(CLAIM_STATUS.CONFLICT);
        expect(hook.result.current.claims["pvs-vip"].message).toBe("Looted Out!");
        expect(stock("pvs-vip")).toBe(25);
    });

    test("duplicate clicks while PENDING send no second request (the useRef lock)", () => {
        const { backend, stock, claim } = setup();
        expect(claim("pvs-vip")).toBe("claim-1");
        expect(claim("pvs-vip")).toBeNull();
        expect(claim("pvs-vip")).toBeNull();
        expect(backend.calls).toHaveLength(1);
        expect(stock("pvs-vip")).toBe(24);
    });

    test("five clicks in the same tick still make one claim", () => {
        const { backend, hook } = setup();
        let ids;
        act(() => { ids = [1, 2, 3, 4, 5].map(() => hook.result.current.claim("pvs-vip")); });
        expect(ids).toEqual(["claim-1", null, null, null, null]);
        expect(backend.calls).toHaveLength(1);
    });

    test("every claim gets a unique claimId; the lock is released after each one", async () => {
        const { backend, claim, settle } = setup();
        const ids = [];
        for (let i = 0; i < 3; i += 1) {
            ids.push(claim("gcoin-crate"));
            await settle(() => backend.ok(backend.calls[i], 99 - i));
        }
        expect(new Set(ids).size).toBe(3);
        expect(backend.calls.map((c) => c.claimId)).toEqual(ids);
    });

    test("the default claimId is a crypto.randomUUID()", () => {
        const backend = controllableBackend();
        const { result } = renderHook(() => useOptimisticClaim({ initialInventory: INITIAL_INVENTORY, claimItem: backend.claimItem }));
        let a;
        act(() => { a = result.current.claim("pvs-vip"); });
        expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test("network error: ERROR, stock restored, never shown as a success", async () => {
        const { backend, hook, stock, status, claim, settle } = setup();
        claim("gcoin-crate");
        await settle(() => backend.fail(backend.calls[0], 0));
        expect(status("gcoin-crate")).toBe(CLAIM_STATUS.ERROR);
        expect(hook.result.current.claims["gcoin-crate"].message).toBe("Network error");
        expect(stock("gcoin-crate")).toBe(100);
    });

    test("500 and unexpected failures are errors too, with their own message", async () => {
        const { backend, hook, claim, settle } = setup();
        claim("gcoin-crate");
        await settle(() => backend.fail(backend.calls[0], 500));
        expect(hook.result.current.claims["gcoin-crate"]).toMatchObject({ status: CLAIM_STATUS.ERROR, message: "Server error 500" });
        claim("pvs-vip");
        await settle(() => backend.calls[1].reject(new Error("boom")));
        expect(hook.result.current.claims["pvs-vip"]).toMatchObject({ status: CLAIM_STATUS.ERROR, message: "Unexpected response" });
    });

    test("a malformed 200 is not trusted as a success: rolled back as an error", async () => {
        const { backend, stock, status, claim, settle } = setup();
        claim("pvs-vip");
        await settle(() => backend.calls[0].resolve({ status: 200, itemId: "pvs-vip", claimId: "someone-else", remainingStock: 3 }));
        expect(status("pvs-vip")).toBe(CLAIM_STATUS.ERROR);
        expect(stock("pvs-vip")).toBe(25);
    });

    test("retry after a network error re-sends the SAME claimId (server-side idempotent)", async () => {
        const { backend, hook, stock, status, claim, settle, generateClaimId } = setup();
        claim("pvs-vip");
        await settle(() => backend.fail(backend.calls[0], 0));
        let retried;
        act(() => { retried = hook.result.current.retry("pvs-vip"); });
        expect(retried).toBe("claim-1");
        expect(generateClaimId).toHaveBeenCalledTimes(1);
        expect(backend.calls[1].claimId).toBe("claim-1");
        expect(stock("pvs-vip")).toBe(24);                                  // optimistic again
        await settle(() => backend.ok(backend.calls[1], 24));
        expect(status("pvs-vip")).toBe(CLAIM_STATUS.SUCCESS);
    });

    test("retry is refused unless the last claim failed with an error", async () => {
        const { backend, hook, claim, settle } = setup();
        let r;
        act(() => { r = hook.result.current.retry("pvs-vip"); });
        expect(r).toBeNull();
        claim("pvs-vip");
        await settle(() => backend.fail(backend.calls[0], 409));
        act(() => { r = hook.result.current.retry("pvs-vip"); });
        expect(r).toBeNull();                                               // a conflict is final: claim anew
        expect(backend.calls).toHaveLength(1);
    });

    describe("concurrent claims on different items", () => {
        test("a 409 on the VIP ticket restores only the ticket, never the crate", async () => {
            const { backend, stock, status, claim, settle } = setup();
            claim("pvs-vip");
            claim("gcoin-crate");
            expect([stock("pvs-vip"), stock("gcoin-crate")]).toEqual([24, 99]);
            await settle(() => backend.fail(backend.calls[0], 409));
            expect([stock("pvs-vip"), stock("gcoin-crate")]).toEqual([25, 99]);
            expect(status("gcoin-crate")).toBe(CLAIM_STATUS.PENDING);
            await settle(() => backend.ok(backend.calls[1], 99));
            expect([stock("pvs-vip"), stock("gcoin-crate")]).toEqual([25, 99]);
        });

        test("responses arriving in the opposite order settle each item independently", async () => {
            const { backend, stock, status, claim, settle } = setup();
            claim("pvs-vip");
            claim("gcoin-crate");
            await settle(() => backend.ok(backend.calls[1], 99));
            await settle(() => backend.fail(backend.calls[0], 0));
            expect([status("pvs-vip"), status("gcoin-crate")]).toEqual([CLAIM_STATUS.ERROR, CLAIM_STATUS.SUCCESS]);
            expect([stock("pvs-vip"), stock("gcoin-crate")]).toEqual([25, 99]);
        });

        test("a crate claim made after the ticket was deducted survives the ticket's rollback", async () => {
            const { backend, stock, claim, settle } = setup();
            claim("pvs-vip");
            await settle(() => backend.ok(backend.calls[0], 24));
            claim("pvs-vip");                                               // 23, pending
            claim("gcoin-crate");                                           // 99, pending
            await settle(() => backend.fail(backend.calls[1], 409));        // ticket back to 24
            expect([stock("pvs-vip"), stock("gcoin-crate")]).toEqual([24, 99]);
        });
    });

    test("stock never goes below zero; a sold-out item refuses claims without a request", async () => {
        const { backend, stock, claim, settle } = setup([{ ...INITIAL_INVENTORY[0], stock: 1 }]);
        claim("pvs-vip");
        expect(stock("pvs-vip")).toBe(0);
        await settle(() => backend.ok(backend.calls[0], 0));
        expect(claim("pvs-vip")).toBeNull();
        expect(backend.calls).toHaveLength(1);
        expect(stock("pvs-vip")).toBe(0);
    });

    // No "stale response" test on purpose. Two attempts were written and both passed with the
    // hook's stale guard deleted (mutation check), so they proved nothing:
    //   1. re-delivering a response by calling reject() twice: a promise settles only once;
    //   2. answering after unmount: React drops every update to an unmounted component anyway.
    // With one settlement per request and one claim per item at a time, the guard is defensive
    // and cannot be observed from outside; what CAN be observed (abort on unmount) is tested below.

    test("unmounting aborts requests in flight; their answers change nothing", async () => {
        const { backend, hook, claim } = setup();
        claim("pvs-vip");
        const { signal } = backend.calls[0];
        hook.unmount();
        expect(signal.aborted).toBe(true);
    });

    test("validates its inputs (Rule 2)", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const backend = controllableBackend();
        expect(() => renderHook(() => useOptimisticClaim({ initialInventory: [], claimItem: backend.claimItem }))).toThrow(TypeError);
        expect(() => renderHook(() => useOptimisticClaim({ initialInventory: INITIAL_INVENTORY, claimItem: "post" }))).toThrow(TypeError);
        const { result } = renderHook(() => useOptimisticClaim({ initialInventory: INITIAL_INVENTORY, claimItem: backend.claimItem, generateClaimId: () => "" }));
        expect(() => result.current.claim("pvs-vip")).toThrow(TypeError);
        expect(() => result.current.claim("skin")).toThrow(TypeError);
    });
});
