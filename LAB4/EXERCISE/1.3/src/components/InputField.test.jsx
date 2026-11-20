import { Profiler } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SimpleForm, { useFormContext } from "./SimpleForm";
import InputField from "./InputField";

function ErrorsProbe() {
    return <output data-testid="errors">{JSON.stringify(useFormContext().errors)}</output>;
}
const errorsOf = () => JSON.parse(screen.getByTestId("errors").textContent);

let errorSpy;
let warnSpy;
beforeEach(() => {
    errorSpy = vi.spyOn(console, "error");
    warnSpy = vi.spyOn(console, "warn");
});
afterEach(() => {
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    vi.restoreAllMocks();
});

const noDigits = (value) => (/\d/.test(value) ? "No digits allowed" : undefined);

describe("InputField", () => {
    it("is controlled by the central values and labelled via htmlFor/id", async () => {
        const user = userEvent.setup();
        render(
            <SimpleForm initialValues={{ city: "Hue" }}>
                <InputField name="city" label="City" type="search" autoComplete="address-level2" />
            </SimpleForm>
        );
        const input = screen.getByLabelText("City");
        expect(input).toHaveValue("Hue");
        expect(input).toHaveAttribute("name", "city");
        expect(input).toHaveAttribute("type", "search"); // input type preserved
        expect(input).toHaveAttribute("autocomplete", "address-level2"); // native props pass through
        expect(input.id).toMatch(/^city-/);
        await user.type(input, "!");
        expect(input).toHaveValue("Hue!");
    });

    it("required: shows the error next to the field, linked by aria-describedby, and clears it", async () => {
        const user = userEvent.setup();
        render(
            <SimpleForm initialValues={{ nick: "" }}>
                <InputField name="nick" label="Nickname" required />
                <ErrorsProbe />
            </SimpleForm>
        );
        const input = screen.getByLabelText(/Nickname/);
        expect(input).toBeRequired();
        expect(input).toHaveAttribute("aria-invalid", "false");
        expect(input).not.toHaveAttribute("aria-describedby");

        await user.type(input, "a");
        await user.clear(input); // validated on change: now blank
        expect(input).toHaveAttribute("aria-invalid", "true");
        const message = document.getElementById(input.getAttribute("aria-describedby"));
        expect(message).toHaveTextContent("Nickname is required");
        expect(message.previousElementSibling).toBe(input); // rendered right after its input
        expect(errorsOf()).toEqual({ nick: "Nickname is required" }); // stored centrally

        await user.type(input, "b");
        expect(input).toHaveAttribute("aria-invalid", "false");
        expect(input).not.toHaveAttribute("aria-describedby");
        expect(screen.queryByText("Nickname is required")).not.toBeInTheDocument();
        expect(errorsOf()).toEqual({});
    });

    it("custom validate runs on every change against the latest value", async () => {
        const user = userEvent.setup();
        render(
            <SimpleForm initialValues={{ code: "" }}>
                <InputField name="code" label="Code" validate={noDigits} />
                <ErrorsProbe />
            </SimpleForm>
        );
        const input = screen.getByLabelText("Code");
        await user.type(input, "ab");
        expect(errorsOf()).toEqual({});
        await user.type(input, "1");
        expect(input).toHaveAccessibleDescription("No digits allowed");
        await user.type(input, "{Backspace}");
        expect(errorsOf()).toEqual({});
    });

    it("validates on blur, so tabbing past an empty required field flags it", async () => {
        const user = userEvent.setup();
        render(
            <SimpleForm initialValues={{ a: "", b: "" }}>
                <InputField name="a" label="First" required />
                <InputField name="b" label="Second" />
            </SimpleForm>
        );
        await user.click(screen.getByLabelText(/First/));
        await user.tab();
        expect(screen.getByLabelText(/First/)).toHaveAccessibleDescription("First is required");
    });

    it("the last keystroke always wins (fast input, no stale result)", () => {
        render(
            <SimpleForm initialValues={{ code: "" }}>
                <InputField name="code" label="Code" validate={noDigits} />
                <ErrorsProbe />
            </SimpleForm>
        );
        const input = screen.getByLabelText("Code");
        for (const value of ["1", "12", "12a", "a"]) fireEvent.change(input, { target: { value } });
        expect(input).toHaveValue("a");
        expect(errorsOf()).toEqual({});
    });

    it("one change = one commit, even with validation and an error appearing", async () => {
        const user = userEvent.setup();
        const commits = [];
        render(
            <Profiler id="f" onRender={(_id, phase) => commits.push(phase)}>
                <SimpleForm initialValues={{ code: "" }}>
                    <InputField name="code" label="Code" validate={noDigits} />
                </SimpleForm>
            </Profiler>
        );
        commits.length = 0;
        await user.type(screen.getByLabelText("Code"), "a1b");
        expect(commits).toEqual(["update", "update", "update"]);
    });

    it("unmounting a field unregisters its rules from form validation", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        function Form({ showExtra }) {
            return (
                <SimpleForm initialValues={{ main: "x", extra: "" }} onSubmit={onSubmit}>
                    <InputField name="main" label="Main" required />
                    {showExtra && <InputField name="extra" label="Extra" required />}
                    <button type="submit">Send</button>
                </SimpleForm>
            );
        }
        const { rerender } = render(<Form showExtra />);
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(onSubmit).not.toHaveBeenCalled(); // Extra is required and empty

        rerender(<Form showExtra={false} />);
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(onSubmit).toHaveBeenCalledWith({ main: "x", extra: "" });
    });
});
