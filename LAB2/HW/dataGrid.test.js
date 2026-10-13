import { DataGrid, mountDataGrid, parseIsoDate, DEFAULT_EMPTY_MESSAGE } from "./dataGrid.js";

const resultsElement = document.querySelector("#test-results");
const summaryElement = document.querySelector("#test-summary");
const sandbox = document.querySelector("#test-sandbox");

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }
function assert(condition, message) { if (!condition) throw new Error(message || "Assertion failed"); }
function assertEqual(actual, expected, message) {
    if (actual !== expected) throw new Error(`${message || "Values differ"}: expected ${String(expected)}, received ${String(actual)}`);
}
function assertThrowsType(callback, pattern) {
    let error;
    try { callback(); } catch (caught) { error = caught; }
    assert(error instanceof TypeError, "Expected a TypeError to be thrown");
    if (pattern) assert(pattern.test(error.message), `Unexpected error message: ${error.message}`);
}

const columns = [
    { key: "name", label: "Name", type: "string", sortable: true, filterable: true },
    { key: "salary", label: "Salary", type: "number", sortable: true },
    { key: "startDate", label: "Start date", type: "date" }
];
const rows = [
    { name: "Le Giang", salary: 72000, startDate: "2024-03-05" },
    { name: "Tran An", salary: 1234.5, startDate: "2019-12-31" }
];

function mount(overrides = {}) {
    const root = document.createElement("section");
    sandbox.append(root);
    const grid = mountDataGrid(root, { caption: "Employees", locale: "en-US", columns, rows, ...overrides });
    return { root, grid };
}

test("renders section > table with caption, thead and tbody", () => {
    const { grid } = mount();
    assertEqual(grid.tagName, "SECTION", "Wrapper element");
    const table = grid.querySelector("table");
    assert(table, "Table exists");
    assertEqual(table.children[0].tagName, "CAPTION", "Caption is the first table child");
    assertEqual(table.caption.textContent, "Employees", "Caption text");
    assertEqual(table.tHead.rows.length, 1, "One header row");
    assertEqual(table.tBodies[0].rows.length, rows.length, "One body row per data row");
});

test("every column header is a th with scope=col", () => {
    const headers = mount().grid.querySelectorAll("thead th");
    assertEqual(headers.length, columns.length, "Header count");
    headers.forEach((th, index) => {
        assertEqual(th.getAttribute("scope"), "col", `Header ${index} scope`);
        assertEqual(th.textContent, columns[index].label, `Header ${index} label`);
    });
});

test("first cell in each body row is a row header with scope=row", () => {
    for (const row of mount().grid.querySelectorAll("tbody tr")) {
        assertEqual(row.cells[0].tagName, "TH", "Row header element");
        assertEqual(row.cells[0].getAttribute("scope"), "row", "Row header scope");
        assert([...row.cells].slice(1).every((cell) => cell.tagName === "TD"), "Other cells are td");
    }
});

test("every th in the grid has a scope attribute", () => {
    assert([...mount().grid.querySelectorAll("th")].every((th) => th.hasAttribute("scope")), "All th have scope");
});

test("grid contains zero div or span elements", () => {
    const { grid } = mount();
    assertEqual(grid.querySelectorAll("div, span").length, 0, "div/span count");
    assertEqual(mount({ rows: [] }).grid.querySelectorAll("div, span").length, 0, "div/span count in empty state");
});

test("region is labelled by the caption and is keyboard-focusable for scrolling", () => {
    const { grid } = mount({ id: "staff" });
    assertEqual(grid.id, "staff", "Grid id");
    assertEqual(grid.getAttribute("aria-labelledby"), "staff-caption", "aria-labelledby");
    assertEqual(grid.querySelector("caption").id, "staff-caption", "Caption id");
    assertEqual(grid.tabIndex, 0, "Region tabindex");
});

test("HTML in cell values renders as literal text", () => {
    const hostile = "<img src=x onerror=alert(1)>";
    const { grid } = mount({ rows: [{ name: hostile, salary: 1, startDate: "2024-01-01" }] });
    assertEqual(grid.querySelector("tbody th").textContent, hostile, "Literal text");
    assertEqual(grid.querySelectorAll("img").length, 0, "No img element created");
});

