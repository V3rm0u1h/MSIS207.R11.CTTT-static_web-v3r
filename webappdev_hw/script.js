/* T-02C — Theme Engine */

const themeToggle = document.querySelector("#theme-toggle");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  const isDark = theme === "dark";

  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme"
  );
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark" || savedTheme === "light") {
  applyTheme(savedTheme);
} else {
  applyTheme("light");
}

themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  localStorage.setItem("theme", nextTheme);
  applyTheme(nextTheme);
});


/* T-03C — Empty & Error States */

const projectStates = {
  loading: document.querySelector("#projects-loading"),
  live: document.querySelector("#projects-live"),
  empty: document.querySelector("#projects-empty"),
  error: document.querySelector("#projects-error")
};

let currentProjectState = "loading";

function setProjectState(nextState) {
  const currentState = currentProjectState;

  const allowedTransitions = {
    loading: ["live", "error"],
    live: ["empty", "error"],
    empty: ["loading"],
    error: ["loading"]
  };

  if (!allowedTransitions[currentState].includes(nextState)) {
    return;
  }

  Object.values(projectStates).forEach((statePanel) => {
    statePanel.hidden = true;
  });

  projectStates[nextState].hidden = false;
  currentProjectState = nextState;
}

document.querySelectorAll("[data-retry]").forEach((button) => {
  button.addEventListener("click", () => {
    if (currentProjectState === "empty" ||
        currentProjectState === "error") {
      setProjectState("loading");
    }
  });
});


/* T-03C demo controls */

setProjectState("live");

/* HW2 Step 3 — Keyboard Input Adapter */
/* HW2 Step 3 + Step 4 — Keyboard Input Adapter */

function handleDrumKeyDown(event) {
  if (event.repeat) {
    return;
  }

  const key = event.key.toLowerCase();

  const control = document.querySelector(
    `[data-key="${key}"]`
  );

  if (!control) {
    return;
  }

  const soundId = control.dataset.sound;

  if (!soundId) {
    return;
  }

  audioEngine.play(soundId);

  recorder.record({
    key,
    sound: soundId
  });
}

document.addEventListener("keydown", handleDrumKeyDown);