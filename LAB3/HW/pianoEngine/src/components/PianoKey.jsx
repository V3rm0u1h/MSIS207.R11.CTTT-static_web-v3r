/**
 * Polyphonic Piano Engine — piano key (T-02A markup, T-02C press / release,
 * T-02D React.memo render isolation)
 *
 * One key as one native <button>. The parent (PianoKeyboard) owns the <ol>,
 * the <li> and the list key, so the key adds no wrapper of its own (Project
 * Rules 1 and 4):
 *
 *   <button type="button" aria-pressed="false" data-midi="69" data-note-type="white">
 *     <span>A4</span>                         scientific pitch label (visible)
 *     <span class="srOnly">white key</span>   key colour for assistive tech
 *   </button>
 *
 * The accessible name is computed from the content ("A4 white key"), so the
 * visible label is always part of the name (WCAG 2.5.3, Label in Name). The
 * space between the spans is its own text node, so every name computation
 * keeps the words apart. `aria-pressed` reports `isActive`: the note is
 * sounding, live or during replay.
 *
 * A note has a length, so the key reacts to press and release, not click:
 * pointer down starts it; pointer up, cancel or leaving the key ends it.
 * From the keyboard, Enter or Space held on the focused key does the same
 * (auto-repeat ignored), and losing focus ends the note.
 *
 * Memoised with shallowEqual: the key re-renders only when one of its own
 * props changes. The parent passes the same frozen `pianoKey`, the same
 * useCallback handlers and the same class strings every time, so in practice
 * only `isActive` changes, and only for the key whose note started or
 * stopped. The audio engine is never touched here; the key only reports.
 *
 * The key is validated before rendering (Project Rule 2) and its text is
 * rendered as React children, never as HTML (Project Rule 3).
 */
import { memo } from "react";
import { assertPianoKey, keyLabel } from "../utils/midiUtils.js";
import { shallowEqual } from "../utils/shallowEqual.js";

const PLAY_KEYS = new Set(["Enter", " "]);

const preventContextMenu = (event) => event.preventDefault();

function PianoKey({ pianoKey, isActive = false, onNoteOn, onNoteOff, className, labelClassName, hintClassName }) {
    assertPianoKey(pianoKey);
    if (typeof isActive !== "boolean") {
        throw new TypeError(`PianoKey: isActive must be a boolean, received ${JSON.stringify(isActive)}`);
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
            aria-pressed={isActive}
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
            onContextMenu={preventContextMenu}
        >
            <span className={labelClassName}>{keyLabel(pianoKey)}</span>
            {" "}
            <span className={hintClassName}>{pianoKey.type} key</span>
        </button>
    );
}

export { PianoKey as PianoKeyView };
export default memo(PianoKey, shallowEqual);
