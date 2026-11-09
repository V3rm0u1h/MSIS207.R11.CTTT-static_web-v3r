/**
 * Polyphonic Piano Engine — T-02C recording controls and recorded-note table
 *
 *   <section aria-labelledby="recorder-title">
 *     <h2>Recorder</h2>
 *     <menu aria-label="Recording controls">  4 × <li><button/></li>  </menu>
 *     <fieldset> <legend>Playback speed</legend>  3 × <label><input type="radio"/> 0.5×</label> </fieldset>
 *     <output aria-live="polite">  status announcements  </output>
 *     <figure tabindex="0">  scroll frame (the table is wider than a phone)
 *       <table> <caption/> thead + one <tr> per recorded event </table>
 *     </figure>                                  (or a <p> when nothing is recorded)
 *   </section>
 *
 * Unavailable actions use aria-disabled instead of the disabled attribute:
 * a button that becomes unavailable while focused (Start, once recording has
 * begun) keeps keyboard focus instead of dropping it to <body>, and its
 * activation is simply ignored. The parent owns the data; every list and
 * table row is rendered from it in order (Project Rule 4), and every value
 * is rendered as text (Project Rule 3).
 */
import { assertRecordedEvents, recordingLengthMs } from "../audio/NoteRecorder.js";
import { PLAYBACK_SPEEDS, assertPlaybackSpeed } from "../audio/SequencePlayer.js";
import { createPianoKey, keyLabel } from "../piano.js";
import styles from "./RecorderControls.module.css";

const MODES = Object.freeze(["idle", "recording", "playing"]);
const HANDLERS = Object.freeze(["onStart", "onStop", "onClear", "onPlay", "onSpeedChange"]);

const formatSpeed = (speed) => `${speed.toFixed(1)}×`;
const formatSeconds = (ms) => `${(ms / 1000).toFixed(2)} s`;

export default function RecorderControls({ mode, events, capturedCount = 0, speed, status, ...handlers }) {
    if (!MODES.includes(mode)) {
        throw new TypeError(`RecorderControls: mode must be one of ${MODES.join(", ")}, received ${JSON.stringify(mode)}`);
    }
    assertRecordedEvents(events);
    assertPlaybackSpeed(speed);
    if (!Number.isInteger(capturedCount) || capturedCount < 0) {
        throw new TypeError("RecorderControls: capturedCount must be a non-negative integer");
    }
    if (typeof status !== "string") {
        throw new TypeError("RecorderControls: status must be a string");
    }
    HANDLERS.forEach((name) => {
        if (typeof handlers[name] !== "function") throw new TypeError(`RecorderControls: ${name} must be a function`);
    });

    const hasRecording = events.length > 0;
    const actions = [
        { id: "start", label: "Start Recording", available: mode === "idle", run: handlers.onStart },
        { id: "stop", label: "Stop Recording", available: mode === "recording", run: handlers.onStop },
        { id: "clear", label: "Clear Recording", available: mode !== "recording" && hasRecording, run: handlers.onClear },
        { id: "play", label: "Play Sequence", available: mode === "idle" && hasRecording, run: handlers.onPlay }
    ];

    let onset = 0;
    const rows = events.map((event, index) => {
        onset += event.deltaMs;
        return { index, event, onset };
    });

    return (
        <section className={styles.recorder} aria-labelledby="recorder-title">
            <h2 id="recorder-title" className={styles.title}>Recorder</h2>
            <menu className={styles.actions} aria-label="Recording controls">
                {actions.map((action) => (
                    <li key={action.id}>
                        <button
                            type="button"
                            className={styles.action}
                            data-action={action.id}
                            data-recording={action.id === "start" && mode === "recording" ? "true" : undefined}
                            aria-disabled={!action.available}
                            onClick={action.available ? action.run : undefined}
                        >
                            {action.label}
                        </button>
                    </li>
                ))}
            </menu>
            <fieldset className={styles.speeds}>
                <legend>Playback speed</legend>
                {PLAYBACK_SPEEDS.map((value) => (
                    <label key={value} className={styles.speed}>
                        <input
                            type="radio"
                            name="playback-speed"
                            value={value}
                            checked={speed === value}
                            onChange={() => handlers.onSpeedChange(value)}
                        />
                        {" "}
                        {formatSpeed(value)}
                    </label>
                ))}
            </fieldset>
            <output className={styles.status} aria-live="polite">{status}</output>
            {mode === "recording" ? (
                <p className={styles.note}>Notes captured: {capturedCount}</p>
            ) : hasRecording ? (
                <figure className={styles.tableFrame} tabIndex={0} aria-labelledby="recorded-notes-caption">
                    <table className={styles.table}>
                        <caption id="recorded-notes-caption">
                            Recorded notes: {events.length}, {formatSeconds(recordingLengthMs(events))} at 1.0×
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">#</th>
                                <th scope="col">Note</th>
                                <th scope="col">MIDI</th>
                                <th scope="col">Frequency</th>
                                <th scope="col">Start</th>
                                <th scope="col">Delta</th>
                                <th scope="col">Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ index, event, onset: start }) => (
                                <tr key={index}>
                                    <th scope="row">{index + 1}</th>
                                    <td>{keyLabel(createPianoKey(event.midi))}</td>
                                    <td>{event.midi}</td>
                                    <td>{event.freqHz.toFixed(2)} Hz</td>
                                    <td>{start} ms</td>
                                    <td>{event.deltaMs} ms</td>
                                    <td>{event.durationMs} ms</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </figure>
            ) : (
                <p className={styles.note}>No notes recorded yet.</p>
            )}
        </section>
    );
}
