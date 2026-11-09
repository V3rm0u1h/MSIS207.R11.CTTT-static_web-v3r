/**
 * Polyphonic Piano Engine — piano configuration data
 *
 * Plain, frozen data: the standard 88-key range (A0 = MIDI 21 to C8 = MIDI
 * 108) and the note-name tables the generator uses. No logic lives here;
 * utils/midiUtils.js derives every key from these values.
 */

export const PIANO_CONFIG = Object.freeze({
    startMidi: 21,
    endMidi: 108,
    totalKeys: 88
});

/** The 12-note chromatic scale; index = midi % 12. */
export const NOTE_NAMES = Object.freeze([
    "C", "C#", "D", "D#",
    "E", "F", "F#", "G",
    "G#", "A", "A#", "B"
]);

export const WHITE_NOTES = Object.freeze(["C", "D", "E", "F", "G", "A", "B"]);

export const BLACK_NOTE_CLASSES = Object.freeze(["C#", "D#", "F#", "G#", "A#"]);
