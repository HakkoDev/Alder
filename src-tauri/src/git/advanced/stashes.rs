//! stashes operations.
use crate::*;

#[tauri::command]
pub(crate) fn list_stashes(path:String)->Result<Vec<StashInfo>,String>{
    let root=repo_root(&path)?;
    let output=git_run(&root,&["stash","list","--format=%gd%x1f%gs%x1e"])?;
    Ok(output.split('\u{1e}').filter_map(|item|{
        let (reference,message)=item.trim().split_once('\u{1f}')?;
        Some(StashInfo{reference:reference.into(),message:message.into()})
    }).collect())
}
pub(crate) fn validate_stash(root:&Path,reference:&str)->Result<(),String>{
    if !reference.starts_with("stash@{")||!reference.ends_with('}')||!reference[7..reference.len()-1].chars().all(|c|c.is_ascii_digit()){
        return Err("Invalid stash selector".into());
    }
    if !list_stashes(root.to_string_lossy().to_string())?.iter().any(|s|s.reference==reference){return Err("Stash no longer exists".into());}
    Ok(())
}
#[tauri::command]
pub(crate) fn create_stash(path:String,message:String,include_untracked:bool)->Result<String,String>{
    let root=repo_root(&path)?;
    if changes(&root)?.is_empty(){return Err("No changes to stash".into());}
    if message.len()>500{return Err("Stash message too long".into());}
    let mut args=vec!["stash","push"];
    if include_untracked{args.push("--include-untracked");}
    if !message.trim().is_empty(){args.extend(["-m",message.trim()]);}
    git_run(&root,&args)
}
#[tauri::command]
pub(crate) fn stash_action(path:String,reference:String,action:String)->Result<String,String>{
    let root=repo_root(&path)?;
    validate_stash(&root,&reference)?;
    match action.as_str(){
        "show"=>git_run(&root,&["stash","show","--patch","--no-ext-diff","--no-color",&reference]),
        "apply"=>git_run(&root,&["stash","apply","--index",&reference]),
        "drop"=>git_run(&root,&["stash","drop",&reference]),
        _=>Err("Unknown stash operation".into())
    }
}
