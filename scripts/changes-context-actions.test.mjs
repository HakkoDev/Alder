import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("file context menu offers requested actions without per-file plus button", () => {
    const s = read("src/components/app/FileRow.tsx");
    for (const text of [
        "Stage File",
        "Trash File (Delete)",
        "Copy Path",
        "Copy Relative Path",
        "Add to .gitignore",
        "Add to .git/info/exclude",
        "Open File",
        "Open in Editor",
    ])
        assert.ok(s.includes(text), text);
    assert.doesNotMatch(s, /<IconButton/);
});
test("backend validates relative path and launches editors without shell", () => {
    const s = read("src-tauri/src/git/changes.rs");
    for (const name of ["trash_file", "ignore_file", "open_change_file", "detect_editors", "open_in_editor"]) assert.ok(s.includes(`fn ${name}`));
    assert.match(s, /safe_file\(file\)/);
    assert.match(s, /crate::process::command\(&editor\)/);
});
test("changes have Git-numstat counts and editor preference defaults to auto", () => {
    assert.match(read("src-tauri/src/git/status.rs"), /--numstat/);
    assert.match(read("src/lib/preferences.ts"), /preferredEditor: "auto"/);
});
