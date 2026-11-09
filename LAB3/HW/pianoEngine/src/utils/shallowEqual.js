/**
 * Polyphonic Piano Engine — T-02D shallow prop comparison
 *
 * The comparator handed to React.memo(PianoKey, shallowEqual): two props
 * objects are equal when they have the same own keys and every value is
 * identical by Object.is (so NaN equals NaN and +0 differs from -0, exactly
 * like React's own comparison). Values are NOT compared deeply: a new
 * object or function with the same content counts as a change. That is why
 * the parent must keep the key objects stable (frozen PIANO_KEYS) and the
 * callbacks stable (useCallback): then only `isActive` can differ, and only
 * for the key whose note started or stopped.
 */
export function shallowEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && Object.is(a[key], b[key]));
}

export default shallowEqual;
