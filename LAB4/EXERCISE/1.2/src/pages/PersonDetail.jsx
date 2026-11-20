import { useParams } from "react-router";
import NotFoundState from "../components/NotFoundState";

/**
 * Dossier for "/people/:id".
 * - The id comes only from React Router's useParams() (already decoded by the
 *   router) — no window.location reads, no string splitting.
 * - Lookup is an exact, read-only people.find(); any id that is missing,
 *   unknown or malformed yields `undefined` and renders NotFoundState, so no
 *   property of an undefined person is ever read.
 */
export default function PersonDetail({ people }) {
    const { id } = useParams();
    const person = typeof id === "string" ? people.find((p) => p.id === id) : undefined;

    if (!person) {
        return <NotFoundState />;
    }

    const headingId = `person-${person.id}-heading`;
    return (
        <article aria-labelledby={headingId}>
            <h2 id={headingId}>{person.name}</h2>
            <dl className="person-details">
                <dt>Name</dt>
                <dd>{person.name}</dd>

                <dt>Role</dt>
                <dd>{person.role}</dd>

                <dt>Email</dt>
                <dd>
                    <a href={`mailto:${person.email}`}>{person.email}</a>
                </dd>

                <dt>Location</dt>
                <dd>{person.location}</dd>

                <dt>Bio</dt>
                <dd>{person.bio}</dd>

                <dt>Skills</dt>
                <dd>
                    <ul className="person-skills">
                        {person.skills.map((skill) => (
                            <li key={skill}>{skill}</li>
                        ))}
                    </ul>
                </dd>
            </dl>
        </article>
    );
}
