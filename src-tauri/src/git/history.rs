use crate::*;

#[tauri::command]
pub(crate) async fn repo_status(path: String) -> Result<RepoStatus, String> {
    tauri::async_runtime::spawn_blocking(move || repo_status_blocking(path))
        .await
        .map_err(|error| format!("Git worker failed: {error}"))?
}
fn repo_status_blocking(path: String) -> Result<RepoStatus, String> {
    status_at(&repo_root(&path)?)
}
#[tauri::command]
pub(crate) async fn commit_history(path: String, limit: usize) -> Result<Vec<Commit>, String> {
    tauri::async_runtime::spawn_blocking(move || commit_history_blocking(path, limit))
        .await
        .map_err(|error| format!("Git worker failed: {error}"))?
}
fn commit_history_blocking(path: String, limit: usize) -> Result<Vec<Commit>, String> {
    let root = repo_root(&path)?;
    let limit = limit.clamp(1, 500).to_string();
    // Unit and record delimiters avoid ambiguities caused by spaces, commas and regular tabs.
    let raw = git_run(
        &root,
        &[
            "log",
            "--all",
            "--topo-order",
            "--date=short",
            "--format=%H%x1f%h%x1f%P%x1f%an%x1f%ad%x1f%s%x1f%D%x1e",
            "--max-count",
            &limit,
        ],
    )
    .or_else(|e| if e.contains("does not have any commits") { Ok(String::new()) } else { Err(e) })?;
    Ok(raw
        .split('\u{1e}')
        .filter_map(|r| {
            let cols: Vec<&str> = r.trim_start_matches('\n').split('\u{1f}').collect();
            if cols.len() < 7 {
                return None;
            }
            Some(Commit {
                hash: cols[0].into(),
                short_hash: cols[1].into(),
                parents: cols[2].split_whitespace().map(str::to_string).collect(),
                author: cols[3].into(),
                date: cols[4].into(),
                subject: cols[5].into(),
                refs: cols[6].trim().into(),
            })
        })
        .collect())
}
#[tauri::command]
pub(crate) async fn list_branches(path: String) -> Result<Vec<Branch>, String> {
    tauri::async_runtime::spawn_blocking(move || list_branches_blocking(path))
        .await
        .map_err(|error| format!("Git worker failed: {error}"))?
}
fn list_branches_blocking(path: String) -> Result<Vec<Branch>, String> {
    let root = repo_root(&path)?;
    let raw = git_run(&root, &["branch", "--all", "--format=%(refname:short)%09%(HEAD)%09%(refname)"])?;
    Ok(raw
        .lines()
        .filter_map(|line| {
            let mut s = line.split('\t');
            let name = s.next()?.to_owned();
            let current = s.next() == Some("*");
            let refname = s.next().unwrap_or("");
            if refname.contains("/HEAD") {
                return None;
            }
            Some(Branch {
                name,
                current,
                remote: refname.starts_with("refs/remotes/"),
            })
        })
        .collect())
}
