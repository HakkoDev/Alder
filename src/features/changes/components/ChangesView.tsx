import type { AppController } from "@/features/app/useAppController";
import { ChangeList } from "@/features/changes/components/ChangeList";
import { DiffPanel } from "@/features/changes/components/DiffPanel";

type Props = Pick<
    AppController,
    | "changesRef"
    | "paneWidth"
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
    | "startResize"
    | "setPaneWidth"
    | "loadingDiff"
    | "diff"
> & { activeRepo: NonNullable<AppController["activeRepo"]> };
export function ChangesView(props: Props) {
    const { changesRef, paneWidth, startResize, setPaneWidth, activeRepo } = props;
    return (
        <div
            className="changes-layout"
            ref={changesRef}
            style={{ gridTemplateColumns: `minmax(250px, ${paneWidth}px) 7px minmax(0,1fr)` }}
        >
            <ChangeList
                listedChanges={props.listedChanges}
                loadingRepo={props.loadingRepo}
                loadSelected={props.loadSelected}
                selectedUnstaged={props.selectedUnstaged}
                busy={props.busy}
                bulkFiles={props.bulkFiles}
                selectedStaged={props.selectedStaged}
                unstaged={props.unstaged}
                perform={props.perform}
                chooseFile={props.chooseFile}
                selectChange={props.selectChange}
                staged={props.staged}
                activeRepo={activeRepo}
            />
            {/* biome-ignore lint/a11y/useSemanticElements: This focusable separator is an adjustable pane splitter, not a static horizontal rule. */}
            <div
                className="changes-divider"
                role="separator"
                tabIndex={0}
                aria-label="Resize changes and diff panes"
                aria-orientation="vertical"
                aria-valuenow={paneWidth}
                aria-valuemin={250}
                aria-valuemax={900}
                onPointerDown={startResize}
                onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                        e.preventDefault();
                        setPaneWidth((w) => Math.max(250, Math.min(900, w + (e.key === "ArrowRight" ? 20 : -20))));
                    }
                }}
                title="Drag to resize the file list"
            />
            <DiffPanel
                loadingDiff={props.loadingDiff}
                diff={props.diff}
                busy={props.busy}
                perform={props.perform}
                activeRepo={activeRepo}
            />
        </div>
    );
}
