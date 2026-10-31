import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("GitHub only loads active PR/issue list and defers activity", () => {
    const s = source("src/components/GitHubPanel.tsx");
    assert.match(s, /if \(tab === "prs"\)/);
    assert.match(s, /requestVersion\.current/);
    assert.match(s, /showActivity && <GitHubExtras/);
    assert.match(s, /slice\(0, visibleCount\)/);
});
test("Issue details and sanitized PR/issue body rendering", () => {
    const component = source("src/components/github/MarkdownBody.tsx");
    assert.match(component, /rehypeSanitize/);
    assert.match(component, /rehypeRaw/);
    assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
    assert.match(source("src-tauri/src/github/mod.rs"), /fn github_issue_detail/);
    assert.match(source("src/components/GitHubPanel.tsx"), /<MarkdownBody body=\{issueDetail.body\}/);
});
test("Repository selection does not navigate and GitHub is named in navigation", () => {
    const s = source("src/features/app/useAppController.ts");
    assert.match(s, /const selectRepo = \(r: Repository\) => \{[\s\S]*?setActiveRepoId\(r.id\);[\s\S]*?\};/);
    assert.match(source("src/lib/i18n/en.ts"), /"nav.pullRequests": "GitHub"/);
    assert.match(source("src/features/app/navigation-store.ts"), /alder.last-view/);
});
