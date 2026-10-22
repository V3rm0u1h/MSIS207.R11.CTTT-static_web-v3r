/**
 * Vietnam Mega-Sale Simulator — T-01 campaign status
 *
 * The status is never stored: it is computed from the validated config and
 * a wall-clock reading (epoch milliseconds), so every caller agrees on it.
 *   now <  startsAt            -> UPCOMING
 *   startsAt <= now < endsAt   -> LIVE
 *   now >= endsAt              -> ENDED
 */

export const SALE_STATUS = Object.freeze({
    UPCOMING: "UPCOMING",
    LIVE: "LIVE",
    ENDED: "ENDED"
});

export const SALE_STATUS_LABELS = Object.freeze({
    [SALE_STATUS.UPCOMING]: "Upcoming",
    [SALE_STATUS.LIVE]: "Live",
    [SALE_STATUS.ENDED]: "Ended"
});

/** Derive the campaign status at `now` (epoch ms) from a validated config. */
export function getCampaignStatus(config, now) {
    if (!Number.isFinite(now)) throw new TypeError("Mega-Sale: now must be epoch milliseconds.");
    if (now < config.startsAt) return SALE_STATUS.UPCOMING;
    if (now < config.endsAt) return SALE_STATUS.LIVE;
    return SALE_STATUS.ENDED;
}
