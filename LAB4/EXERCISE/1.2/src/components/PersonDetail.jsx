/**
 * Dynamic route target for "/people/:id".
 * Parameter extraction (useParams) and the people.find() lookup are a later PRD;
 * this placeholder only proves the nested route renders inside the layout.
 */
export default function PersonDetail() {
    return (
        <article aria-label="Person dossier">
            <h2>Person dossier</h2>
        </article>
    );
}
