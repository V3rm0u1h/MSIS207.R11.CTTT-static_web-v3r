import { createJobQueue, JOB_STATUS, MAX_ACTIVE_JOBS } from "./audioQueue.js";
import { createAudioEngine, AudioEngineError, AUDIO_ERROR_CODES } from "./audioEngine.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, wait } from "../../source/testHarness.js";

// T-02 — FIFO loading and decoding queue.

/** A job whose completion the test controls; it logs start and end order. */
function deferredJob(name, log) {
    let resolve;
    let reject;
    const job = {
        label: name,
        key: name,
        run: () => {
            log.push(`start:${name}`);
            return new Promise((res, rej) => { resolve = res; reject = rej; })
                .finally(() => log.push(`end:${name}`));
        }
    };
    return {
        job,
        succeed: (value = name) => resolve(value),
        fail: (error = new Error(`${name} failed`)) => reject(error)
    };
}

const flush = () => wait(0);

test("validates options and jobs", () => {
    assertThrowsType(() => createJobQueue([]), /options must be a plain object/);
    assertThrowsType(() => createJobQueue({ historyLimit: -1 }), /historyLimit/);
    const queue = createJobQueue();
    assertThrowsType(() => queue.enqueue(null), /plain object/);
    assertThrowsType(() => queue.enqueue({ label: "x" }), /run must be a function/);
    assertThrowsType(() => queue.enqueue({ label: " ", run: () => 1 }), /label/);
    assertThrowsType(() => queue.enqueue({ label: "x", key: 4, run: () => 1 }), /key/);
    assertThrowsType(() => queue.subscribe("nope"), /subscriber/);
    assertEqual(queue.getQueueStatus().pending, 0, "Rejected jobs never queued");
});

test("starts jobs in FIFO order with one active job at a time", async () => {
    const log = [];
    const queue = createJobQueue();
    const jobs = ["a", "b", "c"].map((name) => deferredJob(name, log));
    jobs.forEach(({ job }) => queue.enqueue(job));

    assertDeepEqual(log, ["start:a"], "Only the first job started");
    let status = queue.getQueueStatus();
    assertEqual(status.active, 1, "One active");
    assertEqual(status.pending, 2, "Two waiting");
    assertEqual(status.current.label, "a", "Current job");
    assertDeepEqual(status.pendingJobs.map((job) => job.label), ["b", "c"], "Waiting order");

    // Finish out of order: c's completion cannot matter before it starts.
    jobs[0].succeed();
    await flush();
    assertDeepEqual(log, ["start:a", "end:a", "start:b"], "b starts after a ends");
    jobs[1].succeed();
    await flush();
    jobs[2].succeed();
    await flush();
    assertDeepEqual(log, ["start:a", "end:a", "start:b", "end:b", "start:c", "end:c"], "Strict FIFO");
    status = queue.getQueueStatus();
    assertEqual(status.active, 0, "Idle");
    assertEqual(status.pending, 0, "Nothing waiting");
    assertEqual(status.success, 3, "Three successes");
});

test("active job count never exceeds the limit under a burst of jobs", async () => {
    const queue = createJobQueue();
    let running = 0;
    let peak = 0;
    const order = [];
    const dones = [];
    for (let index = 0; index < 8; index += 1) {
        dones.push(queue.enqueue({
            label: `job ${index}`,
            run: async () => {
                running += 1;
                peak = Math.max(peak, running);
                order.push(index);
                await wait(index % 3);
                running -= 1;
                return index;
            }
        }).done);
        assert(queue.getQueueStatus().active <= MAX_ACTIVE_JOBS, "Status within limit");
    }
    const results = await Promise.all(dones);
    assertEqual(MAX_ACTIVE_JOBS, 1, "Initial limit is one worker");
    assertEqual(peak, 1, "Never two jobs at once");
    assertDeepEqual(order, [0, 1, 2, 3, 4, 5, 6, 7], "Submission order");
    assertDeepEqual(results.map((job) => job.result), [0, 1, 2, 3, 4, 5, 6, 7], "Results kept per job");
});

