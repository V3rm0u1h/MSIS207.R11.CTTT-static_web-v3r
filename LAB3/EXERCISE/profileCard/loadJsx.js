/**
 * No-build JSX loading for the profile-card pages.
 *
 * Fetches a .jsx file, compiles it with Babel standalone (the page must load
 * it first, as window.Babel) using the automatic React runtime in development
 * mode, and imports the result from a blob URL. Bare imports such as
 * "react/jsx-dev-runtime" resolve through the page's import map, so the
 * component gets the same React instance as the page.
 *
 * Only for demo and test pages: a real app would compile with a bundler.
 * Compiled modules cannot use relative imports (a blob URL has no folder).
 */

export async function loadJsx(url) {
    if (typeof globalThis.Babel?.transform !== "function") {
        throw new TypeError("loadJsx: Babel standalone must be loaded before loadJsx is called");
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`loadJsx: could not fetch ${url} (HTTP ${response.status})`);
    const { code } = globalThis.Babel.transform(await response.text(), {
        filename: String(url),
        sourceType: "module",
        presets: [["react", { runtime: "automatic", development: true }]]
    });
    const blobUrl = URL.createObjectURL(new Blob([`${code}\n//# sourceURL=${url}`], { type: "text/javascript" }));
    try {
        return await import(blobUrl);
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}
