import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const file = (path) => readFileSync(new URL(path, root), "utf8");
test("command search is in header, adjacent to settings and not the sidebar", () => {
    const app = file("src/App.tsx");
    const sidebar = app.slice(app.indexOf("<SidebarHeader>"), app.indexOf("</SidebarHeader>"));
    const header = app.slice(app.indexOf('<header className="topbar">'), app.indexOf("</header>"));
    assert.doesNotMatch(sidebar, /quick-search/);
    assert.match(header, /<SidebarTrigger\/>\s*<div className="crumb">/);
    assert.match(header, /topbar-command-search/);
    assert.match(header, /setPalette\(true\)/);
});
test("theme picker is last preferences section", () => {
    const app = file("src/App.tsx");
    const settings = file("src/components/app/Settings.tsx");
    assert.ok(settings.indexOf("<h3>Display</h3>") < settings.indexOf("<h3>Color theme</h3>"));
    assert.ok(settings.indexOf("settings.language") < settings.indexOf("<h3>Color theme</h3>"));
});
test("GitHub CLI documentation is reachable from both authenticated and setup states", () => {
    const panel = file("src/components/GitHubPanel.tsx");
    assert.equal(panel.match(/https:\/\/cli\.github\.com\/manual\//g)?.length, 2);
});
test("Morrow rust formatting and lint commands are available", () => {
    const scripts = JSON.parse(file("package.json")).scripts;
    assert.match(scripts["format:rust"], /cargo fmt .* --all/);
    assert.match(scripts["format:rust:check"], /cargo fmt .* --all -- --check/);
    assert.match(scripts["lint:rust"], /cargo clippy .* --all-targets/);
});
