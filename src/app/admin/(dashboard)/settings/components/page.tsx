"use client";

import { useMemo, useState } from "react";

import { ConsolePage } from "@/components/console/page";
import { ConsoleSection } from "@/components/console/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CtaButton } from "@/components/ui/cta-button";
import { CtaIconButton } from "@/components/ui/cta-icon-button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DropdownPanel, DropdownPanelContent, DropdownPanelHeader, DropdownPanelFooter } from "@/components/ui/dropdown-panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InputField } from "@/components/ui/input-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { FormControl, FormField, FormInput, FormLabel, FormSelect } from "@/components/ui/form";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { RadioGroupField } from "@/components/ui/radio-group-field";
import { DateField } from "@/components/ui/date-field";
import { BirthdateField } from "@/components/ui/birthdate-field";
import { PriceInput } from "@/components/ui/price-input";
import { TagsInput } from "@/components/ui/tags-input";
import { DurationSelector } from "@/components/ui/duration-selector";
import { Progress } from "@/components/ui/progress";
import { InfoBadge } from "@/components/ui/info-badge";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { UploadSinglePicture } from "@/components/ui/upload-single-picture";
import { UploadMultiplePictures } from "@/components/ui/upload-multiple-pictures";
import type { UploadMultiplePicturesItem } from "@/components/ui/upload-multiple-pictures";
import { MapLatLng } from "@/components/ui/map-latlng";
import { Stepper } from "@/components/ui/stepper";
import BalloonLoading from "@/components/ui/balloon-loading";
import { Calendar } from "@/components/ui/calendar";
import { CodeEditor } from "@/components/ui/code-editor";
import { MenuItem } from "@/components/ui/menu-item";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableHeaderRow, TableRow } from "@/components/ui/table";
import { Eye, Pencil, Trash2 } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<Card className="border-border/70 mb-6">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">{children}</CardContent>
		</Card>
	);
}

function Variation({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="space-y-2">
			<div className="text-xs font-medium text-muted-foreground">{title}</div>
			<div>{children}</div>
		</div>
	);
}

