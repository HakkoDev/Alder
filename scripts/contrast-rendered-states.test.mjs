import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("disabled buttons do not fade WCAG-compatible theme foregrounds", () => {
    assert.doesNotMatch(read("src/components/ui/button.tsx"), /disabled:opacity-50/);
    assert.match(read("src/styles.css"), /button:disabled[\s\S]*?opacity:\s*1/);
});
test("GitHub read requests use nonblocking async commands", () => {
    const rust = read("src-tauri/src/github/mod.rs");
    for (const name of ["github_auth", "github_repository", "github_pull_requests", "github_issues"]) {
        assert.ok(rust.includes(`pub(crate) async fn ${name}(`), `${name} needs async`);
    }
    assert.match(rust, /tauri::async_runtime::spawn_blocking/);
});
