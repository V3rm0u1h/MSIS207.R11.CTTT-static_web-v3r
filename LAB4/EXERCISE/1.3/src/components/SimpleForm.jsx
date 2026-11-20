import { createContext, useContext, useRef, useState } from "react";
import { all, validateField as checkField, validateForm as checkForm } from "../validation/validators";

const FormContext = createContext(null);

/** Consumer hook for fields inside <SimpleForm>. */
export function useFormContext() {
    const context = useContext(FormContext);
    if (!context) {
        throw new Error("useFormContext must be used within SimpleForm");
    }
    return context;
}

/** True when two errors objects hold exactly the same messages. */
function sameErrors(a, b) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/**
 * Central form controller: the single source of truth for `values` and `errors`.
 *
 * Update sequence (all synchronous, inside the event handler):
 *   input change → InputField → handleChange(name, value) via context
 *   → SimpleForm computes the next values AND their validation result
 *   → one setValues + (only if something changed) one setErrors → one render.
 * No useEffect watches values to recompute errors, and nothing watches errors,
 * so there is no effect chain, no stale/late result and no update loop.
 *
 * Validation registry: each InputField registers { label, required, validate }
 * from its input's ref callback (commit phase, not an effect hook) and
 * unregisters in the callback's cleanup. Optional form-level `rules`
 * ({ [name]: (value, allValues) => message }) are layered on top.
 *
 * Props: initialValues, rules, onSubmit(valuesCopy), children, ...<form> props.
 */
export default function SimpleForm({ initialValues = {}, rules = {}, onSubmit, children, ...formProps }) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});

    // Latest committed state, written synchronously by the handlers so several
    // updates in one tick compose instead of reading a stale render snapshot.
    const latest = useRef({ values: initialValues, errors: {} });
    // name → { label, required, validate } for every mounted InputField.
    const registry = useRef(new Map());
    // Fields the user has interacted with (or that were submitted); only these
    // are re-checked when ANOTHER field changes (cross-field rules).
    const touched = useRef(new Set());

    function registerField(name, fieldRules) {
        registry.current.set(name, fieldRules);
        return () => {
            if (registry.current.get(name) === fieldRules) registry.current.delete(name);
        };
    }

    /** Registered field rules merged with form-level rules: the full validation contract. */
    function collectRules() {
        const merged = {};
        for (const [name, fieldRules] of registry.current) merged[name] = fieldRules;
        for (const [name, formRule] of Object.entries(rules)) {
            if (typeof formRule !== "function") continue;
            const base = merged[name] ?? {};
            merged[name] = { ...base, validate: base.validate ? all(base.validate, formRule) : formRule };
        }
        return merged;
    }

    function commitValues(nextValues) {
        latest.current.values = nextValues;
        setValues(nextValues);
    }

    function commitErrors(nextErrors) {
        if (sameErrors(nextErrors, latest.current.errors)) return; // no unnecessary state update
        latest.current.errors = nextErrors;
        setErrors(nextErrors);
    }

    /** errors with `names` re-validated against `allValues`; others untouched. */
    function errorsWith(names, allValues) {
        const fieldRules = collectRules();
        const next = { ...latest.current.errors };
        for (const name of names) {
            const message = checkField(name, allValues[name] ?? "", fieldRules[name], allValues);
            if (message) next[name] = message;
            else delete next[name];
        }
        return next;
    }

    /** Set (or clear, with "") one field's error in the central errors object. */
    function setFieldError(name, message) {
        const next = { ...latest.current.errors };
        if (message) next[name] = message;
        else delete next[name];
        commitErrors(next);
    }

    /** Validate one field now (e.g. on blur); returns its message ("" when valid). */
    function validateField(name, allValues = latest.current.values) {
        touched.current.add(name);
        const next = errorsWith([name], allValues);
        commitErrors(next);
        return next[name] ?? "";
    }

    /** Validate every registered field; returns the complete errors object. */
    function validateForm(allValues = latest.current.values) {
        const fieldRules = collectRules();
        for (const name of Object.keys(fieldRules)) touched.current.add(name);
        const next = checkForm(allValues, fieldRules);
        commitErrors(next);
        return next;
    }

    /**
     * Update one field and validate it against the NEW values in the same
     * handler, plus any touched field whose rule may depend on it.
     */
    function handleChange(name, value) {
        const nextValues = { ...latest.current.values, [name]: value };
        commitValues(nextValues);
        touched.current.add(name);
        commitErrors(errorsWith(touched.current, nextValues));
    }

    function handleSubmit(event) {
        event?.preventDefault();
        const submitted = latest.current.values;
        const nextErrors = validateForm(submitted);
        if (Object.keys(nextErrors).length > 0) return false;
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
        handleSubmit,
        registerField
    };

    return (
        <FormContext.Provider value={formContextValue}>
            <form noValidate {...formProps} onSubmit={handleSubmit}>
                {children}
            </form>
        </FormContext.Provider>
    );
}
