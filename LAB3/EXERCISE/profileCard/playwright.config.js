import { defineConfig } from "@playwright/test";

/**
 * T-01D browser QA: the dev server (development React, so key warnings would
 * show), a 375px-wide phone viewport, and the installed Microsoft Edge, so no
 * browser download is needed.
 */
export default defineConfig({
    testDir: "e2e",
    reporter: "list",
    use: {
        baseURL: "http://localhost:5173",
        channel: "msedge",
        viewport: { width: 375, height: 812 }
    },
    webServer: {
        command: "npx vite --port 5173 --strictPort",
        url: "http://localhost:5173",
        reuseExistingServer: true
    }
});
