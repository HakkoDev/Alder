import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
test("GitHub worktree checkout and paginated API commands registered", () => {
    const rust = read("src-tauri/src/github/mod.rs");
    const lib = read("src-tauri/src/lib.rs");
    for (const c of ["github_pr_checkout_worktree", "github_notifications", "github_releases", "github_tags", "github_rate_limit"]) {
        assert.ok(rust.includes(`fn ${c}(`));
        assert.ok(lib.includes(`github::${c}`));
    }
});
test("React application composes reusable settings and GitHub panels", () => {
    const app = read("src/App.tsx");
    const settings = read("src/components/app/Settings.tsx");
    assert.ok(read("src/components/app/dialogs/SettingsDialog.tsx").includes("components/app/Settings"));
    assert.ok(read("src/components/GitHubPanel.tsx").includes("GitHubExtras"));
    assert.ok(app.includes("SettingsDialog"));
    assert.match(settings, /Color theme/);
});
