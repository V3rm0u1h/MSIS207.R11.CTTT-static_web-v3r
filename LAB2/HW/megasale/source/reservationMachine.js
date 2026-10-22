/**
 * Vietnam Mega-Sale Simulator — T-03 reservation finite state machine
 *
 * The life of one reservation (not the campaign status). Every allowed move
 * is listed in TRANSITIONS; anything else is rejected by transition().
 *
 *   IDLE --REQUEST--> RESERVING --CONFIRM--> LOCKED --CHECKOUT--> CHECKING_OUT --SUCCEED--> PURCHASED
 *                     RESERVING --FAIL----> IDLE
 *                                           LOCKED --EXPIRE--> EXPIRED
 *                                           LOCKED --CANCEL--> CANCELLED
 *                                                   CHECKING_OUT --CHECKOUT_FAIL--> LOCKED
 *                                                   CHECKING_OUT --EXPIRE--------> EXPIRED
 *
 * PURCHASED, EXPIRED and CANCELLED are terminal: no event leaves them, so an
 * expired or cancelled reservation can never be purchased.
 */

export const RESERVATION_STATE = Object.freeze({
    IDLE: "IDLE",
    RESERVING: "RESERVING",
    LOCKED: "LOCKED",
    CHECKING_OUT: "CHECKING_OUT",
    PURCHASED: "PURCHASED",
    EXPIRED: "EXPIRED",
    CANCELLED: "CANCELLED"
});

export const RESERVATION_EVENT = Object.freeze({
    REQUEST: "REQUEST",
    CONFIRM: "CONFIRM",
    FAIL: "FAIL",
    CHECKOUT: "CHECKOUT",
    CHECKOUT_SUCCEED: "CHECKOUT_SUCCEED",
    CHECKOUT_FAIL: "CHECKOUT_FAIL",
    EXPIRE: "EXPIRE",
    CANCEL: "CANCEL"
});

export const RESERVATION_ERROR_CODES = Object.freeze({
    NOT_LIVE: "not-live",
    SALE_ENDED: "sale-ended",
    INVALID_QUANTITY: "invalid-quantity",
    INSUFFICIENT_STOCK: "insufficient-stock",
    DUPLICATE: "duplicate-reservation",
    NOT_FOUND: "not-found",
    INVALID_TRANSITION: "invalid-transition",
    EXPIRED: "reservation-expired",
    PROCESSING_FAILED: "processing-failed",
    ALREADY_PURCHASED: "already-purchased",
    CHECKOUT_FAILED: "checkout-failed",
    NOT_ELIGIBLE: "not-eligible",
    DISPOSED: "disposed"
});

/** Error with a stable code, so the UI can explain the rejection. */
export class ReservationError extends Error {
    constructor(code, message, options = {}) {
        super(message, options);
        this.name = "ReservationError";
        this.code = code;
    }
}

const S = RESERVATION_STATE;
const E = RESERVATION_EVENT;

/** state -> { event -> next state }. The single source of allowed moves. */
export const TRANSITIONS = Object.freeze({
    [S.IDLE]: Object.freeze({ [E.REQUEST]: S.RESERVING }),
    [S.RESERVING]: Object.freeze({ [E.CONFIRM]: S.LOCKED, [E.FAIL]: S.IDLE }),
    [S.LOCKED]: Object.freeze({ [E.CHECKOUT]: S.CHECKING_OUT, [E.EXPIRE]: S.EXPIRED, [E.CANCEL]: S.CANCELLED }),
    [S.CHECKING_OUT]: Object.freeze({ [E.CHECKOUT_SUCCEED]: S.PURCHASED, [E.CHECKOUT_FAIL]: S.LOCKED, [E.EXPIRE]: S.EXPIRED }),
    [S.PURCHASED]: Object.freeze({}),
    [S.EXPIRED]: Object.freeze({}),
    [S.CANCELLED]: Object.freeze({})
});

/** States that hold stock (or are about to): at most one per shopper. */
const ACTIVE_STATES = new Set([S.RESERVING, S.LOCKED, S.CHECKING_OUT]);
const TERMINAL_STATES = new Set([S.PURCHASED, S.EXPIRED, S.CANCELLED]);

export function isActiveState(state) { return ACTIVE_STATES.has(state); }
export function isTerminalState(state) { return TERMINAL_STATES.has(state); }

/** True when event is allowed in state. Unknown states or events are never allowed. */
export function canTransition(state, event) {
    return Object.hasOwn(TRANSITIONS, state) && Object.hasOwn(TRANSITIONS[state], event);
}

/** Next state for (state, event), or a ReservationError for a move the table does not allow. */
export function transition(state, event) {
    if (!Object.hasOwn(TRANSITIONS, state)) {
        throw new TypeError(`Reservation: unknown state "${String(state)}".`);
    }
    if (!Object.hasOwn(RESERVATION_EVENT, event)) {
        throw new TypeError(`Reservation: unknown event "${String(event)}".`);
    }
    if (!canTransition(state, event)) {
        throw new ReservationError(RESERVATION_ERROR_CODES.INVALID_TRANSITION,
            `A ${state.toLowerCase().replace("_", " ")} reservation cannot ${describeEvent(event)}.`);
    }
    return TRANSITIONS[state][event];
}

function describeEvent(event) {
    switch (event) {
        case E.REQUEST: return "be requested again";
        case E.CONFIRM: return "be confirmed";
        case E.FAIL: return "fail";
        case E.CHECKOUT: return "go to checkout";
        case E.CHECKOUT_SUCCEED: return "be purchased";
        case E.CHECKOUT_FAIL: return "return from checkout";
        case E.EXPIRE: return "expire";
        default: return "be cancelled";
    }
}
