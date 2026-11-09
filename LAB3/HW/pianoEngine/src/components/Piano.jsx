/**
 * Polyphonic Piano Engine — T-02A 88-key keyboard
 *
 * The keys are generated (piano.js) and mapped here; no key is written out by
 * hand. Piano owns the whole list, so each key is exactly one <li> holding
 * one <button> (Project Rules 1 and 4):
 *
 *   <section aria-label="88-key piano">
 *     <p> range summary </p>
 *     <ol>  88 × <li><PianoKey /></li>  </ol>      ascending MIDI order
 *   </section>
 *
 * Layout. The <ol> is a CSS grid of UNITS_PER_WHITE columns per white key.
 * White keys span both rows; black keys sit in the top row, 2/3 as wide,
 * centred on the boundary between their white neighbours, and are painted
 * above them. Placement is computed from the MIDI data (layoutPianoKeys), so
 * the DOM stays in pitch order (C, C#, D, …) while the keys line up as on a
 * real keyboard. The grid is wider than a phone, so the list scrolls
 * horizontally inside its section and the page itself never does.
 *
 * T-02C: keys report press / release through onNoteOn / onNoteOff, and
 * `activeNotes` (a Set of MIDI numbers) marks the keys that are sounding.
 * Keys are memoised, so a note change re-renders only the keys it touches.
 */
import { memo, useMemo } from "react";
import { assertPianoKeys, keyLabel, layoutPianoKeys } from "../piano.js";
import PianoKey from "./PianoKey.jsx";
import styles from "./Piano.module.css";

const MemoPianoKey = memo(PianoKey);
const NO_NOTES = Object.freeze(new Set());

export default function Piano({ pianoKeys, activeNotes = NO_NOTES, onNoteOn, onNoteOff }) {
    assertPianoKeys(pianoKeys);
    if (!(activeNotes instanceof Set)) {
        throw new TypeError("Piano: activeNotes must be a Set of MIDI numbers");
    }
    [["onNoteOn", onNoteOn], ["onNoteOff", onNoteOff]].forEach(([name, handler]) => {
        if (handler !== undefined && typeof handler !== "function") {
            throw new TypeError(`Piano: ${name} must be a function when provided`);
        }
    });
    const { placements, columns, whiteCount } = useMemo(() => layoutPianoKeys(pianoKeys), [pianoKeys]);
    const first = pianoKeys[0];
    const last = pianoKeys[pianoKeys.length - 1];

    return (
        <section className={styles.piano} aria-label={`${pianoKeys.length}-key piano`}>
            <p className={styles.summary}>
                {keyLabel(first)} (MIDI {first.midi}) to {keyLabel(last)} (MIDI {last.midi}):{" "}
                {whiteCount} white and {pianoKeys.length - whiteCount} black keys
            </p>
            <ol className={styles.keyboard} style={{ "--piano-columns": columns }}>
                {pianoKeys.map((pianoKey, index) => (
                    <li
                        key={pianoKey.midi}
                        className={pianoKey.type === "black" ? styles.blackSlot : styles.whiteSlot}
                        style={{ gridColumn: `${placements[index].column} / span ${placements[index].span}` }}
                    >
                        <MemoPianoKey
                            pianoKey={pianoKey}
                            pressed={activeNotes.has(pianoKey.midi)}
                            onNoteOn={onNoteOn}
                            onNoteOff={onNoteOff}
                            className={pianoKey.type === "black" ? styles.blackKey : styles.whiteKey}
                            labelClassName={styles.label}
                            hintClassName={styles.srOnly}
                        />
                    </li>
                ))}
            </ol>
        </section>
    );
}
