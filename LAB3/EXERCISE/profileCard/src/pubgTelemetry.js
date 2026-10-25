/**
 * Simulated PUBG match telemetry feed (ex3).
 * Every value produced here is SIMULATED demonstration data — it is not
 * official live PVS match data and does not come from any real API.
 *
 * requestTelemetry(squadId, signal) behaves like a network call:
 *   - resolves after SIMULATED_LATENCY_MS with a frozen telemetry record,
 *   - rejects with "Satellite packet timeout…" PACKET_LOSS_RATE of the time,
 *   - rejects with a DOMException named "AbortError" as soon as signal aborts,
 *     clearing its pending timer so nothing fires afterwards.
 */

export const SQUADS = Object.freeze([
    Object.freeze({ id: "CES", name: "Cerberus Esports", tag: "CES" }),
    // "PGC World Champions" is the title given in the task brief.
    Object.freeze({ id: "TE", name: "The Expendables", tag: "TE", note: "PGC World Champions" }),
    Object.freeze({ id: "GE", name: "Genius Esports", tag: "GE" })
]);

export const MAPS = Object.freeze(["Erangel", "Miramar"]);
export const PACKET_LOSS_RATE = 0.35;
export const SIMULATED_LATENCY_MS = 800;
export const PACKET_TIMEOUT_MESSAGE = "Satellite packet timeout. Please reconnect.";

/** Random integer in [min, max]. */
function randomInt(random, min, max) {
    return min + Math.floor(random() * (max - min + 1));
}

function abortError() {
    return new DOMException("Telemetry request aborted.", "AbortError");
}

/** Resolves after ms, or rejects with AbortError (and clears the timer) if signal aborts first. */
function abortableDelay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(abortError());
            return;
        }
        const onAbort = () => {
            clearTimeout(timerId);
            reject(abortError());
        };
        const timerId = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal.addEventListener("abort", onAbort, { once: true });
    });
}

/** Builds one simulated telemetry snapshot for squad. */
function generateTelemetry(squad, random) {
    return Object.freeze({
        simulated: true,
        squadId: squad.id,
        squadName: squad.name,
        map: MAPS[randomInt(random, 0, MAPS.length - 1)],
        alivePlayers: randomInt(random, 0, 4),
        kills: randomInt(random, 0, 15),
        placement: randomInt(random, 1, 16),
        blueZonePhase: randomInt(random, 1, 8),
        blueZoneShrinking: random() < 0.5
    });
}

export async function requestTelemetry(squadId, signal, { random = Math.random, latencyMs = SIMULATED_LATENCY_MS } = {}) {
    if (!(signal instanceof AbortSignal)) {
        throw new TypeError("requestTelemetry needs an AbortSignal.");
    }
    const squad = SQUADS.find((entry) => entry.id === squadId);
    if (squad === undefined) {
        throw new TypeError(`Unknown squad id: ${String(squadId)}`);
    }

    await abortableDelay(latencyMs, signal);

    // Packet loss is decided per request, inside the async flow.
    const packetLost = random() < PACKET_LOSS_RATE;
    if (packetLost) {
        throw new Error(PACKET_TIMEOUT_MESSAGE);
    }
    return generateTelemetry(squad, random);
}
