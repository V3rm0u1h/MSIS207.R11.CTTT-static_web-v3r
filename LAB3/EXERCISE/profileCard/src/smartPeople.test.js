import { describe, expect, test } from "vitest";
import { SMART_PEOPLE } from "./smartPeople.js";

// T-02A — Data schema & single source of truth.

const SCHEMA_KEYS = ["age", "id", "iq", "name"];

describe("SMART_PEOPLE", () => {
    test("holds the six original records plus the author's profile", () => {
        expect(SMART_PEOPLE).toHaveLength(7);
        expect(SMART_PEOPLE.at(-1)).toEqual({ id: "sp-7", name: "Lữ Lê Hương Giang", age: 20, iq: 134 });
    });

    test("every record has exactly id, name, age and iq", () => {
        for (const person of SMART_PEOPLE) {
            expect(Object.keys(person).sort()).toEqual(SCHEMA_KEYS);
        }
    });

    test("ids and names are non-empty strings; age and iq are finite numbers", () => {
        for (const { id, name, age, iq } of SMART_PEOPLE) {
            expect(typeof id).toBe("string");
            expect(id.trim()).not.toBe("");
            expect(typeof name).toBe("string");
            expect(name.trim()).not.toBe("");
            expect(Number.isFinite(age)).toBe(true);
            expect(Number.isFinite(iq)).toBe(true);
        }
    });

    test("ids are unique and stable (not derived from position)", () => {
        const ids = SMART_PEOPLE.map((person) => person.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).toEqual(["sp-1", "sp-2", "sp-3", "sp-4", "sp-5", "sp-6", "sp-7"]);
    });

    test("the dataset cannot be mutated, so it can always be restored", () => {
        expect(Object.isFrozen(SMART_PEOPLE)).toBe(true);
        expect(SMART_PEOPLE.every(Object.isFrozen)).toBe(true);
        expect(() => SMART_PEOPLE.splice(0, 1)).toThrow(TypeError);
        expect(() => { SMART_PEOPLE[0].iq = 0; }).toThrow(TypeError);
    });

    test("removing a record from a copy leaves the original intact", () => {
        const state = SMART_PEOPLE.filter((person) => person.id !== "sp-2");
        expect(state).toHaveLength(6);
        expect(SMART_PEOPLE).toHaveLength(7);
        expect(SMART_PEOPLE.map((person) => person.id)).toContain("sp-2");
    });
});
