"use client";
import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
export const Select = Primitive.Root;
export const SelectGroup = Primitive.Group;
export const SelectValue = Primitive.Value;
export const SelectTrigger = React.forwardRef<React.ElementRef<typeof Primitive.Trigger>, React.ComponentPropsWithoutRef<typeof Primitive.Trigger>>(
    ({ className, children, ...props }, ref) => (
        <Primitive.Trigger
            ref={ref}
            className={cn(
                "flex h-9 min-w-32 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring/60 disabled:opacity-50 [&_svg]:size-4",
                className,
            )}
            {...props}
        >
            {children}
            <Primitive.Icon asChild>
                <ChevronDown className="opacity-60" />
            </Primitive.Icon>
        </Primitive.Trigger>
    ),
);
export const SelectContent = React.forwardRef<React.ElementRef<typeof Primitive.Content>, React.ComponentPropsWithoutRef<typeof Primitive.Content>>(
    ({ className, children, position = "popper", ...props }, ref) => (
        <Primitive.Portal>
            <Primitive.Content
                ref={ref}
                position={position}
                sideOffset={4}
                className={cn(
                    "alder-portal-menu z-50 max-h-[var(--radix-select-content-available-height)] min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
                    className,
                )}
                {...props}
            >
                <Primitive.ScrollUpButton className="flex justify-center p-1">
                    <ChevronUp className="size-4" />
                </Primitive.ScrollUpButton>
                <Primitive.Viewport className="p-1">{children}</Primitive.Viewport>
                <Primitive.ScrollDownButton className="flex justify-center p-1">
                    <ChevronDown className="size-4" />
                </Primitive.ScrollDownButton>
            </Primitive.Content>
        </Primitive.Portal>
    ),
);
export const SelectItem = React.forwardRef<React.ElementRef<typeof Primitive.Item>, React.ComponentPropsWithoutRef<typeof Primitive.Item>>(
    ({ className, children, ...props }, ref) => (
        <Primitive.Item
            ref={ref}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:opacity-50",
                className,
            )}
            {...props}
        >
            <span className="absolute left-2 flex size-4 items-center justify-center">
                <Primitive.ItemIndicator>
                    <Check className="size-4" />
                </Primitive.ItemIndicator>
            </span>
            <Primitive.ItemText>{children}</Primitive.ItemText>
        </Primitive.Item>
    ),
);
export const SelectLabel = Primitive.Label;
export const SelectSeparator = Primitive.Separator;
export function SelectField({
    value,
    onValueChange,
    options,
    label,
    className,
    id,
}: {
    value: string;
    onValueChange: (value: string) => void;
    options: { value: string; label: string }[];
    label: string;
    className?: string;
    id?: string;
}) {
    return (
        <Select
            value={value}
            onValueChange={onValueChange}
        >
            <SelectTrigger
                id={id}
                aria-label={label}
                className={className}
            >
                <SelectValue placeholder={label} />
            </SelectTrigger>
            <SelectContent>
                {options.map((o) => (
                    <SelectItem
                        key={o.value}
                        value={o.value}
                    >
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
