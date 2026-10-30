# Test and smoke checklist

## Local tests

```bash
node --test scripts/*.test.mjs
bun install
bun run typecheck
bun run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets
bun run tauri:dev
bun run tauri:build
```

## Native manual smoke tests (not yet executed)

- Open an existing Git repo, test paths with spaces, unicode, tabs and nested directories.
- Scan a multi-root workspace and ensure disconnected paths persist as unavailable without deletion.
- Create and assign workspaces, restart Alder, verify SQLite persistence.
- Stage/unstage newly added, renamed, modified and deleted files. Confirm diff and commit work.
- Create branch/switch branch, handle dirty working tree rejection without losing files.
- Clone a public repository, fetch/pull/push to a controlled test remote, verify `--ff-only` aborts diverged branches.
- Check no secrets appear in error messages, logs or database; inspect Tauri IPC permission boundaries.
- Test all theme presets in dark/light modes, compact density, 85–125% fonts and offline fonts.
- Validate Windows resize/minimum dimensions, keyboard navigation, dialogs, focus, reduced motion.
- Test Git missing from PATH, inaccessible repo folder and malformed remote URL.

**Do not sign off a release** until native builds and these checks pass.

## CI preview

`.github/workflows/verify-windows.yml` is an **unsigned preview build** workflow, not an auto-publishing release. It is newly authored, has not run, and must be validated in a real GitHub repository. The release pipeline and updater must remain disabled until signing and smoke tests are done.
