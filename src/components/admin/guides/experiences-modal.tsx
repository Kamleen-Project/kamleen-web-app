"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { TagsInput } from "@/components/ui/tags-input";
import type { CarouselFilters } from "@/app/actions/get-carousel-experiences";
import { InputField } from "@/components/ui/input-field";
import { Globe, MapPin, Tag, Users, Hash, Layers, Map, Type } from "lucide-react";

interface ExperiencesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (filters: CarouselFilters, title: string) => void;
    countries: {
        id: string;
        name: string;
        states: {
            id: string;
            name: string;
            cities: { id: string; name: string }[];
        }[];
        cities: { id: string; name: string }[];
    }[];
    categories: {
        id: string;
        name: string;
    }[];
    initialFilters?: CarouselFilters;
    initialTitle?: string;
}

export function ExperiencesModal({ open, onOpenChange, onSelect, countries, categories, initialFilters, initialTitle }: ExperiencesModalProps) {
    const [countryId, setCountryId] = useState(initialFilters?.countryId || "");
    const [stateId, setStateId] = useState(initialFilters?.stateId || "");
    const [cityId, setCityId] = useState(initialFilters?.cityId || "");
    const [categoryId, setCategoryId] = useState(initialFilters?.categoryId || "");
    const [audience, setAudience] = useState(initialFilters?.audience || "all");
    const [tags, setTags] = useState<string[]>(initialFilters?.tags || []);
    const [tagInput, setTagInput] = useState("");
    const [title, setTitle] = useState(initialTitle || "Recommended Experiences");
    const [limit, setLimit] = useState(initialFilters?.limit || 4);

    const selectedCountry = countries.find(c => c.id === countryId);
    const availableStates = selectedCountry?.states ?? [];
    const selectedState = availableStates.find(s => s.id === stateId);

    // If state is selected, get its cities. Otherwise get country's direct cities.
    const availableCities = selectedState ? selectedState.cities : selectedCountry?.cities ?? [];

    const handleSelect = () => {
        onSelect({
            countryId: countryId || undefined,
            stateId: stateId || undefined,
            cityId: cityId || undefined,
            categoryId: categoryId || undefined,
            audience: audience,
            tags: tags,
            limit: limit
        }, title);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="size-5" />
                        {initialFilters ? "Edit Experiences Section" : "Insert Experiences Section"}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                                <Type className="size-3" /> Section Title
                            </Label>
                            <InputField
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Recommended Experiences"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                                <Globe className="size-3" /> Country
                            </Label>
                            <SelectField
                                value={countryId}
                                onChange={(e) => {
                                    setCountryId(e.target.value);
                                    setStateId("");
                                    setCityId("");
                                }}
                            >
                                <option value="">All Countries</option>
                                {countries.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </SelectField>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                                    <Map className="size-3" /> State/Region
                                </Label>
                                <SelectField
                                    value={stateId}
                                    onChange={(e) => {
                                        setStateId(e.target.value);
                                        setCityId("");
                                    }}
                                    disabled={!countryId || availableStates.length === 0}
                                >
                                    <option value="">All States</option>
                                    {availableStates.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </SelectField>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                                    <MapPin className="size-3" /> City
                                </Label>
                                <SelectField
                                    value={cityId}
                                    onChange={(e) => setCityId(e.target.value)}
                                    // Disable if no country selected, OR if country has states but no state selected (usually good practice to narrow down, but technically we could allow picking from all country cities if we wanted, but let's stick to hierarchy for sanity)
                                    // Actually, let's just enable if we have available cities.
                                    disabled={!countryId || availableCities.length === 0}
                                >
                                    <option value="">All Cities</option>
                                    {availableCities.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </SelectField>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                            <Layers className="size-3" /> Category
                        </Label>
                        <SelectField
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectField>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                            <Users className="size-3" /> Audience
                        </Label>
                        <SelectField
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="men">Men</option>
                            <option value="women">Women</option>
                            <option value="kids">Kids</option>
                        </SelectField>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                            <Tag className="size-3" /> Tags
                        </Label>
                        <TagsInput
                            tags={tags}
                            inputValue={tagInput}
                            onChangeInput={setTagInput}
                            onAddTags={(newTags) => setTags([...tags, ...newTags])}
                            onRemoveTag={(tag) => setTags(tags.filter(t => t !== tag))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                            <Hash className="size-3" /> Max Items
                        </Label>
                        <SelectField
                            value={String(limit)}
                            onChange={(e) => setLimit(Number(e.target.value))}
                        >
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="12">12</option>
                        </SelectField>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSelect}>
                        {initialFilters ? "Update Carousel" : "Insert Carousel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
