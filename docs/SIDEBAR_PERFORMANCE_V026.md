# Alder v0.2.6: Sidebar and registry UX

## Root cause

The `perform` action helper originally executed `refresh()` after every mutation, even a SQLite-only `assign_workspace` or `remove_repository` command. `refresh` called `list_repositories`, which scans every registered repository and invokes Git subprocesses to compute status, ahead and behind. With dozens or hundreds of repositories, a trivial database update could appear to freeze the UI. Dev-mode overhead may exacerbate this but is not required to reproduce the excessive work.

## Implementation

- `assignWorkspaceFast` updates the affected repository's workspace property immediately, writes it to SQLite, and rolls back its display state on failure. It never scans all repositories.
- `removeFromAlder` deletes the registry entry and removes it from the local list. The deletion does not touch disk. It uses `perform(...,{reload:false})`.
- `createWorkspace` inserts the returned workspace into local state without rescanning repos.
- Added shadcn-compatible SidebarProvider/Sidebar/Header/Content/Footer/Inset/Trigger primitives at `src/components/ui/sidebar.tsx`. The provider persists collapse state in localStorage and listens for Ctrl+B/Cmd+B with cleanup. The collapsed sidebar keeps icon navigation with tooltips; the expansion trigger is in the header.

## Known limitations / next measurements

- Native TypeScript/React typecheck, Rust compile and Windows GUI smoke test still required.
- `list_repositories` still computes live status for every repo when a full refresh occurs. A future separate fast registry endpoint plus per-repo status cache and invalidation should be considered once measured.
- Git operations currently refresh the registry and selected repository. De-duplicate selected-repo queries in a later performance pass.
- Test on 10, 100, and 500 repositories including offline drives and very large working trees; record cold/warm timings and UI FPS.
- Confirm sidebar layout and tooltips in both states, responsive width, command palette, overlay centering, and Ctrl+B behavior in the native window.

## Verification

Node source and disposable Git tests, plus TypeScript/TSX transpile syntax checks. These do not replace native packaged-app validation.
