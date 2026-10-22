import { renderToDOM } from "./renderToDOM.js";
import { DataGrid } from "./dataGrid.js";
import { createGridController } from "./gridModel.js";
import { mountDataGrid } from "./mountDataGrid.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox, wait } from "./testHarness.js";

// PRD 4 — keyboard navigation and row selection.

const DEBOUNCE = 20;
const columns = [
    { key: "name", label: "Name", type: "string", sortable: true, filterable: true },
    { key: "team", label: "Team", type: "string", filterable: true },
    { key: "score", label: "Score", type: "number", sortable: true }
];
// 23 rows: pages of 10, 10 and 3. Grid columns: select, Name, Team, Score.
const rows = Array.from({ length: 23 }, (_, index) => ({
    name: `Person ${String(index + 1).padStart(2, "0")}`,
    team: index % 2 === 0 ? "Red" : "Blue",
    score: (index * 13) % 50
}));
const LAST_COL = 3;

function mount(overrides = {}) {
    const root = document.createElement("section");
    sandbox().append(root);
    const handle = mountDataGrid(root, { id: "kb", caption: "People", locale: "en-US", columns, rows, ...overrides },
        { filterDebounceMs: DEBOUNCE });
    return { root, handle };
}
function cellAt(root, row, col) { return root.querySelector(`[data-row="${row}"][data-col="${col}"]`); }
function targetAt(root, row, col) {
    const cell = cellAt(root, row, col);
    return cell.querySelector("button, input") ?? cell;
}
function focusAt(root, row, col) { targetAt(root, row, col).focus(); }
function press(key, options = {}) {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options });
    document.activeElement.dispatchEvent(event);
    return event;
}
function focusedPosition() {
    const cell = document.activeElement.closest("[data-row]");
    return cell ? [Number(cell.dataset.row), Number(cell.dataset.col)] : null;
}
const tabStops = (root) => root.querySelectorAll("table [tabindex='0']");
const bodyRow = (root, row) => root.querySelectorAll("tbody tr")[row - 1];
const status = (root) => root.querySelector("[role=status]");
const selectAll = (root) => root.querySelector("thead input[type=checkbox]");

// --- Semantics and roving tabindex ---

test("interactive grid uses role=grid with one Tab stop", () => {
    const { root } = mount();
    const table = root.querySelector("table");
    assertEqual(table.getAttribute("role"), "grid", "Grid role");
    assertEqual(table.getAttribute("aria-multiselectable"), "true", "Multi-select");
    assert(!root.querySelector(".data-grid").hasAttribute("tabindex"), "Scroll region is not a second Tab stop");
    assertEqual(tabStops(root).length, 1, "One tabindex=0");
    assert([...table.querySelectorAll("button, input")].every((control) => control.hasAttribute("tabindex")),
        "Every control in the grid is managed by the roving tabindex");
});

test("static DataGrid without interaction stays a plain table", () => {
    const grid = renderToDOM(DataGrid({ caption: "C", columns, rows: rows.slice(0, 2) }));
    assert(!grid.querySelector("table").hasAttribute("role"), "No grid role");
    assertEqual(grid.querySelectorAll("[data-row], input[type=checkbox]").length, 0, "No grid cells or checkboxes");
    assertEqual(grid.getAttribute("tabindex"), "0", "Region stays scroll-focusable");
});

test("checkboxes have accessible names that include visible text", () => {
    const { root } = mount();
    assertEqual(selectAll(root).getAttribute("aria-label"), "Select all rows on this page", "Select-all name");
    assertEqual(selectAll(root).closest("label").textContent, "All", "Visible label");
    assertEqual(targetAt(root, 1, 0).getAttribute("aria-label"), "Select Person 01", "Row checkbox name");
});

// --- Arrow keys, Home, End ---

