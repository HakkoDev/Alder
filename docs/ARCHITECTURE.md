# Architecture and design decisions

This was structured after the user's Morrow v0.2.0 source archive, particularly its Tauri v2 + Rust library, Vite/React/TypeScript interface, shadcn-style primitive conventions, Biome config, and exact complete TweakCN theme preset engine.

```text
                     React + TypeScript
 Sidebar / Overview / Changes / History / Branches / Settings
                          |
                  @tauri-apps/api.invoke
                          |
                Tauri v2 Rust commands
               /           |            \
           SQLite       Git CLI       Tauri dialog
    Registry/workspaces  argv arrays     folders
               |           |
       app data folder  installed Git
                           |
                   existing repos on disk
```

## Ownership boundaries

- Git remains the **source of truth** for repository contents. SQLite only stores registry paths and optional organization IDs. `alder.sqlite` is placed in the native app data directory.
- System Git is called via `std::process::Command`, with a fixed `git` program name and argument arrays; no shell interpolations.
- Repository roots are normalized via `git rev-parse --show-toplevel` and checked for actual on-disk availability.
- File actions only accept relative paths without `..` components; destructive operations are intentionally limited in Phase 1.
- Network Git operations run in the Tauri blocking thread pool. Fetches prune stale remote-tracking refs; pulls require fast-forward. No automatic background polling.
- Theme tokens, palette definitions and style mechanics are copied from Morrow; Alder preferences use an independent `alder.preferences.v1` key and never mutate Morrow settings.
- Offline-first: GitHub/GitLab integrations are absent, not silently emulated.

## Known architectural work for later phases

- Operation queue, progress and cancellation support for long-running Git commands.
- Git path and unsafe symlink hardening, Unicode/failure cases and limits for huge repos.
- Streaming/virtualized diffs and DAG, rather than current straightforward bounded rendering.
- Credential store/provider account model; cross-process repository state refresh and directory move/repair tooling.
- UI application tests, fully deterministic Rust unit/integration tests and operating-system matrix.

## Theme parity

`src/lib/theme-presets.ts` and `src/lib/theme.ts` preserve the Morrow-supplied preset system, including semantic color tokens, typography, spacing, radius and font loading opt-in. Only Morrow-specific preference keys and UI chrome were replaced.
