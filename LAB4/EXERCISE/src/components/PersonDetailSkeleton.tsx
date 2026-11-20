import type { CSSProperties } from "react";
import "./personDetailLayout.css";

const width = (value: string) => ({ "--sk-width": value }) as CSSProperties;

/**
 * Suspense fallback for the lazy PersonDetail. It mirrors PersonDetail's rows
 * (header, facts, bio, skills) with the same shared layout classes, so the box
 * it reserves is the box the real profile fills: no layout shift on swap.
 * Placeholders are hidden from assistive tech; a single status message speaks.
 */
export default function PersonDetailSkeleton() {
    return (
        <section className="person-detail person-detail--skeleton" role="status" aria-busy="true">
            <span className="visually-hidden">Loading profile…</span>
            <header className="pd-header" aria-hidden="true">
                <span className="sk sk-name" />
                <span className="sk sk-line" style={width("35%")} />
            </header>
            <span className="pd-facts" aria-hidden="true">
                <span className="sk sk-line" style={width("70%")} />
                <span className="sk sk-line" style={width("60%")} />
                <span className="sk sk-line" style={width("70%")} />
                <span className="sk sk-line" style={width("40%")} />
            </span>
            <span className="pd-bio" aria-hidden="true">
                <span className="sk sk-line" />
                <span className="sk sk-line" style={width("85%")} />
            </span>
            <span className="pd-skills" aria-hidden="true">
                <span className="sk sk-line" style={width("4rem")} />
                <span className="pd-chips">
                    <span className="sk sk-chip" style={width("4.5rem")} />
                    <span className="sk sk-chip" style={width("6rem")} />
                    <span className="sk sk-chip" style={width("7rem")} />
                </span>
            </span>
        </section>
    );
}
