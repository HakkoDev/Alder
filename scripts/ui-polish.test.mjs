import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const file = (path) => readFileSync(new URL(path, root), "utf8");
test("command search is in header, adjacent to settings and not the sidebar", () => {
    const sidebar = file("src/components/app/AppSidebar.tsx");
    const header = file("src/components/app/AppHeader.tsx");
    assert.doesNotMatch(sidebar, /quick-search/);
    assert.match(header, /<SidebarTrigger\s*\/>\s*<div\s+className="crumb">/);
    assert.match(header, /topbar-command-search/);
    assert.match(header, /setPalette\(true\)/);
});
test("theme picker is last preferences section", () => {
    const settings = file("src/components/app/Settings.tsx");
    assert.ok(settings.indexOf("<h3>Display</h3>") < settings.indexOf("<h3>Color theme</h3>"));
    assert.ok(settings.indexOf("settings.language") < settings.indexOf("<h3>Color theme</h3>"));
});
test("GitHub CLI documentation is reachable from both authenticated and setup states", () => {
    const panel = file("src/components/GitHubPanel.tsx");
    assert.equal(panel.match(/https:\/\/cli\.github\.com\/manual\//g)?.length, 2);
});
test("Rust formatting and lint commands are available", () => {
    const scripts = JSON.parse(file("package.json")).scripts;
    assert.match(scripts["format:rust"], /cargo fmt .* --all/);
    assert.match(scripts["format:rust:check"], /cargo fmt .* --all -- --check/);
    assert.match(scripts["lint:rust"], /cargo clippy .* --all-targets/);
});
