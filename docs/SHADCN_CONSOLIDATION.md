# shadcn component consolidation (v0.2.2)

Alder retains the Morrow/Alder semantic CSS variables and all preset themes. The following source modules are now the single implementation point for their respective shadcn-style components:

- `src/components/ui/button.tsx`: shadcn variant-based Button (existing)
- `src/components/ui/dropdown-menu.tsx`: Radix-backed shadcn DropdownMenu, Group, Trigger, Content, Item, CheckboxItem, RadioItem, Label, Separator, Submenu, Shortcut
- `src/components/ui/context-menu.tsx`: Radix-backed shadcn ContextMenu, Trigger, Content, Item, CheckboxItem, Separator, Label, Submenu
- `src/components/ui/dialog.tsx`: Radix-backed shadcn Dialog, Trigger, Portal, Overlay, Content, Header, Footer, Title, Description, Close
- `src/components/ui/select.tsx`: Radix-backed shadcn Select, Trigger, Value, Content, Item, Group, Label, Separator, and a project-specific `SelectField` convenience composition
- `src/components/ui/input.tsx`, `scroll-area.tsx`, `separator.tsx`, `tooltip.tsx`: existing Radix/shadcn-style components

The extra `git-menu.tsx` implementation was removed. CommitGraph uses shared ContextMenu directly. App and AdvancedGit use shared Dialog; settings and advanced-Git select fields use shared SelectField. No second menu styling implementation should be reintroduced. These are checked-in, shadcn-compatible source components, not a claim that `shadcn add` ran in this environment.

## Verification / release blockers

- 15/15 source-contract and disposable-Git tests pass.
- Syntax transpilation of project TS/TSX: zero diagnostics (excluding `vite-env.d.ts`, which is a declaration-only file).
- `npm install` timed out in the execution environment; full `tsc --noEmit`, Vite build, native Cargo check, Windows GUI and signed package tests **not run**.
- Visual regression and keyboard/screen-reader testing of menus, nested dialogs, focus return, and theme contrast are still required before marking this migration complete.
