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

`.github/workflows/build-windows.yml` verifies sources and Rust on Windows; manual dispatch can produce an unsigned preview installer. `.github/workflows/release.yml` builds signed Windows/Linux draft releases after tag and signing-key validation. Neither workflow has been exercised on GitHub as part of this work. Configure signing and complete native smoke tests before publishing; see [RELEASING.md](RELEASING.md).

## Repository organization validation

Local Windows checks pass: all 54 Node/source/Git/release/store tests, TypeScript, Vite production build, Biome CI, locked Cargo check/test, rustfmt, Clippy with warnings denied, and `bun run tauri build --debug --no-bundle`. Cargo currently contains no Rust unit tests; the Git operation fixtures are Node-driven. Biome reports existing CSS/style warnings, and Vite reports a large bundle warning. GUI, live GitHub, signed packaging, and Linux runner validation remain outstanding.

`scripts/stores.test.mjs` exercises real Zustand store actions: functional updates, legacy repository-ID persistence, denied storage, immutable registry updates, selection reset semantics, retained commit drafts/options, and independence of store subscriptions. `scripts/app-architecture.test.mjs` guards the composition/domain boundaries. Node 22.18+ is required for native TypeScript loading in these store tests; CI uses Node 24.
