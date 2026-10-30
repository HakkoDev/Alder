use crate::*;

// GitHub integration deliberately delegates credentials to GitHub CLI (`gh`).
// No OAuth secret or access token is stored in Alder or passed to the renderer.
pub(crate) fn github_cli(root: Option<&Path>, args: &[&str]) -> Result<String, String> {
    let mut cmd = Command::new("gh");
    if let Some(path) = root {
        cmd.current_dir(path);
    }
    let output = cmd
        .args(args)
        .output()
        .map_err(|_| "GitHub CLI (gh) is not installed. Install it and run `gh auth login` in a terminal.".to_string())?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().chars().take(2000).collect::<String>();
        return Err(if message.is_empty() { "GitHub CLI request failed".into() } else { message });
    }
    String::from_utf8(output.stdout).map_err(|_| "Invalid GitHub CLI response encoding".into())
}
pub(crate) fn github_json(root: &Path, args: &[&str]) -> Result<serde_json::Value, String> {
    let output = github_cli(Some(root), args)?;
    serde_json::from_str(&output).map_err(|e| format!("GitHub returned invalid JSON: {e}"))
}
#[tauri::command]
pub(crate) fn github_auth() -> Result<serde_json::Value, String> {
    let output = github_cli(None, &["auth", "status", "--active"])?;
    Ok(serde_json::json!({"authenticated":true,"message":output.trim()}))
}
#[tauri::command]
pub(crate) fn github_repository(path: String) -> Result<serde_json::Value, String> {
    let root = repo_root(&path)?;
    github_json(
        &root,
        &[
            "repo",
            "view",
            "--json",
            "nameWithOwner,description,url,isPrivate,defaultBranchRef,viewerPermission",
        ],
    )
}
#[tauri::command]
pub(crate) fn github_pull_requests(path: String) -> Result<serde_json::Value, String> {
    let root = repo_root(&path)?;
    github_json(
        &root,
        &[
            "pr",
            "list",
            "--state",
            "open",
            "--limit",
            "100",
            "--json",
            "number,title,state,isDraft,author,headRefName,baseRefName,reviewDecision,statusCheckRollup,url,updatedAt",
        ],
    )
}
#[tauri::command]
pub(crate) fn github_issues(path: String) -> Result<serde_json::Value, String> {
    let root = repo_root(&path)?;
    github_json(
        &root,
        &[
            "issue",
            "list",
            "--state",
            "open",
            "--limit",
            "100",
            "--json",
            "number,title,author,labels,url,updatedAt",
        ],
    )
}
#[tauri::command]
pub(crate) fn github_pr_detail(path: String, number: u32) -> Result<serde_json::Value, String> {
    if number == 0 {
        return Err("Invalid pull request number".into());
    }
    let root = repo_root(&path)?;
    let id = number.to_string();
    github_json(
        &root,
        &[
            "pr",
            "view",
            &id,
            "--json",
            "number,title,body,url,author,state,mergeable,reviewDecision,latestReviews,comments,files,commits,statusCheckRollup,headRefName,baseRefName",
        ],
    )
}
#[tauri::command]
pub(crate) fn github_pr_create(path: String, title: String, body: String, base: String, draft: bool) -> Result<String, String> {
    let root = repo_root(&path)?;
    if title.trim().is_empty() || title.len() > 300 || body.len() > 30_000 {
        return Err("Invalid PR title or description length".into());
    }
    verify_branch_name(&base)?;
    let mut args = vec!["pr", "create", "--title", title.as_str(), "--body", body.as_str(), "--base", base.as_str()];
    if draft {
        args.push("--draft");
    }
    github_cli(Some(&root), &args)
}
#[tauri::command]
pub(crate) fn github_pr_review(path: String, number: u32, action: String, body: String) -> Result<String, String> {
    let root = repo_root(&path)?;
    if number == 0 || body.len() > 30_000 {
        return Err("Invalid review request".into());
    }
    let flag = match action.as_str() {
        "approve" => "--approve",
        "comment" => "--comment",
        "request-changes" => "--request-changes",
        _ => return Err("Unsupported review action".into()),
    };
    if action != "approve" && body.trim().is_empty() {
        return Err("Review comment is required".into());
    }
    let id = number.to_string();
    github_cli(Some(&root), &["pr", "review", &id, flag, "--body", &body])
}
#[tauri::command]
pub(crate) fn github_pr_checks(path: String, number: u32) -> Result<serde_json::Value, String> {
    let root = repo_root(&path)?;
    if number == 0 {
        return Err("Invalid pull request number".into());
    }
    let id = number.to_string();
    github_json(&root, &["pr", "view", &id, "--json", "statusCheckRollup"])
}

fn github_page(page: u32) -> Result<String, String> {
    if !(1..=100).contains(&page) {
        return Err("Page must be between 1 and 100".into());
    }
    Ok(page.to_string())
}
fn github_api(root: &Path, endpoint: &str, page: u32) -> Result<serde_json::Value, String> {
    let page = github_page(page)?;
    let arg = format!("{endpoint}?per_page=30&page={page}");
    github_json(root, &["api", &arg])
}
#[tauri::command]
pub(crate) fn github_pr_checkout_worktree(path: String, number: u32, location: String) -> Result<String, String> {
    if number == 0 {
        return Err("Invalid pull request number".into());
    }
    let root = repo_root(&path)?;
    let dest = Path::new(&location);
    if !dest.is_absolute() || dest.exists() {
        return Err("Choose an unused absolute destination path".into());
    }
    if !dest.parent().is_some_and(|parent| parent.is_dir()) {
        return Err("Destination parent must exist".into());
    }
    let parent = dest.parent().ok_or("Invalid worktree destination")?.canonicalize().map_err(|e| e.to_string())?;
    if parent.starts_with(root.join(".git")) {
        return Err("Cannot create a worktree inside Git metadata".into());
    }
    let target = dest.to_string_lossy().to_string();
    let id = number.to_string();
    github_cli(Some(&root), &["pr", "checkout", &id, "--worktree", &target])?;
    Ok(target)
}
#[tauri::command]
pub(crate) fn github_notifications(path: String, page: u32) -> Result<serde_json::Value, String> {
    let root = repo_root(&path)?;
    github_api(&root, "repos/{owner}/{repo}/notifications", page)
}
#[tauri::command]
pub(crate) fn github_releases(path: String, page: u32) -> Result<serde_json::Value, String> {
    let root = repo_root(&path)?;
    github_api(&root, "repos/{owner}/{repo}/releases", page)
}
#[tauri::command]
pub(crate) fn github_tags(path: String, page: u32) -> Result<serde_json::Value, String> {
    let root = repo_root(&path)?;
    github_api(&root, "repos/{owner}/{repo}/tags", page)
}
#[tauri::command]
pub(crate) fn github_rate_limit(path: String) -> Result<serde_json::Value, String> {
    let root = repo_root(&path)?;
    github_json(&root, &["api", "rate_limit"])
}
