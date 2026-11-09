import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/react";
import SOURCE from "./AudioMeter.jsx?raw";
import AudioMeter, { formatDbfs } from "./AudioMeter.jsx";
import { SILENT_LEVEL } from "../audioEngine.js";

// T-01C — visual level meter (PRD 3 section 5).

const LOUD = Object.freeze({ rms: 0.5, dbfs: -6.02, percent: 90, active: true });

function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
});

describe("AudioMeter", () => {
    test("is a labelled region with a 0–100 <meter>, a readout and a dBFS note", () => {
        const { getByRole, container } = renderInMain(<AudioMeter level={LOUD} />);
        const region = getByRole("region", { name: "Audio Level" });
        expect(region.tagName).toBe("SECTION");
        const meter = getByRole("meter", { name: "Relative audio signal level" });
        expect(meter.getAttribute("min")).toBe("0");
        expect(meter.getAttribute("max")).toBe("100");
        expect(meter.getAttribute("value")).toBe("90");
        expect(meter.textContent).toBe("90%");
        expect(container.querySelector("output").textContent).toBe("-6.0 dBFS");
        expect(container.querySelector("p").textContent).toMatch(/dBFS/);
        expect(container.querySelector("p").textContent).toMatch(/not calibrated dB SPL/);
    });

    test("has a clear inactive state when nothing is playing", () => {
        const { getByRole, container } = renderInMain(<AudioMeter level={SILENT_LEVEL} />);
        expect(getByRole("region", { name: "Audio Level" }).dataset.state).toBe("inactive");
        expect(getByRole("meter").getAttribute("value")).toBe("0");
        const output = container.querySelector("output");
        expect(output.textContent).toBe("Inactive · -60.0 dBFS floor");
        expect(output.dataset.state).toBe("inactive");
    });

    test("the readout is not a live region: it must not be spoken 20 times a second", () => {
        const { container } = renderInMain(<AudioMeter level={LOUD} />);
        expect(container.querySelector("output").getAttribute("aria-live")).toBe("off");
    });

    test("never labels the reading as SPL", () => {
        // Outside comments, the only "SPL" in the component is the disclaimer saying it is NOT SPL.
        const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
        expect(code.replace(/not calibrated dB SPL/g, "")).not.toMatch(/SPL/);
        expect(formatDbfs(LOUD)).toBe("-6.0 dBFS");
        expect(formatDbfs({ ...LOUD, dbfs: -0.01 })).toBe("0.0 dBFS");
        expect(formatDbfs({ ...LOUD, dbfs: -120 })).toBe("-60.0 dBFS");
    });

    test.each([
        ["no level", undefined],
        ["a percent above 100", { ...LOUD, percent: 120 }],
        ["a string dbfs", { ...LOUD, dbfs: "-6" }],
        ["a missing active flag", { rms: 0, dbfs: -60, percent: 0 }]
    ])("rejects %s with a TypeError (Project Rule 2)", (_, level) => {
        expect(() => AudioMeter({ level })).toThrow(TypeError);
    });

    test("source contains no <div> and no innerHTML", () => {
        expect(SOURCE).not.toMatch(/<div[\s>]/);
        expect(SOURCE).not.toMatch(/innerHTML/);
    });
});
