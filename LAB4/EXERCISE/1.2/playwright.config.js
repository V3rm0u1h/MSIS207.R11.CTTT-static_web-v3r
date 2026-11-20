import { defineConfig } from "@playwright/test";

/**
 * Layout QA in a real browser: the dev server (development React, so warnings
 * would surface) and the installed Microsoft Edge, so no browser download.
 * Port 5177 avoids the LAB3 dev servers (5174-5176).
 */
export default defineConfig({
    testDir: "e2e",
    reporter: "list",
    use: { baseURL: "http://localhost:5177", channel: "msedge" },
    webServer: {
        command: "npx vite --port 5177 --strictPort",
        url: "http://localhost:5177",
        reuseExistingServer: false
    }
});
