import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { Script } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../src/lib/theme-presets.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {};
new Script(`(function(exports){${js}\n})`).runInNewContext()(exports);
const { themePresets, contrastRatio } = exports;
const pairs = [
    ["foreground", "background"],
    ["cardForeground", "card"],
    ["popoverForeground", "popover"],
    ["primaryForeground", "primary"],
    ["secondaryForeground", "secondary"],
    ["accentForeground", "accent"],
    ["destructiveForeground", "destructive"],
    ["sidebarForeground", "sidebar"],
    ["sidebarPrimaryForeground", "sidebarPrimary"],
    ["sidebarAccentForeground", "sidebarAccent"],
];
test("all theme semantic text pairs meet WCAG AA normal-text contrast (4.5:1)", () => {
    const failures = [];
    for (const [name, preset] of Object.entries(themePresets))
        for (const mode of ["dark", "light"]) {
            const theme = preset[mode];
            for (const [foreground, background] of pairs) {
                const ratio = contrastRatio(theme[foreground], theme[background]);
                if (ratio < 4.5) failures.push(`${name}/${mode} ${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
            }
        }
    assert.deepEqual(failures, []);
});
