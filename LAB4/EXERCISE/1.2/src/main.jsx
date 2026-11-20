import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
    throw new Error("Missing #root element in index.html");
}

// Router provider lives at the entry point; App only declares routes.
createRoot(container).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);
