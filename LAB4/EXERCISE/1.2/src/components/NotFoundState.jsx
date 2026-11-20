import { Link } from "react-router";

/**
 * Fallback for a /people/:id that matches no record. Renders inside
 * PeopleLayout's <Outlet />, so the directory navigation stays available.
 * The requested id is deliberately not echoed back (no URL-controlled text).
 */
export default function NotFoundState() {
    return (
        <section className="not-found" aria-labelledby="not-found-heading">
            <h2 id="not-found-heading">Person Not Found</h2>
            <p>The requested person could not be found.</p>
            <Link to="/people">Return to Directory</Link>
        </section>
    );
}
