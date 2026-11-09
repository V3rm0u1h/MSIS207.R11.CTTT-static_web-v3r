import { describe, expect, test, vi } from "vitest";
import {
    SILENCE_DBFS, SILENT_LEVEL, createAudioEngine, levelFromSamples, peakOf, rmsOf, toDbfs, toPercent
} from "./audioEngine.js";
import { DRUM_PADS } from "./drumPads.js";

// T-01C — Web Audio engine (PRD 3 sections 2 and 5).

/** A tiny AudioContext double: records nodes, decodes anything non-empty, meters a constant sample. */
class FakeAudioContext {
    static instances = [];
    static sample = 0;

    constructor() {
        this.state = "suspended";
        this.destination = { kind: "destination" };
        this.sources = [];
        this.resumes = 0;
        this.closed = false;
        FakeAudioContext.instances.push(this);
    }

    node(extra = {}) {
        return { connect: vi.fn(), disconnect: vi.fn(), ...extra };
    }

    resume() {
        this.resumes += 1;
        this.state = "running";
        return Promise.resolve();
    }

    close() {
        this.closed = true;
        this.state = "closed";
        return Promise.resolve();
    }

    createGain() {
        return this.node({ gain: { value: 1 } });
    }

    createAnalyser() {
        return this.node({
            fftSize: 2048,
            smoothingTimeConstant: 0.8,
            getFloatTimeDomainData: (array) => array.fill(FakeAudioContext.sample)
        });
    }

    createBufferSource() {
        const source = this.node({ buffer: null, onended: null, start: vi.fn(), stop: vi.fn() });
        this.sources.push(source);
        return source;
    }

    decodeAudioData(data) {
        if (data.byteLength === 0) return Promise.reject(new Error("EncodingError: unable to decode"));
        return Promise.resolve({
            numberOfChannels: 2,
            length: 4,
            getChannelData: (channel) => Float32Array.from(channel === 0 ? [0, 0.5, -0.9, 0.2] : [0.1, -0.3, 0.4, 0])
        });
    }
}

/** fetch double: URL decides the outcome. */
function fakeFetch(url) {
    if (url.includes("missing")) return Promise.resolve({ ok: false, status: 404 });
    if (url.includes("corrupt")) return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });
    if (url.includes("offline")) return Promise.reject(new TypeError("Failed to fetch"));
    return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)) });
}

function makeEngine(overrides = {}) {
    FakeAudioContext.instances = [];
    const logger = { warn: vi.fn() };
    const engine = createAudioEngine({
        pads: DRUM_PADS,
        AudioContextClass: FakeAudioContext,
        fetchImpl: fakeFetch,
        logger,
        ...overrides
    });
    return { engine, logger };
}

const withSound = (pad, sound) => ({ ...pad, sound });

describe("level maths", () => {
    test("rmsOf: silence is 0, a full-scale square wave is 1, a half-scale one is 0.5", () => {
        expect(rmsOf(new Float32Array(8))).toBe(0);
        expect(rmsOf(Float32Array.from([1, -1, 1, -1]))).toBe(1);
        expect(rmsOf(Float32Array.from([0.5, -0.5]))).toBeCloseTo(0.5);
        expect(rmsOf([])).toBe(0);
        expect(() => rmsOf(null)).toThrow(TypeError);
    });

    test("toDbfs: full scale is 0 dBFS, half is about -6 dB, silence and bad input are the floor", () => {
        expect(toDbfs(1)).toBe(0);
        expect(toDbfs(0.5)).toBeCloseTo(-6.02, 1);
        expect(toDbfs(0)).toBe(SILENCE_DBFS);
        expect(toDbfs(-1)).toBe(SILENCE_DBFS);
        expect(toDbfs(NaN)).toBe(SILENCE_DBFS);
        expect(toDbfs(2)).toBe(0);
    });

    test("toPercent is linear in dB between the floor (0 %) and full scale (100 %)", () => {
        expect(toPercent(SILENCE_DBFS)).toBe(0);
        expect(toPercent(0)).toBe(100);
        expect(toPercent(-30)).toBe(50);
        expect(toPercent(-90)).toBe(0);
    });

    test("levelFromSamples reports rms, dBFS, percent and whether the graph is active", () => {
        expect(levelFromSamples(new Float32Array(4))).toEqual({ ...SILENT_LEVEL });
        expect(levelFromSamples(new Float32Array(4), true).active).toBe(true);
        const half = levelFromSamples(Float32Array.from([0.5, -0.5, 0.5, -0.5]));
        expect(half.rms).toBeCloseTo(0.5);
        expect(half.dbfs).toBeCloseTo(-6.02, 1);
        expect(half.percent).toBe(90);
        expect(half.active).toBe(true);
    });

    test("peakOf is the largest absolute sample across channels, clamped to 1", () => {
        const buffer = new FakeAudioContext().decodeAudioData(new ArrayBuffer(1));
        return buffer.then((decoded) => {
            expect(peakOf(decoded)).toBeCloseTo(0.9);
            expect(peakOf({ numberOfChannels: 1, getChannelData: () => Float32Array.from([3]) })).toBe(1);
            expect(peakOf({ numberOfChannels: 0, getChannelData: () => [] })).toBe(0);
        });
    });
});

