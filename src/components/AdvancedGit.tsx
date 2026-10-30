import { AlertTriangle, Check, Copy, GitBranch, GitCommitHorizontal, GitMerge, Layers3, RotateCcw, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { git } from "../lib/git-api";
import type { Branch, ConflictVersions, GitOperationState, ReflogInfo, StashInfo, WorktreeInfo } from "../lib/types";
import * as Dialog from "./ui/dialog";
import { SelectField as Select } from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type Run = (title: string, task: () => Promise<unknown>) => Promise<void>;
function useConfirmation() {
    const [pending, setPending] = useState<{ message: string; action: () => void } | null>(null);
    const ask = (message: string, action: () => void) => setPending({ message, action });
    const confirmation = (
        <Dialog.Dialog
            open={!!pending}
            onOpenChange={(open) => {
                if (!open) setPending(null);
            }}
        >
            <Dialog.DialogContent
                className="modal-content"
                aria-describedby="confirm-operation-description"
            >
                <div className="modal-header">
                    <Dialog.DialogTitle>Confirm Git operation</Dialog.DialogTitle>
                </div>
                <Dialog.DialogDescription
                    id="confirm-operation-description"
                    className="dialog-description"
                >
                    {pending?.message}
                </Dialog.DialogDescription>
                <div className="modal-footer">
                    <button
                        className="p-button secondary"
                        onClick={() => setPending(null)}
                    >
                        Cancel
                    </button>
                    <button
                        className="p-button danger"
                        onClick={() => {
                            const action = pending?.action;
                            setPending(null);
                            action?.();
                        }}
                    >
                        Confirm operation
                    </button>
                </div>
            </Dialog.DialogContent>
        </Dialog.Dialog>
    );
    return { ask, confirmation };
}
function Action({
    children,
    title,
    disabled = false,
    onClick,
    primary = false,
    danger = false,
}: {
    children: ReactNode;
    title: string;
    disabled?: boolean;
    onClick: () => void;
    primary?: boolean;
    danger?: boolean;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    title={title}
                    aria-label={title}
                    className={`p-button ${danger ? "danger" : primary ? "primary" : "secondary"}`}
                    disabled={disabled}
                    onClick={onClick}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent>{title}</TooltipContent>
        </Tooltip>
    );
}

export function SequenceRecovery({ path, state, run, disabled }: { path: string; state: GitOperationState; run: Run; disabled: boolean }) {
    const [editor, setEditor] = useState<{ file: string; versions: ConflictVersions; result: string } | null>(null);
    const { ask, confirmation } = useConfirmation();
    const ongoing = (["merge", "rebase", "cherry-pick", "revert"] as const).filter((x) =>
        x === "merge" ? state.merging : x === "rebase" ? state.rebasing : x === "cherry-pick" ? state.cherryPicking : state.reverting,
    );
    if (!ongoing.length && !state.conflicts.length) return null;
    return (
        <section
            className="advanced-alert"
            aria-live="polite"
        >
            <div className="advanced-heading">
                <AlertTriangle size={18} />
                <strong>{ongoing.length ? `Operation in progress: ${ongoing.join(", ")}` : "Unresolved conflicts"}</strong>
            </div>
            {state.conflicts.length > 0 && (
                <p>
                    {state.conflicts.length} conflicting file{state.conflicts.length === 1 ? "" : "s"}. Resolve and stage every conflict before continuing.
                </p>
            )}
            <div className="advanced-actions">
                {ongoing.map((op) => (
                    <span
                        className="button-pair"
                        key={op}
                    >
                        <Action
                            title={`Abort ${op} and restore its pre-operation state where Git supports it`}
                            danger
                            disabled={disabled}
                            onClick={() => {
                                ask(`Abort the active ${op} operation?`, () => void run(`Abort ${op}`, () => git.sequenceAction(path, op, "abort")));
                            }}
                        >
                            Abort {op}
                        </Action>
                        {op !== "merge" && (
                            <Action
                                title={`Continue ${op} after staging resolved files`}
                                disabled={disabled || state.conflicts.length > 0}
                                onClick={() => void run(`Continue ${op}`, () => git.sequenceAction(path, op, "continue"))}
                            >
                                Continue
                            </Action>
                        )}
                    </span>
                ))}
            </div>
            {state.conflicts.length > 0 && (
                <div className="conflicts-list">
                    {state.conflicts.map((file) => (
                        <div
                            className="conflict-row"
                            key={file}
                        >
                            <code title={file}>{file}</code>
                            <div className="advanced-actions">
                                <Action
                                    title={`Open Base / Ours / Theirs and manually edit the merge result`}
                                    disabled={disabled}
                                    onClick={() =>
                                        void run("Load conflict versions", async () => {
                                            const versions = await git.conflictVersions(path, file);
                                            setEditor({ file, versions, result: versions.ours ?? versions.theirs ?? "" });
                                        })
                                    }
                                >
                                    Edit result
                                </Action>
                                <Action
                                    title={`Replace the file with Git's ours side and stage it. Your manual edits will be overwritten.`}
                                    disabled={disabled}
                                    onClick={() => {
                                        ask(
                                            `Replace ${file} with OURS and stage it? Manual conflict edits will be lost.`,
                                            () => void run("Accept ours", () => git.resolveConflict(path, file, "ours")),
                                        );
                                    }}
                                >
                                    Use ours
                                </Action>
                                <Action
                                    title={`Replace the file with Git's theirs side and stage it. Your manual edits will be overwritten.`}
                                    disabled={disabled}
                                    onClick={() => {
                                        ask(
                                            `Replace ${file} with THEIRS and stage it? Manual conflict edits will be lost.`,
                                            () => void run("Accept theirs", () => git.resolveConflict(path, file, "theirs")),
                                        );
                                    }}
                                >
                                    Use theirs
                                </Action>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {editor && (
                <div className="merge-editor">
                    <div className="advanced-row">
                        <strong>Merge editor · {editor.file}</strong>
                        <Action
                            title="Close merge editor without saving"
                            onClick={() => setEditor(null)}
                        >
                            Close
                        </Action>
                    </div>
                    <div className="merge-sources">
                        {(["base", "ours", "theirs"] as const).map((which) => (
                            <div
                                className="merge-pane"
                                key={which}
                            >
                                <strong>{which === "base" ? "Base" : which === "ours" ? "Ours" : "Theirs"}</strong>
                                <pre>{editor.versions[which] ?? "(no version at this stage)"}</pre>
                                <Action
                                    title={`Copy ${which} content to the editable result`}
                                    onClick={() => setEditor({ ...editor, result: editor.versions[which] ?? "" })}
                                >
                                    Use {which}
                                </Action>
                            </div>
                        ))}
                    </div>
                    <label className="merge-result-label">
                        Resolved result
                        <textarea
                            aria-label="Resolved file content"
                            spellCheck={false}
                            value={editor.result}
                            onChange={(e) => setEditor({ ...editor, result: e.target.value })}
                        />
                    </label>
                    <div className="advanced-actions">
                        <Action
                            primary
                            disabled={disabled || editor.result.length > 250000}
                            title="Write the chosen result to the working file and stage it as resolved"
                            onClick={() => {
                                ask(
                                    `Write and stage the resolved content of ${editor.file}? This replaces the current file.`,
                                    () =>
                                        void run("Save conflict resolution", async () => {
                                            await git.saveConflict(path, editor.file, editor.result);
                                            setEditor(null);
                                        }),
                                );
                            }}
                        >
                            Save and stage resolution
                        </Action>
                    </div>
                </div>
            )}
            {confirmation}
        </section>
    );
}

export function WorktreePanel({ path, worktrees, run, disabled }: { path: string; worktrees: WorktreeInfo[]; run: Run; disabled: boolean }) {
    const [location, setLocation] = useState("");
    const [name, setName] = useState("");
    const [newBranch, setNewBranch] = useState(true);
    const { ask, confirmation } = useConfirmation();
    return (
        <div className="advanced-stack">
            <div className="card-bar">
                <div>
                    <h2>Worktrees</h2>
                    <p>Separate working directories without cloning the repository.</p>
                </div>
                <span className="subtle-tag">
                    {worktrees.length} worktree{worktrees.length === 1 ? "" : "s"}
                </span>
            </div>
            <section className="advanced-section">
                <h3>Create worktree</h3>
                <p>Choose an unused absolute directory and a branch. Creating a new branch starts it at HEAD.</p>
                <div className="advanced-form">
                    <label>
                        Directory
                        <input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="C:\\Workspace\\nexus-feature"
                            aria-label="Worktree destination"
                        />
                    </label>
                    <label>
                        Branch
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="feature/console"
                        />
                    </label>
                    <label className="advanced-toggle">
                        <input
                            type="checkbox"
                            checked={newBranch}
                            onChange={(e) => setNewBranch(e.target.checked)}
                        />{" "}
                        Create new branch
                    </label>
                    <Action
                        primary
                        disabled={disabled || !name.trim() || !location.trim()}
                        title="Create a standard Git worktree using the selected branch"
                        onClick={() =>
                            void run("Create worktree", async () => {
                                await git.addWorktree(path, location.trim(), name.trim(), newBranch);
                                setLocation("");
                                setName("");
                            })
                        }
                    >
                        Create worktree
                    </Action>
                </div>
            </section>
            <section className="advanced-section">
                <h3>Linked directories</h3>
                {worktrees.map((w) => (
                    <div
                        className="advanced-row"
                        key={w.path}
                    >
                        <div className="advanced-row-main">
                            <div>
                                <GitBranch size={16} />
                                <strong>{w.branch}</strong>
                                {w.current && <span className="subtle-tag">Selected</span>}
                                {w.locked && <span className="subtle-tag">Locked</span>}
                            </div>
                            <small title={w.path}>{w.path}</small>
                            <code>{w.head.slice(0, 9)}</code>
                        </div>
                        <div className="advanced-actions">
                            <Action
                                title={w.locked ? "Unlock the worktree" : "Lock this worktree to protect it from automatic pruning"}
                                disabled={disabled || w.current || w.bare}
                                onClick={() => void run(w.locked ? "Unlock worktree" : "Lock worktree", () => git.setWorktreeLock(path, w.path, !w.locked))}
                            >
                                {w.locked ? "Unlock" : "Lock"}
                            </Action>
                            <Action
                                danger
                                title={
                                    w.current
                                        ? "Cannot remove the currently selected worktree"
                                        : "Remove this clean, unlocked worktree; Git rejects dirty worktrees"
                                }
                                disabled={disabled || w.current || w.locked || w.bare}
                                onClick={() => {
                                    ask(
                                        `Remove worktree at ${w.path}? Git refuses removal when it has uncommitted changes.`,
                                        () => void run("Remove worktree", () => git.removeWorktree(path, w.path)),
                                    );
                                }}
                            >
                                <Trash2 size={14} /> Remove
                            </Action>
                        </div>
                    </div>
                ))}
                {worktrees.length === 0 && <p>No worktrees returned by Git.</p>}
            </section>
            {confirmation}
        </div>
    );
}

export function OperationsPanel({
    path,
    branches,
    stashes,
    reflog,
    operation,
    run,
    disabled,
}: {
    path: string;
    branches: Branch[];
    stashes: StashInfo[];
    reflog: ReflogInfo[];
    operation: GitOperationState;
    run: Run;
    disabled: boolean;
}) {
    const [source, setSource] = useState("");
    const { ask, confirmation } = useConfirmation();
    const [recovery, setRecovery] = useState<{ hash: string; name: string } | null>(null);
    const [squash, setSquash] = useState(false);
    const [message, setMessage] = useState("");
    const [untracked, setUntracked] = useState(true);
    const [selectedHash, setSelectedHash] = useState("");
    const [stashPatch, setStashPatch] = useState<{ reference: string; patch: string } | null>(null);
    const targets = branches.filter((b) => !b.current).map((b) => b.name);
    return (
        <div className="advanced-stack">
            <div className="card-bar">
                <div>
                    <h2>Git operations</h2>
                    <p>Merge, rebase, stash, recover, and move commits with clear safeguards.</p>
                </div>
                <GitMerge size={19} />
            </div>
            <SequenceRecovery
                path={path}
                state={operation}
                run={run}
                disabled={disabled}
            />
            <section className="advanced-section">
                <h3>Merge or rebase</h3>
                <p>Both require a clean working tree. Review the source branch before starting; Git may require conflict resolution.</p>
                <div className="advanced-form">
                    <label>
                        Source branch
                        <Select
                            label="Source branch"
                            value={source || "none"}
                            onValueChange={(v) => setSource(v === "none" ? "" : v)}
                            options={[{ value: "none", label: "Select branch" }, ...targets.map((b) => ({ value: b, label: b }))]}
                        />
                    </label>
                    <label className="advanced-toggle">
                        <input
                            type="checkbox"
                            checked={squash}
                            onChange={(e) => setSquash(e.target.checked)}
                        />{" "}
                        Squash merge
                    </label>
                    <Action
                        disabled={disabled || !source || operation.merging || operation.rebasing}
                        title="Merge selected branch into the current branch"
                        onClick={() => {
                            ask(
                                `Merge ${source} into the current branch${squash ? " (squash)" : ""}?`,
                                () => void run("Merge branch", () => git.merge(path, source, squash)),
                            );
                        }}
                    >
                        <GitMerge size={15} /> Merge
                    </Action>
                    <Action
                        disabled={disabled || !source || operation.merging || operation.rebasing}
                        title="Replay the current branch's commits on top of the selected branch"
                        onClick={() => {
                            ask(
                                `Rebase current branch onto ${source}? This rewrites local commit hashes.`,
                                () => void run("Rebase branch", () => git.rebase(path, source)),
                            );
                        }}
                    >
                        <GitBranch size={15} /> Rebase onto
                    </Action>
                </div>
            </section>
            <section className="advanced-section">
                <h3>Stashes</h3>
                <p>Temporarily preserve local work without creating a commit.</p>
                <div className="advanced-form">
                    <label>
                        Message
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Work in progress"
                        />
                    </label>
                    <label className="advanced-toggle">
                        <input
                            type="checkbox"
                            checked={untracked}
                            onChange={(e) => setUntracked(e.target.checked)}
                        />{" "}
                        Include untracked files
                    </label>
                    <Action
                        disabled={disabled}
                        title="Stash tracked changes and optionally untracked files"
                        onClick={() =>
                            void run("Create stash", async () => {
                                await git.createStash(path, message, untracked);
                                setMessage("");
                            })
                        }
                    >
                        <Layers3 size={15} /> Stash changes
                    </Action>
                </div>
                {stashes.map((s) => (
                    <div
                        className="advanced-row"
                        key={s.reference}
                    >
                        <div className="advanced-row-main">
                            <strong>{s.reference}</strong>
                            <small>{s.message}</small>
                        </div>
                        <div className="advanced-actions">
                            <Action
                                disabled={disabled}
                                title="Show the stash diff"
                                onClick={() =>
                                    void run("Inspect stash", async () => {
                                        const result = await git.stashAction(path, s.reference, "show");
                                        setStashPatch({ reference: s.reference, patch: result.slice(0, 120000) });
                                    })
                                }
                            >
                                View
                            </Action>
                            <Action
                                disabled={disabled}
                                title="Apply stash and restore its index; stash entry remains"
                                onClick={() => void run("Apply stash", () => git.stashAction(path, s.reference, "apply"))}
                            >
                                <Check size={14} /> Apply
                            </Action>
                            <Action
                                disabled={disabled}
                                title="Permanently drop this stash"
                                danger
                                onClick={() => {
                                    ask(
                                        `Drop ${s.reference}? This discards the saved stash.`,
                                        () => void run("Drop stash", () => git.stashAction(path, s.reference, "drop")),
                                    );
                                }}
                            >
                                <Trash2 size={14} />
                            </Action>
                        </div>
                    </div>
                ))}
                {!stashes.length && <p className="advanced-empty">No stashes</p>}
                {stashPatch && (
                    <div className="stash-preview">
                        <div className="advanced-row">
                            <strong>Diff: {stashPatch.reference}</strong>
                            <Action
                                title="Close stash preview"
                                onClick={() => setStashPatch(null)}
                            >
                                Close
                            </Action>
                        </div>
                        <pre>{stashPatch.patch || "This stash has no tracked text diff."}</pre>
                    </div>
                )}
            </section>
            <section className="advanced-section">
                <h3>Cherry-pick or revert a commit</h3>
                <p>Choose a commit from your repository's recent history. Cherry-pick replays it; revert commits an inverse patch.</p>
                <div className="advanced-form">
                    <label>
                        Commit SHA
                        <input
                            value={selectedHash}
                            onChange={(e) => setSelectedHash(e.target.value)}
                            placeholder="a1b2c3d"
                        />
                    </label>
                    <Action
                        disabled={disabled || selectedHash.trim().length < 7}
                        title="Replay the chosen commit onto the current branch"
                        onClick={() => {
                            ask(
                                `Cherry-pick ${selectedHash}?`,
                                () => void run("Cherry-pick", () => git.commitOperation(path, selectedHash.trim(), "cherry-pick")),
                            );
                        }}
                    >
                        <Copy size={14} /> Cherry-pick
                    </Action>
                    <Action
                        disabled={disabled || selectedHash.trim().length < 7}
                        title="Create a new commit reverting the selected commit"
                        onClick={() => {
                            ask(
                                `Revert ${selectedHash} with a new commit?`,
                                () => void run("Revert commit", () => git.commitOperation(path, selectedHash.trim(), "revert")),
                            );
                        }}
                    >
                        <RotateCcw size={14} /> Revert
                    </Action>
                </div>
            </section>
            <section className="advanced-section">
                <h3>Recent reflog</h3>
                <p>Find previous branch positions after checkout, rebase, or reset. Alder does not automatically restore lost working-tree changes.</p>
                <div className="reflog-list">
                    {reflog.slice(0, 35).map((entry, i) => (
                        <div
                            className="reflog-row"
                            key={`${entry.selector}-${i}`}
                        >
                            <GitCommitHorizontal size={14} />
                            <code>{entry.hash}</code>
                            <span>{entry.subject}</span>
                            <code>{entry.selector}</code>
                            <Action
                                title="Save this reflog commit in a new recovery branch, without changing your working tree"
                                disabled={disabled}
                                onClick={() => {
                                    setRecovery({ hash: entry.hash, name: `recovery/${entry.hash}` });
                                }}
                            >
                                Save branch
                            </Action>
                        </div>
                    ))}
                    {reflog.length === 0 && <p>No reflog entries found.</p>}
                </div>
            </section>
            {confirmation}
            <Dialog.Dialog
                open={!!recovery}
                onOpenChange={(o) => {
                    if (!o) setRecovery(null);
                }}
            >
                <Dialog.DialogContent
                    className="modal-content"
                    aria-describedby="recovery-description"
                >
                    <div className="modal-header">
                        <Dialog.DialogTitle>Save recovery branch</Dialog.DialogTitle>
                    </div>
                    <Dialog.DialogDescription
                        id="recovery-description"
                        className="dialog-description"
                    >
                        Create a local branch at {recovery?.hash} without modifying the working tree.
                    </Dialog.DialogDescription>
                    <label className="field-label">
                        Branch name
                        <input
                            value={recovery?.name ?? ""}
                            onChange={(e) => setRecovery((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                        />
                    </label>
                    <div className="modal-footer">
                        <button
                            className="p-button secondary"
                            onClick={() => setRecovery(null)}
                        >
                            Cancel
                        </button>
                        <button
                            className="p-button primary"
                            disabled={!recovery?.name.trim()}
                            onClick={() => {
                                if (!recovery) return;
                                const selected = recovery;
                                setRecovery(null);
                                void run("Create recovery branch", () => git.recoverBranch(path, selected.hash, selected.name));
                            }}
                        >
                            Create branch
                        </button>
                    </div>
                </Dialog.DialogContent>
            </Dialog.Dialog>
        </div>
    );
}
