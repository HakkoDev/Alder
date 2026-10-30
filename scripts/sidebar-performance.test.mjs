import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const src = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../src/components/ui/sidebar.tsx", import.meta.url), "utf8");
test("sidebar uses shared provider, responsive primitives and Ctrl+B", () => {
    assert.match(src, /<SidebarProvider\s+className="app-shell">/);
    assert.match(src, /<SidebarInset\s+className="main-area">/);
    assert.match(src, /<SidebarTrigger\s*\/>/);
    assert.match(sidebar, /event\.key\.toLowerCase\(\)\s*===\s*"b"/);
    assert.match(sidebar, /alder\.sidebar\.open/);
});
test("workspace assignment updates UI optimistically without full scan", () => {
    assert.match(src, /const assignWorkspaceFast\s*=/);
    assert.match(src, /setRepos\(\(items\)\s*=>\s*items\.map/);
    assert.match(src, /await git\.assignWorkspace\(repoId,\s*workspaceId\)/);
    assert.doesNotMatch(src.slice(src.indexOf("const assignWorkspaceFast"), src.indexOf("const removeFromAlder")), /await refresh\(/);
});
test("removing registry entry does not reload all repositories", () => {
    const part = src.slice(src.indexOf("const removeFromAlder"), src.indexOf("const repoMenu"));
    assert.match(part, /setRepos\(\(previous\)\s*=>\s*previous\.filter/);
    assert.match(part, /\{\s*reload:\s*false\s*\}/);
});
