"use client";

import * as React from "react";

type BalloonLoadingProps = {
	/** Tailwind width/height utility like w-32; defaults to w-32 */
	sizeClassName?: string;
	/** Optional descriptive label for screen readers */
	label?: string;
	/** Additional container classes */
	className?: string;
};

export default function BalloonLoading({ sizeClassName = "w-32", label = "Loading", className = "" }: BalloonLoadingProps) {
	return (
		<div className={`flex items-center justify-center ${className}`} role="status" aria-live="polite" aria-label={label}>
			<span className="sr-only">{label}</span>
			<div className="balloon-container mb-2">
				<svg
					id="Layer_1"
					xmlns="http://www.w3.org/2000/svg"
					xmlnsXlink="http://www.w3.org/1999/xlink"
					version="1.1"
					viewBox="0 0 400 550"
					className={`balloon ${sizeClassName} h-auto mx-auto`}
					aria-hidden="true"
				>
					<defs>
						<style>
							{`
								.st0 {fill: none;}
								.st1 {fill: url(#radial-gradient);}
								.st2 {fill: #fff;}
							`}
						</style>
						<radialGradient
							id="radial-gradient"
							cx="135.4"
							cy="377.8"
							fx="135.4"
							fy="377.8"
							r="342"
							gradientTransform="translate(39 -24.4) rotate(7.7)"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="0" stopColor="#ff512f" />
							<stop offset="1" stopColor="#dd2476" />
						</radialGradient>
					</defs>
					<g id="Icon">
						<g id="Hot_air_ballon">
							<path
								className="st1"
								d="M330,205c0-71.8-58.2-130-130-130s-130,58.2-130,130c0,44.9,26.8,77.3,50.6,108.7,24.8,32.7,46.4,62.3,53,101.2h-7.7c-5.5,0-10,4.5-10,10l1.7,33.9c0,9,7.3,16.3,16.3,16.3h52.1c9,0,16.3-7.3,16.3-16.3l1.7-33.9c0-5.5-4.5-10-10-10h-7.7c6.6-38.9,28.2-68.5,53-101.2,23.8-31.4,50.6-63.8,50.6-108.7ZM212.4,412.5l-.4,2.4h-24.1s-.4-2.4-.4-2.4c-1.7-10.2-4.5-20.3-8.4-30.4h41.6c-3.9,10.1-6.6,20.2-8.4,30.4Z"
							/>
						</g>
						<g id="Star_Group" className="rotating-star">
							<g id="Star">
								<path
									className="st2"
									d="M271.8,178.1c2.8-2.8.6-7.5-3.3-7.1l-45,4.1c-3.5.3-6.8-1.5-8.4-4.7l-20.4-40.3c-1.8-3.5-6.9-2.9-7.8,1l-10,44c-.8,3.4-3.6,6-7,6.6l-44.6,6.9c-3.9.6-4.9,5.7-1.5,7.7l38.8,23.1c3,1.8,4.6,5.3,4.1,8.7l-7.2,44.6c-.6,3.9,3.9,6.4,6.9,3.8l34-29.7c2.6-2.3,6.4-2.8,9.5-1.2l40.2,20.6c3.5,1.8,7.3-1.8,5.8-5.4l-17.8-41.5c-1.4-3.2-.7-7,1.8-9.4l32-31.8Z"
								/>
							</g>
							<path
								id="Circle_Wrap"
								className="st0"
								d="M302.3,194.3l-.5-4.3c-6.8-54-56-92.2-110-85.4l-8.7,1.1c-54,6.8-92.2,56-85.4,110l.5,4.3c7.1,56.4,58.5,96.3,114.9,89.2h0c56.4-7.1,96.3-58.5,89.2-114.9Z"
							/>
						</g>
					</g>
				</svg>
			</div>

			<style jsx>{`
				.balloon-container {
					animation: float 3s ease-in-out infinite;
					position: relative;
				}
				.balloon {
					filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1));
				}
				@keyframes float {
					0%,
					100% {
						transform: translateY(0px) translateX(0px) rotate(0deg);
					}
					25% {
						transform: translateY(-15px) translateX(5px) rotate(8deg);
					}
					50% {
						transform: translateY(-10px) translateX(-3px) rotate(-6deg);
					}
					75% {
						transform: translateY(-20px) translateX(2px) rotate(10deg);
					}
				}
				.balloon-container::before {
					content: "";
					position: absolute;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					width: 140px;
					height: 140px;
					background: radial-gradient(circle, rgba(255, 81, 47, 0.2) 0%, transparent 70%);
					border-radius: 50%;
					z-index: -1;
					animation: glow 2s ease-in-out infinite alternate;
				}
				@keyframes glow {
					from {
						opacity: 0.5;
						transform: translate(-50%, -50%) scale(0.9);
					}
					to {
						opacity: 0.8;
						transform: translate(-50%, -50%) scale(1.1);
					}
				}
				.rotating-star {
					transform-origin: 200px 200px;
					animation: rotateStar 4s linear infinite;
				}
				@keyframes rotateStar {
					from {
						transform: rotate(0deg);
					}
					to {
						transform: rotate(360deg);
					}
				}
			`}</style>
		</div>
	);
}
