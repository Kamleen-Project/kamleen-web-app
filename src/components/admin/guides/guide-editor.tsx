"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CustomImageExtension } from "./image-extension";
import LinkExtension from "@tiptap/extension-link";
import YoutubeExtension from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useTransition, useEffect } from "react";
import { useNotifications } from "@/components/providers/notification-provider";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";
import { TagsInput } from "@/components/ui/tags-input";
import { InputField } from "@/components/ui/input-field";
import { Button } from "@/components/ui/button";
import { CtaButton } from "@/components/ui/cta-button";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { updateGuide, checkSlugUnique } from "@/app/actions/guides";
import { uploadFileAction } from "@/app/actions/upload";
import { Bold, Italic, Link as LinkIcon, Image as ImageIcon, Youtube, Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, Save, Eye, CheckCircle, ChevronLeft, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuideStatus } from "@/generated/prisma";
import { StatusBadge } from "@/components/ui/status-badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleField } from "@/components/ui/toggle-field";
import { SelectField } from "@/components/ui/select-field";
import MapLatLng from "@/components/ui/map-latlng";
import type { CountriesInput } from "@/lib/locations";


type Guide = {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    featuredImage: string | null;
    tags: string[];
    status: GuideStatus;
    metaTitle: string | null;
    metaDescription: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    latitude: number | string | object | null;
    longitude: number | string | object | null;
    countryId: string | null;
    stateId: string | null;
    cityId: string | null;
};

function slugify(text: string) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-');  // Replace multiple - with single -
}

