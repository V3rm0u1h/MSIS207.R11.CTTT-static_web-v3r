/**
 * KRAFTON x PUBG Vietnam Championship — T-03A zero-drift airdrop timer
 *
 *   const { remainingMs, isLive } = usePubgAirdropTimer(targetEpochMs, serverOffsetMs);
 *
 * Evolved from Lab 2 HW 3 (LAB2/HW/megasale/source/countdown.js), where the
 * same rule was first written: the remaining time is always recomputed from
 * the wall clock, never decremented.
 *
 *   remainingMs = max(0, targetEpochMs - (Date.now() + serverOffsetMs))
 *
 * The target timestamp is authoritative. The 200 ms interval only decides
 * WHEN the display refreshes; a late or skipped callback (background-tab
 * throttling, a busy main thread, a sleeping laptop) cannot make the value
 * wrong, only stale until the next refresh. To close even that gap, the
 * clock is re-read the moment the tab becomes visible again
 * (visibilitychange), so a user switching back sees the correct time at once.
 *
 * serverOffsetMs = serverTime - clientTime. Adding it to Date.now() gives the
 * server's idea of "now", so every viewer counts down to the same instant even
 * if their device clock is wrong. Without a backend the offset is simulated
 * (data/schedule.js) and labelled as such in the UI.
 *
 * Differences from the PRD's reference implementation (same contract):
 *   - the calculation is one exported helper, used by useState and the
 *     interval alike, so it exists only once;
 *   - both arguments are type-checked (Project Rule 2): NaN or a string would
 *     otherwise turn the countdown into NaN silently;
 *   - once the target is reached the interval is cleared: remainingMs can only
 *     stay 0 until the target or offset changes, which restarts the effect.
 *
 * Each call owns its own interval and listener, so any number of countdowns
 * can run side by side; all of them are removed on unmount.
 */
import { useEffect, useState } from "react";

/** How often the display is refreshed while counting. */
export const TICK_MS = 200;

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function assertEpoch(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError(`usePubgAirdropTimer: ${name} must be a finite number of milliseconds, received ${JSON.stringify(value)}`);
    }
}

/** Milliseconds left until targetEpochMs on the server clock; never negative. */
export function calcRemainingMs(targetEpochMs, serverOffsetMs = 0, nowMs = Date.now()) {
    assertEpoch(targetEpochMs, "targetEpochMs");
    assertEpoch(serverOffsetMs, "serverOffsetMs");
    assertEpoch(nowMs, "nowMs");
    return Math.max(0, targetEpochMs - (nowMs + serverOffsetMs));
}

/**
 * Splits a duration into whole days, hours, minutes, seconds and milliseconds.
 * Negative input is shown as zero, so the countdown can never display "-1".
 */
export function splitDuration(ms) {
    assertEpoch(ms, "duration");
    const total = Math.max(0, Math.floor(ms));
    return Object.freeze({
        days: Math.floor(total / MS_PER_DAY),
        hours: Math.floor((total % MS_PER_DAY) / MS_PER_HOUR),
        minutes: Math.floor((total % MS_PER_HOUR) / MS_PER_MINUTE),
        seconds: Math.floor((total % MS_PER_MINUTE) / MS_PER_SECOND),
        milliseconds: total % MS_PER_SECOND
    });
}

/** "02 DAYS : 14 HOURS : 32 MIN : 08 SEC" (days keep growing past 99). */
export function formatCountdown(ms) {
    const { days, hours, minutes, seconds } = splitDuration(ms);
    const two = (n) => String(n).padStart(2, "0");
    return `${two(days)} DAYS : ${two(hours)} HOURS : ${two(minutes)} MIN : ${two(seconds)} SEC`;
}

/** ISO 8601 duration for <time dateTime>, e.g. "P2DT14H32M8S". */
export function isoDuration(ms) {
    const { days, hours, minutes, seconds } = splitDuration(ms);
    return `P${days}DT${hours}H${minutes}M${seconds}S`;
}

export function usePubgAirdropTimer(targetEpochMs, serverOffsetMs = 0) {
    assertEpoch(targetEpochMs, "targetEpochMs");
    assertEpoch(serverOffsetMs, "serverOffsetMs");

    const [remainingMs, setRemainingMs] = useState(() => calcRemainingMs(targetEpochMs, serverOffsetMs));

    useEffect(() => {
        let timerId = null;

        const stopTicking = () => {
            if (timerId !== null) {
                window.clearInterval(timerId);
                timerId = null;
            }
        };

        const syncClock = () => {
            const next = calcRemainingMs(targetEpochMs, serverOffsetMs);
            setRemainingMs(next);
            if (next === 0) stopTicking();
        };

        const onWake = () => {
            if (document.visibilityState === "visible") syncClock();
        };

        timerId = window.setInterval(syncClock, TICK_MS);
        document.addEventListener("visibilitychange", onWake);
        syncClock();

        return () => {
            stopTicking();
            document.removeEventListener("visibilitychange", onWake);
        };
    }, [targetEpochMs, serverOffsetMs]);

    return { remainingMs, isLive: remainingMs <= 0 };
}

export default usePubgAirdropTimer;
