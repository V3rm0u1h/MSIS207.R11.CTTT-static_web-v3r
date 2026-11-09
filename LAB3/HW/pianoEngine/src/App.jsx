import Piano from "./components/Piano.jsx";
import { PIANO_KEYS } from "./utils/midiUtils.js";

/**
 * Rendered into <main id="root"> (index.html); landmarks only, no wrapper element.
 * `engine` options ({ synth, now }) are injectable for tests; the app uses the
 * real PolyphonicSynth, whose AudioContext is created on the first key press.
 */
export default function App({ engine } = {}) {
    return (
        <>
            <header>
                <h1>Polyphonic Piano Engine</h1>
                <p>88 keys generated from MIDI note numbers 21–108, eight voices at once</p>
            </header>
            <Piano pianoKeys={PIANO_KEYS} engine={engine} />
        </>
    );
}
