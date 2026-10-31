import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("global palette performs bounded multi-repository searches and reports failures", () => {
    const text = read("src/components/app/dialogs/CommandPalette.tsx");
    assert.match(text, /git\.searchRepository\(/);
    assert.match(text, /Promise\.allSettled\(/);
    assert.match(text, /\.slice\(0, 30\)/);
    assert.match(text, /\.slice\(0, 250\)/);
    assert.match(text, /setView\(/);
    assert.match(text, /return\s*\(\)\s*=>\s*\{\s*active\s*=\s*false;\s*\}/);
});
test("worktree editor invokes argv-based launcher only for registered worktrees", () => {
    const backend = read("src-tauri/src/git/inspector.rs");
    const registration = read("src-tauri/src/lib.rs");
    const frontend = read("src/features/repositories/RepositoryTools.tsx");
    assert.match(backend, /fn open_worktree_in_editor\(/);
    assert.match(backend, /Path is not a registered worktree/);
    assert.match(backend, /crate::process::command\(&editor\)\.arg\(&destination\)\.spawn\(/);
    assert.match(registration, /git::inspector::open_worktree_in_editor/);
    assert.match(frontend, /Open in Zed/);
    assert.match(frontend, /Open in VS Code/);
});
