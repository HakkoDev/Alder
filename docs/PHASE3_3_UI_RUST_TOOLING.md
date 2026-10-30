# Alder v0.3.3: UI polish and Rust toolchain workflows

## Interface

- Global command Search is in the top-right application header, retaining Ctrl+K access. It is removed from SidebarHeader.
- The sidebar collapse trigger and current repository/view breadcrumb share a left-aligned header group.
- GitHub CLI documentation (`https://cli.github.com/manual/`) is linked from both GitHub setup and connected views. This opens in the system/browser webview via `window.open`.
- Appearance/Display and language precede theme selection; theme cards are the bottom of the settings modal.
- Header sizing, compact viewport adaptation, theme-card hover/focus, and GitHub help actions were standardized with existing semantic theme tokens.

## Rust scripts matched to Morrow

- `bun run format:rust`: `cargo fmt --manifest-path src-tauri/Cargo.toml --all`
- `bun run format:rust:check`: `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`
- `bun run lint:rust`: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets`
- `bun run format`: runs Biome formatter and rustfmt.
- `bun run format:check`: checks both Biome and Rust formatting.
- `bun run lint`: runs Biome lint and Clippy.
- `bun run quality`: runs Rust formatting check, Clippy, TypeScript typecheck and tests.

`rustfmt.toml` and `rust-toolchain.toml` already matched Morrow and remain unchanged.

## Verification

Node source / Git fixture tests pass; changed TSX syntax is checked. Cargo, full dependency-resolved TS typechecking and native GUI visual regression are **not available in this environment** and must be run locally. There is no evidence of a successful Rust compile after v0.3.2 yet.
