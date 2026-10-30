use crate::*;

pub(crate) fn branch(path: &Path) -> String {
    git_run(path, &["symbolic-ref", "--quiet", "--short", "HEAD"])
        .unwrap_or_else(|_| "(detached)".into())
        .trim()
        .to_owned()
}
pub(crate) fn ahead_behind(path: &Path) -> (usize, usize, Option<String>) {
    let upstream = git_run(path, &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"])
        .ok()
        .map(|s| s.trim().to_owned());
    let counts = git_run(path, &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]).unwrap_or_default();
    let mut n = counts.split_whitespace();
    (
        n.next().unwrap_or("0").parse().unwrap_or(0),
        n.next().unwrap_or("0").parse().unwrap_or(0),
        upstream,
    )
}
// --porcelain=v1 -z provides unambiguous separators and preserves paths with whitespace.
// Rename/copy records contain an additional NUL-delimited original path.
pub(crate) fn changes(path: &Path) -> Result<Vec<Change>, String> {
    let output = git_bytes(path, &["-c", "core.quotepath=false", "status", "--porcelain=v1", "-z", "--untracked-files=all"])?;
    let mut entries = output.split(|byte| *byte == 0).filter(|part| !part.is_empty());
    let mut out = Vec::new();
    while let Some(record) = entries.next() {
        if record.len() < 4 {
            continue;
        }
        let x = record[0] as char;
        let y = record[1] as char;
        let file = String::from_utf8_lossy(&record[3..]).to_string();
        if x == 'R' || y == 'R' || x == 'C' || y == 'C' {
            let _ = entries.next();
        }
        let untracked = x == '?' && y == '?';
        out.push(Change {
            path: file,
            index_status: x.to_string(),
            worktree_status: y.to_string(),
            staged: x != ' ' && !untracked,
            unstaged: y != ' ' || untracked,
            untracked,
        });
    }
    Ok(out)
}
pub(crate) fn status_at(root: &Path) -> Result<RepoStatus, String> {
    let (ahead, behind, upstream) = ahead_behind(root);
    Ok(RepoStatus {
        path: root.to_string_lossy().to_string(),
        branch: branch(root),
        upstream,
        ahead,
        behind,
        changes: changes(root)?,
    })
}
