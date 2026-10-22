/**
 * Vietnam Mega-Sale Simulator — T-01 product card and error view, T-02 countdown
 * line, T-03 stock buckets, reserve form and reservation panel, T-04 lock countdown,
 * T-05 checkout button and purchase confirmation
 *
 * Pure VNode builders: they take ready-made data and return a tree for
 * renderToDOM. No state, no timers, no DOM access.
 *
 * Card markup:
 *   <article>  labelled by the product heading
 *     <p>      campaign name
 *     <h2>     product name (tabindex -1: focus target when the button turns disabled)
 *     <p>      countdown: label + <time role="timer"> (HH:MM:SS.mmm). The timer
 *              role is not a live region, so 20 updates a second are never read out
 *     <dl>     original price (<del>), sale price (<strong>) with discount,
 *              available / reserved / sold units (<output>), status (<output>),
 *              sale window (<time>)
 *     one of:
 *       <form>     LIVE, stock left, no active reservation: labelled quantity
 *                  field and a submit button "Reserve now"
 *       <section>  an active reservation: id, state, quantity, total, lock end,
 *                  time left on the lock (<time role="timer">), Checkout, Cancel
 *     <section>    after a purchase: the confirmation (order, quantity, total,
 *                  time), shown until the next reservation request
 *       <button>   otherwise: disabled, label says why (opens at…, sold out, ended)
 *
 * Elements that can hold focus carry data-focus, so the mount can put focus
 * back on the same control (or the next sensible one) after a re-render.
 *
 * Prices are told apart by text, not only by styling: each one has its own
 * <dt> label ("Original price", "Sale price"), because screen readers do not
 * announce <del> by default.
 */

import { createElement } from "../../source/createElement.js";
import { SALE_STATUS, SALE_STATUS_LABELS } from "./saleStatus.js";
import { RESERVATION_STATE, isActiveState } from "./reservationMachine.js";
import { CURRENCY, DEFAULT_LOCALE, discountPercent } from "./saleConfig.js";

/** Formatters for one campaign; create once per mount, not per render. */
export function createFormatters(timeZone) {
    const price = new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: CURRENCY });
    const dateTime = new Intl.DateTimeFormat(DEFAULT_LOCALE, { dateStyle: "medium", timeStyle: "medium", timeZone });
    const time = new Intl.DateTimeFormat(DEFAULT_LOCALE, { timeStyle: "short", timeZone });
    const timeWithSeconds = new Intl.DateTimeFormat(DEFAULT_LOCALE, { timeStyle: "medium", timeZone });
    return Object.freeze({
        price: (value) => price.format(value),
        dateTime: (epochMs) => dateTime.format(epochMs),
        time: (epochMs) => time.format(epochMs),
        timeWithSeconds: (epochMs) => timeWithSeconds.format(epochMs)
    });
}

export const COUNTDOWN_LABELS = Object.freeze({
    [SALE_STATUS.UPCOMING]: "Sale starts in",
    [SALE_STATUS.LIVE]: "Sale ends in",
    [SALE_STATUS.ENDED]: "Sale ended"
});

export const RESERVATION_STATE_LABELS = Object.freeze({
    [RESERVATION_STATE.IDLE]: "Not reserved",
    [RESERVATION_STATE.RESERVING]: "Reserving…",
    [RESERVATION_STATE.LOCKED]: "Reserved (locked)",
    [RESERVATION_STATE.CHECKING_OUT]: "Checking out…",
    [RESERVATION_STATE.PURCHASED]: "Purchased",
    [RESERVATION_STATE.EXPIRED]: "Expired",
    [RESERVATION_STATE.CANCELLED]: "Cancelled"
});

/** Label and enabled state of the primary button for a status and the units available. */
export function primaryAction(status, available, config, format) {
    if (status === SALE_STATUS.UPCOMING) return { label: `Opens at ${format.time(config.startsAt)}`, disabled: true };
    if (status === SALE_STATUS.ENDED) return { label: "Sale ended", disabled: true };
    if (available === 0) return { label: "Sold out", disabled: true };
    return { label: "Reserve now", disabled: false };
}

export function units(count) {
    return `${count} ${count === 1 ? "unit" : "units"}`;
}

/** The shopper's active reservation. */
function ReservationPanel({ id, config, reservation, lockText, format, onCheckout, onCancel }) {
    const headingId = `${id}-reservation`;
    const { state } = reservation;
    const checkingOut = state === RESERVATION_STATE.CHECKING_OUT;
    return createElement("section", { className: "sale-reservation", "aria-labelledby": headingId, "data-reservation-id": reservation.id },
        createElement("h3", { id: headingId }, "Your reservation"),
        createElement("dl", { className: "sale-card__facts" },
            term("Reservation", createElement("code", null, reservation.id.slice(0, 8))),
            term("State", createElement("output", { "data-reservation-state": state }, RESERVATION_STATE_LABELS[state])),
            term("Quantity", units(reservation.quantity)),
            term("Total", format.price(reservation.quantity * config.salePrice)),
            reservation.expiresAt === null
                ? null
                : term("Locked until", createElement("time", { datetime: new Date(reservation.expiresAt).toISOString() }, format.timeWithSeconds(reservation.expiresAt)))
        ),
        reservation.expiresAt === null
            ? null
            : createElement("p", { className: "sale-lock" },
                "Lock expires in ",
                createElement("time", { className: "sale-lock__time", role: "timer", "aria-atomic": "true", "data-lock-countdown": "" }, lockText)
            ),
        createElement("p", { className: "sale-reservation__actions" },
            // Enabled only while LOCKED: disabled the moment checkout starts, so a
            // second click cannot submit the same reservation again.
            createElement("button", {
                type: "button",
                className: "sale-card__action",
                "data-action": "checkout",
                "data-focus": "checkout",
                disabled: state !== RESERVATION_STATE.LOCKED,
                onClick: onCheckout
            }, checkingOut ? "Processing payment…" : "Checkout"),
            " ",
            createElement("button", {
                type: "button",
                className: "sale-card__secondary",
                "data-action": "cancel",
                "data-focus": "cancel",
                disabled: state !== RESERVATION_STATE.LOCKED,
                onClick: onCancel
            }, "Cancel reservation")
        )
    );
}

