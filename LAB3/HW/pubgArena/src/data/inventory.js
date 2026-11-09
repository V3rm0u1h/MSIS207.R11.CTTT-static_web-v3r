/**
 * KRAFTON x PUBG Vietnam Championship — T-03B claimable inventory
 *
 * Simulation data, not official PUBG prices or stock. Every item is
 * validated (Project Rule 2) before the claim system or the UI uses it.
 */

export const ITEM_TYPES = Object.freeze(["ticket", "crate"]);

export const INITIAL_INVENTORY = Object.freeze([
    Object.freeze({
        id: "pvs-vip",
        name: "PVS Grand Finals VIP Ticket",
        type: "ticket",
        price: 1500000,
        stock: 25
    }),
    Object.freeze({
        id: "gcoin-crate",
        name: "G-Coin Contraband Crate",
        type: "crate",
        price: 0,
        stock: 100
    })
]);

const isNonNegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

/** Throws a TypeError unless item is { id, name, type, price, stock } with valid values. */
export function assertInventoryItem(item) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
        throw new TypeError("Inventory: each item must be an object");
    }
    if (typeof item.id !== "string" || !/^[a-z0-9-]+$/.test(item.id)) {
        throw new TypeError(`Inventory: item.id must be lower-case letters, digits and dashes, received ${JSON.stringify(item.id)}`);
    }
    if (typeof item.name !== "string" || item.name.trim() === "") {
        throw new TypeError(`Inventory: item.name must be a non-empty string, received ${JSON.stringify(item.name)}`);
    }
    if (!ITEM_TYPES.includes(item.type)) {
        throw new TypeError(`Inventory: item.type must be one of ${ITEM_TYPES.join(", ")}, received ${JSON.stringify(item.type)}`);
    }
    if (!isNonNegativeInteger(item.price)) {
        throw new TypeError(`Inventory: item.price must be a whole number of VND >= 0, received ${JSON.stringify(item.price)}`);
    }
    if (!isNonNegativeInteger(item.stock)) {
        throw new TypeError(`Inventory: item.stock must be an integer >= 0, received ${JSON.stringify(item.stock)}`);
    }
}

/** Throws a TypeError unless items is a non-empty array of valid items with unique ids. */
export function assertInventory(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new TypeError("Inventory: inventory must be a non-empty array");
    }
    items.forEach(assertInventoryItem);
    if (new Set(items.map((item) => item.id)).size !== items.length) {
        throw new TypeError("Inventory: item ids must be unique");
    }
}
