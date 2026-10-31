//! Native Git operations, kept separate from Tauri bootstrap.
pub(crate) mod advanced;
pub(crate) mod changes;
pub(crate) mod core;
pub(crate) mod history;
pub(crate) mod inspector;
pub(crate) mod remotes;
pub(crate) mod status;
pub(crate) use advanced::*;
pub(crate) use core::*;
pub(crate) use status::*;
