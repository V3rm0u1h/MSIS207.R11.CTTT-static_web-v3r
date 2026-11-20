import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PersonDetailSkeleton from "./PersonDetailSkeleton";
import PersonDetail from "./PersonDetail";
import { people } from "../data/people";

const rowClasses = (root: Element) => [...root.children].map((child) => child.classList[0]).filter((c) => c !== "visually-hidden");

describe("PersonDetailSkeleton", () => {
    it("announces one loading status and hides every placeholder from assistive tech", () => {
        const { container } = render(<PersonDetailSkeleton />);
        const status = screen.getByRole("status");
        expect(status).toHaveTextContent("Loading profile…");
        expect(status).toHaveAttribute("aria-busy", "true");
        const placeholders = container.querySelectorAll(".sk");
        expect(placeholders.length).toBeGreaterThan(0);
        placeholders.forEach((bar) => expect(bar.closest("[aria-hidden='true']")).not.toBeNull());
    });

    it("mirrors PersonDetail's row structure with the same layout classes", () => {
        const { container: skeleton } = render(<PersonDetailSkeleton />);
        const { container: detail } = render(<PersonDetail person={people[0]} />);
        const skeletonRoot = skeleton.firstElementChild!;
        const detailRoot = detail.firstElementChild!;
        expect(skeletonRoot).toHaveClass("person-detail");
        expect(detailRoot).toHaveClass("person-detail");
        expect(rowClasses(skeletonRoot)).toEqual(rowClasses(detailRoot));
        expect(rowClasses(detailRoot)).toEqual(["pd-header", "pd-facts", "pd-bio", "pd-skills"]);
    });

    it("uses no images and no JavaScript timers (animation is pure CSS)", () => {
        const { container } = render(<PersonDetailSkeleton />);
        expect(container.querySelector("img, svg, canvas")).toBeNull();
        const source = readFileSync(join(__dirname, "PersonDetailSkeleton.tsx"), "utf8");
        expect(source).not.toMatch(/setInterval|setTimeout|requestAnimationFrame/);
        const css = readFileSync(join(__dirname, "personDetailLayout.css"), "utf8");
        expect(css).toMatch(/@keyframes pd-pulse/);
        expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.sk::after\s*\{\s*animation: none;/);
    });
});
