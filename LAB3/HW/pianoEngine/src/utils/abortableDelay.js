/**
 * Polyphonic Piano Engine — T-02D abortable delay
 *
 * A setTimeout wrapped in a Promise that an AbortSignal can cut short:
 *
 *   resolves  after `ms` milliseconds;
 *   rejects   with DOMException("Playback cancelled", "AbortError") at once
 *             if the signal is already aborted, or the moment it aborts.
 *
 * Either way the timer and the abort listener are both removed, so a
 * cancelled wait leaves nothing behind (no timer firing later, no listener
 * keeping the promise alive on a long-lived signal). This is the PRD's
 * reference implementation plus argument checks (Project Rule 2).
 */

export const ABORT_MESSAGE = "Playback cancelled";

export function createAbortError() {
    return new DOMException(ABORT_MESSAGE, "AbortError");
}

/** True for the rejection abortableDelay (or any DOM API) uses for cancellation. */
export function isAbortError(error) {
    return error instanceof DOMException && error.name === "AbortError";
}

function isAbortSignal(signal) {
    return signal !== null && typeof signal === "object"
        && typeof signal.aborted === "boolean"
        && typeof signal.addEventListener === "function"
        && typeof signal.removeEventListener === "function";
}

export function abortableDelay(ms, signal) {
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) {
        return Promise.reject(new TypeError(`abortableDelay: ms must be a finite number >= 0, received ${JSON.stringify(ms)}`));
    }
    if (!isAbortSignal(signal)) {
        return Promise.reject(new TypeError("abortableDelay: signal must be an AbortSignal"));
    }
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(createAbortError());
            return;
        }

        const timer = setTimeout(() => {
            cleanup();
            resolve();
        }, ms);

        const cleanup = () => {
            clearTimeout(timer);
            signal.removeEventListener("abort", handleAbort);
        };

        const handleAbort = () => {
            cleanup();
            reject(createAbortError());
        };

        signal.addEventListener("abort", handleAbort, { once: true });
    });
}

export default abortableDelay;
