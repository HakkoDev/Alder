import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
test("toolbar changes primary action based on working and staged selection", () => {
    const text = read("src/features/changes/components/ChangeList.tsx");
    for (const label of [
        "Stage Selected",
        "Unstage Selected",
        "Stage All",
        "Unstage All",
        "Restore All Changes",
        "Stash All",
        "Stash Tracked",
        "Stash Pop",
        "View Stash",
        "Discard Tracked Changes",
        "Trash Untracked Files",
        "Clear Selection",
    ])
        assert.ok(text.includes(label), label);
    assert.match(text, /const primaryLabel = selectedWorking/);
    assert.match(text, /selectedIndex\s*\?\s*`Unstage Selected/);
    assert.match(text, /disabled=\{primaryDisabled\}/);
    assert.match(text, /disabled=\{!hasUntracked\}/);
    assert.match(text, /setPendingDeletion\(/);
    assert.doesNotMatch(text, /window\.confirm/);
});
test("bulk actions are allow-listed and registered through Tauri, without shell parsing", () => {
    const backend = read("src-tauri/src/git/changes.rs");
    const registry = read("src-tauri/src/lib.rs");
    const frontend = read("src/lib/git-api.ts");
    assert.match(backend, /fn changes_bulk_action\(/);
    assert.match(backend, /"restore-all"/);
    assert.match(backend, /\["restore", "--source=HEAD", "--staged", "--worktree", ":\/"\]/);
    assert.match(backend, /trash::delete\(&candidate\)/);
    assert.match(registry, /git::changes::changes_bulk_action/);
    assert.match(frontend, /changesBulkAction:/);
});
test("Git restores tracked changes without removing untracked files", () => {
    const dir = mkdtempSync(join(tmpdir(), "alder-bulk-"));
    const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    try {
        git("init", "-q");
        git("config", "user.name", "Tester");
        git("config", "user.email", "tester@example.com");
        writeFileSync(join(dir, "tracked.txt"), "old\n");
        git("add", ".");
        git("commit", "-qm", "initial");
        writeFileSync(join(dir, "tracked.txt"), "new\n");
        writeFileSync(join(dir, "untracked.txt"), "keep\n");
        git("restore", "--source=HEAD", "--staged", "--worktree", ":/");
        assert.equal(readFileSync(join(dir, "tracked.txt"), "utf8").replace(/\r\n/g, "\n"), "old\n");
        assert.equal(readFileSync(join(dir, "untracked.txt"), "utf8").replace(/\r\n/g, "\n"), "keep\n");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("all-staged changes make the primary action Unstage All", () => {
    const source = read("src/features/changes/components/ChangeList.tsx");
    assert.match(source, /selectedIndex\s*\?\s*`Unstage Selected \(\$\{selectedStaged\.length\}\)`\s*:\s*hasWorking\s*\?\s*"Stage All"\s*:\s*"Unstage All"/);
    assert.match(source, /else if \(hasStaged\) runBulk\("Unstage all", "unstage-all"\)/);
    assert.match(source, /!hasWorking && !hasStaged/);
});
