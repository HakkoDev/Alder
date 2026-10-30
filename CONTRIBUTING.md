# Contributing to Alder

Bug reports, focused fixes, tests, accessibility improvements, and feature proposals are welcome. For substantial changes, open an issue first so scope and behavior can be discussed before implementation.

## Set up a development environment

Install Node.js 22.18+ (CI uses Node 24), Bun, Rust stable with rustfmt and Clippy, Git, and the [platform dependencies required by Tauri](https://v2.tauri.app/start/prerequisites/). GitHub CLI is optional unless you are working on GitHub integration.

```bash
bun install --frozen-lockfile
bun run tauri:dev
```

`bun run dev` starts the browser preview. Native repository operations and folder selection require Tauri.

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Application composition and shell |
| `src/components/app/` | Layout, shared display components, and application dialogs |
| `src/components/ui/` | Shared UI primitives |
| `src/features/` | Feature views, domain hooks, and Zustand stores |
| `src/lib/` | Typed native API, models, preferences, themes, and translations |
| `src-tauri/src/` | Native commands, Git operations, GitHub CLI integration, and SQLite storage |
| `scripts/` | Source contracts, disposable Git fixtures, store tests, and release tooling |

## Development guidelines

- Keep the application root small. Place feature behavior near its views and use shared UI primitives instead of duplicating controls.
- Use focused Zustand stores and narrow selectors for shared client state. Keep form state local and request cancellation/stale-response protection in the owning data hook.
- Treat Git as the source of truth. Use argument arrays, validate paths and revisions, and never interpolate shell commands.
- Respect Git configuration, hooks, credentials, and existing work. Destructive operations need clear confirmation and regression coverage.
- Never use a contributor's real repository as a test fixture. Create temporary repositories and clean up only resources created by the test.
- Update a source contract when its owning component or module moves; prefer behavioral tests for state and Git semantics.
- Keep changes focused. Avoid unrelated formatting, dependency updates, generated files, and local configuration.

## Checks

Run these before opening a pull request:

```bash
bun run quality
bun run build
bun run deps:check
node scripts/verify-versions.mjs
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings
```

Format with `bun run format`. The Windows workflow validates source, frontend, and Rust checks; tagged release builds also validate Linux packaging. Changes involving native dialogs, staging, conflict resolution, or destructive operations should include a desktop smoke test.

## Commits and pull requests

Use Conventional Commits such as `fix(changes): preserve file selection after refresh` or `refactor(react): extract repository navigation`. Include the problem, approach, tests run, and any remaining limitations in the pull request. Add screenshots for visible UI changes.

## Dependencies and releases

Bun and Cargo lockfiles are checked in. Keep native Tauri dependencies and the JavaScript API pins compatible, and run `bun run deps:check` after dependency changes.

Maintainers must align the application versions in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, and the footer before creating a `vX.Y.Z` tag. Release automation creates a draft, builds Windows/Linux packages, signs updater artifacts, and verifies assets before publication. Review the draft before publishing.

Signing credentials belong in GitHub Actions secrets and variables, never in the repository. Use an existing release signing key; do not rotate it casually. Keep private keys backed up securely and do not include them in issues, pull requests, logs, or chat.

## License

Contributions are provided under the project's [GPL-3.0-only license](LICENSE). Preserve applicable copyright and license notices.
