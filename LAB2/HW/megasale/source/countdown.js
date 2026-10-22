/**
 * Vietnam Mega-Sale Simulator — T-02 zero-drift countdown
 *
 * Remaining time is always computed from the wall clock:
 *   remainingMs = Math.max(0, target - now())
 * The interval only decides *when* the display refreshes. Nothing is ever
 * decremented, so a late callback (busy main thread, background-tab
 * throttling, device sleep) shows the correct value on its next run.
 *
 * Lifecycle:
 * - The target is read once from getTarget(now) when the countdown starts
 *   and stays fixed until it is reached. Then onReached(target) runs (the
 *   owner updates the sale status) and getTarget(now) is asked for the next
 *   target, e.g. the sale end after the sale start. null means nothing is
 *   left to count, and the countdown stops itself.
 * - start() while running does nothing, so there is never more than one
 *   interval. stop() clears it; dispose() also refuses later starts.
 */

export const DEFAULT_TICK_MS = 50;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/** Milliseconds left until target at `now`; never negative. */
export function remainingMs(target, now) {
    if (!Number.isFinite(target) || !Number.isFinite(now)) {
        throw new TypeError("Countdown: target and now must be epoch milliseconds.");
    }
    return Math.max(0, target - now);
}

/**
 * Format a duration as HH:MM:SS.mmm. Hours keep growing past 99
 * (e.g. 120:00:00.000); negative input shows 00:00:00.000.
 */
export function formatDuration(ms) {
    if (!Number.isFinite(ms)) throw new TypeError("Countdown: duration must be a finite number of milliseconds.");
    const total = Math.max(0, Math.floor(ms));
    const hours = Math.floor(total / MS_PER_HOUR);
    const minutes = Math.floor((total % MS_PER_HOUR) / MS_PER_MINUTE);
    const seconds = Math.floor((total % MS_PER_MINUTE) / MS_PER_SECOND);
    const millis = total % MS_PER_SECOND;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/**
 * Create a countdown controller.
 *
 * options.getTarget(now)      -> epoch ms to count down to, or null
 * options.onTick(ms, now)     -> called on every update with the remaining time
 * options.onReached(target, now) -> called once when a target is reached
 * now, setInterval, clearInterval and tickMs exist for tests; they default to
 * Date.now, the browser timers and 50 ms.
 */
export function createCountdown(options) {
    if (!isPlainObject(options)) throw new TypeError("Countdown: options must be a plain object.");
    const {
        getTarget,
        onTick,
        onReached = () => {},
        now = Date.now,
        setInterval: setIntervalFn = globalThis.setInterval?.bind(globalThis),
        clearInterval: clearIntervalFn = globalThis.clearInterval?.bind(globalThis),
        tickMs = DEFAULT_TICK_MS
    } = options;
    for (const [name, value] of Object.entries({ getTarget, onTick, onReached, now, setInterval: setIntervalFn, clearInterval: clearIntervalFn })) {
        if (typeof value !== "function") throw new TypeError(`Countdown: ${name} must be a function.`);
    }
    if (!Number.isSafeInteger(tickMs) || tickMs <= 0) throw new TypeError("Countdown: tickMs must be a positive integer.");

    let intervalId = null;
    let target = null;
    let disposed = false;
    let updates = 0;

    function readNow() {
        const value = now();
        if (!Number.isFinite(value)) throw new TypeError("Countdown: now() must return epoch milliseconds.");
        return value;
    }

    function readTarget(at) {
        const value = getTarget(at);
        if (value !== null && !Number.isFinite(value)) throw new TypeError("Countdown: getTarget() must return epoch milliseconds or null.");
        return value;
    }

    function stop() {
        if (intervalId === null) return;
        clearIntervalFn(intervalId);
        intervalId = null;
    }

    /** One refresh: read the clock, show the remaining time, handle arrival. */
    function update() {
        if (disposed || target === null) return;
        const at = readNow();
        const remaining = remainingMs(target, at);
        updates += 1;
        onTick(remaining, at);
        if (remaining > 0) return;
        const reached = target;
        onReached(reached, at);
        if (disposed) return;
        target = readTarget(at);
        if (target === null) stop();
    }

    function start() {
        if (disposed || intervalId !== null) return false;
        const at = readNow();
        target = readTarget(at);
        if (target === null) {
            onTick(0, at);
            return false;
        }
        intervalId = setIntervalFn(update, tickMs);
        update();
        return intervalId !== null;
    }

    function dispose() {
        stop();
        disposed = true;
        target = null;
    }

    return Object.freeze({
        start,
        stop,
        dispose,
        get isRunning() { return intervalId !== null; },
        get target() { return target; },
        /** Number of updates so far (tests and diagnostics). */
        get updateCount() { return updates; }
    });
}
