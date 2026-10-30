import { AppContent } from "@/components/app/AppContent";
import { AppFooter } from "@/components/app/AppFooter";
import { AppHeader } from "@/components/app/AppHeader";
import { AppSidebar } from "@/components/app/AppSidebar";
import { CommandPalette } from "@/components/app/dialogs/CommandPalette";
import { DangerDialog } from "@/components/app/dialogs/DangerDialog";
import { SettingsDialog } from "@/components/app/dialogs/SettingsDialog";
import { BranchActionDialog } from "@/features/branches/BranchActionDialog";
import { RepositoryDialog } from "@/features/repositories/components/RepositoryDialog";
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar";
import { TooltipProvider } from "./components/ui/tooltip";
import { useAppController } from "./features/app/useAppController";
import { RepositoryMenuItems } from "./features/repositories/components/RepositoryMenuItems";
import type { Repository } from "./lib/types";
export default function App() {
    const app = useAppController();
    const repoMenu = (repo: Repository) => (
        <RepositoryMenuItems
            selectRepo={app.selectRepo}
            setDanger={app.setDanger}
            repo={repo}
        />
    );
    return (
        <SidebarProvider className="app-shell">
            <TooltipProvider delayDuration={350}>
                <AppSidebar
                    setModal={app.setModal}
                    selectRepo={app.selectRepo}
                    setDanger={app.setDanger}
                    repoMenu={repoMenu}
                />
                <SidebarInset className="main-area">
                    <AppHeader activeRepo={app.activeRepo} />
                    <AppContent
                        setModal={app.setModal}
                        changed={app.changed}
                        ahead={app.ahead}
                        behind={app.behind}
                        refresh={app.refresh}
                        selectRepo={app.selectRepo}
                        activeRepo={app.activeRepo}
                        status={app.status}
                        assignWorkspaceFast={app.assignWorkspaceFast}
                        busy={app.busy}
                        net={app.net}
                        remotes={app.remotes}
                        operation={app.operation}
                        runAdvanced={app.runAdvanced}
                        changesRef={app.changesRef}
                        paneWidth={app.paneWidth}
                        listedChanges={app.listedChanges}
                        loadingRepo={app.loadingRepo}
                        loadSelected={app.loadSelected}
                        selectedUnstaged={app.selectedUnstaged}
                        bulkFiles={app.bulkFiles}
                        selectedStaged={app.selectedStaged}
                        unstaged={app.unstaged}
                        perform={app.perform}
                        chooseFile={app.chooseFile}
                        selectChange={app.selectChange}
                        staged={app.staged}
                        startResize={app.startResize}
                        setPaneWidth={app.setPaneWidth}
                        loadingDiff={app.loadingDiff}
                        diff={app.diff}
                        history={app.history}
                        loadingHistory={app.loadingHistory}
                        branches={app.branches}
                        setBranchAction={app.setBranchAction}
                        worktrees={app.worktrees}
                        stashes={app.stashes}
                        reflog={app.reflog}
                        updateGitHubCounts={app.updateGitHubCounts}
                        repoMenu={repoMenu}
                    />
                    <AppFooter
                        activeRepo={app.activeRepo}
                        status={app.status}
                        worktrees={app.worktrees}
                        stashes={app.stashes}
                        githubCounts={app.githubCounts}
                        changed={app.changed}
                    />
                </SidebarInset>
                <BranchActionDialog
                    branchAction={app.branchAction}
                    setBranchAction={app.setBranchAction}
                    busy={app.busy}
                    activeRepo={app.activeRepo}
                    perform={app.perform}
                />
                <DangerDialog
                    danger={app.danger}
                    setDanger={app.setDanger}
                    busy={app.busy}
                    removeFromAlder={app.removeFromAlder}
                    perform={app.perform}
                />
                <RepositoryDialog
                    modal={app.modal}
                    setModal={app.setModal}
                    workspaceName={app.workspaceName}
                    setWorkspaceName={app.setWorkspaceName}
                    branchName={app.branchName}
                    setBranchName={app.setBranchName}
                    actionPath={app.actionPath}
                    setActionPath={app.setActionPath}
                    chooseFolder={app.chooseFolder}
                    remoteUrl={app.remoteUrl}
                    setRemoteUrl={app.setRemoteUrl}
                    busy={app.busy}
                    submitModal={app.submitModal}
                />
                <SettingsDialog preferences={app.preferences} />
                <CommandPalette
                    paletteQuery={app.paletteQuery}
                    setPaletteQuery={app.setPaletteQuery}
                    primaryActions={app.primaryActions}
                    selectRepo={app.selectRepo}
                />
            </TooltipProvider>
        </SidebarProvider>
    );
}
