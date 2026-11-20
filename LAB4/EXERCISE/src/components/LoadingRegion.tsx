import { createContext, useCallback, useContext, useLayoutEffect, useState, type ReactNode } from "react";

type ReportLoading = (loading: boolean) => void;

const LoadingReportContext = createContext<ReportLoading | null>(null);

export const LOADING_MESSAGE = "Loading profile…";
export const LOADED_MESSAGE = "Profile loaded.";

interface LoadingRegionProps {
    label: string;
    children: ReactNode;
}

/**
 * Persistent wrapper around a Suspense boundary.
 * - The region carries aria-busy, true only while a fallback is mounted.
 * - The polite status lives OUTSIDE the busy region (screen readers may defer
 *   updates inside an aria-busy subtree) and is always in the DOM, so changes
 *   to its text are reliably announced. It changes only when a real load
 *   starts or finishes, so cached renders cause no repeated announcements.
 */
export function LoadingRegion({ label, children }: LoadingRegionProps) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    const report = useCallback<ReportLoading>((loading) => {
        setBusy(loading);
        setMessage(loading ? LOADING_MESSAGE : LOADED_MESSAGE);
    }, []);

    return (
        <>
            <section aria-label={label} aria-busy={busy}>
                <LoadingReportContext value={report}>{children}</LoadingReportContext>
            </section>
            <p role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
                {message}
            </p>
        </>
    );
}

/**
 * Called by a Suspense fallback: marks the enclosing LoadingRegion busy while
 * the fallback is mounted and ready again when it unmounts. Layout effect so
 * aria-busy flips in the same frame the fallback appears / disappears.
 */
export function useReportLoading() {
    const report = useContext(LoadingReportContext);
    useLayoutEffect(() => {
        if (!report) return;
        report(true);
        return () => report(false);
    }, [report]);
}
