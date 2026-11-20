import { useId } from "react";
import { useFormContext } from "./SimpleForm";

/**
 * Controlled field bound to the shared form context. It keeps NO copy of the
 * value: it reads values[name] and writes through handleChange, so there is
 * nothing to synchronize back to the parent.
 */
export default function InputField({ name, label, type = "text", ...inputProps }) {
    const { values, handleChange } = useFormContext();
    const id = useId();

    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            <input
                {...inputProps}
                id={id}
                name={name}
                type={type}
                value={values[name] ?? ""}
                onChange={(event) => handleChange(name, event.target.value)}
            />
        </div>
    );
}
