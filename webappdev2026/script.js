"use strict";

const THEME_KEY = "theme";

const VALID_THEMES = new Set(["light", "dark"]);

const DEFAULT_THEME = "light";

const root = document.documentElement;

const themeToggle = document.getElementById("theme-toggle");

function isValidTheme(theme) {
    return VALID_THEMES.has(theme);
}

function getStoredTheme() {
    try {
        const storedTheme = localStorage.getItem(THEME_KEY);

        return isValidTheme(storedTheme)
            ? storedTheme
            : DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
}

function applyTheme(theme) {
    root.dataset.theme = theme;

    const isDark = theme === "dark";

    themeToggle.setAttribute("aria-pressed", String(isDark));

    themeToggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light theme" : "Switch to dark theme"
    );

    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // Theme remains functional even when storage is unavailable.
    }
}

function toggleTheme() {
    const currentTheme = root.dataset.theme;

    const nextTheme =
        currentTheme === "dark"
            ? "light"
            : "dark";

    applyTheme(nextTheme);
    saveTheme(nextTheme);
}

applyTheme(getStoredTheme());

themeToggle.addEventListener("click", toggleTheme);