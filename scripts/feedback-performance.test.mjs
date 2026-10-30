import { rustSource } from "./rust-source.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const repositoryData = readFileSync(new URL("../src/features/repositories/useRepositoryData.ts", import.meta.url), "utf8");
const rust = rustSource();
test("Sonner is mounted once at the application root in bottom-right", () => {
    assert.match(main, /Toaster position="bottom-right"/);
    assert.match(app, /toast\.loading/);
    assert.match(app, /toast\.error/);
});
test("changes and diff have loading skeletons and status is independent of other panels", () => {
    assert.match(app, /loadingRepo\?<div className="changes-loading"/);
    assert.match(app, /loadingDiff\?<div className="changes-loading"/);
    assert.match(repositoryData, /const primary\s*=\s*await git\.status\(path\)/);
    assert.match(repositoryData, /setStatus\(primary\)/);
    assert.match(repositoryData, /Promise\.allSettled/);
});
test("repository load epochs avoid stale status and diff updates", () => {
    assert.match(app, /useRepositoryData\(/);
    assert.match(repositoryData, /loadEpoch\s*=\s*useRef/);
    assert.match(repositoryData, /diffEpoch\s*=\s*useRef/);
    assert.match(repositoryData, /if\s*\(!valid\(\)\)\s*return/);
});
test("dashboard Git status checks are bounded instead of launching unlimited subprocesses", () => {
    assert.match(rust, /entries\.len\(\)\.clamp\(1,\s*4\)/);
    assert.match(rust, /std::thread::scope/);
});
