import { create } from "zustand";
import type { Repository, Workspace } from "../../lib/types";

type Update<T> = T | ((previous: T) => T);
type RegistryState = {
    repos: Repository[];
    workspaces: Workspace[];
    boot: boolean;
    refreshing: boolean;
    setRepos: (value: Update<Repository[]>) => void;
    setWorkspaces: (value: Update<Workspace[]>) => void;
    setBoot: (boot: boolean) => void;
    setRefreshing: (refreshing: boolean) => void;
};

export const useRegistryStore = create<RegistryState>()((set) => ({
    repos: [],
    workspaces: [],
    boot: true,
    refreshing: false,
    setRepos: (value) => set((state) => ({ repos: typeof value === "function" ? value(state.repos) : value })),
    setWorkspaces: (value) => set((state) => ({ workspaces: typeof value === "function" ? value(state.workspaces) : value })),
    setBoot: (boot) => set({ boot }),
    setRefreshing: (refreshing) => set({ refreshing }),
}));
