import type { ReactNode } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as Context from "@radix-ui/react-context-menu";
import { Check, ChevronRight } from "lucide-react";

export function ActionMenu({
    trigger,
    items,
    align = "end",
    disabled = false,
}: {
    trigger: ReactNode;
    items: { label: string; description?: string; onSelect: () => void; danger?: boolean; disabled?: boolean; separator?: boolean }[];
    align?: "start" | "end";
    disabled?: boolean;
}) {
    return (
        <Dropdown.Root>
            <Dropdown.Trigger
                asChild
                disabled={disabled}
            >
                {trigger}
            </Dropdown.Trigger>
            <Dropdown.Portal>
                <Dropdown.Content
                    className="shadcn-menu"
                    align={align}
                    sideOffset={5}
                    collisionPadding={12}
                >
                    {items.map((item, i) =>
                        item.separator ? (
                            <Dropdown.Separator
                                key={i}
                                className="shadcn-menu-divider"
                            />
                        ) : (
                            <Dropdown.Item
                                key={`${item.label}-${i}`}
                                className={`shadcn-menu-item ${item.danger ? "destructive" : ""}`}
                                disabled={item.disabled}
                                onSelect={item.onSelect}
                            >
                                <span className="shadcn-menu-label">
                                    {item.label}
                                    {item.description ? <small>{item.description}</small> : null}
                                </span>
                            </Dropdown.Item>
                        ),
                    )}
                </Dropdown.Content>
            </Dropdown.Portal>
        </Dropdown.Root>
    );
}
export function RightClickMenu({
    children,
    items,
}: {
    children: ReactNode;
    items: { label: string; description?: string; onSelect: () => void; danger?: boolean; disabled?: boolean; separator?: boolean }[];
}) {
    return (
        <Context.Root>
            <Context.Trigger asChild>{children}</Context.Trigger>
            <Context.Portal>
                <Context.Content
                    className="shadcn-menu"
                    collisionPadding={12}
                >
                    {items.map((item, i) =>
                        item.separator ? (
                            <Context.Separator
                                key={i}
                                className="shadcn-menu-divider"
                            />
                        ) : (
                            <Context.Item
                                key={`${item.label}-${i}`}
                                className={`shadcn-menu-item ${item.danger ? "destructive" : ""}`}
                                disabled={item.disabled}
                                onSelect={item.onSelect}
                            >
                                <span className="shadcn-menu-label">
                                    {item.label}
                                    {item.description ? <small>{item.description}</small> : null}
                                </span>
                            </Context.Item>
                        ),
                    )}
                </Context.Content>
            </Context.Portal>
        </Context.Root>
    );
}
export function NativeSelect({
    value,
    onValueChange,
    options,
    placeholder = "Select",
    className = "",
}: {
    value: string;
    onValueChange: (s: string) => void;
    options: { label: string; value: string }[];
    placeholder?: string;
    className?: string;
}) {
    // Standard Radix Select is the same primitive used by shadcn/ui.
    return (
        <SelectPrimitive
            value={value}
            onValueChange={onValueChange}
            options={options}
            placeholder={placeholder}
            className={className}
        />
    );
}
import * as Select from "@radix-ui/react-select";
function SelectPrimitive({
    value,
    onValueChange,
    options,
    placeholder,
    className,
}: {
    value: string;
    onValueChange: (s: string) => void;
    options: { label: string; value: string }[];
    placeholder: string;
    className: string;
}) {
    return (
        <Select.Root
            value={value}
            onValueChange={onValueChange}
        >
            <Select.Trigger
                className={`shadcn-select ${className}`}
                aria-label={placeholder}
            >
                <Select.Value placeholder={placeholder} />
                <Select.Icon>
                    <ChevronRight
                        size={14}
                        className="select-chevron"
                    />
                </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Content
                    position="popper"
                    sideOffset={5}
                    className="shadcn-select-content"
                >
                    <Select.Viewport>
                        {options.map((o) => (
                            <Select.Item
                                value={o.value}
                                key={o.value}
                                className="shadcn-select-item"
                            >
                                <Select.ItemText>{o.label}</Select.ItemText>
                                <Select.ItemIndicator>
                                    <Check size={14} />
                                </Select.ItemIndicator>
                            </Select.Item>
                        ))}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
}
