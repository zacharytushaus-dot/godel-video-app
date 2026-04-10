import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import { ensureOverlay } from "@/lib/overlay";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File;
    const name = formData.get("name") as string;

    if (!file || !name) {
      return NextResponse.json({ error: "Missing video" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Create a 6 character short ID instead of a massive 36 character UUID
    const id = uuidv4().slice(0, 6);

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

    const overlayPath = await ensureOverlay(id, name);

    const gifFilename = `${id}.gif`;
    const gifPath = path.join(process.cwd(), "public/gifs", gifFilename);

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .input(overlayPath)
        .complexFilter([
          "[0:v] fps=10,scale=480:-1 [scaled]",
          "[1:v] scale=480:-1 [ov]",
          "[scaled][ov] overlay=(main_w-overlay_w)/2:(main_h-overlay_h-10) [out]"
        ], "out")
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