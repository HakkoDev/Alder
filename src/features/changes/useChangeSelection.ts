import { useCallback, useState } from "react";
import type { Change } from "../../lib/types";

export type ChangeSort = "path" | "name" | "status";
export type ChangeDirection = "asc" | "desc";

export function useChangeSelection(listedChanges: Change[]) {
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [changeSort, setChangeSort] = useState<ChangeSort>("path");
    const [changeDirection, setChangeDirection] = useState<ChangeDirection>("asc");
    const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);

    const orderChanges = useCallback(
        (items: Change[]) =>
            [...items].sort((a, b) => {
                const value = (change: Change) =>
                    changeSort === "name"
                        ? (change.path.split(/[\\/]/).pop() ?? change.path)
                        : changeSort === "status"
                          ? change.untracked
                              ? "0"
                              : change.indexStatus + change.worktreeStatus
                          : change.path;
                return (changeDirection === "asc" ? 1 : -1) * value(a).localeCompare(value(b), undefined, { numeric: true, sensitivity: "base" });
            }),
        [changeSort, changeDirection],
    );

    const staged = orderChanges(listedChanges.filter((change) => change.staged));
    const unstaged = orderChanges(listedChanges.filter((change) => change.unstaged));

    const selectChange = (change: Change, stagedSide: boolean, shift = false) => {
        const side = stagedSide ? "staged" : "working";
        const key = `${side}:${change.path}`;
        const group = (stagedSide ? staged : unstaged).map((item) => `${side}:${item.path}`);
        setSelectedFiles((previous) => {
            if (shift && selectionAnchor && group.includes(selectionAnchor)) {
                const first = group.indexOf(selectionAnchor);
                const last = group.indexOf(key);
                return [...new Set([...previous, ...group.slice(Math.min(first, last), Math.max(first, last) + 1)])];
            }
            return previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key];
        });
        if (!shift) setSelectionAnchor(key);
    };

    return {
        listedChanges,
        staged,
        unstaged,
        selectedFiles,
        setSelectedFiles,
        changeSort,
        setChangeSort,
        changeDirection,
        setChangeDirection,
        selectionAnchor,
        setSelectionAnchor,
        selectChange,
    };
}
