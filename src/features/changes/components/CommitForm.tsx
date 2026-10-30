import { Check, ChevronDown, FileText, GitCommitHorizontal } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { PButton } from "@/components/app/controls";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AppController } from "@/features/app/useAppController";
import { useChangesStore } from "@/features/changes/changes-store";
import { git } from "@/lib/git-api";

type Props = Pick<AppController, "staged" | "busy" | "perform"> & { activeRepo: NonNullable<AppController["activeRepo"]> };
export function CommitForm(props: Props) {
    const { commitMessage, setCommitMessage, amend, signoff, skipHooks, setAmend, setSkipHooks, setSignoff } = useChangesStore(
        useShallow((state) => ({
            commitMessage: state.commitMessage,
            setCommitMessage: state.setCommitMessage,
            amend: state.amend,
            signoff: state.signoff,
            skipHooks: state.skipHooks,
            setAmend: state.setAmend,
            setSkipHooks: state.setSkipHooks,
            setSignoff: state.setSignoff,
        })),
    );
    const { staged, busy, perform, activeRepo } = props;
    return (
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
                            const hash = await git.commit(activeRepo.path, commitMessage, amend, false, skipHooks, signoff);
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
                                    const hash = await git.commit(activeRepo.path, commitMessage, false, false, skipHooks, signoff);
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
                                    const hash = await git.commit(activeRepo.path, commitMessage, false, true, skipHooks, signoff);
                                    setCommitMessage("");
                                    return `Committed ${hash}`;
                                })
                            }
                        >
                            <FileText size={15} /> Commit all tracked
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setAmend((value) => !value)}>
                            <Check
                                size={15}
                                className={amend ? "" : "menu-unchecked"}
                            />{" "}
                            Amend previous commit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="alder-menu-separator" />
                        <DropdownMenuItem onSelect={() => setSkipHooks((value) => !value)}>
                            <Check
                                size={15}
                                className={skipHooks ? "" : "menu-unchecked"}
                            />{" "}
                            Skip hooks (--no-verify)
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setSignoff((value) => !value)}>
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
    );
}
