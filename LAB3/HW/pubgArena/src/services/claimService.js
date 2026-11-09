/**
 * KRAFTON x PUBG Vietnam Championship — T-03B mock claim backend
 *
 *   const service = createClaimService();
 *   await service.claimItem(itemId, claimId, { signal });   // resolves an HTTP-200-like result
 *                                                            // or rejects with ClaimError
 *
 * There is no backend in this course, so this module plays the server. It is
 * deterministic: nothing is random, and the result depends only on the
 * server's own state and a per-item mode that tests (and the page's
 * "Server simulation" control) set explicitly:
 *
 *   "auto"           the server decides from its own stock:
 *                    stock > 0 → 200 and one unit taken; stock 0 → 409 Looted Out
 *   "conflict"       409 Looted Out: another player got there first
 *   "network-error"  the request never reaches the server (status 0, nothing changes)
 *   "server-error"   500 Internal Server Error (nothing changes)
 *
 * Idempotency: the server remembers every claimId it accepted. Retrying with
 * the same claimId (for example after a network error whose outcome the
 * client could not know) returns the original result instead of taking a
 * second unit, so a retry can never double-claim.
 *
 * Every request waits `latencyMs` (default 600 ms) so the PENDING state is
 * visible, and can be cancelled with an AbortSignal.
 */
import { INITIAL_INVENTORY, assertInventory } from "../data/inventory.js";

export const SERVICE_MODES = Object.freeze(["auto", "conflict", "network-error", "server-error"]);
export const DEFAULT_LATENCY_MS = 600;

/** A failed claim; `status` is the HTTP status (0 when no response arrived). */
export class ClaimError extends Error {
    constructor(message, { status, code, itemId, claimId }) {
        super(message);
        this.name = "ClaimError";
        this.status = status;
        this.code = code;
        this.itemId = itemId;
        this.claimId = claimId;
    }
}

function abortError() {
    return new DOMException("Claim request cancelled", "AbortError");
}

export function createClaimService({ inventory = INITIAL_INVENTORY, latencyMs = DEFAULT_LATENCY_MS } = {}) {
    assertInventory(inventory);
    if (!Number.isSafeInteger(latencyMs) || latencyMs < 0) {
        throw new TypeError("claimService: latencyMs must be a non-negative integer");
    }

    const serverStock = new Map(inventory.map((item) => [item.id, item.stock]));
    const modes = new Map(inventory.map((item) => [item.id, "auto"]));
    const accepted = new Map();          // claimId → frozen 200 result
    let requestCount = 0;

    const assertItemId = (itemId) => {
        if (!serverStock.has(itemId)) throw new TypeError(`claimService: unknown item ${JSON.stringify(itemId)}`);
    };

    const wait = (signal) => new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(abortError());
            return;
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, latencyMs);
        const onAbort = () => {
            clearTimeout(timer);
            reject(abortError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
    });

    async function claimItem(itemId, claimId, { signal } = {}) {
        assertItemId(itemId);
        if (typeof claimId !== "string" || claimId.trim() === "") {
            throw new TypeError("claimService: claimId must be a non-empty string");
        }
        requestCount += 1;
        await wait(signal);

        const mode = modes.get(itemId);
        const fail = (message, status, code) => new ClaimError(message, { status, code, itemId, claimId });

        if (mode === "network-error") throw fail("Network error: the claim request did not reach the server", 0, "NETWORK_ERROR");
        if (accepted.has(claimId)) return accepted.get(claimId);                         // idempotent replay
        if (mode === "server-error") throw fail("Internal server error", 500, "SERVER_ERROR");
        if (mode === "conflict" || serverStock.get(itemId) === 0) throw fail("Looted Out", 409, "LOOTED_OUT");

        serverStock.set(itemId, serverStock.get(itemId) - 1);
        const result = Object.freeze({ status: 200, itemId, claimId, remainingStock: serverStock.get(itemId) });
        accepted.set(claimId, result);
        return result;
    }

    return Object.freeze({
        claimItem,
        setMode(itemId, mode) {
            assertItemId(itemId);
            if (!SERVICE_MODES.includes(mode)) throw new TypeError(`claimService: mode must be one of ${SERVICE_MODES.join(", ")}`);
            modes.set(itemId, mode);
        },
        getMode(itemId) {
            assertItemId(itemId);
            return modes.get(itemId);
        },
        getServerStock(itemId) {
            assertItemId(itemId);
            return serverStock.get(itemId);
        },
        /** Simulates other players taking units directly on the server. */
        takeStock(itemId, count) {
            assertItemId(itemId);
            if (!Number.isSafeInteger(count) || count < 0) throw new TypeError("claimService: count must be a non-negative integer");
            serverStock.set(itemId, Math.max(0, serverStock.get(itemId) - count));
        },
        get requestCount() {
            return requestCount;
        }
    });
}

export default createClaimService;
