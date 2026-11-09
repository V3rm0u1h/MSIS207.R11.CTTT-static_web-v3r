import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import AirdropArena from "./AirdropArena.jsx";
import ClaimCard from "./ClaimCard.jsx";
import ClaimStatus, { claimMessage } from "./ClaimStatus.jsx";
import { CLAIM_STATUS } from "../hooks/useOptimisticClaim.js";
import { DEFAULT_LATENCY_MS, createClaimService } from "../services/claimService.js";
import { INITIAL_INVENTORY } from "../data/inventory.js";

// T-03B — claim cards, status feedback and the arena wired to the mock backend
// (PRD 2 sections 3, 7 and 9; Project Rules 1–4).

const noop = () => {};
const IDLE = Object.freeze({ status: CLAIM_STATUS.IDLE, claimId: null, message: "" });

function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
});

describe("ClaimStatus", () => {
    test.each([
        [CLAIM_STATUS.IDLE, IDLE, "Ready to claim."],
        [CLAIM_STATUS.PENDING, { status: "PENDING", claimId: "abcdef1234", message: "" }, "Claiming VIP…"],
        [CLAIM_STATUS.SUCCESS, { status: "SUCCESS", claimId: "abcdef1234", message: "" }, "Claim successful: VIP (claim abcdef12)."],
        [CLAIM_STATUS.CONFLICT, { status: "CONFLICT", claimId: "abcdef1234", message: "Looted Out!" }, "Looted Out! Another player claimed it first; your stock was restored."],
        [CLAIM_STATUS.ERROR, { status: "ERROR", claimId: "abcdef1234", message: "Network error" }, "Network error: your claim was not confirmed and your stock was restored. You can retry."]
    ])("%s has its own message", (_, claim, text) => {
        expect(claimMessage(claim, "VIP")).toBe(text);
    });

    test("is one polite status paragraph", () => {
        const { container } = render(<ClaimStatus claim={IDLE} itemName="VIP" id="vip-status" />);
        expect(container.children).toHaveLength(1);
        const status = screen.getByRole("status");
        expect(status.tagName).toBe("P");
        expect(status.getAttribute("aria-live")).toBe("polite");
        expect(status.id).toBe("vip-status");
    });

    test.each([
        ["an unknown status", { ...IDLE, status: "DONE" }],
        ["an active claim without id", { status: "PENDING", claimId: null, message: "" }],
        ["a bad id", IDLE, "VIP Status"]
    ])("throws a TypeError for %s (Rule 2)", (_, claim, id) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<ClaimStatus claim={claim} itemName="VIP" id={id} />)).toThrow(TypeError);
    });
});

describe("ClaimCard", () => {
    const vip = INITIAL_INVENTORY[0];

    test("shows name, VND price, remaining stock and the claim button, in one article", () => {
        const { container } = render(<ClaimCard item={vip} claim={IDLE} onClaim={noop} onRetry={noop} />);
        expect(container.children).toHaveLength(1);
        const card = screen.getByRole("article", { name: "PVS Grand Finals VIP Ticket" });
        expect(card.querySelector("[data-field='price']").textContent).toBe("1.500.000 ₫");
        expect(card.querySelector("[data-field='stock']").textContent).toBe("25");
        const button = within(card).getByRole("button", { name: "Claim ticket" });
        expect(button.getAttribute("aria-disabled")).toBe("false");
        expect(button.getAttribute("aria-describedby")).toBe("pvs-vip-status");
        expect(document.getElementById("pvs-vip-status").getAttribute("role")).toBe("status");
    });

    test("the crate is labelled as a crate and shown as 0 ₫", () => {
        render(<ClaimCard item={INITIAL_INVENTORY[1]} claim={IDLE} onClaim={noop} onRetry={noop} />);
        expect(screen.getByRole("button", { name: "Claim crate" })).toBeTruthy();
        expect(document.querySelector("[data-field='price']").textContent).toBe("0 ₫");
    });

    test("PENDING: the button is unavailable but keeps focus, and ignores clicks", () => {
        const onClaim = vi.fn();
        render(<ClaimCard item={vip} claim={{ status: "PENDING", claimId: "c1", message: "" }} onClaim={onClaim} onRetry={noop} />);
        const button = screen.getByRole("button", { name: "Claiming…" });
        expect(button.getAttribute("aria-disabled")).toBe("true");
        expect(button.disabled).toBe(false);
        fireEvent.click(button);
        expect(onClaim).not.toHaveBeenCalled();
    });

    test("sold out: \"Looted out\", unavailable", () => {
        const onClaim = vi.fn();
        render(<ClaimCard item={{ ...vip, stock: 0 }} claim={IDLE} onClaim={onClaim} onRetry={noop} />);
        fireEvent.click(screen.getByRole("button", { name: "Looted out" }));
        expect(onClaim).not.toHaveBeenCalled();
    });

    test("Retry appears only after an ERROR", () => {
        const onRetry = vi.fn();
        const { rerender } = render(<ClaimCard item={vip} claim={{ status: "CONFLICT", claimId: "c1", message: "Looted Out!" }} onClaim={noop} onRetry={onRetry} />);
        expect(screen.queryByRole("button", { name: "Retry claim" })).toBeNull();
        rerender(<ClaimCard item={vip} claim={{ status: "ERROR", claimId: "c1", message: "Network error" }} onClaim={noop} onRetry={onRetry} />);
        fireEvent.click(screen.getByRole("button", { name: "Retry claim" }));
        expect(onRetry).toHaveBeenCalledWith("pvs-vip");
    });

    test("renders an HTML payload in the item name as text (Rule 3)", () => {
        render(<ClaimCard item={{ ...vip, name: "<img src=x onerror=alert(1)>" }} claim={IDLE} onClaim={noop} onRetry={noop} />);
        expect(document.querySelector("img")).toBeNull();
        expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("<img src=x onerror=alert(1)>");
    });

    test.each([["a negative stock", { ...vip, stock: -1 }], ["a string price", { ...vip, price: "1500000" }]])(
        "throws a TypeError for %s (Rule 2)", (_, item) => {
            vi.spyOn(console, "error").mockImplementation(() => {});
            expect(() => render(<ClaimCard item={item} claim={IDLE} onClaim={noop} onRetry={noop} />)).toThrow(TypeError);
        }
    );
});

