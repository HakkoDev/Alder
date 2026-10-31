import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

function fixture(run) {
    const dir = mkdtempSync(join(tmpdir(), "alder-v04-git-"));
    try {
        const repo = join(dir, "repo");
        mkdirSync(repo);
        git(repo, "init", "-q", "--initial-branch=main");
        git(repo, "config", "user.name", "Alder Test");
        git(repo, "config", "user.email", "test@example.invalid");
        writeFileSync(join(repo, "README.md"), "hello\n");
        git(repo, "add", ".");
        git(repo, "commit", "-qm", "initial");
        run({ repo, dir });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

test("local Git worktree comparison and prune preview do not mutate a real repository", () =>
    fixture(({ repo, dir }) => {
        const target = join(dir, "feature");
        git(repo, "worktree", "add", "-qb", "feature", target);
        writeFileSync(join(target, "feature.txt"), "feature\n");
        git(target, "add", ".");
        git(target, "commit", "-qm", "feature commit");
        const a = git(repo, "rev-parse", "HEAD");
        const b = git(target, "rev-parse", "HEAD");
        assert.notEqual(a, b);
        assert.match(git(repo, "diff", "--stat", a, b), /feature\.txt/);
        assert.match(git(repo, "rev-list", "--left-right", "--count", `${a}...${b}`), /\d+\s+\d+/);
        git(repo, "worktree", "prune", "--dry-run", "--verbose");
        assert.equal(git(repo, "rev-parse", "HEAD"), a);
        assert.equal(git(target, "rev-parse", "HEAD"), b);
    }));

test("submodule fixture exposes uninitialized and initialized states", () =>
    fixture(({ repo, dir }) => {
        const child = join(dir, "child");
        mkdirSync(child);
        git(child, "init", "-q", "--initial-branch=main");
        git(child, "config", "user.name", "Alder Test");
        git(child, "config", "user.email", "test@example.invalid");
        writeFileSync(join(child, "module.txt"), "child\n");
        git(child, "add", ".");
        git(child, "commit", "-qm", "module");
        git(repo, "-c", "protocol.file.allow=always", "submodule", "add", "-q", child, "vendor/child");
        git(repo, "commit", "-qam", "add submodule");
        assert.match(git(repo, "submodule", "status"), /vendor\/child/);
        git(repo, "submodule", "deinit", "-f", "--", "vendor/child");
        assert.match(git(repo, "submodule", "status"), /^-/);
        git(repo, "-c", "protocol.file.allow=always", "submodule", "update", "--init", "--recursive");
        assert.doesNotMatch(git(repo, "submodule", "status"), /^-/);
    }));

test("LFS and submodule actions are allowlisted and require explicit confirmation", () => {
    const backend = source("src-tauri/src/git/inspector.rs");
    const ui = source("src/features/repositories/RepositoryTools.tsx");
    for (const action of ["submodule-sync", "submodule-update", "lfs-fetch", "lfs-pull", "lfs-checkout", "worktree-prune"]) {
        assert.ok(backend.includes(`"${action}"`), `Rust missing ${action}`);
        assert.match(ui, new RegExp(`confirmAction\\s*\\(\\s*["']${action}["']`), `UI missing confirmation for ${action}`);
    }
    assert.match(backend, /Unsupported repository maintenance action/);
    assert.match(ui, /title=\{lfs\.version \|\| "Unknown"\}/);
    assert.match(ui, /<Dialog\.Dialog/);
    assert.match(ui, /disabled=\{busy \|\| !previewReady\}/);
});

test("GitHub 40-42 have bounded pagination and explicit unauthenticated/error states", () => {
    const backend = source("src-tauri/src/github/mod.rs");
    const api = source("src/lib/git-api.ts");
    const ui = source("src/components/GitHubPanel.tsx");
    assert.match(api, /checkoutWorktree/);
    assert.match(api, /rateLimit/);
    assert.match(api, /notifications: \(path: string, page = 1\)/);
    assert.match(api, /releases: \(path: string, page = 1\)/);
    assert.match(api, /tags: \(path: string, page = 1\)/);
    assert.match(ui, /GitHub connection unavailable/);
    assert.match(backend, /github_auth|auth_status|auth/);
});
