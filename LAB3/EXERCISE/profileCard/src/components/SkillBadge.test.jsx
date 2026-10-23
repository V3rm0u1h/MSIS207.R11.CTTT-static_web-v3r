import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import SOURCE from "./SkillBadge.jsx?raw";
import SkillBadge, { assertSkill } from "./SkillBadge.jsx";

// T-01A — SkillBadge foundation.

const REACT = Object.freeze({ id: "react", name: "React", level: "Advanced" });
const SKILLS = Object.freeze([
    REACT,
    Object.freeze({ id: "css", name: "CSS", level: "Intermediate" }),
    Object.freeze({ id: "rust", name: "Rust", level: "Beginner" })
]);

/** Renders into a <ul>, as DeveloperCard hosts the badges. */
function renderList(element) {
    const list = document.body.appendChild(document.createElement("ul"));
    return render(element, { container: list });
}

/** Renders with console.error captured; returns the captured messages. */
function renderCapturingErrors(element) {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
        renderList(element);
        return spy.mock.calls.map((args) => args.map(String).join(" "));
    } finally {
        spy.mockRestore();
    }
}

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
});

describe("SkillBadge", () => {
    test("renders the skill name and level as <li><span/><span/></li>", () => {
        const { container } = renderList(<SkillBadge skill={REACT} />);
        expect(container.innerHTML).toBe("<li><span>React</span><span>Advanced</span></li>");
    });

    test("adds no wrapper element: the <li> is a direct child of the parent list", () => {
        const { container } = renderList(<SkillBadge skill={REACT} />);
        expect(container.children).toHaveLength(1);
        expect(container.firstElementChild.tagName).toBe("LI");
        expect(container.querySelectorAll("div")).toHaveLength(0);
        expect(container.querySelectorAll("li > span")).toHaveLength(2);
    });

    test("renders any skill object without code changes", () => {
        const { container } = renderList(SKILLS.map((skill) => <SkillBadge key={skill.id} skill={skill} />));
        const rendered = [...container.children].map((item) => [...item.children].map((span) => span.textContent));
        expect(rendered).toEqual(SKILLS.map(({ name, level }) => [name, level]));
    });

    test("logs no React warning in a list keyed by skill.id", () => {
        const errors = renderCapturingErrors(SKILLS.map((skill) => <SkillBadge key={skill.id} skill={skill} />));
        expect(errors).toEqual([]);
    });

    test("control: the same list without keys does trigger React's key warning", () => {
        // Proves the previous test can fail: tests run development React, which warns.
        // eslint-disable-next-line react/jsx-key
        const errors = renderCapturingErrors(SKILLS.map((skill) => <SkillBadge skill={skill} />));
        expect(errors.some((message) => message.includes("key"))).toBe(true);
    });

    test("applies class names passed by the parent, e.g. from its CSS Module", () => {
        const styles = { badge: "DeveloperCard_badge__a1", name: "DeveloperCard_name__b2", level: "DeveloperCard_level__c3" };
        const { container } = renderList(
            <SkillBadge skill={REACT} className={styles.badge} nameClassName={styles.name} levelClassName={styles.level} />
        );
        const item = container.firstElementChild;
        expect(item.className).toBe(styles.badge);
        expect(item.children[0].className).toBe(styles.name);
        expect(item.children[1].className).toBe(styles.level);
    });

    test("renders skill text as text, never as HTML", () => {
        const payload = "<img src=x onerror=\"window.__skillBadgeXss = true\">";
        const { container } = renderList(<SkillBadge skill={{ id: "xss", name: payload, level: payload }} />);
        expect(container.querySelectorAll("img")).toHaveLength(0);
        expect(container.firstElementChild.children[0].textContent).toBe(payload);
        expect(window.__skillBadgeXss).toBeUndefined();
    });

    test.each([
        ["undefined", undefined],
        ["null", null],
        ["a string", "React"],
        ["an array", ["react", "React", "Advanced"]],
        ["no id", { name: "React", level: "Advanced" }],
        ["a numeric id", { id: 1, name: "React", level: "Advanced" }],
        ["a blank name", { id: "react", name: "  ", level: "Advanced" }],
        ["no level", { id: "react", name: "React" }],
        ["a null level", { id: "react", name: "React", level: null }]
    ])("rejects %s with a TypeError", (_, skill) => {
        expect(() => assertSkill(skill)).toThrow(TypeError);
        expect(() => SkillBadge({ skill })).toThrow(/^SkillBadge: skill/);
    });

    test("source contains no <div> and no global UI-library CSS import", () => {
        expect(SOURCE).not.toMatch(/<div[\s>]/);
        expect(SOURCE).not.toMatch(/import\s+["'][^"']*\.(css|less)["']/);
        expect(SOURCE).not.toMatch(/antd/);
    });
});
