/**
 * Production Studio Drum Kit — T-01C React bindings for the audio engine
 *
 * useAudioEngine: one engine per mounted kit, created lazily on first render
 * and disposed on unmount. An engine passed in (tests, or an app that shares
 * one engine) is used as-is and left for its owner to dispose.
 *
 * useAudioLevel: polls engine.level() only while something is sounding. A
 * hit calls poke(); the poll then runs every POLL_MS until the reading has
 * been inactive for QUIET_TICKS in a row, when it stops and the meter returns
 * to SILENT_LEVEL. No timer runs while the kit is idle.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioEngine, SILENT_LEVEL } from "./audioEngine.js";

export const POLL_MS = 50;
export const QUIET_TICKS = 6;

/** Throws unless `engine` looks like an audio engine (Project Rule 2). */
export function assertAudioEngine(engine) {
    if (!engine || typeof engine.play !== "function" || typeof engine.level !== "function" || typeof engine.unlock !== "function") {
        throw new TypeError("audio engine must provide play(), level() and unlock()");
    }
}

export function useAudioEngine(pads, provided) {
    if (provided !== undefined) assertAudioEngine(provided);
    const owned = useRef(null);
    if (provided === undefined && owned.current === null) {
        owned.current = createAudioEngine({ pads });
    }
    useEffect(() => () => {
        const engine = owned.current;
        owned.current = null;
        if (engine && typeof engine.dispose === "function") engine.dispose();
    }, []);
    return provided ?? owned.current;
}

export function useAudioLevel(engine) {
    assertAudioEngine(engine);
    const [level, setLevel] = useState(SILENT_LEVEL);
    const timer = useRef(null);
    const quiet = useRef(0);

    const stop = useCallback(() => {
        if (timer.current !== null) {
            clearInterval(timer.current);
            timer.current = null;
        }
        quiet.current = 0;
        setLevel(SILENT_LEVEL);
    }, []);

    const poke = useCallback(() => {
        quiet.current = 0;
        if (timer.current !== null) return;
        timer.current = setInterval(() => {
            const reading = engine.level();
            setLevel(reading);
            quiet.current = reading.active ? 0 : quiet.current + 1;
            if (quiet.current >= QUIET_TICKS) stop();
        }, POLL_MS);
    }, [engine, stop]);

    useEffect(() => () => {
        if (timer.current !== null) clearInterval(timer.current);
        timer.current = null;
    }, []);

    return [level, poke];
}
