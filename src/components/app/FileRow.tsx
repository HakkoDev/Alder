import { Check, ClipboardCopy, ExternalLink, FileCode2, FileText, FolderOpen, Ban, GitCommitHorizontal, Trash2 } from "lucide-react";
import type { Change } from "../../lib/types";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../ui/context-menu";

export function FileRow({
    change,
    active,
    checked,
    onClick,
    onToggle,
    onAction,
    staged,
    onTrash,
    onCopy,
    onIgnore,
    onOpen,
    onEditor,
    onReveal,
}: {
    change: Change;
    active: boolean;
    checked: boolean;
    onClick: () => void;
    onToggle: (shift: boolean) => void;
    onAction: () => void;
    staged: boolean;
    onTrash: () => void;
    onCopy: (relative: boolean) => void;
    onIgnore: (localOnly: boolean) => void;
    onOpen: () => void;
    onEditor: () => void;
    onReveal: () => void;
}) {
    const file = change.path.split(/[\\/]/).pop() ?? change.path;
    const status =
        change.untracked || change.indexStatus.includes("A") || change.worktreeStatus.includes("A")
            ? "added"
            : change.indexStatus.includes("D") || change.worktreeStatus.includes("D")
              ? "deleted"
              : "modified";
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div className={`file-row file-row-${status} ${active ? "active" : ""} ${checked ? "checked" : ""}`}>
                    <div className="file-row-inner">
                        <input
                            type="checkbox"
                            aria-label={`Select ${file}`}
                            checked={checked}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(e.shiftKey);
                            }}
                            onChange={() => {}}
                        />
                        <button
                            type="button"
                            title={change.path}
                            onClick={onClick}
                            className="file-select"
                        >
                            <FileText
                                size={14}
                                className="file-status-icon"
                            />
                            <span title={change.path}>{file}</span>
                            <small
                                className="file-parent-path"
                                title={change.path}
                            >
                                {change.path.slice(0, -file.length).replace(/[\\/]$/, "")}
                            </small>
                        </button>
                        <span
                            className="file-change-counts"
                            title={`${change.additions ?? 0} added, ${change.deletions ?? 0} removed`}
                        >
                            <span className="file-additions">+{change.additions ?? 0}</span>
                            <span className="file-deletions">−{change.deletions ?? 0}</span>
                        </span>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onSelect={onClick}>
                    <FileCode2 size={14} /> View diff
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onToggle(false)}>
                    <Check size={14} /> {checked ? "Deselect file" : "Select file"}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={onAction}>
                    <GitCommitHorizontal size={14} /> {staged ? "Unstage File" : "Stage File"}
                </ContextMenuItem>
                <ContextMenuItem onSelect={onTrash}>
                    <Trash2 size={14} /> Trash File (Delete)
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => onCopy(false)}>
                    <ClipboardCopy size={14} /> Copy Path
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onCopy(true)}>
                    <ClipboardCopy size={14} /> Copy Relative Path
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onIgnore(false)}>
                    <Ban size={14} /> Add to .gitignore
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onIgnore(true)}>
                    <Ban size={14} /> Add to .git/info/exclude
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={onOpen}>
                    <FolderOpen size={14} /> Open File
                </ContextMenuItem>
                <ContextMenuItem onSelect={onEditor}>
                    <ExternalLink size={14} /> Open in Editor
                </ContextMenuItem>
                <ContextMenuItem onSelect={onReveal}>
                    <FolderOpen size={14} /> Show in Folder
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
