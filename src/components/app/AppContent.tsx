import { Bot, FolderGit2, Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { OperationsPanel, SequenceRecovery, WorktreePanel } from "@/components/AdvancedGit";
import { Empty, PButton } from "@/components/app/controls";
import { GitHubPanel } from "@/components/GitHubPanel";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";
import { BranchesView } from "@/features/branches/BranchesView";
import { ChangesView } from "@/features/changes/components/ChangesView";
import { HistoryView } from "@/features/history/HistoryView";
import { RepositoryHeader } from "@/features/repositories/components/RepositoryHeader";
import { RepositoryOverview } from "@/features/repositories/components/RepositoryOverview";
import { RepositoryTools } from "@/features/repositories/RepositoryTools";
import type { Repository } from "@/lib/types";

type Props = Pick<
    AppController,
    | "setModal"
    | "changed"
    | "ahead"
    | "behind"
    | "refresh"
    | "selectRepo"
    | "activeRepo"
    | "status"
    | "assignWorkspaceFast"
    | "busy"
    | "net"
    | "remotes"
    | "operation"
    | "runAdvanced"
    | "changesRef"
    | "paneWidth"
    | "listedChanges"
    | "loadingRepo"
    | "loadSelected"
    | "selectedUnstaged"
    | "bulkFiles"
    | "selectedStaged"
    | "unstaged"
    | "perform"
    | "chooseFile"
    | "selectChange"
    | "staged"
    | "startResize"
    | "setPaneWidth"
    | "loadingDiff"
    | "diff"
    | "history"
    | "loadingHistory"
    | "branches"
    | "setBranchAction"
    | "worktrees"
    | "stashes"
    | "reflog"
    | "updateGitHubCounts"
> & { repoMenu: (repo: Repository) => React.ReactNode };
export function AppContent(props: Props) {
    const { view } = useNavigationStore(useShallow((state) => ({ view: state.view })));
    const { activeRepo, setModal, operation, runAdvanced, busy, worktrees, branches, stashes, reflog, updateGitHubCounts } = props;
    return (
        <div
            className="main-body"
            key={view}
        >
            {view === "overview" && (
                <RepositoryOverview
                    setModal={props.setModal}
                    changed={props.changed}
                    ahead={props.ahead}
                    behind={props.behind}
                    refresh={props.refresh}
                    selectRepo={props.selectRepo}
                    repoMenu={props.repoMenu}
                />
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
                        <RepositoryHeader
                            status={props.status}
                            assignWorkspaceFast={props.assignWorkspaceFast}
                            busy={props.busy}
                            net={props.net}
                            remotes={props.remotes}
                            activeRepo={activeRepo}
                        />
                        {view === "changes" && operation.conflicts.length > 0 && (
                            <SequenceRecovery
                                path={activeRepo.path}
                                state={operation}
                                run={runAdvanced}
                                disabled={!!busy}
                            />
                        )}
                        {view === "changes" && (
                            <ChangesView
                                changesRef={props.changesRef}
                                paneWidth={props.paneWidth}
                                listedChanges={props.listedChanges}
                                loadingRepo={props.loadingRepo}
                                loadSelected={props.loadSelected}
                                selectedUnstaged={props.selectedUnstaged}
                                busy={props.busy}
                                bulkFiles={props.bulkFiles}
                                selectedStaged={props.selectedStaged}
                                unstaged={props.unstaged}
                                perform={props.perform}
                                chooseFile={props.chooseFile}
                                selectChange={props.selectChange}
                                staged={props.staged}
                                startResize={props.startResize}
                                setPaneWidth={props.setPaneWidth}
                                loadingDiff={props.loadingDiff}
                                diff={props.diff}
                                activeRepo={activeRepo}
                            />
                        )}
                        {view === "history" && (
                            <HistoryView
                                history={props.history}
                                loadingHistory={props.loadingHistory}
                            />
                        )}
                        {view === "branches" && (
                            <BranchesView
                                setModal={props.setModal}
                                branches={props.branches}
                                busy={props.busy}
                                perform={props.perform}
                                setBranchAction={props.setBranchAction}
                                activeRepo={activeRepo}
                            />
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
                        {view === "inspector" && (
                            <RepositoryTools
                                key={activeRepo.id}
                                path={activeRepo.path}
                            />
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
    );
}
