use crate::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorktreeInfo {
    pub(crate) path: String,
    pub(crate) branch: String,
    pub(crate) head: String,
    pub(crate) current: bool,
    pub(crate) locked: bool,
    pub(crate) bare: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StashInfo {
    pub(crate) reference: String,
    pub(crate) message: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReflogInfo {
    pub(crate) hash: String,
    pub(crate) selector: String,
    pub(crate) subject: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitOperationState {
    pub(crate) merging: bool,
    pub(crate) rebasing: bool,
    pub(crate) cherry_picking: bool,
    pub(crate) reverting: bool,
    pub(crate) conflicts: Vec<String>,
}

pub(crate) fn verify_branch_name(name: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Enter a branch name".into());
    }
    let result = git_raw(&["check-ref-format", "--branch", name])?;
    if result.status.success() {
        Ok(())
    } else {
        Err("Invalid Git branch name".into())
    }
}
pub(crate) fn verify_commitish(root: &Path, target: &str) -> Result<(), String> {
    if target.is_empty() || target.starts_with('-') || target.contains('\n') || target.contains('\r') {
        return Err("Invalid revision".into());
    }
    let revision = format!("{target}^{{commit}}");
    git_run(root, &["rev-parse", "--verify", "--end-of-options", &revision])?;
    Ok(())
}
pub(crate) fn ensure_clean(root: &Path) -> Result<(), String> {
    if !changes(root)?.is_empty() {
        return Err("This operation needs a clean working tree and staging area. Commit or stash changes first.".into());
    }
    Ok(())
}
pub(crate) fn ensure_hex_commit(hash: &str) -> Result<(), String> {
    if hash.len() < 7 || hash.len() > 64 || !hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Choose a valid commit hash from History".into());
    }
    Ok(())
}
pub(crate) fn git_dir(root: &Path) -> Result<PathBuf, String> {
    let dir = git_run(root, &["rev-parse", "--absolute-git-dir"])?;
    Ok(PathBuf::from(dir.trim()))
}
pub(crate) fn operation_state_at(root: &Path) -> Result<GitOperationState, String> {
    let dir = git_dir(root)?;
    let conflicts = git_bytes(root, &["diff", "--name-only", "--diff-filter=U", "-z"])?
        .split(|b| *b == 0)
        .filter(|s| !s.is_empty())
        .map(|s| String::from_utf8_lossy(s).to_string())
        .collect();
    Ok(GitOperationState {
        merging: dir.join("MERGE_HEAD").exists(),
        rebasing: dir.join("rebase-merge").exists() || dir.join("rebase-apply").exists(),
        cherry_picking: dir.join("CHERRY_PICK_HEAD").exists(),
        reverting: dir.join("REVERT_HEAD").exists(),
        conflicts,
    })
}
