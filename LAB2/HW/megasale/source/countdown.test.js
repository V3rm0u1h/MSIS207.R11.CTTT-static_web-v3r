import { createCountdown, formatDuration, remainingMs, DEFAULT_TICK_MS } from "./countdown.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, wait } from "../../source/testHarness.js";

// T-02 — zero-drift countdown.

/**
 * Manual setInterval: callbacks run only on tick(), however much the fake
 * clock moved, so a "delayed callback" is just a big clock jump between ticks.
 */
export function manualTimer() {
    let nextId = 1;
    const intervals = new Map();
    return {
        setInterval(callback, ms) {
            const id = nextId++;
            intervals.set(id, { callback, ms });
            return id;
        },
        clearInterval(id) { intervals.delete(id); },
        tick() { for (const { callback } of [...intervals.values()]) callback(); },
        get active() { return intervals.size; },
        get delays() { return [...intervals.values()].map(({ ms }) => ms); }
    };
}

/** A countdown on a fake clock and manual timer, recording ticks and arrivals. */
function setup({ targets = [10_000], start = 0 } = {}) {
    const clock = { now: start };
    const timer = manualTimer();
    const ticks = [];
    const reached = [];
    const queue = [...targets];
    const countdown = createCountdown({
        now: () => clock.now,
        setInterval: timer.setInterval,
        clearInterval: timer.clearInterval,
        // Next target that is still ahead of `at`, like a schedule would give.
        getTarget: (at) => {
            while (queue.length > 0 && queue[0] <= at) queue.shift();
            return queue[0] ?? null;
        },
        onTick: (ms) => ticks.push(ms),
        onReached: (target) => reached.push(target)
    });
    return { clock, timer, ticks, reached, countdown };
}

test("formatDuration shows HH:MM:SS.mmm with padding, long durations and no negatives", () => {
    assertEqual(formatDuration(0), "00:00:00.000", "Zero");
    assertEqual(formatDuration(1), "00:00:00.001", "One millisecond");
    assertEqual(formatDuration(61_001), "00:01:01.001", "Padding");
    assertEqual(formatDuration(3_723_456), "01:02:03.456", "All fields");
    assertEqual(formatDuration(100 * 3_600_000), "100:00:00.000", "Hours past 99 keep growing");
    assertEqual(formatDuration(999.9), "00:00:00.999", "Rounds down, never shows time not yet left");
    assertEqual(formatDuration(-5), "00:00:00.000", "Never negative");
    assertThrowsType(() => formatDuration(Number.NaN), /finite/);
    assertThrowsType(() => formatDuration("10"), /finite/);
});

test("remainingMs is target minus now, clamped at zero", () => {
    assertEqual(remainingMs(10_000, 2_500), 7_500, "Ahead");
    assertEqual(remainingMs(10_000, 10_000), 0, "At target");
    assertEqual(remainingMs(10_000, 99_999), 0, "Past target");
    assertThrowsType(() => remainingMs(10_000, Number.NaN), /epoch milliseconds/);
});

test("createCountdown validates its options", () => {
    const valid = { getTarget: () => null, onTick: () => {} };
    assertThrowsType(() => createCountdown(null), /plain object/);
    assertThrowsType(() => createCountdown({ onTick: () => {} }), /getTarget/);
    assertThrowsType(() => createCountdown({ ...valid, onReached: 1 }), /onReached/);
    assertThrowsType(() => createCountdown({ ...valid, tickMs: 0 }), /tickMs/);
    assertThrowsType(() => createCountdown({ ...valid, tickMs: 12.5 }), /tickMs/);
    assertEqual(DEFAULT_TICK_MS, 50, "Default refresh every 50 ms");
});

test("every update reads the wall clock; the interval is never a decrement counter", () => {
    const { clock, timer, ticks, countdown } = setup();
    countdown.start();
    assertDeepEqual(ticks, [10_000], "First value shown at once");
    // The interval asks for 50 ms, but the clock moves by other amounts.
    for (const step of [50, 13, 400, 7]) {
        clock.now += step;
        timer.tick();
    }
    assertDeepEqual(ticks, [10_000, 9_950, 9_937, 9_537, 9_530], "Each value is target - now");
    assertEqual(timer.delays[0], 50, "Interval only schedules refreshes");
});

