/**
 * KRAFTON x PUBG Vietnam Championship — T-03C virtual list (view)
 *
 *   <ol tabindex="0" aria-labelledby=… style="height: 384px; --virtual-before: Xpx; --virtual-after: Ypx">
 *     ::before  (X px, the rows above the window)
 *     <li aria-posinset="41" aria-setsize="1000">…</li>     only startIndex … endIndex − 1
 *     ::after   (Y px, the rows below the window)
 *   </ol>
 *
 * The <ol> is the scroll container, with a fixed height. Only the rows in
 * view plus `overscan` rows above and below are in the DOM; the rows outside
 * are stood in for by the empty ::before / ::after pseudo-elements, whose
 * heights come from the CSS variables, so the scroll height always equals
 * the full list (no spacer <div>, Project Rule 1). The maths lives in
 * utils/virtualListUtils.js.
 *
 * Why not padding-top / padding-bottom on the <ol> (the first version)?
 * CSS never lets padding + border exceed the box: with 63,000 px of padding
 * the list simply grew to 63,000 px instead of scrolling. jsdom does no
 * layout, so only the Edge test (clientHeight 63296 instead of 382) caught it.
 *
 * Every row is an <li> keyed by getKey(item) (stable ids, never the index),
 * with aria-posinset / aria-setsize so assistive tech still knows "item 41
 * of 1,000" although only a window of rows exists. The list is focusable
 * (tabindex 0), so keyboard users can scroll it with the arrow keys, Page
 * Up / Down, Home and End. VirtualList owns the <ol> and the <li>s;
 * renderItem returns only the row content (Rule 4). Content is rendered as
 * React children, never as HTML (Rule 3).
 */
import { useMemo, useState } from "react";
import { computeVisibleRange } from "../utils/virtualListUtils.js";
import styles from "./Championship.module.css";

export default function VirtualList({ items, rowHeight, viewportHeight, overscan = 5, getKey, renderItem, labelledBy, className }) {
    if (!Array.isArray(items)) throw new TypeError("VirtualList: items must be an array");
    if (typeof getKey !== "function") throw new TypeError("VirtualList: getKey must be a function");
    if (typeof renderItem !== "function") throw new TypeError("VirtualList: renderItem must be a function");
    if (typeof labelledBy !== "string" || labelledBy === "") throw new TypeError("VirtualList: labelledBy must be the id of the list's label");

    const [scrollTop, setScrollTop] = useState(0);
    const range = useMemo(
        () => computeVisibleRange({ itemCount: items.length, rowHeight, viewportHeight, scrollTop, overscan }),
        [items.length, rowHeight, viewportHeight, scrollTop, overscan]
    );
    const visible = items.slice(range.startIndex, range.endIndex);

    return (
        <ol
            className={[styles.virtualList, className].filter(Boolean).join(" ")}
            tabIndex={0}
            aria-labelledby={labelledBy}
            data-start-index={range.startIndex}
            data-end-index={range.endIndex}
            style={{
                height: viewportHeight,
                "--virtual-before": `${range.spacerBefore}px`,
                "--virtual-after": `${range.spacerAfter}px`
            }}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
            {visible.map((item, offset) => {
                const key = getKey(item);
                if (typeof key !== "string" && typeof key !== "number") {
                    throw new TypeError("VirtualList: getKey must return a string or number");
                }
                return (
                    <li
                        key={key}
                        className={styles.virtualRow}
                        style={{ height: rowHeight }}
                        aria-posinset={range.startIndex + offset + 1}
                        aria-setsize={items.length}
                    >
                        {renderItem(item)}
                    </li>
                );
            })}
        </ol>
    );
}
