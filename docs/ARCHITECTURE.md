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
- Theme tokens, palette definitions and style mechanics are copied from Morrow; Alder preferences use an independent `alder.preferences.v2` key, migrate the earlier v1 key, and never mutate Morrow settings.
- Offline-first: Git workflows do not require a provider account. Optional GitHub integration delegates authentication and API access to the installed `gh` executable; GitLab integration is absent.

## Frontend boundaries

- `src/App.tsx` is a stateless composition root for the application shell and dialogs. `src/features/app/useAppController.ts` coordinates native actions, feedback, repository data, and domain hooks without rendering JSX.
- Zustand owns shared client state in three small stores: `features/app/navigation-store.ts` (navigation, search, active repository, palette/settings visibility), `features/repositories/registry-store.ts` (repository/workspace registry and loading flags), and `features/changes/changes-store.ts` (file selection, sorting, active diff side, commit draft/options). Components subscribe through narrow selectors and `useShallow`, rather than receiving copies of this state through the root.
- Only the last repository ID is persisted by the new stores, using the existing `alder.last-repo` key. Registry data remains backed by SQLite; commit drafts, diff content, credentials, and operation state are not persisted to browser storage. The existing preferences/theme and locale stores retain their own persistence.
- `src/features/repositories/useRepositoryData.ts` owns prioritized repository loading and request epochs. Async response data stays in this lifecycle-aware hook, not in a second global cache. `useRepositoryDialog.ts` owns local add/scan/clone/workspace/branch form state.
- `src/features/changes/useChangeSelection.ts` derives sorted staged/unstaged lists from repository status and the Zustand selection state. Repository transitions clear active files, selected paths, and selection anchors while retaining commit drafts and sort preferences. `useChangesPane.ts` owns pane width and cleans up pointer listeners on completion, cancellation, and unmount.
- `src/components/app/` contains shell components, focused display controls, and application dialogs. Feature views live under `features/repositories/components/`, `features/changes/components/`, `features/history/`, and `features/branches/`. `src/components/ui/` owns shared Radix-based primitives.
- `src/components/AdvancedGit.tsx`, `GitHubPanel.tsx`, and `GitHubExtras.tsx` contain workflow-specific panels. `src/lib/git-api.ts` is the typed native IPC boundary.
- Native modules and command registration are described in [RUST_ARCHITECTURE.md](RUST_ARCHITECTURE.md); CI and signing are described in [RELEASING.md](RELEASING.md).

## Known architectural work for later phases

- Operation queue, progress and cancellation support for long-running Git commands.
- Git path and unsafe symlink hardening, Unicode/failure cases and limits for huge repos.
- Streaming/virtualized diffs and DAG, rather than current straightforward bounded rendering.
- Credential store/provider account model; cross-process repository state refresh and directory move/repair tooling.
- UI application tests, fully deterministic Rust unit/integration tests and operating-system matrix.

## Theme parity

`src/lib/theme-presets.ts` and `src/lib/theme.ts` preserve the Morrow-supplied preset system, including semantic color tokens, typography, spacing, radius and font loading opt-in. Only Morrow-specific preference keys and UI chrome were replaced.
