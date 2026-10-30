import { ArrowDownLeft, ChevronDown, ChevronRight, CloudDownload, CloudUpload, GitBranch, GitCompareArrows, ShieldCheck } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { PButton } from "@/components/app/controls";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SelectField as Select } from "@/components/ui/select";
import type { AppController } from "@/features/app/useAppController";
import { useRegistryStore } from "@/features/repositories/registry-store";

type Props = Pick<AppController, "status" | "assignWorkspaceFast" | "busy" | "net" | "remotes"> & {
    activeRepo: NonNullable<AppController["activeRepo"]>;
};
export function RepositoryHeader(props: Props) {
    const { workspaces } = useRegistryStore(useShallow((state) => ({ workspaces: state.workspaces })));
    const { activeRepo, status, assignWorkspaceFast, busy, net, remotes } = props;
    return (
        <div className="repo-intro">
            <div className="repo-heading">
                <div className="repo-breadcrumb">
                    <span>{workspaces.find((w) => w.id === activeRepo.workspaceId)?.name ?? "Repositories"}</span>
                </div>
                <h1>{activeRepo.name}</h1>
                <div className="repo-subtitle">
                    <GitBranch size={14} />
                    <span>{status?.branch ?? activeRepo.branch}</span>
                    <span className="bullet">·</span>
                    <span>{activeRepo.path}</span>
                </div>
            </div>
            <div className="intro-actions">
                <Select
                    label="Assign repository to workspace"
                    value={activeRepo.workspaceId ?? "ungrouped"}
                    onValueChange={(v) => void assignWorkspaceFast(activeRepo.id, v === "ungrouped" ? null : v)}
                    options={[{ value: "ungrouped", label: "Ungrouped" }, ...workspaces.map((w) => ({ value: w.id, label: w.name }))]}
                />
                <div className="split-action">
                    <PButton
                        disabled={!!busy}
                        onClick={() => net("fetch")}
                    >
                        <CloudDownload size={15} /> Fetch
                    </PButton>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="split-chevron"
                                title="Git synchronization options"
                                aria-label="Git synchronization options"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => net("fetch")}>
                                <CloudDownload size={15} /> Fetch all
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="alder-menu-item">
                                    <CloudDownload size={15} /> Fetch from… <ChevronRight size={14} />
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="alder-menu">
                                    {remotes.length ? (
                                        remotes.map((r) => (
                                            <DropdownMenuItem
                                                key={r}
                                                onSelect={() => net("fetch", r)}
                                            >
                                                {r}
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <span className="alder-menu-disabled">No remotes configured</span>
                                    )}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator className="alder-menu-separator" />
                            <DropdownMenuItem onSelect={() => net("pull")}>
                                <ArrowDownLeft size={15} /> Pull (fast-forward only)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => net("pull-rebase")}>
                                <GitCompareArrows size={15} /> Pull (rebase)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="alder-menu-separator" />
                            <DropdownMenuItem onSelect={() => net("push")}>
                                <CloudUpload size={15} /> Push
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="alder-menu-item">
                                    <CloudUpload size={15} /> Push to… <ChevronRight size={14} />
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="alder-menu">
                                    {remotes.length ? (
                                        remotes.map((r) => (
                                            <DropdownMenuItem
                                                key={r}
                                                onSelect={() => net("push", r)}
                                            >
                                                {r}
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <span className="alder-menu-disabled">No remotes configured</span>
                                    )}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem
                                destructive
                                onSelect={() => net("force-push")}
                            >
                                <ShieldCheck size={15} /> Force push (with lease)…
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="alder-menu-item destructive">
                                    <ShieldCheck size={15} /> Force push to… <ChevronRight size={14} />
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="alder-menu">
                                    {remotes.length ? (
                                        remotes.map((r) => (
                                            <DropdownMenuItem
                                                key={r}
                                                destructive
                                                onSelect={() => net("force-push", r)}
                                            >
                                                {r} (with lease)…
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <span className="alder-menu-disabled">No remotes configured</span>
                                    )}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}
