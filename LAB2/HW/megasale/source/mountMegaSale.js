/**
 * Vietnam Mega-Sale Simulator — T-01 mount and wiring, T-02 countdown,
 * T-03 reservations, T-04 lock countdown, T-05 checkout, T-06 integration
 *
 * Layout inside the mount root:
 *   <article>          product card, re-rendered when the derived view changes
 *   <p role="status">  live region for messages, rendered once
 * or, for an invalid configuration:
 *   <section role="alert">  every configuration problem, and nothing else
 *
 * State is kept per mount in this closure (no module-level store), so two
 * simulators on one page never share data. The campaign status is derived
 * from the config and the injected clock (options.now, default Date.now)
 * every time the card renders.
 *
 * Countdown (T-02): one zero-drift countdown per mount counts to the sale
 * start while UPCOMING and to the sale end while LIVE. Each tick writes only
 * the <time> text (and only when it changed); the card is re-rendered only
 * when a target is reached and the status changes, and that change is
 * announced in the live region. options.timer passes setInterval,
 * clearInterval and tickMs through to the countdown for tests.
 *
 * Reservations (T-03): stock and reservations live in one reservation store
 * (the authoritative in-memory controller). The UI never changes counts
 * itself: it calls store.reserve() / store.cancel() and re-renders the card
 * from the store's snapshots whenever the store reports a change. Outcomes
 * and rejections are announced in the live region. options.processReservation
 * and options.createId are passed to the store for tests.
 *
 * Locks (T-04): the store expires locks itself (one timer per lock, checked
 * against the clock). The card shows the time left on the active lock with a
 * second zero-drift countdown that only displays; when it reaches the lock's
 * expiresAt it asks the store to expireIfDue() that same reservation, which
 * is harmless if the store's timer already did. options.timer.setTimeout and
 * clearTimeout are passed to the store for tests.
 *
 * Checkout (T-05): the Checkout button calls store.checkout(id). The store
 * runs the eligibility checks, the simulated payment and the final
 * reserved -> sold move; the card follows its state (the button is disabled
 * while CHECKING_OUT) and the live region reports in progress, purchase,
 * expired, failed and cancelled outcomes. options.processCheckout is passed
 * to the store (tests, and the demo's "failed payment" switch).
 *
 * Integration (T-06):
 * - Everything shown comes from the store: stock, the active reservation and
 *   the purchase confirmation (kept as a reservation id and read back from
 *   the store), so the UI cannot hold a copy that disagrees with it.
 * - When the tab becomes visible again, due locks are expired at once
 *   (store.sweepExpired) instead of waiting for throttled timers. The
 *   visibilitychange listener is removed on dispose.
 * - When the sale ends while the shopper holds a lock, the announcement says
 *   the reservation is still held and until when; checkout stays possible
 *   until the lock's own expiry.
 */

import { renderToDOM } from "../../source/renderToDOM.js";
import { attachRootEventDelegation } from "../../source/events.js";
import { createElement } from "../../source/createElement.js";
import { validateSaleConfig } from "./saleConfig.js";
import { getCampaignStatus, SALE_STATUS } from "./saleStatus.js";
import { createCountdown, formatDuration, remainingMs } from "./countdown.js";
import { createReservationStore } from "./reservationStore.js";
import { ReservationError, RESERVATION_EVENT, RESERVATION_STATE } from "./reservationMachine.js";
import { ProductCard, ConfigErrorView, createFormatters, units } from "./productCard.js";

