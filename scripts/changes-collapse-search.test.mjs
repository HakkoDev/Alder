import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
test("changes sections independently collapse without removing staging selection", () => {
    const s = read("src/features/changes/components/ChangeList.tsx");
    assert.match(s, /collapsed\.unstaged/);
    assert.match(s, /collapsed\.staged/);
    assert.match(s, /aria-expanded=\{!isCollapsed\}/);
    assert.match(s, /setCollapsed\(/);
    assert.match(s, /const items = row\.staged \? staged : unstaged/);
});
test("changes search uses shared shadcn popover and only filters visible rows", () => {
    const s = read("src/features/changes/components/ChangeList.tsx");
    assert.match(s, /<Popover\s+open=\{searchOpen\}/);
    assert.match(s, /<Input\s+autoFocus/);
    assert.match(s, /const filteredUnstaged/);
    assert.match(s, /const filteredStaged/);
    assert.match(s, /Filters filenames and paths; selection is preserved/);
    assert.match(read("src/components/ui/popover.tsx"), /alder-portal-menu/);
});
