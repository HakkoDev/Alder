import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const git = (cwd, ...args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

test("registered worktree can be created, compared, moved, locked and removed safely", () => {
    const tmp = mkdtempSync(join(tmpdir(), "alder-worktree-test-"));
    const repository = join(tmp, "repository");
    const tree = join(tmp, "feature-tree");
    const moved = join(tmp, "moved-tree");
    try {
        execFileSync("git", ["init", "-q", repository]);
        git(repository, "config", "user.name", "Test User");
        git(repository, "config", "user.email", "test@example.test");
        writeFileSync(join(repository, "sample.txt"), "initial\n");
        git(repository, "add", ".");
        git(repository, "commit", "-qm", "initial");
        git(repository, "worktree", "add", "-qb", "alder-fixture", tree);
        assert.match(git(repository, "worktree", "list", "--porcelain"), /alder-fixture/);
        git(repository, "worktree", "move", "--", tree, moved);
        git(repository, "worktree", "lock", "--", moved);
        assert.throws(() => git(repository, "worktree", "remove", "--", moved));
        git(repository, "worktree", "unlock", "--", moved);
        writeFileSync(join(moved, "sample.txt"), "uncommitted\n");
        assert.throws(() => git(repository, "worktree", "remove", "--", moved));
        git(moved, "restore", "sample.txt");
        git(repository, "worktree", "remove", "--", moved);
        assert.doesNotMatch(git(repository, "worktree", "list", "--porcelain"), /alder-fixture/);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
});

test("worktree, LFS and submodule actions are registered and require confirmation", () => {
    const ui = read("src/features/repositories/RepositoryTools.tsx");
    const lib = read("src-tauri/src/lib.rs");
    const backend = read("src-tauri/src/git/inspector.rs");
    for (const name of ["git_lfs_pattern", "git_update_submodule", "move_worktree"]) assert.match(lib, new RegExp(name));
    assert.match(backend, /Submodule is not registered in this repository/);
    for (const command of ["git.addWorktree", "git.removeWorktree", "git.moveWorktree", "git.lfsPattern", "git.updateSubmodule"]) {
        assert.ok(ui.includes(command), `missing ${command}`);
    }
    assert.match(ui, /confirmOperation\(/);
    assert.match(ui, /executeOperation\(/);
});
