import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { useNavigationStore } from "../src/features/app/navigation-store.ts";
import { useChangesStore } from "../src/features/changes/changes-store.ts";
import { useRegistryStore } from "../src/features/repositories/registry-store.ts";

beforeEach(() => {
    for (const store of [useNavigationStore, useChangesStore, useRegistryStore]) {
        store.setState(store.getInitialState(), true);
    }
});

test("navigation actions update shared state without recreating actions", () => {
    const actions = useNavigationStore.getState();
    actions.setView("history");
    actions.setWorkspaceFilter("work");
    actions.setSearch("Alder");
    actions.setPalette((open) => !open);
    actions.setSettings(true);
    const state = useNavigationStore.getState();
    assert.equal(state.view, "history");
    assert.equal(state.workspaceFilter, "work");
    assert.equal(state.search, "Alder");
    assert.equal(state.palette, true);
    assert.equal(state.settings, true);
    assert.equal(state.setView, actions.setView);
});

test("repository selection preserves the existing storage key and tolerates denied storage", () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const values = new Map();
    try {
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            value: {
                setItem: (key, value) => values.set(key, value),
                removeItem: (key) => values.delete(key),
            },
        });
        const { setActiveRepoId } = useNavigationStore.getState();
        setActiveRepoId("repo-a");
        assert.equal(values.get("alder.last-repo"), "repo-a");
        setActiveRepoId((previous) => (previous === "repo-a" ? "repo-b" : null));
        assert.equal(useNavigationStore.getState().activeRepoId, "repo-b");
        setActiveRepoId(null);
        assert.equal(values.has("alder.last-repo"), false);
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            get: () => {
                throw new Error("Storage denied");
            },
        });
        assert.doesNotThrow(() => setActiveRepoId("offline"));
        assert.equal(useNavigationStore.getState().activeRepoId, "offline");
    } finally {
        if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
        else delete globalThis.localStorage;
    }
});

test("registry functional updates preserve unrelated repositories and workspace data", () => {
    const { setRepos, setWorkspaces, setBoot, setRefreshing } = useRegistryStore.getState();
    setRepos([
        { id: "a", workspaceId: null },
        { id: "b", workspaceId: "other" },
    ]);
    const previous = useRegistryStore.getState().repos;
    setRepos((items) => items.map((item) => (item.id === "a" ? { ...item, workspaceId: "work" } : item)));
    assert.equal(useRegistryStore.getState().repos[0].workspaceId, "work");
    assert.equal(previous[0].workspaceId, null);
    setRepos((items) => items.filter((item) => item.id !== "a"));
    assert.deepEqual(
        useRegistryStore.getState().repos.map((item) => item.id),
        ["b"],
    );
    setWorkspaces([]);
    setWorkspaces((items) => [...items, { id: "work", name: "Work", color: "#123456" }]);
    setBoot(false);
    setRefreshing(true);
    assert.equal(useRegistryStore.getState().workspaces[0].name, "Work");
    assert.equal(useRegistryStore.getState().boot, false);
    assert.equal(useRegistryStore.getState().refreshing, true);
});

test("repository transitions clear file selection without erasing commit drafts or sorting", () => {
    const actions = useChangesStore.getState();
    actions.setActiveFile("README.md");
    actions.setStagedDiff(true);
    actions.setSelectedFiles(["staged:README.md"]);
    actions.setSelectedFiles((previous) => [...previous, "working:src/main.tsx"]);
    actions.setSelectionAnchor("staged:README.md");
    actions.setChangeSort("status");
    actions.setChangeDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    actions.setCommitMessage("Work in progress");
    actions.setAmend(true);
    actions.setSkipHooks(true);
    actions.setSignoff(true);
    actions.setAmend((value) => !value);
    actions.setAmend((value) => !value);
    actions.setSkipHooks((value) => !value);
    actions.setSkipHooks((value) => !value);
    actions.setSignoff((value) => !value);
    actions.setSignoff((value) => !value);
    assert.equal(useChangesStore.getState().selectedFiles.length, 2);
    actions.resetSelection();
    const state = useChangesStore.getState();
    assert.equal(state.activeFile, null);
    assert.equal(state.stagedDiff, false);
    assert.deepEqual(state.selectedFiles, []);
    assert.equal(state.selectionAnchor, null);
    assert.equal(state.commitMessage, "Work in progress");
    assert.equal(state.changeSort, "status");
    assert.equal(state.changeDirection, "desc");
    assert.equal(state.amend && state.skipHooks && state.signoff, true);
});

test("independent stores do not notify navigation subscribers about registry and commit edits", () => {
    let notifications = 0;
    const unsubscribe = useNavigationStore.subscribe(() => {
        notifications++;
    });
    try {
        useRegistryStore.getState().setRepos([]);
        useChangesStore.getState().setCommitMessage("Unrelated draft");
        assert.equal(notifications, 0);
        useNavigationStore.getState().setView("changes");
        assert.equal(notifications, 1);
    } finally {
        unsubscribe();
    }
});
