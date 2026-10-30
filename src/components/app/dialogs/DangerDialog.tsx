import { X } from "lucide-react";
import { IconButton, PButton } from "@/components/app/controls";
import * as Dialog from "@/components/ui/dialog";
import type { AppController } from "@/features/app/useAppController";
import { git } from "@/lib/git-api";

type Props = Pick<AppController, "danger" | "setDanger" | "busy" | "removeFromAlder" | "perform">;
export function DangerDialog(props: Props) {
    const { danger, setDanger, busy, removeFromAlder, perform } = props;
    return (
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
    );
}
