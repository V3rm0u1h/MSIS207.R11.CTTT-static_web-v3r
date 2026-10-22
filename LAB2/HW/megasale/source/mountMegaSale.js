/**
 * Vietnam Mega-Sale Simulator — T-01 mount and wiring, T-02 countdown
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
 * Countdown (T-02): one zero-drift countdown per mount counts to the sale
 * start while UPCOMING and to the sale end while LIVE. Each tick writes only
 * the <time> text (and only when it changed); the card is re-rendered only
 * when a target is reached and the status changes, and that change is
 * announced in the live region. options.timer passes setInterval,
 * clearInterval and tickMs through to the countdown for tests.
 */

import { renderToDOM } from "../../source/renderToDOM.js";
import { attachRootEventDelegation } from "../../source/events.js";
import { createElement } from "../../source/createElement.js";
import { validateSaleConfig } from "./saleConfig.js";
import { getCampaignStatus, SALE_STATUS } from "./saleStatus.js";
import { createCountdown, formatDuration, remainingMs } from "./countdown.js";
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
    const { now = Date.now, timer = {} } = options;
    if (typeof now !== "function") throw new TypeError("Mega-Sale: options.now must be a function returning epoch milliseconds.");
    if (!isPlainObject(timer)) throw new TypeError("Mega-Sale: options.timer must be a plain object.");

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

    /** The fixed timestamp to count down to in a status, or null when the sale is over. */
    function targetFor(status) {
        if (status === SALE_STATUS.UPCOMING) return config.startsAt;
        if (status === SALE_STATUS.LIVE) return config.endsAt;
        return null;
    }

    function cardTree() {
        const at = readNow();
        const status = getCampaignStatus(config, at);
        const target = targetFor(status);
        renderedStatus = status;
        return ProductCard({
            id,
            config,
            status,
            inventory: state.inventory,
            countdownText: formatDuration(target === null ? 0 : remainingMs(target, at)),
            format,
            onReserve: handleReserve
        });
    }

    let renderedStatus = null;

    let cardElement = renderToDOM(cardTree());
    const statusElement = renderToDOM(createElement("p", {
        id: `${id}-message`,
        className: "sale-message",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true"
    }, ""));
    root.replaceChildren(cardElement, statusElement);
    let countdownElement = cardElement.querySelector("[data-countdown]");

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
        countdownElement = cardElement.querySelector("[data-countdown]");
        if (hadFocus) {
            const button = cardElement.querySelector("[data-action=reserve]");
            // A disabled button cannot hold focus; move it to the product heading.
            (button.disabled ? cardElement.querySelector("h2") : button).focus();
        }
    }

    const countdown = createCountdown({
        ...timer,
        now: readNow,
        getTarget: (at) => targetFor(getCampaignStatus(config, at)),
        onTick(ms) {
            const text = formatDuration(ms);
            // One text write per visible change; no re-render per tick.
            if (countdownElement.textContent !== text) countdownElement.textContent = text;
        },
        onReached() {
            const previous = renderedStatus;
            refresh();
            if (renderedStatus === previous) return;
            setMessage(renderedStatus === SALE_STATUS.LIVE
                ? `The sale is live now. ${config.productName} is ${format.price(config.salePrice)}.`
                : "The sale has ended.");
        }
    });
    countdown.start();

    return Object.freeze({
        ok: true,
        config,
        countdown,
        refresh,
        get status() { return getCampaignStatus(config, readNow()); },
        get inventory() { return state.inventory; },
        dispose() {
            if (!mounted) return;
            mounted = false;
            countdown.dispose();
            root.replaceChildren();
        }
    });
}
