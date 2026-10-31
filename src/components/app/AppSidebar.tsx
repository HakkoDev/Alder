import {
    Bot,
    ChevronDown,
    FileCode2,
    FolderClosed,
    FolderGit2,
    GitBranch,
    GitMerge,
    GitPullRequest,
    History,
    Layers3,
    LayoutDashboard,
    MoreHorizontal,
    Plus,
    Trash2,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { AppIcon, IconButton } from "@/components/app/controls";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";
import { useRegistryStore } from "@/features/repositories/registry-store";
import { useFilteredRepositories } from "@/features/repositories/useFilteredRepositories";
import { t } from "@/lib/i18n";
import type { Repository, View } from "@/lib/types";

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
type Props = Pick<AppController, "setModal" | "selectRepo" | "setDanger"> & { repoMenu: (repo: Repository) => React.ReactNode };
export function AppSidebar(props: Props) {
    const { workspaceFilter, setWorkspaceFilter, setView, view, activeRepoId, setActiveRepoId } = useNavigationStore(
        useShallow((state) => ({
            workspaceFilter: state.workspaceFilter,
            setWorkspaceFilter: state.setWorkspaceFilter,
            setView: state.setView,
            view: state.view,
            activeRepoId: state.activeRepoId,
            setActiveRepoId: state.setActiveRepoId,
        })),
    );
    const { workspaces, repos } = useRegistryStore(useShallow((state) => ({ workspaces: state.workspaces, repos: state.repos })));
    const filteredRepos = useFilteredRepositories();
    const { setModal, selectRepo, setDanger, repoMenu } = props;
    return (
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
                            }}
                        >
                            <Layers3 size={15} /> All repositories <span className="menu-count">{repos.length}</span>
                        </DropdownMenuItem>
                        {workspaces.map((w) => (
                            <DropdownMenuItem
                                key={w.id}
                                onSelect={() => {
                                    setWorkspaceFilter(w.id);
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
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            selectRepo(repo);
                                        }}
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
    );
}
