# AI Failure Audit

## Defect 1 — Countdown Drift

### Defect Description

The initial countdown implementation used an internal counter that
decremented once per interval instead of calculating the remaining
time from the absolute UTC deadline.

### Diagnostic Method

The implementation was reviewed against the countdown requirement and
the timer behavior was inspected during repeated interval execution.

### Refactored Solution

The countdown was changed to calculate the remaining duration on every
update using:

deadlineTimestamp - Date.now()

The interval is used only to schedule rendering and does not determine
the amount of time that has elapsed.

---

## Defect 2 — Missing UTC Indicator

### Defect Description

The initial deadline representation did not explicitly identify UTC.

### Diagnostic Method

The deadline string was inspected and compared against the requirement
for an ISO 8601 timestamp with an explicit UTC indicator.

### Refactored Solution

The deadline was changed to an ISO 8601 timestamp ending in `Z`:

2026-12-31T23:59:59Z

This makes the deadline an explicit absolute UTC timestamp.

---

## Defect 3 — Unsafe User Input Rendering

### Defect Description

The initial form rendering approach used an HTML-interpreting DOM API
for user-controlled content.

### Diagnostic Method

The form was tested with XSS payloads such as:

<script>alert(1)</script>

The DOM rendering path was then reviewed to determine whether user input
could be interpreted as HTML.

### Refactored Solution

User-controlled values are rendered using `textContent` rather than
`innerHTML`.

This ensures that the submitted value is treated as text rather than
executable markup.