import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
    ArrowDownLeft,
    ArrowRight,
    ArrowUpRight,
    Bot,
    Check,
    ChevronDown,
    ChevronRight,
    CircleDot,
    CloudDownload,
    CloudUpload,
    Command,
    FileCode2,
    FilePlus2,
    FileText,
    FolderClosed,
    FolderGit2,
    FolderOpen,
    GitBranch,
    GitCommitHorizontal,
    GitCompareArrows,
    GitMerge,
    GitPullRequest,
    History,
    Layers3,
    LayoutDashboard,
    MoreHorizontal,
    Plus,
    RefreshCw,
    Search,
    Settings2,
    ShieldCheck,
    SlidersHorizontal,
    Terminal,
    Trash2,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { OperationsPanel, SequenceRecovery, WorktreePanel } from "./components/AdvancedGit";
import { AppIcon, Empty, getError, IconButton, PButton } from "./components/app/controls";
import { DiffText } from "./components/app/DiffText";
import { FileRow } from "./components/app/FileRow";
import { FooterAction } from "./components/app/FooterAction";
import { Settings } from "./components/app/Settings";
import { Stat } from "./components/app/Stat";
import { GitGraph } from "./components/GitGraph";
import { GitHubPanel } from "./components/GitHubPanel";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "./components/ui/context-menu";
import * as Dialog from "./components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { SelectField as Select } from "./components/ui/select";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { Skeleton } from "./components/ui/skeleton";
import { Spinner } from "./components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { useChangeSelection } from "./features/changes/useChangeSelection";
import { useRepositoryData } from "./features/repositories/useRepositoryData";
import { git } from "./lib/git-api";
import { t, useTranslation } from "./lib/i18n";
import { usePreferences } from "./lib/preferences";
import type { Change, Repository, View, Workspace } from "./lib/types";

