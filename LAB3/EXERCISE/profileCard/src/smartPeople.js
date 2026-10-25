/**
 * Single source of truth for the Scientist & Pioneer Directory (ex2).
 * Every record is { id: string, name: string, age: number, iq: number }.
 * The array and its records are frozen: the directory copies them into state,
 * so deleting rows never touches this dataset and reset can restore it.
 */
export const SMART_PEOPLE = Object.freeze([
    Object.freeze({ id: "sp-1", name: "Johann Goethe", age: 82, iq: 210 }),
    Object.freeze({ id: "sp-2", name: "Albert Einstein", age: 76, iq: 205 }),
    Object.freeze({ id: "sp-3", name: "Leonardo da Vinci", age: 67, iq: 180 }),
    Object.freeze({ id: "sp-4", name: "Isaac Newton", age: 84, iq: 190 }),
    Object.freeze({ id: "sp-5", name: "James Maxwell", age: 48, iq: 190 }),
    Object.freeze({ id: "sp-6", name: "William Sidis", age: 46, iq: 200 }),
    // Author's profile. age 20 is a documented placeholder, not a stated fact.
    Object.freeze({ id: "sp-7", name: "Lữ Lê Hương Giang", age: 20, iq: 134 })
]);
