/**
 * Polyphonic Piano Engine — T-02A piano key
 *
 * One key as one native <button>. The parent (Piano) owns the <ol>, the <li>
 * and the list key, so the key adds no wrapper of its own (Project Rules 1
 * and 4):
 *
 *   <button type="button" data-midi="69" data-note-type="white">
 *     <span>A4</span>                         scientific pitch label (visible)
 *     <span class="srOnly">white key</span>   key colour for assistive tech
 *   </button>
 *
 * The accessible name is computed from the content ("A4 white key"), so the
 * visible label is always part of the name (WCAG 2.5.3, Label in Name). The
 * space between the two spans is its own text node, so every name
 * computation (browsers and jsdom) keeps the words apart. The key is
 * validated before rendering (Project Rule 2) and its text is rendered as
 * React children, never as HTML (Project Rule 3).
 */
import { assertPianoKey, keyLabel } from "../piano.js";

export default function PianoKey({ pianoKey, onPress, className, labelClassName, hintClassName }) {
    assertPianoKey(pianoKey);
    if (onPress !== undefined && typeof onPress !== "function") {
        throw new TypeError("PianoKey: onPress must be a function when provided");
    }
    return (
        <button
            type="button"
            className={className}
            data-midi={pianoKey.midi}
            data-note-type={pianoKey.type}
            data-freq-hz={pianoKey.freqHz.toFixed(2)}
            onClick={onPress ? () => onPress(pianoKey) : undefined}
        >
            <span className={labelClassName}>{keyLabel(pianoKey)}</span>
            {" "}
            <span className={hintClassName}>{pianoKey.type} key</span>
        </button>
    );
}
