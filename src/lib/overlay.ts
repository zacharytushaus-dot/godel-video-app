import { createCanvas, registerFont } from "canvas";
import { promises as fs } from "fs";
import path from "path";

export async function ensureOverlay(id: string, title: string, subtitle: string): Promise<string> {
  const overlaysDir = path.join(process.cwd(), "public", "overlays");
  await fs.mkdir(overlaysDir, { recursive: true });

  const overlayPath = path.join(overlaysDir, `${id}.png`);
  try {
    await fs.access(overlayPath);
    return overlayPath;
  } catch {
    // need to create it
  }

  // Basic overlay: white text centered on a semi-transparent black bar
  const width = 640;
  const height = 140;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background bar
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  ctx.font = `bold 36px Arial, Helvetica, sans-serif`;
  ctx.fillText(title || "Let's cut the bloat.", width / 2, height * 0.35);

  // Subtitle
  ctx.font = `bold 20px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = "#E4E4E7"; // zinc-200
  ctx.fillText(subtitle || "I'd love to show you a brief tear-down of your setup.", width / 2, height * 0.75);

  // Write PNG
  const buf = canvas.toBuffer("image/png");
  await fs.writeFile(overlayPath, buf);

  return overlayPath;
}