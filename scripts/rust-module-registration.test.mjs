import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve("src-tauri/src");
function collect(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const p = path.join(dir, entry.name);
        return entry.isDirectory() ? collect(p) : entry.name.endsWith(".rs") ? [p] : [];
    });
}
test("Tauri attributes decorate functions and all native commands are explicitly registered", () => {
    const sources = collect(root);
    const declared = new Map();
    for (const file of sources) {
        const contents = fs.readFileSync(file, "utf8");
        assert.doesNotMatch(contents, /#\[tauri::command\]\s*$/);
        for (const [, name] of contents.matchAll(/#\[tauri::command\]\s*pub\(crate\)\s+(?:async\s+)?fn\s+(\w+)/g)) {
            assert.ok(!declared.has(name), `duplicate Git/Tauri command ${name}`);
            const segments = path.relative(root, file).replace(/\\/g, "/").replace(/\.rs$/, "").split("/");
            if (segments.at(-1) === "mod") segments.pop();
            declared.set(name, `${segments.join("::")}::${name}`);
        }
    }
    const lib = fs.readFileSync(path.join(root, "lib.rs"), "utf8");
    const registry = lib.match(/tauri::generate_handler!\[([\s\S]*?)\]/)?.[1];
    assert.ok(registry, "Tauri command registry missing");
    const actual = registry
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    assert.equal(actual.length, declared.size);
    assert.deepEqual(new Set(actual), new Set(declared.values()));
});
