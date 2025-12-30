
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Settings } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputField } from "@/components/ui/input-field";
import { useGuideLightbox } from "@/components/guides/guide-lightbox-provider";
import { cn } from "@/lib/utils";

export function ImageNodeView(props: NodeViewProps) {
    const { node, updateAttributes, selected, editor } = props;
    const isEditable = editor.isEditable;
    const [isOpen, setIsOpen] = useState(false);

    // Safely try to get context, it might be missing if used outside of GuideContent (e.g. editor page)
    // We can conditionally use it.
    let lightboxContext: any = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        lightboxContext = useGuideLightbox();
    } catch {
        // Ignore if context is missing (e.g. in Admin Editor where we might not want lightbox or haven't wrapped it yet)
    }

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

    const handleImageClick = () => {
        if (!isEditable && lightboxContext) {
            lightboxContext.openLightbox(node.attrs.src);
        }
    };

    return (
        <NodeViewWrapper className="image-node-view relative group flex flex-col items-center my-0 not-prose">
            <div
                onClick={handleImageClick}
                className={cn(
                    "relative rounded-lg overflow-hidden border bg-muted w-full max-w-3xl transition-all",
                    (selected && isEditable) ? "ring-2 ring-primary ring-offset-2" : "",
                    (!isEditable && lightboxContext) ? "cursor-zoom-in hover:brightness-95 active:scale-[0.99]" : ""
                )}
            >
                {/* Settings Button - Only visible on hover and if editable */}
                {isEditable && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Button variant="secondary" size="icon" onClick={(e) => { e.stopPropagation(); handleOpen(); }} className="h-8 w-8 shadow-sm" type="button">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                )}

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
                <DialogContent onClick={(e) => e.stopPropagation()}>
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
