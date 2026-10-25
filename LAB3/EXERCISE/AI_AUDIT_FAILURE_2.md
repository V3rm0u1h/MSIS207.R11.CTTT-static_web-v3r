# AI Failure Audit 2 — Exercise 2: Scientist & Pioneer Directory

Defects found in the AI-assisted work on Exercise 2 (T-02A to T-02C): the
`SMART_PEOPLE` dataset, search / IQ filter / sort, and delete / reset.
Source of evidence: the ex2 commits (`694d9d5`, `20ade89`, `ad3886d`), the
later data change in `ac4f1b4`, and checks run against the current code.

| # | Defect | Type | Status |
| --- | --- | --- | --- |
| 1 | Search could not match Vietnamese names typed without diacritics | Functional / i18n bug | Workaround applied; real fix proposed |
| 2 | The AI made up an age for the author's record | Fabricated data | Proposed |
| 3 | Keyboard focus is lost after Delete | Accessibility bug | Proposed |
| 4 | Tests hard-coded the dataset's names | Brittle tests | Proposed |

---

## Defect 1 — Search Could Not Match Names Without Diacritics

### Defect Description

The generated search only lower-cases text:

```js
const normalizedQuery = query.trim().toLowerCase();
person.name.toLowerCase().includes(normalizedQuery);
```

The author's record was first stored as `"Lữ Lê Hương Giang"`. Vietnamese
users often type without diacritics, but `"huong"` did not find
`"Hương"`. The AI's test only searched for `"hương"`, with the diacritics,
so it passed and hid the problem.

The workaround was to rename the record to `"Lu Le Huong Giang"` (commit
`ac4f1b4`, with 5 test lines changed). That removed the symptom, but the
author's real name is lost, and any other Vietnamese name added later has
the same bug.

### Diagnostic Method

The same check the component does, run in Node:

```
"lữ lê hương giang".includes("huong")  → false
"lữ lê hương giang".includes("hương")  → true
```

### Refactored Solution (proposed)

Fold accents on both sides before comparing, then restore the real name:

```js
/** "Lữ Lê Hương Giang" → "lu le huong giang"; "Đặng" → "dang". */
function foldForSearch(text) {
    return text
        .toLowerCase()                       // lower-case FIRST: "Đ" → "đ"
        .normalize("NFD")                    // "ữ" → "u" + combining marks
        .replace(/\p{Diacritic}/gu, "")      // drop the marks
        .replace(/đ/g, "d");                 // đ has no decomposition
}

const normalizedQuery = foldForSearch(query.trim());
foldForSearch(person.name).includes(normalizedQuery);
```

The order matters: when `đ → d` was tried before lower-casing, `"Đặng"` did
not fold to `"dang"`. Tests to add: `"huong"`, `"HƯƠNG"` and `"hương"` all
find the record, and `"dang"` finds a name starting with `Đ`.

---

## Defect 2 — Made-Up Age in the Author's Record

### Defect Description

T-02A asked for the author's own profile to be added to the dataset. The
author's age was not given, and the AI filled it in with a guess:

```js
// Author's profile. age 20 is a documented placeholder, not a stated fact.
Object.freeze({ id: "sp-7", name: "Lu Le Huong Giang", age: 20, iq: 134 })
```

The comment is only in the source. The UI shows `Age 20` as a fact, and
"Sort by age" puts the record first because of the made-up number. A unit
test then pins the guess (`age: 20`) as expected behaviour.

### Diagnostic Method

The PRD and the conversation were compared with the record: no age was
ever given. The value only shows up in the AI-written code and test.

### Refactored Solution (proposed)

Missing personal data must be asked for, not invented:

1. Replace `20` with the author's real age.
2. If the age should stay private, allow `age: null`. Show `—` in the UI,
   sort records without an age last, and update the schema test so `age`
   may be a finite number **or** `null`.

The same rule applies to the IQ value `134`: it should come from the author.

---

## Defect 3 — Keyboard Focus Is Lost After Delete

### Defect Description

Each row has a **Delete** button. When a keyboard user presses it, that
row's `<li>` is removed, together with the focused button. The browser moves
focus to `<body>`, so the user has to Tab again from the top of the page.
Screen readers announce nothing useful. The generated tests only use
`fireEvent.click`, so they never checked where focus goes.

### Diagnostic Method

`ScientistDirectory.jsx` was searched for any focus handling:
`grep -n "focus"` finds nothing. Removing the focused element without moving
focus is a known WCAG 2.4.3 (Focus Order) failure.

### Refactored Solution (proposed)

After a delete, move focus to the next row's Delete button. If there is no
next row, use the previous row's, and if the list is now empty, use the
Reset button:

```jsx
const listRef = useRef(null);
const resetRef = useRef(null);

const handleDelete = (id, index) => {
    setPeople((prev) => prev.filter((person) => person.id !== id));
    requestAnimationFrame(() => {
        const buttons = listRef.current.querySelectorAll("button");
        (buttons[index] ?? buttons[index - 1] ?? resetRef.current).focus();
    });
};
```

The polite `<output role="status">` already announces the new count. Tests
to add: after Delete, `document.activeElement` is a Delete button (or Reset),
never `document.body`.

---

## Defect 4 — Tests Hard-Coded the Dataset's Names

### Defect Description

`ScientistDirectory.test.jsx` wrote the author's name as a literal in
several places (`BY_IQ`, `BY_AGE`, the search test, the reset test), and
`smartPeople.test.js` repeated it again. Changing one data value
(Defect 1's rename) meant editing 5 lines in 2 test files. A test that
copies data checks the copy, not the behaviour.

### Diagnostic Method

`git show ac4f1b4` shows a one-line data change followed by test changes in
both test files.

### Refactored Solution (proposed)

Build the expected orders from the dataset, and keep literals only where the
literal is the point of the test:

```js
const AUTHOR = SMART_PEOPLE.find((person) => person.id === "sp-7");
const BY_IQ  = SMART_PEOPLE.toSorted((a, b) => b.iq - a.iq).map((p) => p.name);
const BY_AGE = SMART_PEOPLE.toSorted((a, b) => a.age - b.age).map((p) => p.name);

fireEvent.click(deleteButton(AUTHOR.name));
```

The search tests keep their literal queries (`"huong"`), because those are
the inputs being tested.
