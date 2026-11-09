/**
 * KRAFTON x PUBG Vietnam Championship — T-03C virtualized kill feed
 *
 *   <section aria-labelledby="killfeed-title">
 *     <h3>Kill Feed</h3>
 *     <p> <label for=:r4:>Show squad</label> <select id=:r4:> </p>
 *     <p role="status">Showing 251 of 1,000 events for Roy Esports.</p>
 *     <VirtualList/>  or  <p>No kill-feed events for …</p>
 *   </section>
 *
 * State is only the selected squad; the filtered events are derived with
 * useMemo. The feed (1,000 events in the demo) is rendered through
 * VirtualList, so only the rows in view plus the overscan rows are in the
 * DOM. The list is keyed by the filter, so choosing another squad starts the
 * new result at the top instead of at a stale scroll position.
 *
 * Screen-reader noise: individual events are never announced. The single
 * polite status line changes only when the filter changes. Each row reads as
 * one sentence: "TE.Hawk eliminated CES.Nova with M416, 19:03:04".
 */
import { useId, useMemo, useState } from "react";
import { PUBG_SQUADS, assertKillFeed, assertSquads } from "../data/pubgSquads.js";
import VirtualList from "./VirtualList.jsx";
import styles from "./Championship.module.css";

export const KILL_ROW_HEIGHT = 64;
export const KILL_FEED_VIEWPORT = 384;   // 6 rows
export const KILL_FEED_OVERSCAN = 5;
const ALL = "all";

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh"
});
const COUNT_FORMAT = new Intl.NumberFormat("en-US");

function KillRow({ event }) {
    return (
        <>
            <span className={styles.killLine}>
                <strong>{event.killer}</strong> eliminated <strong>{event.victim}</strong>
            </span>
            {/* Separate text node: without it the row reads "Player BTE" (found by the row-text test). */}
            {" "}
            <span className={styles.killMeta}>
                <abbr className={styles.killTag} title={`Squad ${event.squad}`}>{event.squad}</abbr>
                {" · with "}{event.weapon}{", "}
                <time dateTime={new Date(event.timestamp).toISOString()}>{TIME_FORMAT.format(event.timestamp)}</time>
            </span>
        </>
    );
}

export default function KillFeed({ events, squads = PUBG_SQUADS }) {
    assertKillFeed(events);
    assertSquads(squads);
    const selectId = useId();
    const [squadTag, setSquadTag] = useState(ALL);

    const visibleEvents = useMemo(
        () => (squadTag === ALL ? events : events.filter((event) => event.squad === squadTag)),
        [events, squadTag]
    );
    const selected = squads.find((squad) => squad.tag === squadTag);
    const summary = `Showing ${COUNT_FORMAT.format(visibleEvents.length)} of ${COUNT_FORMAT.format(events.length)} events${selected ? ` for ${selected.name}` : ""}.`;

    return (
        <section className={styles.panel} aria-labelledby="killfeed-title">
            <h3 id="killfeed-title" className={styles.panelTitle}>Kill Feed</h3>
            <p className={styles.control}>
                <label htmlFor={selectId}>Show squad</label>
                <select id={selectId} value={squadTag} onChange={(event) => setSquadTag(event.target.value)}>
                    <option value={ALL}>All squads</option>
                    {squads.map((squad) => (
                        <option key={squad.id} value={squad.tag}>{squad.name} ({squad.tag})</option>
                    ))}
                </select>
            </p>
            <p className={styles.summary} role="status" aria-live="polite">{summary}</p>
            {visibleEvents.length === 0 ? (
                <p className={styles.empty}>No kill-feed events for {selected ? selected.name : "this filter"} yet.</p>
            ) : (
                <VirtualList
                    key={squadTag}
                    items={visibleEvents}
                    rowHeight={KILL_ROW_HEIGHT}
                    viewportHeight={KILL_FEED_VIEWPORT}
                    overscan={KILL_FEED_OVERSCAN}
                    getKey={(event) => event.id}
                    renderItem={(event) => <KillRow event={event} />}
                    labelledBy="killfeed-title"
                />
            )}
        </section>
    );
}
