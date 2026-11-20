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

const field = (label) => screen.getByLabelText(new RegExp(`^${label}`));
const inspector = () => screen.queryByRole("region", { name: "Submitted Form Data" });
const inspectorJson = () => JSON.parse(inspector().querySelector("pre").textContent);

async function fillValidForm(user, name = "Nguyen Minh Anh") {
    await user.type(field("Full name"), name);
    await user.type(field("Email"), "minh.anh@example.com");
    await user.type(field("Age"), "27");
    await user.type(field("Password"), "secret123");
    await user.type(field("Confirm password"), "secret123");
}

it("blocks an empty submission, shows every required error, and shows no inspector", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Submit" }));
    for (const label of ["Full name", "Email", "Age", "Password", "Confirm password"]) {
        const input = field(label);
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription(`${label} is required`);
    }
    expect(inspector()).not.toBeInTheDocument();
});

it("validates while typing and shows the JSON inspector after a valid submit", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(field("Email"), "minh.anh@");
    expect(field("Email")).toHaveAccessibleDescription("Enter a valid email address");
    await user.clear(field("Email"));
    await user.type(field("Age"), "17");
    expect(field("Age")).toHaveAccessibleDescription("Enter a whole number from 18 to 120");
    await user.clear(field("Age"));

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(inspectorJson()).toEqual({
        fullName: "Nguyen Minh Anh",
        email: "minh.anh@example.com",
        age: "27",
        password: "••••••••",
        confirmPassword: "••••••••"
    });
    expect(inspector()).not.toHaveTextContent("secret123"); // secrets never printed
});

it("keeps the last good result through an invalid submit and updates on the next valid one", async () => {
    const user = userEvent.setup();
    renderApp();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(inspectorJson().fullName).toBe("Nguyen Minh Anh");

    await user.clear(field("Email"));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(field("Email")).toHaveAttribute("aria-invalid", "true");
    expect(inspectorJson().email).toBe("minh.anh@example.com"); // not overwritten

    await user.type(field("Email"), "anh@example.org");
    expect(inspectorJson().email).toBe("minh.anh@example.com"); // snapshot, not live
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(inspectorJson().email).toBe("anh@example.org");
    expect(screen.getByRole("status")).toHaveTextContent("Submission #2 received.");
});

it("re-checks Confirm password when Password changes afterwards (cross-field, no effect)", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(field("Password"), "secret123");
    await user.type(field("Confirm password"), "secret123");
    expect(field("Confirm password")).toHaveAttribute("aria-invalid", "false");
    await user.type(field("Password"), "4");
    expect(field("Confirm password")).toHaveAccessibleDescription("Passwords must match");
});
