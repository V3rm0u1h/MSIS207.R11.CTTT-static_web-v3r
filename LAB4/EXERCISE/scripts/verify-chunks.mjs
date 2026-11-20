// Asserts the production build emitted PersonDetail as a separate async chunk.
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../dist/.vite/manifest.json", import.meta.url), "utf8"));
const detailKey = "src/components/PersonDetail.tsx";
const detail = manifest[detailKey];
const entry = Object.values(manifest).find((chunk) => chunk.isEntry);

const failures = [];
if (!detail) failures.push(`${detailKey} has no chunk in the manifest`);
else if (!detail.isDynamicEntry) failures.push(`${detailKey} is not a dynamic (async) entry`);
if (!entry) failures.push("no entry chunk found");
else {
    if (entry.file === detail?.file) failures.push("PersonDetail was bundled into the entry chunk");
    if ((entry.imports ?? []).includes(detailKey)) failures.push("entry statically imports PersonDetail");
    if (!(entry.dynamicImports ?? []).includes(detailKey)) failures.push("entry does not dynamically import PersonDetail");
}

if (failures.length) {
    console.error("Chunk verification FAILED:\n- " + failures.join("\n- "));
    process.exit(1);
}
console.log(`OK: PersonDetail ships as its own async chunk -> dist/${detail.file} (entry: dist/${entry.file})`);
