# Phase 2.1 — Alder v0.2.1 Source Candidate

**Date:** 2026-10-30. **Status:** source implementation only; native build and GUI verification still required.

## Delivered

1. Sidebar workspace selector under the A logo; all, ungrouped and named workspaces. Repository navigator supports right-click and visible overflow menus; remove means unregister from SQLite only, never deleting `.git` or local files.
2. Removed redundant promotional cards, topbar search and duplicate settings actions; exact copyright reads “Copyright © Hakko & Contributors”. Sidebar and main status bars are each 32px tall.
3. Changes list and unified diff now have zero gutter between them and a draggable/keyboard-accessible resize bar, stable scrollbar gutters, checkbox multi-select, select-all and Shift range selection, batch stage/unstage.
4. Commit history uses a compact colored parent-aware multi-lane graph, branch labels, hash, author and date. This is the first graph pass, not yet a virtualized, fully interactive DAG.
5. Radix/shadcn-styled dropdown and right-click menus, select controls and dialogs. Advanced Git and branch operations no longer use browser `window.confirm`/`window.prompt`.
6. Network split action: Fetch all / from a remote, Pull fast-forward, Pull Rebase, Push / Push To, Force Push with lease (explicit confirmation). Rust validates the remote name against configured remotes and only accepts known operations. CLI arguments are never shell-interpolated.
7. Commit actions: staged files (default), all tracked (`git commit --all`), amend, `--no-verify` and `--signoff`; working tree untracked files are not silently added.
8. Footer navigation is clickable with tooltips and explanatory unavailable PR/issue counters until provider integration exists.

## Safety

- Repository removal only deletes its local registry record. It does not touch the physical Git working directory.
- Force push uses `--force-with-lease`, never `--force`, and requires a dedicated confirmation.
- Pull modes require a clean working tree. A rebase may still conflict; the existing recovery UI handles abort/continue.
- Remote names are validated against `git remote`; no arbitrary Git flags are accepted from the UI.
- No network request is made when only interacting with local repositories.

## Verification and open issues

- **15/15 Node/Git fixture and source-contract tests pass**. Checks include tracked commit/no-verify/signoff, remote force-with-lease rejection after another clone advances the remote, and UI/IPC source bindings.
- TS/TSX syntax transpilation completed without syntax diagnostics; this is **not equivalent** to TypeScript semantic checking.
- Unable to run full `bun install`, Cargo/Rust compilation, Tauri runtime, packaged installer or Playwright GUI tests in this environment. An npm installation attempt timed out.
- The commit graph is not yet virtualized and has an 8-lane visual limit. Substantial graphs, octopus merges and high branch counts need real native/visual test coverage.
- Hunk/line staging, multi-operation atomicity, advanced reset snapshots and full provider PR/issue counts remain out of scope.

## Local verification before release

```bash
bun install
bun run typecheck
bun run test
bun run build
cargo check --manifest-path src-tauri/Cargo.toml
bun run tauri:dev
bun run tauri:build:windows
```

Do not mark this release production-ready or complete in Plane until these commands pass and Git operations have been smoke-tested on disposable repositories.
