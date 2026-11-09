/**
 * Production Studio Drum Kit — T-01C audio engine
 *
 * Framework-free Web Audio playback with one shared AudioContext:
 *
 *   fetch(pad.sound) → decodeAudioData → AudioBuffer   once per pad, cached
 *   play(padId): new AudioBufferSourceNode(buffer) → master gain → analyser → destination
 *
 * One source node per hit, so a fast roll overlaps instead of cutting the
 * previous hit short; nodes are disconnected when they end. Nothing is
 * allocated per render: the engine is created once and the UI calls play().
 *
 * The context is created and resumed lazily, inside the first user gesture
 * (a key press or click), which is what browser autoplay policies require.
 *
 * Failures never throw out of play(): a missing or undecodable asset marks
 * that pad "failed", is logged once, and play() resolves { ok: false }. An
 * environment without Web Audio (or fetch) is "unsupported"; the kit still
 * works visually.
 *
 * Level metering reads the analyser's time-domain samples and reports RMS as
 * relative dBFS (0 dBFS = full scale, floor at SILENCE_DBFS). This is a
 * signal level inside the browser's audio graph, not calibrated dB SPL.
 */
import { assertDrumPads } from "./drumPads.js";

/** Below this the meter is silent; it also sets the 0 % point of the meter. */
export const SILENCE_DBFS = -60;

export const SILENT_LEVEL = Object.freeze({ rms: 0, dbfs: SILENCE_DBFS, percent: 0, active: false });

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/** Root-mean-square of a block of samples in [-1, 1]. */
export function rmsOf(samples) {
    if (!samples || typeof samples.length !== "number") {
        throw new TypeError("rmsOf: samples must be an array-like of numbers");
    }
    if (samples.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
    return Math.sqrt(sum / samples.length);
}

/** Amplitude (0..1) to dBFS, clamped to [SILENCE_DBFS, 0]. Non-positive input is the floor. */
export function toDbfs(amplitude) {
    if (!(amplitude > 0)) return SILENCE_DBFS;
    return Math.max(SILENCE_DBFS, Math.min(0, 20 * Math.log10(amplitude)));
}

/** dBFS to a 0..100 meter value, linear in dB between the floor and full scale. */
export function toPercent(dbfs) {
    return Math.round(clamp01((dbfs - SILENCE_DBFS) / (0 - SILENCE_DBFS)) * 100);
}

/** Meter reading for one block of samples; `playing` says whether any voice is still sounding. */
export function levelFromSamples(samples, playing = false) {
    const rms = rmsOf(samples);
    const dbfs = toDbfs(rms);
    const percent = toPercent(dbfs);
    return Object.freeze({ rms, dbfs, percent, active: Boolean(playing) || percent > 0 });
}

/** Largest absolute sample in a decoded buffer (0..1): the hit's nominal intensity. */
export function peakOf(buffer) {
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < data.length; i += 1) {
            const magnitude = Math.abs(data[i]);
            if (magnitude > peak) peak = magnitude;
        }
    }
    return clamp01(peak);
}

function defaultContextClass() {
    if (typeof globalThis === "undefined") return undefined;
    return globalThis.AudioContext ?? globalThis.webkitAudioContext;
}

