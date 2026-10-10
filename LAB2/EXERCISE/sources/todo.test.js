import "./app.js";

const results = document.querySelector("#results");
const summary = document.querySelector("#summary");
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function test(name, callback) {
    const item = document.createElement("li");
    try {
        callback();
        item.className = "pass";
        item.textContent = `PASS — ${name}`;
        passed += 1;
    } catch (error) {
        item.className = "fail";
        item.textContent = `FAIL — ${name}: ${error instanceof Error ? error.message : String(error)}`;
        failed += 1;
    }
    results.append(item);
}

function input() {
    const node = document.querySelector("#task-input");
    assert(node, "task input should exist");
    return node;
}

function submit(text) {
    input().value = text;
    const form = document.querySelector(".task-form");
    assert(form, "task form should exist");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function taskItems() {
    return Array.from(document.querySelectorAll(".task-item"));
}

function filterButton(name) {
    const button = Array.from(document.querySelectorAll(".filter-button"))
        .find((item) => item.textContent === name);
    assert(button, `filter ${name} should exist`);
    return button;
}

function summaryText() {
    return document.querySelector(".summary-row")?.textContent ?? "";
}

test("renders semantic Todo application and initial empty state", () => {
    assert(document.querySelector("#app-root main") === null, "root should not add a nested main landmark");
    assert(document.querySelector("#app-title"), "application heading should exist");
    assert(document.querySelector(".task-form label[for='task-input']"), "input should have an associated label");
    assert(document.querySelector(".empty-state"), "initial empty state should exist");
});

test("rejects empty and whitespace-only submissions", () => {
    submit("   \t ");
    assert(taskItems().length === 0, "blank submission must not create a task");
    assert(document.querySelector("[role='status']")?.textContent.includes("Enter a task"), "validation feedback should be shown");
});

test("adds trimmed task text and updates counts", () => {
    submit("  Alpha task  ");
    assert(taskItems().length === 1, "one task should be rendered");
    assert(taskItems()[0].querySelector(".task-text").textContent === "Alpha task", "task text should be trimmed");
    assert(summaryText().includes("1 task total") && summaryText().includes("1 remaining"), "total and active counts should be one");
    submit("Beta task");
    assert(taskItems().length === 2, "second task should be appended");
});

test("toggles completion and recalculates active count", () => {
    const alpha = taskItems().find((item) => item.textContent.includes("Alpha task"));
    alpha.querySelector(".completion-button").click();
    const updatedAlpha = taskItems().find((item) => item.textContent.includes("Alpha task"));
    assert(updatedAlpha.classList.contains("is-completed"), "selected task should be completed");
    assert(summaryText().includes("1 remaining"), "active count should decrease");
    updatedAlpha.querySelector(".completion-button").click();
    assert(!taskItems().find((item) => item.textContent.includes("Alpha task")).classList.contains("is-completed"), "task should toggle back to active");
});

test("filters All, Active, and Completed without deleting hidden tasks", () => {
    const alpha = taskItems().find((item) => item.textContent.includes("Alpha task"));
    alpha.querySelector(".completion-button").click();
    filterButton("Completed").click();
    assert(taskItems().length === 1 && taskItems()[0].textContent.includes("Alpha task"), "Completed filter should show Alpha");
    assert(filterButton("Completed").getAttribute("aria-pressed") === "true", "selected filter should be exposed with aria-pressed");
    filterButton("Active").click();
    assert(taskItems().length === 1 && taskItems()[0].textContent.includes("Beta task"), "Active filter should show Beta");
    filterButton("All").click();
    assert(taskItems().length === 2, "All filter should preserve and show both tasks");
});

test("deletes only the selected task and updates total count", () => {
    const button = document.querySelector("[aria-label='Delete task: Beta task']");
    assert(button, "Beta delete button should exist");
    button.click();
    assert(taskItems().length === 1 && taskItems()[0].textContent.includes("Alpha task"), "only Beta should be removed");
    assert(summaryText().includes("1 task total"), "total count should update after deletion");
});

test("renders HTML-like task input as inert plain text", () => {
    const unsafeLookingText = "<img onerror=alert(1)>";
    submit(unsafeLookingText);
    const matching = taskItems().find((item) => item.querySelector(".task-text")?.textContent === unsafeLookingText);
    assert(matching, "input should be rendered as literal text");
    assert(matching.querySelector("img") === null, "input must not create an HTML image element");
});

summary.textContent = `${passed} passed · ${failed} failed`;
summary.style.fontWeight = "700";
summary.style.color = failed ? "#a33c3c" : "#245e43";
