import { Check, FileCode2, FileText, Plus, X } from "lucide-react";
import type { Change } from "../../lib/types";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../ui/context-menu";
import { IconButton } from "./controls";
export function FileRow({
    change,
    active,
    checked,
    onClick,
    onToggle,
    onAction,
    action,
}: {
    change: Change;
    active: boolean;
    checked: boolean;
    onClick: () => void;
    onToggle: (shift: boolean) => void;
    onAction: () => void;
    action: string;
}) {
    const file = change.path.split(/[\\/]/).pop() ?? change.path;
    const symbol = change.untracked ? "U" : change.indexStatus.trim() || change.worktreeStatus.trim() || "M";
    return (
        <ContextMenu>
            <div className={`file-row ${active ? "active" : ""} ${checked ? "checked" : ""}`}>
                <ContextMenuTrigger asChild>
                    <div className="file-row-inner">
                        <input
                            type="checkbox"
                            title={`Select ${file}`}
                            aria-label={`Select ${file}`}
                            checked={checked}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(e.shiftKey);
                            }}
                            onChange={() => {}}
                        />
                        <button
                            title={change.path}
                            onClick={onClick}
                            className="file-select"
                        >
                            <FileText size={15} />
                            <span>{file}</span>
                            <em>{symbol}</em>
                        </button>
                    </div>
                </ContextMenuTrigger>
                <IconButton
                    title={action === "+" ? `Stage ${file}` : `Unstage ${file}`}
                    onClick={onAction}
                >
                    <span>{action}</span>
                </IconButton>
            </div>
            <ContextMenuContent>
                <ContextMenuItem onSelect={onClick}>
                    <FileCode2 size={14} /> View diff
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onToggle(false)}>
                    <Check size={14} /> {checked ? "Deselect file" : "Select file"}
                </ContextMenuItem>
                <ContextMenuSeparator className="alder-menu-separator" />
                <ContextMenuItem onSelect={onAction}>
                    {action === "+" ? <Plus size={14} /> : <X size={14} />} {action === "+" ? "Stage file" : "Unstage file"}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
