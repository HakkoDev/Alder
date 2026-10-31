use crate::*;

#[tauri::command]
pub(crate) fn file_diff(path: String, file: String, staged: bool) -> Result<String, String> {
    safe_file(&file)?;
    let root = repo_root(&path)?;
    let mut args = vec!["diff", "--no-ext-diff", "--no-color", "--unified=4"];
    if staged {
        args.push("--cached");
    }
    args.extend(["--", &file]);
    let out = git_run(&root, &args)?;
    if out.len() > 600_000 {
        return Ok(format!("{}\n\n[Diff truncated after 600 KB]", out.chars().take(600_000).collect::<String>()));
    }
    if !staged && out.is_empty() {
        let file_path = root.join(&file);
        if file_path.is_file()
            && !fs::symlink_metadata(&file_path).map_err(err)?.file_type().is_symlink()
            && git_run(&root, &["ls-files", "--error-unmatch", "--", &file]).is_err()
        {
            let bytes = fs::read(&file_path).map_err(err)?;
            if bytes.len() > 150_000 || bytes.contains(&0) {
                return Ok("Untracked binary or large file. Stage it to review Git's binary summary.".into());
            }
            let content = String::from_utf8_lossy(&bytes);
            return Ok(format!(
                "--- /dev/null\n+++ b/{file}\n@@ -0,0 +1 @@\n{}",
                content.lines().map(|line| format!("+{line}\n")).collect::<String>()
            ));
        }
    }
    Ok(out)
}
// Apply only the selected text change to Git's index; never rewrite the working file.
// Git itself validates patch context and the resulting index before mutation.
#[tauri::command]
pub(crate) fn apply_diff_selection(path: String, file: String, staged: bool, hunk: usize, line: Option<usize>) -> Result<(), String> {
    safe_file(&file)?;
    let root = repo_root(&path)?;
    let mut args = vec!["diff", "--no-ext-diff", "--no-color", "--no-textconv", "--unified=3"];
    if staged {
        args.push("--cached");
    }
    args.extend(["--", &file]);
    let original = git_run(&root, &args)?;
    if original.len() > 1_000_000 {
        return Err("Diff too large for partial staging".into());
    }
    if original.contains("GIT binary patch") || original.contains("Binary files ") || original.contains("@@@") {
        return Err("Partial staging is not supported for binary or combined diffs".into());
    }
    let rows: Vec<&str> = original.lines().collect();
    let mut headers = Vec::new();
    let mut groups: Vec<Vec<&str>> = Vec::new();
    for row in rows {
        if row.starts_with("@@ ") {
            groups.push(vec![row]);
        } else if let Some(group) = groups.last_mut() {
            group.push(row);
        } else {
            headers.push(row);
        }
    }
    if groups.is_empty() {
        return Err("No editable patch hunks for this file".into());
    }
    let group = groups.get(hunk).ok_or("Diff hunk no longer exists; refresh and try again")?;
    if !group.first().map(|v| v.contains("@@")).unwrap_or(false) {
        return Err("Invalid hunk".into());
    }
    let selected: Vec<String> = if let Some(selected_line) = line {
        if selected_line == 0 || selected_line >= group.len() {
            return Err("Selected diff line is out of range".into());
        }
        let row = group[selected_line];
        if !row.starts_with('+') && !row.starts_with('-') {
            return Err("Only added or removed lines can be staged individually".into());
        }
        // A deleted line not selected is retained as context. An added line not selected
        // is omitted. The selected change is the only mutation in the new patch.
        group
            .iter()
            .enumerate()
            .skip(1)
            .filter_map(|(i, row)| {
                if row.starts_with("\\ No newline") {
                    return None;
                }
                if row.starts_with('+') {
                    if i == selected_line {
                        Some((*row).to_string())
                    } else {
                        None
                    }
                } else if let Some(content) = row.strip_prefix('-') {
                    if i == selected_line {
                        Some((*row).to_string())
                    } else {
                        Some(format!(" {content}"))
                    }
                } else {
                    Some((*row).to_string())
                }
            })
            .collect()
    } else {
        group.iter().skip(1).map(|s| (*s).to_string()).collect()
    };
    if !selected.iter().any(|x| x.starts_with('+') || x.starts_with('-')) {
        return Err("No staged changes in selection".into());
    }
    let heading = group[0];
    let mut patch = headers.join("\n");
    patch.push('\n');
    patch.push_str(heading);
    patch.push('\n');
    for row in selected {
        patch.push_str(&row);
        patch.push('\n');
    }
    // git apply --recount updates the hunk line counts; -R un-stages the selected
    // lines from the index without changing the worktree.
    for check in [true, false] {
        let mut cmd = crate::process::command("git");
        cmd.arg("-C").arg(&root).args(["apply", "--cached", "--recount", "--unidiff-zero"]);
        if staged {
            cmd.arg("--reverse");
        }
        if check {
            cmd.arg("--check");
        }
        let mut child = cmd
            .arg("-")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(err)?;
        child
            .stdin
            .take()
            .ok_or("Could not open Git patch input")?
            .write_all(patch.as_bytes())
            .map_err(err)?;
        let result = child.wait_with_output().map_err(err)?;
        if !result.status.success() {
            return Err(format!(
                "Git could not apply selected changes: {}",
                String::from_utf8_lossy(&result.stderr).trim()
            ));
        }
    }
    Ok(())
}
#[tauri::command]
pub(crate) fn stage_file(path: String, file: String) -> Result<(), String> {
    safe_file(&file)?;
    git_run(&repo_root(&path)?, &["add", "--", &file]).map(|_| ())
}
#[tauri::command]
pub(crate) fn unstage_file(path: String, file: String) -> Result<(), String> {
    safe_file(&file)?;
    let root = repo_root(&path)?;
    if git_run(&root, &["rev-parse", "--verify", "HEAD"]).is_ok() {
        git_run(&root, &["restore", "--staged", "--", &file])?;
    } else {
        git_run(&root, &["rm", "--cached", "--ignore-unmatch", "--", &file])?;
    }
    Ok(())
}
#[tauri::command]
pub(crate) fn stage_all(path: String) -> Result<(), String> {
    git_run(&repo_root(&path)?, &["add", "--all"]).map(|_| ())
}
// Repository-wide actions are explicit and guarded; never use shell interpolation.
#[tauri::command]
pub(crate) fn changes_bulk_action(path: String, action: String) -> Result<String, String> {
    let root = repo_root(&path)?;
    match action.as_str() {
        "unstage-all" => {
            if git_run(&root, &["rev-parse", "--verify", "HEAD"]).is_ok() {
                git_run(&root, &["restore", "--staged", ":/"])?;
            } else {
                git_run(&root, &["rm", "-r", "--cached", "--ignore-unmatch", "--", "."])?;
            }
            Ok("Unstaged all files".into())
        }
        "discard-tracked" => {
            git_run(&root, &["restore", "--worktree", ":/"])?;
            Ok("Discarded unstaged tracked changes".into())
        }
        "restore-all" => {
            git_run(&root, &["rev-parse", "--verify", "HEAD"])?;
            git_run(&root, &["restore", "--source=HEAD", "--staged", "--worktree", ":/"])?;
            Ok("Restored tracked files to HEAD; untracked files were kept".into())
        }
        "trash-untracked" => {
            let files = changes(&root)?;
            let mut count = 0usize;
            for file in files.into_iter().filter(|entry| entry.untracked) {
                safe_file(&file.path)?;
                let candidate = root.join(&file.path);
                if candidate.symlink_metadata().is_ok() {
                    // Reject directory traversal through symlinked parents.
                    let parent = candidate.parent().ok_or("Invalid file path")?.canonicalize().map_err(err)?;
                    if !parent.starts_with(&root) {
                        return Err("File escapes repository".into());
                    }
                    trash::delete(&candidate).map_err(err)?;
                    count += 1;
                }
            }
            Ok(format!("Moved {count} untracked files to Trash"))
        }
        "stash-pop" => git_run(&root, &["stash", "pop", "--index"]),
        _ => Err("Unknown Changes action".into()),
    }
}

