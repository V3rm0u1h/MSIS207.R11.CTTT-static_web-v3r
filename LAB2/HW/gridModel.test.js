import { createFormatters } from "./dataGrid.js";
import {
    createGridController,
    describeSnapshot,
    filterRows,
    nextSortDirection,
    normalizeSearchText,
    sortRows
} from "./gridModel.js";
import { test, assert, assertEqual, assertDeepEqual, assertThrowsType } from "./testHarness.js";

// PRD 2 — sorting and filtering model (DOM-free).

const columns = [
    { key: "name", label: "Name", type: "string", sortable: true, filterable: true },
    { key: "team", label: "Team", type: "string", sortable: true, filterable: true },
    { key: "salary", label: "Salary", type: "number", sortable: true },
    { key: "startDate", label: "Start date", type: "date", sortable: true }
];
const rows = [
    { name: "Nguyễn Văn An", team: "Design", salary: 50000, startDate: "2021-06-01" },
    { name: "Trần Bình", team: "Engineering", salary: 72000, startDate: "2019-01-15" },
    { name: "Lê Đức", team: "Design", salary: 50000, startDate: "2023-11-30" },
    { name: "Phạm Chi", team: "Support", salary: null, startDate: "2020-03-09" }
];
const locale = "en-US";
const formatters = createFormatters(locale);
const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
const column = (key) => columns.find((candidate) => candidate.key === key);
const names = (list) => list.map((row) => row.name);

test("sort direction cycles none -> ascending -> descending -> none", () => {
    assertEqual(nextSortDirection("none"), "ascending", "From none");
    assertEqual(nextSortDirection("ascending"), "descending", "From ascending");
    assertEqual(nextSortDirection("descending"), "none", "From descending");
    assertThrowsType(() => nextSortDirection("up"), /unknown sort direction/);
});

test("search text ignores case and Vietnamese diacritics", () => {
    assertEqual(normalizeSearchText("Nguyễn ĐỨC", locale), "nguyen duc", "Normalized text");
});

test("numbers sort numerically, with empty values last in both directions", () => {
    assertDeepEqual(sortRows(rows, column("salary"), "ascending", collator).map((row) => row.salary),
        [50000, 50000, 72000, null], "Ascending");
    assertDeepEqual(sortRows(rows, column("salary"), "descending", collator).map((row) => row.salary),
        [72000, 50000, 50000, null], "Descending");
});

test("sorting is stable: ties keep their original order in both directions", () => {
    const tied = (direction) => sortRows(rows, column("salary"), direction, collator)
        .filter((row) => row.salary === 50000).map((row) => row.name);
    assertDeepEqual(tied("ascending"), ["Nguyễn Văn An", "Lê Đức"], "Ascending ties");
    assertDeepEqual(tied("descending"), ["Nguyễn Văn An", "Lê Đức"], "Descending ties");
});

test("dates sort chronologically", () => {
    assertDeepEqual(sortRows(rows, column("startDate"), "ascending", collator).map((row) => row.startDate),
        ["2019-01-15", "2020-03-09", "2021-06-01", "2023-11-30"], "Chronological order");
});

test("strings sort with locale rules and natural numbers", () => {
    const items = [{ name: "Item 10" }, { name: "item 2" }, { name: "Item 1" }];
    const nameColumn = { key: "name", label: "Name", type: "string", sortable: true };
    assertDeepEqual(names(sortRows(items, nameColumn, "ascending", collator)), ["Item 1", "item 2", "Item 10"], "Natural order");
});

test("sorting with direction none returns the original order without mutating input", () => {
    const before = names(rows);
    const sorted = sortRows(rows, column("name"), "none", collator);
    assert(sorted !== rows, "Returns a new array");
    assertDeepEqual(names(sorted), before, "Original order");
    sortRows(rows, column("name"), "descending", collator);
    assertDeepEqual(names(rows), before, "Input untouched");
});

test("filter matches filterable columns case-insensitively", () => {
    assertDeepEqual(names(filterRows(rows, columns, "DESIGN", formatters, locale)), ["Nguyễn Văn An", "Lê Đức"], "Team match");
    assertDeepEqual(names(filterRows(rows, columns, "nguyen", formatters, locale)), ["Nguyễn Văn An"], "Diacritic-free match");
    assertDeepEqual(names(filterRows(rows, columns, "duc", formatters, locale)), ["Lê Đức"], "đ matches d");
});

test("filter ignores non-filterable columns", () => {
    assertEqual(filterRows(rows, columns, "72,000", formatters, locale).length, 0, "Salary is not filterable");
});

