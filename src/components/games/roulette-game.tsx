"use client";

import { useEffect, useRef, useState } from "react";
import { Wheel } from "spin-wheel-ts";
import { CtaButton } from "@/components/ui/cta-button";
import Image from "next/image";
import { cn } from "@/lib/utils";
import Confetti from "react-confetti";
import { Ticket } from "lucide-react";

export interface RoulettePrize {
    id: string;
    label: string;
    color: string;
    odds: number;
    remainingCount?: number | null;
}

interface RouletteGameProps {
    prizes: RoulettePrize[];
    onSpinEnd?: (wonPrize: RoulettePrize | null) => void;
    className?: string;
}

export function RouletteGame({ prizes, onSpinEnd, className }: RouletteGameProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wheelRef = useRef<Wheel | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isRotating, setIsRotating] = useState(false); // Track any wheel movement
    const [isTicking, setIsTicking] = useState(false); // Track tick animation
    const [result, setResult] = useState<{ label: string; color: string } | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    // Local state to simulate inventory changes in preview without affecting the wheel setup
    const [availablePrizes, setAvailablePrizes] = useState<RoulettePrize[]>(prizes);

    // Sync local state when props change
    useEffect(() => {
        setAvailablePrizes(prizes);
    }, [prizes]);

    // Initialize audio context
    useEffect(() => {
        if (typeof window !== 'undefined' && window.AudioContext) {
            audioContextRef.current = new AudioContext();
        }
        return () => {
            audioContextRef.current?.close();
        };
    }, []);

    // Play tick sound
    const playTickSound = (frequency: number = 800) => {
        if (!audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.05);
    };

    // Play win sound
    const playWinSound = () => {
        if (!audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const notes = [523.25, 659.25, 783.99]; // C, E, G

        notes.forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = freq;
            oscillator.type = 'sine';

            const startTime = ctx.currentTime + i * 0.1;
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        });
    };

    useEffect(() => {
        if (!containerRef.current) return;

        // Filter out sold out prizes for the wheel
        const validPrizes = availablePrizes.filter(p => p.remainingCount !== 0);

        // Normalize prizes with default colors first (to keep consistency across duplicates)
        const baseNormalizedPrizes = validPrizes.map((p, i) => ({
            ...p,
            color: p.color || [
                "#EF4444", // red-500
                "#3B82F6", // blue-500
                "#10B981", // green-500
                "#F59E0B", // amber-500
                "#8B5CF6", // violet-500
                "#EC4899", // pink-500
            ][i % 6],
        }));

        // Duplicate the prizes to show them twice on the wheel
        const displayedPrizes = [...baseNormalizedPrizes, ...baseNormalizedPrizes];

        // Create segments: alternate between prizes and "Try Again"
        const segments = displayedPrizes.flatMap((prize, index) => [
            {
                label: prize.label,
                labelColor: prize.color,
            },
            {
                label: "",
                labelColor: "#ccc",
            },
        ]);

        // Initialize the wheel with indicator
        const wheel = new Wheel(containerRef.current, {
            items: segments,
            borderWidth: 5,
            borderColor: "#444444",
            radius: 0.9,
            itemLabelRadius: 0.75,
            itemLabelRotation: 90,
            itemLabelAlign: "center",
            itemLabelBaselineOffset: 0,
            itemLabelFont: "Arial, sans-serif",
            itemLabelFontSizeMax: 54,
            itemLabelColors: segments.map((s) => s.labelColor),
            itemBackgroundColors: ["#FFFFFF", "#F5F5F5"],
            lineWidth: 3,
            lineColor: "#DDDDDD",
            pointerAngle: 0,
            image: "/images/KamleenStar.svg",
            isInteractive: true,
            // Physics settings for better swipe responsiveness
            rotationSpeedMax: 5000, // Maximum rotation speed (higher = faster spins)
            rotationResistance: -120, // Lower resistance = wheel spins longer
        });

        wheelRef.current = wheel;

        // Cleanup
        return () => {
            if (wheelRef.current) {
                wheelRef.current.remove();
                wheelRef.current = null;
            }
        };
    }, [availablePrizes]); // Re-init when available prizes change

    // Update wheel border and line color based on activity
    useEffect(() => {
        if (!wheelRef.current) return;

        const activeColor = "#f8b82c";
        const inactiveBorderColor = "#cccccc";
        const inactiveLineColor = "#DDDDDD";

        const newBorderColor = (isSpinning || isRotating) ? activeColor : inactiveBorderColor;
        const newLineColor = (isSpinning || isRotating) ? activeColor : inactiveLineColor;

        let needsRedraw = false;

        if (wheelRef.current.borderColor !== newBorderColor) {
            wheelRef.current.borderColor = newBorderColor;
            needsRedraw = true;
        }

        if (wheelRef.current.lineColor !== newLineColor) {
            wheelRef.current.lineColor = newLineColor;
            needsRedraw = true;
        }

        if (needsRedraw) {
            // Force a redraw to update the colors immediately
            (wheelRef.current as any).draw();
        }
    }, [isSpinning, isRotating]);

    // Continuous rotation monitor for tick sounds (works for both button and finger spins)
    useEffect(() => {
        if (!wheelRef.current) return;

        const validPrizes = availablePrizes.filter(p => p.remainingCount !== 0);
        // We show prizes twice, so segments = (valid * 2) * 2 (for try again) = valid * 4
        const totalSegments = validPrizes.length * 4; // prizes * 2 (duplication) + try again segments for each
        const segmentAngle = 360 / totalSegments;
        const pointerAngle = 0; // Arrow is at the top (0 degrees)
        let lastSegmentAtPointer = -1;
        let lastRotation = 0;
        let rotationTimeout: NodeJS.Timeout;

        const monitorInterval = setInterval(() => {
            if (!wheelRef.current) return;

            const currentRotation = wheelRef.current.rotation || 0;
            const speed = Math.abs(wheelRef.current.rotationSpeed || 0);

            // Detect if wheel is actively rotating
            const isCurrentlyRotating = speed > 0.05 || Math.abs(currentRotation - lastRotation) > 0.01;

            if (isCurrentlyRotating) {
                setIsRotating(true);
                // Clear any pending timeout
                clearTimeout(rotationTimeout);
                // Set timeout to turn off lights after rotation stops
                rotationTimeout = setTimeout(() => setIsRotating(false), 300);
            }

            // Calculate which segment is currently under the pointer
            // Normalize rotation to 0-360 range
            const normalizedRotation = ((currentRotation % 360) + 360) % 360;

            // The segment at the pointer position
            // Since the wheel rotates clockwise, we need to account for that
            const segmentAtPointer = Math.floor(normalizedRotation / segmentAngle) % totalSegments;

            // Only play sound when a new segment passes under the pointer
            if (segmentAtPointer !== lastSegmentAtPointer && lastSegmentAtPointer !== -1) {
                // Use a better frequency range that works for slow speeds too
                // Slow: ~650Hz, Medium: ~800Hz, Fast: ~1000Hz
                const frequency = 650 + Math.min(speed * 5, 350);
                playTickSound(frequency);

                // Trigger visual tick animation
                setIsTicking(true);
                setTimeout(() => setIsTicking(false), 100);
            }

            lastSegmentAtPointer = segmentAtPointer;
            lastRotation = currentRotation;
        }, 16); // Check every ~16ms (60fps)

        return () => {
            clearInterval(monitorInterval);
        };
    }, [prizes.length, availablePrizes]); // added availablePrizes dependency to monitor correct segments

    const handleSpin = async () => {
        if (!wheelRef.current || isSpinning) return;

        setShowConfetti(false);

        // Reset any previous highlights
        (wheelRef.current.items as any[]).forEach(item => item.backgroundColor = null);
        (wheelRef.current as any).draw();

        setIsSpinning(true);
        setResult(null);

        // Filter prizes for spin logic
        const validPrizes = availablePrizes.filter(p => p.remainingCount !== 0);

        // Normalize prizes
        const baseNormalizedPrizes = validPrizes.map((p, i) => ({
            ...p,
            color: p.color || [
                "#EF4444",
                "#3B82F6",
                "#10B981",
                "#F59E0B",
                "#8B5CF6",
                "#EC4899",
            ][i % 6],
        }));

        // Duplicate for logic to match visuals
        const displayPrizes = [...baseNormalizedPrizes, ...baseNormalizedPrizes];

        // Calculate total prize odds
        // Note: We use original odds sum. Even though we have duplicates, we will split the odds.
        // Sum(original) is what matters for the "Try Again" slice calculation.
        const totalPrizeOdds = baseNormalizedPrizes.reduce((sum, p) => sum + p.odds, 0);
        const maxOdds = 1.0; // Total odds pool (decimal format: 0.0 to 1.0)
        const tryAgainTotalOdds = Math.max(0, maxOdds - totalPrizeOdds);
        const tryAgainOddsPerSegment = tryAgainTotalOdds / displayPrizes.length;

        // Build segments with their odds: [Prize, TryAgain, Prize, TryAgain, ...]
        const segmentsWithOdds: Array<{
            type: 'prize' | 'tryagain';
            prize?: typeof displayPrizes[0];
            prizeIndex?: number;
            odds: number;
        }> = displayPrizes.flatMap((prize, index) => [
            {
                type: 'prize' as const,
                prize,
                prizeIndex: index,
                odds: prize.odds / 2, // Split odds between the two instances
            },
            {
                type: 'tryagain' as const,
                odds: tryAgainOddsPerSegment,
            },
        ]);

        // Determine winner based on odds (including Try Again segments)
        const totalWeight = segmentsWithOdds.reduce((sum, seg) => sum + seg.odds, 0);
        let random = Math.random() * totalWeight;
        let winnerSegmentIndex = -1;

        for (let i = 0; i < segmentsWithOdds.length; i++) {
            random -= segmentsWithOdds[i].odds;
            if (random <= 0) {
                winnerSegmentIndex = i;
                break;
            }
        }

        // Fallback to last segment
        if (winnerSegmentIndex === -1) winnerSegmentIndex = segmentsWithOdds.length - 1;

        // Custom easing: Fast start (short accel) -> Long slow finish (suspense)
        // Splits at 15% of time: 15% acceleration, 85% deceleration
        const suspenseEasing = (t: number) => {
            const k = 0.15; // Inflection point (15% of duration)
            const p = 4;    // Power (higher = steeper curves)

            if (t < k) {
                // Acceleration phase
                return Math.pow(t, p) / Math.pow(k, p - 1);
            } else {
                // Deceleration phase
                return 1 - Math.pow(1 - t, p) / Math.pow(1 - k, p - 1);
            }
        };

        // Spin to the winner
        wheelRef.current.spinToItem(
            winnerSegmentIndex,
            15000, // duration in ms
            true, // spin clockwise
            8, // number of revolutions
            1, // direction
            suspenseEasing // Add custom easing for suspense
        );

        // Wait for spin to complete
        setTimeout(() => {
            setIsSpinning(false);
            const winningSegment = segmentsWithOdds[winnerSegmentIndex];

            // Highlight the winning segment with conditional color
            if (wheelRef.current) {
                const items = wheelRef.current.items as any[];
                if (items[winnerSegmentIndex]) {
                    // Gold for prize, Grey for Try Again (lights off effect)
                    const highlightColor = (winningSegment.type === 'prize') ? "#f8b82c" : "#d1d5db";
                    items[winnerSegmentIndex].backgroundColor = highlightColor;
                    (wheelRef.current as any).draw();
                }
            }

            if (winningSegment.type === 'prize' && winningSegment.prize) {
                // Won a prize
                playWinSound();
                setShowConfetti(true);
                setResult({
                    label: winningSegment.prize.label,
                    color: winningSegment.prize.color,
                });
                if (onSpinEnd) {
                    onSpinEnd(winningSegment.prize);
                }

                // Update local inventory simulation
                setAvailablePrizes(current =>
                    current.map(p => {
                        if (p.id === winningSegment.prize!.id) {
                            if (p.remainingCount !== null && p.remainingCount !== undefined) {
                                return { ...p, remainingCount: Math.max(0, p.remainingCount - 1) };
                            }
                        }
                        return p;
                    })
                );
            } else {
                // Landed on Try Again
                setResult({
                    label: "Try Again",
                    color: "#6B7280",
                });
                if (onSpinEnd) {
                    onSpinEnd(null);
                }
            }
        }, 15000);
    };

    return (
        <div className={cn("px-8 py-12 relative overflow-hidden h-full min-h-[500px] max-h-[540px] md:min-h-[788px] md:max-h-[788px] min-w-[320px] max-w-[420px] md:min-w-[580px] md:max-w-[600px]  w-full rounded-3xl", className)}>
            {/* Background Image */}
            <Image
                src="/images/roulette-background.jpg"
                alt="Roulette Background"
                fill
                className="object-cover -z-10 brightness-[0.8]"
                priority
            />
            {showConfetti && (
                <Confetti
                    recycle={false}
                    numberOfPieces={500}
                    onConfettiComplete={() => setShowConfetti(false)}
                />
            )}
            {/* Roulette Container */}
            <div className="absolute w-[300px] h-[440px] min-w-[300px] max-w-[300px] md:w-[400px] md:h-[572px] md:min-w-[400px] md:max-w-[400px] right-0 md:right-10 md:top-14">
                {/* Decorative Base - Roulette SVG Star */}
                <div className="absolute top-0 right-0 w-[300px] h-[440px] md:w-[400px] md:h-[564px]">
                    <Image
                        src="/roulette-background.svg"
                        alt="Roulette Stand"
                        fill
                        className="object-contain"
                        style={{
                            filter: " drop-shadow( 0 2px 15px rgba(0,0,0,0.2))"
                        }}
                        priority
                    />
                </div>
                <div className="absolute top-0 right-0 w-[300px] h-[440px] md:w-[400px] md:h-[564px]">
                    <Image
                        src="/roulette.svg"
                        alt="Roulette Stand"
                        fill
                        className="object-contain"
                        style={{
                            filter: " drop-shadow( 0 2px 15px rgba(0,0,0,0.2))"
                        }}
                        priority
                    />
                </div>
                {/* Decorative Lights - Glow when spinning */}
                <div className="absolute top-0 right-0 w-[300px] h-[440px] md:w-[400px] md:h-[564px] transition-all duration-800">
                    <style jsx global>{`
                        @keyframes lightPulse {
                            0% { filter: brightness(1.1) saturate(1.2) drop-shadow(0 0 8px rgba(250, 185, 21, 1)); }
                            50% { filter: brightness(1.5) saturate(1.5) drop-shadow(0 0 12px rgba(250, 185, 21, 1)) drop-shadow(0 0 12px rgba(250, 185, 21, 1)); }
                            100% { filter: brightness(1.1) saturate(1.2) drop-shadow(0 0 8px rgba(250, 185, 21, 1)); }
                        }
                    `}</style>
                    <Image
                        src="/Lights.svg"
                        alt="Roulette Lights"
                        fill
                        className="object-contain drop-shadow-2xl"
                        priority
                        style={{
                            animation: (isSpinning || isRotating) ? 'lightPulse 0.8s infinite ease-in-out' : 'none',
                            filter: (isSpinning || isRotating)
                                ? 'brightness(1.3) saturate(1.2) drop-shadow(0 0 12px rgba(250, 185, 21, 1))'
                                : 'brightness(0.3) saturate(0)',
                            transition: 'filter 0.8s ease-in-out',
                            opacity: (isSpinning || isRotating) ? 1 : 0.8
                        }}
                    />
                </div>
                {/* Wheel Container */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2">
                    {/* Pointer Indicator */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                        <style jsx global>{`
                            @keyframes pointerTick {
                                0% { transform: rotate(0deg); }
                                25% { transform: rotate(-15deg); }
                                100% { transform: rotate(0deg); }
                            }
                        `}</style>
                        {/* Red Base */}
                        {/* <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#EF4444] rounded-t-lg shadow-md" /> */}

                        {/* Gold Pointer */}
                        <div
                            className="relative w-10 h-14 filter drop-shadow-lg origin-top"
                            style={{
                                animation: isTicking ? 'pointerTick 0.1s ease-out' : 'none',
                                transformOrigin: '50% 15%' // Rotate around the pin
                            }}
                        >
                            <svg viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* Gold Body */}
                                <path d="M20 56L0 20C0 8.9543 8.9543 0 20 0C31.0457 0 40 8.9543 40 20L20 56Z" fill="url(#gold-gradient)" />
                                {/* Inner Shadow/Bevel effect */}
                                <path d="M20 56L2 20C2 10.059 10.059 2 20 2C29.941 2 38 10.059 38 20L20 56Z" stroke="url(#gold-light)" strokeWidth="2" strokeOpacity="0.5" />

                                <defs>
                                    <linearGradient id="gold-gradient" x1="0" y1="0" x2="40" y2="56" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stopColor="#FCD34D" />
                                        <stop offset="0.4" stopColor="#F59E0B" />
                                        <stop offset="1" stopColor="#D97706" />
                                    </linearGradient>
                                    <linearGradient id="gold-light" x1="20" y1="0" x2="20" y2="56" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#FFFFFF" />
                                        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            {/* Pin Head */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-inner border border-gray-200" />
                        </div>
                    </div>

                    <div
                        ref={containerRef}
                        className="top-7.5 right-0.5 md:top-8.5 md:right-1 md:right-0 w-[250px] h-[250px] md:w-[320px] md:h-[320px]"
                        style={{
                            position: "relative",
                        }}
                    />
                </div>

                {/* Result Display Overlay */}
                {result && !isSpinning && (
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-8 py-6 rounded-2xl shadow-2xl border-4 border-white animate-in fade-in zoom-in duration-500 text-center flex flex-col items-center justify-center bg-white/10 backdrop-blur-md"
                        style={{ backgroundColor: result.color, minWidth: '260px' }}
                    >
                        <p className="text-sm md:text-base font-bold text-white/90 mb-1 uppercase tracking-wide">
                            {result.label === "Try Again" ? "Next Time!" : "🎉 Congratulations!"}
                        </p>
                        {result.label !== "Try Again" && (
                            <p className="text-xs text-white/80 mb-2">You won</p>
                        )}
                        <p className="text-2xl md:text-4xl font-black text-white drop-shadow-md">
                            {result.label}
                        </p>
                    </div>
                )}

                {/* Custom SVG Spin Button */}
                <button
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className={cn(
                        "absolute bottom-8 right-11 md:bottom-10 md:right-16 group transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-80",
                        isSpinning ? "cursor-not-allowed" : "cursor-pointer"
                    )}
                >
                    {/* SVG Background */}
                    <div className={cn(
                        "w-34 h-17 md:w-42 md:h-23 transition-colors duration-300",
                        isSpinning ? "text-[#f8b82c]" : "text-gray-600 group-hover:text-[#f8b82c]"
                    )}>
                        {/* Adjusted viewBox to crop empty space around the button shape */}
                        <svg viewBox="290 660 170 130" className="w-full h-full drop-shadow-lg" fill="currentColor">
                            <path d="M432.6,740.4l-5.3-61.8c-1.2-9.1-9.1-15.8-18-15.8s-1.6,0-2.4.2l-13.9,1.9-95.4,12.9-13.9,1.9c-9.9,1.3-16.9,10.5-15.6,20.5l11.3,61c2,14.9,14.9,25.8,29.5,25.8s2.6,0,4-.3l94.2-12.7c16.2-2.2,27.7-17.3,25.5-33.5Z" />
                        </svg>
                    </div>

                    {/* Button Label */}
                    <span className={cn(
                        "absolute -rotate-7 top-8 right-8 md:top-11 md:right-11 -translate-x-1/2 -translate-y-1/2 text-xl md:text-2xl font-black tracking-wider transition-colors duration-300",
                        isSpinning ? "text-white" : "text-white group-hover:text-white"
                    )}>
                        Spin
                    </span>
                </button>
            </div>

            {/* Prize List Sidebar */}
            <div className="absolute bottom-2 left-2 md:bottom-8 md:left-8 flex flex-col font-semibold z-20 max-w-[240px] md:max-w-[280px]">
                <div className="flex flex-col text-sm shadow-lg backdrop-blur-md bg-white p-3 rounded-xl border border-white/10">
                    <h3 className="text-sm text-[#ed3955] mb-1 pl-1">Prizes <span className="text-black/60 text-xs font-normal">(Coupons)</span></h3>
                    {availablePrizes.map((prize, i) => {
                        // Hide prizes that have run out of stock
                        if (prize.remainingCount === 0) return null;

                        return (
                            <div
                                key={prize.id}
                                className="flex items-center gap-2 text-sm"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div
                                    className="p-1 flex items-center gap-1"
                                    style={{ color: prize.color || "#FCD34D" }}
                                >
                                    <span className="text-[12px] uppercase tracking-wide text-black/50 font-bold" style={{ color: prize.color || "#CCCCCC" }}>
                                        {prize.remainingCount !== null && prize.remainingCount !== undefined
                                            ? `${prize.remainingCount} X`
                                            : 'Unlimited'}
                                    </span>
                                    <Ticket className="w-5 h-5" />
                                </div>
                                <span className="truncate font-medium text-shadow-sm leading-tight text-black">
                                    {prize.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Game Logo */}
            <div className="absolute bottom-4 right-4 z-20 w-24 md:w-32 opacity-90 pointer-events-none">
                <Image
                    src="/images/logo-w.png"
                    alt="Kamleen Logo"
                    width={120}
                    height={60}
                    className="object-contain"
                />
            </div>
        </div >
    );
}
