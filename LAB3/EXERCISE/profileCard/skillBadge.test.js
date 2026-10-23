import { createElement as h } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { loadJsx } from "./loadJsx.js";
import { test, assert, assertEqual, assertThrowsType, sandbox } from "../../source/testHarness.js";

// T-01A — SkillBadge foundation.

const SOURCE_URL = new URL("./SkillBadge.jsx", import.meta.url);
const { default: SkillBadge, assertSkill } = await loadJsx(SOURCE_URL);

const REACT = Object.freeze({ id: "react", name: "React", level: "Advanced" });
const SKILLS = Object.freeze([
    REACT,
    Object.freeze({ id: "css", name: "CSS", level: "Intermediate" }),
    Object.freeze({ id: "rust", name: "Rust", level: "Beginner" })
]);

/** Renders into a <ul> in the sandbox, as DeveloperCard would host the badges. */
function renderList(element) {
    const list = document.createElement("ul");
    sandbox().append(list);
    const root = createRoot(list);
    flushSync(() => root.render(element));
    return { list, unmount: () => root.unmount() };
}

/** Runs callback with console.error captured; returns the captured messages. */
function captureConsoleErrors(callback) {
    const messages = [];
    const original = console.error;
    console.error = (...args) => messages.push(args.map(String).join(" "));
    try { callback(); } finally { console.error = original; }
    return messages;
}

test("renders the skill name and level as <li><span/><span/></li>", () => {
    const { list, unmount } = renderList(h(SkillBadge, { skill: REACT }));
    assertEqual(list.innerHTML, "<li><span>React</span><span>Advanced</span></li>", "Badge markup");
    unmount();
});

test("adds no wrapper element: the <li> is a direct child of the parent list", () => {
    const { list, unmount } = renderList(h(SkillBadge, { skill: REACT }));
    assertEqual(list.children.length, 1, "Elements rendered at the top level");
    assertEqual(list.firstElementChild.tagName, "LI", "Top-level element");
    assertEqual(list.querySelectorAll("div").length, 0, "<div> elements rendered");
    assertEqual(list.querySelectorAll("li > span").length, 2, "Spans inside the item");
    unmount();
});

test("renders any skill object without code changes", () => {
    const { list, unmount } = renderList(SKILLS.map((skill) => h(SkillBadge, { key: skill.id, skill })));
    const rendered = [...list.children].map((item) => [...item.children].map((span) => span.textContent));
    assertEqual(JSON.stringify(rendered), JSON.stringify(SKILLS.map(({ name, level }) => [name, level])), "Rendered skills");
    unmount();
});

test("logs no React warning in a list keyed by skill.id", () => {
    let mounted;
    const errors = captureConsoleErrors(() => {
        mounted = renderList(SKILLS.map((skill) => h(SkillBadge, { key: skill.id, skill })));
    });
    assertEqual(errors.length, 0, `console.error calls (${errors.join(" | ")})`);
    mounted.unmount();
});

test("control: the same list without keys does trigger React's key warning", () => {
    // Proves the previous test can fail: development React is loaded and warns.
    let mounted;
    const errors = captureConsoleErrors(() => {
        mounted = renderList(SKILLS.map((skill) => h(SkillBadge, { skill })));
    });
    assert(errors.some((message) => message.includes("key")), "Expected a missing-key warning");
    mounted.unmount();
});

test("applies class names passed by the parent, e.g. from its CSS Module", () => {
    const styles = { badge: "DeveloperCard_badge__a1", name: "DeveloperCard_name__b2", level: "DeveloperCard_level__c3" };
    const { list, unmount } = renderList(h(SkillBadge, {
        skill: REACT, className: styles.badge, nameClassName: styles.name, levelClassName: styles.level
    }));
    const item = list.firstElementChild;
    assertEqual(item.className, styles.badge, "Item class");
    assertEqual(item.children[0].className, styles.name, "Name class");
    assertEqual(item.children[1].className, styles.level, "Level class");
    unmount();
});

test("renders skill text as text, never as HTML", () => {
    const payload = "<img src=x onerror=\"window.__skillBadgeXss = true\">";
    const { list, unmount } = renderList(h(SkillBadge, { skill: { id: "xss", name: payload, level: payload } }));
    assertEqual(list.querySelectorAll("img").length, 0, "<img> elements created");
    assertEqual(list.firstElementChild.children[0].textContent, payload, "Name text");
    assert(window.__skillBadgeXss === undefined, "Payload ran");
    unmount();
});

test("rejects invalid skill objects with a TypeError", () => {
    const invalid = [
        undefined, null, "React", ["react", "React", "Advanced"],
        { name: "React", level: "Advanced" },
        { id: 1, name: "React", level: "Advanced" },
        { id: "react", name: "  ", level: "Advanced" },
        { id: "react", name: "React" },
        { id: "react", name: "React", level: null }
    ];
    for (const skill of invalid) {
        assertThrowsType(() => assertSkill(skill), /^SkillBadge: skill/);
        assertThrowsType(() => SkillBadge({ skill }), /^SkillBadge: skill/);
    }
});

test("source contains no <div> and no global UI-library CSS import", async () => {
    const source = await (await fetch(SOURCE_URL)).text();
    assert(!/<div[\s>]/.test(source), "SkillBadge.jsx contains a <div>");
    assert(!/import\s+["'][^"']*\.(css|less)["']/.test(source), "SkillBadge.jsx imports a global stylesheet");
    assert(!/antd/.test(source), "SkillBadge.jsx references Ant Design");
});
