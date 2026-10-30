import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { rustSource } from "./rust-source.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const run = (cwd, ...args) => spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
const git = (cwd, ...args) => {
    const r = run(cwd, ...args);
    assert.equal(r.status, 0, `git ${args.join(" ")} failed: ${r.stderr}`);
    return r.stdout.trim();
};
function fixture(fn) {
    const base = mkdtempSync(join(tmpdir(), "alder-advanced-"));
    const repo = join(base, "repo");
    mkdirSync(repo);
    try {
        git(repo, "init", "-b", "main");
        git(repo, "config", "user.name", "Alder Tests");
        git(repo, "config", "user.email", "alder@example.invalid");
        writeFileSync(join(repo, "file.txt"), "base\n");
        git(repo, "add", ".");
        git(repo, "commit", "-m", "Base");
        fn({ repo, base });
    } finally {
        rmSync(base, { recursive: true, force: true });
    }
}
test("Git worktree add/list/remove supports paths with spaces and refuses dirty removal", () =>
    fixture(({ repo, base }) => {
        const dir = join(base, "feature worktree");
        git(repo, "worktree", "add", "-b", "feature/new", "--", dir, "HEAD");
        const listing = git(repo, "worktree", "list", "--porcelain", "-z");
        assert.ok(listing.includes(`worktree ${dir.replaceAll("\\", "/")}`));
        writeFileSync(join(dir, "file.txt"), "dirty\n");
        const fail = run(repo, "worktree", "remove", "--", dir);
        assert.notEqual(fail.status, 0, "Git should reject destructive worktree removal");
        git(dir, "restore", ".");
        git(repo, "worktree", "remove", "--", dir);
    }));
test("stash retains staged content and can apply index without silently dropping entry", () =>
    fixture(({ repo }) => {
        writeFileSync(join(repo, "file.txt"), "changes\n");
        git(repo, "add", ".");
        git(repo, "stash", "push", "--include-untracked", "-m", "before edit");
        const refs = git(repo, "stash", "list", "--format=%gd%x1f%gs%x1e");
        assert.match(refs, /stash@\{0\}/);
        git(repo, "stash", "apply", "--index", "stash@{0}");
        assert.match(git(repo, "diff", "--cached", "--", "file.txt"), /\+changes/);
        assert.match(git(repo, "stash", "list"), /before edit/);
        git(repo, "stash", "drop", "stash@{0}");
    }));
test("merge conflict produces unmerged paths, ours acceptance and resolution commit", () =>
    fixture(({ repo }) => {
        git(repo, "switch", "-c", "feature");
        writeFileSync(join(repo, "file.txt"), "feature\n");
        git(repo, "commit", "-am", "Feature");
        git(repo, "switch", "main");
        writeFileSync(join(repo, "file.txt"), "main\n");
        git(repo, "commit", "-am", "Main");
        assert.notEqual(run(repo, "merge", "--no-edit", "--", "feature").status, 0);
        assert.match(git(repo, "diff", "--name-only", "--diff-filter=U", "-z"), /file.txt/);
        git(repo, "checkout", "--ours", "--", "file.txt");
        git(repo, "add", "--", "file.txt");
        git(repo, "commit", "-m", "Resolve");
        assert.match(git(repo, "log", "-1", "--format=%s"), /Resolve/);
    }));
test("rebase conflict can be aborted and restores original branch head", () =>
    fixture(({ repo }) => {
        git(repo, "switch", "-c", "feature");
        writeFileSync(join(repo, "file.txt"), "feature\n");
        git(repo, "commit", "-am", "Feature");
        const before = git(repo, "rev-parse", "HEAD");
        git(repo, "switch", "main");
        writeFileSync(join(repo, "file.txt"), "main\n");
        git(repo, "commit", "-am", "Main");
        git(repo, "switch", "feature");
        assert.notEqual(run(repo, "rebase", "--", "main").status, 0);
        git(repo, "rebase", "--abort");
        assert.equal(git(repo, "rev-parse", "HEAD"), before);
    }));
test("v0.2 Rust command mapping and danger guards are present", () => {
    const rust = rustSource(),
        api = read("src/lib/git-api.ts");
    for (const cmd of [
        "list_worktrees",
        "add_worktree",
        "remove_worktree",
        "list_stashes",
        "create_stash",
        "stash_action",
        "merge_branch",
        "rebase_branch",
        "sequence_action",
        "resolve_conflict",
        "commit_operation",
        "list_reflog",
        "git_operation_state",
    ]) {
        assert.match(rust, new RegExp(`\\b${cmd}\\b`));
        assert.ok(api.includes(`"${cmd}"`), `missing typed API ${cmd}`);
    }
    for (const guard of ["ensure_clean", "verify_commitish", "safe_file", "--diff-filter=U", "--porcelain", "--no-edit"]) assert.ok(rust.includes(guard));
    assert.doesNotMatch(rust, /\.shell\s*\(/);
});
test("custom Alder palette is default and font style is inherited rather than changed", () => {
    const t = read("src/lib/theme-presets.ts");
    assert.match(t, /alder: \{/);
    assert.match(t, /styledTweakcnPresets\["sage-garden"\]\.light\.style/);
    assert.match(read("src/lib/preferences.ts"), /themeId: "alder"/);
    assert.match(read("src/components/app/AppSidebar.tsx"), /Copyright © Hakko &amp; Contributors/);
});
test("conflict stages, manual resolved result and worktree locking use valid Git commands", () =>
    fixture(({ repo, base }) => {
        git(repo, "switch", "-c", "theirs");
        writeFileSync(join(repo, "file.txt"), "theirs\n");
        git(repo, "commit", "-am", "Theirs");
        git(repo, "switch", "main");
        writeFileSync(join(repo, "file.txt"), "ours\n");
        git(repo, "commit", "-am", "Ours");
        assert.notEqual(run(repo, "merge", "--no-edit", "--", "theirs").status, 0);
        const original = git(repo, "show", "--no-ext-diff", ":1:file.txt");
        const ours = git(repo, "show", "--no-ext-diff", ":2:file.txt");
        const theirs = git(repo, "show", "--no-ext-diff", ":3:file.txt");
        assert.equal(original, "base");
        assert.equal(ours, "ours");
        assert.equal(theirs, "theirs");
        writeFileSync(join(repo, "file.txt"), "manual result\n");
        git(repo, "add", "--", "file.txt");
        assert.equal(git(repo, "diff", "--name-only", "--diff-filter=U"), "");
        git(repo, "commit", "-m", "Manual resolution");
        const worktree = join(base, "separate worktree");
        git(repo, "worktree", "add", "-b", "feature/locked", "--", worktree, "HEAD");
        git(repo, "worktree", "lock", "--reason", "Locked from Alder", "--", worktree);
        assert.notEqual(run(repo, "worktree", "remove", "--", worktree).status, 0);
        git(repo, "worktree", "unlock", "--", worktree);
        git(repo, "worktree", "remove", "--", worktree);
    }));
