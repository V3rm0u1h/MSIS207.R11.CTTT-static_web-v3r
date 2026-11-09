/**
 * Polyphonic Piano Engine — voice monitor and panic button (T-02D PianoControls)
 *
 *   <section aria-labelledby="voices-title">
 *     <h2>Voices</h2>
 *     <p>
 *       <output aria-live="off">2 of 8 voices: C4, E4</output>
 *       <button>Release All Notes</button>
 *     </p>
 *   </section>
 *
 * Shows how much of the 8-voice pool is in use (oldest note first, the one
 * the next note beyond the limit would steal). The readout changes with
 * every key press, so it is not a live region (aria-live="off"): announcing
 * each change would talk over the music. Release All Notes ramps out every
 * sounding voice at once.
 */
import { createPianoKey, keyLabel } from "../utils/midiUtils.js";
import styles from "./Controls.module.css";

export default function PianoControls({ activeNotes, maxVoices, onReleaseAll }) {
    if (!(activeNotes instanceof Set)) throw new TypeError("PianoControls: activeNotes must be a Set of MIDI numbers");
    if (!Number.isInteger(maxVoices) || maxVoices < 1) throw new TypeError("PianoControls: maxVoices must be a positive integer");
    if (typeof onReleaseAll !== "function") throw new TypeError("PianoControls: onReleaseAll must be a function");

    const names = [...activeNotes].map((midi) => keyLabel(createPianoKey(midi)));
    const available = activeNotes.size > 0;

    return (
        <section className={styles.voices} aria-labelledby="voices-title">
            <h2 id="voices-title" className={styles.title}>Voices</h2>
            <p className={styles.voiceRow}>
                <output className={styles.voiceReadout} aria-live="off" data-voices={activeNotes.size}>
                    {activeNotes.size} of {maxVoices} voices{available ? `: ${names.join(", ")}` : ""}
                </output>
                {" "}
                <button
                    type="button"
                    className={styles.action}
                    data-action="release-all"
                    aria-disabled={!available}
                    onClick={available ? onReleaseAll : undefined}
                >
                    Release All Notes
                </button>
            </p>
        </section>
    );
}
