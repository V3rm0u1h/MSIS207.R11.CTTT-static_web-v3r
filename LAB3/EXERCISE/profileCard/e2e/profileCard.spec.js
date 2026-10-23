import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { longProfile, sampleProfile } from "../src/sampleProfile.js";

// T-01D — quality assurance in a real browser at a 375px viewport.

const AVATAR_PATTERN = "https://api.dicebear.com/**";
const BROKEN_PATTERN = "https://example.invalid/**";
const AVATAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#3ee08f"/></svg>';
const SCREENSHOT_DIR = "images";

const SCENARIOS = [
    { label: "sample profile", path: "/", profile: sampleProfile, broken: false },
    { label: "sample profile, broken avatar", path: "/?avatar=broken", profile: sampleProfile, broken: true },
    { label: "long profile", path: "/?profile=long", profile: longProfile, broken: false },
    { label: "long profile, broken avatar", path: "/?profile=long&avatar=broken", profile: longProfile, broken: true }
];

/**
 * Serves avatars locally (no network flakiness), fails the broken URL, and
 * records console problems and layout shifts for every page.
 */
async function preparePage(page, { holdAvatar = false } = {}) {
    const problems = [];
    page.on("console", (message) => {
        if (message.type() !== "error" && message.type() !== "warning") return;
        // The browser itself always logs a failed image request. For the
        // deliberately broken avatar that is the expected outcome, not an app error.
        const expectedFailure = message.text().startsWith("Failed to load resource")
            && message.location().url.startsWith(BROKEN_PATTERN.replace("**", ""));
        if (!expectedFailure) problems.push(`${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

    let releaseAvatar = () => {};
    const avatarHeld = new Promise((resolve) => { releaseAvatar = resolve; });
    await page.route(AVATAR_PATTERN, async (route) => {
        if (holdAvatar) await avatarHeld;
        await route.fulfill({ contentType: "image/svg+xml", body: AVATAR_SVG });
    });
    await page.route(BROKEN_PATTERN, (route) => route.abort("namenotresolved"));

    await page.addInitScript(() => {
        window.__layoutShift = 0;
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__layoutShift += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
    });
    return { problems, releaseAvatar };
}

const layoutShift = (page) => page.evaluate(() => window.__layoutShift);

/** Element boxes that stick out of the card, and the page's horizontal overflow. */
function measureOverflow(page) {
    return page.evaluate(() => {
        const card = document.querySelector("article").getBoundingClientRect();
        const outside = [...document.querySelectorAll("article *")]
            .map((element) => ({ element, box: element.getBoundingClientRect() }))
            .filter(({ box }) => box.left < card.left - 0.5 || box.right > card.right + 0.5)
            .map(({ element }) => `${element.tagName.toLowerCase()} "${element.textContent.slice(0, 30)}"`);
        return {
            pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            cardRight: card.right,
            outside
        };
    });
}

for (const scenario of SCENARIOS) {
    test.describe(`375px: ${scenario.label}`, () => {
        test("fits without horizontal overflow, renders fully, logs nothing", async ({ page }) => {
            const { problems } = await preparePage(page);
            await page.goto(scenario.path);
            const card = page.getByRole("article", { name: scenario.profile.name });
            await expect(card).toBeVisible();
            await expect(card.getByRole("img", { name: `${scenario.profile.name} profile` })).toBeVisible();

            const { pageOverflow, cardRight, outside } = await measureOverflow(page);
            expect(pageOverflow, "page scrolls horizontally").toBe(0);
            expect(cardRight).toBeLessThanOrEqual(375);
            expect(outside, "elements sticking out of the card").toEqual([]);

            // Every skill badge, with its name and level.
            const items = card.getByRole("list").getByRole("listitem");
            await expect(items).toHaveText(scenario.profile.skills.map(({ name, level }) => `${name}${level}`));

            expect(await card.locator("div").count(), "<div> elements in the card").toBe(0);
            expect(problems, "console errors / warnings (incl. React key warnings)").toEqual([]);

            mkdirSync(SCREENSHOT_DIR, { recursive: true });
            const slug = scenario.label.replace(/\W+/g, "-");
            await page.screenshot({ path: `${SCREENSHOT_DIR}/t01d-375-${slug}.png`, fullPage: true });
        });

        test("passes the axe WCAG 2.1 A/AA audit (incl. colour contrast)", async ({ page }) => {
            await preparePage(page);
            await page.goto(scenario.path);
            await expect(page.getByRole("article")).toBeVisible();
            const { violations } = await new AxeBuilder({ page })
                .include("article")
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .analyze();
            expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target).join(", ")}`)).toEqual([]);
        });
    });
}

