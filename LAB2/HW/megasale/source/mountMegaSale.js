/**
 * Vietnam Mega-Sale Simulator — T-01 mount and wiring
 *
 * Layout inside the mount root:
 *   <article>          product card, re-rendered when the derived view changes
 *   <p role="status">  live region for messages, rendered once
 * or, for an invalid configuration:
 *   <section role="alert">  every configuration problem, and nothing else
 *
 * State is kept per mount in this closure (no module-level store), so two
 * simulators on one page never share data. The only stored sale value is the
 * inventory; the status is derived from the config and the injected clock
 * (options.now, default Date.now) every time the card renders.
 *
 * T-01 has no timer: refresh() re-derives the status on demand. The timer,
 * reservations and checkout arrive in later milestones.
 */

import { renderToDOM } from "../../source/renderToDOM.js";
import { attachRootEventDelegation } from "../../source/events.js";
import { createElement } from "../../source/createElement.js";
import { validateSaleConfig } from "./saleConfig.js";
import { getCampaignStatus } from "./saleStatus.js";
import { ProductCard, ConfigErrorView, createFormatters } from "./productCard.js";

const ID_PATTERN = /^[a-z0-9-]+$/;

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/**
 * Mount the simulator into root. Argument types are checked before root is
 * touched; configuration values are validated and shown as an error view
 * instead of throwing. Returns a handle; handle.ok is false for a bad config.
 */
export function mountMegaSale(root, props, options = {}) {
    if (!root || root.nodeType !== 1 || typeof root.replaceChildren !== "function") {
        throw new TypeError("Mega-Sale: mount root must be a valid DOM element.");
    }
    if (!isPlainObject(props)) throw new TypeError("Mega-Sale: props must be a plain object.");
    if (!isPlainObject(options)) throw new TypeError("Mega-Sale: options must be a plain object.");
    const { id = "mega-sale", config: rawConfig } = props;
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
        throw new TypeError("Mega-Sale: id must use lowercase letters, digits and hyphens.");
    }
    const { now = Date.now } = options;
    if (typeof now !== "function") throw new TypeError("Mega-Sale: options.now must be a function returning epoch milliseconds.");

    attachRootEventDelegation(root, ["click"]);

    const result = validateSaleConfig(rawConfig);
    if (!result.ok) {
        root.replaceChildren(renderToDOM(ConfigErrorView({ id, errors: result.errors })));
        return Object.freeze({
            ok: false,
            errors: Object.freeze([...result.errors]),
            refresh() {},
            dispose() { root.replaceChildren(); }
        });
    }

    const { config } = result;
    const format = createFormatters(config.timeZone);
    const state = { inventory: config.initialInventory };
    let mounted = true;

    function readNow() {
        const value = now();
        if (!Number.isFinite(value)) throw new TypeError("Mega-Sale: options.now must return epoch milliseconds.");
        return value;
    }

    function handleReserve() {
        setMessage("Reservations are not available in this version yet.");
    }

    function cardTree() {
        return ProductCard({
            id,
            config,
            status: getCampaignStatus(config, readNow()),
            inventory: state.inventory,
            format,
            onReserve: handleReserve
        });
    }

    let cardElement = renderToDOM(cardTree());
    const statusElement = renderToDOM(createElement("p", {
        id: `${id}-message`,
        className: "sale-message",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true"
    }, ""));
    root.replaceChildren(cardElement, statusElement);

    function setMessage(text) {
        statusElement.textContent = text;
    }

    /** Re-derive the status and replace the card; keeps focus on the button. */
    function refresh() {
        if (!mounted) return;
        const hadFocus = cardElement.contains(document.activeElement);
        const next = renderToDOM(cardTree());
        cardElement.replaceWith(next);
        cardElement = next;
        if (hadFocus) {
            const button = cardElement.querySelector("[data-action=reserve]");
            // A disabled button cannot hold focus; move it to the product heading.
            (button.disabled ? cardElement.querySelector("h2") : button).focus();
        }
    }

    return Object.freeze({
        ok: true,
        config,
        refresh,
        get status() { return getCampaignStatus(config, readNow()); },
        get inventory() { return state.inventory; },
        dispose() {
            if (!mounted) return;
            mounted = false;
            root.replaceChildren();
        }
    });
}
