/**
 * Vietnam Mega-Sale Simulator — T-03 authoritative reservation controller,
 * T-04 expiring locks, T-05 checkout workflow
 *
 * The one place that changes reservations and stock for a campaign. The UI
 * only calls these methods and renders the snapshots they return.
 *
 * reserve() follows the PRD order:
 *   1. the campaign is LIVE (reads the injected clock)
 *   2. the quantity is a whole number of 1 or more
 *   3. enough stock is available (after releasing locks that are already due)
 *   4. the shopper has no active reservation (no double reserve)
 *   5. IDLE -> RESERVING, then the simulated processing step runs
 *   6. checks 1 and 3 again (time and stock may have changed), then
 *      inventory.reserve() and RESERVING -> LOCKED with expiresAt
 * Steps 1-4 reject without creating a reservation or touching stock. A
 * failure in step 6 moves RESERVING -> IDLE and leaves stock unchanged.
 *
 * Expiring locks (T-04):
 * - A lock is valid while now < expiresAt (an absolute timestamp). Every
 *   check reads the clock; no countdown is trusted.
 * - Each LOCKED reservation has one expiry timer, armed for expiresAt. The
 *   callback carries the reservation id and the expiresAt it was armed for.
 *   It does nothing unless that reservation still exists, still has that
 *   expiresAt and is still LOCKED, so a late callback cannot touch a
 *   purchased, cancelled or replaced reservation. A callback that fires early
 *   re-arms itself.
 * - expireIfDue(id) is idempotent: it releases stock only on the
 *   LOCKED -> EXPIRED transition, which can happen once. Calling it again, or
 *   before the lock is due, changes nothing.
 * - The timer only runs while LOCKED: it is cleared on checkout, cancel and
 *   purchase, and re-armed when a failed checkout returns to LOCKED. A lock
 *   that runs out during checkout is expired by the checkout itself.
 * - sweepExpired() expires every lock that is due. reserve() calls it first,
 *   so stock from abandoned locks is free again even if a timer was delayed.
 *
 * Checkout (T-05): checkout(id) is the workflow entry point.
 *   1. eligibility: the reservation exists, is LOCKED (not purchased,
 *      cancelled or expired), now < expiresAt, its quantity is a positive
 *      whole number covered by reserved stock, and it belongs to this
 *      campaign's product and was made during the sale. A lock made during the
 *      sale stays valid after the sale ends, until its own expiry.
 *   2. LOCKED -> CHECKING_OUT (the expiry timer is disarmed)
 *   3. the simulated payment step runs (processCheckout)
 *   4. success: completeCheckout() re-checks the expiry, then moves the
 *      reserved units to sold and CHECKING_OUT -> PURCHASED in one
 *      synchronous step. Failure: CHECKING_OUT -> LOCKED with the stock still
 *      reserved (the timer re-armed), or EXPIRED with the stock released once
 *      if the lock ran out meanwhile.
 * Calls for a reservation that is already checking out return the same
 * promise (deduplicated by reservation id), so repeated submissions cannot
 * sell the same units twice. A purchased reservation is rejected with
 * "already-purchased".
 *
 * Every method that changes stock is synchronous from its last validation to
 * its last write: the state is checked, the transition applied and the
 * inventory moved with no await in between, so no other operation can run in
 * the middle (JavaScript runs one task at a time). reserve() awaits only the
 * simulated processing step, and validates everything again after it.
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
export const DEFAULT_CHECKOUT_MS = 600;
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
 * options.now, createId, process, processCheckout, setTimeout and
 * clearTimeout exist for tests. process(snapshot) is the simulated server
 * round trip while RESERVING (default: a 400 ms wait); processCheckout(snapshot)
 * is the simulated payment while CHECKING_OUT (default: a 600 ms wait). A
 * rejected processCheckout is a failed payment.
 */
