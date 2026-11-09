/**
 * Polyphonic Piano Engine — T-02C note recorder
 *
 * Captures live note-on / note-off pairs as recorded events:
 *
 *   { midi: 69, freqHz: 440, durationMs: 300, deltaMs: 150 }
 *
 *   durationMs  note-off time - note-on time of the same note
 *   deltaMs     note-on time - note-on time of the previous recorded event
 *               (0 for the first event, so replay starts at once)
 *
 * An event is appended to the recording queue at its note-on, so the queue
 * is in chronological (onset) order even when notes overlap: press A, press
 * B, release B, release A records A then B. The event's duration is filled
 * in at its note-off; a note still held when recording stops is closed at
 * the stop time.
 *
 * Times are taken from `now()` (performance.now by default, injectable for
 * tests) and rounded to whole milliseconds against the recording start, so
 * rounding never accumulates: the onsets of the events always sum back to
 * the rounded real onset.
 *
 * The finished recording is a frozen array of frozen events; nothing that
 * replays it can change it.
 */
import { AudioTaskQueue } from "./AudioTaskQueue.js";
import { midiToFrequency } from "../piano.js";

const EVENT_FIELDS = Object.freeze(["midi", "freqHz", "durationMs", "deltaMs"]);

/** Throws a TypeError unless event is a complete, self-consistent recorded event. */
export function assertRecordedEvent(event) {
    if (event === null || typeof event !== "object" || Array.isArray(event)) {
        throw new TypeError("RecordedEvent: event must be an object with midi, freqHz, durationMs and deltaMs");
    }
    if (!Number.isInteger(event.midi) || event.midi < 0 || event.midi > 127) {
        throw new TypeError(`RecordedEvent: midi must be an integer from 0 to 127, received ${JSON.stringify(event.midi)}`);
    }
    if (typeof event.freqHz !== "number" || Math.abs(event.freqHz - midiToFrequency(event.midi)) > 1e-9) {
        throw new TypeError(`RecordedEvent: freqHz of MIDI ${event.midi} must be ${midiToFrequency(event.midi)}, received ${JSON.stringify(event.freqHz)}`);
    }
    ["durationMs", "deltaMs"].forEach((field) => {
        if (typeof event[field] !== "number" || !Number.isFinite(event[field]) || event[field] < 0) {
            throw new TypeError(`RecordedEvent: ${field} must be a finite number >= 0, received ${JSON.stringify(event[field])}`);
        }
    });
}

/** Throws a TypeError unless events is an array of valid recorded events. */
export function assertRecordedEvents(events) {
    if (!Array.isArray(events)) {
        throw new TypeError("RecordedEvent: a recording must be an array of events");
    }
    events.forEach(assertRecordedEvent);
}

/** Total length of a recording in ms: the latest note-off, measured from the first onset. */
export function recordingLengthMs(events) {
    assertRecordedEvents(events);
    let onset = 0;
    let end = 0;
    events.forEach((event) => {
        onset += event.deltaMs;
        end = Math.max(end, onset + event.durationMs);
    });
    return end;
}

function freezeEvent(draft) {
    return Object.freeze(Object.fromEntries(EVENT_FIELDS.map((field) => [field, draft[field]])));
}

export class NoteRecorder {
    #now;
    #queue = new AudioTaskQueue();
    #held = new Map();          // midi => draft event still waiting for its note-off
    #recording = false;
    #startedAt = 0;
    #lastOnset = null;          // rounded onset (ms since start) of the previous event
    #snapshot = Object.freeze([]);

    constructor({ now = () => performance.now() } = {}) {
        if (typeof now !== "function") {
            throw new TypeError("NoteRecorder: now must be a function returning milliseconds");
        }
        this.#now = now;
    }

    get recording() {
        return this.#recording;
    }

    /** The completed recording: frozen events, oldest first. */
    get events() {
        return this.#snapshot;
    }

    /** Events captured so far, including notes still held (counted, not yet timed). */
    get size() {
        return this.#queue.size;
    }

    #read() {
        const time = this.#now();
        if (typeof time !== "number" || !Number.isFinite(time)) {
            throw new TypeError(`NoteRecorder: now() must return a finite number, received ${JSON.stringify(time)}`);
        }
        return time;
    }

    /** Whole milliseconds since the take started. */
    #elapsed() {
        return Math.max(0, Math.round(this.#read() - this.#startedAt));
    }

    /** Starts a new take; any previous recording is replaced. */
    start() {
        this.#queue.clear();
        this.#held.clear();
        this.#snapshot = Object.freeze([]);
        this.#lastOnset = null;
        this.#startedAt = this.#read();
        this.#recording = true;
    }

    /** Records a note-on; returns false when not recording or the note is already held. */
    noteOn(midi, freqHz) {
        if (!this.#recording || this.#held.has(midi)) return false;
        const onset = this.#elapsed();
        const draft = {
            midi,
            freqHz,
            durationMs: 0,
            deltaMs: this.#lastOnset === null ? 0 : onset - this.#lastOnset,
            onset
        };
        assertRecordedEvent(draft);
        this.#lastOnset = onset;
        this.#held.set(midi, draft);
        this.#queue.enqueue(draft);
        return true;
    }

    /** Records the matching note-off; returns false when that note was not being recorded. */
    noteOff(midi) {
        const draft = this.#held.get(midi);
        if (!this.#recording || draft === undefined) return false;
        this.#held.delete(midi);
        draft.durationMs = this.#elapsed() - draft.onset;
        return true;
    }

    /** Stops the take, closes notes still held, and returns the frozen recording. */
    stop() {
        if (!this.#recording) return this.#snapshot;
        [...this.#held.keys()].forEach((midi) => this.noteOff(midi));
        this.#recording = false;
        this.#snapshot = Object.freeze(this.#queue.toArray().map(freezeEvent));
        return this.#snapshot;
    }

    /** Removes every recorded event and ends any take in progress. */
    clear() {
        this.#recording = false;
        this.#queue.clear();
        this.#held.clear();
        this.#lastOnset = null;
        this.#snapshot = Object.freeze([]);
    }
}

export default NoteRecorder;
