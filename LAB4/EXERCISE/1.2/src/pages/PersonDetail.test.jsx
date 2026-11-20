import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PersonDetail from "./PersonDetail";
import { people } from "../data/people";

function renderDetail(path, data = people, routePath = "/people/:id") {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path={routePath} element={<PersonDetail people={data} />} />
            </Routes>
        </MemoryRouter>
    );
}

const deepFreeze = (records) =>
    Object.freeze(records.map((r) => Object.freeze({ ...r, skills: Object.freeze([...r.skills]) })));

describe("PersonDetail", () => {
    it("renders every field as a <dt>/<dd> pair, label followed by its value", () => {
        const person = people[1];
        const { container } = renderDetail(`/people/${person.id}`);
        const dl = container.querySelector("dl.person-details");
        const pairs = [...dl.children].map((el) => [el.tagName, el.textContent]);
        expect(pairs).toEqual([
            ["DT", "Name"], ["DD", person.name],
            ["DT", "Role"], ["DD", person.role],
            ["DT", "Email"], ["DD", person.email],
            ["DT", "Location"], ["DD", person.location],
            ["DT", "Bio"], ["DD", person.bio],
            ["DT", "Skills"], ["DD", person.skills.join("")]
        ]);
        expect(within(dl.lastElementChild).getAllByRole("listitem").map((li) => li.textContent)).toEqual(person.skills);
        expect(container.querySelectorAll(".person-details p")).toHaveLength(0);
    });

    it("reads a frozen dataset without mutating it", () => {
        const frozen = deepFreeze(people);
        const snapshot = JSON.stringify(frozen);
        renderDetail("/people/p-03", frozen);
        expect(screen.getByRole("article", { name: "Le Thu Ha" })).toBeInTheDocument();
        expect(JSON.stringify(frozen)).toBe(snapshot);
    });

    it("renders NotFoundState when the route supplies no id param at all", () => {
        renderDetail("/people", people, "/people");
        expect(screen.getByRole("heading", { level: 2, name: "Person Not Found" })).toBeInTheDocument();
    });

    it("renders NotFoundState for an empty dataset", () => {
        renderDetail("/people/p-01", []);
        expect(screen.getByRole("heading", { level: 2, name: "Person Not Found" })).toBeInTheDocument();
    });

    it("gets the id from useParams + people.find — no manual URL parsing", () => {
        // Code only: strip comments so documentation can't trigger the guards.
        const source = readFileSync(join(__dirname, "PersonDetail.jsx"), "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
        expect(source).toMatch(/import\s*\{[^}]*\buseParams\b[^}]*\}\s*from\s*"react-router"/);
        expect(source).toMatch(/const \{ id \} = useParams\(\);/);
        expect(source).toMatch(/people\.find\(\(p\) => p\.id === id\)/);
        expect(source).toMatch(/if \(!person\) \{\s*return <NotFoundState \/>;/);
        expect(source).not.toMatch(/window\.location|location\.pathname|useLocation|\.split\(|URLSearchParams|decodeURI/);
        expect(source).not.toMatch(/from "\.\.\/data\/people"/); // dataset is injected by App, not re-imported
    });
});
