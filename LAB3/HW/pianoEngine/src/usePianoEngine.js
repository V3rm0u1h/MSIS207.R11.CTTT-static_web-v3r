/**
 * Polyphonic Piano Engine — T-02C engine hook
 *
 * Wires the three framework-free parts to React state:
 *
 *   live key press ──► instrument.noteOn ──► PolyphonicSynth
 *                 └──► NoteRecorder (while recording)
 *   Play Sequence ──► SequencePlayer ──► instrument.noteOn / noteOff
 *
 * `instrument` drives the synth and then mirrors the synth's real voice pool
 * into `activeNotes`, so a key is shown pressed exactly while it sounds:
 * during live play, during replay, and not after its voice was stolen.
 *
 * Mode rules (each action ignores calls that do not fit the current mode):
 *   Start Recording  idle only (not while playing back); begins a new take
 *   Stop Recording   while recording; keeps the take
 *   Clear Recording  not while recording; stops a replay first
 *   Play Sequence    idle with a non-empty recording; one replay at a time
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PolyphonicSynth } from "./audio/PolyphonicSynth.js";
import { NoteRecorder } from "./audio/NoteRecorder.js";
import { SequencePlayer, assertPlaybackSpeed } from "./audio/SequencePlayer.js";

function assertSynth(synth) {
    const methods = ["noteOn", "noteOff", "releaseAll"];
    if (synth === null || typeof synth !== "object" || methods.some((name) => typeof synth[name] !== "function")
        || !(synth.voices instanceof Map)) {
        throw new TypeError("usePianoEngine: synth must provide noteOn, noteOff, releaseAll and a voices Map");
    }
}

function sameNotes(set, keys) {
    if (set.size !== keys.length) return false;
    return keys.every((midi) => set.has(midi));
}

export default function usePianoEngine({ synth: injectedSynth, now, clock } = {}) {
    const [synth] = useState(() => injectedSynth ?? new PolyphonicSynth());
    assertSynth(synth);
    const [recorder] = useState(() => new NoteRecorder(now ? { now } : undefined));

    const [activeNotes, setActiveNotes] = useState(() => new Set());
    const [mode, setMode] = useState("idle");               // "idle" | "recording" | "playing"
    const [events, setEvents] = useState(recorder.events);
    const [capturedCount, setCapturedCount] = useState(0);
    const [speed, setSpeedState] = useState(1);
    const [status, setStatus] = useState("Ready. Choose Start Recording, then play some keys.");
    // The mode as of the latest transition (not the latest render), so two actions in one tick see each other.
    const modeRef = useRef(mode);
    const changeMode = useCallback((next) => {
        modeRef.current = next;
        setMode(next);
    }, []);

    const sync = useCallback(() => {
        const keys = [...synth.voices.keys()];
        setActiveNotes((current) => (sameNotes(current, keys) ? current : new Set(keys)));
    }, [synth]);

    const instrument = useMemo(() => ({
        noteOn(midi, freqHz) { synth.noteOn(midi, freqHz); sync(); },
        noteOff(midi) { synth.noteOff(midi); sync(); }
    }), [synth, sync]);

    const [player] = useState(() => new SequencePlayer(instrument, clock));

    const noteOn = useCallback((pianoKey) => {
        instrument.noteOn(pianoKey.midi, pianoKey.freqHz);
        if (recorder.noteOn(pianoKey.midi, pianoKey.freqHz)) setCapturedCount(recorder.size);
    }, [instrument, recorder]);

    const noteOff = useCallback((pianoKey) => {
        instrument.noteOff(pianoKey.midi);
        recorder.noteOff(pianoKey.midi);
    }, [instrument, recorder]);

    const startRecording = useCallback(() => {
        if (modeRef.current !== "idle") return;
        recorder.start();
        setEvents(recorder.events);
        setCapturedCount(0);
        changeMode("recording");
        setStatus("Recording. Play some keys, then choose Stop Recording.");
    }, [changeMode, recorder]);

    const stopRecording = useCallback(() => {
        if (modeRef.current !== "recording") return;
        const recorded = recorder.stop();
        setEvents(recorded);
        changeMode("idle");
        setStatus(`Recording stopped: ${recorded.length} ${recorded.length === 1 ? "note" : "notes"} recorded.`);
    }, [changeMode, recorder]);

    const clearRecording = useCallback(() => {
        if (modeRef.current === "recording") return;
        player.stop();
        recorder.clear();
        setEvents(recorder.events);
        setCapturedCount(0);
        changeMode("idle");
        setStatus("Recording cleared.");
    }, [changeMode, player, recorder]);

    const playSequence = useCallback(() => {
        if (modeRef.current !== "idle" || recorder.events.length === 0) return;
        const recording = recorder.events;
        changeMode("playing");
        setStatus(`Playing ${recording.length} ${recording.length === 1 ? "note" : "notes"} at ${speed.toFixed(1)}×.`);
        player.play(recording, speed).then(({ completed }) => {
            if (modeRef.current === "playing") changeMode("idle");
            if (completed) setStatus("Playback finished.");
        });
    }, [changeMode, player, recorder, speed]);

    const setSpeed = useCallback((value) => {
        assertPlaybackSpeed(value);
        setSpeedState(value);
    }, []);

    // Leaving the page (or the window losing focus) must not leave notes hanging.
    useEffect(() => {
        const releaseAll = () => {
            synth.releaseAll();
            sync();
        };
        window.addEventListener("blur", releaseAll);
        return () => {
            window.removeEventListener("blur", releaseAll);
            player.stop();
            releaseAll();
        };
    }, [player, synth, sync]);

    return {
        activeNotes, mode, events, capturedCount, speed, status,
        noteOn, noteOff, startRecording, stopRecording, clearRecording, playSequence, setSpeed
    };
}
