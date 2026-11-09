/**
 * KRAFTON x PUBG Vietnam Championship — T-03C leaderboard row
 *
 * One <tr>; the parent (Leaderboard) owns the <tbody> and the key, so the
 * row adds no wrapper (Project Rules 1 and 4). The squad name is the row
 * header (<th scope="row">), so a screen reader announces "Cerberus
 * Esports" with every score cell. Values are rendered as text (Rule 3).
 */
import { assertSquad } from "../data/pubgSquads.js";
import styles from "./Championship.module.css";

export default function LeaderboardRow({ squad, rank, sortBy }) {
    assertSquad(squad);
    if (!Number.isSafeInteger(rank) || rank < 1) throw new TypeError("LeaderboardRow: rank must be a positive integer");
    const cell = (field) => (field === sortBy ? styles.sortedCell : undefined);

    return (
        <tr data-squad={squad.id}>
            <td>{rank}</td>
            <th scope="row" className={styles.squadName}>{squad.name}</th>
            <td><abbr title={squad.name}>{squad.tag}</abbr></td>
            <td className={cell("wwcd")}>{squad.wwcd}</td>
            <td className={cell("placementPoints")}>{squad.placementPoints}</td>
            <td className={cell("killPoints")}>{squad.killPoints}</td>
        </tr>
    );
}
