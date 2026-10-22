/**
 * Mini-React Audio Engine — T-02 FIFO loading queue, T-03 cancellation
 *
 * DOM-free job scheduler. Jobs start in the order they are accepted, one at
 * a time (MAX_ACTIVE_JOBS = 1), so no two jobs' downloads and decodes run in
 * parallel, with one exception: a cancelled job's decode may still finish
 * in the background (see Cancellation). A job's run() owns its whole
 * download -> decode lifecycle; for
 * audio that is engine.load(url) from T-01.
 *
 * Job lifecycle:
 *   QUEUED -> RUNNING -> SUCCESS | ERROR
 *   QUEUED | RUNNING -> CANCELLED  (cancel / cancelAll / clearPending / dispose)
 * Terminal jobs leave the pending list and the active slot immediately; only
 * outcome counters and a short history are kept for reporting.
 *
 * Cancellation (T-03): every job owns an AbortController and run() gets its
 * signal. Cancelling a RUNNING job aborts that signal and frees the slot at
 * once, so the next job can start; whatever run() later resolves or rejects
 * with is stale and ignored. Work that cannot be aborted (decodeAudioData)
 * may still finish in the background, but its result is never used.
 */

export const JOB_STATUS = Object.freeze({
    QUEUED: "QUEUED",
    RUNNING: "RUNNING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
    CANCELLED: "CANCELLED"
});

/** One active job keeps FIFO order strict: start order equals finish order. */
export const MAX_ACTIVE_JOBS = 1;
export const DEFAULT_HISTORY_LIMIT = 20;

const CHANGE_TYPES = Object.freeze({
    [JOB_STATUS.SUCCESS]: "succeeded",
    [JOB_STATUS.ERROR]: "failed",
    [JOB_STATUS.CANCELLED]: "cancelled"
});

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/** Public, immutable view of a job. The run callback is never exposed. */
function toSnapshot(job, { withResult = true } = {}) {
    return Object.freeze({
        id: job.id,
        key: job.key,
        label: job.label,
        status: job.status,
        result: withResult ? job.result : undefined,
        error: job.error
    });
}

