import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
test("all Git and gh launches use the same Windows console-suppressed helper", () => {
    const files = ["git/core.rs", "git/changes.rs", "github/mod.rs"];
    const all = files.map((f) => read(`src-tauri/src/${f}`));
    for (const s of all) assert.doesNotMatch(s, /Command::new\s*\(/);
    assert.match(all[0], /crate::process::command\("git"\)/);
    assert.match(all[1], /crate::process::command\("git"\)/);
    assert.match(all[2], /crate::process::command\("gh"\)/);
    const process = read("src-tauri/src/process.rs");
    assert.match(process, /CREATE_NO_WINDOW: u32 = 0x0800[_]?0000/);
    assert.match(process, /command\.creation_flags\(CREATE_NO_WINDOW\)/);
    assert.match(process, /cfg\(all\(test, windows\)\)/);
    assert.match(process, /GetConsoleWindow/);
});
test("GitHub links open through a native command, not the embedded webview", () => {
    const lib = read("src-tauri/src/lib.rs");
    assert.match(lib, /process::open_external_url/);
    assert.match(read("src/components/GitHubPanel.tsx"), /openGitHubUrl\("https:\/\/cli.github.com\/manual\/"\)/);
    for (const name of ["GitHubPanel.tsx", "GitHubExtras.tsx"]) {
        assert.doesNotMatch(read(`src/components/${name}`), /window\.open/);
    }
    assert.match(read("src/lib/external.ts"), /invoke\("open_external_url"/);
});
