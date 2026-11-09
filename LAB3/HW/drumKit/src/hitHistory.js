/**
 * Production Studio Drum Kit — T-01C hit history
 *
 * Pure helpers for the visual hit log. The history is an array, newest
 * first, capped at HISTORY_LIMIT so the UI never grows without bound. Each
 * entry:
 *   { id, padId, instrument, key, sequence, timestamp, level }
 * `level` is the hit's nominal intensity (0..1) once the audio engine knows
 * it, or null while the sample is still loading / when it failed.
 */
import { assertDrumPad } from "./drumPads.js";

export const HISTORY_LIMIT = 12;

function randomId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `hit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function assertInteger(value, name) {
    if (!Number.isInteger(value) || value < 0) {
        throw new TypeError(`${name} must be a non-negative integer, received ${JSON.stringify(value)}`);
    }
}

/** Validates an intensity: null (unknown) or a number in [0, 1]. */
export function assertLevel(level) {
    if (level !== null && !(typeof level === "number" && level >= 0 && level <= 1)) {
        throw new TypeError(`hit.level must be null or a number in [0, 1], received ${JSON.stringify(level)}`);
    }
}

/** Builds one history entry for a pad. */
export function createHit(pad, { sequence, level = null, id = randomId(), timestamp = Date.now() } = {}) {
    assertDrumPad(pad);
    assertInteger(sequence, "createHit: sequence");
    assertInteger(timestamp, "createHit: timestamp");
    assertLevel(level);
    if (typeof id !== "string" || id === "") {
        throw new TypeError("createHit: id must be a non-empty string");
    }
    return Object.freeze({ id, padId: pad.id, instrument: pad.name, key: pad.keyLabel, sequence, timestamp, level });
}

/** Returns a new history with `hit` first, trimmed to `limit` entries. */
export function appendHit(history, hit, limit = HISTORY_LIMIT) {
    if (!Array.isArray(history)) throw new TypeError("appendHit: history must be an array");
    if (!hit || typeof hit.id !== "string") throw new TypeError("appendHit: hit must be a history entry");
    if (!Number.isInteger(limit) || limit < 1) throw new TypeError("appendHit: limit must be a positive integer");
    return [hit, ...history].slice(0, limit);
}

/** Returns a new history with the entry `id` given `level`; unchanged (same array) when `id` is gone. */
export function setHitLevel(history, id, level) {
    if (!Array.isArray(history)) throw new TypeError("setHitLevel: history must be an array");
    assertLevel(level);
    const index = history.findIndex((hit) => hit.id === id);
    if (index === -1) return history;
    const next = history.slice();
    next[index] = Object.freeze({ ...history[index], level });
    return next;
}

/** Local wall-clock time with milliseconds, e.g. "14:03:27.481". */
export function formatClock(timestamp) {
    assertInteger(timestamp, "formatClock: timestamp");
    const date = new Date(timestamp);
    const pad2 = (value) => String(value).padStart(2, "0");
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}
