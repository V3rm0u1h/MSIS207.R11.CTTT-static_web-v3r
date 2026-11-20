import { defineConfig } from "@playwright/test";

/**
 * Inspector QA in a real browser: the dev server (development React, so warnings
 * would surface) and the installed Microsoft Edge, so no browser download.
 * Port 5178 avoids the other LAB dev servers (5174-5177).
 */
export default defineConfig({
    testDir: "e2e",
    reporter: "list",
    use: { baseURL: "http://localhost:5178", channel: "msedge" },
    webServer: {
        command: "npx vite --port 5178 --strictPort",
        url: "http://localhost:5178",
        reuseExistingServer: false
    }
});
