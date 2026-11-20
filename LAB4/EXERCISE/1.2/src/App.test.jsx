import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import App from "./App";
import { people } from "./data/people";

function LocationProbe() {
    return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderAt(path) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <App />
            <LocationProbe />
        </MemoryRouter>
    );
}

const directoryNav = () => screen.getByRole("navigation", { name: "People directory" });
const navLink = (name) => within(directoryNav()).getByRole("link", { name });
const activeLinks = () => within(directoryNav()).getAllByRole("link").filter((a) => a.classList.contains("active"));

let errors;
let warnings;
beforeEach(() => {
    errors = vi.spyOn(console, "error");
    warnings = vi.spyOn(console, "warn");
});
afterEach(() => {
    // Acceptance: no routing-related (or any) console warnings/errors.
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
    vi.restoreAllMocks();
});

describe("nested /people routes share PeopleLayout", () => {
    it('"/people" renders the layout with the PeopleDirectory index in the Outlet', () => {
        renderAt("/people");
        const main = screen.getByRole("main");
        expect(main).toHaveClass("people-layout");
        expect(within(main).getByRole("complementary")).toContainElement(directoryNav());
        const content = screen.getByRole("region", { name: "Dossier" });
        expect(within(content).getByRole("heading", { level: 2, name: "Directory" })).toBeInTheDocument();
        expect(within(content).queryByRole("article")).not.toBeInTheDocument();
    });

    it('"/people/:id" renders PersonDetail in the same layout\'s Outlet', () => {
        renderAt("/people/p-02");
        const content = screen.getByRole("region", { name: "Dossier" });
        expect(within(content).getByRole("article", { name: "Tran Quoc Bao" })).toBeInTheDocument();
        expect(within(content).queryByRole("heading", { name: "Directory" })).not.toBeInTheDocument();
        expect(directoryNav()).toBeInTheDocument(); // master panel persists
    });

    it('"/" forwards to "/people" (no unmatched-route warning)', () => {
        renderAt("/");
        expect(screen.getByTestId("location")).toHaveTextContent(/^\/people$/);
        expect(screen.getByRole("heading", { level: 2, name: "Directory" })).toBeInTheDocument();
    });
});

describe("NavLink active styling", () => {
    it("builds one link per person from the single people data source, in order", () => {
        renderAt("/people");
        const names = within(directoryNav()).getAllByRole("link").map((a) => a.textContent);
        expect(names).toEqual(["People", ...people.map((p) => p.name)]);
        expect(navLink(people[0].name)).toHaveAttribute("href", `/people/${people[0].id}`);
    });

    it('marks only "People" active on the index route', () => {
        renderAt("/people");
        expect(activeLinks()).toEqual([navLink("People")]);
        expect(navLink("People")).toHaveAttribute("aria-current", "page");
    });

    it("marks only the selected person active on a detail route", () => {
        renderAt("/people/p-03");
        expect(activeLinks()).toEqual([navLink("Le Thu Ha")]);
        expect(navLink("People")).not.toHaveClass("active");
        expect(navLink("People").getAttribute("class")).toBe("");
    });

    it("moves the active class as the user navigates (keeps navigation functional)", async () => {
        const user = userEvent.setup();
        renderAt("/people");
        await user.click(navLink("Tran Quoc Bao"));
        expect(screen.getByTestId("location")).toHaveTextContent("/people/p-02");
        expect(activeLinks()).toEqual([navLink("Tran Quoc Bao")]);
        expect(screen.getByRole("article", { name: "Tran Quoc Bao" })).toBeInTheDocument();

        await user.click(navLink("People"));
        expect(screen.getByTestId("location")).toHaveTextContent(/^\/people$/);
        expect(activeLinks()).toEqual([navLink("People")]);
        expect(screen.getByRole("heading", { level: 2, name: "Directory" })).toBeInTheDocument();
    });
});

describe("source guards", () => {
    const srcDir = __dirname;
    const read = (...parts) => readFileSync(join(srcDir, ...parts), "utf8");
    const sources = (dir) =>
        readdirSync(dir).flatMap((name) => {
            const full = join(dir, name);
            if (statSync(full).isDirectory()) return sources(full);
            return /\.jsx?$/.test(name) && !/\.test\./.test(name) ? [full] : [];
        });
    const app = read("App.jsx");
    const layout = read("layouts", "PeopleLayout.jsx");

    it("uses no legacy v5 router syntax anywhere in src", () => {
        const code = sources(srcDir).map((file) => readFileSync(file, "utf8")).join("\n");
        expect(code).not.toMatch(/<Switch\b|\bSwitch\b.*from/);
        expect(code).not.toMatch(/<Route\b[^>]*\b(component|render|exact)\s*=/);
        expect(code).not.toMatch(/react-router-dom/);
        expect(code).not.toMatch(/\buseHistory\b|\bwithRouter\b|<Redirect\b|activeClassName/);
    });

    it("declares nested routes with <Routes> and JSX element props", () => {
        expect(app).toMatch(/import\s*\{[^}]*\bRoutes\b[^}]*\bRoute\b[^}]*\}\s*from\s*"react-router"/);
        expect(app.match(/<Routes>/g)).toHaveLength(1);
        expect(app.match(/<Route\s/g)).toHaveLength(6);
        expect(app.match(/<Route\s[^{]*\belement=\{<\w+(?:[^{}]|\{\w+\})*\/>\}/g)).toHaveLength(6);
        expect(app).toMatch(
            /<Route path="\/people" element=\{<PeopleLayout \/>\}>\s*<Route index element=\{<PeopleDirectory \/>\} \/>\s*<Route path=":id" element=\{<PersonDetail people=\{people\} \/>\} \/>\s*<Route path="\*" element=\{<NotFoundState \/>\} \/>\s*<\/Route>/
        );
        // The people dataset comes from the single existing data module.
        expect(app).toMatch(/import \{ people \} from "\.\/data\/people";/);
    });

    it("PeopleLayout uses Outlet + NavLink with a functional className and no local active state", () => {
        expect(layout).toMatch(/import\s*\{[^}]*\bNavLink\b[^}]*\bOutlet\b[^}]*\}\s*from\s*"react-router"/);
        expect(layout).toMatch(/<Outlet \/>/);
        expect(layout).toMatch(/\(\{ isActive \}\) => \(isActive \? "active" : ""\)/);
        expect(layout.match(/<NavLink\b[^>]*className=\{navClass\}/g)).toHaveLength(2);
        expect(layout).not.toMatch(/useState|useLocation|useMatch/);
    });

    it("keeps the router provider at the entry point, outside App", () => {
        expect(read("main.jsx")).toMatch(/<BrowserRouter>\s*<App \/>\s*<\/BrowserRouter>/);
        expect(app).not.toMatch(/BrowserRouter|createBrowserRouter|RouterProvider/);
    });

    it("grid is minmax(280px, 1fr) 2fr and stacks at <= 640px", () => {
        const css = read("layouts", "PeopleLayout.css");
        expect(css).toMatch(/\.people-layout\s*\{[^}]*display: grid;[^}]*grid-template-columns: minmax\(280px, 1fr\) 2fr;/);
        expect(css).toMatch(/@media \(max-width: 640px\)\s*\{\s*\.people-layout\s*\{[^}]*grid-template-columns: 1fr;/);
    });

    it("installs React Router v7", () => {
        const pkg = JSON.parse(readFileSync(join(srcDir, "..", "node_modules", "react-router", "package.json"), "utf8"));
        expect(pkg.version).toMatch(/^7\./);
    });
});
