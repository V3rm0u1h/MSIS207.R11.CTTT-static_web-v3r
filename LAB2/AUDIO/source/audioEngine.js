/**
 * Mini-React Audio Engine — T-01: Web Audio engine foundation
 *
 * Audio graph (one shared context per engine):
 *   AudioBufferSourceNode -> AnalyserNode -> AudioContext.destination
 *
 * The engine owns its AudioContext, analyser and active source node. It
 * never touches the DOM: the UI layer reads errors through AudioEngineError
 * codes and frequency data through getFrequencyData().
 *
 * Out of scope here: request queueing (T-02), AbortController cancellation
 * (T-03) and animation loops (T-04).
 */

export const SUPPORTED_FFT_SIZES = Object.freeze([256, 512]);
export const DEFAULT_FFT_SIZE = 512;
export const DEFAULT_SMOOTHING = 0.8;

export const AUDIO_ERROR_CODES = Object.freeze({
    UNSUPPORTED: "unsupported",
    INVALID_URL: "invalid-url",
    NETWORK: "network",
    HTTP: "http",
    DECODE: "decode",
    NOT_READY: "not-ready",
    SUSPENDED: "suspended",
    DISPOSED: "disposed"
});

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "blob:"]);

/** Error carrying a stable code so the UI can show a clear message. */
export class AudioEngineError extends Error {
    constructor(code, message, options = {}) {
        super(message, options);
        this.name = "AudioEngineError";
        this.code = code;
    }
}

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function validateFftSize(fftSize) {
    if (!SUPPORTED_FFT_SIZES.includes(fftSize)) {
        throw new TypeError(`Audio engine: fftSize must be one of ${SUPPORTED_FFT_SIZES.join(", ")}; received ${String(fftSize)}.`);
    }
}

function validateSmoothing(value) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
        throw new TypeError("Audio engine: smoothingTimeConstant must be a number between 0 and 1.");
    }
}

/** Resolve url against the page and reject schemes fetch should never load. */
function resolveAudioUrl(url, baseUrl) {
    if (typeof url !== "string" || url.trim() === "") {
        throw new AudioEngineError(AUDIO_ERROR_CODES.INVALID_URL, "Audio URL must be a non-empty string.");
    }
    let resolved;
    try {
        resolved = new URL(url.trim(), baseUrl);
    } catch (cause) {
        throw new AudioEngineError(AUDIO_ERROR_CODES.INVALID_URL, `"${url}" is not a valid URL.`, { cause });
    }
    if (!ALLOWED_PROTOCOLS.has(resolved.protocol)) {
        throw new AudioEngineError(AUDIO_ERROR_CODES.INVALID_URL, `Audio URL scheme "${resolved.protocol}" is not allowed.`);
    }
    return resolved.href;
}

/** Duck-typed so buffers from any context (or test doubles) are accepted. */
function isAudioBuffer(value) {
    return value !== null &&
        typeof value === "object" &&
        typeof value.duration === "number" &&
        typeof value.numberOfChannels === "number" &&
        typeof value.getChannelData === "function";
}

/**
 * Create an audio engine. The AudioContext is created lazily on first use,
 * then reused for every track.
 *
 * options.AudioContextClass and options.fetch exist for tests; they default
 * to the browser implementations.
 */
