import { validateField, validateForm, isEmail, minLength, integerBetween, strongPassword, matchesField, all } from "./validators";

describe("validateField", () => {
    it("required: blank / whitespace fails with the field label", () => {
        expect(validateField("email", "", { required: true, label: "Email" })).toBe("Email is required");
        expect(validateField("email", "   ", { required: true, label: "Email" })).toBe("Email is required");
        expect(validateField("email", "", { required: true })).toBe("email is required");
    });

    it("runs the custom rule after required and passes all values", () => {
        const validate = vi.fn((value, allValues) => (value === allValues.other ? undefined : "Mismatch"));
        expect(validateField("a", "x", { required: true, validate }, { a: "x", other: "y" })).toBe("Mismatch");
        expect(validate).toHaveBeenCalledWith("x", { a: "x", other: "y" });
        expect(validateField("a", "y", { validate }, { a: "y", other: "y" })).toBe("");
    });

    it("required short-circuits the custom rule", () => {
        const validate = vi.fn(() => "never");
        expect(validateField("a", "", { required: true, validate })).toBe("a is required");
        expect(validate).not.toHaveBeenCalled();
    });

    it("treats non-string or empty rule results as valid, and no rules as valid", () => {
        expect(validateField("a", "x", { validate: () => 1 })).toBe("");
        expect(validateField("a", "x", { validate: () => "" })).toBe("");
        expect(validateField("a", "x")).toBe("");
    });

    it("is synchronous: returns a string, never a promise", () => {
        expect(typeof validateField("a", "", { required: true })).toBe("string");
    });
});

describe("validateForm", () => {
    it("collects one errors object holding only the invalid fields", () => {
        const fieldRules = {
            name: { required: true, label: "Name" },
            email: { required: true, label: "Email", validate: isEmail() },
            nick: {}
        };
        expect(validateForm({ name: "", email: "bad" }, fieldRules)).toEqual({
            name: "Name is required",
            email: "Enter a valid email address"
        });
        expect(validateForm({ name: "Ada", email: "a@b.co" }, fieldRules)).toEqual({});
    });
});

describe("custom rule factories", () => {
    it("treat empty as valid so optional fields stay optional", () => {
        for (const rule of [isEmail(), minLength(3), integerBetween(1, 2), strongPassword()]) {
            expect(rule("")).toBeUndefined();
        }
    });

    it("isEmail", () => {
        expect(isEmail()("ada@example.com")).toBeUndefined();
        expect(isEmail()("ada@")).toBe("Enter a valid email address");
        expect(isEmail("Bad")("a b@c.d")).toBe("Bad");
    });

    it("minLength trims", () => {
        expect(minLength(2)(" a ")).toBe("Use at least 2 characters");
        expect(minLength(2)("ab")).toBeUndefined();
    });

    it("integerBetween accepts only whole numbers in range", () => {
        const rule = integerBetween(18, 120);
        expect(rule("18")).toBeUndefined();
        expect(rule("120")).toBeUndefined();
        for (const bad of ["17", "121", "18.5", "-20", "abc", "1e2"]) {
            expect(rule(bad)).toBe("Enter a whole number from 18 to 120");
        }
    });

    it("strongPassword needs 8+ chars with a letter and a digit", () => {
        expect(strongPassword()("abc12345")).toBeUndefined();
        for (const bad of ["abc1234", "abcdefgh", "12345678"]) expect(strongPassword()(bad)).toMatch(/8\+ characters/);
    });

    it("matchesField compares against the other field's current value", () => {
        const rule = matchesField("password", "Passwords must match");
        expect(rule("abc", { password: "abc" })).toBeUndefined();
        expect(rule("abd", { password: "abc" })).toBe("Passwords must match");
    });

    it("all() returns the first failing message", () => {
        const rule = all(minLength(3, "short"), isEmail("email"));
        expect(rule("ab")).toBe("short");
        expect(rule("abc")).toBe("email");
        expect(rule("a@b.co")).toBeUndefined();
    });
});