export function createReservationStore(options) {
    if (!isPlainObject(options)) throw new TypeError("Reservation store: options must be a plain object.");
    const {
        config,
        now = Date.now,
        createId = defaultIdFactory(),
        process = () => wait(DEFAULT_PROCESSING_MS),
        processCheckout = () => wait(DEFAULT_CHECKOUT_MS),
        setTimeout: setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
        clearTimeout: clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis)
    } = options;
    if (!isPlainObject(config) || !Object.isFrozen(config)) {
        throw new TypeError("Reservation store: config must be a validated (frozen) sale config.");
    }
    for (const [name, value] of Object.entries({ now, createId, process, processCheckout, setTimeout: setTimeoutFn, clearTimeout: clearTimeoutFn })) {
        if (typeof value !== "function") throw new TypeError(`Reservation store: ${name} must be a function.`);
    }

    const inventory = createInventory(config.initialInventory);
    const reservations = new Map();
    const listeners = new Set();
    // Reservation id -> pending expiry timer handle; only LOCKED reservations have one.
    const expiryTimers = new Map();
    // Reservation id -> the promise of its checkout in progress (deduplication).
    const checkoutsInFlight = new Map();
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
        if (next === S.LOCKED) armExpiry(record);
        else disarmExpiry(record.id);
        const result = snapshot(record);
        notify({ type: event, reservation: result });
        return result;
    }

    function find(id) {
        const record = reservations.get(id);
        if (!record) throw new ReservationError(CODES.NOT_FOUND, "That reservation does not exist.");
        return record;
    }

    // --- Expiry ---

    function armExpiry(record) {
        disarmExpiry(record.id);
        const { id, expiresAt } = record;
        const delay = Math.max(0, expiresAt - readNow());
        expiryTimers.set(id, setTimeoutFn(() => onExpiryTimer(id, expiresAt), delay));
    }

    function disarmExpiry(id) {
        if (!expiryTimers.has(id)) return;
        clearTimeoutFn(expiryTimers.get(id));
        expiryTimers.delete(id);
    }

    /**
     * Timer callback. It acts only on the reservation it was armed for: same
     * id, same expiresAt, still LOCKED. Anything else is a stale callback.
     */
    function onExpiryTimer(id, armedFor) {
        if (disposed) return;
        expiryTimers.delete(id);
        const record = reservations.get(id);
        if (!record || record.expiresAt !== armedFor || record.state !== S.LOCKED) return;
        // Browsers may fire a timer early; re-arm until the lock is really due.
        if (!expireLockIfDue(record, readNow())) armExpiry(record);
    }

    /** LOCKED and due -> EXPIRED with its stock released. The only path that releases expired stock. */
    function expireLockIfDue(record, at) {
        if (record.state !== S.LOCKED || at < record.expiresAt) return false;
        // Validate the transition before moving stock, so a rejected move changes nothing.
        transition(record.state, E.EXPIRE);
        inventory.release(record.quantity);
        apply(record, E.EXPIRE);
        return true;
    }

    /** A lock that ran out while CHECKING_OUT: expired by the checkout that found it. */
    function expireCheckoutIfDue(record, at) {
        if (record.state !== S.CHECKING_OUT || at < record.expiresAt) return false;
        transition(record.state, E.EXPIRE);
        inventory.release(record.quantity);
        apply(record, E.EXPIRE);
        return true;
    }

    /** Expire every due lock. Returns the snapshots that expired. */
    function sweepExpired() {
        if (disposed) return [];
        const at = readNow();
        const expired = [];
        for (const record of reservations.values()) {
            if (expireLockIfDue(record, at)) expired.push(snapshot(record));
        }
        return expired;
    }

    // --- Reserving ---

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
        // Locks that are already due free their stock before it is counted.
        sweepExpired();
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
            failure: null,
            purchasedAt: null
        };
        reservations.set(id, record);
        const reserving = apply(record, E.REQUEST);

        try {
            await process(reserving);
            if (disposed) throw new ReservationError(CODES.DISPOSED, "The sale simulator has been closed.");
            // From here to the return there is no await: validate, then lock.
            const lockedAt = readNow();
            assertLive(lockedAt);
            sweepExpired();
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

    // --- After the lock ---

    /** LOCKED -> CHECKING_OUT, only for a lock that has not expired. */
    function beginCheckout(id) {
        assertUsable();
        const record = find(id);
        if (expireLockIfDue(record, readNow())) {
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
        if (expireCheckoutIfDue(record, readNow())) {
            throw new ReservationError(CODES.EXPIRED, "Your reservation expired before checkout finished.");
        }
        transition(record.state, E.CHECKOUT_SUCCEED);
        inventory.commit(record.quantity);
        return apply(record, E.CHECKOUT_SUCCEED, { purchasedAt: readNow() });
    }

    /** CHECKING_OUT -> LOCKED while the lock is still valid, otherwise EXPIRED. */
    function failCheckout(id) {
        assertUsable();
        const record = find(id);
        if (expireCheckoutIfDue(record, readNow())) return snapshot(record);
        return apply(record, E.CHECKOUT_FAIL);
    }

    /** LOCKED -> CANCELLED: reserved stock goes back to available, once. */
    function cancel(id) {
        assertUsable();
        const record = find(id);
        // A lock that is already due expires instead: its stock is released by the expiry.
        if (expireLockIfDue(record, readNow())) {
            throw new ReservationError(CODES.EXPIRED, "Your reservation had already expired; its stock was released.");
        }
        transition(record.state, E.CANCEL);
        inventory.release(record.quantity);
        return apply(record, E.CANCEL);
    }

    /**
     * Expire the reservation if it is LOCKED and its expiresAt has been
     * reached. Idempotent: returns { expired, reservation }, and only the first
     * call that finds the lock due releases stock.
     */
    function expireIfDue(id) {
        assertUsable();
        const record = find(id);
        const expired = expireLockIfDue(record, readNow());
        return Object.freeze({ expired, reservation: snapshot(record) });
    }

    // --- Checkout workflow ---

    /** Every rule a checkout must pass before LOCKED -> CHECKING_OUT. Throws a ReservationError. */
    function assertCheckoutEligible(record, at) {
        if (record.state === S.PURCHASED) {
            throw new ReservationError(CODES.ALREADY_PURCHASED, "This reservation has already been purchased.");
        }
        if (record.state === S.CANCELLED) {
            throw new ReservationError(CODES.INVALID_TRANSITION, "This reservation was cancelled. Reserve the product again.");
        }
        if (record.state === S.EXPIRED || expireLockIfDue(record, at)) {
            throw new ReservationError(CODES.EXPIRED, "Your reservation has expired and the stock was released.");
        }
        if (record.state !== S.LOCKED) {
            throw new ReservationError(CODES.INVALID_TRANSITION, "Checkout needs an active reservation. Reserve the product first.");
        }
        if (!Number.isSafeInteger(record.quantity) || record.quantity <= 0 || record.quantity > inventory.snapshot().reserved) {
            throw new ReservationError(CODES.NOT_ELIGIBLE, "The reserved quantity is not valid for checkout.");
        }
        if (record.productId !== config.productId || record.createdAt < config.startsAt || record.createdAt >= config.endsAt) {
            throw new ReservationError(CODES.NOT_ELIGIBLE, "This reservation does not belong to this sale.");
        }
    }

    /**
     * Run the whole checkout for a reservation. Resolves with the PURCHASED
     * snapshot; rejects with a ReservationError (expired, checkout-failed,
     * already-purchased, …). Calls during a checkout get the same promise.
     */
    function checkout(id) {
        if (checkoutsInFlight.has(id)) return checkoutsInFlight.get(id);
        let checkingOut;
        try {
            assertUsable();
            const record = find(id);
            assertCheckoutEligible(record, readNow());
            checkingOut = apply(record, E.CHECKOUT);
        } catch (error) {
            return Promise.reject(error);
        }
        const run = (async () => {
            try {
                await processCheckout(checkingOut);
            } catch (cause) {
                if (disposed) throw new ReservationError(CODES.DISPOSED, "The sale simulator has been closed.");
                const after = failCheckout(id);
                if (after.state === S.EXPIRED) {
                    throw new ReservationError(CODES.EXPIRED, "Your reservation expired during checkout; its stock was released.", { cause });
                }
                throw new ReservationError(CODES.CHECKOUT_FAILED,
                    "The payment did not go through. Your reservation is still held, so you can try again before it expires.", { cause });
            }
            if (disposed) throw new ReservationError(CODES.DISPOSED, "The sale simulator has been closed.");
            return completeCheckout(id);
        })();
        checkoutsInFlight.set(id, run);
        const forget = () => checkoutsInFlight.delete(id);
        run.then(forget, forget);
        return run;
    }

    function subscribe(listener) {
        if (typeof listener !== "function") throw new TypeError("Reservation store: listener must be a function.");
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    return Object.freeze({
        reserve,
        checkout,
        beginCheckout,
        completeCheckout,
        failCheckout,
        cancel,
        expireIfDue,
        sweepExpired,
        subscribe,
        get: (id) => snapshot(find(id)),
        list: () => [...reservations.values()].map(snapshot),
        activeFor: (shopperId = "you") => {
            const record = activeFor(shopperId);
            return record ? snapshot(record) : null;
        },
        get inventory() { return inventory.snapshot(); },
        /** Number of armed expiry timers (tests and diagnostics). */
        get pendingExpiryTimers() { return expiryTimers.size; },
        dispose() {
            disposed = true;
            for (const id of [...expiryTimers.keys()]) disarmExpiry(id);
            listeners.clear();
        }
    });
}
