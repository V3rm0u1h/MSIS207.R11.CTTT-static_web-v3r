import { useState } from "react";
import AirdropCountdown from "./components/AirdropCountdown.jsx";
import { SIMULATED_SERVER_OFFSET_MS, createSchedule } from "./data/schedule.js";

/**
 * Rendered into <main id="root"> (index.html); landmarks only, no wrapper element.
 * The schedule is created once per mount, so the airdrop target stays fixed
 * while the countdown runs. `schedule` and `serverOffsetMs` are injectable for tests.
 */
export default function App({ schedule, serverOffsetMs = SIMULATED_SERVER_OFFSET_MS } = {}) {
    const [events] = useState(() => schedule ?? createSchedule(Date.now(), serverOffsetMs));
    return (
        <>
            <header>
                <p className="eyebrow">KRAFTON x PUBG Vietnam Championship</p>
                <h1>Airdrop Arena</h1>
                <p className="tagline">Countdowns to the PVS Grand Finals and the next G-Coin airdrop</p>
            </header>
            <AirdropCountdown events={events} serverOffsetMs={serverOffsetMs} />
            <footer>
                <p>Student project with fictional demo data. Not affiliated with KRAFTON or PUBG.</p>
            </footer>
        </>
    );
}
