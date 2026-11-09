import { expect, test } from "@playwright/test";

// T-02B — PolyphonicSynth against the real Web Audio implementation in Microsoft Edge.
// The module is imported from the Vite dev server; a click provides the user gesture.

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("heading", { level: 1 }).click();   // user activation for audio
});

test("eight real voices, FIFO stealing, click-free release and one shared context", async ({ page }) => {
    const result = await page.evaluate(async () => {
        const { PolyphonicSynth } = await import("/src/audio/PolyphonicSynth.js");
        const created = [];
        const Native = window.AudioContext;
        class CountingContext extends Native {
            constructor() { super(); created.push(this); }
        }
        const synth = new PolyphonicSynth(undefined, { AudioContextClass: CountingContext });
        const before = synth.ctx;
        const midis = [60, 62, 64, 65, 67, 69, 71, 72, 74];
        midis.forEach((midi) => synth.noteOn(midi, 440 * 2 ** ((midi - 69) / 12)));
        const afterNine = [...synth.voices.keys()];
        const duplicate = synth.noteOn(74, 587.33);
        const voice = synth.voices.get(69);
        const isNative = voice.osc instanceof OscillatorNode && voice.gain instanceof GainNode;

        const ended = new Promise((resolve) => voice.osc.addEventListener("ended", resolve, { once: true }));
        synth.noteOff(69);
        const sizeAfterOff = synth.voices.size;
        await synth.ctx.resume();
        await Promise.race([ended, new Promise((_, reject) => setTimeout(() => reject(new Error("oscillator never ended")), 2000))]);

        synth.releaseAll();
        const sizeAfterAll = synth.voices.size;
        await synth.close();
        return { before, afterNine, duplicate, isNative, sizeAfterOff, sizeAfterAll, contexts: created.length, closed: created[0].state };
    });

    expect(result.before).toBeNull();
    expect(result.afterNine).toEqual([62, 64, 65, 67, 69, 71, 72, 74]);
    expect(result.duplicate).toBe(false);
    expect(result.isNative).toBe(true);
    expect(result.sizeAfterOff).toBe(7);
    expect(result.sizeAfterAll).toBe(0);
    expect(result.contexts).toBe(1);
    expect(result.closed).toBe("closed");
});

test("the release ramp really reaches near-silence before the oscillator stops", async ({ page }) => {
    // Render offline so the gain curve can be read sample by sample.
    const peaks = await page.evaluate(async () => {
        const { PolyphonicSynth } = await import("/src/audio/PolyphonicSynth.js");
        const rate = 48000;
        const offline = new OfflineAudioContext(1, rate * 0.3, rate);
        class OfflineClass { constructor() { return offline; } }
        const synth = new PolyphonicSynth(8, { AudioContextClass: OfflineClass, waveform: "sine" });
        synth.noteOn(69, 440);
        // Pause rendering at 100 ms, release the note there, then let rendering finish.
        offline.suspend(0.1).then(() => {
            synth.noteOff(69);
            return offline.resume();
        });
        const buffer = await offline.startRendering();
        const data = buffer.getChannelData(0);
        const peak = (from, to) => {
            let max = 0;
            for (let i = Math.floor(from * rate); i < Math.floor(to * rate); i += 1) max = Math.max(max, Math.abs(data[i]));
            return max;
        };
        return { sustain: peak(0.05, 0.1), midRelease: peak(0.12, 0.125), tail: peak(0.15, 0.3) };
    });
    expect(peaks.sustain).toBeGreaterThan(0.15);
    expect(peaks.midRelease).toBeLessThan(peaks.sustain);
    expect(peaks.tail).toBeLessThan(0.001);
});
