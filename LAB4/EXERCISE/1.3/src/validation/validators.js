/**
 * Synchronous validation engine. Pure functions only: same input → same
 * message, no state, no timers, no promises — so a result can never arrive
 * late and overwrite newer form state.
 *
 * Field rules: { label?, required?, validate?: (value, allValues) => string | undefined }
 * A message string means invalid; "" means valid.
 */

const isBlank = (value) => (typeof value === "string" ? value.trim() === "" : value == null);

/**
 * Validate one field's current value. Required runs first, then the custom rule
 * (custom rules also see empty values; the built-in factories below treat ""
 * as valid, so an optional field stays optional).
 */
export function validateField(name, value, rules = {}, allValues = {}) {
    if (rules.required && isBlank(value)) {
        return `${rules.label ?? name} is required`;
    }
    if (typeof rules.validate === "function") {
        const message = rules.validate(value, allValues);
        if (typeof message === "string" && message !== "") return message;
    }
    return "";
}

/** Validate every registered field; returns ONE errors object (only invalid fields). */
export function validateForm(values, fieldRules) {
    const nextErrors = {};
    for (const [name, rules] of Object.entries(fieldRules)) {
        const error = validateField(name, values[name] ?? "", rules, values);
        if (error) nextErrors[name] = error;
    }
    return nextErrors;
}

/* ---- Reusable custom rules (each returns a `validate` function) ---- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (message = "Enter a valid email address") => (value) =>
    isBlank(value) || EMAIL.test(value.trim()) ? undefined : message;

export const minLength = (length, message = `Use at least ${length} characters`) => (value) =>
    isBlank(value) || value.trim().length >= length ? undefined : message;

export const integerBetween = (min, max, message = `Enter a whole number from ${min} to ${max}`) => (value) => {
    if (isBlank(value)) return undefined;
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return message;
    const number = Number(trimmed);
    return number >= min && number <= max ? undefined : message;
};

export const strongPassword = (message = "Use 8+ characters with at least one letter and one number") => (value) =>
    isBlank(value) || value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value) ? undefined : message;

export const matchesField = (otherName, message = "Values do not match") => (value, allValues) =>
    value === (allValues[otherName] ?? "") ? undefined : message;

/** Run several rules in order; the first message wins. */
export const all = (...rules) => (value, allValues) => {
    for (const rule of rules) {
        const message = rule(value, allValues);
        if (message) return message;
    }
    return undefined;
};
