"use client";

import { useEffect, useRef } from "react";
import type { LandmarkPoint } from "@/types/analysis";

interface MeshOverlayProps {
  image: HTMLImageElement | null;
  landmarks: LandmarkPoint[] | null;
  width: number;
  height: number;
}

export function MeshOverlay({ image, landmarks, width, height }: MeshOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Cap the backing store at ~1024px so a 12MP phone photo doesn't
    // allocate a 4000x3000 canvas just to draw dots on it. Landmarks are
    // normalized (0..1), so scaling the draw surface is lossless for the
    // mesh; the CSS layer handles the display size.
    const scale = Math.min(1, MAX_CANVAS_DIM / Math.max(width, height));
    const cw = Math.max(1, Math.round(width * scale));
    const ch = Math.max(1, Math.round(height * scale));
    canvas.width = cw;
    canvas.height = ch;
    ctx.clearRect(0, 0, cw, ch);
    if (!image) return;
    ctx.drawImage(image, 0, 0, cw, ch);
    if (!landmarks || landmarks.length === 0) return;
    drawLandmarks(ctx, landmarks, cw, ch);
  }, [image, landmarks, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="max-h-[480px] w-full rounded-xl object-contain"
    />
  );
}

const MAX_CANVAS_DIM = 1024;

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  points: LandmarkPoint[],
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = "rgba(249,115,22,0.85)";
  ctx.strokeStyle = "rgba(249,115,22,0.35)";
  for (const p of points) {
    const x = p.x * width;
    const y = p.y * height;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Face oval
  const oval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  ctx.strokeStyle = "rgba(249,115,22,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  oval.forEach((i, idx) => {
    const p = points[i];
    if (!p) return;
    const x = p.x * width;
    const y = p.y * height;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}
