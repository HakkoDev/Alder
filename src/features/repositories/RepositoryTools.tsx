import {
    type Activity,
    AlertTriangle,
    ArrowDownToLine,
    ArrowRight,
    CheckCircle2,
    Code2,
    ExternalLink,
    FolderGit2,
    GitBranch,
    GitFork,
    HardDriveDownload,
    RefreshCw,
    Search,
    Server,
    ShieldCheck,
    Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { git, type LfsDiagnostic, type RepositoryDiagnostic, type SubmoduleDiagnostic, type WorktreeComparison } from "@/lib/git-api";
import { useRegistryStore } from "./registry-store";

type SearchKind = "branches" | "commits" | "files";
type SearchMatch = { path: string; repo: string; value: string };
type Confirmation = { action: string; title: string; description: string; label: string };
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function Panel({
    icon: Icon,
    title,
    description,
    children,
    action,
}: {
    icon: typeof Activity;
    title: string;
    description?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <section className="inspector-panel">
            <div className="inspector-panel-heading">
                <div className="inspector-panel-icon">
                    <Icon size={17} />
                </div>
                <div className="inspector-panel-title">
                    <h3>{title}</h3>
                    {description && <p>{description}</p>}
                </div>
                {action && <div className="inspector-panel-action">{action}</div>}
            </div>
            <div className="inspector-panel-body">{children}</div>
        </section>
    );
}

export function RepositoryTools({ path }: { path: string }) {
    const [report, setReport] = useState<RepositoryDiagnostic | null>(null);
    const [lfs, setLfs] = useState<LfsDiagnostic | null>(null);
    const [submodules, setSubmodules] = useState<SubmoduleDiagnostic | null>(null);
    const [trees, setTrees] = useState<{ path: string; branch?: string }[]>([]);
    const [treePath, setTreePath] = useState("");
    const [comparison, setComparison] = useState<WorktreeComparison | null>(null);
    const [kind, setKind] = useState<SearchKind>("files");
    const [query, setQuery] = useState("");
    const [matches, setMatches] = useState<SearchMatch[]>([]);
    const [searched, setSearched] = useState(false);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
    const [preview, setPreview] = useState("");
    const [previewReady, setPreviewReady] = useState(false);
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
        setTrees([]);
        setTreePath("");
        setComparison(null);
        setMatches([]);
        setSearched(false);
        setPreview("");
        setPreviewReady(false);
        setConfirmation(null);
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

    async function maintenance(action: string, label: string) {
        setBusy(true);
        try {
            const result = await git.maintenance(path, action);
            if (action === "worktree-prune-dry-run") {
                setPreview(result || "No stale worktree metadata found.");
                setPreviewReady(true);
            } else {
                if (action === "worktree-prune") {
                    setPreviewReady(false);
                    setPreview("");
                }
                toast.success(result || `${label} completed`);
                await refresh();
            }
        } catch (error) {
            toast.error(errorText(error));
        } finally {
            setBusy(false);
        }
    }

    function confirmAction(action: string, title: string, description: string, label: string) {
        setConfirmation({ action, title, description, label });
    }

    async function search() {
        const needle = query.trim();
        if (!needle) {
            setMatches([]);
            setSearched(false);
            return;
        }
        setBusy(true);
        setSearched(true);
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
        } catch (error) {
            toast.error(errorText(error));
        } finally {
            setBusy(false);
        }
    }

    const healthy = report && report.issues.length === 0 && report.goneBranches.length === 0;
    const otherTrees = trees.filter((tree) => tree.path !== path);

    return (
        <div className="inspector-view">
            <div className="inspector-intro">
                <div>
                    <div className="inspector-eyebrow">REPOSITORY INSPECTOR</div>
                    <h2>
                        Repository health <span>&amp; tools</span>
                    </h2>
                    <p>Check repository configuration, manage Git extensions, and compare worktrees.</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || busy}
                    onClick={() => void refresh()}
                >
                    <RefreshCw
                        size={14}
                        className={loading ? "inspector-spinning" : ""}
                    />{" "}
                    Refresh
                </Button>
            </div>

            {loading && !report && (
                <div className="inspector-loading">
                    <RefreshCw
                        size={17}
                        className="inspector-spinning"
                    />{" "}
                    Inspecting repository…
                </div>
            )}

            {report && (
                <>
                    <div className="inspector-summary">
                        <div className="inspector-summary-state">
                            {healthy ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                            <div>
                                <strong>{healthy ? "Looking good" : "Attention needed"}</strong>
                                <span>
                                    {healthy
                                        ? "No configuration issues detected"
                                        : `${report.issues.length + report.goneBranches.length} potential issues detected`}
                                </span>
                            </div>
                        </div>
                        <div className="inspector-summary-divider" />
                        <div className="inspector-summary-metric">
                            <span>Current branch</span>
                            <strong>
                                <GitBranch size={14} />
                                {report.branch ?? "Detached HEAD"}
                            </strong>
                        </div>
                        <div className="inspector-summary-metric">
                            <span>Tracking</span>
                            <strong>{report.upstream ?? "No upstream"}</strong>
                        </div>
                        <div className="inspector-summary-metric">
                            <span>Remotes</span>
                            <strong>{report.remotes.length}</strong>
                        </div>
                    </div>
                    {(report.issues.length > 0 || report.goneBranches.length > 0) && (
                        <div
                            className="inspector-warnings"
                            role="status"
                        >
                            <AlertTriangle size={17} />
                            <div>
                                {report.issues.map((issue) => (
                                    <p key={issue}>{issue}</p>
                                ))}
                                {report.goneBranches.length > 0 && <p>Missing upstream references: {report.goneBranches.join(", ")}</p>}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="inspector-grid">
                <div className="inspector-column">
                    <Panel
                        icon={Server}
                        title="Remotes"
                        description="Connections and remote-tracking health"
                        action={
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy || loading}
                                onClick={() =>
                                    confirmAction(
                                        "fetch-prune",
                                        "Fetch and prune remotes?",
                                        "Fetch remote changes and remove local remote-tracking references that no longer exist on the server.",
                                        "Fetch & prune",
                                    )
                                }
                            >
                                Fetch &amp; prune
                            </Button>
                        }
                    >
                        {report &&
                            (report.remotes.length ? (
                                report.remotes.map((remote) => (
                                    <div
                                        className="inspector-remote"
                                        key={remote.name}
                                    >
                                        <div className="inspector-remote-avatar">
                                            <Server size={15} />
                                        </div>
                                        <div className="inspector-remote-details">
                                            <strong>{remote.name}</strong>
                                            <span title={remote.url ?? undefined}>{remote.url ?? "No remote URL configured"}</span>
                                        </div>
                                        <span className={`inspector-status ${remote.hasTrackingRefs ? "is-ok" : "is-muted"}`}>
                                            {remote.hasTrackingRefs ? "Tracked" : "Not fetched"}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="inspector-empty">No remotes configured for this repository.</div>
                            ))}
                        {!report && <div className="inspector-empty">Loading remotes…</div>}
                    </Panel>
                    <Panel
                        icon={GitFork}
                        title="Worktrees"
                        description="Compare branches and open workspaces in your editor"
                    >
                        <label
                            htmlFor="inspector-worktree"
                            className="inspector-field-label"
                        >
                            COMPARE AGAINST
                        </label>
                        <Select
                            value={treePath || "none"}
                            onValueChange={(value) => {
                                setTreePath(value === "none" ? "" : value);
                                setComparison(null);
                            }}
                        >
                            <SelectTrigger
                                id="inspector-worktree"
                                className="inspector-select"
                            >
                                <SelectValue placeholder="Select a worktree" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Choose a worktree</SelectItem>
                                {otherTrees.map((tree) => (
                                    <SelectItem
                                        key={tree.path}
                                        value={tree.path}
                                    >
                                        {tree.branch || "Detached HEAD"} · {tree.path}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="inspector-button-row">
                            <Button
                                type="button"
                                size="sm"
                                disabled={!treePath || busy}
                                onClick={() =>
                                    void git
                                        .compareWorktrees(path, treePath)
                                        .then(setComparison)
                                        .catch((error) => toast.error(errorText(error)))
                                }
                            >
                                Compare <ArrowRight size={14} />
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!treePath || busy}
                                onClick={() => void git.openWorktreeInEditor(path, treePath, "zed").catch((error) => toast.error(errorText(error)))}
                            >
                                <Code2 size={14} /> Zed
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!treePath || busy}
                                onClick={() => void git.openWorktreeInEditor(path, treePath, "code").catch((error) => toast.error(errorText(error)))}
                            >
                                <ExternalLink size={14} /> VS Code
                            </Button>
                        </div>
                        {!otherTrees.length && <p className="inspector-hint">No secondary worktrees yet. Create one from the Worktrees tab.</p>}
                        {comparison && (
                            <div className="inspector-result">
                                <strong>Comparison result</strong>
                                <span>{comparison.divergence}</span>
                                <pre>{comparison.summary || "No committed differences"}</pre>
                            </div>
                        )}
                        <div className="inspector-subsection">
                            <div>
                                <strong>Worktree cleanup</strong>
                                <p>Remove stale Git metadata for deleted worktree directories.</p>
                            </div>
                            <div className="inspector-button-row">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => void maintenance("worktree-prune-dry-run", "Preview stale worktrees")}
                                >
                                    Preview
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={busy || !previewReady}
                                    onClick={() =>
                                        confirmAction(
                                            "worktree-prune",
                                            "Prune stale worktree metadata?",
                                            "Remove references to worktrees that are no longer present. Existing worktree directories will not be deleted.",
                                            "Prune metadata",
                                        )
                                    }
                                >
                                    <Trash2 size={14} /> Prune
                                </Button>
                            </div>
                        </div>
                        {preview && <pre className="inspector-preview">{preview}</pre>}
                    </Panel>
                </div>
                <div className="inspector-column">
                    <Panel
                        icon={HardDriveDownload}
                        title="Git LFS"
                        description="Large file storage and tracked objects"
                        action={
                            <span className={`inspector-status ${lfs?.installed ? "is-ok" : "is-muted"}`}>{lfs?.installed ? "Installed" : "Unavailable"}</span>
                        }
                    >
                        {lfs && (
                            <>
                                <div className="inspector-stat-row">
                                    <div>
                                        <span>Tracked objects</span>
                                        <strong>{lfs.fileCount ?? lfs.files.length}</strong>
                                    </div>
                                    <div>
                                        <span>Configuration</span>
                                        <strong>{lfs.tracked ? "Configured" : "Not configured"}</strong>
                                    </div>
                                </div>
                                <p
                                    className="inspector-hint"
                                    title={lfs.version || "Unknown"}
                                >
                                    {lfs.installed ? lfs.version : "Install Git LFS to use large-file features."}
                                </p>
                                {lfs.tracked && <pre className="inspector-preview">{lfs.tracked}</pre>}
                                {lfs.files.length > 0 && (
                                    <div
                                        className="inspector-submodule-list"
                                        role="group"
                                        aria-label="Tracked LFS files"
                                    >
                                        {lfs.files.map((file) => (
                                            <code key={file}>{file}</code>
                                        ))}
                                    </div>
                                )}
                                <div className="inspector-button-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || !lfs.installed}
                                        onClick={() =>
                                            confirmAction(
                                                "lfs-fetch",
                                                "Fetch Git LFS objects?",
                                                "Download missing LFS objects without updating working tree files.",
                                                "Fetch objects",
                                            )
                                        }
                                    >
                                        Fetch objects
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || !lfs.installed}
                                        onClick={() =>
                                            confirmAction(
                                                "lfs-pull",
                                                "Pull Git LFS objects?",
                                                "Download LFS objects and populate tracked files in this checkout. This can use substantial bandwidth.",
                                                "Pull objects",
                                            )
                                        }
                                    >
                                        <ArrowDownToLine size={14} /> Pull objects
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || !lfs.installed}
                                        onClick={() =>
                                            confirmAction(
                                                "lfs-checkout",
                                                "Restore local LFS objects?",
                                                "Replace LFS pointer files with locally available objects. Missing objects will not be downloaded.",
                                                "Checkout objects",
                                            )
                                        }
                                    >
                                        Restore local
                                    </Button>
                                </div>
                            </>
                        )}
                    </Panel>
                    <Panel
                        icon={FolderGit2}
                        title="Submodules"
                        description="Nested Git repositories and initialization"
                        action={<span className="inspector-status is-muted">{submodules?.configured ? `${submodules.status.length} entries` : "None"}</span>}
                    >
                        {submodules && (
                            <>
                                {submodules.configured ? (
                                    <div className="inspector-submodule-list">
                                        {submodules.entries?.length ? (
                                            submodules.entries.map((entry) => (
                                                <div
                                                    className="inspector-remote"
                                                    key={entry.path}
                                                >
                                                    <div className="inspector-remote-details">
                                                        <strong>{entry.path}</strong>
                                                        <span title={entry.revision}>{entry.revision.slice(0, 12)}</span>
                                                    </div>
                                                    <span className={`inspector-status ${entry.state === "ready" ? "is-ok" : "is-muted"}`}>{entry.state}</span>
                                                </div>
                                            ))
                                        ) : submodules.status.length ? (
                                            submodules.status.map((line) => <code key={line}>{line}</code>)
                                        ) : (
                                            <p>No active submodule entries.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="inspector-empty">
                                        <ShieldCheck size={16} /> This repository has no submodules.
                                    </div>
                                )}
                                <div className="inspector-button-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || !submodules.configured}
                                        onClick={() =>
                                            confirmAction(
                                                "submodule-sync",
                                                "Synchronize submodule URLs?",
                                                "Copy URLs from .gitmodules into local submodule configuration. Does not download repositories.",
                                                "Sync URLs",
                                            )
                                        }
                                    >
                                        Sync URLs
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || !submodules.configured}
                                        onClick={() =>
                                            confirmAction(
                                                "submodule-update",
                                                "Initialize and update submodules?",
                                                "Initialize missing submodules and fetch their configured revisions. This may download additional repositories.",
                                                "Update submodules",
                                            )
                                        }
                                    >
                                        <RefreshCw size={14} /> Initialize &amp; update
                                    </Button>
                                </div>
                            </>
                        )}
                    </Panel>
                    <Panel
                        icon={Search}
                        title="Search repositories"
                        description="Find files, branches and commits across your workspace"
                    >
                        <form
                            className="inspector-search-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void search();
                            }}
                        >
                            <Input
                                aria-label="Search query"
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setSearched(false);
                                }}
                                placeholder="Search your repositories…"
                                maxLength={200}
                            />
                            <Select
                                value={kind}
                                onValueChange={(value) => {
                                    setKind(value as SearchKind);
                                    setSearched(false);
                                }}
                            >
                                <SelectTrigger
                                    aria-label="Search category"
                                    className="inspector-search-kind"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="files">Files</SelectItem>
                                    <SelectItem value="branches">Branches</SelectItem>
                                    <SelectItem value="commits">Commits</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={busy || !query.trim()}
                            >
                                <Search size={14} /> Search
                            </Button>
                        </form>
                        <p className="inspector-hint">Searches up to 30 available repositories · 250 results maximum</p>
                        <div
                            className="inspector-search-results"
                            aria-live="polite"
                        >
                            {searched &&
                                (matches.length ? (
                                    <>
                                        <p className="inspector-field-label">{matches.length} results</p>
                                        {matches.map((match) => (
                                            <div
                                                className="inspector-search-match"
                                                key={`${match.path}:${kind}:${match.value}`}
                                            >
                                                <span>{match.repo}</span>
                                                <strong>{match.value}</strong>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    !busy && <div className="inspector-empty">No matching {kind} found.</div>
                                ))}
                        </div>
                    </Panel>
                </div>
            </div>
            <Dialog.Dialog
                open={confirmation !== null}
                onOpenChange={(open) => {
                    if (!open && !busy) setConfirmation(null);
                }}
            >
                <Dialog.DialogContent className="inspector-confirm-dialog">
                    <Dialog.DialogHeader>
                        <Dialog.DialogTitle>{confirmation?.title}</Dialog.DialogTitle>
                        <Dialog.DialogDescription>{confirmation?.description}</Dialog.DialogDescription>
                    </Dialog.DialogHeader>
                    <Dialog.DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => setConfirmation(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                if (!confirmation) return;
                                const action = confirmation;
                                setConfirmation(null);
                                void maintenance(action.action, action.label);
                            }}
                        >
                            {confirmation?.label}
                        </Button>
                    </Dialog.DialogFooter>
                </Dialog.DialogContent>
            </Dialog.Dialog>
        </div>
    );
}
