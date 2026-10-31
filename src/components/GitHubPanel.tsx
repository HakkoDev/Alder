import { ArrowUpRight, CircleAlert, CircleDot, GitBranch, GitPullRequest, LoaderCircle, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { openGitHubUrl } from "../lib/external";
import { type GitHubIssue, type GitHubIssueDetail, type GitHubPRDetail, type GitHubPullRequest, type GitHubRepository, github } from "../lib/git-api";
import { GitHubExtras } from "./GitHubExtras";
import { MarkdownBody } from "./github/MarkdownBody";
import { Button } from "./ui/button";
import * as Dialog from "./ui/dialog";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

type Tab = "prs" | "issues";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const external = (url: string) => void openGitHubUrl(url);
export function GitHubPanel({ path, onCounts }: { path: string; onCounts?: (prs: number | null, issues: number | null) => void }) {
    const [repo, setRepo] = useState<GitHubRepository | null>(null);
    const [prs, setPrs] = useState<GitHubPullRequest[]>([]);
    const [issues, setIssues] = useState<GitHubIssue[]>([]);
    const [tab, setTab] = useState<Tab>("prs");
    const [showActivity, setShowActivity] = useState(false);
    const [visibleCount, setVisibleCount] = useState(40);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [authGuide, setAuthGuide] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [selectedIssue, setSelectedIssue] = useState<number | null>(null);
    const [issueDetail, setIssueDetail] = useState<GitHubIssueDetail | null>(null);
    const [issueLoading, setIssueLoading] = useState(false);
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
    const requestVersion = useRef(0);
    const onCountsRef = useRef(onCounts);
    useEffect(() => {
        onCountsRef.current = onCounts;
    }, [onCounts]);
    const load = useCallback(async () => {
        const version = ++requestVersion.current;
        setLoading(true);
        setError("");
        try {
            await github.auth();
            const r = await github.repository(path);
            if (version !== requestVersion.current) return;
            setRepo(r);
            setBase(r.defaultBranchRef?.name || "main");
            // A single on-demand list request rather than loading all GitHub views at once.
            if (tab === "prs") {
                const result = await github.pulls(path);
                if (version !== requestVersion.current) return;
                setPrs(result);
                onCountsRef.current?.(result.length, null);
            } else {
                const result = await github.issues(path);
                if (version !== requestVersion.current) return;
                setIssues(result);
                onCountsRef.current?.(null, result.length);
            }
        } catch (e) {
            if (version !== requestVersion.current) return;
            setError(message(e));
        } finally {
            if (version === requestVersion.current) setLoading(false);
        }
    }, [path, tab]);
    useEffect(() => {
        void load();
        return () => {
            requestVersion.current += 1;
        };
    }, [load]);
    useEffect(() => {
        setVisibleCount(40);
    }, []);
    useEffect(() => {
        setSelected(null);
        setSelectedIssue(null);
        setShowActivity(false);
    }, []);
    useEffect(() => {
        let cancelled = false;
        if (selectedIssue === null) {
            setIssueDetail(null);
            return;
        }
        setIssueLoading(true);
        setIssueDetail(null);
        void github
            .issueDetail(path, selectedIssue)
            .then((value) => {
                if (!cancelled) setIssueDetail(value);
            })
            .catch((error) => {
                if (!cancelled) toast.error(message(error));
            })
            .finally(() => {
                if (!cancelled) setIssueLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [path, selectedIssue]);
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
                    role="status"
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
                    <p className="small-muted">
                        {error.toLowerCase().includes("not found") || error.toLowerCase().includes("not installed")
                            ? "GitHub CLI was not detected. Install it and restart Alder so the installed application can discover it."
                            : error.toLowerCase().includes("auth") || error.toLowerCase().includes("login")
                              ? "GitHub CLI is present, but this account needs authentication or renewed access."
                              : "Check the repository's GitHub remote, connectivity and GitHub CLI authentication."}
                    </p>
                    {authGuide && (
                        <div className="content-card">
                            <strong>Connect GitHub CLI</strong>
                            <p>Open PowerShell or your terminal and run:</p>
                            <pre>gh auth login</pre>
                            <p>Then verify with:</p>
                            <pre>gh auth status</pre>
                            <p>Return to Alder and select Retry connection. Credentials stay with GitHub CLI.</p>
                        </div>
                    )}
                    <div className="github-connect-actions">
                        <Button
                            variant="outline"
                            onClick={() => setAuthGuide((value) => !value)}
                        >
                            {authGuide ? "Hide setup" : "Setup / reconnect"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => void load()}
                        >
                            Retry connection
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => void openGitHubUrl("https://cli.github.com/manual/")}
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
                            onClick={() => void openGitHubUrl("https://cli.github.com/manual/")}
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
                            prs.slice(0, visibleCount).map((pr) => (
                                <button
                                    type="button"
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
                        issues.slice(0, visibleCount).map((issue) => (
                            <button
                                type="button"
                                key={issue.number}
                                className="github-item"
                                onClick={() => setSelectedIssue(issue.number)}
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
            {!loading && !error && (tab === "prs" ? prs.length : issues.length) > visibleCount && (
                <div className="github-load-more">
                    <Button
                        variant="outline"
                        onClick={() => setVisibleCount((count) => count + 40)}
                    >
                        Show 40 more
                    </Button>
                </div>
            )}
            {!loading && !error && repo && (
                <section className="github-activity-panel">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowActivity((value) => !value)}
                    >
                        {showActivity ? "Hide repository activity" : "Show notifications, releases, tags and API limits"}
                    </Button>
                    {showActivity && <GitHubExtras path={path} />}
                </section>
            )}
            <Dialog.Dialog
                open={selectedIssue !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedIssue(null);
                }}
            >
                <Dialog.DialogContent className="github-dialog github-detail-dialog">
                    <Dialog.DialogHeader>
                        <Dialog.DialogTitle>{issueDetail ? `#${issueDetail.number} ${issueDetail.title}` : "Issue details"}</Dialog.DialogTitle>
                        <Dialog.DialogDescription>Issue description and discussion</Dialog.DialogDescription>
                    </Dialog.DialogHeader>
                    {issueLoading ? (
                        <Skeleton className="h-40" />
                    ) : issueDetail ? (
                        <div className="github-detail">
                            <MarkdownBody body={issueDetail.body} />
                            {issueDetail.comments?.map((comment) => (
                                <div
                                    className="github-comment"
                                    key={comment.id}
                                >
                                    <strong>{comment.author?.login || "Contributor"}</strong>
                                    <MarkdownBody body={comment.body} />
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                onClick={() => external(issueDetail.url)}
                            >
                                Open issue on GitHub <ArrowUpRight size={14} />
                            </Button>
                        </div>
                    ) : (
                        <p>Unable to load issue details.</p>
                    )}
                </Dialog.DialogContent>
            </Dialog.Dialog>
            <Dialog.Dialog
                open={creating}
                onOpenChange={setCreating}
            >
                <Dialog.DialogContent className="github-dialog">
                    <Dialog.DialogHeader>
                        <Dialog.DialogTitle>Create pull request</Dialog.DialogTitle>
                        <Dialog.DialogDescription>Publish your current branch to GitHub before creating its PR.</Dialog.DialogDescription>
                    </Dialog.DialogHeader>
                    <label htmlFor="github-pr-title">
                        Title
                        <Input
                            id="github-pr-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Describe your changes"
                        />
                    </label>
                    <label htmlFor="github-pr-base">
                        Base branch
                        <Input
                            id="github-pr-base"
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
                            <MarkdownBody body={detail.body} />
                            <div className="github-checks">
                                <strong>
                                    <ShieldCheck size={15} /> Checks
                                </strong>
                                {detail.statusCheckRollup?.length ? (
                                    detail.statusCheckRollup.map((c) => (
                                        <span key={JSON.stringify(c)}>
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
                            <label htmlFor="github-pr-worktree">
                                Checkout into new worktree
                                <Input
                                    id="github-pr-worktree"
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
