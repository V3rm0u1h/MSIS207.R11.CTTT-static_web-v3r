import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { shallowEqual } from "./shallowEqual.js";
import { ABORT_MESSAGE, abortableDelay, isAbortError } from "./abortableDelay.js";

// T-02D — shallowEqual (the React.memo comparator) and abortableDelay (PRD 4 sections 3 and 6).

describe("shallowEqual", () => {
    const fn = () => {};
    const key = Object.freeze({ midi: 69 });

    test("equal when every own prop is identical", () => {
        expect(shallowEqual({ pianoKey: key, isActive: false, onNoteOn: fn }, { pianoKey: key, isActive: false, onNoteOn: fn })).toBe(true);
        expect(shallowEqual({}, {})).toBe(true);
        expect(shallowEqual(key, key)).toBe(true);
    });

    test("compares by identity, not content: a new object or function is a change", () => {
        expect(shallowEqual({ pianoKey: key }, { pianoKey: { midi: 69 } })).toBe(false);
        expect(shallowEqual({ onNoteOn: fn }, { onNoteOn: () => {} })).toBe(false);
        expect(shallowEqual({ isActive: false }, { isActive: true })).toBe(false);
    });

    test("different key sets are unequal, even with undefined values", () => {
        expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
        expect(shallowEqual({ a: undefined }, { b: undefined })).toBe(false);
    });

    test("uses Object.is semantics like React", () => {
        expect(shallowEqual({ v: NaN }, { v: NaN })).toBe(true);
        expect(shallowEqual({ v: 0 }, { v: -0 })).toBe(false);
    });

    test("handles non-objects", () => {
        expect(shallowEqual(null, {})).toBe(false);
        expect(shallowEqual({}, null)).toBe(false);
        expect(shallowEqual(1, 1)).toBe(true);
        expect(shallowEqual("a", "b")).toBe(false);
    });
});

describe("abortableDelay", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    test("resolves after the delay and leaves no listener behind", async () => {
        const controller = new AbortController();
        const remove = vi.spyOn(controller.signal, "removeEventListener");
        const done = vi.fn();
        abortableDelay(100, controller.signal).then(done);
        await vi.advanceTimersByTimeAsync(99);
        expect(done).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(done).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    });

    test("rejects with an AbortError the moment the signal aborts, and clears its timer", async () => {
        const controller = new AbortController();
        const wait = abortableDelay(10_000, controller.signal);
        expect(vi.getTimerCount()).toBe(1);
        controller.abort();
        expect(vi.getTimerCount()).toBe(0);
        const error = await wait.catch((e) => e);
        expect(error).toBeInstanceOf(DOMException);
        expect(error.name).toBe("AbortError");
        expect(error.message).toBe(ABORT_MESSAGE);
        expect(isAbortError(error)).toBe(true);
    });

    test("rejects at once, without a timer, when the signal is already aborted", async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(abortableDelay(50, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
        expect(vi.getTimerCount()).toBe(0);
    });

    test("one abort cancels every delay sharing the signal", async () => {
        const controller = new AbortController();
        const waits = [10, 20, 30].map((ms) => abortableDelay(ms, controller.signal).catch((e) => e.name));
        controller.abort();
        await expect(Promise.all(waits)).resolves.toEqual(["AbortError", "AbortError", "AbortError"]);
    });

    test("validates its arguments", async () => {
        const signal = new AbortController().signal;
        await expect(abortableDelay(-1, signal)).rejects.toThrow(TypeError);
        await expect(abortableDelay(Number.NaN, signal)).rejects.toThrow(TypeError);
        await expect(abortableDelay("10", signal)).rejects.toThrow(TypeError);
        await expect(abortableDelay(10)).rejects.toThrow(TypeError);
        await expect(abortableDelay(10, { aborted: false })).rejects.toThrow(TypeError);
    });

    test("isAbortError tells a cancel from a real error", () => {
        expect(isAbortError(new DOMException("x", "AbortError"))).toBe(true);
        expect(isAbortError(new Error("AbortError"))).toBe(false);
        expect(isAbortError(new DOMException("x", "NotAllowedError"))).toBe(false);
    });
});
