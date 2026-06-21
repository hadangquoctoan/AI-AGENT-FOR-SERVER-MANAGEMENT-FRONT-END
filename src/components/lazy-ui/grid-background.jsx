"use client";

import React, { useId } from "react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function fadeMask(fade, strength) {
  if (fade === "none" || strength <= 0) return undefined;
  const start = Math.max(0, 100 - strength * 100);
  const stop = 100;
  switch (fade) {
    case "edges":
      return `radial-gradient(ellipse at center, black ${start * 0.5}%, transparent ${stop}%)`;
    case "center":
      return `radial-gradient(ellipse at center, transparent ${start * 0.5}%, black ${stop}%)`;
    case "top":
      return `linear-gradient(to bottom, transparent 0%, black ${stop - start}%)`;
    case "bottom":
      return `linear-gradient(to top, transparent 0%, black ${stop - start}%)`;
    default:
      return undefined;
  }
}

export function GridBackground({
  variant = "dots",
  size = 24,
  lineWidth = 1,
  dotSize = 3,
  dashLength = 3,
  dashGap = 5,
  crossSize = 5,
  color = "rgba(255,255,255,0.08)",
  fade = "none",
  fadeStrength = 1,
  className,
  style,
  ...rest
}) {
  const reactId = useId();
  const patternId = `gb-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const dotR = dotSize / 2;
  const cellMid = size / 2;
  let patternBody = null;

  if (variant === "dots") {
    patternBody = (
      <>
        <circle cx={0} cy={0} r={dotR} fill={color} />
        <circle cx={size} cy={0} r={dotR} fill={color} />
        <circle cx={0} cy={size} r={dotR} fill={color} />
        <circle cx={size} cy={size} r={dotR} fill={color} />
      </>
    );
  } else if (variant === "lines") {
    patternBody = (
      <path
        d={`M ${size} 0 L 0 0 0 ${size}`}
        fill="none"
        stroke={color}
        strokeWidth={lineWidth}
        shapeRendering="crispEdges"
      />
    );
  } else if (variant === "dashed") {
    patternBody = (
      <path
        d={`M ${size} 0 L 0 0 0 ${size}`}
        fill="none"
        stroke={color}
        strokeWidth={lineWidth}
        strokeDasharray={`${dashLength} ${dashGap}`}
        strokeLinecap="butt"
      />
    );
  } else {
    patternBody = (
      <path
        d={`M ${cellMid - crossSize} ${cellMid} H ${cellMid + crossSize} M ${cellMid} ${cellMid - crossSize} V ${cellMid + crossSize}`}
        fill="none"
        stroke={color}
        strokeWidth={lineWidth}
        strokeLinecap="butt"
      />
    );
  }

  const mask = fadeMask(fade, fadeStrength);
  const fadeStyle = mask
    ? {
        maskImage: mask,
        WebkitMaskImage: mask,
      }
    : undefined;

  return (
    <div
      aria-hidden
      data-grid-background={variant}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      style={{ ...fadeStyle, ...style }}
      {...rest}
    >
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <pattern
            id={patternId}
            width={size}
            height={size}
            patternUnits="userSpaceOnUse"
          >
            {patternBody}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}

GridBackground.displayName = "GridBackground";

export default GridBackground;
