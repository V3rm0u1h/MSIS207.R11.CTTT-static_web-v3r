/**
 * Polyphonic Piano Engine — recording controls and recorded-note table (T-02C, T-02D split)
 *
 *   <section aria-labelledby="recording-title">
 *     <h2>Recording</h2>
 *     <menu aria-label="Recording controls">  3 × <li><button/></li>  </menu>
 *     <output aria-live="polite">  recording status  </output>
 *     <p> notes captured </p>                    while recording
 *     <figure tabindex="0">                      scroll frame (wider than a phone)
 *       <table> <caption/> thead + one <tr> per recorded event </table>
 *     </figure>                                  (or a <p> when nothing is recorded)
 *   </section>
 *
 * Unavailable actions use aria-disabled instead of the disabled attribute,
 * so a button that becomes unavailable while focused (Start, once recording
 * has begun) keeps keyboard focus; its activation is simply ignored. Rows are
 * rendered from the data in order (Project Rule 4), values as text (Rule 3).
 */
import { assertRecordedEvents, recordingLengthMs } from "../audio/NoteRecorder.js";
import { createPianoKey, keyLabel } from "../utils/midiUtils.js";
import styles from "./Controls.module.css";

const formatSeconds = (ms) => `${(ms / 1000).toFixed(2)} s`;

export default function RecordingControls({ isRecording, isPlaying, events, capturedCount = 0, status, onStart, onStop, onClear }) {
    [["isRecording", isRecording], ["isPlaying", isPlaying]].forEach(([name, value]) => {
        if (typeof value !== "boolean") throw new TypeError(`RecordingControls: ${name} must be a boolean`);
    });
    assertRecordedEvents(events);
    if (!Number.isInteger(capturedCount) || capturedCount < 0) {
        throw new TypeError("RecordingControls: capturedCount must be a non-negative integer");
    }
    if (typeof status !== "string") throw new TypeError("RecordingControls: status must be a string");
    [["onStart", onStart], ["onStop", onStop], ["onClear", onClear]].forEach(([name, handler]) => {
        if (typeof handler !== "function") throw new TypeError(`RecordingControls: ${name} must be a function`);
    });

    const hasRecording = events.length > 0;
    const actions = [
        { id: "start", label: "Start Recording", available: !isRecording && !isPlaying, run: onStart },
        { id: "stop", label: "Stop Recording", available: isRecording, run: onStop },
        { id: "clear", label: "Clear Recording", available: !isRecording && hasRecording, run: onClear }
    ];

    let onset = 0;
    const rows = events.map((event, index) => {
        onset += event.deltaMs;
        return { index, event, start: onset };
    });

    return (
        <section className={styles.panel} aria-labelledby="recording-title">
            <h2 id="recording-title" className={styles.title}>Recording</h2>
            <menu className={styles.actions} aria-label="Recording controls">
                {actions.map((action) => (
                    <li key={action.id}>
                        <button
                            type="button"
                            className={styles.action}
                            data-action={action.id}
                            data-recording={action.id === "start" && isRecording ? "true" : undefined}
                            aria-disabled={!action.available}
                            onClick={action.available ? action.run : undefined}
                        >
                            {action.label}
                        </button>
                    </li>
                ))}
            </menu>
            <output className={styles.status} aria-live="polite">{status}</output>
            {isRecording ? (
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
                            {rows.map(({ index, event, start }) => (
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
