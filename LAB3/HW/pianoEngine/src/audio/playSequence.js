/**
 * Polyphonic Piano Engine — T-02C asynchronous FIFO replay, T-02D abortable
 *
 *   await playSequence({ queue, synth, speed, signal: controller.signal });
 *
 * Drains a FIFO AudioTaskQueue of recorded events through `synth` (anything
 * with noteOn(midi, freqHz) and noteOff(midi): the PolyphonicSynth, or the
 * UI adapter that also lights the keys):
 *
 *   dequeue next event ─► abortableDelay(deltaMs / speed) ─► noteOn
 *        ▲                                                   │
 *        └──── (own timer: abortableDelay(durationMs / speed)) ─► noteOff
 *
 * Order and timing. The loop awaits each onset before dequeuing the next
 * event, so notes start strictly in recorded order. A release runs on its own
 * delay instead of blocking the loop: deltaMs is onset-to-onset, so waiting
 * for one note to end before starting the next would make every overlapping
 * note late. Each delay targets an absolute time from the start of playback,
 * so timer jitter never accumulates.
 *
 * Cancellation. Every delay listens to `signal`; aborting rejects all pending
 * delays at once with an AbortError. The signal is checked before anything
 * is scheduled and again after every await, so no note starts once the
 * signal has fired, even if its timer had already expired. Cancellation is
 * not a failure: playSequence resolves { completed: false, played } instead
 * of rejecting, so callers never show an error for a Stop. Real errors still
 * reject. Whatever this replay left sounding is released on the way out.
 *
 * The recording is only read (through the queue); it is never mutated.
 */
import { assertRecordedEvent } from "./NoteRecorder.js";
import { abortableDelay, createAbortError, isAbortError } from "../utils/abortableDelay.js";

export const PLAYBACK_SPEEDS = Object.freeze([0.5, 1, 2]);

export function assertPlaybackSpeed(speed) {
    if (!PLAYBACK_SPEEDS.includes(speed)) {
        throw new TypeError(`playSequence: speed must be one of ${PLAYBACK_SPEEDS.join(", ")}, received ${JSON.stringify(speed)}`);
    }
}

function assertArguments({ queue, synth, signal, now }) {
    if (queue === null || typeof queue !== "object" || typeof queue.dequeue !== "function") {
        throw new TypeError("playSequence: queue must be an AudioTaskQueue");
    }
    if (synth === null || typeof synth !== "object" || typeof synth.noteOn !== "function" || typeof synth.noteOff !== "function") {
        throw new TypeError("playSequence: synth must have noteOn(midi, freqHz) and noteOff(midi)");
    }
    if (signal === null || typeof signal !== "object" || typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function") {
        throw new TypeError("playSequence: signal must be an AbortSignal");
    }
    if (typeof now !== "function") {
        throw new TypeError("playSequence: now must be a function returning milliseconds");
    }
}

export async function playSequence({ queue, synth, speed = 1, signal, now = () => performance.now() } = {}) {
    assertArguments({ queue, synth, signal, now });
    assertPlaybackSpeed(speed);

    const sounding = new Map();        // midi => id of the replay note holding it
    const releases = [];
    const start = now();
    const waitUntil = (offsetMs) => abortableDelay(Math.max(0, start + offsetMs - now()), signal);
    const checkSignal = () => {
        if (signal.aborted) throw createAbortError();
    };
    let onsetMs = 0;
    let played = 0;

    try {
        checkSignal();
        for (let event = queue.dequeue(); event !== null; event = queue.dequeue()) {
            assertRecordedEvent(event);
            onsetMs += event.deltaMs / speed;
            await waitUntil(onsetMs);
            checkSignal();                                     // a timer that fired just before abort

            // A repeated note whose release has not fired yet is re-struck.
            if (sounding.has(event.midi)) synth.noteOff(event.midi);
            played += 1;
            const id = played;
            sounding.set(event.midi, id);
            synth.noteOn(event.midi, event.freqHz);

            releases.push(waitUntil(onsetMs + event.durationMs / speed).then(
                () => {
                    if (sounding.get(event.midi) !== id) return;
                    sounding.delete(event.midi);
                    synth.noteOff(event.midi);
                },
                (error) => { if (!isAbortError(error)) throw error; }
            ));
        }
        await Promise.all(releases);
        return { completed: !signal.aborted, played };
    } catch (error) {
        if (isAbortError(error)) return { completed: false, played };
        throw error;
    } finally {
        sounding.forEach((_, midi) => synth.noteOff(midi));
        sounding.clear();
    }
}

export default playSequence;
