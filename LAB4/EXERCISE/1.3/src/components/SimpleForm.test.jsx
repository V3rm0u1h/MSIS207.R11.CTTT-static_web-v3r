import { Profiler } from "react";
import { act, render, renderHook, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import SimpleForm, { useFormContext } from "./SimpleForm";
import InputField from "./InputField";

/** Shows the central state so tests can assert on the single source of truth. */
function StateProbe() {
    const { values, errors } = useFormContext();
    return (
        <>
            <output data-testid="values">{JSON.stringify(values)}</output>
            <output data-testid="errors">{JSON.stringify(errors)}</output>
        </>
    );
}

const valuesOf = () => JSON.parse(screen.getByTestId("values").textContent);
const errorsOf = () => JSON.parse(screen.getByTestId("errors").textContent);

const rules = {
    name: (value) => (value.trim() ? undefined : "Name is required"),
    confirm: (value, all) => (value === all.password ? undefined : "Passwords must match")
};

function TwoFieldForm(props) {
    return (
        <SimpleForm aria-label="Test form" initialValues={{ name: "", email: "" }} {...props}>
            <InputField name="name" label="Name" />
            <InputField name="email" label="Email" />
            <button type="submit">Send</button>
            <StateProbe />
        </SimpleForm>
    );
}

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

describe("FormContext + useFormContext", () => {
    it("throws a clear error when used outside SimpleForm", () => {
        errorSpy.mockImplementation(() => {}); // React reports the thrown render error
        expect(() => renderHook(() => useFormContext())).toThrow("useFormContext must be used within SimpleForm");
        errorSpy.mockReset();
    });

    it("exposes the central state and every form operation", () => {
        const { result } = renderHook(() => useFormContext(), {
            wrapper: ({ children }) => <SimpleForm initialValues={{ a: "1" }}>{children}</SimpleForm>
        });
        expect(result.current.values).toEqual({ a: "1" });
        expect(result.current.errors).toEqual({});
        for (const fn of ["handleChange", "validateField", "setFieldError", "validateForm", "handleSubmit"]) {
            expect(typeof result.current[fn]).toBe("function");
        }
    });
});

describe("SimpleForm as the single source of truth", () => {
    it("wraps its children in one <form> inside the provider and forwards form props", () => {
        render(<TwoFieldForm />);
        const form = screen.getByRole("form", { name: "Test form" });
        expect(form).toContainElement(screen.getByLabelText("Name"));
        expect(form).toContainElement(screen.getByRole("button", { name: "Send" }));
    });

    it("every field writes into the one central values object", async () => {
        const user = userEvent.setup();
        render(<TwoFieldForm />);
        await user.type(screen.getByLabelText("Name"), "Ada");
        await user.type(screen.getByLabelText("Email"), "ada@example.com");
        expect(valuesOf()).toEqual({ name: "Ada", email: "ada@example.com" });
        expect(screen.getByLabelText("Name")).toHaveValue("Ada"); // field displays the central value
    });

    it("commits exactly once per keystroke (no effect-driven cascade)", async () => {
        const user = userEvent.setup();
        const commits = [];
        render(
            <Profiler id="form" onRender={(_id, phase) => commits.push(phase)}>
                <TwoFieldForm rules={rules} />
            </Profiler>
        );
        expect(commits).toEqual(["mount"]);
        commits.length = 0;
        await user.type(screen.getByLabelText("Name"), "abc");
        expect(commits).toEqual(["update", "update", "update"]);
    });

    it("composes several updates in the same tick instead of overwriting (no race)", () => {
        function Batch() {
            const { handleChange } = useFormContext();
            return (
                <button type="button" onClick={() => { handleChange("name", "Ada"); handleChange("email", "a@b.c"); }}>
                    Fill both
                </button>
            );
        }
        render(
            <SimpleForm initialValues={{ name: "", email: "" }}>
                <Batch />
                <StateProbe />
            </SimpleForm>
        );
        fireEvent.click(screen.getByRole("button", { name: "Fill both" }));
        expect(valuesOf()).toEqual({ name: "Ada", email: "a@b.c" });
    });
});

describe("centralized errors", () => {
    function ErrorControls() {
        const { validateField, setFieldError } = useFormContext();
        return (
            <>
                <button type="button" onClick={() => validateField("name")}>Validate name</button>
                <button type="button" onClick={() => setFieldError("email", "Taken")}>Flag email</button>
                <button type="button" onClick={() => setFieldError("email", "")}>Clear email</button>
            </>
        );
    }

    it("validateField sets and clears a field error synchronously", async () => {
        const user = userEvent.setup();
        render(
            <SimpleForm initialValues={{ name: "" }} rules={rules}>
                <InputField name="name" label="Solo name" />
                <ErrorControls />
                <StateProbe />
            </SimpleForm>
        );
        await user.click(screen.getByRole("button", { name: "Validate name" }));
        expect(errorsOf()).toEqual({ name: "Name is required" });
        await user.type(screen.getByLabelText("Solo name"), "A"); // shown error re-checked in the same handler
        expect(errorsOf()).toEqual({});
    });

    it("setFieldError adds and removes arbitrary messages", async () => {
        const user = userEvent.setup();
        render(
            <SimpleForm initialValues={{}}>
                <ErrorControls />
                <StateProbe />
            </SimpleForm>
        );
        await user.click(screen.getByRole("button", { name: "Flag email" }));
        expect(errorsOf()).toEqual({ email: "Taken" });
        await user.click(screen.getByRole("button", { name: "Clear email" }));
        expect(errorsOf()).toEqual({});
    });

    it("re-checks a shown cross-field error when the field it depends on changes", async () => {
        const user = userEvent.setup();
        render(
            <SimpleForm initialValues={{ password: "", confirm: "" }} rules={{ confirm: rules.confirm }}>
                <InputField name="password" label="Password" />
                <InputField name="confirm" label="Confirm" />
                <button type="submit">Send</button>
                <StateProbe />
            </SimpleForm>
        );
        await user.type(screen.getByLabelText("Password"), "abc");
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(errorsOf()).toEqual({ confirm: "Passwords must match" });
        await user.type(screen.getByLabelText("Password"), "d"); // editing the OTHER field re-checks it
        expect(errorsOf()).toEqual({ confirm: "Passwords must match" });
        await user.type(screen.getByLabelText("Confirm"), "abcd");
        expect(errorsOf()).toEqual({});
    });
});

describe("handleSubmit", () => {
    it("blocks an invalid submission and records every error", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(<TwoFieldForm rules={rules} onSubmit={onSubmit} />);
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(onSubmit).not.toHaveBeenCalled();
        expect(errorsOf()).toEqual({ name: "Name is required", confirm: "Passwords must match" });
    });

    it("submits a copy of the values once every rule passes", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(<TwoFieldForm rules={{ name: rules.name }} onSubmit={onSubmit} />);
        await user.type(screen.getByLabelText("Name"), "Ada");
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
        const submitted = onSubmit.mock.calls[0][0];
        expect(submitted).toEqual({ name: "Ada", email: "" });
        submitted.name = "mutated";
        expect(valuesOf().name).toBe("Ada"); // caller cannot mutate central state
        expect(errorsOf()).toEqual({});
    });

    it("ignores rules that return non-string results", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(<TwoFieldForm rules={{ name: () => 42, email: () => null }} onSubmit={onSubmit} />);
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("prevents the browser's default navigation", () => {
        render(<TwoFieldForm />);
        const event = new Event("submit", { bubbles: true, cancelable: true });
        act(() => {
            screen.getByRole("form", { name: "Test form" }).dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(true);
    });
});

describe("architecture guards", () => {
    const srcDir = join(__dirname, "..");
    const sources = (dir) =>
        readdirSync(dir).flatMap((name) => {
            const full = join(dir, name);
            if (statSync(full).isDirectory()) return sources(full);
            return /\.jsx?$/.test(name) && !/\.test\./.test(name) ? [full] : [];
        });
    const code = (file) => readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    it("uses no effect hooks anywhere in the app", () => {
        for (const file of sources(srcDir)) {
            expect(code(file), file).not.toMatch(/\buse(Layout|Insertion)?Effect\b/);
        }
    });

    it("InputField keeps no local copy of form state", () => {
        expect(code(join(__dirname, "InputField.jsx"))).not.toMatch(/\buse(State|Reducer)\b/);
    });

    it("SimpleForm owns values and errors with useState and provides them via FormContext", () => {
        const form = code(join(__dirname, "SimpleForm.jsx"));
        expect(form).toMatch(/const FormContext = createContext\(null\);/);
        expect(form).toMatch(/const \[values, setValues\] = useState\(/);
        expect(form).toMatch(/const \[errors, setErrors\] = useState\(\{\}\);/);
        expect(form).toMatch(/<FormContext\.Provider value=\{formContextValue\}>\s*<form[^>]*onSubmit=\{handleSubmit\}>\s*\{children\}/);
    });

    it("adds no state-management library", () => {
        const pkg = JSON.parse(readFileSync(join(srcDir, "..", "package.json"), "utf8"));
        const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
        expect(deps.filter((d) => /redux|zustand|mobx|jotai|recoil|formik|react-hook-form|valtio/.test(d))).toEqual([]);
    });
});
