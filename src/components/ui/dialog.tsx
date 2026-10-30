"use client";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogPortal = Primitive.Portal;
export const DialogClose = Primitive.Close;
export const DialogOverlay = React.forwardRef<React.ElementRef<typeof Primitive.Overlay>, React.ComponentPropsWithoutRef<typeof Primitive.Overlay>>(
    ({ className, ...props }, ref) => (
        <Primitive.Overlay
            ref={ref}
            className={cn(
                "alder-dialog-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out",
                className,
            )}
            {...props}
        />
    ),
);
export const DialogContent = React.forwardRef<
    React.ElementRef<typeof Primitive.Content>,
    React.ComponentPropsWithoutRef<typeof Primitive.Content> & { hideClose?: boolean }
>(({ className, children, hideClose = false, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <Primitive.Content
            ref={ref}
            className={cn(
                "alder-dialog-content fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(94vw,720px)] flex-col overflow-y-auto rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl outline-none",
                className,
            )}
            {...props}
        >
            {children}
            {!hideClose && (
                <Primitive.Close
                    aria-label="Close dialog"
                    className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    <X className="size-4" />
                </Primitive.Close>
            )}
        </Primitive.Content>
    </DialogPortal>
));
export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn("flex flex-col gap-1.5 text-left", className)}
        {...props}
    />
);
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn("mt-4 flex flex-row justify-end gap-2", className)}
        {...props}
    />
);
export const DialogTitle = React.forwardRef<React.ElementRef<typeof Primitive.Title>, React.ComponentPropsWithoutRef<typeof Primitive.Title>>(
    ({ className, ...props }, ref) => (
        <Primitive.Title
            ref={ref}
            className={cn("text-lg font-semibold leading-none tracking-tight", className)}
            {...props}
        />
    ),
);
export const DialogDescription = React.forwardRef<React.ElementRef<typeof Primitive.Description>, React.ComponentPropsWithoutRef<typeof Primitive.Description>>(
    ({ className, ...props }, ref) => (
        <Primitive.Description
            ref={ref}
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    ),
);
