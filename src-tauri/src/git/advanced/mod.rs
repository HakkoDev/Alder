//! Advanced Git workflows. Each submodule owns one type of operation.
pub(crate) mod model;
pub(crate) mod worktrees;
pub(crate) mod stashes;
pub(crate) mod operations;
pub(crate) mod recovery;
pub(crate) mod conflicts;
pub(crate) use model::*;
