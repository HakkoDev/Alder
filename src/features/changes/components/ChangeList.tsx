import { Check, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { IconButton } from "@/components/app/controls";
import { FileRow } from "@/components/app/FileRow";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { AppController } from "@/features/app/useAppController";
import { useChangesStore } from "@/features/changes/changes-store";
import { CommitForm } from "@/features/changes/components/CommitForm";
import { git } from "@/lib/git-api";
import { t } from "@/lib/i18n";

type Props = Pick<
    AppController,
    | "listedChanges"
    | "loadingRepo"
    | "loadSelected"
    | "selectedUnstaged"
    | "busy"
    | "bulkFiles"
    | "selectedStaged"
    | "unstaged"
    | "perform"
    | "chooseFile"
    | "selectChange"
    | "staged"
> & { activeRepo: NonNullable<AppController["activeRepo"]> };
export function ChangeList(props: Props) {
    const { selectedFiles, setChangeSort, changeSort, setChangeDirection, changeDirection, setSelectedFiles, activeFile, stagedDiff } = useChangesStore(
        useShallow((state) => ({
            selectedFiles: state.selectedFiles,
            setChangeSort: state.setChangeSort,
            changeSort: state.changeSort,
            setChangeDirection: state.setChangeDirection,
            changeDirection: state.changeDirection,
            setSelectedFiles: state.setSelectedFiles,
            activeFile: state.activeFile,
            stagedDiff: state.stagedDiff,
        })),
    );
    const {
        listedChanges,
        loadingRepo,
        loadSelected,
        activeRepo,
        selectedUnstaged,
        busy,
        bulkFiles,
        selectedStaged,
        unstaged,
        perform,
        chooseFile,
        selectChange,
        staged,
    } = props;
    return (
        <div className="changes-list">
            <div className="panel-heading">
                <div>
                    <h3>{t("changes.title")}</h3>
                    <span className="small-muted">
                        {listedChanges.length} files · {selectedFiles.length} selected
                    </span>
                </div>
                <div className="changes-list-actions">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="icon-button"
                                title={t("changes.sort")}
                                aria-label={t("changes.sort")}
                            >
                                <SlidersHorizontal size={16} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <div className="changes-menu-label">{t("changes.sortBy")}</div>
                            {(
                                [
                                    ["path", "Full path"],
                                    ["name", "File name"],
                                    ["status", "Git status"],
                                ] as const
                            ).map(([v, label]) => (
                                <DropdownMenuItem
                                    key={v}
                                    onSelect={() => setChangeSort(v)}
                                >
                                    {changeSort === v ? <Check size={14} /> : <span className="menu-check-space" />}
                                    {label}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setChangeDirection((x) => (x === "asc" ? "desc" : "asc"))}>
                                {changeDirection === "asc" ? t("changes.ascending") : t("changes.descending")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <IconButton
                        title="Refresh working tree"
                        disabled={loadingRepo}
                        onClick={() => void loadSelected(activeRepo.path)}
                    >
                        {loadingRepo ? <Spinner size={16} /> : <RefreshCw size={16} />}
                    </IconButton>
                </div>
            </div>
            <div className="selection-toolbar">
                <button
                    type="button"
                    disabled={!selectedUnstaged.length || !!busy}
                    onClick={() => void bulkFiles(true, selectedUnstaged)}
                >
                    <Plus size={14} /> Stage selected ({selectedUnstaged.length})
                </button>
                <button
                    type="button"
                    disabled={!selectedStaged.length || !!busy}
                    onClick={() => void bulkFiles(false, selectedStaged)}
                >
                    <X size={14} /> Unstage selected ({selectedStaged.length})
                </button>
                {selectedFiles.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                    >
                        <Check size={13} /> Clear
                    </button>
                ) : null}
            </div>
            <div className="file-scroll">
                {loadingRepo ? (
                    <div
                        role="status"
                        className="changes-loading"
                        aria-label="Loading working tree"
                    >
                        <Skeleton className="h-6" />
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <Skeleton
                                key={i}
                                className="h-9"
                            />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="file-group-title">
                            <label className="file-group-select">
                                <input
                                    type="checkbox"
                                    aria-label="Select all unstaged changes"
                                    checked={unstaged.length > 0 && unstaged.every((x) => selectedFiles.includes(`working:${x.path}`))}
                                    onChange={(e) =>
                                        setSelectedFiles((prev) =>
                                            e.target.checked
                                                ? [...new Set([...prev, ...unstaged.map((x) => `working:${x.path}`)])]
                                                : prev.filter((k) => !k.startsWith("working:")),
                                        )
                                    }
                                />{" "}
                                Unstaged <b>{unstaged.length}</b>
                            </label>
                            <button
                                type="button"
                                onClick={() => void perform("Stage all", () => git.stageAll(activeRepo.path))}
                                disabled={!unstaged.length || !!busy}
                            >
                                Stage all
                            </button>
                        </div>
                        {unstaged.map((f) => (
                            <FileRow
                                key={`unstaged-${f.path}`}
                                change={f}
                                active={activeFile === f.path && !stagedDiff}
                                checked={selectedFiles.includes(`working:${f.path}`)}
                                onClick={() => chooseFile(f, false)}
                                onToggle={(shift) => selectChange(f, false, shift)}
                                onAction={() => void perform("Stage file", () => git.stage(activeRepo.path, f.path))}
                                action="+"
                            />
                        ))}
                        {unstaged.length === 0 && <div className="empty-list">No unstaged changes</div>}
                        <div className="file-group-title">
                            <label className="file-group-select">
                                <input
                                    type="checkbox"
                                    aria-label="Select all staged changes"
                                    checked={staged.length > 0 && staged.every((x) => selectedFiles.includes(`staged:${x.path}`))}
                                    onChange={(e) =>
                                        setSelectedFiles((prev) =>
                                            e.target.checked
                                                ? [...new Set([...prev, ...staged.map((x) => `staged:${x.path}`)])]
                                                : prev.filter((k) => !k.startsWith("staged:")),
                                        )
                                    }
                                />{" "}
                                Staged <b>{staged.length}</b>
                            </label>
                        </div>
                        {staged.map((f) => (
                            <FileRow
                                key={`staged-${f.path}`}
                                change={f}
                                active={activeFile === f.path && stagedDiff}
                                checked={selectedFiles.includes(`staged:${f.path}`)}
                                onClick={() => chooseFile(f, true)}
                                onToggle={(shift) => selectChange(f, true, shift)}
                                onAction={() => void perform("Unstage file", () => git.unstage(activeRepo.path, f.path))}
                                action="−"
                            />
                        ))}
                        {staged.length === 0 && <div className="empty-list">Nothing staged yet</div>}
                    </>
                )}
            </div>
            <CommitForm
                staged={props.staged}
                busy={props.busy}
                perform={props.perform}
                activeRepo={activeRepo}
            />
        </div>
    );
}
