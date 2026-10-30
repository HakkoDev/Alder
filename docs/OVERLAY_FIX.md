# v0.2.3 overlay regression fix

The shadcn migration used utilities such as `bg-popover`, `text-popover-foreground`, and `bg-accent` while the Tailwind v4 `@theme inline` only registered a subset of those colors. Because Radix menu content is portaled outside the application shell, the missing colors made the surfaces transparent. Components now use `.alder-portal-menu` with explicit CSS variables which track Morrow/Alder theme selection.

Dialogs simultaneously applied Tailwind translations and legacy `.modal-content` transforms, resulting in offset modals. The shared DialogContent now uses a single centered transform, and command palette follows the same positioning. Header-owned close buttons use `hideClose`; other dialogs keep the built-in close action.

## Verification

Run `node --test scripts/*.test.mjs`, then on a development machine run `bun install`, `bun run typecheck`, `bun run build`, `cargo check --manifest-path src-tauri/Cargo.toml`, and `bun run tauri:dev`. Manual checks must cover right-click repos/files/graph, Git action dropdowns, settings/confirmation dialogs, command palette, color theme switching, nested menus, and focus restoration. Do not call this a verified native build until these pass.
