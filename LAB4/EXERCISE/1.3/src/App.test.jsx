import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

it("runs the whole registration form under StrictMode with a clean console", async () => {
    const errors = vi.spyOn(console, "error");
    const warnings = vi.spyOn(console, "warn");
    const user = userEvent.setup();
    render(
        <StrictMode>
            <App />
        </StrictMode>
    );
    const form = screen.getByRole("form", { name: "Registration" });
    for (const label of ["Full name", "Email", "Age", "Password", "Confirm password"]) {
        expect(form).toContainElement(screen.getByLabelText(label));
    }
    await user.type(screen.getByLabelText("Full name"), "Nguyen Minh Anh");
    expect(screen.getByLabelText("Full name")).toHaveValue("Nguyen Minh Anh");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByRole("status")).toHaveTextContent("Submitted 1 time.");
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
});
