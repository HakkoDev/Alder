use rusqlite::{params, Connection};
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::process::{Output, Stdio};
use tauri::{Manager, State};
use uuid::Uuid;

struct AppState {
    db: PathBuf,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Workspace {
    id: String,
    name: String,
    color: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Repository {
    id: String,
    name: String,
    path: String,
    workspace_id: Option<String>,
    branch: String,
    modified: usize,
    staged: usize,
    ahead: usize,
    behind: usize,
    available: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Change {
    path: String,
    index_status: String,
    worktree_status: String,
    staged: bool,
    unstaged: bool,
    untracked: bool,
    additions: usize,
    deletions: usize,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RepoStatus {
    path: String,
    branch: String,
    upstream: Option<String>,
    ahead: usize,
    behind: usize,
    changes: Vec<Change>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Commit {
    hash: String,
    short_hash: String,
    parents: Vec<String>,
    author: String,
    date: String,
    subject: String,
    refs: String,
}
#[derive(Serialize)]
struct Branch {
    name: String,
    current: bool,
    remote: bool,
}

mod git;
mod github;
mod process;
mod repository;
mod updater;

use git::*;
use repository::*;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Development builds have no signing key or update endpoint.
            // The updater plugin rejects a missing/null config at startup.
            // Register it only for configured signed release builds.
            if updater::is_updater_configured(app.config()) {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            }
            let dir = app.path().app_data_dir()?;
            fs::create_dir_all(&dir)?;
            let db = dir.join("alder.sqlite");
            database(&db).map_err(std::io::Error::other)?;
            app.manage(AppState { db });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            process::open_external_url,
            updater::updater_configuration,
            repository::commands::git_version,
            repository::commands::list_repositories,
            repository::commands::add_repository,
            repository::commands::remove_repository,
            repository::commands::discover_repositories,
            repository::commands::init_repository,
            repository::commands::clone_repository,
            repository::commands::list_workspaces,
            repository::commands::create_workspace,
            repository::commands::assign_workspace,
            git::history::repo_status,
            git::history::commit_history,
            git::history::list_branches,
            git::changes::file_diff,
            git::changes::trash_file,
            git::changes::ignore_file,
            git::changes::open_change_file,
            git::changes::reveal_change_file,
            git::changes::detect_editors,
            git::changes::open_in_editor,
            git::changes::stage_file,
            git::changes::unstage_file,
            git::changes::stage_all,
            git::changes::changes_bulk_action,
            git::changes::apply_diff_selection,
            git::changes::create_commit,
            git::remotes::switch_branch,
            git::remotes::create_branch,
            git::remotes::fetch_repo,
            git::remotes::pull_repo,
            git::remotes::push_repo,
            git::remotes::git_network,
            git::remotes::list_remotes,
            git::advanced::worktrees::git_operation_state,
            git::advanced::worktrees::list_worktrees,
            git::advanced::worktrees::add_worktree,
            git::advanced::worktrees::remove_worktree,
            git::advanced::stashes::list_stashes,
            git::advanced::stashes::create_stash,
            git::advanced::stashes::stash_action,
            git::advanced::operations::merge_branch,
            git::advanced::operations::rebase_branch,
            git::advanced::operations::sequence_action,
            git::advanced::operations::resolve_conflict,
            git::advanced::operations::commit_operation,
            git::advanced::recovery::list_reflog,
            git::advanced::recovery::rename_branch,
            git::advanced::recovery::delete_branch,
            git::advanced::recovery::create_recovery_branch,
            git::advanced::conflicts::conflict_versions,
            git::advanced::conflicts::save_conflict_resolution,
            git::advanced::worktrees::set_worktree_lock,
            github::github_auth,
            github::github_repository,
            github::github_pull_requests,
            github::github_issues,
            github::github_issue_detail,
            github::github_pr_detail,
            github::github_pr_create,
            github::github_pr_review,
            github::github_pr_checks,
            github::github_pr_checkout_worktree,
            github::github_notifications,
            github::github_releases,
            github::github_tags,
            github::github_rate_limit,
        ])
        .run(tauri::generate_context!())
        .expect("Could not start Alder");
}
