use crate::*;

#[tauri::command]
pub(crate) async fn list_reflog(path: String) -> Result<Vec<ReflogInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || list_reflog_blocking(path))
        .await
        .map_err(|error| format!("Git worker failed: {error}"))?
}

fn list_reflog_blocking(path: String) -> Result<Vec<ReflogInfo>, String> {
    let root = repo_root(&path)?;
    let raw = git_run(&root, &["reflog", "--max-count=100", "--format=%h%x1f%gD%x1f%gs%x1e"])?;
    Ok(raw
        .split('\u{1e}')
        .filter_map(|line| {
            let mut fields = line.trim().split('\u{1f}');
            Some(ReflogInfo {
                hash: fields.next()?.into(),
                selector: fields.next()?.into(),
                subject: fields.next()?.into(),
            })
        })
        .collect())
}

#[tauri::command]
pub(crate) fn rename_branch(path: String, old_name: String, new_name: String) -> Result<(), String> {
    let root = repo_root(&path)?;
    verify_branch_name(&old_name)?;
    verify_branch_name(&new_name)?;
    git_run(&root, &["branch", "-m", "--", &old_name, &new_name]).map(|_| ())
}
#[tauri::command]
pub(crate) fn delete_branch(path: String, name: String) -> Result<(), String> {
    let root = repo_root(&path)?;
    verify_branch_name(&name)?;
    git_run(&root, &["branch", "-d", "--", &name]).map(|_| ())
}
#[tauri::command]
pub(crate) fn create_recovery_branch(path: String, hash: String, name: String) -> Result<(), String> {
    ensure_hex_commit(&hash)?;
    let root = repo_root(&path)?;
    verify_commitish(&root, &hash)?;
    verify_branch_name(&name)?;
    git_run(&root, &["branch", "--", &name, &hash]).map(|_| ())
}
