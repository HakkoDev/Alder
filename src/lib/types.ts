export interface Workspace {
    id: string;
    name: string;
    color: string;
}
export interface Repository {
    id: string;
    name: string;
    path: string;
    workspaceId: string | null;
    branch: string;
    modified: number;
    staged: number;
    ahead: number;
    behind: number;
    available: boolean;
}
export interface Change {
    path: string;
    indexStatus: string;
    worktreeStatus: string;
    staged: boolean;
    unstaged: boolean;
    untracked: boolean;
    additions: number;
    deletions: number;
}
export interface Commit {
    hash: string;
    shortHash: string;
    parents: string[];
    author: string;
    date: string;
    subject: string;
    refs: string;
}
export interface Branch {
    name: string;
    current: boolean;
    remote: boolean;
}
export interface RepoStatus {
    path: string;
    branch: string;
    upstream: string | null;
    ahead: number;
    behind: number;
    changes: Change[];
}
export type View = "overview" | "changes" | "history" | "branches" | "worktrees" | "operations" | "pulls" | "agents";

export interface WorktreeInfo {
    path: string;
    branch: string;
    head: string;
    current: boolean;
    locked: boolean;
    bare: boolean;
}
export interface StashInfo {
    reference: string;
    message: string;
}
export interface ReflogInfo {
    hash: string;
    selector: string;
    subject: string;
}
export interface GitOperationState {
    merging: boolean;
    rebasing: boolean;
    cherryPicking: boolean;
    reverting: boolean;
    conflicts: string[];
}

export interface ConflictVersions {
    base: string | null;
    ours: string | null;
    theirs: string | null;
}
