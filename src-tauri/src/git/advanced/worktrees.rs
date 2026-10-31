use crate::*;

#[tauri::command]
pub(crate) fn git_operation_state(path: String) -> Result<GitOperationState, String> {
    operation_state_at(&repo_root(&path)?)
}
#[tauri::command]
pub(crate) fn list_worktrees(path: String) -> Result<Vec<WorktreeInfo>, String> {
    let root = repo_root(&path)?;
    let main_root = git_run(&root, &["rev-parse", "--show-toplevel"])?.trim().to_owned();
    let raw = git_run(&root, &["worktree", "list", "--porcelain", "-z"])?;
    let mut out = Vec::new();
    let mut item: Option<WorktreeInfo> = None;
    for field in raw.split('\0') {
        if field.is_empty() {
            if let Some(w) = item.take() {
                out.push(w);
            }
            continue;
        }
        if let Some(location) = field.strip_prefix("worktree ") {
            if let Some(w) = item.take() {
                out.push(w);
            }
            item = Some(WorktreeInfo {
                path: location.to_owned(),
                branch: "(detached)".into(),
                head: String::new(),
                current: location == main_root,
                locked: false,
                bare: false,
            });
        } else if let Some(w) = item.as_mut() {
            if let Some(head) = field.strip_prefix("HEAD ") {
                w.head = head.to_owned();
            } else if let Some(b) = field.strip_prefix("branch ") {
                w.branch = b.strip_prefix("refs/heads/").unwrap_or(b).to_owned();
            } else if field == "locked" || field.starts_with("locked ") {
                w.locked = true;
            } else if field == "bare" {
                w.bare = true;
            }
        }
    }
    if let Some(w) = item {
        out.push(w);
    }
    Ok(out)
}
#[tauri::command]
pub(crate) fn add_worktree(path: String, location: String, branch_name: String, new_branch: bool) -> Result<(), String> {
    let root = repo_root(&path)?;
    verify_branch_name(&branch_name)?;
    let dest = Path::new(&location);
    if !dest.is_absolute() {
        return Err("Worktree path must be absolute".into());
    }
    if dest.exists() {
        return Err("Destination already exists. Choose an unused directory".into());
    }
    if !dest.parent().is_some_and(|p| p.is_dir()) {
        return Err("Destination parent directory does not exist".into());
    }
    let dest_string = dest.to_string_lossy().to_string();
    if new_branch {
        git_run(&root, &["worktree", "add", "-b", &branch_name, "--", &dest_string, "HEAD"])?;
    } else {
        git_run(&root, &["worktree", "add", "--", &dest_string, &branch_name])?;
    }
    Ok(())
}
#[tauri::command]
pub(crate) fn remove_worktree(path: String, location: String) -> Result<(), String> {
    let root = repo_root(&path)?;
    let dest = Path::new(&location);
    let canonical = dest.canonicalize().map_err(err)?;
    if canonical == root {
        return Err("Cannot remove the selected working directory".into());
    }
    let known = list_worktrees(path)?;
    if !known.iter().any(|w| Path::new(&w.path).canonicalize().ok().as_ref() == Some(&canonical)) {
        return Err("Path is not a registered worktree".into());
    }
    git_run(&root, &["worktree", "remove", "--", &canonical.to_string_lossy()])?;
    Ok(())
}
#[tauri::command]
pub(crate) fn set_worktree_lock(path: String, location: String, locked: bool) -> Result<(), String> {
    let root = repo_root(&path)?;
    let dest = Path::new(&location).canonicalize().map_err(err)?;
    if dest == root {
        return Err("Cannot lock the selected working directory".into());
    }
    let known = list_worktrees(path)?;
    if !known.iter().any(|w| Path::new(&w.path).canonicalize().ok().as_ref() == Some(&dest)) {
        return Err("Path is not a registered worktree".into());
    }
    let dest = dest.to_string_lossy().to_string();
    if locked {
        git_run(&root, &["worktree", "lock", "--reason", "Locked from Alder", "--", &dest])?;
    } else {
        git_run(&root, &["worktree", "unlock", "--", &dest])?;
    }
    Ok(())
}

/// Move only registered, unlocked worktrees. Git refuses dirty worktrees by default.
#[tauri::command]
pub(crate) fn move_worktree(path: String, location: String, destination: String) -> Result<(), String> {
    let root = repo_root(&path)?;
    let source = Path::new(&location).canonicalize().map_err(err)?;
    let known = list_worktrees(path)?;
    if !known.iter().any(|w| Path::new(&w.path).canonicalize().ok().as_ref() == Some(&source)) {
        return Err("Not a registered worktree".into());
    }
    if source == root {
        return Err("Cannot move the active working directory".into());
    }
    let target = Path::new(&destination);
    if !target.is_absolute() || target.exists() || !target.parent().is_some_and(|p| p.is_dir()) {
        return Err("Choose an unused absolute destination with an existing parent".into());
    }
    git_run(&root, &["worktree", "move", "--", &source.to_string_lossy(), &target.to_string_lossy()])?;
    Ok(())
}
