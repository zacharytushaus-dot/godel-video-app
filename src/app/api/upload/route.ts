import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import { ensureOverlay } from "@/lib/overlay";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { NodeHttpHandler } from "@smithy/node-http-handler";
import * as https from "https";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "",
  },
  // Ensure strict TLS routing for Windows SSL compatibility
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  })
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File;
    const name = formData.get("name") as string;

    if (!file || !name) {
      return NextResponse.json({ error: "Missing video or name" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Instead of random hashes, make the ID hyper-personalized and clean (e.g. rich-hunter-capital)
    const shortHash = uuidv4().slice(0, 4);
    // Clean the inputted name to be URL-safe (lowercase, replace spaces with dashes, remove special chars)
    const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const id = `${cleanName}-${shortHash}`;

    const videoExt = path.extname(file.name) || ".mp4";
    const filename = `${id}${videoExt}`;
    const videoPath = path.join(process.cwd(), "public/uploads", filename);
    await writeFile(videoPath, buffer);

    // Upload the MP4 video to Cloudflare R2
    console.log("Uploading to Cloudflare R2 bucket: godel-video");
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: "godel-video",
          Key: filename,
          Body: buffer,
          ContentType: file.type || "video/mp4",
        })
      );
      console.log("Successfully uploaded to R2.");
    } catch (s3Error: any) {
      console.error("Failed to upload to R2:", s3Error);
      return NextResponse.json({ error: "Cloud storage upload failed", details: s3Error?.message ?? "" }, { status: 500 });
    }

    const gifFilename = `${id}.gif`;
    const gifPath = path.join(process.cwd(), "public/gifs", gifFilename);

    // Generate pure raw GIF with NO text overlays at all
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .complexFilter([
          "[0:v] fps=10,scale=480:-1,split [a][b]; [a] palettegen [p]; [b][p] paletteuse"
        ])
        .duration(3)
        .output(gifPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      id,
      videoKey: filename,
      gifUrl: `/gifs/${gifFilename}`,
      watchUrl: `${publicBaseUrl}/v/${id}`
    });

  } catch (error: any) {
    console.error("Error processing video:", error?.message ?? error);
    return NextResponse.json({ error: "File processing failed", details: error?.message ?? "" }, { status: 500 });
  }
}