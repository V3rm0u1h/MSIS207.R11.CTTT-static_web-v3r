/**
 * KRAFTON x PUBG Vietnam Championship — T-03B optimistic claims
 *
 *   const { inventory, claims, claim, retry } = useOptimisticClaim({ initialInventory, claimItem });
 *
 * One claim, step by step (PRD 2 section 4):
 *   1. the item must have stock and no claim in flight (the useRef lock);
 *   2. a unique claimId is generated and the lock is taken: inFlight[itemId] = claimId;
 *   3. an optimistic transaction { claimId → itemId } is recorded and the
 *      displayed stock drops by one at once (never below 0);
 *   4. the request is sent; the card shows PENDING;
 *   5. the response settles the transaction:
 *        200  SUCCESS:  stock reconciled to the server's remainingStock
 *        409  CONFLICT: "Looted Out!": the unit is given back (+1)
 *        else ERROR:    the unit is given back (+1); the claim was NOT
 *                       confirmed, so it is never shown as a success. Retry
 *                       re-sends the SAME claimId, which the server treats
 *                       idempotently, so a retry cannot claim twice.
 *   6. the lock is released only if it still belongs to this claimId.
 *
 * Concurrency. Rollback is a delta (+1 on this item) applied once per
 * transaction, never a snapshot of the whole inventory: a failure on the
 * VIP ticket cannot restore or overwrite the crate's stock, even when both
 * claims are in flight together. A response whose transaction is gone
 * (already settled, or the component unmounted) changes nothing. That guard
 * is defensive: a promise settles once and each item has one claim in flight,
 * so no test can currently provoke a stale answer (see the test file).
 *
 * The inventory (and each claim state) lives in a ref that every update goes through synchronously,
 * so the stock check in step 1 always sees the latest value, even between a
 * click and the next render. Unmounting aborts every request in flight.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { assertInventory } from "../data/inventory.js";

export const CLAIM_STATUS = Object.freeze({
    IDLE: "IDLE",
    PENDING: "PENDING",
    SUCCESS: "SUCCESS",
    CONFLICT: "CONFLICT",
    ERROR: "ERROR"
});

const IDLE_CLAIM = Object.freeze({ status: CLAIM_STATUS.IDLE, claimId: null, message: "" });

function assertSuccess(result, itemId, claimId) {
    if (result === null || typeof result !== "object" || result.status !== 200
        || result.itemId !== itemId || result.claimId !== claimId
        || !Number.isSafeInteger(result.remainingStock) || result.remainingStock < 0) {
        throw new TypeError("useOptimisticClaim: the server returned an invalid claim confirmation");
    }
}

const isAbort = (error) => error instanceof DOMException && error.name === "AbortError";

export function useOptimisticClaim({ initialInventory, claimItem, generateClaimId = () => crypto.randomUUID() } = {}) {
    assertInventory(initialInventory);
    if (typeof claimItem !== "function") throw new TypeError("useOptimisticClaim: claimItem must be a function");
    if (typeof generateClaimId !== "function") throw new TypeError("useOptimisticClaim: generateClaimId must be a function");

    const [inventory, setInventory] = useState(initialInventory);
    const inventoryRef = useRef(initialInventory);
    const [claims, setClaims] = useState(() => Object.freeze(
        Object.fromEntries(initialInventory.map((item) => [item.id, IDLE_CLAIM]))
    ));
    const claimsRef = useRef(claims);
    const inFlightClaims = useRef(new Map());   // itemId → claimId holding the lock
    const transactions = useRef(new Map());     // claimId → itemId, one per unsettled optimistic deduction
    const controllerRef = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        controllerRef.current = controller;
        const inFlight = inFlightClaims.current;
        const pending = transactions.current;
        return () => {
            controller.abort();
            inFlight.clear();
            pending.clear();
        };
    }, []);

    /** Applies `change(stock)` to one item, synchronously, and publishes the new inventory. */
    const updateStock = useCallback((itemId, change) => {
        inventoryRef.current = Object.freeze(inventoryRef.current.map((item) => (
            item.id === itemId ? Object.freeze({ ...item, stock: Math.max(0, change(item.stock)) }) : item
        )));
        setInventory(inventoryRef.current);
    }, []);

    // Mirrored in a ref like the inventory: retry() must read the latest claim synchronously.
    const setClaim = useCallback((itemId, claim) => {
        claimsRef.current = Object.freeze({ ...claimsRef.current, [itemId]: Object.freeze(claim) });
        setClaims(claimsRef.current);
    }, []);

    /** Gives the unit of one transaction back (+1), at most once. */
    const rollback = useCallback((claimId) => {
        const itemId = transactions.current.get(claimId);
        if (itemId === undefined) return false;
        transactions.current.delete(claimId);
        updateStock(itemId, (stock) => stock + 1);
        return true;
    }, [updateStock]);

    const submit = useCallback(async (itemId, claimId) => {
        const controller = controllerRef.current;
        inFlightClaims.current.set(itemId, claimId);
        transactions.current.set(claimId, itemId);
        updateStock(itemId, (stock) => stock - 1);
        setClaim(itemId, { status: CLAIM_STATUS.PENDING, claimId, message: "" });

        try {
            const result = await claimItem(itemId, claimId, { signal: controller?.signal });
            assertSuccess(result, itemId, claimId);
            if (!transactions.current.has(claimId)) return;            // stale: already settled
            transactions.current.delete(claimId);
            updateStock(itemId, () => result.remainingStock);
            setClaim(itemId, { status: CLAIM_STATUS.SUCCESS, claimId, message: "" });
        } catch (error) {
            if (isAbort(error) || controller?.signal.aborted) return;    // unmounted
            if (!rollback(claimId)) return;                              // stale: nothing left to undo
            if (error?.status === 409) {
                setClaim(itemId, { status: CLAIM_STATUS.CONFLICT, claimId, message: "Looted Out!" });
            } else {
                const reason = error?.status === 0 ? "Network error" : error?.status ? `Server error ${error.status}` : "Unexpected response";
                setClaim(itemId, { status: CLAIM_STATUS.ERROR, claimId, message: reason });
            }
        } finally {
            if (inFlightClaims.current.get(itemId) === claimId) inFlightClaims.current.delete(itemId);
        }
    }, [claimItem, rollback, setClaim, updateStock]);

    /** Starts a new claim for itemId. Returns its claimId, or null when refused. */
    const claim = useCallback((itemId) => {
        const item = inventoryRef.current.find((entry) => entry.id === itemId);
        if (item === undefined) throw new TypeError(`useOptimisticClaim: unknown item ${JSON.stringify(itemId)}`);
        if (inFlightClaims.current.has(itemId) || item.stock <= 0) return null;
        const claimId = generateClaimId();
        if (typeof claimId !== "string" || claimId.trim() === "") {
            throw new TypeError("useOptimisticClaim: generateClaimId must return a non-empty string");
        }
        submit(itemId, claimId);
        return claimId;
    }, [generateClaimId, submit]);

    /** Re-sends a failed (ERROR) claim with the same claimId. Returns it, or null when refused. */
    const retry = useCallback((itemId) => {
        const item = inventoryRef.current.find((entry) => entry.id === itemId);
        if (item === undefined) throw new TypeError(`useOptimisticClaim: unknown item ${JSON.stringify(itemId)}`);
        if (inFlightClaims.current.has(itemId) || item.stock <= 0) return null;
        const failed = claimsRef.current[itemId];
        if (failed.status !== CLAIM_STATUS.ERROR) return null;
        submit(itemId, failed.claimId);
        return failed.claimId;
    }, [submit]);

    return { inventory, claims, claim, retry };
}

export default useOptimisticClaim;
