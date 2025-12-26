"use client";

import React, { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

// URL to a valid TopoJSON file for the world map
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
    data: { country: string; visitors: number }[];
    cities?: { name: string; coordinates: [number, number]; visitors: number }[];
}

export function WorldMap({ data, cities = [] }: WorldMapProps) {
    const [position, setPosition] = React.useState({ coordinates: [0, 0], zoom: 1 });

    // Calculate the max visitors to scale colors
    const maxVisitors = useMemo(() => Math.max(...data.map((d) => d.visitors), 0), [data]);

    // Create a color scale
    const colorScale = scaleLinear<string>().domain([0, maxVisitors]).range(["#e6e6e6", "#3b82f6"]); // Light gray to blue

    function handleMoveEnd(position: { coordinates: [number, number]; zoom: number }) {
        setPosition(position);
    }

    return (
        <div className="h-[600px] w-full items-center justify-center overflow-hidden rounded-xl bg-card border shadow-sm relative">
            {/* Reset Zoom Button */}
            {position.zoom !== 1 && (
                <button
                    onClick={() => setPosition({ coordinates: [0, 0], zoom: 1 })}
                    className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm border rounded-md px-2 py-1 text-xs font-medium shadow-sm hover:bg-accent transition-colors"
                >
                    Reset View
                </button>
            )}

            <ComposableMap projectionConfig={{ scale: 180 }} className="h-full w-full">
                <ZoomableGroup
                    zoom={position.zoom}
                    center={position.coordinates as [number, number]}
                    onMoveEnd={handleMoveEnd}
                    minZoom={1}
                    maxZoom={10}
                >
                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const d = data.find((s) => s.country === geo.properties.name || s.country === geo.id);
                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={d ? colorScale(d.visitors) : "#F5F4F6"}
                                        stroke="#D6D6DA"
                                        strokeWidth={0.5}
                                        style={{
                                            default: { outline: "none" },
                                            hover: { fill: "#F53", outline: "none", cursor: "pointer" },
                                            pressed: { outline: "none" },
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>

                    {cities.map(({ name, coordinates, visitors }) => (
                        <Marker key={name} coordinates={coordinates}>
                            <circle
                                r={4 / position.zoom}
                                fill="#F53"
                                stroke="#fff"
                                strokeWidth={2 / position.zoom}
                            />
                            <text
                                textAnchor="middle"
                                y={-10 / position.zoom}
                                style={{
                                    fontFamily: "system-ui",
                                    fill: "#5D5A6D",
                                    fontSize: `${10 / position.zoom}px`,
                                    fontWeight: "bold"
                                }}
                            >
                                {name}
                            </text>
                        </Marker>
                    ))}
                </ZoomableGroup>
            </ComposableMap>
        </div>
    );
}
