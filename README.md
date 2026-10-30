# Alder

**Your repositories. Your workflow. One workspace.**

Alder is a local-first desktop Git client for managing repositories, reviewing changes, and working with GitHub. Built with Tauri, Rust, React, TypeScript, and Zustand.

> Alder is early-stage software. Keep backups of important work and review destructive operations carefully.

## Download

Download packages from [GitHub Releases](https://github.com/HakkoDev/Alder/releases):

| Platform | Package |
| --- | --- |
| Windows x64 | NSIS installer (`*-setup.exe`) |
| Linux x64 | AppImage or Debian/Ubuntu package (`.deb`) |

Install Git and make sure it is available on `PATH`. GitHub features additionally require [GitHub CLI](https://cli.github.com/) and `gh auth login`. Node.js, Bun, and Rust are only needed for development.

Windows installers are not Authenticode-signed and may display a SmartScreen warning. Updater signatures are separate from operating-system code signing. Automatic in-app updates are not implemented yet; install a newer release manually to update.

## Features

- **Repository workspace:** open, initialize, clone, and discover repositories; organize them into workspaces and inspect working-tree status.
- **Changes:** review unified diffs, sort and select files, stage or unstage files, hunks, and individual changed lines, and create or amend commits.
- **History and branches:** browse a commit graph, create and switch branches, rename or safely delete local branches, and inspect reflog entries.
- **Advanced Git:** manage linked worktrees and stashes, merge or rebase branches, resolve text conflicts, cherry-pick or revert commits, and create recovery branches.
- **Remote operations:** fetch, pull, push, and explicitly confirm force-with-lease pushes.
- **GitHub:** browse pull requests and issues, create and review pull requests, inspect checks, check out PR worktrees, and view notifications, tags, releases, and API limits.
- **Personalization:** choose light, dark, or system appearance, color themes, density, font scale, and a collapsible sidebar.

## How Alder handles your repositories

Git remains the source of truth. Alder runs the installed Git executable and respects your Git identity, hooks, credential helper, and remote configuration. GitHub authentication is delegated to `gh`; Alder does not store provider tokens.

A local SQLite database stores registered repository paths and workspace organization. Removing a repository from Alder only unregisters it; it does not delete files on disk.

Default pulls are fast-forward-only. Rebase pulls are explicit actions, and both require a clean working tree. Force pushes use `--force-with-lease` and require confirmation. Recovery snapshots, automatic undo, and an interactive rebase editor are not available.

## Keyboard shortcuts

- `Ctrl/Cmd+K`: search commands and repositories.
- `Ctrl/Cmd+B`: collapse or expand the sidebar.
- `Escape`: close command search.

## Development

Requirements: Node.js 22.18+ (CI uses Node 24), Bun, Rust stable, Git, and the [platform dependencies for Tauri](https://v2.tauri.app/start/prerequisites/).

```bash
bun install --frozen-lockfile
bun run tauri:dev
```

For a browser-only preview, run `bun run dev`. Native Git and folder-selection actions require the desktop application.

```bash
bun run quality
bun run build
bun run deps:check
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the project structure and contribution guidelines.

## Feedback

[Report a bug or suggest a feature](https://github.com/HakkoDev/Alder/issues). Include your operating system, Alder and Git versions, reproduction steps, and relevant error messages. Never include credentials, private keys, access tokens, or private repository contents.

## License

Alder is licensed under [GPL-3.0-only](LICENSE).
