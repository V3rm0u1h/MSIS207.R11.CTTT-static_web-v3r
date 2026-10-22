/**
 * Vietnam Mega-Sale Simulator — T-01 product card and error view
 *
 * Pure VNode builders: they take ready-made data and return a tree for
 * renderToDOM. No state, no timers, no DOM access.
 *
 * Card markup:
 *   <article>  labelled by the product heading
 *     <p>      campaign name
 *     <h2>     product name (tabindex -1: focus target when the button turns disabled)
 *     <dl>     original price (<del>), sale price (<strong>) with discount,
 *              available units (<output>), status (<output>), sale window (<time>)
 *     <button> primary action, label and disabled state follow the status
 *
 * Prices are told apart by text, not only by styling: each one has its own
 * <dt> label ("Original price", "Sale price"), because screen readers do not
 * announce <del> by default.
 */

import { createElement } from "../../source/createElement.js";
import { SALE_STATUS, SALE_STATUS_LABELS } from "./saleStatus.js";
import { CURRENCY, DEFAULT_LOCALE, discountPercent } from "./saleConfig.js";

/** Formatters for one campaign; create once per mount, not per render. */
export function createFormatters(timeZone) {
    const price = new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: CURRENCY });
    const dateTime = new Intl.DateTimeFormat(DEFAULT_LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone });
    const time = new Intl.DateTimeFormat(DEFAULT_LOCALE, { timeStyle: "short", timeZone });
    return Object.freeze({
        price: (value) => price.format(value),
        dateTime: (epochMs) => dateTime.format(epochMs),
        time: (epochMs) => time.format(epochMs)
    });
}

/** Label and enabled state of the primary button for a status. */
export function primaryAction(status, inventory, config, format) {
    if (status === SALE_STATUS.UPCOMING) return { label: `Opens at ${format.time(config.startsAt)}`, disabled: true };
    if (status === SALE_STATUS.ENDED) return { label: "Sale ended", disabled: true };
    if (inventory === 0) return { label: "Sold out", disabled: true };
    return { label: "Reserve now", disabled: false };
}

function term(label, ...details) {
    return [createElement("dt", null, label), createElement("dd", null, ...details)];
}

/**
 * view: { id, config, status, inventory, format, onReserve }
 * config must already be validated.
 */
export function ProductCard(view) {
    const { id, config, status, inventory, format, onReserve } = view;
    const headingId = `${id}-product`;
    const action = primaryAction(status, inventory, config, format);
    return createElement("article", { className: "sale-card", "aria-labelledby": headingId, "data-status": status },
        createElement("p", { className: "sale-card__campaign", lang: "vi" }, config.campaignName),
        createElement("h2", { id: headingId, className: "sale-card__name", lang: "vi", tabindex: "-1" }, config.productName),
        createElement("dl", { className: "sale-card__facts" },
            term("Original price", createElement("del", { className: "sale-card__original" }, format.price(config.originalPrice))),
            term("Sale price",
                createElement("strong", { className: "sale-card__price" }, format.price(config.salePrice)),
                ` (${discountPercent(config)}% off)`
            ),
            term("Available", createElement("output", { "data-inventory": "" }, String(inventory)), ` of ${config.initialInventory} units`),
            term("Status", createElement("output", { className: "sale-card__status", "data-status-label": "" }, SALE_STATUS_LABELS[status])),
            term("Sale window",
                createElement("time", { datetime: new Date(config.startsAt).toISOString() }, format.dateTime(config.startsAt)),
                " – ",
                createElement("time", { datetime: new Date(config.endsAt).toISOString() }, format.dateTime(config.endsAt))
            )
        ),
        createElement("button", {
            type: "button",
            className: "sale-card__action",
            "data-action": "reserve",
            disabled: action.disabled,
            onClick: onReserve
        }, action.label)
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
