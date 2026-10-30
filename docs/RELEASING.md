# CI and releases

Alder ports Morrow's Windows verification, manual dependency refresh, and signed Windows/Linux draft-release workflows. The package and Cargo locks stay checked in; installers, signatures, generated Tauri schemas, and `src-tauri/tauri.release.conf.json` do not.

## Verification

`.github/workflows/build-windows.yml` runs on pull requests and pushes to `main` or `master`. It installs frozen Bun dependencies, checks Tauri pins, runs source/Git tests, Biome, TypeScript, the UI build, rustfmt, locked Cargo check/test, and Clippy with warnings denied. A manual dispatch can additionally build an unsigned NSIS preview.

`.github/workflows/refresh-lockfile.yml` is manual. It refreshes locks and formatting, validates the Linux build, and opens a reviewable PR only after checks pass. GitHub Actions must be allowed to create pull requests for this workflow. Dependabot monitors Bun at `/` and Cargo at `/src-tauri`.

## Signing setup

The release workflow is restricted to `HakkoDev/Alder`. Forks must deliberately adapt the repository allowlists before releasing.

1. Generate a signing key with `bun run tauri signer generate` and keep the private key outside the repository.
2. Set repository secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to the values expected by Tauri's signer.
3. Set repository variable `TAURI_SIGNING_PUBLIC_KEY` to the complete base64-encoded `.pub` file contents.
4. Confirm the GitHub Actions release permissions and run native smoke tests.

`scripts/prepare-release.mjs` writes an ignored config overlay containing only the public key and the repository's updater endpoint. Only the Tauri packaging step receives the private key. A Tauri updater signature is not Windows Authenticode signing.

## Preparing a release

1. Keep `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and the UI footer version aligned. Commit any lockfile changes.
2. Run `bun run quality`, `bun run build`, `bun run deps:check`, `node scripts/verify-versions.mjs`, and native smoke tests.
3. Push an approved `vX.Y.Z` tag matching the application version. Manual release dispatch also requires selecting a matching tag.
4. CI generates notes from actual Conventional Commits and creates a draft GitHub release. Independent Windows NSIS and Linux AppImage/DEB builds produce signed updater artifacts.
5. The final job verifies both platforms, uploads packages and signatures, uploads `latest.json` last, then downloads and validates its references. A published release is never overwritten by a rerun.
6. Review and smoke-test the draft assets before publishing manually.

No keys are generated or uploaded by these workflows. No release has been run or published as part of this repository organization. Alder does not yet have runtime in-app update checks; users currently update by installing the new package. The signed manifest supports future updater integration.
