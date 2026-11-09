import { useState } from "react";
import AirdropArena from "./components/AirdropArena.jsx";
import AirdropCountdown from "./components/AirdropCountdown.jsx";
import KillFeed from "./components/KillFeed.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import { INITIAL_INVENTORY } from "./data/inventory.js";
import { PUBG_SQUADS, createKillFeed } from "./data/pubgSquads.js";
import { SIMULATED_SERVER_OFFSET_MS, createSchedule } from "./data/schedule.js";
import { createClaimService } from "./services/claimService.js";
import championship from "./components/Championship.module.css";

/**
 * Rendered into <main id="root"> (index.html); landmarks only, no wrapper element.
 *
 *   header
 *   Section A  Countdowns            (usePubgAirdropTimer)
 *   Section B  Claim Center          (useOptimisticClaim + mock claimService)
 *   Section C  PUBG Vietnam Championship: Leaderboard + virtualized KillFeed
 *   footer
 *
 * The schedule, the mock backend and the kill feed are created once per
 * mount. Everything is injectable for tests.
 */
export default function App({
    schedule,
    serverOffsetMs = SIMULATED_SERVER_OFFSET_MS,
    claimService,
    generateClaimId,
    killFeed
} = {}) {
    const [events] = useState(() => schedule ?? createSchedule(Date.now(), serverOffsetMs));
    const [service] = useState(() => claimService ?? createClaimService());
    const [feed] = useState(() => killFeed ?? createKillFeed());
    return (
        <>
            <header>
                <p className="eyebrow">KRAFTON x PUBG Vietnam Championship</p>
                <h1>Airdrop Arena</h1>
                <p className="tagline">Countdowns, airdrop claims and the PUBG Vietnam Championship leaderboard</p>
            </header>
            <AirdropCountdown events={events} serverOffsetMs={serverOffsetMs} />
            <AirdropArena initialInventory={INITIAL_INVENTORY} service={service} generateClaimId={generateClaimId} />
            <section className={championship.championship} aria-labelledby="championship-title">
                <h2 id="championship-title" className={championship.sectionTitle}>PUBG Vietnam Championship</h2>
                <Leaderboard squads={PUBG_SQUADS} />
                <KillFeed events={feed} squads={PUBG_SQUADS} />
            </section>
            <footer>
                <p>Student project with fictional demo data. Not affiliated with KRAFTON or PUBG.</p>
            </footer>
        </>
    );
}
