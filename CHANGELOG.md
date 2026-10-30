## v0.3.3 — UI polish and Rust quality workflows

- Repositioned command search to the header trailing actions and breadcrumbs immediately beside the sidebar trigger.
- Moved theme selection to the bottom of Appearance settings.
- Added GitHub CLI manual links in GitHub connected and setup states.
- Added Morrow-equivalent rustfmt/clippy and Biome command scripts.
- Polished header spacing, focus states, theme cards, and small-screen search collapse.

## v0.3.1 — Rust backend organization (source candidate)

- Split Git, advanced Git, repository SQLite and GitHub commands into dedicated Rust modules while retaining Tauri IPC command names.
- Added architecture guide and updated source-contract tests for the modular tree.
- 31/31 Node/Git tests passed; native Cargo/Tauri validation pending.

## 0.3.0 — GitHub integration source candidate

- GitHub CLI credential broker and GitHub PR/issue dashboard.
- PR detail, file summaries, checks, create and review actions.
- Safe setup/error states and connected footer counters.
- Native compilation and full integration checks outstanding.

# v0.2.5 — Feedback & performance source candidate

- Sonner bottom-right toasts for actions and errors, skeletons/spinners for repository/changes/diff/history loading.
- Nonblocking prioritized status loading, stale-request protection and bounded concurrent dashboard Git scanning.
- Source tests passed; native and full typecheck not verified.

## v0.2.4 — Dropdown surface hotfix (source candidate)

- Fixed missing `alder-portal-menu` class on top-level `DropdownMenuContent` that left main dropdowns transparent while nested/context menus were opaque.
- Explicit portal background uses the active Alder/Morrow `--popover` palette token.
- Added targeted regression test to catch this exact omission. Native Tauri UI verification remains outstanding.

## v0.2.3 — Dialog and menu positioning hotfix

- Restored opaque themed backgrounds to ContextMenu, DropdownMenu and Select portaled surfaces.
- Corrected centered dialog positioning and command-palette alignment.
- Removed duplicate dialog close buttons while preserving each screen’s existing control.
- Added overlay regression tests. Native app build and visual QA remain unverified.

# Changelog

## 0.2.1 — Phase 2.1 UX and safe Git actions (2026-10-30)

**Source candidate only. No native release has been verified.**

- Workspace selector in the sidebar header; contextual repository management, including safe unregister without deleting files.
- Connected resizable staging/diff pane, multi-selection and bulk staging/unstaging.
- Colored multi-lane DAG history graph from commit parent hashes.
- Radix/shadcn-style menus and dialogs throughout the Git workflow, including advanced operation confirmation.
- Fetch/Pull/Push split actions with explicit remotes, rebase pull and guarded `--force-with-lease`.
- Commit staged/tracked, amend, no-verify and sign-off options.
- Interactive footer links and tooltips, 32px matched footer, stable scrollbar gutters, removed promo panels/settings duplication.
- Copyright © Hakko & Contributors.
- Source-contract and disposable Git tests for tracked commits, sign-off/no-verify and force-with-lease.



## 0.2.0 — Phase 2 source candidate (2026-10-30)

**Status:** Partial implementation, not a tested desktop release.

### Changed
- Alder-only storm-blue / slate color palette, set as the default; Morrow's typography/size/radius rules and all original theme choices remain.
- A-only application icon in UI and Tauri raster/vector assets.
- Removed redundant eyebrow headings, the header refresh button, and the footer's status-light / “Local-first” indicator.
- Copyright in the sidebar; live branch, changes, ahead/behind, worktree, stash counts in the bottom status bar. PR/issue counts are explicitly unavailable pending provider integration.
- Native and Radix tooltips on action, icon, and navigation buttons.

### Added
- Rust Git worktree list/create/safe removal and desktop Worktree view.
- Stash create/list/preview/apply/drop, with separate untracked-file option and preserved index.
- Merge/squash merge, branch-based rebase, Git operation detection, abort/continue, conflict resolution via ours/theirs selection or a basic manual three-way text editor.
- Cherry-pick and revert selected hashes, reflog inspector, recovery branch creation, local branch rename/delete.
- Disposable Git fixture tests covering worktrees, dirty-removal rejection, stash/index apply, merge conflict resolution, and rebase abort.

### Pending
- Native builds and real packaged UI smoke tests, full interactive rebase, three-way/manual merge editor, worktree repair/compare, branch graph, reset/discard snapshots, operation log, extended recovery and performance QA.

## 0.1.0 — Phase 1 source candidate
- Initial Tauri/React/Rust app, Git repository management, staging, unified diff, commit, branches, fetch/pull/push, overview and Morrow themes.

## v0.2.2 — shadcn component consolidation (source candidate)

- Consolidated dropdown menus, context menus, dialogs, and select controls into shared `src/components/ui/` shadcn-style components built on the upstream Radix primitives, with standard shadcn exports and Tailwind semantic tokens.
- Converted the commit graph context menu from the bespoke `git-menu.tsx` facade to `ContextMenu`/`ContextMenuItem`, then removed the redundant facade.
- Migrated app and advanced-Git dialogs from raw Radix primitives to the shared `Dialog` components; retained the current UX, accessibility descriptions and Alder's colors/Morrow themes.
- Migrated settings and Git operation selects to a shared `SelectField` adapter composed from the standard `SelectTrigger`, `SelectValue`, `SelectContent`, and `SelectItem` components.
- Preserved existing Git operations, safety prompts, keyboard semantics, and all theme choices.
- Verified all 15 existing Node/Git fixture tests pass and all TypeScript/TSX sources transpile without syntax diagnostics. **Not native compiled or full typechecked:** package installation timed out, and Cargo is unavailable in this environment.

## v0.2.6 — Sidebar & workspace responsiveness (source candidate)

- Added shared shadcn-style sidebar primitives (`SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarInset`, `SidebarTrigger`, `SidebarMenu`), persistent collapsible layout and Ctrl+B / Cmd+B shortcut.
- Removed full repository/Git status scans after removing a repository from Alder or changing workspace membership.
- Workspace assignments now update optimistically with rollback on database failure. New workspace creation updates the switcher without a repository rescan.
- Retained Git commands and existing asynchronous status-first loading for real Git changes. Native build and performance benchmarks remain unverified.

## v0.2.7 — Changes list, partial staging and localization foundation (source candidate)
- Added shadcn DropdownMenu sorting by full path, file name or Git status, ascending/descending.
- Renamed global quick search label to Search.
- Added Rust Git index-only patch staging for individual hunks and changed lines, with a dry-run check, index-safe reverse-apply for unstaging, and rejection of binary/combined diffs. Controls appear on diff hunk headers and changed lines.
- Added typed English translation catalog, reusable translation hook, interpolation and persisted system/English language preferences. Initial key extraction covers navigation, search, sorting and partial staging, with further localization required.
- Added real Git partial-line stage/unstage regression and source-contract tests.
- Native Rust/Tauri build, dependency-resolved TypeScript typechecking and GUI tests remain unverified.

## 0.3.4 — Provider follow-ups and React component extraction
- PR worktree checkout, notification/tag/release lists, API rate-limit panel.
- Extracted settings, file rows, diff, stats, footer and controls into focused React components.
- Removed user-facing Morrow references. Native and live provider validation pending.
