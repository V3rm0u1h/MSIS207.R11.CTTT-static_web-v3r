import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ShowData from "./ShowData";
import SimpleForm from "./SimpleForm";
import InputField from "./InputField";

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

describe("ShowData", () => {
    it.each([[null], [undefined], ["text"], [42]])("renders nothing for missing or non-object data (%s)", (data) => {
        const { container } = render(<ShowData data={data} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows JSON.stringify(data, null, 2) in a <pre> under a labelled section", () => {
        const data = { name: "Ada", tags: ["a", "b"], nested: { ok: true } };
        render(<ShowData data={data} submissionNumber={3} />);
        const section = screen.getByRole("region", { name: "Submitted Form Data" });
        expect(section).toHaveClass("show-data");
        const pre = section.querySelector("pre");
        expect(pre.textContent).toBe(JSON.stringify(data, null, 2)); // indentation + line breaks preserved
        expect(screen.getByRole("status")).toHaveTextContent("Submission #3 received.");
    });

    it("the JSON block is not a live region (no announcing JSON)", () => {
        render(<ShowData data={{ a: 1 }} submissionNumber={1} />);
        const pre = document.querySelector("pre");
        expect(pre.closest("[aria-live], [role='status'], [role='alert'], [role='log']")).toBeNull();
    });

    it("masks redacted values but keeps their keys, without mutating data", () => {
        const data = { user: "ada", password: "secret123" };
        render(<ShowData data={data} redactKeys={["password"]} />);
        const json = JSON.parse(document.querySelector("pre").textContent);
        expect(json).toEqual({ user: "ada", password: "••••••••" });
        expect(data.password).toBe("secret123");
    });

    it("renders markup in values as text, never HTML", () => {
        render(<ShowData data={{ bio: "<img src=x onerror=alert(1)>" }} />);
        expect(document.querySelector("img")).toBeNull();
        expect(document.querySelector("pre").textContent).toContain("<img src=x onerror=alert(1)>");
    });

    it("uses no effect hooks and no third-party viewer", () => {
        const source = readFileSync(join(__dirname, "ShowData.jsx"), "utf8");
        expect(source).not.toMatch(/useEffect|useLayoutEffect|^import /m);
        expect(source).toMatch(/JSON\.stringify\(shown, null, 2\)/);
    });
});

describe("SimpleForm + ShowData integration", () => {
    function Form(props) {
        return (
            <SimpleForm aria-label="F" initialValues={{ name: "" }} {...props}>
                <InputField name="name" label="Name" required />
                <button type="submit">Send</button>
            </SimpleForm>
        );
    }
    const json = () => JSON.parse(document.querySelector(".show-data pre").textContent);

    it("appears only after a valid submit and holds a snapshot, not live values", async () => {
        const user = userEvent.setup();
        render(<Form />);
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(screen.queryByRole("region", { name: "Submitted Form Data" })).not.toBeInTheDocument();

        await user.type(screen.getByLabelText(/Name/), "Ada");
        expect(screen.queryByRole("region", { name: "Submitted Form Data" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(json()).toEqual({ name: "Ada" });

        await user.type(screen.getByLabelText(/Name/), " Lovelace"); // unsubmitted edit
        expect(json()).toEqual({ name: "Ada" });
    });

    it("an invalid submit keeps the previous successful output; the next valid one replaces it", async () => {
        const user = userEvent.setup();
        render(<Form />);
        await user.type(screen.getByLabelText(/Name/), "Ada");
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(screen.getByRole("status")).toHaveTextContent("Submission #1 received.");

        await user.clear(screen.getByLabelText(/Name/));
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(screen.getByLabelText(/Name/)).toHaveAttribute("aria-invalid", "true");
        expect(json()).toEqual({ name: "Ada" });
        expect(screen.getByRole("status")).toHaveTextContent("Submission #1 received.");

        await user.type(screen.getByLabelText(/Name/), "Grace");
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(json()).toEqual({ name: "Grace" });
        expect(screen.getByRole("status")).toHaveTextContent("Submission #2 received.");
    });

    it("showData={false} turns the inspector off while onSubmit still fires", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(<Form showData={false} onSubmit={onSubmit} initialValues={{ name: "Ada" }} />);
        await user.click(screen.getByRole("button", { name: "Send" }));
        expect(onSubmit).toHaveBeenCalledWith({ name: "Ada" });
        expect(document.querySelector(".show-data")).toBeNull();
    });
});
