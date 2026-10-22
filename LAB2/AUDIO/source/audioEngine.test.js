import {
    createAudioEngine,
    AudioEngineError,
    AUDIO_ERROR_CODES,
    DEFAULT_FFT_SIZE,
    SUPPORTED_FFT_SIZES
} from "./audioEngine.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType } from "../../HW/source/testHarness.js";

// T-01 — Web Audio engine foundation.

/** Records connections and lifecycle calls so the audio graph can be checked. */
class FakeNode {
    constructor(context, kind) {
        this.context = context;
        this.kind = kind;
        this.connections = [];
    }
    connect(target) { this.connections.push(target); return target; }
    disconnect() { this.connections = []; this.disconnected = true; }
}

class FakeAnalyser extends FakeNode {
    constructor(context) {
        super(context, "analyser");
        this.fftSize = 2048;
        this.smoothingTimeConstant = 0;
    }
    get frequencyBinCount() { return this.fftSize / 2; }
    getByteFrequencyData(array) { array.fill(0); array[10] = 200; }
}

class FakeSource extends FakeNode {
    constructor(context) {
        super(context, "source");
        this.buffer = null;
        this.startCalls = 0;
        this.stopCalls = 0;
        this.onended = null;
    }
    start() { this.startCalls += 1; }
    stop() {
        this.stopCalls += 1;
        if (this.stopCalls > 1) throw new DOMException("already stopped", "InvalidStateError");
    }
}

function fakeContextClass({ initialState = "running", resumeFails = false } = {}) {
    const instances = [];
    class FakeAudioContext {
        constructor() {
            this.state = initialState;
            this.sampleRate = 44100;
            this.destination = { kind: "destination" };
            this.sources = [];
            this.closed = false;
            instances.push(this);
        }
        createAnalyser() { this.analyser = new FakeAnalyser(this); return this.analyser; }
        createBufferSource() {
            const source = new FakeSource(this);
            this.sources.push(source);
            return source;
        }
        async resume() {
            if (resumeFails) throw new DOMException("not allowed", "NotAllowedError");
            this.state = "running";
        }
        async close() { this.state = "closed"; this.closed = true; }
        async decodeAudioData(data) {
            if (data.byteLength === 0) throw new DOMException("bad data", "EncodingError");
            return fakeBuffer();
        }
    }
    FakeAudioContext.instances = instances;
    return FakeAudioContext;
}

function fakeBuffer() {
    return { duration: 1, numberOfChannels: 1, sampleRate: 44100, getChannelData: () => new Float32Array(1) };
}

const okFetch = async () => new Response(new Uint8Array([1, 2, 3]));
const fakeEngine = (options = {}) => {
    const AudioContextClass = options.AudioContextClass ?? fakeContextClass(options.contextOptions);
    const engine = createAudioEngine({ AudioContextClass, fetch: okFetch, baseUrl: "https://example.test/", ...options.engineOptions });
    return { engine, AudioContextClass };
};

async function expectAudioError(promiseOrFn, code) {
    let error;
    try {
        await (typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn);
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof AudioEngineError, `Expected AudioEngineError(${code}), received ${error}`);
    assertEqual(error.code, code, "Error code");
    assert(error.message.length > 0, "Error has a readable message");
    return error;
}

// --- FR-01 / FR-02: context and graph ---

test("rejects unsupported options before creating any audio objects", () => {
    assertThrowsType(() => createAudioEngine([]), /options must be a plain object/);
    assertThrowsType(() => createAudioEngine({ fftSize: 1024 }), /fftSize must be one of 256, 512/);
    assertThrowsType(() => createAudioEngine({ fftSize: "512" }), /fftSize/);
    assertThrowsType(() => createAudioEngine({ smoothingTimeConstant: 1.5 }), /smoothingTimeConstant/);
    assertThrowsType(() => createAudioEngine({ smoothingTimeConstant: Number.NaN }), /smoothingTimeConstant/);
});

test("supports FFT sizes 256 and 512, defaulting to 512", () => {
    assertDeepEqual([...SUPPORTED_FFT_SIZES], [256, 512], "Supported sizes");
    assertEqual(DEFAULT_FFT_SIZE, 512, "Default size");
});

test("creates the AudioContext lazily and reuses it", () => {
    const { engine, AudioContextClass } = fakeEngine();
    assertEqual(engine.state, "uninitialized", "No context before first use");
    assertEqual(AudioContextClass.instances.length, 0, "Constructor not called yet");
    const first = engine.getAnalyser();
    const second = engine.getAnalyser();
    assertEqual(first, second, "Same analyser");
    assertEqual(AudioContextClass.instances.length, 1, "One shared context");
});

