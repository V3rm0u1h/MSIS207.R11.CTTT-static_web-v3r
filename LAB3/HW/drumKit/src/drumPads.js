/**
 * Production Studio Drum Kit — T-01A drum pad configuration
 *
 * The single source of truth for the seven pads (PRD section 5: no instrument
 * data duplicated in the UI). Each entry is validated by assertDrumPad before
 * it is rendered (Project Rule 2: strict type guards), so a typo here is a
 * TypeError at startup, not a silent broken pad.
 *
 *   id        unique, URL-safe instrument identifier
 *   name      display name shown on the pad
 *   code      KeyboardEvent.code of the physical key (layout-independent)
 *   keyLabel  the letter printed inside <kbd>
 *   sound     audio sample served from /public
 */

export const DRUM_PADS = Object.freeze([
    Object.freeze({ id: "kick", name: "Kick", code: "KeyW", keyLabel: "W", sound: "/sounds/kick.wav" }),
    Object.freeze({ id: "snare", name: "Snare", code: "KeyA", keyLabel: "A", sound: "/sounds/snare.wav" }),
    Object.freeze({ id: "hihat", name: "Hi-Hat", code: "KeyS", keyLabel: "S", sound: "/sounds/hihat.wav" }),
    Object.freeze({ id: "clap", name: "Clap", code: "KeyD", keyLabel: "D", sound: "/sounds/clap.wav" }),
    Object.freeze({ id: "tom", name: "Tom", code: "KeyJ", keyLabel: "J", sound: "/sounds/tom.wav" }),
    Object.freeze({ id: "cymbal", name: "Cymbal", code: "KeyK", keyLabel: "K", sound: "/sounds/cymbal.wav" }),
    Object.freeze({ id: "open-hihat", name: "Open Hi-Hat", code: "KeyL", keyLabel: "L", sound: "/sounds/open-hihat.wav" })
]);

const FIELDS = Object.freeze(["id", "name", "code", "keyLabel", "sound"]);

function assertText(pad, field) {
    if (typeof pad[field] !== "string" || pad[field].trim() === "") {
        throw new TypeError(`DrumPad: pad.${field} must be a non-empty string, received ${JSON.stringify(pad[field])}`);
    }
}

/** Throws a TypeError unless pad is { id, name, code, keyLabel, sound } with non-empty strings. */
export function assertDrumPad(pad) {
    if (pad === null || typeof pad !== "object" || Array.isArray(pad)) {
        throw new TypeError("DrumPad: pad must be an object with id, name, code, keyLabel and sound");
    }
    FIELDS.forEach((field) => assertText(pad, field));
    if (!/^Key[A-Z]$/.test(pad.code)) {
        throw new TypeError(`DrumPad: pad.code must be a letter key code such as "KeyW", received ${JSON.stringify(pad.code)}`);
    }
    if (pad.keyLabel.length !== 1 || pad.keyLabel.toUpperCase() !== pad.code.slice(3)) {
        throw new TypeError(`DrumPad: pad.keyLabel ${JSON.stringify(pad.keyLabel)} does not match pad.code ${JSON.stringify(pad.code)}`);
    }
}

/**
 * Throws a TypeError unless pads is a non-empty array of valid pads with
 * unique ids and unique key codes (two pads on one key could never both fire).
 */
export function assertDrumPads(pads) {
    if (!Array.isArray(pads) || pads.length === 0) {
        throw new TypeError("DrumKit: pads must be a non-empty array");
    }
    pads.forEach(assertDrumPad);
    ["id", "code"].forEach((field) => {
        const seen = new Set();
        pads.forEach((pad) => {
            if (seen.has(pad[field])) {
                throw new TypeError(`DrumKit: duplicate pad.${field} ${JSON.stringify(pad[field])}`);
            }
            seen.add(pad[field]);
        });
    });
}
