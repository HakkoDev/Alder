"use client";
import * as Primitive from "@radix-ui/react-context-menu";
import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
export const ContextMenu = Primitive.Root;
export const ContextMenuTrigger = Primitive.Trigger;
export const ContextMenuGroup = Primitive.Group;
export const ContextMenuSub = Primitive.Sub;
export const ContextMenuSubTrigger = Primitive.SubTrigger;
export const ContextMenuSubContent = Primitive.SubContent;
export const ContextMenuContent = React.forwardRef<React.ElementRef<typeof Primitive.Content>, React.ComponentPropsWithoutRef<typeof Primitive.Content>>(
    ({ className, ...props }, ref) => (
        <Primitive.Portal>
            <Primitive.Content
                ref={ref}
                collisionPadding={12}
                className={cn(
                    "alder-portal-menu z-50 min-w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
                    className,
                )}
                {...props}
            />
        </Primitive.Portal>
    ),
);
export const ContextMenuItem = React.forwardRef<
    React.ElementRef<typeof Primitive.Item>,
    React.ComponentPropsWithoutRef<typeof Primitive.Item> & { inset?: boolean; destructive?: boolean }
>(({ className, inset, destructive, ...props }, ref) => (
    <Primitive.Item
        ref={ref}
        className={cn(
            "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:opacity-50 [&_svg]:size-4",
            inset && "pl-8",
            destructive && "text-destructive focus:text-destructive",
            className,
        )}
        {...props}
    />
));
export const ContextMenuCheckboxItem = React.forwardRef<
    React.ElementRef<typeof Primitive.CheckboxItem>,
    React.ComponentPropsWithoutRef<typeof Primitive.CheckboxItem>
>(({ className, children, ...props }, ref) => (
    <Primitive.CheckboxItem
        ref={ref}
        className={cn("flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent", className)}
        {...props}
    >
        <Primitive.ItemIndicator>
            <Check className="size-4" />
        </Primitive.ItemIndicator>
        {children}
    </Primitive.CheckboxItem>
));
export const ContextMenuSeparator = React.forwardRef<React.ElementRef<typeof Primitive.Separator>, React.ComponentPropsWithoutRef<typeof Primitive.Separator>>(
    ({ className, ...props }, ref) => (
        <Primitive.Separator
            ref={ref}
            className={cn("-mx-1 my-1 h-px bg-border", className)}
            {...props}
        />
    ),
);
export const ContextMenuLabel = React.forwardRef<React.ElementRef<typeof Primitive.Label>, React.ComponentPropsWithoutRef<typeof Primitive.Label>>(
    ({ className, ...props }, ref) => (
        <Primitive.Label
            ref={ref}
            className={cn("px-2 py-1.5 text-xs font-semibold", className)}
            {...props}
        />
    ),
);
