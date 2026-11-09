/**
 * Polyphonic Piano Engine — T-02A 88-key keyboard (T-02D: PianoKeyboard)
 *
 * The keys are generated (utils/midiUtils.js) and mapped here; no key is
 * written out by hand. PianoKeyboard owns the whole list, so each key is
 * exactly one <li> holding one <button> (Project Rules 1 and 4):
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
 * Render isolation (T-02D). This component re-renders whenever activeNotes
 * changes, which is fine; the 88 memoised PianoKeys do not. Everything a key
 * receives is stable across renders except its own boolean `isActive`:
 * the frozen key object, the parent's useCallback handlers, and class
 * strings and grid styles computed once per key list (useMemo).
 */
import { useMemo } from "react";
import { assertPianoKeys, keyLabel, layoutPianoKeys } from "../utils/midiUtils.js";
import PianoKey from "./PianoKey.jsx";
import styles from "./PianoKeyboard.module.css";

const NO_NOTES = Object.freeze(new Set());

export default function PianoKeyboard({ pianoKeys, activeNotes = NO_NOTES, onNoteOn, onNoteOff }) {
    assertPianoKeys(pianoKeys);
    if (!(activeNotes instanceof Set)) {
        throw new TypeError("PianoKeyboard: activeNotes must be a Set of MIDI numbers");
    }
    [["onNoteOn", onNoteOn], ["onNoteOff", onNoteOff]].forEach(([name, handler]) => {
        if (handler !== undefined && typeof handler !== "function") {
            throw new TypeError(`PianoKeyboard: ${name} must be a function when provided`);
        }
    });

    // Per-key layout, computed once per key list so every render reuses the same objects.
    const layout = useMemo(() => {
        const { placements, columns, whiteCount } = layoutPianoKeys(pianoKeys);
        const slots = pianoKeys.map((pianoKey, index) => Object.freeze({
            slotClassName: pianoKey.type === "black" ? styles.blackSlot : styles.whiteSlot,
            keyClassName: pianoKey.type === "black" ? styles.blackKey : styles.whiteKey,
            style: Object.freeze({ gridColumn: `${placements[index].column} / span ${placements[index].span}` })
        }));
        return { slots, listStyle: Object.freeze({ "--piano-columns": columns }), whiteCount };
    }, [pianoKeys]);

    const first = pianoKeys[0];
    const last = pianoKeys[pianoKeys.length - 1];

    return (
        <section className={styles.piano} aria-label={`${pianoKeys.length}-key piano`}>
            <p className={styles.summary}>
                {keyLabel(first)} (MIDI {first.midi}) to {keyLabel(last)} (MIDI {last.midi}):{" "}
                {layout.whiteCount} white and {pianoKeys.length - layout.whiteCount} black keys
            </p>
            <ol className={styles.keyboard} style={layout.listStyle}>
                {pianoKeys.map((pianoKey, index) => (
                    <li key={pianoKey.midi} className={layout.slots[index].slotClassName} style={layout.slots[index].style}>
                        <PianoKey
                            pianoKey={pianoKey}
                            isActive={activeNotes.has(pianoKey.midi)}
                            onNoteOn={onNoteOn}
                            onNoteOff={onNoteOff}
                            className={layout.slots[index].keyClassName}
                            labelClassName={styles.label}
                            hintClassName={styles.srOnly}
                        />
                    </li>
                ))}
            </ol>
        </section>
    );
}
