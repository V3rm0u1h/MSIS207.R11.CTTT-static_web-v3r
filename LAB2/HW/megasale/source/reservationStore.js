/**
 * Vietnam Mega-Sale Simulator — T-03 authoritative reservation controller
 *
 * The one place that changes reservations and stock for a campaign. The UI
 * only calls these methods and renders the snapshots they return.
 *
 * reserve() follows the PRD order:
 *   1. the campaign is LIVE (reads the injected clock)
 *   2. the quantity is a whole number of 1 or more
 *   3. enough stock is available
 *   4. the shopper has no active reservation (no double reserve)
 *   5. IDLE -> RESERVING, then the simulated processing step runs
 *   6. checks 1 and 3 again (time and stock may have changed), then
 *      inventory.reserve() and RESERVING -> LOCKED with expiresAt
 * Steps 1-4 reject without creating a reservation or touching stock. A
 * failure in step 6 moves RESERVING -> IDLE and leaves stock unchanged.
 *
 * Lock expiry is applied lazily here: a checkout on a lock whose expiresAt
 * has passed expires it (stock released) and is rejected. A timer that
 * expires locks on its own is not part of T-03.
 *
 * This is in-memory, single-page state. It keeps stock consistent for the
 * reservations it sees; it cannot coordinate several browsers or devices.
 */

import { getCampaignStatus, SALE_STATUS } from "./saleStatus.js";
import { createInventory } from "./inventory.js";
import {
    RESERVATION_STATE as S,
    RESERVATION_EVENT as E,
    RESERVATION_ERROR_CODES as CODES,
    ReservationError,
    transition,
    isActiveState
} from "./reservationMachine.js";

