/**
 * KRAFTON x PUBG Vietnam Championship — T-03B claim arena
 *
 *   <section aria-labelledby="arena-title">
 *     <h2>Claim Center</h2>
 *     <p> simulation-data notice </p>
 *     <ul> <li><ClaimCard/></li> … </ul>            one card per item, inventory order
 *     <fieldset> Server simulation: one <select> per item </fieldset>
 *   </section>
 *
 * AirdropArena owns the optimistic claim state (useOptimisticClaim) and the
 * list; each ClaimCard is one <article> inside an <li> (Project Rules 1 and
 * 4). The "Server simulation" controls switch the mock backend between its
 * deterministic modes (server decides / 409 Looted Out / network error /
 * 500), so every branch of the claim state machine can be tried by hand.
 */
import { useState } from "react";
import { assertInventory } from "../data/inventory.js";
import { useOptimisticClaim } from "../hooks/useOptimisticClaim.js";
import { SERVICE_MODES } from "../services/claimService.js";
import ClaimCard from "./ClaimCard.jsx";
import styles from "./AirdropArena.module.css";

const MODE_LABELS = Object.freeze({
    "auto": "Server decides (200 while stock lasts)",
    "conflict": "Force 409 Looted Out",
    "network-error": "Force network error",
    "server-error": "Force 500 server error"
});

function assertService(service) {
    const methods = ["claimItem", "setMode", "getMode"];
    if (service === null || typeof service !== "object" || methods.some((name) => typeof service[name] !== "function")) {
        throw new TypeError("AirdropArena: service must provide claimItem, setMode and getMode");
    }
}

export default function AirdropArena({ initialInventory, service, generateClaimId }) {
    assertInventory(initialInventory);
    assertService(service);
    const { inventory, claims, claim, retry } = useOptimisticClaim({
        initialInventory,
        claimItem: service.claimItem,
        ...(generateClaimId ? { generateClaimId } : {})
    });
    const [modes, setModes] = useState(() => Object.fromEntries(initialInventory.map((item) => [item.id, service.getMode(item.id)])));

    const changeMode = (itemId, mode) => {
        service.setMode(itemId, mode);
        setModes((current) => ({ ...current, [itemId]: mode }));
    };

    return (
        <section className={styles.arena} aria-labelledby="arena-title">
            <h2 id="arena-title" className={styles.sectionTitle}>Claim Center</h2>
            <p className={styles.notice}>Prices and stock are simulation data, not official PUBG prices.</p>
            <ul className={styles.cards}>
                {inventory.map((item) => (
                    <li key={item.id}>
                        <ClaimCard item={item} claim={claims[item.id]} onClaim={claim} onRetry={retry} />
                    </li>
                ))}
            </ul>
            <fieldset className={styles.simulation}>
                <legend>Server simulation (mock backend, for testing)</legend>
                {inventory.map((item) => (
                    <label key={item.id} className={styles.simulationRow}>
                        <span>{item.name}</span>
                        <select value={modes[item.id]} onChange={(event) => changeMode(item.id, event.target.value)}>
                            {SERVICE_MODES.map((mode) => (
                                <option key={mode} value={mode}>{MODE_LABELS[mode]}</option>
                            ))}
                        </select>
                    </label>
                ))}
            </fieldset>
        </section>
    );
}
