import { RefreshCw } from "lucide-react";
import type { AlderUpdater } from "@/components/updater/update-center";
import { X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { IconButton, PButton } from "@/components/app/controls";
import { Settings } from "@/components/app/Settings";
import * as Dialog from "@/components/ui/dialog";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";

type Props = Pick<AppController, "preferences"> & { updater: AlderUpdater };
export function SettingsDialog(props: Props) {
    const { settings, setSettings } = useNavigationStore(useShallow((state) => ({ settings: state.settings, setSettings: state.setSettings })));
    const { preferences } = props;
    return (
        <Dialog.Dialog
            open={settings}
            onOpenChange={setSettings}
        >
            <Dialog.DialogContent
                hideClose
                className="modal-content settings-content"
            >
                <div className="modal-header">
                    <Dialog.DialogTitle>Appearance & preferences</Dialog.DialogTitle>
                    <IconButton
                        title="Close settings"
                        onClick={() => setSettings(false)}
                    >
                        <X size={17} />
                    </IconButton>
                </div>
                <Dialog.DialogDescription className="dialog-description">
                    Alder colors by default, with a selection of color themes available.
                </Dialog.DialogDescription>
                <Settings preferences={preferences} />
                <section className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Software updates</p>
                        <p className="text-xs text-muted-foreground">Check for signed updates from Alder GitHub Releases.</p>
                    </div>
                    <PButton
                        variant="secondary"
                        onClick={() => {
                            setSettings(false);
                            void props.updater.checkForUpdates(true);
                        }}
                    >
                        <RefreshCw size={14} /> Check now
                    </PButton>
                </section>
                <div className="modal-footer">
                    <PButton
                        variant="primary"
                        onClick={() => setSettings(false)}
                    >
                        Done
                    </PButton>
                </div>
            </Dialog.DialogContent>
        </Dialog.Dialog>
    );
}
