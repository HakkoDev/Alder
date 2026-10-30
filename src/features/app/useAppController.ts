import { isTauri } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { getError } from "@/components/app/controls";
import { useChangesStore } from "@/features/changes/changes-store";
import { useChangeSelection } from "@/features/changes/useChangeSelection";
import { useChangesPane } from "@/features/changes/useChangesPane";
import { useRegistryStore } from "@/features/repositories/registry-store";
import { useRepositoryData } from "@/features/repositories/useRepositoryData";
import { useRepositoryDialog } from "@/features/repositories/useRepositoryDialog";
import { git } from "@/lib/git-api";
import { useTranslation } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import type { Change, Repository } from "@/lib/types";
import { useNavigationStore } from "./navigation-store";

const NATIVE = isTauri();

export function useAppController() {
    const preferences = usePreferences();
    useTranslation();
    const { repos, setRepos, setWorkspaces, setBoot, setRefreshing } = useRegistryStore(
        useShallow((state) => ({
            repos: state.repos,
            setRepos: state.setRepos,
            setWorkspaces: state.setWorkspaces,
            setBoot: state.setBoot,
            setRefreshing: state.setRefreshing,
        })),
    );
    const { activeRepoId, setActiveRepoId, setView, setPalette, setSettings } = useNavigationStore(
        useShallow((state) => ({
            activeRepoId: state.activeRepoId,
            setActiveRepoId: state.setActiveRepoId,
            setView: state.setView,
            setPalette: state.setPalette,
            setSettings: state.setSettings,
        })),
    );
    const { activeFile, stagedDiff, setActiveFile, setStagedDiff, resetSelection } = useChangesStore(
        useShallow((state) => ({
            activeFile: state.activeFile,
            stagedDiff: state.stagedDiff,
            setActiveFile: state.setActiveFile,
            setStagedDiff: state.setStagedDiff,
            resetSelection: state.resetSelection,
        })),
    );
    const [githubCounts, setGithubCounts] = useState<{ prs: number | null; issues: number | null }>({ prs: null, issues: null });
    const updateGitHubCounts = useCallback(
        (prs: number | null, issues: number | null) => setGithubCounts((prev) => (prev.prs === prs && prev.issues === issues ? prev : { prs, issues })),
        [],
    );
    const [branchAction, setBranchAction] = useState<{ kind: "rename" | "delete"; branch: string; name: string } | null>(null);
    const [danger, setDanger] = useState<{ kind: "remove" | "force"; repo: Repository; remote?: string } | null>(null);
    const pane = useChangesPane();
    const [paletteQuery, setPaletteQuery] = useState("");
    const [busy, setBusy] = useState("");
    const activeRepo = repos.find((r) => r.id === activeRepoId) ?? null;

    const report = useCallback((e: unknown, type: "error" | "success" = "error") => {
        const text = getError(e);
        if (type === "error") toast.error(text, { duration: 6500 });
        else toast.success(text, { duration: 3500 });
    }, []);
    const refresh = useCallback(async () => {
        if (!NATIVE) {
            setBoot(false);
            return;
        }
        setRefreshing(true);
        try {
            const [newRepos, newWorkspaces] = await Promise.all([git.repositories(), git.workspaces()]);
            setRepos(newRepos);
            setWorkspaces(newWorkspaces);
            setActiveRepoId((prev) => (prev && newRepos.some((r) => r.id === prev) ? prev : null));
        } catch (e) {
            report(e);
        } finally {
            setBoot(false);
            setRefreshing(false);
        }
    }, [report, setRepos, setWorkspaces, setActiveRepoId, setBoot, setRefreshing]);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    const { status, history, branches, worktrees, stashes, reflog, operation, remotes, diff, loadingRepo, loadingDiff, loadingHistory, loadSelected } =
        useRepositoryData({ activeRepoPath: activeRepo?.path ?? null, activeFile, stagedDiff, report });
    const selectRepo = (r: Repository) => {
        setActiveRepoId(r.id);
        setView("changes");
    };
    const perform = async (label: string, task: () => Promise<unknown>, opts?: { reload?: boolean }) => {
        if (busy) return;
        setBusy(label);
        const toastId = toast.loading(`${label}…`);
        try {
            const value = await task();
            if (opts?.reload !== false) {
                await refresh();
                if (activeRepo) await loadSelected(activeRepo.path);
            }
            toast.success(typeof value === "string" && value.trim() ? value : `${label} complete`, { id: toastId });
        } catch (e) {
            // A failed merge/rebase/cherry-pick may have left an active conflict state.
            // Reload it immediately so Abort/Resolve actions become available.
            if (activeRepo) {
                try {
                    await loadSelected(activeRepo.path);
                    await refresh();
                } catch {
                    /* preserve original Git failure */
                }
            }
            toast.error(getError(e), { id: toastId, duration: 6500 });
        } finally {
            setBusy("");
        }
    };
    const repositoryDialog = useRepositoryDialog({ activeRepo, busy, setBusy, refresh, loadSelected, report });
    const { setModal } = repositoryDialog;
    const changed = repos.filter((r) => r.modified + r.staged > 0).length;
    const ahead = repos.filter((r) => r.ahead > 0).length;
    const behind = repos.filter((r) => r.behind > 0).length;
    const { listedChanges, staged, unstaged, selectedFiles, setSelectedFiles, selectChange } = useChangeSelection(status?.changes ?? []);
    // biome-ignore lint/correctness/useExhaustiveDependencies: Repository identity intentionally resets local selections.
    useEffect(() => {
        setGithubCounts({ prs: null, issues: null });
        resetSelection();
    }, [activeRepo?.path, resetSelection]);
    const chooseFile = (item: Change, selectedStaged: boolean) => {
        setActiveFile(item.path);
        setStagedDiff(selectedStaged);
    };
    const runAdvanced = (title: string, task: () => Promise<unknown>) => perform(title, task);
    const selectedUnstaged = unstaged.filter((c) => selectedFiles.includes(`working:${c.path}`));
    const selectedStaged = staged.filter((c) => selectedFiles.includes(`staged:${c.path}`));
    const bulkFiles = async (stage: boolean, files: Change[]) => {
        if (!activeRepo || !files.length) return;
        const action = stage ? "Stage selected" : "Unstage selected";
        await perform(action, async () => {
            for (const item of files) {
                if (stage) await git.stage(activeRepo.path, item.path);
                else await git.unstage(activeRepo.path, item.path);
            }
            setSelectedFiles([]);
            return `${stage ? "Staged" : "Unstaged"} ${files.length} file${files.length === 1 ? "" : "s"}`;
        });
    };
    const net = (mode: "fetch" | "pull" | "pull-rebase" | "push" | "force-push", remote?: string) => {
        if (!activeRepo) return;
        if (mode === "force-push") {
            setDanger({ kind: "force", repo: activeRepo, remote });
            return;
        }
        const label = mode === "pull-rebase" ? "Pull (Rebase)" : mode[0].toUpperCase() + mode.slice(1);
        void perform(label, () => git.network(activeRepo.path, mode, remote));
    };
    const assignWorkspaceFast = async (repoId: string, workspaceId: string | null) => {
        const previous = repos.find((item) => item.id === repoId)?.workspaceId ?? null;
        setRepos((items) => items.map((item) => (item.id === repoId ? { ...item, workspaceId } : item)));
        try {
            await git.assignWorkspace(repoId, workspaceId);
            toast.success("Workspace updated");
        } catch (error) {
            setRepos((items) => items.map((item) => (item.id === repoId ? { ...item, workspaceId: previous } : item)));
            report(error);
        }
    };
    const removeFromAlder = async (repo: Repository) => {
        await perform(
            "Remove repository",
            async () => {
                await git.remove(repo.id);
                setRepos((previous) => previous.filter((item) => item.id !== repo.id));
                if (activeRepoId === repo.id) {
                    setActiveRepoId(null);
                    setView("overview");
                }
                return `${repo.name} removed from Alder. The repository on disk was not modified.`;
            },
            { reload: false },
        );
        setDanger(null);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setPalette((x) => !x);
            }
            if (e.key === "Escape") {
                setPalette(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [setPalette]);
    const primaryActions = [
        { name: "Git operations", click: () => setView("operations") },
        { name: "Worktrees", click: () => setView("worktrees") },
        { name: "Open repository", click: () => setModal("add") },
        { name: "Scan folder", click: () => setModal("scan") },
        { name: "Clone repository", click: () => setModal("clone") },
        { name: "New workspace", click: () => setModal("workspace") },
        { name: "Open settings", click: () => setSettings(true) },
        { name: "Refresh repositories", click: () => void refresh() },
    ];

    return {
        ...pane,
        ...repositoryDialog,
        staged,
        busy,
        perform,
        activeRepo,
        listedChanges,
        loadingRepo,
        loadSelected,
        selectedUnstaged,
        bulkFiles,
        selectedStaged,
        unstaged,
        chooseFile,
        selectChange,
        loadingDiff,
        diff,
        history,
        loadingHistory,
        setModal,
        branches,
        setBranchAction,
        status,
        assignWorkspaceFast,
        net,
        remotes,
        changed,
        ahead,
        behind,
        refresh,
        selectRepo,
        operation,
        runAdvanced,
        worktrees,
        stashes,
        reflog,
        updateGitHubCounts,
        setDanger,
        githubCounts,
        branchAction,
        danger,
        removeFromAlder,
        preferences,
        paletteQuery,
        setPaletteQuery,
        primaryActions,
    };
}
export type AppController = ReturnType<typeof useAppController>;
