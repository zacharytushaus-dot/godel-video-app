import { createCanvas, registerFont } from "canvas";
import { promises as fs } from "fs";
import path from "path";

export async function ensurePlayButton(id: string): Promise<string> {
  const overlaysDir = path.join(process.cwd(), "public", "overlays");
  await fs.mkdir(overlaysDir, { recursive: true });

  const overlayPath = path.join(overlaysDir, `play-button-${id}.png`);
  try {
    await fs.access(overlayPath);
    return overlayPath;
  } catch {
    // need to create it
  }

  // Large enough canvas to hold just the play button in the center
  const width = 640;
  const height = 480;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Center coordinates
  const cx = width / 2;
  const cy = height / 2;
  const radius = 50;

  // Draw semi-transparent circle background
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fill();

  // Draw outer white border
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.stroke();

  // Draw play triangle inside
  ctx.beginPath();
  // Offset slightly to the right to visually center the triangle
  const triCenterX = cx + 5; 
  const triSize = 20;
  
  ctx.moveTo(triCenterX - triSize, cy - triSize * 1.2);
  ctx.lineTo(triCenterX + triSize * 1.5, cy);
  ctx.lineTo(triCenterX - triSize, cy + triSize * 1.2);
  ctx.closePath();
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fill();

  // Write PNG
  const buf = canvas.toBuffer("image/png");
  await fs.writeFile(overlayPath, buf);

  return overlayPath;
}