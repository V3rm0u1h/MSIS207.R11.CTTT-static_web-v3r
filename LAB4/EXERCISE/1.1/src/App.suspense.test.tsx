import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { people } from "./data/people";

// Hold the PersonDetail module "on the network" until the test releases it,
// so every step of the lazy-loading workflow can be observed deterministically.
const gate = vi.hoisted(() => {
    let release!: () => void;
    let requested = false;
    const opened = new Promise<void>((resolve) => {
        release = resolve;
    });
    return { opened, release, wasRequested: () => requested, markRequested: () => (requested = true) };
});

vi.mock("./components/PersonDetail", async (importOriginal) => {
    gate.markRequested();
    await gate.opened;
    return importOriginal();
});

const { default: App } = await import("./App");

const region = () => screen.getByRole("region", { name: "Profile" });
const status = () => screen.getByRole("status");
const skeleton = () => document.querySelector(".person-detail--skeleton");

describe("lazy PersonDetail: full loading workflow", () => {
    it("walks request → Suspense → busy skeleton → loaded profile → not busy", async () => {
        const errors = vi.spyOn(console, "error");
        const warnings = vi.spyOn(console, "warn");
        const user = userEvent.setup();
        render(<App />);

        // Idle: persistent region + polite status exist before any loading starts.
        expect(region()).toHaveAttribute("aria-busy", "false");
        expect(status()).toHaveAttribute("aria-live", "polite");
        expect(status()).toHaveTextContent("");
        expect(gate.wasRequested()).toBe(false);

        // 1-2. User selects a person; React requests the lazy module.
        await user.click(screen.getByRole("button", { name: people[0].name }));
        expect(gate.wasRequested()).toBe(true);

        // 3-5. Suspense shows the skeleton; region is busy; status announces once, politely.
        expect(skeleton()).not.toBeNull();
        expect(skeleton()).toHaveAttribute("aria-hidden", "true");
        expect(region()).toHaveAttribute("aria-busy", "true");
        expect(status()).toHaveTextContent("Loading profile…");
        // Status sits outside the busy subtree so the announcement is not deferred.
        expect(region().contains(status())).toBe(false);
        // Navigation stays usable (no blank page) and the skeleton adds no focus stops.
        expect(screen.getByRole("navigation", { name: "People" })).toBeInTheDocument();
        expect(skeleton()!.querySelector("a, button, input, [tabindex]")).toBeNull();
        expect(screen.queryByRole("article")).not.toBeInTheDocument();

        // 6. Module finishes downloading.
        await act(async () => {
            gate.release();
        });

        // 7-9. Skeleton gone, PersonDetail rendered, region no longer busy.
        expect(await screen.findByRole("article", { name: people[0].name })).toBeInTheDocument();
        expect(skeleton()).toBeNull();
        expect(region()).toHaveAttribute("aria-busy", "false");
        expect(status()).toHaveTextContent("Profile loaded.");

        // Cached module: switching people neither re-busies nor re-announces.
        await user.click(screen.getByRole("button", { name: people[1].name }));
        expect(screen.getByRole("article", { name: people[1].name })).toBeInTheDocument();
        expect(skeleton()).toBeNull();
        expect(region()).toHaveAttribute("aria-busy", "false");
        expect(status()).toHaveTextContent("Profile loaded.");

        expect(errors).not.toHaveBeenCalled();
        expect(warnings).not.toHaveBeenCalled();
    });

    it("scopes Suspense to the PersonDetail slot only (no global boundary)", () => {
        const app = readFileSync(join(__dirname, "App.tsx"), "utf8");
        const main = readFileSync(join(__dirname, "main.tsx"), "utf8");
        expect(app).toMatch(/import\s*\{[^}]*\bSuspense\b[^}]*\}\s*from\s*"react"/);
        expect(app.match(/<Suspense\b/g)).toHaveLength(1);
        expect(app).toMatch(/<Suspense fallback=\{<PersonDetailSkeleton \/>\}>\s*<PersonDetail\b[^>]*\/>\s*<\/Suspense>/);
        expect(main).not.toMatch(/Suspense/);
    });
});