test("filter matches the displayed text of filterable number columns", () => {
    const numberColumns = [{ key: "salary", label: "Salary", type: "number", filterable: true }];
    assertEqual(filterRows(rows, numberColumns, "72,0", formatters, locale).length, 1, "Formatted number match");
});

test("blank filter keeps all rows; regex and HTML characters match literally", () => {
    assertEqual(filterRows(rows, columns, "   ", formatters, locale).length, rows.length, "Whitespace only");
    assertEqual(filterRows(rows, columns, ".*", formatters, locale).length, 0, "Regex is literal");
    const hostile = [{ name: "<b>x</b>", team: "A" }];
    assertEqual(filterRows(hostile, columns, "<b>", formatters, locale).length, 1, "HTML is literal");
});

test("controller toggles one column through the full cycle", () => {
    const controller = createGridController({ columns, rows, locale });
    controller.toggleSort("name");
    assertEqual(controller.getSnapshot().sortDirection, "ascending", "First press");
    controller.toggleSort("name");
    assertEqual(controller.getSnapshot().sortDirection, "descending", "Second press");
    controller.toggleSort("name");
    const cleared = controller.getSnapshot();
    assertEqual(cleared.sortDirection, "none", "Third press");
    assertEqual(cleared.sortKey, null, "Sort key cleared");
    assertDeepEqual(names(cleared.rows), names(rows), "Original order restored");
});

test("switching to another column starts at ascending", () => {
    const controller = createGridController({ columns, rows, locale });
    controller.toggleSort("name");
    controller.toggleSort("name");
    controller.toggleSort("salary");
    const snapshot = controller.getSnapshot();
    assertEqual(snapshot.sortKey, "salary", "Active key");
    assertEqual(snapshot.sortDirection, "ascending", "Fresh direction");
});

test("controller filters before sorting", () => {
    const controller = createGridController({ columns, rows, locale });
    controller.setFilter("design");
    controller.toggleSort("startDate");
    controller.toggleSort("startDate");
    const snapshot = controller.getSnapshot();
    assertDeepEqual(names(snapshot.rows), ["Lê Đức", "Nguyễn Văn An"], "Filtered then sorted descending");
    assertEqual(snapshot.visibleCount, 2, "Visible count");
    assertEqual(snapshot.totalCount, 4, "Total count");
    assert(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.rows), "Snapshot is immutable");
});

test("each real change notifies exactly once; unchanged filter text does not notify", () => {
    const controller = createGridController({ columns, rows, locale });
    let calls = 0;
    controller.subscribe(() => { calls += 1; });
    controller.toggleSort("team");
    controller.setFilter("an");
    controller.setFilter("an ");
    controller.setFilter("an");
    assertEqual(calls, 2, "Notification count");
});

test("controller rejects bad input", () => {
    assertThrowsType(() => createGridController(null), /plain object/);
    assertThrowsType(() => createGridController({ columns, rows: [{ name: 1 }] }), /must be a string/);
    const controller = createGridController({ columns: [...columns, { key: "note", label: "Note", type: "string" }], rows, locale });
    assertThrowsType(() => controller.toggleSort("note"), /not a sortable column/);
    assertThrowsType(() => controller.toggleSort("missing"), /not a sortable column/);
    assertThrowsType(() => controller.setFilter(5), /filter text must be a string/);
    assertThrowsType(() => controller.subscribe("nope"), /subscriber/);
});

test("announcements describe what changed and the row counts", () => {
    const base = { sortKey: null, sortDirection: "none", filterText: "", visibleCount: 4, totalCount: 4 };
    assertEqual(describeSnapshot({ ...base, lastChange: null }, columns), "4 of 4 rows shown.", "Initial");
    assertEqual(describeSnapshot({ ...base, lastChange: "sort", sortKey: "salary", sortDirection: "descending" }, columns),
        "Sorted by Salary, descending. 4 of 4 rows shown.", "Sorted");
    assertEqual(describeSnapshot({ ...base, lastChange: "sort" }, columns), "Sorting cleared. 4 of 4 rows shown.", "Sort cleared");
    assertEqual(describeSnapshot({ ...base, lastChange: "filter", filterText: " de ", visibleCount: 2 }, columns),
        "Filtered by “de”. 2 of 4 rows shown.", "Filtered");
    assertEqual(describeSnapshot({ ...base, lastChange: "filter" }, columns), "Filter cleared. 4 of 4 rows shown.", "Filter cleared");
    assertEqual(describeSnapshot({ ...base, visibleCount: 1, totalCount: 1, lastChange: null }, columns), "1 of 1 row shown.", "Singular");
});
