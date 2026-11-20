import { people } from "../data/people";

/** Index route of /people: shown before any person is selected. */
export default function PeopleDirectory() {
    return (
        <section aria-labelledby="directory-heading">
            <h2 id="directory-heading">Directory</h2>
            <p>
                {people.length} people on file. Select a person from the directory to open their dossier.
            </p>
        </section>
    );
}
