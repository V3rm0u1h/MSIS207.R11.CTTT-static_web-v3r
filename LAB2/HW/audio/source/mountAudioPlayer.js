/**
 * Mini-React Audio Engine — player UI (T-01, T-02, T-03)
 *
 * Layout inside the mount root (rendered once with renderToDOM):
 *   <section>         track list (one native button per track) and queue actions
 *   <p role="status"> live region for loading, playback and error messages
 *   <p>               queue summary: waiting, loading and outcome counts
 *   <p>               Play / Stop controls
 *   <p>               analyser details and a one-off spectrum reading
 *
 * Nothing is re-rendered: text and button states are updated in place, so
 * focus never moves. Clicks go through the root event delegation system.
 * Every download/decode goes through the FIFO queue (T-02), one at a time;
 * the engine does the audio work and this module only turns results and
 * AudioEngineError codes into text.
 *
 * Stale work (T-03): choosing another track cancels the load the previous
 * choice started (loads from "Load all" are kept). A settled load only
 * touches the status line if its track is still selected, and Play only
 * starts if no other track was chosen while the context resumed
 * (selection generation). Cancellation is never shown as an error.
 */

import { createElement } from "../../HW/source/createElement.js";
import { renderToDOM } from "../../HW/source/renderToDOM.js";
import { attachRootEventDelegation } from "../../HW/source/events.js";
import { createAudioEngine, AudioEngineError, isAbortError } from "./audioEngine.js";
import { createJobQueue, JOB_STATUS } from "./audioQueue.js";

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

