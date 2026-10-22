/**
 * Mini-React Audio Engine — T-04 real-time frequency visualizer
 *
 * Draws the analyser spectrum as bars on a <canvas>, one requestAnimationFrame
 * loop at a time. The loop lives outside the player's UI updates: a frame
 * reads the engine's reused Uint8Array and draws straight to the 2D context,
 * so no VNode is built and no DOM node is created or changed per frame.
 *
 * Lifecycle:
 * - start() schedules one frame; calling it again while running does nothing,
 *   so track switches never stack loops.
 * - stop() cancels the pending frame and draws one flat baseline frame.
 * - The loop also stops itself as soon as isActive() turns false (the track
 *   ended or was stopped elsewhere), after drawing that baseline.
 * - dispose() stops, disconnects the resize observer (or removes the window
 *   resize listener) and refuses further start() calls. Safe to repeat.
 *
 * Canvas size: the backing store follows the element's CSS size times the
 * device pixel ratio. Sizes come from ResizeObserver, so frames never read
 * layout.
 */

const BASELINE_HEIGHT = 2;
const BAR_GAP = 1;
// Narrowest bar slot in CSS pixels, gap included.
const MIN_BAR_SLOT = 3;
const DEFAULT_COLORS = Object.freeze({ bar: "#1d4ed8", baseline: "#6b7280", background: "#ffffff" });

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function isCanvas(value) {
    return value !== null &&
        typeof value === "object" &&
        value.nodeType === 1 &&
        typeof value.getContext === "function";
}

/** Read one CSS custom property, falling back when it is not set. */
function cssColor(style, name, fallback) {
    const value = style?.getPropertyValue(name).trim();
    return value || fallback;
}

/**
 * Create a visualizer for canvas.
 *
 * options.getFrequencyData returns the current spectrum (a Uint8Array, reused
 * by the caller) or null when no analyser is available.
 * options.isActive tells the loop whether audio is still playing.
 * requestFrame, cancelFrame, ResizeObserverClass and devicePixelRatio exist
 * for tests; they default to the browser implementations.
 */
