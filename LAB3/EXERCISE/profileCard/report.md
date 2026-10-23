# REPORT LAB3 Exercise 1 — Semantic Engineer & Pro-Gamer Profile Card

A React 19 + Vite profile card: `DeveloperCard` (identity, avatar, details,
skills) built from reusable `SkillBadge` items, styled by one CSS Module.

| PRD | Delivered in |
| --- | --- |
| T-01A SkillBadge foundation | `src/components/SkillBadge.jsx` |
| T-01B Developer profile architecture | `src/components/DeveloperCard.jsx`, `src/App.jsx`, `src/main.jsx`, `src/sampleProfile.js` |
| T-01C Scoped styling system | `src/components/DeveloperCard.module.css` |
| T-01D Quality assurance | `e2e/profileCard.spec.js`, `playwright.config.js`, this report |

## Run

```
cd LAB3/EXERCISE/profileCard
npm install
npm run dev        # http://localhost:5173
npm test           # 72 unit tests (Vitest + Testing Library, jsdom)
npm run test:e2e   # 18 browser checks (Playwright, installed Edge, 375px viewport)
```

Demo switches: `?avatar=broken` (an HTTPS avatar that fails to load) and
`?profile=long` (long unbroken words and an HTML-looking string).

## T-01D — QA procedure and results

The manual procedure in the PRD is automated in `e2e/profileCard.spec.js`,
so it can be repeated on every change. It runs against the **dev server**
(development React, so key warnings would be printed) in Microsoft Edge with
a **375 x 812** viewport, for four scenarios: sample profile, sample with a
broken avatar, long profile, long profile with a broken avatar. Avatar
requests are served locally (a green test square) and the broken URL is
failed on purpose, so the results do not depend on the network.

| Definition of done / audit item | How it is checked | Result |
| --- | --- | --- |
| Works at 375px, no horizontal overflow | `scrollWidth - clientWidth` is 0, and no element inside the article sticks out of the card, in all four scenarios | Pass (after the fix below) |
| Long skill names and metadata wrap | `?profile=long`: 47-letter skill name, 58-letter place name, long title and name | Pass (after the fix below) |
| Avatar and heading readable on small screens | at 375px: name ≥ 20px, body text ≥ 14px, avatar 96px | Pass |
| Spacing and type adapt to width | phone media query lowers card padding; name size scales with the card (`clamp` + `cqi`); container query stacks header and details below 340px | Pass |
| Avatar is HTTPS with explicit dimensions | `src` protocol is `https:`, `width="96" height="96"`, image decoded | Pass |
| Space reserved before the image loads | the avatar response is held back: the `<img>` already takes 96x96, the heading does not move when it arrives, measured layout shift (CLS) is 0 | Pass |
| Failed-image fallback works | broken URL: no `<img>` left, initials "LT" shown as `role="img"` named "Linh Tran profile", same 96x96 box, CLS 0 | Pass |
| No raw HTML from profile strings | the role `<b>Staff</b> …` is shown as text; no `<b>` element exists | Pass |
| Article named through `aria-labelledby` | `aria-labelledby="dev-heading"`, the `<h2 id="dev-heading">` holds the name, and the article's accessible name is the name | Pass |
| Avatar alternative text | `alt` / `aria-label` "Linh Tran profile" | Pass |
| Metadata understandable when read in order | `<dl>` children read Role, value, Experience, value, … | Pass |
| Valid `<ul>`/`<li>` skill list | the `<ul>` contains only `<li>`s, each skill shown with name and level | Pass |
| Accessibility tree | Playwright ARIA snapshot of the whole article (img, heading, paragraph, term/definition pairs, "Skills" region, list of 4 items) | Pass |
| Sufficient contrast | axe-core WCAG 2.1 A/AA audit of the article in all four scenarios; colour tokens also unit-tested for ≥ 4.5:1 | Pass (after the fix below) |
| Keyboard access and visible focus | the card has no interactive controls (nothing to tab to); a link placed in the card is reached with Tab and gets the 3px accent outline | Pass |
| No React key warnings, no console errors | every console error / warning and page error is collected; only the browser's own "failed to load" line for the deliberately broken URL is allowed | Pass |
| No `<div>` in the component | none in `DeveloperCard.jsx` / `SkillBadge.jsx` (unit test on the source) and none in the rendered card (browser check) | Pass |
| No inline background styling | no `style=` in any component source and no `style` attribute in the rendered card (unit tests) | Pass |
| Both required commits exist | `git log` | Committed by the author |

### Defects found and fixed

The first browser run failed 5 of 18 checks; jsdom could not have found these,
because it does not lay out pages:

1. **Horizontal overflow with long skill names (128px).** A badge was an
   `inline-flex` pill with no width limit, so an unbroken 47-letter skill name
   pushed it, and the page, wider than the screen. Fix: badges get
   `max-width: 100%` and wrap, and the name and level spans may break long
   words (`overflow-wrap: anywhere`).
2. **Colour contrast failure (axe).** A side effect of 1: the overflowing
   badge's green level text lay outside the card, on the light page
   background. Fixed by 1.
3. **Console error with the broken avatar.** The browser always logs
   `Failed to load resource` for a failed image; the app cannot prevent it,
   and here it is the expected result. The check now allows exactly that
   message for the deliberately broken URL, and nothing else.

### Screenshots (375px)

- `images/t01d-375-sample-profile.png`
- `images/t01d-375-sample-profile-broken-avatar.png`
- `images/t01d-375-long-profile.png`
- `images/t01d-375-long-profile-broken-avatar.png`

### Known limitation

The reference contract fixes the heading id to `dev-heading`, so only one card
can appear on a page; a second card would repeat the id. Several cards would
need a unique id per card (React `useId`).
