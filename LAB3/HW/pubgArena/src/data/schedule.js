/**
 * KRAFTON x PUBG Vietnam Championship — countdown schedule (T-03A)
 *
 * Absolute targets in epoch milliseconds. The countdowns never store a
 * "seconds left" value; they always compare these timestamps with the
 * (server-adjusted) clock.
 *
 * There is no backend in this exercise, so the server clock offset is
 * SIMULATED: a fixed, known value standing in for what a time-sync request
 * would return (serverTime - clientTime). The UI labels it as simulated.
 *
 * Event names are fictional demo data for a student project; no affiliation
 * with KRAFTON or PUBG is implied.
 */

/** Simulated serverTime - clientTime: the "server" runs 1.5 s ahead of this device. */
export const SIMULATED_SERVER_OFFSET_MS = 1500;

/** PVS Grand Finals: 20 December 2026, 19:00 in Vietnam (UTC+7). */
export const PVS_GRAND_FINALS_EPOCH_MS = Date.parse("2026-12-20T19:00:00+07:00");

/** A G-Coin airdrop lands every 5 minutes, on the clock (…:00, …:05, …). */
export const AIRDROP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * The next airdrop strictly after `serverNowMs`, aligned to the airdrop
 * interval, so every viewer (on the same server clock) sees the same target.
 */
export function nextAirdropEpochMs(serverNowMs, intervalMs = AIRDROP_INTERVAL_MS) {
    if (!Number.isFinite(serverNowMs) || !Number.isInteger(intervalMs) || intervalMs <= 0) {
        throw new TypeError("nextAirdropEpochMs: expects epoch milliseconds and a positive integer interval");
    }
    return (Math.floor(serverNowMs / intervalMs) + 1) * intervalMs;
}

/** Builds the two countdowns shown on the page, fixing the airdrop target once. */
export function createSchedule(clientNowMs = Date.now(), serverOffsetMs = SIMULATED_SERVER_OFFSET_MS) {
    return Object.freeze([
        Object.freeze({
            id: "pvs-grand-finals",
            title: "PVS Grand Finals",
            targetEpochMs: PVS_GRAND_FINALS_EPOCH_MS,
            upcomingStatus: "Upcoming",
            liveStatus: "Live now"
        }),
        Object.freeze({
            id: "gcoin-airdrop",
            title: "G-Coin Airdrop",
            targetEpochMs: nextAirdropEpochMs(clientNowMs + serverOffsetMs),
            upcomingStatus: "Incoming",
            liveStatus: "Airdrop landed"
        })
    ]);
}
