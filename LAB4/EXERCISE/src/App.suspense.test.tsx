import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { people } from "./data/people";

// Hold the PersonDetail module "on the network" until the test releases it,
// so the Suspense fallback can be observed deterministically.
const gate = vi.hoisted(() => {
    let release!: () => void;
    const opened = new Promise<void>((resolve) => {
        release = resolve;
    });
    return { opened, release };
});

vi.mock("./components/PersonDetail", async (importOriginal) => {
    await gate.opened;
    return importOriginal();
});

const { default: App } = await import("./App");

describe("Suspense boundary around lazy PersonDetail", () => {
    it("shows the fallback while loading, then swaps it for PersonDetail", async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByRole("button", { name: people[0].name }));

        // Loading: fallback visible, navigation still on screen (no blank page).
        expect(screen.getByRole("status")).toHaveTextContent(/loading profile/i);
        expect(screen.getByRole("status")).toHaveClass("person-detail--skeleton");
        expect(screen.getByRole("heading", { level: 1, name: "People Directory" })).toBeInTheDocument();
        expect(screen.getByRole("navigation", { name: "People" })).toBeInTheDocument();
        expect(screen.queryByRole("article", { name: people[0].name })).not.toBeInTheDocument();

        await act(async () => {
            gate.release();
        });

        expect(await screen.findByRole("article", { name: people[0].name })).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();

        // Chunk is cached now: switching people renders immediately, no fallback.
        await user.click(screen.getByRole("button", { name: people[1].name }));
        expect(screen.getByRole("article", { name: people[1].name })).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("scopes Suspense to the PersonDetail slot only (no global boundary)", () => {
        const app = readFileSync(join(__dirname, "App.tsx"), "utf8");
        const main = readFileSync(join(__dirname, "main.tsx"), "utf8");
        expect(app).toMatch(/import\s*\{[^}]*\bSuspense\b[^}]*\}\s*from\s*"react"/);
        expect(app.match(/<Suspense\b/g)).toHaveLength(1);
        expect(app).toMatch(/<Suspense\b[\s\S]*?<PersonDetail\b[\s\S]*?<\/Suspense>/);
        expect(main).not.toMatch(/Suspense/);
    });
});
