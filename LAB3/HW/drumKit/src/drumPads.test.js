import { describe, expect, test } from "vitest";
import { DRUM_PADS, assertDrumPad, assertDrumPads } from "./drumPads.js";

// T-01A — centralized drum pad configuration (PRD sections 2 and 5, Project Rule 2).

const VALID = Object.freeze({ id: "kick", name: "Kick", code: "KeyW", keyLabel: "W", sound: "/sounds/kick.wav" });

describe("DRUM_PADS", () => {
    test("maps the seven required keys to the required instruments, in order", () => {
        expect(DRUM_PADS.map(({ keyLabel, name }) => [keyLabel, name])).toEqual([
            ["W", "Kick"],
            ["A", "Snare"],
            ["S", "Hi-Hat"],
            ["D", "Clap"],
            ["J", "Tom"],
            ["K", "Cymbal"],
            ["L", "Open Hi-Hat"]
        ]);
    });

    test("every pad has a unique id, a unique key code and its own sound file", () => {
        expect(new Set(DRUM_PADS.map((pad) => pad.id)).size).toBe(7);
        expect(new Set(DRUM_PADS.map((pad) => pad.code)).size).toBe(7);
        expect(new Set(DRUM_PADS.map((pad) => pad.sound)).size).toBe(7);
        DRUM_PADS.forEach((pad) => expect(pad.sound).toMatch(/^\/sounds\/[a-z-]+\.wav$/));
    });

    test("is frozen, so no view can mutate the shared configuration", () => {
        expect(Object.isFrozen(DRUM_PADS)).toBe(true);
        DRUM_PADS.forEach((pad) => expect(Object.isFrozen(pad)).toBe(true));
        expect(() => assertDrumPads(DRUM_PADS)).not.toThrow();
    });
});

describe("assertDrumPad", () => {
    test("accepts a complete pad", () => {
        expect(() => assertDrumPad(VALID)).not.toThrow();
    });

    test.each([
        ["undefined", undefined],
        ["null", null],
        ["a string", "kick"],
        ["an array", ["kick", "Kick", "KeyW", "W", "/sounds/kick.wav"]],
        ["no id", { ...VALID, id: undefined }],
        ["a numeric id", { ...VALID, id: 1 }],
        ["a blank name", { ...VALID, name: "   " }],
        ["no sound", { ...VALID, sound: "" }],
        ["a non-letter key code", { ...VALID, code: "Digit1", keyLabel: "1" }],
        ["a lower-case key code", { ...VALID, code: "keyW" }],
        ["a key label that does not match the code", { ...VALID, keyLabel: "Q" }],
        ["a multi-character key label", { ...VALID, keyLabel: "WW" }]
    ])("rejects %s with a TypeError", (_, pad) => {
        expect(() => assertDrumPad(pad)).toThrow(TypeError);
        expect(() => assertDrumPad(pad)).toThrow(/^DrumPad: pad/);
    });
});

describe("assertDrumPads", () => {
    test.each([
        ["undefined", undefined],
        ["an object", { kick: VALID }],
        ["an empty array", []],
        ["a list with one bad pad", [VALID, { ...VALID, id: "snare", name: "" }]],
        ["two pads sharing an id", [VALID, { ...VALID, code: "KeyA", keyLabel: "A" }]],
        ["two pads sharing a key", [VALID, { ...VALID, id: "snare" }]]
    ])("rejects %s with a TypeError", (_, pads) => {
        expect(() => assertDrumPads(pads)).toThrow(TypeError);
    });
});
