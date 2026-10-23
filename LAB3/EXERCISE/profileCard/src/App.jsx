import DeveloperCard from "./components/DeveloperCard.jsx";
import { longProfile, sampleProfile } from "./sampleProfile.js";

// Demo / QA switches:
//   ?avatar=broken  an HTTPS URL that fails to load, to show the initials fallback
//   ?profile=long   long words and metadata, to check wrapping at 375px
const BROKEN_AVATAR_URL = "https://example.invalid/avatar.png";

export default function App() {
    const params = new URLSearchParams(window.location.search);
    const profile = params.get("profile") === "long" ? longProfile : sampleProfile;
    const avatarUrl = params.get("avatar") === "broken" ? BROKEN_AVATAR_URL : profile.avatarUrl;
    return <DeveloperCard {...profile} avatarUrl={avatarUrl} />;
}
