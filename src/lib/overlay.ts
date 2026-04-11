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
  const radius = 55;

  // Draw semi-transparent circle background
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI, false);
  // Add a nice subtle blur shadow to the backdrop
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fill();

  // Reset shadow for the border stroke
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw outer white border
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.stroke();

  // Draw play triangle inside with perfectly calculated center of mass and rounded joints
  // In a triangle, the visual center of mass is different than the bounding box center. 
  // The centroid of a triangle is at 1/3 of its height from the base.
  ctx.beginPath();
  const triSize = 22;
  const triHeight = triSize * Math.sqrt(3); // Equilateral triangle height
  
  // The offset pulls the triangle to the right by exactly the centroid math difference
  const xOffset = cx + (triSize * 0.3);
  
  ctx.lineJoin = "round";
  ctx.lineWidth = 6;
  ctx.moveTo(xOffset - triSize, cy - triHeight / 2);
  ctx.lineTo(xOffset + triSize, cy);
  ctx.lineTo(xOffset - triSize, cy + triHeight / 2);
  ctx.closePath();
  
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.strokeStyle = "rgba(255, 255, 255, 1)";
  // Use stroke to smooth out the sharp corners natively in canvas
  ctx.stroke();
  ctx.fill();

  // Write PNG
  const buf = canvas.toBuffer("image/png");
  await fs.writeFile(overlayPath, buf);

  return overlayPath;
}