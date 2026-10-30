import { create } from "zustand";

export type ChangeSort = "path" | "name" | "status";
export type ChangeDirection = "asc" | "desc";
type Update<T> = T | ((previous: T) => T);
type ChangesState = {
    commitMessage: string;
    amend: boolean;
    skipHooks: boolean;
    signoff: boolean;
    setCommitMessage: (commitMessage: string) => void;
    setAmend: (value: Update<boolean>) => void;
    setSkipHooks: (value: Update<boolean>) => void;
    setSignoff: (value: Update<boolean>) => void;
    activeFile: string | null;
    stagedDiff: boolean;
    selectedFiles: string[];
    selectionAnchor: string | null;
    changeSort: ChangeSort;
    changeDirection: ChangeDirection;
    setActiveFile: (activeFile: string | null) => void;
    setStagedDiff: (stagedDiff: boolean) => void;
    setSelectedFiles: (value: Update<string[]>) => void;
    setSelectionAnchor: (selectionAnchor: string | null) => void;
    setChangeSort: (changeSort: ChangeSort) => void;
    setChangeDirection: (value: Update<ChangeDirection>) => void;
    resetSelection: () => void;
};

export const useChangesStore = create<ChangesState>()((set) => ({
    commitMessage: "",
    amend: false,
    skipHooks: false,
    signoff: false,
    setCommitMessage: (commitMessage) => set({ commitMessage }),
    setAmend: (value) => set((state) => ({ amend: typeof value === "function" ? value(state.amend) : value })),
    setSkipHooks: (value) => set((state) => ({ skipHooks: typeof value === "function" ? value(state.skipHooks) : value })),
    setSignoff: (value) => set((state) => ({ signoff: typeof value === "function" ? value(state.signoff) : value })),
    activeFile: null,
    stagedDiff: false,
    selectedFiles: [],
    selectionAnchor: null,
    changeSort: "path",
    changeDirection: "asc",
    setActiveFile: (activeFile) => set({ activeFile }),
    setStagedDiff: (stagedDiff) => set({ stagedDiff }),
    setSelectedFiles: (value) => set((state) => ({ selectedFiles: typeof value === "function" ? value(state.selectedFiles) : value })),
    setSelectionAnchor: (selectionAnchor) => set({ selectionAnchor }),
    setChangeSort: (changeSort) => set({ changeSort }),
    setChangeDirection: (value) => set((state) => ({ changeDirection: typeof value === "function" ? value(state.changeDirection) : value })),
    resetSelection: () => set({ activeFile: null, stagedDiff: false, selectedFiles: [], selectionAnchor: null }),
}));
