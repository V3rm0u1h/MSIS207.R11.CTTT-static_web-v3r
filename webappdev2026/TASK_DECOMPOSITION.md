# Task Decomposition

## Exercise 1

### t-01 — Semantic DOM architecture & A11y contract

- Semantic landmark hierarchy
- Zero `<div>` elements
- Accessible skip link
- Basic accessibility verification
- Atomic HTML-only Git commit

## Exercise 2 — Enterprise Developer Portfolio

### Dependency Chain

```text
t-01
  ↓
t-02a
  ↓
t-02b
  ↓
t-02c
```

### t-02a — Tokens and Reset

**Status:** Ready for review

**Scope**
- Create the CSS design-token layer.
- Centralize colors, spacing, typography, radii, and content width.
- Implement a small intentional global CSS reset.
- Connect `style.css` to `index.html`.
- Preserve the semantic HTML and accessibility architecture from `t-01`.
- Preserve the skip link and visible keyboard focus states.
- Keep this milestone CSS-only.

**Boundary**
- No responsive 2D grid implementation.
- No JavaScript.
- No localStorage.
- No theme switching.
- No theme toggle.

**Acceptance Criteria**
- `style.css` exists and is linked from `index.html`.
- CSS colors are defined through custom properties.
- CSS rules consume color tokens through `var(...)`.
- Global box sizing is normalized.
- Body margin is reset.
- Media elements are constrained to available width.
- Form controls inherit the document font.
- Heading/list defaults are intentionally normalized.
- Keyboard focus remains visible.
- Skip-link behavior remains intact.
- Zero `<div>` elements remain.
- No JavaScript is introduced.

**Commit**
```bash
git add index.html style.css TASK_DECOMPOSITION.md
git commit -m "feat(css): tokens & reset"
```

### t-02b — 2D Grid Layout

**Dependency:** `t-02a`

Reserved for the next milestone.

**Commit**
```bash
git add index.html style.css TASK_DECOMPOSITION.md
git commit -m "feat(css): responsive grid"
```

### t-02c — Theme Engine

**Dependency:** `t-02b`

Reserved for the final milestone.

**Commit**
```bash
git add index.html style.css script.js TASK_DECOMPOSITION.md
git commit -m "feat(js): dark mode engine"
```
