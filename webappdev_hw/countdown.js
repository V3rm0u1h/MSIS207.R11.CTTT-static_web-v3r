/* HW3 Commit 1 — UTC Deadline Contract */

const countdownDeadlineElement = document.querySelector(
  "#countdown-deadline"
);

const countdownDeadline = countdownDeadlineElement?.dateTime;

if (!countdownDeadline) {
  console.error("Countdown deadline is missing.");
}