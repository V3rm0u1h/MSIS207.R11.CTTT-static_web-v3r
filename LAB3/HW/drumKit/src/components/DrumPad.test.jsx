import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SOURCE from "./DrumPad.jsx?raw";
import DrumPad from "./DrumPad.jsx";

// T-01A — one semantic drum pad (PRD section 4, Project Rules 1–4).

const KICK = Object.freeze({ id: "kick", name: "Kick", code: "KeyW", keyLabel: "W", sound: "/sounds/kick.wav" });

/** Renders into a <ul>, as DrumKit hosts the pads. */
function renderList(element) {
    const list = document.body.appendChild(document.createElement("ul"));
    return render(element, { container: list });
}

afterEach(() => {
    cleanup();
    document.body.replaceChildren();
});

describe("DrumPad", () => {
    test("renders exactly <li><button type=button><span/> <kbd/><span/></button></li>, no wrapper", () => {
        const { container } = renderList(<DrumPad pad={KICK} />);
        expect(container.children).toHaveLength(1);
        const item = container.firstElementChild;
        expect(item.tagName).toBe("LI");
        expect(item.children).toHaveLength(1);
        const button = item.firstElementChild;
        expect(button.tagName).toBe("BUTTON");
        expect(button.getAttribute("type")).toBe("button");
        expect([...button.children].map((node) => node.tagName)).toEqual(["SPAN", "KBD", "SPAN"]);
        expect(container.querySelectorAll("div")).toHaveLength(0);
    });

    test("shows the instrument name and the keyboard shortcut inside <kbd>", () => {
        const { container } = renderList(<DrumPad pad={KICK} />);
        expect(container.querySelector("span").textContent).toBe("Kick");
        expect(container.querySelector("kbd").textContent).toBe("W");
    });

    test("has a meaningful accessible name that starts with the visible text (WCAG 2.5.3)", () => {
        const { getByRole } = renderList(<DrumPad pad={KICK} />);
        const button = getByRole("button", { name: "Kick W key, drum pad" });
        expect(button.hasAttribute("aria-label")).toBe(false);
        expect(button.getAttribute("aria-keyshortcuts")).toBe("W");
        expect(button.dataset.padId).toBe("kick");
        // The visible words are separated by a real space, so "Kick W" is a contiguous part of the name.
        expect(button.textContent.replace(/\s+/g, " ").trim()).toBe("Kick W key, drum pad");
    });

    test("exposes aria-pressed and reflects the pressed prop", () => {
        const { getByRole, rerender } = renderList(<DrumPad pad={KICK} />);
        expect(getByRole("button").getAttribute("aria-pressed")).toBe("false");
        rerender(<DrumPad pad={KICK} pressed />);
        expect(getByRole("button").getAttribute("aria-pressed")).toBe("true");
    });

    test("is operable by mouse click, Enter and Space, passing the pad to onTrigger", async () => {
        const onTrigger = vi.fn();
        const user = userEvent.setup();
        const { getByRole } = renderList(<DrumPad pad={KICK} onTrigger={onTrigger} />);
        const button = getByRole("button");

        await user.click(button);
        button.focus();
        await user.keyboard("{Enter}");
        await user.keyboard(" ");

        expect(onTrigger).toHaveBeenCalledTimes(3);
        onTrigger.mock.calls.forEach(([pad]) => expect(pad).toBe(KICK));
    });

    test("is operable by touch: a pointer-driven click still triggers", () => {
        const onTrigger = vi.fn();
        const { getByRole } = renderList(<DrumPad pad={KICK} onTrigger={onTrigger} />);
        fireEvent.click(getByRole("button"), { pointerType: "touch" });
        expect(onTrigger).toHaveBeenCalledWith(KICK);
    });

    test("applies class names passed by the parent, e.g. from its CSS Module", () => {
        const styles = { pad: "DrumKit_pad__a1", name: "DrumKit_padName__b2", key: "DrumKit_padKey__c3", hint: "DrumKit_srOnly__d4" };
        const { container } = renderList(
            <DrumPad pad={KICK} className={styles.pad} nameClassName={styles.name} keyClassName={styles.key} hintClassName={styles.hint} />
        );
        const button = container.querySelector("button");
        expect(button.className).toBe(styles.pad);
        expect(button.children[0].className).toBe(styles.name);
        expect(button.children[1].className).toBe(styles.key);
        expect(button.children[2].className).toBe(styles.hint);
    });

    test("renders pad text as text, never as HTML (Project Rule 3)", () => {
        const payload = "<img src=x onerror=\"window.__drumPadXss = true\">";
        const { container } = renderList(<DrumPad pad={{ ...KICK, name: payload }} />);
        expect(container.querySelectorAll("img")).toHaveLength(0);
        expect(container.querySelector("span").textContent).toBe(payload);
        expect(window.__drumPadXss).toBeUndefined();
    });

    test.each([
        ["no pad", {}],
        ["a pad without a sound", { pad: { ...KICK, sound: undefined } }],
        ["a non-boolean pressed", { pad: KICK, pressed: "yes" }],
        ["a non-function onTrigger", { pad: KICK, onTrigger: "play" }]
    ])("rejects %s with a TypeError (Project Rule 2)", (_, props) => {
        expect(() => DrumPad(props)).toThrow(TypeError);
    });

    test("source contains no <div>, no innerHTML and no global UI-library CSS import", () => {
        expect(SOURCE).not.toMatch(/<div[\s>]/);
        expect(SOURCE).not.toMatch(/innerHTML|dangerouslySetInnerHTML/);
        expect(SOURCE).not.toMatch(/import\s+["'][^"']*\.(css|less)["']/);
    });
});
