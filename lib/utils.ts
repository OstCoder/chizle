import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LandmarkPoint } from "@/types/analysis";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function toBand(score: number): "excellent" | "strong" | "good" | "fair" | "weak" {
  if (score >= 8.5) return "excellent";
  if (score >= 7) return "strong";
  if (score >= 5.5) return "good";
  if (score >= 4) return "fair";
  return "weak";
}

export function distance2D(a: LandmarkPoint, b: LandmarkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function midpoint(a: LandmarkPoint, b: LandmarkPoint): LandmarkPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: 0 };
}
