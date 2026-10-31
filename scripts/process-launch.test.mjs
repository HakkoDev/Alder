import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("background commands disable Windows console windows without changing other platforms", () => {
    const source = read("src-tauri/src/process.rs");
    assert.match(source, /#\[cfg\(windows\)\]/);
    assert.match(source, /use std::os::windows::process::CommandExt/);
    assert.match(source, /CREATE_NO_WINDOW:\s*u32\s*=\s*0x0800_?0000/);
    assert.match(source, /command\.creation_flags\(CREATE_NO_WINDOW\)/);
    assert.match(source, /cfg\(all\(test, windows\)\)/);
    assert.match(source, /GetConsoleWindow/);
});

test("Git, partial staging, and GitHub CLI use the shared background launcher", () => {
    const files = ["git/core.rs", "git/changes.rs", "github/mod.rs"];
    const sources = files.map((file) => read(`src-tauri/src/${file}`));
    for (const source of sources) {
        assert.doesNotMatch(source, /Command::new\s*\(/);
        assert.match(source, /crate::process::command\(/);
    }
    assert.match(sources[0], /crate::process::command\("git"\)/);
    assert.match(sources[1], /crate::process::command\("git"\)/);
    assert.match(sources[2], /crate::process::command\("gh"\)/);
});
