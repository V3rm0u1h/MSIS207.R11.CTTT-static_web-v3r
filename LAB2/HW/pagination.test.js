import { renderToDOM } from "./renderToDOM.js";
import { DataGrid } from "./dataGrid.js";
import { createGridController, describeSnapshot, pageCountFor } from "./gridModel.js";
import { Pager, pageWindow } from "./pager.js";
import { mountDataGrid } from "./mountDataGrid.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox, wait } from "./testHarness.js";

// PRD 3 — pagination.

const DEBOUNCE = 20;
const columns = [
    { key: "name", label: "Name", type: "string", sortable: true, filterable: true },
    { key: "team", label: "Team", type: "string", filterable: true },
    { key: "score", label: "Score", type: "number", sortable: true }
];
// 47 rows: 5 pages of 10, the last holding 7.
const rows = Array.from({ length: 47 }, (_, index) => ({
    name: `Person ${String(index + 1).padStart(2, "0")}`,
    team: index % 3 === 0 ? "Red" : "Blue",
    score: (index * 37) % 100
}));
const controllerFor = (overrides = {}) => createGridController({ columns, rows, locale: "en-US", ...overrides });

function assertThrowsRange(callback, pattern) {
    let error;
    try { callback(); } catch (caught) { error = caught; }
    assert(error instanceof RangeError, "Expected a RangeError to be thrown");
    if (pattern) assert(pattern.test(error.message), `Unexpected error message: ${error.message}`);
}

// --- Model ---

test("page count rounds up and is 0 for no rows", () => {
    assertEqual(pageCountFor(47, 10), 5, "47 rows");
    assertEqual(pageCountFor(50, 10), 5, "Exact multiple");
    assertEqual(pageCountFor(0, 10), 0, "No rows");
});

test("first page shows pageSize rows; last page shows the remainder", () => {
    const controller = controllerFor();
    const first = controller.getSnapshot();
    assertEqual(first.pageSize, 10, "Default page size");
    assertEqual(first.pageCount, 5, "Page count");
    assertEqual(first.rows.length, 10, "First page rows");
    assertEqual(first.firstRowIndex, 0, "First row index");
    controller.setPage(5);
    const last = controller.getSnapshot();
    assertEqual(last.rows.length, 7, "Last page rows");
    assertEqual(last.firstRowIndex, 40, "Last page offset");
    assertEqual(last.rows[0].name, "Person 41", "Last page starts at row 41");
});

test("setPage validates its argument and ignores the current page", () => {
    const controller = controllerFor();
    let calls = 0;
    controller.subscribe(() => { calls += 1; });
    assertThrowsType(() => controller.setPage(1.5), /integer/);
    assertThrowsType(() => controller.setPage("2"), /integer/);
    assertThrowsRange(() => controller.setPage(0), /outside 1–5/);
    assertThrowsRange(() => controller.setPage(6), /outside 1–5/);
    controller.setPage(1);
    assertEqual(calls, 0, "Same page does not notify");
});

test("changing page size resets to page 1", () => {
    const controller = controllerFor();
    controller.setPage(3);
    controller.setPageSize(25);
    const snapshot = controller.getSnapshot();
    assertEqual(snapshot.page, 1, "Back to page 1");
    assertEqual(snapshot.pageCount, 2, "Two pages of 25");
    assertEqual(snapshot.rows.length, 25, "Rows on page");
    assertThrowsType(() => controller.setPageSize(30), /pageSize must be one of 10, 25, 50/);
});

test("custom page size options are validated and sorted", () => {
    const controller = controllerFor({ pageSizeOptions: [20, 5], pageSize: 20 });
    assertDeepEqual(controller.getSnapshot().pageSizeOptions, [5, 20], "Sorted options");
    assertEqual(controller.getSnapshot().pageSize, 20, "Initial size");
    assertThrowsType(() => controllerFor({ pageSizeOptions: [] }), /pageSizeOptions/);
    assertThrowsType(() => controllerFor({ pageSizeOptions: [10, 10] }), /pageSizeOptions/);
    assertThrowsType(() => controllerFor({ pageSizeOptions: [0] }), /pageSizeOptions/);
    assertThrowsType(() => controllerFor({ pageSize: 7 }), /pageSize must be one of/);
});

test("filtering resets to page 1; sorting keeps the current page", () => {
    const controller = controllerFor();
    controller.setPage(4);
    controller.toggleSort("score");
    assertEqual(controller.getSnapshot().page, 4, "Sort keeps page");
    controller.setFilter("red");
    const snapshot = controller.getSnapshot();
    assertEqual(snapshot.page, 1, "Filter resets page");
    assertEqual(snapshot.visibleCount, 16, "Red rows");
    assertEqual(snapshot.pageCount, 2, "Pages of red rows");
});

