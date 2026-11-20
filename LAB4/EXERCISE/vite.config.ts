import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        // The manifest lets scripts/verify-chunks.mjs prove PersonDetail ships as its own async chunk.
        manifest: true
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["src/setupTests.ts"],
        include: ["src/**/*.test.{ts,tsx}"]
    }
});
