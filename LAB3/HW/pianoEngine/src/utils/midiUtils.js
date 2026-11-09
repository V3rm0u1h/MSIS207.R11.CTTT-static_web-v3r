/**
 * Polyphonic Piano Engine — T-02A algorithmic 88-key generation (MIDI utilities)
 *
 * The range and note tables are plain data in data/pianoConfig.js; every
 * function that derives something from a MIDI number lives here.
 *
 * The keyboard is computed from MIDI numbers, never written out by hand:
 * a loop over MIDI 21 (A0) … 108 (C8) derives every key's note name, octave,
 * frequency and colour from the note's position in the 12-note chromatic
 * scale. The result is the single source of truth the UI maps over.
 *
 *   noteIndex = midi % 12                       C = 0, C# = 1, … B = 11
 *   octave    = floor(midi / 12) - 1            MIDI 60 = C4, 21 = A0, 108 = C8
 *   freqHz    = 440 · 2^((midi - 69) / 12)      equal temperament, A4 = 440 Hz
 *   type      = black if the note name has a sharp, otherwise white
 *
 * Every key (and the list as a whole) is validated by assertPianoKey(s)
 * before it is rendered (Project Rule 2), so a bad key is a TypeError at
 * startup instead of a silently broken button.
 */

import { BLACK_NOTE_CLASSES, NOTE_NAMES, PIANO_CONFIG, WHITE_NOTES } from "../data/pianoConfig.js";

export { BLACK_NOTE_CLASSES, NOTE_NAMES, PIANO_CONFIG, WHITE_NOTES };

/** MIDI 0 … 127, the full range a MIDI note number can take. */
const MIDI_MIN = 0;
const MIDI_MAX = 127;

function assertMidi(midi, label = "midi") {
    if (!Number.isInteger(midi) || midi < MIDI_MIN || midi > MIDI_MAX) {
        throw new TypeError(`Piano: ${label} must be an integer from ${MIDI_MIN} to ${MIDI_MAX}, received ${JSON.stringify(midi)}`);
    }
}

/** Equal-temperament frequency of a MIDI note, with A4 (MIDI 69) = 440 Hz. */
export function midiToFrequency(midi) {
    assertMidi(midi);
    return 440 * Math.pow(2, (midi - 69) / 12);
}

/** The metadata of one key: { midi, note, octave, freqHz, type }. */
export function createPianoKey(midi) {
    assertMidi(midi);
    const note = NOTE_NAMES[midi % 12];
    return Object.freeze({
        midi,
        note,
        octave: Math.floor(midi / 12) - 1,
        freqHz: midiToFrequency(midi),
        type: note.includes("#") ? "black" : "white"
    });
}

/** Scientific pitch label shown on a key, e.g. "A4" or "C#4". */
export function keyLabel(pianoKey) {
    return `${pianoKey.note}${pianoKey.octave}`;
}

/** Throws a TypeError unless config is { startMidi, endMidi, totalKeys } describing a consistent range. */
export function assertPianoConfig(config) {
    if (config === null || typeof config !== "object" || Array.isArray(config)) {
        throw new TypeError("Piano: config must be an object with startMidi, endMidi and totalKeys");
    }
    assertMidi(config.startMidi, "config.startMidi");
    assertMidi(config.endMidi, "config.endMidi");
    if (config.endMidi < config.startMidi) {
        throw new TypeError(`Piano: config.endMidi (${config.endMidi}) is below config.startMidi (${config.startMidi})`);
    }
    if (config.totalKeys !== config.endMidi - config.startMidi + 1) {
        throw new TypeError(`Piano: config.totalKeys must be ${config.endMidi - config.startMidi + 1} for MIDI ${config.startMidi}–${config.endMidi}, received ${JSON.stringify(config.totalKeys)}`);
    }
}

