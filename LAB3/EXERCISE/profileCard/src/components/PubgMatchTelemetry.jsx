import { useEffect, useId, useState } from "react";
import { SQUADS, requestTelemetry } from "../pubgTelemetry.js";
import styles from "./PubgMatchTelemetry.module.css";

export { SQUADS };

/**
 * PubgMatchTelemetry — T-03A telemetry architecture, T-03B async pipeline & cancellation.
 *
 * The request lifecycle is a four-state machine (STATUS). telemetry and error
 * are kept apart from status: status says where we are, telemetry/error hold
 * what came back. retryTick is only a re-request trigger, never a fifth state.
 *
 * One effect owns fetching, keyed on [squad, retryTick]. Each run creates its
 * own AbortController and its cleanup aborts it, so:
 *   - switching squad (or Strict Mode's dev re-run) cancels the previous request,
 *   - an AbortError is swallowed: no false error banner,
 *   - after the await, an aborted run returns before touching state, so an old
 *     response can never overwrite the newer squad's telemetry.
 * The radar stays IDLE until the first request (retryTick === 0); after that,
 * changing squad fetches straight away.
 *
 * Semantic structure (Zero Div-Soup):
 *   <section aria-labelledby>         landmark named by its heading
 *     <h1>                            radar title
 *     <form>                          labelled squad <select> + request <button>
 *     <output role="status">          polite live text for the current status
 *     <p role="alert"> + Retry        error message slot (ERROR only)
 *     <figure><dl/><figcaption/>      telemetry data slot (SUCCESS only), labelled simulated
 */

export const STATUS = Object.freeze({
    IDLE: "IDLE",
    LOADING: "LOADING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR"
});

const STATUS_TEXT = Object.freeze({
    [STATUS.IDLE]: "Idle. Request telemetry to start the radar.",
    [STATUS.LOADING]: "Loading telemetry…",
    [STATUS.SUCCESS]: "Telemetry received.",
    [STATUS.ERROR]: "Telemetry unavailable."
});

export default function PubgMatchTelemetry() {
    const [squad, setSquad] = useState("CES");
    const [status, setStatus] = useState(STATUS.IDLE);
    const [telemetry, setTelemetry] = useState(null);
    const [error, setError] = useState("");
    const [retryTick, setRetryTick] = useState(0);

    const headingId = useId();
    const squadId = useId();

    const selectedSquad = SQUADS.find((entry) => entry.id === squad);

    useEffect(() => {
        if (retryTick === 0) {
            return undefined;
        }
        const controller = new AbortController();

        async function loadTelemetry() {
            setStatus(STATUS.LOADING);
            setTelemetry(null);
            setError("");

            try {
                const data = await requestTelemetry(squad, controller.signal);
                if (controller.signal.aborted) {
                    return;
                }
                setTelemetry(data);
                setStatus(STATUS.SUCCESS);
            } catch (err) {
                if (err.name === "AbortError" || controller.signal.aborted) {
                    return;
                }
                setError(err.message);
                setStatus(STATUS.ERROR);
            }
        }

        loadTelemetry();

        return () => controller.abort();
    }, [squad, retryTick]);

    const handleRequest = (event) => {
        event.preventDefault();
        setRetryTick((prev) => prev + 1);
    };

    return (
        <section className={styles.radar} aria-labelledby={headingId}>
            <h1 id={headingId} className={styles.title}>PUBG Match Telemetry Radar</h1>

            <form className={styles.controls} onSubmit={handleRequest}>
                <p className={styles.field}>
                    <label htmlFor={squadId}>Squad</label>
                    <select id={squadId} value={squad} onChange={(event) => setSquad(event.target.value)}>
                        {SQUADS.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                                {entry.note ? `${entry.name} (${entry.tag}) — ${entry.note}` : `${entry.name} (${entry.tag})`}
                            </option>
                        ))}
                    </select>
                </p>
                <p className={styles.actions}>
                    <button type="submit" className={styles.request} disabled={status === STATUS.LOADING}>
                        Request telemetry
                    </button>
                </p>
            </form>

            <output className={styles.status} role="status" aria-live="polite" data-status={status}>
                {selectedSquad.name}: {STATUS_TEXT[status]}
            </output>

            {status === STATUS.ERROR && (
                <p className={styles.error} role="alert">
                    {error}{" "}
                    <button type="button" className={styles.retry} onClick={() => setRetryTick((prev) => prev + 1)}>
                        Retry
                    </button>
                </p>
            )}

            {status === STATUS.SUCCESS && telemetry !== null && telemetry.squadId === squad && (
                <figure className={styles.feed}>
                    <dl className={styles.telemetry} aria-label={`${telemetry.squadName} telemetry`}>
                        <dt>Squad</dt>
                        <dd>{telemetry.squadName}</dd>
                        <dt>Map</dt>
                        <dd>{telemetry.map}</dd>
                        <dt>Alive players</dt>
                        <dd>{telemetry.alivePlayers} / 4</dd>
                        <dt>Kills</dt>
                        <dd>{telemetry.kills}</dd>
                        <dt>Placement</dt>
                        <dd>#{telemetry.placement}</dd>
                        <dt>Blue Zone</dt>
                        <dd>Phase {telemetry.blueZonePhase} · {telemetry.blueZoneShrinking ? "Shrinking" : "Holding"}</dd>
                    </dl>
                    <figcaption className={styles.disclaimer}>
                        Simulated telemetry for demonstration only — not official live PVS match data.
                    </figcaption>
                </figure>
            )}
        </section>
    );
}
