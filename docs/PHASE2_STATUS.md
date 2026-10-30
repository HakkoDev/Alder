# Phase 2 — v0.2.0 Implementation & Verification

**Date:** 2026-10-30  
**Status:** Source candidate, partial v0.2 implementation. **Do not treat this ZIP as a verified native release.**

## Completed in source

### Requested UI changes
- Removed the overview and repository intro eyebrows, repetitive section headings and header refresh icon. In-panel refresh commands remain available.
- Replaced the tree/branch mark with an A glyph in UI and regenerated ICO/ICNS/PNG app icons plus editable SVG source.
- Added Alder's dark and light palette: dark canvas `#0D121D`, card `#151D2B`, primary `#92A9F4`, border `#273248`; light canvas `#F5F7FB`, primary `#526FC8`. **Color-only**: reuses Morrow's Sage Garden typography, spacing and radius for both modes; all other Morrow themes remain. The v0.1 preferences store migrates to v2; an existing Sage Garden selection is moved to the new default Alder palette while other chosen presets and display settings are preserved.
- Sidebar footer now displays `© 2026 HakkoDev contributors`, with no green indicator and no “Local-first” label.
- Replaced former Git version status with useful status bar information: selected branch, changed files, ahead/behind, worktree count, stash count. `PRs —` and `Issues —` are explicitly unavailable until provider integration in v0.3; no fabricated API data.
- Added Radix tooltips to shared icon and primary action buttons and native tooltips to navigation and contextual actions.

### Advanced Git workflows
- Worktree panel: create linked worktree on a new or existing branch, enumerate branches/HEAD/lock and safely remove clean, unlocked worktrees using normal `git worktree remove` (never `--force`).
- Stash panel: list, create with optional untracked files, inspect actual patch, restore with index, safely drop with confirmation. Applies do not automatically drop stashes.
- Merge panel: normal or squash merge and clean-tree guard. Conflict state is shown after a failed operation.
- Rebase: rebase current branch onto chosen revision/branch (noninteractive). Detect and abort/continue rebase; on conflict, present file list with accept ours/theirs and stage. A manual Base/Ours/Theirs/result editor allows editing the resolved text and saving/staging it (UTF-8, at most 250 KB, no symlinks).
- Cherry-pick and revert by validated hexadecimal commit ID; inspect reflog and create recovery branches without changing worktree contents.
- Branch rename/delete controls. Delete uses `git branch -d`, refusing unmerged changes.
- Typed Tauri IPC commands, Git argv execution, input validation for branch names and revision selectors, status refresh after failed commands, and confirmations for risky actions.

## Verification performed

- `node --test scripts/*.test.mjs`: **12 tests passed** on the development container (Git 2.47.3). Real disposable Git fixtures test worktree add/list/remove and dirty rejection, stash index restoration, merge conflict detection and resolution, rebase failure/abort, safe fast-forward-only pull, standard stage/diff/commit/branch, unusual filenames, theme and IPC source contracts.
- TypeScript source/TSX syntax checked via installed TypeScript transpile APIs. This **does not** imply successful type checking, bundling or runtime execution.
- `npm install` could not complete in the environment; `bun`, `cargo`, `rustc`, `rustfmt` were not available, preventing production frontend build, Rust compilation, lint/clippy and native Windows installer testing.

## Remaining v0.2 release blockers

1. **Native compilation and GUI verification**: Run `bun install && bun run typecheck && bun run build` and `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo fmt --check`, `cargo clippy`, plus Tauri dev/packaged tests on Windows.
2. **Conflict editing**: Source now includes a basic text-oriented three-way Base/Ours/Theirs/Result editor with write/stage. Needs native verification, nuanced conflict markers/merge testing, deletion conflicts and binary handling improvements; not a production-quality merge editor yet.
3. **Interactive rebase**: Existing rebase is noninteractive; reorder/squash/edit/drop with validated todo and conflict continuation remain.
4. **Worktree completeness**: Lock/unlock, repair, detached worktree, compare and advanced clean-up not yet implemented.
5. **Recovery**: Reflog and recovery branches implemented, but operation history, safe reset/discard snapshots and robust rollback are not.
6. **Other planned tooling**: blame, file-history view, commit range diff, patches, interactive DAG, extensive regression testing, progress/cancel for long-running operations.
7. **Performance and security**: Await actual large-repository measurement, safe subprocess timeout/cancellation, comprehensive LFS/submodule/signing behavior, security audit, cross-platform builds.

## Safety notes

- The UI displays Git's `ours` and `theirs` sides. During a rebase these names may not mean what a developer expects; review each conflict before accepting.
- Creating a new worktree requires an unused absolute directory with an existing parent; Git refuses removing a dirty or locked worktree.
- Rebase and merge require a clean working tree. Users must commit or stash first.
- A reflog branch preserves a committed Git object; it **does not** preserve uncommitted or untracked work.
- Source-level tests do **not** establish native integration correctness.

## Developer commands

```bash
bun install
bun run typecheck
bun run test
bun run build
cargo check --manifest-path src-tauri/Cargo.toml
bun run tauri:dev
bun run tauri:build:windows
```

## Plane status policy

Mark only partial v0.2 tasks **In Progress**; keep release module **In Progress**; do not mark **Done** until compiled and verified. Remaining features stay in Backlog. The v0.3 GitHub module remains Planned.
