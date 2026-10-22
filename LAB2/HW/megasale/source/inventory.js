/**
 * Vietnam Mega-Sale Simulator — T-03 inventory accounting
 *
 * One product's stock in four non-negative integers with the invariant
 *   total = available + reserved + sold
 * Stock only moves between buckets:
 *   reserve(q): available -> reserved
 *   release(q): reserved  -> available   (expired or cancelled lock)
 *   commit(q):  reserved  -> sold        (purchase)
 * Every operation checks its quantity first and changes nothing when it is
 * rejected; the invariant is verified after every accepted change.
 */

import { ReservationError, RESERVATION_ERROR_CODES } from "./reservationMachine.js";

function isPositiveInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
}

/** Throw if a snapshot breaks the accounting rules. */
export function assertInventoryInvariant(snapshot) {
    const { total, available, reserved, sold } = snapshot;
    for (const [name, value] of Object.entries({ total, available, reserved, sold })) {
        if (!Number.isSafeInteger(value) || value < 0) {
            throw new Error(`Inventory invariant broken: ${name} is ${String(value)}.`);
        }
    }
    if (available + reserved + sold !== total) {
        throw new Error(`Inventory invariant broken: ${available} + ${reserved} + ${sold} ≠ ${total}.`);
    }
}

export function createInventory(total) {
    if (!Number.isSafeInteger(total) || total < 0) {
        throw new TypeError("Inventory: total must be a non-negative integer.");
    }
    const counts = { total, available: total, reserved: 0, sold: 0 };

    function checkQuantity(quantity) {
        if (!isPositiveInteger(quantity)) {
            throw new ReservationError(RESERVATION_ERROR_CODES.INVALID_QUANTITY, "Quantity must be a whole number of 1 or more.");
        }
    }

    function move(from, to, quantity, shortMessage) {
        checkQuantity(quantity);
        if (counts[from] < quantity) {
            throw new ReservationError(RESERVATION_ERROR_CODES.INSUFFICIENT_STOCK, shortMessage(counts[from]));
        }
        counts[from] -= quantity;
        counts[to] += quantity;
        assertInventoryInvariant(counts);
        return snapshot();
    }

    function snapshot() {
        return Object.freeze({ ...counts });
    }

    return Object.freeze({
        reserve: (quantity) => move("available", "reserved", quantity,
            (left) => (left === 0 ? "Sold out: no units are available." : `Only ${left} ${left === 1 ? "unit is" : "units are"} available.`)),
        release: (quantity) => move("reserved", "available", quantity,
            (held) => `Cannot release more than the ${held} reserved units.`),
        commit: (quantity) => move("reserved", "sold", quantity,
            (held) => `Cannot sell more than the ${held} reserved units.`),
        snapshot
    });
}
