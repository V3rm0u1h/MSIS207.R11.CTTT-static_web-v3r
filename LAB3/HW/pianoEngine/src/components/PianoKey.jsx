/**
 * Polyphonic Piano Engine — T-02A piano key, T-02C press / release
 *
 * One key as one native <button>. The parent (Piano) owns the <ol>, the <li>
 * and the list key, so the key adds no wrapper of its own (Project Rules 1
 * and 4):
 *
 *   <button type="button" aria-pressed="false" data-midi="69" data-note-type="white">
 *     <span>A4</span>                         scientific pitch label (visible)
 *     <span class="srOnly">white key</span>   key colour for assistive tech
 *   </button>
 *
 * The accessible name is computed from the content ("A4 white key"), so the
 * visible label is always part of the name (WCAG 2.5.3, Label in Name). The
 * space between the two spans is its own text node, so every name
 * computation (browsers and jsdom) keeps the words apart. `aria-pressed`
 * reports whether the note is sounding (live or during replay).
 *
 * A piano note has a length, so a key reacts to press and release, not to
 * click: pointer down starts the note; pointer up, cancel or leaving the key
 * ends it. From the keyboard, Enter or Space held on the focused key does the
 * same (auto-repeat is ignored), and losing focus ends the note.
 *
 * The key is validated before rendering (Project Rule 2) and its text is
 * rendered as React children, never as HTML (Project Rule 3).
 */
import { assertPianoKey, keyLabel } from "../piano.js";

const PLAY_KEYS = new Set(["Enter", " "]);

export default function PianoKey({ pianoKey, pressed = false, onNoteOn, onNoteOff, className, labelClassName, hintClassName }) {
    assertPianoKey(pianoKey);
    if (typeof pressed !== "boolean") {
        throw new TypeError(`PianoKey: pressed must be a boolean, received ${JSON.stringify(pressed)}`);
    }
    [["onNoteOn", onNoteOn], ["onNoteOff", onNoteOff]].forEach(([name, handler]) => {
        if (handler !== undefined && typeof handler !== "function") {
            throw new TypeError(`PianoKey: ${name} must be a function when provided`);
        }
    });

    const start = onNoteOn ? () => onNoteOn(pianoKey) : undefined;
    const end = onNoteOff ? () => onNoteOff(pianoKey) : undefined;

    return (
        <button
            type="button"
            className={className}
            aria-pressed={pressed}
            data-midi={pianoKey.midi}
            data-note-type={pianoKey.type}
            data-freq-hz={pianoKey.freqHz.toFixed(2)}
            onPointerDown={start && ((event) => {
                if (event.pointerType === "mouse" && event.button !== 0) return;
                start();
            })}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={end}
            onKeyDown={start && ((event) => {
                if (!PLAY_KEYS.has(event.key)) return;
                event.preventDefault();
                if (!event.repeat) start();
            })}
            onKeyUp={end && ((event) => {
                if (!PLAY_KEYS.has(event.key)) return;
                event.preventDefault();
                end();
            })}
            onBlur={end}
            onContextMenu={(event) => event.preventDefault()}
        >
            <span className={labelClassName}>{keyLabel(pianoKey)}</span>
            {" "}
            <span className={hintClassName}>{pianoKey.type} key</span>
        </button>
    );
}