test("a failed job keeps its error and does not block the next job", async () => {
    const log = [];
    const queue = createJobQueue();
    const first = deferredJob("bad", log);
    const second = deferredJob("good", log);
    const firstHandle = queue.enqueue(first.job);
    const secondHandle = queue.enqueue(second.job);
    const error = new Error("decode failed");
    first.fail(error);
    const failed = await firstHandle.done;
    assertEqual(failed.status, JOB_STATUS.ERROR, "Marked as error");
    assertEqual(failed.error, error, "Error preserved");
    assertEqual(queue.getQueueStatus().current.label, "good", "Next job running");
    second.succeed("ok");
    const passed = await secondHandle.done;
    assertEqual(passed.status, JOB_STATUS.SUCCESS, "Next job succeeded");
    const status = queue.getQueueStatus();
    assertEqual(status.error, 1, "One failure counted");
    assertEqual(status.success, 1, "One success counted");
    assertDeepEqual(status.history.map((job) => job.status), ["ERROR", "SUCCESS"], "History in order");
});

test("a job that throws synchronously fails without breaking the queue", async () => {
    const queue = createJobQueue();
    const bad = queue.enqueue({ label: "throws", run: () => { throw new TypeError("boom"); } });
    const good = queue.enqueue({ label: "after", run: () => "fine" });
    assertEqual((await bad.done).status, JOB_STATUS.ERROR, "Sync throw becomes ERROR");
    assertEqual((await good.done).result, "fine", "Queue continued");
});

test("each job runs exactly once even if processNext is called repeatedly", async () => {
    const queue = createJobQueue();
    let runs = 0;
    const { done } = queue.enqueue({ label: "once", run: async () => { runs += 1; await wait(1); } });
    assertEqual(queue.processNext(), false, "Slot busy: nothing started");
    queue.processNext();
    await done;
    assertEqual(queue.processNext(), false, "Nothing left to start");
    assertEqual(runs, 1, "Ran once");
});

test("clearPending cancels waiting jobs only and reports them", async () => {
    const log = [];
    const queue = createJobQueue();
    const running = deferredJob("running", log);
    queue.enqueue(running.job);
    const waitingA = queue.enqueue(deferredJob("a", log).job);
    const waitingB = queue.enqueue(deferredJob("b", log).job);

    const cancelled = queue.clearPending();
    assertDeepEqual(cancelled.map((job) => job.label), ["a", "b"], "Cancelled in order");
    assertEqual((await waitingA.done).status, JOB_STATUS.CANCELLED, "a cancelled");
    assertEqual((await waitingB.done).status, JOB_STATUS.CANCELLED, "b cancelled");
    let status = queue.getQueueStatus();
    assertEqual(status.pending, 0, "Nothing waiting");
    assertEqual(status.active, 1, "Running job untouched");
    assertEqual(status.cancelled, 2, "Cancelled count");

    running.succeed();
    await flush();
    status = queue.getQueueStatus();
    assertEqual(status.active, 0, "Slot released");
    assertDeepEqual(log, ["start:running", "end:running"], "Cancelled jobs never started");
    assertDeepEqual(queue.clearPending(), [], "Empty clear is a no-op");
});

test("terminal jobs leave the queue; history is capped", async () => {
    const queue = createJobQueue({ historyLimit: 2 });
    const dones = [1, 2, 3].map((value) => queue.enqueue({ label: `job ${value}`, run: () => value }).done);
    await Promise.all(dones);
    const status = queue.getQueueStatus();
    assertEqual(status.pending + status.active, 0, "No terminal job left in the queue");
    assertDeepEqual(status.history.map((job) => job.label), ["job 2", "job 3"], "Only the latest outcomes kept");
    assertEqual(status.success, 3, "Counters still complete");
});

test("subscribers get one notification per visible change", async () => {
    const queue = createJobQueue();
    const changes = [];
    const unsubscribe = queue.subscribe((status, change) => changes.push(`${change.type}:${status.pending}/${status.active}`));
    const { done } = queue.enqueue({ label: "a", run: () => wait(1) });
    queue.enqueue({ label: "b", run: () => Promise.reject(new Error("x")) });
    await done;
    await flush();
    unsubscribe();
    queue.enqueue({ label: "c", run: () => 1 });
    assertDeepEqual(changes, [
        "enqueued:1/0", "started:0/1", "enqueued:1/1", "succeeded:1/0", "started:0/1", "failed:0/0"
    ], "Notifications in order, none after unsubscribe");
});