test("no matching rows gives 0 pages, page 1 and an empty page", () => {
    const controller = controllerFor();
    controller.setFilter("nobody");
    const snapshot = controller.getSnapshot();
    assertEqual(snapshot.pageCount, 0, "Page count");
    assertEqual(snapshot.page, 1, "Page");
    assertEqual(snapshot.rows.length, 0, "Rows");
});

test("page and page-size changes are announced with the row range", () => {
    const controller = controllerFor();
    controller.setPage(2);
    assertEqual(controller.describe(), "Page 2 of 5. Rows 11–20 of 47.", "Page message");
    controller.setPageSize(50);
    assertEqual(controller.describe(), "50 rows per page. Rows 1–47 of 47.", "Page size message");
    controller.setFilter("blue");
    assertEqual(controller.describe(), "Filtered by “blue”. Rows 1–31 of 31, filtered from 47.", "Filter message");
    assertEqual(describeSnapshot(controller.getSnapshot(), columns), controller.describe(), "Same text from describeSnapshot");
});

// --- Pager view ---

test("page window keeps first, last, current and neighbours", () => {
    assertDeepEqual(pageWindow(1, 5), [1, 2, 3, 4, 5], "Short list");
    assertDeepEqual(pageWindow(6, 12), [1, "gap", 5, 6, 7, "gap", 12], "Middle");
    assertDeepEqual(pageWindow(1, 12), [1, 2, 3, 4, "gap", 12], "Start");
    assertDeepEqual(pageWindow(12, 12), [1, "gap", 9, 10, 11, 12], "End");
    assertDeepEqual(pageWindow(1, 0), [], "No pages");
});

test("pager is a labelled nav with native buttons and aria-current", () => {
    const nav = renderToDOM(Pager({ caption: "People", page: 2, pageCount: 5, onPage: () => {} }));
    assertEqual(nav.tagName, "NAV", "Landmark");
    assertEqual(nav.getAttribute("aria-label"), "People pages", "Landmark label");
    const buttons = [...nav.querySelectorAll("button")];
    assert(buttons.every((button) => button.type === "button"), "All native buttons");
    assertDeepEqual(buttons.map((button) => button.textContent), ["First", "Previous", "1", "2", "3", "4", "5", "Next", "Last"], "Labels");
    const current = nav.querySelectorAll("[aria-current]");
    assertEqual(current.length, 1, "One current page");
    assertEqual(current[0].getAttribute("aria-current"), "page", "aria-current value");
    assertEqual(current[0].getAttribute("aria-label"), "Page 2", "Accessible name includes the visible number");
});

test("edge buttons are disabled on the first and last pages", () => {
    const disabled = (page, pageCount) => {
        const nav = renderToDOM(Pager({ caption: "P", page, pageCount, onPage: () => {} }));
        return [...nav.querySelectorAll("button:disabled")].map((button) => button.textContent);
    };
    assertDeepEqual(disabled(1, 5), ["First", "Previous"], "Page 1");
    assertDeepEqual(disabled(5, 5), ["Next", "Last"], "Last page");
    assertDeepEqual(disabled(3, 5), [], "Middle page");
    assertDeepEqual(disabled(1, 0), ["First", "Previous", "Next", "Last"], "No pages");
});

test("gap markers are hidden from assistive technology", () => {
    const nav = renderToDOM(Pager({ caption: "P", page: 6, pageCount: 12, onPage: () => {} }));
    const gaps = nav.querySelectorAll(".data-grid-pager__gap");
    assertEqual(gaps.length, 2, "Two gaps");
    assert([...gaps].every((gap) => gap.getAttribute("aria-hidden") === "true"), "Gaps are aria-hidden");
});

test("DataGrid sets aria-rowcount and aria-rowindex for a page", () => {
    const grid = renderToDOM(DataGrid({ caption: "C", columns, rows: rows.slice(10, 20), rowCount: 47, firstRowIndex: 10 }));
    assertEqual(grid.querySelector("table").getAttribute("aria-rowcount"), "48", "Header plus 47 rows");
    assertEqual(grid.querySelector("thead tr").getAttribute("aria-rowindex"), "1", "Header row index");
    const indexes = [...grid.querySelectorAll("tbody tr")].map((row) => row.getAttribute("aria-rowindex"));
    assertEqual(indexes[0], "12", "Row 11 of the data is row 12 of the table");
    assertEqual(indexes[9], "21", "Last row on the page");
});

test("DataGrid omits row positions without rowCount and rejects bad positions", () => {
    const plain = renderToDOM(DataGrid({ caption: "C", columns, rows: rows.slice(0, 3) }));
    assertEqual(plain.querySelectorAll("[aria-rowcount], [aria-rowindex]").length, 0, "No position attributes");
    assertThrowsType(() => DataGrid({ caption: "C", columns, rows: rows.slice(0, 3), rowCount: 2 }), /do not fit/);
    assertThrowsType(() => DataGrid({ caption: "C", columns, rows: [], rowCount: -1 }), /non-negative integers/);
    assertThrowsType(() => DataGrid({ caption: "C", columns, rows: [], firstRowIndex: 1 }), /requires rowCount/);
});

