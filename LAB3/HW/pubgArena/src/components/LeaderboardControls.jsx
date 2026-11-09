/**
 * KRAFTON x PUBG Vietnam Championship — T-03C leaderboard controls
 *
 *   <form role="search" aria-label="Filter and sort squads">
 *     <label for=:r1:>Search squads</label> <input type="search" id=:r1:>
 *     <label for=:r2:>Minimum WWCD</label>  <select id=:r2:>
 *     <label for=:r3:>Sort by</label>       <select id=:r3:>
 *   </form>
 *
 * Fully controlled: the raw inputs live in Leaderboard's state, this
 * component only reports changes. Every control has a visible <label
 * htmlFor> tied to an id from useId(), so ids stay unique even with two
 * leaderboards on a page. Submitting (Enter in the search box) does nothing,
 * because results already update as you type.
 */
import { useId } from "react";
import { SORT_FIELDS } from "../data/pubgSquads.js";
import styles from "./Championship.module.css";

export const WWCD_FILTERS = Object.freeze([0, 1, 2, 3]);

export default function LeaderboardControls({ query, minWwcd, sortBy, onQueryChange, onMinWwcdChange, onSortByChange }) {
    if (typeof query !== "string") throw new TypeError("LeaderboardControls: query must be a string");
    if (!WWCD_FILTERS.includes(minWwcd)) throw new TypeError(`LeaderboardControls: minWwcd must be one of ${WWCD_FILTERS.join(", ")}`);
    if (!Object.hasOwn(SORT_FIELDS, sortBy)) throw new TypeError(`LeaderboardControls: sortBy must be one of ${Object.keys(SORT_FIELDS).join(", ")}`);
    [["onQueryChange", onQueryChange], ["onMinWwcdChange", onMinWwcdChange], ["onSortByChange", onSortByChange]].forEach(([name, fn]) => {
        if (typeof fn !== "function") throw new TypeError(`LeaderboardControls: ${name} must be a function`);
    });

    const id = useId();
    const searchId = `${id}-search`;
    const wwcdId = `${id}-wwcd`;
    const sortId = `${id}-sort`;

    return (
        <form className={styles.controls} role="search" aria-label="Filter and sort squads" onSubmit={(event) => event.preventDefault()}>
            <label className={styles.control} htmlFor={searchId}>
                <span>Search squads</span>
                <input
                    id={searchId}
                    type="search"
                    value={query}
                    placeholder="Name or tag, e.g. CES"
                    autoComplete="off"
                    onChange={(event) => onQueryChange(event.target.value)}
                />
            </label>
            <label className={styles.control} htmlFor={wwcdId}>
                <span>Minimum WWCD</span>
                <select id={wwcdId} value={minWwcd} onChange={(event) => onMinWwcdChange(Number(event.target.value))}>
                    {WWCD_FILTERS.map((count) => (
                        <option key={count} value={count}>{count === 0 ? "Any" : `${count} or more`}</option>
                    ))}
                </select>
            </label>
            <label className={styles.control} htmlFor={sortId}>
                <span>Sort by</span>
                <select id={sortId} value={sortBy} onChange={(event) => onSortByChange(event.target.value)}>
                    {Object.entries(SORT_FIELDS).map(([field, label]) => (
                        <option key={field} value={field}>{label}</option>
                    ))}
                </select>
            </label>
        </form>
    );
}