test.describe("375px accessibility contract", () => {
    test("article is named by the heading its aria-labelledby points to", async ({ page }) => {
        await preparePage(page);
        await page.goto("/");
        const article = page.locator("article");
        const headingId = await article.getAttribute("aria-labelledby");
        expect(headingId).toBe("dev-heading");
        const heading = page.locator(`#${headingId}`);
        await expect(heading).toHaveText(sampleProfile.name);
        await expect(page.getByRole("heading", { level: 2, name: sampleProfile.name })).toHaveAttribute("id", headingId);
        await expect(page.getByRole("article", { name: sampleProfile.name })).toHaveCount(1);
    });

    test("accessibility tree: named article, avatar, heading, details and a 4-item skill list", async ({ page }) => {
        await preparePage(page);
        await page.goto("/");
        await expect(page.getByRole("article")).toMatchAriaSnapshot(`
            - article "Linh Tran":
              - img "Linh Tran profile"
              - heading "Linh Tran" [level=2]
              - paragraph: Semantic Engineer & Pro-Gamer
              - term: Role
              - definition: Front-end Engineer
              - term: Experience
              - definition: 6 years
              - term: Location
              - definition: Ho Chi Minh City, Vietnam
              - term: Main game
              - definition: Valorant (Immortal 2)
              - region "Skills":
                - heading "Skills" [level=3]
                - list:
                  - listitem: React Advanced
                  - listitem: Accessibility Advanced
                  - listitem: CSS Intermediate
                  - listitem: Node.js Intermediate
        `);
    });

    test("metadata reads in label, value order", async ({ page }) => {
        await preparePage(page);
        await page.goto("/");
        const children = await page.locator("dl > *").evaluateAll((elements) =>
            elements.map((element) => `${element.tagName.toLowerCase()}:${element.textContent}`));
        expect(children).toEqual([
            "dt:Role", `dd:${sampleProfile.role}`,
            "dt:Experience", `dd:${sampleProfile.experience}`,
            "dt:Location", `dd:${sampleProfile.location}`,
            "dt:Main game", `dd:${sampleProfile.mainGame}`
        ]);
    });

    test("skill list markup is valid: the <ul> holds only <li>s", async ({ page }) => {
        await preparePage(page);
        await page.goto("/?profile=long");
        const tags = await page.locator("article ul > *").evaluateAll((elements) => elements.map((element) => element.tagName));
        expect(tags).toEqual(longProfile.skills.map(() => "LI"));
        expect(await page.locator("article li").evaluateAll((items) => items.every((item) => item.parentElement.tagName === "UL"))).toBe(true);
    });

    test("the card has no focus stops; a control added to it is reachable by Tab and gets the focus ring", async ({ page }) => {
        await preparePage(page);
        await page.goto("/");
        const focusable = "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";
        expect(await page.locator(`article :is(${focusable})`).count()).toBe(0);

        // The ring belongs to the card's stylesheet, so prove it on a real control.
        await page.locator("article dl").evaluate((list) => {
            const link = document.createElement("a");
            link.href = "#profile";
            link.textContent = "Profile link";
            list.after(link);
        });
        await page.keyboard.press("Tab");
        const ring = await page.evaluate(() => {
            const style = getComputedStyle(document.activeElement);
            return { focused: document.activeElement.textContent, style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
        });
        expect(ring).toEqual({ focused: "Profile link", style: "solid", width: "3px", color: "rgb(62, 224, 143)" });
    });

    test("headings and avatar stay readable at 375px", async ({ page }) => {
        await preparePage(page);
        await page.goto("/?profile=long");
        const sizes = await page.evaluate(() => ({
            name: parseFloat(getComputedStyle(document.querySelector("h2")).fontSize),
            body: parseFloat(getComputedStyle(document.querySelector("dd")).fontSize),
            avatar: document.querySelector("article img").getBoundingClientRect().width
        }));
        expect(sizes.name).toBeGreaterThanOrEqual(20);
        expect(sizes.body).toBeGreaterThanOrEqual(14);
        expect(sizes.avatar).toBe(96);
    });
});

test.describe("375px avatar security and stability", () => {
    test("the avatar is HTTPS with explicit 96x96 dimensions", async ({ page }) => {
        await preparePage(page);
        await page.goto("/");
        const image = page.getByRole("img", { name: `${sampleProfile.name} profile` });
        expect(new URL(await image.getAttribute("src")).protocol).toBe("https:");
        await expect(image).toHaveAttribute("width", "96");
        await expect(image).toHaveAttribute("height", "96");
        expect(await image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
    });

    test("space is reserved while the image loads: no layout shift when it arrives", async ({ page }) => {
        const { releaseAvatar } = await preparePage(page, { holdAvatar: true });
        await page.goto("/");
        const image = page.locator("article img");
        const before = await page.evaluate(() => ({
            image: document.querySelector("article img").getBoundingClientRect().toJSON(),
            heading: document.querySelector("h2").getBoundingClientRect().toJSON(),
            loaded: document.querySelector("article img").complete
        }));
        expect(before.loaded, "image should still be loading").toBe(false);
        expect([before.image.width, before.image.height]).toEqual([96, 96]);

        releaseAvatar();
        await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
        const headingAfter = await page.evaluate(() => document.querySelector("h2").getBoundingClientRect().toJSON());
        expect(headingAfter).toEqual(before.heading);
        expect(await layoutShift(page)).toBe(0);
    });

    test("a failing avatar becomes the initials in the same 96x96 box, without layout shift", async ({ page }) => {
        await preparePage(page);
        await page.goto("/?avatar=broken");
        const fallback = page.getByRole("img", { name: `${sampleProfile.name} profile` });
        await expect(fallback).toHaveText("LT");
        expect(await page.locator("article img").count()).toBe(0);
        const box = await fallback.boundingBox();
        expect([box.width, box.height]).toEqual([96, 96]);
        expect(await layoutShift(page)).toBe(0);
    });

    test("profile strings that look like HTML are shown as text", async ({ page }) => {
        await preparePage(page);
        await page.goto("/?profile=long");
        await expect(page.locator("dd").first()).toHaveText(longProfile.role);
        expect(await page.locator("article b").count()).toBe(0);
    });
});
