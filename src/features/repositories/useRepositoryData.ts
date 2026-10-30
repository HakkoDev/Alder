import { isTauri } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { git } from "../../lib/git-api";
import type { Branch, Commit, GitOperationState, ReflogInfo, RepoStatus, StashInfo, WorktreeInfo } from "../../lib/types";

const idleOperation = (): GitOperationState => ({
    merging: false,
    rebasing: false,
    cherryPicking: false,
    reverting: false,
    conflicts: [],
});

type RepositoryDataOptions = {
    activeRepoPath: string | null;
    activeFile: string | null;
    stagedDiff: boolean;
    report: (error: unknown) => void;
};

/**
 * Loads working-tree status first and treats history, worktrees, and remotes as
 * supplemental data. Every request has an epoch so navigating away cannot
 * overwrite the current repository or file.
 */
export function useRepositoryData({ activeRepoPath, activeFile, stagedDiff, report }: RepositoryDataOptions) {
    const [status, setStatus] = useState<RepoStatus | null>(null);
    const [history, setHistory] = useState<Commit[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
    const [stashes, setStashes] = useState<StashInfo[]>([]);
    const [reflog, setReflog] = useState<ReflogInfo[]>([]);
    const [operation, setOperation] = useState<GitOperationState>(idleOperation);
    const [remotes, setRemotes] = useState<string[]>([]);
    const [diff, setDiff] = useState("");
    const [loadingRepo, setLoadingRepo] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingDiff, setLoadingDiff] = useState(false);
    const loadEpoch = useRef(0);
    const diffEpoch = useRef(0);

    const loadSelected = useCallback(
        async (path: string) => {
            if (!isTauri()) return;
            const epoch = ++loadEpoch.current;
            const valid = () => loadEpoch.current === epoch;
            setLoadingRepo(true);
            setLoadingHistory(true);
            try {
                const primary = await git.status(path);
                if (!valid()) return;
                setStatus(primary);
                setLoadingRepo(false);
                const [historyResult, branchResult] = await Promise.allSettled([git.history(path, 100), git.branches(path)]);
                if (!valid()) return;
                setLoadingHistory(false);
                if (historyResult.status === "fulfilled") setHistory(historyResult.value);
                if (branchResult.status === "fulfilled") setBranches(branchResult.value);
                const [trees, stashResult, op, remoteResult] = await Promise.allSettled([
                    git.worktrees(path),
                    git.stashes(path),
                    git.operationState(path),
                    git.remotes(path),
                ]);
                if (!valid()) return;
                setWorktrees(trees.status === "fulfilled" ? trees.value : []);
                setStashes(stashResult.status === "fulfilled" ? stashResult.value : []);
                setOperation(op.status === "fulfilled" ? op.value : idleOperation());
                setRemotes(remoteResult.status === "fulfilled" ? remoteResult.value : []);
                void git
                    .reflog(path)
                    .then((value) => {
                        if (valid()) setReflog(value);
                    })
                    .catch(() => {});
            } catch (error) {
                if (!valid()) return;
                setLoadingRepo(false);
                setLoadingHistory(false);
                setStatus(null);
                report(error);
            }
        },
        [report],
    );

    useEffect(() => {
        ++loadEpoch.current;
        ++diffEpoch.current;
        setStatus(null);
        setHistory([]);
        setBranches([]);
        setWorktrees([]);
        setStashes([]);
        setReflog([]);
        setRemotes([]);
        setOperation(idleOperation());
        setDiff("");
        setLoadingDiff(false);
        setLoadingHistory(false);
        if (activeRepoPath) void loadSelected(activeRepoPath);
        else setLoadingRepo(false);
        return () => {
            ++loadEpoch.current;
        };
    }, [activeRepoPath, loadSelected]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: A status refresh invalidates the diff after index and worktree mutations.
    useEffect(() => {
        const epoch = ++diffEpoch.current;
        if (!activeRepoPath || !activeFile) {
            setDiff("");
            setLoadingDiff(false);
            return;
        }
        setLoadingDiff(true);
        setDiff("");
        void git
            .diff(activeRepoPath, activeFile, stagedDiff)
            .then((value) => {
                if (epoch === diffEpoch.current) {
                    setDiff(value);
                    setLoadingDiff(false);
                }
            })
            .catch((error) => {
                if (epoch === diffEpoch.current) {
                    setLoadingDiff(false);
                    report(error);
                }
            });
        return () => {
            ++diffEpoch.current;
        };
    }, [activeRepoPath, activeFile, stagedDiff, status, report]);

    return {
        status,
        setStatus,
        history,
        setHistory,
        branches,
        setBranches,
        worktrees,
        setWorktrees,
        stashes,
        setStashes,
        reflog,
        setReflog,
        operation,
        setOperation,
        remotes,
        setRemotes,
        diff,
        setDiff,
        loadingRepo,
        setLoadingRepo,
        loadingHistory,
        setLoadingHistory,
        loadingDiff,
        setLoadingDiff,
        loadSelected,
    };
}
