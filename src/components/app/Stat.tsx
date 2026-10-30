import { FolderGit2 } from "lucide-react";
export function Stat({icon:Icon,label,value,hint,color=""}:{icon:typeof FolderGit2;label:string;value:number;hint:string;color?:string}){
    return <div className={`stat-card ${color}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18}/></span></div><div className="stat-value">{value}</div><p>{hint}</p></div>;
}
