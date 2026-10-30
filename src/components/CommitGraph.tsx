import { useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import type { Commit } from "../lib/types";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "./ui/context-menu";

const COLORS=["#7d9fe2","#c9a96e","#8dc8a8","#be96d8","#e58e99","#75bfd5","#d4bf7d","#a7a0ef"];
type GraphRow={commit:Commit;lane:number;previous:number[];next:number[];edges:{from:number;to:number}[];width:number};
/** Topology, not decoration: each active lane tracks the hash it is awaiting. */
export function layoutGraph(commits:Commit[]):GraphRow[]{
  let lanes:string[]=[];
  return commits.map(commit=>{
    let lane=lanes.indexOf(commit.hash);
    if(lane<0){lane=lanes.length?0:0;lanes.splice(lane,0,commit.hash);}
    const previous=lanes.map((_,i)=>i);
    const updated=[...lanes];
    updated.splice(lane,1);
    const parents=commit.parents.filter((hash,i)=>hash&&commit.parents.indexOf(hash)===i);
    if(parents[0]&&!updated.includes(parents[0]))updated.splice(Math.min(lane,updated.length),0,parents[0]);
    for(const hash of parents.slice(1)) if(!updated.includes(hash))updated.splice(Math.min(lane+1,updated.length),0,hash);
    const edges:GraphRow["edges"]=[];
    for(let i=0;i<lanes.length;i++){
      const hash=lanes[i];
      if(i===lane){for(const parent of parents){const to=updated.indexOf(parent);if(to>=0)edges.push({from:i,to});}}
      else {const to=updated.indexOf(hash);if(to>=0)edges.push({from:i,to});}
    }
    lanes=updated;
    return {commit,lane,previous,next:lanes.map((_,i)=>i),edges,width:Math.max(1,previous.length,lanes.length)};
  });
}
export function CommitGraph({history,onCherryPick,onRevert,onBranch}:{history:Commit[];onCherryPick:(hash:string)=>void;onRevert:(hash:string)=>void;onBranch:(hash:string)=>void}){
  const rows=useMemo(()=>layoutGraph(history),[history]);
  const [selected,setSelected]=useState<string|null>(null);
  const maxLanes=Math.max(1,...rows.map(x=>x.width));
  return <div className="zed-history" role="list" aria-label="Commit graph and history">{rows.map((row,i)=>{
    const c=row.commit;const x=(n:number)=>12+n*18;const paths=row.edges.map((edge,n)=>{
      const start=x(edge.from),end=x(edge.to);
      return <path key={n} d={start===end?`M ${start} 0 L ${end} 42`:`M ${start} 0 C ${start} 18 ${end} 24 ${end} 42`} stroke={COLORS[edge.from%COLORS.length]} strokeWidth="2" fill="none"/>;
    });
    const refNames=c.refs.split(",").map(r=>r.trim().replace(/^HEAD -> /,"HEAD · ")).filter(Boolean);
    return <ContextMenu key={c.hash}><ContextMenuTrigger asChild><button role="listitem" title={`${c.hash}\n${c.author} · ${c.date}`} className={`zed-history-row ${selected===c.hash?"selected":""}`} onClick={()=>setSelected(c.hash)}>
      <svg aria-hidden="true" className="zed-graph" width={Math.max(36,maxLanes*18+16)} height="42" viewBox={`0 0 ${Math.max(36,maxLanes*18+16)} 42`}><>{paths}</><circle cx={x(row.lane)} cy="21" r={i===0?5.5:4.5} stroke={COLORS[row.lane%COLORS.length]} strokeWidth="2.4" fill={i===0?COLORS[row.lane%COLORS.length]:"var(--card)"}/></svg>
      <span className="zed-commit-body"><span className="zed-commit-subject">{c.subject}</span><span className="zed-commit-description">{c.author}<span aria-hidden="true">·</span>{c.date}</span></span>
      <span className="zed-commit-refs">{refNames.slice(0,3).map((ref,n)=><span className={`zed-ref ${ref.includes("HEAD")?"head":""}`} key={n}><GitBranch size={11}/>{ref}</span>)}</span>
      <code className="zed-sha">{c.shortHash}</code>
    </button></ContextMenuTrigger><ContextMenuContent><ContextMenuItem onSelect={()=>void navigator.clipboard.writeText(c.hash)}>Copy commit SHA</ContextMenuItem><ContextMenuItem onSelect={()=>onBranch(c.hash)}>Create branch at this commit</ContextMenuItem><ContextMenuItem onSelect={()=>onCherryPick(c.hash)}>Cherry-pick</ContextMenuItem><ContextMenuItem onSelect={()=>onRevert(c.hash)}>Revert</ContextMenuItem></ContextMenuContent></ContextMenu>})}</div>;
}
