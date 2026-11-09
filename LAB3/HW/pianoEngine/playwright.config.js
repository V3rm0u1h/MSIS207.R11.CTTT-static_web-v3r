import { defineConfig } from "@playwright/test";

/**
 * Browser QA: the dev server (development React, so key warnings would show),
 * a 375px-wide phone viewport, and the installed Microsoft Edge, so no browser
 * download is needed. Port 5175 so it never collides with the drum kit on 5174.
 */
export default defineConfig({
    testDir: "e2e",
    reporter: "list",
    use: {
        baseURL: "http://localhost:5175",
        channel: "msedge",
        viewport: { width: 375, height: 812 }
    },
    webServer: {
        command: "npx vite --port 5175 --strictPort",
        url: "http://localhost:5175",
        reuseExistingServer: true
    }
});
