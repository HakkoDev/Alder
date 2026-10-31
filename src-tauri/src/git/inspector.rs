use crate::*;
use serde_json::{json, Value};

fn optional(root: &Path, args: &[&str]) -> Option<String> {
    git_run(root, args).ok().map(|s| s.trim().to_owned()).filter(|s| !s.is_empty())
}

#[tauri::command]
pub(crate) async fn repository_diagnostics(path: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || repository_diagnostics_blocking(path))
        .await
        .map_err(|error| format!("Git worker failed: {error}"))?
}

fn repository_diagnostics_blocking(path: String) -> Result<Value, String> {
    let root = repo_root(&path)?;
    let branch = optional(&root, &["symbolic-ref", "--quiet", "--short", "HEAD"]);
    let upstream = optional(&root, &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
    let remotes = git_run(&root, &["remote"])?;
    let mut issues = Vec::new();
    let mut remote_info = Vec::new();
    if remotes.trim().is_empty() {
        issues.push("No Git remotes configured".to_string());
    }
    if branch.is_some() && upstream.is_none() {
        issues.push("Current branch has no upstream tracking branch".to_string());
    }
    for name in remotes.lines().filter(|s| !s.is_empty()) {
        let url = optional(&root, &["remote", "get-url", name]);
        if url.is_none() {
            issues.push(format!("Remote {name} has no valid fetch URL"));
        }
        let branches = optional(&root, &["for-each-ref", "--format=%(refname:short)", &format!("refs/remotes/{name}")]);
        if branches.is_none() {
            issues.push(format!("Remote {name} has no locally fetched tracking refs"));
        }
        remote_info.push(json!({"name": name, "url":url, "hasTrackingRefs":branches.is_some()}));
    }
    let stale = git_run(&root, &["for-each-ref", "--format=%(refname:short)%09%(upstream:track)", "refs/heads"])?
        .lines()
        .filter(|line| line.contains("[gone]"))
        .map(|s| s.split('\t').next().unwrap_or(s).to_owned())
        .collect::<Vec<_>>();
    if !stale.is_empty() {
        issues.push(format!("{} local branches track removed upstream refs", stale.len()));
    }
    let identity = ["user.name", "user.email"]
        .iter()
        .filter(|key| optional(&root, &["config", "--get", key]).is_none())
        .map(|s| s.to_string())
        .collect::<Vec<_>>();
    if !identity.is_empty() {
        issues.push(format!("Missing Git configuration: {}", identity.join(", ")));
    }
    Ok(json!({"branch":branch,"upstream":upstream,"remotes":remote_info,"goneBranches":stale,"missingIdentity":identity,"issues":issues}))
}

#[tauri::command]
pub(crate) async fn git_lfs_status(path: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || git_lfs_status_blocking(path))
        .await
        .map_err(|error| format!("Git worker failed: {error}"))?
}

fn git_lfs_status_blocking(path: String) -> Result<Value, String> {
    let root = repo_root(&path)?;
    let installed = git_run(&root, &["lfs", "version"]).ok();
    let tracked = if installed.is_some() {
        git_run(&root, &["lfs", "track"]).unwrap_or_default()
    } else {
        String::new()
    };
    let files = if installed.is_some() {
        git_run(&root, &["lfs", "ls-files"]).unwrap_or_default()
    } else {
        String::new()
    };
    Ok(
        json!({"installed":installed.is_some(),"version":installed,"tracked":tracked,"files":files.lines().take(150).collect::<Vec<_>>(), "fileCount":files.lines().count() }),
    )
}

#[tauri::command]
pub(crate) async fn git_submodules(path: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || git_submodules_blocking(path))
        .await
        .map_err(|error| format!("Git worker failed: {error}"))?
}

fn git_submodules_blocking(path: String) -> Result<Value, String> {
    let root = repo_root(&path)?;
    let configured = root.join(".gitmodules").is_file();
    let status = if configured {
        git_run(&root, &["submodule", "status", "--recursive"])?
            .lines()
            .take(150)
            .map(str::to_owned)
            .collect::<Vec<_>>()
    } else {
        vec![]
    };
    let entries = status
        .iter()
        .map(|line| {
            let marker = line.chars().next().unwrap_or(' ');
            let details = line.get(1..).unwrap_or("");
            let (revision, remainder) = details.split_once(' ').unwrap_or(("", details));
            let name = remainder.split(" (").next().unwrap_or(remainder);
            json!({"path":name,"revision":revision,"state":match marker { '-' => "uninitialized", '+' => "modified", 'U' => "conflicted", _ => "ready" }})
        })
        .collect::<Vec<_>>();
    Ok(json!({"configured":configured,"status":status,"entries":entries}))
}

