import { PButton } from "@/components/app/controls";
import * as Dialog from "@/components/ui/dialog";
import type { AppController } from "@/features/app/useAppController";
import { git } from "@/lib/git-api";

type Props = Pick<AppController, "branchAction" | "setBranchAction" | "busy" | "activeRepo" | "perform">;
export function BranchActionDialog(props: Props) {
    const { branchAction, setBranchAction, busy, activeRepo, perform } = props;
    return (
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
    );
}
