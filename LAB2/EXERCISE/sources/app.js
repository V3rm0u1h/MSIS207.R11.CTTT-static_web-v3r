import { resetCursor } from "./state.js";
import { setRenderCallback, useState } from "./useState.js";
import { attachRootEventDelegation, registerDelegatedHandler } from "./events.js";

const root = document.querySelector("#app-root");
if (!root) {
    throw new Error('Mini-React: expected a root element with id="app-root".');
}

let nextTaskId = 1;

function element(tagName, options = {}) {
    const node = document.createElement(tagName);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    if (options.attributes) {
        for (const [name, value] of Object.entries(options.attributes)) {
            if (value !== null && value !== undefined && value !== false) {
                node.setAttribute(name, value === true ? "" : String(value));
            }
        }
    }
    if (options.onClick) registerDelegatedHandler(node, "click", options.onClick);
    if (options.onSubmit) registerDelegatedHandler(node, "submit", options.onSubmit);
    for (const child of options.children ?? []) node.append(child);
    return node;
}

function TodoApp() {
    // Keep hook calls unconditional and in the same order on every render.
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState("all");
    const [feedback, setFeedback] = useState("");

    const totalCount = tasks.length;
    const activeCount = tasks.filter((task) => !task.completed).length;
    const completedCount = totalCount - activeCount;
    const visibleTasks = tasks.filter((task) => {
        if (filter === "active") return !task.completed;
        if (filter === "completed") return task.completed;
        return true;
    });

    const shell = element("section", { className: "todo-shell", attributes: { "aria-labelledby": "app-title" } });

    const header = element("header", { className: "app-header" });
    header.append(
        element("p", { className: "eyebrow", text: "MINI-REACT · MILESTONE 04" }),
        element("h1", { text: "A little more done.", attributes: { id: "app-title" } }),
        element("p", { className: "intro", text: "A simple task space powered by your custom reactive engine." })
    );

    const entrySection = element("section", { className: "entry-section", attributes: { "aria-labelledby": "entry-title" } });
    entrySection.append(element("h2", { className: "visually-hidden", text: "Add a task", attributes: { id: "entry-title" } }));
    const form = element("form", {
        className: "task-form",
        attributes: { "aria-describedby": "form-help" },
        onSubmit: (event) => {
            event.preventDefault();
            const input = form.querySelector("#task-input");
            const submittedText = input?.value;
            if (typeof submittedText !== "string") {
                setFeedback("Please enter a task using the text field.");
                return;
            }
            const text = submittedText.trim();
            if (!text) {
                setFeedback("Enter a task before adding it.");
                document.querySelector("#task-input")?.focus();
                return;
            }
            const newTask = { id: nextTaskId++, text, completed: false };
            setTasks((previousTasks) => [...previousTasks, newTask]);
            setFeedback(`Added “${text}”.`);
            document.querySelector("#task-input")?.focus();
        }
    });
    const input = element("input", {
        className: "task-input",
        attributes: {
            id: "task-input",
            name: "task",
            type: "text",
            placeholder: "e.g. Finish the assignment",
            autocomplete: "off",
            maxlength: "180",
            "data-focus-key": "task-input"
        }
    });
    const label = element("label", { className: "visually-hidden", text: "Task description", attributes: { for: "task-input" } });
    const submit = element("button", { className: "add-button", text: "Add task", attributes: { type: "submit", "data-focus-key": "submit-task" } });
    form.append(label, input, submit);
    entrySection.append(form, element("p", { className: "form-help", text: "Press Enter or select Add task.", attributes: { id: "form-help" } }));

    const summary = element("section", { className: "summary-row", attributes: { "aria-label": "Task summary" } });
    const summaryText = element("p", { className: "summary-text" });
    summaryText.append(
        element("strong", { text: String(totalCount) }),
        document.createTextNode(totalCount === 1 ? " task total · " : " tasks total · "),
        element("strong", { text: String(activeCount) }),
        document.createTextNode(activeCount === 1 ? " remaining" : " remaining")
    );
    summary.append(summaryText, element("span", { className: "completed-count", text: `${completedCount} completed` }));

    const listSection = element("section", { className: "list-section", attributes: { "aria-labelledby": "list-title" } });
    const listHeading = element("header", { className: "list-heading" });
    listHeading.append(element("h2", { text: "Your tasks", attributes: { id: "list-title" } }));
    const filters = element("nav", { className: "filters", attributes: { "aria-label": "Filter tasks" } });
    const filterOptions = [
        { key: "all", label: "All", count: totalCount },
        { key: "active", label: "Active", count: activeCount },
        { key: "completed", label: "Completed", count: completedCount }
    ];
    for (const option of filterOptions) {
        filters.append(element("button", {
            className: `filter-button${filter === option.key ? " is-selected" : ""}`,
            text: option.label,
            attributes: { type: "button", "aria-pressed": String(filter === option.key), "data-focus-key": `filter-${option.key}` },
            onClick: () => setFilter(option.key)
        }));
    }
    listHeading.append(filters);

    const taskList = element("ul", { className: "task-list", attributes: { "aria-label": "Tasks" } });
    for (const task of visibleTasks) {
        const item = element("li", { className: `task-item${task.completed ? " is-completed" : ""}` });
        const toggle = element("button", {
            className: "completion-button",
            text: task.completed ? "✓" : "",
            attributes: {
                type: "button",
                "aria-label": `${task.completed ? "Mark active" : "Mark completed"}: ${task.text}`,
                "aria-pressed": String(task.completed),
                "data-focus-key": `toggle-${task.id}`
            },
            onClick: () => setTasks((previousTasks) => previousTasks.map((current) =>
                current.id === task.id ? { ...current, completed: !current.completed } : current
            ))
        });
        const taskText = element("span", { className: "task-text", text: task.text });
        const deleteButton = element("button", {
            className: "delete-button",
            text: "Delete",
            attributes: { type: "button", "aria-label": `Delete task: ${task.text}`, "data-focus-key": `delete-${task.id}` },
            onClick: () => {
                setTasks((previousTasks) => previousTasks.filter((current) => current.id !== task.id));
                setFeedback(`Deleted “${task.text}”.`);
            }
        });
        item.append(toggle, taskText, deleteButton);
        taskList.append(item);
    }

    listSection.append(listHeading);
    if (visibleTasks.length === 0) {
        let emptyTitle = "Nothing on your list yet";
        let emptyDescription = "Add a task above and it will show up here.";
        if (filter === "active" && totalCount > 0) {
            emptyTitle = "You're all caught up";
            emptyDescription = "There are no active tasks right now.";
        } else if (filter === "completed") {
            emptyTitle = "No completed tasks yet";
            emptyDescription = "Completed tasks will appear here.";
        }
        const emptyState = element("section", { className: "empty-state", attributes: { "aria-live": "polite" } });
        emptyState.append(
            element("span", { className: "empty-mark", text: "✳", attributes: { "aria-hidden": "true" } }),
            element("h3", { text: emptyTitle }),
            element("p", { text: emptyDescription })
        );
        listSection.append(emptyState);
    } else {
        listSection.append(taskList);
    }

    const feedbackNode = element("p", {
        className: "feedback",
        text: feedback,
        attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" }
    });

    const footer = element("footer", { className: "app-footer" });
    footer.append(
        element("span", { text: "Built with vanilla JavaScript" }),
        element("span", { text: "One state engine · One stable event root" })
    );

    shell.append(header, entrySection, summary, listSection, feedbackNode, footer);
    return shell;
}

function renderApp() {
    const activeElement = document.activeElement;
    const focusKey = root.contains(activeElement)
        ? activeElement.getAttribute("data-focus-key")
        : null;

    resetCursor();
    const nextTree = TodoApp();
    // Keep the root stable. Only replace descendants on each render.
    root.replaceChildren(nextTree);

    // Preserve keyboard focus across descendant replacement where possible.
    if (focusKey) {
        const focusTarget = Array.from(root.querySelectorAll("[data-focus-key]"))
            .find((node) => node.getAttribute("data-focus-key") === focusKey);
        (focusTarget ?? root.querySelector("#task-input"))?.focus();
    }
}

// PRD 3 delegation is reused. Submit is registered centrally for accessible
// Enter-key form submission; all click actions remain delegated too.
attachRootEventDelegation(root, ["click", "submit"]);
setRenderCallback(renderApp);
renderApp();
