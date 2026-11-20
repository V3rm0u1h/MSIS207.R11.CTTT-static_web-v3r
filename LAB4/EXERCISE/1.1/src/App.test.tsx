import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import App from "./App";
import { people } from "./data/people";

describe("App", () => {
    it("starts without rendering any PersonDetail", () => {
        render(<App />);
        expect(screen.getByText("Select a person to view their profile.")).toBeInTheDocument();
        expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });

    it("loads PersonDetail on demand when a person is selected", async () => {
        const user = userEvent.setup();
        render(<App />);
        await user.click(screen.getByRole("button", { name: people[1].name }));
        expect(await screen.findByRole("article", { name: people[1].name })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: people[1].name })).toHaveAttribute("aria-pressed", "true");

        await user.click(screen.getByRole("button", { name: people[2].name }));
        expect(await screen.findByRole("article", { name: people[2].name })).toBeInTheDocument();
    });
});

describe("code-splitting guard", () => {
    const srcDir = join(__dirname);
    const sourceFiles = (dir: string): string[] =>
        readdirSync(dir).flatMap((name) => {
            const full = join(dir, name);
            if (statSync(full).isDirectory()) return sourceFiles(full);
            return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
        });

    it("only LazyPersonDetail references the PersonDetail module, and only via dynamic import()", () => {
        const referencing = sourceFiles(srcDir).filter((file) =>
            /["']\.{1,2}\/(components\/)?PersonDetail["']/.test(readFileSync(file, "utf8"))
        );
        expect(referencing.map((file) => relative(srcDir, file).split(sep).join("/"))).toEqual([
            "components/LazyPersonDetail.tsx"
        ]);
        const lazySource = readFileSync(join(srcDir, "components/LazyPersonDetail.tsx"), "utf8");
        expect(lazySource).toMatch(/lazy\(\s*\(\)\s*=>\s*import\(\s*["']\.\/PersonDetail["']\s*\)\s*\)/);
        expect(lazySource).not.toMatch(/^\s*import\s+\w+\s+from\s+["']\.\/PersonDetail["']/m);
    });
});
