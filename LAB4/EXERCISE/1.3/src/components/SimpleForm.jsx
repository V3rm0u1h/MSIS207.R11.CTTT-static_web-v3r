import { createContext, useContext, useRef, useState } from "react";

const FormContext = createContext(null);

/** Consumer hook for fields inside <SimpleForm>. */
export function useFormContext() {
    const context = useContext(FormContext);
    if (!context) {
        throw new Error("useFormContext must be used within SimpleForm");
    }
    return context;
}

const EMPTY = "";

/**
 * Central form controller: the single source of truth for `values` and `errors`.
 *
 * Every state transition happens synchronously inside the event handler that
 * caused it — no useEffect copies values between components, and no effect
 * reacts to one state change by making another. Validation (where rules are
 * supplied) runs in the same handler against the exact next values, so there
 * is nothing asynchronous to race and no update can trigger itself again.
 *
 * Props:
 * - initialValues: { [fieldName]: string }
 * - rules: { [fieldName]: (value, allValues) => string | undefined }  (message = invalid)
 * - onSubmit: (values) => void   called only when every rule passes
 * - children: the form's fields and controls (composition API preserved)
 */
export default function SimpleForm({ initialValues = {}, rules = {}, onSubmit, children, ...formProps }) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});

    // Latest committed state, updated synchronously by the handlers themselves,
    // so two updates in the same tick compose instead of overwriting each other.
    const latest = useRef({ values: initialValues, errors: {} });

    function commitValues(nextValues) {
        latest.current.values = nextValues;
        setValues(nextValues);
    }

    function commitErrors(nextErrors) {
        latest.current.errors = nextErrors;
        setErrors(nextErrors);
    }

    /** Pure: the message for one field under `allValues`, or "" when valid. */
    function messageFor(name, allValues) {
        const rule = rules[name];
        if (typeof rule !== "function") return EMPTY;
        const message = rule(allValues[name] ?? EMPTY, allValues);
        return typeof message === "string" ? message : EMPTY;
    }

    /** Set (or clear, with "") one field's error in the central errors object. */
    function setFieldError(name, message) {
        const current = latest.current.errors;
        if (!message) {
            if (!(name in current)) return;
            const { [name]: _removed, ...rest } = current;
            commitErrors(rest);
        } else if (current[name] !== message) {
            commitErrors({ ...current, [name]: message });
        }
    }

    /** Validate one field now; returns its message ("" when valid). */
    function validateField(name, allValues = latest.current.values) {
        const message = messageFor(name, allValues);
        setFieldError(name, message);
        return message;
    }

    /** Validate every field that has a rule; returns the complete errors object. */
    function validateForm(allValues = latest.current.values) {
        const nextErrors = {};
        for (const name of Object.keys(rules)) {
            const message = messageFor(name, allValues);
            if (message) nextErrors[name] = message;
        }
        commitErrors(nextErrors);
        return nextErrors;
    }

    /**
     * Update one field. Errors already on screen are re-checked against the
     * NEW values in the same handler (covers cross-field rules), instead of an
     * effect that would re-render once more after the value lands.
     */
    function handleChange(name, value) {
        const nextValues = { ...latest.current.values, [name]: value };
        commitValues(nextValues);
        for (const shown of Object.keys(latest.current.errors)) {
            validateField(shown, nextValues);
        }
    }

    function handleSubmit(event) {
        event?.preventDefault();
        const submitted = latest.current.values;
        const found = validateForm(submitted);
        if (Object.keys(found).length > 0) return false;
        onSubmit?.({ ...submitted });
        return true;
    }

    const formContextValue = {
        values,
        errors,
        handleChange,
        validateField,
        setFieldError,
        validateForm,
        handleSubmit
    };

    return (
        <FormContext.Provider value={formContextValue}>
            <form noValidate {...formProps} onSubmit={handleSubmit}>
                {children}
            </form>
        </FormContext.Provider>
    );
}
