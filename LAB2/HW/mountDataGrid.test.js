import { mountDataGrid, DEFAULT_FILTER_DEBOUNCE_MS } from "./mountDataGrid.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType, sandbox, wait } from "./testHarness.js";

// PRD 2 — sorting and filtering in the real DOM.

const DEBOUNCE = 20;
const columns = [
    { key: "name", label: "Name", type: "string", sortable: true, filterable: true },
    { key: "team", label: "Team", type: "string", filterable: true },
    { key: "salary", label: "Salary", type: "number", sortable: true }
];
const rows = [
    { name: "Chi", team: "Design", salary: 61000 },
    { name: "An", team: "Engineering", salary: 72000 },
    { name: "Binh", team: "Design", salary: 50000 }
];

function mount(overrides = {}) {
    const root = document.createElement("section");
    sandbox().append(root);
    const handle = mountDataGrid(root, { id: "people", caption: "People", locale: "en-US", columns, rows, ...overrides },
        { filterDebounceMs: DEBOUNCE });
    return { root, handle };
}
const bodyNames = (root) => [...root.querySelectorAll("tbody tr")].map((row) => row.cells[0].textContent);
const sortButton = (root, key) => root.querySelector(`[data-sort-key="${key}"]`);
const status = (root) => root.querySelector("[role=status]");
function typeFilter(root, value) {
    const input = root.querySelector("input[type=search]");
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return input;
}

test("mount renders filter form, status and grid in that order", () => {
    const { root } = mount();
    assertDeepEqual([...root.children].map((child) => child.tagName), ["FORM", "P", "SECTION"], "Child order");
    const form = root.querySelector("form");
    assertEqual(form.getAttribute("role"), "search", "Search landmark");
    assertEqual(form.getAttribute("aria-label"), "Filter People", "Landmark label");
    const input = form.querySelector("input");
    assertEqual(form.querySelector("label").getAttribute("for"), input.id, "Label is linked to the input");
    assertEqual(input.type, "search", "Input type");
    assertEqual(root.ownerDocument.getElementById(input.getAttribute("aria-describedby")).textContent,
        "Searches Name and Team.", "Hint lists filterable columns");
    assertEqual(status(root).getAttribute("aria-live"), "polite", "Polite live region");
    assertEqual(status(root).textContent, "3 of 3 rows shown.", "Initial status");
});

test("filter form is omitted when no column is filterable", () => {
    const { root } = mount({ columns: columns.map(({ filterable, ...rest }) => rest) });
    assertEqual(root.querySelector("form"), null, "No form");
});

test("sortable headers hold a native button; others are plain text", () => {
    const { root } = mount();
    const headers = root.querySelectorAll("thead th");
    assertEqual(headers[0].querySelector("button").type, "button", "Name is a button");
    assertEqual(headers[0].querySelector("button").textContent, "Name", "Button name is the label only");
    assertEqual(headers[1].querySelector("button"), null, "Team is not sortable");
    assert([...headers].every((th) => !th.hasAttribute("aria-sort")), "No aria-sort before sorting");
});

test("clicking a sort button cycles aria-sort, row order and the announcement", () => {
    const { root } = mount();
    sortButton(root, "name").click();
    assertEqual(sortButton(root, "name").closest("th").getAttribute("aria-sort"), "ascending", "First click");
    assertDeepEqual(bodyNames(root), ["An", "Binh", "Chi"], "Ascending rows");
    assertEqual(status(root).textContent, "Sorted by Name, ascending. 3 of 3 rows shown.", "Ascending message");

    sortButton(root, "name").click();
    assertEqual(sortButton(root, "name").closest("th").getAttribute("aria-sort"), "descending", "Second click");
    assertDeepEqual(bodyNames(root), ["Chi", "Binh", "An"], "Descending rows");

    sortButton(root, "name").click();
    assert(!sortButton(root, "name").closest("th").hasAttribute("aria-sort"), "Third click clears aria-sort");
    assertDeepEqual(bodyNames(root), ["Chi", "An", "Binh"], "Original order");
    assertEqual(status(root).textContent, "Sorting cleared. 3 of 3 rows shown.", "Cleared message");
});

test("only the active column carries aria-sort", () => {
    const { root } = mount();
    sortButton(root, "name").click();
    sortButton(root, "salary").click();
    const sorted = [...root.querySelectorAll("th[aria-sort]")];
    assertEqual(sorted.length, 1, "One aria-sort header");
    assertEqual(sorted[0].textContent, "Salary", "Salary is active");
    assertDeepEqual(bodyNames(root), ["Binh", "Chi", "An"], "Rows by salary");
});

