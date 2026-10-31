import { ArrowRight, Command, FolderGit2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import * as Dialog from "@/components/ui/dialog";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";
import { useRegistryStore } from "@/features/repositories/registry-store";
import { git } from "@/lib/git-api";

type Props = Pick<AppController, "paletteQuery" | "setPaletteQuery" | "primaryActions" | "selectRepo">;
export function CommandPalette(props: Props) {
    const { palette, setPalette, setView } = useNavigationStore(
        useShallow((state) => ({ palette: state.palette, setPalette: state.setPalette, setView: state.setView })),
    );
    const { repos } = useRegistryStore(useShallow((state) => ({ repos: state.repos })));
    const { paletteQuery, setPaletteQuery, primaryActions, selectRepo } = props;
    const [searchKind, setSearchKind] = useState<"files" | "branches" | "commits">("files");
    const [matches, setMatches] = useState<{ path: string; repo: string; value: string }[]>([]);
    const [searching, setSearching] = useState(false);
    const [failures, setFailures] = useState(0);
    // Search only when explicitly requested, so normal command-palette navigation stays instant.
    const [request, setRequest] = useState<{ query: string; kind: "files" | "branches" | "commits"; sequence: number } | null>(null);
    useEffect(() => {
        if (!palette || !request) return;
        let active = true;
        setSearching(true);
        const targets = repos.filter((repo) => repo.available).slice(0, 30);
        void Promise.allSettled(
            targets.map(async (repo) => ({ path: repo.path, repo: repo.name, values: await git.searchRepository(repo.path, request.query, request.kind) })),
        )
            .then((results) => {
                if (!active) return;
                setFailures(results.filter((item) => item.status === "rejected").length);
                setMatches(
                    results
                        .flatMap((item) =>
                            item.status === "fulfilled" ? item.value.values.map((value) => ({ path: item.value.path, repo: item.value.repo, value })) : [],
                        )
                        .slice(0, 250),
                );
            })
            .finally(() => {
                if (active) setSearching(false);
            });
        return () => {
            active = false;
        };
    }, [palette, request, repos]);
    return (
        <Dialog.Dialog
            open={palette}
            onOpenChange={setPalette}
        >
            <Dialog.DialogContent
                hideClose
                className="modal-content palette-content"
                aria-describedby="palette-help"
            >
                <div className="palette-search">
                    <Search size={19} />
                    <input
                        autoFocus
                        placeholder="Search commands and repositories..."
                        value={paletteQuery}
                        onChange={(e) => setPaletteQuery(e.target.value)}
                    />
                    <Dialog.DialogClose asChild>
                        <kbd>ESC</kbd>
                    </Dialog.DialogClose>
                </div>
                <Dialog.DialogDescription
                    id="palette-help"
                    className="visually-hidden"
                >
                    Use the buttons below to navigate or execute commands.
                </Dialog.DialogDescription>
                <div className="palette-results">
                    <div className="palette-label">Commands</div>
                    {primaryActions
                        .filter((a) => a.name.toLowerCase().includes(paletteQuery.toLowerCase()))
                        .map((a) => (
                            <button
                                type="button"
                                key={a.name}
                                onClick={() => {
                                    setPalette(false);
                                    a.click();
                                    setPaletteQuery("");
                                }}
                            >
                                <Command size={15} />
                                {a.name}
                                <ArrowRight size={14} />
                            </button>
                        ))}
                    <div className="palette-label">Search Git across repositories</div>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            const query = paletteQuery.trim();
                            if (query) setRequest({ query, kind: searchKind, sequence: (request?.sequence ?? 0) + 1 });
                        }}
                        style={{ display: "flex", gap: 8, padding: "4px 8px 10px" }}
                    >
                        <select
                            aria-label="Git search category"
                            value={searchKind}
                            onChange={(event) => setSearchKind(event.target.value as typeof searchKind)}
                        >
                            <option value="files">Files</option>
                            <option value="branches">Branches</option>
                            <option value="commits">Commits</option>
                        </select>
                        <button
                            type="submit"
                            disabled={searching || !paletteQuery.trim()}
                        >
                            Search Git
                        </button>
                    </form>
                    {searching && (
                        <p
                            role="status"
                            className="small-muted"
                        >
                            Searching available repositories…
                        </p>
                    )}
                    {!searching && failures > 0 && (
                        <p
                            role="status"
                            className="small-muted"
                        >
                            {failures} repositories could not be searched.
                        </p>
                    )}
                    {!searching && matches.length > 0 && <div className="palette-label">Git results ({matches.length})</div>}
                    {!searching &&
                        matches.map((match) => (
                            <button
                                type="button"
                                key={`${match.path}:${searchKind}:${match.value}`}
                                onClick={() => {
                                    const repo = repos.find((item) => item.path === match.path);
                                    if (!repo) return;
                                    selectRepo(repo);
                                    setView(searchKind === "commits" ? "history" : searchKind === "branches" ? "branches" : "changes");
                                    setPalette(false);
                                    setPaletteQuery("");
                                }}
                            >
                                <FolderGit2 size={15} />
                                <span>
                                    {match.repo}: {match.value}
                                </span>
                                <ArrowRight size={14} />
                            </button>
                        ))}
                    <div className="palette-label">Repositories</div>
                    {repos
                        .filter((r) => r.name.toLowerCase().includes(paletteQuery.toLowerCase()))
                        .slice(0, 12)
                        .map((r) => (
                            <button
                                type="button"
                                key={r.id}
                                onClick={() => {
                                    setPalette(false);
                                    selectRepo(r);
                                    setPaletteQuery("");
                                }}
                            >
                                <FolderGit2 size={15} />
                                {r.name}
                                <ArrowRight size={14} />
                            </button>
                        ))}
                </div>
            </Dialog.DialogContent>
        </Dialog.Dialog>
    );
}
