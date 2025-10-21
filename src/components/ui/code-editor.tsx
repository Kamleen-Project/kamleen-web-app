"use client";

import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";

export type CodeEditorProps = {
	value: string;
	onChange: (next: string) => void;
	language?: string;
	height?: number | string;
	readOnly?: boolean;
	className?: string;
	options?: MonacoEditor.IStandaloneEditorConstructionOptions;
	ariaLabel?: string;
};

export function CodeEditor({ value, onChange, language = "html", height = 420, readOnly = false, className, options, ariaLabel }: CodeEditorProps) {
	const prefersDark = usePrefersDarkMode();
	const theme = prefersDark ? "vs-dark" : "light";

	// Enforce a maximum height of 600px to avoid oversized editors
	const maxHeightPx = 600;
	const resolvedHeight = typeof height === "number" ? Math.min(height, maxHeightPx) : height;

	const mergedOptions = useMemo<MonacoEditor.IStandaloneEditorConstructionOptions>(
		() => ({
			readOnly,
			minimap: { enabled: false },
			wordWrap: "on",
			fontLigatures: true,
			scrollBeyondLastLine: false,
			renderWhitespace: "selection",
			lineNumbers: "on",
			automaticLayout: true,
			...options,
		}),
		[readOnly, options]
	);

	return (
		<div className={className} aria-label={ariaLabel} style={{ maxHeight: maxHeightPx }}>
			<Editor
				value={value}
				language={language}
				onChange={(v) => onChange(v ?? "")}
				theme={theme}
				height={resolvedHeight}
				options={mergedOptions}
				loading={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading editor…</div>}
			/>
		</div>
	);
}

type MediaQueryListLegacy = MediaQueryList & {
	addListener: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
	removeListener: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
};

function usePrefersDarkMode() {
	const [isDark, setIsDark] = useState(false);
	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mql = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
		setIsDark(mql.matches);
		try {
			const listener: EventListener = (ev) => handleChange(ev as MediaQueryListEvent);
			mql.addEventListener("change", listener);
			return () => mql.removeEventListener("change", listener);
		} catch {
			if (typeof (mql as MediaQueryListLegacy).addListener === "function") {
				(mql as MediaQueryListLegacy).addListener(handleChange);
				return () => (mql as MediaQueryListLegacy).removeListener(handleChange);
			}
		}
		return;
	}, []);
	return isDark;
}
