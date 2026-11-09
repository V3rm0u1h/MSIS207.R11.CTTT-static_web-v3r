/**
 * Production Studio Drum Kit — T-01C visual level meter
 *
 *   <section aria-labelledby="meter-title" data-state="active|inactive">
 *     <h2 id="meter-title">Audio Level</h2>
 *     <meter min="0" max="100" value aria-label="Relative audio signal level">42%</meter>
 *     <output aria-live="off">-18.3 dBFS</output>
 *     <p>…relative dBFS, not dB SPL…</p>
 *   </section>
 *
 * The reading is the RMS of the browser audio graph in relative dBFS, so the
 * copy says so and never calls it dB SPL. <output> is aria-live="off": it
 * changes 20 times a second while audio plays and must not be read aloud;
 * the meter is a visual channel, the hit log's live region is the spoken one.
 */
import { SILENCE_DBFS } from "../audioEngine.js";

function assertLevel(level) {
    if (
        !level ||
        typeof level.percent !== "number" || level.percent < 0 || level.percent > 100 ||
        typeof level.dbfs !== "number" || typeof level.active !== "boolean"
    ) {
        throw new TypeError("AudioMeter: level must be { percent 0..100, dbfs, active }");
    }
}

/** "-18.3 dBFS", or "Inactive" with the floor when nothing is sounding. */
export function formatDbfs(level) {
    assertLevel(level);
    if (!level.active) return `Inactive · ${SILENCE_DBFS.toFixed(1)} dBFS floor`;
    const value = Math.max(SILENCE_DBFS, Math.min(0, level.dbfs));
    return `${value > -0.05 ? "0.0" : value.toFixed(1)} dBFS`;
}

export default function AudioMeter({ level, className, meterClassName, readoutClassName, noteClassName }) {
    assertLevel(level);
    const state = level.active ? "active" : "inactive";
    return (
        <section className={className} aria-labelledby="meter-title" data-state={state}>
            <h2 id="meter-title">Audio Level</h2>
            <meter
                className={meterClassName}
                min="0"
                max="100"
                low="35"
                high="85"
                optimum="60"
                value={level.percent}
                aria-label="Relative audio signal level"
            >
                {level.percent}%
            </meter>
            <output className={readoutClassName} aria-live="off" data-state={state}>
                {formatDbfs(level)}
            </output>
            <p className={noteClassName}>
                Relative dBFS signal level from the browser audio graph, not calibrated dB SPL.
            </p>
        </section>
    );
}
