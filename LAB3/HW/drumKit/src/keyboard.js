/**
 * Production Studio Drum Kit — T-01B physical keyboard engine
 *
 * Framework-free: maps KeyboardEvents to drum pad ids and drives press /
 * release callbacks. React only wires it up (useDrumKeyboard.js).
 *
 * Physical keys. Pads are matched on event.code (the key's position, e.g.
 * "KeyW"), never on event.key (the character after the layout and any IME
 * such as UniKey has interpreted it) and never on the deprecated keyCode.
 *
 * Anti-repeat. A held key fires keydown repeatedly with event.repeat = true;
 * those are dropped before any pad is looked up, so one press is one hit.
 *
 * Input isolation. While the user types in an <input>, <textarea>, <select>
 * or a contenteditable element, the letters belong to that control and no
 * pad fires.
 *
 * Every mapping is validated up front (Project Rule 2), so a bad pad list
 * throws a TypeError before any listener is attached.
 */
import { DRUM_PADS, assertDrumPads } from "./drumPads.js";

/** Builds { KeyW: "kick", … } from a pad list; the pad data stays the single source of truth. */
export function buildKeyMap(pads) {
    assertDrumPads(pads);
    return Object.freeze(Object.fromEntries(pads.map((pad) => [pad.code, pad.id])));
}

/** The seven required shortcuts, keyed by physical key code. */
export const KEY_MAP = buildKeyMap(DRUM_PADS);

const TYPING_TAGS = Object.freeze(["INPUT", "TEXTAREA", "SELECT"]);

/** True when a key press belongs to a form control or an editable region, not to the kit. */
export function isTypingTarget(target) {
    return (
        typeof HTMLElement !== "undefined" &&
        target instanceof HTMLElement &&
        (target.isContentEditable || TYPING_TAGS.includes(target.tagName))
    );
}

/**
 * The pad id a keyboard event refers to, or null when the kit must ignore it:
 * a repeated keydown (unless allowRepeat), a key typed into a form control,
 * a modifier chord (Ctrl/Alt/Meta + letter is a browser or OS shortcut), or
 * an unmapped key.
 */
export function resolvePadId(event, keyMap = KEY_MAP, { allowRepeat = false } = {}) {
    if (!event || typeof event.code !== "string") return null;
    if (!allowRepeat && event.repeat) return null;
    if (event.ctrlKey || event.altKey || event.metaKey) return null;
    if (isTypingTarget(event.target)) return null;
    return Object.hasOwn(keyMap, event.code) ? keyMap[event.code] : null;
}

/**
 * Creates the engine. attach() adds keydown / keyup / blur listeners to the
 * target (window by default); detach() removes exactly those listeners and
 * releases any pad still held. A keydown that passes the guards calls
 * onPress(padId, event) once per physical press; the matching keyup calls
 * onRelease(padId, event). Losing window focus mid-press (Alt+Tab) releases
 * every held pad, so none is left stuck "pressed".
 */
export function createKeyboardEngine({ keyMap = KEY_MAP, onPress, onRelease, target }) {
    if (typeof onPress !== "function" || typeof onRelease !== "function") {
        throw new TypeError("createKeyboardEngine: onPress and onRelease must be functions");
    }
    if (keyMap === null || typeof keyMap !== "object") {
        throw new TypeError("createKeyboardEngine: keyMap must be an object");
    }
    const held = new Set();
    let attached = false;
    let eventTarget = target;

    function handleKeyDown(event) {
        const padId = resolvePadId(event, keyMap);
        if (padId === null || held.has(padId)) return;
        held.add(padId);
        event.preventDefault();
        onPress(padId, event);
    }

    function handleKeyUp(event) {
        // Repeat never applies to keyup; typing guard still does, so a key released
        // inside a field after focus moved there does not release the pad twice.
        const padId = resolvePadId(event, keyMap, { allowRepeat: true });
        if (padId === null || !held.has(padId)) return;
        held.delete(padId);
        onRelease(padId, event);
    }

    function releaseAll(event) {
        for (const padId of [...held]) {
            held.delete(padId);
            onRelease(padId, event);
        }
    }

    return Object.freeze({
        attach() {
            if (attached) return;
            eventTarget = eventTarget ?? window;
            eventTarget.addEventListener("keydown", handleKeyDown);
            eventTarget.addEventListener("keyup", handleKeyUp);
            eventTarget.addEventListener("blur", releaseAll);
            attached = true;
        },
        detach() {
            if (!attached) return;
            eventTarget.removeEventListener("keydown", handleKeyDown);
            eventTarget.removeEventListener("keyup", handleKeyUp);
            eventTarget.removeEventListener("blur", releaseAll);
            attached = false;
            releaseAll();
        },
        /** Pad ids currently held down (read-only snapshot, for tests and debugging). */
        get held() {
            return [...held];
        }
    });
}
