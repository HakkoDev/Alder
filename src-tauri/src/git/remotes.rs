use crate::*;

#[tauri::command]
pub(crate) fn switch_branch(path: String, name: String) -> Result<(), String> {
    git_run(&repo_root(&path)?, &["switch", "--", &name]).map(|_| ())
}
#[tauri::command]
pub(crate) fn create_branch(path: String, name: String) -> Result<(), String> {
    if name.is_empty() {
        return Err("Enter a branch name".into());
    }
    let o = git_raw(&["check-ref-format", "--branch", &name])?;
    if !o.status.success() {
        return Err("Invalid Git branch name".into());
    }
    git_run(&repo_root(&path)?, &["switch", "-c", &name]).map(|_| ())
}
// Network operations are constrained to allow-listed modes and validated remote names.
// The frontend never passes raw Git options or arbitrary command fragments.
pub(crate) fn network_op(path: String, what: &str, remote: Option<String>) -> Result<String, String> {
    let root = repo_root(&path)?;
    let valid_remote = remote
        .as_ref()
        .map(|r| {
            if r.is_empty() || r.starts_with('-') || r.chars().any(|c| c.is_control() || c.is_whitespace()) {
                return Err("Invalid remote name".to_string());
            }
            let remotes = git_run(&root, &["remote"])?;
            if !remotes.lines().any(|name| name == r) {
                return Err("Remote is not configured for this repository".into());
            }
            Ok(r.as_str())
        })
        .transpose()?;
    match what {
        "fetch" => match valid_remote {
            Some(r) => git_run(&root, &["fetch", "--prune", r]),
            None => git_run(&root, &["fetch", "--all", "--prune"]),
        },
        "pull" => {
            ensure_clean(&root)?;
            match valid_remote {
                Some(r) => git_run(&root, &["pull", "--ff-only", r]),
                None => git_run(&root, &["pull", "--ff-only"]),
            }
        }
        "pull-rebase" => {
            ensure_clean(&root)?;
            match valid_remote {
                Some(r) => git_run(&root, &["pull", "--rebase", r]),
                None => git_run(&root, &["pull", "--rebase"]),
            }
        }
        "push" => match valid_remote {
            Some(r) => git_run(&root, &["push", r]),
            None => git_run(&root, &["push"]),
        },
        "force-push" => match valid_remote {
            Some(r) => git_run(&root, &["push", "--force-with-lease", r]),
            None => git_run(&root, &["push", "--force-with-lease"]),
        },
        _ => Err("Unknown network operation".into()),
    }
}
#[tauri::command]
pub(crate) fn list_remotes(path: String) -> Result<Vec<String>, String> {
    let names = git_run(&repo_root(&path)?, &["remote"])?;
    Ok(names.lines().map(str::to_string).collect())
}
#[tauri::command]
pub(crate) async fn git_network(path: String, operation: String, remote: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || network_op(path, &operation, remote))
        .await
        .map_err(err)?
}
#[tauri::command]
pub(crate) async fn fetch_repo(path: String) -> Result<String, String> {
    git_network(path, "fetch".into(), None).await
}
#[tauri::command]
pub(crate) async fn pull_repo(path: String) -> Result<String, String> {
    git_network(path, "pull".into(), None).await
}
#[tauri::command]
pub(crate) async fn push_repo(path: String) -> Result<String, String> {
    git_network(path, "push".into(), None).await
}