export const DEFAULT_PROCESSING_MS = 400;
const SHOPPER_ID_PATTERN = /^[a-z0-9-]+$/;

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/** Unique per page: a random UUID where available, otherwise a counter. */
function defaultIdFactory() {
    let sequence = 0;
    return () => {
        sequence += 1;
        return globalThis.crypto?.randomUUID?.() ?? `reservation-${Date.now().toString(36)}-${sequence}`;
    };
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * options.config: a validated sale config (from validateSaleConfig).
 * options.now, createId and process exist for tests. process(snapshot) is the
 * simulated server round trip while RESERVING; it defaults to a 400 ms wait.
 */
export function createReservationStore(options) {
    if (!isPlainObject(options)) throw new TypeError("Reservation store: options must be a plain object.");
    const {
        config,
        now = Date.now,
        createId = defaultIdFactory(),
        process = () => wait(DEFAULT_PROCESSING_MS)
    } = options;
    if (!isPlainObject(config) || !Object.isFrozen(config)) {
        throw new TypeError("Reservation store: config must be a validated (frozen) sale config.");
    }
    for (const [name, value] of Object.entries({ now, createId, process })) {
        if (typeof value !== "function") throw new TypeError(`Reservation store: ${name} must be a function.`);
    }

    const inventory = createInventory(config.initialInventory);
    const reservations = new Map();
    const listeners = new Set();
    let disposed = false;

    function readNow() {
        const value = now();
        if (!Number.isFinite(value)) throw new TypeError("Reservation store: now() must return epoch milliseconds.");
        return value;
    }

    function assertUsable() {
        if (disposed) throw new ReservationError(CODES.DISPOSED, "The sale simulator has been closed.");
    }

    function snapshot(record) {
        return Object.freeze({ ...record });
    }

    function notify(change) {
        const inventorySnapshot = inventory.snapshot();
        for (const listener of [...listeners]) {
            try {
                listener(change, inventorySnapshot);
            } catch (error) {
                console.error(error);
            }
        }
    }

    /** Apply one FSM event to a stored record; the table rejects anything else. */
    function apply(record, event, changes = {}) {
        const next = transition(record.state, event);
        Object.assign(record, changes, { state: next, updatedAt: readNow() });
        const result = snapshot(record);
        notify({ type: event, reservation: result });
        return result;
    }

    function find(id) {
        const record = reservations.get(id);
        if (!record) throw new ReservationError(CODES.NOT_FOUND, "That reservation does not exist.");
        return record;
    }

    function assertLive(at) {
        const status = getCampaignStatus(config, at);
        if (status === SALE_STATUS.UPCOMING) throw new ReservationError(CODES.NOT_LIVE, "The sale has not started yet.");
        if (status === SALE_STATUS.ENDED) throw new ReservationError(CODES.SALE_ENDED, "The sale has ended.");
    }

    function assertStock(quantity) {
        const { available } = inventory.snapshot();
        if (quantity > available) {
            throw new ReservationError(CODES.INSUFFICIENT_STOCK, available === 0
                ? "Sold out: no units are available."
                : `Only ${available} ${available === 1 ? "unit is" : "units are"} available.`);
        }
    }

    function activeFor(shopperId) {
        for (const record of reservations.values()) {
            if (record.shopperId === shopperId && isActiveState(record.state)) return record;
        }
        return null;
    }

    /** Expire a lock whose time is up: release its stock. Returns true if it expired. */
    function expireIfDue(record, at) {
        if ((record.state === S.LOCKED || record.state === S.CHECKING_OUT) && at >= record.expiresAt) {
            inventory.release(record.quantity);
            apply(record, E.EXPIRE);
            return true;
        }
        return false;
    }

    async function reserve(request = {}) {
        assertUsable();
        if (!isPlainObject(request)) throw new TypeError("Reservation store: reserve() takes a plain object.");
        const { quantity, shopperId = "you" } = request;
        if (typeof shopperId !== "string" || !SHOPPER_ID_PATTERN.test(shopperId)) {
            throw new TypeError("Reservation store: shopperId must use lowercase letters, digits and hyphens.");
        }
        const at = readNow();
        assertLive(at);
        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
            throw new ReservationError(CODES.INVALID_QUANTITY, "Quantity must be a whole number of 1 or more.");
        }
        assertStock(quantity);
        const existing = activeFor(shopperId);
        if (existing) {
            throw new ReservationError(CODES.DUPLICATE, existing.state === S.RESERVING
                ? "Your reservation is already being processed."
                : "You already hold a reservation. Finish or cancel it first.");
        }

        const id = createId();
        if (typeof id !== "string" || id === "" || reservations.has(id)) {
            throw new Error("Reservation store: createId() must return a new, non-empty string.");
        }
        const record = {
            id,
            productId: config.productId,
            shopperId,
            quantity,
            createdAt: at,
            expiresAt: null,
            updatedAt: at,
            state: S.IDLE,
            failure: null
        };
        reservations.set(id, record);
        const reserving = apply(record, E.REQUEST);

        try {
            await process(reserving);
            if (disposed) throw new ReservationError(CODES.DISPOSED, "The sale simulator has been closed.");
            const lockedAt = readNow();
            assertLive(lockedAt);
            assertStock(quantity);
            inventory.reserve(quantity);
            return apply(record, E.CONFIRM, { expiresAt: lockedAt + config.lockDurationMs });
        } catch (cause) {
            const error = cause instanceof ReservationError
                ? cause
                : new ReservationError(CODES.PROCESSING_FAILED, "The reservation could not be processed. Please try again.", { cause });
            // Stock was never reserved on this path, so only the state changes.
            if (record.state === S.RESERVING) apply(record, E.FAIL, { failure: error.code });
            throw error;
        }
    }

    /** LOCKED -> CHECKING_OUT, only for a lock that has not expired. */
    function beginCheckout(id) {
        assertUsable();
        const record = find(id);
        if (expireIfDue(record, readNow())) {
            throw new ReservationError(CODES.EXPIRED, "Your reservation has expired and the stock was released.");
        }
        if (record.state !== S.LOCKED) {
            throw new ReservationError(CODES.INVALID_TRANSITION,
                "Checkout needs an active reservation. Reserve the product first.");
        }
        return apply(record, E.CHECKOUT);
    }

    /** CHECKING_OUT -> PURCHASED: reserved stock becomes sold. */
    function completeCheckout(id) {
        assertUsable();
        const record = find(id);
        if (expireIfDue(record, readNow())) {
            throw new ReservationError(CODES.EXPIRED, "Your reservation expired before checkout finished.");
        }
        transition(record.state, E.CHECKOUT_SUCCEED);
        inventory.commit(record.quantity);
        return apply(record, E.CHECKOUT_SUCCEED);
    }

    /** CHECKING_OUT -> LOCKED while the lock is still valid, otherwise EXPIRED. */
    function failCheckout(id) {
        assertUsable();
        const record = find(id);
        if (expireIfDue(record, readNow())) return snapshot(record);
        return apply(record, E.CHECKOUT_FAIL);
    }

    /** LOCKED -> CANCELLED: reserved stock goes back to available. */
    function cancel(id) {
        assertUsable();
        const record = find(id);
        transition(record.state, E.CANCEL);
        inventory.release(record.quantity);
        return apply(record, E.CANCEL);
    }

    /** LOCKED | CHECKING_OUT -> EXPIRED: reserved stock goes back to available. */
    function expire(id) {
        assertUsable();
        const record = find(id);
        transition(record.state, E.EXPIRE);
        inventory.release(record.quantity);
        return apply(record, E.EXPIRE);
    }

    function subscribe(listener) {
        if (typeof listener !== "function") throw new TypeError("Reservation store: listener must be a function.");
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    return Object.freeze({
        reserve,
        beginCheckout,
        completeCheckout,
        failCheckout,
        cancel,
        expire,
        subscribe,
        get: (id) => snapshot(find(id)),
        list: () => [...reservations.values()].map(snapshot),
        activeFor: (shopperId = "you") => {
            const record = activeFor(shopperId);
            return record ? snapshot(record) : null;
        },
        get inventory() { return inventory.snapshot(); },
        dispose() {
            disposed = true;
            listeners.clear();
        }
    });
}
