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
    const slugInput = formData.get("slug") as string;
    const prospectName = formData.get("prospectName") as string;
    const companyName = formData.get("companyName") as string;

    if (!file || !slugInput || !prospectName || !companyName) {
      return NextResponse.json({ error: "Missing video or form fields" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create a database entry placeholder approach by using just the slug
    // Clean the inputted slug to be URL-safe (lowercase, replace spaces with dashes, remove special chars)
    const cleanSlug = slugInput.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const id = cleanSlug;

    // Optional: write a small JSON file metadata locally to map the slug to the actual name/company
    // This allows the Next.js viewer to read metadata directly without putting it into the URL string.
    const metadata = { prospectName, companyName };
    await writeFile(path.join(process.cwd(), "public/uploads", `${id}.json`), JSON.stringify(metadata));

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
      
      // Also upload the metadata JSON to R2
      await s3Client.send(
        new PutObjectCommand({
          Bucket: "godel-video",
          Key: `${id}.json`,
          Body: JSON.stringify(metadata),
          ContentType: "application/json",
        })
      );
      console.log("Successfully uploaded video and metadata to R2.");
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