/**
 * Polyphonic Piano Engine — Piano (T-02D component architecture)
 *
 *   Piano                     owns the engine (usePiano + useSequencer)
 *   ├── PianoControls         voice monitor, Release All Notes
 *   ├── PianoKeyboard         <section> + <ol> of 88 memoised PianoKeys
 *   │   ├── PianoKey (MIDI 21)
 *   │   ├── …
 *   │   └── PianoKey (MIDI 108)
 *   ├── RecordingControls     Start / Stop / Clear Recording, recorded notes
 *   └── SequencerControls     speed, Play / Stop Sequence
 *
 * Piano renders its four sections side by side into the page's <main> with
 * no wrapper element (Project Rule 1). The audio engine stays in the hooks:
 * keys and controls only report user intent through stable callbacks.
 *
 * Mode rules: recording and playback exclude each other. Start Recording is
 * unavailable during playback and Play Sequence during recording; Clear
 * Recording stops a running sequence first.
 */
import { useCallback } from "react";
import usePiano from "../hooks/usePiano.js";
import useSequencer from "../hooks/useSequencer.js";
import PianoControls from "./PianoControls.jsx";
import PianoKeyboard from "./PianoKeyboard.jsx";
import RecordingControls from "./RecordingControls.jsx";
import SequencerControls from "./SequencerControls.jsx";

export default function Piano({ pianoKeys, engine }) {
    if (engine !== undefined && (engine === null || typeof engine !== "object")) {
        throw new TypeError("Piano: engine must be an options object when provided");
    }
    const piano = usePiano(engine);
    const sequencer = useSequencer({ synth: piano.instrument, releaseAll: piano.releaseAll, now: engine?.now });
    const { events, isRecording, clearRecording, startRecording } = piano;
    const { isPlaying, play, stop } = sequencer;

    const handleStart = useCallback(() => {
        if (!isPlaying) startRecording();
    }, [isPlaying, startRecording]);

    const handleClear = useCallback(() => {
        stop();
        clearRecording();
    }, [clearRecording, stop]);

    const handlePlay = useCallback(() => {
        if (!isRecording) play(events);
    }, [events, isRecording, play]);

    return (
        <>
            <PianoControls activeNotes={piano.activeNotes} maxVoices={piano.maxVoices} onReleaseAll={piano.releaseAll} />
            <PianoKeyboard
                pianoKeys={pianoKeys}
                activeNotes={piano.activeNotes}
                onNoteOn={piano.noteOn}
                onNoteOff={piano.noteOff}
            />
            <RecordingControls
                isRecording={isRecording}
                isPlaying={isPlaying}
                events={events}
                capturedCount={piano.capturedCount}
                status={piano.recordingStatus}
                onStart={handleStart}
                onStop={piano.stopRecording}
                onClear={handleClear}
            />
            <SequencerControls
                canPlay={!isRecording && events.length > 0}
                isPlaying={isPlaying}
                speed={sequencer.speed}
                status={sequencer.playbackStatus}
                onPlay={handlePlay}
                onStop={stop}
                onSpeedChange={sequencer.setSpeed}
            />
        </>
    );
}
