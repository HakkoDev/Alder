# Alder v0.2.5 · Feedback and performance

## Implemented

- Sonner (`sonner`) toaster at the app root, bottom-right, with theme-token backgrounds and accessible status announcements.
- Long-running mutations show an in-progress toast that resolves to success/failure. Repository and modal errors show detailed failure toasts.
- Shared shadcn-style `Skeleton` and `Spinner` components; loading placeholders for initial repository list, selected repository status/changes, commit history, and active file diff.
- Stale results are invalidated for repository switches and diff switches through monotonically increasing request epochs.
- Status loads first, so the working tree is visible before commit history, branches, worktrees, stashes and remotes complete. Reflog is fetched last.
- Dashboard repository status uses at most four Rust threads for Git subprocesses, not a sequential scan and not unbounded concurrency. SQLite repository query is completed before spawning workers.
- Diff rendering retains the existing 3,000-line cap. Existing file-pane resizer and theme support remain intact.

## Validation / limitations

- 23/23 Node fixture and source-contract tests passed; TypeScript/TSX syntax parsing produced no errors.
- This machine does not have Bun/Cargo, and node dependencies are not installed. Native Rust compilation, full TS typechecking, Vite and desktop usability/performance benchmarking have NOT been verified.
- Performance changes reduce serial waiting but are **not benchmarked** against real large repositories. Heavy Git status commands can still be expensive; future work should include a bounded incremental index, a cancellable Git process queue and true list virtualization for very large working trees.
- Sonner and existing CSS rely on the installed npm dependency being available when running `bun install`.

## To verify on Windows

```sh
bun install
bun run typecheck
bun run test
bun run build
cargo check --manifest-path src-tauri/Cargo.toml
bun run tauri:dev
```

Try large/dirty repos, rapid repo/file switching, switching themes while a toast is visible, offline remotes, canceled dialogs, and a slow fetch/pull. Keep this release in progress until the native smoke test passes.
- Offscreen file, commit-graph and repository rows use CSS `content-visibility: auto` to reduce layout/paint cost. This is not full DOM virtualization.