/** Generates every key from startMidi to endMidi, in ascending pitch order. */
export function generatePianoKeys(config = PIANO_CONFIG) {
    assertPianoConfig(config);
    const keys = [];
    for (let midi = config.startMidi; midi <= config.endMidi; midi += 1) {
        keys.push(createPianoKey(midi));
    }
    return Object.freeze(keys);
}

/** Throws a TypeError unless pianoKey is internally consistent with its MIDI number. */
export function assertPianoKey(pianoKey) {
    if (pianoKey === null || typeof pianoKey !== "object" || Array.isArray(pianoKey)) {
        throw new TypeError("PianoKey: pianoKey must be an object with midi, note, octave, freqHz and type");
    }
    assertMidi(pianoKey.midi, "pianoKey.midi");
    const expected = createPianoKey(pianoKey.midi);
    ["note", "octave", "type"].forEach((field) => {
        if (pianoKey[field] !== expected[field]) {
            throw new TypeError(`PianoKey: MIDI ${pianoKey.midi} must have ${field} ${JSON.stringify(expected[field])}, received ${JSON.stringify(pianoKey[field])}`);
        }
    });
    if (typeof pianoKey.freqHz !== "number" || Math.abs(pianoKey.freqHz - expected.freqHz) > 1e-9) {
        throw new TypeError(`PianoKey: MIDI ${pianoKey.midi} must have freqHz ${expected.freqHz}, received ${JSON.stringify(pianoKey.freqHz)}`);
    }
}

/**
 * Throws a TypeError unless pianoKeys is a non-empty list of valid keys in
 * strictly ascending, contiguous MIDI order (so the layout below is valid
 * and every MIDI number is unique) that starts on a white key.
 */
export function assertPianoKeys(pianoKeys) {
    if (!Array.isArray(pianoKeys) || pianoKeys.length === 0) {
        throw new TypeError("Piano: pianoKeys must be a non-empty array");
    }
    pianoKeys.forEach((pianoKey, index) => {
        assertPianoKey(pianoKey);
        if (index > 0 && pianoKey.midi !== pianoKeys[index - 1].midi + 1) {
            throw new TypeError(`Piano: keys must be contiguous ascending MIDI numbers; ${pianoKey.midi} follows ${pianoKeys[index - 1].midi}`);
        }
    });
    if (pianoKeys[0].type !== "white" || pianoKeys[pianoKeys.length - 1].type !== "white") {
        throw new TypeError("Piano: the keyboard must start and end on a white key");
    }
}

/**
 * Grid units per white key. A black key is 4 units wide (2/3 of a white key)
 * and centred on the boundary between its two white neighbours.
 */
export const UNITS_PER_WHITE = 6;
export const BLACK_UNITS = 4;

/**
 * Where each key sits in the keyboard's CSS grid, derived from how many white
 * keys precede it. Returns one { column, span } per key, in key order, plus
 * the total number of columns.
 */
export function layoutPianoKeys(pianoKeys) {
    assertPianoKeys(pianoKeys);
    let whiteCount = 0;
    const placements = pianoKeys.map((pianoKey) => {
        if (pianoKey.type === "white") {
            const column = whiteCount * UNITS_PER_WHITE + 1;
            whiteCount += 1;
            return Object.freeze({ column, span: UNITS_PER_WHITE });
        }
        // The boundary before the next white key is grid line whiteCount · 6 + 1.
        return Object.freeze({ column: whiteCount * UNITS_PER_WHITE + 1 - BLACK_UNITS / 2, span: BLACK_UNITS });
    });
    return Object.freeze({ placements: Object.freeze(placements), columns: whiteCount * UNITS_PER_WHITE, whiteCount });
}

/**
 * The 88 generated keys, created once at module load. The array and every key
 * object are frozen and never recreated, so a memoised PianoKey always gets
 * the same `pianoKey` reference (T-02D render isolation).
 */
export const PIANO_KEYS = generatePianoKeys(PIANO_CONFIG);
