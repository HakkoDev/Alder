import { ArrowDownLeft, ArrowUpRight, CircleDot, FileCode2, FolderGit2, GitBranch, GitPullRequest, History, Layers3 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { FooterAction } from "@/components/app/FooterAction";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";
import { useRegistryStore } from "@/features/repositories/registry-store";

type Props = Pick<AppController, "activeRepo" | "status" | "worktrees" | "stashes" | "githubCounts" | "changed">;
export function AppFooter(props: Props) {
    const { setView } = useNavigationStore(useShallow((state) => ({ setView: state.setView })));
    const { repos } = useRegistryStore(useShallow((state) => ({ repos: state.repos })));
    const { activeRepo, status, worktrees, stashes, githubCounts, changed } = props;
    return (
        <div
            role="status"
            className="footer-bar"
            aria-label="Repository status"
        >
            {activeRepo ? (
                <>
                    <FooterAction
                        title={`Current branch: ${status?.branch ?? activeRepo.branch}. Click to view branches.`}
                        onClick={() => setView("branches")}
                    >
                        <GitBranch size={13} /> {status?.branch ?? activeRepo.branch}
                    </FooterAction>
                    <FooterAction
                        title={`${status?.changes.length ?? activeRepo.modified + activeRepo.staged} changed files. Click to open working tree.`}
                        onClick={() => setView("changes")}
                    >
                        <FileCode2 size={13} /> {status?.changes.length ?? activeRepo.modified + activeRepo.staged} changes
                    </FooterAction>
                    <FooterAction
                        title={`Upstream: ${status?.upstream ?? "not configured"}. ${status?.ahead ?? 0} ahead, ${status?.behind ?? 0} behind. Click for Git operations.`}
                        onClick={() => setView("operations")}
                    >
                        <ArrowUpRight size={13} /> {status?.ahead ?? activeRepo.ahead} <ArrowDownLeft size={13} /> {status?.behind ?? activeRepo.behind}
                    </FooterAction>
                    <FooterAction
                        title={`${worktrees.length} worktrees. Click to manage.`}
                        onClick={() => setView("worktrees")}
                    >
                        <Layers3 size={13} /> {worktrees.length} worktrees
                    </FooterAction>
                    <FooterAction
                        title={`${stashes.length} local stashes. Click to inspect.`}
                        onClick={() => setView("operations")}
                    >
                        <History size={13} /> {stashes.length} stashes
                    </FooterAction>
                    <FooterAction
                        title="Open GitHub pull requests (up to 100). Click to view."
                        onClick={() => setView("pulls")}
                    >
                        <GitPullRequest size={13} /> PRs {githubCounts.prs ?? "—"}
                    </FooterAction>
                    <FooterAction
                        title="Open GitHub issues (up to 100). Click to view."
                        onClick={() => setView("pulls")}
                    >
                        <CircleDot size={13} /> Issues {githubCounts.issues ?? "—"}
                    </FooterAction>
                </>
            ) : (
                <FooterAction
                    title={`${repos.length} registered repositories; ${changed} have changes. Click for overview.`}
                    onClick={() => setView("overview")}
                >
                    <FolderGit2 size={13} /> {repos.length} repositories · {changed} with changes
                </FooterAction>
            )}
            <span className="footer-version">Alder v0.3.6</span>
        </div>
    );
}
