import { ArrowRight, Command, FolderGit2, Search } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import * as Dialog from "@/components/ui/dialog";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";
import { useRegistryStore } from "@/features/repositories/registry-store";

type Props = Pick<AppController, "paletteQuery" | "setPaletteQuery" | "primaryActions" | "selectRepo">;
export function CommandPalette(props: Props) {
    const { palette, setPalette } = useNavigationStore(useShallow((state) => ({ palette: state.palette, setPalette: state.setPalette })));
    const { repos } = useRegistryStore(useShallow((state) => ({ repos: state.repos })));
    const { paletteQuery, setPaletteQuery, primaryActions, selectRepo } = props;
    return (
        <Dialog.Dialog
            open={palette}
            onOpenChange={setPalette}
        >
            <Dialog.DialogContent
                hideClose
                className="modal-content palette-content"
                aria-describedby="palette-help"
            >
                <div className="palette-search">
                    <Search size={19} />
                    <input
                        autoFocus
                        placeholder="Search commands and repositories..."
                        value={paletteQuery}
                        onChange={(e) => setPaletteQuery(e.target.value)}
                    />
                    <Dialog.DialogClose asChild>
                        <kbd>ESC</kbd>
                    </Dialog.DialogClose>
                </div>
                <Dialog.DialogDescription
                    id="palette-help"
                    className="visually-hidden"
                >
                    Use the buttons below to navigate or execute commands.
                </Dialog.DialogDescription>
                <div className="palette-results">
                    <div className="palette-label">Commands</div>
                    {primaryActions
                        .filter((a) => a.name.toLowerCase().includes(paletteQuery.toLowerCase()))
                        .map((a) => (
                            <button
                                type="button"
                                key={a.name}
                                onClick={() => {
                                    setPalette(false);
                                    a.click();
                                    setPaletteQuery("");
                                }}
                            >
                                <Command size={15} />
                                {a.name}
                                <ArrowRight size={14} />
                            </button>
                        ))}
                    <div className="palette-label">Repositories</div>
                    {repos
                        .filter((r) => r.name.toLowerCase().includes(paletteQuery.toLowerCase()))
                        .slice(0, 12)
                        .map((r) => (
                            <button
                                type="button"
                                key={r.id}
                                onClick={() => {
                                    setPalette(false);
                                    selectRepo(r);
                                    setPaletteQuery("");
                                }}
                            >
                                <FolderGit2 size={15} />
                                {r.name}
                                <ArrowRight size={14} />
                            </button>
                        ))}
                </div>
            </Dialog.DialogContent>
        </Dialog.Dialog>
    );
}