test("findUnfinished and positionOf report queued and running keys", () => {
    const log = [];
    const queue = createJobQueue();
    queue.enqueue(deferredJob("a", log).job);
    queue.enqueue(deferredJob("b", log).job);
    assertEqual(queue.findUnfinished("a").status, JOB_STATUS.RUNNING, "a running");
    assertEqual(queue.findUnfinished("b").status, JOB_STATUS.QUEUED, "b queued");
    assertEqual(queue.findUnfinished("z"), null, "Unknown key");
    assertDeepEqual(["a", "b", "z"].map(queue.positionOf), [1, 2, 0], "Positions");
});

test("dispose cancels waiting jobs and refuses new ones", async () => {
    const log = [];
    const queue = createJobQueue();
    const running = deferredJob("running", log);
    queue.enqueue(running.job);
    const waiting = queue.enqueue(deferredJob("waiting", log).job);
    queue.dispose();
    assertEqual((await waiting.done).status, JOB_STATUS.CANCELLED, "Waiting job cancelled");
    assertThrowsType(() => queue.enqueue({ label: "late", run: () => 1 }), /disposed/);
    running.succeed();
    await flush();
    assertDeepEqual(log, ["start:running", "end:running"], "Nothing new started after dispose");
});

// --- T-03: cancellation ---

/** Like deferredJob, but records the AbortSignal its run() received. */
function signalJob(name, log) {
    const deferred = deferredJob(name, log);
    const run = deferred.job.run;
    deferred.job.run = ({ signal }) => {
        deferred.signal = signal;
        return run();
    };
    return deferred;
}

test("each job's run() gets its own AbortSignal", async () => {
    const log = [];
    const queue = createJobQueue();
    const a = signalJob("a", log);
    const b = signalJob("b", log);
    queue.enqueue(a.job);
    queue.enqueue(b.job);
    a.succeed();
    await flush();
    assert(a.signal instanceof AbortSignal && b.signal instanceof AbortSignal, "Signals passed");
    assert(a.signal !== b.signal, "Not shared between jobs");
    queue.cancel("b");
    assert(b.signal.aborted, "Cancelled job's signal aborted");
    assert(!a.signal.aborted, "Unrelated job untouched");
});

test("cancelling the running job aborts it and frees the slot at once", async () => {
    const log = [];
    const queue = createJobQueue();
    const running = signalJob("running", log);
    const next = signalJob("next", log);
    const runningHandle = queue.enqueue(running.job);
    queue.enqueue(next.job);

    const snapshot = queue.cancel(runningHandle.id);
    assertEqual(snapshot.status, JOB_STATUS.CANCELLED, "Cancelled snapshot");
    assert(running.signal.aborted, "Signal aborted");
    assertEqual(queue.getQueueStatus().current.label, "next", "Next job started without waiting");
    assertEqual((await runningHandle.done).status, JOB_STATUS.CANCELLED, "done resolves as cancelled");

    // The cancelled run finishing later (e.g. a decode that could not be aborted) is ignored.
    running.succeed("stale buffer");
    await flush();
    const status = queue.getQueueStatus();
    assertEqual(status.success, 0, "Stale result not counted");
    assertEqual(status.cancelled, 1, "Counted once as cancelled");
    assertEqual(status.current.label, "next", "Next job still the only active one");
});

test("a run that rejects because of its abort is CANCELLED, not ERROR", async () => {
    const queue = createJobQueue();
    const handle = queue.enqueue({
        label: "aborts",
        run: ({ signal }) => new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        })
    });
    queue.cancelAll();
    await flush();
    const status = queue.getQueueStatus();
    assertEqual((await handle.done).status, JOB_STATUS.CANCELLED, "Cancelled");
    assertEqual(status.error, 0, "No failure recorded");
});

test("cancelling a queued job by key means it never starts", async () => {
    const log = [];
    const queue = createJobQueue();
    const a = deferredJob("a", log);
    queue.enqueue(a.job);
    const b = queue.enqueue(deferredJob("b", log).job);
    queue.enqueue(deferredJob("c", log).job);
    assertEqual(queue.cancel("b").status, JOB_STATUS.CANCELLED, "b cancelled");
    assertEqual((await b.done).status, JOB_STATUS.CANCELLED, "done resolves as cancelled");
    a.succeed();
    await flush();
    assertDeepEqual(log, ["start:a", "end:a", "start:c"], "b skipped, FIFO kept for the rest");
});

