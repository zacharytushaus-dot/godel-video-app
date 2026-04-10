import { notFound } from "next/navigation";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "",
  },
});

export default async function WatchPage({ params }: { params: Promise<{ id: string, filename: string }> }) {
  const resolvedParams = await params;
  const { filename } = resolvedParams;

  let videoUrl = "";

  try {
    const command = new GetObjectCommand({
      Bucket: "godel-video",
      Key: filename,
    });
    // Generate a temporary signed URL to stream directly from cloudflare
    videoUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error("Failed to generate signed URL:", error);
    return notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pt-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 mb-8 text-center flex items-center gap-3">
        <span className="bg-blue-600 w-4 h-8 inline-block rounded-sm"></span>
        Godel Terminal
      </h1>

      <div className="w-full max-w-4xl px-4 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
        <video 
          controls 
          autoPlay 
          className="w-full h-auto aspect-video bg-zinc-900 object-cover"
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="mt-12 w-full max-w-xl px-4 text-center pb-24">
        <h2 className="text-xl font-bold mb-6 text-zinc-300">Like what you see? Let's talk data.</h2>
        <div className="h-[400px] w-full bg-zinc-900 flex items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 italic">
          [Calendly Embed Goes Here]
        </div>
      </div>
    </div>
  );
}