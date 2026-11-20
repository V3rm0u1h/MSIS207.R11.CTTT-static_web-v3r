import { Routes, Route, Navigate } from "react-router";
import PeopleLayout from "./components/PeopleLayout";
import PeopleDirectory from "./components/PeopleDirectory";
import PersonDetail from "./components/PersonDetail";

/**
 * Declarative React Router v7 route table.
 * - "/people" renders the shared PeopleLayout; children render in its <Outlet />.
 *   - index: the directory view.
 *   - ":id": the selected person's dossier.
 * - "/" forwards to "/people" so the app root never hits an unmatched route.
 */
export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/people" replace />} />
            <Route path="/people" element={<PeopleLayout />}>
                <Route index element={<PeopleDirectory />} />
                <Route path=":id" element={<PersonDetail />} />
            </Route>
        </Routes>
    );
}
