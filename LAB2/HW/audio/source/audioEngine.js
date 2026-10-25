/**
 * Mini-React Audio Engine — T-01 Web Audio foundation, T-03 lifecycle
 *
 * Audio graph (one context per engine):
 *   AudioBufferSourceNode -> AnalyserNode -> AudioContext.destination
 *
 * Resource ownership (T-03):
 * - Context: created and owned by the engine, or passed in via
 *   options.context and then only borrowed. dispose() closes an owned
 *   context and never closes a borrowed one.
 * - Analyser: always owned; disconnected on dispose().
 * - Source nodes: tracked in an active-source registry. A node leaves the
 *   registry exactly once, on stop(), replacement, natural end or dispose().
 * - Loads: every load() has its own AbortController, linked to the
 *   caller's signal. dispose() aborts all of them.
 * - Dispose hooks: other owners (the T-04 visualizer's animation frame)
 *   register cleanup with onDispose() so one dispose() releases everything.
 *
 * The engine never touches the DOM: the UI reads errors through
 * AudioEngineError codes and frequency data through getFrequencyData().
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
    DISPOSED: "disposed",
    // Expected lifecycle event, not a failure: the UI must not show it as one.
    ABORTED: "aborted"
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

/** True for an intentional cancellation, from this engine or from fetch. */
export function isAbortError(error) {
    return (error instanceof AudioEngineError && error.code === AUDIO_ERROR_CODES.ABORTED) ||
        (error !== null && typeof error === "object" && error.name === "AbortError");
}

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function isAbortSignal(value) {
    return value !== null &&
        typeof value === "object" &&
        typeof value.aborted === "boolean" &&
        typeof value.addEventListener === "function" &&
        typeof value.removeEventListener === "function";
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

function isAudioContextLike(value) {
    return value !== null &&
        typeof value === "object" &&
        typeof value.createAnalyser === "function" &&
        typeof value.createBufferSource === "function" &&
        typeof value.decodeAudioData === "function";
}

/**
 * Create an audio engine. An owned AudioContext is created lazily on first
 * use, then reused for every track.
 *
 * options.context shares an existing context (the engine will not close it).
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
        context: sharedContext = null,
        AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext,
        fetch: fetchImpl = globalThis.fetch?.bind(globalThis),
        baseUrl = globalThis.document?.baseURI
    } = options;
    validateFftSize(fftSize);
    validateSmoothing(smoothingTimeConstant);
    if (sharedContext !== null && !isAudioContextLike(sharedContext)) {
        throw new TypeError("Audio engine: context must be an AudioContext.");
    }

    const ownsContext = sharedContext === null;
    let context = null;
    let analyser = null;
    let frequencyData = null;
    let disposed = false;
    const activeSources = new Set();
    const loadControllers = new Set();
    const disposeHooks = new Set();

    function assertUsable() {
        if (disposed) {
            throw new AudioEngineError(AUDIO_ERROR_CODES.DISPOSED, "The audio engine has been disposed.");
        }
    }

    /** Create (or adopt) the context and the owned analyser once. */
    function ensureContext() {
        assertUsable();
        if (context) return context;
        if (ownsContext) {
            if (typeof AudioContextClass !== "function") {
                throw new AudioEngineError(AUDIO_ERROR_CODES.UNSUPPORTED, "This browser does not support the Web Audio API.");
            }
            context = new AudioContextClass();
        } else {
            context = sharedContext;
        }
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

    function abortedError(message = "The track load was cancelled.") {
        return new AudioEngineError(AUDIO_ERROR_CODES.ABORTED, message);
    }

    /**
     * Fetch url and decode it into an AudioBuffer.
     *
     * options.signal cancels the load. The download itself is aborted.
     * decodeAudioData() cannot be aborted: if the signal fires while it runs,
     * the decode is left to finish, its result is dropped, and the load
     * rejects with code "aborted".
     */
    async function load(url, loadOptions = {}) {
        if (!isPlainObject(loadOptions)) {
            throw new TypeError("Audio engine: load options must be a plain object.");
        }
        const { signal = null } = loadOptions;
        if (signal !== null && !isAbortSignal(signal)) {
            throw new TypeError("Audio engine: signal must be an AbortSignal.");
        }
        const href = resolveAudioUrl(url, baseUrl);
        const ctx = ensureContext();
        if (typeof fetchImpl !== "function") {
            throw new AudioEngineError(AUDIO_ERROR_CODES.UNSUPPORTED, "This browser does not support fetch().");
        }
        if (signal?.aborted) throw abortedError();

        // Own controller per load, so dispose() can abort it and the caller's
        // signal cannot be aborted by us by mistake.
        const controller = new AbortController();
        const forwardAbort = () => controller.abort(signal.reason);
        signal?.addEventListener("abort", forwardAbort, { once: true });
        loadControllers.add(controller);

        try {
            let response;
            try {
                response = await fetchImpl(href, { signal: controller.signal });
            } catch (cause) {
                if (controller.signal.aborted) throw abortedError();
                // fetch() rejects with a TypeError for offline, DNS and CORS failures alike.
                throw new AudioEngineError(AUDIO_ERROR_CODES.NETWORK,
                    "Could not download the track. Check the connection, or the server's CORS headers for cross-origin files.", { cause });
            }
            if (controller.signal.aborted) throw abortedError();
            if (!response.ok) {
                throw new AudioEngineError(AUDIO_ERROR_CODES.HTTP,
                    `Could not download the track (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}).`);
            }

            let data;
            try {
                data = await response.arrayBuffer();
            } catch (cause) {
                if (controller.signal.aborted) throw abortedError();
                throw new AudioEngineError(AUDIO_ERROR_CODES.NETWORK, "The download was interrupted.", { cause });
            }
            if (controller.signal.aborted) throw abortedError();

            let buffer;
            try {
                buffer = await ctx.decodeAudioData(data);
            } catch (cause) {
                if (controller.signal.aborted) throw abortedError();
                throw new AudioEngineError(AUDIO_ERROR_CODES.DECODE, "The file is not a supported or valid audio format.", { cause });
            }
            if (controller.signal.aborted) {
                // Stale: the decode ran to completion; drop the result.
                buffer = null;
                throw abortedError("The track load was cancelled; its decode had already started and its result was discarded.");
            }
            return buffer;
        } finally {
            signal?.removeEventListener("abort", forwardAbort);
            loadControllers.delete(controller);
        }
    }

    /** Remove one node from the registry. Safe to call more than once. */
    function releaseSource(node, { stopNode }) {
        if (!activeSources.delete(node)) return false;
        node.onended = null;
        if (stopNode) {
            try {
                node.stop();
            } catch {
                // Already stopped: stop() may throw InvalidStateError in older browsers.
            }
        }
        node.disconnect();
        return true;
    }

    /** Stop and release every active source node. Idempotent. */
    function stop() {
        for (const node of [...activeSources]) releaseSource(node, { stopNode: true });
    }

    /**
     * Play buffer from the start. A new AudioBufferSourceNode is created for
     * every call because a source node cannot be restarted; the previous one
     * is stopped and released first.
     *
     * options.onEnded runs when the track finishes on its own (not on stop()).
     * options.isCurrent is checked after the context resumes, right before
     * the node starts; return false to drop a stale play request.
     * Resolves to true when playback started, false when it was dropped.
     */
    async function play(buffer, playOptions = {}) {
        assertUsable();
        if (!isAudioBuffer(buffer)) {
            throw new AudioEngineError(AUDIO_ERROR_CODES.NOT_READY, "No track is ready to play yet. Load a track first.");
        }
        if (!isPlainObject(playOptions)) {
            throw new TypeError("Audio engine: play options must be a plain object.");
        }
        const { onEnded, isCurrent } = playOptions;
        if (onEnded !== undefined && typeof onEnded !== "function") {
            throw new TypeError("Audio engine: onEnded must be a function.");
        }
        if (isCurrent !== undefined && typeof isCurrent !== "function") {
            throw new TypeError("Audio engine: isCurrent must be a function.");
        }

        const state = await resume();
        if (disposed) return false;
        if (state !== "running") {
            throw new AudioEngineError(AUDIO_ERROR_CODES.SUSPENDED, "Audio playback is blocked until you interact with the page.");
        }
        if (isCurrent && !isCurrent()) return false;

        stop();
        const node = context.createBufferSource();
        node.buffer = buffer;
        node.connect(analyser);
        node.onended = () => {
            // Natural end: release, then report. A stopped node never gets here.
            if (releaseSource(node, { stopNode: false })) onEnded?.();
        };
        activeSources.add(node);
        node.start(0);
        return true;
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

    /**
     * Register cleanup to run once on dispose() (an animation frame, a
     * listener). Returns an unregister function. Runs at once if the engine
     * is already disposed.
     */
    function onDispose(callback) {
        if (typeof callback !== "function") {
            throw new TypeError("Audio engine: dispose hook must be a function.");
        }
        if (disposed) {
            callback();
            return () => {};
        }
        disposeHooks.add(callback);
        return () => disposeHooks.delete(callback);
    }

    /**
     * Release everything the engine owns. Safe to call more than once:
     * aborts loads, runs dispose hooks, stops sources, disconnects the
     * analyser and closes the context only when the engine owns it.
     */
    async function dispose() {
        if (disposed) return;
        disposed = true;
        for (const controller of [...loadControllers]) controller.abort();
        loadControllers.clear();
        for (const hook of [...disposeHooks]) {
            try {
                hook();
            } catch (error) {
                console.error(error);
            }
        }
        disposeHooks.clear();
        stop();
        analyser?.disconnect();
        const ctx = context;
        context = null;
        analyser = null;
        frequencyData = null;
        if (ownsContext && ctx && ctx.state !== "closed") await ctx.close();
    }

    return Object.freeze({
        resume,
        load,
        play,
        stop,
        getAnalyser,
        setFftSize,
        getFrequencyData,
        onDispose,
        dispose,
        get state() { return disposed ? "closed" : context?.state ?? "uninitialized"; },
        get isPlaying() { return activeSources.size > 0; },
        get activeSourceCount() { return activeSources.size; },
        get pendingLoadCount() { return loadControllers.size; },
        get ownsContext() { return ownsContext; }
    });
}
