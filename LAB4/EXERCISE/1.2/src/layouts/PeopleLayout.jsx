import { NavLink, Outlet } from "react-router";
import { people } from "../data/people";
import "./PeopleLayout.css";

// Active styling comes from the router's match state, never from local React state.
const navClass = ({ isActive }) => (isActive ? "active" : "");

/**
 * Shared master-detail layout for every /people route.
 * Master: directory navigation built from the single `people` data source.
 * Detail: whichever child route matched, rendered through <Outlet />.
 */
export default function PeopleLayout() {
    return (
        <main className="people-layout">
            <header className="people-header">
                <h1>Case Dossier Directory</h1>
            </header>
            <aside className="people-sidebar">
                <nav aria-label="People directory">
                    <ul>
                        <li>
                            {/* `end`: "People" is active only on the /people index, not on /people/:id. */}
                            <NavLink to="/people" end className={navClass}>
                                People
                            </NavLink>
                        </li>
                        {people.map((person) => (
                            <li key={person.id}>
                                <NavLink to={`/people/${person.id}`} className={navClass}>
                                    {person.name}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
            <section className="people-content" aria-label="Dossier">
                <Outlet />
            </section>
        </main>
    );
}
