import { resetCursor } from "./state.js";
import { setRenderCallback, useState } from "./useState.js";
import {
    attachRootEventDelegation,
    registerDelegatedHandler,
} from "./events.js";

const root = document.querySelector("#app-root");
if (!root) {
    throw new Error('Mini-React: expected a root element with id="app-root".');
}

// Create DOM safely with native APIs. Event props are registered with the
// delegation layer; no child receives its own addEventListener() call.
function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = options.text;
    if (options.attributes) {
        for (const [name, value] of Object.entries(options.attributes)) {
            element.setAttribute(name, value);
        }
    }
    if (options.onClick) {
        registerDelegatedHandler(element, "click", options.onClick);
    }
    for (const child of options.children ?? []) element.append(child);
    return element;
}

function DemoApp() {
    const [count, setCount] = useState(0);
    const [status, setStatus] = useState("Waiting for an interaction");

    const page = createElement("div", { className: "page-shell" });
    const header = createElement("header", { className: "site-header" });
    header.append(
        createElement("p", { className: "eyebrow", text: "MINI-REACT LAB · PRD 03" }),
        createElement("h1", { text: "One root. Many interactions." }),
        createElement("p", {
            className: "intro",
            text: "A tiny browser demo of delegated events and reactive state, built with vanilla JavaScript."
        })
    );

    const main = createElement("main", { className: "demo-grid" });
    const counterCard = createElement("section", {
        className: "panel",
        attributes: { "aria-labelledby": "counter-title" }
    });
    counterCard.append(
        createElement("p", { className: "panel-kicker", text: "INTERACTION 01" }),
        createElement("h2", { text: "Reactive counter", attributes: { id: "counter-title" } }),
        createElement("p", { className: "muted", text: "These controls use the same root click listener." })
    );

    const countDisplay = createElement("p", {
        className: "count-value",
        attributes: { "aria-live": "polite", "aria-atomic": "true" },
        text: String(count)
    });
    const controls = createElement("div", { className: "button-row" });
    controls.append(
        createElement("button", {
            className: "button button-secondary",
            text: "− Decrease",
            onClick: () => {
                setCount((previous) => previous - 1);
                setStatus("Counter decreased through root delegation");
            }
        }),
        createElement("button", {
            className: "button button-primary",
            children: [createElement("span", { text: "+ Increase" })],
            onClick: () => {
                setCount((previous) => previous + 1);
                setStatus("Counter increased through root delegation");
            }
        }),
        createElement("button", {
            className: "button button-quiet",
            text: "Reset",
            onClick: () => {
                setCount(0);
                setStatus("Counter reset through root delegation");
            }
        })
    );
    counterCard.append(countDisplay, controls);

    const statusCard = createElement("section", {
        className: "panel status-panel",
        attributes: { "aria-labelledby": "status-title" }
    });
    statusCard.append(
        createElement("p", { className: "panel-kicker", text: "INTERACTION 02" }),
        createElement("h2", { text: "Event status", attributes: { id: "status-title" } }),
        createElement("p", {
            className: "status-message",
            attributes: { "aria-live": "polite" },
            text: status
        }),
        createElement("p", {
            className: "muted small-copy",
            text: "Try clicking the text inside the Increase button. The nested span should still resolve to its button handler."
        }),
        createElement("button", {
            className: "button button-outline",
            text: "Show delegation proof",
            onClick: () => setStatus("One click listener on #app-root handled this action")
        })
    );

    const footer = createElement("footer", { className: "page-footer" });
    footer.append(
        createElement("span", { text: "Vanilla JavaScript · No framework" }),
        createElement("span", { text: "PRD 3 — Root Event Delegation" })
    );

    main.append(counterCard, statusCard);
    page.append(header, main, footer);
    return page;
}

function renderApp() {
    resetCursor();
    const nextTree = DemoApp();
    root.replaceChildren(nextTree);
}

// Root stays stable while its children are replaced during each render.
attachRootEventDelegation(root, ["click"]);
setRenderCallback(renderApp);
renderApp();
