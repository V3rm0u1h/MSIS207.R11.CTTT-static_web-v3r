import { useState } from "react";
import AirdropArena from "./components/AirdropArena.jsx";
import AirdropCountdown from "./components/AirdropCountdown.jsx";
import { INITIAL_INVENTORY } from "./data/inventory.js";
import { SIMULATED_SERVER_OFFSET_MS, createSchedule } from "./data/schedule.js";
import { createClaimService } from "./services/claimService.js";

/**
 * Rendered into <main id="root"> (index.html); landmarks only, no wrapper element.
 * The schedule and the mock claim backend are created once per mount, so the
 * airdrop target stays fixed and the server keeps its stock between claims.
 * `schedule`, `serverOffsetMs`, `claimService` and `generateClaimId` are injectable for tests.
 */
export default function App({ schedule, serverOffsetMs = SIMULATED_SERVER_OFFSET_MS, claimService, generateClaimId } = {}) {
    const [events] = useState(() => schedule ?? createSchedule(Date.now(), serverOffsetMs));
    const [service] = useState(() => claimService ?? createClaimService());
    return (
        <>
            <header>
                <p className="eyebrow">KRAFTON x PUBG Vietnam Championship</p>
                <h1>Airdrop Arena</h1>
                <p className="tagline">Countdowns to the PVS Grand Finals and the next G-Coin airdrop</p>
            </header>
            <AirdropCountdown events={events} serverOffsetMs={serverOffsetMs} />
            <AirdropArena initialInventory={INITIAL_INVENTORY} service={service} generateClaimId={generateClaimId} />
            <footer>
                <p>Student project with fictional demo data. Not affiliated with KRAFTON or PUBG.</p>
            </footer>
        </>
    );
}
