import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { rustSource } from "./rust-source.mjs";

const core = rustSource();
const api = readFileSync(new URL("../src/lib/git-api.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("../src/components/GitHubPanel.tsx", import.meta.url), "utf8");
test("GitHub commands are registered and use argv-only gh process", () => {
    for (const s of [
        "github_auth",
        "github_repository",
        "github_pull_requests",
        "github_issues",
        "github_pr_detail",
        "github_pr_create",
        "github_pr_review",
        "github_pr_checks",
    ]) {
        assert.match(core, new RegExp(`fn ${s}\\s*\\(`));
        assert.match(core.slice(core.lastIndexOf("generate_handler!")), new RegExp(s));
    }
    assert.match(core, /crate::process::command\("gh"\)/);
    assert.match(core, /cmd\s*\.args\(args\)/);
    assert.doesNotMatch(core, /sh -c|cmd \/C/);
});
test("GitHub UI uses native invoke and error states", () => {
    for (const s of ["github_auth", "github_pull_requests", "github_pr_create", "github_pr_review"]) assert.ok(api.includes(`"${s}"`));
    assert.match(ui, /GitHub connection unavailable/);
    assert.match(ui, /requestVersion\.current/);
    assert.match(ui, /submitReview/);
});