test("focus stays on the sort button after the grid re-renders", () => {
    const { root } = mount();
    sortButton(root, "salary").focus();
    sortButton(root, "salary").click();
    assert(document.activeElement === sortButton(root, "salary"), "Focus is on the new Salary button");
});

test("filter input is debounced and then filters rows", async () => {
    const { root } = mount();
    typeFilter(root, "design");
    assertEqual(bodyNames(root).length, 3, "No change before the debounce");
    await wait(DEBOUNCE + 30);
    assertDeepEqual(bodyNames(root), ["Chi", "Binh"], "Filtered rows");
    assertEqual(status(root).textContent, "Filtered by “design”. 2 of 3 rows shown.", "Filter message");
});

test("typing never rebuilds or blurs the filter input", async () => {
    const { root } = mount();
    const input = root.querySelector("input[type=search]");
    input.focus();
    typeFilter(root, "an");
    await wait(DEBOUNCE + 30);
    assert(root.querySelector("input[type=search]") === input, "Same input node");
    assert(document.activeElement === input, "Input keeps focus");
    assertEqual(input.value, "an", "Value kept");
});

test("rapid typing produces exactly one update and one announcement", async () => {
    const { root, handle } = mount();
    let updates = 0;
    handle.controller.subscribe(() => { updates += 1; });
    const messages = [];
    new MutationObserver(() => messages.push(status(root).textContent))
        .observe(status(root), { childList: true, characterData: true, subtree: true });
    for (const value of ["b", "bi", "bin", "binh"]) typeFilter(root, value);
    await wait(DEBOUNCE + 30);
    assertEqual(updates, 1, "Controller updates");
    assertEqual(new Set(messages).size, 1, "Distinct announcements");
    assertDeepEqual(bodyNames(root), ["Binh"], "Final filter applied");
});

test("submitting the filter applies it immediately and prevents navigation", () => {
    const { root } = mount();
    typeFilter(root, "engineering");
    let prevented = false;
    // Listen above the delegation root so the grid's handler has already run.
    sandbox().addEventListener("submit", (event) => { prevented = event.defaultPrevented; }, { once: true });
    root.querySelector("form").requestSubmit();
    assert(prevented, "Default submit prevented");
    assertDeepEqual(bodyNames(root), ["An"], "Applied without waiting");
});

test("no matches shows the empty state with the query as literal text", async () => {
    const { root } = mount();
    typeFilter(root, "<img src=x onerror=alert(1)>");
    await wait(DEBOUNCE + 30);
    const cell = root.querySelector("tbody td");
    assertEqual(cell.textContent, "No rows match “<img src=x onerror=alert(1)>”.", "Empty message");
    assertEqual(cell.colSpan, columns.length, "Full-width cell");
    assertEqual(root.querySelectorAll("img").length, 0, "No img element");
    assertEqual(status(root).textContent, "Filtered by “<img src=x onerror=alert(1)>”. 0 of 3 rows shown.", "Status");
});

test("sort and filter combine", async () => {
    const { root } = mount();
    sortButton(root, "salary").click();
    sortButton(root, "salary").click();
    typeFilter(root, "design");
    await wait(DEBOUNCE + 30);
    assertDeepEqual(bodyNames(root), ["Chi", "Binh"], "Design rows by salary descending");
    assertEqual(root.querySelector("th[aria-sort]").getAttribute("aria-sort"), "descending", "Sort kept after filter");
});

test("mounted grid contains zero div or span elements", () => {
    const { root } = mount();
    sortButton(root, "name").click();
    assertEqual(root.querySelectorAll("div, span").length, 0, "div/span count");
});

test("dispose clears the root and cancels a pending filter", async () => {
    const { root, handle } = mount();
    let updates = 0;
    handle.controller.subscribe(() => { updates += 1; });
    typeFilter(root, "an");
    handle.dispose();
    await wait(DEBOUNCE + 30);
    assertEqual(root.childNodes.length, 0, "Root emptied");
    assertEqual(updates, 0, "Pending filter cancelled");
});

test("invalid mount arguments throw before touching the root", () => {
    const root = document.createElement("section");
    root.textContent = "keep";
    assertThrowsType(() => mountDataGrid(null, { caption: "C", columns, rows }), /mount root/);
    assertThrowsType(() => mountDataGrid(root, { caption: "", columns, rows }), /caption/);
    assertThrowsType(() => mountDataGrid(root, { caption: "C", columns, rows }, { filterDebounceMs: -1 }), /filterDebounceMs/);
    assertEqual(root.textContent, "keep", "Root untouched");
    assertEqual(DEFAULT_FILTER_DEBOUNCE_MS, 200, "Default debounce is 200 ms");
});
