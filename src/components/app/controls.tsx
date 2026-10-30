import { isValidElement, type ReactNode } from "react";
import { LoaderCircle, FolderGit2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
export function AppIcon({size=18}: {size?: number}) {
    return <span aria-hidden="true" style={{fontSize:size*0.89,fontWeight:780,fontFamily:"ui-sans-serif,system-ui,sans-serif",letterSpacing:"-.075em",lineHeight:1}}>A</span>;
}
export function IconButton({title,children,onClick,disabled=false,className=""}:{title:string;children:ReactNode;onClick:()=>void;disabled?:boolean;className?:string}){
    return <Tooltip><TooltipTrigger asChild><button title={title} aria-label={title} className={`icon-button ${className}`} onClick={onClick} disabled={disabled}>{children}</button></TooltipTrigger><TooltipContent>{title}</TooltipContent></Tooltip>;
}
function buttonText(children:ReactNode):string {
    if(typeof children==="string"||typeof children==="number")return String(children);
    if(Array.isArray(children))return children.map(buttonText).join(" ").trim();
    if(isValidElement<{children?:ReactNode}>(children))return buttonText(children.props.children);
    return "";
}
export function PButton({children,onClick,variant="secondary",disabled=false,loading=false,title}:{children:ReactNode;onClick:()=>void;variant?:"primary"|"secondary"|"ghost"|"danger";disabled?:boolean;loading?:boolean;title?:string}){
    const button=<button title={title} className={`p-button ${variant}`} onClick={onClick} disabled={disabled||loading}>{loading?<LoaderCircle size={15} className="spin"/>:null}{children}</button>;
    const tooltip=title||buttonText(children)||"Run action";
    return <Tooltip><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>;
}
export function Empty({icon:Icon,title,description,children}:{icon:typeof FolderGit2;title:string;description:string;children?:ReactNode}){
    return <div className="empty"><div className="empty-icon"><Icon size={26} strokeWidth={1.6}/></div><h3>{title}</h3><p>{description}</p>{children && <div className="empty-actions">{children}</div>}</div>;
}
export function getError(e:unknown){return e instanceof Error?e.message:String(e);}
