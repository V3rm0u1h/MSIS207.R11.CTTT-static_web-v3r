import { afterEach, describe, expect, test, vi } from "vitest";
import SOURCE from "./keyboard.js?raw";
import HOOK_SOURCE from "./useDrumKeyboard.js?raw";
import { KEY_MAP, buildKeyMap, createKeyboardEngine, isTypingTarget, resolvePadId } from "./keyboard.js";
import { DRUM_PADS } from "./drumPads.js";

// T-01B — physical keyboard engine (PRD 2 sections 2–6).

function key(type, code, init = {}) {
    return new KeyboardEvent(type, { code, bubbles: true, cancelable: true, ...init });
}

afterEach(() => {
    document.body.replaceChildren();
});

describe("KEY_MAP", () => {
    test("is exactly the required physical mapping", () => {
        expect(KEY_MAP).toEqual({
            KeyW: "kick",
            KeyA: "snare",
            KeyS: "hihat",
            KeyD: "clap",
            KeyJ: "tom",
            KeyK: "cymbal",
            KeyL: "open-hihat"
        });
        expect(Object.isFrozen(KEY_MAP)).toBe(true);
    });

    test("is derived from DRUM_PADS, so the two can never disagree", () => {
        expect(buildKeyMap(DRUM_PADS)).toEqual(KEY_MAP);
        expect(() => buildKeyMap([{ id: "x" }])).toThrow(TypeError);
    });
});

describe("isTypingTarget", () => {
    test.each(["input", "textarea", "select"])("is true for <%s>", (tag) => {
        expect(isTypingTarget(document.createElement(tag))).toBe(true);
    });

    test("is true for a contenteditable element", () => {
        const editor = document.body.appendChild(document.createElement("p"));
        editor.setAttribute("contenteditable", "true");
        // jsdom does not implement isContentEditable; mirror the browser value.
        Object.defineProperty(editor, "isContentEditable", { value: true });
        expect(isTypingTarget(editor)).toBe(true);
    });

    test.each([
        ["a <button>", document.createElement("button")],
        ["a <li>", document.createElement("li")],
        ["<body>", document.body],
        ["null", null],
        ["window", window]
    ])("is false for %s", (_, target) => {
        expect(isTypingTarget(target)).toBe(false);
    });
});

describe("resolvePadId", () => {
    test("maps a physical key code to its pad id", () => {
        expect(resolvePadId(key("keydown", "KeyW"))).toBe("kick");
        expect(resolvePadId(key("keydown", "KeyL"))).toBe("open-hihat");
    });

    test("ignores event.key: the Vietnamese IME may turn W into a different character", () => {
        expect(resolvePadId(key("keydown", "KeyW", { key: "ư" }))).toBe("kick");
        expect(resolvePadId(key("keydown", "KeyQ", { key: "w" }))).toBeNull();
    });

    test("returns null for unmapped keys, repeats, modifier chords and missing codes", () => {
        expect(resolvePadId(key("keydown", "KeyQ"))).toBeNull();
        expect(resolvePadId(key("keydown", "KeyW", { repeat: true }))).toBeNull();
        expect(resolvePadId(key("keydown", "KeyW", { ctrlKey: true }))).toBeNull();
        expect(resolvePadId(key("keydown", "KeyW", { metaKey: true }))).toBeNull();
        expect(resolvePadId(new KeyboardEvent("keydown"))).toBe(null);
        expect(resolvePadId(null)).toBeNull();
    });

    test("allows repeats only when asked (keyup never repeats, but must still resolve)", () => {
        expect(resolvePadId(key("keyup", "KeyW", { repeat: true }), KEY_MAP, { allowRepeat: true })).toBe("kick");
    });

    test("returns null while typing in a form control", () => {
        const input = document.body.appendChild(document.createElement("input"));
        let seen = null;
        input.addEventListener("keydown", (event) => { seen = resolvePadId(event); });
        input.dispatchEvent(key("keydown", "KeyW"));
        expect(seen).toBeNull();
    });
});