#[tauri::command]
pub(crate) fn git_maintenance_action(path: String, action: String) -> Result<String, String> {
    let root = repo_root(&path)?;
    match action.as_str() {
        "fetch-prune" => git_run(&root, &["fetch", "--all", "--prune"]),
        "worktree-prune-dry-run" => git_run(&root, &["worktree", "prune", "--dry-run", "--verbose"]),
        "worktree-prune" => git_run(&root, &["worktree", "prune", "--verbose"]),
        "submodule-update" => git_run(&root, &["submodule", "update", "--init", "--recursive"]),
        "submodule-sync" => git_run(&root, &["submodule", "sync", "--recursive"]),
        "lfs-fetch" => git_run(&root, &["lfs", "fetch"]),
        "lfs-checkout" => git_run(&root, &["lfs", "checkout"]),
        "lfs-pull" => git_run(&root, &["lfs", "pull"]),
        _ => Err("Unsupported repository maintenance action".into()),
    }
}

#[tauri::command]
pub(crate) async fn git_worktree_comparison(path: String, location: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || git_worktree_comparison_blocking(path, location))
        .await
        .map_err(|error| format!("Git worker failed: {error}"))?
}

fn git_worktree_comparison_blocking(path: String, location: String) -> Result<Value, String> {
    let root = repo_root(&path)?;
    let destination = Path::new(&location).canonicalize().map_err(err)?;
    let known = crate::git::advanced::worktrees::list_worktrees_blocking(path)?;
    if !known.iter().any(|w| Path::new(&w.path).canonicalize().ok().as_ref() == Some(&destination)) {
        return Err("Not a registered worktree".into());
    }
    let left = git_run(&root, &["rev-parse", "HEAD"])?.trim().to_owned();
    let right = git_run(&destination, &["rev-parse", "HEAD"])?.trim().to_owned();
    let summary = git_run(&root, &["diff", "--stat", &left, &right])?;
    let counts = git_run(&root, &["rev-list", "--left-right", "--count", &format!("{left}...{right}")])?;
    Ok(json!({"left":left,"right":right,"summary":summary,"divergence":counts.trim()}))
}

#[tauri::command]
pub(crate) async fn search_repository(path: String, query: String, kind: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || search_repository_blocking(path, query, kind))
        .await
        .map_err(|error| format!("Git worker failed: {error}"))?
}

fn search_repository_blocking(path: String, query: String, kind: String) -> Result<Value, String> {
    let root = repo_root(&path)?;
    let needle = query.trim();
    if needle.is_empty() || needle.len() > 200 {
        return Err("Search must contain 1–200 characters".into());
    }
    let rows = match kind.as_str() {
        "branches" => git_run(&root, &["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"])?,
        "commits" => git_run(
            &root,
            &["log", "-150", "--format=%h %s", "--fixed-strings", "--regexp-ignore-case", "--grep", needle],
        )?,
        "files" => git_run(&root, &["ls-files"])?,
        _ => return Err("Unknown repository search category".into()),
    };
    Ok(json!(rows
        .lines()
        .filter(|line| kind == "commits" || line.to_lowercase().contains(&needle.to_lowercase()))
        .take(80)
        .collect::<Vec<_>>()))
}

/// Opens an existing registered worktree in a supported editor. Never invokes a shell.
#[tauri::command]
pub(crate) fn open_worktree_in_editor(path: String, location: String, editor: String) -> Result<(), String> {
    let root = repo_root(&path)?;
    if editor != "zed" && editor != "code" {
        return Err("Unsupported editor".into());
    }
    if !crate::git::changes::detect_editor(&editor) {
        return Err("Editor is not installed or is not on PATH".into());
    }
    let destination = Path::new(&location).canonicalize().map_err(err)?;
    if !destination.is_dir() {
        return Err("Worktree is no longer available".into());
    }
    let known = crate::git::advanced::worktrees::list_worktrees_blocking(root.to_string_lossy().to_string())?;
    if !known.iter().any(|w| Path::new(&w.path).canonicalize().ok().as_ref() == Some(&destination)) {
        return Err("Path is not a registered worktree".into());
    }
    crate::process::command(&editor).arg(&destination).spawn().map_err(err)?;
    Ok(())
}

/// Change only LFS patterns, never rewrite already committed files.
#[tauri::command]
pub(crate) fn git_lfs_pattern(path: String, pattern: String, track: bool) -> Result<String, String> {
    let root = repo_root(&path)?;
    if pattern.trim().is_empty() || pattern.len() > 200 || pattern.starts_with('-') || pattern.contains(['\n', '\r', '\0']) {
        return Err("Invalid LFS pattern".into());
    }
    if track {
        git_run(&root, &["lfs", "track", "--", &pattern])
    } else {
        git_run(&root, &["lfs", "untrack", "--", &pattern])
    }
}

/// Initialize a single submodule only when it is declared in .gitmodules.
#[tauri::command]
pub(crate) fn git_update_submodule(path: String, submodule: String) -> Result<String, String> {
    let root = repo_root(&path)?;
    if submodule.is_empty() || submodule.starts_with('-') || submodule.contains(['\0', '\n', '\r']) {
        return Err("Invalid submodule path".into());
    }
    let modules = git_submodules_blocking(path)?;
    let valid = modules["entries"]
        .as_array()
        .is_some_and(|items| items.iter().any(|item| item["path"].as_str() == Some(&submodule)));
    if !valid {
        return Err("Submodule is not registered in this repository".into());
    }
    git_run(&root, &["submodule", "update", "--init", "--", &submodule])
}
