import { describe, expect, test } from "vitest";
import {
    BLACK_NOTE_CLASSES, BLACK_UNITS, NOTE_NAMES, PIANO_CONFIG, PIANO_KEYS, UNITS_PER_WHITE, WHITE_NOTES,
    assertPianoConfig, assertPianoKey, assertPianoKeys, createPianoKey, generatePianoKeys, keyLabel,
    layoutPianoKeys, midiToFrequency
} from "./midiUtils.js";

// T-02A — algorithmic 88-key generation (PRD 1 sections 2–4 and 7, Project Rule 2).

describe("midiToFrequency", () => {
    test("A4 (MIDI 69) is the 440 Hz reference", () => {
        expect(midiToFrequency(69)).toBe(440);
    });

    test("an octave doubles the frequency; known pitches match equal temperament", () => {
        expect(midiToFrequency(81)).toBe(880);
        expect(midiToFrequency(57)).toBe(220);
        expect(midiToFrequency(21)).toBeCloseTo(27.5, 10);        // A0
        expect(midiToFrequency(60)).toBeCloseTo(261.6256, 4);     // middle C
        expect(midiToFrequency(108)).toBeCloseTo(4186.0090, 4);   // C8
    });

    test.each([["a string", "69"], ["a fraction", 69.5], ["NaN", NaN], ["a negative", -1], ["above 127", 128]])(
        "rejects %s with a TypeError", (_, midi) => {
            expect(() => midiToFrequency(midi)).toThrow(TypeError);
        }
    );
});

describe("createPianoKey", () => {
    test("A4 matches the PRD example exactly", () => {
        expect(createPianoKey(69)).toEqual({ midi: 69, note: "A", octave: 4, freqHz: 440, type: "white" });
    });

    test.each([
        [21, "A", 0, "white"],
        [22, "A#", 0, "black"],
        [23, "B", 0, "white"],
        [24, "C", 1, "white"],
        [59, "B", 3, "white"],
        [60, "C", 4, "white"],
        [61, "C#", 4, "black"],
        [107, "B", 7, "white"],
        [108, "C", 8, "white"]
    ])("MIDI %i is %s%i (%s)", (midi, note, octave, type) => {
        expect(createPianoKey(midi)).toMatchObject({ midi, note, octave, type });
    });

    test("is frozen", () => {
        expect(Object.isFrozen(createPianoKey(60))).toBe(true);
    });
});

describe("PIANO_KEYS", () => {
    test("has exactly 88 keys covering MIDI 21–108", () => {
        expect(PIANO_CONFIG).toEqual({ startMidi: 21, endMidi: 108, totalKeys: 88 });
        expect(PIANO_KEYS).toHaveLength(88);
        expect(PIANO_KEYS[0].midi).toBe(21);
        expect(PIANO_KEYS.at(-1).midi).toBe(108);
        expect(keyLabel(PIANO_KEYS[0])).toBe("A0");
        expect(keyLabel(PIANO_KEYS.at(-1))).toBe("C8");
    });

    test("has 52 white and 36 black keys", () => {
        expect(PIANO_KEYS.filter((key) => key.type === "white")).toHaveLength(52);
        expect(PIANO_KEYS.filter((key) => key.type === "black")).toHaveLength(36);
    });

    test("every MIDI identifier is unique and ascending", () => {
        const midis = PIANO_KEYS.map((key) => key.midi);
        expect(new Set(midis).size).toBe(88);
        expect(midis).toEqual(Array.from({ length: 88 }, (_, i) => 21 + i));
    });

    test("classification agrees with the white / black note classes", () => {
        PIANO_KEYS.forEach((key) => {
            expect(key.note).toBe(NOTE_NAMES[key.midi % 12]);
            expect(key.type === "black").toBe(BLACK_NOTE_CLASSES.includes(key.note));
            expect(key.type === "white").toBe(WHITE_NOTES.includes(key.note));
        });
    });

    test("the only key at 440 Hz is A4", () => {
        expect(PIANO_KEYS.filter((key) => key.freqHz === 440).map(keyLabel)).toEqual(["A4"]);
    });

    test("is frozen and passes its own type guard", () => {
        expect(Object.isFrozen(PIANO_KEYS)).toBe(true);
        expect(() => assertPianoKeys(PIANO_KEYS)).not.toThrow();
    });

    test("other ranges are generated the same way", () => {
        const octave = generatePianoKeys({ startMidi: 60, endMidi: 72, totalKeys: 13 });
        expect(octave.map(keyLabel)).toEqual(["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"]);
    });
});

describe("type guards", () => {
    test.each([
        ["null", null],
        ["an array", [21, 108, 88]],
        ["a fractional start", { startMidi: 21.5, endMidi: 108, totalKeys: 88 }],
        ["end below start", { startMidi: 108, endMidi: 21, totalKeys: 88 }],
        ["a wrong total", { startMidi: 21, endMidi: 108, totalKeys: 87 }],
        ["a total given as a string", { startMidi: 21, endMidi: 108, totalKeys: "88" }]
    ])("assertPianoConfig rejects %s", (_, config) => {
        expect(() => assertPianoConfig(config)).toThrow(TypeError);
    });

    const A4 = createPianoKey(69);
    test.each([
        ["undefined", undefined],
        ["a number", 69],
        ["a missing midi", { ...A4, midi: undefined }],
        ["a wrong note", { ...A4, note: "B" }],
        ["an HTML payload as note", { ...A4, note: "<img src=x onerror=alert(1)>" }],
        ["a wrong octave", { ...A4, octave: 3 }],
        ["a wrong type", { ...A4, type: "black" }],
        ["a wrong frequency", { ...A4, freqHz: 441 }]
    ])("assertPianoKey rejects %s", (_, key) => {
        expect(() => assertPianoKey(key)).toThrow(TypeError);
    });

    test.each([
        ["an empty list", []],
        ["a non-array", { 0: A4 }],
        ["a duplicate MIDI", [createPianoKey(69), createPianoKey(69)]],
        ["a gap", [createPianoKey(69), createPianoKey(71)]],
        ["descending order", [createPianoKey(71), createPianoKey(69)]],
        ["a black first key", [createPianoKey(70), createPianoKey(71)]]
    ])("assertPianoKeys rejects %s", (_, keys) => {
        expect(() => assertPianoKeys(keys)).toThrow(TypeError);
    });
});

describe("layoutPianoKeys", () => {
    const { placements, columns, whiteCount } = layoutPianoKeys(PIANO_KEYS);

    test("gives 52 white keys equal, back-to-back columns", () => {
        expect(whiteCount).toBe(52);
        expect(columns).toBe(52 * UNITS_PER_WHITE);
        const whites = placements.filter((_, i) => PIANO_KEYS[i].type === "white");
        whites.forEach((placement, n) => {
            expect(placement).toEqual({ column: n * UNITS_PER_WHITE + 1, span: UNITS_PER_WHITE });
        });
    });

    test("centres each black key on the boundary between its white neighbours", () => {
        PIANO_KEYS.forEach((key, i) => {
            if (key.type !== "black") return;
            const left = placements[i - 1];
            const right = placements[i + 1];
            const centre = placements[i].column + BLACK_UNITS / 2;
            expect(left.column + left.span).toBe(right.column);
            expect(centre).toBe(right.column);
            expect(placements[i].span).toBe(BLACK_UNITS);
        });
    });

    test("keeps every key inside the grid", () => {
        placements.forEach(({ column, span }) => {
            expect(column).toBeGreaterThanOrEqual(1);
            expect(column + span - 1).toBeLessThanOrEqual(columns);
        });
    });
});
