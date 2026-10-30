import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function run(cwd, ...args) {
    const result = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
    return result.stdout;
}
function setup() {
    const root = mkdtempSync(join(tmpdir(), "alder-git-"));
    run(root, "init", "-q");
    run(root, "config", "user.name", "Alder Tests");
    run(root, "config", "user.email", "alder@example.test");
    return root;
}
test("unusual whitespace in filenames survives porcelain -z parsing", () => {
    const root = setup();
    try {
        writeFileSync(join(root, "hello world\twith-tab.txt"), "hello\n");
        const out = spawnSync("git", ["-C", root, "status", "--porcelain=v1", "-z", "--untracked-files=all"]);
        assert.equal(out.status, 0);
        assert.match(out.stdout.toString("utf8"), /hello world\twith-tab.txt/);
        assert.equal(out.stdout.at(-1), 0);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
test("file-level stage, commit, diff and switch follow installed Git semantics", () => {
    const root = setup();
    try {
        writeFileSync(join(root, "README.md"), "initial\n");
        run(root, "add", "--", "README.md");
        run(root, "commit", "-m", "Initial commit");
        run(root, "switch", "-c", "feature/test");
        writeFileSync(join(root, "README.md"), "initial\nsecond line\n");
        assert.match(run(root, "diff", "--no-ext-diff", "--no-color", "--unified=4", "--", "README.md"), /\+second line/);
        run(root, "add", "--", "README.md");
        assert.match(run(root, "diff", "--cached", "--", "README.md"), /\+second line/);
        run(root, "restore", "--staged", "--", "README.md");
        assert.match(run(root, "status", "--porcelain=v1"), /^ M README.md/m);
        assert.equal(run(root, "symbolic-ref", "--short", "HEAD").trim(), "feature/test");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
test("fast-forward-only pull does not silently merge divergent histories", () => {
    const root = mkdtempSync(join(tmpdir(), "alder-remote-"));
    try {
        const bare = join(root, "remote.git");
        mkdirSync(bare);
        const r = spawnSync("git", ["init", "--bare", "-q", bare]);
        assert.equal(r.status, 0);
        const a = join(root, "a");
        const b = join(root, "b");
        assert.equal(spawnSync("git", ["clone", "-q", bare, a]).status, 0);
        run(a, "config", "user.name", "Alder");
        run(a, "config", "user.email", "a@local.test");
        writeFileSync(join(a, "a"), "a");
        run(a, "add", "--", "a");
        run(a, "commit", "-m", "A");
        run(a, "push", "-u", "origin", "HEAD");
        assert.equal(spawnSync("git", ["clone", "-q", bare, b]).status, 0);
        run(b, "config", "user.name", "Alder");
        run(b, "config", "user.email", "b@local.test");
        writeFileSync(join(b, "b"), "b");
        run(b, "add", "--", "b");
        run(b, "commit", "-m", "B");
        writeFileSync(join(a, "more"), "more");
        run(a, "add", "--", "more");
        run(a, "commit", "-m", "C");
        run(a, "push");
        const pull = spawnSync("git", ["-C", b, "pull", "--ff-only"], { encoding: "utf8" });
        assert.notEqual(pull.status, 0);
        assert.equal(readFileSync(join(b, "b"), "utf8"), "b");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
