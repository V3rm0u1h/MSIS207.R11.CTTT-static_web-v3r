import { Suspense, useState } from "react";
import { people } from "./data/people";
import PersonDetail from "./components/LazyPersonDetail";

export default function App() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = people.find((person) => person.id === selectedId) ?? null;

    return (
        <main>
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
                                onClick={() => setSelectedId(person.id)}
                            >
                                {person.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            {selected ? (
                // Scoped boundary: only the lazy PersonDetail slot suspends, so the
                // header and navigation stay on screen while its chunk downloads.
                <Suspense fallback={<p role="status">Loading profile…</p>}>
                    <PersonDetail person={selected} />
                </Suspense>
            ) : (
                <p>Select a person to view their profile.</p>
            )}
        </main>
    );
}
