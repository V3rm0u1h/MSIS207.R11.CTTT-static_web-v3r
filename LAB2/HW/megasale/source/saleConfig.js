/**
 * Vietnam Mega-Sale Simulator — T-01 campaign configuration
 *
 * One place for every sale-specific value. Units:
 * - Timestamps (startsAt, endsAt): Unix epoch milliseconds, as Date.now().
 * - Durations (lockDurationMs): milliseconds.
 * - Prices: whole Vietnamese đồng (VND has no minor unit), so integers.
 *
 * validateSaleConfig() never throws for bad values: it returns every
 * problem it finds so the UI can show them instead of crashing.
 */

const MINUTE_MS = 60 * 1000;
const PRODUCT_ID_PATTERN = /^[a-z0-9-]+$/;

export const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const DEFAULT_LOCALE = "vi-VN";
export const CURRENCY = "VND";

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
}

function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
}

function isValidTimeZone(value) {
    if (!isNonEmptyString(value)) return false;
    try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
    } catch {
        return false;
    }
}

/**
 * Sample campaign. Times are relative to `now` so the simulator always has a
 * sale to show; the defaults start it in 2 minutes and run it for 30.
 */
export function createSampleConfig(now = Date.now(), options = {}) {
    if (!Number.isSafeInteger(now)) throw new TypeError("Mega-Sale: now must be epoch milliseconds (an integer).");
    if (!isPlainObject(options)) throw new TypeError("Mega-Sale: sample options must be a plain object.");
    const { startsInMs = 2 * MINUTE_MS, durationMs = 30 * MINUTE_MS } = options;
    if (!Number.isSafeInteger(startsInMs)) throw new TypeError("Mega-Sale: startsInMs must be an integer number of milliseconds.");
    if (!isPositiveInteger(durationMs)) throw new TypeError("Mega-Sale: durationMs must be a positive integer number of milliseconds.");
    const startsAt = now + startsInMs;
    return Object.freeze({
        campaignName: "Siêu Sale 11.11",
        productId: "song-am-x1",
        productName: "Tai nghe không dây Sóng Âm X1",
        originalPrice: 1_290_000,
        salePrice: 799_000,
        initialInventory: 50,
        startsAt,
        endsAt: startsAt + durationMs,
        lockDurationMs: 5 * MINUTE_MS,
        timeZone: DEFAULT_TIME_ZONE
    });
}

/**
 * Check a campaign config. Returns { ok: true, config } with a frozen copy,
 * or { ok: false, errors } listing every invalid field in plain language.
 */
export function validateSaleConfig(config) {
    if (!isPlainObject(config)) {
        return { ok: false, errors: ["The sale configuration is missing or is not an object."] };
    }
    const errors = [];
    const {
        campaignName, productId, productName, originalPrice, salePrice, initialInventory,
        startsAt, endsAt, lockDurationMs, timeZone = DEFAULT_TIME_ZONE
    } = config;

    if (!isNonEmptyString(campaignName)) errors.push("Campaign name must be a non-empty text.");
    if (typeof productId !== "string" || !PRODUCT_ID_PATTERN.test(productId)) {
        errors.push("Product id must use lowercase letters, digits and hyphens.");
    }
    if (!isNonEmptyString(productName)) errors.push("Product name must be a non-empty text.");
    if (!isPositiveInteger(originalPrice)) errors.push("Original price must be a positive whole number of đồng.");
    if (!isPositiveInteger(salePrice)) {
        errors.push("Sale price must be a positive whole number of đồng.");
    } else if (isPositiveInteger(originalPrice) && salePrice >= originalPrice) {
        errors.push("Sale price must be lower than the original price.");
    }
    if (!isNonNegativeInteger(initialInventory)) errors.push("Initial inventory must be a whole number of 0 or more.");
    if (!isNonNegativeInteger(startsAt)) errors.push("Start time must be Unix epoch milliseconds.");
    if (!isNonNegativeInteger(endsAt)) {
        errors.push("End time must be Unix epoch milliseconds.");
    } else if (isNonNegativeInteger(startsAt) && endsAt <= startsAt) {
        errors.push("End time must be after the start time.");
    }
    if (!isPositiveInteger(lockDurationMs)) errors.push("Reservation lock duration must be a positive whole number of milliseconds.");
    if (!isValidTimeZone(timeZone)) errors.push("Time zone must be a valid IANA time zone such as Asia/Ho_Chi_Minh.");

    if (errors.length > 0) return { ok: false, errors };
    return {
        ok: true,
        config: Object.freeze({
            campaignName: campaignName.trim(),
            productId,
            productName: productName.trim(),
            originalPrice,
            salePrice,
            initialInventory,
            startsAt,
            endsAt,
            lockDurationMs,
            timeZone
        })
    };
}

/** Whole-number discount, e.g. 1 290 000 → 799 000 is 38%. */
export function discountPercent(config) {
    return Math.round((1 - config.salePrice / config.originalPrice) * 100);
}