type Modal = "add" | "scan" | "clone" | "init" | "workspace" | "branch" | null;
const NATIVE = isTauri();
const formatName = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
function navItems(): { id: View; icon: typeof LayoutDashboard; label: string; planned?: boolean }[] {
    return [
        { id: "overview", icon: LayoutDashboard, label: t("nav.overview") },
        { id: "changes", icon: FileCode2, label: t("nav.changes") },
        { id: "history", icon: History, label: t("nav.history") },
        { id: "branches", icon: GitBranch, label: t("nav.branches") },
        { id: "worktrees", icon: Layers3, label: t("nav.worktrees") },
        { id: "operations", icon: GitMerge, label: t("nav.operations") },
        { id: "pulls", icon: GitPullRequest, label: t("nav.pullRequests") },
        { id: "agents", icon: Bot, label: t("nav.agents"), planned: true },
    ];
}
export default function App() {
    const preferences = usePreferences();
    useTranslation();
    const [repos, setRepos] = useState<Repository[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeRepoId, setActiveRepoId] = useState<string | null>(() => {
        try {
            return localStorage.getItem("alder.last-repo");
        } catch {
            return null;
        }
    });
    const [view, setView] = useState<View>("overview");
    const [githubCounts, setGithubCounts] = useState<{ prs: number | null; issues: number | null }>({ prs: null, issues: null });
    const updateGitHubCounts = useCallback(
        (prs: number | null, issues: number | null) => setGithubCounts((prev) => (prev.prs === prs && prev.issues === issues ? prev : { prs, issues })),
        [],
    );
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [stagedDiff, setStagedDiff] = useState(false);
    const [commitMessage, setCommitMessage] = useState("");
    const [amend, setAmend] = useState(false);
    const [skipHooks, setSkipHooks] = useState(false);
    const [signoff, setSignoff] = useState(false);
    const [branchAction, setBranchAction] = useState<{ kind: "rename" | "delete"; branch: string; name: string } | null>(null);
    const [danger, setDanger] = useState<{ kind: "remove" | "force"; repo: Repository; remote?: string } | null>(null);
    const [paneWidth, setPaneWidth] = useState(() => {
        try {
            const v = Number(localStorage.getItem("alder.changes-pane-width"));
            return Number.isFinite(v) && v >= 250 && v <= 900 ? v : 365;
        } catch {
            return 365;
        }
    });
    const changesRef = useRef<HTMLDivElement>(null);
    const [modal, setModal] = useState<Modal>(null);
    const [settings, setSettings] = useState(false);
    const [palette, setPalette] = useState(false);
    const [search, setSearch] = useState("");
    const [paletteQuery, setPaletteQuery] = useState("");
    const [actionPath, setActionPath] = useState("");
    const [remoteUrl, setRemoteUrl] = useState("");
    const [workspaceName, setWorkspaceName] = useState("");
    const [branchName, setBranchName] = useState("");
    const [busy, setBusy] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [boot, setBoot] = useState(true);
    const activeRepo = repos.find((r) => r.id === activeRepoId) ?? null;
    const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");

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
    }, [report]);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    useEffect(() => {
        try {
            if (activeRepoId) localStorage.setItem("alder.last-repo", activeRepoId);
            else localStorage.removeItem("alder.last-repo");
        } catch {
            /* storage optional */
        }
    }, [activeRepoId]);
    const {
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
        loadingDiff,
        setLoadingDiff,
        loadingHistory,
        setLoadingHistory,
        loadSelected,
    } = useRepositoryData({ activeRepoPath: activeRepo?.path ?? null, activeFile, stagedDiff, report });
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
    const submitModal = async () => {
        if (!modal || busy) return;
        const type = modal;
        setBusy("Saving");
        const toastId = toast.loading("Saving…");
        try {
            if (type === "workspace") {
                const created = await git.createWorkspace(workspaceName, "#799a84");
                setWorkspaces((items) => [...items, created]);
                setWorkspaceName("");
            } else if (type === "branch") {
                if (!activeRepo) throw new Error("Select a repository");
                await git.createBranch(activeRepo.path, branchName);
                setBranchName("");
            } else if (type === "scan") {
                const count = await git.discover(actionPath, 5);
                report(`Discovered ${count} Git repositories`, "success");
            } else {
                const repo = type === "add" ? await git.add(actionPath) : type === "init" ? await git.init(actionPath) : await git.clone(remoteUrl, actionPath);
                setActiveRepoId(repo.id);
                setView("changes");
            }
            setModal(null);
            setActionPath("");
            setRemoteUrl("");
            if (type !== "workspace") await refresh();
            if (type === "branch" && activeRepo) await loadSelected(activeRepo.path);
            toast.success("Saved successfully", { id: toastId });
        } catch (e) {
            toast.error(getError(e), { id: toastId, duration: 6500 });
        } finally {
            setBusy("");
        }
    };
    const chooseFolder = async () => {
        try {
            const value = await open({
                directory: true,
                multiple: false,
                title: modal === "scan" ? "Select folder to scan" : modal === "clone" ? "Select parent folder for clone" : "Select repository folder",
            });
            if (typeof value === "string") {
                const project =
                    remoteUrl
                        .replace(/\.git$/i, "")
                        .split(/[/]/)
                        .pop() || "repository";
                setActionPath(modal === "clone" ? `${value}${value.includes("\\") ? "\\" : "/"}${project}` : value);
            }
        } catch (e) {
            report(e);
        }
    };
    const filteredRepos = useMemo(
        () =>
            repos.filter(
                (r) =>
                    (workspaceFilter === "all" || r.workspaceId === workspaceFilter || (workspaceFilter === "none" && !r.workspaceId)) &&
                    `${r.name} ${r.path} ${r.branch}`.toLowerCase().includes(search.toLowerCase()),
            ),
        [repos, workspaceFilter, search],
    );
    const changed = repos.filter((r) => r.modified + r.staged > 0).length;
    const ahead = repos.filter((r) => r.ahead > 0).length;
    const behind = repos.filter((r) => r.behind > 0).length;
    const {
        listedChanges,
        staged,
        unstaged,
        selectedFiles,
        setSelectedFiles,
        setSelectionAnchor,
        changeSort,
        setChangeSort,
        changeDirection,
        setChangeDirection,
        selectChange,
    } = useChangeSelection(status?.changes ?? []);
    // biome-ignore lint/correctness/useExhaustiveDependencies: Repository identity intentionally resets local selections.
    useEffect(() => {
        setGithubCounts({ prs: null, issues: null });
        setSelectedFiles([]);
        setSelectionAnchor(null);
    }, [activeRepo?.path, setSelectedFiles, setSelectionAnchor]);
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
    const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        const container = changesRef.current;
        if (!container) return;
        const bounds = container.getBoundingClientRect();
        const move = (e: PointerEvent) => setPaneWidth(Math.min(Math.max(250, e.clientX - bounds.left), Math.max(250, bounds.width - 260)));
        const done = (e: PointerEvent) => {
            const width = Math.round(Math.min(Math.max(250, e.clientX - bounds.left), Math.max(250, bounds.width - 260)));
            try {
                localStorage.setItem("alder.changes-pane-width", String(width));
            } catch {
                /* optional persistence */
            }
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", done);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", done, { once: true });
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
    const repoMenu = (repo: Repository) => (
        <>
            <ContextMenuItem onSelect={() => selectRepo(repo)}>
                <FolderGit2 size={14} /> Open repository
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={() => {
                    setActiveRepoId(repo.id);
                    setView("branches");
                }}
            >
                <GitBranch size={14} /> View branches
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={() => {
                    setActiveRepoId(repo.id);
                    setView("history");
                }}
            >
                <History size={14} /> View history
            </ContextMenuItem>
            <ContextMenuSeparator className="alder-menu-separator" />
            <ContextMenuItem
                destructive
                onSelect={() => setDanger({ kind: "remove", repo })}
            >
                <Trash2 size={14} /> Remove from Alder…
            </ContextMenuItem>
        </>
    );
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
    }, []);
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
    return (
        <SidebarProvider className="app-shell">
            <TooltipProvider delayDuration={350}>
                <Sidebar>
                    <SidebarHeader>
                        <div className="sidebar-brand">
                            <div className="brand-mark">
                                <AppIcon size={26} />
                            </div>
                            <div className="brand-text">
                                <strong>Alder</strong>
                                <span>Developer workspace</span>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="workspace-switcher"
                                    aria-label="Switch workspace"
                                >
                                    <span className="workspace-switch-icon">
                                        <Layers3 size={17} />
                                    </span>
                                    <span className="workspace-switch-label">
                                        <strong>
                                            {workspaceFilter === "all"
                                                ? "All repositories"
                                                : workspaceFilter === "none"
                                                  ? "Ungrouped"
                                                  : (workspaces.find((w) => w.id === workspaceFilter)?.name ?? "All repositories")}
                                        </strong>
                                        <small>{filteredRepos.length} repositories</small>
                                    </span>
                                    <ChevronDown size={15} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                    onSelect={() => {
                                        setWorkspaceFilter("all");
                                        setView("overview");
                                    }}
                                >
                                    <Layers3 size={15} /> All repositories <span className="menu-count">{repos.length}</span>
                                </DropdownMenuItem>
                                {workspaces.map((w) => (
                                    <DropdownMenuItem
                                        key={w.id}
                                        onSelect={() => {
                                            setWorkspaceFilter(w.id);
                                            setView("overview");
                                        }}
                                    >
                                        <span
                                            className="workspace-color"
                                            style={{ background: w.color }}
                                        />
                                        {w.name}
                                        <span className="menu-count">{repos.filter((r) => r.workspaceId === w.id).length}</span>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem
                                    onSelect={() => {
                                        setWorkspaceFilter("none");
                                        setView("overview");
                                    }}
                                >
                                    <FolderClosed size={15} /> Ungrouped <span className="menu-count">{repos.filter((r) => !r.workspaceId).length}</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="alder-menu-separator" />
                                <DropdownMenuItem onSelect={() => setModal("workspace")}>
                                    <Plus size={15} /> Create workspace
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarHeader>
                    <SidebarContent className="sidebar-scroll">
                        <div className="sidebar-heading">Navigation</div>
                        <SidebarMenu aria-label="Primary navigation">
                            {navItems().map((item) => (
                                <Tooltip key={item.id}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className={`nav-item ${view === item.id ? "active" : ""}`}
                                            onClick={() => setView(item.id)}
                                        >
                                            <item.icon
                                                size={17}
                                                strokeWidth={1.8}
                                            />
                                            <span>{item.label}</span>
                                            {item.planned ? <span className="soon-dot" /> : null}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {item.label}
                                        {item.planned ? " (planned)" : ""}
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </SidebarMenu>
                        <div className="sidebar-rule" />
                        <div className="sidebar-title">
                            <span>Repositories</span>
                            <IconButton
                                title="Add repository"
                                onClick={() => setModal("add")}
                            >
                                <Plus size={15} />
                            </IconButton>
                        </div>
                        <div className="repo-nav">
                            {filteredRepos.map((repo) => (
                                <ContextMenu key={repo.id}>
                                    <div className={`repo-nav-entry ${activeRepoId === repo.id ? "selected" : ""}`}>
                                        <ContextMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className={`repo-nav-item ${activeRepoId === repo.id ? "selected" : ""}`}
                                                onClick={() => selectRepo(repo)}
                                                title={repo.path}
                                            >
                                                <FolderGit2 size={15} />
                                                <span>{repo.name}</span>
                                                {repo.modified + repo.staged > 0 ? <i className="dirty-dot" /> : null}
                                            </button>
                                        </ContextMenuTrigger>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="repo-more"
                                                    aria-label={`Actions for ${repo.name}`}
                                                >
                                                    <MoreHorizontal size={15} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => selectRepo(repo)}>
                                                    <FolderGit2 size={14} /> Open
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onSelect={() => {
                                                        setActiveRepoId(repo.id);
                                                        setView("history");
                                                    }}
                                                >
                                                    <History size={14} /> History
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="alder-menu-separator" />
                                                <DropdownMenuItem
                                                    destructive
                                                    onSelect={() => setDanger({ kind: "remove", repo })}
                                                >
                                                    <Trash2 size={14} /> Remove from Alder…
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <ContextMenuContent>{repoMenu(repo)}</ContextMenuContent>
                                </ContextMenu>
                            ))}
                            {filteredRepos.length === 0 && <span className="small-muted sidebar-empty">No repositories</span>}
                        </div>
                    </SidebarContent>
                    <SidebarFooter className="sidebar-bottom">
                        <span>Copyright © Hakko &amp; Contributors</span>
                    </SidebarFooter>
                </Sidebar>
                <SidebarInset className="main-area">
                    <header className="topbar">
                        <div className="topbar-leading">
                            <SidebarTrigger />
                            <div className="crumb">
                                <span>{activeRepo && view !== "overview" ? activeRepo.name : "Workspace"}</span>
                                <ChevronRight size={14} />
                                <strong>{view === "pulls" ? "Pull requests" : view === "agents" ? "Agent sessions" : formatName(view)}</strong>
                            </div>
                        </div>
                        <div className="topbar-actions">
                            <button
                                type="button"
                                title="Search repositories and commands (Ctrl+K)"
                                aria-label="Search"
                                className="quick-search topbar-command-search"
                                onClick={() => setPalette(true)}
                            >
                                <Search size={15} />
                                <span>{t("app.search")}</span>
                                <kbd>Ctrl K</kbd>
                            </button>
                            <span
                                className="topbar-action-divider"
                                aria-hidden="true"
                            />
                            <IconButton
                                title="Appearance & preferences"
                                onClick={() => setSettings(true)}
                            >
                                <Settings2 size={17} />
                            </IconButton>
                        </div>
                    </header>
                    <div
                        className="main-body"
                        key={view}
                    >
                        {view === "overview" && (
                            <>
                                <div className="page-intro">
                                    <div>
                                        <h1>Workspace overview</h1>
                                        <p>Everything you're building, without the tab gymnastics.</p>
                                    </div>
                                    <div className="intro-actions">
                                        <PButton onClick={() => setModal("scan")}>
                                            <FolderOpen size={16} /> Scan directory
                                        </PButton>
                                        <PButton
                                            variant="primary"
                                            onClick={() => setModal("clone")}
                                        >
                                            <Plus size={16} /> Clone repository
                                        </PButton>
                                    </div>
                                </div>
                                {!NATIVE && (
                                    <div className="notice">
                                        <Terminal size={17} /> This is a browser preview. Native Git operations are available in the Tauri desktop application.
                                    </div>
                                )}
                                <div className="stat-grid">
                                    <Stat
                                        icon={FolderGit2}
                                        value={repos.length}
                                        label="Repositories"
                                        hint="Across your workspace"
                                    />
                                    <Stat
                                        icon={FileCode2}
                                        value={changed}
                                        label="With changes"
                                        hint="Uncommitted work"
                                        color="warm"
                                    />
                                    <Stat
                                        icon={ArrowUpRight}
                                        value={ahead}
                                        label="Ahead of remote"
                                        hint="Commits to push"
                                        color="accent"
                                    />
                                    <Stat
                                        icon={ArrowDownLeft}
                                        value={behind}
                                        label="Behind remote"
                                        hint="Updates to review"
                                    />
                                </div>
                                <div className="section-row">
                                    <div>
                                        <h2>Repositories</h2>
                                        <p>Local status, recent work and what's next</p>
                                    </div>
                                    <div className="section-actions">
                                        <div className="search-field">
                                            <Search size={15} />
                                            <input
                                                aria-label="Search repositories"
                                                placeholder="Filter repositories"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                        </div>
                                        <IconButton
                                            title="Refresh repositories"
                                            disabled={refreshing}
                                            onClick={() => void refresh()}
                                        >
                                            {refreshing ? <Spinner size={16} /> : <RefreshCw size={16} />}
                                        </IconButton>
                                    </div>
                                </div>
                                {boot ? (
                                    <div
                                        role="status"
                                        className="repo-loading"
                                        aria-label="Loading repositories"
                                    >
                                        <Skeleton className="h-10" />
                                        <Skeleton className="h-14" />
                                        <Skeleton className="h-14" />
                                        <Skeleton className="h-14" />
                                    </div>
                                ) : repos.length === 0 ? (
                                    <Empty
                                        icon={FolderGit2}
                                        title={boot ? "Loading repositories..." : "Your workspace starts here"}
                                        description="Add an existing Git project, scan your project directories or clone a repository. Alder will keep the work where it already lives."
                                    >
                                        <PButton
                                            onClick={() => setModal("add")}
                                            variant="primary"
                                        >
                                            <Plus size={15} /> Open local repo
                                        </PButton>
                                        <PButton onClick={() => setModal("scan")}>
                                            <FolderOpen size={15} /> Scan a drive
                                        </PButton>
                                        <PButton onClick={() => setModal("init")}>
                                            <FilePlus2 size={15} /> New repository
                                        </PButton>
                                    </Empty>
                                ) : (
                                    <div className="repo-table">
                                        <div className="repo-table-head">
                                            <span>Repository</span>
                                            <span>Branch</span>
                                            <span>Working tree</span>
                                            <span>Sync</span>
                                            <span />
                                        </div>
                                        {filteredRepos.map((r) => (
                                            <ContextMenu key={r.id}>
                                                <ContextMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="repo-table-row"
                                                        onClick={() => selectRepo(r)}
                                                    >
                                                        <span className="repo-title">
                                                            <span className="repo-square">
                                                                <FolderGit2 size={17} />
                                                            </span>
                                                            <span>
                                                                <strong>{r.name}</strong>
                                                                <small>{r.path}</small>
                                                            </span>
                                                        </span>
                                                        <span className="branch-cell">
                                                            <GitBranch size={14} />
                                                            {r.branch}
                                                        </span>
                                                        <span className={`state-pill ${!r.available ? "danger" : r.staged + r.modified ? "warning" : "clean"}`}>
                                                            {!r.available
                                                                ? "Unavailable"
                                                                : r.staged + r.modified
                                                                  ? `${r.modified + r.staged} changes`
                                                                  : "Clean"}
                                                        </span>
                                                        <span className="sync-cell">
                                                            {r.ahead > 0 ? <span>↑ {r.ahead}</span> : null}
                                                            {r.behind > 0 ? <span>↓ {r.behind}</span> : null}
                                                            {r.ahead === 0 && r.behind === 0 ? <span className="muted">Up to date</span> : null}
                                                        </span>
                                                        <ChevronRight
                                                            size={16}
                                                            className="table-chevron"
                                                        />
                                                    </button>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent>{repoMenu(r)}</ContextMenuContent>
                                            </ContextMenu>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                        {view !== "overview" &&
                            (!activeRepo ? (
                                <Empty
                                    icon={FolderGit2}
                                    title="Select a repository"
                                    description="Choose a repository from the sidebar or add one to start working with Git."
                                >
                                    <PButton
                                        variant="primary"
                                        onClick={() => setModal("add")}
                                    >
                                        <Plus size={15} /> Open repository
                                    </PButton>
                                </Empty>
                            ) : (
                                <>
                                    <div className="repo-intro">
                                        <div className="repo-heading">
                                            <div className="repo-breadcrumb">
                                                <span>{workspaces.find((w) => w.id === activeRepo.workspaceId)?.name ?? "Repositories"}</span>
                                            </div>
                                            <h1>{activeRepo.name}</h1>
                                            <div className="repo-subtitle">
                                                <GitBranch size={14} />
                                                <span>{status?.branch ?? activeRepo.branch}</span>
                                                <span className="bullet">·</span>
                                                <span>{activeRepo.path}</span>
                                            </div>
                                        </div>
                                        <div className="intro-actions">
                                            <Select
                                                label="Assign repository to workspace"
                                                value={activeRepo.workspaceId ?? "ungrouped"}
                                                onValueChange={(v) => void assignWorkspaceFast(activeRepo.id, v === "ungrouped" ? null : v)}
                                                options={[
                                                    { value: "ungrouped", label: "Ungrouped" },
                                                    ...workspaces.map((w) => ({ value: w.id, label: w.name })),
                                                ]}
                                            />
                                            <div className="split-action">
                                                <PButton
                                                    disabled={!!busy}
                                                    onClick={() => net("fetch")}
                                                >
                                                    <CloudDownload size={15} /> Fetch
                                                </PButton>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="split-chevron"
                                                            title="Git synchronization options"
                                                            aria-label="Git synchronization options"
                                                        >
                                                            <ChevronDown size={16} />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => net("fetch")}>
                                                            <CloudDownload size={15} /> Fetch all
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSub>
                                                            <DropdownMenuSubTrigger className="alder-menu-item">
                                                                <CloudDownload size={15} /> Fetch from… <ChevronRight size={14} />
                                                            </DropdownMenuSubTrigger>
                                                            <DropdownMenuSubContent className="alder-menu">
                                                                {remotes.length ? (
                                                                    remotes.map((r) => (
                                                                        <DropdownMenuItem
                                                                            key={r}
                                                                            onSelect={() => net("fetch", r)}
                                                                        >
                                                                            {r}
                                                                        </DropdownMenuItem>
                                                                    ))
                                                                ) : (
                                                                    <span className="alder-menu-disabled">No remotes configured</span>
                                                                )}
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuSub>
                                                        <DropdownMenuSeparator className="alder-menu-separator" />
                                                        <DropdownMenuItem onSelect={() => net("pull")}>
                                                            <ArrowDownLeft size={15} /> Pull (fast-forward only)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => net("pull-rebase")}>
                                                            <GitCompareArrows size={15} /> Pull (rebase)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="alder-menu-separator" />
                                                        <DropdownMenuItem onSelect={() => net("push")}>
                                                            <CloudUpload size={15} /> Push
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSub>
                                                            <DropdownMenuSubTrigger className="alder-menu-item">
                                                                <CloudUpload size={15} /> Push to… <ChevronRight size={14} />
                                                            </DropdownMenuSubTrigger>
                                                            <DropdownMenuSubContent className="alder-menu">
                                                                {remotes.length ? (
                                                                    remotes.map((r) => (
                                                                        <DropdownMenuItem
                                                                            key={r}
                                                                            onSelect={() => net("push", r)}
                                                                        >
                                                                            {r}
                                                                        </DropdownMenuItem>
                                                                    ))
                                                                ) : (
                                                                    <span className="alder-menu-disabled">No remotes configured</span>
                                                                )}
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuSub>
                                                        <DropdownMenuItem
                                                            destructive
                                                            onSelect={() => net("force-push")}
                                                        >
                                                            <ShieldCheck size={15} /> Force push (with lease)…
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSub>
                                                            <DropdownMenuSubTrigger className="alder-menu-item destructive">
                                                                <ShieldCheck size={15} /> Force push to… <ChevronRight size={14} />
                                                            </DropdownMenuSubTrigger>
                                                            <DropdownMenuSubContent className="alder-menu">
                                                                {remotes.length ? (
                                                                    remotes.map((r) => (
                                                                        <DropdownMenuItem
                                                                            key={r}
                                                                            destructive
                                                                            onSelect={() => net("force-push", r)}
                                                                        >
                                                                            {r} (with lease)…
                                                                        </DropdownMenuItem>
                                                                    ))
                                                                ) : (
                                                                    <span className="alder-menu-disabled">No remotes configured</span>
                                                                )}
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuSub>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>
                                    {view === "changes" && operation.conflicts.length > 0 && (
                                        <SequenceRecovery
                                            path={activeRepo.path}
                                            state={operation}
                                            run={runAdvanced}
                                            disabled={!!busy}
                                        />
                                    )}
                                    {view === "changes" && (
                                        <div
                                            className="changes-layout"
                                            ref={changesRef}
                                            style={{ gridTemplateColumns: `minmax(250px, ${paneWidth}px) 7px minmax(0,1fr)` }}
                                        >
                                            <div className="changes-list">
                                                <div className="panel-heading">
                                                    <div>
                                                        <h3>{t("changes.title")}</h3>
                                                        <span className="small-muted">
                                                            {listedChanges.length} files · {selectedFiles.length} selected
                                                        </span>
                                                    </div>
                                                    <div className="changes-list-actions">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="icon-button"
                                                                    title={t("changes.sort")}
                                                                    aria-label={t("changes.sort")}
                                                                >
                                                                    <SlidersHorizontal size={16} />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <div className="changes-menu-label">{t("changes.sortBy")}</div>
                                                                {(
                                                                    [
                                                                        ["path", "Full path"],
                                                                        ["name", "File name"],
                                                                        ["status", "Git status"],
                                                                    ] as const
                                                                ).map(([v, label]) => (
                                                                    <DropdownMenuItem
                                                                        key={v}
                                                                        onSelect={() => setChangeSort(v)}
                                                                    >
                                                                        {changeSort === v ? <Check size={14} /> : <span className="menu-check-space" />}
                                                                        {label}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onSelect={() => setChangeDirection((x) => (x === "asc" ? "desc" : "asc"))}>
                                                                    {changeDirection === "asc" ? t("changes.ascending") : t("changes.descending")}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        <IconButton
                                                            title="Refresh working tree"
                                                            disabled={loadingRepo}
                                                            onClick={() => void loadSelected(activeRepo.path)}
                                                        >
                                                            {loadingRepo ? <Spinner size={16} /> : <RefreshCw size={16} />}
                                                        </IconButton>
                                                    </div>
                                                </div>
                                                <div className="selection-toolbar">
                                                    <button
                                                        type="button"
                                                        disabled={!selectedUnstaged.length || !!busy}
                                                        onClick={() => void bulkFiles(true, selectedUnstaged)}
                                                    >
                                                        <Plus size={14} /> Stage selected ({selectedUnstaged.length})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!selectedStaged.length || !!busy}
                                                        onClick={() => void bulkFiles(false, selectedStaged)}
                                                    >
                                                        <X size={14} /> Unstage selected ({selectedStaged.length})
                                                    </button>
                                                    {selectedFiles.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedFiles([])}
                                                        >
                                                            <Check size={13} /> Clear
                                                        </button>
                                                    ) : null}
                                                </div>
                                                <div className="file-scroll">
                                                    {loadingRepo ? (
                                                        <div
                                                            role="status"
                                                            className="changes-loading"
                                                            aria-label="Loading working tree"
                                                        >
                                                            <Skeleton className="h-6" />
                                                            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                                                <Skeleton
                                                                    key={i}
                                                                    className="h-9"
                                                                />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="file-group-title">
                                                                <label className="file-group-select">
                                                                    <input
                                                                        type="checkbox"
                                                                        aria-label="Select all unstaged changes"
                                                                        checked={
                                                                            unstaged.length > 0 &&
                                                                            unstaged.every((x) => selectedFiles.includes(`working:${x.path}`))
                                                                        }
                                                                        onChange={(e) =>
                                                                            setSelectedFiles((prev) =>
                                                                                e.target.checked
                                                                                    ? [...new Set([...prev, ...unstaged.map((x) => `working:${x.path}`)])]
                                                                                    : prev.filter((k) => !k.startsWith("working:")),
                                                                            )
                                                                        }
                                                                    />{" "}
                                                                    Unstaged <b>{unstaged.length}</b>
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void perform("Stage all", () => git.stageAll(activeRepo.path))}
                                                                    disabled={!unstaged.length || !!busy}
                                                                >
                                                                    Stage all
                                                                </button>
                                                            </div>
                                                            {unstaged.map((f) => (
                                                                <FileRow
                                                                    key={`unstaged-${f.path}`}
                                                                    change={f}
                                                                    active={activeFile === f.path && !stagedDiff}
                                                                    checked={selectedFiles.includes(`working:${f.path}`)}
                                                                    onClick={() => chooseFile(f, false)}
                                                                    onToggle={(shift) => selectChange(f, false, shift)}
                                                                    onAction={() => void perform("Stage file", () => git.stage(activeRepo.path, f.path))}
                                                                    action="+"
                                                                />
                                                            ))}
                                                            {unstaged.length === 0 && <div className="empty-list">No unstaged changes</div>}
                                                            <div className="file-group-title">
                                                                <label className="file-group-select">
                                                                    <input
                                                                        type="checkbox"
                                                                        aria-label="Select all staged changes"
                                                                        checked={
                                                                            staged.length > 0 && staged.every((x) => selectedFiles.includes(`staged:${x.path}`))
                                                                        }
                                                                        onChange={(e) =>
                                                                            setSelectedFiles((prev) =>
                                                                                e.target.checked
                                                                                    ? [...new Set([...prev, ...staged.map((x) => `staged:${x.path}`)])]
                                                                                    : prev.filter((k) => !k.startsWith("staged:")),
                                                                            )
                                                                        }
                                                                    />{" "}
                                                                    Staged <b>{staged.length}</b>
                                                                </label>
                                                            </div>
                                                            {staged.map((f) => (
                                                                <FileRow
                                                                    key={`staged-${f.path}`}
                                                                    change={f}
                                                                    active={activeFile === f.path && stagedDiff}
                                                                    checked={selectedFiles.includes(`staged:${f.path}`)}
                                                                    onClick={() => chooseFile(f, true)}
                                                                    onToggle={(shift) => selectChange(f, true, shift)}
                                                                    onAction={() => void perform("Unstage file", () => git.unstage(activeRepo.path, f.path))}
                                                                    action="−"
                                                                />
                                                            ))}
                                                            {staged.length === 0 && <div className="empty-list">Nothing staged yet</div>}
                                                        </>
                                                    )}
                                                </div>
                                                <div className="commit-form">
                                                    <div className="commit-heading">
                                                        <GitCommitHorizontal size={16} />
                                                        <strong>Commit changes</strong>
                                                    </div>
                                                    <textarea
                                                        rows={3}
                                                        aria-label="Commit message"
                                                        placeholder="Summary of your changes..."
                                                        value={commitMessage}
                                                        onChange={(e) => setCommitMessage(e.target.value)}
                                                    />
                                                    <div className="commit-options">
                                                        {amend ? <span className="subtle-tag">Amending HEAD</span> : null}
                                                        {signoff ? <span className="subtle-tag">Signed off</span> : null}
                                                        {skipHooks ? <span className="subtle-tag">Skipping hooks</span> : null}
                                                    </div>
                                                    <div className="split-action commit-split">
                                                        <PButton
                                                            variant="primary"
                                                            disabled={!commitMessage.trim() || !staged.length || !!busy}
                                                            loading={busy === "Commit"}
                                                            onClick={() =>
                                                                void perform("Commit", async () => {
                                                                    const hash = await git.commit(
                                                                        activeRepo.path,
                                                                        commitMessage,
                                                                        amend,
                                                                        false,
                                                                        skipHooks,
                                                                        signoff,
                                                                    );
                                                                    setCommitMessage("");
                                                                    return `Committed ${hash}`;
                                                                })
                                                            }
                                                        >
                                                            <GitCommitHorizontal size={15} /> Commit {staged.length} staged
                                                        </PButton>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="split-chevron"
                                                                    title="More commit options"
                                                                    aria-label="More commit options"
                                                                >
                                                                    <ChevronDown size={16} />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    disabled={!commitMessage.trim() || !staged.length || !!busy}
                                                                    onSelect={() =>
                                                                        void perform("Commit", async () => {
                                                                            const hash = await git.commit(
                                                                                activeRepo.path,
                                                                                commitMessage,
                                                                                false,
                                                                                false,
                                                                                skipHooks,
                                                                                signoff,
                                                                            );
                                                                            setCommitMessage("");
                                                                            return `Committed ${hash}`;
                                                                        })
                                                                    }
                                                                >
                                                                    <GitCommitHorizontal size={15} /> Commit staged
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    disabled={!commitMessage.trim() || !!busy}
                                                                    onSelect={() =>
                                                                        void perform("Commit tracked", async () => {
                                                                            const hash = await git.commit(
                                                                                activeRepo.path,
                                                                                commitMessage,
                                                                                false,
                                                                                true,
                                                                                skipHooks,
                                                                                signoff,
                                                                            );
                                                                            setCommitMessage("");
                                                                            return `Committed ${hash}`;
                                                                        })
                                                                    }
                                                                >
                                                                    <FileText size={15} /> Commit all tracked
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => setAmend((x) => !x)}>
                                                                    <Check
                                                                        size={15}
                                                                        className={amend ? "" : "menu-unchecked"}
                                                                    />{" "}
                                                                    Amend previous commit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator className="alder-menu-separator" />
                                                                <DropdownMenuItem onSelect={() => setSkipHooks((x) => !x)}>
                                                                    <Check
                                                                        size={15}
                                                                        className={skipHooks ? "" : "menu-unchecked"}
                                                                    />{" "}
                                                                    Skip hooks (--no-verify)
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => setSignoff((x) => !x)}>
                                                                    <Check
                                                                        size={15}
                                                                        className={signoff ? "" : "menu-unchecked"}
                                                                    />{" "}
                                                                    Sign off (--signoff)
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* biome-ignore lint/a11y/useSemanticElements: This focusable separator is an adjustable pane splitter, not a static horizontal rule. */}
                                            <div
                                                className="changes-divider"
                                                role="separator"
                                                tabIndex={0}
                                                aria-label="Resize changes and diff panes"
                                                aria-orientation="vertical"
                                                aria-valuenow={paneWidth}
                                                aria-valuemin={250}
                                                aria-valuemax={900}
                                                onPointerDown={startResize}
                                                onKeyDown={(e) => {
                                                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                                                        e.preventDefault();
                                                        setPaneWidth((w) => Math.max(250, Math.min(900, w + (e.key === "ArrowRight" ? 20 : -20))));
                                                    }
                                                }}
                                                title="Drag to resize the file list"
                                            />
                                            <div className="diff-panel">
                                                <div className="diff-heading">
                                                    <div className="diff-file-name">
                                                        <FileCode2 size={17} />
                                                        <strong>{activeFile ?? "Select a file to inspect"}</strong>
                                                        {activeFile ? <span className="subtle-tag">{stagedDiff ? "Staged" : "Working tree"}</span> : null}
                                                    </div>
                                                </div>
                                                {activeFile ? (
                                                    <div className="diff-code">
                                                        {loadingDiff ? (
                                                            <div
                                                                role="status"
                                                                className="changes-loading"
                                                                aria-label="Loading diff"
                                                            >
                                                                <Skeleton className="h-5" />
                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                                                                    <Skeleton
                                                                        key={i}
                                                                        className="h-4"
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : diff ? (
                                                            <DiffText
                                                                text={diff}
                                                                staged={stagedDiff}
                                                                disabled={!!busy}
                                                                onSelect={(hunk, line) => {
                                                                    if (activeRepo && activeFile)
                                                                        void perform(stagedDiff ? "Unstage selection" : "Stage selection", () =>
                                                                            git.applyDiffSelection(activeRepo.path, activeFile, stagedDiff, hunk, line),
                                                                        );
                                                                }}
                                                            />
                                                        ) : (
                                                            <Empty
                                                                icon={FileText}
                                                                title="No diff available"
                                                                description="Select another file or stage the current file to inspect its changes."
                                                            />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Empty
                                                        icon={GitCompareArrows}
                                                        title="Review your changes"
                                                        description="Select a file to inspect its diff before committing."
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {view === "history" && (
                                        <div className="content-card">
                                            <div className="card-bar">
                                                <div>
                                                    <h2>Commit history</h2>
                                                    <p>Local and remote commits across this repository</p>
                                                </div>
                                                <span className="subtle-tag">{history.length} commits loaded</span>
                                            </div>
                                            {loadingHistory ? (
                                                <div className="changes-loading">
                                                    <Skeleton className="h-8" />
                                                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                                        <Skeleton
                                                            key={i}
                                                            className="h-9"
                                                        />
                                                    ))}
                                                </div>
                                            ) : history.length ? (
                                                <GitGraph commits={history} />
                                            ) : (
                                                <Empty
                                                    icon={History}
                                                    title="No commits found"
                                                    description="This repository has no commits yet, or its history could not be loaded."
                                                />
                                            )}
                                        </div>
                                    )}
                                    {view === "branches" && (
                                        <div className="content-card">
                                            <div className="card-bar">
                                                <div>
                                                    <h2>Branches</h2>
                                                    <p>Switch or create local branches without leaving Alder</p>
                                                </div>
                                                <PButton
                                                    variant="primary"
                                                    onClick={() => setModal("branch")}
                                                >
                                                    <Plus size={15} /> New branch
                                                </PButton>
                                            </div>
                                            <div className="branch-head">Local branches</div>
                                            {branches
                                                .filter((b) => !b.remote)
                                                .map((b) => (
                                                    <div
                                                        className="branch-row"
                                                        key={b.name}
                                                    >
                                                        <div>
                                                            <GitBranch size={17} />
                                                            <strong>{b.name}</strong>
                                                            {b.current ? <span className="branch-current">Active</span> : null}
                                                        </div>
                                                        <div className="advanced-actions">
                                                            <PButton
                                                                title={b.current ? "You are on this branch" : "Switch to this branch"}
                                                                variant="ghost"
                                                                disabled={b.current || !!busy}
                                                                onClick={() => void perform("Switch branch", () => git.switchBranch(activeRepo.path, b.name))}
                                                            >
                                                                {b.current ? <Check size={14} /> : <ArrowRight size={14} />} {b.current ? "Active" : "Switch"}
                                                            </PButton>
                                                            <IconButton
                                                                title={`Rename ${b.name}`}
                                                                disabled={!!busy}
                                                                onClick={() => {
                                                                    setBranchAction({ kind: "rename", branch: b.name, name: b.name });
                                                                }}
                                                            >
                                                                <Settings2 size={14} />
                                                            </IconButton>
                                                            <IconButton
                                                                title={`Delete ${b.name} (merged branches only)`}
                                                                disabled={b.current || !!busy}
                                                                onClick={() => {
                                                                    setBranchAction({ kind: "delete", branch: b.name, name: b.name });
                                                                }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </IconButton>
                                                        </div>
                                                    </div>
                                                ))}
                                            <div className="branch-head">Remote branches</div>
                                            {branches
                                                .filter((b) => b.remote)
                                                .map((b) => (
                                                    <div
                                                        className="branch-row"
                                                        key={b.name}
                                                    >
                                                        <div>
                                                            <CloudDownload size={16} />
                                                            <strong>{b.name}</strong>
                                                        </div>
                                                        <span className="small-muted">Remote tracking</span>
                                                    </div>
                                                ))}
                                            {branches.length === 0 && (
                                                <Empty
                                                    icon={GitBranch}
                                                    title="No branches"
                                                    description="Create your first commit to start a branch."
                                                />
                                            )}
                                        </div>
                                    )}
                                    {view === "worktrees" && (
                                        <div className="content-card">
                                            <WorktreePanel
                                                path={activeRepo.path}
                                                worktrees={worktrees}
                                                run={runAdvanced}
                                                disabled={!!busy}
                                            />
                                        </div>
                                    )}
                                    {view === "operations" && (
                                        <div className="content-card">
                                            <OperationsPanel
                                                path={activeRepo.path}
                                                branches={branches}
                                                stashes={stashes}
                                                reflog={reflog}
                                                operation={operation}
                                                run={runAdvanced}
                                                disabled={!!busy}
                                            />
                                        </div>
                                    )}
                                    {view === "pulls" && (
                                        <div className="content-card">
                                            <GitHubPanel
                                                path={activeRepo.path}
                                                onCounts={updateGitHubCounts}
                                            />
                                        </div>
                                    )}
                                    {view === "agents" && (
                                        <div className="content-card future-card">
                                            <Empty
                                                icon={Bot}
                                                title="Agent sessions"
                                                description="Codex and Claude Code session management is planned for v0.4.0."
                                            >
                                                <span className="subtle-tag">Tracked in Plane</span>
                                            </Empty>
                                        </div>
                                    )}
                                </>
                            ))}
                    </div>
                    <div
                        role="status"
                        className="footer-bar"
                        aria-label="Repository status"
                    >
                        {activeRepo ? (
                            <>
                                <FooterAction
                                    title={`Current branch: ${status?.branch ?? activeRepo.branch}. Click to view branches.`}
                                    onClick={() => setView("branches")}
                                >
                                    <GitBranch size={13} /> {status?.branch ?? activeRepo.branch}
                                </FooterAction>
                                <FooterAction
                                    title={`${status?.changes.length ?? activeRepo.modified + activeRepo.staged} changed files. Click to open working tree.`}
                                    onClick={() => setView("changes")}
                                >
                                    <FileCode2 size={13} /> {status?.changes.length ?? activeRepo.modified + activeRepo.staged} changes
                                </FooterAction>
                                <FooterAction
                                    title={`Upstream: ${status?.upstream ?? "not configured"}. ${status?.ahead ?? 0} ahead, ${status?.behind ?? 0} behind. Click for Git operations.`}
                                    onClick={() => setView("operations")}
                                >
                                    <ArrowUpRight size={13} /> {status?.ahead ?? activeRepo.ahead} <ArrowDownLeft size={13} />{" "}
                                    {status?.behind ?? activeRepo.behind}
                                </FooterAction>
                                <FooterAction
                                    title={`${worktrees.length} worktrees. Click to manage.`}
                                    onClick={() => setView("worktrees")}
                                >
                                    <Layers3 size={13} /> {worktrees.length} worktrees
                                </FooterAction>
                                <FooterAction
                                    title={`${stashes.length} local stashes. Click to inspect.`}
                                    onClick={() => setView("operations")}
                                >
                                    <History size={13} /> {stashes.length} stashes
                                </FooterAction>
                                <FooterAction
                                    title="Open GitHub pull requests (up to 100). Click to view."
                                    onClick={() => setView("pulls")}
                                >
                                    <GitPullRequest size={13} /> PRs {githubCounts.prs ?? "—"}
                                </FooterAction>
                                <FooterAction
                                    title="Open GitHub issues (up to 100). Click to view."
                                    onClick={() => setView("pulls")}
                                >
                                    <CircleDot size={13} /> Issues {githubCounts.issues ?? "—"}
                                </FooterAction>
                            </>
                        ) : (
                            <FooterAction
                                title={`${repos.length} registered repositories; ${changed} have changes. Click for overview.`}
                                onClick={() => setView("overview")}
                            >
                                <FolderGit2 size={13} /> {repos.length} repositories · {changed} with changes
                            </FooterAction>
                        )}
                        <span className="footer-version">Alder v0.2.1</span>
                    </div>
                </SidebarInset>
                <Dialog.Dialog
                    open={branchAction !== null}
                    onOpenChange={(o) => {
                        if (!o) setBranchAction(null);
                    }}
                >
                    <Dialog.DialogContent
                        className="modal-content"
                        aria-describedby="branch-action-description"
                    >
                        <div className="modal-header">
                            <Dialog.DialogTitle>{branchAction?.kind === "rename" ? "Rename branch" : "Delete branch"}</Dialog.DialogTitle>
                        </div>
                        <Dialog.DialogDescription
                            id="branch-action-description"
                            className="dialog-description"
                        >
                            {branchAction?.kind === "rename"
                                ? `Rename ${branchAction.branch} without changing commit history.`
                                : `Delete the local branch ${branchAction?.branch}? Git refuses if it is not fully merged.`}
                        </Dialog.DialogDescription>
                        {branchAction?.kind === "rename" ? (
                            <label className="field-label">
                                New branch name
                                <input
                                    value={branchAction.name}
                                    onChange={(e) => setBranchAction((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                                />
                            </label>
                        ) : null}
                        <div className="modal-footer">
                            <PButton onClick={() => setBranchAction(null)}>Cancel</PButton>
                            <PButton
                                variant={branchAction?.kind === "delete" ? "danger" : "primary"}
                                disabled={!!busy || !branchAction?.name.trim()}
                                onClick={() => {
                                    if (!branchAction || !activeRepo) return;
                                    const a = branchAction;
                                    setBranchAction(null);
                                    if (a.kind === "rename") void perform("Rename branch", () => git.renameBranch(activeRepo.path, a.branch, a.name));
                                    else void perform("Delete branch", () => git.deleteBranch(activeRepo.path, a.branch));
                                }}
                            >
                                {branchAction?.kind === "rename" ? "Rename" : "Delete branch"}
                            </PButton>
                        </div>
                    </Dialog.DialogContent>
                </Dialog.Dialog>
                <Dialog.Dialog
                    open={danger !== null}
                    onOpenChange={(o) => {
                        if (!o) setDanger(null);
                    }}
                >
                    <Dialog.DialogContent
                        hideClose
                        className="modal-content"
                        aria-describedby="danger-explanation"
                    >
                        <div className="modal-header">
                            <Dialog.DialogTitle>{danger?.kind === "remove" ? "Remove repository from Alder?" : "Force push with lease?"}</Dialog.DialogTitle>
                            <IconButton
                                title="Close"
                                onClick={() => setDanger(null)}
                            >
                                <X size={17} />
                            </IconButton>
                        </div>
                        <Dialog.DialogDescription
                            id="danger-explanation"
                            className="dialog-description"
                        >
                            {danger?.kind === "remove"
                                ? `Remove ${danger.repo.name} from Alder’s repository list? No local files or .git data will be deleted.`
                                : `This rewrites remote history on ${danger?.remote ?? "the configured upstream"}. Alder uses --force-with-lease, which refuses to overwrite unexpected remote updates. Confirm only if you intend to replace remote commits.`}
                        </Dialog.DialogDescription>
                        <div className="modal-footer">
                            <PButton onClick={() => setDanger(null)}>Cancel</PButton>
                            <PButton
                                variant="danger"
                                disabled={!!busy}
                                onClick={() => {
                                    if (!danger) return;
                                    const selected = danger;
                                    if (selected.kind === "remove") {
                                        void removeFromAlder(selected.repo);
                                    } else {
                                        setDanger(null);
                                        void perform("Force push with lease", () => git.network(selected.repo.path, "force-push", selected.remote));
                                    }
                                }}
                            >
                                {danger?.kind === "remove" ? "Remove from Alder" : "Force push with lease"}
                            </PButton>
                        </div>
                    </Dialog.DialogContent>
                </Dialog.Dialog>
                <Dialog.Dialog
                    open={modal !== null}
                    onOpenChange={(o) => {
                        if (!o) setModal(null);
                    }}
                >
                    <Dialog.DialogContent
                        hideClose
                        className="modal-content"
                        aria-describedby="alder-modal-description"
                    >
                        <div className="modal-header">
                            <Dialog.DialogTitle>
                                {modal === "add"
                                    ? "Open repository"
                                    : modal === "scan"
                                      ? "Discover repositories"
                                      : modal === "clone"
                                        ? "Clone repository"
                                        : modal === "init"
                                          ? "Initialize Git repository"
                                          : modal === "workspace"
                                            ? "Create workspace"
                                            : "Create branch"}
                            </Dialog.DialogTitle>
                            <IconButton
                                title="Close"
                                onClick={() => setModal(null)}
                            >
                                <X size={17} />
                            </IconButton>
                        </div>
                        <Dialog.DialogDescription
                            id="alder-modal-description"
                            className="dialog-description"
                        >
                            {modal === "workspace"
                                ? "Group related repositories without moving them."
                                : modal === "branch"
                                  ? "Create a new branch from your current commit."
                                  : "Changes to directories are performed only when you confirm."}
                        </Dialog.DialogDescription>
                        {modal === "workspace" ? (
                            <label className="field-label">
                                Workspace name
                                <input
                                    autoFocus
                                    placeholder="e.g. Prism Host"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                />
                            </label>
                        ) : modal === "branch" ? (
                            <label className="field-label">
                                Branch name
                                <input
                                    autoFocus
                                    placeholder="feature/dashboard"
                                    value={branchName}
                                    onChange={(e) => setBranchName(e.target.value)}
                                />
                            </label>
                        ) : (
                            <>
                                <label className="field-label">
                                    {modal === "clone" ? "Clone destination (new directory)" : modal === "scan" ? "Directory to scan" : "Repository directory"}
                                    <div className="input-with-button">
                                        <input
                                            autoFocus
                                            placeholder={modal === "clone" ? "C:\\Workspace\\project" : "Select a local folder"}
                                            value={actionPath}
                                            onChange={(e) => setActionPath(e.target.value)}
                                        />
                                        <IconButton
                                            title="Browse folders"
                                            onClick={() => void chooseFolder()}
                                        >
                                            <FolderOpen size={17} />
                                        </IconButton>
                                    </div>
                                </label>
                                {modal === "clone" && (
                                    <label className="field-label">
                                        Remote URL
                                        <input
                                            placeholder="https://github.com/owner/repository.git"
                                            value={remoteUrl}
                                            onChange={(e) => setRemoteUrl(e.target.value)}
                                        />
                                    </label>
                                )}
                            </>
                        )}
                        <div className="modal-footer">
                            <PButton onClick={() => setModal(null)}>Cancel</PButton>
                            <PButton
                                variant="primary"
                                disabled={
                                    !!busy ||
                                    (modal === "workspace" ? !workspaceName.trim() : modal === "branch" ? !branchName.trim() : !actionPath.trim()) ||
                                    (modal === "clone" && !remoteUrl.trim())
                                }
                                loading={!!busy}
                                onClick={() => void submitModal()}
                            >
                                {modal === "scan"
                                    ? "Scan directory"
                                    : modal === "clone"
                                      ? "Clone"
                                      : modal === "workspace"
                                        ? "Create workspace"
                                        : modal === "branch"
                                          ? "Create branch"
                                          : "Continue"}
                            </PButton>
                        </div>
                    </Dialog.DialogContent>
                </Dialog.Dialog>
                <Dialog.Dialog
                    open={settings}
                    onOpenChange={setSettings}
                >
                    <Dialog.DialogContent
                        hideClose
                        className="modal-content settings-content"
                    >
                        <div className="modal-header">
                            <Dialog.DialogTitle>Appearance & preferences</Dialog.DialogTitle>
                            <IconButton
                                title="Close settings"
                                onClick={() => setSettings(false)}
                            >
                                <X size={17} />
                            </IconButton>
                        </div>
                        <Dialog.DialogDescription className="dialog-description">
                            Alder colors by default, with a selection of color themes available.
                        </Dialog.DialogDescription>
                        <Settings preferences={preferences} />
                        <div className="modal-footer">
                            <PButton
                                variant="primary"
                                onClick={() => setSettings(false)}
                            >
                                Done
                            </PButton>
                        </div>
                    </Dialog.DialogContent>
                </Dialog.Dialog>
                <Dialog.Dialog
                    open={palette}
                    onOpenChange={setPalette}
                >
                    <Dialog.DialogContent
                        hideClose
                        className="modal-content palette-content"
                        aria-describedby="palette-help"
                    >
                        <div className="palette-search">
                            <Search size={19} />
                            <input
                                autoFocus
                                placeholder="Search commands and repositories..."
                                value={paletteQuery}
                                onChange={(e) => setPaletteQuery(e.target.value)}
                            />
                            <Dialog.DialogClose asChild>
                                <kbd>ESC</kbd>
                            </Dialog.DialogClose>
                        </div>
                        <Dialog.DialogDescription
                            id="palette-help"
                            className="visually-hidden"
                        >
                            Use the buttons below to navigate or execute commands.
                        </Dialog.DialogDescription>
                        <div className="palette-results">
                            <div className="palette-label">Commands</div>
                            {primaryActions
                                .filter((a) => a.name.toLowerCase().includes(paletteQuery.toLowerCase()))
                                .map((a) => (
                                    <button
                                        type="button"
                                        key={a.name}
                                        onClick={() => {
                                            setPalette(false);
                                            a.click();
                                            setPaletteQuery("");
                                        }}
                                    >
                                        <Command size={15} />
                                        {a.name}
                                        <ArrowRight size={14} />
                                    </button>
                                ))}
                            <div className="palette-label">Repositories</div>
                            {repos
                                .filter((r) => r.name.toLowerCase().includes(paletteQuery.toLowerCase()))
                                .slice(0, 12)
                                .map((r) => (
                                    <button
                                        type="button"
                                        key={r.id}
                                        onClick={() => {
                                            setPalette(false);
                                            selectRepo(r);
                                            setPaletteQuery("");
                                        }}
                                    >
                                        <FolderGit2 size={15} />
                                        {r.name}
                                        <ArrowRight size={14} />
                                    </button>
                                ))}
                        </div>
                    </Dialog.DialogContent>
                </Dialog.Dialog>
            </TooltipProvider>
        </SidebarProvider>
    );
}
