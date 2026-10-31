import { create } from "zustand";
import type { View } from "../../lib/types";

type NavigationState = {
    activeRepoId: string | null;
    view: View;
    workspaceFilter: string;
    search: string;
    settings: boolean;
    palette: boolean;
    setActiveRepoId: (value: string | null | ((previous: string | null) => string | null)) => void;
    setView: (view: View) => void;
    setWorkspaceFilter: (workspaceFilter: string) => void;
    setSearch: (search: string) => void;
    setSettings: (settings: boolean) => void;
    setPalette: (value: boolean | ((previous: boolean) => boolean)) => void;
};

function lastRepository() {
    try {
        return localStorage.getItem("alder.last-repo");
    } catch {
        return null;
    }
}

export const useNavigationStore = create<NavigationState>()((set) => ({
    activeRepoId: lastRepository(),
    view: (() => {
        try {
            const saved = localStorage.getItem("alder.last-view");
            return (
                (["overview", "changes", "history", "branches", "worktrees", "operations", "pulls", "agents"] as const).find((v) => v === saved) ?? "overview"
            );
        } catch {
            return "overview";
        }
    })(),
    workspaceFilter: "all",
    search: "",
    settings: false,
    palette: false,
    setActiveRepoId: (value) =>
        set((state) => {
            const activeRepoId = typeof value === "function" ? value(state.activeRepoId) : value;
            try {
                if (activeRepoId) localStorage.setItem("alder.last-repo", activeRepoId);
                else localStorage.removeItem("alder.last-repo");
            } catch {
                // Selection still works when optional browser storage is unavailable.
            }
            return { activeRepoId };
        }),
    setView: (view) => {
        try {
            localStorage.setItem("alder.last-view", view);
        } catch {
            /* optional storage */
        }
        set({ view });
    },
    setWorkspaceFilter: (workspaceFilter) => set({ workspaceFilter }),
    setSearch: (search) => set({ search }),
    setSettings: (settings) => set({ settings }),
    setPalette: (value) => set((state) => ({ palette: typeof value === "function" ? value(state.palette) : value })),
}));
