
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Settings } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputField } from "@/components/ui/input-field";

export function ImageNodeView(props: NodeViewProps) {
    const { node, updateAttributes, selected } = props;
    const [isOpen, setIsOpen] = useState(false);

    // Initialize state from props whenever modal opens, 
    // or just keep them in sync. 
    // Better to init from node.attrs when opening or use effects, 
    // but for simplicity we can just read from node.attrs for the initial state of the modal.
    const [alt, setAlt] = useState(node.attrs.alt || "");
    const [caption, setCaption] = useState(node.attrs.caption || "");

    const handleOpen = () => {
        setAlt(node.attrs.alt || "");
        setCaption(node.attrs.caption || "");
        setIsOpen(true);
    };

    const handleSave = () => {
        updateAttributes({ alt, caption });
        setIsOpen(false);
    };

    return (
        <NodeViewWrapper className="image-node-view relative group flex flex-col items-center my-0 not-prose">
            <div className={`relative rounded-lg overflow-hidden border bg-muted w-full max-w-3xl transition-all ${selected ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                {/* Settings Button - Only visible on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="secondary" size="icon" onClick={handleOpen} className="h-8 w-8 shadow-sm" type="button">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>

                {/* Image Display */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={node.attrs.src}
                    alt={node.attrs.alt}
                    className="w-full h-auto object-cover m-0 mt-0"
                />
            </div>

            {/* Caption Display in Editor */}
            {node.attrs.caption && (
                <div className="text-center text-sm text-muted-foreground mt-2 italic px-4">
                    {node.attrs.caption}
                </div>
            )}

            {/* Settings Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Image Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Alt Text</Label>
                            <InputField
                                value={alt}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlt(e.target.value)}
                                placeholder="Description for accessibility"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Caption</Label>
                            <InputField
                                value={caption}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaption(e.target.value)}
                                placeholder="Image caption"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </NodeViewWrapper>
    );
}