export function createAudioEngine({
    pads,
    AudioContextClass = defaultContextClass(),
    fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : undefined,
    logger = console
} = {}) {
    assertDrumPads(pads);
    if (!logger || typeof logger.warn !== "function") {
        throw new TypeError("createAudioEngine: logger must have a warn() method");
    }
    const byId = new Map(pads.map((pad) => [pad.id, pad]));
    const supported = typeof AudioContextClass === "function" && typeof fetchImpl === "function";

    let context = null;
    let master = null;
    let analyser = null;
    let timeDomain = null;
    let voices = 0;
    const buffers = new Map();
    const loads = new Map();
    const peaks = new Map();
    const states = new Map(pads.map((pad) => [pad.id, supported ? "idle" : "unsupported"]));

    function ensureContext() {
        if (!supported) return null;
        if (!context) {
            context = new AudioContextClass();
            analyser = context.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.5;
            master = context.createGain();
            master.connect(analyser);
            analyser.connect(context.destination);
        }
        if (context.state === "suspended" && typeof context.resume === "function") {
            Promise.resolve(context.resume()).catch(() => {});
        }
        return context;
    }

    function load(padId) {
        if (loads.has(padId)) return loads.get(padId);
        const pad = byId.get(padId);
        const ctx = ensureContext();
        if (!ctx) {
            const unsupported = Promise.resolve(null);
            loads.set(padId, unsupported);
            return unsupported;
        }
        states.set(padId, "loading");
        const loading = (async () => {
            try {
                const response = await fetchImpl(pad.sound);
                if (!response || !response.ok) {
                    throw new Error(`HTTP ${response ? response.status : "no response"}`);
                }
                const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
                buffers.set(padId, buffer);
                peaks.set(padId, peakOf(buffer));
                states.set(padId, "ready");
                return buffer;
            } catch (error) {
                states.set(padId, "failed");
                logger.warn(`DrumKit audio: could not load "${pad.name}" from ${pad.sound}`, error);
                return null;
            }
        })();
        loads.set(padId, loading);
        return loading;
    }

    function assertPadId(padId) {
        if (!byId.has(padId)) {
            throw new TypeError(`AudioEngine: unknown pad id ${JSON.stringify(padId)}`);
        }
    }

    return Object.freeze({
        /** False when the environment has no Web Audio or fetch; play() then resolves { ok: false }. */
        get supported() {
            return supported;
        },

        /** "unsupported" | "idle" | "loading" | "ready" | "failed" for one pad. */
        status(padId) {
            assertPadId(padId);
            return states.get(padId);
        },

        /** Call from the first user gesture: creates/resumes the context and preloads every sample. */
        unlock() {
            if (!ensureContext()) return;
            pads.forEach((pad) => load(pad.id));
        },

        /** Nominal intensity (0..1) of a loaded pad's sample, 0 until loaded or when failed. */
        peak(padId) {
            assertPadId(padId);
            return peaks.get(padId) ?? 0;
        },

        /**
         * Plays one hit. Resolves { ok, level, reason? }; never rejects for
         * asset or playback problems.
         */
        async play(padId) {
            assertPadId(padId);
            if (!supported) return { ok: false, reason: "unsupported", level: 0 };
            const ctx = ensureContext();
            const buffer = await load(padId);
            if (!buffer) return { ok: false, reason: "failed", level: 0 };
            try {
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(master);
                voices += 1;
                source.onended = () => {
                    voices = Math.max(0, voices - 1);
                    try { source.disconnect(); } catch { /* already disconnected */ }
                };
                source.start(0);
                return { ok: true, level: peaks.get(padId) ?? 0 };
            } catch (error) {
                logger.warn(`DrumKit audio: could not play "${byId.get(padId).name}"`, error);
                return { ok: false, reason: "playback", level: 0 };
            }
        },

        /** Number of hits currently sounding. */
        get activeVoices() {
            return voices;
        },

        /** Current meter reading from the analyser; SILENT_LEVEL before the first play. */
        level() {
            if (!analyser) return SILENT_LEVEL;
            if (!timeDomain || timeDomain.length !== analyser.fftSize) {
                timeDomain = new Float32Array(analyser.fftSize);
            }
            analyser.getFloatTimeDomainData(timeDomain);
            return levelFromSamples(timeDomain, voices > 0);
        },

        /** Closes the context; safe to call twice or before any play. */
        async dispose() {
            const ctx = context;
            context = null;
            master = null;
            analyser = null;
            voices = 0;
            if (ctx && typeof ctx.close === "function") {
                await Promise.resolve(ctx.close()).catch(() => {});
            }
        }
    });
}
