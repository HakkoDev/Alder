import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../src/components/ui/sidebar.tsx", import.meta.url), "utf8");
test("sidebar uses shared provider, responsive primitives and Ctrl+B", () => {
    assert.match(src, /<SidebarProvider className="app-shell">/);
    assert.match(src, /<SidebarInset className="main-area">/);
    assert.match(src, /<SidebarTrigger\/>/);
    assert.match(sidebar, /event\.key\.toLowerCase\(\)==="b"/);
    assert.match(sidebar, /alder\.sidebar\.open/);
});
test("workspace assignment updates UI optimistically without full scan", () => {
    assert.match(src, /const assignWorkspaceFast=/);
    assert.match(src, /setRepos\(items=>items\.map/);
    assert.match(src, /await git\.assignWorkspace\(repoId,workspaceId\)/);
    assert.doesNotMatch(src.slice(src.indexOf("const assignWorkspaceFast="), src.indexOf("const removeFromAlder=")), /await refresh\(/);
});
test("removing registry entry does not reload all repositories", () => {
    const part = src.slice(src.indexOf("const removeFromAlder="), src.indexOf("const repoMenu="));
    assert.match(part, /setRepos\(previous=>previous\.filter/);
    assert.match(part, /\{reload:false\}/);
});
