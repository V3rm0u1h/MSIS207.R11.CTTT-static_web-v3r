import { useId } from "react";
import { useFormContext } from "./SimpleForm";

/**
 * Controlled field bound to the shared form context. It keeps NO copy of the
 * value or the error: it renders values[name] / errors[name] and reports
 * changes through context, so there is nothing to synchronize back.
 *
 * Props: name (unique key), label, type, required, validate(value, allValues),
 * plus any native <input> attribute (autoComplete, inputMode, ...).
 */
export default function InputField({ name, label, type = "text", required = false, validate, ...inputProps }) {
    const { values, errors, handleChange, validateField, registerField } = useFormContext();
    const id = `${name}-${useId()}`;
    const errorId = `${id}-error`;
    const error = errors[name];

    return (
        <div className="field">
            <label htmlFor={id}>
                {label}
                {required && <span className="field-required" aria-hidden="true"> *</span>}
            </label>
            <input
                {...inputProps}
                // Ref callback (commit phase, not an effect): registers this field's
                // rules for form-level validation; the returned cleanup unregisters.
                ref={() => registerField(name, { label, required, validate })}
                id={id}
                name={name}
                type={type}
                required={required}
                value={values[name] ?? ""}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => handleChange(name, event.target.value)}
                onBlur={() => validateField(name)}
            />
            {error && (
                <p id={errorId} className="field-error">
                    {error}
                </p>
            )}
        </div>
    );
}
