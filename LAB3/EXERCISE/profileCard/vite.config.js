import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        // Real CSS Module class names in tests, so styling hooks can be checked.
        css: { include: /\.module\.css$/, modules: { classNameStrategy: "stable" } }
    }
});