#[tauri::command]
pub(crate) fn create_commit(path: String, message: String, amend: bool, tracked: bool, skip_hooks: bool, signoff: bool) -> Result<String, String> {
    if message.trim().is_empty() || message.len() > 100_000 {
        return Err("Enter a commit message".into());
    }
    let root = repo_root(&path)?;
    let mut args = vec!["commit"];
    if tracked {
        args.push("--all");
    }
    if amend {
        args.push("--amend");
    }
    if skip_hooks {
        args.push("--no-verify");
    }
    if signoff {
        args.push("--signoff");
    }
    args.extend(["-m", message.trim()]);
    git_run(&root, &args)?;
    git_run(&root, &["rev-parse", "--short", "HEAD"]).map(|s| s.trim().to_owned())
}

// The UI never sends arbitrary filesystem paths; all actions resolve a validated
// repository-relative file path and reject symlinks and directories.
fn change_path(repository: &str, file: &str) -> Result<(PathBuf, PathBuf), String> {
    safe_file(file)?;
    let root = repo_root(repository)?;
    let candidate = root.join(file);
    if candidate.exists() {
        let metadata = fs::symlink_metadata(&candidate).map_err(err)?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Only regular files can be opened or trashed".into());
        }
        if !candidate.canonicalize().map_err(err)?.starts_with(&root) {
            return Err("File is outside repository".into());
        }
    }
    Ok((root, candidate))
}

#[tauri::command]
pub(crate) fn trash_file(path: String, file: String) -> Result<(), String> {
    let (_, target) = change_path(&path, &file)?;
    if !target.is_file() {
        return Err("File no longer exists".into());
    }
    trash::delete(&target).map_err(err)
}

