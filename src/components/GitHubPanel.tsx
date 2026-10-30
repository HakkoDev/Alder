import { ArrowUpRight, CircleAlert, CircleDot, GitBranch, GitPullRequest, LoaderCircle, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { type GitHubIssue, type GitHubPRDetail, type GitHubPullRequest, type GitHubRepository, github } from "../lib/git-api";
import { GitHubExtras } from "./GitHubExtras";
import { Button } from "./ui/button";
import * as Dialog from "./ui/dialog";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

type Tab = "prs" | "issues";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const external = (url: string) => {
    try {
        const u = new URL(url);
        if (u.protocol === "https:" && (u.hostname === "github.com" || u.hostname.endsWith(".github.com")))
            window.open(u.toString(), "_blank", "noopener,noreferrer");
    } catch {
        /* invalid provider URL */
    }
};
export function GitHubPanel({ path, onCounts }: { path: string; onCounts?: (prs: number | null, issues: number | null) => void }) {
    const [repo, setRepo] = useState<GitHubRepository | null>(null);
    const [prs, setPrs] = useState<GitHubPullRequest[]>([]);
    const [issues, setIssues] = useState<GitHubIssue[]>([]);
    const [tab, setTab] = useState<Tab>("prs");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState<number | null>(null);
    const [detail, setDetail] = useState<GitHubPRDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [base, setBase] = useState("main");
    const [draft, setDraft] = useState(false);
    const [review, setReview] = useState("");
    const [busy, setBusy] = useState(false);
    const [checkoutLocation, setCheckoutLocation] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        onCounts?.(null, null);
        try {
            await github.auth();
            const r = await github.repository(path);
            setRepo(r);
            setBase(r.defaultBranchRef?.name || "main");
            const [p, i] = await Promise.allSettled([github.pulls(path), github.issues(path)]);
            if (p.status === "fulfilled") {
                setPrs(p.value);
            } else {
                setPrs([]);
                toast.error(`Pull requests: ${message(p.reason)}`);
            }
            if (i.status === "fulfilled") {
                setIssues(i.value);
            } else {
                setIssues([]);
                toast.error(`Issues: ${message(i.reason)}`);
            }
            onCounts?.(p.status === "fulfilled" ? p.value.length : null, i.status === "fulfilled" ? i.value.length : null);
        } catch (e) {
            setRepo(null);
            setPrs([]);
            setIssues([]);
            setError(message(e));
        } finally {
            setLoading(false);
        }
    }, [path, onCounts]);
    useEffect(() => {
        void load();
        return () => onCounts?.(null, null);
    }, [load, onCounts]);
    useEffect(() => {
        let cancelled = false;
        if (selected === null) {
            setDetail(null);
            return;
        }
        setDetailLoading(true);
        setDetail(null);
        void github
            .detail(path, selected)
            .then((v) => {
                if (!cancelled) setDetail(v);
            })
            .catch((e) => {
                if (!cancelled) toast.error(message(e));
            })
            .finally(() => {
                if (!cancelled) setDetailLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [path, selected]);
    const create = async () => {
        setBusy(true);
        try {
            const url = await github.create(path, title, body, base, draft);
            toast.success("Pull request created");
            setCreating(false);
            setTitle("");
            setBody("");
            if (url.trim()) external(url.trim());
            await load();
        } catch (e) {
            toast.error(message(e));
        } finally {
            setBusy(false);
        }
    };
    const checkout = async () => {
        if (selected === null || !checkoutLocation.trim()) return;
        setBusy(true);
        try {
            await github.checkoutWorktree(path, selected, checkoutLocation.trim());
            toast.success("PR checked out into a separate worktree");
            setCheckoutLocation("");
            setSelected(null);
        } catch (e) {
            toast.error(message(e));
        } finally {
            setBusy(false);
        }
    };
    const submitReview = async (action: "approve" | "comment" | "request-changes") => {
        if (selected === null) return;
        setBusy(true);
        try {
            await github.review(path, selected, action, review);
            toast.success("Review submitted");
            setReview("");
            setSelected(null);
            await load();
        } catch (e) {
            toast.error(message(e));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="github-panel">
            <div className="card-bar">
                <div>
                    <h2>GitHub</h2>
                    <p>{repo ? repo.nameWithOwner : "Pull requests, issues and checks"}</p>
                </div>
                <div className="advanced-actions">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void load()}
                        disabled={loading}
                    >
                        <RefreshCw size={14} /> Refresh
                    </Button>
                    <Button
                        size="sm"
                        disabled={!repo || loading}
                        onClick={() => setCreating(true)}
                    >
                        <Plus size={14} /> New PR
                    </Button>
                </div>
            </div>
            {loading ? (
                <div
                    className="github-loading"
                    aria-label="Loading GitHub data"
                >
                    {[1, 2, 3, 4].map((n) => (
                        <Skeleton
                            key={n}
                            className="h-14"
                        />
                    ))}
                    <span>
                        <LoaderCircle
                            size={14}
                            className="spin"
                        />{" "}
                        Loading GitHub…
                    </span>
                </div>
            ) : error ? (
                <div className="github-connect">
                    <CircleAlert size={22} />
                    <h3>GitHub connection unavailable</h3>
                    <p>{error}</p>
                    <p>
                        Install the GitHub CLI, run <code>gh auth login</code> in your terminal, and ensure this repository has a GitHub remote. Alder never
                        stores your GitHub token.
                    </p>
                    <div className="github-connect-actions">
                        <Button
                            variant="outline"
                            onClick={() => void load()}
                        >
                            Retry connection
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => window.open("https://cli.github.com/manual/", "_blank", "noopener,noreferrer")}
                        >
                            GitHub CLI documentation <ArrowUpRight size={14} />
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="github-tabs">
                        <Button
                            variant="ghost"
                            title="Open GitHub CLI documentation"
                            onClick={() => window.open("https://cli.github.com/manual/", "_blank", "noopener,noreferrer")}
                        >
                            CLI docs <ArrowUpRight size={14} />
                        </Button>
                        <Button
                            variant={tab === "prs" ? "secondary" : "ghost"}
                            onClick={() => setTab("prs")}
                        >
                            <GitPullRequest size={15} /> Pull requests <span>{prs.length}</span>
                        </Button>
                        <Button
                            variant={tab === "issues" ? "secondary" : "ghost"}
                            onClick={() => setTab("issues")}
                        >
                            <CircleDot size={15} /> Issues <span>{issues.length}</span>
                        </Button>
                        {repo && (
                            <Button
                                variant="ghost"
                                onClick={() => external(repo.url)}
                            >
                                <ArrowUpRight size={15} /> Open on GitHub
                            </Button>
                        )}
                    </div>
                    {tab === "prs" ? (
                        prs.length ? (
                            prs.map((pr) => (
                                <button
                                    key={pr.number}
                                    className="github-item"
                                    onClick={() => setSelected(pr.number)}
                                >
                                    <GitPullRequest size={17} />
                                    <div>
                                        <strong>{pr.title}</strong>
                                        <span>
                                            #{pr.number} · {pr.author?.login} · {pr.headRefName} → {pr.baseRefName}
                                        </span>
                                    </div>
                                    <span className="subtle-tag">{pr.isDraft ? "Draft" : pr.reviewDecision || "Open"}</span>
                                </button>
                            ))
                        ) : (
                            <p className="github-empty">No open pull requests.</p>
                        )
                    ) : issues.length ? (
                        issues.map((issue) => (
                            <button
                                key={issue.number}
                                className="github-item"
                                onClick={() => external(issue.url)}
                            >
                                <CircleDot size={17} />
                                <div>
                                    <strong>{issue.title}</strong>
                                    <span>
                                        #{issue.number} · {issue.author?.login}
                                    </span>
                                </div>
                                <ArrowUpRight size={15} />
                            </button>
                        ))
                    ) : (
                        <p className="github-empty">No open issues.</p>
                    )}
                </>
            )}
            {!loading && !error && repo && <GitHubExtras path={path} />}
            <Dialog.Dialog
                open={creating}
                onOpenChange={setCreating}
            >
                <Dialog.DialogContent className="github-dialog">
                    <Dialog.DialogHeader>
                        <Dialog.DialogTitle>Create pull request</Dialog.DialogTitle>
                        <Dialog.DialogDescription>Publish your current branch to GitHub before creating its PR.</Dialog.DialogDescription>
                    </Dialog.DialogHeader>
                    <label>
                        Title
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Describe your changes"
                        />
                    </label>
                    <label>
                        Base branch
                        <Input
                            value={base}
                            onChange={(e) => setBase(e.target.value)}
                        />
                    </label>
                    <label>
                        Description
                        <textarea
                            rows={5}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </label>
                    <label className="github-checkbox">
                        <input
                            type="checkbox"
                            checked={draft}
                            onChange={(e) => setDraft(e.target.checked)}
                        />{" "}
                        Draft pull request
                    </label>
                    <Dialog.DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreating(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={busy || !title.trim() || !base.trim()}
                            onClick={() => void create()}
                        >
                            Create PR
                        </Button>
                    </Dialog.DialogFooter>
                </Dialog.DialogContent>
            </Dialog.Dialog>
            <Dialog.Dialog
                open={selected !== null}
                onOpenChange={(open) => {
                    if (!open) setSelected(null);
                }}
            >
                <Dialog.DialogContent className="github-dialog">
                    <Dialog.DialogHeader>
                        <Dialog.DialogTitle>{detail ? `#${detail.number} ${detail.title}` : "Pull request details"}</Dialog.DialogTitle>
                        <Dialog.DialogDescription>Review GitHub checks and submit a review.</Dialog.DialogDescription>
                    </Dialog.DialogHeader>
                    {detailLoading ? (
                        <Skeleton className="h-40" />
                    ) : detail ? (
                        <div className="github-detail">
                            <p>{detail.body || "No description"}</p>
                            <div className="github-checks">
                                <strong>
                                    <ShieldCheck size={15} /> Checks
                                </strong>
                                {detail.statusCheckRollup?.length ? (
                                    detail.statusCheckRollup.map((c, i) => (
                                        <span key={i}>
                                            {c.name ?? "Check"}: {c.conclusion || c.state || c.status || "Pending"}
                                        </span>
                                    ))
                                ) : (
                                    <span>No checks reported</span>
                                )}
                            </div>
                            <div className="github-checks">
                                <strong>
                                    <GitBranch size={15} /> Changed files ({detail.files?.length ?? 0})
                                </strong>
                                {detail.files?.slice(0, 25).map((f) => (
                                    <span key={f.path}>
                                        {f.path}{" "}
                                        <small>
                                            +{f.additions} −{f.deletions}
                                        </small>
                                    </span>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => external(detail.url)}
                            >
                                View full diff on GitHub <ArrowUpRight size={14} />
                            </Button>
                            <label>
                                Checkout into new worktree
                                <Input
                                    value={checkoutLocation}
                                    onChange={(e) => setCheckoutLocation(e.target.value)}
                                    placeholder="Absolute path to a new directory"
                                />
                            </label>
                            <Button
                                variant="outline"
                                disabled={busy || !checkoutLocation.trim()}
                                onClick={() => void checkout()}
                            >
                                Checkout PR into worktree
                            </Button>
                            <label>
                                Review comment
                                <textarea
                                    rows={3}
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                />
                            </label>
                            <div className="advanced-actions">
                                <Button
                                    disabled={busy}
                                    onClick={() => void submitReview("approve")}
                                >
                                    Approve
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={busy || !review.trim()}
                                    onClick={() => void submitReview("comment")}
                                >
                                    Comment
                                </Button>
                                <Button
                                    variant="destructive"
                                    disabled={busy || !review.trim()}
                                    onClick={() => void submitReview("request-changes")}
                                >
                                    Request changes
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p>Unable to load pull request.</p>
                    )}
                </Dialog.DialogContent>
            </Dialog.Dialog>
        </div>
    );
}
