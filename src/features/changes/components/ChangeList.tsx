import { Check, ChevronDown, ChevronRight, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { IconButton } from "@/components/app/controls";
import { FileRow } from "@/components/app/FileRow";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";
import { useChangesStore } from "@/features/changes/changes-store";
import { CommitForm } from "@/features/changes/components/CommitForm";
import { useVirtualRows } from "@/features/changes/useVirtualRows";
import { git } from "@/lib/git-api";
import { t } from "@/lib/i18n";
import { getPreferences } from "@/lib/preferences";

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
    const [collapsed, setCollapsed] = useState({ staged: false, unstaged: false });
    const [filter, setFilter] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const filteredUnstaged = useMemo(
        () => unstaged.filter((file) => file.path.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase())),
        [unstaged, filter],
    );
    const filteredStaged = useMemo(() => staged.filter((file) => file.path.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase())), [staged, filter]);
    const rows = useMemo(
        () => [
            { kind: "header" as const, staged: false },
            ...(!collapsed.unstaged ? filteredUnstaged : []).map((change) => ({ kind: "file" as const, staged: false, change })),
            { kind: "header" as const, staged: true },
            ...(!collapsed.staged ? filteredStaged : []).map((change) => ({ kind: "file" as const, staged: true, change })),
        ],
        [filteredUnstaged, filteredStaged, collapsed],
    );
    const runFileAction = (label: string, task: () => Promise<void>, refresh = false) => {
        void task()
            .then(() => {
                toast.success(label);
                if (refresh) void loadSelected(activeRepo.path);
            })
            .catch((error) => toast.error(`${label}: ${String(error)}`));
    };
    const openEditor = (file: string) => {
        runFileAction("Open in editor", async () => {
            const editors = await git.detectEditors();
            const selected = getPreferences().preferredEditor;
            const editor = selected === "auto" ? ["zed", "code"].find((id) => editors.some((e) => e.id === id && e.available)) : selected;
            if (!editor) throw new Error("Install Zed or Visual Studio Code and add its CLI to PATH");
            await git.openInEditor(activeRepo.path, file, editor);
        });
    };
    const setView = useNavigationStore((state) => state.setView);
    const selectedKeys = useMemo(() => new Set(selectedFiles), [selectedFiles]);
    const hasWorking = unstaged.length > 0;
    const hasStaged = staged.length > 0;
    const hasUntracked = unstaged.some((file) => file.untracked);
    const selectedWorking = selectedUnstaged.length > 0;
    const selectedIndex = selectedStaged.length > 0;
    const primaryLabel = selectedWorking
        ? `Stage Selected (${selectedUnstaged.length})`
        : selectedIndex
          ? `Unstage Selected (${selectedStaged.length})`
          : hasWorking
            ? "Stage All"
            : "Unstage All";
    const primaryDisabled = !!busy || loadingRepo || (!selectedWorking && !selectedIndex && !hasWorking && !hasStaged);
    const runBulk = (name: string, action: "unstage-all" | "discard-tracked" | "restore-all" | "trash-untracked" | "stash-pop", confirmText?: string) => {
        if (confirmText && !window.confirm(confirmText)) return;
        void perform(name, () => git.changesBulkAction(activeRepo.path, action));
    };
    const primaryAction = () => {
        if (selectedWorking) void bulkFiles(true, selectedUnstaged);
        else if (selectedIndex) void bulkFiles(false, selectedStaged);
        else if (hasWorking) void perform("Stage all", () => git.stageAll(activeRepo.path));
        else if (hasStaged) runBulk("Unstage all", "unstage-all");
    };
    const listWindow = useVirtualRows(40, rows.length);
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
                <div className="changes-split-action">
                    <button
                        type="button"
                        className="changes-primary-action"
                        disabled={primaryDisabled}
                        onClick={primaryAction}
                    >
                        {primaryLabel}
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="changes-action-toggle"
                                disabled={!!busy || loadingRepo}
                                aria-label="More staging and changes actions"
                                title="More changes actions"
                            >
                                <ChevronDown size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="changes-actions-menu"
                        >
                            <DropdownMenuItem
                                disabled={!hasWorking}
                                onSelect={() => void perform("Stage all", () => git.stageAll(activeRepo.path))}
                            >
                                Stage All
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!hasStaged}
                                onSelect={() => runBulk("Unstage all", "unstage-all")}
                            >
                                Unstage All
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!hasWorking && !hasStaged}
                                onSelect={() =>
                                    runBulk("Restore all changes", "restore-all", "Discard ALL tracked changes, including staged edits? This cannot be undone.")
                                }
                            >
                                Restore All Changes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                disabled={!hasWorking && !hasStaged}
                                onSelect={() => void perform("Stash all", () => git.createStash(activeRepo.path, "", true))}
                            >
                                Stash All
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!hasWorking && !hasStaged}
                                onSelect={() => void perform("Stash tracked", () => git.createStash(activeRepo.path, "", false))}
                            >
                                Stash Tracked
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => runBulk("Pop stash", "stash-pop")}>Stash Pop</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setView("operations")}>View Stash</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                disabled={!hasWorking || !unstaged.some((file) => !file.untracked)}
                                destructive
                                onSelect={() =>
                                    runBulk(
                                        "Discard tracked changes",
                                        "discard-tracked",
                                        "Discard unstaged changes to tracked files? Staged changes will be kept.",
                                    )
                                }
                            >
                                Discard Tracked Changes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!hasUntracked}
                                destructive
                                onSelect={() => runBulk("Trash untracked files", "trash-untracked", "Move every untracked file to the system Trash?")}
                            >
                                Trash Untracked Files
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <button
                    type="button"
                    className="changes-clear-selection"
                    disabled={!selectedFiles.length || !!busy}
                    title="Clear file selection (does not discard changes)"
                    onClick={() => setSelectedFiles([])}
                >
                    <Check size={13} /> Clear Selection
                </button>
                <Popover
                    open={searchOpen}
                    onOpenChange={setSearchOpen}
                >
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="changes-search-trigger"
                            aria-label="Search changed files"
                            title="Search changed files"
                        >
                            <Search size={15} />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="end"
                        className="changes-file-search-popover"
                        onOpenAutoFocus={(event) => event.preventDefault()}
                    >
                        <Input
                            autoFocus
                            aria-label="Filter changed files"
                            placeholder="Filter changed files…"
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                        />
                        <span className="small-muted">Filters filenames and paths; selection is preserved.</span>
                        {filter && (
                            <button
                                type="button"
                                onClick={() => setFilter("")}
                            >
                                Clear filter
                            </button>
                        )}
                    </PopoverContent>
                </Popover>
            </div>
            <div
                className="file-scroll"
                ref={listWindow.ref}
                onScroll={listWindow.onScroll}
            >
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
                        <div
                            style={{ height: listWindow.before }}
                            aria-hidden="true"
                        />
                        {rows.slice(listWindow.start, listWindow.end).map((row) => {
                            if (row.kind === "header") {
                                const items = row.staged ? staged : unstaged;
                                const isCollapsed = row.staged ? collapsed.staged : collapsed.unstaged;
                                const visibleMatches = row.staged ? filteredStaged.length : filteredUnstaged.length;
                                const prefix = row.staged ? "staged:" : "working:";
                                return (
                                    <div
                                        className="file-group-title virtual-file-row"
                                        key={row.staged ? "staged-header" : "unstaged-header"}
                                    >
                                        <button
                                            type="button"
                                            className="file-group-collapse"
                                            title={isCollapsed ? "Expand section" : "Collapse section"}
                                            aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${row.staged ? "staged" : "unstaged"} files`}
                                            aria-expanded={!isCollapsed}
                                            onClick={() => setCollapsed((prev) => ({ ...prev, [row.staged ? "staged" : "unstaged"]: !isCollapsed }))}
                                        >
                                            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                        <label className="file-group-select">
                                            <input
                                                type="checkbox"
                                                aria-label={`Select all ${row.staged ? "staged" : "unstaged"} changes`}
                                                checked={items.length > 0 && items.every((item) => selectedKeys.has(`${prefix}${item.path}`))}
                                                onChange={(e) =>
                                                    setSelectedFiles((previous) =>
                                                        e.target.checked
                                                            ? [...new Set([...previous, ...items.map((item) => `${prefix}${item.path}`)])]
                                                            : previous.filter((key) => !key.startsWith(prefix)),
                                                    )
                                                }
                                            />
                                            {row.staged ? "Staged" : "Unstaged"} <b>{filter ? `${visibleMatches}/${items.length}` : items.length}</b>
                                        </label>
                                    </div>
                                );
                            }
                            const file = row.change;
                            const prefix = row.staged ? "staged:" : "working:";
                            return (
                                <div
                                    className="virtual-file-row"
                                    key={`${prefix}${file.path}`}
                                >
                                    <FileRow
                                        change={file}
                                        active={activeFile === file.path && stagedDiff === row.staged}
                                        checked={selectedKeys.has(`${prefix}${file.path}`)}
                                        onClick={() => chooseFile(file, row.staged)}
                                        onToggle={(shift) => selectChange(file, row.staged, shift)}
                                        onAction={() =>
                                            void perform(row.staged ? "Unstage file" : "Stage file", () =>
                                                row.staged ? git.unstage(activeRepo.path, file.path) : git.stage(activeRepo.path, file.path),
                                            )
                                        }
                                        staged={row.staged}
                                        onTrash={() => {
                                            if (!window.confirm(`Move ${file.path} to the system Trash?`)) return;
                                            runFileAction("File moved to Trash", () => git.trashFile(activeRepo.path, file.path), true);
                                        }}
                                        onCopy={(relative) => {
                                            const value = relative
                                                ? file.path
                                                : `${activeRepo.path.replace(/[\\/]$/, "")}${activeRepo.path.includes("\\") ? "\\" : "/"}${file.path.replace(/\//g, activeRepo.path.includes("\\") ? "\\" : "/")}`;
                                            void navigator.clipboard
                                                .writeText(value)
                                                .then(() => toast.success("Path copied"))
                                                .catch((error) => toast.error(`Could not copy path: ${String(error)}`));
                                        }}
                                        onIgnore={(localOnly) =>
                                            runFileAction(
                                                localOnly ? "Added to local exclude" : "Added to .gitignore",
                                                () => git.ignoreFile(activeRepo.path, file.path, localOnly),
                                                true,
                                            )
                                        }
                                        onOpen={() => runFileAction("File opened", () => git.openFile(activeRepo.path, file.path))}
                                        onEditor={() => openEditor(file.path)}
                                        onReveal={() => runFileAction("Shown in folder", () => git.revealChangeFile(activeRepo.path, file.path))}
                                    />
                                </div>
                            );
                        })}
                        <div
                            style={{ height: listWindow.after }}
                            aria-hidden="true"
                        />
                        {!listedChanges.length && <div className="empty-list">No changes</div>}
                        {!!filter && !filteredUnstaged.length && !filteredStaged.length && <div className="empty-list">No matching files</div>}
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
