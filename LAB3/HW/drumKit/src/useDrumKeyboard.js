/**
 * Production Studio Drum Kit — T-01B React binding for the keyboard engine
 *
 * Attaches the engine to window once (mount) and detaches it on unmount. The
 * latest onPress / onRelease are kept in a ref that is refreshed on every
 * render, so the single long-lived listener always calls the current
 * handlers: no stale closures, and no re-subscribe on each state change.
 */
import { useEffect, useRef } from "react";
import { createKeyboardEngine } from "./keyboard.js";

export default function useDrumKeyboard({ onPress, onRelease, keyMap }) {
    if (typeof onPress !== "function" || typeof onRelease !== "function") {
        throw new TypeError("useDrumKeyboard: onPress and onRelease must be functions");
    }
    const handlers = useRef({ onPress, onRelease });
    handlers.current = { onPress, onRelease };

    useEffect(() => {
        const engine = createKeyboardEngine({
            keyMap,
            onPress: (padId, event) => handlers.current.onPress(padId, event),
            onRelease: (padId, event) => handlers.current.onRelease(padId, event)
        });
        engine.attach();
        return () => engine.detach();
    }, [keyMap]);
}
