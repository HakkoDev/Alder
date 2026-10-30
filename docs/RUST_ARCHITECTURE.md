# Rust backend architecture (v0.3.1)

The Tauri bootstrap and command registration live in `src-tauri/src/lib.rs`. Keep this file small. All command names and request/response formats remain unchanged so the existing frontend API can continue to invoke them.

## Folder layout

```text
src-tauri/src/
├── lib.rs                  # AppState, shared serialized DTOs, startup, invoke handler
├── main.rs                 # Native entry point
├── repository/
│   ├── mod.rs
│   ├── storage.rs          # SQLite schema/registry storage and repo metadata
│   └── commands.rs         # Workspace and repository discovery/CRUD
├── git/
│   ├── mod.rs
│   ├── core.rs             # Git CLI invocation, canonical root, path validation
│   ├── status.rs           # Porcelain status, branch and upstream counts
│   ├── history.rs          # History and branch list
│   ├── changes.rs          # Diffs, partial staging, commit creation
│   ├── remotes.rs          # Branch switching and network operations
│   └── advanced/
│       ├── mod.rs
│       ├── model.rs        # Advanced Git DTOs, state/validation helpers
│       ├── worktrees.rs
│       ├── stashes.rs
│       ├── operations.rs   # Merge/rebase/cherry-pick/revert/conflict actions
│       ├── recovery.rs    # Reflog and branch recovery
│       └── conflicts.rs   # Base/ours/theirs and result saving
└── github/
    └── mod.rs             # GitHub CLI integration and PR/issue/CI commands
```

## Rules for future work

- Keep Git's `-C <repo>` and argument-array invocation inside `git/core.rs`; never accept arbitrary shell strings from the UI.
- Keep database statements in `repository/storage.rs` or a future dedicated DB module. Database reads must not hold a lock while invoking Git on every repo.
- Define structured, serializable Rust types close to their owning subsystem; retain existing camelCase serialization for frontend compatibility.
- Route GitHub operations through `github/` (currently backed by `gh auth login`). Provider-specific APIs should not leak into generic Git operations.
- Every destructive command needs explicit repo/path validation and tests against temporary repositories.
- When introducing a command, register it once in `lib.rs` and add a typed wrapper in `src/lib/git-api.ts`.
- Tests in `scripts/` now use `scripts/rust-source.mjs` to read all Rust source files, avoiding false failures when code moves across modules.

## Verification caveat

The 31 available Node/Git fixture and source-contract tests pass after the refactor, but Cargo/Rust and a native Tauri build are not available in the current environment. Verify on a development machine with `cargo fmt --check --manifest-path src-tauri/Cargo.toml`, `cargo check --manifest-path src-tauri/Cargo.toml`, `bun run typecheck`, `bun run test`, and `bun run tauri:dev` before calling this refactor native-verified.
