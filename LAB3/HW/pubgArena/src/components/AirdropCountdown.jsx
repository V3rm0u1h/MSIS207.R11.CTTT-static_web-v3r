/**
 * KRAFTON x PUBG Vietnam Championship — T-03A countdowns
 *
 *   <section aria-labelledby="countdowns-title">
 *     <h2>Countdowns</h2>
 *     <p> server clock offset (simulated) </p>
 *     <ul>
 *       <li> <CountdownCard/> </li>      one per event, in schedule order
 *     </ul>
 *   </section>
 *
 * Each card calls usePubgAirdropTimer itself, so the countdowns run
 * independently (a hook cannot be called in a loop, hence one component per
 * event). AirdropCountdown owns the list; a card is one <article> with no
 * wrapper of its own (Project Rules 1 and 4).
 *
 * Accessibility. The digits change five times a second, so they are a
 * role="timer" (implicitly aria-live="off"): a screen reader reads them when
 * the user moves to them, instead of being interrupted constantly. The
 * status ("Upcoming" → "Live now") is the only live region (polite) and
 * changes once, when the target is reached. Each card is labelled by its
 * title, and the timer by "<title> countdown"; the digits sit in a <time>
 * element with an ISO 8601 duration, and the target in a <time> with its date.
 * All text is rendered as text, never as HTML (Project Rule 3).
 */
import { formatCountdown, isoDuration, splitDuration, usePubgAirdropTimer } from "../hooks/usePubgAirdropTimer.js";
import styles from "./AirdropCountdown.module.css";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
});

const FIELDS = Object.freeze(["id", "title", "upcomingStatus", "liveStatus"]);

/** Throws a TypeError unless event is a complete countdown entry (Project Rule 2). */
export function assertCountdownEvent(event) {
    if (event === null || typeof event !== "object" || Array.isArray(event)) {
        throw new TypeError("AirdropCountdown: each event must be an object");
    }
    FIELDS.forEach((field) => {
        if (typeof event[field] !== "string" || event[field].trim() === "") {
            throw new TypeError(`AirdropCountdown: event.${field} must be a non-empty string, received ${JSON.stringify(event[field])}`);
        }
    });
    if (!/^[a-z0-9-]+$/.test(event.id)) {
        throw new TypeError(`AirdropCountdown: event.id must be lower-case letters, digits and dashes, received ${JSON.stringify(event.id)}`);
    }
    if (typeof event.targetEpochMs !== "number" || !Number.isFinite(event.targetEpochMs)) {
        throw new TypeError(`AirdropCountdown: event.targetEpochMs must be epoch milliseconds, received ${JSON.stringify(event.targetEpochMs)}`);
    }
}

export function CountdownCard({ event, serverOffsetMs = 0 }) {
    assertCountdownEvent(event);
    const { remainingMs, isLive } = usePubgAirdropTimer(event.targetEpochMs, serverOffsetMs);
    const { milliseconds } = splitDuration(remainingMs);
    const titleId = `${event.id}-title`;

    return (
        <article className={styles.card} aria-labelledby={titleId} data-countdown={event.id} data-live={isLive}>
            <h3 id={titleId} className={styles.cardTitle}>{event.title}</h3>
            <p className={styles.timer} role="timer" aria-label={`${event.title} countdown`}>
                <time dateTime={isoDuration(remainingMs)} className={styles.digits}>{formatCountdown(remainingMs)}</time>
                {" "}
                <span className={styles.millis} aria-hidden="true">.{String(milliseconds).padStart(3, "0")}</span>
            </p>
            <p className={styles.status} aria-live="polite" data-status={isLive ? "live" : "upcoming"}>
                {isLive ? event.liveStatus : event.upcomingStatus}
            </p>
            <p className={styles.target}>
                Target: <time dateTime={new Date(event.targetEpochMs).toISOString()}>{DATE_FORMAT.format(event.targetEpochMs)} (ICT)</time>
            </p>
        </article>
    );
}

export default function AirdropCountdown({ events, serverOffsetMs = 0 }) {
    if (!Array.isArray(events) || events.length === 0) {
        throw new TypeError("AirdropCountdown: events must be a non-empty array");
    }
    events.forEach(assertCountdownEvent);
    if (new Set(events.map((event) => event.id)).size !== events.length) {
        throw new TypeError("AirdropCountdown: event ids must be unique");
    }
    if (typeof serverOffsetMs !== "number" || !Number.isFinite(serverOffsetMs)) {
        throw new TypeError("AirdropCountdown: serverOffsetMs must be a finite number");
    }
    const sign = serverOffsetMs >= 0 ? "+" : "−";

    return (
        <section className={styles.countdowns} aria-labelledby="countdowns-title">
            <h2 id="countdowns-title" className={styles.sectionTitle}>Countdowns</h2>
            <p className={styles.offset}>
                Server clock offset: {sign}{(Math.abs(serverOffsetMs) / 1000).toFixed(3)} s (simulated)
            </p>
            <ul className={styles.cards}>
                {events.map((event) => (
                    <li key={event.id}>
                        <CountdownCard event={event} serverOffsetMs={serverOffsetMs} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
