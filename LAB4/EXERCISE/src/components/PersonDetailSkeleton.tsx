import type { CSSProperties } from "react";
import { useReportLoading } from "./LoadingRegion";
import "./personDetailLayout.css";

const width = (value: string) => ({ "--sk-width": value }) as CSSProperties;

/**
 * Suspense fallback for the lazy PersonDetail. It mirrors PersonDetail's rows
 * (header, facts, bio, skills) with the same shared layout classes, so the box
 * it reserves is the box the real profile fills: no layout shift on swap.
 *
 * Purely decorative: the whole skeleton is hidden from assistive tech and
 * contains nothing focusable. The loading state is communicated by the
 * enclosing LoadingRegion (aria-busy + polite status), which it notifies.
 */
export default function PersonDetailSkeleton() {
    useReportLoading();
    return (
        <section className="person-detail person-detail--skeleton" aria-hidden="true">
            <header className="pd-header">
                <span className="sk sk-name" />
                <span className="sk sk-line" style={width("35%")} />
            </header>
            <span className="pd-facts">
                <span className="sk sk-line" style={width("70%")} />
                <span className="sk sk-line" style={width("60%")} />
                <span className="sk sk-line" style={width("70%")} />
                <span className="sk sk-line" style={width("40%")} />
            </span>
            <span className="pd-bio">
                <span className="sk sk-line" />
                <span className="sk sk-line" style={width("85%")} />
            </span>
            <span className="pd-skills">
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
