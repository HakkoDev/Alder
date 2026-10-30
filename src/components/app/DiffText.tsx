import { useMemo } from "react";
import { t } from "../../lib/i18n";
export function DiffText({
    text,
    staged,
    disabled,
    onSelect,
}: {
    text: string;
    staged: boolean;
    disabled: boolean;
    onSelect: (hunk: number, line: number | null) => void;
}) {
    const lines = useMemo(
        () =>
            text
                .split("\n")
                .slice(0, 3000)
                .map((line, offset) => ({ line, offset })),
        [text],
    );
    let hunk = -1;
    let hunkLine = 0;
    return (
        <section
            className="diff-lines"
            aria-label="File diff with partial staging controls"
        >
            {lines.map(({ line, offset: i }) => {
                if (line.startsWith("@@ ")) {
                    hunk++;
                    hunkLine = 0;
                } else if (hunk >= 0) hunkLine++;
                const change = hunk >= 0 && ((line.startsWith("+") && !line.startsWith("+++")) || (line.startsWith("-") && !line.startsWith("---")));
                const heading = line.startsWith("@@ ");
                const currentHunk = hunk,
                    currentLine = hunkLine;
                return (
                    <div
                        className={`diff-line ${line.startsWith("+") && !line.startsWith("+++") ? "added" : line.startsWith("-") && !line.startsWith("---") ? "removed" : heading ? "hunk" : line.startsWith("diff ") || line.startsWith("index ") ? "header" : ""}`}
                        key={i}
                    >
                        <span className="line-no">
                            {heading && hunk >= 0 ? (
                                <button
                                    type="button"
                                    disabled={disabled}
                                    className="diff-stage-control"
                                    title={staged ? t("changes.unstageHunk") : t("changes.stageHunk")}
                                    aria-label={staged ? t("changes.unstageHunk") : t("changes.stageHunk")}
                                    onClick={() => onSelect(currentHunk, null)}
                                >
                                    {staged ? "×" : "+"}
                                </button>
                            ) : change ? (
                                <button
                                    type="button"
                                    disabled={disabled}
                                    className="diff-stage-control"
                                    title={staged ? "Unstage this line" : "Stage this line"}
                                    aria-label={t(staged ? "changes.unstageLine" : "changes.stageLine", { line: i + 1 })}
                                    onClick={() => onSelect(currentHunk, currentLine)}
                                >
                                    {staged ? "×" : "+"}
                                </button>
                            ) : (
                                i + 1
                            )}
                        </span>
                        <pre>{line || " "}</pre>
                    </div>
                );
            })}
            {text.split("\n").length > 3000 ? <div className="truncated">Only the first 3,000 diff lines are shown.</div> : null}
        </section>
    );
}
