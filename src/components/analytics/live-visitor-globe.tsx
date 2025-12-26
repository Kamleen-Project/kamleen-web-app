"use client";

import createGlobe from "cobe";
import React, { useEffect, useRef } from "react";
import { useSpring, animated } from 'react-spring';

interface Marker {
    location: [number, number];
    size: number;
}

interface LiveVisitorGlobeProps {
    markers: Marker[];
}

// Local state type for the globe instance
// Local state type for the globe instance
interface GlobeState {
    phi: number;
    markers: Marker[];
    mapBrightness: number;
    focusPhi: number;
}

/**
 * GlobeImplementation
 * This component renders the 3D Canvas once and NEVER rerenders.
 * It uses a background loop (60fps) to pick up changes from the passed stateRef.
 */
const GlobeImplementation = React.memo(({ stateRef }: { stateRef: React.MutableRefObject<GlobeState> }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointerInteracting = useRef<number | null>(null);
    const pointerInteractionMovement = useRef(0);
    const globeInstanceRef = useRef<any>(null);

    const [{ r }, api] = useSpring(() => ({
        r: 0,
        config: {
            mass: 1,
            tension: 280,
            friction: 40,
            precision: 0.001,
        },
    }));

    const phiRef = useRef(0);

    useEffect(() => {
        let width = 0;
        const onResize = () => {
            if (canvasRef.current) {
                width = canvasRef.current.offsetWidth;
            }
        };
        window.addEventListener('resize', onResize);
        onResize();

        if (!canvasRef.current || globeInstanceRef.current) return;

        try {
            globeInstanceRef.current = createGlobe(canvasRef.current, {
                devicePixelRatio: 2,
                width: width,
                height: width * 2,
                phi: phiRef.current,
                theta: 0.2,
                dark: 1,
                diffuse: 0,
                mapSamples: 16000,
                mapBrightness: 1,
                mapBaseBrightness: 0,
                baseColor: [1, 1, 1],
                markerColor: [236 / 255, 56 / 255, 86 / 255],
                glowColor: [0.9, 0.9, 0.9],
                offset: [0, 0],
                scale: 0.6, // Fixed scale
                opacity: 1, // Fixed opacity
                markers: stateRef.current.markers,
                onRender: (state) => {
                    const currentR = r.get();

                    // Smooth auto-rotation to focusPhi if user is not interacting
                    if (!pointerInteracting.current) {
                        const targetPhi = stateRef.current.focusPhi;
                        const dist = targetPhi - phiRef.current;
                        const direction = dist > 0 ? 1 : -1;
                        // Shortest path logic
                        // If distance is > PI, wrap around
                        // However, simpler approach: just lerp
                        // Since phi can be anything, we might not need shortest path if we calculate target carefully
                        // But let's just do a simple lerp for now:
                        phiRef.current += dist * 0.03;
                    }

                    state.phi = phiRef.current + currentR;
                    // Update the shared state phi so we don't lose rotation context if we ever needed it
                    stateRef.current.phi = state.phi;

                    // Directly read from the shared state updated by the parent wrapper
                    state.markers = stateRef.current.markers;

                    state.width = width * 2;
                    state.height = width * 2;
                },
            });
        } catch (e) {
            console.error("Globe initialization failed", e);
        }

        return () => {
            if (globeInstanceRef.current) {
                globeInstanceRef.current.destroy();
                globeInstanceRef.current = null;
            }
            window.removeEventListener('resize', onResize);
        };
    }, [api, stateRef, r]);

    return (
        <animated.canvas
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100%',
                contain: 'layout paint size',
                opacity: 1,
                cursor: 'grab',
                transformOrigin: '0 0',
            }}
            onPointerDown={(e) => {
                pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
                if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
            }}
            onPointerUp={() => {
                pointerInteracting.current = null;
                if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
            }}
            onPointerOut={() => {
                pointerInteracting.current = null;
                if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
            }}
            onMouseMove={(e) => {
                if (pointerInteracting.current !== null) {
                    const delta = e.clientX - pointerInteracting.current;
                    pointerInteractionMovement.current = delta;
                    api.start({ r: delta / 200 });
                }
            }}
            onTouchMove={(e) => {
                if (pointerInteracting.current !== null && e.touches[0]) {
                    const delta = e.touches[0].clientX - pointerInteracting.current;
                    pointerInteractionMovement.current = delta;
                    api.start({ r: delta / 100 });
                }
            }}
        />
    );
}, () => true); // NEVER rerender internally


/**
 * LiveVisitorGlobe Component
 * 
 * Public API for the globe. Pass markers as props.
 * This wrapper handles prop-to-reference sync without rerendering the actual 3D canvas.
 */
export function LiveVisitorGlobe({ markers }: LiveVisitorGlobeProps) {
    // Instance-specific state to allow multiple globes without conflict
    const stateRef = useRef<GlobeState>({
        phi: 0,
        markers: [],
        mapBrightness: 1,
        focusPhi: 0,
    });

    // Synchronize to shared state that the 60fps loop reads from
    useEffect(() => {
        stateRef.current.markers = markers;
        stateRef.current.focusPhi = -1.4;
        // // Calculate center of markers
        // if (markers.length === 1) {
        //     // If there's only one marker, center directly on it
        //     const lng = markers[0].location[1];
        //     stateRef.current.focusPhi = -(lng * Math.PI / 180) + 90;
        // } else if (markers.length > 0) {
        //     // Simple average of longitudes (accounting for wrap-around not implemented for simplicity)
        //     // Longitude is second element: [lat, lng]
        //     let sumLng = 0;
        //     markers.forEach(m => sumLng += m.location[1]);
        //     const avgLng = sumLng / markers.length;

        //     // Convert lng to phi.
        //     // Cobe phi=0 usually centers at a specific longitude (often 0).
        //     // Rotating by -lng brings that longitude to the front.
        //     // We multiply by -1 to reverse the direction of rotation.
        //     stateRef.current.focusPhi = -(avgLng * Math.PI / 180);
        // }

    }, [markers]);


    return (
        <div className="w-full relative aspect-square max-w-[100%] mx-auto overflow-hidden">
            <GlobeImplementation stateRef={stateRef} />
        </div>
    );
}

/**
 * Cobe - Legacy export for compatibility
 */
export function Cobe() {
    return (
        <div className="w-full relative aspect-square max-w-[400px] mx-auto overflow-hidden opacity-50 grayscale pointer-events-none mt-8 border-t pt-8">
            {/* Small decorative globe if needed elsewhere */}
            <LiveVisitorGlobe markers={[]} />
        </div>
    );
}
