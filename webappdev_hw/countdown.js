/* HW3 Commit 2 — Drift-Free Countdown Engine */

const countdownDeadlineElement = document.querySelector(
  "#countdown-deadline"
);

const countdownDisplay = document.querySelector(
  "#countdown-display"
);

const countdownDeadline = countdownDeadlineElement?.dateTime;

const countdownDeadlineTimestamp = countdownDeadline
  ? Date.parse(countdownDeadline)
  : NaN;

let countdownIntervalId = null;

function formatCountdown(milliseconds) {
  const remaining = Math.max(0, milliseconds);

  const totalSeconds = Math.floor(remaining / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds
  };
}

function renderCountdown() {
  if (!countdownDisplay) {
    return;
  }

  if (!Number.isFinite(countdownDeadlineTimestamp)) {
    countdownDisplay.textContent = "Countdown unavailable";
    return;
  }

  const remaining = countdownDeadlineTimestamp - Date.now();

  if (remaining <= 0) {
    countdownDisplay.textContent = "00:00:00:00";

    if (countdownIntervalId !== null) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }

    return;
  }

  const {
    days,
    hours,
    minutes,
    seconds
  } = formatCountdown(remaining);

  countdownDisplay.textContent =
    `${String(days).padStart(2, "0")}:` +
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;
}

function startCountdown() {
  if (countdownIntervalId !== null) {
    return;
  }

  renderCountdown();

  countdownIntervalId = setInterval(
    renderCountdown,
    1000
  );
}

startCountdown();