describe("AirdropArena with the mock backend", () => {
    let service;

    beforeEach(() => {
        vi.useFakeTimers();
        service = createClaimService();
        let n = 0;
        renderInMain(<AirdropArena initialInventory={INITIAL_INVENTORY} service={service} generateClaimId={() => `claim-${String(++n).padStart(4, "0")}-uuid`} />);
    });

    const card = (name) => screen.getByRole("article", { name });
    const stockOf = (name) => card(name).querySelector("[data-field='stock']").textContent;
    const statusOf = (name) => within(card(name)).getByRole("status").textContent;
    const button = (name, label) => within(card(name)).getByRole("button", { name: label });
    const respond = () => act(async () => { await vi.advanceTimersByTimeAsync(DEFAULT_LATENCY_MS); });
    const VIP = "PVS Grand Finals VIP Ticket";
    const CRATE = "G-Coin Contraband Crate";

    test("lists both items, in inventory order, inside the Claim Center section", () => {
        const section = screen.getByRole("region", { name: "Claim Center" });
        expect(within(section).getAllByRole("listitem").map((li) => li.firstElementChild.dataset.item)).toEqual(["pvs-vip", "gcoin-crate"]);
    });

    test("HTTP 200: stock drops at once, then the claim is confirmed with accessible feedback", async () => {
        fireEvent.click(button(VIP, "Claim ticket"));
        expect(stockOf(VIP)).toBe("24");
        expect(statusOf(VIP)).toBe(`Claiming ${VIP}…`);
        await respond();
        expect(stockOf(VIP)).toBe("24");
        expect(statusOf(VIP)).toBe(`Claim successful: ${VIP} (claim claim-00).`);
        expect(button(VIP, "Claim ticket").getAttribute("aria-disabled")).toBe("false");
    });

    test("HTTP 409 (forced from the simulation panel): stock restored, Looted Out announced", async () => {
        fireEvent.change(screen.getByRole("combobox", { name: VIP }), { target: { value: "conflict" } });
        expect(service.getMode("pvs-vip")).toBe("conflict");
        fireEvent.click(button(VIP, "Claim ticket"));
        expect(stockOf(VIP)).toBe("24");
        await respond();
        expect(stockOf(VIP)).toBe("25");
        expect(statusOf(VIP)).toMatch(/^Looted Out!/);
    });

    test("network error: stock restored, Retry with the same claimId succeeds once", async () => {
        fireEvent.change(screen.getByRole("combobox", { name: CRATE }), { target: { value: "network-error" } });
        fireEvent.click(button(CRATE, "Claim crate"));
        await respond();
        expect(stockOf(CRATE)).toBe("100");
        expect(statusOf(CRATE)).toMatch(/^Network error: your claim was not confirmed/);
        fireEvent.change(screen.getByRole("combobox", { name: CRATE }), { target: { value: "auto" } });
        fireEvent.click(button(CRATE, "Retry claim"));
        await respond();
        expect(statusOf(CRATE)).toBe(`Claim successful: ${CRATE} (claim claim-00).`);
        expect(stockOf(CRATE)).toBe("99");
        expect(service.getServerStock("gcoin-crate")).toBe(99);
        expect(service.requestCount).toBe(2);
    });

    test("double-clicking sends one request", async () => {
        fireEvent.click(button(VIP, "Claim ticket"));
        fireEvent.click(button(VIP, "Claiming…"));
        fireEvent.click(button(VIP, "Claiming…"));
        await respond();
        expect(service.requestCount).toBe(1);
        expect(stockOf(VIP)).toBe("24");
    });

    test("claims on both items at once: one 409 does not touch the other item", async () => {
        fireEvent.change(screen.getByRole("combobox", { name: VIP }), { target: { value: "conflict" } });
        fireEvent.click(button(VIP, "Claim ticket"));
        fireEvent.click(button(CRATE, "Claim crate"));
        expect([stockOf(VIP), stockOf(CRATE)]).toEqual(["24", "99"]);
        await respond();
        expect([stockOf(VIP), stockOf(CRATE)]).toEqual(["25", "99"]);
        expect(statusOf(CRATE)).toMatch(/^Claim successful/);
    });

    test("selling out: the last unit claims, then the button reads Looted out", async () => {
        cleanup();
        document.body.replaceChildren();
        const tiny = [{ ...INITIAL_INVENTORY[0], stock: 1 }, INITIAL_INVENTORY[1]];
        renderInMain(<AirdropArena initialInventory={tiny} service={createClaimService({ inventory: tiny })} />);
        fireEvent.click(button(VIP, "Claim ticket"));
        expect(stockOf(VIP)).toBe("0");
        await respond();
        expect(button(VIP, "Looted out").getAttribute("aria-disabled")).toBe("true");
        expect(stockOf(VIP)).toBe("0");
    });

    test("throws a TypeError for a service without claimItem (Rule 2)", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<AirdropArena initialInventory={INITIAL_INVENTORY} service={{}} />)).toThrow(TypeError);
    });
});
