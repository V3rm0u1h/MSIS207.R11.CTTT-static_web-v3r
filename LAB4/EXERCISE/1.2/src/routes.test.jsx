import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
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

const content = () => screen.getByRole("region", { name: "Dossier" });
const directoryNav = () => screen.getByRole("navigation", { name: "People directory" });
const activeLinks = () => within(directoryNav()).getAllByRole("link").filter((a) => a.classList.contains("active"));

function expectNotFound() {
    const section = within(content()).getByRole("region", { name: "Person Not Found" });
    expect(section).toHaveClass("not-found");
    expect(within(section).getByText("The requested person could not be found.")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "Return to Directory" })).toHaveAttribute("href", "/people");
    expect(within(content()).queryByRole("article")).not.toBeInTheDocument();
    // Shared layout and directory navigation stay available.
    expect(screen.getByRole("heading", { level: 1, name: "Case Dossier Directory" })).toBeInTheDocument();
    expect(within(directoryNav()).getAllByRole("link")).toHaveLength(people.length + 1);
    // Never leak raw values.
    expect(document.body.textContent).not.toMatch(/undefined|null|NaN|\[object/);
}

let errors;
let warnings;
beforeEach(() => {
    errors = vi.spyOn(console, "error");
    warnings = vi.spyOn(console, "warn");
});
afterEach(() => {
    // DevTools checkpoint: no React / React Router warnings, no errors, no key warnings.
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
    vi.restoreAllMocks();
});

describe("PRD 04 route validation table", () => {
    it("/people → directory index", () => {
        renderAt("/people");
        expect(within(content()).getByRole("heading", { level: 2, name: "Directory" })).toBeInTheDocument();
    });

    it.each(people.map((p) => [p.id, p]))("/people/%s → that person's detail", (id, person) => {
        renderAt(`/people/${id}`);
        const article = within(content()).getByRole("article", { name: person.name });
        expect(article.querySelector("dl.person-details")).not.toBeNull();
        expect(within(article).getByRole("link", { name: person.email })).toHaveAttribute("href", `mailto:${person.email}`);
        expect(activeLinks().map((a) => a.textContent)).toEqual([person.name]);
    });

    it.each(["invalid-id", "nonexistent"])("/people/%s → Person Not Found", (id) => {
        renderAt(`/people/${id}`);
        expectNotFound();
        expect(activeLinks()).toEqual([]); // no person falsely highlighted
    });
});

describe("malformed or unexpected route parameters", () => {
    it("malformed percent-encoding (%E0%A4%A) → Person Not Found, no crash", () => {
        renderAt("/people/%E0%A4%A");
        expectNotFound();
        // React Router itself (not app code) reports the undecodable segment once;
        // it then matches the raw segment, which our exact lookup safely rejects.
        // Allow exactly that router message and nothing else.
        expect(warnings).toHaveBeenCalledTimes(1);
        expect(warnings.mock.calls[0][0]).toMatch(/^The URL path "\/people\/%E0%A4%A" could not be decoded because it is a malformed URL segment/);
        warnings.mockClear();
    });

    it.each([
        ["prototype key", "__proto__"],
        ["inherited method name", "toString"],
        ["constructor", "constructor"],
        ["wrong case", "P-01"],
        ["leading space", "%20p-01"],
        ["trailing space", "p-01%20"],
        ["markup", "%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E"],
        ["numeric", "1"]
    ])("%s (%s) → Person Not Found, no crash", (_label, segment) => {
        renderAt(`/people/${segment}`);
        expectNotFound();
        expect(document.querySelector("img")).toBeNull();
    });

    it("percent-encoded valid id is decoded by the router and resolves consistently", () => {
        renderAt("/people/p%2D01");
        expect(within(content()).getByRole("article", { name: people[0].name })).toBeInTheDocument();
    });

    it("extra path segments under /people → Person Not Found inside the layout", () => {
        renderAt("/people/p-01/extra");
        expectNotFound();
    });

    it("unknown top-level paths forward to /people (no unmatched-route warning)", () => {
        renderAt("/nope/deeper");
        expect(screen.getByTestId("location")).toHaveTextContent(/^\/people$/);
        expect(within(content()).getByRole("heading", { level: 2, name: "Directory" })).toBeInTheDocument();
    });
});

describe("navigation from the Not Found state", () => {
    it('"Return to Directory" goes back to the index, then a person link opens a valid dossier', async () => {
        const user = userEvent.setup();
        renderAt("/people/nonexistent");
        await user.click(screen.getByRole("link", { name: "Return to Directory" }));
        expect(screen.getByTestId("location")).toHaveTextContent(/^\/people$/);
        expect(within(content()).getByRole("heading", { level: 2, name: "Directory" })).toBeInTheDocument();

        await user.click(within(directoryNav()).getByRole("link", { name: "Le Thu Ha" }));
        expect(within(content()).getByRole("article", { name: "Le Thu Ha" })).toBeInTheDocument();
    });
});
