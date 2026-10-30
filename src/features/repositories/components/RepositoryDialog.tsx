import { FolderOpen, X } from "lucide-react";
import { IconButton, PButton } from "@/components/app/controls";
import * as Dialog from "@/components/ui/dialog";
import type { AppController } from "@/features/app/useAppController";

type Props = Pick<
    AppController,
    | "modal"
    | "setModal"
    | "workspaceName"
    | "setWorkspaceName"
    | "branchName"
    | "setBranchName"
    | "actionPath"
    | "setActionPath"
    | "chooseFolder"
    | "remoteUrl"
    | "setRemoteUrl"
    | "busy"
    | "submitModal"
>;
export function RepositoryDialog(props: Props) {
    const {
        modal,
        setModal,
        workspaceName,
        setWorkspaceName,
        branchName,
        setBranchName,
        actionPath,
        setActionPath,
        chooseFolder,
        remoteUrl,
        setRemoteUrl,
        busy,
        submitModal,
    } = props;
    return (
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
    );
}
