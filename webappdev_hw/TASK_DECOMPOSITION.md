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

**Status:** Complete

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

**Commit**
```bash
git add index.html style.css TASK_DECOMPOSITION.md
git commit -m "feat(css): tokens & reset"
```

### t-02b — 2D Grid Layout

**Dependency:** `t-02a`

**Status:** Complete

**Scope**
- Add CSS Grid as the primary portfolio layout mechanism.
- Create a two-column desktop layout.
- Use grid rows and columns.
- Collapse to a single column on smaller screens.
- Preserve DOM reading order.
- Preserve keyboard navigation and focus states.
- Keep this milestone CSS-only.

**Boundary**
- No JavaScript.
- No localStorage.
- No theme switching.
- No theme toggle.

**Commit**
```bash
git add index.html style.css TASK_DECOMPOSITION.md
git commit -m "feat(css): responsive grid"
```

### t-02c — Theme Engine

**Dependency:** `t-02b`

**Status:** Ready for review

**Scope**
- Add a light/dark theme token system.
- Add an accessible semantic theme toggle button.
- Persist theme state with `localStorage`.
- Use exactly `theme` as the storage key.
- Accept only `light` and `dark` as persisted values.
- Apply themes through CSS custom properties.
- Preserve the semantic HTML and responsive Grid architecture.
- Maintain keyboard accessibility and visible focus states.
- Handle unavailable or invalid localStorage data safely.

**Theme Contract**
- Default theme: `light`.
- Valid themes: `light`, `dark`.
- Storage key: `theme`.
- Theme state is represented by `data-theme` on `<html>`.
- The toggle exposes its state through `aria-pressed`.
- The toggle is a native `<button>` and therefore supports normal keyboard activation.

**Accessibility**
- Toggle is reachable through normal Tab navigation.
- Enter/Space activates the native button.
- Accessible label communicates the available theme action.
- Focus styling remains visible.
- Light-theme normal text uses accessible token combinations.
- Dark-theme normal text uses accessible token combinations.

**Boundary**
- No external UI framework.
- No unnecessary dependencies.
- No DOM reconstruction.
- No JavaScript layout calculations.
- No separate hardcoded component color system.

**Acceptance Criteria**
- Theme toggle exists.
- Toggle is keyboard accessible.
- Light theme works.
- Dark theme works.
- Theme state persists under localStorage key `theme`.
- Invalid stored themes safely fall back to light.
- Storage failures do not break theme switching.
- Repeated light/dark toggling produces no application errors.
- Theme switching updates CSS tokens rather than rebuilding the page.
- Zero `<div>` elements remain.
- Responsive Grid remains intact.
- Skip-link behavior remains intact.
- Visible focus states remain intact.
- Both themes provide sufficient normal-text contrast.

**Commit**
```bash
git add index.html style.css script.js TASK_DECOMPOSITION.md
git commit -m "feat(js): dark mode engine"
```