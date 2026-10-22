import { createSampleConfig, validateSaleConfig, discountPercent, DEFAULT_TIME_ZONE } from "./saleConfig.js";
import { getCampaignStatus, SALE_STATUS, SALE_STATUS_LABELS } from "./saleStatus.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType } from "../../source/testHarness.js";

// T-01 — campaign configuration and derived status.

const NOW = Date.UTC(2026, 10, 10, 17, 0, 0); // 11 Nov 2026 00:00 in Asia/Ho_Chi_Minh

test("sample config holds every campaign field in epoch milliseconds", () => {
    const config = createSampleConfig(NOW);
    assertDeepEqual(Object.keys(config), [
        "campaignName", "productName", "originalPrice", "salePrice", "initialInventory",
        "startsAt", "endsAt", "lockDurationMs", "timeZone"
    ], "Fields");
    assertEqual(config.startsAt, NOW + 2 * 60 * 1000, "Starts 2 minutes after now");
    assertEqual(config.endsAt - config.startsAt, 30 * 60 * 1000, "Runs 30 minutes");
    assertEqual(config.lockDurationMs, 5 * 60 * 1000, "5-minute lock");
    assertEqual(config.timeZone, DEFAULT_TIME_ZONE, "Vietnam time zone");
    assert(Object.isFrozen(config), "Frozen");
    assert(validateSaleConfig(config).ok, "Sample is valid");
});

test("sample options move the schedule and are type-checked", () => {
    const live = createSampleConfig(NOW, { startsInMs: -1000, durationMs: 5000 });
    assertEqual(live.startsAt, NOW - 1000, "Started a second ago");
    assertEqual(live.endsAt, NOW + 4000, "Ends 4 s from now");
    assertThrowsType(() => createSampleConfig(1.5), /epoch milliseconds/);
    assertThrowsType(() => createSampleConfig(NOW, []), /plain object/);
    assertThrowsType(() => createSampleConfig(NOW, { startsInMs: "soon" }), /startsInMs/);
    assertThrowsType(() => createSampleConfig(NOW, { durationMs: 0 }), /durationMs/);
});

test("validation returns a trimmed, frozen copy of a valid config", () => {
    const input = { ...createSampleConfig(NOW), productName: "  Tai nghe  " };
    const result = validateSaleConfig(input);
    assert(result.ok, "Valid");
    assertEqual(result.config.productName, "Tai nghe", "Trimmed");
    assert(Object.isFrozen(result.config), "Frozen");
    assert(result.config !== input, "A copy");
});

test("validation never throws and lists every invalid field", () => {
    for (const value of [null, undefined, 42, "config", [], new Date()]) {
        const result = validateSaleConfig(value);
        assertEqual(result.ok, false, `Rejects ${String(value)}`);
        assertEqual(result.errors.length, 1, "One clear message");
    }
    const result = validateSaleConfig({
        campaignName: " ", productName: 7, originalPrice: -1, salePrice: 10.5,
        initialInventory: -3, startsAt: "now", endsAt: Number.NaN, lockDurationMs: 0, timeZone: "Mars/Olympus"
    });
    assertEqual(result.ok, false, "Invalid");
    assertEqual(result.errors.length, 9, `Every field reported: ${result.errors.join(" | ")}`);
});

test("inventory must be a non-negative integer; zero is allowed", () => {
    const base = createSampleConfig(NOW);
    for (const initialInventory of [-1, 1.5, "50", Number.POSITIVE_INFINITY, 2 ** 53]) {
        assertEqual(validateSaleConfig({ ...base, initialInventory }).ok, false, `Rejects ${String(initialInventory)}`);
    }
    assert(validateSaleConfig({ ...base, initialInventory: 0 }).ok, "Zero stock is valid");
});

test("sale price must be below the original price, and the end after the start", () => {
    const base = createSampleConfig(NOW);
    const pricey = validateSaleConfig({ ...base, salePrice: base.originalPrice });
    assertDeepEqual(pricey.errors, ["Sale price must be lower than the original price."], "Price rule");
    const backwards = validateSaleConfig({ ...base, endsAt: base.startsAt });
    assertDeepEqual(backwards.errors, ["End time must be after the start time."], "Schedule rule");
});

test("prices are whole đồng and the discount is a whole percentage", () => {
    const base = createSampleConfig(NOW);
    assertEqual(validateSaleConfig({ ...base, salePrice: 799_000.5 }).ok, false, "No fractional đồng");
    assertEqual(discountPercent(base), 38, "1 290 000 → 799 000 is 38% off");
});

test("status is derived from the schedule and the clock, with exact boundaries", () => {
    const config = createSampleConfig(NOW, { startsInMs: 0, durationMs: 1000 });
    assertEqual(getCampaignStatus(config, NOW - 1), SALE_STATUS.UPCOMING, "1 ms before start");
    assertEqual(getCampaignStatus(config, NOW), SALE_STATUS.LIVE, "At start");
    assertEqual(getCampaignStatus(config, NOW + 999), SALE_STATUS.LIVE, "1 ms before end");
    assertEqual(getCampaignStatus(config, NOW + 1000), SALE_STATUS.ENDED, "At end");
    assertThrowsType(() => getCampaignStatus(config, Number.NaN), /epoch milliseconds/);
});

test("status values and labels are fixed", () => {
    assertDeepEqual(Object.values(SALE_STATUS), ["UPCOMING", "LIVE", "ENDED"], "Statuses");
    assert(Object.isFrozen(SALE_STATUS) && Object.isFrozen(SALE_STATUS_LABELS), "Frozen");
    assertEqual(SALE_STATUS_LABELS.LIVE, "Live", "Label");
});