export function createVisualizer(canvas, options = {}) {
    if (!isCanvas(canvas)) throw new TypeError("Visualizer: canvas must be a <canvas> element.");
    if (!isPlainObject(options)) throw new TypeError("Visualizer: options must be a plain object.");
    const {
        getFrequencyData,
        isActive = () => true,
        requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
        cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
        ResizeObserverClass = globalThis.ResizeObserver,
        devicePixelRatio = globalThis.devicePixelRatio ?? 1
    } = options;
    if (typeof getFrequencyData !== "function") throw new TypeError("Visualizer: getFrequencyData must be a function.");
    if (typeof isActive !== "function") throw new TypeError("Visualizer: isActive must be a function.");
    if (typeof requestFrame !== "function" || typeof cancelFrame !== "function") {
        throw new TypeError("Visualizer: requestAnimationFrame is not available.");
    }
    if (typeof devicePixelRatio !== "number" || !(devicePixelRatio > 0)) {
        throw new TypeError("Visualizer: devicePixelRatio must be a positive number.");
    }

    // null when the browser cannot draw on canvas; the caller shows a fallback.
    const context2d = canvas.getContext("2d");
    let frameId = null;
    let disposed = false;
    let width = 0;
    let height = 0;
    let colors = DEFAULT_COLORS;
    let frames = 0;
    let resizeObserver = null;
    let removeResizeListener = null;

    /** Match the backing store to the CSS box; only runs on resize. */
    function applySize(cssWidth, cssHeight) {
        width = Math.max(1, Math.round(cssWidth * devicePixelRatio));
        height = Math.max(1, Math.round(cssHeight * devicePixelRatio));
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        if (!context2d) return;
        // Colors come from the stylesheet so the canvas follows the theme.
        const style = typeof getComputedStyle === "function" ? getComputedStyle(canvas) : null;
        colors = {
            bar: cssColor(style, "--audio-bar", DEFAULT_COLORS.bar),
            baseline: cssColor(style, "--audio-border", DEFAULT_COLORS.baseline),
            background: cssColor(style, "--audio-surface", DEFAULT_COLORS.background)
        };
        // Resizing clears the canvas; repaint at once when no loop will.
        if (frameId === null) drawBaseline();
    }

    function clear() {
        context2d.fillStyle = colors.background;
        context2d.fillRect(0, 0, width, height);
    }

    function drawBaseline() {
        if (!context2d || width === 0) return;
        clear();
        context2d.fillStyle = colors.baseline;
        context2d.fillRect(0, height - BASELINE_HEIGHT, width, BASELINE_HEIGHT);
    }

    /**
     * One bar per bin when there is room, otherwise neighbouring bins share a
     * bar showing their peak, so bars stay whole pixels wide. No allocation.
     */
    function drawBars(data) {
        clear();
        const bins = data.length;
        const bars = Math.max(1, Math.min(bins, Math.floor(width / (MIN_BAR_SLOT * devicePixelRatio))));
        const binsPerBar = bins / bars;
        const gap = width / bars >= MIN_BAR_SLOT * devicePixelRatio * 2 ? Math.round(BAR_GAP * devicePixelRatio) : 0;
        const usable = height - BASELINE_HEIGHT;
        context2d.fillStyle = colors.bar;
        for (let bar = 0; bar < bars; bar += 1) {
            const first = Math.floor(bar * binsPerBar);
            const last = Math.max(first + 1, Math.floor((bar + 1) * binsPerBar));
            let peak = 0;
            for (let bin = first; bin < last; bin += 1) {
                if (data[bin] > peak) peak = data[bin];
            }
            if (peak === 0) continue;
            // Integer edges avoid anti-aliased, blurry bar sides.
            const left = Math.round(bar * width / bars);
            const right = Math.round((bar + 1) * width / bars) - gap;
            const barHeight = Math.round((peak / 255) * usable);
            context2d.fillRect(left, usable - barHeight, Math.max(1, right - left), barHeight);
        }
        context2d.fillStyle = colors.baseline;
        context2d.fillRect(0, usable, width, BASELINE_HEIGHT);
    }

    // Created once and reused by every requestFrame call.
    function frame() {
        frameId = null;
        if (disposed) return;
        if (!isActive()) {
            drawBaseline();
            return;
        }
        let data;
        try {
            data = getFrequencyData();
        } catch (error) {
            console.error(error);
            drawBaseline();
            return;
        }
        frames += 1;
        if (!context2d || width === 0) {
            // Nothing visible to draw yet (no 2D context or no size); keep polling cheaply.
        } else if (!data || data.length === 0) {
            drawBaseline();
        } else {
            drawBars(data);
        }
        frameId = requestFrame(frame);
    }

    function start() {
        if (disposed || frameId !== null) return false;
        frameId = requestFrame(frame);
        return true;
    }

    function stop() {
        if (frameId !== null) {
            cancelFrame(frameId);
            frameId = null;
        }
        drawBaseline();
    }

    function dispose() {
        if (disposed) return;
        stop();
        disposed = true;
        resizeObserver?.disconnect();
        resizeObserver = null;
        removeResizeListener?.();
        removeResizeListener = null;
    }

    if (typeof ResizeObserverClass === "function") {
        resizeObserver = new ResizeObserverClass((entries) => {
            const entry = entries[entries.length - 1];
            if (entry && !disposed) applySize(entry.contentRect.width, entry.contentRect.height);
        });
        resizeObserver.observe(canvas);
    } else if (typeof globalThis.addEventListener === "function") {
        const onResize = () => applySize(canvas.clientWidth, canvas.clientHeight);
        globalThis.addEventListener("resize", onResize);
        removeResizeListener = () => globalThis.removeEventListener("resize", onResize);
    }
    applySize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);

    return Object.freeze({
        start,
        stop,
        dispose,
        get isRunning() { return frameId !== null; },
        get isDisposed() { return disposed; },
        get canDraw() { return context2d !== null; },
        /** Frames that read frequency data since creation (for diagnostics and tests). */
        get frameCount() { return frames; },
        get size() { return { width, height }; }
    });
}
