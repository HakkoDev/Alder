import { ArrowDownToLine, ChevronRight, RefreshCw, Search, Settings2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { IconButton } from "@/components/app/controls";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { AlderUpdater } from "@/components/updater/update-center";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";
import { t } from "@/lib/i18n";

const formatName = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
type Props = Pick<AppController, "activeRepo"> & { updater: AlderUpdater };
export function AppHeader(props: Props) {
    const { view, setPalette, setSettings } = useNavigationStore(
        useShallow((state) => ({ view: state.view, setPalette: state.setPalette, setSettings: state.setSettings })),
    );
    const { activeRepo } = props;
    return (
        <header className="topbar">
            <div className="topbar-leading">
                <SidebarTrigger />
                <div className="crumb">
                    <span>{activeRepo && view !== "overview" ? activeRepo.name : "Workspace"}</span>
                    <ChevronRight size={14} />
                    <strong>{view === "pulls" ? "GitHub" : view === "agents" ? "Agent sessions" : formatName(view)}</strong>
                </div>
            </div>
            <div className="topbar-actions">
                <button
                    type="button"
                    title="Search repositories and commands (Ctrl+K)"
                    aria-label="Search"
                    className="quick-search topbar-command-search"
                    onClick={() => setPalette(true)}
                >
                    <Search size={15} />
                    <span>{t("app.search")}</span>
                    <kbd>Ctrl K</kbd>
                </button>
                <IconButton
                    title={props.updater.hasUpdate ? `Install Alder ${props.updater.version}` : "Check for updates"}
                    onClick={() => {
                        if (props.updater.hasUpdate) props.updater.setOpen(true);
                        else void props.updater.checkForUpdates(true);
                    }}
                    disabled={props.updater.status === "installing"}
                >
                    {props.updater.hasUpdate ? (
                        <ArrowDownToLine
                            size={17}
                            className="text-primary"
                        />
                    ) : (
                        <RefreshCw size={16} />
                    )}
                </IconButton>
                <span
                    className="topbar-action-divider"
                    aria-hidden="true"
                />
                <IconButton
                    title="Appearance & preferences"
                    onClick={() => setSettings(true)}
                >
                    <Settings2 size={17} />
                </IconButton>
            </div>
        </header>
    );
}
