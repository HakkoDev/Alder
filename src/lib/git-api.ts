import { invoke } from "@tauri-apps/api/core";
import type { Branch, Commit, ConflictVersions, GitOperationState, ReflogInfo, RepoStatus, Repository, StashInfo, Workspace, WorktreeInfo } from "./types";

const call = <T>(command: string, args: Record<string, unknown> = {}) => invoke<T>(command, args);
export interface GitHubRepository {
    nameWithOwner: string;
    description: string;
    url: string;
    isPrivate: boolean;
    defaultBranchRef: { name: string } | null;
    viewerPermission: string;
}
export interface GitHubPullRequest {
    number: number;
    title: string;
    isDraft: boolean;
    state: string;
    author: { login: string };
    headRefName: string;
    baseRefName: string;
    reviewDecision: string;
    statusCheckRollup: { name?: string; status?: string; conclusion?: string; state?: string }[] | null;
    url: string;
    updatedAt: string;
}
export interface GitHubIssue {
    number: number;
    title: string;
    author: { login: string };
    labels: { name: string }[];
    url: string;
    updatedAt: string;
}
export interface GitHubIssueDetail extends GitHubIssue {
    body: string;
    state: string;
    comments: { author: { login: string }; body: string; id: string }[];
}
export interface GitHubPRDetail extends GitHubPullRequest {
    body: string;
    mergeable: string;
    latestReviews: { author: { login: string }; state: string }[];
    comments: { author: { login: string }; body: string }[];
    files: { path: string; additions: number; deletions: number }[];
    commits: { oid: string }[];
}
export interface GitHubNotification {
    id: string;
    reason: string;
    updated_at: string;
    subject: { title: string; type: string; url: string | null };
}
export interface GitHubRelease {
    id: number;
    tag_name: string;
    name: string | null;
    html_url: string;
    draft: boolean;
    prerelease: boolean;
    published_at: string | null;
}
export interface GitHubTag {
    name: string;
    commit: { sha: string };
}
export interface GitHubRateLimit {
    resources: { core?: { limit: number; remaining: number; reset: number }; graphql?: { limit: number; remaining: number; reset: number } };
}
export const github = {
    checkoutWorktree: (path: string, number: number, location: string) => call<string>("github_pr_checkout_worktree", { path, number, location }),
    notifications: (path: string, page = 1) => call<GitHubNotification[]>("github_notifications", { path, page }),
    releases: (path: string, page = 1) => call<GitHubRelease[]>("github_releases", { path, page }),
    tags: (path: string, page = 1) => call<GitHubTag[]>("github_tags", { path, page }),
    rateLimit: (path: string) => call<GitHubRateLimit>("github_rate_limit", { path }),
    auth: () => call<{ authenticated: boolean; message: string }>("github_auth"),
    repository: (path: string) => call<GitHubRepository>("github_repository", { path }),
    pulls: (path: string) => call<GitHubPullRequest[]>("github_pull_requests", { path }),
    issues: (path: string) => call<GitHubIssue[]>("github_issues", { path }),
    issueDetail: (path: string, number: number) => call<GitHubIssueDetail>("github_issue_detail", { path, number }),
    detail: (path: string, number: number) => call<GitHubPRDetail>("github_pr_detail", { path, number }),
    checks: (path: string, number: number) => call<{ statusCheckRollup: GitHubPullRequest["statusCheckRollup"] }>("github_pr_checks", { path, number }),
    create: (path: string, title: string, body: string, base: string, draft: boolean) => call<string>("github_pr_create", { path, title, body, base, draft }),
    review: (path: string, number: number, action: "approve" | "comment" | "request-changes", body: string) =>
        call<string>("github_pr_review", { path, number, action, body }),
};
export const git = {
    version: () => call<string>("git_version"),
    repositories: () => call<Repository[]>("list_repositories"),
    add: (path: string) => call<Repository>("add_repository", { path }),
    remove: (id: string) => call<void>("remove_repository", { id }),
    discover: (path: string, depth = 3) => call<number>("discover_repositories", { path, depth }),
    clone: (url: string, path: string) => call<Repository>("clone_repository", { url, path }),
    init: (path: string) => call<Repository>("init_repository", { path }),
    workspaces: () => call<Workspace[]>("list_workspaces"),
    createWorkspace: (name: string, color: string) => call<Workspace>("create_workspace", { name, color }),
    assignWorkspace: (repoId: string, workspaceId: string | null) => call<void>("assign_workspace", { repoId, workspaceId }),
    status: (path: string) => call<RepoStatus>("repo_status", { path }),
    history: (path: string, limit = 150) => call<Commit[]>("commit_history", { path, limit }),
    branches: (path: string) => call<Branch[]>("list_branches", { path }),
    diff: (path: string, file: string, staged = false) => call<string>("file_diff", { path, file, staged }),
    trashFile: (path: string, file: string) => call<void>("trash_file", { path, file }),
    ignoreFile: (path: string, file: string, localOnly: boolean) => call<void>("ignore_file", { path, file, localOnly }),
    openFile: (path: string, file: string) => call<void>("open_change_file", { path, file }),
    revealChangeFile: (path: string, file: string) => call<void>("reveal_change_file", { path, file }),
    detectEditors: () => call<{ id: string; label: string; available: boolean }[]>("detect_editors"),
    openInEditor: (path: string, file: string, editor: string) => call<void>("open_in_editor", { path, file, editor }),
    stage: (path: string, file: string) => call<void>("stage_file", { path, file }),
    unstage: (path: string, file: string) => call<void>("unstage_file", { path, file }),
    applyDiffSelection: (path: string, file: string, staged: boolean, hunk: number, line: number | null = null) =>
        call<void>("apply_diff_selection", { path, file, staged, hunk, line }),
    stageAll: (path: string) => call<void>("stage_all", { path }),
    changesBulkAction: (path: string, action: "unstage-all" | "discard-tracked" | "restore-all" | "trash-untracked" | "stash-pop") =>
        call<string>("changes_bulk_action", { path, action }),
    commit: (path: string, message: string, amend = false, tracked = false, skipHooks = false, signoff = false) =>
        call<string>("create_commit", { path, message, amend, tracked, skipHooks, signoff }),
    switchBranch: (path: string, name: string) => call<void>("switch_branch", { path, name }),
    createBranch: (path: string, name: string) => call<void>("create_branch", { path, name }),
    fetch: (path: string) => call<string>("fetch_repo", { path }),
    pull: (path: string) => call<string>("pull_repo", { path }),
    push: (path: string) => call<string>("push_repo", { path }),
    remotes: (path: string) => call<string[]>("list_remotes", { path }),
    network: (path: string, operation: "fetch" | "pull" | "pull-rebase" | "push" | "force-push", remote?: string) =>
        call<string>("git_network", { path, operation, remote: remote ?? null }),
    operationState: (path: string) => call<GitOperationState>("git_operation_state", { path }),
    worktrees: (path: string) => call<WorktreeInfo[]>("list_worktrees", { path }),
    addWorktree: (path: string, location: string, branchName: string, newBranch: boolean) =>
        call<void>("add_worktree", { path, location, branchName, newBranch }),
    removeWorktree: (path: string, location: string) => call<void>("remove_worktree", { path, location }),
    stashes: (path: string) => call<StashInfo[]>("list_stashes", { path }),
    createStash: (path: string, message: string, includeUntracked: boolean) => call<string>("create_stash", { path, message, includeUntracked }),
    stashAction: (path: string, reference: string, action: "show" | "apply" | "drop") => call<string>("stash_action", { path, reference, action }),
    merge: (path: string, source: string, squash: boolean) => call<string>("merge_branch", { path, source, squash }),
    rebase: (path: string, onto: string) => call<string>("rebase_branch", { path, onto }),
    sequenceAction: (path: string, operation: "merge" | "rebase" | "cherry-pick" | "revert", action: "abort" | "continue") =>
        call<string>("sequence_action", { path, operation, action }),
    resolveConflict: (path: string, file: string, side: "ours" | "theirs") => call<void>("resolve_conflict", { path, file, side }),
    commitOperation: (path: string, hash: string, kind: "cherry-pick" | "revert") => call<string>("commit_operation", { path, hash, kind }),
    reflog: (path: string) => call<ReflogInfo[]>("list_reflog", { path }),
    renameBranch: (path: string, oldName: string, newName: string) => call<void>("rename_branch", { path, oldName, newName }),
    deleteBranch: (path: string, name: string) => call<void>("delete_branch", { path, name }),
    recoverBranch: (path: string, hash: string, name: string) => call<void>("create_recovery_branch", { path, hash, name }),
    conflictVersions: (path: string, file: string) => call<ConflictVersions>("conflict_versions", { path, file }),
    saveConflict: (path: string, file: string, content: string) => call<void>("save_conflict_resolution", { path, file, content }),
    diagnostics: (path: string) => call<RepositoryDiagnostic>("repository_diagnostics", { path }),
    lfsStatus: (path: string) => call<LfsDiagnostic>("git_lfs_status", { path }),
    submodules: (path: string) => call<SubmoduleDiagnostic>("git_submodules", { path }),
    maintenance: (path: string, action: string) => call<string>("git_maintenance_action", { path, action }),
    openWorktreeInEditor: (path: string, location: string, editor: "zed" | "code") => call<void>("open_worktree_in_editor", { path, location, editor }),
    compareWorktrees: (path: string, location: string) => call<WorktreeComparison>("git_worktree_comparison", { path, location }),
    searchRepository: (path: string, query: string, kind: "branches" | "commits" | "files") => call<string[]>("search_repository", { path, query, kind }),
    setWorktreeLock: (path: string, location: string, locked: boolean) => call<void>("set_worktree_lock", { path, location, locked }),
};

export type RepositoryDiagnostic = {
    branch: string | null;
    upstream: string | null;
    remotes: { name: string; url: string | null; hasTrackingRefs: boolean }[];
    goneBranches: string[];
    missingIdentity: string[];
    issues: string[];
};
export type LfsDiagnostic = { installed: boolean; version: string | null; tracked: string; files: string[] };
export type SubmoduleDiagnostic = { configured: boolean; status: string[] };
export type WorktreeComparison = { left: string; right: string; summary: string; divergence: string };
