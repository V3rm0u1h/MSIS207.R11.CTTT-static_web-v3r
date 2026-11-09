/**
 * Production Studio Drum Kit — T-01A semantic interface, T-01B keyboard engine
 *
 * Replaces the legacy Slide 26 drum kit. Rendered into <main id="root">
 * (index.html), so the component itself contributes only the landmarks and
 * the list, with no wrapper element (Project Rule 1, zero div-soup):
 *
 *   <main>                                      (index.html)
 *     <header>
 *       <h1>Production Studio</h1>
 *       <p>Interactive Drum Kit</p>
 *     </header>
 *     <section aria-labelledby="drum-kit-title">
 *       <h2 id="drum-kit-title">Drum Pads</h2>
 *       <ul> <li><button …/></li> × 7 </ul>      (DrumPad, name from content)
 *     </section>
 *   </main>
 *
 * The pad list is validated once, up front (Project Rule 2), then mounted
 * root-to-leaf in configuration order: DrumKit owns the <ul>, each DrumPad is
 * exactly one <li> (Project Rule 4, no orphan or extra nodes).
 *
 * Interaction (T-01B). Two sources light a pad:
 *   keyboard  the engine (keyboard.js, via useDrumKeyboard) reports a press
 *             on keydown and a release on keyup, by physical event.code; the
 *             pad stays active for as long as the key is held.
 *   pointer   a click (mouse, touch, or Enter/Space on the focused button)
 *             is a press and a release in one, so the pad flashes for
 *             FLASH_MS and then releases itself.
 * A pad is active when either source holds it, and every hit, from either
 * source, goes through one place (handleHit) so later commits can add audio
 * and history there without touching the input code.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assertDrumPads } from "../drumPads.js";
import { buildKeyMap } from "../keyboard.js";
import useDrumKeyboard from "../useDrumKeyboard.js";
import DrumPad from "./DrumPad.jsx";
import styles from "./DrumKit.module.css";

/** How long a clicked / tapped pad stays lit, in ms. */
export const FLASH_MS = 120;

const EMPTY = Object.freeze(new Set());

function withId(set, padId) {
    if (set.has(padId)) return set;
    const next = new Set(set);
    next.add(padId);
    return next;
}

function withoutId(set, padId) {
    if (!set.has(padId)) return set;
    const next = new Set(set);
    next.delete(padId);
    return next;
}

export default function DrumKit({ pads, onHit }) {
    assertDrumPads(pads);
    if (onHit !== undefined && typeof onHit !== "function") {
        throw new TypeError("DrumKit: onHit must be a function when provided");
    }

    const padsById = useMemo(() => new Map(pads.map((pad) => [pad.id, pad])), [pads]);
    const keyMap = useMemo(() => buildKeyMap(pads), [pads]);

    // Pads held down on the keyboard, and pads flashing after a click / tap.
    const [held, setHeld] = useState(EMPTY);
    const [flashing, setFlashing] = useState(EMPTY);
    const flashTimers = useRef(new Map());

    const handleHit = useCallback((pad, source) => {
        if (onHit) onHit(pad, source);
    }, [onHit]);

    const pressFromKeyboard = useCallback((padId) => {
        setHeld((current) => withId(current, padId));
        handleHit(padsById.get(padId), "keyboard");
    }, [handleHit, padsById]);

    const releaseFromKeyboard = useCallback((padId) => {
        setHeld((current) => withoutId(current, padId));
    }, []);

    useDrumKeyboard({ keyMap, onPress: pressFromKeyboard, onRelease: releaseFromKeyboard });

    const triggerFromPointer = useCallback((pad) => {
        setFlashing((current) => withId(current, pad.id));
        clearTimeout(flashTimers.current.get(pad.id));
        flashTimers.current.set(pad.id, setTimeout(() => {
            flashTimers.current.delete(pad.id);
            setFlashing((current) => withoutId(current, pad.id));
        }, FLASH_MS));
        handleHit(pad, "pointer");
    }, [handleHit]);

    // Unmount: no timer may fire into an unmounted component.
    useEffect(() => {
        const timers = flashTimers.current;
        return () => {
            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();
        };
    }, []);

    return (
        <>
            <header className={styles.header}>
                <h1 className={styles.title}>Production Studio</h1>
                <p className={styles.subtitle}>Interactive Drum Kit</p>
            </header>
            <section className={styles.kit} aria-labelledby="drum-kit-title">
                <h2 id="drum-kit-title" className={styles.kitTitle}>Drum Pads</h2>
                <ul className={styles.pads}>
                    {pads.map((pad) => (
                        <DrumPad
                            key={pad.id}
                            pad={pad}
                            pressed={held.has(pad.id) || flashing.has(pad.id)}
                            onTrigger={triggerFromPointer}
                            className={styles.pad}
                            nameClassName={styles.padName}
                            keyClassName={styles.padKey}
                            hintClassName={styles.srOnly}
                        />
                    ))}
                </ul>
            </section>
        </>
    );
}