export function createJobQueue(options = {}) {
    if (!isPlainObject(options)) {
        throw new TypeError("Job queue: options must be a plain object.");
    }
    const { historyLimit = DEFAULT_HISTORY_LIMIT } = options;
    if (!Number.isSafeInteger(historyLimit) || historyLimit < 0) {
        throw new TypeError("Job queue: historyLimit must be a non-negative integer.");
    }

    const pending = [];
    const history = [];
    const subscribers = new Set();
    const counts = { success: 0, error: 0, cancelled: 0 };
    let active = null;
    let nextId = 1;
    let disposed = false;

    function getQueueStatus() {
        return Object.freeze({
            pending: pending.length,
            active: active ? 1 : 0,
            maxActive: MAX_ACTIVE_JOBS,
            current: active ? toSnapshot(active) : null,
            pendingJobs: Object.freeze(pending.map(toSnapshot)),
            success: counts.success,
            error: counts.error,
            cancelled: counts.cancelled,
            history: Object.freeze([...history])
        });
    }

    /** One notification per visible change, not per internal step. */
    function notify(change) {
        if (subscribers.size === 0) return;
        const status = getQueueStatus();
        for (const subscriber of [...subscribers]) subscriber(status, change);
    }

    function finish(job, status, { result, error } = {}) {
        job.status = status;
        job.result = result;
        job.error = error;
        if (status === JOB_STATUS.SUCCESS) counts.success += 1;
        else if (status === JOB_STATUS.ERROR) counts.error += 1;
        else counts.cancelled += 1;
        const snapshot = toSnapshot(job);
        // History must not keep large results (decoded AudioBuffers) alive.
        history.push(toSnapshot(job, { withResult: false }));
        if (history.length > historyLimit) history.splice(0, history.length - historyLimit);
        job.settle(snapshot);
        // The queue drops its own references; the caller owns the result now.
        job.result = undefined;
        job.run = null;
        job.settle = null;
        return snapshot;
    }

    /**
     * Accept a job. Returns its id and a promise that resolves to the final
     * snapshot. The promise never rejects: failures are reported through
     * snapshot.status === ERROR and snapshot.error, so nothing is lost to an
     * unhandled rejection.
     */
    function enqueue(job) {
        if (disposed) throw new TypeError("Job queue: the queue has been disposed.");
        if (!isPlainObject(job)) throw new TypeError("Job queue: job must be a plain object.");
        const { run, label, key = null } = job;
        if (typeof run !== "function") throw new TypeError("Job queue: job.run must be a function.");
        if (typeof label !== "string" || label.trim() === "") {
            throw new TypeError("Job queue: job.label must be a non-empty string.");
        }
        if (key !== null && typeof key !== "string") {
            throw new TypeError("Job queue: job.key must be a string when provided.");
        }

        let settle;
        const done = new Promise((resolve) => { settle = resolve; });
        const entry = {
            id: nextId++, key, label, run, status: JOB_STATUS.QUEUED,
            result: undefined, error: undefined, settle, controller: new AbortController()
        };
        pending.push(entry);
        notify({ type: "enqueued", job: toSnapshot(entry) });
        processNext();
        return Object.freeze({ id: entry.id, done });
    }

    /**
     * Start the oldest pending job if the active slot is free. Called
     * automatically after enqueue and after every job settles; calling it
     * while a job runs does nothing. Returns true when a job was started.
     * run() receives { signal }: the job's own AbortSignal.
     */
    function processNext() {
        if (disposed || active || pending.length === 0) return false;
        const job = pending.shift();
        // Each job leaves pending exactly once, so it can only run once.
        job.status = JOB_STATUS.RUNNING;
        active = job;
        notify({ type: "started", job: toSnapshot(job) });

        const { signal } = job.controller;
        let work;
        try {
            work = Promise.resolve(job.run({ signal }));
        } catch (error) {
            work = Promise.reject(error);
        }
        work.then(
            (result) => settleRun(job, JOB_STATUS.SUCCESS, { result }),
            (error) => settleRun(job, JOB_STATUS.ERROR, { error })
        );
        return true;
    }

    function settleRun(job, status, outcome) {
        // Already cancelled: this outcome is stale and the slot is already free.
        if (job.status !== JOB_STATUS.RUNNING) return;
        // run() ignored or rethrew the abort: still a cancellation, not a failure.
        if (job.controller.signal.aborted) complete(job, JOB_STATUS.CANCELLED);
        else complete(job, status, outcome);
    }

    function complete(job, status, outcome) {
        // Release the slot before notifying so subscribers see the true state.
        if (active === job) active = null;
        const snapshot = finish(job, status, outcome);
        notify({ type: CHANGE_TYPES[status], job: snapshot });
        processNext();
    }

    /** Cancel every job that has not started. Returns the cancelled snapshots. */
    function clearPending() {
        if (pending.length === 0) return Object.freeze([]);
        const cancelled = pending.splice(0).map((job) => {
            job.controller.abort();
            return finish(job, JOB_STATUS.CANCELLED);
        });
        notify({ type: "cleared", jobs: Object.freeze(cancelled) });
        return Object.freeze(cancelled);
    }

    /**
     * Cancel one job by id (number) or key (string), queued or running.
     * Returns its cancelled snapshot, or null when nothing unfinished matched,
     * so cancelling twice is a no-op.
     */
    function cancel(match) {
        let matches;
        if (Number.isSafeInteger(match)) matches = (job) => job.id === match;
        else if (typeof match === "string") matches = (job) => job.key === match;
        else throw new TypeError("Job queue: cancel() takes a job id or a job key.");

        if (active && matches(active)) {
            const job = active;
            job.controller.abort();
            complete(job, JOB_STATUS.CANCELLED);
            return toSnapshot(job);
        }
        const index = pending.findIndex(matches);
        if (index === -1) return null;
        const [job] = pending.splice(index, 1);
        job.controller.abort();
        const snapshot = finish(job, JOB_STATUS.CANCELLED);
        notify({ type: "cancelled", job: snapshot });
        return snapshot;
    }

    /** Cancel waiting jobs, then the running one. Returns all cancelled snapshots. */
    function cancelAll() {
        const cancelled = [...clearPending()];
        if (active) cancelled.push(cancel(active.id));
        return Object.freeze(cancelled);
    }

    /** Snapshot of a queued or running job with this key, or null. */
    function findUnfinished(key) {
        if (active?.key === key) return toSnapshot(active);
        const job = pending.find((entry) => entry.key === key);
        return job ? toSnapshot(job) : null;
    }

    /** 1-based position among unfinished jobs (the running job is 1), or 0. */
    function positionOf(key) {
        if (active?.key === key) return 1;
        const index = pending.findIndex((entry) => entry.key === key);
        return index === -1 ? 0 : index + 1 + (active ? 1 : 0);
    }

    function subscribe(subscriber) {
        if (typeof subscriber !== "function") {
            throw new TypeError("Job queue: subscriber must be a function.");
        }
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
    }

    /** Cancel all work, aborting the running job, and stop scheduling. Idempotent. */
    function dispose() {
        if (disposed) return;
        disposed = true;
        cancelAll();
        subscribers.clear();
    }

    return Object.freeze({
        enqueue,
        processNext,
        clearPending,
        cancel,
        cancelAll,
        getQueueStatus,
        findUnfinished,
        positionOf,
        subscribe,
        dispose
    });
}
