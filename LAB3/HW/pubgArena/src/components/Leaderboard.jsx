/**
 * KRAFTON x PUBG Vietnam Championship — T-03C squad leaderboard
 *
 *   <section aria-labelledby="leaderboard-title">
 *     <h3>Squad Leaderboard</h3>
 *     <LeaderboardControls/>                         search, minimum WWCD, sort
 *     <p role="status">Showing 4 of 4 squads, sorted by WWCD.</p>
 *     <figure tabindex="0">                          horizontal scroll on phones
 *       <table> caption, thead (aria-sort), tbody of LeaderboardRow </table>
 *     </figure>
 *   </section>
 *
 * State holds only the raw inputs (query, minimum WWCD, sort field). The
 * visible rows are derived during render with useMemo: filter, then
 * .toSorted() (never .sort(), so the frozen PUBG_SQUADS array is never
 * mutated), no useEffect and no copy of derived data in state.
 *
 * Search matches the squad name or tag, case- and diacritic-insensitively
 * (normalizeSearchText from Lab 2). Ties keep dataset order, because
 * toSorted is stable. The status line is a polite live region that changes
 * only when the result changes, e.g. "Showing 1 of 4 squads, sorted by Kill
 * Points." The empty state stays inside the table, so the column headers
 * keep explaining what is missing.
 */
import { useMemo, useState } from "react";
import { PUBG_SQUADS, SORT_FIELDS, assertSquads } from "../data/pubgSquads.js";
import { normalizeSearchText } from "../utils/virtualListUtils.js";
import LeaderboardControls from "./LeaderboardControls.jsx";
import LeaderboardRow from "./LeaderboardRow.jsx";
import styles from "./Championship.module.css";

const COLUMNS = Object.freeze([
    { key: "wwcd", label: "WWCD" },
    { key: "placementPoints", label: "Placement Points" },
    { key: "killPoints", label: "Kill Points" }
]);

/** Filters by name/tag and minimum WWCD, then sorts descending by sortBy, without mutating squads. */
export function selectSquads(squads, { query = "", minWwcd = 0, sortBy = "wwcd" } = {}) {
    assertSquads(squads);
    if (!Object.hasOwn(SORT_FIELDS, sortBy)) throw new TypeError(`selectSquads: unknown sort field ${JSON.stringify(sortBy)}`);
    const needle = normalizeSearchText(query.trim());
    return squads
        .filter((squad) => (needle === ""
            || normalizeSearchText(squad.name).includes(needle)
            || normalizeSearchText(squad.tag).includes(needle)) && squad.wwcd >= minWwcd)
        .toSorted((a, b) => b[sortBy] - a[sortBy]);
}

export default function Leaderboard({ squads = PUBG_SQUADS }) {
    assertSquads(squads);
    const [query, setQuery] = useState("");
    const [minWwcd, setMinWwcd] = useState(0);
    const [sortBy, setSortBy] = useState("wwcd");

    const visibleSquads = useMemo(() => selectSquads(squads, { query, minWwcd, sortBy }), [squads, query, minWwcd, sortBy]);
    const summary = `Showing ${visibleSquads.length} of ${squads.length} squads, sorted by ${SORT_FIELDS[sortBy]}.`;

    return (
        <section className={styles.panel} aria-labelledby="leaderboard-title">
            <h3 id="leaderboard-title" className={styles.panelTitle}>Squad Leaderboard</h3>
            <LeaderboardControls
                query={query}
                minWwcd={minWwcd}
                sortBy={sortBy}
                onQueryChange={setQuery}
                onMinWwcdChange={setMinWwcd}
                onSortByChange={setSortBy}
            />
            <p className={styles.summary} role="status" aria-live="polite">{summary}</p>
            <figure className={styles.tableFrame} tabIndex={0} aria-labelledby="leaderboard-caption">
                <table className={styles.table}>
                    <caption id="leaderboard-caption">
                        PUBG Vietnam squads (illustrative values, not official standings)
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col">Rank</th>
                            <th scope="col">Squad</th>
                            <th scope="col">Tag</th>
                            {COLUMNS.map((column) => (
                                <th key={column.key} scope="col" aria-sort={column.key === sortBy ? "descending" : undefined}>
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleSquads.length === 0 ? (
                            <tr>
                                <td colSpan={6} className={styles.empty}>
                                    No squads match {query.trim() === "" ? "" : `“${query.trim()}” `}
                                    {minWwcd > 0 ? `with ${minWwcd} or more WWCD` : "this search"}.
                                </td>
                            </tr>
                        ) : visibleSquads.map((squad, index) => (
                            <LeaderboardRow key={squad.id} squad={squad} rank={index + 1} sortBy={sortBy} />
                        ))}
                    </tbody>
                </table>
            </figure>
        </section>
    );
}
