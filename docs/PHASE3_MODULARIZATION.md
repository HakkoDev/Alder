# v0.3.1 Rust modularization

- Replaced the previous ~770-line `lib.rs` implementation with a small bootstrap and command handler.
- Split repository registration / workspace SQLite commands from Git core functions.
- Split Git status/history/change staging/network and advanced workflows into dedicated modules.
- Kept GitHub CLI-backed PR/issue/CI logic isolated in `github/mod.rs`.
- Preserved Tauri command registration names and JSON models.
- Adjusted source-contract tests so they look at all Rust modules, not solely `lib.rs`.
- Verification: 31/31 Node/Git tests pass. Native compile and app smoke testing remain pending.