describe("createAudioEngine", () => {
    test("validates its inputs (Project Rule 2)", () => {
        expect(() => createAudioEngine({ pads: [] })).toThrow(TypeError);
        expect(() => createAudioEngine({ pads: DRUM_PADS, logger: {} })).toThrow(TypeError);
        const { engine } = makeEngine();
        expect(() => engine.status("nope")).toThrow(TypeError);
        return expect(engine.play("nope")).rejects.toThrow(TypeError);
    });

    test("creates no AudioContext until the first user-driven call", () => {
        const { engine } = makeEngine();
        expect(FakeAudioContext.instances).toHaveLength(0);
        expect(engine.status("kick")).toBe("idle");
        expect(engine.level()).toBe(SILENT_LEVEL);
        engine.unlock();
        expect(FakeAudioContext.instances).toHaveLength(1);
    });

    test("reuses one AudioContext, resumes it, and wires master → analyser → destination once", async () => {
        const { engine } = makeEngine();
        await engine.play("kick");
        await engine.play("snare");
        await engine.play("kick");
        expect(FakeAudioContext.instances).toHaveLength(1);
        const context = FakeAudioContext.instances[0];
        expect(context.resumes).toBeGreaterThanOrEqual(1);
        expect(context.state).toBe("running");
        // every source connects to the same master node
        const targets = new Set(context.sources.map((source) => source.connect.mock.calls[0][0]));
        expect(targets.size).toBe(1);
    });

    test("fetches and decodes each sample once, then plays from the cached buffer", async () => {
        const fetchImpl = vi.fn(fakeFetch);
        const { engine } = makeEngine({ fetchImpl });
        await Promise.all([engine.play("tom"), engine.play("tom"), engine.play("tom")]);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(fetchImpl).toHaveBeenCalledWith("/sounds/tom.wav");
        expect(engine.status("tom")).toBe("ready");
        expect(FakeAudioContext.instances[0].sources).toHaveLength(3);
    });

    test("overlapping hits each get their own source and none is stopped", async () => {
        const { engine } = makeEngine();
        await engine.play("hihat");
        await engine.play("hihat");
        const [first, second] = FakeAudioContext.instances[0].sources;
        expect(first.start).toHaveBeenCalledWith(0);
        expect(second.start).toHaveBeenCalledWith(0);
        expect(first.stop).not.toHaveBeenCalled();
        expect(engine.activeVoices).toBe(2);
        first.onended();
        expect(engine.activeVoices).toBe(1);
        expect(first.disconnect).toHaveBeenCalled();
    });

    test("play resolves ok with the sample's nominal intensity", async () => {
        const { engine } = makeEngine();
        expect(engine.peak("clap")).toBe(0);
        await expect(engine.play("clap")).resolves.toEqual({ ok: true, level: expect.closeTo(0.9, 5) });
        expect(engine.peak("clap")).toBeCloseTo(0.9);
    });

    test("unlock preloads every pad in one go", async () => {
        const fetchImpl = vi.fn(fakeFetch);
        const { engine } = makeEngine({ fetchImpl });
        engine.unlock();
        expect(fetchImpl).toHaveBeenCalledTimes(DRUM_PADS.length);
        await engine.play("kick");
        expect(fetchImpl).toHaveBeenCalledTimes(DRUM_PADS.length);
        expect(DRUM_PADS.every((pad) => engine.status(pad.id) === "ready")).toBe(true);
    });

    test.each([
        ["a 404", "/sounds/missing.wav"],
        ["an undecodable file", "/sounds/corrupt.wav"],
        ["a network failure", "/sounds/offline.wav"]
    ])("handles %s without throwing: status failed, play ok:false, one warning", async (_, sound) => {
        const pads = [withSound(DRUM_PADS[0], sound), ...DRUM_PADS.slice(1)];
        const { engine, logger } = makeEngine({ pads });
        await expect(engine.play("kick")).resolves.toEqual({ ok: false, reason: "failed", level: 0 });
        await expect(engine.play("kick")).resolves.toMatchObject({ ok: false });
        expect(engine.status("kick")).toBe("failed");
        expect(logger.warn).toHaveBeenCalledTimes(1);
        // The other pads are unaffected.
        await expect(engine.play("snare")).resolves.toMatchObject({ ok: true });
    });

    test("a playback error (e.g. start() throwing) is reported, not thrown", async () => {
        const { engine, logger } = makeEngine();
        await engine.play("kick");
        const context = FakeAudioContext.instances[0];
        const original = context.createBufferSource.bind(context);
        context.createBufferSource = () => {
            const source = original();
            source.start = () => { throw new DOMException("InvalidStateError"); };
            return source;
        };
        await expect(engine.play("kick")).resolves.toEqual({ ok: false, reason: "playback", level: 0 });
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    test("without Web Audio the engine is unsupported and everything degrades quietly", async () => {
        const { engine } = makeEngine({ AudioContextClass: undefined });
        expect(engine.supported).toBe(false);
        expect(engine.status("kick")).toBe("unsupported");
        engine.unlock();
        await expect(engine.play("kick")).resolves.toEqual({ ok: false, reason: "unsupported", level: 0 });
        expect(engine.level()).toBe(SILENT_LEVEL);
        await expect(engine.dispose()).resolves.toBeUndefined();
    });

    test("level() meters the analyser in relative dBFS and knows when voices are sounding", async () => {
        const { engine } = makeEngine();
        FakeAudioContext.sample = 0;
        await engine.play("kick");
        expect(engine.level()).toMatchObject({ percent: 0, active: true });
        FakeAudioContext.sample = 0.5;
        const loud = engine.level();
        expect(loud.dbfs).toBeCloseTo(-6.02, 1);
        expect(loud.percent).toBe(90);
        FakeAudioContext.instances[0].sources[0].onended();
        FakeAudioContext.sample = 0;
        expect(engine.level()).toEqual({ ...SILENT_LEVEL });
    });

    test("dispose closes the context and is idempotent", async () => {
        const { engine } = makeEngine();
        await engine.play("kick");
        const context = FakeAudioContext.instances[0];
        await engine.dispose();
        expect(context.closed).toBe(true);
        expect(engine.level()).toBe(SILENT_LEVEL);
        await expect(engine.dispose()).resolves.toBeUndefined();
    });
});
