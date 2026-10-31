import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { git, type LfsDiagnostic, type RepositoryDiagnostic, type SubmoduleDiagnostic, type WorktreeComparison } from "@/lib/git-api";
import { useRegistryStore } from "./registry-store";

type SearchKind = "branches" | "commits" | "files";
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
export function RepositoryTools({ path }: { path: string }) {
    const [report, setReport] = useState<RepositoryDiagnostic | null>(null);
    const [lfs, setLfs] = useState<LfsDiagnostic | null>(null);
    const [submodules, setSubmodules] = useState<SubmoduleDiagnostic | null>(null);
    const [trees, setTrees] = useState<{ path: string; branch?: string }[]>([]);
    const [treePath, setTreePath] = useState("");
    const [comparison, setComparison] = useState<WorktreeComparison | null>(null);
    const [kind, setKind] = useState<SearchKind>("files");
    const [query, setQuery] = useState("");
    const [matches, setMatches] = useState<{ path: string; repo: string; value: string }[]>([]);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const repositories = useRegistryStore((s) => s.repos);
    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [diagnostics, lfsStatus, modules, worktrees] = await Promise.all([
                git.diagnostics(path),
                git.lfsStatus(path),
                git.submodules(path),
                git.worktrees(path),
            ]);
            setReport(diagnostics);
            setLfs(lfsStatus);
            setSubmodules(modules);
            setTrees(worktrees);
        } catch (error) {
            toast.error(errorText(error));
        } finally {
            setLoading(false);
        }
    }, [path]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setReport(null);
        setLfs(null);
        setSubmodules(null);
        setComparison(null);
        setMatches([]);
        void Promise.all([git.diagnostics(path), git.lfsStatus(path), git.submodules(path), git.worktrees(path)])
            .then(([d, l, s, w]) => {
                if (!active) return;
                setReport(d);
                setLfs(l);
                setSubmodules(s);
                setTrees(w);
            })
            .catch((error) => {
                if (active) toast.error(errorText(error));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [path]);
    async function maintenance(action: string, label: string, confirm = false) {
        if (confirm && !window.confirm(`${label}? This changes Git repository state.`)) return;
        setBusy(true);
        try {
            const result = await git.maintenance(path, action);
            toast.success(result || `${label} completed`);
            await refresh();
        } catch (error) {
            toast.error(errorText(error));
        } finally {
            setBusy(false);
        }
    }
    async function search() {
        const needle = query.trim();
        if (!needle) {
            setMatches([]);
            return;
        }
        setBusy(true);
        try {
            const targets = repositories.filter((repo) => repo.available).slice(0, 30);
            const results = await Promise.allSettled(
                targets.map(async (repo) => ({ path: repo.path, repo: repo.name, values: await git.searchRepository(repo.path, needle, kind) })),
            );
            setMatches(
                results
                    .flatMap((result) =>
                        result.status === "fulfilled" ? result.value.values.map((value) => ({ path: result.value.path, repo: result.value.repo, value })) : [],
                    )
                    .slice(0, 250),
            );
            const failed = results.filter((result) => result.status === "rejected").length;
            if (failed) toast.error(`${failed} repositories could not be searched`);
        } finally {
            setBusy(false);
        }
    }
    return (
        <div
            className="content-card"
            style={{ overflowY: "auto", padding: 18, display: "grid", gap: 20 }}
        >
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <h2>Repository tools</h2>
                    <p className="small-muted">Read-only diagnostics, Git maintenance, LFS, submodules and multi-repo search.</p>
                </div>
                <button
                    type="button"
                    disabled={loading || busy}
                    onClick={() => void refresh()}
                >
                    Refresh
                </button>
            </header>
            {loading && <p>Inspecting repository…</p>}
            {report && (
                <section>
                    <h3>Repository health</h3>
                    <p>
                        Branch: {report.branch ?? "Detached HEAD"} · Upstream: {report.upstream ?? "Not configured"}
                    </p>
                    {report.issues.length ? (
                        <ul>
                            {report.issues.map((issue) => (
                                <li key={issue}>{issue}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No local configuration issues detected.</p>
                    )}
                    <h4>Remotes</h4>
                    {report.remotes.map((remote) => (
                        <p key={remote.name}>
                            <strong>{remote.name}</strong> · {remote.url ?? "Missing URL"} ·{" "}
                            {remote.hasTrackingRefs ? "Tracking refs available" : "Not fetched"}
                        </p>
                    ))}
                    {report.goneBranches.length > 0 && <p>Branches with missing upstream references: {report.goneBranches.join(", ")}</p>}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void maintenance("fetch-prune", "Fetch and prune remote tracking branches", true)}
                    >
                        Fetch and prune remotes
                    </button>
                </section>
            )}
            {lfs && (
                <section>
                    <h3>Git LFS</h3>
                    <p>{lfs.installed ? lfs.version : "Git LFS is not installed"}</p>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{lfs.tracked || "No LFS patterns configured"}</pre>
                    <p>{lfs.files.length} listed LFS objects</p>
                    <button
                        type="button"
                        disabled={busy || !lfs.installed}
                        onClick={() => void maintenance("lfs-pull", "Download LFS objects", true)}
                    >
                        Pull LFS objects
                    </button>
                </section>
            )}
            {submodules && (
                <section>
                    <h3>Submodules</h3>
                    <p>{submodules.configured ? `${submodules.status.length} submodule entries` : "No .gitmodules file"}</p>
                    {submodules.status.map((line) => (
                        <pre key={line}>{line}</pre>
                    ))}
                    <button
                        type="button"
                        disabled={busy || !submodules.configured}
                        onClick={() => void maintenance("submodule-update", "Initialize/update submodules", true)}
                    >
                        Update submodules
                    </button>
                </section>
            )}
            <section>
                <h3>Worktree comparisons and cleanup</h3>
                <label>
                    Compare HEAD with registered worktree{" "}
                    <select
                        value={treePath}
                        onChange={(event) => setTreePath(event.target.value)}
                    >
                        <option value="">Choose a worktree</option>
                        {trees
                            .filter((tree) => tree.path !== path)
                            .map((tree) => (
                                <option
                                    key={tree.path}
                                    value={tree.path}
                                >
                                    {tree.branch || tree.path} · {tree.path}
                                </option>
                            ))}
                    </select>
                </label>{" "}
                <button
                    type="button"
                    disabled={!treePath || busy}
                    onClick={() => void git.openWorktreeInEditor(path, treePath, "zed").catch((error) => toast.error(errorText(error)))}
                >
                    Open in Zed
                </button>{" "}
                <button
                    type="button"
                    disabled={!treePath || busy}
                    onClick={() => void git.openWorktreeInEditor(path, treePath, "code").catch((error) => toast.error(errorText(error)))}
                >
                    Open in VS Code
                </button>{" "}
                <button
                    type="button"
                    disabled={!treePath || busy}
                    onClick={() =>
                        void git
                            .compareWorktrees(path, treePath)
                            .then(setComparison)
                            .catch((error) => toast.error(errorText(error)))
                    }
                >
                    Compare
                </button>
                {comparison && (
                    <pre style={{ whiteSpace: "pre-wrap" }}>
                        Ahead/behind: {comparison.divergence}
                        {"\n"}
                        {comparison.summary || "No committed differences"}
                    </pre>
                )}
                <p>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void maintenance("worktree-prune-dry-run", "Preview stale worktrees")}
                    >
                        Preview cleanup
                    </button>{" "}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void maintenance("worktree-prune", "Prune stale worktree metadata", true)}
                    >
                        Prune stale worktrees
                    </button>
                </p>
            </section>
            <section>
                <h3>Search across repositories</h3>
                <p className="small-muted">Searches up to 30 available repositories. Read-only; results are limited to 250.</p>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void search();
                    }}
                    style={{ display: "flex", gap: 8 }}
                >
                    <input
                        aria-label="Search query"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Find a file, branch or commit…"
                        maxLength={200}
                    />
                    <select
                        aria-label="Search category"
                        value={kind}
                        onChange={(event) => setKind(event.target.value as SearchKind)}
                    >
                        <option value="files">Files</option>
                        <option value="branches">Branches</option>
                        <option value="commits">Commits</option>
                    </select>
                    <button
                        type="submit"
                        disabled={busy || !query.trim()}
                    >
                        Search
                    </button>
                </form>
                <div aria-live="polite">
                    {matches.map((match) => (
                        <p key={`${match.path}:${kind}:${match.value}`}>
                            <strong>{match.repo}</strong> · {match.value}
                        </p>
                    ))}
                </div>
            </section>
        </div>
    );
}
