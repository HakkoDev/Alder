# Contributing to Alder

Alder is a GPL-3.0-only local-first Git client. Application code in `src/`, commands and persistence in `src-tauri/src`, shared themes in `src/lib`.

Run `bun run check`, `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`, and `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets` before submitting. Write regression tests using disposable Git repositories. Git config, credential helpers and hooks should be respected, not bypassed by opaque in-app behavior.
