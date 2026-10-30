import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
test("all menu portals have solid runtime theme backgrounds", () => {
    const css = read("../src/styles.css");
    assert.match(css, /\.alder-portal-menu\s*\{\s*background-color:\s*var\(--popover\)/);
    for (const path of ["context-menu.tsx", "dropdown-menu.tsx", "select.tsx"]) assert.match(read("../src/components/ui/" + path), /alder-portal-menu/);
});
test("dialogs have one centering transform and explicit overlay background", () => {
    const d = read("../src/components/ui/dialog.tsx");
    const css = read("../src/styles.css");
    assert.doesNotMatch(d, /-translate-x-1\/2|-translate-y-1\/2/);
    assert.match(css, /\.alder-dialog-content\s*\{[^}]*transform:\s*translate\(-50%,\s*-50%\)/);
    assert.match(d, /alder-dialog-overlay/);
});
test("custom App close buttons suppress built-in close and palette has only escape", () => {
    const app = read("../src/App.tsx");
    for (const label of ["danger-explanation", "alder-modal-description"])
        assert.match(app, new RegExp('Dialog\\.DialogContent\\s+hideClose\\s+className="modal-content"\\s+aria-describedby="' + label + '"'));
    assert.match(app, /Dialog\.DialogContent\s+hideClose\s+className="modal-content settings-content"/);
    assert.match(app, /Dialog\.DialogContent\s+hideClose\s+className="modal-content palette-content"/);
});

test("top-level dropdown content also receives opaque portal class", () => {
    const dropdown = read("../src/components/ui/dropdown-menu.tsx");
    const content = dropdown.match(/export const DropdownMenuContent = [\s\S]*?(?=export const DropdownMenuItem)/)?.[0];
    assert.ok(content, "DropdownMenuContent must exist");
    assert.match(content, /className=\{cn\(\s*"alder-portal-menu /);
    const css = read("../src/styles.css");
    assert.match(css, /\.alder-portal-menu\s*\{\s*background:/);
});
