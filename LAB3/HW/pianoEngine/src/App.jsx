import Piano from "./components/Piano.jsx";
import { PIANO_KEYS } from "./piano.js";

/** Rendered into <main id="root"> (index.html); landmarks only, no wrapper element. */
export default function App() {
    return (
        <>
            <header>
                <h1>Polyphonic Piano Engine</h1>
                <p>88 keys generated from MIDI note numbers 21–108</p>
            </header>
            <Piano pianoKeys={PIANO_KEYS} />
        </>
    );
}