test("wires analyser to destination with fftSize 512 and 256 frequency bins", () => {
    const { engine, AudioContextClass } = fakeEngine();
    const analyser = engine.getAnalyser();
    const context = AudioContextClass.instances[0];
    assertEqual(analyser.fftSize, 512, "fftSize");
    assertEqual(analyser.frequencyBinCount, 256, "Bin count is half the FFT size");
    assertEqual(analyser.smoothingTimeConstant, 0.8, "Smoothing");
    assertDeepEqual(analyser.connections.map((node) => node.kind), ["destination"], "Analyser -> destination");
    assertEqual(analyser.connections[0], context.destination, "Real destination node");
});

test("setFftSize switches to 256 and resizes frequency data to 128 bins", () => {
    const { engine } = fakeEngine();
    engine.setFftSize(256);
    assertEqual(engine.getAnalyser().fftSize, 256, "fftSize");
    assertEqual(engine.getFrequencyData().length, 128, "Frequency data length");
    assertThrowsType(() => engine.setFftSize(300), /fftSize/);
});

test("getFrequencyData fills and reuses one Uint8Array", () => {
    const { engine } = fakeEngine();
    const first = engine.getFrequencyData();
    const second = engine.getFrequencyData();
    assert(first instanceof Uint8Array, "Uint8Array");
    assertEqual(first.length, 256, "One value per bin");
    assertEqual(first[10], 200, "Analyser data copied in");
    assertEqual(first, second, "No allocation per frame");
});

test("reports a clear error when Web Audio is unavailable", async () => {
    const engine = createAudioEngine({ AudioContextClass: null, fetch: okFetch, baseUrl: "https://example.test/" });
    await expectAudioError(() => engine.getAnalyser(), AUDIO_ERROR_CODES.UNSUPPORTED);
});

test("resume() resumes a suspended context", async () => {
    const { engine } = fakeEngine({ contextOptions: { initialState: "suspended" } });
    assertEqual(await engine.resume(), "running", "State after resume");
});

test("resume() reports a blocked context as a suspended error", async () => {
    const { engine } = fakeEngine({ contextOptions: { initialState: "suspended", resumeFails: true } });
    await expectAudioError(engine.resume(), AUDIO_ERROR_CODES.SUSPENDED);
});

// --- FR-03 / FR-05: loading and decoding ---

test("load() fetches, checks status, and decodes into an AudioBuffer", async () => {
    const requested = [];
    const { engine } = fakeEngine({ engineOptions: { fetch: async (url) => { requested.push(url); return okFetch(); } } });
    const buffer = await engine.load("tracks/a.wav");
    assertDeepEqual(requested, ["https://example.test/tracks/a.wav"], "Resolved against the base URL");
    assertEqual(buffer.duration, 1, "Decoded buffer returned");
});

test("load() rejects invalid URLs without fetching", async () => {
    let fetched = false;
    const { engine } = fakeEngine({ engineOptions: { fetch: async () => { fetched = true; return okFetch(); } } });
    await expectAudioError(engine.load(""), AUDIO_ERROR_CODES.INVALID_URL);
    await expectAudioError(engine.load(42), AUDIO_ERROR_CODES.INVALID_URL);
    await expectAudioError(engine.load("http://[bad"), AUDIO_ERROR_CODES.INVALID_URL);
    await expectAudioError(engine.load("javascript:alert(1)"), AUDIO_ERROR_CODES.INVALID_URL);
    await expectAudioError(engine.load("data:audio/wav;base64,AAAA"), AUDIO_ERROR_CODES.INVALID_URL);
    assert(!fetched, "fetch never called");
});

test("load() reports network failures (offline, CORS)", async () => {
    const { engine } = fakeEngine({ engineOptions: { fetch: async () => { throw new TypeError("Failed to fetch"); } } });
    const error = await expectAudioError(engine.load("a.wav"), AUDIO_ERROR_CODES.NETWORK);
    assert(/CORS/.test(error.message), "Message mentions CORS");
    assert(error.cause instanceof TypeError, "Original error kept as cause");
});

test("load() reports HTTP errors with the status code", async () => {
    const { engine } = fakeEngine({ engineOptions: { fetch: async () => new Response("nope", { status: 404, statusText: "Not Found" }) } });
    const error = await expectAudioError(engine.load("a.wav"), AUDIO_ERROR_CODES.HTTP);
    assert(error.message.includes("404"), "Message includes status");
});

test("load() reports decoding failures", async () => {
    const { engine } = fakeEngine({ engineOptions: { fetch: async () => new Response(new Uint8Array(0)) } });
    await expectAudioError(engine.load("a.wav"), AUDIO_ERROR_CODES.DECODE);
});

test("real AudioContext decodes the sample WAV file", async () => {
    const engine = createAudioEngine();
    try {
        const buffer = await engine.load("assets/tone-a440.wav");
        assert(buffer instanceof AudioBuffer, "Real AudioBuffer");
        assert(Math.abs(buffer.duration - 3) < 0.05, `Duration about 3 s, got ${buffer.duration}`);
        assertEqual(engine.getAnalyser().frequencyBinCount, 256, "Real analyser bins");
    } finally {
        await engine.dispose();
    }
});