test("HTML in caption and labels renders as literal text", () => {
    const { grid } = mount({
        caption: "<b>Caption</b>",
        columns: [{ key: "name", label: "<i>Name</i>", type: "string" }],
        rows: [{ name: "A" }]
    });
    assertEqual(grid.querySelector("caption").textContent, "<b>Caption</b>", "Caption literal");
    assertEqual(grid.querySelectorAll("b, i").length, 0, "No markup elements created");
});

test("empty rows render one full-width empty-state row", () => {
    const { grid } = mount({ rows: [] });
    const bodyRows = grid.querySelectorAll("tbody tr");
    assertEqual(bodyRows.length, 1, "Single row");
    const cell = bodyRows[0].cells[0];
    assertEqual(cell.tagName, "TD", "Empty cell element");
    assertEqual(cell.colSpan, columns.length, "colspan covers all columns");
    assertEqual(cell.textContent, DEFAULT_EMPTY_MESSAGE, "Default message");
});

test("custom empty message is used", () => {
    assertEqual(mount({ rows: [], emptyMessage: "Nobody here" }).grid.querySelector("tbody td").textContent,
        "Nobody here", "Custom message");
});

test("numbers are formatted with Intl.NumberFormat and right-aligned", () => {
    const { grid } = mount();
    const cells = grid.querySelectorAll("tbody tr");
    assertEqual(cells[0].cells[1].textContent, "72,000", "Integer formatting");
    assertEqual(cells[1].cells[1].textContent, "1,234.5", "Decimal formatting");
    assert(cells[0].cells[1].classList.contains("data-grid__cell--number"), "Number cell class");
    assertEqual(getComputedStyle(cells[0].cells[1]).textAlign, "end", "Number cell aligned to end");
    assertEqual(getComputedStyle(grid.querySelectorAll("thead th")[1]).textAlign, "end", "Number header aligned to end");
});

test("dates render as <time datetime> with a formatted label", () => {
    const time = mount().grid.querySelector("tbody tr td:last-child time");
    assert(time, "time element exists");
    assertEqual(time.getAttribute("datetime"), "2024-03-05", "Machine-readable date");
    assertEqual(time.textContent, "Mar 5, 2024", "Human-readable date");
});

test("dates do not shift across time zones", () => {
    const { grid } = mount({ rows: [{ name: "A", salary: 1, startDate: "2024-01-01" }] });
    assertEqual(grid.querySelector("time").textContent, "Jan 1, 2024", "First day of year stays");
});

test("null and undefined values render as empty cells", () => {
    const { grid } = mount({ rows: [{ name: "A", salary: null }] });
    const cells = grid.querySelector("tbody tr").cells;
    assertEqual(cells[1].textContent, "", "Null number");
    assertEqual(cells[2].textContent, "", "Missing date");
});

test("parseIsoDate rejects impossible and malformed dates", () => {
    assert(parseIsoDate("2024-02-29") !== null, "Leap day accepted");
    assertEqual(parseIsoDate("2023-02-29"), null, "Non-leap Feb 29 rejected");
    assertEqual(parseIsoDate("2024-02-30"), null, "Feb 30 rejected");
    assertEqual(parseIsoDate("2024-3-5"), null, "Unpadded date rejected");
    assertEqual(parseIsoDate(20240305), null, "Number rejected");
});

test("invalid columns throw TypeError", () => {
    const base = { caption: "C", rows: [] };
    assertThrowsType(() => DataGrid({ ...base, columns: "name" }), /columns must be a non-empty array/);
    assertThrowsType(() => DataGrid({ ...base, columns: [] }), /columns must be a non-empty array/);
    assertThrowsType(() => DataGrid({ ...base, columns: [null] }), /plain object/);
    assertThrowsType(() => DataGrid({ ...base, columns: [{ key: "a", label: "A", type: "string", width: 3 }] }), /unknown property "width"/);
    assertThrowsType(() => DataGrid({ ...base, columns: [{ key: "a b", label: "A", type: "string" }] }), /key/);
    assertThrowsType(() => DataGrid({ ...base, columns: [
        { key: "a", label: "A", type: "string" }, { key: "a", label: "B", type: "number" }
    ] }), /duplicate column key "a"/);
    assertThrowsType(() => DataGrid({ ...base, columns: [{ key: "a", label: " ", type: "string" }] }), /label/);
    assertThrowsType(() => DataGrid({ ...base, columns: [{ key: "a", label: "A", type: "boolean" }] }), /type must be one of/);
    assertThrowsType(() => DataGrid({ ...base, columns: [{ key: "a", label: "A", type: "string", sortable: "yes" }] }), /sortable/);
});

