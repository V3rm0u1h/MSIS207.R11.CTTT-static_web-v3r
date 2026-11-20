import type { Person } from "../data/people";
import "./personDetailLayout.css";

export interface PersonDetailProps {
    person: Person;
}

/**
 * Full profile view for one person. Default-exported so React.lazy() can
 * load it from its own async chunk (see LazyPersonDetail.tsx).
 * Layout classes are shared with PersonDetailSkeleton to keep CLS at 0.
 */
export default function PersonDetail({ person }: PersonDetailProps) {
    const headingId = `person-detail-${person.id}`;
    return (
        <article aria-labelledby={headingId} className="person-detail">
            <header className="pd-header">
                <h2 id={headingId} className="pd-name">{person.name}</h2>
                <p className="pd-role">{person.role}</p>
            </header>
            <dl className="pd-facts">
                <dt>Email</dt>
                <dd>
                    <a href={`mailto:${person.email}`}>{person.email}</a>
                </dd>
                <dt>Location</dt>
                <dd>{person.location}</dd>
            </dl>
            <p className="pd-bio">{person.bio}</p>
            <section aria-label="Skills" className="pd-skills">
                <h3 className="pd-skills-title">Skills</h3>
                <ul className="pd-chips">
                    {person.skills.map((skill) => (
                        <li key={skill} className="pd-chip">{skill}</li>
                    ))}
                </ul>
            </section>
        </article>
    );
}
