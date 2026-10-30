//! git - core.rs operations.
use crate::*;

pub(crate) fn git_raw(args: &[&str]) -> Result<Output, String> {
    Command::new("git").args(args).output().map_err(|e| format!("Could not execute Git: {e}. Install Git and add it to PATH."))
}
pub(crate) fn git_run(path: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git").arg("-C").arg(path).args(args).output().map_err(err)?;
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(if error.is_empty() { format!("Git exited with status {}", output.status) } else { error.chars().take(1500).collect() });
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
pub(crate) fn git_bytes(path: &Path, args: &[&str]) -> Result<Vec<u8>, String> {
    let o = Command::new("git").arg("-C").arg(path).args(args).output().map_err(err)?;
    if !o.status.success() { return Err(String::from_utf8_lossy(&o.stderr).trim().chars().take(1500).collect()); }
    Ok(o.stdout)
}
pub(crate) fn repo_root(path: &str) -> Result<PathBuf, String> {
    let absolute = Path::new(path).canonicalize().map_err(|e| format!("Repository location unavailable: {e}"))?;
    if !absolute.is_dir() { return Err("The selected location is not a directory".into()); }
    let root = git_run(&absolute, &["rev-parse", "--show-toplevel"])?;
    let root = PathBuf::from(root.trim());
    root.canonicalize().map_err(err)
}
pub(crate) fn safe_file(file: &str) -> Result<(), String> {
    let p = Path::new(file);
    if file.is_empty() || p.is_absolute() || p.components().any(|c| !matches!(c, Component::Normal(_))) {
        return Err("File paths must be relative to the repository and cannot contain traversal".into());
    }
    Ok(())
}
