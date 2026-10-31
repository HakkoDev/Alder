import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("trash requests queue a confirmation and only execute inside confirmed action", () => {
    const ui = read("src/features/changes/components/ChangeList.tsx");
    assert.match(ui, /onTrash=\{\(\) => \{\s*setPendingDeletion/);
    assert.match(ui, /const confirmDeletion = async \(\) =>/);
    assert.match(ui, /if \(pendingDeletion\.repoPath !== activeRepo\.path\)/);
    assert.match(ui, /if \(target\.kind === "file"\) \{\s*await git\.trashFile/);
    assert.match(ui, /onClick=\{\(\) => void confirmDeletion\(\)\}/);
    assert.match(ui, /onClick=\{\(\) => setPendingDeletion\(null\)\}/);
    assert.doesNotMatch(ui, /window\.confirm/);
});

test("signed updater exposes check and install in-app and supports early manual checks", () => {
    const hook = read("src/components/updater/update-center.tsx");
    const header = read("src/components/app/AppHeader.tsx");
    const app = read("src/App.tsx");
    assert.match(hook, /invoke<UpdateConfiguration>\("updater_configuration"\)/);
    assert.match(hook, /await check\(\{ timeout: 15000 \}\)/);
    assert.match(hook, /await update\.downloadAndInstall/);
    assert.match(hook, /await relaunch\(\)/);
    assert.match(hook, /setProgress\(/);
    assert.match(header, /props\.updater\.checkForUpdates\(true\)/);
    assert.match(app, /<AppHeader activeRepo=\{app\.activeRepo\} updater=\{updater\}/);
});
