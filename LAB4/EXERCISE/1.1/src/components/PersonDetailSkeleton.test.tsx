import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PersonDetailSkeleton from "./PersonDetailSkeleton";
import PersonDetail from "./PersonDetail";
import { LoadingRegion } from "./LoadingRegion";
import { people } from "../data/people";

const rowClasses = (root: Element) => [...root.children].map((child) => child.classList[0]);

describe("PersonDetailSkeleton", () => {
    it("is decorative: hidden from assistive tech, nothing focusable, no own live region", () => {
        const { container } = render(<PersonDetailSkeleton />);
        const root = container.firstElementChild!;
        expect(root).toHaveAttribute("aria-hidden", "true");
        expect(root.querySelector("a, button, input, [tabindex]")).toBeNull();
        expect(root.querySelector("[role], [aria-live]")).toBeNull();
        expect(root).not.toHaveAttribute("role");
        expect(root).not.toHaveAttribute("aria-live");
    });

    it("marks the enclosing LoadingRegion busy while mounted, ready when unmounted", () => {
        const { rerender } = render(
            <LoadingRegion label="Profile">
                <PersonDetailSkeleton />
            </LoadingRegion>
        );
        expect(screen.getByRole("region", { name: "Profile" })).toHaveAttribute("aria-busy", "true");
        expect(screen.getByRole("status")).toHaveTextContent("Loading profile…");

        rerender(
            <LoadingRegion label="Profile">
                <PersonDetail person={people[0]} />
            </LoadingRegion>
        );
        expect(screen.getByRole("region", { name: "Profile" })).toHaveAttribute("aria-busy", "false");
        expect(screen.getByRole("status")).toHaveTextContent("Profile loaded.");
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
