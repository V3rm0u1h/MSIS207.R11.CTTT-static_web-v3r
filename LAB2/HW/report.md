# REPORT LAB2 — HW

Accessible Data-Grid built on the Mini-React core. Code is in `source/`. Open `source/dataGrid.demo.html` through a local server (`python -m http.server` from `source/`).

## PRD 1 — Semantic table and accessible theme

final:

![PRD 1: native table with caption, column headers and row headers](images/prd1-semantic-table.png)

## PRD 2 — Sorting and filtering

final:

![PRD 2: filtered by "engineering", sorted by salary descending](images/prd2-sort-filter.png)

## PRD 3 — Pagination

final:

![PRD 3: page 3 of 5 with rows-per-page select and pager](images/prd3-pagination.png)

## PRD 4 — Keyboard navigation, selection and Lighthouse audit

final:

![PRD 4: two rows selected, select-all in mixed state, focus ring on a cell](images/prd4-keyboard-selection.png)

Lighthouse 12.2.1 — Accessibility 100, Best Practices 100 (mobile and desktop):

![Lighthouse: Accessibility 100, Best Practices 100](source/lighthouse/lighthouse-mobile.png)

Full reports: [mobile](source/lighthouse/lighthouse-report-mobile.html) · [desktop](source/lighthouse/lighthouse-report-desktop.html)

Tests: `source/dataGrid.test.html` — 101/101 passed.

AI defects found and fixed: [AI_AUDIT_FAILURE_1.md](AI_AUDIT_FAILURE_1.md)