describe("createKeyboardEngine", () => {
    function setup(extra = {}) {
        const onPress = vi.fn();
        const onRelease = vi.fn();
        const engine = createKeyboardEngine({ onPress, onRelease, ...extra });
        engine.attach();
        return { onPress, onRelease, engine };
    }

    test("presses on keydown and releases on keyup, by pad id", () => {
        const { onPress, onRelease, engine } = setup();
        window.dispatchEvent(key("keydown", "KeyA"));
        expect(onPress).toHaveBeenCalledTimes(1);
        expect(onPress.mock.calls[0][0]).toBe("snare");
        expect(engine.held).toEqual(["snare"]);
        window.dispatchEvent(key("keyup", "KeyA"));
        expect(onRelease).toHaveBeenCalledTimes(1);
        expect(onRelease.mock.calls[0][0]).toBe("snare");
        expect(engine.held).toEqual([]);
        engine.detach();
    });

    test("supports all seven physical keys", () => {
        const { onPress, engine } = setup();
        Object.keys(KEY_MAP).forEach((code) => window.dispatchEvent(key("keydown", code)));
        expect(onPress.mock.calls.map(([id]) => id)).toEqual(Object.values(KEY_MAP));
        engine.detach();
    });

    test("blocks auto-repeat: a held key fires one press, and keyup one release", () => {
        const { onPress, onRelease, engine } = setup();
        window.dispatchEvent(key("keydown", "KeyW"));
        window.dispatchEvent(key("keydown", "KeyW", { repeat: true }));
        window.dispatchEvent(key("keydown", "KeyW", { repeat: true }));
        // Some platforms omit event.repeat; the held set guards those too.
        window.dispatchEvent(key("keydown", "KeyW"));
        window.dispatchEvent(key("keyup", "KeyW"));
        expect(onPress).toHaveBeenCalledTimes(1);
        expect(onRelease).toHaveBeenCalledTimes(1);
        engine.detach();
    });

    test("prevents the default action of a handled keydown (no page scroll or quick-find), not of others", () => {
        const { engine } = setup();
        const handled = key("keydown", "KeyW");
        const other = key("keydown", "KeyQ");
        window.dispatchEvent(handled);
        window.dispatchEvent(other);
        expect(handled.defaultPrevented).toBe(true);
        expect(other.defaultPrevented).toBe(false);
        engine.detach();
    });

    test("ignores keys typed into input, textarea, select and contenteditable", () => {
        const { onPress, engine } = setup();
        const input = document.body.appendChild(document.createElement("input"));
        const textarea = document.body.appendChild(document.createElement("textarea"));
        const select = document.body.appendChild(document.createElement("select"));
        const editor = document.body.appendChild(document.createElement("p"));
        Object.defineProperty(editor, "isContentEditable", { value: true });
        [input, textarea, select, editor].forEach((field) => field.dispatchEvent(key("keydown", "KeyW")));
        expect(onPress).not.toHaveBeenCalled();
        // The same key on a non-typing target still works.
        document.body.appendChild(document.createElement("button")).dispatchEvent(key("keydown", "KeyW"));
        expect(onPress).toHaveBeenCalledTimes(1);
        engine.detach();
    });

    test("releases every held pad when the window loses focus", () => {
        const { onRelease, engine } = setup();
        window.dispatchEvent(key("keydown", "KeyW"));
        window.dispatchEvent(key("keydown", "KeyK"));
        window.dispatchEvent(new Event("blur"));
        expect(onRelease.mock.calls.map(([id]) => id).sort()).toEqual(["cymbal", "kick"]);
        expect(engine.held).toEqual([]);
        engine.detach();
    });

    test("detach removes exactly the listeners it added and stops reacting", () => {
        const add = vi.spyOn(window, "addEventListener");
        const remove = vi.spyOn(window, "removeEventListener");
        const { onPress, engine } = setup();
        const added = add.mock.calls.filter(([type]) => ["keydown", "keyup", "blur"].includes(type));
        expect(added.map(([type]) => type).sort()).toEqual(["blur", "keydown", "keyup"]);
        engine.detach();
        const removed = remove.mock.calls.filter(([type]) => ["keydown", "keyup", "blur"].includes(type));
        expect(removed.map(([type, fn]) => [type, fn])).toEqual(added.map(([type, fn]) => [type, fn]));
        window.dispatchEvent(key("keydown", "KeyW"));
        expect(onPress).not.toHaveBeenCalled();
        add.mockRestore();
        remove.mockRestore();
    });

    test("detach while a key is held releases it, so no pad stays pressed after unmount", () => {
        const { onRelease, engine } = setup();
        window.dispatchEvent(key("keydown", "KeyW"));
        engine.detach();
        expect(onRelease).toHaveBeenCalledWith("kick", undefined);
    });

    test("attach and detach are idempotent", () => {
        const add = vi.spyOn(window, "addEventListener");
        const { engine } = setup();
        engine.attach();
        expect(add.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
        engine.detach();
        expect(() => engine.detach()).not.toThrow();
        add.mockRestore();
    });

    test("can target another EventTarget (e.g. a document in tests)", () => {
        const target = new EventTarget();
        const { onPress, engine } = setup({ target });
        target.dispatchEvent(key("keydown", "KeyD"));
        expect(onPress).toHaveBeenCalledWith("clap", expect.any(KeyboardEvent));
        engine.detach();
    });

    test.each([
        ["no handlers", {}],
        ["a non-function onRelease", { onPress() {}, onRelease: true }],
        ["a null keyMap", { onPress() {}, onRelease() {}, keyMap: null }]
    ])("rejects %s with a TypeError (Project Rule 2)", (_, options) => {
        expect(() => createKeyboardEngine(options)).toThrow(TypeError);
    });
});

describe("source hygiene", () => {
    /** The code without its comments, so documentation may still name the forbidden APIs. */
    const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    test("uses event.code only: no keyCode, which, charCode or event.key lookups", () => {
        for (const source of [SOURCE, HOOK_SOURCE].map(stripComments)) {
            expect(source).not.toMatch(/\.keyCode|\.which\b|\.charCode|event\.key\b|\.key\s*===?/);
            expect(source).not.toMatch(/innerHTML/);
        }
        expect(stripComments(SOURCE)).toMatch(/event\.code/);
    });
});