#[tauri::command]
pub(crate) fn ignore_file(path: String, file: String, local_only: bool) -> Result<(), String> {
    let (root, _) = change_path(&path, &file)?;
    if file.chars().any(|c| c == '\n' || c == '\r') {
        return Err("Cannot add filenames containing newlines to an ignore file".into());
    }
    // Encode as a literal anchored Git ignore pattern. Escaping Git wildcards and
    // whitespace prevents a filename from turning into an overbroad ignore rule.
    let pattern = file.replace('\\', "/");
    let escaped = pattern
        .chars()
        .map(|c| match c {
            '*' | '?' | '[' | ']' | '!' | '#' | ' ' | '\\' => format!("\\{c}"),
            _ => c.to_string(),
        })
        .collect::<String>();
    let target = if local_only {
        let git_dir = git_run(&root, &["rev-parse", "--absolute-git-dir"])?;
        PathBuf::from(git_dir.trim()).join("info").join("exclude")
    } else {
        root.join(".gitignore")
    };
    if target.exists() && fs::symlink_metadata(&target).map_err(err)?.file_type().is_symlink() {
        return Err("Refusing to write an ignore file through a symlink".into());
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(err)?;
    }
    use std::io::Write as _;
    let needs_newline = fs::read(&target).ok().and_then(|bytes| bytes.last().copied()).is_some_and(|b| b != b'\n');
    let mut writer = fs::OpenOptions::new().create(true).append(true).open(&target).map_err(err)?;
    if needs_newline {
        writer.write_all(b"\n").map_err(err)?;
    }
    writeln!(writer, "/{escaped}").map_err(err)?;
    Ok(())
}

#[tauri::command]
pub(crate) fn open_change_file(path: String, file: String) -> Result<(), String> {
    let (_, target) = change_path(&path, &file)?;
    if !target.is_file() {
        return Err("File no longer exists".into());
    }
    open::that(target).map_err(err)
}

/// Reveal the working-tree file in the system file manager. If Git reports a
/// deleted file, show its parent directory rather than failing on a missing file.
#[tauri::command]
pub(crate) fn reveal_change_file(path: String, file: String) -> Result<(), String> {
    let (root, target) = change_path(&path, &file)?;
    let reveal_target = if target.exists() {
        target
    } else {
        let parent = target.parent().ok_or("File has no parent directory")?;
        // Missing paths are allowed for deleted Git entries, but the existing
        // parent must still resolve within the repository (no symlink escape).
        let existing = parent.ancestors().find(|dir| dir.exists()).ok_or("Parent directory not found")?;
        let canonical = existing.canonicalize().map_err(err)?;
        if !canonical.starts_with(&root) {
            return Err("File is outside repository".into());
        }
        existing.to_path_buf()
    };

    #[cfg(target_os = "windows")]
    {
        // explorer.exe accepts /select,<full path> as one argument. Launch via
        // our common helper so no console window briefly appears.
        let argument = format!("/select,{}", reveal_target.display());
        let args = if reveal_target.is_file() {
            vec![argument]
        } else {
            vec![reveal_target.to_string_lossy().into_owned()]
        };
        crate::process::command("explorer.exe").args(args).spawn().map_err(err)?;
    }
    #[cfg(target_os = "macos")]
    {
        if reveal_target.is_file() {
            crate::process::command("open").arg("-R").arg(&reveal_target).spawn().map_err(err)?;
        } else {
            open::that(&reveal_target).map_err(err)?;
        }
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        // File-manager reveal protocols vary by Linux desktop; opening its
        // parent directory is the interoperable fallback.
        let directory = if reveal_target.is_file() {
            reveal_target.parent().ok_or("File has no parent directory")?
        } else {
            &reveal_target
        };
        open::that(directory).map_err(err)?;
    }
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EditorChoice {
    id: String,
    label: String,
    available: bool,
}

pub(crate) fn detect_editor(program: &str) -> bool {
    #[cfg(windows)]
    {
        crate::process::command("where.exe").arg(program).output().is_ok_and(|out| out.status.success())
    }
    #[cfg(not(windows))]
    {
        crate::process::command("which").arg(program).output().is_ok_and(|out| out.status.success())
    }
}

#[tauri::command]
pub(crate) fn detect_editors() -> Vec<EditorChoice> {
    vec![
        EditorChoice {
            id: "zed".into(),
            label: "Zed".into(),
            available: detect_editor("zed"),
        },
        EditorChoice {
            id: "code".into(),
            label: "Visual Studio Code".into(),
            available: detect_editor("code"),
        },
    ]
}

#[tauri::command]
pub(crate) fn open_in_editor(path: String, file: String, editor: String) -> Result<(), String> {
    let (_, target) = change_path(&path, &file)?;
    if !target.is_file() {
        return Err("File no longer exists".into());
    }
    if editor != "zed" && editor != "code" {
        return Err("Unsupported editor".into());
    }
    if !detect_editor(&editor) {
        return Err("Editor is not installed or is not on PATH".into());
    }
    crate::process::command(&editor).arg(&target).spawn().map_err(err)?;
    Ok(())
}
