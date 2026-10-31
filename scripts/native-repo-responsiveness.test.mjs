import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("repository scans and Git metadata use nonblocking Tauri commands", () => {
    const files = [
        ["src-tauri/src/repository/commands.rs", "list_repositories"],
        ["src-tauri/src/git/advanced/worktrees.rs", "list_worktrees"],
        ["src-tauri/src/git/advanced/stashes.rs", "list_stashes"],
        ["src-tauri/src/git/advanced/recovery.rs", "list_reflog"],
        ["src-tauri/src/git/remotes.rs", "list_remotes"],
        ["src-tauri/src/git/inspector.rs", "repository_diagnostics"],
        ["src-tauri/src/git/inspector.rs", "git_lfs_status"],
        ["src-tauri/src/git/inspector.rs", "git_submodules"],
        ["src-tauri/src/git/inspector.rs", "search_repository"],
    ];
    for (const [file, command] of files) {
        const source = read(file);
        assert.match(source, new RegExp(`async fn ${command}\\(`), `${command} should be async`);
        assert.match(source, new RegExp(`${command}_blocking\\(`), `${command} should run off command thread`);
    }
});

test("inspector renders diagnostics without waiting for LFS and submodules", () => {
    const source = read("src/features/repositories/RepositoryTools.tsx");
    assert.match(source, /git\.diagnostics\(path\)/);
    assert.match(source, /git\.submodules\(path\)\.then/);
    assert.match(source, /git\.lfsStatus\(path\)\.then/);
});
