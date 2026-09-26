# Task Decomposition

## t-01 — Semantic DOM architecture & A11y contract

### Scope

- Define the semantic landmark hierarchy.
- Implement the page with zero `<div>` elements.
- Implement an accessible skip link targeting `#main-content`.
- Implement the required `header`, `nav`, `main`, and `section` landmarks.
- Implement the required heading hierarchy.
- Implement accessible navigation using `<nav>`, `<ul>`, `<li>`, and `<a>`.
- Verify the semantic structure and accessibility tree using Chrome DevTools.
- Keep this milestone HTML-only.
- Create an atomic Git commit containing only this milestone.

### Acceptance Criteria

- `index.html` exists.
- Exactly one `<header>` exists.
- Exactly one `<nav>` exists.
- Exactly one `<main>` exists.
- Exactly two content sections exist: `#about` and `#projects`.
- Exactly one primary `<h1>` exists.
- Each section has an `<h2>`.
- Navigation has the accessible name `Primary`.
- `About` links to `#about`.
- `Projects` links to `#projects`.
- Skip link links to `#main-content`.
- `<main>` has `id="main-content"`.
- Zero `<div>` elements exist.
- No CSS or JavaScript is introduced.

### Verification

Run:

```bash
git status
git diff
```

Expected milestone files:

```text
index.html
TASK_DECOMPOSITION.md
```

Required commit:

```bash
git add index.html TASK_DECOMPOSITION.md
git commit -m "feat(html): semantic landmark tree"
```
