import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
export function FooterAction({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="footer-action"
                    aria-label={title}
                    onClick={onClick}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent>{title}</TooltipContent>
        </Tooltip>
    );
}
