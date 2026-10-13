# Accessible Data-Grid — Verification Report

Built on the Mini-React core (`createElement`, `renderToDOM`, `events.js`) in four commits:

| PRD | Commit | Scope |
| --- | --- | --- |
| 1 | `dataGrid` | Semantic `<table>`, type guards, XSS-safe text, contrast-checked theme |
| 2 | `gridModel` | Sorting (`aria-sort`), filtering, live-region announcements |
| 3 | `pagination` | `<nav>` pager, rows per page, `aria-rowcount` / `aria-rowindex` |
| 4 | keyboard + audit | ARIA grid, roving tabindex, arrow keys, Enter/Space selection, Lighthouse |

## Lighthouse

Lighthouse 12.2.1, headless Chrome, `http://127.0.0.1:8765/dataGrid.demo.html`, run 2026-10-14.

| Form factor | Accessibility | Best Practices | Report |
| --- | --- | --- | --- |
| Mobile | 100 | 100 | [lighthouse-report-mobile.html](lighthouse/lighthouse-report-mobile.html) |
| Desktop | 100 | 100 | [lighthouse-report-desktop.html](lighthouse/lighthouse-report-desktop.html) |

![Lighthouse mobile: Accessibility 100, Best Practices 100](lighthouse/lighthouse-mobile.png)

To re-run (Node 18+):

```sh
python -m http.server 8765 --bind 127.0.0.1
npx lighthouse@12.2.1 http://127.0.0.1:8765/dataGrid.demo.html --only-categories=accessibility,best-practices --view
npx lighthouse@12.2.1 http://127.0.0.1:8765/dataGrid.demo.html --only-categories=accessibility,best-practices --preset=desktop --view
```

Lighthouse audits the page as it loads. The interactive states were checked separately with axe-core 4.10.2 (the engine behind Lighthouse's accessibility audits), using WCAG 2.0/2.1/2.2 A and AA plus best-practice rules:

| State | Violations |
| --- | --- |
| Sorted by salary, page 3, focus on Next | 0 |
| Sorted, page 2, two rows selected (select-all mixed), focus on a cell | 0 |

## Automated tests

`dataGrid.test.html` runs 101 tests in the real browser DOM: **101/101 pass**.

| Suite | Tests | Covers |
| --- | --- | --- |
| `dataGrid.test.js` | 22 | Structure, `scope`, no `div`/`span`, XSS, type guards, formatting, contrast tokens |
| `gridModel.test.js` | 17 | Sort/filter logic, controller, announcements |
| `mountDataGrid.test.js` | 15 | Sort buttons, debounced filter, focus, live region |
| `pagination.test.js` | 23 | Paging model, pager view, row positions, pager focus, target size |
| `keyboard.test.js` | 24 | Arrow/Home/End/Page keys, roving tabindex, Enter/Space selection, select-all |

## Keyboard map

| Key | Action |
| --- | --- |
| Tab / Shift+Tab | Enter or leave the grid (one Tab stop, returns to the last active cell) |
| ↑ ↓ ← → | Move one cell; stops at the edges |
| Home / End | First or last cell in the row |
| Ctrl+Home / Ctrl+End | First or last cell in the grid |
| Page Up / Page Down | Previous or next page, same row and column |
| Enter | Header: sort (or select the whole page on "All"). Row: select only that row |
| Space | Header: sort. Row: toggle that row's selection |

## Still to do by hand

- [ ] Screen reader pass (NVDA + Chrome or VoiceOver + Safari): cell position, sort state, selection and page announcements.
- [ ] Windows High Contrast / forced-colors check of focus rings and selected rows.
