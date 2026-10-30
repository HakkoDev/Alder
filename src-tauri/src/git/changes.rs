use crate::*;

#[tauri::command]
pub(crate) fn file_diff(path:String,file:String,staged:bool)->Result<String,String>{
    safe_file(&file)?;let root=repo_root(&path)?;
    let mut args=vec!["diff","--no-ext-diff","--no-color","--unified=4"];
    if staged{args.push("--cached");}args.extend(["--",&file]);
    let out=git_run(&root,&args)?;
    if out.len()>600_000 {return Ok(format!("{}\n\n[Diff truncated after 600 KB]", out.chars().take(600_000).collect::<String>()));}
    if !staged && out.is_empty() {
        let file_path=root.join(&file);
        if file_path.is_file() && !fs::symlink_metadata(&file_path).map_err(err)?.file_type().is_symlink() && git_run(&root,&["ls-files","--error-unmatch","--",&file]).is_err(){
            let bytes=fs::read(&file_path).map_err(err)?;
            if bytes.len()>150_000||bytes.contains(&0){return Ok("Untracked binary or large file. Stage it to review Git's binary summary.".into());}
            let content=String::from_utf8_lossy(&bytes);
            return Ok(format!("--- /dev/null\n+++ b/{file}\n@@ -0,0 +1 @@\n{}",content.lines().map(|line|format!("+{line}\n")).collect::<String>()));
        }
    }
    Ok(out)
}
// Apply only the selected text change to Git's index; never rewrite the working file.
// Git itself validates patch context and the resulting index before mutation.
#[tauri::command]
pub(crate) fn apply_diff_selection(path:String,file:String,staged:bool,hunk:usize,line:Option<usize>)->Result<(),String>{
    safe_file(&file)?;
    let root=repo_root(&path)?;
    let mut args=vec!["diff","--no-ext-diff","--no-color","--no-textconv","--unified=3"];
    if staged { args.push("--cached"); }
    args.extend(["--",&file]);
    let original=git_run(&root,&args)?;
    if original.len()>1_000_000 { return Err("Diff too large for partial staging".into()); }
    if original.contains("GIT binary patch") || original.contains("Binary files ") || original.contains("@@@") {return Err("Partial staging is not supported for binary or combined diffs".into());}
    let rows:Vec<&str>=original.lines().collect();
    let mut headers=Vec::new(); let mut groups:Vec<Vec<&str>>=Vec::new();
    for row in rows {
        if row.starts_with("@@ ") {groups.push(vec![row]);}
        else if let Some(group)=groups.last_mut(){group.push(row);} else {headers.push(row);}
    }
    if groups.is_empty() {return Err("No editable patch hunks for this file".into());}
    let group=groups.get(hunk).ok_or("Diff hunk no longer exists; refresh and try again")?;
    if !group.first().map(|v|v.contains("@@")).unwrap_or(false){return Err("Invalid hunk".into());}
    let selected:Vec<String>=if let Some(selected_line)=line {
        if selected_line==0 || selected_line>=group.len() {return Err("Selected diff line is out of range".into());}
        let row=group[selected_line];
        if !row.starts_with('+') && !row.starts_with('-'){return Err("Only added or removed lines can be staged individually".into());}
        // A deleted line not selected is retained as context. An added line not selected
        // is omitted. The selected change is the only mutation in the new patch.
        group.iter().enumerate().skip(1).filter_map(|(i,row)|{
            if row.starts_with("\\ No newline") {return None;}
            if row.starts_with('+') {if i==selected_line {Some((*row).to_string())}else{None}}
            else if let Some(content)=row.strip_prefix('-') {if i==selected_line {Some((*row).to_string())}else{Some(format!(" {content}"))}}
            else {Some((*row).to_string())}
        }).collect()
    }else{group.iter().skip(1).map(|s|(*s).to_string()).collect()};
    if !selected.iter().any(|x|x.starts_with('+')||x.starts_with('-')) {return Err("No staged changes in selection".into());}
    let heading=group[0];
    let mut patch=headers.join("\n"); patch.push('\n');
    patch.push_str(heading);patch.push('\n');
    for row in selected {patch.push_str(&row);patch.push('\n');}
    // git apply --recount updates the hunk line counts; -R un-stages the selected
    // lines from the index without changing the worktree.
    for check in [true,false] {
        let mut cmd=Command::new("git");cmd.arg("-C").arg(&root).args(["apply","--cached","--recount","--unidiff-zero"]);
        if staged {cmd.arg("--reverse");}
        if check {cmd.arg("--check");}
        let mut child=cmd.arg("-").stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(err)?;
        child.stdin.take().ok_or("Could not open Git patch input")?.write_all(patch.as_bytes()).map_err(err)?;
        let result=child.wait_with_output().map_err(err)?;
        if !result.status.success(){return Err(format!("Git could not apply selected changes: {}",String::from_utf8_lossy(&result.stderr).trim()));}
    }
    Ok(())
}
#[tauri::command]
pub(crate) fn stage_file(path:String,file:String)->Result<(),String>{safe_file(&file)?;git_run(&repo_root(&path)?,&["add","--",&file]).map(|_|())}
#[tauri::command]
pub(crate) fn unstage_file(path:String,file:String)->Result<(),String>{
    safe_file(&file)?;let root=repo_root(&path)?;
    if git_run(&root,&["rev-parse","--verify","HEAD"]).is_ok(){git_run(&root,&["restore","--staged","--",&file])?;}
    else{git_run(&root,&["rm","--cached","--ignore-unmatch","--",&file])?;}
    Ok(())
}
#[tauri::command]
pub(crate) fn stage_all(path:String)->Result<(),String>{git_run(&repo_root(&path)?,&["add","--all"]).map(|_|())}
#[tauri::command]
pub(crate) fn create_commit(path:String,message:String,amend:bool,tracked:bool,skip_hooks:bool,signoff:bool)->Result<String,String>{
    if message.trim().is_empty() || message.len()>100_000 {return Err("Enter a commit message".into());}
    let root=repo_root(&path)?;
    let mut args=vec!["commit"];
    if tracked { args.push("--all"); }
    if amend { args.push("--amend"); }
    if skip_hooks { args.push("--no-verify"); }
    if signoff { args.push("--signoff"); }
    args.extend(["-m",message.trim()]);
    git_run(&root,&args)?;
    git_run(&root,&["rev-parse","--short","HEAD"]).map(|s|s.trim().to_owned())
}
