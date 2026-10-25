import { useId, useState } from "react";
import { SMART_PEOPLE } from "../smartPeople.js";
import styles from "./ScientistDirectory.module.css";

/**
 * ScientistDirectory — T-02B interactive search & derived pipeline.
 *
 * State holds only the independent, editable inputs: people, query, minIq and
 * sortBy. visiblePeople is derived from them on every render (no useEffect),
 * so any input change updates the list in the same render.
 *
 * Semantic structure (Zero Div-Soup):
 *   <section aria-labelledby>         landmark named by its heading
 *     <h1>                            directory title
 *     <form role="search">            labelled controls, each tied by useId()
 *     <ul>                            one <li> per person, keyed by person.id
 *       <li><h2/><dl>age · IQ</dl></li>
 */

const SORT_OPTIONS = Object.freeze([
    Object.freeze({ value: "iq", label: "IQ (highest first)" }),
    Object.freeze({ value: "age", label: "Age (youngest first)" })
]);

export default function ScientistDirectory() {
    const [people, setPeople] = useState(SMART_PEOPLE);
    const [query, setQuery] = useState("");
    const [minIq, setMinIq] = useState(0);
    const [sortBy, setSortBy] = useState("iq");

    const headingId = useId();
    const searchId = useId();
    const minIqId = useId();
    const sortId = useId();

    const normalizedQuery = query.trim().toLowerCase();
    const filteredPeople = people.filter((person) => {
        const matchesName = person.name.toLowerCase().includes(normalizedQuery);
        const matchesIq = person.iq >= minIq;
        return matchesName && matchesIq;
    });

    const visiblePeople = filteredPeople.toSorted((a, b) => {
        if (sortBy === "age") {
            return a.age - b.age;
        }
        return b.iq - a.iq;
    });

    return (
        <section className={styles.directory} aria-labelledby={headingId}>
            <h1 id={headingId} className={styles.title}>Scientist &amp; Pioneer Directory</h1>

            <form className={styles.controls} role="search" onSubmit={(event) => event.preventDefault()}>
                <p className={styles.field}>
                    <label htmlFor={searchId}>Search by name</label>
                    <input
                        id={searchId}
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </p>
                <p className={styles.field}>
                    <label htmlFor={minIqId}>Minimum IQ</label>
                    <input
                        id={minIqId}
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={minIq}
                        onChange={(event) => {
                            const value = event.target.valueAsNumber;
                            setMinIq(Number.isNaN(value) ? 0 : value);
                        }}
                    />
                </p>
                <p className={styles.field}>
                    <label htmlFor={sortId}>Sort by</label>
                    <select id={sortId} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </p>
            </form>

            <ul className={styles.list}>
                {visiblePeople.map((person) => (
                    <li key={person.id} className={styles.person}>
                        <h2 className={styles.name}>{person.name}</h2>
                        <dl className={styles.stats}>
                            <dt>Age</dt>
                            <dd>{person.age}</dd>
                            <dt>IQ</dt>
                            <dd>{person.iq}</dd>
                        </dl>
                    </li>
                ))}
            </ul>
        </section>
    );
}
