import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutItem {
    key: string;
    description: string;
}

interface KeyboardShortcutsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    shortcuts: ShortcutItem[];
}

export function KeyboardShortcutsModal({
    open,
    onOpenChange,
    title = "Keyboard Shortcuts",
    shortcuts
}: KeyboardShortcutsModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                {/* Blue gradient header like a button */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Keyboard className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-white text-xl">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-white/80 text-sm mt-1">
                                Speed up your workflow with these keyboard shortcuts
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Shortcuts list */}
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                        {shortcuts.map((shortcut, index) => (
                            <div key={index} className="contents">
                                <div className="font-mono font-semibold bg-blue-50 text-blue-700 p-2 rounded-lg text-center text-sm border border-blue-200">
                                    {shortcut.key}
                                </div>
                                <div className="p-2 text-sm text-muted-foreground flex items-center">
                                    {shortcut.description}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer note */}
                    <div className="border-t mt-4 pt-4">
                        <p className="text-xs text-muted-foreground text-center">
                            💡 Shortcuts work when not typing in input fields
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}