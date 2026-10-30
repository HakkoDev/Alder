import { useMemo, type CSSProperties } from "react";
import type { Commit } from "../lib/types";

const COLORS = ["#7c9bea", "#cb97df", "#e4a676", "#6dbdb2", "#d7bf74", "#9dbb78", "#88b7d8", "#d98ba2"];
const SPACING = 17;
const MAX_LANES = 8;
type GraphRow = {hash:string; lane:number; incoming:number[]; outgoing:{from:number;to:number}[]; refs:string[]};
// A compact lane graph: connect each active head to its first parent, then insert merge parents.
// The graph is based on real parent hashes supplied by `git log --all --topo-order`.
export function layoutGraph(commits:Commit[]):{rows:GraphRow[];width:number}{
    const heads:string[]=[];let largest=0;
    const rows=commits.map((c):GraphRow=>{
        let lane=heads.indexOf(c.hash);
        if(lane===-1){lane=heads.findIndex(x=>!x);if(lane===-1)lane=heads.length;heads.splice(lane,0,c.hash);}
        const incoming=heads.map((hash,i)=>hash?i:-1).filter(i=>i>=0);
        const before=[...heads];heads.splice(lane,1);
        c.parents.forEach((parent,i)=>{
            if(!heads.includes(parent))heads.splice(Math.min(lane+i,heads.length),0,parent);
        });
        const outgoing=before.flatMap((hash,from)=>{
            if(hash===c.hash)return c.parents.map(parent=>({from,to:heads.indexOf(parent)})).filter(x=>x.to>=0);
            const to=heads.indexOf(hash);return to>=0?[{from,to}]:[];
        });
        largest=Math.max(largest,lane+1,heads.length);
        return {hash:c.hash,lane,incoming,outgoing,refs:c.refs.split(",").map(r=>r.trim()).filter(Boolean)};
    });
    return {rows,width:Math.min(MAX_LANES,Math.max(2,largest))*SPACING+16};
}
export function GitGraph({commits}:{commits:Commit[]}){
    const graph=useMemo(()=>layoutGraph(commits),[commits]);
    return <div className="git-graph-list" style={{"--graph-width":`${graph.width}px`} as CSSProperties}>
      {commits.map((commit,i)=>{
        const row=graph.rows[i],cx=(lane:number)=>13+Math.min(lane,MAX_LANES-1)*SPACING;
        return <div key={commit.hash} className="git-graph-row" title={`${commit.hash}\n${commit.subject}`}>
            <svg className="git-graph-svg" width={graph.width} height="40" aria-label={`Commit graph lane ${row.lane+1}`}>
                {row.incoming.filter(lane=>lane!==row.lane).map(lane=><path key={`in-${lane}`} d={`M${cx(lane)},0 L${cx(lane)},20`} stroke={COLORS[lane%COLORS.length]} strokeWidth="2" fill="none" opacity=".75"/>)}
                {row.outgoing.map((edge,j)=><path key={j} d={`M${cx(edge.from)},20 C${cx(edge.from)},31 ${cx(edge.to)},27 ${cx(edge.to)},40`} stroke={COLORS[edge.from%COLORS.length]} strokeWidth="2" fill="none" opacity=".9"/>)}
                <path d={`M${cx(row.lane)},0 V20`} stroke={COLORS[row.lane%COLORS.length]} strokeWidth="2"/>
                <circle cx={cx(row.lane)} cy="20" r={i===0?5:4} fill={i===0?COLORS[row.lane%COLORS.length]:"var(--card)"} stroke={COLORS[row.lane%COLORS.length]} strokeWidth="2"/>
            </svg>
            <div className="graph-commit-details"><div className="graph-commit-title">{commit.subject}</div><div className="graph-commit-subtitle">{commit.author} · {commit.date}</div></div>
            <div className="graph-commit-tags">{row.refs.slice(0,2).map(ref=><span key={ref} className="graph-ref">{ref.replace(/^HEAD -> /, "")}</span>)}<code>{commit.shortHash}</code></div>
        </div>;
      })}
    </div>;
}
