/**
 * Vietnamese đồng, formatted by the platform (Intl.NumberFormat, vi-VN):
 * formatVND(1500000) === "1.500.000 ₫".
 *
 * Note: the space before "₫" is a NO-BREAK SPACE (U+00A0), not an ordinary
 * space, so the amount and the symbol never wrap onto separate lines. Tests
 * must compare against " ", not a typed space.
 */
const VND = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
});

export function formatVND(amount) {
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
        throw new TypeError(`formatVND: amount must be a finite number, received ${JSON.stringify(amount)}`);
    }
    return VND.format(amount);
}

export default formatVND;