test("real AudioContext reports a missing file and a corrupted file", async () => {
    const engine = createAudioEngine();
    try {
        await expectAudioError(engine.load("assets/does-not-exist.wav"), AUDIO_ERROR_CODES.HTTP);
        await expectAudioError(engine.load("assets/corrupted.wav"), AUDIO_ERROR_CODES.DECODE);
    } finally {
        await engine.dispose();
    }
});

// --- FR-04: playback ---

test("play() before a buffer is ready reports not-ready", async () => {
    const { engine } = fakeEngine();
    await expectAudioError(engine.play(null), AUDIO_ERROR_CODES.NOT_READY);
    await expectAudioError(engine.play({}), AUDIO_ERROR_CODES.NOT_READY);
    assertEqual(engine.isPlaying, false, "Nothing playing");
});

test("play() connects source -> analyser and starts it", async () => {
    const { engine, AudioContextClass } = fakeEngine();
    const buffer = fakeBuffer();
    await engine.play(buffer);
    const context = AudioContextClass.instances[0];
    const [source] = context.sources;
    assertEqual(source.buffer, buffer, "Buffer assigned");
    assertEqual(source.connections[0], context.analyser, "Source -> analyser");
    assertEqual(source.startCalls, 1, "Started once");
    assertEqual(engine.isPlaying, true, "Playing");
});

test("each play() creates a new source node and stops the previous one", async () => {
    const { engine, AudioContextClass } = fakeEngine();
    const buffer = fakeBuffer();
    await engine.play(buffer);
    await engine.play(buffer);
    const [first, second] = AudioContextClass.instances[0].sources;
    assert(first !== second, "Fresh node per play");
    assertEqual(first.stopCalls, 1, "Previous node stopped");
    assert(first.disconnected, "Previous node disconnected");
    assertEqual(second.startCalls, 1, "New node started");
});

test("play() resumes a suspended context first", async () => {
    const { engine, AudioContextClass } = fakeEngine({ contextOptions: { initialState: "suspended" } });
    await engine.play(fakeBuffer());
    assertEqual(AudioContextClass.instances[0].state, "running", "Context resumed");
    assertEqual(engine.isPlaying, true, "Playing");
});

test("play() reports a suspended error when the browser blocks audio", async () => {
    const { engine, AudioContextClass } = fakeEngine({ contextOptions: { initialState: "suspended", resumeFails: true } });
    await expectAudioError(engine.play(fakeBuffer()), AUDIO_ERROR_CODES.SUSPENDED);
    assertEqual(AudioContextClass.instances[0].sources.length, 0, "No source created");
});

test("stop() releases the source and is safe to repeat", async () => {
    const { engine, AudioContextClass } = fakeEngine();
    let ended = 0;
    await engine.play(fakeBuffer(), { onEnded: () => { ended += 1; } });
    const [source] = AudioContextClass.instances[0].sources;
    engine.stop();
    engine.stop();
    assertEqual(engine.isPlaying, false, "Not playing");
    assert(source.disconnected, "Disconnected");
    assertEqual(source.onended, null, "Ended handler cleared");
    assertEqual(ended, 0, "Manual stop does not count as ended");
});

test("natural end releases the source and calls onEnded", async () => {
    const { engine, AudioContextClass } = fakeEngine();
    let ended = 0;
    await engine.play(fakeBuffer(), { onEnded: () => { ended += 1; } });
    const [source] = AudioContextClass.instances[0].sources;
    source.onended();
    assertEqual(ended, 1, "onEnded called");
    assertEqual(engine.isPlaying, false, "Not playing");
    assert(source.disconnected, "Disconnected");
});

test("play() rejects a non-function onEnded", async () => {
    const { engine } = fakeEngine();
    let error;
    try { await engine.play(fakeBuffer(), { onEnded: "nope" }); } catch (caught) { error = caught; }
    assert(error instanceof TypeError, "TypeError");
});

// --- dispose ---

test("dispose() stops playback, disconnects and closes the context", async () => {
    const { engine, AudioContextClass } = fakeEngine();
    await engine.play(fakeBuffer());
    const context = AudioContextClass.instances[0];
    const analyser = context.analyser;
    await engine.dispose();
    await engine.dispose();
    assert(context.closed, "Context closed");
    assert(analyser.disconnected, "Analyser disconnected");
    assert(context.sources[0].disconnected, "Source disconnected");
    assertEqual(engine.state, "closed", "Engine state");
    await expectAudioError(() => engine.getAnalyser(), AUDIO_ERROR_CODES.DISPOSED);
    await expectAudioError(engine.play(fakeBuffer()), AUDIO_ERROR_CODES.DISPOSED);
});
