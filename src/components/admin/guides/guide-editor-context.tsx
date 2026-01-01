"use client";

import React, { createContext, useContext } from 'react';
import type { CountriesInput } from '@/lib/locations';

type GuideEditorContextType = {
    countries: CountriesInput;
    categories: { id: string; name: string }[];
};

const GuideEditorContext = createContext<GuideEditorContextType | null>(null);

export function useGuideEditorContext() {
    return useContext(GuideEditorContext);
}

export function GuideEditorProvider({
    children,
    countries,
    categories
}: {
    children: React.ReactNode;
    countries: CountriesInput;
    categories: { id: string; name: string }[];
}) {
    return (
        <GuideEditorContext.Provider value={{ countries, categories }}>
            {children}
        </GuideEditorContext.Provider>
    );
}
