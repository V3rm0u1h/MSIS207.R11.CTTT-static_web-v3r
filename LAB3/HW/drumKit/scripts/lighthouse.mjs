/**
 * T-01D Lighthouse run against the production build.
 *
 *   npm run lighthouse
 *
 * Builds, serves dist/ with `vite preview` on port 4173, audits it with the
 * Lighthouse CLI in headless Microsoft Edge (or Chrome via CHROME_PATH) on a
 * mobile profile, writes the full HTML report and a small JSON summary to
 * lighthouse/, prints the four scores and exits non-zero if any is below 100.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;
const OUT_DIR = "lighthouse";
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function findBrowser() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
    const candidates = [
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/usr/bin/google-chrome",
        "/usr/bin/microsoft-edge"
    ];
    return candidates.find((path) => existsSync(path));
}

function run(command, args) {
    const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
    if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

async function waitFor(url, attempts = 50) {
    for (let n = 0; n < attempts; n += 1) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch { /* not up yet */ }
        await sleep(200);
    }
    throw new Error(`${url} did not come up`);
}

const browser = findBrowser();
if (!browser) {
    console.error("No Chromium-based browser found; set CHROME_PATH.");
    process.exit(2);
}

run(npx, ["vite", "build"]);
mkdirSync(OUT_DIR, { recursive: true });

const server = spawn(npx, ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    stdio: "ignore",
    shell: process.platform === "win32"
});

try {
    await waitFor(URL);
    run(npx, [
        "--yes", "lighthouse@12.8.2", URL,
        "--quiet",
        "--chrome-flags=--headless=new --no-sandbox",
        "--only-categories=" + CATEGORIES.join(","),
        "--output=html", "--output=json",
        `--output-path=${OUT_DIR}/report`
    ].concat(process.env.CHROME_PATH ? [] : []), { env: { ...process.env, CHROME_PATH: browser } });
} finally {
    server.kill();
    // vite preview on Windows spawns through a shell; make sure the port is freed.
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
}

const report = JSON.parse(readFileSync(`${OUT_DIR}/report.report.json`, "utf8"));
const scores = Object.fromEntries(CATEGORIES.map((id) => [id, Math.round(report.categories[id].score * 100)]));
const summary = {
    url: URL,
    fetchedAt: report.fetchTime,
    lighthouseVersion: report.lighthouseVersion,
    formFactor: report.configSettings.formFactor,
    scores,
    metrics: Object.fromEntries(
        ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"]
            .map((id) => [id, report.audits[id].displayValue])
    ),
    failedAudits: Object.values(report.audits)
        .filter((audit) => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== "informative")
        .map((audit) => ({ id: audit.id, title: audit.title, score: audit.score }))
};
writeFileSync(`${OUT_DIR}/summary.json`, JSON.stringify(summary, null, 2) + "\n");

console.log("\nLighthouse scores:");
for (const [id, score] of Object.entries(scores)) console.log(`  ${id.padEnd(16)} ${score}`);
console.log(`\nFull report: ${OUT_DIR}/report.report.html`);
process.exit(Object.values(scores).every((score) => score === 100) ? 0 : 1);
