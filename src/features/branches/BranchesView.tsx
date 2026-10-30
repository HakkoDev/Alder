import { ArrowRight, Check, CloudDownload, GitBranch, Plus, Settings2, Trash2 } from "lucide-react";
import { Empty, IconButton, PButton } from "@/components/app/controls";
import type { AppController } from "@/features/app/useAppController";
import { git } from "@/lib/git-api";

type Props = Pick<AppController, "setModal" | "branches" | "busy" | "perform" | "setBranchAction"> & { activeRepo: NonNullable<AppController["activeRepo"]> };
export function BranchesView(props: Props) {
    const { setModal, branches, busy, perform, activeRepo, setBranchAction } = props;
    return (
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
    );
}
