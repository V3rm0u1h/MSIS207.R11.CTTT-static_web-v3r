import type { Person } from "../data/people";

export interface PersonDetailProps {
    person: Person;
}

/**
 * Full profile view for one person. Default-exported so React.lazy() can
 * load it from its own async chunk (see LazyPersonDetail.tsx).
 */
export default function PersonDetail({ person }: PersonDetailProps) {
    const headingId = `person-detail-${person.id}`;
    return (
        <article aria-labelledby={headingId} className="person-detail">
            <header>
                <h2 id={headingId}>{person.name}</h2>
                <p>{person.role}</p>
            </header>
            <dl>
                <dt>Email</dt>
                <dd>
                    <a href={`mailto:${person.email}`}>{person.email}</a>
                </dd>
                <dt>Location</dt>
                <dd>{person.location}</dd>
            </dl>
            <p>{person.bio}</p>
            <section aria-label="Skills">
                <h3>Skills</h3>
                <ul>
                    {person.skills.map((skill) => (
                        <li key={skill}>{skill}</li>
                    ))}
                </ul>
            </section>
        </article>
    );
}
