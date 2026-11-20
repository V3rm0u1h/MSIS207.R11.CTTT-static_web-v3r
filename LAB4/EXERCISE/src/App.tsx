import { useState, useTransition } from "react";
import { people } from "./data/people";
import PersonDetail from "./components/LazyPersonDetail";

export default function App() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const selected = people.find((person) => person.id === selectedId) ?? null;

    function select(id: string) {
        // A transition keeps the current screen visible while the lazy
        // PersonDetail chunk downloads (the Suspense fallback is a later PRD).
        startTransition(() => setSelectedId(id));
    }

    return (
        <main aria-busy={isPending}>
            <header>
                <h1>People Directory</h1>
            </header>
            <nav aria-label="People">
                <ul>
                    {people.map((person) => (
                        <li key={person.id}>
                            <button
                                type="button"
                                aria-pressed={person.id === selectedId}
                                onClick={() => select(person.id)}
                            >
                                {person.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            {selected ? <PersonDetail person={selected} /> : <p>Select a person to view their profile.</p>}
        </main>
    );
}
