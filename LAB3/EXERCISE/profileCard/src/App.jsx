import DeveloperCard from "./components/DeveloperCard.jsx";
import { sampleProfile } from "./sampleProfile.js";

// ?avatar=broken swaps in an HTTPS URL that fails to load, to show the initials fallback.
const BROKEN_AVATAR_URL = "https://example.invalid/avatar.png";

export default function App() {
    const avatarBroken = new URLSearchParams(window.location.search).get("avatar") === "broken";
    return <DeveloperCard {...sampleProfile} avatarUrl={avatarBroken ? BROKEN_AVATAR_URL : sampleProfile.avatarUrl} />;
}
