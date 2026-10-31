import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { Script } from "node:vm";

const pairs = [
    ["foreground", "background"],
    ["cardForeground", "card"],
    ["popoverForeground", "popover"],
    ["primaryForeground", "primary"],
    ["primaryForeground", "primaryHover"],
    ["secondaryForeground", "secondary"],
    ["accentForeground", "accent"],
    ["destructiveForeground", "destructive"],
    ["destructiveForeground", "destructiveHover"],
    ["sidebarForeground", "sidebar"],
    ["sidebarPrimaryForeground", "sidebarPrimary"],
    ["sidebarAccentForeground", "sidebarAccent"],
    ["sidebarForeground", "sidebarAccent"],
    ["mutedForeground", "background"],
    ["mutedForeground", "card"],
    ["mutedForeground", "popover"],
    ["mutedForeground", "muted"],
];

test("all theme semantic text and hover pairs meet WCAG AA normal-text contrast (4.5:1)", () => {
    const require = createRequire(import.meta.url);
    const imported = require("typescript");
    const ts = imported.default ?? imported;
    assert.ok(ts.transpileModule && ts.ModuleKind && ts.ScriptTarget, "TypeScript transpiler APIs unavailable");
    const source = readFileSync(new URL("../src/lib/theme-presets.ts", import.meta.url), "utf8");
    const js = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const exports = {};
    new Script(`(function (exports) { ${js}\n})`).runInNewContext()(exports);
    const { themePresets, contrastRatio } = exports;
    assert.ok(themePresets && typeof contrastRatio === "function", "Unable to load theme presets and contrast helper");

    const failures = [];
    for (const [name, preset] of Object.entries(themePresets)) {
        for (const mode of ["dark", "light"]) {
            const theme = preset[mode];
            for (const [foreground, background] of pairs) {
                const ratio = contrastRatio(theme[foreground], theme[background]);
                if (!Number.isFinite(ratio) || ratio < 4.5) {
                    failures.push(`${name}/${mode} ${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
                }
            }
        }
    }
    assert.deepEqual(failures, [], `Contrast failures:\n${failures.join("\n")}`);
});