export function GuideEditor({ guide, countries }: { guide: Guide; countries: CountriesInput }) {
    const { notify } = useNotifications();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [title, setTitle] = useState(guide.title);
    const [slug, setSlug] = useState(guide.slug);
    const [excerpt, setExcerpt] = useState(guide.excerpt || "");
    const [featuredImage, setFeaturedImage] = useState(guide.featuredImage);
    const [tags, setTags] = useState<string[]>(guide.tags);
    const [status, setStatus] = useState<GuideStatus>(guide.status);
    const [metaTitle, setMetaTitle] = useState(guide.metaTitle || "");
    const [metaDescription, setMetaDescription] = useState(guide.metaDescription || "");
    const [tagInput, setTagInput] = useState("");
    const [saving, setSaving] = useState(false);

    // Location state
    const [showLocation, setShowLocation] = useState(!!(guide.latitude && guide.longitude));
    const [address, setAddress] = useState(guide.address || "");
    const [countryId, setCountryId] = useState(guide.countryId || "");
    const [stateId, setStateId] = useState(guide.stateId || "");
    const [cityId, setCityId] = useState(guide.cityId || "");
    const [latitude, setLatitude] = useState(guide.latitude ? String(guide.latitude) : "34.020882");
    const [longitude, setLongitude] = useState(guide.longitude ? String(guide.longitude) : "-6.841650");

    // Derived location helpers
    const selectedCountry = countries.find((c) => c.id === countryId) ?? null;
    const availableStates = selectedCountry?.states ?? [];
    const selectedState = availableStates.find((s) => s.id === stateId) ?? null;
    const availableCities = selectedState ? selectedState.cities : selectedCountry?.cities ?? [];

    const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setCountryId(event.target.value);
        setStateId("");
        setCityId("");
    };

    const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setStateId(event.target.value);
        setCityId("");
    };

    const handleCityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const cId = event.target.value;
        setCityId(cId);
        // Try to update map if city has coords
        const cityObj = availableCities.find(c => c.id === cId);
        if (cityObj && cityObj.latitude && cityObj.longitude) {
            setLatitude(String(cityObj.latitude));
            setLongitude(String(cityObj.longitude));
        }
    };

    const handleMapChange = (lat: number, lng: number) => {
        setLatitude(String(lat));
        setLongitude(String(lng));
    };

    const [isSlugValid, setIsSlugValid] = useState<boolean | null>(true);
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);

    useEffect(() => {
        const checkSlug = async () => {
            if (!slug) {
                setIsSlugValid(false);
                return;
            }
            if (slug === guide.slug) {
                setIsSlugValid(true);
                return;
            }

            setIsCheckingSlug(true);
            try {
                const unique = await checkSlugUnique(slug, guide.id);
                setIsSlugValid(unique);
            } catch {
                setIsSlugValid(null);
            } finally {
                setIsCheckingSlug(false);
            }
        };

        const timer = setTimeout(checkSlug, 500);
        return () => clearTimeout(timer);
    }, [slug, guide.id, guide.slug]);

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSlug(slugify(e.target.value));
    };

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            CustomImageExtension,
            LinkExtension.configure({
                openOnClick: false,
            }),
            YoutubeExtension,
            Placeholder.configure({
                placeholder: "Write something amazing...",
            }),
        ],
        content: guide.content,
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none mx-auto focus:outline-none min-h-[500px] p-4',
            },
        },
    });

    // Update local state when guide prop changes
    useEffect(() => {
        // Handle external updates if needed
    }, [guide]);

    const handleSave = async () => {
        if (!editor) return;
        if (isSlugValid === false) {
            notify({ title: "Error", message: "Please fix the slug before saving.", intent: "error" });
            return;
        }

        setSaving(true);
        const content = editor.getHTML();

        const latNum = showLocation && latitude ? parseFloat(latitude as string) : null;
        const lngNum = showLocation && longitude ? parseFloat(longitude as string) : null;

        // Resolve names for display strings based on current selection
        const selectedCountry = countries.find(c => c.id === countryId);
        const cName = selectedCountry?.name || null;

        const selectedState = selectedCountry?.states.find(s => s.id === stateId);
        const sName = selectedState?.name || null;

        // City logic: if state exists, look in state's cities. If not, look in country's cities (direct children)
        const possibleCities = selectedState ? selectedState.cities : selectedCountry?.cities ?? [];
        const selectedCity = possibleCities.find(c => c.id === cityId);
        const cityName = selectedCity?.name || null;

        try {
            await updateGuide(guide.id, {
                title,
                slug,
                excerpt,
                content,
                featuredImage,
                tags,
                status,
                metaTitle,
                metaDescription,
                address: showLocation ? address : null,
                city: showLocation ? cityName : null,
                state: showLocation ? sName : null,
                country: showLocation ? cName : null,
                latitude: latNum,
                longitude: lngNum,
                countryId: showLocation ? countryId : null,
                stateId: showLocation ? stateId : null,
                cityId: showLocation ? cityId : null,
            });
            notify({ title: "Success", message: "Guide saved successfully", intent: "success" });
            router.refresh();
        } catch (error) {
            notify({ title: "Error", message: "Failed to save guide", intent: "error" });
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await uploadFileAction(formData);
            setFeaturedImage(res.url);
        } catch (e) {
            notify({ title: "Error", message: "Failed to upload image", intent: "error" });
        }
    };

    const addImageToEditor = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                const uploadPromises = Array.from(files).map(async (file) => {
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                        const res = await uploadFileAction(formData);
                        return res.url;
                    } catch (error: any) {
                        console.error(`Failed to upload ${file.name}`, error);
                        notify({
                            title: "Error",
                            message: `Failed to upload ${file.name}: ${error.message || "Unknown error"}`,
                            intent: "error"
                        });
                        return null;
                    }
                });

                const urls = await Promise.all(uploadPromises);

                if (editor) {
                    let chain = editor.chain().focus();
                    urls.forEach((url) => {
                        if (url) {
                            chain = chain.setImage({ src: url });
                        }
                    });
                    chain.run();
                }
            }
        };
        input.click();
    };

    const addYoutubeToEditor = () => {
        const url = prompt("Enter YouTube URL");
        if (url && editor) {
            editor.chain().focus().setYoutubeVideo({ src: url }).run();
        }
    };

    const setLink = () => {
        const previousUrl = editor?.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    if (!editor) return null;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 lg:top-16 z-10 flex items-center justify-between border-b bg-background/95 px-6 py-4 backdrop-blur">
                <div className="flex items-center gap-4 grow">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/admin/guides">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <div className="flex flex-col w-full items-stretch grow">
                        <span className="text-sm font-medium text-muted-foreground">Editing Guide</span>
                        <InputField
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="h-auto w-full border-none rounded-none bg-transparent p-0 text-lg font-bold shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                            placeholder="Untitled Guide"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <CtaIconButton color="whiteBorder" size="md" asChild ariaLabel="Preview">
                        <Link href={`/guides/${guide.slug}`} target="_blank">
                            <Eye className="size-4" />
                        </Link>
                    </CtaIconButton>
                    <CtaButton
                        label="Save"
                        onClick={handleSave}
                        isLoading={saving}
                        startIcon={<Save className="size-4" />}
                        color="black"
                        disabled={isSlugValid === false}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 py-4">
                {/* Main Content */}
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="sticky top-[80px] lg:top-[160px] z-10 mx-auto max-w-4xl rounded-lg border bg-background p-2 shadow-sm flex flex-wrap gap-1">
                        <Button
                            variant={editor.isActive('bold') ? "default" : "ghost"}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className="h-8 w-8"
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive('italic') ? "default" : "ghost"}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className="h-8 w-8"
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                        <div className="w-px bg-border mx-1" />
                        <Button
                            variant={editor.isActive('heading', { level: 1 }) ? "default" : "ghost"}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className="h-8 w-8"
                        >
                            <Heading1 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive('heading', { level: 2 }) ? "default" : "ghost"}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            className="h-8 w-8"
                        >
                            <Heading2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive('heading', { level: 3 }) ? "default" : "ghost"}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            className="h-8 w-8"
                        >
                            <Heading3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive('paragraph') ? "default" : "ghost"}
                            size="icon"
                            onClick={() => editor.chain().focus().setParagraph().run()}
                            className="h-8 w-8"
                        >
                            <Pilcrow className="h-4 w-4" />
                        </Button>
                        <div className="w-px bg-border mx-1" />
                        <Button
                            variant={editor.isActive('bulletList') ? "default" : "ghost"}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className="h-8 w-8"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive('orderedList') ? "default" : "ghost"}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className="h-8 w-8"
                        >
                            <ListOrdered className="h-4 w-4" />
                        </Button>
                        <div className="w-px bg-border mx-1" />
                        <Button
                            variant={editor.isActive('link') ? "default" : "ghost"}
                            size="icon"
                            onClick={setLink}
                            className="h-8 w-8"
                        >
                            <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={addImageToEditor}
                            className="h-8 w-8"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={addYoutubeToEditor}
                            className="h-8 w-8"
                        >
                            <Youtube className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="border rounded-lg max-h-[640px] overflow-scroll bg-white text-black p-4 lg:sticky lg:top-[226px] lg:h-fit">
                        <EditorContent editor={editor} />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Publishing */}
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Publishing</h3>
                            <StatusBadge value={status} variation={status === "PUBLISHED" ? "success" : "muted"} />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="publish-switch">Published</Label>
                            <Switch
                                id="publish-switch"
                                checked={status === "PUBLISHED"}
                                onCheckedChange={(c) => setStatus(c ? "PUBLISHED" : "DRAFT")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Slug</Label>
                            <div className="relative">
                                <InputField
                                    value={slug}
                                    onChange={handleSlugChange}
                                    className={`pr-8 ${isSlugValid === false ? "border-red-500 focus-visible:ring-red-500" : isSlugValid === true ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                                />
                                <div className="absolute right-2 top-2.5">
                                    {isCheckingSlug ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    ) : isSlugValid === true ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : isSlugValid === false ? (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                    ) : null}
                                </div>
                            </div>
                            {isSlugValid === false && <p className="text-xs text-red-500">Slug is already taken</p>}
                        </div>
                    </div>

                    {/* Featured Image */}
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                        <h3 className="font-semibold">Featured Image</h3>
                        <UploadSinglePicture
                            previewUrl={featuredImage}
                            onChangeFile={handleImageUpload}
                            onRemove={() => setFeaturedImage(null)}
                            aspect="twentyOneNine"
                        />
                    </div>

                    {/* Tags */}
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                        <h3 className="font-semibold">Tags</h3>
                        <TagsInput
                            tags={tags}
                            inputValue={tagInput}
                            onChangeInput={setTagInput}
                            onAddTags={(newTags) => setTags([...tags, ...newTags])}
                            onRemoveTag={(tag) => setTags(tags.filter(t => t !== tag))}
                        />
                    </div>

                    {/* Location */}
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                        <h3 className="font-semibold">Location</h3>
                        <ToggleField
                            label="Enable Location"
                            checked={showLocation}
                            onChange={setShowLocation}
                        />

                        {showLocation && (
                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label>Address</Label>
                                    <InputField
                                        value={address}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
                                        placeholder="Full address"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <SelectField
                                        label="Country"
                                        value={countryId}
                                        onChange={handleCountryChange}
                                    >
                                        <option value="">Select a country</option>
                                        {countries.map((country) => (
                                            <option key={country.id} value={country.id}>
                                                {country.name}
                                            </option>
                                        ))}
                                    </SelectField>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField
                                        label="State/Region"
                                        value={stateId}
                                        onChange={handleStateChange}
                                        disabled={!selectedCountry || availableStates.length === 0}
                                    >
                                        <option value="">{availableStates.length ? "Select a state" : "No states"}</option>
                                        {availableStates.map((state) => (
                                            <option key={state.id} value={state.id}>
                                                {state.name}
                                            </option>
                                        ))}
                                    </SelectField>

                                    <SelectField
                                        label="City"
                                        value={cityId}
                                        onChange={handleCityChange}
                                        disabled={!selectedCountry}
                                    >
                                        <option value="">{availableCities.length ? "Select a city" : "No cities"}</option>
                                        {availableCities.map((city) => (
                                            <option key={city.id} value={city.id}>
                                                {city.name}
                                            </option>
                                        ))}
                                    </SelectField>
                                </div>
                                <div className="space-y-2">
                                    <Label>Map Position</Label>
                                    <MapLatLng
                                        lat={latitude}
                                        lng={longitude}
                                        onLatChange={setLatitude}
                                        onLngChange={setLongitude}
                                        onMapChange={handleMapChange}
                                        height={250}
                                        hint="Click on the map to set the exact location."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                        <h3 className="font-semibold">SEO Metadata</h3>
                        <div className="space-y-2">
                            <Label>Meta Title</Label>
                            <InputField
                                value={metaTitle}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMetaTitle(e.target.value)}
                                placeholder={title}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Meta Description</Label>
                            <textarea
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                rows={3}
                                value={metaDescription}
                                onChange={(e) => setMetaDescription(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Excerpt</Label>
                            <textarea
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                rows={3}
                                value={excerpt}
                                onChange={(e) => setExcerpt(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