test("arrow keys move one cell and stop at the edges", () => {
    const { root } = mount();
    focusAt(root, 0, 0);
    press("ArrowDown");
    assertDeepEqual(focusedPosition(), [1, 0], "Down");
    press("ArrowRight");
    assertDeepEqual(focusedPosition(), [1, 1], "Right");
    assertEqual(document.activeElement.tagName, "TH", "Row header cell itself takes focus");
    press("ArrowRight"); press("ArrowRight"); press("ArrowRight");
    assertDeepEqual(focusedPosition(), [1, LAST_COL], "Stops at the right edge");
    press("ArrowUp");
    assertDeepEqual(focusedPosition(), [0, LAST_COL], "Up into the header");
    assertEqual(document.activeElement.tagName, "BUTTON", "Sortable header hands focus to its button");
    press("ArrowUp");
    assertDeepEqual(focusedPosition(), [0, LAST_COL], "Stops at the top edge");
    for (let index = 0; index < 5; index += 1) press("ArrowLeft");
    assertDeepEqual(focusedPosition(), [0, 0], "Stops at the left edge");
});

test("arrow keys prevent page scrolling and keep exactly one tabindex=0", () => {
    const { root } = mount();
    focusAt(root, 1, 1);
    const event = press("ArrowDown");
    assert(event.defaultPrevented, "ArrowDown prevented");
    assertEqual(tabStops(root).length, 1, "One tabindex=0");
    assertEqual(tabStops(root)[0], document.activeElement, "The focused element holds it");
    assertEqual(cellAt(root, 1, 1).getAttribute("tabindex"), "-1", "Previous cell reset to -1");
});

test("Home, End, Ctrl+Home and Ctrl+End jump within the row or grid", () => {
    const { root } = mount();
    focusAt(root, 2, 2);
    press("Home");
    assertDeepEqual(focusedPosition(), [2, 0], "Home");
    press("End");
    assertDeepEqual(focusedPosition(), [2, LAST_COL], "End");
    press("Home", { ctrlKey: true });
    assertDeepEqual(focusedPosition(), [0, 0], "Ctrl+Home");
    press("End", { ctrlKey: true });
    assertDeepEqual(focusedPosition(), [10, LAST_COL], "Ctrl+End reaches the last row on the page");
});

test("clicking or focusing a cell moves the roving tabindex there", () => {
    const { root, handle } = mount();
    focusAt(root, 4, 2);
    assertDeepEqual(handle.activeCell, { row: 4, col: 2 }, "Active cell");
    assertEqual(tabStops(root).length, 1, "One tabindex=0");
    assertEqual(cellAt(root, 4, 2).getAttribute("tabindex"), "0", "Focused cell is the Tab stop");
});

// --- Enter and Space ---

test("Enter on a data cell selects only that row", () => {
    const { root } = mount();
    focusAt(root, 2, 2);
    const event = press("Enter");
    assert(event.defaultPrevented, "Enter prevented");
    assertEqual(bodyRow(root, 2).getAttribute("aria-selected"), "true", "Row 2 selected");
    focusAt(root, 3, 2);
    press("Enter");
    assertEqual(bodyRow(root, 2).getAttribute("aria-selected"), "false", "Row 2 deselected");
    assertEqual(bodyRow(root, 3).getAttribute("aria-selected"), "true", "Row 3 selected");
    assertEqual(root.querySelectorAll("tbody tr[aria-selected=true]").length, 1, "Only one row");
    assertEqual(status(root).textContent, "1 row selected.", "Announcement");
    assertDeepEqual(focusedPosition(), [3, 2], "Focus kept after re-render");
});

test("Space on a data cell toggles the row and never scrolls", () => {
    const { root } = mount();
    focusAt(root, 1, 1);
    const event = press(" ");
    assert(event.defaultPrevented, "Space prevented");
    assertEqual(bodyRow(root, 1).getAttribute("aria-selected"), "true", "Selected");
    focusAt(root, 3, 1);
    press(" ");
    assertEqual(status(root).textContent, "2 rows selected.", "Two rows");
    focusAt(root, 1, 1);
    press(" ");
    assertEqual(bodyRow(root, 1).getAttribute("aria-selected"), "false", "Toggled off");
    focusAt(root, 3, 1);
    press(" ");
    assertEqual(status(root).textContent, "No rows selected.", "Cleared");
});

