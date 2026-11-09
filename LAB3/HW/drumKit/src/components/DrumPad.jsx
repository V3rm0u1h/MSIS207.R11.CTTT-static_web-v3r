/**
 * Production Studio Drum Kit — T-01A drum pad
 *
 * One pad as one list item; the parent (DrumKit) owns the <ul> and the list
 * key, so the pad adds no wrapper of its own (Project Rules 1 and 4):
 *   <li>
 *     <button type="button" aria-pressed="false" aria-keyshortcuts="W">
 *       <span>Kick</span>                    instrument name (visible)
 *       <kbd>W</kbd>                         physical key (visible)
 *       <span class="srOnly">key, drum pad</span>   hint for assistive tech
 *     </button>
 *   </li>
 *
 * The accessible name is computed from the content, "Kick W key, drum pad",
 * instead of an aria-label: WCAG 2.5.3 (Label in Name) requires the visible
 * text "Kick W" to appear, in order, inside the name, and an aria-label such
 * as "Kick drum, keyboard W" fails that check (axe: label-content-name-
 * mismatch). The spaces between the parts are their own text nodes, so the
 * words stay separate in every name computation (browsers and jsdom alike);
 * inside the pad's CSS grid a whitespace-only text node renders nothing.
 *
 * A native <button> is operable by mouse, touch, Enter and Space with no
 * extra key handling. The pad is validated before rendering (Project Rule 2),
 * and its text is rendered as React children, never as HTML (Project Rule 3).
 */
import { assertDrumPad } from "../drumPads.js";

export default function DrumPad({ pad, pressed = false, onTrigger, className, nameClassName, keyClassName, hintClassName }) {
    assertDrumPad(pad);
    if (typeof pressed !== "boolean") {
        throw new TypeError(`DrumPad: pressed must be a boolean, received ${JSON.stringify(pressed)}`);
    }
    if (onTrigger !== undefined && typeof onTrigger !== "function") {
        throw new TypeError("DrumPad: onTrigger must be a function when provided");
    }
    return (
        <li>
            <button
                type="button"
                className={className}
                data-pad-id={pad.id}
                aria-pressed={pressed}
                aria-keyshortcuts={pad.keyLabel}
                onClick={onTrigger ? () => onTrigger(pad) : undefined}
            >
                <span className={nameClassName}>{pad.name}</span>
                {" "}
                <kbd className={keyClassName}>{pad.keyLabel}</kbd>
                {" "}
                <span className={hintClassName}>key, drum pad</span>
            </button>
        </li>
    );
}
