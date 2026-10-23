import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import SOURCE from "./DeveloperCard.jsx?raw";
import DeveloperCard, { AVATAR_SIZE, HEADING_ID, assertProfile, initialsOf } from "./DeveloperCard.jsx";
import styles from "./DeveloperCard.module.css";
import { sampleProfile } from "../sampleProfile.js";

// T-01B — developer profile architecture.

const PROFILE = sampleProfile;

function renderCard(props = {}) {
    return render(<DeveloperCard {...PROFILE} {...props} />);
}

afterEach(cleanup);

describe("DeveloperCard structure", () => {
    test("the <article> is named by its visible <h2 id=\"dev-heading\">", () => {
        const { container } = renderCard();
        const article = container.querySelector("article");
        expect(article.getAttribute("aria-labelledby")).toBe("dev-heading");
        const heading = document.getElementById(HEADING_ID);
        expect(heading.tagName).toBe("H2");
        expect(heading.textContent).toBe(PROFILE.name);
        expect(article.contains(heading)).toBe(true);
        // The accessible name the landmark actually gets:
        expect(screen.getByRole("article", { name: PROFILE.name })).toBe(article);
    });

    test("identity sits in <header> > <hgroup>: name heading, then title", () => {
        const { container } = renderCard();
        const hgroup = container.querySelector("article > header > hgroup");
        expect([...hgroup.children].map((element) => element.tagName)).toEqual(["H2", "P"]);
        expect(hgroup.children[1].textContent).toBe(PROFILE.title);
    });

    test("metadata is a <dl> of <dt>/<dd> pairs taken from props, with no wrappers", () => {
        const { container } = renderCard();
        const list = container.querySelector("dl");
        expect(list.className).toBe(styles.metrics);
        const pairs = [];
        for (let i = 0; i < list.children.length; i += 2) {
            pairs.push([list.children[i].tagName, list.children[i].textContent, list.children[i + 1].tagName, list.children[i + 1].textContent]);
        }
        expect(pairs).toEqual([
            ["DT", "Role", "DD", PROFILE.role],
            ["DT", "Experience", "DD", PROFILE.experience],
            ["DT", "Location", "DD", PROFILE.location],
            ["DT", "Main game", "DD", PROFILE.mainGame]
        ]);
    });

    test("optional details are left out when not provided", () => {
        const { container } = renderCard({ location: undefined, mainGame: undefined });
        expect([...container.querySelectorAll("dt")].map((term) => term.textContent)).toEqual(["Role", "Experience"]);
    });

    test("skills render as SkillBadge <li>s directly inside one <ul>", () => {
        renderCard();
        const list = screen.getByRole("list");
        const items = within(list).getAllByRole("listitem");
        expect(items.map((item) => item.parentElement)).toEqual(items.map(() => list));
        expect(items.map((item) => [...item.children].map((span) => span.textContent)))
            .toEqual(PROFILE.skills.map(({ name, level }) => [name, level]));
        expect(items.every((item) => item.className === styles.badge)).toBe(true);
    });

    test("renders without any React warning (skills keyed by s.id)", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            renderCard();
            expect(spy).not.toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });

    test("the rendered card contains zero <div> elements", () => {
        const { container } = renderCard();
        expect(container.querySelector("article").querySelectorAll("div")).toHaveLength(0);
    });

    test("profile text is rendered as text, never as HTML", () => {
        const payload = "<img src=x onerror=\"window.__cardXss = true\">";
        const { container } = renderCard({ name: payload, title: payload, role: payload, avatarUrl: undefined });
        expect(container.querySelectorAll("img")).toHaveLength(0);
        expect(document.getElementById(HEADING_ID).textContent).toBe(payload);
        expect(window.__cardXss).toBeUndefined();
    });
});

describe("DeveloperCard avatar", () => {
    test("is an HTTPS image with explicit 96x96 size and meaningful alt text", () => {
        renderCard();
        const image = screen.getByRole("img", { name: `${PROFILE.name} profile` });
        expect(image.tagName).toBe("IMG");
        expect(new URL(image.getAttribute("src")).protocol).toBe("https:");
        expect(image.getAttribute("width")).toBe(String(AVATAR_SIZE));
        expect(image.getAttribute("height")).toBe(String(AVATAR_SIZE));
    });

    test("falls back to initials when the image fails to load", () => {
        const { container } = renderCard();
        fireEvent.error(container.querySelector("img"));
        expect(container.querySelector("img")).toBeNull();
        const fallback = screen.getByRole("img", { name: `${PROFILE.name} profile` });
        expect(fallback.tagName).toBe("SPAN");
        expect(fallback.textContent).toBe("LT");
    });

    test("a new avatarUrl gets a fresh attempt after an earlier failure", () => {
        const { container, rerender } = renderCard();
        fireEvent.error(container.querySelector("img"));
        const nextUrl = "https://api.dicebear.com/9.x/pixel-art/svg?seed=Other";
        rerender(<DeveloperCard {...PROFILE} avatarUrl={nextUrl} />);
        expect(container.querySelector("img")?.getAttribute("src")).toBe(nextUrl);
    });

    test("shows initials straight away when there is no avatarUrl", () => {
        const { container } = renderCard({ avatarUrl: undefined });
        expect(container.querySelector("img")).toBeNull();
        expect(screen.getByRole("img", { name: `${PROFILE.name} profile` }).textContent).toBe("LT");
    });

    test.each([
        ["Linh Tran", "LT"],
        ["Lư Lê Hướng Giang", "LG"],
        ["  madonna  ", "M"],
        ["Ánh Đặng", "ÁĐ"]
    ])("initialsOf(%j) is %j", (name, expected) => {
        expect(initialsOf(name)).toBe(expected);
    });
});

describe("DeveloperCard props validation", () => {
    test.each([
        ["an http:// avatar", { avatarUrl: "http://example.com/a.png" }, /avatarUrl/],
        ["a relative avatar path", { avatarUrl: "/avatar.png" }, /avatarUrl/],
        ["a javascript: avatar", { avatarUrl: "javascript:alert(1)" }, /avatarUrl/],
        ["a missing name", { name: undefined }, /name/],
        ["a blank title", { title: " " }, /title/],
        ["a numeric experience", { experience: 6 }, /experience/],
        ["an empty location", { location: "" }, /location/],
        ["skills that are not an array", { skills: null }, /skills/],
        ["duplicate skill ids", { skills: [PROFILE.skills[0], PROFILE.skills[0]] }, /duplicate skill id/]
    ])("rejects %s with a TypeError", (_, override, pattern) => {
        expect(() => assertProfile({ ...PROFILE, ...override })).toThrow(TypeError);
        expect(() => DeveloperCard({ ...PROFILE, ...override })).toThrow(pattern);
    });

    test("accepts the sample profile", () => {
        expect(() => assertProfile(PROFILE)).not.toThrow();
    });
});

describe("DeveloperCard source", () => {
    test("contains zero <div> tags", () => {
        expect(SOURCE).not.toMatch(/<div[\s>]/i);
    });

    test("imports no Ant Design or other global stylesheet, only its CSS Module", () => {
        expect(SOURCE).not.toMatch(/antd/);
        const styleImports = SOURCE.match(/import[^;]*["'][^"']+\.(css|less|scss)["']/g) ?? [];
        expect(styleImports).toEqual(['import styles from "./DeveloperCard.module.css"']);
    });

    test("composes skills with key={s.id}", () => {
        expect(SOURCE).toMatch(/skills\.map\(\(s\) => \(\s*<SkillBadge\s+key=\{s\.id\}\s+skill=\{s\}/);
    });
});
