/**
 * Polyphonic Piano Engine — T-02C asynchronous FIFO sequencer
 *
 * Replays a recording through any instrument with noteOn(midi, freqHz) and
 * noteOff(midi) (the PolyphonicSynth, or the UI adapter that also lights the
 * keys). Each play() copies the recording into a fresh AudioTaskQueue and
 * drains it in an async loop:
 *
 *   dequeue next event ─► await deltaMs / speed ─► noteOn
 *        ▲                                          │
 *        └──────────── (note-off timer: durationMs / speed) ─► noteOff
 *
 * The loop awaits each event's onset before dequeuing the next, so notes
 * start strictly in recorded order. A note's release is scheduled on its own
 * timer instead of blocking the loop: deltaMs is measured onset-to-onset, so
 * waiting for one note to end before starting the next would push every
 * overlapping note (chords, legato) late. Overlapping notes therefore sound
 * together, which is what the 8-voice pool is for. play() resolves once the
 * last note has been released.
 *
 * Timing. Every wait targets an absolute time from the start of playback
 * (sum of deltaMs / speed), not a chain of relative delays, so timer jitter
 * never accumulates across a long sequence.
 *
 * One loop at a time: calling play() while a replay is running returns the
 * running replay's promise instead of starting a competing loop. stop()
 * cancels every pending timer and releases the notes this replay started.
 * The recording itself is never mutated (it is only read into the queue).
 */
import { AudioTaskQueue } from "./AudioTaskQueue.js";
import { assertRecordedEvents } from "./NoteRecorder.js";

export const PLAYBACK_SPEEDS = Object.freeze([0.5, 1, 2]);

export function assertPlaybackSpeed(speed) {
    if (!PLAYBACK_SPEEDS.includes(speed)) {
        throw new TypeError(`SequencePlayer: speed must be one of ${PLAYBACK_SPEEDS.join(", ")}, received ${JSON.stringify(speed)}`);
    }
}

export class SequencePlayer {
    #instrument;
    #now;
    #setTimer;
    #clearTimer;
    #run = null;            // the running replay: { promise, cancel }

    /**
     * @param {{ noteOn: Function, noteOff: Function }} instrument
     * @param {{ now?: () => number, setTimer?: Function, clearTimer?: Function }} clock  injectable for tests
     */
    constructor(instrument, { now = () => performance.now(), setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) } = {}) {
        if (instrument === null || typeof instrument !== "object"
            || typeof instrument.noteOn !== "function" || typeof instrument.noteOff !== "function") {
            throw new TypeError("SequencePlayer: instrument must have noteOn(midi, freqHz) and noteOff(midi)");
        }
        [["now", now], ["setTimer", setTimer], ["clearTimer", clearTimer]].forEach(([name, fn]) => {
            if (typeof fn !== "function") throw new TypeError(`SequencePlayer: ${name} must be a function`);
        });
        this.#instrument = instrument;
        this.#now = now;
        this.#setTimer = setTimer;
        this.#clearTimer = clearTimer;
    }

    get playing() {
        return this.#run !== null;
    }

    /**
     * Replays `events` at `speed` (0.5, 1 or 2). Resolves with
     * { completed, played } when the last note is released or stop() is called.
     */
    play(events, speed = 1) {
        assertRecordedEvents(events);
        assertPlaybackSpeed(speed);
        if (this.#run !== null) return this.#run.promise;

        const timers = new Map();                      // timer id => resolve
        const sounding = new Map();                    // midi => generation of the replay note holding it
        const state = { cancelled: false };
        const run = {
            // Synchronous: by the time stop() returns, every replay note is released.
            cancel: () => {
                state.cancelled = true;
                timers.forEach((resolve, id) => { this.#clearTimer(id); resolve(); });
                timers.clear();
                this.#releaseAll(sounding);
            }
        };
        const start = this.#now();
        const waitUntil = (offsetMs) => new Promise((resolve) => {
            if (state.cancelled) { resolve(); return; }
            const id = this.#setTimer(() => { timers.delete(id); resolve(); }, Math.max(0, start + offsetMs - this.#now()));
            timers.set(id, resolve);
        });

        run.promise = this.#process(new AudioTaskQueue(events), speed, waitUntil, state, sounding)
            .finally(() => { if (this.#run === run) this.#run = null; });
        this.#run = run;
        return run.promise;
    }

    #releaseAll(sounding) {
        sounding.forEach((_, midi) => this.#instrument.noteOff(midi));
        sounding.clear();
    }

    async #process(queue, speed, waitUntil, state, sounding) {
        const releases = [];
        let generation = 0;
        let onsetMs = 0;
        let played = 0;

        try {
            for (let event = queue.dequeue(); event !== null; event = queue.dequeue()) {
                onsetMs += event.deltaMs / speed;
                await waitUntil(onsetMs);
                if (state.cancelled) break;

                // A repeated note whose previous release has not fired yet is re-struck.
                if (sounding.has(event.midi)) this.#instrument.noteOff(event.midi);
                generation += 1;
                const mine = generation;
                sounding.set(event.midi, mine);
                this.#instrument.noteOn(event.midi, event.freqHz);
                played += 1;

                releases.push(waitUntil(onsetMs + event.durationMs / speed).then(() => {
                    if (sounding.get(event.midi) !== mine) return;
                    sounding.delete(event.midi);
                    this.#instrument.noteOff(event.midi);
                }));
            }
            await Promise.all(releases);
        } finally {
            // Failed mid-way: release whatever this replay still holds (a no-op after stop()).
            this.#releaseAll(sounding);
        }
        return { completed: !state.cancelled, played };
    }

    /** Cancels the running replay, if any, and releases its notes. */
    stop() {
        if (this.#run !== null) this.#run.cancel();
    }
}

export default SequencePlayer;
