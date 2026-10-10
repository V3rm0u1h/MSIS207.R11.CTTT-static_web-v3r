# Mini-React PRD 4 — Reactive Todo Application

A small, responsive Todo app built with vanilla JavaScript on the shared PRD 1 state store, PRD 2 `useState()` dispatcher, and PRD 3 root event delegation.

## Files

- `state.js` — PRD 1 persistent hook store and cursor reset.
- `useState.js` — PRD 2 closure-based state setters and explicit render callback.
- `events.js` — PRD 3 root delegation, extended minimally to support `submit` in addition to `click`.
- `app.js` — Todo application state, actions, filtering, counts, empty state, and render integration.
- `index.html` / `styles.css` — semantic, responsive interface.
- `events.test.html` / `events.test.js` — PRD 3 delegation regression tests.
- `todo.test.html` / `todo.test.js` — browser checks for task creation, validation, completion, deletion, filtering, counts, and inert HTML-like text.

## Architecture note

The PRD 3 starter implementation supplied for this exercise used safe native DOM creation and `root.replaceChildren()` rather than a VNode-to-DOM renderer. PRD 4 therefore reuses that established rendering path instead of introducing a second renderer. The stable `#app-root` is never replaced; only its descendants are rebuilt. State remains in the shared `useState()` store.

The event dispatcher supports `click` and `submit`. The submit handler is registered centrally on the root so keyboard Enter submission works without attaching native listeners to child controls. The submit callback calls `preventDefault()` only for the Todo form submission; the event system does not cancel events globally.

## Run locally

Serve this folder over HTTP because the app uses JavaScript modules:

```bash
python -m http.server 8000
```

Open <http://localhost:8000>.

Open <http://localhost:8000/events.test.html> to run the PRD 3 delegation regression checks.

Open <http://localhost:8000/todo.test.html> to run the Todo application checks.

## Manual verification

1. Add two non-empty tasks, including a task with leading/trailing spaces; the saved text should be trimmed.
2. Submit blank and whitespace-only input; no task should be created.
3. Toggle one task completed and active; only that task should change.
4. Delete one task; other tasks and their order should remain unchanged.
5. Try All, Active, and Completed repeatedly; hidden tasks must remain in state.
6. Verify total, active, and completed counts after each action.
7. Clear tasks or choose a filter with no matches; the matching empty-state message should appear.
8. Enter text such as `<img onerror=alert(1)>`; it must appear literally as text.
9. Use Tab, Enter, and Space to operate controls and confirm focus remains visible.
10. Inspect `events.js`: only the root gets native `click` and `submit` listeners. Child controls register callback references, not native listeners.

## Atomic PRD 4 commit

If the previous milestones are already committed, stage only the PRD 4 changes:

```bash
git status
git add app.js events.js index.html styles.css README.md
# Include events.test.js / events.test.html only if you changed them.
git diff --cached
git commit -m "feat(ui): assemble reactive todo application"
```

Do not re-stage `state.js` or `useState.js` if those files belong to prior commits. The ZIP includes them to make the extracted project runnable as a whole.
