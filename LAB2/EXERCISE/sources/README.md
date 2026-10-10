# Mini-React PRD 3 — Root Event Delegation

A small vanilla-JavaScript browser demo built on the supplied PRD 1 `state.js` and PRD 2 `useState.js`.

## Files

- `state.js` — persistent hook state store and cursor reset (PRD 1)
- `useState.js` — closure-based state dispatcher and explicit render callback (PRD 2)
- `events.js` — delegated `click` handler registry and idempotent root listener (PRD 3)
- `app.js` — minimal demo app that connects state, rendering, and delegation
- `index.html` / `styles.css` — accessible responsive demo frontend

## Run it

ES modules must be served over HTTP rather than opening `index.html` as a `file://` URL. From this directory, run one of:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

Alternatively, use the Live Server extension in VS Code.

## Manual acceptance checks

1. Click **Increase** repeatedly; the count increments and the status updates.
2. Click the nested text inside **Increase**; it still invokes the button callback.
3. Click **Decrease** and **Reset**; the correct callback runs.
4. After every update, click the controls again. The root listener remains active after descendants are replaced.
5. Review `events.js`: native `addEventListener()` is used only by `attachRootEventDelegation()` on the root. Individual controls only register callback references in a `WeakMap`.
6. Call `attachRootEventDelegation(root, ["click"])` repeatedly for the same root; the module's root/event registry prevents duplicate registrations.
7. Unregistered elements do nothing.

## Atomic commit reminder

If PRD 1 and PRD 2 are already committed, stage only PRD 3 changes for this milestone. Do not amend or rewrite previous commits.

Suggested commit:

```bash
git add events.js app.js index.html styles.css README.md
git commit -m "feat(events): attach root event delegation listener"
```

Include `state.js` and `useState.js` only if they are new/uncommitted files in your current repository. Avoid modifying them for this milestone unless a verified integration bug requires it.

## Automated browser checks

Open `events.test.html` through the same local HTTP server. It automatically tests invalid roots, idempotent registration, matching callbacks, nested targets, no child listeners, replaced descendants, ignored unregistered elements, and state-setter integration.