test("cancel() is idempotent and type-checked", () => {
    const queue = createJobQueue();
    const { id } = queue.enqueue({ label: "a", run: () => new Promise(() => {}) });
    assert(queue.cancel(id) !== null, "First cancel works");
    assertEqual(queue.cancel(id), null, "Second cancel is a no-op");
    assertEqual(queue.cancel("missing"), null, "Unknown key");
    assertEqual(queue.getQueueStatus().cancelled, 1, "Counted once");
    assertThrowsType(() => queue.cancel({}), /job id or a job key/);
});

test("cancelAll cancels waiting and running jobs; the queue stays usable", async () => {
    const log = [];
    const queue = createJobQueue();
    const running = signalJob("running", log);
    queue.enqueue(running.job);
    queue.enqueue(deferredJob("waiting", log).job);
    const cancelled = queue.cancelAll();
    assertDeepEqual(cancelled.map((job) => job.label), ["waiting", "running"], "Both cancelled");
    assert(running.signal.aborted, "Running job aborted");
    assertEqual(queue.getQueueStatus().active + queue.getQueueStatus().pending, 0, "Queue empty");
    assertEqual((await queue.enqueue({ label: "after", run: () => "ok" }).done).result, "ok", "New work runs");
    assertDeepEqual(log, ["start:running"], "Waiting job never started");
});

test("dispose aborts the running job", async () => {
    const log = [];
    const queue = createJobQueue();
    const running = signalJob("running", log);
    const handle = queue.enqueue(running.job);
    queue.dispose();
    queue.dispose();
    assert(running.signal.aborted, "Aborted");
    assertEqual((await handle.done).status, JOB_STATUS.CANCELLED, "Cancelled");
});

test("history keeps outcomes but not results, so decoded buffers can be freed", async () => {
    const queue = createJobQueue();
    const big = new Float32Array(1024);
    const { done } = queue.enqueue({ label: "buffer", run: () => big });
    assertEqual((await done).result, big, "Caller receives the result");
    const [entry] = queue.getQueueStatus().history;
    assertEqual(entry.status, JOB_STATUS.SUCCESS, "Outcome kept");
    assertEqual(entry.result, undefined, "Result not retained by the queue");
});

// --- Integration with the T-01 engine ---

test("queued engine loads download and decode one at a time, in order", async () => {
    const engine = createAudioEngine();
    const queue = createJobQueue();
    const urls = ["assets/tone-a440.wav", "assets/does-not-exist.wav", "assets/corrupted.wav", "assets/tone-a220.wav"];
    try {
        const jobs = urls.map((url) => queue.enqueue({ label: url, key: url, run: ({ signal }) => engine.load(url, { signal }) }).done);
        assertEqual(queue.getQueueStatus().active, 1, "One load at a time");
        assertEqual(queue.getQueueStatus().pending, 3, "Three loads waiting");
        const results = await Promise.all(jobs);
        assertDeepEqual(results.map((job) => job.status), ["SUCCESS", "ERROR", "ERROR", "SUCCESS"], "Outcomes in order");
        assert(results[0].result instanceof AudioBuffer, "Decoded buffer stored on the job");
        assert(results[1].error instanceof AudioEngineError && results[1].error.code === AUDIO_ERROR_CODES.HTTP, "404 kept");
        assertEqual(results[2].error.code, AUDIO_ERROR_CODES.DECODE, "Decode error kept");
        assertDeepEqual(queue.getQueueStatus().history.map((job) => job.key), urls, "Finish order matches submit order");
    } finally {
        queue.dispose();
        await engine.dispose();
    }
});

test("cancelling a real in-flight download aborts it and the next real load still succeeds", async () => {
    const engine = createAudioEngine();
    const queue = createJobQueue();
    try {
        const load = (url) => queue.enqueue({ label: url, key: url, run: ({ signal }) => engine.load(url, { signal }) });
        const first = load("assets/tone-a440.wav");
        const second = load("assets/tone-a220.wav");
        assertEqual(engine.pendingLoadCount, 1, "First download in flight");
        queue.cancel(first.id);
        assertEqual((await first.done).status, JOB_STATUS.CANCELLED, "First cancelled");
        const secondJob = await second.done;
        assertEqual(secondJob.status, JOB_STATUS.SUCCESS, "Queue continued");
        assert(Math.abs(secondJob.result.duration - 4) < 0.05, "Second track decoded");
        await wait(50);
        assertEqual(engine.pendingLoadCount, 0, "Aborted download released");
        assertEqual(queue.getQueueStatus().error, 0, "Cancellation is not a failure");
    } finally {
        queue.dispose();
        await engine.dispose();
    }
});
