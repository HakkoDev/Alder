import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { rustSource } from "./rust-source.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("desktop commands are wired and Git is invoked as argv, not shell interpolation", () => {
    const rust = rustSource(),
        api = read("src/lib/git-api.ts");
    for (const command of [
        "list_repositories",
        "add_repository",
        "discover_repositories",
        "clone_repository",
        "repo_status",
        "commit_history",
        "list_branches",
        "file_diff",
        "stage_file",
        "unstage_file",
        "stage_all",
        "create_commit",
        "switch_branch",
        "create_branch",
        "fetch_repo",
        "pull_repo",
        "push_repo",
    ]) {
        assert.match(rust, new RegExp(`\\b${command}\\b`));
        assert.ok(api.includes(`"${command}"`), `API missing ${command}`);
    }
    assert.match(rust, /crate::process::command\("git"\)/);
    assert.doesNotMatch(rust, /\.shell\s*\(/);
    assert.match(rust, /"pull",\s*"--ff-only"/);
});
test("theme preset engine and semantic tokens are preserved", () => {
    const t = read("src/lib/theme-presets.ts");
    assert.match(t, /export const themePresets/);
    assert.match(read("src/lib/preferences.ts"), /themeId: "alder"/);
    assert.match(t, /alder: \{/);
    assert.match(read("src/lib/theme.ts"), /--sidebar-accent/);
    assert.match(read("src-tauri/tauri.conf.json"), /dev\.hakkodev\.alder/);
});
