import { lazy } from "react";

// Route-level code splitting: PersonDetail's module is only downloaded the
// first time this component renders, so it stays out of the initial bundle.
// This file is the ONLY place allowed to reference './PersonDetail'.
const PersonDetail = lazy(() => import("./PersonDetail"));

export default PersonDetail;
