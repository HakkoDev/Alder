import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("changes list only mounts visible file rows, not every context-menu instance", () => {
    const list = read("src/features/changes/components/ChangeList.tsx");
    const hook = read("src/features/changes/useVirtualRows.ts");
    assert.match(list, /rows\.slice\(listWindow\.start, listWindow\.end\)/);
    assert.doesNotMatch(list, /unstaged\.map\(\(f\) =>\s*\(\s*<FileRow/);
    assert.match(hook, /Math\.ceil\(\(viewport\.top \+ viewport\.height\) \/ rowHeight\)/);
    assert.match(hook, /ResizeObserver/);
});

test("diff view windows DOM lines without changing staged line positions", () => {
    const diff = read("src/components/app/DiffText.tsx");
    const panel = read("src/features/changes/components/DiffPanel.tsx");
    assert.match(diff, /lines\.slice\(range\.start, range\.end\)/);
    assert.match(diff, /hunkLine\+\+/);
    assert.match(diff, /range\.before/);
    assert.match(panel, /onScroll=\{diffWindow\.onScroll\}/);
});

test("change sorting is memoized and empty array identity is stable", () => {
    assert.match(read("src/features/changes/useChangeSelection.ts"), /const staged = useMemo/);
    assert.match(read("src/features/app/useAppController.ts"), /status\?\.changes \?\? EMPTY_CHANGES/);
});
