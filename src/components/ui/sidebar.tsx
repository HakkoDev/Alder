import { createContext, useCallback, useContext, useEffect, useState, type HTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "../../lib/utils";

type SidebarContextValue = { open: boolean; setOpen: (open: boolean) => void; toggleSidebar: () => void };
const SidebarContext = createContext<SidebarContextValue | null>(null);
export function useSidebar() { const value=useContext(SidebarContext); if(!value) throw new Error("useSidebar must be used within SidebarProvider"); return value; }
export function SidebarProvider({children,defaultOpen=true,className}:{children:ReactNode;defaultOpen?:boolean;className?:string}) {
  const [open,setOpen]=useState(()=>{try {const value=localStorage.getItem("alder.sidebar.open");return value===null?defaultOpen:value==="true";}catch{return defaultOpen;}});
  const toggleSidebar=useCallback(()=>setOpen(v=>!v),[]);
  useEffect(()=>{try{localStorage.setItem("alder.sidebar.open",String(open));}catch{/* optional */}},[open]);
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="b"&&!event.altKey){event.preventDefault();toggleSidebar();}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[toggleSidebar]);
  return <SidebarContext.Provider value={{open,setOpen,toggleSidebar}}><div className={cn("sidebar-provider",className)} data-sidebar-state={open?"expanded":"collapsed"} style={{"--sidebar-width":open?"257px":"64px"} as CSSProperties}>{children}</div></SidebarContext.Provider>;
}
export function Sidebar({children,className,...props}:HTMLAttributes<HTMLElement>){const {open}=useSidebar();return <aside data-state={open?"expanded":"collapsed"} className={cn("sidebar",className)} {...props}>{children}</aside>}
export function SidebarHeader({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("sidebar-header",className)} {...props}/>}
export function SidebarContent({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("sidebar-content",className)} {...props}/>}
export function SidebarFooter({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("sidebar-footer",className)} {...props}/>}
export function SidebarInset({className,...props}:HTMLAttributes<HTMLElement>){return <main className={cn("sidebar-inset",className)} {...props}/>}
export function SidebarTrigger({className,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>){const {toggleSidebar}=useSidebar();return <button type="button" className={cn("sidebar-trigger icon-button",className)} aria-label="Toggle sidebar (Ctrl+B)" title="Toggle sidebar (Ctrl+B)" {...props} onClick={e=>{toggleSidebar();props.onClick?.(e)}}><PanelLeft size={17}/></button>}
export function SidebarGroup({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("sidebar-group",className)} {...props}/>}
export function SidebarGroupLabel({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("sidebar-heading",className)} {...props}/>}
export function SidebarMenu({className,...props}:HTMLAttributes<HTMLElement>){return <nav className={cn("nav-list",className)} {...props}/>}
export function SidebarMenuItem({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("sidebar-menu-item",className)} {...props}/>}
