const MASK = "••••••••";

/**
 * JSON inspector for the latest SUCCESSFUL submission.
 * - `data` is a snapshot taken by SimpleForm after validation passed; this
 *   component never reads live form state, so editing inputs afterwards does
 *   not change what it shows.
 * - Renders nothing until there is data.
 * - Only the short status line is announced (politely, once per submission);
 *   the JSON itself is not a live region.
 *
 * Props: data, submissionNumber?, redactKeys? (values masked, keys kept)
 */
export default function ShowData({ data, submissionNumber, redactKeys = [] }) {
    if (!data || typeof data !== "object") {
        return null;
    }

    const shown = redactKeys.length
        ? Object.fromEntries(Object.entries(data).map(([key, value]) => [key, redactKeys.includes(key) ? MASK : value]))
        : data;

    return (
        <section className="show-data" aria-labelledby="show-data-heading">
            <h2 id="show-data-heading">Submitted Form Data</h2>
            {submissionNumber > 0 && (
                <p className="show-data-meta" role="status">
                    Submission #{submissionNumber} received.
                </p>
            )}
            <pre>
                {JSON.stringify(shown, null, 2)}
            </pre>
        </section>
    );
}
