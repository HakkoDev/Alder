import { useMemo } from "react";
import { t } from "../../lib/i18n";
export function DiffText({
    text,
    staged,
    disabled,
    onSelect,
    range,
}: {
    text: string;
    staged: boolean;
    disabled: boolean;
    onSelect: (hunk: number, line: number | null) => void;
    range: { start: number; end: number; before: number; after: number };
}) {
    const { lines, truncated } = useMemo(() => {
        const raw = text.split("\n");
        let hunk = -1;
        let hunkLine = 0;
        const all = raw.slice(0, 3000).map((line, offset) => {
            if (line.startsWith("@@ ")) {
                hunk++;
                hunkLine = 0;
            } else if (hunk >= 0) hunkLine++;
            return { line, offset, hunk, hunkLine };
        });
        return { lines: all, truncated: raw.length > 3000 };
    }, [text]);
    return (
        <section
            className="diff-lines"
            aria-label="File diff with partial staging controls"
        >
            <div
                style={{ height: range.before }}
                aria-hidden="true"
            />
            {lines.slice(range.start, range.end).map(({ line, offset: i, hunk, hunkLine }) => {
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
            <div
                style={{ height: range.after }}
                aria-hidden="true"
            />
            {truncated ? <div className="truncated">Only the first 3,000 diff lines are shown.</div> : null}
        </section>
    );
}
