import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("changed file menu exposes Show in Folder, connected to the changes view", () => {
    const row = read("src/components/app/FileRow.tsx");
    // Verify the specific menu item, independent of Biome's JSX wrapping.
    const item = row.match(/<ContextMenuItem\b(?:(?!<\/ContextMenuItem>)[\s\S])*?<\/ContextMenuItem>/g) ?? [];
    assert.ok(
        item.some((entry) => /onSelect\s*=\s*\{onReveal\}/.test(entry) && /Show\s+in\s+Folder/.test(entry)),
        "Show in Folder must invoke onReveal",
    );
    assert.match(read("src/features/changes/components/ChangeList.tsx"), /onReveal\s*=\s*\{\s*\(\)\s*=>\s*runFileAction\([\s\S]*?git\.revealChangeFile/);
    assert.match(read("src/lib/git-api.ts"), /revealChangeFile: .*"reveal_change_file"/);
});

test("backend command is registered, respects path checks and uses silent Windows launcher", () => {
    const lib = read("src-tauri/src/lib.rs");
    const changes = read("src-tauri/src/git/changes.rs");
    assert.match(lib, /git::changes::reveal_change_file/);
    assert.match(changes, /fn reveal_change_file\(path: String, file: String\)/);
    assert.match(changes, /change_path\(&path, &file\)/);
    assert.match(changes, /process::command\("explorer\.exe"\)/);
    assert.match(changes, /process::command\("open"\)\.arg\("-R"\)/);
    assert.match(changes, /open::that\(directory\)/);
});
