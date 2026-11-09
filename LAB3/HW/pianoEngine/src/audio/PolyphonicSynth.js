/**
 * Polyphonic Piano Engine — T-02B 8-voice polyphonic synth
 *
 * Framework-free Web Audio engine: one oscillator + one gain node per
 * sounding note, at most `maxVoices` at once, all sharing ONE AudioContext.
 *
 *   osc (OscillatorNode) ──► gain (GainNode) ──► ctx.destination
 *
 * Voice pool. Active voices live in an ES6 Map, midi => { osc, gain }. A Map
 * iterates in insertion order, so its first key is always the oldest voice:
 * when the pool is full and a new, distinct note arrives, that oldest voice
 * is released (FIFO voice stealing) before the new one starts. Deterministic:
 * the same sequence of notes always steals the same voices.
 *
 * Release. noteOff never cuts a voice dead (that clicks). It cancels any
 * scheduled automation, pins the gain at its current value, ramps it
 * exponentially to 0.0001 over RELEASE_S (40 ms), and only then stops the
 * oscillator, STOP_S (45 ms) after the release began. The voice leaves the
 * Map immediately, so the pool can accept the next note while the tail
 * fades; when the oscillator ends, both nodes are disconnected so nothing
 * lingers in the audio graph.
 *
 * Lifecycle. No AudioContext exists until the first noteOn, which runs inside
 * a user gesture (browsers keep a context created earlier suspended). The
 * same context is reused for every later note and resumed if the browser
 * suspended it; close() releases every voice and closes the context.
 *
 * Every argument is type-checked (Project Rule 2): a bad MIDI number or
 * frequency is a TypeError, not a NaN fed to the audio graph.
 */

/** Gain of one sounding voice; 8 × 0.2 stays well clear of clipping for sine waves. */
export const VOICE_GAIN = 0.2;
/** Exponential ramps cannot reach 0, so release ends at this near-silent gain. */
export const SILENT_GAIN = 0.0001;
/** Release ramp length, in seconds. */
export const RELEASE_S = 0.04;
/** The oscillator stops this long after note-off: just after the ramp has finished. */
export const STOP_S = 0.045;
export const DEFAULT_MAX_VOICES = 8;

function defaultContextClass() {
    return globalThis.AudioContext ?? globalThis.webkitAudioContext;
}

function assertMidi(midi) {
    if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
        throw new TypeError(`PolyphonicSynth: midi must be an integer from 0 to 127, received ${JSON.stringify(midi)}`);
    }
}

export class PolyphonicSynth {
    /**
     * @param {number} maxVoices  how many notes may sound at once (default 8)
     * @param {{ AudioContextClass?: Function, waveform?: OscillatorType }} options
     *        AudioContextClass is injectable so tests can run without real audio.
     */
    constructor(maxVoices = DEFAULT_MAX_VOICES, { AudioContextClass = defaultContextClass(), waveform = "triangle" } = {}) {
        if (!Number.isInteger(maxVoices) || maxVoices < 1) {
            throw new TypeError(`PolyphonicSynth: maxVoices must be a positive integer, received ${JSON.stringify(maxVoices)}`);
        }
        if (AudioContextClass !== undefined && typeof AudioContextClass !== "function") {
            throw new TypeError("PolyphonicSynth: AudioContextClass must be a constructor when provided");
        }
        if (!["sine", "square", "sawtooth", "triangle"].includes(waveform)) {
            throw new TypeError(`PolyphonicSynth: unsupported waveform ${JSON.stringify(waveform)}`);
        }
        this.ctx = null;
        this.maxVoices = maxVoices;
        /** midi => { osc, gain }, oldest first. */
        this.voices = new Map();
        this.AudioContextClass = AudioContextClass;
        this.waveform = waveform;
    }

    /** True when this environment can produce sound at all. */
    get supported() {
        return typeof this.AudioContextClass === "function";
    }

    /** MIDI numbers currently sounding, oldest first. */
    get activeNotes() {
        return [...this.voices.keys()];
    }

    /**
     * Creates the shared context on first use (call from a user gesture) and
     * resumes it if the browser suspended it. Returns null when unsupported.
     */
    ensureContext() {
        if (!this.supported) return null;
        if (this.ctx === null || this.ctx.state === "closed") {
            // Voices of a context closed elsewhere are already silent; drop them.
            this.voices.clear();
            this.ctx = new this.AudioContextClass();
        }
        if (this.ctx.state === "suspended" && typeof this.ctx.resume === "function") {
            Promise.resolve(this.ctx.resume()).catch(() => { /* a later gesture can retry */ });
        }
        return this.ctx;
    }

    /**
     * Starts a voice for `midi` at `freqHz`. Returns true when a new voice
     * started, false when the note was already sounding (no duplicate voice)
     * or audio is unsupported.
     */
    noteOn(midi, freqHz) {
        assertMidi(midi);
        if (typeof freqHz !== "number" || !Number.isFinite(freqHz) || freqHz <= 0) {
            throw new TypeError(`PolyphonicSynth: freqHz must be a positive finite number, received ${JSON.stringify(freqHz)}`);
        }
        if (this.voices.has(midi)) return false;
        const ctx = this.ensureContext();
        if (ctx === null) return false;

        // FIFO voice stealing: the Map's first key is the oldest voice.
        while (this.voices.size >= this.maxVoices) {
            const oldestMidi = this.voices.keys().next().value;
            this.noteOff(oldestMidi);
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = this.waveform;
        osc.frequency.setValueAtTime(freqHz, now);
        gain.gain.setValueAtTime(VOICE_GAIN, now);
        osc.connect(gain).connect(ctx.destination);
        // Once the oscillator has stopped, detach both nodes from the graph.
        osc.onended = () => {
            osc.onended = null;
            osc.disconnect();
            gain.disconnect();
        };
        osc.start(now);

        this.voices.set(midi, { osc, gain });
        return true;
    }

    /**
     * Releases the voice for `midi` with a click-free exponential ramp and
     * removes it from the pool at once. Returns false (and does nothing) when
     * the note is not sounding, so repeated note-offs are harmless.
     */
    noteOff(midi) {
        assertMidi(midi);
        const voice = this.voices.get(midi);
        if (voice === undefined) return false;
        this.voices.delete(midi);

        const { osc, gain } = voice;
        const now = this.ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, SILENT_GAIN), now);
        gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, now + RELEASE_S);
        try {
            osc.stop(now + STOP_S);
        } catch {
            // Already stopped (InvalidStateError): it ends on its own, and onended cleans up.
        }
        return true;
    }

    /** Releases every sounding voice; iterates over a copy because noteOff deletes entries. */
    releaseAll() {
        for (const midi of [...this.voices.keys()]) {
            this.noteOff(midi);
        }
    }

    /** Releases every voice and closes the shared context; a later noteOn opens a new one. */
    async close() {
        this.releaseAll();
        const ctx = this.ctx;
        this.ctx = null;
        if (ctx !== null && ctx.state !== "closed" && typeof ctx.close === "function") {
            await ctx.close();
        }
    }
}

export default PolyphonicSynth;
