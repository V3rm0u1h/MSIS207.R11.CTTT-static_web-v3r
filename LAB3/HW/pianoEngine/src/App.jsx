import Piano from "./components/Piano.jsx";
import RecorderControls from "./components/RecorderControls.jsx";
import { PIANO_KEYS } from "./piano.js";
import usePianoEngine from "./usePianoEngine.js";

/**
 * Rendered into <main id="root"> (index.html); landmarks only, no wrapper element.
 * `engine` options (a synth and clocks) are injectable for tests; the app uses
 * the real PolyphonicSynth, created lazily on the first key press.
 */
export default function App({ engine } = {}) {
    const piano = usePianoEngine(engine);
    return (
        <>
            <header>
                <h1>Polyphonic Piano Engine</h1>
                <p>88 keys generated from MIDI note numbers 21–108, eight voices at once</p>
            </header>
            <Piano
                pianoKeys={PIANO_KEYS}
                activeNotes={piano.activeNotes}
                onNoteOn={piano.noteOn}
                onNoteOff={piano.noteOff}
            />
            <RecorderControls
                mode={piano.mode}
                events={piano.events}
                capturedCount={piano.capturedCount}
                speed={piano.speed}
                status={piano.status}
                onStart={piano.startRecording}
                onStop={piano.stopRecording}
                onClear={piano.clearRecording}
                onPlay={piano.playSequence}
                onSpeedChange={piano.setSpeed}
            />
        </>
    );
}