test("row checkbox click (native Space) toggles and keeps focus", () => {
    const { root } = mount();
    focusAt(root, 2, 0);
    targetAt(root, 2, 0).click();
    assert(targetAt(root, 2, 0).checked, "Checkbox checked");
    assertEqual(bodyRow(root, 2).getAttribute("aria-selected"), "true", "Row selected");
    assertDeepEqual(focusedPosition(), [2, 0], "Focus on the new checkbox");
    assertEqual(document.activeElement.type, "checkbox", "Checkbox focused");
});

test("Space on a checkbox is left to the browser; Enter selects only that row", () => {
    const { root } = mount();
    focusAt(root, 1, 1);
    press(" ");
    focusAt(root, 4, 0);
    assert(!press(" ").defaultPrevented, "Native checkbox Space not prevented");
    press("Enter");
    assertDeepEqual([...root.querySelectorAll("tbody tr[aria-selected=true]")].map((row) => row.querySelector("th").textContent),
        ["Person 04"], "Only row 4 selected");
});

test("Enter and Space on a sort button are left to the browser", () => {
    const { root } = mount();
    focusAt(root, 0, 1);
    assert(!press("Enter").defaultPrevented, "Enter not prevented on button");
    assert(!press(" ").defaultPrevented, "Space not prevented on button");
});

test("select-all toggles every row on the page and shows a mixed state", () => {
    const { root } = mount();
    selectAll(root).click();
    assertEqual(root.querySelectorAll("tbody tr[aria-selected=true]").length, 10, "Page selected");
    assert(selectAll(root).checked && !selectAll(root).indeterminate, "Checked");
    assertEqual(status(root).textContent, "10 rows selected.", "Announcement");
    selectAll(root).click();
    assertEqual(root.querySelectorAll("tbody tr[aria-selected=true]").length, 0, "Page cleared");
    targetAt(root, 3, 0).click();
    assert(!selectAll(root).checked && selectAll(root).indeterminate, "Mixed when some rows are selected");
});

test("Enter on select-all selects the page", () => {
    const { root } = mount();
    focusAt(root, 0, 0);
    assert(press("Enter").defaultPrevented, "Enter prevented");
    assertEqual(root.querySelectorAll("tbody tr[aria-selected=true]").length, 10, "Page selected");
    assertDeepEqual(focusedPosition(), [0, 0], "Focus kept");
});

test("selection is kept by row id across paging, sorting and filtering", async () => {
    const { root, handle } = mount();
    targetAt(root, 1, 0).click(); // Person 01
    root.querySelector('[data-page-action="next"]').click();
    root.querySelector('[data-page-action="previous"]').click();
    assertEqual(bodyRow(root, 1).getAttribute("aria-selected"), "true", "Kept across pages");
    root.querySelector('[data-sort-key="name"]').click();
    root.querySelector('[data-sort-key="name"]').click();
    assertDeepEqual(handle.controller.getSnapshot().selectedIds, [0], "Kept across sorting");
    const input = root.querySelector("input[type=search]");
    input.value = "Person 01";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(DEBOUNCE + 30);
    assertEqual(bodyRow(root, 1).getAttribute("aria-selected"), "true", "Kept across filtering");
});

test("selected rows are marked by more than colour", () => {
    const { root } = mount();
    targetAt(root, 1, 0).click();
    const row = bodyRow(root, 1);
    assert(row.classList.contains("data-grid__row--selected"), "Selected class");
    assert(targetAt(root, 1, 0).checked, "Checkbox ticked");
    assert(getComputedStyle(row.cells[0]).boxShadow !== "none", "Left bar drawn");
});

// --- Page Up / Page Down and re-render focus ---

