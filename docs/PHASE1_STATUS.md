# Phase 1 v0.1.0 implementation status

**Classification:** SOURCE CANDIDATE. **Not built as a signed/native executable in this environment.** No Rust toolchain/Bun in the working environment, and npm dependency installation did not complete. Frontend TypeScript checking could not resolve packages. Do not describe these items as verified at runtime.

## Implemented in source (needs native runtime verification)

- Tauri app/project skeleton with Rust backend, React UI, platform capabilities and app identity.
- Morrow theme presets and shared semantic theme engine with Alder-specific preferences.
- SQLite repository registry and workspace records. Native Git repository init/add/clone and bounded directory discovery.
- Repo overview dashboard, working-tree counts, ahead/behind indicators, persistent selected repo and workspace filters/assignment.
- File status, stage/unstage, stage all, unified diff display, commit/amend, local and remote branch list/switch/create.
- Linear commit history list with branch/ref labels, fetch, fast-forward-only pull, and push.
- Keyboard command search, normal dialogs, overview, changes, history, branches, settings and future-phase explanations.

## Incomplete within v0.1 scope

- **File/hunk/line staging:** file-level works in source, but hunk and line-level not implemented.
- **Diff viewer:** unified line-marked viewer exists; split view, word-level changes, image/binary preview not implemented.
- **Commits:** create/amend exists; safe undo-commit and cherry-pick not implemented (later advanced Git phase).
- **Branches:** create/switch and local/remote listing only; rename/delete/track upstream UI not implemented.
- **Remotes:** fetch/pull/push exists; manage remotes and explicit upstream selection UI not implemented.
- **Commit graph:** history list with a single graph lane exists; true multi-lane graph/virtualization/filtering not implemented.
- **IDE integration:** not implemented; command palette and appearance preferences exist.
- **File watchers:** not implemented; manual refresh available.
- **Desktop packaging:** source includes Tauri config/icons but no validated Windows installer or native smoke-test result.

## Verification evidence in this environment

- Node-based Git CLI fixture tests: execute `node --test scripts/*.test.mjs` and record results.
- Static command contract tests: assert declared Rust/TypeScript command names and themed config; **not** a Rust compilation test.
- Git behaviors inspected using system Git 2.47.3, including `git init` and `git switch` argument forms.
- Native build, Rust compiler/lint, browser UI rendering, and frontend bundle are **unverified** pending dependencies/toolchain.

## Next release readiness tasks

1. Install project dependencies and Rust stable on a Windows development environment, run `bun run typecheck`, `bun run build`, `cargo check`, `cargo clippy`, `bun run tauri:build`.
2. Correct any compile/link issues and run real repo create/clone/open/stage/commit/switch/fetch/push smoke tests.
3. Complete file watcher, fine-grained staging, remote management, branch controls, graph virtualization and IDE launch.
4. Integrate blocking process cancellation/progress, accessibility/keyboard polish and regression tests.
5. Update status of ALD tickets in Plane only after verifying acceptance criteria.
