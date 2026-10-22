/**
 * Mini-React Audio Engine — T-01 player UI
 *
 * Layout inside the mount root (rendered once with renderToDOM):
 *   <section>         track list: one native button per track
 *   <p role="status"> live region for loading, playback and error messages
 *   <p>               Play / Stop controls
 *   <p>               analyser details and a one-off spectrum reading
 *
 * Nothing is re-rendered: status text, button states and analyser text are
 * updated in place, so focus never moves. Clicks go through the root event
 * delegation system. All audio work is delegated to the engine; this module
 * only translates engine results and AudioEngineError codes into text.
 */

import { createElement } from "../../HW/source/createElement.js";
import { renderToDOM } from "../../HW/source/renderToDOM.js";
import { attachRootEventDelegation } from "../../HW/source/events.js";
import { createAudioEngine, AudioEngineError } from "./audioEngine.js";

const TRACK_ID_PATTERN = /^[a-z0-9-]+$/;

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function validateTracks(tracks) {
    if (!Array.isArray(tracks) || tracks.length === 0) {
        throw new TypeError("Audio player: tracks must be a non-empty array.");
    }
    const ids = new Set();
    for (const [index, track] of tracks.entries()) {
        if (!isPlainObject(track)) {
            throw new TypeError(`Audio player: track ${index} must be a plain object.`);
        }
        const { id, title, url } = track;
        if (typeof id !== "string" || !TRACK_ID_PATTERN.test(id)) {
            throw new TypeError(`Audio player: track ${index} id must use lowercase letters, digits and hyphens.`);
        }
        if (ids.has(id)) throw new TypeError(`Audio player: duplicate track id "${id}".`);
        ids.add(id);
        if (typeof title !== "string" || title.trim() === "") {
            throw new TypeError(`Audio player: track "${id}" needs a non-empty title.`);
        }
        if (typeof url !== "string" || url.trim() === "") {
            throw new TypeError(`Audio player: track "${id}" needs a non-empty url.`);
        }
    }
}

/** Unknown errors still get a readable message; details go to the console. */
function describeError(error) {
    if (error instanceof AudioEngineError) return error.message;
    console.error(error);
    return "Something went wrong with audio playback.";
}

function formatSeconds(seconds) {
    return `${seconds.toFixed(1)} s`;
}

