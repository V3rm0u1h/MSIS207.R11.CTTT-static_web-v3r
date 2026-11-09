/**
 * Production Studio Drum Kit — T-01C visual hit log and live announcement
 *
 *   <section aria-labelledby="hit-log-title">
 *     <h2 id="hit-log-title">Hit Log</h2>
 *     <output aria-live="polite" aria-atomic="true">Kick triggered, hit 3</output>
 *     <ol>                                      newest first, at most `limit`
 *       <li>
 *         <span>#3</span> <span>Kick</span> <kbd>W</kbd>
 *         <time datetime="…">14:03:27.481</time>
 *         <meter min="0" max="1" value="0.85" aria-label="Intensity 85%">85%</meter>
 *       </li>
 *     </ol>
 *   </section>
 *
 * Only the <output> is live: it carries one short sentence about the latest
 * hit, and the hit number keeps two identical hits in a row distinguishable
 * for screen readers that skip unchanged text. The list itself is static
 * content for users who want to review earlier hits.
 */
import { HISTORY_LIMIT, assertLevel, formatClock } from "../hitHistory.js";

function assertHits(hits, limit) {
    if (!Array.isArray(hits)) throw new TypeError("HitHistory: hits must be an array");
    if (!Number.isInteger(limit) || limit < 1) throw new TypeError("HitHistory: limit must be a positive integer");
    hits.forEach((hit) => {
        if (!hit || typeof hit.id !== "string" || typeof hit.instrument !== "string" || typeof hit.key !== "string" ||
            !Number.isInteger(hit.sequence) || !Number.isInteger(hit.timestamp)) {
            throw new TypeError("HitHistory: every hit needs id, instrument, key, sequence and timestamp");
        }
        assertLevel(hit.level);
    });
}

/** The sentence the live region speaks for the newest hit. */
export function announcement(latest) {
    return latest ? `${latest.instrument} triggered, hit ${latest.sequence}` : "No drum hits yet";
}

export default function HitHistory({ hits, limit = HISTORY_LIMIT, className, statusClassName, listClassName, itemClassName, meterClassName }) {
    assertHits(hits, limit);
    const shown = hits.slice(0, limit);
    return (
        <section className={className} aria-labelledby="hit-log-title">
            <h2 id="hit-log-title">Hit Log</h2>
            <output className={statusClassName} aria-live="polite" aria-atomic="true">
                {announcement(shown[0])}
            </output>
            {shown.length > 0 && (
                <ol className={listClassName} aria-label={`Last ${shown.length} hits, newest first`}>
                    {shown.map((hit) => {
                        const percent = hit.level === null ? null : Math.round(hit.level * 100);
                        return (
                            <li key={hit.id} className={itemClassName}>
                                <span>#{hit.sequence}</span>
                                {" "}
                                <span>{hit.instrument}</span>
                                {" "}
                                <kbd>{hit.key}</kbd>
                                {" "}
                                <time dateTime={new Date(hit.timestamp).toISOString()}>{formatClock(hit.timestamp)}</time>
                                {" "}
                                <meter
                                    className={meterClassName}
                                    min="0"
                                    max="1"
                                    value={hit.level ?? 0}
                                    aria-label={percent === null ? "Intensity pending" : `Intensity ${percent}%`}
                                >
                                    {percent === null ? "…" : `${percent}%`}
                                </meter>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}
