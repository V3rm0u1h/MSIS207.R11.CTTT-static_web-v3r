import { Routes, Route, Navigate } from "react-router";
import PeopleLayout from "./layouts/PeopleLayout";
import PeopleDirectory from "./pages/PeopleDirectory";
import PersonDetail from "./pages/PersonDetail";
import NotFoundState from "./components/NotFoundState";
import { people } from "./data/people";

/**
 * Declarative React Router v7 route table.
 * - "/people" renders the shared PeopleLayout; children render in its <Outlet />.
 *   - index: the directory view.
 *   - ":id": the selected person's dossier (unknown ids → NotFoundState).
 *   - "*": deeper unmatched paths (e.g. /people/p-01/extra) → NotFoundState,
 *     still inside the layout.
 * - "/" and any other unmatched path forward to "/people", so no URL ever
 *   reaches the router's "No routes matched" warning.
 */
export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/people" replace />} />
            <Route path="/people" element={<PeopleLayout />}>
                <Route index element={<PeopleDirectory />} />
                <Route path=":id" element={<PersonDetail people={people} />} />
                <Route path="*" element={<NotFoundState />} />
            </Route>
            <Route path="*" element={<Navigate to="/people" replace />} />
        </Routes>
    );
}
