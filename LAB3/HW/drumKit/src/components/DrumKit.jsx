/**
 * Production Studio Drum Kit — T-01A semantics, T-01B keyboard, T-01C feedback
 *
 * Replaces the legacy Slide 26 drum kit. Rendered into <main id="root">
 * (index.html), so the component itself contributes only landmarks and
 * lists, with no wrapper element (Project Rule 1, zero div-soup):
 *
 *   <main>                                      (index.html)
 *     <header> h1 + p </header>
 *     <section aria-labelledby="drum-kit-title"> h2 + <ul> 7 × DrumPad </ul> </section>
 *     <section aria-labelledby="meter-title">    AudioMeter
 *     <section aria-labelledby="hit-log-title">  HitHistory (live region + list)
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
 * A pad is active when either source holds it.
 *
 * Feedback (T-01C). Every hit, from either source, goes through handleHit:
 *   1. a history entry is recorded at once (visible log + polite live region),
 *   2. the audio engine plays the sample; when it resolves, the entry gets
 *      the sample's intensity (or stays "pending" if the asset failed),
 *   3. the level meter starts polling until the audio graph is quiet again.
 * So the visual feedback never depends on hearing, nor on the audio working.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assertDrumPads } from "../drumPads.js";
import { buildKeyMap } from "../keyboard.js";
import { HISTORY_LIMIT, appendHit, createHit, setHitLevel } from "../hitHistory.js";
import useDrumKeyboard from "../useDrumKeyboard.js";
import { useAudioEngine, useAudioLevel } from "../useAudioEngine.js";
import AudioMeter from "./AudioMeter.jsx";
import DrumPad from "./DrumPad.jsx";
import HitHistory from "./HitHistory.jsx";
import styles from "./DrumKit.module.css";

/** How long a clicked / tapped pad stays lit, in ms. */
export const FLASH_MS = 120;

/**
 * T-01D: a hit changes state for the whole kit (history, meter), but only the
 * pad whose `pressed` flag changed needs to re-render. Its other props are
 * stable (memoised callback, CSS Module class strings, frozen pad object).
 */
const MemoDrumPad = memo(DrumPad);

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

export default function DrumKit({ pads, onHit, audio, historyLimit = HISTORY_LIMIT }) {
    assertDrumPads(pads);
    if (onHit !== undefined && typeof onHit !== "function") {
        throw new TypeError("DrumKit: onHit must be a function when provided");
    }
    if (!Number.isInteger(historyLimit) || historyLimit < 1) {
        throw new TypeError("DrumKit: historyLimit must be a positive integer");
    }

    const padsById = useMemo(() => new Map(pads.map((pad) => [pad.id, pad])), [pads]);
    const keyMap = useMemo(() => buildKeyMap(pads), [pads]);

    // Pads held down on the keyboard, and pads flashing after a click / tap.
    const [held, setHeld] = useState(EMPTY);
    const [flashing, setFlashing] = useState(EMPTY);
    const flashTimers = useRef(new Map());

    // T-01C: audio, meter and history.
    const engine = useAudioEngine(pads, audio);
    const [level, pokeLevel] = useAudioLevel(engine);
    const [hits, setHits] = useState([]);
    const sequence = useRef(0);
    const unlocked = useRef(false);

    const handleHit = useCallback((pad, source) => {
        sequence.current += 1;
        const hit = createHit(pad, { sequence: sequence.current });
        setHits((current) => appendHit(current, hit, historyLimit));

        if (!unlocked.current) {
            unlocked.current = true;
            engine.unlock();
        }
        engine.play(pad.id)
            .then((result) => {
                if (result && result.ok) setHits((current) => setHitLevel(current, hit.id, result.level));
            })
            .catch(() => { /* the engine reports failures through result.ok; nothing else to do */ });
        pokeLevel();

        if (onHit) onHit(pad, source, hit);
    }, [engine, historyLimit, onHit, pokeLevel]);

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
                        <MemoDrumPad
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
            <AudioMeter
                level={level}
                className={styles.meter}
                meterClassName={styles.meterBar}
                readoutClassName={styles.meterReadout}
                noteClassName={styles.meterNote}
            />
            <HitHistory
                hits={hits}
                limit={historyLimit}
                className={styles.log}
                statusClassName={styles.logStatus}
                listClassName={styles.logList}
                itemClassName={styles.logItem}
                meterClassName={styles.logMeter}
            />
        </>
    );
}
