/**
 * KRAFTON x PUBG Vietnam Championship — T-03C squads and kill feed
 *
 * Illustrative development values, not verified official tournament
 * standings; every kill-feed event is fictional. All records are frozen and
 * validated (Project Rule 2) before any component renders them.
 *
 * The leaderboard has only the four required squads, far too few to need
 * virtualization. The virtual scroller is demonstrated on the kill feed:
 * the PRD's two INITIAL_KILL_FEED events plus 998 generated ones, 1,000 in
 * total. The generator uses a seeded PRNG, so the same seed always produces
 * the same events (tests and screenshots are reproducible).
 */

export const PUBG_SQUADS = Object.freeze([
    Object.freeze({ id: "squad-01", name: "The Expendables", tag: "TE", wwcd: 3, placementPoints: 85, killPoints: 72 }),
    Object.freeze({ id: "squad-02", name: "Cerberus Esports", tag: "CES", wwcd: 2, placementPoints: 78, killPoints: 81 }),
    Object.freeze({ id: "squad-03", name: "Roy Esports", tag: "ROY", wwcd: 1, placementPoints: 65, killPoints: 69 }),
    Object.freeze({ id: "squad-04", name: "AGG", tag: "AGG", wwcd: 1, placementPoints: 59, killPoints: 74 })
]);

/** The three sortable scoring categories: field → label. */
export const SORT_FIELDS = Object.freeze({
    wwcd: "WWCD",
    placementPoints: "Placement Points",
    killPoints: "Kill Points"
});

const SCORE_FIELDS = Object.freeze(Object.keys(SORT_FIELDS));
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

/** Throws a TypeError unless squad is { id, name, tag, wwcd, placementPoints, killPoints }. */
export function assertSquad(squad) {
    if (squad === null || typeof squad !== "object" || Array.isArray(squad)) {
        throw new TypeError("Squads: each squad must be an object");
    }
    if (typeof squad.id !== "string" || !/^[a-z0-9-]+$/.test(squad.id)) {
        throw new TypeError(`Squads: squad.id must be a lower-case slug, received ${JSON.stringify(squad.id)}`);
    }
    if (typeof squad.name !== "string" || squad.name.trim() === "") {
        throw new TypeError(`Squads: squad.name must be a non-empty string, received ${JSON.stringify(squad.name)}`);
    }
    if (typeof squad.tag !== "string" || !/^[A-Z0-9]{2,5}$/.test(squad.tag)) {
        throw new TypeError(`Squads: squad.tag must be 2–5 capital letters or digits, received ${JSON.stringify(squad.tag)}`);
    }
    SCORE_FIELDS.forEach((field) => {
        if (!isCount(squad[field])) throw new TypeError(`Squads: squad.${field} must be an integer >= 0, received ${JSON.stringify(squad[field])}`);
    });
}

/** Throws a TypeError unless squads is an array of valid squads with unique ids and tags. */
export function assertSquads(squads) {
    if (!Array.isArray(squads)) throw new TypeError("Squads: squads must be an array");
    squads.forEach(assertSquad);
    ["id", "tag"].forEach((field) => {
        if (new Set(squads.map((squad) => squad[field])).size !== squads.length) {
            throw new TypeError(`Squads: squad ${field}s must be unique`);
        }
    });
}

/** The PRD's two sample events (fictional), newest first. */
export function createInitialKillFeed(nowMs = Date.now()) {
    return Object.freeze([
        Object.freeze({ id: "kill-01", killer: "Player A", victim: "Player B", squad: "TE", weapon: "M416", timestamp: nowMs }),
        Object.freeze({ id: "kill-02", killer: "Player C", victim: "Player D", squad: "CES", weapon: "AWM", timestamp: nowMs - 5000 })
    ]);
}

export const WEAPONS = Object.freeze(["M416", "AWM", "AKM", "Kar98k", "Mini14", "UMP45", "Beryl M762", "SKS", "Groza", "DP-28"]);
const CALLSIGNS = Object.freeze(["Hawk", "Viper", "Ghost", "Raven", "Bolt", "Nova", "Tiger", "Lotus", "Storm", "Kite", "Frost", "Echo"]);

/** mulberry32: a tiny seeded PRNG returning floats in [0, 1). */
function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Generates `count` fictional events, newest first, one every 2–9 s before
 * `startMs`. Killer and victim always belong to different squads.
 */
export function generateKillFeed(count, { seed = 2026, startMs = Date.now(), squads = PUBG_SQUADS, idOffset = 0 } = {}) {
    if (!Number.isSafeInteger(count) || count < 0) throw new TypeError("generateKillFeed: count must be an integer >= 0");
    if (!Number.isFinite(startMs)) throw new TypeError("generateKillFeed: startMs must be epoch milliseconds");
    assertSquads(squads);
    if (squads.length < 2) throw new TypeError("generateKillFeed: needs at least two squads");
    const random = seededRandom(seed);
    const pick = (list) => list[Math.floor(random() * list.length)];
    const events = [];
    let timestamp = startMs;
    for (let n = 0; n < count; n += 1) {
        timestamp -= 2000 + Math.floor(random() * 7000);
        const killerSquad = pick(squads);
        const victimSquad = pick(squads.filter((squad) => squad !== killerSquad));
        events.push(Object.freeze({
            id: `kill-${String(n + 1 + idOffset).padStart(4, "0")}`,
            killer: `${killerSquad.tag}.${pick(CALLSIGNS)}`,
            victim: `${victimSquad.tag}.${pick(CALLSIGNS)}`,
            squad: killerSquad.tag,
            weapon: pick(WEAPONS),
            timestamp
        }));
    }
    return Object.freeze(events);
}

/** The full demo feed: the two PRD samples followed by generated history (total `total`). */
export function createKillFeed(total = 1000, nowMs = Date.now()) {
    const initial = createInitialKillFeed(nowMs);
    return Object.freeze([...initial, ...generateKillFeed(total - initial.length, { startMs: nowMs - 5000, idOffset: initial.length })]);
}

/** Throws a TypeError unless event is { id, killer, victim, squad, weapon, timestamp }. */
export function assertKillEvent(event) {
    if (event === null || typeof event !== "object" || Array.isArray(event)) {
        throw new TypeError("KillFeed: each event must be an object");
    }
    ["id", "killer", "victim", "squad", "weapon"].forEach((field) => {
        if (typeof event[field] !== "string" || event[field].trim() === "") {
            throw new TypeError(`KillFeed: event.${field} must be a non-empty string, received ${JSON.stringify(event[field])}`);
        }
    });
    if (!Number.isFinite(event.timestamp)) {
        throw new TypeError(`KillFeed: event.timestamp must be epoch milliseconds, received ${JSON.stringify(event.timestamp)}`);
    }
}

/** Throws a TypeError unless events is an array of valid events with unique ids (stable keys). */
export function assertKillFeed(events) {
    if (!Array.isArray(events)) throw new TypeError("KillFeed: events must be an array");
    events.forEach(assertKillEvent);
    if (new Set(events.map((event) => event.id)).size !== events.length) {
        throw new TypeError("KillFeed: event ids must be unique (they are the list keys)");
    }
}
