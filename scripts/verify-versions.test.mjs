import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateVersions } from "./verify-versions.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const config = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargo = read("src-tauri/Cargo.toml");

test("application versions and Tauri pins are aligned", () => {
    assert.deepEqual(validateVersions(pkg, config, cargo, `v${pkg.version}`), []);
    assert.ok(read("src/App.tsx").includes(`Alder v${pkg.version}`));
});

test("release validation rejects version and tag mismatches", () => {
    assert.ok(validateVersions(pkg, { ...config, version: "0.0.0" }, cargo).length);
    assert.ok(validateVersions(pkg, config, cargo, "v0.0.0").length);
    assert.ok(validateVersions({ ...pkg, dependencies: { ...pkg.dependencies, "@tauri-apps/api": "^2" } }, config, cargo).length);
});
