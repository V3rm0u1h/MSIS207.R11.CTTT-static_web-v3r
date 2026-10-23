/**
 * Semantic Engineer & Pro-Gamer Profile Card — T-01A skill badge
 *
 * One skill as one list item; the parent (DeveloperCard) owns the <ul>/<ol>
 * and the list key, so the badge adds no wrapper of its own:
 *   <li>
 *     <span>React</span>      skill name
 *     <span>Advanced</span>   proficiency level
 *   </li>
 *
 * Styling comes from outside: the parent passes class names from its CSS
 * Module (or any string), so the badge needs no stylesheet or UI library.
 *
 * The skill is checked before rendering (Project Rule 2): a bad object is a
 * TypeError at the call site instead of an empty or broken badge. Text is
 * rendered as React children, never as HTML (Project Rule 3).
 */

function assertText(value, field) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`SkillBadge: skill.${field} must be a non-empty string, received ${JSON.stringify(value)}`);
    }
}

/** Throws a TypeError unless skill is { id, name, level } with non-empty strings. */
export function assertSkill(skill) {
    if (skill === null || typeof skill !== "object" || Array.isArray(skill)) {
        throw new TypeError("SkillBadge: skill must be an object with id, name and level");
    }
    assertText(skill.id, "id");
    assertText(skill.name, "name");
    assertText(skill.level, "level");
}

export default function SkillBadge({ skill, className, nameClassName, levelClassName }) {
    assertSkill(skill);
    return (
        <li className={className}>
            <span className={nameClassName}>{skill.name}</span>
            <span className={levelClassName}>{skill.level}</span>
        </li>
    );
}
