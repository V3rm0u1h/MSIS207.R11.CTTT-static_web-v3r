import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function watchConsole(page) {
    const problems = [];
    page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") problems.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    return problems;
}

const field = (page, label) => page.getByLabel(new RegExp(`^${label}`));

async function fillValid(page, fullName) {
    await field(page, "Full name").fill(fullName);
    await field(page, "Email").fill("minh.anh@example.com");
    await field(page, "Age").fill("27");
    await field(page, "Password").fill("secret123");
    await field(page, "Confirm password").fill("secret123");
}

const noHorizontalOverflow = (page) =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
    test.describe(`${viewport.width}px`, () => {
        test.use({ viewport });

        test("valid submit shows readable monospace JSON; invalid submit keeps it", async ({ page }) => {
            const problems = watchConsole(page);
            await page.goto("/");
            await expect(page.getByRole("region", { name: "Submitted Form Data" })).toHaveCount(0);

            await page.getByRole("button", { name: "Submit" }).click();
            await expect(page.getByRole("region", { name: "Submitted Form Data" })).toHaveCount(0);

            await fillValid(page, "Nguyen Minh Anh");
            await page.getByRole("button", { name: "Submit" }).click();
            const inspector = page.getByRole("region", { name: "Submitted Form Data" });
            await expect(inspector).toBeVisible();
            const pre = inspector.locator("pre");
            expect(JSON.parse(await pre.textContent()).fullName).toBe("Nguyen Minh Anh");
            expect(await pre.textContent()).toContain('\n  "email": "minh.anh@example.com"'); // 2-space indentation
            expect(await pre.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/mono|Consolas/i);
            expect(await pre.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("pre-wrap");

            await field(page, "Email").fill("broken");
            await page.getByRole("button", { name: "Submit" }).click();
            await expect(field(page, "Email")).toHaveAttribute("aria-invalid", "true");
            expect(JSON.parse(await pre.textContent()).email).toBe("minh.anh@example.com");

            expect(await noHorizontalOverflow(page)).toBe(true);
            expect(problems).toEqual([]);
        });

        test("very long unbroken values wrap inside the inspector instead of breaking the page", async ({ page }) => {
            const problems = watchConsole(page);
            await page.goto("/");
            await fillValid(page, "A".repeat(400));
            await page.getByRole("button", { name: "Submit" }).click();
            const inspector = page.getByRole("region", { name: "Submitted Form Data" });
            await expect(inspector).toBeVisible();

            const section = await inspector.boundingBox();
            const pre = await inspector.locator("pre").boundingBox();
            expect(pre.x + pre.width).toBeLessThanOrEqual(section.x + section.width + 0.5);
            expect(await inspector.locator("pre").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
            expect(await noHorizontalOverflow(page)).toBe(true);
            expect(problems).toEqual([]);
        });
    });
}

for (const colorScheme of ["light", "dark"]) {
    test(`no axe violations (incl. contrast) with errors and inspector shown, ${colorScheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto("/");
        await fillValid(page, "Nguyen Minh Anh");
        await page.getByRole("button", { name: "Submit" }).click();
        await field(page, "Email").fill("broken"); // also show an inline error
        await expect(page.getByRole("region", { name: "Submitted Form Data" })).toBeVisible();
        const scan = await new AxeBuilder({ page }).analyze();
        expect(scan.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
    });
}
