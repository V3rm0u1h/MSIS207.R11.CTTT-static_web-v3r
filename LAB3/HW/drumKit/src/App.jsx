import DrumKit from "./components/DrumKit.jsx";
import { DRUM_PADS } from "./drumPads.js";

export default function App() {
    return <DrumKit pads={DRUM_PADS} />;
}
