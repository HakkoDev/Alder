import { ArrowUpRight, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { type GitHubNotification, type GitHubRateLimit, type GitHubRelease, type GitHubTag, github } from "../lib/git-api";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

type Section = "notifications" | "releases" | "tags" | "limits";
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const githubLink = (value: string) => {
    try {
        const url = new URL(value);
        if (url.protocol === "https:" && url.hostname === "github.com") window.open(url.href, "_blank", "noopener,noreferrer");
    } catch {
        /* ignore invalid links */
    }
};
export function GitHubExtras({ path }: { path: string }) {
    const [section, setSection] = useState<Section>("notifications");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState<Array<GitHubNotification | GitHubRelease | GitHubTag>>([]);
    const [limits, setLimits] = useState<GitHubRateLimit | null>(null);
    const [error, setError] = useState("");
    const refresh = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            if (section === "limits") {
                setLimits(await github.rateLimit(path));
                setEntries([]);
            } else {
                const result =
                    section === "notifications"
                        ? await github.notifications(path, page)
                        : section === "releases"
                          ? await github.releases(path, page)
                          : await github.tags(path, page);
                setEntries(result);
                setLimits(null);
            }
        } catch (e) {
            setError(errorText(e));
            toast.error(`GitHub ${section}: ${errorText(e)}`);
        } finally {
            setLoading(false);
        }
    }, [path, section, page]);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    const changeSection = (next: Section) => {
        setSection(next);
        setPage(1);
        setEntries([]);
        setLimits(null);
    };
    return (
        <section
            className="github-extras"
            aria-label="GitHub repository extras"
        >
            <div className="card-bar">
                <div>
                    <h3>Repository activity</h3>
                    <p>GitHub notifications, releases, tags and API limits</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refresh()}
                    disabled={loading}
                >
                    <RefreshCw size={14} /> Refresh
                </Button>
            </div>
            <div className="github-tabs">
                {(["notifications", "releases", "tags", "limits"] as const).map((item) => (
                    <Button
                        key={item}
                        size="sm"
                        variant={section === item ? "secondary" : "ghost"}
                        onClick={() => changeSection(item)}
                    >
                        {item[0].toUpperCase() + item.slice(1)}
                    </Button>
                ))}
            </div>
            {loading ? (
                <div aria-label="Loading GitHub activity">
                    {[0, 1, 2].map((n) => (
                        <Skeleton
                            key={n}
                            className="h-12"
                        />
                    ))}
                    <LoaderCircle
                        className="spin"
                        size={16}
                    />
                </div>
            ) : error ? (
                <p role="alert">{error}</p>
            ) : section === "limits" ? (
                <div className="github-checks">
                    {(["core", "graphql"] as const).map((key) => {
                        const v = limits?.resources?.[key];
                        return v ? (
                            <p key={key}>
                                {key}: {v.remaining} of {v.limit} requests remaining, resets {new Date(v.reset * 1000).toLocaleString()}
                            </p>
                        ) : null;
                    })}
                </div>
            ) : entries.length === 0 ? (
                <p className="github-empty">No {section} to display.</p>
            ) : (
                entries.map((entry, i) => {
                    if (section === "notifications") {
                        const item = entry as GitHubNotification;
                        return (
                            <div
                                className="github-item"
                                key={item.id}
                            >
                                <div>
                                    <strong>{item.subject.title}</strong>
                                    <span>
                                        {item.subject.type} · {item.reason} · {new Date(item.updated_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        );
                    }
                    if (section === "releases") {
                        const item = entry as GitHubRelease;
                        return (
                            <button
                                className="github-item"
                                key={item.id}
                                onClick={() => githubLink(item.html_url)}
                            >
                                <div>
                                    <strong>{item.name || item.tag_name}</strong>
                                    <span>
                                        {item.tag_name}
                                        {item.prerelease ? " · prerelease" : ""}
                                        {item.draft ? " · draft" : ""}
                                    </span>
                                </div>
                                <ArrowUpRight size={15} />
                            </button>
                        );
                    }
                    const item = entry as GitHubTag;
                    return (
                        <div
                            className="github-item"
                            key={item.name + i}
                        >
                            <div>
                                <strong>{item.name}</strong>
                                <span>{item.commit.sha.slice(0, 12)}</span>
                            </div>
                        </div>
                    );
                })
            )}
            {section !== "limits" && (
                <div className="advanced-actions">
                    <Button
                        variant="outline"
                        disabled={loading || page === 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        Previous
                    </Button>
                    <span>Page {page}</span>
                    <Button
                        variant="outline"
                        disabled={loading || entries.length < 30 || page >= 100}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </section>
    );
}
