import { createJobQueue, JOB_STATUS, MAX_ACTIVE_JOBS } from "./audioQueue.js";
import { createAudioEngine, AudioEngineError, AUDIO_ERROR_CODES } from "./audioEngine.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, wait } from "../../HW/source/testHarness.js";

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

// --- Integration with the T-01 engine ---

test("queued engine loads download and decode one at a time, in order", async () => {
    const engine = createAudioEngine();
    const queue = createJobQueue();
    const urls = ["assets/tone-a440.wav", "assets/does-not-exist.wav", "assets/corrupted.wav", "assets/tone-a220.wav"];
    try {
        const jobs = urls.map((url) => queue.enqueue({ label: url, key: url, run: () => engine.load(url) }).done);
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