function describeQueue(status) {
    const current = status.current ? ` (“${status.current.label}”)` : "";
    return `Queue: ${status.pending} waiting, ${status.active} loading${current} · ` +
        `${status.success} loaded, ${status.error} failed, ${status.cancelled} cancelled.`;
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
    const queue = options.queue ?? createJobQueue();

    let currentTrack = null;
    // Bumped on every selection; async work started earlier checks it.
    let selectionGeneration = 0;
    // The load the current selection started: { trackId, jobId } or null.
    let selectionLoad = null;
    // Decoded buffers and last load errors, by track id.
    const buffers = new Map();
    const loadErrors = new Map();
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
                        onClick: () => selectTrack(track)
                    },
                        track.title,
                        createElement("span", { className: "audio-tracks__state", "data-track-state": "idle" }, " — not loaded")
                    )
                ))
            ),
            createElement("p", { className: "audio-controls" },
                createElement("button", { type: "button", className: "audio-controls__button", "data-action": "load-all", onClick: handleLoadAll }, "Load all tracks"),
                createElement("button", { type: "button", className: "audio-controls__button", "data-action": "cancel", disabled: true, onClick: handleCancelLoads }, "Cancel loads")
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
    const queueElement = renderToDOM(createElement("p", { className: "audio-queue", "data-queue-summary": "" },
        describeQueue(queue.getQueueStatus())));
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
    const cancelButton = trackElement.querySelector("[data-action=cancel]");
    const sampleButton = analyserElement.querySelector("[data-action=sample]");
    const analyserInfo = analyserElement.querySelector("[data-analyser-info]");

    attachRootEventDelegation(root, ["click"]);
    root.replaceChildren(trackElement, statusElement, queueElement, controlsElement, analyserElement);

    function setStatus(text, state) {
        statusElement.textContent = text;
        statusElement.dataset.state = state;
    }

    /** Per-track label: decoded buffer, queue position, or last outcome. */
    function trackState(track) {
        if (buffers.has(track.id)) return ["ready", " — ready"];
        const unfinished = queue.findUnfinished(track.id);
        if (unfinished?.status === JOB_STATUS.RUNNING) return ["loading", " — loading"];
        if (unfinished) return ["queued", ` — waiting (#${queue.positionOf(track.id)})`];
        if (loadErrors.has(track.id)) return ["error", " — failed"];
        return ["idle", " — not loaded"];
    }

    function syncTracks() {
        for (const track of tracks) {
            const button = trackElement.querySelector(`[data-track-id="${track.id}"]`);
            const label = button.querySelector("[data-track-state]");
            const [state, text] = trackState(track);
            button.setAttribute("aria-pressed", String(track.id === currentTrack?.id));
            label.dataset.trackState = state;
            label.textContent = text;
        }
    }

    function syncControls() {
        playButton.disabled = !currentTrack || !buffers.has(currentTrack.id);
        stopButton.disabled = !engine.isPlaying;
        const { pending, active } = queue.getQueueStatus();
        cancelButton.disabled = pending + active === 0;
        syncTracks();
    }

    function describeAnalyser() {
        const analyser = engine.getAnalyser();
        return `FFT size ${analyser.fftSize} · ${analyser.frequencyBinCount} frequency bins.`;
    }

    /** Status line for the selected track while it is not yet decoded. */
    function describeWaiting(track) {
        const job = queue.findUnfinished(track.id);
        if (job?.status === JOB_STATUS.RUNNING) return [`Loading “${track.title}”…`, "loading"];
        return [`“${track.title}” is waiting in the queue (position ${queue.positionOf(track.id)}).`, "queued"];
    }

    /** Queue a load unless the track is loaded or already queued. Returns the job id or null. */
    function requestLoad(track) {
        if (buffers.has(track.id) || queue.findUnfinished(track.id)) return null;
        loadErrors.delete(track.id);
        const { id: jobId, done } = queue.enqueue({
            key: track.id,
            label: track.title,
            // The job's own signal: cancelling this job never touches another track.
            run: ({ signal }) => engine.load(track.url, { signal })
        });
        done.then((job) => handleJobSettled(track, job));
        return jobId;
    }

    function handleJobSettled(track, job) {
        if (!mounted) return;
        const selected = track.id === currentTrack?.id;
        if (job.status === JOB_STATUS.SUCCESS) {
            buffers.set(track.id, job.result);
            analyserInfo.textContent = describeAnalyser();
            sampleButton.disabled = false;
            if (selected) setStatus(`“${track.title}” is ready (${formatSeconds(job.result.duration)}). Press Play.`, "ready");
        } else if (job.status === JOB_STATUS.ERROR && !isAbortError(job.error)) {
            loadErrors.set(track.id, job.error);
            if (selected) setStatus(`“${track.title}” could not be loaded: ${describeError(job.error)}`, "error");
        } else if (selected) {
            setStatus(`Loading “${track.title}” was cancelled. Choose it again to retry.`, "idle");
        }
        syncControls();
    }

    // One summary update per queue change; the status line only changes when
    // the selected track's job starts.
    const unsubscribe = queue.subscribe((status, change) => {
        if (!mounted) return;
        queueElement.textContent = describeQueue(status);
        if (change.type === "started" && change.job.key === currentTrack?.id) {
            setStatus(`Loading “${currentTrack.title}”…`, "loading");
        }
        syncControls();
    });

    function selectTrack(track) {
        if (track.id !== currentTrack?.id) {
            engine.stop();
            selectionGeneration += 1;
            // The previous choice's load is now stale: cancel it (no-op if finished).
            if (selectionLoad && selectionLoad.trackId !== track.id) queue.cancel(selectionLoad.jobId);
            selectionLoad = null;
        }
        currentTrack = track;
        const buffer = buffers.get(track.id);
        if (buffer) {
            setStatus(`“${track.title}” is ready (${formatSeconds(buffer.duration)}). Press Play.`, "ready");
        } else {
            // Not loaded yet: queue it (a failed track is retried) or report its place.
            const jobId = requestLoad(track);
            if (jobId !== null) selectionLoad = { trackId: track.id, jobId };
            setStatus(...describeWaiting(track));
        }
        syncControls();
    }

    function handleLoadAll() {
        const added = tracks.filter((track) => requestLoad(track) !== null).length;
        setStatus(added === 0
            ? "Every track is already loaded or waiting."
            : `Queued ${added} ${added === 1 ? "track" : "tracks"}; they load one at a time in order.`, "queued");
        syncControls();
    }

    function handleCancelLoads() {
        const cancelled = queue.cancelAll();
        selectionLoad = null;
        setStatus(`Cancelled ${cancelled.length} ${cancelled.length === 1 ? "load" : "loads"}.`, "idle");
        syncControls();
    }

    async function handlePlay() {
        const track = currentTrack;
        const generation = selectionGeneration;
        const isCurrent = () => mounted && generation === selectionGeneration;
        try {
            const started = await engine.play(buffers.get(track?.id), {
                isCurrent,
                onEnded: () => {
                    if (!mounted) return;
                    setStatus(`“${track.title}” finished.`, "ready");
                    syncControls();
                }
            });
            // Another track was chosen while the context resumed: leave its status alone.
            if (!started || !isCurrent()) return;
            setStatus(`Playing “${track.title}”.`, "playing");
        } catch (error) {
            if (!isCurrent()) return;
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
        const analyser = engine.getAnalyser();
        const peakHz = Math.round(peakBin * analyser.context.sampleRate / analyser.fftSize);
        analyserInfo.textContent = data[peakBin] === 0
            ? `${describeAnalyser()} No signal right now.`
            : `${describeAnalyser()} Loudest bin ${peakBin} (about ${peakHz} Hz, level ${data[peakBin]}/255).`;
    }

    return Object.freeze({
        engine,
        queue,
        get currentTrack() { return currentTrack; },
        get buffer() { return currentTrack ? buffers.get(currentTrack.id) ?? null : null; },
        /**
         * Release everything this player created: cancel waiting jobs and
         * abort the running download (queue), drop decoded buffers, empty
         * the root, then dispose the engine. Safe to call more than once.
         * Root click delegation stays attached: events.js has no detach and
         * registers each root once, so remounting does not add listeners.
         */
        async dispose() {
            if (!mounted) return;
            mounted = false;
            unsubscribe();
            queue.dispose();
            selectionLoad = null;
            currentTrack = null;
            buffers.clear();
            loadErrors.clear();
            root.replaceChildren();
            await engine.dispose();
        }
    });
}
