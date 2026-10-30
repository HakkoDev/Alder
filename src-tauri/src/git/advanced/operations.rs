use crate::*;

#[tauri::command]
pub(crate) fn merge_branch(path: String, source: String, squash: bool) -> Result<String, String> {
    let root = repo_root(&path)?;
    ensure_clean(&root)?;
    verify_commitish(&root, &source)?;
    if squash {
        git_run(&root, &["merge", "--squash", "--", &source])
    } else {
        git_run(&root, &["merge", "--no-edit", "--", &source])
    }
}
#[tauri::command]
pub(crate) fn rebase_branch(path: String, onto: String) -> Result<String, String> {
    let root = repo_root(&path)?;
    ensure_clean(&root)?;
    verify_commitish(&root, &onto)?;
    git_run(&root, &["rebase", "--", &onto])
}
#[tauri::command]
pub(crate) fn sequence_action(path: String, operation: String, action: String) -> Result<String, String> {
    let root = repo_root(&path)?;
    let state = operation_state_at(&root)?;
    let active = match operation.as_str() {
        "merge" => state.merging,
        "rebase" => state.rebasing,
        "cherry-pick" => state.cherry_picking,
        "revert" => state.reverting,
        _ => false,
    };
    if !active {
        return Err("No active operation of this kind".into());
    }
    if action == "continue" && !state.conflicts.is_empty() {
        return Err("Resolve and stage every conflict before continuing".into());
    }
    match (operation.as_str(), action.as_str()) {
        ("merge", "abort") => git_run(&root, &["merge", "--abort"]),
        ("rebase", "abort") => git_run(&root, &["rebase", "--abort"]),
        ("rebase", "continue") => git_run(&root, &["-c", "core.editor=true", "rebase", "--continue"]),
        ("cherry-pick", "abort") => git_run(&root, &["cherry-pick", "--abort"]),
        ("cherry-pick", "continue") => git_run(&root, &["cherry-pick", "--continue"]),
        ("revert", "abort") => git_run(&root, &["revert", "--abort"]),
        ("revert", "continue") => git_run(&root, &["revert", "--continue"]),
        _ => Err("Unsupported operation/action combination".into()),
    }
}
#[tauri::command]
pub(crate) fn resolve_conflict(path: String, file: String, side: String) -> Result<(), String> {
    safe_file(&file)?;
    if side != "ours" && side != "theirs" {
        return Err("Unknown side".into());
    }
    let root = repo_root(&path)?;
    if !operation_state_at(&root)?.conflicts.contains(&file) {
        return Err("File is not an unresolved conflict".into());
    }
    let flag = if side == "ours" { "--ours" } else { "--theirs" };
    git_run(&root, &["checkout", flag, "--", &file])?;
    git_run(&root, &["add", "--", &file])?;
    Ok(())
}
#[tauri::command]
pub(crate) fn commit_operation(path: String, hash: String, kind: String) -> Result<String, String> {
    ensure_hex_commit(&hash)?;
    let root = repo_root(&path)?;
    ensure_clean(&root)?;
    verify_commitish(&root, &hash)?;
    match kind.as_str() {
        "cherry-pick" => git_run(&root, &["cherry-pick", "--", &hash]),
        "revert" => git_run(&root, &["revert", "--no-edit", "--", &hash]),
        _ => Err("Unknown commit operation".into()),
    }
}