const ID_PATTERN = /^[a-z0-9-]+$/;
const SHOPPER_ID = "you";
const LOCKED_STATES = new Set([RESERVATION_STATE.LOCKED, RESERVATION_STATE.CHECKING_OUT]);

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
    const { now = Date.now, timer = {}, processReservation, processCheckout, createId } = options;
    if (typeof now !== "function") throw new TypeError("Mega-Sale: options.now must be a function returning epoch milliseconds.");
    if (!isPlainObject(timer)) throw new TypeError("Mega-Sale: options.timer must be a plain object.");
    if (processReservation !== undefined && typeof processReservation !== "function") {
        throw new TypeError("Mega-Sale: options.processReservation must be a function.");
    }
    if (processCheckout !== undefined && typeof processCheckout !== "function") {
        throw new TypeError("Mega-Sale: options.processCheckout must be a function.");
    }
    if (createId !== undefined && typeof createId !== "function") {
        throw new TypeError("Mega-Sale: options.createId must be a function.");
    }

    attachRootEventDelegation(root, ["click", "submit", "input"]);

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
    // The quantity field's text, kept as typed so a re-render does not reset it.
    // lastPurchaseId: the shopper's latest purchase, shown as a confirmation (read from the store).
    const state = { quantity: "1", lastPurchaseId: null };
    let mounted = true;

    function readNow() {
        const value = now();
        if (!Number.isFinite(value)) throw new TypeError("Mega-Sale: options.now must return epoch milliseconds.");
        return value;
    }

    const store = createReservationStore({
        config,
        now: readNow,
        ...(processReservation ? { process: processReservation } : {}),
        ...(processCheckout ? { processCheckout } : {}),
        ...(createId ? { createId } : {}),
        ...(timer.setTimeout ? { setTimeout: timer.setTimeout } : {}),
        ...(timer.clearTimeout ? { clearTimeout: timer.clearTimeout } : {})
    });

    function describeError(error) {
        if (error instanceof ReservationError) return error.message;
        console.error(error);
        return "Something went wrong. Please try again.";
    }

    async function handleReserveSubmit(event) {
        event.preventDefault();
        const field = event.target.elements.quantity;
        state.quantity = field.value;
        // An empty or non-numeric field becomes NaN, which the store rejects.
        const quantity = field.value.trim() === "" ? Number.NaN : Number(field.value);
        setMessage(Number.isSafeInteger(quantity) && quantity > 0 ? `Reserving ${units(quantity)}…` : "");
        try {
            const reservation = await store.reserve({ quantity, shopperId: SHOPPER_ID });
            if (!mounted) return;
            setMessage(`Reserved ${units(reservation.quantity)} until ${format.timeWithSeconds(reservation.expiresAt)}. ` +
                "Complete checkout before then.");
        } catch (error) {
            if (!mounted) return;
            setMessage(`Could not reserve: ${describeError(error)}`);
        }
    }

    function handleQuantityInput(event) {
        state.quantity = event.target.value;
    }

    async function handleCheckout() {
        const active = store.activeFor(SHOPPER_ID);
        if (!active) return;
        setMessage(`Processing payment for ${units(active.quantity)}…`);
        try {
            const purchase = await store.checkout(active.id);
            if (!mounted) return;
            setMessage(`Purchase confirmed: ${units(purchase.quantity)} for ${format.price(purchase.quantity * config.salePrice)}.`);
        } catch (error) {
            if (!mounted) return;
            setMessage(`Checkout failed: ${describeError(error)}`);
        }
    }

    function handleCancel() {
        const active = store.activeFor(SHOPPER_ID);
        if (!active) return;
        try {
            const cancelled = store.cancel(active.id);
            setMessage(`Reservation cancelled. ${units(cancelled.quantity)} went back to available stock.`);
        } catch (error) {
            setMessage(`Could not cancel: ${describeError(error)}`);
        }
    }

    /** The fixed timestamp to count down to in a status, or null when the sale is over. */
    function targetFor(status) {
        if (status === SALE_STATUS.UPCOMING) return config.startsAt;
        if (status === SALE_STATUS.LIVE) return config.endsAt;
        return null;
    }

    /** The active reservation's lock end, while it still holds stock. */
    function lockEnd(reservation) {
        return reservation && LOCKED_STATES.has(reservation.state) ? reservation.expiresAt : null;
    }

    function cardTree() {
        const at = readNow();
        const status = getCampaignStatus(config, at);
        const target = targetFor(status);
        const reservation = store.activeFor(SHOPPER_ID);
        const lockAt = lockEnd(reservation);
        renderedStatus = status;
        return ProductCard({
            id,
            config,
            status,
            inventory: store.inventory,
            countdownText: formatDuration(target === null ? 0 : remainingMs(target, at)),
            reservation,
            lockText: formatDuration(lockAt === null ? 0 : remainingMs(lockAt, at)),
            purchase: state.lastPurchaseId === null ? null : store.get(state.lastPurchaseId),
            quantity: state.quantity,
            format,
            onReserveSubmit: handleReserveSubmit,
            onQuantityInput: handleQuantityInput,
            onCheckout: handleCheckout,
            onCancel: handleCancel
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
    let lockCountdownElement = cardElement.querySelector("[data-lock-countdown]");

    function setMessage(text) {
        statusElement.textContent = text;
    }

    /**
     * Re-derive the view and replace the card. Focus goes back to the same
     * control (by data-focus), else the first enabled control, else the heading.
     */
    function refresh() {
        if (!mounted) return;
        const active = document.activeElement;
        const hadFocus = cardElement.contains(active);
        const focusKey = hadFocus ? active.dataset.focus ?? null : null;
        const next = renderToDOM(cardTree());
        cardElement.replaceWith(next);
        cardElement = next;
        countdownElement = cardElement.querySelector("[data-countdown]");
        lockCountdownElement = cardElement.querySelector("[data-lock-countdown]");
        if (!hadFocus) return;
        const same = focusKey === null ? null : cardElement.querySelector(`[data-focus="${focusKey}"]`);
        const target = (same && !same.disabled ? same : null) ??
            cardElement.querySelector("[data-focus]:not(:disabled)") ??
            cardElement.querySelector("h2");
        target.focus();
    }

    // Display-only countdown for the active lock. lockTarget remembers which
    // reservation it counts for, so reaching zero can only expire that one.
    let lockTarget = null;
    const lockCountdown = createCountdown({
        ...timer,
        now: readNow,
        getTarget(at) {
            const reservation = store.activeFor(SHOPPER_ID);
            const end = lockEnd(reservation);
            lockTarget = end !== null && end > at ? { id: reservation.id, expiresAt: end } : null;
            return lockTarget ? lockTarget.expiresAt : null;
        },
        onTick(ms) {
            if (!lockCountdownElement) return;
            const text = formatDuration(ms);
            if (lockCountdownElement.textContent !== text) lockCountdownElement.textContent = text;
        },
        onReached(target) {
            const reached = lockTarget;
            if (!reached || reached.expiresAt !== target) return;
            store.expireIfDue(reached.id);
        }
    });

    // Every accepted reservation change re-renders the card from the store and
    // restarts the lock countdown for whatever reservation is now active.
    const unsubscribe = store.subscribe((change) => {
        if (change.reservation.shopperId === SHOPPER_ID) {
            // The confirmation shows the latest purchase until a new reservation starts.
            if (change.type === RESERVATION_EVENT.CHECKOUT_SUCCEED) state.lastPurchaseId = change.reservation.id;
            if (change.type === RESERVATION_EVENT.REQUEST) state.lastPurchaseId = null;
        }
        refresh();
        if (change.type === RESERVATION_EVENT.EXPIRE && change.reservation.shopperId === SHOPPER_ID) {
            setMessage(`Your reservation expired. ${units(change.reservation.quantity)} went back to available stock.`);
        }
        lockCountdown.stop();
        lockCountdown.start();
    });

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
            if (renderedStatus === SALE_STATUS.LIVE) {
                setMessage(`The sale is live now. ${config.productName} is ${format.price(config.salePrice)}.`);
                return;
            }
            const held = store.activeFor(SHOPPER_ID);
            setMessage(held && held.expiresAt !== null
                ? `The sale has ended. Your reservation of ${units(held.quantity)} is still held until ` +
                    `${format.timeWithSeconds(held.expiresAt)}; you can still check out.`
                : "The sale has ended.");
        }
    });
    countdown.start();

    // Back from a hidden tab: timers may have been throttled, so check the locks now.
    function handleVisibilityChange() {
        if (!mounted || document.visibilityState === "hidden") return;
        store.sweepExpired();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return Object.freeze({
        ok: true,
        config,
        countdown,
        store,
        refresh,
        get status() { return getCampaignStatus(config, readNow()); },
        get inventory() { return store.inventory; },
        dispose() {
            if (!mounted) return;
            mounted = false;
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            countdown.dispose();
            lockCountdown.dispose();
            unsubscribe();
            store.dispose();
            root.replaceChildren();
        }
    });
}
