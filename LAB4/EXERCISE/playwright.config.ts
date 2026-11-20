import { defineConfig } from "@playwright/test";

/**
 * Browser QA against the PRODUCTION build (real code-split chunks), using the
 * installed Microsoft Edge so no browser download is needed.
 * Port 4177 avoids the LAB3 dev servers (5174-5176).
 */
export default defineConfig({
    testDir: "e2e",
    reporter: "list",
    use: {
        baseURL: "http://localhost:4177",
        channel: "msedge"
    },
    projects: [
        { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
        { name: "phone", use: { viewport: { width: 375, height: 812 } } }
    ],
    webServer: {
        command: "npx vite build && npx vite preview --port 4177 --strictPort",
        url: "http://localhost:4177",
        reuseExistingServer: false
    }
});
