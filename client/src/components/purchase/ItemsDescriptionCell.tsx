import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";

interface ItemsDescriptionCellProps {
    description: string;
}

const ItemsDescriptionCell: React.FC<ItemsDescriptionCellProps> = ({ description }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    if (!description) {
        return <span className="text-muted-foreground italic">No description</span>;
    }

    const truncatedDescription = description.length > 50
        ? `${description.substring(0, 50)}...`
        : description;

    return (
        <>
            <Button
                variant="ghost"
                className="p-0 h-auto font-normal text-left hover:bg-transparent hover:underline"
                onClick={() => setIsDialogOpen(true)}
            >
                <span className="line-clamp-2 text-sm">
                    {truncatedDescription}
                </span>
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Purchase Items Details
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="mt-4">
                        <div className="bg-muted/30 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                            <div className="prose prose-sm max-w-none">
                                {description.split('\n').map((line, index) => (
                                    <p key={index} className="mb-2 last:mb-0">
                                        {line || <br />}
                                    </p>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
                            <span>Total characters: {description.length}</span>
                            <span>Total lines: {description.split('\n').length}</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ItemsDescriptionCell