export function createAudioEngine(options = {}) {
    if (!isPlainObject(options)) {
        throw new TypeError("Audio engine: options must be a plain object.");
    }
    const {
        fftSize = DEFAULT_FFT_SIZE,
        smoothingTimeConstant = DEFAULT_SMOOTHING,
        AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext,
        fetch: fetchImpl = globalThis.fetch?.bind(globalThis),
        baseUrl = globalThis.document?.baseURI
    } = options;
    validateFftSize(fftSize);
    validateSmoothing(smoothingTimeConstant);

    let context = null;
    let analyser = null;
    let frequencyData = null;
    let source = null;
    let disposed = false;

    function assertUsable() {
        if (disposed) {
            throw new AudioEngineError(AUDIO_ERROR_CODES.DISPOSED, "The audio engine has been disposed.");
        }
    }

    /** Create the shared context and analyser once. */
    function ensureContext() {
        assertUsable();
        if (context) return context;
        if (typeof AudioContextClass !== "function") {
            throw new AudioEngineError(AUDIO_ERROR_CODES.UNSUPPORTED, "This browser does not support the Web Audio API.");
        }
        context = new AudioContextClass();
        analyser = context.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;
        analyser.connect(context.destination);
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        return context;
    }

    /**
     * Resume a context the browser suspended until a user gesture.
     * Call it from a click handler. Resolves to the context state.
     */
    async function resume() {
        const ctx = ensureContext();
        if (ctx.state === "suspended") {
            try {
                await ctx.resume();
            } catch (cause) {
                throw new AudioEngineError(AUDIO_ERROR_CODES.SUSPENDED, "Audio playback is blocked until you interact with the page.", { cause });
            }
        }
        return ctx.state;
    }

    /** Fetch url and decode it into an AudioBuffer. */
    async function load(url) {
        const href = resolveAudioUrl(url, baseUrl);
        const ctx = ensureContext();
        if (typeof fetchImpl !== "function") {
            throw new AudioEngineError(AUDIO_ERROR_CODES.UNSUPPORTED, "This browser does not support fetch().");
        }

        let response;
        try {
            response = await fetchImpl(href);
        } catch (cause) {
            // fetch() rejects with a TypeError for offline, DNS and CORS failures alike.
            throw new AudioEngineError(AUDIO_ERROR_CODES.NETWORK,
                "Could not download the track. Check the connection, or the server's CORS headers for cross-origin files.", { cause });
        }
        if (!response.ok) {
            throw new AudioEngineError(AUDIO_ERROR_CODES.HTTP,
                `Could not download the track (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}).`);
        }

        let data;
        try {
            data = await response.arrayBuffer();
        } catch (cause) {
            throw new AudioEngineError(AUDIO_ERROR_CODES.NETWORK, "The download was interrupted.", { cause });
        }

        try {
            const buffer = await ctx.decodeAudioData(data);
            assertUsable();
            return buffer;
        } catch (cause) {
            if (cause instanceof AudioEngineError) throw cause;
            throw new AudioEngineError(AUDIO_ERROR_CODES.DECODE, "The file is not a supported or valid audio format.", { cause });
        }
    }

    /** Stop and release the active source node, if any. */
    function stop() {
        if (!source) return;
        const current = source;
        source = null;
        current.onended = null;
        try {
            current.stop();
        } catch {
            // Already stopped: stop() may throw InvalidStateError in older browsers.
        }
        current.disconnect();
    }

    /**
     * Play buffer from the start. A new AudioBufferSourceNode is created for
     * every call because a source node cannot be restarted.
     * options.onEnded runs when the track finishes on its own (not on stop()).
     */
    async function play(buffer, playOptions = {}) {
        assertUsable();
        if (!isAudioBuffer(buffer)) {
            throw new AudioEngineError(AUDIO_ERROR_CODES.NOT_READY, "No track is ready to play yet. Load a track first.");
        }
        if (!isPlainObject(playOptions)) {
            throw new TypeError("Audio engine: play options must be a plain object.");
        }
        const { onEnded } = playOptions;
        if (onEnded !== undefined && typeof onEnded !== "function") {
            throw new TypeError("Audio engine: onEnded must be a function.");
        }

        const state = await resume();
        if (state !== "running") {
            throw new AudioEngineError(AUDIO_ERROR_CODES.SUSPENDED, "Audio playback is blocked until you interact with the page.");
        }

        stop();
        const next = context.createBufferSource();
        next.buffer = buffer;
        next.connect(analyser);
        next.onended = () => {
            if (source !== next) return;
            source = null;
            next.disconnect();
            onEnded?.();
        };
        source = next;
        next.start(0);
    }

    function getAnalyser() {
        ensureContext();
        return analyser;
    }

    /** Switch between the supported FFT sizes; frequency data is resized to match. */
    function setFftSize(size) {
        validateFftSize(size);
        ensureContext();
        analyser.fftSize = size;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }

    /**
     * Copy the current spectrum into a reused Uint8Array (0-255 per bin).
     * The same array is returned every call, so callers drawing at 60 FPS do
     * not allocate; copy it if you need to keep a snapshot.
     */
    function getFrequencyData() {
        ensureContext();
        analyser.getByteFrequencyData(frequencyData);
        return frequencyData;
    }

    /** Stop playback, disconnect the graph and close the context. */
    async function dispose() {
        if (disposed) return;
        stop();
        disposed = true;
        const ctx = context;
        analyser?.disconnect();
        context = null;
        analyser = null;
        frequencyData = null;
        if (ctx && ctx.state !== "closed") await ctx.close();
    }

    return Object.freeze({
        resume,
        load,
        play,
        stop,
        getAnalyser,
        setFftSize,
        getFrequencyData,
        dispose,
        get state() { return disposed ? "closed" : context?.state ?? "uninitialized"; },
        get isPlaying() { return source !== null; }
    });
}
