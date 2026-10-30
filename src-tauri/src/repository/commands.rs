use crate::*;

type RepositoryEntry = (String, String, Option<String>);

#[tauri::command]
pub(crate) fn git_version() -> Result<String, String> {
    let output = git_raw(&["--version"])?;
    if !output.status.success() {
        return Err("Git is installed but cannot be executed".into());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
#[tauri::command]
pub(crate) fn list_repositories(state: State<'_, AppState>) -> Result<Vec<Repository>, String> {
    let db = database(&state.db)?;
    let mut statement = db
        .prepare("SELECT id,path,workspace_id FROM repositories ORDER BY path COLLATE NOCASE")
        .map_err(err)?;
    let rows = statement.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(err)?;
    // Keep database access on this thread, then bound Git subprocess concurrency
    // to four worker threads. Scanning 100 repositories sequentially can freeze
    // the dashboard for seconds; unbounded subprocesses are equally undesirable.
    let entries: Vec<RepositoryEntry> = rows.collect::<Result<_, _>>().map_err(err)?;
    drop(statement);
    drop(db);
    let workers = entries.len().clamp(1, 4);
    let mut ordered: Vec<(usize, Repository)> = std::thread::scope(|scope| {
        let mut handles = Vec::new();
        let mut chunks: Vec<Vec<(usize, RepositoryEntry)>> = (0..workers).map(|_| Vec::new()).collect();
        for (i, entry) in entries.into_iter().enumerate() {
            chunks[i % workers].push((i, entry));
        }
        for chunk in chunks {
            handles.push(scope.spawn(move || chunk.into_iter().map(|(i, (id, path, ws))| (i, build_repo(id, path, ws))).collect::<Vec<_>>()));
        }
        handles.into_iter().flat_map(|handle| handle.join().unwrap_or_default()).collect()
    });
    ordered.sort_by_key(|(index, _)| *index);
    Ok(ordered.into_iter().map(|(_, repo)| repo).collect())
}
#[tauri::command]
pub(crate) fn add_repository(state: State<'_, AppState>, path: String) -> Result<Repository, String> {
    let root = repo_root(&path)?;
    store_repo(&database(&state.db)?, &root)
}
#[tauri::command]
pub(crate) fn remove_repository(state: State<'_, AppState>, id: String) -> Result<(), String> {
    database(&state.db)?.execute("DELETE FROM repositories WHERE id=?1", [id]).map_err(err)?;
    Ok(()) // Does not delete Git data on disk.
}
pub(crate) fn walk_repos(root: &Path, depth: usize, db: &Connection, count: &mut usize) -> Result<(), String> {
    if depth == 0 || !root.is_dir() {
        return Ok(());
    }
    if root.join(".git").exists() {
        if let Ok(actual) = repo_root(&root.to_string_lossy()) {
            store_repo(db, &actual)?;
            *count += 1;
        }
        return Ok(());
    }
    for dir in fs::read_dir(root).map_err(err)? {
        let entry = dir.map_err(err)?;
        let ty = entry.file_type().map_err(err)?;
        if !ty.is_dir() || ty.is_symlink() {
            continue;
        }
        let n = entry.file_name().to_string_lossy().to_string();
        if ["node_modules", "target", ".git", ".next", "dist", "build", ".cache"].contains(&n.as_str()) {
            continue;
        }
        walk_repos(&entry.path(), depth - 1, db, count)?;
    }
    Ok(())
}
#[tauri::command]
pub(crate) fn discover_repositories(state: State<'_, AppState>, path: String, depth: usize) -> Result<usize, String> {
    let root = PathBuf::from(path).canonicalize().map_err(err)?;
    let mut n = 0;
    walk_repos(&root, depth.clamp(1, 6), &database(&state.db)?, &mut n)?;
    Ok(n)
}
#[tauri::command]
pub(crate) fn init_repository(state: State<'_, AppState>, path: String) -> Result<Repository, String> {
    let target = PathBuf::from(&path);
    if !target.exists() {
        fs::create_dir_all(&target).map_err(err)?;
    }
    let o = git_raw(&["init", "--", &path])?;
    if !o.status.success() {
        return Err(String::from_utf8_lossy(&o.stderr).to_string());
    }
    let root = repo_root(&path)?;
    store_repo(&database(&state.db)?, &root)
}
#[tauri::command]
pub(crate) async fn clone_repository(state: State<'_, AppState>, url: String, path: String) -> Result<Repository, String> {
    let db_path = state.db.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if url.trim().is_empty() {
            return Err("Enter a remote URL or SSH address".into());
        }
        if Path::new(&path).exists() {
            return Err("Clone destination already exists".into());
        }
        let o = git_raw(&["clone", "--progress", "--", &url, &path])?;
        if !o.status.success() {
            return Err(String::from_utf8_lossy(&o.stderr).chars().take(2000).collect());
        }
        let root = repo_root(&path)?;
        store_repo(&database(&db_path)?, &root)
    })
    .await
    .map_err(err)?
}
#[tauri::command]
pub(crate) fn list_workspaces(state: State<'_, AppState>) -> Result<Vec<Workspace>, String> {
    let db = database(&state.db)?;
    let mut s = db.prepare("SELECT id,name,color FROM workspaces ORDER BY name COLLATE NOCASE").map_err(err)?;
    let rows = s
        .query_map([], |r| {
            Ok(Workspace {
                id: r.get(0)?,
                name: r.get(1)?,
                color: r.get(2)?,
            })
        })
        .map_err(err)?;
    rows.map(|r| r.map_err(err)).collect()
}
#[tauri::command]
pub(crate) fn create_workspace(state: State<'_, AppState>, name: String, color: String) -> Result<Workspace, String> {
    let n = name.trim();
    if n.is_empty() || n.len() > 60 {
        return Err("Workspace name must be 1–60 characters".into());
    }
    let c = if color.len() == 7 && color.starts_with('#') && color.chars().skip(1).all(|c| c.is_ascii_hexdigit()) {
        color
    } else {
        "#7D8F88".into()
    };
    let w = Workspace {
        id: Uuid::new_v4().to_string(),
        name: n.to_owned(),
        color: c,
    };
    database(&state.db)?
        .execute("INSERT INTO workspaces(id,name,color) VALUES(?1,?2,?3)", params![w.id, w.name, w.color])
        .map_err(err)?;
    Ok(w)
}
#[tauri::command]
pub(crate) fn assign_workspace(state: State<'_, AppState>, repo_id: String, workspace_id: Option<String>) -> Result<(), String> {
    let count = database(&state.db)?
        .execute("UPDATE repositories SET workspace_id=?1 WHERE id=?2", params![workspace_id, repo_id])
        .map_err(err)?;
    if count == 0 {
        return Err("Repository not found".into());
    }
    Ok(())
}
