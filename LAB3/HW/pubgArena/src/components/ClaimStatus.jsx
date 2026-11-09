/**
 * KRAFTON x PUBG Vietnam Championship — T-03B claim status line
 *
 *   <p id="pvs-vip-status" role="status" aria-live="polite" data-claim-status="SUCCESS">Claim successful …</p>
 *
 * A polite live region per card, so every state change of a claim
 * (pending, success, looted out, error) is announced without moving focus.
 * One element, no wrapper (Project Rules 1 and 4); text only (Rule 3).
 */
import { CLAIM_STATUS } from "../hooks/useOptimisticClaim.js";
import styles from "./AirdropArena.module.css";

const STATUSES = Object.freeze(Object.values(CLAIM_STATUS));

/** The first 8 characters of a claim id, enough to tell claims apart on screen. */
export const shortClaimId = (claimId) => claimId.slice(0, 8);

export function claimMessage(claim, itemName) {
    switch (claim.status) {
        case CLAIM_STATUS.PENDING:
            return `Claiming ${itemName}…`;
        case CLAIM_STATUS.SUCCESS:
            return `Claim successful: ${itemName} (claim ${shortClaimId(claim.claimId)}).`;
        case CLAIM_STATUS.CONFLICT:
            return `${claim.message} Another player claimed it first; your stock was restored.`;
        case CLAIM_STATUS.ERROR:
            return `${claim.message}: your claim was not confirmed and your stock was restored. You can retry.`;
        default:
            return "Ready to claim.";
    }
}

export default function ClaimStatus({ claim, itemName, id }) {
    if (claim === null || typeof claim !== "object" || !STATUSES.includes(claim.status)) {
        throw new TypeError(`ClaimStatus: claim.status must be one of ${STATUSES.join(", ")}`);
    }
    if (claim.status !== CLAIM_STATUS.IDLE && (typeof claim.claimId !== "string" || claim.claimId === "")) {
        throw new TypeError("ClaimStatus: an active claim needs its claimId");
    }
    if (typeof claim.message !== "string") throw new TypeError("ClaimStatus: claim.message must be a string");
    if (typeof itemName !== "string" || itemName.trim() === "") throw new TypeError("ClaimStatus: itemName must be a non-empty string");
    if (id !== undefined && (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id))) throw new TypeError("ClaimStatus: id must be a lower-case slug");

    return (
        <p id={id} className={styles.status} role="status" aria-live="polite" data-claim-status={claim.status}>
            {claimMessage(claim, itemName)}
        </p>
    );
}
