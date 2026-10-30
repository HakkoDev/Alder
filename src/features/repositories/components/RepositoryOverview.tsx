import { isTauri } from "@tauri-apps/api/core";
import {
    ArrowDownLeft,
    ArrowUpRight,
    ChevronRight,
    FileCode2,
    FilePlus2,
    FolderGit2,
    FolderOpen,
    GitBranch,
    Plus,
    RefreshCw,
    Search,
    Terminal,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Empty, IconButton, PButton } from "@/components/app/controls";
import { Stat } from "@/components/app/Stat";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";
import { useRegistryStore } from "@/features/repositories/registry-store";
import { useFilteredRepositories } from "@/features/repositories/useFilteredRepositories";
import type { Repository } from "@/lib/types";

const NATIVE = isTauri();
type Props = Pick<AppController, "setModal" | "changed" | "ahead" | "behind" | "refresh" | "selectRepo"> & { repoMenu: (repo: Repository) => React.ReactNode };
export function RepositoryOverview(props: Props) {
    const { search, setSearch } = useNavigationStore(useShallow((state) => ({ search: state.search, setSearch: state.setSearch })));
    const { repos, refreshing, boot } = useRegistryStore(useShallow((state) => ({ repos: state.repos, refreshing: state.refreshing, boot: state.boot })));
    const filteredRepos = useFilteredRepositories();
    const { setModal, changed, ahead, behind, refresh, selectRepo, repoMenu } = props;
    return (
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
                                        {!r.available ? "Unavailable" : r.staged + r.modified ? `${r.modified + r.staged} changes` : "Clean"}
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
    );
}
