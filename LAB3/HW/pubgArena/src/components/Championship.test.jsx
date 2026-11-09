import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../App.jsx";
import KillFeed, { KILL_FEED_OVERSCAN, KILL_FEED_VIEWPORT, KILL_ROW_HEIGHT } from "./KillFeed.jsx";
import Leaderboard, { selectSquads } from "./Leaderboard.jsx";
import VirtualList from "./VirtualList.jsx";
import LEADERBOARD_SOURCE from "./Leaderboard.jsx?raw";
import {
    PUBG_SQUADS, assertKillFeed, assertSquads, createInitialKillFeed, createKillFeed, generateKillFeed
} from "../data/pubgSquads.js";

// T-03C — leaderboard (sort, search, filter), kill feed (filter, virtualization) and the
// Championship section (PRD 3 sections 3–9, Project Rules 1–4).

const NOW = Date.parse("2026-11-09T12:00:00Z");
const FEED = createKillFeed(1000, NOW);
const MAX_ROWS = KILL_FEED_VIEWPORT / KILL_ROW_HEIGHT + 1 + 2 * KILL_FEED_OVERSCAN;   // 17

function renderInMain(element) {
    const main = document.body.appendChild(document.createElement("main"));
    return render(element, { container: main });
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.body.replaceChildren();
});

const tags = (squads) => squads.map((squad) => squad.tag);

describe("squad and kill-feed data", () => {
    test("the four required squads, with stable unique ids", () => {
        expect(PUBG_SQUADS.map(({ id, name, tag, wwcd, placementPoints, killPoints }) => [id, name, tag, wwcd, placementPoints, killPoints])).toEqual([
            ["squad-01", "The Expendables", "TE", 3, 85, 72],
            ["squad-02", "Cerberus Esports", "CES", 2, 78, 81],
            ["squad-03", "Roy Esports", "ROY", 1, 65, 69],
            ["squad-04", "AGG", "AGG", 1, 59, 74]
        ]);
        expect(Object.isFrozen(PUBG_SQUADS) && PUBG_SQUADS.every(Object.isFrozen)).toBe(true);
        expect(() => assertSquads(PUBG_SQUADS)).not.toThrow();
    });

    test("the PRD's two sample events come first; the demo feed has 1,000 events with unique ids", () => {
        expect(createInitialKillFeed(NOW)).toEqual([
            { id: "kill-01", killer: "Player A", victim: "Player B", squad: "TE", weapon: "M416", timestamp: NOW },
            { id: "kill-02", killer: "Player C", victim: "Player D", squad: "CES", weapon: "AWM", timestamp: NOW - 5000 }
        ]);
        expect(FEED).toHaveLength(1000);
        expect(FEED.slice(0, 2).map((e) => e.id)).toEqual(["kill-01", "kill-02"]);
        expect(() => assertKillFeed(FEED)).not.toThrow();
    });

    test("the generator is deterministic, newest first, and never has a squad kill itself", () => {
        const a = generateKillFeed(300, { startMs: NOW });
        expect(generateKillFeed(300, { startMs: NOW })).toEqual(a);
        a.forEach((event, i) => {
            if (i > 0) expect(event.timestamp).toBeLessThan(a[i - 1].timestamp);
            expect(event.victim.startsWith(`${event.squad}.`)).toBe(false);
            expect(event.killer.startsWith(`${event.squad}.`)).toBe(true);
        });
        expect(new Set(a.map((e) => e.squad))).toEqual(new Set(tags(PUBG_SQUADS)));
    });

    test.each([
        ["duplicate ids", [FEED[0], FEED[0]]],
        ["a missing weapon", [{ ...FEED[0], weapon: "" }]],
        ["a string timestamp", [{ ...FEED[0], timestamp: "now" }]]
    ])("assertKillFeed rejects %s (Rule 2)", (_, events) => {
        expect(() => assertKillFeed(events)).toThrow(TypeError);
    });
});

