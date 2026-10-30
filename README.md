# Alder

**Your repositories. Your workflow. One workspace.**

Alder is a local-first Git desktop client built on Tauri v2 + Rust + React + TypeScript. Licensed under GPL-3.0-only.

## What currently works in the source

- Native Rust commands for repository add/init/clone/discovery; SQLite repository and workspace index, persisted in the app data folder.
- Overview dashboard showing real repository working tree counts, ahead/behind counts and availability; no fake repository data.
- Repository grouping (custom workspaces), all/ungrouped views, search and missing-drive-aware registry.
- Git status, staged/untracked changes, unified file diff viewer, stage/unstage files, stage all.
- Commit and amend, create and switch branches, recent history, fetch/pull/push (pull uses `--ff-only`).
- Keyboard command palette (Ctrl/Cmd+K), theme preferences including all presets from the Morrow source, light/dark/system modes, density, font scale.
- Git operations are executed through argv arrays in Rust and use the installed system Git, not a shell command string.

## Requirements

- Bun **or** Node/npm supported by the bundled Vite / TypeScript versions (see `package.json`).
- Rust stable + Cargo and the OS dependencies required by Tauri v2.
- Git 2.23+ installed and accessible on `PATH`.
- Windows 10/11 initially targeted.

## Development

```bash
bun install
bun run tauri:dev
```

Or with npm:

```bash
npm install
npm run tauri:dev
```

Browser UI preview only (Git actions require Tauri): `bun run dev`.

## Quality checks

```bash
bun run typecheck
bun run test
bun run build
bun run tauri:build
```

## Safety notes

- Default Pull uses `git pull --ff-only`. Pull (rebase) is an explicit user action and both modes require a clean worktree. Force Push uses `--force-with-lease` and requires confirmation.
- Repository registry removal is a database operation only. It never deletes the Git directory.
- All Git operations are local and use your configured credential helper and Git identity; Alder does not store provider tokens in v0.1.
- This candidate has a basic text conflict resolver, but does **not** yet offer a full visual merge editor, hunk/line staging, recovery snapshots or automatic undo of destructive Git operations. Use system Git/backup workflows for those operations until v0.2.
