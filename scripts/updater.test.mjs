import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
test("signed updater and process plugins are registered in Rust", () => {
    const lib = read("src-tauri/src/lib.rs");
    assert.match(lib, /tauri_plugin_updater::Builder::new\(\)\.build\(\)/);
    assert.match(lib, /if updater::is_updater_configured\(app\.config\(\)\)/);
    assert.doesNotMatch(lib, /^\s*\.plugin\(tauri_plugin_updater::Builder::new\(\)\.build\(\)\)/m);
    assert.match(lib, /tauri_plugin_process::init\(\)/);
    assert.match(lib, /updater_configuration,/);
});
test("only main desktop window can check and install signed updates", () => {
    const caps = JSON.parse(read("src-tauri/capabilities/default.json"));
    assert.deepEqual(caps.windows, ["main"]);
    for (const permission of ["updater:allow-check", "updater:allow-download-and-install", "process:allow-restart"])
        assert.ok(caps.permissions.includes(permission));
});
test("updater UI does not carry Morrow branding", () => {
    const ui = read("src/components/updater/update-center.tsx");
    assert.doesNotMatch(ui, /Morrow|morrow/);
    assert.match(ui, /downloadAndInstall/);
    assert.match(ui, /CHECK_INTERVAL_MS/);
    const app = read("src/App.tsx");
    assert.match(app, /useAlderUpdater/);
    assert.match(app, /<UpdateCenter/);
});
test("release signing overlay preserves signed GitHub manifest support", async () => {
    const overlaySource = read("scripts/prepare-release.mjs");
    assert.match(overlaySource, /latest\.json/);
    assert.match(overlaySource, /createUpdaterArtifacts/);

    // The release configuration is generated AFTER test:source in CI and is Git-ignored.
    // Exercise the generator rather than assuming its output exists in a clean checkout.
    const { releaseOverlay } = await import("./prepare-release.mjs");
    const minisignKey = `untrusted comment: minisign public key: CI fixture\n${Buffer.concat([Buffer.from("Ed"), Buffer.alloc(40)]).toString("base64")}`;
    const publicKey = Buffer.from(minisignKey).toString("base64");
    const cfg = releaseOverlay("HakkoDev/Alder", publicKey);
    assert.equal(cfg.bundle.createUpdaterArtifacts, true);
    assert.equal(cfg.plugins.updater.pubkey, publicKey);
    assert.deepEqual(cfg.plugins.updater.endpoints, ["https://github.com/HakkoDev/Alder/releases/latest/download/latest.json"]);
    assert.equal(cfg.plugins.updater.windows.installMode, "passive");
});

test("unsigned development config does not initialize updater plugin", () => {
    const config = JSON.parse(read("src-tauri/tauri.conf.json"));
    assert.ok(!config.plugins?.updater?.pubkey || !config.plugins?.updater?.endpoints?.length);
    const helper = read("src-tauri/src/updater.rs");
    assert.match(helper, /is_updater_configured/);
    assert.match(helper, /pubkey/);
    assert.match(helper, /endpoints/);
});
