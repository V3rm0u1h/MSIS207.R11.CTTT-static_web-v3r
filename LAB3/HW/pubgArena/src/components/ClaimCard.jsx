/**
 * KRAFTON x PUBG Vietnam Championship — T-03B claim card
 *
 *   <article aria-labelledby="pvs-vip-name">
 *     <h3>PVS Grand Finals VIP Ticket</h3>
 *     <dl> Price: 1.500.000 ₫   Remaining stock: 24 </dl>
 *     <p> [Claim ticket] [Retry claim] </p>
 *     <ClaimStatus/>
 *   </article>
 *
 * The parent (AirdropArena) owns the <ul>/<li>; the card is one <article>
 * (Project Rules 1 and 4). Every value is rendered as text (Rule 3).
 *
 * The claim button is unavailable while a claim is PENDING or the stock is 0.
 * It uses aria-disabled rather than the disabled attribute, so a keyboard
 * user who just pressed it keeps focus on it during the request instead of
 * being dropped to <body>; activations are ignored meanwhile (and the hook's
 * lock would refuse them anyway). Retry appears only after a recoverable
 * ERROR. The remaining stock is not a live region: the status line already
 * announces the outcome of each claim.
 */
import { assertInventoryItem } from "../data/inventory.js";
import { CLAIM_STATUS } from "../hooks/useOptimisticClaim.js";
import { formatVND } from "../utils/formatVND.js";
import ClaimStatus from "./ClaimStatus.jsx";
import styles from "./AirdropArena.module.css";

const ACTION_LABELS = Object.freeze({ ticket: "Claim ticket", crate: "Claim crate" });

export default function ClaimCard({ item, claim, onClaim, onRetry }) {
    assertInventoryItem(item);
    if (typeof onClaim !== "function") throw new TypeError("ClaimCard: onClaim must be a function");
    if (typeof onRetry !== "function") throw new TypeError("ClaimCard: onRetry must be a function");

    const pending = claim?.status === CLAIM_STATUS.PENDING;
    const soldOut = item.stock === 0;
    const canClaim = !pending && !soldOut;
    const nameId = `${item.id}-name`;
    const label = soldOut ? "Looted out" : pending ? "Claiming…" : ACTION_LABELS[item.type];

    return (
        <article className={styles.card} aria-labelledby={nameId} data-item={item.id} data-claim-status={claim?.status}>
            <h3 id={nameId} className={styles.cardTitle}>{item.name}</h3>
            <dl className={styles.facts}>
                <dt>Price</dt>
                <dd data-field="price">{formatVND(item.price)}</dd>
                <dt>Remaining stock</dt>
                <dd data-field="stock">{item.stock}</dd>
            </dl>
            <p className={styles.actions}>
                <button
                    type="button"
                    className={styles.claimButton}
                    aria-disabled={!canClaim}
                    aria-describedby={`${item.id}-status`}
                    onClick={canClaim ? () => onClaim(item.id) : undefined}
                >
                    {label}
                </button>
                {claim?.status === CLAIM_STATUS.ERROR && (
                    <>
                        {" "}
                        <button type="button" className={styles.retryButton} onClick={() => onRetry(item.id)}>
                            Retry claim
                        </button>
                    </>
                )}
            </p>
            <ClaimStatus claim={claim} itemName={item.name} id={`${item.id}-status`} />
        </article>
    );
}
