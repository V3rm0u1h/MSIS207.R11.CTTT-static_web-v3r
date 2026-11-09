import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        // e2e/ holds the Playwright browser checks (npm run test:e2e).
        include: ["src/**/*.test.{js,jsx}"],
        css: { include: /\.module\.css$/, modules: { classNameStrategy: "stable" } }
    }
});