describe("selectSquads", () => {
    test("sorts descending by each of the three categories", () => {
        expect(tags(selectSquads(PUBG_SQUADS, { sortBy: "wwcd" }))).toEqual(["TE", "CES", "ROY", "AGG"]);           // ROY/AGG tie: dataset order
        expect(tags(selectSquads(PUBG_SQUADS, { sortBy: "placementPoints" }))).toEqual(["TE", "CES", "ROY", "AGG"]);
        expect(tags(selectSquads(PUBG_SQUADS, { sortBy: "killPoints" }))).toEqual(["CES", "AGG", "TE", "ROY"]);
    });

    test("never mutates the original dataset (toSorted, not sort)", () => {
        const sortSpy = vi.spyOn(Array.prototype, "sort");
        const before = PUBG_SQUADS.map((s) => s.id);
        selectSquads(PUBG_SQUADS, { sortBy: "killPoints" });
        expect(PUBG_SQUADS.map((s) => s.id)).toEqual(before);
        expect(sortSpy).not.toHaveBeenCalled();
        expect(LEADERBOARD_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "")).toMatch(/\.toSorted\(/);
        expect(LEADERBOARD_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")).not.toMatch(/\.sort\(/);
    });

    test("searches by name and by tag, ignoring case, spaces at the ends and diacritics", () => {
        expect(tags(selectSquads(PUBG_SQUADS, { query: "cerberus" }))).toEqual(["CES"]);
        expect(tags(selectSquads(PUBG_SQUADS, { query: "  roy " }))).toEqual(["ROY"]);
        expect(tags(selectSquads(PUBG_SQUADS, { query: "agg" }))).toEqual(["AGG"]);
        expect(tags(selectSquads(PUBG_SQUADS, { query: "Esports" }))).toEqual(["CES", "ROY"]);
        expect(tags(selectSquads(PUBG_SQUADS, { query: "TÉ" }))).toEqual(["TE"]);
        expect(selectSquads(PUBG_SQUADS, { query: "zzz" })).toEqual([]);
    });

    test("filters by minimum WWCD, combined with search", () => {
        expect(tags(selectSquads(PUBG_SQUADS, { minWwcd: 2 }))).toEqual(["TE", "CES"]);
        expect(tags(selectSquads(PUBG_SQUADS, { minWwcd: 3 }))).toEqual(["TE"]);
        expect(selectSquads(PUBG_SQUADS, { minWwcd: 3, query: "ces" })).toEqual([]);
    });

    test("rejects an unknown sort field (Rule 2)", () => {
        expect(() => selectSquads(PUBG_SQUADS, { sortBy: "name" })).toThrow(TypeError);
    });
});

describe("Leaderboard", () => {
    const rowTags = () => within(screen.getByRole("table")).getAllByRole("row").slice(1).map((row) => row.cells[2].textContent);

    test("is a semantic table: caption, column headers, squad names as row headers", () => {
        renderInMain(<Leaderboard />);
        const table = screen.getByRole("table", { name: /PUBG Vietnam squads/ });
        expect(within(table).getAllByRole("columnheader").map((th) => th.textContent))
            .toEqual(["Rank", "Squad", "Tag", "WWCD", "Placement Points", "Kill Points"]);
        expect(within(table).getAllByRole("rowheader").map((th) => th.textContent))
            .toEqual(["The Expendables", "Cerberus Esports", "Roy Esports", "AGG"]);
        expect(table.closest("figure").tabIndex).toBe(0);
    });

    test("every control has a visible label tied by htmlFor / useId", () => {
        renderInMain(<Leaderboard />);
        const search = screen.getByRole("searchbox", { name: "Search squads" });
        const wwcd = screen.getByRole("combobox", { name: "Minimum WWCD" });
        const sort = screen.getByRole("combobox", { name: "Sort by" });
        // React 19's useId() format (e.g. "_r_1_") is an implementation detail: check the wiring, not the format.
        const ids = [search, wwcd, sort].map((control) => control.id);
        expect(new Set(ids).size).toBe(3);
        ids.forEach((id) => expect(document.querySelector(`label[for="${id}"]`)).not.toBeNull());
        expect(screen.getByRole("search", { name: "Filter and sort squads" })).toBeTruthy();
    });

    test("sorting by each category reorders the rows and marks the sorted column", () => {
        renderInMain(<Leaderboard />);
        expect(rowTags()).toEqual(["TE", "CES", "ROY", "AGG"]);
        expect(screen.getByRole("columnheader", { name: "WWCD" }).getAttribute("aria-sort")).toBe("descending");
        fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), { target: { value: "killPoints" } });
        expect(rowTags()).toEqual(["CES", "AGG", "TE", "ROY"]);
        expect(screen.getByRole("columnheader", { name: "Kill Points" }).getAttribute("aria-sort")).toBe("descending");
        expect(screen.getByRole("columnheader", { name: "WWCD" }).hasAttribute("aria-sort")).toBe(false);
        fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), { target: { value: "placementPoints" } });
        expect(rowTags()).toEqual(["TE", "CES", "ROY", "AGG"]);
        expect(within(screen.getByRole("table")).getAllByRole("row")[1].cells[0].textContent).toBe("1");
    });

    test("searching by name or tag filters the rows; the live status reports the result", () => {
        renderInMain(<Leaderboard />);
        const status = screen.getByRole("status");
        expect(status.getAttribute("aria-live")).toBe("polite");
        expect(status.textContent).toBe("Showing 4 of 4 squads, sorted by WWCD.");
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "roy" } });
        expect(rowTags()).toEqual(["ROY"]);
        expect(status.textContent).toBe("Showing 1 of 4 squads, sorted by WWCD.");
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "CES" } });
        expect(rowTags()).toEqual(["CES"]);
    });

    test("the WWCD filter and an empty state", () => {
        renderInMain(<Leaderboard />);
        fireEvent.change(screen.getByRole("combobox", { name: "Minimum WWCD" }), { target: { value: "2" } });
        expect(rowTags()).toEqual(["TE", "CES"]);
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "agg" } });
        const empty = within(screen.getByRole("table")).getAllByRole("row")[1];
        expect(empty.textContent.replace(/\s+/g, " ").trim()).toBe("No squads match “agg” with 2 or more WWCD.");
        expect(empty.cells[0].colSpan).toBe(6);
        expect(screen.getByRole("status").textContent).toBe("Showing 0 of 4 squads, sorted by WWCD.");
    });

    test("renders an HTML payload typed into the search box as text (Rule 3)", () => {
        renderInMain(<Leaderboard />);
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "<img src=x onerror=alert(1)>" } });
        expect(document.querySelector("img")).toBeNull();
        expect(screen.getByRole("table").textContent).toContain("<img src=x onerror=alert(1)>");
    });
});