/** Mount the player into root. Everything is validated before root is touched. */
export function mountAudioPlayer(root, props, options = {}) {
    if (!root || root.nodeType !== 1 || typeof root.replaceChildren !== "function") {
        throw new TypeError("Audio player: mount root must be a valid DOM element.");
    }
    if (!isPlainObject(props)) throw new TypeError("Audio player: props must be a plain object.");
    if (!isPlainObject(options)) throw new TypeError("Audio player: options must be a plain object.");
    const { id = "audio-player", tracks } = props;
    if (typeof id !== "string" || !TRACK_ID_PATTERN.test(id)) {
        throw new TypeError("Audio player: id must use lowercase letters, digits and hyphens.");
    }
    validateTracks(tracks);
    const engine = options.engine ?? createAudioEngine();

    let currentTrack = null;
    let currentBuffer = null;
    // Latest click wins until the FIFO queue arrives in T-02.
    let loadToken = 0;
    let mounted = true;

    function trackList() {
        const titleId = `${id}-tracks-title`;
        return createElement("section", { className: "audio-tracks", "aria-labelledby": titleId },
            createElement("h2", { id: titleId }, "Tracks"),
            createElement("ul", { className: "audio-tracks__list" },
                tracks.map((track) => createElement("li", null,
                    createElement("button", {
                        type: "button",
                        className: "audio-tracks__button",
                        "data-track-id": track.id,
                        "aria-pressed": "false",
                        onClick: () => loadTrack(track)
                    }, track.title)
                ))
            )
        );
    }

    const trackElement = renderToDOM(trackList());
    const statusElement = renderToDOM(createElement("p", {
        id: `${id}-status`,
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        className: "audio-status",
        "data-state": "idle"
    }, "Choose a track to load it."));
    const controlsElement = renderToDOM(createElement("p", { className: "audio-controls" },
        createElement("button", { type: "button", className: "audio-controls__button", "data-action": "play", disabled: true, onClick: handlePlay }, "Play"),
        createElement("button", { type: "button", className: "audio-controls__button", "data-action": "stop", disabled: true, onClick: handleStop }, "Stop")
    ));
    const analyserElement = renderToDOM(createElement("p", { className: "audio-analyser" },
        createElement("span", { "data-analyser-info": "" }, "Analyser starts when the first track loads."),
        " ",
        createElement("button", { type: "button", className: "audio-controls__button", "data-action": "sample", disabled: true, onClick: handleSample }, "Read spectrum")
    ));

    const playButton = controlsElement.querySelector("[data-action=play]");
    const stopButton = controlsElement.querySelector("[data-action=stop]");
    const sampleButton = analyserElement.querySelector("[data-action=sample]");
    const analyserInfo = analyserElement.querySelector("[data-analyser-info]");

    attachRootEventDelegation(root, ["click"]);
    root.replaceChildren(trackElement, statusElement, controlsElement, analyserElement);

    function setStatus(text, state) {
        statusElement.textContent = text;
        statusElement.dataset.state = state;
    }

    function syncControls() {
        playButton.disabled = currentBuffer === null;
        stopButton.disabled = !engine.isPlaying;
        for (const button of trackElement.querySelectorAll("[data-track-id]")) {
            button.setAttribute("aria-pressed", String(button.dataset.trackId === currentTrack?.id));
        }
    }

    function describeAnalyser() {
        const analyser = engine.getAnalyser();
        return `FFT size ${analyser.fftSize} · ${analyser.frequencyBinCount} frequency bins.`;
    }

    async function loadTrack(track) {
        const token = ++loadToken;
        engine.stop();
        currentTrack = track;
        currentBuffer = null;
        syncControls();
        setStatus(`Loading “${track.title}”…`, "loading");
        try {
            const buffer = await engine.load(track.url);
            if (!mounted || token !== loadToken) return;
            currentBuffer = buffer;
            setStatus(`“${track.title}” is ready (${formatSeconds(buffer.duration)}). Press Play.`, "ready");
            analyserInfo.textContent = describeAnalyser();
            sampleButton.disabled = false;
        } catch (error) {
            if (!mounted || token !== loadToken) return;
            setStatus(`“${track.title}” could not be loaded: ${describeError(error)}`, "error");
        }
        syncControls();
    }

    async function handlePlay() {
        const track = currentTrack;
        try {
            await engine.play(currentBuffer, {
                onEnded: () => {
                    if (!mounted) return;
                    setStatus(`“${track.title}” finished.`, "ready");
                    syncControls();
                }
            });
            if (!mounted) return;
            setStatus(`Playing “${track.title}”.`, "playing");
        } catch (error) {
            if (!mounted) return;
            setStatus(describeError(error), "error");
        }
        syncControls();
    }

    function handleStop() {
        engine.stop();
        if (currentTrack) setStatus(`Stopped “${currentTrack.title}”.`, "ready");
        syncControls();
    }

    function handleSample() {
        const data = engine.getFrequencyData();
        let peakBin = 0;
        for (let bin = 1; bin < data.length; bin += 1) {
            if (data[bin] > data[peakBin]) peakBin = bin;
        }
        const peakHz = Math.round(peakBin * engine.getAnalyser().context.sampleRate / engine.getAnalyser().fftSize);
        analyserInfo.textContent = data[peakBin] === 0
            ? `${describeAnalyser()} No signal right now.`
            : `${describeAnalyser()} Loudest bin ${peakBin} (about ${peakHz} Hz, level ${data[peakBin]}/255).`;
    }

    return Object.freeze({
        engine,
        get currentTrack() { return currentTrack; },
        get buffer() { return currentBuffer; },
        async dispose() {
            if (!mounted) return;
            mounted = false;
            root.replaceChildren();
            await engine.dispose();
        }
    });
}
