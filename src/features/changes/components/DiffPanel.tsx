import { FileCode2, FileText, GitCompareArrows } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Empty } from "@/components/app/controls";
import { DiffText } from "@/components/app/DiffText";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppController } from "@/features/app/useAppController";
import { useChangesStore } from "@/features/changes/changes-store";
import { useVirtualRows } from "@/features/changes/useVirtualRows";
import { git } from "@/lib/git-api";

type Props = Pick<AppController, "loadingDiff" | "diff" | "busy" | "perform"> & {
    activeRepo: NonNullable<AppController["activeRepo"]>;
};
export function DiffPanel(props: Props) {
    const { activeFile, stagedDiff } = useChangesStore(useShallow((state) => ({ activeFile: state.activeFile, stagedDiff: state.stagedDiff })));
    const { loadingDiff, diff, busy, activeRepo, perform } = props;
    const lineCount = useMemo(() => (diff ? Math.min(3000, diff.split("\n").length) : 0), [diff]);
    const diffWindow = useVirtualRows(20, lineCount, 18);
    return (
        <div className="diff-panel">
            <div className="diff-heading">
                <div className="diff-file-name">
                    <FileCode2 size={17} />
                    <strong>{activeFile ?? "Select a file to inspect"}</strong>
                    {activeFile ? <span className="subtle-tag">{stagedDiff ? "Staged" : "Working tree"}</span> : null}
                </div>
            </div>
            {activeFile ? (
                <div
                    className="diff-code"
                    ref={diffWindow.ref}
                    onScroll={diffWindow.onScroll}
                >
                    {loadingDiff ? (
                        <div
                            role="status"
                            className="changes-loading"
                            aria-label="Loading diff"
                        >
                            <Skeleton className="h-5" />
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                                <Skeleton
                                    key={i}
                                    className="h-4"
                                />
                            ))}
                        </div>
                    ) : diff ? (
                        <DiffText
                            text={diff}
                            range={diffWindow}
                            staged={stagedDiff}
                            disabled={!!busy}
                            onSelect={(hunk, line) => {
                                if (activeRepo && activeFile)
                                    void perform(stagedDiff ? "Unstage selection" : "Stage selection", () =>
                                        git.applyDiffSelection(activeRepo.path, activeFile, stagedDiff, hunk, line),
                                    );
                            }}
                        />
                    ) : (
                        <Empty
                            icon={FileText}
                            title="No diff available"
                            description="Select another file or stage the current file to inspect its changes."
                        />
                    )}
                </div>
            ) : (
                <Empty
                    icon={GitCompareArrows}
                    title="Review your changes"
                    description="Select a file to inspect its diff before committing."
                />
            )}
        </div>
    );
}