describe("VirtualList", () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: `item-${i}`, label: `Item ${i}` }));
    const renderList = (props = {}) => render(
        <VirtualList items={items} rowHeight={50} viewportHeight={200} overscan={3} getKey={(item) => item.id}
            renderItem={(item) => item.label} labelledBy="list-label" {...props} />
    );
    const scrollTo = (list, top) => {
        list.scrollTop = top;
        fireEvent.scroll(list);
    };

    test("renders only the visible rows plus overscan, with spacers for the rest", () => {
        renderList();
        const list = screen.getByRole("list");
        const rows = within(list).getAllByRole("listitem");
        expect(rows).toHaveLength(4 + 3);                                // 4 visible + 3 overscan below
        expect(list.style.height).toBe("200px");
        expect(list.style.getPropertyValue("--virtual-before")).toBe("0px");
        expect(list.style.getPropertyValue("--virtual-after")).toBe(`${(1000 - 7) * 50}px`);
    });

    test("scrolling moves the window; spacers keep the full height; rows keep their stable keys", () => {
        renderList();
        const list = screen.getByRole("list");
        const firstRowBefore = within(list).getAllByRole("listitem")[5];   // item 5
        scrollTo(list, 250);                                               // item 5 now at the top
        const rows = within(list).getAllByRole("listitem");
        // start = floor(250/50) − 3 = 2; end = ceil(450/50) + 3 = 12 (row 9 starts exactly at the bottom edge).
        expect(rows.map((row) => row.textContent)).toEqual(["Item 2", "Item 3", "Item 4", "Item 5", "Item 6", "Item 7", "Item 8", "Item 9", "Item 10", "Item 11"]);
        expect(list.style.getPropertyValue("--virtual-before")).toBe("100px");
        expect(rows[3]).toBe(firstRowBefore);                              // same DOM node: keyed by id, not index
        scrollTo(list, 50000 - 200);
        const last = within(list).getAllByRole("listitem").at(-1);
        expect(last.textContent).toBe("Item 999");
        expect(list.style.getPropertyValue("--virtual-after")).toBe("0px");
    });

    test("tells assistive tech each row's position in the full list", () => {
        renderList();
        const list = screen.getByRole("list");
        scrollTo(list, 5000);
        const first = within(list).getAllByRole("listitem")[0];
        expect(first.getAttribute("aria-posinset")).toBe("98");
        expect(first.getAttribute("aria-setsize")).toBe("1000");
        expect(list.tabIndex).toBe(0);
        expect(list.getAttribute("aria-labelledby")).toBe("list-label");
    });

    test.each([
        ["no getKey", { getKey: undefined }],
        ["no label", { labelledBy: "" }],
        ["a zero row height", { rowHeight: 0 }],
        ["a key that is an object", { getKey: (item) => item }]
    ])("throws a TypeError for %s (Rule 2)", (_, props) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => renderList(props)).toThrow(TypeError);
    });
});