export default function AdminComponentsShowcasePage() {
	const [openDialog, setOpenDialog] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [tags, setTags] = useState<string[]>(["art", "music"]);
	const [tagInput, setTagInput] = useState<string>("");
	const [priceStr, setPriceStr] = useState<string>("42");
	const [code, setCode] = useState<string>("// Type code here\nfunction hello() {\n  return 'world'\n}\n");
	const [pictures, setPictures] = useState<UploadMultiplePicturesItem[]>([]);
	const [singlePic, setSinglePic] = useState<File | null>(null);
	const [singlePicWide, setSinglePicWide] = useState<File | null>(null);
	const [radioValue, setRadioValue] = useState("A");
	const [checked, setChecked] = useState(true);
	const [progress, setProgress] = useState(45);
	const [dateValue, setDateValue] = useState<Date | undefined>(new Date("2025-10-10"));
	const [birthValue, setBirthValue] = useState<Date | undefined>(new Date("1990-12-31"));
	const [duration, setDuration] = useState<{ days: string; hours: string; minutes: string }>({ days: "0", hours: "1", minutes: "30" });
	const [stepperVal, setStepperVal] = useState<string>("5");
	const [latStr, setLatStr] = useState<string>("37.7749");
	const [lngStr, setLngStr] = useState<string>("-122.4194");
	const dateFmt = useMemo(() => new Intl.DateTimeFormat("en", { dateStyle: "medium" }), []);
	const demoTableRows = useMemo(
		() => [
			{ name: "Alpha", value: 68 },
			{ name: "Beta", value: 39 },
			{ name: "Gamma", value: 21 },
		],
		[]
	);

	return (
		<ConsolePage title="Components" subtitle="Preview and test the reusable UI kit used across the admin console.">
			<div className="grid gap-6">
				<ConsoleSection title="Buttons & Calls to action" className="gap-4">
					<Section title="Buttons">
						<Variation title="Primary CTA">
							<CtaButton size="md">Primary CTA</CtaButton>
						</Variation>
						<Variation title="Secondary CTA (white)">
							<CtaButton size="md" color="white">
								Secondary CTA
							</CtaButton>
						</Variation>
						<Variation title="CTA icon (view)">
							<CtaIconButton size="md" color="whiteBorder" ariaLabel="View">
								<Eye />
							</CtaIconButton>
						</Variation>
						<Variation title="CTA icon (delete)">
							<CtaIconButton size="md" color="red" ariaLabel="Delete">
								<Trash2 />
							</CtaIconButton>
						</Variation>
					</Section>
				</ConsoleSection>

				<ConsoleSection title="Indicators & Content" className="gap-4">
					<Section title="Badges">
						<Variation title="Default badge">
							<Badge>default</Badge>
						</Variation>
						<Variation title="Outline badge">
							<Badge variant="outline">outline</Badge>
						</Variation>
						<Variation title="Info badge">
							<InfoBadge>info</InfoBadge>
						</Variation>
					</Section>
					<Section title="Progress & Loading">
						<Variation title="Progress (increment)">
							<div className="flex items-center gap-4">
								<Progress value={progress} className="w-60" />
								<CtaButton size="sm" onClick={() => setProgress((p) => (p >= 100 ? 0 : Math.min(100, p + 10)))}>
									+10%
								</CtaButton>
							</div>
						</Variation>
						<Variation title="Balloon loading">
							<BalloonLoading label="Loading" />
						</Variation>
					</Section>
					<Section title="Cards">
						<Variation title="Basic card">
							<Card className="border-border/60">
								<CardHeader>
									<CardTitle>Card title</CardTitle>
									<CardDescription>Card description</CardDescription>
								</CardHeader>
								<CardContent>Body content</CardContent>
							</Card>
						</Variation>
					</Section>
					<Section title="Images">
						<Variation title="Image with fallback (missing)">
							<div className="relative h-14 w-24 overflow-hidden rounded">
								<ImageWithFallback src="/images/nonexistent.png" alt="fallback" fill className="object-cover" />
							</div>
						</Variation>
						<Variation title="Image with fallback (ok)">
							<div className="relative h-14 w-24 overflow-hidden rounded">
								<ImageWithFallback src="/images/image-placeholder.png" alt="ok" fill className="object-cover" />
							</div>
						</Variation>
					</Section>
				</ConsoleSection>

				<ConsoleSection title="Form elements" className="gap-4">
					<Section title="Inputs">
						<Variation title="InputField">
							<InputField label="With label" placeholder="Your name" />
						</Variation>
						<Variation title="TextareaField">
							<TextareaField label="Message" placeholder="Say hello" rows={3} />
						</Variation>
					</Section>
					<Section title="Form system">
						<Variation title="Email">
							<FormField>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<FormInput type="email" placeholder="you@example.com" />
								</FormControl>
							</FormField>
						</Variation>
						<Variation title="Role select">
							<FormField>
								<FormLabel>Role</FormLabel>
								<FormControl>
									<FormSelect defaultValue="EXPLORER">
										<option value="EXPLORER">Explorer</option>
										<option value="ORGANIZER">Organizer</option>
									</FormSelect>
								</FormControl>
							</FormField>
						</Variation>
						<Variation title="Checkbox field">
							<CheckboxField label="Accept terms" checked={checked} onChange={(e) => setChecked(e.currentTarget.checked)} />
						</Variation>
						<Variation title="Radio group">
							<RadioGroupField
								label="Choice"
								options={[
									{ value: "A", label: "Option A" },
									{ value: "B", label: "Option B" },
								]}
								value={radioValue}
								onChange={setRadioValue}
							/>
						</Variation>
						<Variation title="Date field">
							<DateField label="Date" value={dateValue} onChange={setDateValue} />
						</Variation>
						<Variation title="Birthdate field">
							<BirthdateField label="Birthdate" value={birthValue} onChange={setBirthValue} />
						</Variation>
						<Variation title="Price input">
							<PriceInput label="Price" currency="USD" value={priceStr} onValueChange={setPriceStr} />
						</Variation>
						<Variation title="Tags input">
							<TagsInput
								label="Tags"
								tags={tags}
								inputValue={tagInput}
								onChangeInput={setTagInput}
								onAddTags={(newTags) => {
									const next = newTags.filter((t) => !tags.includes(t));
									if (next.length) setTags([...tags, ...next]);
									setTagInput("");
								}}
								onRemoveTag={(tag) => setTags(tags.filter((t) => t !== tag))}
								placeholder="Add tag"
							/>
						</Variation>
						<Variation title="Duration selector">
							<DurationSelector value={duration} onChange={setDuration} />
						</Variation>
					</Section>
				</ConsoleSection>

				<ConsoleSection title="Overlays & Menus" className="gap-4">
					<Section title="Dialog">
						<Variation title="Basic dialog">
							<div className="flex items-center gap-3">
								<CtaButton onClick={() => setOpenDialog(true)}>Open dialog</CtaButton>
								<Dialog open={openDialog} onOpenChange={setOpenDialog}>
									<DialogContent>
										<DialogTitle>Sample dialog</DialogTitle>
										<DialogDescription>Use dialogs for confirmations and forms.</DialogDescription>
										<DialogFooter>
											<DialogClose asChild>
												<CtaButton color="whiteBorder">Cancel</CtaButton>
											</DialogClose>
											<CtaButton onClick={() => setOpenDialog(false)}>OK</CtaButton>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</div>
						</Variation>
					</Section>

					<Section title="Dropdown panel">
						<Variation title="Dropdown with items">
							<DropdownPanel
								open={dropdownOpen}
								onOpenChange={setDropdownOpen}
								trigger={<CtaButton color="whiteBorder">Open dropdown</CtaButton>}
								align="start"
							>
								<DropdownPanelHeader title="Menu" />
								<DropdownPanelContent className="flex flex-col">
									<MenuItem>Item one</MenuItem>
									<MenuItem>Item two</MenuItem>
									<MenuItem variant="danger">Danger</MenuItem>
								</DropdownPanelContent>
								<DropdownPanelFooter>
									<MenuItem variant="cta">Primary action</MenuItem>
								</DropdownPanelFooter>
							</DropdownPanel>
						</Variation>
					</Section>

					<Section title="Popover">
						<Variation title="Basic popover">
							<Popover>
								<PopoverTrigger asChild>
									<CtaButton color="whiteBorder">Toggle popover</CtaButton>
								</PopoverTrigger>
								<PopoverContent className="w-60">Small tooltip-like content with actions.</PopoverContent>
							</Popover>
						</Variation>
					</Section>
				</ConsoleSection>

				<ConsoleSection title="Tables" className="gap-4">
					<Section title="Tables">
						<Variation title="Basic table">
							<TableContainer>
								<Table minWidth={600}>
									<TableHeader>
										<TableHeaderRow>
											<TableHead>Name</TableHead>
											<TableHead align="right">Value</TableHead>
											<TableHead>Actions</TableHead>
										</TableHeaderRow>
									</TableHeader>
									<TableBody>
										{demoTableRows.map((row) => (
											<TableRow key={row.name}>
												<TableCell>{row.name}</TableCell>
												<TableCell align="right">{row.value}</TableCell>
												<TableCell>
													<div className="flex items-center gap-1.5">
														<CtaIconButton size="sm" color="whiteBorder" ariaLabel="Edit">
															<Pencil className="size-4" />
														</CtaIconButton>
														<CtaIconButton size="sm" color="red" ariaLabel="Delete">
															<Trash2 className="size-4" />
														</CtaIconButton>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						</Variation>
					</Section>
				</ConsoleSection>

				<ConsoleSection title="Media & Uploads" className="gap-4">
					<Section title="Uploads">
						<Variation title="Upload single picture">
							<div className="space-y-2">
								<UploadSinglePicture previewUrl={undefined} onChangeFile={setSinglePic} onRemove={() => setSinglePic(null)} />
								<div className="text-xs text-muted-foreground">Single: {singlePic ? singlePic.name : "none"}</div>
							</div>
						</Variation>
						<Variation title="Upload single picture (21/9 aspect)">
							<div className="space-y-2">
								<UploadSinglePicture previewUrl={undefined} aspect="twentyOneNine" onChangeFile={setSinglePicWide} onRemove={() => setSinglePicWide(null)} />
								<div className="text-xs text-muted-foreground">Single wide: {singlePicWide ? singlePicWide.name : "none"}</div>
							</div>
						</Variation>
						<Variation title="Upload multiple pictures">
							<div className="space-y-2">
								<UploadMultiplePictures
									selected={pictures}
									aspect="twentyOneNine"
									onAddFiles={(files) => {
										const next: UploadMultiplePicturesItem[] = files.map((file, idx) => ({
											id: (globalThis.crypto?.randomUUID?.() as string) || `${Date.now()}-${idx}`,
											previewUrl: URL.createObjectURL(file),
										}));
										setPictures((prev) => [...prev, ...next]);
									}}
									onRemove={(id) => {
										setPictures((prev) => {
											const item = prev.find((p) => p.id === id);
											if (item) URL.revokeObjectURL(item.previewUrl);
											return prev.filter((p) => p.id !== id);
										});
									}}
								/>
								<div className="text-xs text-muted-foreground">Multiple: {pictures.length} file(s)</div>
							</div>
						</Variation>
					</Section>
				</ConsoleSection>

				<ConsoleSection title="Maps" className="gap-4">
					<Section title="Maps">
						<Variation title="MapLatLng field">
							<MapLatLng lat={latStr} lng={lngStr} onLatChange={setLatStr} onLngChange={setLngStr} labels={{ lat: "Latitude", lng: "Longitude" }} />
						</Variation>
					</Section>
				</ConsoleSection>

				<ConsoleSection title="Miscellaneous" className="gap-4">
					<Section title="Misc">
						<Variation title="Stepper">
							<Stepper value={stepperVal} onChange={setStepperVal} min={0} max={10} />
						</Variation>
						<Variation title="Calendar">
							<Calendar value={{ from: new Date("2025-10-10"), to: new Date("2025-10-10") }} onChange={() => {}} />
						</Variation>
						<Variation title="Code editor">
							<CodeEditor value={code} language="typescript" onChange={setCode} height={160} />
						</Variation>
					</Section>
				</ConsoleSection>
			</div>
		</ConsolePage>
	);
}
