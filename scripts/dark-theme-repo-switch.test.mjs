import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("dark themes use dark text on accessible primary, accent and sidebar fills", () => {
    const source = read("src/lib/theme-presets.ts");
    for (const name of ["primary", "accent", "sidebarPrimary"]) assert.match(source, new RegExp(`const ${name} = dark \\? accessibleSurface`));
    for (const name of ["primaryForeground", "accentForeground", "sidebarPrimaryForeground"])
        assert.match(source, new RegExp(`const ${name} = dark \\? "#10121a"`));
});
test("frequent Git repo commands run on blocking pool and supplemental requests start early", () => {
    const backend = read("src-tauri/src/git/history.rs");
    for (const name of ["repo_status", "commit_history", "list_branches"]) assert.match(backend, new RegExp(`async fn ${name}\\(`));
    assert.equal((backend.match(/spawn_blocking\(/g) || []).length, 3);
    const frontend = read("src/features/repositories/useRepositoryData.ts");
    assert.match(frontend, /const supplemental = Promise\.allSettled/);
    assert.match(frontend, /await supplemental/);
});
