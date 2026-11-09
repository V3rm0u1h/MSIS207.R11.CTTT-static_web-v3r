/**
 * Polyphonic Piano Engine — sequencer controls (T-02C speeds, T-02D Stop Sequence)
 *
 *   <section aria-labelledby="sequencer-title">
 *     <h2>Sequencer</h2>
 *     <fieldset> <legend>Playback speed</legend>  3 × <label><input type="radio"/> 0.5×</label> </fieldset>
 *     <menu aria-label="Sequencer controls">  Play Sequence, Stop Sequence  </menu>
 *     <output aria-live="polite">  playback status  </output>
 *   </section>
 *
 * Play is available with a recording and nothing else going on; Stop only
 * while a sequence plays. Like the recording controls, unavailable buttons
 * use aria-disabled so focus is never dropped (Play stays focused after it
 * starts, and Stop is the next Tab stop).
 */
import { PLAYBACK_SPEEDS, assertPlaybackSpeed } from "../audio/playSequence.js";
import styles from "./Controls.module.css";

const formatSpeed = (speed) => `${speed.toFixed(1)}×`;

export default function SequencerControls({ canPlay, isPlaying, speed, status, onPlay, onStop, onSpeedChange }) {
    [["canPlay", canPlay], ["isPlaying", isPlaying]].forEach(([name, value]) => {
        if (typeof value !== "boolean") throw new TypeError(`SequencerControls: ${name} must be a boolean`);
    });
    assertPlaybackSpeed(speed);
    if (typeof status !== "string") throw new TypeError("SequencerControls: status must be a string");
    [["onPlay", onPlay], ["onStop", onStop], ["onSpeedChange", onSpeedChange]].forEach(([name, handler]) => {
        if (typeof handler !== "function") throw new TypeError(`SequencerControls: ${name} must be a function`);
    });

    const actions = [
        { id: "play", label: "Play Sequence", available: canPlay && !isPlaying, run: onPlay },
        { id: "stop-sequence", label: "Stop Sequence", available: isPlaying, run: onStop }
    ];

    return (
        <section className={styles.panel} aria-labelledby="sequencer-title">
            <h2 id="sequencer-title" className={styles.title}>Sequencer</h2>
            <fieldset className={styles.speeds}>
                <legend>Playback speed</legend>
                {PLAYBACK_SPEEDS.map((value) => (
                    <label key={value} className={styles.speed}>
                        <input
                            type="radio"
                            name="playback-speed"
                            value={value}
                            checked={speed === value}
                            onChange={() => onSpeedChange(value)}
                        />
                        {" "}
                        {formatSpeed(value)}
                    </label>
                ))}
            </fieldset>
            <menu className={styles.actions} aria-label="Sequencer controls">
                {actions.map((action) => (
                    <li key={action.id}>
                        <button
                            type="button"
                            className={styles.action}
                            data-action={action.id}
                            aria-disabled={!action.available}
                            onClick={action.available ? action.run : undefined}
                        >
                            {action.label}
                        </button>
                    </li>
                ))}
            </menu>
            <output className={styles.status} aria-live="polite">{status}</output>
        </section>
    );
}