test("Page Down and Page Up change page and keep the focused row and column", () => {
    const { root } = mount();
    focusAt(root, 3, 2);
    assert(press("PageDown").defaultPrevented, "PageDown prevented");
    assertEqual(status(root).textContent, "Page 2 of 3. Rows 11–20 of 23.", "Page 2");
    assertDeepEqual(focusedPosition(), [3, 2], "Same cell on page 2");
    press("PageUp");
    assertEqual(root.querySelector("[aria-current=page]").textContent, "1", "Back to page 1");
    assertDeepEqual(focusedPosition(), [3, 2], "Same cell on page 1");
});

test("Page Down onto a shorter last page clamps the row; at the end it does nothing", () => {
    const { root } = mount();
    root.querySelector('[data-page-action="page-2"]').click();
    focusAt(root, 7, 1);
    press("PageDown");
    assertDeepEqual(focusedPosition(), [3, 1], "Clamped to the last of 3 rows");
    const before = status(root).textContent;
    assert(press("PageDown").defaultPrevented, "Still prevented");
    assertEqual(status(root).textContent, before, "No change on the last page");
});

test("sorting from the keyboard keeps focus on the header button", () => {
    const { root } = mount();
    focusAt(root, 0, LAST_COL);
    targetAt(root, 0, LAST_COL).click(); // native Enter/Space on a button is a click
    assertDeepEqual(focusedPosition(), [0, LAST_COL], "Focus on the Score header");
    assertEqual(document.activeElement.getAttribute("data-sort-key"), "score", "Sort button focused");
    assertEqual(tabStops(root).length, 1, "One tabindex=0 after re-render");
});

test("keys typed in the filter field are not captured by the grid", () => {
    const { root, handle } = mount();
    focusAt(root, 2, 2);
    const input = root.querySelector("input[type=search]");
    input.focus();
    const event = press("ArrowDown");
    assert(!event.defaultPrevented, "Arrow not prevented in the input");
    assertEqual(press(" ").defaultPrevented, false, "Space types normally");
    assertDeepEqual(handle.activeCell, { row: 2, col: 2 }, "Active cell unchanged");
});

test("a filter that removes rows keeps the active cell inside the grid", async () => {
    const { root, handle } = mount();
    focusAt(root, 9, 2);
    const input = root.querySelector("input[type=search]");
    input.value = "Person 01";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(DEBOUNCE + 30);
    assertDeepEqual(handle.activeCell, { row: 1, col: 2 }, "Clamped to the only row");
    assertEqual(tabStops(root).length, 1, "Still one Tab stop");
});

test("checkboxes meet the 24 x 24 px target size", () => {
    const { root } = mount();
    for (const box of root.querySelectorAll("input[type=checkbox]")) {
        const rect = box.getBoundingClientRect();
        assert(rect.width >= 24 && rect.height >= 24, `Checkbox is ${rect.width}x${rect.height}`);
    }
});

test("interactive grid still contains zero div or span elements", () => {
    const { root } = mount();
    selectAll(root).click();
    assertEqual(root.querySelectorAll("div, span").length, 0, "div/span count");
});

// --- Selection model ---

test("selection model validates ids and only notifies on real changes", () => {
    const controller = createGridController({ columns, rows, locale: "en-US" });
    let calls = 0;
    controller.subscribe(() => { calls += 1; });
    assertThrowsType(() => controller.toggleRow("1"), /integer/);
    let rangeError = null;
    try { controller.toggleRow(99); } catch (error) { rangeError = error; }
    assert(rangeError instanceof RangeError, "Unknown id is a RangeError");
    assertThrowsType(() => controller.setRowsSelected("all", true), /id array/);

    controller.setRowsSelected([5, 2], true);
    assertDeepEqual(controller.getSnapshot().selectedIds, [2, 5], "Sorted ids");
    assert(Object.isFrozen(controller.getSnapshot().selectedIds), "Frozen ids");
    controller.setRowsSelected([2], true);
    controller.selectOnly(7);
    controller.selectOnly(7);
    assertDeepEqual(controller.getSnapshot().selectedIds, [7], "Select only");
    assertEqual(calls, 2, "No-op selections do not notify");
});
