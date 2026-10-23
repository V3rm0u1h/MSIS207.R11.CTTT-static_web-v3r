/**
 * Semantic Engineer & Pro-Gamer Profile Card — T-01B developer card
 *
 * Card markup (no div elements at all, Project Rule 1):
 *   <article aria-labelledby="dev-heading">  landmark named by its heading
 *     <header>
 *       <img> or <span role="img">  avatar; initials if the image fails
 *       <hgroup>
 *         <h2 id="dev-heading">    name
 *         <p>                      title
 *     <dl>                         one <dt>/<dd> pair per detail; pairs are
 *                                  grouped with <Fragment>, so no extra nodes
 *     <section aria-labelledby>    "Skills" heading + <ul> of SkillBadge <li>s
 *
 * Every profile detail arrives through props. Props are checked before
 * rendering (Project Rule 2): a bad profile is a TypeError, not a half-empty
 * card. All text is rendered as React children, never as HTML (Rule 3).
 *
 * The heading id is fixed by the reference contract, so only one card can be
 * on a page at a time; two cards would repeat the id.
 */

import { Fragment, useState } from "react";
import SkillBadge from "./SkillBadge.jsx";
import styles from "./DeveloperCard.module.css";

export const HEADING_ID = "dev-heading";
export const SKILLS_HEADING_ID = "dev-skills-heading";
export const AVATAR_SIZE = 96;

function assertText(value, field) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`DeveloperCard: ${field} must be a non-empty string, received ${JSON.stringify(value)}`);
    }
}

function assertHttpsUrl(value) {
    let url;
    try { url = new URL(value); } catch { url = null; }
    if (typeof value !== "string" || url?.protocol !== "https:") {
        throw new TypeError(`DeveloperCard: avatarUrl must be an absolute https:// URL, received ${JSON.stringify(value)}`);
    }
}

/** Throws a TypeError unless the props describe a complete profile. */
export function assertProfile({ name, title, avatarUrl, role, experience, location, mainGame, skills }) {
    assertText(name, "name");
    assertText(title, "title");
    if (avatarUrl !== undefined) assertHttpsUrl(avatarUrl);
    assertText(role, "role");
    assertText(experience, "experience");
    if (location !== undefined) assertText(location, "location");
    if (mainGame !== undefined) assertText(mainGame, "mainGame");
    if (!Array.isArray(skills)) throw new TypeError("DeveloperCard: skills must be an array of skill objects");
    // Skill ids are the list keys, so they must be unique.
    const ids = new Set();
    for (const skill of skills) {
        if (ids.has(skill?.id)) throw new TypeError(`DeveloperCard: duplicate skill id ${JSON.stringify(skill.id)}`);
        ids.add(skill?.id);
    }
}

/** "Linh Tran" -> "LT"; one word -> its first letter. Code points, so accented letters stay whole. */
export function initialsOf(name) {
    const words = name.trim().split(/\s+/);
    const first = Array.from(words[0])[0];
    const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
    return (first + last).toLocaleUpperCase();
}

/**
 * The image until it fails, then the initials. The parent keys this by URL,
 * so a new avatarUrl gets a fresh attempt instead of the old failure.
 */
function Avatar({ name, avatarUrl }) {
    const [failed, setFailed] = useState(false);
    const label = `${name} profile`;
    if (avatarUrl === undefined || failed) {
        return (
            <span className={styles.initials} role="img" aria-label={label}>
                {initialsOf(name)}
            </span>
        );
    }
    return (
        <img
            className={styles.avatar}
            src={avatarUrl}
            alt={label}
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
            onError={() => setFailed(true)}
        />
    );
}

export default function DeveloperCard(props) {
    assertProfile(props);
    const { name, title, avatarUrl, role, experience, location, mainGame, skills } = props;
    const details = [
        { label: "Role", value: role },
        { label: "Experience", value: experience },
        { label: "Location", value: location },
        { label: "Main game", value: mainGame }
    ].filter(({ value }) => value !== undefined);

    return (
        <article className={styles.card} aria-labelledby={HEADING_ID}>
            <header className={styles.identity}>
                <Avatar key={avatarUrl} name={name} avatarUrl={avatarUrl} />
                <hgroup>
                    <h2 id={HEADING_ID} className={styles.name}>{name}</h2>
                    <p className={styles.title}>{title}</p>
                </hgroup>
            </header>

            <dl className={styles.metrics}>
                {details.map(({ label, value }) => (
                    <Fragment key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </Fragment>
                ))}
            </dl>

            <section className={styles.skills} aria-labelledby={SKILLS_HEADING_ID}>
                <h3 id={SKILLS_HEADING_ID} className={styles.skillsHeading}>Skills</h3>
                <ul className={styles.skillList}>
                    {skills.map((s) => (
                        <SkillBadge
                            key={s.id}
                            skill={s}
                            className={styles.badge}
                            nameClassName={styles.skillName}
                            levelClassName={styles.skillLevel}
                        />
                    ))}
                </ul>
            </section>
        </article>
    );
}
