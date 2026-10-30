//! repository - storage.rs operations.
use crate::*;

pub(crate) fn err<E: std::fmt::Display>(e: E) -> String { e.to_string() }
pub(crate) fn database(path: &Path) -> Result<Connection, String> {
    let db = Connection::open(path).map_err(err)?;
    db.execute_batch("PRAGMA foreign_keys = ON; PRAGMA busy_timeout=4000; CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, color TEXT NOT NULL); CREATE TABLE IF NOT EXISTS repositories (id TEXT PRIMARY KEY, path TEXT NOT NULL UNIQUE, workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL); CREATE INDEX IF NOT EXISTS repo_workspace_idx ON repositories(workspace_id);").map_err(err)?;
    Ok(db)
}
pub(crate) fn store_repo(db: &Connection, root: &Path) -> Result<Repository, String> {
    let path = root.to_string_lossy().to_string();
    db.execute("INSERT OR IGNORE INTO repositories(id,path) VALUES (?1,?2)", params![Uuid::new_v4().to_string(),path]).map_err(err)?;
    let (id,ws):(String,Option<String>) = db.query_row("SELECT id,workspace_id FROM repositories WHERE path=?1",[&path],|r| Ok((r.get(0)?,r.get(1)?))).map_err(err)?;
    Ok(build_repo(id,path,ws))
}
pub(crate) fn build_repo(id:String,path:String,workspace_id:Option<String>) -> Repository {
    let root = Path::new(&path);
    let data = status_at(root).ok();
    let modified = data.as_ref().map(|s|s.changes.iter().filter(|c|c.unstaged).count()).unwrap_or(0);
    let staged = data.as_ref().map(|s|s.changes.iter().filter(|c|c.staged).count()).unwrap_or(0);
    Repository { id, name: root.file_name().map(|s|s.to_string_lossy().to_string()).unwrap_or_else(||path.clone()), path, workspace_id,
        branch:data.as_ref().map(|s|s.branch.clone()).unwrap_or_else(||"Unavailable".into()), modified,staged,
        ahead:data.as_ref().map(|s|s.ahead).unwrap_or(0), behind:data.as_ref().map(|s|s.behind).unwrap_or(0), available:data.is_some() }
}
