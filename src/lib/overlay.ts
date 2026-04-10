import { createCanvas, registerFont } from "canvas";
import { promises as fs } from "fs";
import path from "path";

export async function ensureOverlay(id: string, name: string): Promise<string> {
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
  const height = 120;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background bar
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, width, height);

  // Text
  ctx.fillStyle = "#FFFFFF";
  const fontSize = 34;
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, width / 2, height / 2);

  // Write PNG
  const buf = canvas.toBuffer("image/png");
  await fs.writeFile(overlayPath, buf);

  return overlayPath;
}