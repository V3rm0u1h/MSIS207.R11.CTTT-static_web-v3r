/**
 * Polyphonic Piano Engine — live playing and recording (T-02B/C, T-02D cleanup)
 *
 *   key press ──► instrument.noteOn ──► PolyphonicSynth
 *            └──► NoteRecorder (while recording)
 *
 * The audio engine lives here, never inside a key component. `instrument`
 * drives the synth and then mirrors the synth's real voice pool into
 * `activeNotes`, so a key shows as active exactly while its note sounds:
 * live, during replay (useSequencer plays through the same instrument), and
 * not after its voice was stolen by the 8-voice limit.
 *
 * Render isolation (T-02D). Every function returned here is created once
 * (useCallback / useMemo over stable objects), so the 88 memoised PianoKeys
 * receive the same onNoteOn / onNoteOff on every render. activeNotes is only
 * replaced when its contents change, so a no-op release (e.g. moving the
 * pointer off a silent key) causes no render at all.
 *
 * Unmount: the window blur listener is removed, every voice is released and
 * the synth's AudioContext is closed.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { PolyphonicSynth } from "../audio/PolyphonicSynth.js";
import { NoteRecorder } from "../audio/NoteRecorder.js";

const IDLE_STATUS = "Not recording. Choose Start Recording, then play some keys.";

function assertSynth(synth) {
    const methods = ["noteOn", "noteOff", "releaseAll"];
    if (synth === null || typeof synth !== "object" || methods.some((name) => typeof synth[name] !== "function")
        || !(synth.voices instanceof Map) || !Number.isInteger(synth.maxVoices)) {
        throw new TypeError("usePiano: synth must provide noteOn, noteOff, releaseAll, a voices Map and maxVoices");
    }
}

function sameNotes(set, keys) {
    return set.size === keys.length && keys.every((midi) => set.has(midi));
}

const plural = (count) => `${count} ${count === 1 ? "note" : "notes"}`;

export default function usePiano({ synth: injectedSynth, now } = {}) {
    const [synth] = useState(() => injectedSynth ?? new PolyphonicSynth());
    assertSynth(synth);
    const [recorder] = useState(() => new NoteRecorder(now ? { now } : undefined));

    const [activeNotes, setActiveNotes] = useState(() => new Set());
    const [isRecording, setIsRecording] = useState(false);
    const [events, setEvents] = useState(recorder.events);
    const [capturedCount, setCapturedCount] = useState(0);
    const [recordingStatus, setRecordingStatus] = useState(IDLE_STATUS);

    const sync = useCallback(() => {
        const keys = [...synth.voices.keys()];
        setActiveNotes((current) => (sameNotes(current, keys) ? current : new Set(keys)));
    }, [synth]);

    /** The synth as the UI sees it: every note change is mirrored into activeNotes. */
    const instrument = useMemo(() => ({
        noteOn(midi, freqHz) { synth.noteOn(midi, freqHz); sync(); },
        noteOff(midi) { synth.noteOff(midi); sync(); }
    }), [synth, sync]);

    const releaseAll = useCallback(() => {
        synth.releaseAll();
        sync();
    }, [synth, sync]);

    const noteOn = useCallback((pianoKey) => {
        instrument.noteOn(pianoKey.midi, pianoKey.freqHz);
        if (recorder.noteOn(pianoKey.midi, pianoKey.freqHz)) setCapturedCount(recorder.size);
    }, [instrument, recorder]);

    const noteOff = useCallback((pianoKey) => {
        instrument.noteOff(pianoKey.midi);
        recorder.noteOff(pianoKey.midi);
    }, [instrument, recorder]);

    const startRecording = useCallback(() => {
        if (recorder.recording) return;
        recorder.start();
        setEvents(recorder.events);
        setCapturedCount(0);
        setIsRecording(true);
        setRecordingStatus("Recording. Play some keys, then choose Stop Recording.");
    }, [recorder]);

    const stopRecording = useCallback(() => {
        if (!recorder.recording) return;
        const recorded = recorder.stop();
        setEvents(recorded);
        setIsRecording(false);
        setRecordingStatus(`Recording stopped: ${plural(recorded.length)} recorded.`);
    }, [recorder]);

    const clearRecording = useCallback(() => {
        if (recorder.recording) return;
        recorder.clear();
        setEvents(recorder.events);
        setCapturedCount(0);
        setRecordingStatus("Recording cleared.");
    }, [recorder]);

    useEffect(() => {
        window.addEventListener("blur", releaseAll);
        return () => {
            window.removeEventListener("blur", releaseAll);
            synth.releaseAll();
            if (typeof synth.close === "function") {
                Promise.resolve(synth.close()).catch(() => { /* already closed */ });
            }
        };
    }, [releaseAll, synth]);

    return {
        maxVoices: synth.maxVoices,
        activeNotes,
        instrument,
        noteOn,
        noteOff,
        releaseAll,
        isRecording,
        events,
        capturedCount,
        recordingStatus,
        startRecording,
        stopRecording,
        clearRecording
    };
}