// --- Mounted grid ---

function mount(overrides = {}) {
    const root = document.createElement("section");
    sandbox().append(root);
    const handle = mountDataGrid(root, { id: "people", caption: "People", locale: "en-US", columns, rows, ...overrides },
        { filterDebounceMs: DEBOUNCE });
    return { root, handle };
}
const pagerButton = (root, action) => root.querySelector(`[data-page-action="${action}"]`);
const bodyRows = (root) => [...root.querySelectorAll("tbody tr")];
const status = (root) => root.querySelector("[role=status]");
const select = (root) => root.querySelector("select");
function chooseSize(root, size) {
    select(root).value = String(size);
    select(root).dispatchEvent(new Event("input", { bubbles: true }));
}

test("mounted grid renders exactly one page with true row positions", () => {
    const { root } = mount();
    assertEqual(bodyRows(root).length, 10, "Ten rows");
    assertEqual(root.querySelector("table").getAttribute("aria-rowcount"), "48", "aria-rowcount");
    pagerButton(root, "next").click();
    assertDeepEqual(bodyRows(root).map((row) => row.getAttribute("aria-rowindex")).slice(0, 2), ["12", "13"], "Page 2 indexes");
    assertEqual(bodyRows(root)[0].cells[0].textContent, "Person 11", "Page 2 first row");
    assertEqual(status(root).textContent, "Page 2 of 5. Rows 11–20 of 47.", "Announcement");
});

test("number, first and last buttons jump to the right page", () => {
    const { root } = mount();
    pagerButton(root, "page-3").click();
    assertEqual(bodyRows(root)[0].cells[0].textContent, "Person 21", "Page 3");
    pagerButton(root, "last").click();
    assertEqual(bodyRows(root).length, 7, "Last page has 7 rows");
    pagerButton(root, "first").click();
    assertEqual(bodyRows(root)[0].cells[0].textContent, "Person 01", "Back to page 1");
});

test("focus stays on the pressed pager button", () => {
    const { root } = mount();
    pagerButton(root, "next").focus();
    pagerButton(root, "next").click();
    assert(document.activeElement === pagerButton(root, "next"), "Next keeps focus");
});

test("focus moves to the current page when the pressed button becomes disabled", () => {
    const { root } = mount();
    pagerButton(root, "last").focus();
    pagerButton(root, "last").click();
    assert(pagerButton(root, "last").disabled, "Last is disabled on the last page");
    assert(document.activeElement === pagerButton(root, "page-5"), "Focus on page 5");
});

test("page-size select changes rows per page without being rebuilt", () => {
    const { root } = mount();
    const before = select(root);
    assertEqual(root.ownerDocument.getElementById("people-page-size"), before, "Select id");
    assertEqual(root.querySelector("label[for=people-page-size]").textContent, "Rows per page", "Visible label");
    pagerButton(root, "page-2").click();
    chooseSize(root, 25);
    assert(select(root) === before, "Same select node");
    assertEqual(bodyRows(root).length, 25, "25 rows");
    assertEqual(root.querySelector("[aria-current=page]").textContent, "1", "Reset to page 1");
    assertEqual(status(root).textContent, "25 rows per page. Rows 1–25 of 47.", "Announcement");
});

test("filtering returns to page 1 and recounts pages", async () => {
    const { root } = mount();
    pagerButton(root, "page-4").click();
    const input = root.querySelector("input[type=search]");
    input.value = "red";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(DEBOUNCE + 30);
    assertEqual(root.querySelector("[aria-current=page]").textContent, "1", "Page 1");
    assertEqual(root.querySelectorAll("[data-page-action^=page-]").length, 2, "Two page buttons");
    assertEqual(root.querySelector("table").getAttribute("aria-rowcount"), "17", "16 rows plus header");
});

test("no matches shows the empty state and a pager with no page buttons", async () => {
    const { root } = mount();
    const input = root.querySelector("input[type=search]");
    input.value = "nobody";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(DEBOUNCE + 30);
    assertEqual(bodyRows(root).length, 1, "One empty-state row");
    assertEqual(root.querySelectorAll("[data-page-action^=page-]").length, 0, "No page buttons");
    assert([...root.querySelectorAll("nav button")].every((button) => button.disabled), "Edge buttons disabled");
    assert(!root.querySelector("table").hasAttribute("aria-rowcount"), "No aria-rowcount on empty grid");
});

test("pager controls meet the 24 x 24 px target size", () => {
    const { root } = mount();
    for (const control of [...root.querySelectorAll("nav button"), select(root)]) {
        const box = control.getBoundingClientRect();
        assert(box.width >= 24 && box.height >= 24, `${control.textContent || "select"} is ${box.width}x${box.height}`);
    }
});

test("paginated grid still contains zero div or span elements", () => {
    const { root } = mount();
    pagerButton(root, "next").click();
    assertEqual(root.querySelectorAll("div, span").length, 0, "div/span count");
});