/** Shown after a purchase until the shopper starts a new reservation. */
function PurchaseConfirmation({ id, config, purchase, format }) {
    const headingId = `${id}-purchase`;
    return createElement("section", { className: "sale-confirmation", "aria-labelledby": headingId, "data-purchase-id": purchase.id },
        createElement("h3", { id: headingId }, "Purchase confirmed"),
        createElement("dl", { className: "sale-card__facts" },
            term("Order", createElement("code", null, purchase.id.slice(0, 8))),
            term("Quantity", units(purchase.quantity)),
            term("Total paid", format.price(purchase.quantity * config.salePrice)),
            term("Purchased at", createElement("time", { datetime: new Date(purchase.purchasedAt).toISOString() }, format.timeWithSeconds(purchase.purchasedAt)))
        )
    );
}

/** Quantity field and submit button; the field keeps what the shopper typed across re-renders. */
function ReserveForm({ id, available, quantity, onSubmit, onQuantityInput }) {
    const fieldId = `${id}-quantity`;
    return createElement("form", { className: "sale-reserve", "data-action": "reserve-form", onSubmit },
        createElement("label", { for: fieldId }, "Quantity"),
        createElement("input", {
            id: fieldId,
            type: "number",
            name: "quantity",
            min: 1,
            max: available,
            step: 1,
            value: quantity,
            required: true,
            "data-focus": "quantity",
            onInput: onQuantityInput
        }),
        createElement("button", { type: "submit", className: "sale-card__action", "data-action": "reserve", "data-focus": "reserve" }, "Reserve now")
    );
}

function ActionArea(view) {
    const { id, config, status, inventory, reservation, lockText, quantity, format, onReserveSubmit, onQuantityInput, onCheckout, onCancel } = view;
    if (reservation && isActiveState(reservation.state)) {
        return ReservationPanel({ id, config, reservation, lockText, format, onCheckout, onCancel });
    }
    const action = primaryAction(status, inventory.available, config, format);
    if (!action.disabled) {
        return ReserveForm({ id, available: inventory.available, quantity, onSubmit: onReserveSubmit, onQuantityInput });
    }
    return createElement("button", {
        type: "button",
        className: "sale-card__action",
        "data-action": "reserve",
        "data-focus": "reserve",
        disabled: true
    }, action.label);
}

function term(label, ...details) {
    return [createElement("dt", null, label), createElement("dd", null, ...details)];
}

/**
 * view: { id, config, status, inventory, countdownText, reservation, lockText,
 *         purchase, quantity, format, onReserveSubmit, onQuantityInput,
 *         onCheckout, onCancel }
 * config must already be validated; inventory is { total, available, reserved, sold };
 * reservation is the shopper's active reservation snapshot or null.
 */
export function ProductCard(view) {
    const { id, config, status, inventory, countdownText, format } = view;
    const headingId = `${id}-product`;
    return createElement("article", { className: "sale-card", "aria-labelledby": headingId, "data-status": status },
        createElement("p", { className: "sale-card__campaign", lang: "vi" }, config.campaignName),
        createElement("h2", { id: headingId, className: "sale-card__name", lang: "vi", tabindex: "-1" }, config.productName),
        createElement("p", { className: "sale-countdown" },
            `${COUNTDOWN_LABELS[status]} `,
            createElement("time", { className: "sale-countdown__time", role: "timer", "aria-atomic": "true", "data-countdown": "" }, countdownText)
        ),
        createElement("dl", { className: "sale-card__facts" },
            term("Original price", createElement("del", { className: "sale-card__original" }, format.price(config.originalPrice))),
            term("Sale price",
                createElement("strong", { className: "sale-card__price" }, format.price(config.salePrice)),
                ` (${discountPercent(config)}% off)`
            ),
            term("Available", createElement("output", { "data-inventory": "available" }, String(inventory.available)), ` of ${inventory.total} units`),
            term("Reserved", createElement("output", { "data-inventory": "reserved" }, String(inventory.reserved))),
            term("Sold", createElement("output", { "data-inventory": "sold" }, String(inventory.sold))),
            term("Status", createElement("output", { className: "sale-card__status", "data-status-label": "" }, SALE_STATUS_LABELS[status])),
            term("Sale window",
                createElement("time", { datetime: new Date(config.startsAt).toISOString() }, format.dateTime(config.startsAt)),
                " – ",
                createElement("time", { datetime: new Date(config.endsAt).toISOString() }, format.dateTime(config.endsAt))
            )
        ),
        view.purchase ? PurchaseConfirmation({ id, config, purchase: view.purchase, format }) : null,
        ActionArea(view)
    );
}

/** Shown instead of the card when the configuration is invalid. */
export function ConfigErrorView({ id, errors }) {
    const headingId = `${id}-config-error`;
    return createElement("section", { className: "sale-error", role: "alert", "aria-labelledby": headingId },
        createElement("h2", { id: headingId }, "The sale cannot be shown"),
        createElement("p", null, "The campaign configuration has these problems:"),
        createElement("ul", null, errors.map((message) => createElement("li", null, message)))
    );
}
