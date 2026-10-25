import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import SOURCE from "./ScientistDirectory.jsx?raw";
import ScientistDirectory from "./ScientistDirectory.jsx";
import { SMART_PEOPLE } from "../smartPeople.js";

// T-02B — Interactive search & derived pipeline.

const BY_IQ = [
    "Johann Goethe", "Albert Einstein", "William Sidis", "Isaac Newton",
    "James Maxwell", "Leonardo da Vinci", "Lữ Lê Hương Giang"
];
const BY_AGE = [
    "Lữ Lê Hương Giang", "William Sidis", "James Maxwell", "Leonardo da Vinci",
    "Albert Einstein", "Johann Goethe", "Isaac Newton"
];

/** Names in the order they are displayed. */
function shownNames() {
    return within(screen.getByRole("list"))
        .queryAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent);
}

const search = () => screen.getByLabelText("Search by name");
const minIq = () => screen.getByLabelText("Minimum IQ");
const sortBy = () => screen.getByLabelText("Sort by");

afterEach(cleanup);

describe("ScientistDirectory", () => {
    test("shows every person, sorted by IQ from highest to lowest by default", () => {
        render(<ScientistDirectory />);
        expect(shownNames()).toEqual(BY_IQ);
        expect(sortBy().value).toBe("iq");
    });

    test("each record shows its age and IQ", () => {
        render(<ScientistDirectory />);
        const item = screen.getByRole("heading", { name: "Albert Einstein" }).closest("li");
        const terms = [...item.querySelectorAll("dt, dd")].map((node) => node.textContent);
        expect(terms).toEqual(["Age", "76", "IQ", "205"]);
    });

    test("search is case-insensitive and ignores surrounding spaces", () => {
        render(<ScientistDirectory />);
        fireEvent.change(search(), { target: { value: "  EINSTEIN " } });
        expect(shownNames()).toEqual(["Albert Einstein"]);
        fireEvent.change(search(), { target: { value: "is" } });
        expect(shownNames()).toEqual(["William Sidis", "Isaac Newton"]);
    });

    test("search matches non-ASCII names", () => {
        render(<ScientistDirectory />);
        fireEvent.change(search(), { target: { value: "hương" } });
        expect(shownNames()).toEqual(["Lữ Lê Hương Giang"]);
    });

    test("minimum IQ filters numerically and is inclusive", () => {
        render(<ScientistDirectory />);
        fireEvent.change(minIq(), { target: { value: "190" } });
        expect(shownNames()).toEqual(BY_IQ.slice(0, 5));
        // Numeric, not lexicographic: "1000" < "134" as strings, but nobody has IQ >= 1000.
        fireEvent.change(minIq(), { target: { value: "1000" } });
        expect(shownNames()).toEqual([]);
    });

    test("clearing the minimum IQ falls back to 0 and keeps the state numeric", () => {
        render(<ScientistDirectory />);
        fireEvent.change(minIq(), { target: { value: "200" } });
        fireEvent.change(minIq(), { target: { value: "" } });
        expect(minIq().value).toBe("0");
        expect(shownNames()).toEqual(BY_IQ);
    });

    test("sorts by age from youngest to oldest when selected", () => {
        render(<ScientistDirectory />);
        fireEvent.change(sortBy(), { target: { value: "age" } });
        expect(shownNames()).toEqual(BY_AGE);
        fireEvent.change(sortBy(), { target: { value: "iq" } });
        expect(shownNames()).toEqual(BY_IQ);
    });

    test("search, minimum IQ and sort combine in one pipeline", () => {
        render(<ScientistDirectory />);
        fireEvent.change(search(), { target: { value: "a" } });
        fireEvent.change(minIq(), { target: { value: "185" } });
        fireEvent.change(sortBy(), { target: { value: "age" } });
        expect(shownNames()).toEqual(["William Sidis", "James Maxwell", "Albert Einstein", "Johann Goethe", "Isaac Newton"]);
    });

    test("sorting never reorders the source dataset", () => {
        const before = SMART_PEOPLE.map((person) => person.id);
        render(<ScientistDirectory />);
        fireEvent.change(sortBy(), { target: { value: "age" } });
        expect(SMART_PEOPLE.map((person) => person.id)).toEqual(before);
    });

    test("every control has its own label wired through htmlFor and a useId() id", () => {
        const { container } = render(<ScientistDirectory />);
        const controls = [search(), minIq(), sortBy()];
        const ids = controls.map((control) => control.id);
        expect(new Set(ids).size).toBe(3);
        for (const control of controls) {
            expect(control.id).not.toBe("");
            expect(container.querySelector(`label[for="${CSS.escape(control.id)}"]`)).not.toBeNull();
        }
        expect(SOURCE).toMatch(/const searchId = useId\(\)/);
    });

    test("two directories on one page get distinct ids", () => {
        const { container } = render(<><ScientistDirectory /><ScientistDirectory /></>);
        const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test("the search form is a named landmark region and does not reload on submit", () => {
        render(<ScientistDirectory />);
        expect(screen.getByRole("region", { name: "Scientist & Pioneer Directory" })).toBeDefined();
        const form = screen.getByRole("search");
        const event = new Event("submit", { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
    });

    test("derives the list during render: toSorted, no useEffect, no derived state, no index keys, no <div>", () => {
        expect(SOURCE).toMatch(/\.toSorted\(/);
        expect(SOURCE).not.toMatch(/useEffect\s*\(|import[^;]*useEffect/);
        expect(SOURCE).not.toMatch(/useState\([^)]*visible/i);
        expect(SOURCE).not.toMatch(/\.sort\(/);
        expect(SOURCE).not.toMatch(/key=\{\s*(index|i)\s*\}/);
        expect(SOURCE).not.toMatch(/<div[\s>]/);
        expect(SOURCE).not.toMatch(/innerHTML|dangerouslySetInnerHTML/);
    });
});

// T-02C — Immutable updates & accessible feedback.

const status = () => screen.getByRole("status");
const deleteButton = (name) => screen.getByRole("button", { name: `Delete ${name}` });
const reset = () => screen.getByRole("button", { name: "Reset" });

describe("ScientistDirectory delete, reset & live status", () => {
    test("each person has a Delete button named after them", () => {
        render(<ScientistDirectory />);
        for (const { name } of SMART_PEOPLE) {
            const button = deleteButton(name);
            expect(button.textContent).toBe("Delete");
            expect(button.type).toBe("button");
            expect(button.closest("li")).toBe(screen.getByRole("heading", { name }).closest("li"));
        }
    });

    test("Delete removes only the selected record, by id", () => {
        render(<ScientistDirectory />);
        fireEvent.click(deleteButton("Albert Einstein"));
        expect(shownNames()).toEqual(BY_IQ.filter((name) => name !== "Albert Einstein"));
        expect(screen.queryByRole("heading", { name: "Albert Einstein" })).toBeNull();
    });

    test("deleting never mutates the original dataset", () => {
        const before = JSON.stringify(SMART_PEOPLE);
        render(<ScientistDirectory />);
        for (const { name } of SMART_PEOPLE) {
            fireEvent.click(deleteButton(name));
        }
        expect(shownNames()).toEqual([]);
        expect(JSON.stringify(SMART_PEOPLE)).toBe(before);
    });

    test("a deleted record stays deleted while filters and sorting change", () => {
        render(<ScientistDirectory />);
        fireEvent.click(deleteButton("Isaac Newton"));
        fireEvent.change(sortBy(), { target: { value: "age" } });
        fireEvent.change(search(), { target: { value: "" } });
        expect(shownNames()).toEqual(BY_AGE.filter((name) => name !== "Isaac Newton"));
    });

    test("Reset restores the deleted profile, all seven records and the default inputs", () => {
        render(<ScientistDirectory />);
        fireEvent.click(deleteButton("Lữ Lê Hương Giang"));
        fireEvent.click(deleteButton("Johann Goethe"));
        fireEvent.change(search(), { target: { value: "james" } });
        fireEvent.change(minIq(), { target: { value: "150" } });
        fireEvent.change(sortBy(), { target: { value: "age" } });
        expect(shownNames()).toEqual(["James Maxwell"]);

        fireEvent.click(reset());

        expect(shownNames()).toEqual(BY_IQ);
        expect(search().value).toBe("");
        expect(minIq().value).toBe("0");
        expect(sortBy().value).toBe("iq");
        expect(status().textContent).toBe("7 people found");
    });

    test("the live status is a polite <output> that counts the visible results", () => {
        render(<ScientistDirectory />);
        const output = status();
        expect(output.tagName).toBe("OUTPUT");
        expect(output.getAttribute("aria-live")).toBe("polite");
        expect(output.textContent).toBe("7 people found");
    });

    test("the counter uses the singular for one result and updates with every input", () => {
        render(<ScientistDirectory />);
        fireEvent.change(search(), { target: { value: "giang" } });
        expect(status().textContent).toBe("1 person found");
        fireEvent.change(search(), { target: { value: "" } });
        fireEvent.change(minIq(), { target: { value: "200" } });
        expect(status().textContent).toBe("3 people found");
        fireEvent.click(deleteButton("William Sidis"));
        expect(status().textContent).toBe("2 people found");
        fireEvent.change(minIq(), { target: { value: "999" } });
        expect(status().textContent).toBe("0 people found");
    });

    test("final verification flow logs no React warnings (e.g. missing keys)", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
            render(<ScientistDirectory />);
            fireEvent.click(deleteButton("Leonardo da Vinci"));
            expect(screen.queryByRole("heading", { name: "Leonardo da Vinci" })).toBeNull();
            fireEvent.change(search(), { target: { value: "a" } });
            fireEvent.change(minIq(), { target: { value: "190" } });
            expect(shownNames()).toEqual(["Johann Goethe", "Albert Einstein", "William Sidis", "Isaac Newton", "James Maxwell"]);
            fireEvent.change(sortBy(), { target: { value: "age" } });
            expect(shownNames()).toEqual(["William Sidis", "James Maxwell", "Albert Einstein", "Johann Goethe", "Isaac Newton"]);
            expect(status().textContent).toBe("5 people found");
            fireEvent.click(reset());
            expect(shownNames()).toEqual(BY_IQ);
            expect(spy).not.toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });

    test("updates people immutably: functional updater, no in-place array mutation", () => {
        expect(SOURCE).toMatch(/setPeople\(\(prev\) =>\s*prev\.filter\(/);
        expect(SOURCE).toMatch(/setPeople\(SMART_PEOPLE\)/);
        expect(SOURCE).not.toMatch(/\.(push|pop|shift|unshift|splice|reverse|fill|copyWithin)\(/);
    });
});
