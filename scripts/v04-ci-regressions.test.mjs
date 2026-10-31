import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
test("repository tools search has submit button and stable repository-qualified results", () => {
    const source = read("src/features/repositories/RepositoryTools.tsx");
    assert.match(source, /<Button\b[^>]*\btype="submit"/s);
    assert.match(source, /<Button\b[^>]*\bdisabled=\{busy\s*\|\|\s*!query\.trim\(\)\}/s);
    assert.match(source, /key=\{`\$\{match\.path\}:\$\{kind\}:\$\{match\.value\}`\}/);
    assert.doesNotMatch(source, /matches\.map\(\(match, index\)/);
});
test("worktree editor shares existing platform-aware editor detector", () => {
    assert.match(read("src-tauri/src/git/changes.rs"), /pub\(crate\) fn detect_editor\(/);
    assert.match(read("src-tauri/src/git/inspector.rs"), /crate::git::changes::detect_editor\(&editor\)/);
});
