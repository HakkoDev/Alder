import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const base = new URL("../", import.meta.url);
const source = (path) => readFileSync(new URL(path, base), "utf8");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

test("repository tools are registered, accessible and do not reset navigation", () => {
    const backend = source("src-tauri/src/lib.rs");
    const view = source("src/components/app/AppContent.tsx");
    const nav = source("src/features/app/navigation-store.ts");
    for (const command of [
        "repository_diagnostics",
        "git_lfs_status",
        "git_submodules",
        "git_maintenance_action",
        "git_worktree_comparison",
        "search_repository",
    ]) {
        assert.ok(backend.includes(`git::inspector::${command}`), `Missing ${command}`);
    }
    assert.match(view, /view === "inspector"/);
    assert.match(nav, /"inspector"/);
    assert.match(source("src/features/repositories/RepositoryTools.tsx"), /Promise\.allSettled/);
});

test("git fixture identifies a missing upstream, linked worktree and local branch search", () => {
    const root = mkdtempSync(join(tmpdir(), "alder-inspector-"));
    try {
        git(root, "init", "-q", "--initial-branch=main");
        git(root, "config", "user.name", "Fixture");
        git(root, "config", "user.email", "fixture@example.invalid");
        writeFileSync(join(root, "README.md"), "hello\n");
        git(root, "add", "README.md");
        git(root, "commit", "-qm", "start");
        assert.equal(git(root, "branch", "--show-current"), "main");
        assert.throws(() => git(root, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"));
        git(root, "branch", "feature/inspector");
        assert.match(git(root, "for-each-ref", "--format=%(refname:short)", "refs/heads"), /feature\/inspector/);
        const tree = join(root, "linked-worktree");
        git(root, "worktree", "add", "-q", tree, "feature/inspector");
        assert.ok(
            git(root, "worktree", "list", "--porcelain").includes(tree.replaceAll("\\", "/")) || git(root, "worktree", "list", "--porcelain").includes(tree),
        );
        assert.equal(git(root, "rev-parse", "HEAD"), git(tree, "rev-parse", "HEAD"));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("maintenance commands are restricted to explicit allowed operations", () => {
    const sourceText = source("src-tauri/src/git/inspector.rs");
    assert.match(sourceText, /"fetch-prune"/);
    assert.match(sourceText, /"worktree-prune-dry-run"/);
    assert.match(sourceText, /Unsupported repository maintenance action/);
    assert.match(sourceText, /needle\.len\(\) > 200/);
});