test("invalid rows throw TypeError", () => {
    const base = { caption: "C", columns };
    assertThrowsType(() => DataGrid({ ...base, rows: "rows" }), /rows must be an array/);
    assertThrowsType(() => DataGrid({ ...base, rows: [new Date()] }), /rows\[0\] must be a plain object/);
    assertThrowsType(() => DataGrid({ ...base, rows: [{ name: 42 }] }), /rows\[0\]\.name must be a string/);
    assertThrowsType(() => DataGrid({ ...base, rows: [{ name: "A", salary: "100" }] }), /salary must be a finite number/);
    assertThrowsType(() => DataGrid({ ...base, rows: [{ name: "A", salary: Number.NaN }] }), /finite number/);
    assertThrowsType(() => DataGrid({ ...base, rows: [{ name: "A", startDate: "2024-02-30" }] }), /YYYY-MM-DD/);
});

test("invalid grid props throw TypeError", () => {
    const base = { columns, rows };
    assertThrowsType(() => DataGrid(null), /props must be a plain object/);
    assertThrowsType(() => DataGrid({ ...base }), /caption/);
    assertThrowsType(() => DataGrid({ ...base, caption: "" }), /caption/);
    assertThrowsType(() => DataGrid({ ...base, caption: "C", id: "1bad" }), /id must start with a letter/);
    assertThrowsType(() => DataGrid({ ...base, caption: "C", locale: 5 }), /locale/);
    assertThrowsType(() => DataGrid({ ...base, caption: "C", emptyMessage: "" }), /emptyMessage/);
});

test("validation failure leaves the mount root untouched", () => {
    const root = document.createElement("section");
    const existing = document.createElement("p");
    existing.textContent = "previous content";
    root.append(existing);
    assertThrowsType(() => mountDataGrid(root, { caption: "C", columns, rows: [{ name: 1 }] }));
    assertEqual(root.childNodes.length, 1, "Root child count");
    assert(root.firstChild === existing, "Existing content kept");
});

test("frozen inputs are accepted and not mutated", () => {
    const frozenColumns = Object.freeze(columns.map((column) => Object.freeze({ ...column })));
    const frozenRows = Object.freeze(rows.map((row) => Object.freeze({ ...row })));
    const { grid } = mount({ columns: frozenColumns, rows: frozenRows });
    assertEqual(grid.querySelectorAll("tbody tr").length, 2, "Rendered from frozen input");
});

// --- Theme contrast: read the live tokens from dataGrid.css and measure them ---
function hexToLuminance(hex) {
    const value = hex.trim().replace("#", "");
    const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
        .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrastRatio(foreground, background) {
    const [light, dark] = [hexToLuminance(foreground), hexToLuminance(background)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}
function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

test("text tokens meet 4.5:1 on every background", () => {
    for (const foreground of ["--grid-text", "--grid-muted"]) {
        for (const background of ["--grid-surface", "--grid-header-bg", "--grid-zebra-bg"]) {
            const ratio = contrastRatio(token(foreground), token(background));
            assert(ratio >= 4.5, `${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
        }
    }
});

test("border and focus tokens meet 3:1 on every background", () => {
    for (const foreground of ["--grid-border", "--grid-focus"]) {
        for (const background of ["--grid-surface", "--grid-header-bg", "--grid-zebra-bg"]) {
            const ratio = contrastRatio(token(foreground), token(background));
            assert(ratio >= 3, `${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
        }
    }
});

let failures = 0;
for (const { name, callback } of tests) {
    let passed = true;
    let detail = "";
    try {
        callback();
    } catch (error) {
        passed = false;
        failures += 1;
        detail = ` — ${error.message}`;
    }
    const item = document.createElement("li");
    item.dataset.result = passed ? "pass" : "fail";
    item.textContent = `${passed ? "PASS" : "FAIL"}: ${name}${detail}`;
    resultsElement.append(item);
    (passed ? console.log : console.error)(item.textContent);
}
sandbox.replaceChildren();
summaryElement.textContent = `${tests.length - failures}/${tests.length} Data-Grid PRD 1 tests passed.`;
summaryElement.dataset.result = failures === 0 ? "pass" : "fail";
