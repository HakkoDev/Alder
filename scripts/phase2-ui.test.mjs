import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { rustSource } from "./rust-source.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const fixture = (callback) => {
    const dir = mkdtempSync(join(tmpdir(), "alder-ui-git-"));
    try {
        const repo = join(dir, "repo");
        mkdirSync(repo);
        git(repo, "init", "-b", "main");
        git(repo, "config", "user.name", "Alder Tester");
        git(repo, "config", "user.email", "alder@example.test");
        return callback({ dir, repo });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
};
test("tracked commit respects --all, --no-verify and --signoff without adding untracked files", () =>
    fixture(({ repo }) => {
        writeFileSync(join(repo, "tracked.txt"), "first");
        git(repo, "add", "tracked.txt");
        git(repo, "commit", "-m", "initial");
        writeFileSync(join(repo, "tracked.txt"), "second");
        writeFileSync(join(repo, "untracked.txt"), "keep me");
        writeFileSync(join(repo, ".git", "hooks", "pre-commit"), "#!/bin/sh\nexit 1\n");
        chmodSync(join(repo, ".git", "hooks", "pre-commit"), 0o755);
        git(repo, "commit", "--all", "--no-verify", "--signoff", "-m", "tracked only");
        assert.match(git(repo, "log", "-1", "--format=%B"), /Signed-off-by: Alder Tester/);
        assert.match(git(repo, "status", "--porcelain"), /\?\? untracked\.txt/);
        assert.equal(git(repo, "show", "HEAD:tracked.txt"), "second");
    }));
test("force-with-lease refuses to overwrite a remote advanced by a different clone", () =>
    fixture(({ dir, repo }) => {
        writeFileSync(join(repo, "README"), "initial");
        git(repo, "add", "README");
        git(repo, "commit", "-m", "initial");
        const bare = join(dir, "remote.git");
        git(dir, "init", "--bare", bare);
        git(repo, "remote", "add", "origin", bare);
        git(repo, "push", "-u", "origin", "main");
        const b = join(dir, "second");
        const c = join(dir, "stale");
        git(dir, "clone", "--branch", "main", bare, b);
        git(dir, "clone", "--branch", "main", bare, c);
        for (const d of [b, c]) {
            git(d, "config", "user.name", "Tester");
            git(d, "config", "user.email", "t@example.test");
        }
        writeFileSync(join(b, "README"), "remote advanced");
        git(b, "commit", "-am", "remote advance");
        git(b, "push", "origin", "main");
        writeFileSync(join(c, "README"), "stale rewrite");
        git(c, "commit", "-am", "stale rewrite");
        assert.throws(() => git(c, "push", "--force-with-lease", "origin", "main"));
        assert.equal(git(b, "rev-parse", "HEAD"), git(dir, "--git-dir", bare, "rev-parse", "refs/heads/main"));
    }));
test("menus, workspace switcher, connected diff pane and interactive footer are wired in source", () => {
    const ui = read("src/App.tsx");
    const api = read("src/lib/git-api.ts");
    const rust = rustSource();
    for (const phrase of [
        "workspace-switcher",
        "ContextMenuTrigger",
        "Remove from Alder",
        "changes-divider",
        "selectedFiles",
        "FooterAction",
        "GitGraph commits",
        "pull-rebase",
        "force-push",
        "skipHooks",
        "signoff",
        "Copyright © Hakko &amp; Contributors",
    ])
        assert.ok(ui.includes(phrase), phrase);
    for (const cmd of ["git_network", "list_remotes", "remove_repository", "create_commit"]) assert.match(rust, new RegExp(`\\b${cmd}\\b`));
    assert.match(rust, /"--force-with-lease"/);
    assert.match(rust, /"--no-verify"/);
    assert.match(rust, /"--signoff"/);
    assert.match(api, /git_network/);
    assert.match(rust, /DELETE FROM repositories WHERE id/);
    assert.doesNotMatch(rust, /remove_dir_all/);
    assert.doesNotMatch(read("src/components/AdvancedGit.tsx"), /window\.(confirm|prompt)/);
});
