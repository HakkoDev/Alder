import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("App is a composition root rather than a state or Git implementation", () => {
    const app = read("src/App.tsx");
    for (const component of [
        "AppSidebar",
        "AppHeader",
        "AppContent",
        "AppFooter",
        "BranchActionDialog",
        "DangerDialog",
        "RepositoryDialog",
        "SettingsDialog",
        "CommandPalette",
    ]) {
        assert.ok(app.includes(`<${component}`), `App must compose ${component}`);
    }
    assert.match(app, /useAppController\(\)/);
    assert.doesNotMatch(app, /useState|git\.|toast\.|<textarea|changes-divider/);
    assert.doesNotMatch(read("src/features/app/useAppController.ts"), /<div|<Dialog\.|<Sidebar/);
});

test("shared UI state is consumed through narrow Zustand selectors", () => {
    for (const [path, store] of [
        ["src/components/app/AppHeader.tsx", "useNavigationStore"],
        ["src/features/repositories/components/RepositoryOverview.tsx", "useRegistryStore"],
        ["src/features/changes/components/CommitForm.tsx", "useChangesStore"],
        ["src/features/changes/useChangeSelection.ts", "useChangesStore"],
    ]) {
        assert.match(read(path), new RegExp(`${store}\\(\\s*useShallow\\(`));
        assert.doesNotMatch(read(path), new RegExp(`${store}\\(\\)`));
    }
    assert.match(read("src/features/app/useAppController.ts"), /resetSelection\(\)/);
    assert.match(read("src/features/changes/useChangesPane.ts"), /removeEventListener\("pointercancel"/);
});
