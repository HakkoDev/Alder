# Alder v0.3 GitHub integration

## Implemented in this source candidate

- A real GitHub panel with repository identity, open PRs, open issues, draft PR creation, detail viewer, changed-file summary, status check summaries and review actions.
- `gh`-brokered authentication, using credentials already managed by GitHub CLI. Alder never stores GitHub tokens.
- Type-safe React-to-Tauri commands and Rust argument-array subprocess execution, no shell command concatenation.
- Empty/loading/error/unauthenticated states, partial failure isolation, success/failure toast notifications, PR/issue footer counts.
- GitHub repository URL opening is restricted to HTTPS github.com subdomains.

## Setup

Install GitHub CLI from https://cli.github.com and run `gh auth login` in a terminal. `gh` must be on PATH. Open a Git repository whose origin resolves to GitHub. Click Pull requests. No new login dialog is needed inside Alder.

## Still incomplete

- Native OAuth/device flow inside Alder, simultaneous independent GitHub accounts without changing gh auth state, GH Enterprise customization.
- In-app inline PR diff comments and PR merge/checkout worktree flows.
- GitHub Actions workflow log browsing, remote repository creation, releases and notification inbox.
- GitLab / Forgejo belong to v0.5.
- Issue/PR badge counts are capped at the latest 100 open results and represent those fetched, not guaranteed global totals.

## Required validation

Run `npm install`, `npm run typecheck`, `npm run build`, `cargo check --manifest-path src-tauri/Cargo.toml`, then a Tauri app smoke test with a noncritical GitHub test repository. Verify account missing, auth missing, no origin, private repo, rate limits, review permission failures and PR create errors. This environment has no Cargo or installed project dependencies.
