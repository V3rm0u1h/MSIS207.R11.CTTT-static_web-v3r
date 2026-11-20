import { useState } from "react";
import SimpleForm from "./components/SimpleForm";
import InputField from "./components/InputField";
import { integerBetween, isEmail, matchesField, minLength, strongPassword } from "./validation/validators";

const initialValues = { fullName: "", email: "", age: "", password: "", confirmPassword: "" };

export default function App() {
    const [submitCount, setSubmitCount] = useState(0);

    return (
        <main className="app">
            <header>
                <h1>Context Form Engine</h1>
                <p>One SimpleForm owns every value and error; fields read and write it through context.</p>
            </header>
            <SimpleForm
                aria-label="Registration"
                initialValues={initialValues}
                onSubmit={() => setSubmitCount((count) => count + 1)}
            >
                <InputField name="fullName" label="Full name" autoComplete="name" required validate={minLength(2)} />
                <InputField name="email" label="Email" type="email" autoComplete="email" required validate={isEmail()} />
                <InputField name="age" label="Age" inputMode="numeric" required validate={integerBetween(18, 120)} />
                <InputField
                    name="password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    required
                    validate={strongPassword()}
                />
                <InputField
                    name="confirmPassword"
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    required
                    validate={matchesField("password", "Passwords must match")}
                />
                <button type="submit">Submit</button>
            </SimpleForm>
            <p role="status">{submitCount > 0 ? `Submitted ${submitCount} time${submitCount === 1 ? "" : "s"}.` : ""}</p>
        </main>
    );
}