test("a delayed callback (busy thread, background tab, sleep) shows the true remaining time", () => {
    const { clock, timer, ticks, countdown } = setup({ targets: [3_600_000] });
    countdown.start();
    clock.now += 50;
    timer.tick();
    // The tab was throttled or the laptop slept: 25 minutes pass, one callback runs.
    clock.now += 25 * 60_000;
    timer.tick();
    assertEqual(ticks.at(-1), 3_600_000 - 50 - 25 * 60_000, "No drift after the gap");
    assertEqual(formatDuration(ticks.at(-1)), "00:34:59.950", "Display matches the wall clock");
    assertEqual(countdown.updateCount, 3, "Only three updates ran, yet the value is exact");
});

test("at the target it shows zero once, reports arrival once, then moves to the next target", () => {
    const { clock, timer, ticks, reached, countdown } = setup({ targets: [1_000, 5_000] });
    countdown.start();
    clock.now = 1_000;
    timer.tick();
    assertEqual(ticks.at(-1), 0, "Zero shown at the start time");
    assertDeepEqual(reached, [1_000], "Arrival reported");
    assertEqual(countdown.target, 5_000, "Now counting to the next target");
    clock.now = 1_200;
    timer.tick();
    assertEqual(ticks.at(-1), 3_800, "Counting to the end");
    assertDeepEqual(reached, [1_000], "Not reported twice");
});

test("past the last target it never goes negative and stops its interval", () => {
    const { clock, timer, ticks, reached, countdown } = setup({ targets: [1_000] });
    countdown.start();
    clock.now = 9_999;
    timer.tick();
    assertEqual(ticks.at(-1), 0, "Clamped at zero");
    assertDeepEqual(reached, [1_000], "Reached once");
    assertEqual(timer.active, 0, "Interval cleared");
    assert(!countdown.isRunning, "Stopped");
    assert(ticks.every((ms) => ms >= 0), "No negative value ever shown");
});

test("a clock jump past several targets lands on the right one in one update", () => {
    const { clock, timer, reached, countdown } = setup({ targets: [1_000, 5_000, 9_000] });
    countdown.start();
    clock.now = 6_000;
    timer.tick();
    assertDeepEqual(reached, [1_000], "The target that was being counted");
    assertEqual(countdown.target, 9_000, "Skips the target already passed");
});

test("start() twice keeps one interval; stop() and dispose() clear it", () => {
    const { timer, countdown } = setup();
    assert(countdown.start(), "Started");
    assert(!countdown.start(), "Second start ignored");
    assert(!countdown.start(), "Third start ignored");
    assertEqual(timer.active, 1, "One interval");
    countdown.stop();
    assertEqual(timer.active, 0, "Stopped");
    assert(countdown.start(), "Restartable after stop");
    assertEqual(timer.active, 1, "Still one");
    countdown.dispose();
    countdown.dispose();
    assertEqual(timer.active, 0, "Cleared by dispose");
    assert(!countdown.start(), "No start after dispose");
    assertEqual(timer.active, 0, "Nothing scheduled");
});

test("with nothing to count, start() shows zero and schedules nothing", () => {
    const { timer, ticks, countdown } = setup({ targets: [] });
    assert(!countdown.start(), "Not started");
    assertDeepEqual(ticks, [0], "Zero shown");
    assertEqual(timer.active, 0, "No interval");
});

test("real timers: the displayed time tracks Date.now() within one refresh", async () => {
    const target = Date.now() + 10_000;
    let last = null;
    const countdown = createCountdown({ getTarget: () => target, onTick: (ms) => { last = ms; } });
    countdown.start();
    await wait(300);
    const expected = target - Date.now();
    countdown.dispose();
    assert(Math.abs(last - expected) <= DEFAULT_TICK_MS + 20, `Shown ${last}, actual ${expected}`);
});
