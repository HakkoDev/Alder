# v0.3.2 Rust command-registration hotfix

## Root cause
`repository/commands.rs` ended with a dangling `#[tauri::command]` macro attribute, which is invalid Rust. The Rust compiler then emitted a cascade of missing generated Tauri command macro errors. The `generate_handler!` registry also relied on wildcard re-exports, obscuring module ownership.

## Fix
- Removed dangling attribute after `assign_workspace`.
- Registered 53 commands using explicit module paths (`repository::commands::*`, `git::changes::*`, etc.); note that individual paths, not wildcards, are used within the registry.
- Exposed internal Rust modules as `pub(crate)` where needed to allow the registration code to name their command handlers directly.
- Removed unused `OptionalExtension` import in `lib.rs`.
- Added `scripts/rust-module-registration.test.mjs` to check every Tauri command has a corresponding explicit registration and all attributes decorate a command.

## Validation
- `node --test scripts/*.test.mjs`: 32/32 passed in the packaging environment.
- Cargo/Rust compiler unavailable in packaging environment, so this is **not** a confirmed native compilation. Do not treat the passed source-contract tests as a substitute for a Windows `cargo check`.

## Windows validation commands
```powershell
bun install
bun run typecheck
bun run test
cargo check --manifest-path src-tauri/Cargo.toml
bun run tauri:dev
```

The initial missing `@radix-ui` and `sonner` package errors shown in the supplied log were resolved by `bun install`. The `STATUS_CONTROL_C_EXIT` messages followed manual interruption and are not evidence of a separate startup crash.
