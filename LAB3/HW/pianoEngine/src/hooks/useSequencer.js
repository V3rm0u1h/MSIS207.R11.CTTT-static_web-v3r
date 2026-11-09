/**
 * Polyphonic Piano Engine — T-02D abortable sequencer hook
 *
 * Every Play Sequence gets its own AbortController:
 *
 *   play(events)  controller = new AbortController()
 *                 playSequence({ queue: new AudioTaskQueue(events), synth, speed, signal })
 *   stop()        controller.abort()      every pending delay rejects at once,
 *                                         no further note is scheduled
 *                 releaseAll()            every sounding voice ramps out now
 *                 isPlaying = false       a new sequence may start immediately
 *
 * One sequence at a time: play() is ignored while a controller is active, so
 * no competing replay loops. A replay that ends (or is stopped) only updates
 * state if it is still the current one, so a stopped replay that settles late
 * can never overwrite the state of a newer replay.
 *
 * A Stop is not an error: playSequence resolves { completed: false } for an
 * abort, so the status says "Playback stopped." Only a genuine failure is
 * reported as one. On unmount the active controller is aborted (which also
 * clears every pending playback timer) and all voices are released.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioTaskQueue } from "../audio/AudioTaskQueue.js";
import { assertRecordedEvents } from "../audio/NoteRecorder.js";
import { assertPlaybackSpeed, playSequence } from "../audio/playSequence.js";

const plural = (count) => `${count} ${count === 1 ? "note" : "notes"}`;

export default function useSequencer({ synth, releaseAll, now } = {}) {
    if (synth === null || typeof synth !== "object" || typeof synth.noteOn !== "function" || typeof synth.noteOff !== "function") {
        throw new TypeError("useSequencer: synth must have noteOn(midi, freqHz) and noteOff(midi)");
    }
    if (typeof releaseAll !== "function") {
        throw new TypeError("useSequencer: releaseAll must be a function");
    }
    if (now !== undefined && typeof now !== "function") {
        throw new TypeError("useSequencer: now must be a function when provided");
    }

    const playbackController = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeedState] = useState(1);
    const [playbackStatus, setPlaybackStatus] = useState("Nothing playing.");

    const play = useCallback((events) => {
        assertRecordedEvents(events);
        if (playbackController.current !== null || events.length === 0) return;

        const controller = new AbortController();
        playbackController.current = controller;
        setIsPlaying(true);
        setPlaybackStatus(`Playing ${plural(events.length)} at ${speed.toFixed(1)}×.`);

        const isCurrent = () => playbackController.current === controller;
        playSequence({
            queue: new AudioTaskQueue(events),
            synth,
            speed,
            signal: controller.signal,
            ...(now ? { now } : {})
        }).then(({ completed }) => {
            if (!isCurrent()) return;
            playbackController.current = null;
            setIsPlaying(false);
            setPlaybackStatus(completed ? "Playback finished." : "Playback stopped.");
        }, (error) => {
            if (!isCurrent()) return;
            playbackController.current = null;
            releaseAll();
            setIsPlaying(false);
            setPlaybackStatus(`Playback failed: ${error.message}`);
        });
    }, [now, releaseAll, speed, synth]);

    const stop = useCallback(() => {
        const controller = playbackController.current;
        if (controller === null) return;
        playbackController.current = null;
        controller.abort();
        releaseAll();
        setIsPlaying(false);
        setPlaybackStatus("Playback stopped.");
    }, [releaseAll]);

    const setSpeed = useCallback((value) => {
        assertPlaybackSpeed(value);
        setSpeedState(value);
    }, []);

    // Unmount: abort the active sequence (clearing its pending timers) and silence it.
    useEffect(() => () => {
        if (playbackController.current !== null) {
            playbackController.current.abort();
            playbackController.current = null;
        }
        releaseAll();
    }, [releaseAll]);

    return { isPlaying, speed, playbackStatus, play, stop, setSpeed };
}
