import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

function renderApp() {
    return render(
        <StrictMode>
            <App />
        </StrictMode>
    );
}

let errors;
let warnings;
beforeEach(() => {
    errors = vi.spyOn(console, "error");
    warnings = vi.spyOn(console, "warn");
});
afterEach(() => {
    // StrictMode double-renders: any update loop or "Maximum update depth" would surface here.
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
    vi.restoreAllMocks();
});

const field = (label) => screen.getByRole("textbox", { name: new RegExp(`^${label}`) });
const secret = (label) => screen.getByLabelText(new RegExp(`^${label}`));

it("blocks an empty submission and shows every required error next to its field", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Submit" }));
    for (const label of ["Full name", "Email", "Age", "Password", "Confirm password"]) {
        const input = secret(label);
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription(`${label} is required`);
    }
    expect(screen.getByRole("status")).toHaveTextContent("");
});

it("validates while typing and submits once everything is valid", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(field("Full name"), "Nguyen Minh Anh");
    await user.type(field("Email"), "minh.anh@");
    expect(field("Email")).toHaveAccessibleDescription("Enter a valid email address");
    await user.type(field("Email"), "example.com");
    expect(field("Email")).toHaveAttribute("aria-invalid", "false");
    await user.type(field("Age"), "17");
    expect(field("Age")).toHaveAccessibleDescription("Enter a whole number from 18 to 120");
    await user.clear(field("Age"));
    await user.type(field("Age"), "27");
    await user.type(secret("Password"), "secret123");
    await user.type(secret("Confirm password"), "secret12");
    expect(secret("Confirm password")).toHaveAccessibleDescription("Passwords must match");
    await user.type(secret("Confirm password"), "3");
    expect(secret("Confirm password")).toHaveAttribute("aria-invalid", "false");

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByRole("status")).toHaveTextContent("Submitted 1 time.");
});

it("re-checks Confirm password when Password changes afterwards (cross-field, no effect)", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(secret("Password"), "secret123");
    await user.type(secret("Confirm password"), "secret123");
    expect(secret("Confirm password")).toHaveAttribute("aria-invalid", "false");
    await user.type(secret("Password"), "4");
    expect(secret("Confirm password")).toHaveAccessibleDescription("Passwords must match");
});
