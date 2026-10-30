use crate::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConflictVersions {
    base: Option<String>,
    ours: Option<String>,
    theirs: Option<String>,
}
pub(crate) fn read_conflict_stage(root: &Path, file: &str, stage: usize) -> Result<Option<String>, String> {
    let spec = format!(":{stage}:{file}");
    // Missing stages are valid for add/add and delete/modify conflicts.
    if git_run(root, &["cat-file", "-e", &spec]).is_err() {
        return Ok(None);
    }
    let bytes = git_bytes(root, &["show", "--no-ext-diff", &spec])?;
    if bytes.len() > 250_000 || bytes.contains(&0) {
        return Err("Binary/large conflicts must be resolved in an external editor".into());
    }
    String::from_utf8(bytes)
        .map(Some)
        .map_err(|_| "Non-UTF8 conflict: use an external editor".into())
}
#[tauri::command]
pub(crate) fn conflict_versions(path: String, file: String) -> Result<ConflictVersions, String> {
    safe_file(&file)?;
    let root = repo_root(&path)?;
    if !operation_state_at(&root)?.conflicts.contains(&file) {
        return Err("File is not currently conflicted".into());
    }
    Ok(ConflictVersions {
        base: read_conflict_stage(&root, &file, 1)?,
        ours: read_conflict_stage(&root, &file, 2)?,
        theirs: read_conflict_stage(&root, &file, 3)?,
    })
}
#[tauri::command]
pub(crate) fn save_conflict_resolution(path: String, file: String, content: String) -> Result<(), String> {
    safe_file(&file)?;
    if content.len() > 250_000 || content.contains('\0') {
        return Err("Result exceeds the 250 KB text-editor limit".into());
    }
    let root = repo_root(&path)?;
    if !operation_state_at(&root)?.conflicts.contains(&file) {
        return Err("Conflict has already been resolved or changed externally".into());
    }
    let dest = root.join(&file);
    let parent = dest.parent().ok_or("Invalid destination")?.canonicalize().map_err(err)?;
    if !parent.starts_with(&root) {
        return Err("Path leaves the Git worktree".into());
    }
    if let Ok(info) = fs::symlink_metadata(&dest) {
        if info.file_type().is_symlink() || !info.is_file() {
            return Err("Cannot edit symlinks or non-regular files".into());
        }
    }
    fs::write(&dest, content.as_bytes()).map_err(err)?;
    git_run(&root, &["add", "--", &file])?;
    Ok(())
}
