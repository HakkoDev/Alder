# Alder v0.3.4 — maintainability and remaining GitHub features

## UI component structure
- `src/App.tsx` remains the app orchestrator for repository state, routing and dialogs.
- `src/components/app/controls.tsx` is the small shared controls module.
- `src/components/app/{FooterAction,Stat,FileRow,DiffText,Settings}.tsx` contain focused display components.
- `src/components/GitHubPanel.tsx` handles PRs, issues, reviews and worktree checkout.
- `src/components/GitHubExtras.tsx` handles paginated notifications, releases, tags and rate-limit diagnostics.

## Remaining maintenance debt
- Break `App.tsx` state orchestration into domain hooks for registry, active repo, changes and Git operations; the current root remains large.
- Separate GitHub PR lists, PR details, creation, review and checkout into dedicated components and data hooks.
- Finish full localization extraction and theme CSS cleanup.

## Verification / safety
- The GitHub CLI (`gh`) must be installed and authenticated with `gh auth login`.
- Worktree checkout requires a fresh absolute path and a valid parent directory; `gh` manages checkout without switching the active worktree.
- Notifications, releases and tags use GitHub CLI REST API pagination, 30 entries/page. Rate limits are read-only.
- No live GitHub account or Windows Tauri app was available here. Do not close ALD-40, ALD-41, ALD-42 or ALD-74 until native smoke and failure-path testing.
