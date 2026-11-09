/**
 * Production Studio Drum Kit — T-01A semantic drum pad interface
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
 * Sound playback and key handling are later commits (T-01B+); this commit is
 * the semantic foundation only.
 */
import { assertDrumPads } from "../drumPads.js";
import DrumPad from "./DrumPad.jsx";
import styles from "./DrumKit.module.css";

export default function DrumKit({ pads }) {
    assertDrumPads(pads);
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
