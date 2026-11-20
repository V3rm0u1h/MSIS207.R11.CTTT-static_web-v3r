import { render, screen, within } from "@testing-library/react";
import PersonDetail from "./PersonDetail";
import LazyPersonDetail from "./LazyPersonDetail";
import { people } from "../data/people";

const person = people[0];

describe("PersonDetail (eager module)", () => {
    it("is a default-exported function component", () => {
        expect(typeof PersonDetail).toBe("function");
    });

    it("renders the full profile", () => {
        render(<PersonDetail person={person} />);
        const article = screen.getByRole("article", { name: person.name });
        expect(within(article).getByText(person.role)).toBeInTheDocument();
        expect(within(article).getByRole("link", { name: person.email })).toHaveAttribute("href", `mailto:${person.email}`);
        expect(within(article).getByText(person.location)).toBeInTheDocument();
        expect(within(article).getByText(person.bio)).toBeInTheDocument();
        const skills = within(within(article).getByRole("region", { name: "Skills" })).getAllByRole("listitem");
        expect(skills.map((li) => li.textContent)).toEqual(person.skills);
    });
});

describe("LazyPersonDetail (React.lazy wrapper)", () => {
    it("is a React.lazy component, not the eager component", () => {
        const lazyType = LazyPersonDetail as unknown as { $$typeof: symbol };
        expect(lazyType.$$typeof).toBe(Symbol.for("react.lazy"));
        expect(LazyPersonDetail).not.toBe(PersonDetail);
    });

    it("resolves to the same PersonDetail behaviour once its chunk loads", async () => {
        render(<LazyPersonDetail person={person} />);
        expect(await screen.findByRole("article", { name: person.name })).toBeInTheDocument();
    });
});