describe("KillFeed", () => {
    const rows = () => within(screen.getByRole("list", { name: "Kill Feed" })).getAllByRole("listitem");

    test("1,000 events, but only the visible window (≤ 17 rows) is in the DOM", () => {
        renderInMain(<KillFeed events={FEED} />);
        expect(screen.getByRole("status").textContent).toBe("Showing 1,000 of 1,000 events.");
        expect(rows().length).toBeLessThanOrEqual(MAX_ROWS);
        expect(rows().length).toBe(KILL_FEED_VIEWPORT / KILL_ROW_HEIGHT + KILL_FEED_OVERSCAN);   // at the top: 6 + 5
    });

    test("each row shows killer, victim, squad tag, weapon and timestamp", () => {
        renderInMain(<KillFeed events={FEED} />);
        const first = rows()[0];
        expect(first.textContent).toBe("Player A eliminated Player B TE · with M416, 19:00:00");
        expect(first.querySelector("time").getAttribute("datetime")).toBe("2026-11-09T12:00:00.000Z");
    });

    test("filtering by squad shows only that squad's events, still virtualized", () => {
        renderInMain(<KillFeed events={FEED} />);
        fireEvent.change(screen.getByRole("combobox", { name: "Show squad" }), { target: { value: "ROY" } });
        const expected = FEED.filter((e) => e.squad === "ROY").length;
        expect(screen.getByRole("status").textContent).toBe(`Showing ${expected} of 1,000 events for Roy Esports.`);
        expect(rows().every((row) => row.querySelector("abbr").textContent === "ROY")).toBe(true);
        expect(rows()[0].getAttribute("aria-setsize")).toBe(String(expected));
        expect(rows().length).toBeLessThanOrEqual(MAX_ROWS);
    });

    test("offers All squads plus the four squads", () => {
        renderInMain(<KillFeed events={FEED} />);
        expect(within(screen.getByRole("combobox", { name: "Show squad" })).getAllByRole("option").map((o) => o.textContent))
            .toEqual(["All squads", "The Expendables (TE)", "Cerberus Esports (CES)", "Roy Esports (ROY)", "AGG (AGG)"]);
    });

    test("a clear empty state when no events match", () => {
        renderInMain(<KillFeed events={createInitialKillFeed(NOW)} />);
        fireEvent.change(screen.getByRole("combobox", { name: "Show squad" }), { target: { value: "AGG" } });
        expect(screen.getByText("No kill-feed events for AGG yet.")).toBeTruthy();
        expect(screen.queryByRole("list")).toBeNull();
        expect(screen.getByRole("status").textContent).toBe("Showing 0 of 2 events for AGG.");
    });

    test("changing the filter starts the new list at the top", () => {
        renderInMain(<KillFeed events={FEED} />);
        const list = screen.getByRole("list", { name: "Kill Feed" });
        list.scrollTop = 20000;
        fireEvent.scroll(list);
        fireEvent.change(screen.getByRole("combobox", { name: "Show squad" }), { target: { value: "TE" } });
        expect(screen.getByRole("list", { name: "Kill Feed" }).dataset.startIndex).toBe("0");
    });

    test("individual events are never announced: the only live region is the filter summary", () => {
        renderInMain(<KillFeed events={FEED} />);
        expect(document.querySelectorAll("[aria-live], [role='status'], [role='log'], [role='alert']")).toHaveLength(1);
    });
});

describe("App", () => {
    test("Section C sits after the countdowns and claims, with the leaderboard and kill feed inside", () => {
        renderInMain(<App killFeed={FEED} />);
        const main = document.querySelector("main");
        expect([...main.children].map((n) => n.tagName)).toEqual(["HEADER", "SECTION", "SECTION", "SECTION", "FOOTER"]);
        const championship = screen.getByRole("region", { name: "PUBG Vietnam Championship" });
        expect(within(championship).getAllByRole("region").map((r) => r.getAttribute("aria-labelledby")))
            .toEqual(["leaderboard-title", "killfeed-title"]);
    });
});
