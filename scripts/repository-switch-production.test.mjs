import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("selected repository is distinct from hovered repository and inspector follows active id", () => {
    const styles = read("src/styles.css");
    const app = read("src/components/app/AppContent.tsx");
    assert.match(styles, /\.repo-nav-entry:hover:not\(\.selected\)/);
    assert.match(styles, /\.repo-nav-entry\.selected/);
    assert.match(app, /<RepositoryTools\s+key=\{activeRepo\.id\}\s+path=\{activeRepo\.path\}/);
});
test("repository status, history and auxiliary requests start independently", () => {
    const data = read("src/features/repositories/useRepositoryData.ts");
    assert.match(data, /load\(git\.remotes\(path\), setRemotes\)/);
    assert.match(data, /load\(git\.worktrees\(path\), setWorktrees\)/);
    assert.match(data, /const primary = await git\.status\(path\)/);
    assert.match(data, /if \(valid\(\)\) setHistory\(value\)/);
});
test("production webview guards preserve app context menus and dev tools in development", () => {
    const source = read("src/lib/production-webview.ts");
    assert.match(source, /import\.meta\.env\.DEV/);
    assert.match(source, /addEventListener\("contextmenu", contextMenu\)/);
    assert.match(source, /addEventListener\("keydown", shortcuts, true\)/);
    assert.doesNotMatch(source, /stopPropagation\(\).*contextmenu/);
});
